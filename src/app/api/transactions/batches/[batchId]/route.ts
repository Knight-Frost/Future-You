import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/transactions/batches/[batchId]
// Removes all transactions in the batch, then recalculates the financial profile.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { batchId } = params;

  try {
    // Verify the batch belongs to this user before deleting
    const count = await prisma.transaction.count({
      where: { importBatchId: batchId, userId: session.user.id },
    });

    if (count === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    await prisma.transaction.deleteMany({
      where: { importBatchId: batchId, userId: session.user.id },
    });

    // Recalculate the financial profile from remaining transactions
    await updateProfileFromTransactions(session.user.id);

    return NextResponse.json({ success: true, deleted: count });
  } catch (error) {
    console.error('[transactions/batches DELETE]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function updateProfileFromTransactions(userId: string) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      isDebit: true,
      isDuplicate: false,
      date: { gte: threeMonthsAgo },
    },
    select: { category: true, userCategory: true, amount: true, date: true },
  });

  if (txs.length === 0) {
    // No transactions left — zero out the expense breakdown so the profile
    // doesn't keep stale values from a deleted import.
    await prisma.financialProfile.updateMany({
      where: { userId },
      data: {
        monthlyExpenses:     0,
        housingExpense:      0,
        transportExpense:    0,
        foodExpense:         0,
        utilitiesExpense:    0,
        entertainmentExpense: 0,
      },
    });
    return;
  }

  const monthSet = new Set<string>();
  const categorySums: Record<string, number> = {};

  for (const tx of txs) {
    const d = new Date(tx.date);
    monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    const cat = tx.userCategory ?? tx.category;
    categorySums[cat] = (categorySums[cat] ?? 0) + tx.amount;
  }

  const numMonths = Math.max(1, monthSet.size);
  const totalMonthlyExpenses = Object.values(categorySums).reduce((a, b) => a + b, 0) / numMonths;

  await prisma.financialProfile.updateMany({
    where: { userId },
    data: {
      monthlyExpenses:      Math.round(totalMonthlyExpenses),
      housingExpense:       Math.round((categorySums['HOUSING']        ?? 0) / numMonths),
      transportExpense:     Math.round((categorySums['TRANSPORTATION'] ?? 0) / numMonths),
      foodExpense:          Math.round((categorySums['FOOD']           ?? 0) / numMonths),
      utilitiesExpense:     Math.round((categorySums['UTILITIES']      ?? 0) / numMonths),
      entertainmentExpense: Math.round(((categorySums['SUBSCRIPTIONS'] ?? 0) + (categorySums['MISCELLANEOUS'] ?? 0)) / numMonths),
    },
  });
}
