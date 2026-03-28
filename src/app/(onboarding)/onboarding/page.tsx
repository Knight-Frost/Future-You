'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useFinancialStore } from '@/stores/useFinancialStore';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    step: 1,
    title: "What's your income & spending?",
    description: 'We start with your monthly cashflow — the foundation of every financial strategy.',
    iconPath: (
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    ),
    iconExtra: (
      <line x1="12" y1="1" x2="12" y2="23" />
    ),
  },
  {
    step: 2,
    title: 'Tell us about savings & debt',
    description: 'Where you stand today determines your fastest path forward.',
    iconPath: (
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    ),
    iconExtra: (
      <polyline points="9 22 9 12 15 12 15 22" />
    ),
  },
  {
    step: 3,
    title: "What's your primary goal?",
    description: 'One clear goal gives your financial strategy direction and urgency.',
    iconPath: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    step: 4,
    title: 'Are you investing?',
    description: 'Investment data helps us show long-term projections alongside short-term goals.',
    iconPath: (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </>
    ),
  },
];

const GOAL_TYPES = [
  { value: 'EMERGENCY_FUND', label: 'Emergency Fund', description: '3–6 months expenses as a safety net' },
  { value: 'DEBT_PAYOFF', label: 'Pay Off Debt', description: 'Eliminate high-interest debt fast' },
  { value: 'HOME_PURCHASE', label: 'Buy a Home', description: 'Save for a down payment' },
  { value: 'INVESTMENT', label: 'Build Investments', description: 'Grow long-term wealth' },
  { value: 'TRAVEL', label: 'Travel Fund', description: 'Save for a specific trip' },
  { value: 'EDUCATION', label: 'Education', description: 'Fund learning or skill development' },
  { value: 'RETIREMENT', label: 'Retirement', description: 'Build your retirement nest egg' },
  { value: 'CUSTOM', label: 'Custom Goal', description: 'Something specific to you' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { syncFromProfile } = useFinancialStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');

  const [currentSavings, setCurrentSavings] = useState('');
  const [hasDebt, setHasDebt] = useState<boolean | null>(null);
  const [debtBalance, setDebtBalance] = useState('');
  const [debtPayment, setDebtPayment] = useState('');
  const [debtRate, setDebtRate] = useState('18');

  const [goalType, setGoalType] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalMonths, setGoalMonths] = useState('');

  const [monthlyInvestment, setMonthlyInvestment] = useState('');

  async function saveStep(step: number, complete = false) {
    const payload: Record<string, unknown> = { step, complete };

    if (step >= 1) {
      payload.monthlyIncome = parseFloat(monthlyIncome) || 0;
      payload.monthlyExpenses = parseFloat(monthlyExpenses) || 0;
    }
    if (step >= 2) {
      payload.currentSavings = parseFloat(currentSavings) || 0;
      if (hasDebt) {
        payload.debtBalance = parseFloat(debtBalance) || 0;
        payload.debtMonthlyPayment = parseFloat(debtPayment) || 0;
        payload.debtAnnualRate = (parseFloat(debtRate) || 18) / 100;
      }
    }
    if (step === 3 && goalType) {
      payload.goalTitle = goalTitle || GOAL_TYPES.find((g) => g.value === goalType)?.label || 'My Goal';
      payload.goalType = goalType;
      payload.goalAmount = parseFloat(goalAmount) || 0;
      if (goalMonths) payload.goalTargetMonths = parseInt(goalMonths);
    }
    if (step >= 4) {
      payload.monthlyInvestment = parseFloat(monthlyInvestment) || 0;
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save progress');

    syncFromProfile({
      monthlyIncome: parseFloat(monthlyIncome) || 0,
      monthlyExpenses: parseFloat(monthlyExpenses) || 0,
      currentSavings: parseFloat(currentSavings) || 0,
      debtBalance: hasDebt ? parseFloat(debtBalance) || 0 : 0,
      debtMonthlyPayment: hasDebt ? parseFloat(debtPayment) || 0 : 0,
      debtAnnualRate: (parseFloat(debtRate) || 18) / 100,
      goalName: goalTitle || GOAL_TYPES.find((g) => g.value === goalType)?.label || 'My Goal',
      goalAmount: parseFloat(goalAmount) || 0,
      monthlyInvestment: parseFloat(monthlyInvestment) || 0,
      investmentBalance: 0,
    });
  }

  async function handleNext() {
    setError('');
    setLoading(true);

    if (currentStep === 1) {
      if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) {
        setError('Please enter your monthly income.');
        setLoading(false);
        return;
      }
      if (!monthlyExpenses || parseFloat(monthlyExpenses) <= 0) {
        setError('Please enter your monthly expenses.');
        setLoading(false);
        return;
      }
    }
    if (currentStep === 3 && !goalType) {
      setError('Please select a goal type.');
      setLoading(false);
      return;
    }
    if (currentStep === 3 && (!goalAmount || parseFloat(goalAmount) <= 0)) {
      setError('Please enter your goal amount.');
      setLoading(false);
      return;
    }

    try {
      await saveStep(currentStep);
      if (currentStep < STEPS.length) {
        setCurrentStep((s) => s + 1);
      }
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setError('');
    setLoading(true);
    try {
      await saveStep(4, true);
      window.location.href = '/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const progress = (currentStep / STEPS.length) * 100;
  const surplus = monthlyIncome && monthlyExpenses
    ? parseFloat(monthlyIncome) - parseFloat(monthlyExpenses)
    : null;
  const surplusPositive = surplus !== null && surplus >= 0;

  const projectedInvestment = monthlyInvestment && parseFloat(monthlyInvestment) > 0
    ? parseFloat(monthlyInvestment) * (((1 + 0.07 / 12) ** 240 - 1) / (0.07 / 12))
    : null;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Left: progress sidebar ──────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between p-10"
        style={{
          width: '300px',
          minWidth: '300px',
          background: 'var(--royal-gradient)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span className="font-bold text-white" style={{ letterSpacing: '-0.01em' }}>FutureYou</span>
          </div>

          <h2 className="text-lg font-bold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
            Set up your financial profile
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Takes about 3 minutes. Encrypted and secure.
          </p>

          {/* Progress bar — high contrast on blue */}
          <div className="mb-8">
            <div className="flex justify-between text-xs font-semibold mb-2.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.92)' }}
              />
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-1">
            {STEPS.map((s) => {
              const isDone = currentStep > s.step;
              const isActive = currentStep === s.step;
              return (
                <div
                  key={s.step}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                    isActive ? 'bg-[rgba(255,255,255,0.15)]' : ''
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isDone
                        ? 'rgba(52,211,153,0.3)'
                        : isActive
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(255,255,255,0.15)',
                      border: isDone
                        ? '1.5px solid rgba(52,211,153,0.6)'
                        : isActive
                        ? 'none'
                        : '1.5px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {isDone ? (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#34D399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ color: isActive ? '#14532d' : 'rgba(255,255,255,0.55)', fontSize: '11px' }}>{s.step}</span>
                    )}
                  </div>
                  <p
                    className="text-sm leading-tight"
                    style={{
                      color: isActive
                        ? '#FFFFFF'
                        : isDone
                        ? 'rgba(255,255,255,0.55)'
                        : 'rgba(255,255,255,0.5)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {s.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Your data is never sold or shared.
        </p>
      </div>

      {/* ── Main form area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>

        {/* Top progress strip (visible on mobile) */}
        <div className="h-1.5 shrink-0" style={{ background: 'rgba(22,163,74,0.12)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--primary-gradient)' }}
          />
        </div>

        {/* Scrollable content area — full width with generous padding */}
        <div className="flex-1 overflow-y-auto px-8 py-10 sm:px-12 lg:px-16 xl:px-20">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span className="font-bold text-[#0F172A]" style={{ letterSpacing: '-0.01em' }}>FutureYou</span>
          </div>

          {/* Step header */}
          <div className="mb-8 max-w-2xl">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'var(--primary-gradient)', boxShadow: '0 6px 20px var(--primary-glow)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {STEPS[currentStep - 1].iconPath}
                {STEPS[currentStep - 1].iconExtra}
              </svg>
            </div>
            <div className="label-caps mb-2" style={{ color: 'var(--primary)' }}>Step {currentStep} of {STEPS.length}</div>
            <h1 className="heading-page mb-2">{STEPS[currentStep - 1].title}</h1>
            <p className="body-sm">{STEPS[currentStep - 1].description}</p>
          </div>

          {/* ── Step 1: Income & Expenses ── */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                <Input
                  label="Monthly income (after tax)"
                  type="number"
                  min="0"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="4,500"
                  prefix="$"
                  hint="Include all regular income sources"
                />
                <Input
                  label="Monthly expenses"
                  type="number"
                  min="0"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(e.target.value)}
                  placeholder="3,200"
                  prefix="$"
                  hint="Rent, food, transport, subscriptions — everything"
                />
              </div>
              {surplus !== null && (
                <div
                  className="rounded-xl p-4 flex items-center justify-between animate-fade-in max-w-2xl"
                  style={{
                    background: surplusPositive ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${surplusPositive ? '#A7F3D0' : '#FECACA'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', surplusPositive ? 'bg-[#059669]' : 'bg-[#DC2626]')} />
                    <p className={cn('text-sm font-semibold', surplusPositive ? 'text-[#065F46]' : 'text-[#991B1B]')}>
                      Monthly surplus
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-bold tabular-nums', surplusPositive ? 'text-[#059669]' : 'text-[#DC2626]')}>
                      {surplusPositive ? '+' : ''}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(surplus)}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {surplusPositive ? 'Great — you have money to work with.' : "We'll help you find a path forward."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Savings & Debt ── */}
          {currentStep === 2 && (
            <div className="space-y-5 max-w-2xl">
              <Input
                label="Current savings balance"
                type="number"
                min="0"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="2,000"
                prefix="$"
                hint="Total in savings accounts — not investments"
              />

              <div>
                <p className="field-label mb-2">Do you have any debt?</p>
                <div className="flex gap-3">
                  {[
                    { label: 'Yes, I have debt', value: true },
                    { label: 'No debt', value: false },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => setHasDebt(option.value)}
                      className="flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all"
                      style={hasDebt === option.value
                        ? { background: 'var(--primary-subtle)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                        : { background: '#ffffff', borderColor: 'var(--border-strong)', color: '#334155' }
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasDebt === true && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
                  <Input
                    label="Total debt balance"
                    type="number"
                    min="0"
                    value={debtBalance}
                    onChange={(e) => setDebtBalance(e.target.value)}
                    placeholder="8,500"
                    prefix="$"
                    hint="Credit cards, loans, student debt"
                  />
                  <Input
                    label="Monthly payment"
                    type="number"
                    min="0"
                    value={debtPayment}
                    onChange={(e) => setDebtPayment(e.target.value)}
                    placeholder="220"
                    prefix="$"
                    hint="Total minimums across all debts"
                  />
                  <Input
                    label="Average APR"
                    type="number"
                    min="0"
                    max="100"
                    value={debtRate}
                    onChange={(e) => setDebtRate(e.target.value)}
                    placeholder="18"
                    suffix="%"
                    hint="Use your highest rate if multiple"
                  />
                </div>
              )}

              {hasDebt === false && (
                <div className="rounded-xl p-4 animate-fade-in" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <p className="text-sm font-semibold text-[#065F46]">Debt-free is a great position to be in.</p>
                  </div>
                  <p className="text-xs text-[#059669]">Your focus can go straight to building wealth.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Goal ── */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <p className="field-label mb-3">What are you working toward?</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl">
                  {GOAL_TYPES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        setGoalType(g.value);
                        if (!goalTitle) setGoalTitle(g.label);
                      }}
                      className="text-left p-4 rounded-xl border transition-all"
                      style={goalType === g.value
                        ? { background: 'var(--primary-subtle)', borderColor: 'var(--primary)' }
                        : { background: '#ffffff', borderColor: 'var(--border-strong)' }
                      }
                    >
                      <p className="text-sm font-semibold" style={{ color: goalType === g.value ? 'var(--primary)' : '#334155' }}>
                        {g.label}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">{g.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {goalType && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in max-w-3xl">
                  <Input
                    label="Goal name"
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Emergency Fund"
                  />
                  <Input
                    label="Target amount"
                    type="number"
                    min="0"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="15,000"
                    prefix="$"
                  />
                  <Input
                    label="Timeline (optional)"
                    type="number"
                    min="1"
                    value={goalMonths}
                    onChange={(e) => setGoalMonths(e.target.value)}
                    placeholder="24"
                    suffix="months"
                    hint="We'll calculate if left blank"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Investments ── */}
          {currentStep === 4 && (
            <div className="space-y-5 max-w-2xl">
              <Input
                label="Monthly investment amount"
                type="number"
                min="0"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(e.target.value)}
                placeholder="0"
                prefix="$"
                hint="Stocks, index funds, 401k, etc. per month"
              />

              {(!monthlyInvestment || parseFloat(monthlyInvestment) === 0) && (
                <div className="rounded-xl p-4" style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#14532d' }}>Not investing yet? That's okay.</p>
                  <p className="text-xs" style={{ color: 'var(--primary)' }}>
                    We'll help you find room to start — even $50/month compounds significantly over time.
                  </p>
                </div>
              )}

              {projectedInvestment !== null && (
                <div className="rounded-xl p-5 animate-fade-in" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <p className="text-xs text-[#64748B] mb-1">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(monthlyInvestment))}/mo at 7% for 20 years
                  </p>
                  <p className="text-3xl font-extrabold text-[#059669] tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(projectedInvestment)}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Estimated future value (7% annual return, no fees)</p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 mt-5 max-w-2xl" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-8 max-w-2xl">
            {currentStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              onClick={currentStep < STEPS.length ? handleNext : handleComplete}
              loading={loading}
            >
              {currentStep < STEPS.length ? 'Continue →' : 'View my financial plan →'}
            </Button>
          </div>

          {currentStep === STEPS.length && (
            <button
              type="button"
              onClick={handleComplete}
              className="mt-3 text-sm font-medium transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              Skip investment step for now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
