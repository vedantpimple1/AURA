import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { NotificationService } from '../src/services/notification.service';
import { TaskService } from '../src/services/task.service';

test('NotificationService Dispatcher', async (t) => {
  // Setup: Create a test user
  const user = await prisma.user.create({
    data: {
      name: 'Dispatch Test User',
      email: `dispatch-test-${Date.now()}@example.com`,
      employeeId: `DISPATCH-${Date.now()}`,
    },
  });

  await t.test('Missing preferences uses defaults (In-App + Email)', async () => {
    const notification = await NotificationService.dispatch({
      userId: user.id,
      type: 'TEST_DEFAULT',
      title: 'Default Test',
      message: 'Testing default behavior',
    });

    assert.ok(notification, 'Notification should be returned');
    assert.strictEqual(notification.readAt, null, 'In-App enabled should keep readAt null');

    const delivery = await prisma.notificationDelivery.findFirst({
      where: { notificationId: notification.id },
    });
    assert.ok(delivery, 'Delivery record should be created');
    assert.strictEqual(delivery.channel, 'EMAIL', 'Channel should be EMAIL');
    assert.strictEqual(delivery.status, 'PENDING', 'Status should be PENDING');
  });

  await t.test('Respects explicit preferences (Email disabled, In-App enabled)', async () => {
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        notificationType: 'TEST_NO_EMAIL',
        emailEnabled: false,
        inAppEnabled: true,
      },
    });

    const notification = await NotificationService.dispatch({
      userId: user.id,
      type: 'TEST_NO_EMAIL',
      title: 'No Email Test',
      message: 'Testing no email',
    });

    assert.ok(notification);
    assert.strictEqual(notification.readAt, null);

    const delivery = await prisma.notificationDelivery.findFirst({
      where: { notificationId: notification.id },
    });
    assert.ok(!delivery, 'Delivery record should NOT be created if email is disabled');
  });

  await t.test('Respects explicit preferences (Email enabled, In-App disabled)', async () => {
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        notificationType: 'TEST_NO_INAPP',
        emailEnabled: true,
        inAppEnabled: false,
      },
    });

    const notification = await NotificationService.dispatch({
      userId: user.id,
      type: 'TEST_NO_INAPP',
      title: 'No InApp Test',
      message: 'Testing no in-app',
    });

    assert.ok(notification);
    assert.notStrictEqual(notification.readAt, null, 'In-App disabled should suppress unread state via readAt');

    const delivery = await prisma.notificationDelivery.findFirst({
      where: { notificationId: notification.id },
    });
    assert.ok(delivery);
    assert.strictEqual(delivery.channel, 'EMAIL');
  });

  await t.test('Idempotency prevents duplicate deliveries on the same notification', async () => {
    const notification = await NotificationService.dispatch({
      userId: user.id,
      type: 'TEST_IDEMPOTENCY',
      title: 'Idempotency Test',
      message: 'Testing idempotency',
    });

    assert.ok(notification);

    // Manually attempting to create another delivery record for this notification should throw
    await assert.rejects(
      prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'EMAIL',
        },
      }),
      (err: any) => err.code === 'P2002',
      'Should reject due to unique constraint on notificationId + channel'
    );
  });

  await t.test('TASK_ASSIGNED continues to work and dispatches properly', async () => {
    const creator = await prisma.user.create({
      data: {
        name: 'Task Creator',
        email: `creator-${Date.now()}@example.com`,
        employeeId: `CREATOR-${Date.now()}`,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: 'Integration Task',
        baseAura: 100,
        createdById: creator.id,
      },
    });

    const assignment = await TaskService.assignTask(task.id, user.id, creator.id);
    assert.ok(assignment);

    // Verify dispatcher was invoked and created a notification for the assignment
    const notifs = await NotificationService.getUserNotifications(user.id);
    const assignedNotif = notifs.find(n => n.type === 'TASK_ASSIGNED' && (n.metadata as any)?.taskId === task.id);
    
    assert.ok(assignedNotif, 'TASK_ASSIGNED notification should exist');
    
    const delivery = await prisma.notificationDelivery.findFirst({
      where: { notificationId: assignedNotif.id },
    });
    assert.ok(delivery, 'Delivery record should exist for the TASK_ASSIGNED notification');
    assert.strictEqual(delivery.channel, 'EMAIL');
  });

});
