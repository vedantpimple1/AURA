import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { NotificationObservabilityService } from '../src/services/notification-observability.service';

test('Notification Observability Service (SMTP-08)', async (t) => {
  const timestamp = Date.now();
  const testUser = await prisma.user.create({
    data: {
      name: 'Observability Test User',
      email: `obs-${timestamp}@example.com`,
      employeeId: `EMP-OBS-${timestamp}`,
    },
  });

  const taskTitle = `Obs Task ${timestamp} 1`;
  const kudosTitle = `Obs Kudos ${timestamp} 2`;

  const notification1 = await prisma.notification.create({
    data: {
      userId: testUser.id,
      type: 'TASK_ASSIGNED',
      title: taskTitle,
      message: 'Task assigned message',
      metadata: { taskId: 'task-123', secretKey: 'super-secret-token' },
    },
  });

  const notification2 = await prisma.notification.create({
    data: {
      userId: testUser.id,
      type: 'KUDOS_RECEIVED',
      title: kudosTitle,
      message: 'Kudos message',
    },
  });

  // Seed sample deliveries with various states
  const delSent = await prisma.notificationDelivery.create({
    data: {
      notificationId: notification1.id,
      channel: 'EMAIL',
      status: 'SENT',
      attempts: 1,
      sentAt: new Date(),
    },
  });

  const delFailed = await prisma.notificationDelivery.create({
    data: {
      notificationId: notification2.id,
      channel: 'EMAIL',
      status: 'FAILED',
      attempts: 3,
      errorDetails: 'connect ECONNREFUSED 127.0.0.1:1025 with postgresql://user:my_secret_pw@localhost:5432/db',
    },
  });

  await t.test('1. Summary aggregation computes valid counts across all statuses', async () => {
    const summary = await NotificationObservabilityService.getDeliverySummary();
    assert.ok(summary.total >= 2);
    assert.ok(summary.sent >= 1);
    assert.ok(summary.failed >= 1);
    assert.ok(typeof summary.totalAttempts === 'number');
    assert.ok(summary.activity);
    assert.ok(summary.activity.workerTelemetryNote.includes('Worker health inferred'));
  });

  await t.test('2. Summary groups by notification type accurately', async () => {
    const summary = await NotificationObservabilityService.getDeliverySummary();
    assert.ok(summary.byType);
    assert.ok(summary.byType['TASK_ASSIGNED'] >= 1);
    assert.ok(summary.byType['KUDOS_RECEIVED'] >= 1);
  });

  await t.test('3. Status filter correctly filters deliveries', async () => {
    const sentResults = await NotificationObservabilityService.getDeliveries({
      status: 'SENT',
    });
    assert.ok(sentResults.deliveries.length > 0);
    for (const d of sentResults.deliveries) {
      assert.strictEqual(d.status, 'SENT');
    }

    const failedResults = await NotificationObservabilityService.getDeliveries({
      status: 'FAILED',
    });
    assert.ok(failedResults.deliveries.length > 0);
    for (const d of failedResults.deliveries) {
      assert.strictEqual(d.status, 'FAILED');
    }
  });

  await t.test('4. Notification type filter correctly filters deliveries', async () => {
    const taskDeliveries = await NotificationObservabilityService.getDeliveries({
      type: 'TASK_ASSIGNED',
    });
    assert.ok(taskDeliveries.deliveries.length > 0);
    for (const d of taskDeliveries.deliveries) {
      assert.strictEqual(d.notification.type, 'TASK_ASSIGNED');
    }
  });

  await t.test('5. Search query filters across recipient email or title', async () => {
    const searchEmailResults = await NotificationObservabilityService.getDeliveries({
      search: `obs-${timestamp}`,
    });
    assert.ok(searchEmailResults.deliveries.length >= 2);

    const searchTitleResults = await NotificationObservabilityService.getDeliveries({
      search: taskTitle,
    });
    assert.strictEqual(searchTitleResults.deliveries.length, 1);
    assert.strictEqual(searchTitleResults.deliveries[0].notification.title, taskTitle);
  });

  await t.test('6. Pagination respects page and pageSize constraints', async () => {
    const page1 = await NotificationObservabilityService.getDeliveries({
      page: 1,
      pageSize: 1,
    });
    assert.strictEqual(page1.deliveries.length, 1);
    assert.strictEqual(page1.page, 1);
    assert.strictEqual(page1.pageSize, 1);
    assert.ok(page1.totalPages >= 2);

    // Enforces maximum page size limit
    const overSized = await NotificationObservabilityService.getDeliveries({
      pageSize: 500,
    });
    assert.strictEqual(overSized.pageSize, 100);
  });

  await t.test('7. Date range filtering retrieves deliveries within interval', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const res = await NotificationObservabilityService.getDeliveries({
      startDate: yesterday.toISOString(),
      endDate: tomorrow.toISOString(),
    });
    assert.ok(res.deliveries.length >= 2);
  });

  await t.test('8. Error details are securely sanitized', async () => {
    const fetched = await NotificationObservabilityService.getDeliveryById(delFailed.id);
    assert.ok(fetched);
    assert.ok(fetched.errorDetails);
    // Preserves diagnostic code
    assert.ok(fetched.errorDetails.includes('connect ECONNREFUSED'));
    // Masks connection credentials and passwords
    assert.ok(!fetched.errorDetails.includes('my_secret_pw'));
    assert.ok(!fetched.errorDetails.includes('postgresql://'));
    assert.ok(fetched.errorDetails.includes('[REDACTED_CONNECTION_URI]'));
  });

  await t.test('9. Sensitive metadata keys are masked', async () => {
    const fetched = await NotificationObservabilityService.getDeliveryById(delSent.id);
    assert.ok(fetched);
    assert.ok(fetched.notification.metadata);
    const meta = fetched.notification.metadata as Record<string, unknown>;
    assert.strictEqual(meta.taskId, 'task-123');
    // Secret key masked
    assert.strictEqual(meta.secretKey, '[REDACTED]');
  });

  await t.test('10. sanitizeErrorDetails helper handles passwords and raw paths safely', () => {
    const raw = 'Error: SMTP password=supersecret pass=another123 at /var/www/aura/src/index.ts';
    const sanitized = NotificationObservabilityService.sanitizeErrorDetails(raw);
    assert.ok(sanitized);
    assert.ok(!sanitized.includes('supersecret'));
    assert.ok(!sanitized.includes('another123'));
    assert.ok(sanitized.includes('[LOCAL_PATH]'));
  });
});
