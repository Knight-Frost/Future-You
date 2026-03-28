'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { calculateProjection } from '@/engine/calculator';
import { evaluateRules } from '@/engine/insights';
import { formatCurrency, formatMonths, getFirstName, cn } from '@/lib/utils';
import { FutureHeroSlideshow } from '@/components/ui/FutureHeroSlideshow';
import { FinancialGreeting } from '@/components/ui/FinancialGreeting';
import type { FinancialProfile, Goal } from '@prisma/client';

interface Props {
  userName: string | null;
  profile: FinancialProfile | null;
  goals: Goal[];
}

// ─── Math Tooltip ─────────────────────────────────────────────────────────────

interface TooltipRow { op?: string; label: string; value: string; result?: boolean }

function MathTooltip({ rows, note }: { rows: TooltipRow[]; note?: string }) {
  return (
    <div className="group/tip relative inline-flex items-center ml-1.5">
      {/* Trigger — small ⓘ icon */}
      <button
        type="button"
        aria-label="How is this calculated?"
        style={{
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--primary-subtle)',
          border: '1px solid rgba(22,163,74,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'default', flexShrink: 0,
        }}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </button>

      {/* Tooltip bubble */}
      <div
        className="invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-all duration-150"
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 220,
          background: '#1a2e1a',
          borderRadius: 10,
          padding: '10px 12px',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        }}
      >
        {/* Arrow */}
        <div style={{
          position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, background: '#1a2e1a', rotate: '45deg',
          borderRadius: 2,
        }} />

        <p style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 7 }}>
          How it's calculated
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontSize: '0.72rem',
                color: row.result ? 'var(--gold-light)' : 'rgba(255,255,255,0.65)',
                fontWeight: row.result ? 700 : 400,
              }}>
                {row.op && <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 3 }}>{row.op}</span>}
                {row.label}
              </span>
              <span style={{
                fontSize: '0.72rem', fontFamily: 'monospace',
                color: row.result ? 'var(--gold-light)' : 'rgba(255,255,255,0.9)',
                fontWeight: row.result ? 700 : 500,
                whiteSpace: 'nowrap',
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {note && (
          <p style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.38)', marginTop: 7, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, lineHeight: 1.4 }}>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Net Worth ────────────────────────────────────────────────────────────────
function calcNetWorth(profile: FinancialProfile | null, inputs: { currentSavings: number; investmentBalance: number; debtBalance: number }): number {
  return (profile?.currentSavings ?? inputs.currentSavings)
    + (profile?.investmentBalance ?? inputs.investmentBalance)
    - (profile?.debtBalance ?? inputs.debtBalance);
}

// ─── Emergency fund label ────────────────────────────────────────────────────
function emergencyLabel(months: number): { text: string; chip: string } {
  if (months >= 6) return { text: 'Fully funded — 6+ months covered', chip: 'chip-success' };
  if (months >= 3) return { text: `${months.toFixed(1)} months covered — on track`, chip: 'chip-success' };
  if (months >= 1) return { text: `${months.toFixed(1)} months covered — build to 3 months`, chip: 'chip-warning' };
  return { text: 'Less than 1 month covered — urgent priority', chip: 'chip-danger' };
}

export function DashboardClient({ userName, profile, goals }: Props) {
  const {
    inputs,
    projection,
    healthStatus,
    ruleInsight,
    aiInsight,
    aiLoading,
    syncFromProfile,
    setAiInsight,
    setAiLoading,
  } = useFinancialStore();

  // Sync profile into store
  useEffect(() => {
    if (profile) {
      syncFromProfile({
        monthlyIncome: profile.monthlyIncome,
        monthlyExpenses: profile.monthlyExpenses,
        currentSavings: profile.currentSavings,
        debtBalance: profile.debtBalance,
        debtMonthlyPayment: profile.debtMonthlyPayment,
        debtAnnualRate: profile.debtAnnualRate,
        monthlyInvestment: profile.monthlyInvestment,
        investmentBalance: profile.investmentBalance,
        goalName: goals[0]?.title ?? 'My Goal',
        goalAmount: goals[0]?.targetAmount ?? 0,
      });
    }
  }, [profile?.id]);

  // Fetch AI insight once
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const freshInputs = profile ? {
      monthlyIncome: profile.monthlyIncome,
      monthlyExpenses: profile.monthlyExpenses,
      currentSavings: profile.currentSavings,
      debtBalance: profile.debtBalance,
      debtMonthlyPayment: profile.debtMonthlyPayment,
      debtAnnualRate: profile.debtAnnualRate,
      monthlyInvestment: profile.monthlyInvestment,
      investmentBalance: profile.investmentBalance,
      goalName: goals[0]?.title ?? 'My Goal',
      goalAmount: goals[0]?.targetAmount ?? 0,
    } : inputs;

    const freshProjection = profile ? calculateProjection(freshInputs) : projection;
    const freshRuleInsight = profile ? evaluateRules(freshInputs, freshProjection) : ruleInsight;

    setAiLoading(true);
    fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: freshInputs, projection: freshProjection, ruleInsight: freshRuleInsight }),
    })
      .then((r) => r.json())
      .then((data) => setAiInsight(data?.data?.insight ?? null))
      .catch(() => setAiInsight(null))
      .finally(() => setAiLoading(false));
  }, [profile?.id]);

  const firstName = getFirstName(userName);
  const netWorth = calcNetWorth(profile, inputs);
  const efMonths = projection.emergencyFundMonths;
  const efStatus = emergencyLabel(efMonths);

  // ONE recommendation: AI if ready, otherwise rule-based
  const recommendation = aiInsight ?? ruleInsight?.action ?? null;
  const recommendationReason = aiInsight ? null : ruleInsight?.reason ?? null;
  const recommendationOutcome = ruleInsight?.outcome ?? null;
  const recommendationPriority = ruleInsight?.priority ?? null;

  // Priority → visual
  const priorityChip =
    recommendationPriority === 'CRITICAL' ? 'chip-danger' :
    recommendationPriority === 'HIGH' ? 'chip-warning' :
    recommendationPriority === 'MEDIUM' ? 'chip-info' : 'chip-success';

  const priorityLabel =
    recommendationPriority === 'CRITICAL' ? 'Action Required' :
    recommendationPriority === 'HIGH' ? 'High Priority' :
    recommendationPriority === 'MEDIUM' ? 'Recommended' : 'Optimize';

  // Health → next action link
  const nextActionHref =
    healthStatus === 'critical' ? '/plan' :
    projection.debtToIncomeRatio > 0.2 ? '/simulator' :
    '/analytics';

  const nextActionLabel =
    healthStatus === 'critical' ? 'Fix your plan now' :
    projection.debtToIncomeRatio > 0.2 ? 'Simulate a fix' :
    'View full analytics';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero section — interpolating background + smart greeting ──────── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ height: '240px' }}
      >
        {/* Crossfading gradient scenes — CBG HeroSlideshow pattern */}
        <FutureHeroSlideshow initialIndex={0} />

        {/* Greeting panel — sits over the slideshow at the bottom */}
        <div className="absolute inset-0 flex items-end p-5">
          <FinancialGreeting
            firstName={firstName}
            healthStatus={healthStatus}
            netSurplus={projection.netSurplus}
            netWorth={netWorth}
            debtBalance={inputs.debtBalance}
            debtPayoffMonths={projection.debtPayoffMonths}
            hasProfile={!!profile}
            goalName={goals[0]?.title ?? null}
            aiLoading={aiLoading}
            aiInsight={aiInsight}
          />
        </div>
      </div>

      {/* ── Profile incomplete banner ─────────────────────────────────────── */}
      {!profile && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div>
            <p className="font-semibold text-[#92400E] text-sm">Your financial profile is empty</p>
            <p className="text-xs text-[#D97706] mt-0.5">
              All numbers shown are estimates. Complete your profile to see accurate data.
            </p>
          </div>
          <Link href="/plan" className="btn btn-sm shrink-0 whitespace-nowrap" style={{ background: '#D97706', color: 'white' }}>
            Set up my profile
          </Link>
        </div>
      )}

      {/* ── 4 Key Metrics ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Monthly Surplus */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-box icon-box-sm icon-box-green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              </svg>
            </div>
            <span className="label-caps">Monthly Surplus</span>
            <MathTooltip
              rows={[
                { label: 'Income',      value: formatCurrency(inputs.monthlyIncome) },
                { op: '−', label: 'Expenses',    value: formatCurrency(inputs.monthlyExpenses) },
                { op: '−', label: 'Debt payment', value: formatCurrency(inputs.debtMonthlyPayment) },
                { op: '−', label: 'Investment',  value: formatCurrency(inputs.monthlyInvestment) },
                { op: '=', label: 'Net surplus', value: formatCurrency(projection.netSurplus), result: true },
              ]}
              note="True take-home after all committed outflows each month."
            />
          </div>
          <p className={cn(
            'text-2xl font-bold tabular-nums mb-1',
            projection.netSurplus < 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'
          )}>
            {projection.netSurplus >= 0 ? '+' : ''}{formatCurrency(projection.netSurplus)}
          </p>
          <p className="text-xs text-[#64748B]">
            {projection.netSurplus < 0
              ? 'Expenses exceed income — reduce costs immediately'
              : 'After expenses, debt payments & investments'}
          </p>
        </div>

        {/* Debt Payoff Timeline */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-box icon-box-sm icon-box-amber">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="label-caps">Debt Payoff</span>
            <MathTooltip
              rows={inputs.debtBalance > 0 ? [
                { label: 'Balance',       value: formatCurrency(inputs.debtBalance) },
                { label: 'Payment/mo',    value: formatCurrency(inputs.debtMonthlyPayment) },
                { label: 'APR',           value: `${(inputs.debtAnnualRate * 100).toFixed(1)}%` },
                { op: '→', label: 'Payoff', value: isFinite(projection.debtPayoffMonths) ? formatMonths(projection.debtPayoffMonths) : 'Never', result: true },
                { label: 'Total interest', value: isFinite(projection.totalInterest) ? formatCurrency(projection.totalInterest) : '—' },
              ] : [
                { label: 'Debt balance',  value: '$0' },
                { op: '=', label: 'Status', value: 'Debt-free', result: true },
              ]}
              note={inputs.debtBalance > 0 ? "Formula: −log(1 − Balance × r / PMT) / log(1 + r) where r = APR ÷ 12." : undefined}
            />
          </div>
          <p className="text-2xl font-bold tabular-nums mb-1 text-[#0F172A]">
            {inputs.debtBalance <= 0
              ? 'Debt-free'
              : isFinite(projection.debtPayoffMonths)
              ? formatMonths(projection.debtPayoffMonths)
              : 'Never'}
          </p>
          <p className="text-xs text-[#64748B]">
            {inputs.debtBalance <= 0
              ? 'No outstanding debt recorded'
              : !isFinite(projection.debtPayoffMonths)
              ? 'Payment too low to cover interest — increase payment now'
              : `${formatCurrency(inputs.debtBalance)} at ${(inputs.debtAnnualRate * 100).toFixed(0)}% APR`}
          </p>
        </div>

        {/* Net Worth */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="icon-box icon-box-sm icon-box-blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="label-caps">Net Worth</span>
            <MathTooltip
              rows={[
                { label: 'Savings',       value: formatCurrency(inputs.currentSavings) },
                { op: '+', label: 'Investments',  value: formatCurrency(inputs.investmentBalance) },
                { op: '−', label: 'Debt',         value: formatCurrency(inputs.debtBalance) },
                { op: '=', label: 'Net worth',    value: formatCurrency(netWorth), result: true },
              ]}
              note="Assets you own minus liabilities you owe."
            />
          </div>
          <p className={cn(
            'text-2xl font-bold tabular-nums mb-1',
            netWorth < 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'
          )}>
            {formatCurrency(netWorth)}
          </p>
          <p className="text-xs text-[#64748B]">
            Savings + investments minus all debt
          </p>
        </div>

        {/* Emergency Fund */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('icon-box icon-box-sm', efMonths >= 3 ? 'icon-box-green' : efMonths >= 1 ? 'icon-box-amber' : 'icon-box-red')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="label-caps">Emergency Fund</span>
            <MathTooltip
              rows={[
                { label: 'Savings',          value: formatCurrency(inputs.currentSavings) },
                { op: '÷', label: 'Monthly expenses', value: formatCurrency(inputs.monthlyExpenses) },
                { op: '=', label: 'Months covered',  value: `${efMonths.toFixed(2)} mo`, result: true },
              ]}
              note="Target: 3–6 months. Covers essential expenses if income stops."
            />
          </div>
          <p className="text-2xl font-bold tabular-nums mb-1 text-[#0F172A]">
            {efMonths.toFixed(1)} mo
          </p>
          <p className="text-xs text-[#64748B]">{efStatus.text}</p>
        </div>
      </div>

      {/* ── ONE Actionable Recommendation ────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between gap-4"
          style={{ borderBottom: '1px solid var(--border)', background: '#F8FAFF' }}
        >
          <div className="flex items-center gap-3">
            <div className="icon-box icon-box-sm icon-box-blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="heading-card">Your Next Best Action</span>
          </div>
          {recommendationPriority && (
            <span className={cn('chip text-xs', priorityChip)}>{priorityLabel}</span>
          )}
        </div>

        <div className="p-6">
          {aiLoading ? (
            <div className="space-y-2.5">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-3/4" />
              <p className="text-xs text-[#94A3B8] mt-2">Analyzing your financial situation...</p>
            </div>
          ) : recommendation ? (
            <div className="space-y-4">
              <p className="text-[#0F172A] font-semibold text-base leading-relaxed">
                {recommendation}
              </p>
              {recommendationReason && (
                <p className="text-sm text-[#64748B] leading-relaxed">{recommendationReason}</p>
              )}
              {recommendationOutcome && (
                <div className="flex items-start gap-2 rounded-lg p-3" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <svg className="shrink-0 mt-0.5 text-[#059669]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-sm text-[#065F46] font-medium">{recommendationOutcome}</p>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <Link href={nextActionHref} className="btn btn-primary btn-sm">
                  {nextActionLabel}
                </Link>
                <Link href="/simulator" className="btn btn-secondary btn-sm">
                  Simulate the change
                </Link>
              </div>
            </div>
          ) : !profile ? (
            <div className="text-center py-4">
              <p className="text-[#64748B] text-sm mb-3">
                Complete your financial profile to receive a personalized action plan.
              </p>
              <Link href="/plan" className="btn btn-primary btn-sm">
                Set up my profile
              </Link>
            </div>
          ) : (
            <p className="text-[#64748B] text-sm">
              Your finances look stable. Use the Simulator to find optimization opportunities.
            </p>
          )}
        </div>
      </div>

      {/* ── Quick navigation ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            href: '/simulator',
            title: 'Test a scenario',
            desc: 'Drag sliders to see how changes affect your timeline. Results update instantly.',
            color: 'icon-box-blue',
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            ),
          },
          {
            href: '/plan',
            title: 'Update your plan',
            desc: 'Review and update income, expenses, debt, and savings step by step.',
            color: 'icon-box-green',
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            ),
          },
          {
            href: '/analytics',
            title: 'View analytics',
            desc: 'See your cash flow trend, debt paydown trajectory, and net worth growth.',
            color: 'icon-box-amber',
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="card p-5 flex items-start gap-3 hover:bg-[#F5F7FF] transition-all group"
          >
            <div className={cn('icon-box icon-box-sm shrink-0 mt-0.5', action.color)}>
              {action.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors mb-1">
                {action.title}
              </p>
              <p className="text-xs text-[#64748B] leading-relaxed">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
