import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskService } from '@/services/task.service';
import { StoreService } from '@/services/store.service';
import { ValidationError, ApplicationError } from '@/lib/errors';

/**
 * Tasks and Store Integrity Test Suite
 * 
 * Verifies domain validation rules for Task and Store services:
 * 1. Required parameters for task creation.
 * 2. Required parameters for store item creation.
 * 3. Validation and 404 handling during store item redemption.
 */

test('TaskService rejects task creation with missing title or createdById', async () => {
  await assert.rejects(
    async () => {
      await TaskService.createTask({
        title: '',
        description: 'Test Description',
        baseAura: 100,
        createdById: 'user-123',
      });
    },
    {
      name: 'Error',
      message: 'Title and Creator ID are required',
    }
  );

  await assert.rejects(
    async () => {
      await TaskService.createTask({
        title: 'Task without creator',
        description: 'Test Description',
        baseAura: 100,
        createdById: '',
      });
    },
    {
      name: 'Error',
      message: 'Title and Creator ID are required',
    }
  );
});

test('StoreService rejects store item creation with missing required fields', async () => {
  await assert.rejects(
    async () => {
      await StoreService.createStoreItem({
        name: '',
        basePrice: 1000,
        stock: 5,
      });
    },
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.strictEqual(err.message, 'Name and Base Price are required');
      return true;
    }
  );
});

test('StoreService rejects redemption with missing IDs or non-existent items', async () => {
  await assert.rejects(
    async () => {
      await StoreService.redeemStoreItem('', 'item-123');
    },
    (err: unknown) => {
      assert.ok(err instanceof ValidationError);
      assert.strictEqual(err.message, 'User ID and Store Item ID are required');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await StoreService.redeemStoreItem('user-123', 'non-existent-item-id-999');
    },
    (err: unknown) => {
      assert.ok(err instanceof ApplicationError);
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.code, 'ITEM_NOT_FOUND');
      return true;
    }
  );
});
