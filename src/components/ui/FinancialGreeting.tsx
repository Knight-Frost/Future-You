'use client';

/**
 * FinancialGreeting.tsx
 *
 * Liquid-glass greeting panel for the dashboard hero section.
 * Mirrors CBG's PersonalGreeting design exactly:
 *  - Time-aware salutation ("Good morning / afternoon / evening")
 *  - Large Crimson Pro headline name
 *  - Rotating smart subtitle driven by the user's actual financial state
 *  - Liquid glass: backdrop-blur + specular top highlight + depth shadow
 *  - White text — readable over any dark gradient background
 *
 * "Smart system" = subtitles are built from real financial data.
 * If the user is in critical health, the subtitle says so.
 * If they're debt-free, it celebrates. If AI insight is ready, it teases it.
 */

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

// Matches assessFinancialHealth() output in @/engine/calculator
type HealthStatus = 'critical' | 'attention' | 'healthy' | 'strong';

interface FinancialGreetingProps {
  firstName: string;
  healthStatus: HealthStatus;
  /** Monthly surplus (positive = surplus, negative = deficit) */
  netSurplus: number;
  netWorth: number;
  debtBalance: number;
  debtPayoffMonths: number;
  hasProfile: boolean;
  goalName?: string | null;
  /** True while the AI insight is loading */
  aiLoading: boolean;
  /** The AI insight text, if ready */
  aiInsight: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Welcome back';
}

function formatShortCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`;
  return `$${abs.toFixed(0)}`;
}

/**
 * Build a smart subtitle list from the user's real financial data.
 * All entries are data-driven when a profile exists — no generic fallbacks.
 */
function buildSubtitles(props: FinancialGreetingProps): string[] {
  const {
    hasProfile,
    healthStatus,
    netSurplus,
    netWorth,
    debtBalance,
    debtPayoffMonths,
    goalName,
    aiInsight,
  } = props;

  // No profile yet — onboarding prompts only
  if (!hasProfile) {
    return [
      'Set up your profile to see your real financial picture.',
      'A few minutes of setup unlocks your full projection.',
      'Your financial future starts with a single decision.',
    ];
  }

  const smart: string[] = [];

  // ── Health-based lead (most urgent first) ─────────────────────────────────
  if (healthStatus === 'critical') {
    smart.push('Your plan needs urgent attention — review the action below now.');
  } else if (healthStatus === 'attention') {
    smart.push('A few targeted changes could significantly improve your trajectory.');
  } else if (healthStatus === 'strong') {
    smart.push("Your finances are on a strong track — keep the momentum going.");
  } else {
    smart.push("Your finances are healthy — here's how to optimize further.");
  }

  // ── Surplus / deficit ─────────────────────────────────────────────────────
  if (netSurplus < 0) {
    smart.push(`Expenses exceed income by ${formatShortCurrency(Math.abs(netSurplus))}/mo — reduce spending or boost income.`);
  } else if (netSurplus >= 500) {
    smart.push(`${formatShortCurrency(netSurplus)}/mo surplus. Put it to work — open the Simulator to see how.`);
  } else if (netSurplus > 0) {
    smart.push(`${formatShortCurrency(netSurplus)}/mo surplus. Every dollar directed intentionally compounds over time.`);
  }

  // ── Debt signals ──────────────────────────────────────────────────────────
  if (debtBalance <= 0) {
    smart.push("You're debt-free. Redirect what you were paying toward investments now.");
  } else if (!isFinite(debtPayoffMonths)) {
    smart.push('Your debt payment is too low to cover interest — increase it to stop the bleed.');
  } else {
    const years = Math.floor(debtPayoffMonths / 12);
    const mos = Math.round(debtPayoffMonths % 12);
    const label = years > 0 ? `${years}yr ${mos}mo` : `${mos} month${mos !== 1 ? 's' : ''}`;
    smart.push(`At this pace, you'll be debt-free in ${label}. Increase payments to get there sooner.`);
  }

  // ── Net worth ─────────────────────────────────────────────────────────────
  if (netWorth < 0) {
    smart.push(`Net worth is ${formatShortCurrency(Math.abs(netWorth))} negative — debt reduction is the highest-return move right now.`);
  } else if (netWorth >= 10_000) {
    smart.push(`Net worth: ${formatShortCurrency(netWorth)}. Compound growth accelerates from here.`);
  } else if (netWorth > 0) {
    smart.push(`Net worth: ${formatShortCurrency(netWorth)}. Building steadily — stay consistent.`);
  }

  // ── Goal ──────────────────────────────────────────────────────────────────
  if (goalName) {
    smart.push(`Goal in progress: ${goalName}. Check Goals to see your projected timeline.`);
  }

  // ── AI insight teaser (appended last — shows after real data context) ──────
  if (aiInsight && aiInsight.length > 0) {
    const teaser = aiInsight.length > 90
      ? aiInsight.slice(0, aiInsight.lastIndexOf(' ', 90)) + '…'
      : aiInsight;
    smart.push(teaser);
  }

  return smart;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancialGreeting(props: FinancialGreetingProps) {
  const { firstName, netSurplus, netWorth, debtBalance, healthStatus, hasProfile } = props;
  const subtitles = buildSubtitles(props);

  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset to the first (most urgent) subtitle whenever key financial data changes.
  // This ensures the greeting always leads with real, current information.
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { setSubtitleIndex(0); setVisible(true); }, 400);
    return () => clearTimeout(t);
  }, [netSurplus, netWorth, debtBalance, healthStatus, hasProfile]);

  useEffect(() => {
    if (subtitles.length <= 1) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSubtitleIndex((i) => (i + 1) % subtitles.length);
        setVisible(true);
      }, 400);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // Restart interval whenever subtitle content changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitles.length, netSurplus, netWorth, debtBalance, healthStatus]);

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    setGreeting(getTimeGreeting());
    // Refresh every minute so it transitions correctly (e.g. 11:59 → 12:00)
    const tick = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div
      className="w-full rounded-2xl px-7 py-5 relative"
      style={{
        // ── Liquid glass — identical to CBG's PersonalGreeting ─────────────
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(32px) saturate(200%) brightness(108%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(108%)',
        border: '1px solid rgba(255, 255, 255, 0.38)',
        borderBottomColor: 'rgba(255, 255, 255, 0.10)',
        borderRightColor: 'rgba(255, 255, 255, 0.10)',
        boxShadow: [
          '0 24px 64px rgba(0, 0, 0, 0.24)',
          '0 4px 16px rgba(0, 0, 0, 0.14)',
          'inset 0 1.5px 0 rgba(255, 255, 255, 0.55)',
          'inset 1.5px 0 0 rgba(255, 255, 255, 0.18)',
          'inset -1px -1px 0 rgba(0, 0, 0, 0.06)',
        ].join(', '),
      }}
    >
      {/* Specular rim highlight — simulates light catching the top edge of glass */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.60) 25%, rgba(255,255,255,0.90) 50%, rgba(255,255,255,0.60) 75%, transparent)',
        }}
      />

      {/* Time-of-day salutation */}
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em] mb-1.5 select-none"
        style={{
          color: 'rgba(255, 255, 255, 0.80)',
          textShadow: '0 1px 4px rgba(0,0,0,0.55)',
        }}
      >
        {greeting}
      </p>

      {/* First name — large Crimson Pro headline */}
      <h2
        className="font-headline font-semibold leading-none mb-3 select-none"
        style={{
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          color: '#ffffff',
          textShadow: '0 2px 10px rgba(0,0,0,0.50), 0 0 32px rgba(0,0,0,0.18)',
        }}
      >
        {firstName || 'Welcome'}
      </h2>

      {/* Thin separator */}
      <div
        className="mb-3"
        aria-hidden="true"
        style={{ height: '1px', background: 'rgba(255,255,255,0.18)', width: '100%' }}
      />

      {/* Smart rotating subtitle */}
      <p
        className="leading-snug select-none"
        style={{
          fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.95)',
          textShadow: '0 1px 6px rgba(0,0,0,0.55)',
          transition: 'opacity 400ms ease-in-out',
          opacity: visible ? 1 : 0,
          minHeight: '1.5rem',
          letterSpacing: '0.01em',
        }}
      >
        {subtitles[subtitleIndex]}
      </p>
    </div>
  );
}
