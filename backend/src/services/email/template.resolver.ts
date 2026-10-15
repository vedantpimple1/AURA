import { Notification, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { escapeHtml } from './utils';
import { renderEmailLayout } from './templates/layout';

export interface EmailPayload {
  subject: string;
  text: string;
  html: string;
}

export class TemplateResolver {
  /**
   * Resolves a notification into an EmailPayload suitable for transport.
   * Throws an error if the template type is unsupported.
   */
  static async resolve(notification: Notification, user: { name: string | null }): Promise<EmailPayload> {
    const safeName = escapeHtml(user.name || 'there');
    const metadata = notification.metadata as Record<string, any> || {};

    switch (notification.type) {
      case 'TASK_ASSIGNED': {
        const taskId = metadata.taskId;
        if (!taskId) throw new Error('Missing taskId in TASK_ASSIGNED metadata');
        
        const task = await prisma.task.findUnique({ where: { id: String(taskId) } });
        if (!task) throw new Error(`Task ${taskId} not found for email rendering`);

        const safeTaskTitle = escapeHtml(task.title);
        const subject = `New Task Assigned: ${task.title}`;
        const text = `Hi ${user.name || 'there'},\n\nYou have been assigned a new task: "${task.title}".\nReward: ${task.baseAura} Aura.\n\nPlease log in to KAI Aura to view details.`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>You have been assigned a new task in your portal.</p>
          <div class="metadata">
            <strong>Task:</strong> ${safeTaskTitle}<br>
            <strong>Reward:</strong> ⚡ ${task.baseAura} Aura
          </div>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?tab=tasks" class="btn">View Task</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('New Task Assigned', htmlContent),
        };
      }

      case 'TASK_APPROVED': {
        const taskId = metadata.taskId;
        if (!taskId) throw new Error('Missing taskId in TASK_APPROVED metadata');
        
        const task = await prisma.task.findUnique({ where: { id: String(taskId) } });
        if (!task) throw new Error(`Task ${taskId} not found`);

        const safeTaskTitle = escapeHtml(task.title);
        const subject = `Task Approved: ${task.title}`;
        const text = `Hi ${user.name || 'there'},\n\nYour submission for "${task.title}" has been approved!\nYou've been awarded ${task.baseAura} Aura.\n\nGreat job!`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>Your task submission has been <strong>approved</strong>!</p>
          <div class="metadata">
            <strong>Task:</strong> ${safeTaskTitle}<br>
            <strong>Aura Rewarded:</strong> ⚡ ${task.baseAura} Aura
          </div>
          <p>Keep up the great work!</p>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('Task Approved 🎉', htmlContent),
        };
      }

      case 'TASK_NEEDS_CHANGES': {
        const taskId = metadata.taskId;
        if (!taskId) throw new Error('Missing taskId in TASK_NEEDS_CHANGES metadata');
        
        const task = await prisma.task.findUnique({ where: { id: String(taskId) } });
        if (!task) throw new Error(`Task ${taskId} not found`);

        const safeTaskTitle = escapeHtml(task.title);
        const safeMessage = escapeHtml(notification.message);
        
        const subject = `Action Required: Revisions needed for ${task.title}`;
        const text = `Hi ${user.name || 'there'},\n\nYour submission for "${task.title}" requires changes.\nFeedback: ${notification.message}\n\nPlease review and resubmit.`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>Your submission for <strong>${safeTaskTitle}</strong> requires some changes before it can be approved.</p>
          <div class="metadata">
            <strong>Feedback:</strong><br>
            ${safeMessage}
          </div>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?tab=tasks" class="btn">Review Feedback</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('Revisions Needed', htmlContent),
        };
      }

      case 'AURA_AWARDED': {
        const safeMessage = escapeHtml(notification.message);
        const amount = metadata.amount || '';
        const description = metadata.description ? escapeHtml(metadata.description) : '';
        const subject = notification.title || (amount ? `Aura Points Awarded: +${amount} ⚡` : 'Aura Points Awarded ⚡');
        const text = `Hi ${user.name || 'there'},\n\n${notification.message}\n\nPlease log in to check your updated balance and activity.`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>You have received Aura points from system leadership!</p>
          <div class="metadata">
            ${amount ? `<strong>Points Awarded:</strong> ⚡ +${amount} Aura<br>` : ''}
            ${description ? `<strong>Reason:</strong> ${description}` : ''}
          </div>
          <p>${safeMessage}</p>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="btn">View Your Aura Balance</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('Aura Points Awarded ⚡', htmlContent),
        };
      }

      case 'STORE_FULFILLMENT': {
        const safeMessage = escapeHtml(notification.message);
        const subject = notification.title || 'Store Reward Fulfilled';
        const text = `Hi ${user.name || 'there'},\n\n${notification.message}`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>${safeMessage}</p>
          <p>Enjoy your reward!</p>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('Reward Fulfilled 🎁', htmlContent),
        };
      }

      case 'REDEMPTION_REQUESTED': {
        const safeMessage = escapeHtml(notification.message);
        const subject = notification.title || 'New Store Redemption Request 🎁';
        const text = `Hi ${user.name || 'Admin'},\n\n${notification.message}\n\nPlease log in to review and fulfill this request in the Redemption Requests queue.`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>A team member has submitted a new reward redemption request:</p>
          <div class="metadata">
            ${safeMessage}
          </div>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?tab=store" class="btn">View Redemption Requests</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('New Redemption Request 🎁', htmlContent),
        };
      }

      case 'KUDOS_RECEIVED': {
        const senderId = metadata.senderId;
        if (!senderId) throw new Error('Missing senderId in KUDOS_RECEIVED metadata');
        
        const sender = await prisma.user.findUnique({ where: { id: String(senderId) } });
        if (!sender) throw new Error(`Sender ${senderId} not found`);

        const safeSenderName = escapeHtml(sender.name || 'A teammate');
        const safeMessage = escapeHtml(notification.message); // Typically Kudos message

        const subject = `You received Kudos from ${sender.name || 'a teammate'}!`;
        const text = `Hi ${user.name || 'there'},\n\n${sender.name || 'A teammate'} sent you Kudos:\n"${notification.message}"\n\nAwesome work!`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p><strong>${safeSenderName}</strong> just sent you some Kudos!</p>
          <div class="metadata">
            "${safeMessage}"
          </div>
          <p>Awesome work!</p>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout('Kudos Received 🌟', htmlContent),
        };
      }

      case 'STREAK_REMINDER': {
        const safeMessage = escapeHtml(notification.message);
        const subject = notification.title || 'Keep Your Streak Alive! ⚡';
        const text = `Hi ${user.name || 'there'},\n\n${notification.message}`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>${safeMessage}</p>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="btn">Go to Dashboard</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout(subject, htmlContent),
        };
      }

      case 'ADMIN_REVIEW_DIGEST': {
        const safeMessage = escapeHtml(notification.message);
        const subject = notification.title || 'Pending Tasks to Review';
        const text = `Hi ${user.name || 'there'},\n\n${notification.message}`;
        const htmlContent = `
          <p>Hi <span class="strong">${safeName}</span>,</p>
          <p>${safeMessage}</p>
          <a href="${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?tab=home" class="btn">Go to Admin Dashboard</a>
        `;

        return {
          subject,
          text,
          html: renderEmailLayout(subject, htmlContent),
        };
      }

      default:
        throw new Error(`Unsupported notification type for email template: ${notification.type}`);
    }
  }
}
