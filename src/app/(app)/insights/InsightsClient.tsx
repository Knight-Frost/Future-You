'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { Insight } from '@prisma/client';
import type { FinancialInputs, FinancialProjection } from '@/types';

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  CRITICAL: {
    label:       'Critical',
    chipClass:   'chip-danger',
    accentColor: 'var(--danger)',
    accentBg:    'var(--danger-bg)',
    accentBorder:'var(--danger-border)',
  },
  HIGH: {
    label:       'High Priority',
    chipClass:   'chip-warning',
    accentColor: 'var(--warning)',
    accentBg:    'var(--warning-bg)',
    accentBorder:'var(--warning-border)',
  },
  MEDIUM: {
    label:       'Medium',
    chipClass:   'chip-neutral',
    accentColor: 'var(--muted-foreground)',
    accentBg:    'var(--muted)',
    accentBorder:'var(--border)',
  },
  LOW: {
    label:       'On Track',
    chipClass:   'chip-primary',
    accentColor: 'var(--primary)',
    accentBg:    'var(--primary-subtle)',
    accentBorder:'rgba(22,163,74,0.20)',
  },
};

// ─── Metric config ────────────────────────────────────────────────────────────
// Each entry carries the benchmark needed to communicate "good / ok / bad"
// so users don't need financial expertise to interpret the number.
function buildMetrics(inputs: FinancialInputs, projection: FinancialProjection) {
  // Bug #10 fix: use netSurplus (after debt + investment obligations), not gross monthlyRemaining
  const surplus = projection.netSurplus;
  const savingsRate = projection.savingsRate;
  const efMonths = projection.emergencyFundMonths;
  const dti = projection.debtToIncomeRatio;

  const surplusStatus: 'good' | 'warn' | 'bad' = surplus > 0 ? 'good' : surplus === 0 ? 'warn' : 'bad';
  const savingsStatus: 'good' | 'warn' | 'bad' = savingsRate >= 0.20 ? 'good' : savingsRate >= 0.10 ? 'warn' : 'bad';
  const efStatus:      'good' | 'warn' | 'bad' = efMonths >= 6 ? 'good' : efMonths >= 3 ? 'warn' : 'bad';
  const dtiStatus:     'good' | 'warn' | 'bad' = dti < 0.15 ? 'good' : dti < 0.35 ? 'warn' : 'bad';
  const debtStatus:    'good' | 'warn' | 'bad' = inputs.debtBalance <= 0 ? 'good' : 'warn';
  const investStatus:  'good' | 'warn' | 'bad' = inputs.monthlyInvestment > 0 ? 'good' : 'warn';

  return [
    {
      label:     'Monthly surplus',
      value:     formatCurrency(surplus),
      benchmark: 'Target: > $0',
      status:    surplusStatus,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label:     'Savings rate',
      value:     formatPercent(savingsRate),
      benchmark: 'Target: ≥ 20%',
      status:    savingsStatus,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      label:     'Emergency fund',
      value:     `${efMonths.toFixed(1)} months`,
      benchmark: 'Target: ≥ 6 months',
      status:    efStatus,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label:     'Debt-to-income',
      value:     formatPercent(dti),
      benchmark: 'Target: < 15%',
      status:    dtiStatus,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        </svg>
      ),
    },
    inputs.debtBalance > 0
      ? {
          label:     'Total interest cost',
          value:     formatCurrency(projection.totalInterest),
          benchmark: 'Reduce debt to eliminate',
          status:    'bad' as const,
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
        }
      : {
          label:     'Debt status',
          value:     'Debt-free',
          benchmark: 'Excellent — keep it up',
          status:    'good' as const,
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
        },
    {
      label:     'Monthly investing',
      value:     formatCurrency(inputs.monthlyInvestment),
      benchmark: 'Target: ≥ 10% of income',
      status:    investStatus,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];
}

const STATUS_COLORS = {
  good: { color: 'var(--success)',   bg: 'var(--success-bg)',  border: 'var(--success-border)' },
  warn: { color: 'var(--warning)',   bg: 'var(--warning-bg)',  border: 'var(--warning-border)' },
  bad:  { color: 'var(--danger)',    bg: 'var(--danger-bg)',   border: 'var(--danger-border)'  },
};

const STATUS_LABELS = { good: 'On track', warn: 'Attention', bad: 'Action needed' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5"
      style={{ color: 'var(--primary)' }}
    >
      {children}
    </p>
  );
}

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return (
    <div
      className={`h-3.5 rounded-full ${w} animate-pulse`}
      style={{ background: 'var(--muted)' }}
    />
  );
}

interface Props {
  persistedInsights: Insight[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function InsightsClient({ persistedInsights }: Props) {
  const { inputs, projection, ruleInsight, aiInsight, setAiInsight, setAiLoading, aiLoading } = useFinancialStore();
  const fetchedRef = useRef(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch Claude AI analysis once per session when rule insight is available
  useEffect(() => {
    if (fetchedRef.current || !ruleInsight) return;
    fetchedRef.current = true;
    setAiLoading(true);
    fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, projection, ruleInsight }),
    })
      .then((r) => r.json())
      .then((data) => setAiInsight(data?.data?.insight ?? null))
      .catch(() => setAiInsight(null))
      .finally(() => setAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleInsight]);

  const config  = ruleInsight ? PRIORITY_CONFIG[ruleInsight.priority] : PRIORITY_CONFIG.LOW;
  const metrics = buildMetrics(inputs, projection);
  const visibleHistory = persistedInsights.filter((i) => !dismissed.has(i.id));

  return (
    <div className="space-y-7" style={{ animation: 'pageIn 160ms ease-out backwards' }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>AI Coach</SectionLabel>
        <h1 className="heading-page mb-1.5">Insights</h1>
        <p className="body-sm">
          Your financial situation, analyzed in real time. Updated every time your data changes.
        </p>
      </div>

      {/* ── Primary recommendation ─────────────────────────────────────────── */}
      {ruleInsight ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface-primary-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--surface-primary-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Colored header strip */}
          <div
            className="px-6 py-3.5 flex items-center gap-3"
            style={{
              background: config.accentBg,
              borderBottom: `1px solid ${config.accentBorder}`,
            }}
          >
            {/* Priority icon */}
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: config.accentColor, color: '#fff' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className={cn('chip text-xs', config.chipClass)}>{config.label}</span>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: config.accentColor, opacity: 0.7 }}
            >
              {ruleInsight.category}
            </span>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <h2
                className="heading-section mb-2"
                style={{ fontSize: '1.2rem' }}
              >
                {ruleInsight.action}
              </h2>
              <p className="body-sm">{ruleInsight.reason}</p>
            </div>

            {/* Expected outcome box */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--primary-subtle)',
                border: '1px solid rgba(22,163,74,0.18)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--primary)', letterSpacing: '0.12em' }}
              >
                Expected outcome
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {ruleInsight.outcome}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 pt-1">
              <Link href="/simulator" className="btn btn-primary btn-sm flex items-center gap-1.5">
                Test in Simulator
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              <Link
                href={ruleInsight.category?.toLowerCase().includes('debt') ? '/debt' : '/plan'}
                className="btn btn-secondary btn-sm"
              >
                Update my plan
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* No rule insight yet — placeholder */
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'var(--surface-primary-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--surface-primary-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--primary-subtle)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
            No recommendation yet
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Complete your Financial Plan to receive a personalized insight.
          </p>
          <Link href="/plan" className="btn btn-primary btn-sm">
            Go to Plan →
          </Link>
        </div>
      )}

      {/* ── Claude AI Analysis ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface-primary-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--surface-primary-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-3.5 flex items-center gap-3"
          style={{
            background: 'var(--primary-subtle)',
            borderBottom: '1px solid rgba(22,163,74,0.15)',
          }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
            Claude AI Analysis
          </span>
          <span className="chip chip-primary text-xs ml-auto">
            {aiLoading ? 'Analyzing…' : 'Claude AI'}
          </span>
        </div>

        {/* Body */}
        <div className="p-6">
          {aiLoading ? (
            <div className="space-y-3">
              <SkeletonLine />
              <SkeletonLine w="w-5/6" />
              <SkeletonLine w="w-4/5" />
              <SkeletonLine w="w-3/5" />
            </div>
          ) : aiInsight ? (
            <p className="body-base leading-relaxed">{aiInsight}</p>
          ) : (
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-foreground)' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  Deep AI analysis unavailable
                </p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Claude AI requires an active API connection. Your rule-based recommendation above is calculated in real time from your exact financial data — it's personalized and always up to date.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Financial snapshot ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'var(--surface-primary-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--surface-primary-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="mb-5">
          <SectionLabel>Your numbers</SectionLabel>
          <h2 className="heading-section">Financial snapshot</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => {
            const s = STATUS_COLORS[m.status];
            return (
              <div
                key={m.label}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {/* Icon + status badge */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {m.icon}
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                  >
                    {STATUS_LABELS[m.status]}
                  </span>
                </div>

                {/* Value */}
                <div>
                  <p
                    className="text-xl font-bold tabular-nums leading-none mb-1"
                    style={{ color: m.status === 'bad' ? s.color : 'var(--foreground)', fontFamily: 'var(--font-headline)', letterSpacing: '-0.02em' }}
                  >
                    {m.value}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    {m.label}
                  </p>
                </div>

                {/* Benchmark */}
                <p
                  className="text-[10px] font-medium"
                  style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}
                >
                  {m.benchmark}
                </p>
              </div>
            );
          })}
        </div>

        {/* Link to plan */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            href="/plan"
            className="text-sm font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--primary)', textDecoration: 'none' }}
          >
            Update your numbers in the Plan
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Insight history ─────────────────────────────────────────────────── */}
      {visibleHistory.length > 0 && (
        <div>
          <div className="mb-4">
            <SectionLabel>History</SectionLabel>
            <h2 className="heading-section">Past insights</h2>
          </div>

          <div className="space-y-2.5">
            {visibleHistory.map((insight) => {
              const pc = PRIORITY_CONFIG[insight.priority];
              return (
                <div
                  key={insight.id}
                  className="rounded-xl p-4"
                  style={{
                    background: 'var(--surface-primary-bg)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid var(--surface-primary-border)',
                    boxShadow: 'var(--shadow-card-subtle)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('chip text-xs', pc.chipClass)}>{pc.label}</span>
                      <span className="label-caps" style={{ color: 'var(--muted-foreground)' }}>
                        {insight.category}
                      </span>
                      <span className="label-caps" style={{ color: 'var(--border)' }}>·</span>
                      <span className="label-caps" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(insight.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <button
                      onClick={() => setDismissed((d) => new Set([...d, insight.id]))}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0"
                      style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
                      aria-label="Dismiss insight"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    {insight.action}
                  </p>
                  <p className="caption">{insight.outcome}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
