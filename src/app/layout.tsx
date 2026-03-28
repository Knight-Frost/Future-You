import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FutureYou — Financial Decision Engine',
    template: '%s — FutureYou',
  },
  description:
    'The fastest, smartest path to your financial goals. FutureYou helps you understand where you are, where you want to go, and exactly how to get there.',
  keywords: ['financial planning', 'debt payoff', 'savings goals', 'financial freedom'],
  authors: [{ name: 'FutureYou' }],
  creator: 'FutureYou',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'FutureYou — Financial Decision Engine',
    description: 'The fastest path to your financial goals.',
    siteName: 'FutureYou',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
