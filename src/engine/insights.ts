import type { FinancialInputs, FinancialProjection, InsightResult, InsightPriority } from '@/types';
import { formatCurrency, formatMonths } from '@/lib/utils';
import { calcDebtPayoffMonths, calcTotalInterest, futureValueAnnuity } from '@/engine/calculator';

// ─── Rule-Based Insight Engine ────────────────────────────────────────────────
// Synchronous, instant, never blocks UI. Runs before AI response.

export function evaluateRules(
  inputs: FinancialInputs,
  projection: FinancialProjection
): InsightResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    debtBalance,
    debtAnnualRate,
    debtMonthlyPayment,
    goalAmount,
    monthlyInvestment,
  } = inputs;

  const {
    monthlyRemaining,
    savingsRate,
    debtPayoffMonths,
    totalInterest,
    emergencyFundMonths,
  } = projection;

  // ── CRITICAL: Negative cash flow ───────────────────────────────────────────
  if (monthlyRemaining <= 0) {
    return {
      priority: 'CRITICAL',
      category: 'Cash Flow',
      action: `Reduce monthly expenses by at least ${formatCurrency(Math.abs(monthlyRemaining) + 100)}`,
      reason: `You're spending more than you earn — your finances are in deficit. No strategy can work until expenses are below income.`,
      outcome: `Achieving a positive surplus unlocks every other financial strategy.`,
    };
  }

  // ── HIGH: High-interest debt ──────────────────────────────────────────────
  if (debtBalance > 500 && debtAnnualRate > 0.10) {
    // Bug #4 fix: use net free surplus (after debt payment + investment), not gross remaining
    const freeSurplus = Math.max(0, monthlyRemaining - debtMonthlyPayment - monthlyInvestment);
    const extraPayment = Math.min(freeSurplus * 0.5, 400);
    const newMonthlyPayment = debtMonthlyPayment + extraPayment;
    // Compute actual months to pay off with the extra payment applied
    const newDebtPayoffMonths = calcDebtPayoffMonths(debtBalance, newMonthlyPayment, debtAnnualRate);
    const monthsSaved = isFinite(debtPayoffMonths) && isFinite(newDebtPayoffMonths)
      ? Math.max(0, debtPayoffMonths - newDebtPayoffMonths)
      : 0;
    // Bug #3 fix: compute actual interest difference via simulation, not a proportional approximation
    const estInterestSaved = Math.max(0, totalInterest - calcTotalInterest(debtBalance, newMonthlyPayment, debtAnnualRate));
    const timeOutcome = monthsSaved > 0
      ? ` and pay off ${formatMonths(monthsSaved)} sooner`
      : '';

    return {
      priority: 'HIGH',
      category: 'Debt',
      action: `Add ${formatCurrency(extraPayment)}/month to your debt payment`,
      reason: `Your ${(debtAnnualRate * 100).toFixed(0)}% APR debt is costing you approximately ${formatCurrency(totalInterest)} in total interest. High-interest debt has the highest guaranteed return on action.`,
      outcome: `Save an estimated ${formatCurrency(estInterestSaved)} in interest${timeOutcome}.`,
    };
  }

  // ── HIGH: No emergency fund ───────────────────────────────────────────────
  if (emergencyFundMonths < 1) {
    // Bug #5 fix: use net surplus; avoid dividing by 0 (gives Infinity → formatMonths returns '—')
    const monthlySurplus = Math.max(0, monthlyRemaining - debtMonthlyPayment - monthlyInvestment);
    const monthsToEF = monthlySurplus > 0
      ? (monthlyExpenses * 3 - currentSavings) / monthlySurplus
      : Infinity;
    return {
      priority: 'HIGH',
      category: 'Emergency Fund',
      action: `Build a ${formatCurrency(monthlyExpenses * 3)} emergency fund before anything else`,
      reason: `You have less than 1 month of expenses saved. One unexpected event could force you into debt. ${formatCurrency(monthlySurplus)}/month directed to savings reaches 3 months in ${formatMonths(monthsToEF)}.`,
      outcome: `Financial stability and the ability to take calculated risks without fear.`,
    };
  }

  // ── MEDIUM: Low savings rate ──────────────────────────────────────────────
  if (savingsRate < 0.10) {
    const targetSavings = monthlyIncome * 0.15;
    const additionalMonthly = Math.max(0, targetSavings - (monthlyRemaining - debtMonthlyPayment - monthlyInvestment));
    return {
      priority: 'MEDIUM',
      category: 'Savings Rate',
      action: `Increase monthly savings to ${formatCurrency(targetSavings)} (15% of income)`,
      reason: `Your current savings rate of ${(savingsRate * 100).toFixed(1)}% is below the 15% minimum recommended for long-term financial health.`,
      outcome: additionalMonthly > 0
        ? `Redirecting ${formatCurrency(additionalMonthly)}/month to savings reaches the 15% benchmark and significantly shortens your goal timeline.`
        : `Redirecting your current surplus to savings reaches the 15% benchmark and builds your financial cushion faster.`,
    };
  }

  // ── MEDIUM: Not investing ──────────────────────────────────────────────────
  if (monthlyInvestment === 0 && monthlyRemaining > 500 && debtBalance < 2000) {
    return {
      priority: 'MEDIUM',
      category: 'Investments',
      action: `Start investing ${formatCurrency(Math.min(200, monthlyRemaining * 0.15))}/month`,
      reason: `You have no monthly investments. With low debt and good income, compound growth is your biggest untapped lever. Even small amounts matter significantly over 10+ years.`,
      outcome: `${formatCurrency(200)} per month at 7% for 20 years grows to over ${formatCurrency(futureValueAnnuity(200, 0.07, 20))}.`,
    };
  }

  // ── LOW: On track ─────────────────────────────────────────────────────────
  return {
    priority: 'LOW',
    category: 'On Track',
    action: `Review your investment allocation and consider increasing by 5%`,
    reason: `Your finances are healthy — positive cash flow, manageable debt, and a solid savings rate. The next opportunity is optimizing your investment strategy for long-term growth.`,
    outcome: `Each percentage point increase in investment today compounds significantly over decades.`,
  };
}

// ─── AI Insight Generation (server-side only) ─────────────────────────────────

export interface AIInsightRequest {
  inputs: FinancialInputs;
  projection: FinancialProjection;
  ruleInsight: InsightResult;
}

export function buildAIPrompt(req: AIInsightRequest): string {
  const { inputs, projection, ruleInsight } = req;

  return `You are a calm, direct financial advisor. The user is reviewing their finances in the FutureYou app.

THEIR FINANCIAL SITUATION:
- Monthly income: ${formatCurrency(inputs.monthlyIncome)}
- Monthly expenses: ${formatCurrency(inputs.monthlyExpenses)}
- Monthly surplus: ${formatCurrency(projection.monthlyRemaining)}
- Savings rate: ${(projection.savingsRate * 100).toFixed(1)}%
- Current savings: ${formatCurrency(inputs.currentSavings)}
- Emergency fund: ${projection.emergencyFundMonths.toFixed(1)} months of expenses
${inputs.debtBalance > 0 ? `- Debt: ${formatCurrency(inputs.debtBalance)} at ${(inputs.debtAnnualRate * 100).toFixed(0)}% APR, paying ${formatCurrency(inputs.debtMonthlyPayment)}/month` : '- No debt'}
- Goal: ${inputs.goalName} (${formatCurrency(inputs.goalAmount)})
- Goal timeline: ${formatMonths(projection.goalTimelineMonths)}
${inputs.monthlyInvestment > 0 ? `- Monthly investment: ${formatCurrency(inputs.monthlyInvestment)}` : '- Not yet investing'}

The rule-based system already suggested: "${ruleInsight.action}"

Provide ONE specific, actionable recommendation different from the above — a nuanced insight the rules might miss. 2-3 sentences max. Be specific with numbers. Be direct, not motivational.`;
}
