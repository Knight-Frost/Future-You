import type { FinancialInputs, OptimizationResult, StrategyAction } from '@/types';
import { calcDebtPayoffMonths, calcTotalInterest, simulateLoan } from './calculator';

// ─── Month-by-month debt simulation (more accurate than closed-form for edges) ─

function simulateDebtPayoff(
  balance: number,
  monthlyPayment: number,
  annualRate: number
): number {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const r = annualRate / 12;
  let remaining = balance;
  let months = 0;

  while (remaining > 0.01 && months < 1200) {
    const interest = remaining * r;
    if (monthlyPayment <= interest) return Infinity;
    remaining = remaining + interest - monthlyPayment;
    months++;
  }

  return months;
}

// ─── Binary search for required payment to hit target months ─────────────────

function findPaymentForTarget(
  balance: number,
  annualRate: number,
  targetMonths: number
): number {
  if (balance <= 0) return 0;

  let low = balance * (annualRate / 12) + 0.01;
  let high = balance * 2;
  const precision = 0.5;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const months = simulateDebtPayoff(balance, mid, annualRate);

    if (Math.abs(months - targetMonths) < precision) return mid;
    if (months > targetMonths) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

// ─── Decompose required extra payment into human-readable sources ─────────────

function decomposePaymentIncrease(
  requiredExtra: number,
  inputs: FinancialInputs
): { actions: StrategyAction[]; isTotallyFeasible: boolean } {
  const {
    monthlyIncome,
    monthlyExpenses,
    debtMonthlyPayment,
    monthlyInvestment,
  } = inputs;

  const monthlyRemaining = monthlyIncome - monthlyExpenses;
  const freeSurplus = Math.max(0, monthlyRemaining - debtMonthlyPayment - monthlyInvestment);
  const discretionary = monthlyExpenses * 0.22; // ~22% of expenses are discretionary

  const actions: StrategyAction[] = [];
  let remaining = requiredExtra;

  // Source 1: Free surplus
  if (freeSurplus > 0 && remaining > 0) {
    const fromSurplus = Math.min(freeSurplus, remaining);
    actions.push({
      label: 'Use available monthly surplus',
      amount: fromSurplus,
      source: 'surplus',
    });
    remaining -= fromSurplus;
  }

  // Source 2: Temporarily redirect investments
  if (monthlyInvestment > 0 && remaining > 0) {
    const fromInvestment = Math.min(monthlyInvestment, remaining);
    actions.push({
      label: 'Pause monthly investment temporarily',
      amount: fromInvestment,
      source: 'investment',
    });
    remaining -= fromInvestment;
  }

  // Source 3: Reduce discretionary spending
  if (discretionary > 0 && remaining > 0) {
    const fromSpending = Math.min(discretionary, remaining);
    actions.push({
      label: 'Reduce discretionary spending',
      amount: fromSpending,
      source: 'spending',
    });
    remaining -= fromSpending;
  }

  // Source 4: Income gap — cannot be found in budget
  if (remaining > 0.5) {
    actions.push({
      label: 'Additional income needed',
      amount: remaining,
      source: 'income_gap',
    });
  }

  const isTotallyFeasible = remaining <= 0.5;
  return { actions, isTotallyFeasible };
}

// ─── Primary Optimizer ────────────────────────────────────────────────────────

export function generateStrategies(inputs: FinancialInputs): OptimizationResult[] {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    debtBalance,
    debtMonthlyPayment,
    debtAnnualRate,
    goalAmount,
    monthlyInvestment,
  } = inputs;

  const hasDebt = debtBalance > 0 && debtAnnualRate > 0;
  const monthlyRemaining = monthlyIncome - monthlyExpenses;
  const freeSurplus = Math.max(0, monthlyRemaining - debtMonthlyPayment - monthlyInvestment);

  // Baseline metrics
  const baselineDebtMonths = hasDebt
    ? calcDebtPayoffMonths(debtBalance, debtMonthlyPayment, debtAnnualRate)
    : 0;
  const baselineTotalInterest = hasDebt
    ? calcTotalInterest(debtBalance, debtMonthlyPayment, debtAnnualRate)
    : 0;

  if (!hasDebt && goalAmount <= 0) {
    return [];
  }

  // Target: cut timeline by 30% (Option A), 50% (B), 50% combined (C)
  const targetMonths30 = Math.ceil(baselineDebtMonths * 0.7);
  const targetMonths50 = Math.ceil(baselineDebtMonths * 0.5);

  function buildStrategy(
    label: string,
    title: string,
    description: string,
    targetMonths: number,
    paymentDelta: number,
    spendingDelta: number,
    isRecommended: boolean,
    index: number
  ): OptimizationResult {
    const newPayment = debtMonthlyPayment + paymentDelta;
    const newDebtMonths = simulateDebtPayoff(debtBalance, newPayment, debtAnnualRate);
    // Bug #7 fix: use simulateLoan (month-by-month) for accurate interest — closed-form overcounts by up to one full payment
    const { totalInterest: newTotalInterest } = simulateLoan(debtBalance, newPayment, debtAnnualRate);

    const interestSaved = isFinite(newTotalInterest)
      ? Math.max(0, baselineTotalInterest - newTotalInterest)
      : 0;

    const timeReduction = isFinite(baselineDebtMonths) && isFinite(newDebtMonths)
      ? baselineDebtMonths - newDebtMonths
      : 0;

    const { actions, isTotallyFeasible } = decomposePaymentIncrease(
      paymentDelta,
      inputs
    );

    const status: OptimizationResult['status'] = isTotallyFeasible ? 'feasible' : 'infeasible';

    return {
      status,
      mode: hasDebt ? 'debt' : 'savings',
      label,
      title,
      description,
      isRecommended,
      requiredMonthlyExtra: paymentDelta,
      newPayoffMonths: newDebtMonths,
      requiredPayment: newPayment,
      interestSaved,
      timeReductionMonths: timeReduction,
      actions,
      isTotallyFeasible,
    };
  }

  if (!isFinite(baselineDebtMonths)) {
    // Debt payment insufficient even for baseline — critical state
    const minViable = debtBalance * (debtAnnualRate / 12) + 50;
    const minExtra = minViable - debtMonthlyPayment;

    return [
      buildStrategy(
        'Option A',
        'Make Debt Payable',
        `Your current payment of ${formatCurrency(debtMonthlyPayment)} doesn't cover interest. Increase by at least ${formatCurrency(minExtra)}/month.`,
        baselineDebtMonths,
        minExtra,
        0,
        true,
        0
      ),
    ];
  }

  // Bug #8 fix: compute required extra payment via binary search to actually hit the target timelines
  // instead of using arbitrary surplus fractions that may overshoot or undershoot
  const requiredFor30 = Math.max(0, Math.round(findPaymentForTarget(debtBalance, debtAnnualRate, targetMonths30) - debtMonthlyPayment));
  const requiredFor50 = Math.max(0, Math.round(findPaymentForTarget(debtBalance, debtAnnualRate, targetMonths50) - debtMonthlyPayment));

  return [
    buildStrategy(
      'Option A',
      'Reduce Spending',
      `Cut discretionary spending and redirect savings to debt, reducing timeline by ~30%.`,
      targetMonths30,
      requiredFor30,
      -Math.round(monthlyExpenses * 0.05),
      false,
      0
    ),
    buildStrategy(
      'Option B',
      'Boost Payments',
      `Increase monthly payments significantly using your available surplus.`,
      targetMonths50,
      requiredFor50,
      0,
      true,
      1
    ),
    buildStrategy(
      'Option C',
      'Combined Approach',
      `A balanced mix of spending cuts and payment increases for the best tradeoff.`,
      targetMonths50,
      requiredFor50,
      -Math.round(monthlyExpenses * 0.04),
      false,
      2
    ),
  ];
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
