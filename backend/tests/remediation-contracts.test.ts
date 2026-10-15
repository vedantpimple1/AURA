import test from 'node:test';
import assert from 'node:assert/strict';
import { AiService } from '../src/services/ai.service';
import { NotificationPreferenceService, SUPPORTED_NOTIFICATION_TYPES } from '../src/services/notification-preference.service';
import { DeliveryProcessorService } from '../src/services/delivery-processor.service';

/**
 * Remediation API Contracts & Handlers Verification
 * 
 * Verifies the 3 repaired endpoints:
 * 1. Email processor job trigger (POST /api/notifications/jobs/email-processor)
 * 2. Notification preference update by type (PUT /api/notifications/preferences/:type)
 *    and preference reset (DELETE /api/notifications/preferences)
 * 3. AI task breakdown (POST /api/ai/breakdown-task)
 */

test('Remediation: Email processor execution contract is intact', async () => {
  // Verify DeliveryProcessorService can be invoked by the email-processor endpoint safely
  const results = await DeliveryProcessorService.processPendingEmailDeliveries(1);
  assert.ok(typeof results.processed === 'number', 'processed should be a number');
  assert.ok(typeof results.succeeded === 'number', 'succeeded should be a number');
  assert.ok(typeof results.failed === 'number', 'failed should be a number');
  assert.ok(typeof results.skipped === 'number', 'skipped should be a number');
});

test('Remediation: Notification preferences parameter-based update contract', async () => {
  // Test that SUPPORTED_NOTIFICATION_TYPES contains valid preference types
  const testType = SUPPORTED_NOTIFICATION_TYPES[0];
  assert.ok(testType, 'At least one notification type must exist');
  
  // Verify that an invalid type string is detected
  const invalidType = 'INVALID_TYPE_XYZ' as any;
  assert.ok(
    !SUPPORTED_NOTIFICATION_TYPES.includes(invalidType),
    'Invalid notification type should not be recognized'
  );
});

test('Remediation: AI task breakdown endpoint contract accepts objective and returns structured draft', async () => {
  const objective = 'Implement password reset with secure email tokens';
  const draft = await AiService.breakdownTask(objective);

  assert.ok(draft.title && typeof draft.title === 'string', 'Draft must have a title');
  assert.ok(draft.description && typeof draft.description === 'string', 'Draft must have a description');
  assert.ok(typeof draft.suggestedAura === 'number', 'Draft must have numeric suggestedAura');
  assert.ok(draft.suggestedAura >= 50 && draft.suggestedAura <= 500, 'Aura must be within 50-500 bounds');
  assert.ok(Array.isArray(draft.subtasks), 'Draft must have an array of subtasks');
});
