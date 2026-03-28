import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LandingPage from './landing';

export default async function RootPage() {
  const session = await auth();

  // Authenticated users go straight to the app
  if (session?.user) {
    const onboardingDone = (session.user as { onboardingDone?: boolean }).onboardingDone;
    if (!onboardingDone) redirect('/onboarding');
    redirect('/dashboard');
  }

  // Unauthenticated visitors see the landing page
  return <LandingPage />;
}
