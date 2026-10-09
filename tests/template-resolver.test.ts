import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { TemplateResolver } from '../src/services/email/template.resolver';

test('Email Template Resolver', async (t) => {
  const user = await prisma.user.create({
    data: {
      name: 'Template Tester',
      email: `template-${Date.now()}@example.com`,
      employeeId: `TPL-${Date.now()}`,
    },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Normal Task',
      description: 'A normal task',
      baseAura: 100,
      createdById: user.id,
      status: 'OPEN',
    },
  });

  const xssTask = await prisma.task.create({
    data: {
      title: '<script>alert("XSS")</script> Task',
      description: 'An XSS task',
      baseAura: 50,
      createdById: user.id,
      status: 'OPEN',
    },
  });

  await t.test('TEST 1, 3, 4, 5: Supported types resolve subject, text, HTML', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TASK_ASSIGNED',
        title: 'System Title (Ignored by template)',
        message: 'System Msg',
        metadata: { taskId: task.id },
      },
    });

    const payload = await TemplateResolver.resolve(notif, user);

    assert.ok(payload.subject.includes(task.title), 'Subject should contain task title');
    assert.ok(payload.text.includes(task.title), 'Text should contain task title');
    assert.ok(payload.html.includes(task.title), 'HTML should contain task title');
    assert.ok(payload.html.includes('<!DOCTYPE html>'), 'HTML should render base layout');
  });

  await t.test('TEST 2: Unsupported notification type fails safely', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'UNKNOWN_TYPE',
        title: 'Title',
        message: 'Message',
      },
    });

    await assert.rejects(
      async () => TemplateResolver.resolve(notif, user),
      /Unsupported notification type/,
      'Should throw error for unknown type'
    );
  });

  await t.test('TEST 6, 7: Dynamic values and user-controlled task names are HTML escaped', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TASK_ASSIGNED',
        title: 'Title',
        message: 'Message',
        metadata: { taskId: xssTask.id },
      },
    });

    const payload = await TemplateResolver.resolve(notif, user);

    assert.ok(!payload.html.includes('<script>'), 'HTML should not contain raw script tags');
    assert.ok(payload.html.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), 'HTML should escape script tags');
  });

  await t.test('TEST 8: Missing required template data fails safely', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'TASK_ASSIGNED',
        title: 'Title',
        message: 'Message',
        metadata: {}, // Missing taskId
      },
    });

    await assert.rejects(
      async () => TemplateResolver.resolve(notif, user),
      /Missing taskId in TASK_ASSIGNED metadata/,
      'Should throw error when required metadata is missing'
    );
  });

  await t.test('TEST 9: REDEMPTION_REQUESTED resolves subject, text, HTML layout', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'REDEMPTION_REQUESTED',
        title: 'New Store Redemption Request 🎁',
        message: 'Aarav Sharma requested "Coffee Mug" (2000 Aura).',
        metadata: { itemName: 'Coffee Mug', auraCost: 2000 },
      },
    });

    const payload = await TemplateResolver.resolve(notif, user);
    assert.ok(payload.subject.includes('Redemption Request'));
    assert.ok(payload.text.includes('Coffee Mug'));
    assert.ok(payload.html.includes('Coffee Mug'));
    assert.ok(payload.html.includes('<!DOCTYPE html>'));
  });

  await t.test('TEST 10: AURA_AWARDED resolves subject, text, HTML layout', async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'AURA_AWARDED',
        title: 'Aura Points Awarded! ⚡',
        message: 'You received 500 Aura points: "Outstanding contribution"',
        metadata: { amount: 500, description: 'Outstanding contribution' },
      },
    });

    const payload = await TemplateResolver.resolve(notif, user);
    assert.ok(payload.subject.includes('500') || payload.subject.includes('Awarded'));
    assert.ok(payload.text.includes('500'));
    assert.ok(payload.html.includes('500'));
    assert.ok(payload.html.includes('Outstanding contribution'));
    assert.ok(payload.html.includes('<!DOCTYPE html>'));
  });

  // Clean up test data so it doesn't pollute the dev environment
  t.after(async () => {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.task.deleteMany({ where: { createdById: user.id } });
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });
});

