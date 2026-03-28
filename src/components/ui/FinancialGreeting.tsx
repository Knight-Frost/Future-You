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
 * The most urgent / relevant messages are pushed to the front.
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

  // ── Baseline motivational subtitles (always present) ──────────────────────
  const baseline: string[] = [
    'Your future is being built right now.',
    'Every smart decision compounds over time.',
    'Small changes today, massive results tomorrow.',
    'Financial freedom starts with a single decision.',
  ];

  // No profile yet — keep it simple
  if (!hasProfile) {
    return [
      'Set up your profile to get personalized insights.',
      'Your financial future starts here.',
      'A few minutes of setup unlocks your full picture.',
      ...baseline,
    ];
  }

  const smart: string[] = [];

  // ── AI insight teaser ──────────────────────────────────────────────────────
  if (aiInsight && aiInsight.length > 0) {
    // Trim to a short teaser if it's long
    const teaser = aiInsight.length > 80
      ? aiInsight.slice(0, aiInsight.lastIndexOf(' ', 80)) + '…'
      : aiInsight;
    smart.push(teaser);
  }

  // ── Health-based signals ───────────────────────────────────────────────────
  if (healthStatus === 'critical') {
    smart.push('Your plan needs urgent attention — start with the action below.');
  } else if (healthStatus === 'attention') {
    smart.push('A few key changes could significantly improve your trajectory.');
  } else if (healthStatus === 'strong') {
    smart.push('Your finances are on a strong track. Keep the momentum going.');
  }

  // ── Surplus / deficit ─────────────────────────────────────────────────────
  if (netSurplus < 0) {
    smart.push(`Your expenses exceed income by ${formatShortCurrency(Math.abs(netSurplus))}/mo — let's fix that.`);
  } else if (netSurplus > 0) {
    smart.push(`${formatShortCurrency(netSurplus)}/mo surplus — put it to work in the Simulator.`);
  }

  // ── Debt signals ──────────────────────────────────────────────────────────
  if (debtBalance <= 0) {
    smart.push("You're debt-free. Time to accelerate wealth building.");
  } else if (isFinite(debtPayoffMonths)) {
    const years = Math.floor(debtPayoffMonths / 12);
    const months = Math.round(debtPayoffMonths % 12);
    const label = years > 0
      ? `${years}y ${months}mo`
      : `${months} month${months !== 1 ? 's' : ''}`;
    smart.push(`Debt-free in ${label} at your current pace.`);
  } else {
    smart.push('Increase your debt payment to escape the interest trap.');
  }

  // ── Net worth milestone ───────────────────────────────────────────────────
  if (netWorth > 0) {
    smart.push(`Net worth: ${formatShortCurrency(netWorth)}. Keep compounding.`);
  }

  // ── Goal ──────────────────────────────────────────────────────────────────
  if (goalName) {
    smart.push(`Working toward: ${goalName}.`);
  }

  return [...smart, ...baseline];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancialGreeting(props: FinancialGreetingProps) {
  const { firstName } = props;
  const subtitles = buildSubtitles(props);

  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (subtitles.length <= 1) return;

    intervalRef.current = setInterval(() => {
      // Fade out → swap text → fade in
      setVisible(false);
      setTimeout(() => {
        setSubtitleIndex((i) => (i + 1) % subtitles.length);
        setVisible(true);
      }, 400);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // Rebuild interval if the number of subtitles changes (e.g. AI insight arrives)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitles.length]);

  const greeting = getTimeGreeting();

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
