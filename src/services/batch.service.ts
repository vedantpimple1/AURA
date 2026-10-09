import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/errors';

export class BatchService {
  static async getBatches() {
    return await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createBatch(data: { name: string, year: number, startDate: Date, endDate: Date }) {
    if (!data.name || !data.year) {
      throw new ValidationError('Batch name and year are required');
    }

    return await prisma.batch.create({
      data: {
        name: data.name,
        year: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'ACTIVE'
      }
    });
  }
}
