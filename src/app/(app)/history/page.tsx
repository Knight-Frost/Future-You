import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HistoryClient } from './HistoryClient';

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [scenarios, snapshots] = await Promise.all([
    prisma.scenario.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.snapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  return <HistoryClient scenarios={scenarios} snapshots={snapshots} />;
}
