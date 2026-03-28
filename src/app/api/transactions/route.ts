import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// GET /api/transactions — fetch paginated transactions
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const category = searchParams.get('category');
  const lowConfidence = searchParams.get('lowConfidence') === 'true';
  const batchId = searchParams.get('batchId');
  const months = parseInt(searchParams.get('months') ?? '3');

  // When filtering by a specific batch, skip the date cutoff so all rows in
  // that batch are visible regardless of age.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const where = {
    userId: session.user.id,
    isDuplicate: false,
    ...(batchId ? { importBatchId: batchId } : { date: { gte: cutoff } }),
    ...(category ? { OR: [{ category: category as never }, { userCategory: category as never }] } : {}),
    ...(lowConfidence ? { confidence: { lt: 60 }, userCategory: null } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    data: transactions,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

const transactionCreateSchema = z.object({
  date: z.string().min(1),
  rawDescription: z.string().min(1).max(500),
  normalizedName: z.string().max(500).optional(),
  amount: z.number().finite().positive(),
  isDebit: z.boolean().default(true),
  category: z.string().min(1),
  confidence: z.number().int().min(0).max(100).default(50),
  explanation: z.string().max(500).default(''),
  classifiedBy: z.string().max(50).default('FALLBACK'),
  dedupeHash: z.string().min(1),
  importSource: z.string().max(50).default('manual'),
  importBatchId: z.string().max(100).optional(),
});

// POST /api/transactions — create a single transaction
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = transactionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, rawDescription, normalizedName, amount, isDebit, category, confidence, explanation, classifiedBy, dedupeHash, importSource, importBatchId } = parsed.data;

    // Deduplication check
    const existing = await prisma.transaction.findUnique({
      where: { userId_dedupeHash: { userId: session.user.id, dedupeHash } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Duplicate transaction', isDuplicate: true, existing }, { status: 409 });
    }

    const tx = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        rawDescription,
        normalizedName: normalizedName ?? rawDescription,
        amount,
        isDebit,
        category: category as never,
        confidence,
        explanation,
        classifiedBy: classifiedBy as never,
        dedupeHash,
        importSource,
        importBatchId,
      },
    });

    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (error) {
    logger.error('api/transactions', 'POST failed', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
