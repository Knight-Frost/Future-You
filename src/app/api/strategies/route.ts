import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const strategySchema = z.object({
  label: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['REDUCE_SPENDING', 'BOOST_PAYMENT', 'COMBINED', 'INCOME_GROWTH', 'REFINANCE']),
  requiredMonthlyExtra: z.number(),
  paymentChange: z.number().default(0),
  spendingChange: z.number().default(0),
  projectedMonths: z.number().optional(),
  projectedInterestSaved: z.number().optional(),
  projectedTimeReduction: z.number().optional(),
  feasibility: z.enum(['FEASIBLE', 'AGGRESSIVE', 'INFEASIBLE']).default('FEASIBLE'),
  isRecommended: z.boolean().default(false),
  isActive: z.boolean().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const strategies = await prisma.strategy.findMany({
      where: { userId: session.user.id },
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json({ data: strategies });
  } catch (error) {
    logger.error('api/strategies', 'GET failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = strategySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // If activating, deactivate all existing
    if (parsed.data.isActive) {
      await prisma.strategy.updateMany({
        where: { userId: session.user.id, isActive: true },
        data: { isActive: false },
      });
    }

    const strategy = await prisma.strategy.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
        activatedAt: parsed.data.isActive ? new Date() : undefined,
      },
    });

    return NextResponse.json({ data: strategy }, { status: 201 });
  } catch (error) {
    logger.error('api/strategies', 'POST failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
