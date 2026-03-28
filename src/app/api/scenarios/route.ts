import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const scenarioSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  spendingReduction: z.number().min(0).default(0),
  extraDebtPayment: z.number().min(0).default(0),
  extraSavings: z.number().min(0).default(0),
  extraInvestment: z.number().min(0).default(0),
  resultGoalMonths: z.number().optional(),
  resultDebtMonths: z.number().optional(),
  resultInterestSaved: z.number().optional(),
  resultMonthlyGain: z.number().optional(),
  projectionData: z.record(z.unknown()).optional(),
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
    console.error('[scenarios GET]', error);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(projectionData !== undefined ? { projectionData: projectionData as any } : {}),
      },
    });

    return NextResponse.json({ data: scenario }, { status: 201 });
  } catch (error) {
    console.error('[scenarios POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
