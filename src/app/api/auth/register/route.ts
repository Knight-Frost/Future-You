import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Password rules must stay in sync with the UI checklist in RegisterPage
const passwordSchema = z
  .string()
  .min(8,  'Password must be at least 8 characters')
  .max(64, 'Password must be 64 characters or fewer')
  .refine((pw) => /[A-Z]/.test(pw), 'Password must contain at least one uppercase letter')
  .refine((pw) => /[a-z]/.test(pw), 'Password must contain at least one lowercase letter')
  .refine((pw) => /[0-9]/.test(pw), 'Password must contain at least one number')
  .refine((pw) => /[@#$%!?]/.test(pw), 'Password must contain at least one special character (@, #, $, %, !, ?)');

const registerSchema = z.object({
  name:     z.string().min(1).max(60),
  email:    z.string().email(),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        settings: { create: {} },
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.error('api/auth/register', 'Unhandled registration error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
