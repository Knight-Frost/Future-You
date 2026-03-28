// FutureYou — Core Type Definitions

// ─── Financial Profile ───────────────────────────────────────────────────────

export interface FinancialInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  debtBalance: number;
  debtMonthlyPayment: number;
  debtAnnualRate: number;
  goalName: string;
  goalAmount: number;
  monthlyInvestment: number;
  investmentBalance: number;
}

export interface SimulatorSliders {
  spendingReduction: number;
  extraDebtPayment: number;
  extraSavings: number;
  extraInvestment: number;
}

// ─── Calculated Projection ───────────────────────────────────────────────────

export interface InvestmentProjection {
  conservative: number;
  moderate: number;
  optimistic: number;
}

export interface FinancialProjection {
  // Monthly cashflow
  monthlyRemaining: number;   // income − expenses (gross, before debt & investment)
  netSurplus: number;         // income − expenses − debt payment − investment (true take-home)
  savingsRate: number;

  // Goal timeline
  goalTimelineMonths: number;
  simulatedGoalMonths: number;
  goalTimeDelta: number; // negative = faster

  // Debt
  debtPayoffMonths: number;
  simulatedDebtMonths: number;
  debtTimeDelta: number;
  totalInterest: number;
  interestSaved: number;

  // Investments
  investments: {
    tenYear: InvestmentProjection;
    twentyYear: InvestmentProjection;
    thirtyYear: InvestmentProjection;
  };

  // Transition flags (covers Infinity ↔ finite edge cases the delta cannot express)
  debtBecamePayable: boolean;       // baseline=Infinity, simulated=finite
  goalBecameAchievable: boolean;    // baseline=Infinity, simulated=finite
  goalBecameUnachievable: boolean;  // baseline=finite, simulated=Infinity

  // Meta
  anySliderMoved: boolean;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
}

// ─── Optimization ────────────────────────────────────────────────────────────

export type StrategyStatus = 'feasible' | 'infeasible' | 'already_achieved' | 'no_target';
export type StrategyMode = 'debt' | 'savings';

export interface StrategyAction {
  label: string;
  amount: number;
  source: 'surplus' | 'investment' | 'spending' | 'income_gap';
}

export interface OptimizationResult {
  status: StrategyStatus;
  mode: StrategyMode;
  label: string;
  title: string;
  description: string;
  isRecommended: boolean;
  requiredMonthlyExtra: number;
  newPayoffMonths: number;
  requiredPayment: number;
  interestSaved: number;
  timeReductionMonths: number;
  actions: StrategyAction[];
  isTotallyFeasible: boolean;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export type InsightPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type InsightSource = 'RULE_BASED' | 'AI_GENERATED';

export interface InsightResult {
  priority: InsightPriority;
  category: string;
  action: string;
  reason: string;
  outcome: string;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export type HealthStatus = 'strong' | 'healthy' | 'attention' | 'critical';

export interface HealthAssessment {
  status: HealthStatus;
  label: string;
  description: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── User / Session ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  onboardingDone: boolean;
  onboardingStep: number;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

export type OnboardingData = {
  // Step 1: Basic income
  monthlyIncome?: number;
  monthlyExpenses?: number;
  // Step 2: Savings & debt
  currentSavings?: number;
  debtBalance?: number;
  debtMonthlyPayment?: number;
  debtAnnualRate?: number;
  // Step 3: Goal
  goalName?: string;
  goalAmount?: string;
  goalType?: string;
  // Step 4: Investments
  monthlyInvestment?: number;
};
