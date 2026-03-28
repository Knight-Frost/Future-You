import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCSVToTransactions } from '@/engine/expense/pipeline';

// POST /api/transactions/import — full pipeline CSV import
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { csvText?: unknown; importSource?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { csvText, importSource } = body;
  const importSourceStr = typeof importSource === 'string' ? importSource : 'csv';

  if (!csvText || typeof csvText !== 'string') {
    return NextResponse.json({ error: 'csvText is required' }, { status: 400 });
  }

  try {
  // Fetch user's existing rules for classification
  const userRules = await prisma.expenseRule.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: { priority: 'asc' },
  });

  // Fetch existing dedupe hashes to prevent re-imports
  const existingHashRows = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    select: { dedupeHash: true },
  });
  const existingHashes = new Set(existingHashRows.map((r) => r.dedupeHash));

  // Run through the full intelligence pipeline
  const parseResult = parseCSVToTransactions(
    csvText,
    userRules.map((r) => ({
      pattern: r.pattern,
      patternType: r.patternType as 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'EXACT' | 'REGEX',
      category: r.category as never,
      priority: r.priority,
    })),
    existingHashes,
    importSourceStr,
  );

  if (parseResult.errors.length > 0 && parseResult.transactions.length === 0) {
    return NextResponse.json({
      error: 'Could not parse CSV',
      details: parseResult.errors,
    }, { status: 422 });
  }

  // Batch insert processed transactions
  const importBatchId = `batch_${Date.now()}_${session.user.id.slice(-6)}`;
  const created: string[] = [];

  for (const tx of parseResult.transactions) {
    try {
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          date: tx.date,
          rawDescription: tx.rawDescription,
          normalizedName: tx.normalizedName,
          amount: tx.amount,
          isDebit: tx.isDebit,
          category: tx.category as never,
          subcategory: tx.subcategory,
          confidence: tx.confidence,
          explanation: tx.explanation,
          classifiedBy: tx.classifiedBy as never,
          dedupeHash: tx.dedupeHash,
          importSource: tx.importSource,
          importBatchId,
        },
      });
      created.push(tx.dedupeHash);
    } catch {
      // Skip individual failures (likely duplicate constraint)
    }
  }

  // Auto-update the FinancialProfile expense breakdown from imported data
  if (created.length > 0) {
    await updateProfileFromTransactions(session.user.id);
  }

  return NextResponse.json({
    success: true,
    imported: created.length,
    skipped: parseResult.skippedCount,
    duplicates: parseResult.duplicateHashes.length,
    lowConfidence: parseResult.lowConfidenceCount,
    errors: parseResult.errors,
    importBatchId,
  });
  } catch (error) {
    console.error('[transactions/import POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ─── Auto-update FinancialProfile expense breakdown ───────────────────────────
// After import, recalculate the monthly expense breakdown from real data

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

  if (txs.length === 0) return;

  // Calculate monthly averages by category
  const monthSet = new Set<string>();
  const categorySums: Record<string, number> = {};

  for (const tx of txs) {
    const d = new Date(tx.date);
    monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    const cat = tx.userCategory ?? tx.category;
    categorySums[cat] = (categorySums[cat] ?? 0) + tx.amount;
  }

  const numMonths = Math.max(1, monthSet.size);

  const housingExpense    = (categorySums['HOUSING'] ?? 0)             / numMonths;
  const transportExpense  = (categorySums['TRANSPORTATION'] ?? 0)      / numMonths;
  const foodExpense       = (categorySums['FOOD'] ?? 0)                / numMonths;
  const utilitiesExpense  = (categorySums['UTILITIES'] ?? 0)           / numMonths;
  const entertainmentExpense = (
    (categorySums['SUBSCRIPTIONS'] ?? 0) +
    (categorySums['MISCELLANEOUS'] ?? 0)
  ) / numMonths;

  await prisma.financialProfile.updateMany({
    where: { userId },
    data: {
      housingExpense:     Math.round(housingExpense),
      transportExpense:   Math.round(transportExpense),
      foodExpense:        Math.round(foodExpense),
      utilitiesExpense:   Math.round(utilitiesExpense),
      entertainmentExpense: Math.round(entertainmentExpense),
    },
  });
}
