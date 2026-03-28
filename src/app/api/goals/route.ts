import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const goalSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum([
    'EMERGENCY_FUND', 'DEBT_PAYOFF', 'HOME_PURCHASE',
    'INVESTMENT', 'TRAVEL', 'EDUCATION', 'RETIREMENT', 'CUSTOM',
  ]),
  targetAmount: z.number().min(1),
  currentAmount: z.number().min(0).default(0),
  targetMonths: z.number().int().positive().optional(),
  priority: z.number().int().min(1).max(10).default(1),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id, status: { not: 'ABANDONED' } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ data: goals });
  } catch (error) {
    console.error('[goals GET]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: { ...parsed.data, userId: session.user.id },
    });

    return NextResponse.json({ data: goal }, { status: 201 });
  } catch (error) {
    console.error('[goals POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
