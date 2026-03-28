import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoalsClient } from './GoalsClient';

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const goals = await prisma.goal.findMany({
    where: { userId, status: { not: 'ABANDONED' } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  return <GoalsClient goals={goals} />;
}
