import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { aggregateByCategory, CATEGORY_META } from '@/engine/expense/classification';

// GET /api/transactions/analytics — aggregated spending data for charts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get('months') ?? '3');

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  let txs: Array<{ category: string | null; userCategory: string | null; amount: number; confidence: number; date: Date }>;
  try {
    txs = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        isDebit: true,
        isDuplicate: false,
        date: { gte: cutoff },
      },
      select: {
        category: true,
        userCategory: true,
        amount: true,
        confidence: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });
  } catch (error) {
    logger.error('api/transactions/analytics', 'GET failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  if (txs.length === 0) {
    return NextResponse.json({ data: null, hasData: false });
  }

  // Category totals
  const categoryBreakdown = aggregateByCategory(
    txs.map((tx) => ({
      category: tx.category as never,
      amount: tx.amount,
      confidence: tx.confidence,
      userCategory: tx.userCategory as never,
    }))
  );

  // Monthly cashflow trend (group by month)
  const monthlyMap = new Map<string, number>();
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + tx.amount);
  }

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: formatMonthLabel(month),
      totalExpenses: Math.round(total),
    }));

  // Monthly average
  const totalMonths = Math.max(1, monthlyMap.size);
  const monthlyAverage = Math.round(
    Array.from(monthlyMap.values()).reduce((s, v) => s + v, 0) / totalMonths
  );

  // Low confidence count
  const lowConfidenceCount = txs.filter((tx) => tx.confidence < 60 && !tx.userCategory).length;

  return NextResponse.json({
    hasData: true,
    data: {
      categoryBreakdown,
      monthlyTrend,
      monthlyAverage,
      totalTransactions: txs.length,
      lowConfidenceCount,
      monthsAnalyzed: totalMonths,
    },
  });
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
