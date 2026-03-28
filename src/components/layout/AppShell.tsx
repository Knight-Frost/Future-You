'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen flex"
      style={{
        // Animated gradient background — replaces flat color, gives depth like CBG
        background: 'linear-gradient(160deg, #f0fdf4 0%, #f7faf8 35%, #ecfdf5 65%, #f0f9ff 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-[var(--sidebar-width)]">

        {/* Mobile top bar — glass header like CBG DashboardHeader */}
        <header
          className="sticky top-0 z-10 flex items-center gap-3 px-4 lg:hidden flex-shrink-0"
          style={{
            height: '56px',
            background: 'var(--dash-header-bg)',
            borderBottom: '1px solid var(--dash-sidebar-border)',
            backdropFilter: 'blur(16px) saturate(180%) brightness(106%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%) brightness(106%)',
            boxShadow: '0 1px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--royal)',
                letterSpacing: '-0.02em',
              }}
            >
              Future You
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div
            className="mx-auto px-4 sm:px-8 py-8 lg:py-10"
            style={{ maxWidth: 'var(--content-max)' }}
          >
            {/*
              key={pathname} causes React to unmount+remount this div on every
              route change, re-triggering the pageIn animation — the CBG pattern.
            */}
            <div key={pathname} style={{ animation: 'pageIn 160ms ease-out backwards' }}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
