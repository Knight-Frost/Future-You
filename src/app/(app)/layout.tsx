import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const onboardingDone = (session.user as { onboardingDone?: boolean }).onboardingDone;
  if (!onboardingDone) {
    redirect('/onboarding');
  }

  return <AppShell>{children}</AppShell>;
}
