import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppSettingsClient } from './AppSettingsClient';

export default async function AppSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [user, userSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  return <AppSettingsClient user={user} userSettings={userSettings} />;
}
