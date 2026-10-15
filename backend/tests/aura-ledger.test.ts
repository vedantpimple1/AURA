import test from 'node:test';
import assert from 'node:assert/strict';
import { AuraService } from '@/services/aura.service';
import { ValidationError, ApplicationError } from '@/lib/errors';

/**
 * Aura Ledger Integrity Test Suite
 * 
 * Verifies Phase 05 & rules.md constraints:
 * 1. Aura is a financial-like append-only ledger.
 * 2. Balance is dynamically computed via aggregation.
 * 3. Validation errors on invalid payloads.
 * 4. Insufficient funds prevention on negative transactions.
 */

test('AuraService rejects missing userId when querying available Aura', async () => {
  await assert.rejects(
    async () => {
      await AuraService.getAvailableAura('');
    },
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.strictEqual(err.message, 'User ID is required');
      return true;
    }
  );
});

test('AuraService rejects invalid transaction payloads', async () => {
  // Missing userId
  await assert.rejects(
    async () => {
      await AuraService.addTransaction({
        userId: '',
        type: 'BONUS',
        amount: 50,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.strictEqual(err.message, 'Invalid transaction payload');
      return true;
    }
  );

  // Missing type
  await assert.rejects(
    async () => {
      await AuraService.addTransaction({
        userId: 'some-user-id',
        type: '',
        amount: 50,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.strictEqual(err.message, 'Invalid transaction payload');
      return true;
    }
  );
});

test('AuraService prevents negative balance transaction (INSUFFICIENT_FUNDS)', async () => {
  // Use a non-existent or fresh user ID with 0 balance
  const tempUserId = 'test-zero-balance-' + Date.now();

  const balance = await AuraService.getAvailableAura(tempUserId);
  assert.strictEqual(balance, 0, 'New or empty user should have 0 balance');

  await assert.rejects(
    async () => {
      await AuraService.addTransaction({
        userId: tempUserId,
        type: 'STORE_REDEMPTION',
        amount: -100,
        description: 'Attempt to spend without balance',
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof ApplicationError);
      assert.strictEqual(err.code, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, 'Insufficient Aura balance');
      return true;
    }
  );
});
