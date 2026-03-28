import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/transactions/batches
// Returns all import batches for the user, grouped by importBatchId.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        importBatchId: { not: null },
      },
      select: {
        importBatchId: true,
        amount: true,
        isDebit: true,
        date: true,
        importSource: true,
      },
      orderBy: { date: 'desc' },
    });

    // Group by importBatchId
    const batchMap = new Map<string, {
      batchId: string;
      importedAt: Date;
      transactionCount: number;
      totalSpend: number;
      earliestDate: Date;
      latestDate: Date;
      importSource: string;
    }>();

    for (const row of rows) {
      const batchId = row.importBatchId!;
      const existing = batchMap.get(batchId);

      // Extract timestamp from batchId format: batch_{timestamp}_{userId}
      const tsMatch = batchId.match(/^batch_(\d+)_/);
      const importedAt = tsMatch ? new Date(parseInt(tsMatch[1])) : row.date;

      if (!existing) {
        batchMap.set(batchId, {
          batchId,
          importedAt,
          transactionCount: 1,
          totalSpend: row.isDebit ? row.amount : 0,
          earliestDate: row.date,
          latestDate: row.date,
          importSource: row.importSource ?? 'csv',
        });
      } else {
        existing.transactionCount += 1;
        if (row.isDebit) existing.totalSpend += row.amount;
        if (row.date < existing.earliestDate) existing.earliestDate = row.date;
        if (row.date > existing.latestDate) existing.latestDate = row.date;
      }
    }

    const batches = Array.from(batchMap.values()).sort(
      (a, b) => b.importedAt.getTime() - a.importedAt.getTime()
    );

    return NextResponse.json({ data: batches });
  } catch (error) {
    logger.error('api/transactions/batches', 'GET failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
