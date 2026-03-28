'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { generateStrategies } from '@/engine/optimizer';
import { formatCurrency, formatMonths, cn } from '@/lib/utils';

export default function DebtStrategyPage() {
  const { inputs, projection } = useFinancialStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activateError, setActivateError] = useState('');

  const strategies = generateStrategies(inputs);
  const hasDebt = inputs.debtBalance > 0;

  const defaultSelected = strategies.findIndex((s) => s.isRecommended);
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(
    defaultSelected >= 0 ? defaultSelected : null
  );

  async function activateStrategy(index: number) {
    setSaving(true);
    setActivateError('');
    const s = strategies[index];
    try {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: s.label,
          title: s.title,
          description: s.description,
          type: s.title.includes('Spending') ? 'REDUCE_SPENDING' : s.title.includes('Combined') ? 'COMBINED' : 'BOOST_PAYMENT',
          requiredMonthlyExtra: s.requiredMonthlyExtra,
          paymentChange: s.requiredMonthlyExtra,
          projectedMonths: s.newPayoffMonths,
          projectedInterestSaved: s.interestSaved,
          projectedTimeReduction: s.timeReductionMonths,
          feasibility: s.isTotallyFeasible ? 'FEASIBLE' : 'AGGRESSIVE',
          isRecommended: s.isRecommended,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActivateError(data.error ?? 'Failed to activate strategy. Please try again.');
        return;
      }
      setSaved(true);
      setSelectedStrategy(index);
    } catch {
      setActivateError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-page mb-2">Debt Strategy</h1>
        <p className="body-sm">
          {hasDebt
            ? `You have ${formatCurrency(inputs.debtBalance)} in debt at ${(inputs.debtAnnualRate * 100).toFixed(0)}% APR. Below are your ranked elimination paths.`
            : 'No debt detected in your profile. Review your savings strategy or update your profile if you have debt.'}
        </p>
      </div>

      {/* Metrics */}
      {hasDebt && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {[
            {
              label: 'Debt Balance',
              value: formatCurrency(inputs.debtBalance),
              sub: `at ${(inputs.debtAnnualRate * 100).toFixed(0)}% APR`,
              iconBox: 'icon-box-red',
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
            },
            {
              label: 'Current Timeline',
              value: formatMonths(projection.debtPayoffMonths),
              sub: 'At current payment',
              iconBox: 'icon-box-amber',
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
            },
            {
              label: 'Total Interest',
              value: isFinite(projection.totalInterest) ? formatCurrency(projection.totalInterest) : 'Unpayable',
              sub: 'If nothing changes',
              iconBox: 'icon-box-amber',
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
            },
            {
              label: 'Debt-to-Income',
              value: `${(projection.debtToIncomeRatio * 100).toFixed(1)}%`,
              sub: projection.debtToIncomeRatio < 0.15 ? 'Manageable' : 'Elevated',
              iconBox: projection.debtToIncomeRatio < 0.15 ? 'icon-box-green' : 'icon-box-amber',
              icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>,
            },
          ].map((m) => (
            <div key={m.label} className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('icon-box icon-box-sm', m.iconBox)}>{m.icon}</div>
                <span className="label-caps">{m.label}</span>
              </div>
              <p className="metric-value-sm mb-1">{m.value}</p>
              <p className="caption">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cost of inaction */}
      {hasDebt && isFinite(projection.totalInterest) && (
        <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
          <div className="icon-box icon-box-sm icon-box-amber shrink-0 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-[#92400E] mb-0.5">Cost of inaction</p>
            <p className="text-sm text-[#92400E]">
              At your current payment pace, you will pay{' '}
              <strong>{formatCurrency(projection.totalInterest)}</strong> in interest — money that could go toward your goals instead. The strategies below show how to change that.
            </p>
          </div>
        </div>
      )}

      {/* Strategy cards */}
      {hasDebt && strategies.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="heading-section">Your ranked options</h2>
            <Link href="/simulator" className="text-sm text-[#2563EB] font-semibold hover:underline flex items-center gap-1">
              Test in Simulator
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {activateError && (
            <p className="text-sm text-red-500 mb-4">{activateError}</p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {strategies.map((s, i) => (
              <div
                key={s.label}
                className={cn('card-interactive p-6 flex flex-col relative', selectedStrategy === i && 'selected')}
                onClick={() => setSelectedStrategy(i === selectedStrategy ? null : i)}
              >
                {s.isRecommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                      style={{ background: 'var(--primary-gradient)', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}
                    >
                      Recommended
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="label-caps">{s.label}</span>
                    <h3 className="heading-card mt-1">{s.title}</h3>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 transition-all shrink-0 mt-0.5 flex items-center justify-center',
                    selectedStrategy === i ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#CBD5E1] bg-white'
                  )}>
                    {selectedStrategy === i && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>

                <p className="body-sm mb-5 flex-1">{s.description}</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-3" style={{ background: '#F8FAFF', border: '1px solid var(--border)' }}>
                    <p className="label-caps mb-1.5">Payoff time</p>
                    <p className="text-sm font-bold text-[#0F172A]">
                      {isFinite(s.newPayoffMonths) ? formatMonths(s.newPayoffMonths) : 'Requires more'}
                    </p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <p className="label-caps mb-1.5" style={{ color: '#059669' }}>Interest saved</p>
                    <p className="text-sm font-bold text-[#059669]">
                      {formatCurrency(s.interestSaved)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  {s.actions.map((action) => (
                    <div key={action.label} className="flex items-center justify-between text-xs">
                      <span className={cn(action.source === 'income_gap' ? 'text-[#D97706]' : 'text-[#64748B]')}>
                        {action.label}
                      </span>
                      <span className={cn('font-bold tabular-nums', action.source === 'income_gap' ? 'text-[#D97706]' : 'text-[#334155]')}>
                        +{formatCurrency(action.amount)}/mo
                      </span>
                    </div>
                  ))}
                </div>

                {!s.isTotallyFeasible && (
                  <div className="rounded-xl px-3 py-2 mb-4 text-xs text-[#92400E]" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    Requires additional income — aggressive but achievable.
                  </div>
                )}

                {selectedStrategy === i && (
                  <button
                    className="btn btn-primary btn-sm w-full mt-2"
                    onClick={(e) => { e.stopPropagation(); activateStrategy(i); }}
                    disabled={saving || saved}
                  >
                    {saved ? '✓ Strategy activated' : saving ? 'Activating…' : 'Activate this strategy'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No debt */}
      {!hasDebt && (
        <div className="card p-14 text-center">
          <div className="icon-box icon-box-lg icon-box-green mx-auto mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="heading-section mb-2">No debt in your profile</h3>
          <p className="body-sm mb-6 max-w-md mx-auto">
            Your profile shows no debt balance. Channel your energy into savings goals and investments.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/goals" className="btn btn-primary">View savings goals</Link>
            <Link href="/profile" className="btn btn-secondary">Update profile</Link>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="card p-5" style={{ background: '#F8FAFF' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-caps mb-1">Next step</p>
            <p className="heading-card">Test scenarios in the Simulator</p>
            <p className="caption mt-0.5">Drag sliders to see how different choices change your payoff timeline in real time.</p>
          </div>
          <Link href="/simulator" className="btn btn-primary btn-sm shrink-0">Open Simulator</Link>
        </div>
      </div>
    </div>
  );
}
