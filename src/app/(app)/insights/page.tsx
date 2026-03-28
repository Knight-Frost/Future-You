import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InsightsClient } from './InsightsClient';

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const insights = await prisma.insight.findMany({
    where: { userId, isDismissed: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return <InsightsClient persistedInsights={insights} />;
}
