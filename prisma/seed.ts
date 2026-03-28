import { PrismaClient, GoalType, InsightSource, InsightPriority, StrategyType, Feasibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Demo user
  const passwordHash = await bcrypt.hash('demo123456', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@futureyou.app' },
    update: {},
    create: {
      email: 'demo@futureyou.app',
      name: 'Alex Demo',
      passwordHash,
      onboardingDone: true,
      onboardingStep: 4,
      financialProfile: {
        create: {
          monthlyIncome: 5200,
          monthlyExpenses: 3800,
          currentSavings: 1200,
          emergencyFundTarget: 15600, // 3 months expenses
          monthlyInvestment: 150,
          investmentBalance: 4200,
          debtBalance: 8400,
          debtMonthlyPayment: 220,
          debtAnnualRate: 0.19,
          debtType: 'credit_card',
          debtName: 'Chase Sapphire',
        },
      },
      settings: {
        create: {
          currency: 'USD',
          locale: 'en-US',
        },
      },
    },
  });

  // Create primary goal
  await prisma.goal.upsert({
    where: { id: 'seed-goal-1' },
    update: {},
    create: {
      id: 'seed-goal-1',
      userId: user.id,
      title: 'Emergency Fund',
      type: GoalType.EMERGENCY_FUND,
      targetAmount: 15600,
      currentAmount: 1200,
      targetMonths: 24,
      priority: 1,
    },
  });

  // Create sample strategies
  await prisma.strategy.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-strategy-1',
        userId: user.id,
        label: 'Option A',
        title: 'Reduce Spending',
        description: 'Reduce monthly discretionary spending by $280 and redirect to debt payoff.',
        type: StrategyType.REDUCE_SPENDING,
        requiredMonthlyExtra: 280,
        spendingChange: -280,
        projectedMonths: 38,
        projectedInterestSaved: 1840,
        projectedTimeReduction: 7,
        feasibility: Feasibility.FEASIBLE,
        isRecommended: false,
        isActive: false,
      },
      {
        id: 'seed-strategy-2',
        userId: user.id,
        label: 'Option B',
        title: 'Boost Payments',
        description: 'Increase monthly debt payments by $380 using available surplus.',
        type: StrategyType.BOOST_PAYMENT,
        requiredMonthlyExtra: 380,
        paymentChange: 380,
        projectedMonths: 26,
        projectedInterestSaved: 2760,
        projectedTimeReduction: 19,
        feasibility: Feasibility.FEASIBLE,
        isRecommended: true,
        isActive: false,
      },
      {
        id: 'seed-strategy-3',
        userId: user.id,
        label: 'Option C',
        title: 'Combined Approach',
        description: 'Cut spending by $160 and boost payments by $220 simultaneously.',
        type: StrategyType.COMBINED,
        requiredMonthlyExtra: 380,
        spendingChange: -160,
        paymentChange: 220,
        projectedMonths: 26,
        projectedInterestSaved: 2760,
        projectedTimeReduction: 19,
        feasibility: Feasibility.FEASIBLE,
        isRecommended: false,
        isActive: false,
      },
    ],
  });

  // Create initial insight
  await prisma.insight.create({
    data: {
      userId: user.id,
      source: InsightSource.RULE_BASED,
      priority: InsightPriority.HIGH,
      category: 'Debt',
      action: 'Increase monthly debt payment to $600',
      reason: 'You have $1,400 surplus each month but only paying $220 toward $8,400 at 19% APR.',
      outcome: 'Pay off 19 months sooner and save $2,760 in interest.',
      pageContext: 'dashboard',
    },
  });

  // Create a snapshot
  await prisma.snapshot.create({
    data: {
      userId: user.id,
      monthlyIncome: 5200,
      monthlyExpenses: 3800,
      monthlySurplus: 1200,
      currentSavings: 1200,
      debtBalance: 8400,
      debtPayment: 220,
      monthlyInvestment: 150,
      savingsRate: 0.23,
      debtToIncome: 0.04,
      goalTimelineMonths: 48,
      debtPayoffMonths: 45,
      totalInterestCost: 3420,
      gapMonths: -24,
      healthStatus: 'attention',
    },
  });

  console.log('Seed complete. Demo user: demo@futureyou.app / demo123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
