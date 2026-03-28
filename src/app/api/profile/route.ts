import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calculateProjection, assessFinancialHealth } from '@/engine/calculator';

const profileSchema = z.object({
  monthlyIncome: z.number().min(0).max(1_000_000),
  monthlyExpenses: z.number().min(0).max(1_000_000),
  currentSavings: z.number().min(0),
  emergencyFundTarget: z.number().min(0).optional(),
  monthlyInvestment: z.number().min(0).default(0),
  investmentBalance: z.number().min(0).default(0),
  debtBalance: z.number().min(0).default(0),
  debtMonthlyPayment: z.number().min(0).default(0),
  debtAnnualRate: z.number().min(0).max(1).default(0.18),
  debtType: z.string().optional(),
  debtName: z.string().optional(),
  investmentReturnRate: z.number().min(0).max(0.5).default(0.07),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await prisma.financialProfile.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('[profile GET]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const profile = await prisma.financialProfile.upsert({
      where: { userId: session.user.id },
      update: parsed.data,
      create: { ...parsed.data, userId: session.user.id },
    });

    // Take a snapshot whenever profile is updated, using the full calculation engine
    const snapshotInputs = {
      monthlyIncome: parsed.data.monthlyIncome,
      monthlyExpenses: parsed.data.monthlyExpenses,
      currentSavings: parsed.data.currentSavings,
      debtBalance: parsed.data.debtBalance,
      debtMonthlyPayment: parsed.data.debtMonthlyPayment,
      debtAnnualRate: parsed.data.debtAnnualRate,
      monthlyInvestment: parsed.data.monthlyInvestment,
      investmentBalance: parsed.data.investmentBalance ?? 0,
      goalName: '',
      goalAmount: 0,
    };
    const snapshotProjection = calculateProjection(snapshotInputs);
    const healthStatus = assessFinancialHealth(snapshotProjection, snapshotInputs);

    await prisma.snapshot.create({
      data: {
        userId: session.user.id,
        monthlyIncome: snapshotInputs.monthlyIncome,
        monthlyExpenses: snapshotInputs.monthlyExpenses,
        monthlySurplus: snapshotProjection.monthlyRemaining,
        currentSavings: snapshotInputs.currentSavings,
        debtBalance: snapshotInputs.debtBalance,
        debtPayment: snapshotInputs.debtMonthlyPayment,
        monthlyInvestment: snapshotInputs.monthlyInvestment,
        savingsRate: snapshotProjection.savingsRate,
        debtToIncome: snapshotProjection.debtToIncomeRatio,
        debtPayoffMonths: isFinite(snapshotProjection.debtPayoffMonths) ? snapshotProjection.debtPayoffMonths : null,
        totalInterestCost: isFinite(snapshotProjection.totalInterest) ? snapshotProjection.totalInterest : null,
        healthStatus,
      },
    });

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('[profile PUT]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
