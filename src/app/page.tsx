import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const onboardingDone = (session.user as { onboardingDone?: boolean }).onboardingDone;
  if (!onboardingDone) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
