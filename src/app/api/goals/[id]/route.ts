import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  title:         z.string().min(1).max(100).optional(),
  targetAmount:  z.number().min(1).optional(),
  currentAmount: z.number().min(0).optional(),
  targetMonths:  z.number().int().positive().nullable().optional(),
  status:        z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED']).optional(),
  notes:         z.string().max(1000).optional(),
});

// ── Shared ownership check ────────────────────────────────────────────────────
async function getOwnedGoal(goalId: string, userId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId } });
}

// ── PATCH — update progress, edit fields, or change status ───────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goal = await getOwnedGoal(params.id, session.user.id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const updates = parsed.data;

    // Auto-complete if currentAmount reaches targetAmount
    const nextAmount = updates.currentAmount ?? goal.currentAmount;
    if (nextAmount >= goal.targetAmount && !updates.status) {
      updates.status = 'COMPLETED';
    }

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: updates,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[goals PATCH]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── DELETE — soft-delete by setting status to ABANDONED ───────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const goal = await getOwnedGoal(params.id, session.user.id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    await prisma.goal.update({
      where: { id: goal.id },
      data:  { status: 'ABANDONED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[goals DELETE]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
