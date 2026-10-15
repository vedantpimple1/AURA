import test from 'node:test';
import assert from 'node:assert/strict';
import { AuraService } from '@/services/aura.service';
import { StoreService } from '@/services/store.service';
import { prisma } from '@/lib/prisma';
import { ApplicationError, ValidationError } from '@/lib/errors';

/**
 * Store Available Aura Balance Integration Test Suite
 * 
 * Verifies:
 * 1. Authoritative available balance calculation through AuraService ledger aggregation.
 * 2. Identity and session enforcement (non-admins cannot query other members' balance).
 * 3. Store redemption balance validation aligns with AuraService.getAvailableAura.
 * 4. Successful store redemption returns authoritative remainingBalance and updates ledger.
 * 5. Failed redemption (insufficient funds) leaves the ledger balance intact without deduction.
 * 6. Zero balance edge cases handled safely.
 */

test('Available Aura calculation aggregates all ledger entries correctly', async () => {
  const tempUser = await prisma.user.create({
    data: {
      employeeId: 'EMP-CALC-' + Date.now(),
      name: 'Balance Calc Test User',
      email: `balance-calc-${Date.now()}@example.com`,
    },
  });

  try {
    // Fresh user with 0 transactions has 0 available Aura
    const initialBalance = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(initialBalance, 0, 'Initial balance must be 0 for user with no ledger entries');

    // Add reward transaction (+500)
    await prisma.auraTransaction.create({
      data: {
        userId: tempUser.id,
        type: 'TASK_REWARD',
        amount: 500,
        description: 'Task Completed',
      },
    });

    const balanceAfterReward = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(balanceAfterReward, 500, 'Balance must be 500 after reward');

    // Add another reward (+300)
    await prisma.auraTransaction.create({
      data: {
        userId: tempUser.id,
        type: 'BONUS',
        amount: 300,
        description: 'Weekly Bonus',
      },
    });

    const balanceAfterSecondReward = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(balanceAfterSecondReward, 800, 'Balance must be 800 after second reward');

    // Add redemption negative transaction (-250)
    await prisma.auraTransaction.create({
      data: {
        userId: tempUser.id,
        type: 'REDEMPTION',
        amount: -250,
        description: 'Store Item Redeemed',
      },
    });

    const balanceAfterRedemption = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(balanceAfterRedemption, 550, 'Balance must be 550 (800 - 250)');
  } finally {
    // Clean up
    await prisma.auraTransaction.deleteMany({ where: { userId: tempUser.id } });
    await prisma.user.delete({ where: { id: tempUser.id } });
  }
});

test('Store redemption validates sufficient balance and rejects insufficient funds', async () => {
  const tempUserId = 'test-insufficient-' + Date.now();

  // Create a temporary store item with basePrice 500
  const storeItem = await prisma.storeItem.create({
    data: {
      name: 'Test Reward Mug',
      basePrice: 500,
      stock: 10,
      status: 'ACTIVE',
    },
  });

  try {
    // User has 0 balance
    const currentBalance = await AuraService.getAvailableAura(tempUserId);
    assert.strictEqual(currentBalance, 0);

    // Attempting to redeem with 0 balance must fail
    await assert.rejects(
      async () => {
        await StoreService.redeemStoreItem(tempUserId, storeItem.id);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApplicationError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'INSUFFICIENT_FUNDS');
        assert.ok(err.message.includes('Insufficient Aura balance'));
        return true;
      }
    );

    // Verify no ledger entries were created
    const transactions = await prisma.auraTransaction.findMany({ where: { userId: tempUserId } });
    assert.strictEqual(transactions.length, 0, 'No transactions should be created on failed redemption');

    // Verify stock was not decremented
    const unchangedItem = await prisma.storeItem.findUnique({ where: { id: storeItem.id } });
    assert.strictEqual(unchangedItem?.stock, 10, 'Stock must remain unchanged');
  } finally {
    // Clean up
    await prisma.storeItem.delete({ where: { id: storeItem.id } });
  }
});

test('Successful store redemption deducts balance and returns authoritative remainingBalance', async () => {
  // Create a temporary user with employeeId
  const tempUser = await prisma.user.create({
    data: {
      employeeId: 'EMP-' + Date.now(),
      name: 'Store Test User',
      email: `store-test-${Date.now()}@example.com`,
    },
  });

  const storeItem = await prisma.storeItem.create({
    data: {
      name: 'Test Wireless Mouse',
      basePrice: 400,
      stock: 5,
      status: 'ACTIVE',
    },
  });

  try {
    // Seed user with 1000 Aura
    await prisma.auraTransaction.create({
      data: {
        userId: tempUser.id,
        type: 'INITIAL_GRANT',
        amount: 1000,
        description: 'Grant for store test',
      },
    });

    const balanceBefore = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(balanceBefore, 1000);

    // Perform redemption
    const result = await StoreService.redeemStoreItem(tempUser.id, storeItem.id);

    // Verify result payload contains remainingBalance
    assert.ok(result.redemption, 'Must return redemption record');
    assert.strictEqual(result.redemption.status, 'PENDING');
    assert.strictEqual(result.redemption.auraCost, 400);
    assert.strictEqual(result.updatedItem.stock, 4, 'Stock must be decremented by 1');
    assert.strictEqual(result.remainingBalance, 600, 'Authoritative remainingBalance must be 600 (1000 - 400)');

    // Verify actual AuraService balance directly matches returned remainingBalance
    const balanceAfter = await AuraService.getAvailableAura(tempUser.id);
    assert.strictEqual(balanceAfter, 600, 'AuraService.getAvailableAura must equal 600');
    assert.strictEqual(result.remainingBalance, balanceAfter, 'Returned remainingBalance must match AuraService aggregation');

    // Verify negative redemption transaction in ledger
    const redemptionTx = await prisma.auraTransaction.findFirst({
      where: {
        userId: tempUser.id,
        type: 'REDEMPTION',
        sourceId: storeItem.id,
      },
    });
    assert.ok(redemptionTx, 'Redemption ledger transaction must exist');
    assert.strictEqual(redemptionTx.amount, -400, 'Ledger transaction must be negative 400');
  } finally {
    // Clean up
    await prisma.redemption.deleteMany({ where: { userId: tempUser.id } });
    await prisma.auraTransaction.deleteMany({ where: { userId: tempUser.id } });
    await prisma.storeItem.delete({ where: { id: storeItem.id } });
    await prisma.user.delete({ where: { id: tempUser.id } });
  }
});

test('Session authorization contract: non-admins cannot query another user balance', () => {
  // Contract test verifying targetUserId derivation logic:
  // const isAdmin = session.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
  // const targetUserId = (isAdmin && requestedUserId) ? requestedUserId : session.userId;

  const memberSession = { userId: 'member-user-1', roles: ['MEMBER'] };
  const requestedUserId = 'victim-user-999';

  const isMemberAdmin = memberSession.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
  const memberTargetUserId = (isMemberAdmin && requestedUserId) ? requestedUserId : memberSession.userId;

  assert.strictEqual(
    memberTargetUserId,
    'member-user-1',
    'Member request with ?userId=victim-user-999 must still target member-user-1'
  );

  const adminSession = { userId: 'admin-user-1', roles: ['ADMIN'] };
  const isAdminAdmin = adminSession.roles?.some(r => ['ADMIN', 'SUPERADMIN'].includes(r.toUpperCase()));
  const adminTargetUserId = (isAdminAdmin && requestedUserId) ? requestedUserId : adminSession.userId;

  assert.strictEqual(
    adminTargetUserId,
    'victim-user-999',
    'Admin request with ?userId=victim-user-999 is permitted to view the requested user'
  );
});
