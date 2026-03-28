import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const onboardingSchema = z.object({
  step: z.number().int().min(0).max(5),
  // Step 1: Income
  monthlyIncome: z.number().min(0).optional(),
  monthlyExpenses: z.number().min(0).optional(),
  // Step 2: Savings & Debt
  currentSavings: z.number().min(0).optional(),
  debtBalance: z.number().min(0).optional(),
  debtMonthlyPayment: z.number().min(0).optional(),
  debtAnnualRate: z.number().min(0).max(1).optional(),
  // Step 3: Goal
  goalTitle: z.string().min(1).max(100).optional(),
  goalType: z.string().optional(),
  goalAmount: z.number().min(0).optional(),
  goalTargetMonths: z.number().int().positive().optional(),
  // Step 4: Investments
  monthlyInvestment: z.number().min(0).optional(),
  // Complete
  complete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { step, complete, goalTitle, goalType, goalAmount, goalTargetMonths, ...profileData } = parsed.data;

    // Always update onboarding step
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingStep: step,
        onboardingDone: complete ?? false,
      },
    });

    // Upsert financial profile with whatever data we have
    const profileFields: Record<string, unknown> = {};
    if (profileData.monthlyIncome !== undefined) profileFields.monthlyIncome = profileData.monthlyIncome;
    if (profileData.monthlyExpenses !== undefined) profileFields.monthlyExpenses = profileData.monthlyExpenses;
    if (profileData.currentSavings !== undefined) profileFields.currentSavings = profileData.currentSavings;
    if (profileData.debtBalance !== undefined) profileFields.debtBalance = profileData.debtBalance;
    if (profileData.debtMonthlyPayment !== undefined) profileFields.debtMonthlyPayment = profileData.debtMonthlyPayment;
    if (profileData.debtAnnualRate !== undefined) profileFields.debtAnnualRate = profileData.debtAnnualRate;
    if (profileData.monthlyInvestment !== undefined) profileFields.monthlyInvestment = profileData.monthlyInvestment;

    if (Object.keys(profileFields).length > 0) {
      await prisma.financialProfile.upsert({
        where: { userId: session.user.id },
        update: profileFields,
        create: { userId: session.user.id, ...profileFields },
      });
    }

    // Create goal on step 3
    if (goalTitle && goalAmount && goalType) {
      const validTypes = [
        'EMERGENCY_FUND', 'DEBT_PAYOFF', 'HOME_PURCHASE',
        'INVESTMENT', 'TRAVEL', 'EDUCATION', 'RETIREMENT', 'CUSTOM',
      ] as const;
      const type = validTypes.includes(goalType as typeof validTypes[number])
        ? (goalType as typeof validTypes[number])
        : 'CUSTOM';

      await prisma.goal.create({
        data: {
          userId: session.user.id,
          title: goalTitle,
          type,
          targetAmount: goalAmount,
          targetMonths: goalTargetMonths,
          priority: 1,
        },
      });
    }

    return NextResponse.json({ data: { step, complete } });
  } catch (error) {
    console.error('[onboarding POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
