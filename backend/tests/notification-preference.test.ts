import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { NotificationPreferenceService } from '../src/services/notification-preference.service';
import { NotificationService } from '../src/services/notification.service';

test('Notification Preferences System', async (t) => {
  const user1 = await prisma.user.create({
    data: { name: 'Pref User 1', email: `pref1-${Date.now()}@example.com`, employeeId: `PREF1-${Date.now()}` },
  });

  const user2 = await prisma.user.create({
    data: { name: 'Pref User 2', email: `pref2-${Date.now()}@example.com`, employeeId: `PREF2-${Date.now()}` },
  });

  await t.test('Missing preference uses default enabled behavior', async () => {
    const prefs = await NotificationPreferenceService.getUserPreferences(user1.id);
    const assignedPref = prefs.find(p => p.notificationType === 'TASK_ASSIGNED');
    assert.ok(assignedPref);
    assert.strictEqual(assignedPref.emailEnabled, true);
    assert.strictEqual(assignedPref.inAppEnabled, true);
  });

  await t.test('User can modify own preferences (email updates correctly)', async () => {
    const updated = await NotificationPreferenceService.updatePreference(user1.id, 'TASK_ASSIGNED', { emailEnabled: false });
    assert.strictEqual(updated.emailEnabled, false);
    assert.strictEqual(updated.inAppEnabled, true); // Should default to true

    const fetched = await NotificationPreferenceService.getPreference(user1.id, 'TASK_ASSIGNED');
    assert.strictEqual(fetched.emailEnabled, false);
    assert.strictEqual(fetched.inAppEnabled, true);
  });

  await t.test('Partial updates preserve unrelated fields (in-app updates correctly)', async () => {
    const updated = await NotificationPreferenceService.updatePreference(user1.id, 'TASK_ASSIGNED', { inAppEnabled: false });
    // emailEnabled should still be false from previous test
    assert.strictEqual(updated.emailEnabled, false);
    assert.strictEqual(updated.inAppEnabled, false);
  });

  await t.test('Invalid notification type is rejected', async () => {
    await assert.rejects(
      NotificationPreferenceService.updatePreference(user1.id, 'FAKE_EVENT' as any, { emailEnabled: false }),
      /Unsupported notification type/
    );
  });

  await t.test('Email disabled prevents EMAIL delivery creation', async () => {
    // user1 has TASK_ASSIGNED email=false, inApp=false
    const notification = await NotificationService.dispatch({
      userId: user1.id,
      type: 'TASK_ASSIGNED',
      title: 'Test Email Disabled',
      message: 'Testing',
    });

    const deliveries = await prisma.notificationDelivery.findMany({ where: { notificationId: notification.id } });
    assert.strictEqual(deliveries.length, 0, 'Should not create any delivery records');
    
    // In-app disabled semantic verification (readAt is set)
    assert.ok(notification.readAt !== null, 'In-app notification should be suppressed by setting readAt');
  });

  await t.test('Email enabled creates EMAIL delivery (Dispatcher behavior remains intact)', async () => {
    // user2 has no preferences, defaults to true
    const notification = await NotificationService.dispatch({
      userId: user2.id,
      type: 'TASK_ASSIGNED',
      title: 'Test Email Enabled',
      message: 'Testing',
    });

    const deliveries = await prisma.notificationDelivery.findMany({ where: { notificationId: notification.id } });
    assert.strictEqual(deliveries.length, 1, 'Should create exactly one delivery record');
    assert.strictEqual(deliveries[0].channel, 'EMAIL');
    assert.strictEqual(deliveries[0].status, 'PENDING');
    
    assert.strictEqual(notification.readAt, null, 'In-app notification should remain unread');
  });


});
