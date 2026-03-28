import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  currency: z.string().optional(),
  locale: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('[settings GET]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: parsed.data,
      create: { ...parsed.data, userId: session.user.id },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('[settings PUT]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
