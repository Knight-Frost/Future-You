import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// A single net-worth projection data point: one per year, up to 50 years
const projectionPointSchema = z.object({
  year:         z.number().int().min(0).max(50),
  Conservative: z.number().finite().optional(),
  Moderate:     z.number().finite().optional(),
  Optimistic:   z.number().finite().optional(),
  netWorth:     z.number().finite().optional(),
});

const scenarioSchema = z.object({
  name:               z.string().min(1).max(100),
  description:        z.string().max(500).optional(),
  spendingReduction:  z.number().min(0).max(1_000_000).default(0),
  extraDebtPayment:   z.number().min(0).max(1_000_000).default(0),
  extraSavings:       z.number().min(0).max(1_000_000).default(0),
  extraInvestment:    z.number().min(0).max(1_000_000).default(0),
  resultGoalMonths:   z.number().min(0).optional(),
  resultDebtMonths:   z.number().min(0).optional(),
  resultInterestSaved: z.number().optional(),
  resultMonthlyGain:  z.number().optional(),
  // Projection chart data — typed array of data points, max 51 entries (year 0–50)
  projectionData:     z.array(projectionPointSchema).max(51).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const scenarios = await prisma.scenario.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: scenarios });
  } catch (error) {
    logger.error('api/scenarios', 'GET failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = scenarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { projectionData, ...rest } = parsed.data;
    const scenario = await prisma.scenario.create({
      data: {
        ...rest,
        userId: session.user.id,
        ...(projectionData !== undefined ? { projectionData } : {}),
      },
    });

    return NextResponse.json({ data: scenario }, { status: 201 });
  } catch (error) {
    logger.error('api/scenarios', 'POST failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
