'use client';

import { useState, useEffect } from 'react';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { Slider } from '@/components/ui/Slider';
import { formatCurrency, formatMonths, formatPayoffDate, cn } from '@/lib/utils';
import { futureValueLumpSum, futureValueAnnuity } from '@/engine/calculator';
import type { FinancialInputs, FinancialProjection, SimulatorSliders } from '@/types';

// ─── Before/After row ─────────────────────────────────────────────────────────
function CompareRow({
  label,
  before,
  after,
  tooltip,
  isCurrency = true,
  lowerIsBetter = false,
}: {
  label: string;
  before: string;
  after: string;
  tooltip?: string;
  isCurrency?: boolean;
  lowerIsBetter?: boolean;
}) {
  const changed = before !== after;
  const improved = changed && (lowerIsBetter ? after < before : after > before);

  return (
    <div className="grid grid-cols-3 items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#64748B] font-medium">{label}</span>
        {tooltip && (
          <div className="group relative inline-flex">
            <span className="w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center cursor-help" style={{ background: '#EEF2FF', color: '#6366F1' }}>?</span>
            <div className="absolute left-4 top-0 z-50 w-52 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs leading-relaxed" style={{ background: '#1E293B', color: '#CBD5E1' }}>
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="text-right">
        <span className="text-xs font-semibold text-[#94A3B8] tabular-nums line-through decoration-[#94A3B8]/50">{before}</span>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        {changed && (
          <span className={cn('text-xs', improved ? 'text-[#059669]' : 'text-[#DC2626]')}>
            {improved ? '↑' : '↓'}
          </span>
        )}
        <span className={cn(
          'text-xs font-bold tabular-nums',
          !changed ? 'text-[#64748B]' : improved ? 'text-[#059669]' : 'text-[#DC2626]'
        )}>
          {after}
        </span>
      </div>
    </div>
  );
}

// ─── Savings pill ─────────────────────────────────────────────────────────────
function SavingsPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl p-3 flex-1" style={{ background: color + '15', border: `1px solid ${color}30` }}>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-[#64748B] text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Explanation panel ─────────────────────────────────────────────────────────
function WhyPanel({ projection, sliders, inputs }: {
  projection: FinancialProjection;
  sliders: SimulatorSliders;
  inputs: FinancialInputs;
}) {
  const explanations: string[] = [];

  if (sliders.spendingReduction > 0) {
    explanations.push(`Cutting ${formatCurrency(sliders.spendingReduction)}/mo from spending increases your surplus by the same amount — every dollar freed is a dollar that can fight debt or grow in investments.`);
  }

  if (sliders.extraDebtPayment > 0) {
    const monthlyInterest = inputs.debtBalance * (inputs.debtAnnualRate / 12);
    const principalReduction = sliders.extraDebtPayment - Math.min(sliders.extraDebtPayment, monthlyInterest);
    if (isFinite(projection.interestSaved) && projection.interestSaved > 0) {
      explanations.push(`Extra debt payment reduces the principal faster, which lowers next month's interest — creating a compounding acceleration. Over time this saves ${formatCurrency(projection.interestSaved)} in interest you will never have to pay.`);
    } else {
      explanations.push(`The extra payment is currently going toward interest. Increasing it further will start reducing the principal balance.`);
    }
  }

  if (sliders.extraSavings > 0) {
    explanations.push(`Adding ${formatCurrency(sliders.extraSavings)}/mo to savings builds your emergency fund and goal reserves faster. The key factor is consistency — missing months resets the compound effect.`);
  }

  if (sliders.extraInvestment > 0) {
    const baseline10yr = futureValueLumpSum(inputs.investmentBalance, 0.07, 10) + futureValueAnnuity(inputs.monthlyInvestment, 0.07, 10);
    const simulated10yr = projection.investments.tenYear.moderate;
    const gain10yr = Math.max(0, simulated10yr - baseline10yr);
    if (gain10yr > 0) {
      explanations.push(`The extra ${formatCurrency(sliders.extraInvestment)}/mo in investments will grow to an additional ${formatCurrency(gain10yr)} over 10 years at a moderate 7% return — thanks to compounding. The earlier you start, the more powerful this effect becomes.`);
    }
  }

  if (explanations.length === 0) return null;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="icon-box icon-box-sm icon-box-blue">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="label-caps">Why this matters</p>
      </div>
      <div className="space-y-2.5">
        {explanations.map((text, i) => (
          <p key={i} className="text-xs text-[#334155] leading-relaxed border-l-2 border-[#DBEAFE] pl-3">
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Category insights from real transactions ─────────────────────────────────
interface CategorySummary {
  category: string;
  label: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  color: string;
}

function CategoryInsightsPanel({ spendingReduction }: { spendingReduction: number }) {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [monthsAnalyzed, setMonthsAnalyzed] = useState(1);

  useEffect(() => {
    fetch('/api/transactions/analytics?months=3')
      .then((r) => r.json())
      .then((json) => {
        if (json.hasData) {
          setCategories(json.data.categoryBreakdown ?? []);
          setMonthsAnalyzed(json.data.monthsAnalyzed ?? 1);
        }
      })
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  // Top 3 non-essential categories (exclude Housing, Debt, Savings)
  const ESSENTIAL = new Set(['HOUSING', 'DEBT_PAYMENTS', 'SAVINGS_INVESTMENTS']);
  const topCuts = categories
    .filter((c) => !ESSENTIAL.has(c.category))
    .slice(0, 3)
    .map((c) => ({
      ...c,
      monthlyAvg: Math.round(c.totalAmount / monthsAnalyzed),
    }));

  if (topCuts.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#EEF2FF' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="label-caps">Your top reducible categories</p>
      </div>
      <p className="caption mb-4">Based on {monthsAnalyzed}-month transaction history. Moving the spending slider reduces from these first.</p>
      <div className="space-y-2.5">
        {topCuts.map((cat) => {
          const saving15pct = Math.round(cat.monthlyAvg * 0.15);
          const saving20pct = Math.round(cat.monthlyAvg * 0.20);
          const isTargeted = spendingReduction > 0;
          return (
            <div key={cat.category} className="rounded-lg p-3" style={{ background: '#F8FAFF', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs font-semibold text-[#0F172A]">{cat.label}</span>
                </div>
                <span className="text-xs font-bold text-[#0F172A] tabular-nums">{formatCurrency(cat.monthlyAvg)}/mo</span>
              </div>
              {isTargeted && (
                <p className="text-[10px] text-[#059669]">
                  ↓ 15% = save {formatCurrency(saving15pct)}/mo &nbsp;·&nbsp; ↓ 20% = save {formatCurrency(saving20pct)}/mo
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const { inputs, sliders, projection, updateSliders, resetSliders } = useFinancialStore();
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const surplus = projection.netSurplus;
  const maxSpending = Math.min(inputs.monthlyExpenses * 0.5, 600);
  const maxDebtPayment = Math.max(0, Math.min(surplus * 0.85, 500));
  const maxSavings = Math.max(0, Math.min(Math.max(0, surplus - sliders.extraDebtPayment) * 0.7, 400));
  const maxInvestment = Math.max(0, Math.min(Math.max(0, surplus - sliders.extraDebtPayment - sliders.extraSavings) * 0.7, 500));

  const hasAnyChange = projection.anySliderMoved;

  // Before values (baseline)
  const beforeDebtMonths = projection.debtPayoffMonths;
  const beforeGoalMonths = projection.goalTimelineMonths;
  const before10yr = futureValueLumpSum(inputs.investmentBalance, 0.07, 10) + futureValueAnnuity(inputs.monthlyInvestment, 0.07, 10);

  // After values (simulated)
  const afterDebtMonths = projection.simulatedDebtMonths;
  const afterGoalMonths = projection.simulatedGoalMonths;
  const after10yr = projection.investments.tenYear.moderate;

  // Savings summaries
  const timeSavedDebt = isFinite(beforeDebtMonths) && isFinite(afterDebtMonths) && afterDebtMonths < beforeDebtMonths
    ? beforeDebtMonths - afterDebtMonths : 0;
  const timeSavedGoal = isFinite(beforeGoalMonths) && isFinite(afterGoalMonths) && afterGoalMonths < beforeGoalMonths
    ? beforeGoalMonths - afterGoalMonths : 0;
  const investmentGain = Math.max(0, after10yr - before10yr);
  const interestSaved = projection.interestSaved;

  async function saveScenario() {
    if (!savedName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: savedName,
          spendingReduction: sliders.spendingReduction,
          extraDebtPayment: sliders.extraDebtPayment,
          extraSavings: sliders.extraSavings,
          extraInvestment: sliders.extraInvestment,
          resultGoalMonths: projection.simulatedGoalMonths,
          resultDebtMonths: projection.simulatedDebtMonths,
          resultInterestSaved: projection.interestSaved,
          resultMonthlyGain: sliders.spendingReduction,
        }),
      });
      setShowSaveForm(false);
      setSavedName('');
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-page mb-2">Scenario Simulator</h1>
          <p className="body-sm">Adjust sliders to model behavior changes. The Before/After table updates instantly — no delay.</p>
        </div>
        {hasAnyChange && (
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn btn-secondary btn-sm" onClick={resetSliders}>Reset</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSaveForm(true)}>Save scenario</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Sliders ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          <div className="card p-7 space-y-7">
            <div>
              <h2 className="heading-section mb-1">Change one habit</h2>
              <p className="caption">Each slider changes a monthly behavior. The comparison table on the right shows the consequence.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#0F172A]">Reduce monthly spending</p>
                <div className="group relative">
                  <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help" style={{ background: '#EEF2FF', color: '#6366F1' }}>?</span>
                  <div className="absolute right-0 top-5 z-50 w-56 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs leading-relaxed" style={{ background: '#1E293B', color: '#CBD5E1' }}>
                    Cutting spending increases your surplus, which you can redirect to debt payoff, savings, or investments. Max is capped at 50% of expenses.
                  </div>
                </div>
              </div>
              <Slider value={sliders.spendingReduction} min={0} max={maxSpending} step={10} onChange={(v) => updateSliders({ spendingReduction: v })} formatValue={formatCurrency} rangeLabel={`max ${formatCurrency(maxSpending)}/mo`} label="" />
            </div>
          </div>

          {/* Category-specific insights from real transactions */}
          <CategoryInsightsPanel spendingReduction={sliders.spendingReduction} />

          <div className="card p-7 space-y-7">
            <div>
              <h2 className="heading-section mb-1">Add money elsewhere</h2>
              <p className="caption">Redirect freed-up cash to debt, savings, or investments.</p>
            </div>

            {inputs.debtBalance > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#0F172A]">Extra debt payment</p>
                  <div className="group relative">
                    <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help" style={{ background: '#EEF2FF', color: '#6366F1' }}>?</span>
                    <div className="absolute right-0 top-5 z-50 w-56 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs leading-relaxed" style={{ background: '#1E293B', color: '#CBD5E1' }}>
                      Every extra dollar paid reduces principal, which reduces next month's interest — a compounding benefit. Even $50 extra/month can save thousands.
                    </div>
                  </div>
                </div>
                <Slider value={sliders.extraDebtPayment} min={0} max={maxDebtPayment} step={10} onChange={(v) => updateSliders({ extraDebtPayment: v })} formatValue={formatCurrency} rangeLabel={`max ${formatCurrency(maxDebtPayment)}/mo`} label="" />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#0F172A]">Additional monthly savings</p>
                <div className="group relative">
                  <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help" style={{ background: '#EEF2FF', color: '#6366F1' }}>?</span>
                  <div className="absolute right-0 top-5 z-50 w-56 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs leading-relaxed" style={{ background: '#1E293B', color: '#CBD5E1' }}>
                    Increases the monthly amount going toward your savings goal. Higher contributions = shorter timeline to reach your target.
                  </div>
                </div>
              </div>
              <Slider value={sliders.extraSavings} min={0} max={maxSavings} step={10} onChange={(v) => updateSliders({ extraSavings: v })} formatValue={formatCurrency} rangeLabel={`max ${formatCurrency(maxSavings)}/mo`} label="" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[#0F172A]">Additional monthly investment</p>
                <div className="group relative">
                  <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help" style={{ background: '#EEF2FF', color: '#6366F1' }}>?</span>
                  <div className="absolute right-0 top-5 z-50 w-56 rounded-lg p-2.5 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs leading-relaxed" style={{ background: '#1E293B', color: '#CBD5E1' }}>
                    More invested monthly compounds over time. At 7% return, an extra $200/month grows to roughly $34,000 in 10 years — not from saving, but from market returns.
                  </div>
                </div>
              </div>
              <Slider value={sliders.extraInvestment} min={0} max={maxInvestment} step={10} onChange={(v) => updateSliders({ extraInvestment: v })} formatValue={formatCurrency} rangeLabel={`max ${formatCurrency(maxInvestment)}/mo`} label="" />
            </div>
          </div>

          {/* Monthly budget check */}
          <div className="card p-5">
            <p className="label-caps mb-3">Monthly budget check</p>
            <div className="space-y-2">
              {[
                { label: 'Available surplus', value: surplus, positive: true },
                { label: '+ Spending reduction', value: sliders.spendingReduction, positive: true, dim: sliders.spendingReduction === 0 },
                { label: '− Extra debt payment', value: sliders.extraDebtPayment, positive: false, dim: sliders.extraDebtPayment === 0 },
                { label: '− Extra savings', value: sliders.extraSavings, positive: false, dim: sliders.extraSavings === 0 },
                { label: '− Extra investment', value: sliders.extraInvestment, positive: false, dim: sliders.extraInvestment === 0 },
              ].map((row) => (
                <div key={row.label} className={cn('flex justify-between text-sm', row.dim ? 'opacity-40' : '')}>
                  <span className="text-[#64748B]">{row.label}</span>
                  <span className={cn('font-semibold tabular-nums', row.positive ? 'text-[#059669]' : 'text-[#DC2626]')}>
                    {row.positive ? '+' : '−'}{formatCurrency(row.value)}
                  </span>
                </div>
              ))}
              <div className="divider my-1" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-[#0F172A]">Remaining unallocated</span>
                <span className={cn('tabular-nums', (surplus + sliders.spendingReduction - sliders.extraDebtPayment - sliders.extraSavings - sliders.extraInvestment) < 0 ? 'text-[#DC2626]' : 'text-[#059669]')}>
                  {formatCurrency(Math.max(0, surplus + sliders.spendingReduction - sliders.extraDebtPayment - sliders.extraSavings - sliders.extraInvestment))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Before / After panel ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {!hasAnyChange ? (
            <div className="card p-10 text-center">
              <div className="icon-box icon-box-lg icon-box-slate mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="heading-card text-[#64748B] mb-2">Move a slider to see Before vs After</p>
              <p className="caption">The table will show exactly what changes — and why it matters.</p>
            </div>
          ) : (
            <>
              {/* Before/After table */}
              <div className="card overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-3 px-5 py-3" style={{ background: '#F8FAFF', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-bold text-[#64748B]">Metric</span>
                  <span className="text-xs font-bold text-right text-[#94A3B8]">Before</span>
                  <span className="text-xs font-bold text-right text-[#0F172A]">After</span>
                </div>

                <div className="px-5">
                  <CompareRow
                    label="Monthly surplus"
                    before={formatCurrency(projection.netSurplus)}
                    after={formatCurrency(projection.netSurplus + sliders.spendingReduction - sliders.extraDebtPayment - sliders.extraInvestment)}
                    tooltip="Net take-home after expenses, debt payments, and investments. Higher = more room to save and hit goals."
                    lowerIsBetter={false}
                  />

                  {inputs.debtBalance > 0 && (
                    <>
                      <CompareRow
                        label="Debt payoff date"
                        before={isFinite(beforeDebtMonths) ? formatPayoffDate(beforeDebtMonths) : 'Never'}
                        after={isFinite(afterDebtMonths) ? formatPayoffDate(afterDebtMonths) : projection.debtBecamePayable ? formatPayoffDate(afterDebtMonths) : 'Never'}
                        tooltip="The month and year you will make your final debt payment at this payment rate."
                        lowerIsBetter={false}
                      />
                      <CompareRow
                        label="Debt payoff timeline"
                        before={isFinite(beforeDebtMonths) ? formatMonths(beforeDebtMonths) : '∞'}
                        after={isFinite(afterDebtMonths) ? formatMonths(afterDebtMonths) : projection.debtBecamePayable ? formatMonths(afterDebtMonths) : '∞'}
                        tooltip="Total months until debt is fully paid off."
                        lowerIsBetter={true}
                      />
                      {isFinite(projection.totalInterest) && (
                        <CompareRow
                          label="Total interest cost"
                          before={formatCurrency(projection.totalInterest)}
                          after={isFinite(projection.totalInterest - projection.interestSaved) ? formatCurrency(Math.max(0, projection.totalInterest - projection.interestSaved)) : '—'}
                          tooltip="Total dollars paid in interest over the life of the debt. Lower = better."
                          lowerIsBetter={true}
                        />
                      )}
                    </>
                  )}

                  {inputs.goalAmount > 0 && (
                    <CompareRow
                      label="Goal timeline"
                      before={isFinite(beforeGoalMonths) ? formatMonths(beforeGoalMonths) : '∞'}
                      after={isFinite(afterGoalMonths) ? formatMonths(afterGoalMonths) : '∞'}
                      tooltip="How long until you reach your savings goal at this monthly contribution."
                      lowerIsBetter={true}
                    />
                  )}

                  <CompareRow
                    label="10-year portfolio (7%)"
                    before={formatCurrency(before10yr, true)}
                    after={formatCurrency(after10yr, true)}
                    tooltip="Projected investment portfolio value in 10 years at a moderate 7% annual return."
                    lowerIsBetter={false}
                  />
                </div>
              </div>

              {/* Savings pills */}
              <div className="flex gap-3">
                {timeSavedDebt > 0 && (
                  <SavingsPill label="Time saved on debt" value={formatMonths(timeSavedDebt)} color="#059669" />
                )}
                {timeSavedGoal > 0 && (
                  <SavingsPill label="Time saved on goal" value={formatMonths(timeSavedGoal)} color="#2563EB" />
                )}
                {interestSaved > 50 && (
                  <SavingsPill label="Interest saved" value={formatCurrency(interestSaved, true)} color="#D97706" />
                )}
                {investmentGain > 100 && (
                  <SavingsPill label="Extra growth (10yr)" value={formatCurrency(investmentGain, true)} color="#6366F1" />
                )}
              </div>

              {/* Why panel */}
              <WhyPanel projection={projection} sliders={sliders} inputs={inputs} />

              {/* Save form */}
              {!showSaveForm ? (
                <button className="w-full btn btn-primary" onClick={() => setShowSaveForm(true)}>
                  Save this scenario
                </button>
              ) : (
                <div className="card p-5 animate-fade-in">
                  <p className="label-caps mb-3">Name this scenario</p>
                  <input
                    type="text"
                    className="field-input mb-3"
                    placeholder="e.g. Aggressive debt payoff"
                    value={savedName}
                    onChange={(e) => setSavedName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm flex-1"
                      onClick={saveScenario}
                      disabled={saving || !savedName.trim()}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowSaveForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
