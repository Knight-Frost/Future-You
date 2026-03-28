import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// PATCH /api/transactions/[id] — user corrects a category (triggers learning)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { userCategory, createRule } = body;

    if (!userCategory) {
      return NextResponse.json({ error: 'userCategory is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update the transaction with user correction
    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        userCategory,
        userCorrectedAt: new Date(),
      },
    });

    // Learning: if createRule=true, persist a user-defined rule so future
    // transactions with the same normalized name are automatically categorized.
    // We use findFirst + conditional update/create because ExpenseRule has no
    // @@unique on (userId, pattern) — a plain upsert would need a unique
    // constraint in the where clause to work correctly.
    if (createRule && existing.normalizedName) {
      const pattern = existing.normalizedName.toLowerCase();

      const existingRule = await prisma.expenseRule.findFirst({
        where: { userId: session.user.id, pattern },
      });

      if (existingRule) {
        await prisma.expenseRule.update({
          where: { id: existingRule.id },
          data: {
            category: userCategory,
            hitCount: { increment: 1 },
            lastHitAt: new Date(),
          },
        });
      } else {
        await prisma.expenseRule.create({
          data: {
            userId: session.user.id,
            pattern,
            patternType: 'CONTAINS',
            category: userCategory,
            priority: 10,  // User rules get highest priority (low number = checked first)
            isUserDefined: true,
            description: `Auto-created when you corrected "${existing.normalizedName}" → ${userCategory}`,
            hitCount: 1,
            lastHitAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('api/transactions/[id]', 'PATCH failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api/transactions/[id]', 'DELETE failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
