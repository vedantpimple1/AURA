import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { DeliveryProcessorService } from '../src/services/delivery-processor.service';
import { EmailService } from '../src/services/email.service';
import nodemailer from 'nodemailer';

test('DeliveryProcessorService', async (t) => {
  // Inject mock transporter using streamTransport
  (EmailService as any).transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
  });

  const user = await prisma.user.create({
    data: {
      name: 'Processor Test User',
      email: `processor-${Date.now()}@example.com`,
      employeeId: `PROC-${Date.now()}`,
    },
  });

  await t.test('Processor discovers PENDING EMAIL deliveries and reaches SENT', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'STORE_FULFILLMENT',
        title: 'Processor Test',
        message: 'Testing discovery',
      },
    });

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    const results = await DeliveryProcessorService.processPendingEmailDeliveries(1000);
    
    assert.strictEqual(results.processed > 0, true, 'Should process at least one delivery');
    assert.strictEqual(results.succeeded > 0, true, 'Should succeed processing');

    const updated = await prisma.notificationDelivery.findUnique({ where: { id: delivery.id } });
    assert.strictEqual(updated?.status, 'SENT', 'Delivery status should be SENT');
  });

  await t.test('Failed delivery reaches FAILED and does not block queue', async () => {
    const userNoEmail = await prisma.user.create({
      data: {
        name: 'Processor No Email User',
        email: `NO-EMAIL-PROC-${Date.now()}`, // Invalid email
        employeeId: `PROC-NO-${Date.now()}`,
      },
    });

    const notifFail = await prisma.notification.create({
      data: { userId: userNoEmail.id, type: 'STORE_FULFILLMENT', title: 'Fail Test', message: 'Fail' },
    });

    const notifSuccess = await prisma.notification.create({
      data: { userId: user.id, type: 'STORE_FULFILLMENT', title: 'Succ Test', message: 'Succ' },
    });

    const failDelivery = await prisma.notificationDelivery.create({
      data: { notificationId: notifFail.id, channel: 'EMAIL', status: 'PENDING' },
    });

    const succDelivery = await prisma.notificationDelivery.create({
      data: { notificationId: notifSuccess.id, channel: 'EMAIL', status: 'PENDING' },
    });

    const results = await DeliveryProcessorService.processPendingEmailDeliveries(1000);
    
    // We expect both to be processed in the batch
    const updatedFail = await prisma.notificationDelivery.findUnique({ where: { id: failDelivery.id } });
    const updatedSucc = await prisma.notificationDelivery.findUnique({ where: { id: succDelivery.id } });

    assert.strictEqual(updatedFail?.status, 'FAILED');
    assert.strictEqual(updatedSucc?.status, 'SENT');
  });

  await t.test('Already PROCESSING delivery is not processed unless stale', async () => {
    const notif = await prisma.notification.create({
      data: { userId: user.id, type: 'STORE_FULFILLMENT', title: 'Lock Test', message: 'Lock' },
    });

    const freshProcessingDelivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PROCESSING',
        updatedAt: new Date(), // Just updated, not stale
      },
    });

    const results = await DeliveryProcessorService.processPendingEmailDeliveries(1000);
    
    const checkDelivery = await prisma.notificationDelivery.findUnique({ where: { id: freshProcessingDelivery.id } });
    
    // Status should remain PROCESSING, and it should NOT be touched
    assert.strictEqual(checkDelivery?.status, 'PROCESSING');
  });

  await t.test('Already SENT delivery is ignored', async () => {
    const notif = await prisma.notification.create({
      data: { userId: user.id, type: 'STORE_FULFILLMENT', title: 'Sent Ignore', message: 'Sent' },
    });

    const sentDelivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'SENT',
      },
    });

    const results = await DeliveryProcessorService.processPendingEmailDeliveries(1000);
    const checkDelivery = await prisma.notificationDelivery.findUnique({ where: { id: sentDelivery.id } });
    assert.strictEqual(checkDelivery?.status, 'SENT');
  });

  await t.test('Stale PROCESSING behavior recovers the delivery', async () => {
    const notif = await prisma.notification.create({
      data: { userId: user.id, type: 'STORE_FULFILLMENT', title: 'Stale Test', message: 'Stale' },
    });

    // Manually create a delivery that looks like it's been PROCESSING for 20 minutes (stale)
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const staleDelivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PROCESSING',
        updatedAt: twentyMinsAgo,
      },
    });

    // The processor should find this stale record, revert to PENDING, then process to SENT
    const results = await DeliveryProcessorService.processPendingEmailDeliveries(1000);
    
    const checkDelivery = await prisma.notificationDelivery.findUnique({ where: { id: staleDelivery.id } });
    
    // Since we mocked SMTP, it should successfully send
    assert.strictEqual(checkDelivery?.status, 'SENT');
    assert.ok(checkDelivery?.updatedAt.getTime()! > twentyMinsAgo.getTime(), 'Updated at should be refreshed');
  });
  await t.test('Transient failure retries and respects max attempts', async () => {
    const notif = await prisma.notification.create({
      data: { userId: user.id, type: 'STORE_FULFILLMENT', title: 'Retry Test', message: 'Retry' },
    });

    const retryDelivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notif.id,
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });

    // Mock a transient error
    const originalTransporter = (EmailService as any).transporter;
    (EmailService as any).transporter = {
      sendMail: async () => {
        const err = new Error('ECONNRESET');
        (err as any).code = 'ECONNRESET';
        throw err;
      }
    };

    // Override the max retries env var for this test just in case
    process.env.DELIVERY_WORKER_MAX_RETRIES = '3';

    // Fast-forward backoff delays by overriding the setTimeout in global (or since it's inline in EmailService we just let it sleep; 1s + 2s + 4s = 7s. That's a bit long for a unit test. 
    // Let's mock Math.pow to always return 0 to skip delays)
    const origPow = Math.pow;
    Math.pow = () => 0;

    try {
      // Attempt 1 -> fails transiently -> PENDING, attempts: 1
      await DeliveryProcessorService.processPendingEmailDeliveries(1);
      let check = await prisma.notificationDelivery.findUnique({ where: { id: retryDelivery.id } });
      assert.strictEqual(check?.status, 'PENDING');
      assert.strictEqual(check?.attempts, 1);

      // Attempt 2 -> fails transiently -> PENDING, attempts: 2
      await DeliveryProcessorService.processPendingEmailDeliveries(1);
      check = await prisma.notificationDelivery.findUnique({ where: { id: retryDelivery.id } });
      assert.strictEqual(check?.status, 'PENDING');
      assert.strictEqual(check?.attempts, 2);

      // Attempt 3 -> fails transiently -> PENDING, attempts: 3
      await DeliveryProcessorService.processPendingEmailDeliveries(1);
      check = await prisma.notificationDelivery.findUnique({ where: { id: retryDelivery.id } });
      assert.strictEqual(check?.status, 'PENDING');
      assert.strictEqual(check?.attempts, 3);

      // Attempt 4 -> max retries exceeded -> FAILED, attempts: 4
      await DeliveryProcessorService.processPendingEmailDeliveries(1);
      check = await prisma.notificationDelivery.findUnique({ where: { id: retryDelivery.id } });
      assert.strictEqual(check?.status, 'FAILED');
      assert.strictEqual(check?.attempts, 4);
    } finally {
      // Restore
      (EmailService as any).transporter = originalTransporter;
      Math.pow = origPow;
    }
  });
});
