import { NextResponse } from 'next/server';
import { awardAuraAction } from '@/actions/aura.actions';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get('role');
  const userId = url.searchParams.get('userId');

  if (!role || !userId) {
    return NextResponse.json({ error: 'Missing role or userId' }, { status: 400 });
  }

  // Set mock cookie
  const token = await encrypt({
    userId: 'mock-user-id',
    email: 'test@example.com',
    roles: [role],
  });
  
  const cookieStore = await cookies();
  cookieStore.set('session', token);

  const fd = new FormData();
  fd.append('userId', userId);
  fd.append('amount', '100');
  fd.append('description', 'Test award');

  const beforeBalance = await prisma.auraTransaction.aggregate({
    where: { userId },
    _sum: { amount: true }
  });

  const res = await awardAuraAction(fd);

  const afterBalance = await prisma.auraTransaction.aggregate({
    where: { userId },
    _sum: { amount: true }
  });

  // clear the mock session
  cookieStore.delete('session');

  return NextResponse.json({
    role,
    userId,
    beforeBalance: beforeBalance._sum.amount || 0,
    afterBalance: afterBalance._sum.amount || 0,
    result: res,
  });
}
