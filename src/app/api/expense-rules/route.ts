import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/expense-rules — list user's rules + system rules
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rules = await prisma.expenseRule.findMany({
      where: {
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error('[expense-rules GET]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/expense-rules — create a new user rule
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { pattern, patternType = 'CONTAINS', category, description } = body;

    if (!pattern || !category) {
      return NextResponse.json({ error: 'pattern and category are required' }, { status: 400 });
    }

    const validCategories = ['HOUSING','FOOD','TRANSPORTATION','UTILITIES','SUBSCRIPTIONS','HEALTHCARE','DEBT_PAYMENTS','SAVINGS_INVESTMENTS','MISCELLANEOUS'];
    const validPatternTypes = ['CONTAINS','STARTS_WITH','ENDS_WITH','EXACT','REGEX'];

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, { status: 400 });
    }

    if (!validPatternTypes.includes(patternType)) {
      return NextResponse.json({ error: `Invalid patternType. Must be one of: ${validPatternTypes.join(', ')}` }, { status: 400 });
    }

    const rule = await prisma.expenseRule.create({
      data: {
        userId: session.user.id,
        pattern: pattern.toLowerCase(),
        patternType,
        category,
        priority: 10,  // User rules always get priority
        isUserDefined: true,
        description: description ?? null,
      },
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    console.error('[expense-rules POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/expense-rules?id=xxx — delete a user rule
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const existing = await prisma.expenseRule.findFirst({
      where: { id, userId: session.user.id, isUserDefined: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found or cannot be deleted (system rules are read-only)' }, { status: 404 });
    }

    await prisma.expenseRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[expense-rules DELETE]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
