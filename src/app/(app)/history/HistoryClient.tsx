'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { formatCurrency, formatMonths, cn } from '@/lib/utils';
import type { Scenario, Snapshot } from '@prisma/client';

interface Props {
  scenarios: Scenario[];
  snapshots: Snapshot[];
}

export function HistoryClient({ scenarios, snapshots }: Props) {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'history'>('scenarios');
  const { updateSliders } = useFinancialStore();
  const router = useRouter();

  function loadScenario(scenario: Scenario) {
    updateSliders({
      spendingReduction: scenario.spendingReduction,
      extraDebtPayment: scenario.extraDebtPayment,
      extraSavings: scenario.extraSavings,
      extraInvestment: scenario.extraInvestment,
    });
    router.push('/simulator');
  }

  const healthChipClass: Record<string, string> = {
    strong: 'chip-success',
    healthy: 'chip-success',
    attention: 'chip-warning',
    critical: 'chip-danger',
  };

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-page mb-2">Saved Plans & History</h1>
        <p className="body-sm">Review your saved scenarios and track how your financial position has changed over time.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#E2E8F0' }}>
        {([
          { key: 'scenarios', label: 'Saved Scenarios', count: scenarios.length },
          { key: 'history', label: 'Snapshot History', count: snapshots.length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-white text-[#0F172A] shadow-sm'
                : 'text-[#64748B] hover:text-[#334155]'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold',
                activeTab === tab.key ? 'bg-[#EEF2FF] text-[#2563EB]' : 'bg-[#CBD5E1] text-[#64748B]'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Scenarios tab ─────────────────────────────────── */}
      {activeTab === 'scenarios' && (
        <div>
          {scenarios.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="icon-box icon-box-lg icon-box-blue mx-auto mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3 className="heading-section mb-2">No saved scenarios yet</h3>
              <p className="body-sm mb-2 max-w-sm mx-auto">
                Use the Simulator to test different financial behaviors. When you find a scenario worth keeping, save it here.
              </p>
              <p className="caption mb-6 max-w-sm mx-auto">
                Saved scenarios let you compare paths, resume exploration, and track which strategies you have considered.
              </p>
              <Link href="/simulator" className="btn btn-primary">Open Simulator</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={cn('card p-6', scenario.isActive ? 'ring-1 ring-[#BFDBFE]' : '')}
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="heading-card">{scenario.name}</h3>
                        {scenario.isActive && <span className="chip chip-primary">Active</span>}
                        {scenario.isPreferred && <span className="chip chip-success">Preferred</span>}
                      </div>
                      <p className="caption">
                        Saved {new Date(scenario.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm shrink-0"
                      onClick={() => loadScenario(scenario)}
                    >
                      Load in Simulator
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {[
                      {
                        label: 'Spending cut',
                        value: scenario.spendingReduction > 0 ? `-${formatCurrency(scenario.spendingReduction)}/mo` : '—',
                        positive: scenario.spendingReduction > 0,
                        color: scenario.spendingReduction > 0 ? 'text-[#059669]' : 'text-[#94A3B8]',
                      },
                      {
                        label: 'Extra debt',
                        value: scenario.extraDebtPayment > 0 ? `+${formatCurrency(scenario.extraDebtPayment)}/mo` : '—',
                        positive: scenario.extraDebtPayment > 0,
                        color: scenario.extraDebtPayment > 0 ? 'text-[#2563EB]' : 'text-[#94A3B8]',
                      },
                      {
                        label: 'Extra savings',
                        value: scenario.extraSavings > 0 ? `+${formatCurrency(scenario.extraSavings)}/mo` : '—',
                        positive: scenario.extraSavings > 0,
                        color: scenario.extraSavings > 0 ? 'text-[#2563EB]' : 'text-[#94A3B8]',
                      },
                      {
                        label: 'Extra invest',
                        value: scenario.extraInvestment > 0 ? `+${formatCurrency(scenario.extraInvestment)}/mo` : '—',
                        positive: scenario.extraInvestment > 0,
                        color: scenario.extraInvestment > 0 ? 'text-[#2563EB]' : 'text-[#94A3B8]',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl p-3" style={{ background: '#F8FAFF', border: '1px solid var(--border)' }}>
                        <p className="label-caps mb-1.5">{item.label}</p>
                        <p className={cn('text-sm font-bold tabular-nums', item.color)}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {(scenario.resultDebtMonths || scenario.resultInterestSaved) && (
                    <div className="flex gap-6 pt-4 border-t border-[var(--border)]">
                      {scenario.resultDebtMonths && (
                        <div>
                          <p className="caption mb-1">Debt payoff</p>
                          <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                            {formatMonths(scenario.resultDebtMonths)}
                          </p>
                        </div>
                      )}
                      {scenario.resultInterestSaved != null && scenario.resultInterestSaved > 0 && (
                        <div>
                          <p className="caption mb-1">Interest saved</p>
                          <p className="text-sm font-bold text-[#059669] tabular-nums">
                            {formatCurrency(scenario.resultInterestSaved)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ───────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {snapshots.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="icon-box icon-box-lg icon-box-slate mx-auto mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="heading-section mb-2">No history yet</h3>
              <p className="body-sm mb-2 max-w-sm mx-auto">
                Snapshots are recorded automatically when you update your financial profile. They show how your situation changes over time.
              </p>
              <p className="caption mb-6 max-w-sm mx-auto">
                Once you have multiple snapshots, you will be able to see trends in your surplus, savings rate, and debt reduction.
              </p>
              <Link href="/profile" className="btn btn-primary">Update your profile</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="caption mb-4">Snapshots are recorded automatically each time your profile is updated.</p>
              {snapshots.map((snap, i) => {
                const isLatest = i === 0;
                return (
                  <div
                    key={snap.id}
                    className={cn(
                      'card p-5',
                      isLatest ? 'ring-1 ring-[#BFDBFE]' : ''
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          isLatest ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                        )} />
                        <span className="text-sm font-semibold text-[#334155]">
                          {new Date(snap.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </span>
                        {isLatest && <span className="chip chip-primary text-xs">Latest</span>}
                      </div>
                      <span className={cn('chip text-xs', healthChipClass[snap.healthStatus] ?? 'chip-neutral')}>
                        {snap.healthStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: 'Income', value: formatCurrency(snap.monthlyIncome) },
                        { label: 'Surplus', value: formatCurrency(snap.monthlySurplus), highlight: snap.monthlySurplus > 0 },
                        { label: 'Savings', value: formatCurrency(snap.currentSavings) },
                        { label: 'Debt', value: formatCurrency(snap.debtBalance), warn: snap.debtBalance > 0 },
                        { label: 'Savings rate', value: `${(snap.savingsRate * 100).toFixed(0)}%`, highlight: snap.savingsRate >= 0.15 },
                        { label: 'Debt-to-income', value: `${(snap.debtToIncome * 100).toFixed(1)}%`, warn: snap.debtToIncome >= 0.15 },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="label-caps mb-1">{item.label}</p>
                          <p className={cn(
                            'text-sm font-bold tabular-nums',
                            'highlight' in item && item.highlight ? 'text-[#059669]' :
                            'warn' in item && item.warn ? 'text-[#D97706]' :
                            'text-[#334155]'
                          )}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
