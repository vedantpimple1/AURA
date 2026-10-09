import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/errors';
import { AuraService } from './aura.service';
import { NotificationService } from './notification.service';

export class KudosService {
  /**
   * Sends peer Kudos and awards a small Aura bonus (+10) to the receiver.
   */
  static async sendKudos(data: { senderId: string; receiverId: string; message: string }) {
    if (!data.senderId || !data.receiverId || !data.message?.trim()) {
      throw new ValidationError('Sender, recipient, and a message are required');
    }

    if (data.senderId === data.receiverId) {
      throw new ValidationError('You cannot send Kudos to yourself');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Kudos record
      const kudos = await tx.kudos.create({
        data: {
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message.trim(),
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        }
      });

      // 2. Award 10 Aura to the receiver as social recognition
      await tx.auraTransaction.create({
        data: {
          userId: data.receiverId,
          type: 'KUDOS',
          amount: 10,
          description: `Received Kudos: "${data.message.slice(0, 40)}"`,
          sourceType: 'SOCIAL',
          sourceId: kudos.id,
        }
      });

      return kudos;
    });

    // 3. Notify receiver in real time
    try {
      await NotificationService.dispatch({
        userId: data.receiverId,
        type: 'KUDOS_RECEIVED',
        title: 'Kudos Received! 🌟',
        message: `${result.sender?.name || 'A teammate'} recognized you on the Aura Wall: "${data.message.trim().slice(0, 75)}" (+10 Aura)`,
        metadata: { kudosId: result.id, senderId: data.senderId },
      });
    } catch (e) {
      console.error('Non-blocking notification error:', e);
    }

    return result;
  }

  /**
   * Retrieves recent Kudos moments for the Aura Wall.
   * Auto-seeds initial moments if the table is empty.
   */
  static async getRecentKudos(limit = 20) {
    let items = await prisma.kudos.findMany({
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (items.length === 0) {
      const users = await prisma.user.findMany({ take: 5 });
      if (users.length >= 2) {
        const sampleNotes = [
          'Brilliant work untangling the database migration blockers!',
          'Thanks for jumping into the customer insight sprint on short notice.',
          'Great presentation on our technical roadmap today.',
          'Exceptional dedication to UI polish and user feedback.',
        ];

        for (let i = 0; i < sampleNotes.length; i++) {
          const sender = users[i % users.length];
          const receiver = users[(i + 1) % users.length];
          await prisma.kudos.create({
            data: {
              senderId: sender.id,
              receiverId: receiver.id,
              message: sampleNotes[i],
            }
          });
        }

        items = await prisma.kudos.findMany({
          include: {
            sender: { select: { id: true, name: true, email: true } },
            receiver: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      }
    }

    return items;
  }
}
