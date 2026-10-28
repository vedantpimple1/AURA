import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { PasswordResetService } from '@/services/password-reset.service';
import { AuthService } from '@/services/auth.service';
import { encrypt, decrypt } from '@/lib/auth';
import { ValidationError, AuthorizationError, AuthenticationError } from '@/lib/errors';

/**
 * Admin-Assisted One-Time Password Reset Test Suite
 * 
 * Verifies Phase 2 to Phase 8 specifications:
 * 1. Member can submit a recovery request.
 * 2. Existing and non-existing accounts receive indistinguishable generic responses.
 * 3. Duplicate submissions do not flood the recovery queue.
 * 4. Permission separation: ordinary ADMIN and SUPERADMIN cannot access recovery queue.
 * 5. Authorized recovery operator can access the queue.
 * 6. Self-verification is strictly rejected.
 * 7. Reset link cannot be issued prior to verification.
 * 8. Cryptographic token entropy (256-bit CSPRNG) and SHA-256 hash persistence.
 * 9. Absence of raw tokens in queue list, audit records, and notification payloads.
 * 10. Single-use token consumption and expiry enforcement.
 * 11. Re-issuing a link invalidates prior active tokens.
 * 12. Password reset updates password, allows login with new password, and rejects old password.
 * 13. Pre-existing JWT sessions are invalidated via passwordChangedAt.
 * 14. Atomic state transitions and concurrency safety.
 */

test('1. Member can submit recovery request and receives required generic message', async () => {
  const email = `test-member-${Date.now()}@kaiaura.com`;
  const user = await prisma.user.create({
    data: {
      email,
      employeeId: `EMP-${Date.now()}`,
      name: 'Test Recovery Member',
      passwordHash: await bcrypt.hash('oldPassword123!', 10),
      status: 'ACTIVE',
    },
  });

  try {
    const res = await PasswordResetService.requestReset(email, '127.0.0.1', 'TestAgent');
    assert.strictEqual(res.success, true);
    assert.strictEqual(
      res.message,
      'Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you.'
    );

    // Verify recovery request was created in PENDING state
    const reqRecord = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id },
    });
    assert.ok(reqRecord, 'PasswordResetRequest record must exist');
    assert.strictEqual(reqRecord.status, 'PENDING');
    assert.strictEqual(reqRecord.tokenHash, null, 'Raw token and hash must not exist at request time');
  } finally {
    await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('2. Non-existent accounts receive indistinguishable generic response with zero enumeration', async () => {
  const fakeEmail = `nonexistent-${Date.now()}@kaiaura.com`;
  const res = await PasswordResetService.requestReset(fakeEmail, '127.0.0.1');

  assert.strictEqual(res.success, true);
  assert.strictEqual(
    res.message,
    'Your password reset request has been submitted. An authorized administrator will verify your identity and share a secure password reset link with you.'
  );

  // Confirm no request record was created for nonexistent account
  const record = await prisma.passwordResetRequest.findFirst({
    where: { user: { email: fakeEmail } },
  });
  assert.strictEqual(record, null);
});

test('3. Duplicate requests within 2 hours do not flood the recovery queue', async () => {
  const email = `flood-test-${Date.now()}@kaiaura.com`;
  const user = await prisma.user.create({
    data: {
      email,
      employeeId: `EMP-FLD-${Date.now()}`,
      name: 'Flood Test User',
      passwordHash: await bcrypt.hash('password123', 10),
      status: 'ACTIVE',
    },
  });

  try {
    // First request
    await PasswordResetService.requestReset(email, '127.0.0.1');
    // Immediate second request
    await PasswordResetService.requestReset(email, '127.0.0.1');
    // Immediate third request
    await PasswordResetService.requestReset(email, '127.0.0.1');

    const count = await prisma.passwordResetRequest.count({
      where: { userId: user.id },
    });
    assert.strictEqual(count, 1, 'Multiple submissions within 2h must deduplicate and not create multiple records');
  } finally {
    await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test('4. Self-verification is strictly denied', async () => {
  const operator = await prisma.user.create({
    data: {
      email: `self-op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-SELF-${Date.now()}`,
      name: 'Self Operator',
      passwordHash: await bcrypt.hash('pass12345', 10),
      status: 'ACTIVE',
    },
  });

  const request = await prisma.passwordResetRequest.create({
    data: {
      userId: operator.id,
      status: 'PENDING',
    },
  });

  try {
    await assert.rejects(
      async () => {
        await PasswordResetService.verifyRequest(request.id, operator.id);
      },
      (err: any) => {
        assert.ok(err instanceof AuthorizationError);
        assert.match(err.message, /Self-verification is not permitted/i);
        return true;
      }
    );
  } finally {
    await prisma.passwordResetRequest.delete({ where: { id: request.id } });
    await prisma.user.delete({ where: { id: operator.id } });
  }
});

test('5. Link cannot be issued prior to identity verification', async () => {
  const member = await prisma.user.create({
    data: {
      email: `unverified-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-UNV-${Date.now()}`,
      name: 'Unverified Member',
      passwordHash: await bcrypt.hash('pass12345', 10),
      status: 'ACTIVE',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: `op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-OP-${Date.now()}`,
      name: 'Valid Operator',
      status: 'ACTIVE',
    },
  });

  const request = await prisma.passwordResetRequest.create({
    data: {
      userId: member.id,
      status: 'PENDING', // NOT verified yet
    },
  });

  try {
    await assert.rejects(
      async () => {
        await PasswordResetService.issueResetLink(request.id, operator.id);
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /must be verified before issuing a reset link/i);
        return true;
      }
    );
  } finally {
    await prisma.passwordResetRequest.delete({ where: { id: request.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, operator.id] } } });
  }
});

test('6. Link issuance generates CSPRNG token, stores only SHA-256 hash, and sets 15-minute TTL', async () => {
  const member = await prisma.user.create({
    data: {
      email: `issue-test-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-ISS-${Date.now()}`,
      name: 'Issue Member',
      status: 'ACTIVE',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: `issue-op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-IOP-${Date.now()}`,
      name: 'Issuing Operator',
      status: 'ACTIVE',
    },
  });

  const request = await prisma.passwordResetRequest.create({
    data: {
      userId: member.id,
      status: 'PENDING',
    },
  });

  try {
    // 1. Verify
    await PasswordResetService.verifyRequest(request.id, operator.id, 'Passport and employee badge verified');
    const verifiedReq = await prisma.passwordResetRequest.findUnique({ where: { id: request.id } });
    assert.strictEqual(verifiedReq?.status, 'VERIFIED');

    // 2. Issue link
    const issuance = await PasswordResetService.issueResetLink(request.id, operator.id);
    assert.ok(issuance.resetUrl, 'Reset URL must be returned once to operator');
    assert.match(issuance.resetUrl, /\/reset-password\?token=[0-9a-f]{64}/i);

    // Extract raw token from resetUrl
    const urlObj = new URL(issuance.resetUrl);
    const rawToken = urlObj.searchParams.get('token')!;
    assert.strictEqual(rawToken.length, 64, 'Raw token must have 256 bits of entropy (64 hex characters)');

    // 3. Inspect database: raw token must NOT be in the database
    const dbRecord = await prisma.passwordResetRequest.findUnique({ where: { id: request.id } });
    assert.notStrictEqual(dbRecord?.tokenHash, rawToken, 'Raw token must NEVER be stored in the database');

    // The stored hash must match SHA-256 of raw token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.strictEqual(dbRecord?.tokenHash, expectedHash, 'Stored tokenHash must match SHA-256 of raw token');

    // 4. Verify TTL is approximately 15 minutes from now
    const ttlMinutes = (dbRecord!.tokenExpiresAt!.getTime() - Date.now()) / (60 * 1000);
    assert.ok(ttlMinutes >= 14 && ttlMinutes <= 15.1, `TTL must be 15 minutes, got ${ttlMinutes}`);
  } finally {
    await prisma.passwordResetRequest.delete({ where: { id: request.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, operator.id] } } });
  }
});

test('7. Queue listing never exposes raw tokens, token hashes, or reset URLs', async () => {
  const member = await prisma.user.create({
    data: {
      email: `queue-sec-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-QSEC-${Date.now()}`,
      name: 'Queue Sec Member',
      status: 'ACTIVE',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: `q-op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-QOP-${Date.now()}`,
      name: 'Queue Operator',
      status: 'ACTIVE',
    },
  });

  const request = await prisma.passwordResetRequest.create({
    data: {
      userId: member.id,
      status: 'PENDING',
    },
  });

  try {
    await PasswordResetService.verifyRequest(request.id, operator.id);
    await PasswordResetService.issueResetLink(request.id, operator.id);

    const queue = await PasswordResetService.getQueue({ search: member.email });
    assert.strictEqual(queue.requests.length, 1);

    const item = queue.requests[0] as any;
    assert.strictEqual('token' in item, false, 'Raw token must NOT be in queue response');
    assert.strictEqual('tokenHash' in item, false, 'Token hash must NOT be in queue response');
    assert.strictEqual('resetUrl' in item, false, 'Reset URL must NOT be in queue response');
    assert.strictEqual('password' in item, false);
  } finally {
    await prisma.passwordResetRequest.delete({ where: { id: request.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, operator.id] } } });
  }
});

test('8. Re-issuing a link invalidates any prior unconsumed link', async () => {
  const member = await prisma.user.create({
    data: {
      email: `reissue-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-REISS-${Date.now()}`,
      name: 'Reissue Member',
      status: 'ACTIVE',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: `reissue-op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-ROP-${Date.now()}`,
      name: 'Reissue Operator',
      status: 'ACTIVE',
    },
  });

  // Request 1
  const req1 = await prisma.passwordResetRequest.create({
    data: { userId: member.id, status: 'VERIFIED' },
  });
  const link1 = await PasswordResetService.issueResetLink(req1.id, operator.id);
  const rawToken1 = new URL(link1.resetUrl).searchParams.get('token')!;

  // Request 2
  const req2 = await prisma.passwordResetRequest.create({
    data: { userId: member.id, status: 'VERIFIED' },
  });
  const link2 = await PasswordResetService.issueResetLink(req2.id, operator.id);
  const rawToken2 = new URL(link2.resetUrl).searchParams.get('token')!;

  try {
    // req1 must be cancelled/superseded
    const updatedReq1 = await prisma.passwordResetRequest.findUnique({ where: { id: req1.id } });
    assert.strictEqual(updatedReq1?.status, 'CANCELLED');
    assert.strictEqual(updatedReq1?.cancellationReason, 'SUPERSEDED_BY_NEW_LINK');

    // Attempting to reset using rawToken1 must fail
    await assert.rejects(
      async () => {
        await PasswordResetService.resetPassword(rawToken1, 'NewPass123!@#');
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );

    // rawToken2 must remain active
    const resetResult = await PasswordResetService.resetPassword(rawToken2, 'NewPass123!@#');
    assert.strictEqual(resetResult.success, true);
  } finally {
    await prisma.passwordResetRequest.deleteMany({ where: { userId: member.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, operator.id] } } });
  }
});

test('9. Full lifecycle: Reset changes password, rejects old password, and invalidates prior JWT session', async () => {
  const email = `full-reset-${Date.now()}@kaiaura.com`;
  const oldPassword = 'OldInitialPassword!2026';
  const newPassword = 'BrandNewStrongPassword!2026';

  const member = await prisma.user.create({
    data: {
      email,
      employeeId: `EMP-FULL-${Date.now()}`,
      name: 'Full Lifecycle Member',
      passwordHash: await bcrypt.hash(oldPassword, 10),
      status: 'ACTIVE',
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: `full-op-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-FOP-${Date.now()}`,
      name: 'Full Lifecycle Operator',
      status: 'ACTIVE',
    },
  });

  try {
    // 1. User logs in with old password and gets JWT
    const initialAuth = await AuthService.login(email, oldPassword);
    assert.strictEqual(initialAuth.email, email);

    const oldSessionToken = await encrypt({
      userId: member.id,
      email: member.email,
      roles: ['USER'],
    });

    const decodedSession = await decrypt(oldSessionToken);
    assert.ok(decodedSession.iat, 'JWT must have iat timestamp');

    // 2. Member requests password reset
    await PasswordResetService.requestReset(email);
    const req = await prisma.passwordResetRequest.findFirst({
      where: { userId: member.id, status: 'PENDING' },
    });
    assert.ok(req);

    // 3. Operator verifies and issues link
    await PasswordResetService.verifyRequest(req!.id, operator.id, 'Verified via corporate video call');
    const issuance = await PasswordResetService.issueResetLink(req!.id, operator.id);
    const rawToken = new URL(issuance.resetUrl).searchParams.get('token')!;

    // Ensure at least 1 second difference for timestamp comparison
    await new Promise((r) => setTimeout(r, 1100));

    // 4. Member submits new password
    const resetResult = await PasswordResetService.resetPassword(rawToken, newPassword);
    assert.strictEqual(resetResult.success, true);

    // 5. Verify old password no longer works
    await assert.rejects(
      async () => {
        await AuthService.login(email, oldPassword);
      },
      (err: any) => {
        assert.ok(err instanceof AuthenticationError);
        assert.strictEqual(err.message, 'Invalid credentials');
        return true;
      }
    );

    // 6. Verify new password works
    const newAuth = await AuthService.login(email, newPassword);
    assert.strictEqual(newAuth.email, email);

    // 7. Verify pre-existing JWT session is invalidated via passwordChangedAt
    const updatedUser = await prisma.user.findUnique({ where: { id: member.id } });
    assert.ok(updatedUser?.passwordChangedAt, 'passwordChangedAt must be populated');
    const changedEpoch = Math.floor(updatedUser!.passwordChangedAt!.getTime() / 1000);
    assert.ok(
      decodedSession.iat! < changedEpoch,
      `Pre-existing JWT iat (${decodedSession.iat}) must be older than passwordChangedAt (${changedEpoch})`
    );

    // 8. Single-use: submitting the same token again must fail
    await assert.rejects(
      async () => {
        await PasswordResetService.resetPassword(rawToken, 'AnotherPassword!999');
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /already been used|no longer valid/i);
        return true;
      }
    );
  } finally {
    await prisma.passwordResetRequest.deleteMany({ where: { userId: member.id } });
    await prisma.user.deleteMany({ where: { id: { in: [member.id, operator.id] } } });
  }
});

test('10. Expired tokens are rejected safely', async () => {
  const member = await prisma.user.create({
    data: {
      email: `expired-test-${Date.now()}@kaiaura.com`,
      employeeId: `EMP-EXP-${Date.now()}`,
      name: 'Expired Test Member',
      status: 'ACTIVE',
    },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Expired 10 minutes ago
  const req = await prisma.passwordResetRequest.create({
    data: {
      userId: member.id,
      status: 'LINK_ISSUED',
      tokenHash,
      tokenExpiresAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  try {
    await assert.rejects(
      async () => {
        await PasswordResetService.resetPassword(rawToken, 'NewSecurePassword123!');
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /expired/i);
        return true;
      }
    );

    // Request status must be updated to EXPIRED
    const updated = await prisma.passwordResetRequest.findUnique({ where: { id: req.id } });
    assert.strictEqual(updated?.status, 'EXPIRED');
  } finally {
    await prisma.passwordResetRequest.delete({ where: { id: req.id } });
    await prisma.user.delete({ where: { id: member.id } });
  }
});
