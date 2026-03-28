'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface NavItem {
  href: string;
  label: string;
  group: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    group: 'Main',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/plan',
    label: 'Plan',
    group: 'Main',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    href: '/simulator',
    label: 'Simulator',
    group: 'Main',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics & Reports',
    group: 'Main',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Transactions',
    group: 'Main',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    ),
  },
  {
    href: '/goals',
    label: 'Goals',
    group: 'Planning',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: '/insights',
    label: 'Insights',
    group: 'Planning',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 17H9l-.7-2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
      </svg>
    ),
  },
  {
    href: '/debt',
    label: 'Debt',
    group: 'Planning',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    group: 'Planning',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12 8 12 12 14 14" />
        <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
        <polyline points="3 3 3 9 9 9" />
      </svg>
    ),
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-30 transition-transform duration-300"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--dash-sidebar-bg)',
        borderRight: '1px solid var(--dash-sidebar-border)',
        backdropFilter: 'blur(16px) saturate(180%) brightness(104%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%) brightness(104%)',
        boxShadow: '2px 0 24px rgba(0, 0, 0, 0.06)',
      }}
      data-mobile-open={mobileOpen}
    >
      {/* ── Brand header ───────────────────────────────────────────────────── */}
      <div
        className="px-5 py-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--dash-sidebar-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          {/* Logo SVG — gold coin with $ */}
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="sb-gold-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8CC7A" />
                <stop offset="45%" stopColor="#C9A84C" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              <linearGradient id="sb-gold-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C9A84C" />
                <stop offset="100%" stopColor="#6B4F0E" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="16" r="13" fill="url(#sb-gold-fill)" />
            <circle cx="20" cy="16" r="11.5" fill="none" stroke="url(#sb-gold-stroke)" strokeWidth="1.2" />
            <text x="20" y="22" textAnchor="middle" fill="#15803d" fontSize="13" fontWeight="800" fontFamily="Georgia, serif">$</text>
            <path d="M13 32 C10 26 12 22 17 21 C14 25 13 29 13 32Z" fill="url(#sb-gold-fill)" />
            <path d="M27 32 C30 26 28 22 23 21 C26 25 27 29 27 32Z" fill="url(#sb-gold-fill)" />
          </svg>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.05rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: 'var(--royal)',
              }}
            >
              Future You
            </div>
            <div
              style={{
                fontSize: '10px',
                lineHeight: 1,
                marginTop: '4px',
                color: 'var(--gold-dark)',
                letterSpacing: '0.02em',
              }}
            >
              See Your Future. Decide It Today.
            </div>
          </div>
        </Link>

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              color: 'var(--muted-foreground)',
              background: 'var(--muted)',
              border: '1px solid var(--border)',
            }}
            aria-label="Close navigation"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarGutter: 'stable' }}>
        {NAV_ITEMS.reduce<React.ReactNode[]>((acc, item, i) => {
          const prevGroup = i > 0 ? NAV_ITEMS[i - 1].group : null;

          // Render group header when the group changes
          if (item.group !== prevGroup) {
            acc.push(
              <p
                key={`group-${item.group}`}
                className="px-3 uppercase tracking-widest font-semibold select-none"
                style={{
                  fontSize: '10px',
                  color: 'var(--muted-foreground)',
                  opacity: 0.45,
                  marginTop: i === 0 ? '4px' : '20px',
                  marginBottom: '4px',
                }}
              >
                {item.group}
              </p>
            );
          }

          const active = isActive(item.href);

          acc.push(
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${!active ? 'hover:bg-[rgba(0,0,0,0.04)]' : ''}`}
              style={{
                textDecoration: 'none',
                color: active ? 'var(--foreground)' : 'var(--sidebar-text)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {/*
                Active background — always rendered, fades in/out via opacity.
                Never mounts/unmounts so there's no FLIP jank during route changes.
              */}
              <div
                className="absolute inset-0 rounded-xl transition-opacity duration-150"
                style={{
                  background: 'var(--dash-nav-active-bg)',
                  opacity: active ? 1 : 0,
                  pointerEvents: 'none',
                }}
              />

              {/* Left accent bar — emerald stripe when active */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r transition-opacity duration-150"
                style={{
                  background: 'var(--ember-orange)',
                  opacity: active ? 1 : 0,
                  pointerEvents: 'none',
                }}
              />

              {/* Icon — brand color when active */}
              <span
                className="relative z-10 shrink-0 transition-colors duration-150"
                style={{ color: active ? 'var(--ember-orange)' : 'inherit' }}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );

          return acc;
        }, [])}
      </nav>

      {/* ── Bottom — account items ──────────────────────────────────────────── */}
      <div
        className="px-3 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--dash-sidebar-border)' }}
      >
        {/* Section label */}
        <p
          className="px-3 uppercase tracking-widest font-semibold select-none mb-1"
          style={{ fontSize: '10px', color: 'var(--muted-foreground)', opacity: 0.45 }}
        >
          Account
        </p>

        {/* Profile & Settings */}
        {(() => {
          const active = isActive('/profile');
          return (
            <Link
              href="/profile"
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${!active ? 'hover:bg-[rgba(0,0,0,0.04)]' : ''}`}
              style={{
                textDecoration: 'none',
                color: active ? 'var(--foreground)' : 'var(--sidebar-text)',
                fontWeight: active ? 500 : 400,
              }}
            >
              <div
                className="absolute inset-0 rounded-xl transition-opacity duration-150"
                style={{ background: 'var(--dash-nav-active-bg)', opacity: active ? 1 : 0, pointerEvents: 'none' }}
              />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r transition-opacity duration-150"
                style={{ background: 'var(--ember-orange)', opacity: active ? 1 : 0, pointerEvents: 'none' }}
              />
              <span className="relative z-10 shrink-0" style={{ color: active ? 'var(--ember-orange)' : 'inherit' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="relative z-10">Profile &amp; Settings</span>
            </Link>
          );
        })()}

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
          style={{ color: 'var(--danger)', fontWeight: 400 }}
        >
          <span className="shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
