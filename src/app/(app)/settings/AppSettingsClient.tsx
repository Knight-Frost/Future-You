'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { UserSettings } from '@prisma/client';

interface Props {
  user: { name: string | null; email: string; createdAt: Date } | null;
  userSettings: UserSettings | null;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={enabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        enabled ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export function AppSettingsClient({ user, userSettings }: Props) {
  const [emailNotifications, setEmailNotifications] = useState(
    userSettings?.emailNotifications ?? true
  );
  const [weeklyDigest, setWeeklyDigest] = useState(
    userSettings?.weeklyDigest ?? true
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications, weeklyDigest }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Silent fail — preferences are non-critical
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-page mb-2">Settings</h1>
        <p className="body-sm">
          Account preferences and notifications.{' '}
          To update your financial data, visit your{' '}
          <Link href="/profile" className="text-[#2563EB] hover:underline font-semibold">
            Financial Profile
          </Link>.
        </p>
      </div>

      {/* Account */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="icon-box icon-box-sm icon-box-blue">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="heading-section">Account</h2>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {[
            { label: 'Name', value: user?.name ?? 'Not set' },
            { label: 'Email', value: user?.email ?? '—' },
            {
              label: 'Member since',
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                : '—',
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-semibold text-[#334155]">{row.label}</p>
                <p className="caption mt-0.5">{row.value}</p>
              </div>
              {row.label !== 'Member since' && (
                <span className="chip chip-neutral text-xs">Read only</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="icon-box icon-box-sm icon-box-blue">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="heading-section">Notifications</h2>
          </div>
        </div>
        <p className="caption mb-5">Control how and when FutureYou communicates with you.</p>

        <div className="divide-y divide-[var(--border)]">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-[#334155]">Email notifications</p>
              <p className="caption mt-0.5">Important alerts about your financial health</p>
            </div>
            <Toggle enabled={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-[#334155]">Weekly digest</p>
              <p className="caption mt-0.5">A summary of your progress and top recommendations</p>
            </div>
            <Toggle enabled={weeklyDigest} onChange={() => setWeeklyDigest(!weeklyDigest)} />
          </div>
        </div>
      </div>

      {/* Financial Profile shortcut */}
      <div className="rounded-2xl p-6 flex items-start justify-between gap-4" style={{ background: 'var(--primary-gradient)', boxShadow: 'var(--shadow-primary)' }}>
        <div>
          <p className="font-bold text-white text-[1rem] mb-1">Financial Profile</p>
          <p className="text-[rgba(255,255,255,0.75)] text-sm">
            Update your income, expenses, debt, and savings data. All projections and recommendations recalculate when you save.
          </p>
        </div>
        <Link
          href="/profile"
          className="shrink-0 px-4 py-2 rounded-lg font-semibold text-sm bg-white text-[#2563EB] hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
        >
          Edit profile
        </Link>
      </div>

      {/* Save feedback */}
      {saved && (
        <div className="rounded-xl px-4 py-3.5 flex items-center gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm text-[#065F46] font-semibold">Settings saved.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
