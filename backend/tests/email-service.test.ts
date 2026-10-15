import test from 'node:test';
import assert from 'node:assert';
import nodemailer from 'nodemailer';
import { prisma } from '../src/lib/prisma';
import { EmailService } from '../src/services/email.service';

test('EmailService Lifecycle (Mocked SMTP)', async (t) => {
  // 1. Setup mock environment
  process.env.SMTP_HOST = 'mock.smtp.com';
  
  // Inject mock transporter using streamTransport (doesn't connect to network)
  (EmailService as any).transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
  });

  // 2. Setup user and notification
  const user = await prisma.user.create({
    data: {
      name: 'Email Test User',
      email: `email-test-${Date.now()}@example.com`,
      employeeId: `EMAIL-${Date.now()}`,
    },
  });

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'STORE_FULFILLMENT',
      title: 'SMTP Test',
      message: 'Testing lifecycle',
    },
  });

  await t.test('Successfully processes a PENDING delivery and transitions to SENT', async () => {
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    const result = await EmailService.processDelivery(delivery.id);
    assert.strictEqual(result, true, 'Process delivery should return true on success');

    const updated = await prisma.notificationDelivery.findUnique({ where: { id: delivery.id } });
    assert.strictEqual(updated?.status, 'SENT', 'Delivery status should be SENT');
    assert.ok(updated?.sentAt, 'sentAt should be populated');
  });

  await t.test('Fails safely when user has no email', async () => {
    const userNoEmail = await prisma.user.create({
      data: {
        name: 'No Email User',
        email: `INVALID-NO-AT-${Date.now()}`,
        employeeId: `NO-EMAIL-${Date.now()}`,
      },
    });

    const notifNoEmail = await prisma.notification.create({
      data: {
        userId: userNoEmail.id,
        type: 'STORE_FULFILLMENT',
        title: 'SMTP Test No Email',
        message: 'Testing missing email',
      },
    });

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notifNoEmail.id,
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    const result = await EmailService.processDelivery(delivery.id);
    assert.strictEqual(result, false, 'Process delivery should return false');

    const updated = await prisma.notificationDelivery.findUnique({ where: { id: delivery.id } });
    assert.strictEqual(updated?.status, 'FAILED', 'Status should be FAILED');
    assert.strictEqual(updated?.attempts, 1, 'Attempts should be incremented');
    assert.ok(updated?.errorDetails?.includes('User has no valid email address'), 'Error details should match');
  });

  await t.test('Gracefully fails on SMTP error and increments attempts', async () => {
    // Inject a transporter that always fails
    (EmailService as any).transporter = {
      sendMail: async () => { throw new Error('Fake SMTP Error'); }
    };

    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'STORE_FULFILLMENT',
        title: 'SMTP Fail Test',
        message: 'Testing error',
      },
    });

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    const result = await EmailService.processDelivery(delivery.id);
    assert.strictEqual(result, false, 'Should return false on failure');

    const updated = await prisma.notificationDelivery.findUnique({ where: { id: delivery.id } });
    assert.strictEqual(updated?.status, 'FAILED', 'Status should be FAILED');
    assert.strictEqual(updated?.attempts, 1, 'Attempts should be incremented');
    assert.strictEqual(updated?.errorDetails, 'Fake SMTP Error', 'Error details should not contain sensitive stack traces');
  });

  await t.test('Cannot process a delivery that is not PENDING', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'STORE_FULFILLMENT',
        title: 'SMTP Pending Test',
        message: 'Testing pending',
      },
    });

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PROCESSING', // Already claimed
      },
    });

    const result = await EmailService.processDelivery(delivery.id);
    assert.strictEqual(result, false, 'Should return false when attempting to claim non-PENDING delivery');
  });

});
