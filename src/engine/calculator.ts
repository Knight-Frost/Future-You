import type { FinancialInputs, SimulatorSliders, FinancialProjection } from '@/types';

// ─── Investment Rates ─────────────────────────────────────────────────────────

export const INVESTMENT_RATES = {
  conservative: 0.05,
  moderate: 0.07,
  optimistic: 0.09,
} as const;

// ─── Core Financial Formulas ──────────────────────────────────────────────────

/**
 * Future value of a regular annuity (monthly contributions)
 * FV = PMT × (((1 + r)^n − 1) / r)
 */
export function futureValueAnnuity(
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  if (monthlyContribution <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return monthlyContribution * n;
  return monthlyContribution * (((1 + r) ** n - 1) / r);
}

/**
 * Future value of a lump sum
 * FV = P × (1 + r)^t  (monthly compounding)
 */
export function futureValueLumpSum(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  return principal * (1 + r) ** n;
}

/**
 * Month-by-month loan amortisation simulation.
 * Returns the exact number of payment months and the exact total interest paid,
 * correctly accounting for the partial final payment.
 *
 * This is the single source of truth for all interest calculations.
 * The closed-form formula calcDebtPayoffMonths() is faster and used where only
 * the month count matters, but interest MUST come from here to avoid the
 * systematic overcount caused by using Math.ceil(n) × PMT − balance.
 */
export function simulateLoan(
  balance: number,
  monthlyPayment: number,
  annualRate: number
): { months: number; totalInterest: number } {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity };

  const r = annualRate / 12;

  // Zero-rate shortcut
  if (r === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { months, totalInterest: 0 };
  }

  // Minimum-payment check (payment can't even cover monthly interest)
  if (monthlyPayment <= balance * r) return { months: Infinity, totalInterest: Infinity };

  let remaining = balance;
  let months = 0;
  let totalInterest = 0;

  while (remaining > 0.005 && months < 1200) {
    const interest = remaining * r;
    // Guard: should not occur after the minimum-payment check above, but be safe
    if (monthlyPayment <= interest) return { months: Infinity, totalInterest: Infinity };
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
    months++;
    if (remaining < 0) remaining = 0; // partial final payment — clamp to zero
  }

  return { months, totalInterest: Math.max(0, totalInterest) };
}

/**
 * Months to pay off a debt balance.
 * Uses the closed-form amortisation formula for speed; returns Infinity when
 * the payment cannot cover monthly interest.
 */
export function calcDebtPayoffMonths(
  balance: number,
  monthlyPayment: number,
  annualRate: number
): number {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const r = annualRate / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);

  const minPayment = balance * r;
  if (monthlyPayment <= minPayment) return Infinity;

  // n = −log(1 − Pr/PMT) / log(1 + r)
  const n = -Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r);
  if (!isFinite(n) || n < 0) return Infinity;
  return Math.ceil(n);
}

/**
 * Total interest paid over the life of a loan.
 * Uses simulateLoan() for accuracy — the closed-form approach with ceiled months
 * overcounts by up to one full payment because it ignores the partial final payment.
 */
export function calcTotalInterest(
  balance: number,
  monthlyPayment: number,
  annualRate: number
): number {
  const { totalInterest } = simulateLoan(balance, monthlyPayment, annualRate);
  return totalInterest;
}

/**
 * Months to accumulate a savings target (linear, no savings interest).
 */
export function calcSavingsMonths(
  currentSavings: number,
  monthlyContribution: number,
  targetAmount: number
): number {
  if (currentSavings >= targetAmount) return 0;
  if (monthlyContribution <= 0) return Infinity;
  return Math.ceil((targetAmount - currentSavings) / monthlyContribution);
}

// ─── Primary Projection Engine ────────────────────────────────────────────────

const DEFAULT_SLIDERS: SimulatorSliders = {
  spendingReduction: 0,
  extraDebtPayment: 0,
  extraSavings: 0,
  extraInvestment: 0,
};

export function calculateProjection(
  inputs: FinancialInputs,
  sliders: SimulatorSliders = DEFAULT_SLIDERS
): FinancialProjection {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    debtBalance,
    debtMonthlyPayment,
    debtAnnualRate,
    goalAmount,
    monthlyInvestment,
    investmentBalance,
  } = inputs;

  // ── Baseline cashflow ───────────────────────────────────────────────────────
  const monthlyRemaining = monthlyIncome - monthlyExpenses;           // gross surplus (before debt & investment)
  const netSurplus       = monthlyRemaining - debtMonthlyPayment - monthlyInvestment; // true cash left after all obligations
  const savingsRate      = monthlyIncome > 0 ? netSurplus / monthlyIncome : 0;

  // Free surplus available to direct toward goals (never negative)
  const surplusAfterDebt = Math.max(0, netSurplus);

  // ── Baseline goal timeline ──────────────────────────────────────────────────
  const baselineGoalMonths = calcSavingsMonths(currentSavings, surplusAfterDebt, goalAmount);

  // ── Baseline debt timeline & interest ──────────────────────────────────────
  const baselineDebtMonths    = calcDebtPayoffMonths(debtBalance, debtMonthlyPayment, debtAnnualRate);
  const baselineTotalInterest = calcTotalInterest(debtBalance, debtMonthlyPayment, debtAnnualRate);

  // ── Simulated values (with simulator sliders applied) ─────────────────────
  const { spendingReduction, extraDebtPayment, extraSavings, extraInvestment } = sliders;

  const simulatedExpenses        = monthlyExpenses - spendingReduction;
  const simulatedRemaining       = monthlyIncome - simulatedExpenses;
  const simulatedDebtPayment     = debtMonthlyPayment + extraDebtPayment;
  const simulatedInvestment      = monthlyInvestment + extraInvestment;
  const simulatedNetSurplus      = simulatedRemaining - simulatedDebtPayment - simulatedInvestment;
  const simulatedSurplusAfterDebt = Math.max(0, simulatedNetSurplus);
  const simulatedSavingsContrib   = simulatedSurplusAfterDebt + extraSavings;

  const simulatedGoalMonths    = calcSavingsMonths(currentSavings, simulatedSavingsContrib, goalAmount);
  const simulatedDebtMonths    = calcDebtPayoffMonths(debtBalance, simulatedDebtPayment, debtAnnualRate);
  const simulatedTotalInterest = calcTotalInterest(debtBalance, simulatedDebtPayment, debtAnnualRate);

  // ── Transition flags (Infinity ↔ finite) ───────────────────────────────────
  const debtBecamePayable      = !isFinite(baselineDebtMonths)  && isFinite(simulatedDebtMonths);
  const goalBecameAchievable   = !isFinite(baselineGoalMonths)  && isFinite(simulatedGoalMonths);
  const goalBecameUnachievable =  isFinite(baselineGoalMonths)  && baselineGoalMonths > 0 && !isFinite(simulatedGoalMonths);

  // ── Deltas ──────────────────────────────────────────────────────────────────
  const goalTimeDelta =
    isFinite(baselineGoalMonths) && isFinite(simulatedGoalMonths)
      ? simulatedGoalMonths - baselineGoalMonths
      : 0;

  const debtTimeDelta =
    isFinite(baselineDebtMonths) && isFinite(simulatedDebtMonths)
      ? simulatedDebtMonths - baselineDebtMonths
      : 0;

  const interestSaved =
    isFinite(baselineTotalInterest) && isFinite(simulatedTotalInterest)
      ? Math.max(0, baselineTotalInterest - simulatedTotalInterest)
      : 0;

  // ── Investment projections ──────────────────────────────────────────────────
  function projectInvestments(years: number) {
    return Object.fromEntries(
      (Object.entries(INVESTMENT_RATES) as [string, number][]).map(([key, rate]) => [
        key,
        futureValueLumpSum(investmentBalance, rate, years) +
          futureValueAnnuity(simulatedInvestment, rate, years),
      ])
    ) as { conservative: number; moderate: number; optimistic: number };
  }

  // ── Ratios ──────────────────────────────────────────────────────────────────
  const debtToIncomeRatio  = monthlyIncome > 0 ? debtMonthlyPayment / monthlyIncome : 0;
  const emergencyFundMonths = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0;
  const anySliderMoved     = spendingReduction !== 0 || extraDebtPayment !== 0 || extraSavings !== 0 || extraInvestment !== 0;

  return {
    monthlyRemaining,
    netSurplus,
    savingsRate,

    goalTimelineMonths: baselineGoalMonths,
    simulatedGoalMonths,
    goalTimeDelta,

    debtPayoffMonths: baselineDebtMonths,
    simulatedDebtMonths,
    debtTimeDelta,
    totalInterest: baselineTotalInterest,
    interestSaved,

    investments: {
      tenYear:     projectInvestments(10),
      twentyYear:  projectInvestments(20),
      thirtyYear:  projectInvestments(30),
    },

    debtBecamePayable,
    goalBecameAchievable,
    goalBecameUnachievable,

    anySliderMoved,
    debtToIncomeRatio,
    emergencyFundMonths,
  };
}

// ─── Health Assessment ────────────────────────────────────────────────────────

export type HealthStatus = 'strong' | 'healthy' | 'attention' | 'critical';

export function assessFinancialHealth(
  projection: FinancialProjection,
  inputs: FinancialInputs
): HealthStatus {
  const { monthlyRemaining, savingsRate, debtToIncomeRatio, emergencyFundMonths } = projection;
  const { debtBalance, debtAnnualRate } = inputs;

  // ── Critical ───────────────────────────────────────────────────────────────
  if (monthlyRemaining <= 0) return 'critical';
  // High DTI AND no safety net — one missed paycheck from crisis
  if (debtToIncomeRatio > 0.40 && emergencyFundMonths < 0.5) return 'critical';

  // ── Component flags ────────────────────────────────────────────────────────
  const hasHighInterestDebt = debtBalance > 500 && debtAnnualRate > 0.10;
  const goodSavingsRate     = savingsRate >= 0.15;
  // BUG FIX: was * 1 (1 month). Standard minimum for 'strong' is 3 months of expenses.
  const hasAdequateEmergencyFund = emergencyFundMonths >= 3;

  // ── Strong: positive on all three fronts ──────────────────────────────────
  if (goodSavingsRate && !hasHighInterestDebt && hasAdequateEmergencyFund) return 'strong';

  // ── Healthy: no high-interest debt, reasonable savings rate, at least 1 month EF
  // BUG FIX: was missing emergency fund check entirely.
  if (!hasHighInterestDebt && savingsRate >= 0.08 && emergencyFundMonths >= 1) return 'healthy';

  return 'attention';
}
