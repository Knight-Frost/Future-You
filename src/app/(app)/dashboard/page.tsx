import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [profile, goals] = await Promise.all([
    prisma.financialProfile.findUnique({ where: { userId } }),
    prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
      take: 1,
    }),
  ]);

  const userName = session.user.name ?? null;

  return (
    <DashboardClient
      userName={userName}
      profile={profile}
      goals={goals}
    />
  );
}
