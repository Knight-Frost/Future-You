'use client';

import { useState, useCallback } from 'react';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { formatCurrency, formatMonths, cn } from '@/lib/utils';
import { CSVImportModal } from '@/components/ui/CSVImport';
import type { FinancialInputs, FinancialProjection } from '@/types';

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Income',      title: 'What is your monthly income?',        desc: 'Enter your total take-home pay after taxes.' },
  { id: 2, label: 'Expenses',    title: 'What do you spend each month?',       desc: 'Include all recurring costs: rent, food, utilities, subscriptions.' },
  { id: 3, label: 'Debt',        title: 'Do you have any outstanding debt?',   desc: 'Credit cards, loans, car payments — enter the total.' },
  { id: 4, label: 'Savings',     title: 'How much do you have saved?',         desc: 'Cash in savings or checking accounts — not investments.' },
  { id: 5, label: 'Investments', title: 'Are you investing for the future?',   desc: 'Any amount going to a 401k, IRA, brokerage, or similar account.' },
];

// ─── Step progress ────────────────────────────────────────────────────────────
function StepProgress({ current, total, onStepClick }: {
  current: number;
  total: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done   = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <button
              onClick={() => onStepClick(s.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none group"
              aria-current={active ? 'step' : undefined}
            >
              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                style={
                  done
                    ? { background: 'var(--success-bg)', border: '1.5px solid var(--success-border)', color: 'var(--success)' }
                    : active
                    ? { background: 'var(--primary)', border: '1.5px solid var(--primary)', color: '#ffffff', boxShadow: 'var(--shadow-primary)' }
                    : { background: 'var(--muted)', border: '1.5px solid var(--border)', color: 'var(--muted-foreground)' }
                }
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s.id}
              </div>
              {/* Label */}
              <span
                className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-200"
                style={{ color: active ? 'var(--primary)' : done ? 'var(--success)' : 'var(--muted-foreground)' }}
              >
                {s.label}
              </span>
            </button>

            {/* Connector */}
            {i < total - 1 && (
              <div className="flex-1 mx-2 mb-4">
                <div
                  className="h-px w-full transition-all duration-300"
                  style={{ background: done ? 'var(--success-border)' : 'var(--border)' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <span
        className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center cursor-help select-none"
        style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
      >?</span>
      <div
        className="absolute left-5 top-0 z-50 w-60 rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 text-xs leading-relaxed"
        style={{ background: '#1E293B', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── Field input ──────────────────────────────────────────────────────────────
function FieldInput({
  label,
  sublabel,
  value,
  onChange,
  prefix = '$',
  suffix = '/mo',
  min = 0,
  placeholder = '0',
  tooltip,
  error,
}: {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  placeholder?: string;
  tooltip?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label
          className="text-sm font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          {label}
        </label>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {sublabel && (
        <p className="text-xs mb-2.5" style={{ color: 'var(--muted-foreground)' }}>
          {sublabel}
        </p>
      )}
      <div className="flex items-stretch">
        {prefix && (
          <span
            className="px-3 flex items-center text-sm font-semibold rounded-l-xl"
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              color: 'var(--muted-foreground)',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          placeholder={placeholder}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) || v < min ? 0 : v);
          }}
          className={cn(
            'field-input flex-1',
            prefix ? 'rounded-l-none' : '',
            suffix ? 'rounded-r-none' : '',
          )}
          style={error ? { borderColor: 'var(--danger)', outlineColor: 'var(--danger)' } : undefined}
        />
        {suffix && (
          <span
            className="px-3 flex items-center text-sm rounded-r-xl"
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              color: 'var(--muted-foreground)',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Inline alert ─────────────────────────────────────────────────────────────
function Alert({ variant, children }: { variant: 'danger' | 'warning' | 'success'; children: React.ReactNode }) {
  const styles = {
    danger:  { bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  color: '#991B1B' },
    warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: '#92400E' },
    success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: '#065F46' },
  }[variant];
  return (
    <div
      className="rounded-xl p-3.5 text-sm"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color }}
    >
      {children}
    </div>
  );
}

// ─── Impact bar ───────────────────────────────────────────────────────────────
function ImpactBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>
          {formatCurrency(value)}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--muted)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Summary sidebar ──────────────────────────────────────────────────────────
function PlanSummary({ inputs, projection }: { inputs: FinancialInputs; projection: FinancialProjection }) {
  const netWorth = inputs.currentSavings + inputs.investmentBalance - inputs.debtBalance;
  const surplus  = projection.netSurplus;

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'var(--surface-primary-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--surface-primary-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--primary)', letterSpacing: '0.12em' }}
        >
          Live Summary
        </p>
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--success)' }}
        />
      </div>

      {/* Bars */}
      <div className="space-y-3">
        <ImpactBar
          label="Monthly income"
          value={inputs.monthlyIncome}
          max={inputs.monthlyIncome}
          color="var(--primary)"
        />
        <ImpactBar
          label="Monthly expenses"
          value={inputs.monthlyExpenses}
          max={inputs.monthlyIncome}
          color={inputs.monthlyExpenses > inputs.monthlyIncome ? 'var(--danger)' : 'var(--warning)'}
        />
        {inputs.debtMonthlyPayment > 0 && (
          <ImpactBar
            label="Debt payments"
            value={inputs.debtMonthlyPayment}
            max={inputs.monthlyIncome}
            color="var(--danger)"
          />
        )}
        {inputs.monthlyInvestment > 0 && (
          <ImpactBar
            label="Monthly investments"
            value={inputs.monthlyInvestment}
            max={inputs.monthlyIncome}
            color="var(--success)"
          />
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline text-sm">
          <span style={{ color: 'var(--muted-foreground)' }}>Monthly surplus</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: surplus < 0 ? 'var(--danger)' : 'var(--success)' }}
          >
            {surplus >= 0 ? '+' : ''}{formatCurrency(surplus)}
          </span>
        </div>
        <div className="flex justify-between items-baseline text-sm">
          <span style={{ color: 'var(--muted-foreground)' }}>Net worth</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: netWorth < 0 ? 'var(--danger)' : 'var(--foreground)' }}
          >
            {netWorth < 0 ? '-' : ''}{formatCurrency(Math.abs(netWorth))}
          </span>
        </div>
        {inputs.debtBalance > 0 && isFinite(projection.debtPayoffMonths) && (
          <div className="flex justify-between items-baseline text-sm">
            <span style={{ color: 'var(--muted-foreground)' }}>Debt-free in</span>
            <span className="font-bold tabular-nums" style={{ color: 'var(--warning)' }}>
              {formatMonths(projection.debtPayoffMonths)}
            </span>
          </div>
        )}
        {inputs.debtBalance > 0 && !isFinite(projection.debtPayoffMonths) && (
          <div className="flex justify-between items-baseline text-sm">
            <span style={{ color: 'var(--muted-foreground)' }}>Debt payoff</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
              Never — payment below interest
            </span>
          </div>
        )}
      </div>

      {/* Deficit warning */}
      {surplus < 0 && (
        <Alert variant="danger">
          <strong>Expenses exceed income by {formatCurrency(Math.abs(surplus))}/mo.</strong>{' '}
          Reduce expenses or increase income before any other goal is achievable.
        </Alert>
      )}
    </div>
  );
}

// ─── Step content ─────────────────────────────────────────────────────────────
function StepContent({
  step,
  inputs,
  updateInputs,
  errors,
}: {
  step: number;
  inputs: FinancialInputs;
  updateInputs: (p: Partial<FinancialInputs>) => void;
  errors: Record<string, string>;
}) {
  switch (step) {
    case 1:
      return (
        <div className="space-y-5">
          <FieldInput
            label="Monthly take-home income"
            sublabel="Your total income after taxes from all sources — salary, freelance, side income."
            value={inputs.monthlyIncome}
            onChange={(v) => updateInputs({ monthlyIncome: v })}
            tooltip="Take-home pay = gross salary minus taxes and deductions. If you're paid bi-weekly, multiply one paycheck by 26 then divide by 12."
            error={errors.monthlyIncome}
          />
        </div>
      );

    case 2:
      return (
        <div className="space-y-5">
          <FieldInput
            label="Total monthly expenses"
            sublabel="Everything you spend each month: rent/mortgage, food, subscriptions, utilities, transport, insurance."
            value={inputs.monthlyExpenses}
            onChange={(v) => updateInputs({ monthlyExpenses: v })}
            tooltip="Include ALL recurring costs. A useful shortcut: sum your last 3 months of bank statements and divide by 3."
            error={errors.monthlyExpenses}
          />
          {inputs.monthlyExpenses > inputs.monthlyIncome && (
            <Alert variant="danger">
              <strong>Warning:</strong> Your expenses ({formatCurrency(inputs.monthlyExpenses)}) exceed your income ({formatCurrency(inputs.monthlyIncome)}). This must be fixed before any financial progress is possible.
            </Alert>
          )}
        </div>
      );

    case 3:
      return (
        <div className="space-y-5">
          <FieldInput
            label="Total debt balance"
            sublabel="Sum of all debt: credit cards, personal loans, car loan, student loans. Do not include your mortgage."
            value={inputs.debtBalance}
            onChange={(v) => updateInputs({ debtBalance: v })}
            suffix=""
            tooltip="Add up every debt balance you owe. Credit card statements show the balance. For loans, check your most recent statement."
            error={errors.debtBalance}
          />
          <FieldInput
            label="Monthly debt payment"
            sublabel="How much you currently pay toward debt each month — minimum or more."
            value={inputs.debtMonthlyPayment}
            onChange={(v) => updateInputs({ debtMonthlyPayment: v })}
            tooltip="Enter what you ACTUALLY pay, not just the minimum. If you pay extra on any card or loan, enter that higher number."
            error={errors.debtMonthlyPayment}
          />
          <FieldInput
            label="Average interest rate (APR)"
            sublabel="The average annual interest rate across your debts. Credit cards: 18–24%. Personal loans: 8–15%."
            value={inputs.debtAnnualRate * 100}
            onChange={(v) => updateInputs({ debtAnnualRate: v / 100 })}
            prefix=""
            suffix="%"
            placeholder="18"
            tooltip="APR = Annual Percentage Rate. Check each debt's statement. If you have multiple debts, use a weighted average or your highest rate."
            error={errors.debtAnnualRate}
          />
          {inputs.debtBalance > 0 && inputs.debtMonthlyPayment > 0 && (() => {
            const monthlyInterest = inputs.debtBalance * (inputs.debtAnnualRate / 12);
            const belowInterest   = inputs.debtMonthlyPayment <= monthlyInterest;
            return (
              <Alert variant={belowInterest ? 'danger' : 'warning'}>
                {belowInterest ? (
                  <>Your payment of {formatCurrency(inputs.debtMonthlyPayment)}/mo is too low to cover the monthly interest of {formatCurrency(monthlyInterest)}. Increase your payment to start reducing the balance.</>
                ) : (
                  <>At {formatCurrency(inputs.debtMonthlyPayment)}/mo you pay {formatCurrency(monthlyInterest)}/mo in interest and {formatCurrency(inputs.debtMonthlyPayment - monthlyInterest)}/mo toward the principal.</>
                )}
              </Alert>
            );
          })()}
        </div>
      );

    case 4:
      return (
        <div className="space-y-5">
          <FieldInput
            label="Current savings balance"
            sublabel="Cash in savings or checking accounts you could access immediately in an emergency."
            value={inputs.currentSavings}
            onChange={(v) => updateInputs({ currentSavings: v })}
            suffix=""
            tooltip="Liquid savings only — money you can access without penalty. Do not include retirement accounts here."
            error={errors.currentSavings}
          />
          <FieldInput
            label="Savings goal amount"
            sublabel="The target you're saving toward, e.g. an emergency fund of $10,000 or a house deposit of $50,000."
            value={inputs.goalAmount}
            onChange={(v) => updateInputs({ goalAmount: v })}
            suffix=""
            tooltip="Your primary savings goal. A common first goal is an emergency fund of 3–6 months of expenses."
            error={errors.goalAmount}
          />
          {inputs.currentSavings < inputs.monthlyExpenses && (
            <Alert variant="danger">
              <strong>Less than 1 month of expenses saved.</strong> Building an emergency fund of at least {formatCurrency(inputs.monthlyExpenses * 3)} should be your first priority before aggressively paying debt or investing.
            </Alert>
          )}
        </div>
      );

    case 5:
      return (
        <div className="space-y-5">
          <FieldInput
            label="Monthly investment contribution"
            sublabel="How much you put into any investment account each month: 401k, IRA, brokerage, crypto."
            value={inputs.monthlyInvestment}
            onChange={(v) => updateInputs({ monthlyInvestment: v })}
            tooltip="Include employer-matched contributions. Even $50/month invested consistently can grow to $70,000+ over 20 years at 7% due to compound growth."
            error={errors.monthlyInvestment}
          />
          <FieldInput
            label="Current investment balance"
            sublabel="Total value of all investment accounts today: 401k, IRA, brokerage."
            value={inputs.investmentBalance}
            onChange={(v) => updateInputs({ investmentBalance: v })}
            suffix=""
            tooltip="Check your most recent account statements for the current market value. This is the starting point for all compound growth projections."
            error={errors.investmentBalance}
          />
          {inputs.monthlyInvestment === 0 && (
            <Alert variant="success">
              <strong>Not investing yet?</strong> Starting with just $100–$200/month can build significant wealth over time. Use the Simulator to see exactly how much.
            </Alert>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlanPage() {
  const { inputs, projection, updateInputs } = useFinancialStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = useCallback((step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && inputs.monthlyIncome <= 0) errs.monthlyIncome = 'Income must be greater than $0';
    if (step === 2 && inputs.monthlyExpenses < 0) errs.monthlyExpenses = 'Expenses cannot be negative';
    if (step === 3) {
      if (inputs.debtBalance < 0) errs.debtBalance = 'Debt balance cannot be negative';
      if (inputs.debtAnnualRate < 0 || inputs.debtAnnualRate > 1) errs.debtAnnualRate = 'Interest rate must be between 0% and 100%';
      if (inputs.debtMonthlyPayment < 0) errs.debtMonthlyPayment = 'Payment cannot be negative';
    }
    if (step === 4 && inputs.currentSavings < 0) errs.currentSavings = 'Savings cannot be negative';
    if (step === 5) {
      if (inputs.monthlyInvestment < 0) errs.monthlyInvestment = 'Investment cannot be negative';
      if (inputs.investmentBalance < 0) errs.investmentBalance = 'Balance cannot be negative';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [inputs]);

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setErrors({});
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goPrev = () => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleStepClick = (step: number) => {
    // Allow jumping to any completed or current step
    if (step <= currentStep) {
      setErrors({});
      setCurrentStep(step);
    }
  };

  const saveProfile = async () => {
    if (!validateStep(currentStep)) return;
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome:      inputs.monthlyIncome,
          monthlyExpenses:    inputs.monthlyExpenses,
          currentSavings:     inputs.currentSavings,
          debtBalance:        inputs.debtBalance,
          debtMonthlyPayment: inputs.debtMonthlyPayment,
          debtAnnualRate:     inputs.debtAnnualRate,
          monthlyInvestment:  inputs.monthlyInvestment,
          investmentBalance:  inputs.investmentBalance,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Data is persisted in Zustand store regardless
    } finally {
      setSaving(false);
    }
  };

  const stepConfig = STEPS[currentStep - 1];
  const isLastStep = currentStep === STEPS.length;

  return (
    <div className="space-y-7" style={{ animation: 'pageIn 160ms ease-out backwards' }}>

      {/* ── Page header ── CBG pattern: accent label → headline → subtitle + CTA ─ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1.5"
            style={{ color: 'var(--primary)' }}
          >
            Financial Plan
          </p>
          <h1 className="heading-page mb-1.5">Build Your Plan</h1>
          <p className="body-sm">
            Enter your numbers step by step — every field updates your projections in real time.
          </p>
        </div>
        <button
          onClick={() => setShowCSV(true)}
          className="btn btn-secondary btn-sm shrink-0 flex items-center gap-2 mt-1"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import CSV
        </button>
      </div>

      {/* ── Step progress track ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl px-6 py-4"
        style={{
          background: 'var(--surface-primary-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--surface-primary-border)',
          boxShadow: 'var(--shadow-card-subtle)',
        }}
      >
        <StepProgress current={currentStep} total={STEPS.length} onStepClick={handleStepClick} />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form card */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="rounded-2xl p-7 flex-1"
            style={{
              background: 'var(--surface-primary-bg)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--surface-primary-border)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Step header */}
            <div className="flex items-start gap-4 mb-7">
              {/* Step number badge */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
              >
                {currentStep}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--primary)', letterSpacing: '0.12em' }}
                >
                  Step {currentStep} of {STEPS.length}
                </p>
                <h2
                  className="heading-section mb-1"
                  style={{ fontSize: '1.25rem' }}
                >
                  {stepConfig.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {stepConfig.desc}
                </p>
              </div>
            </div>

            {/* Fields */}
            <StepContent
              step={currentStep}
              inputs={inputs}
              updateInputs={updateInputs}
              errors={errors}
            />

            {/* Navigation */}
            <div
              className="flex items-center justify-between mt-8 pt-6"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={goPrev}
                disabled={currentStep === 1}
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                style={{ opacity: currentStep === 1 ? 0.4 : 1 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Previous
              </button>

              {isLastStep ? (
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Saving…
                    </>
                  ) : saved ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Plan saved
                    </>
                  ) : (
                    'Save my plan'
                  )}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  Next: {STEPS[currentStep].label}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Save confirmation toast */}
          {saved && (
            <div
              className="rounded-xl p-3.5 flex items-center gap-2.5"
              style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                animation: 'pageIn 160ms ease-out backwards',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-sm font-medium" style={{ color: '#065F46' }}>
                Plan saved. Your dashboard and projections have been updated.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <PlanSummary inputs={inputs} projection={projection} />

          {/* Next step preview / completion card */}
          {!isLastStep ? (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--surface-primary-bg)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid var(--surface-primary-border)',
                boxShadow: 'var(--shadow-card-subtle)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--muted-foreground)', letterSpacing: '0.12em' }}
              >
                Up next
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  {currentStep + 1}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {STEPS[currentStep].title}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                boxShadow: 'var(--shadow-card-subtle)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--success)', letterSpacing: '0.12em' }}
              >
                Plan complete
              </p>
              <p className="text-xs mb-3" style={{ color: '#065F46' }}>
                Save your plan to update your dashboard and run projections.
              </p>
              <a
                href="/simulator"
                className="btn btn-secondary btn-sm w-full text-center block"
                style={{ fontSize: '0.8125rem' }}
              >
                Open Simulator →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── CSV Import modal ────────────────────────────────────────────────── */}
      {showCSV && (
        <CSVImportModal
          onClose={() => setShowCSV(false)}
          onImport={(data) => {
            updateInputs(data);
            setShowCSV(false);
          }}
        />
      )}
    </div>
  );
}
