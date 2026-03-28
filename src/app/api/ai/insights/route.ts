import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { buildAIPrompt } from '@/engine/insights';
import type { AIInsightRequest } from '@/engine/insights';

// AI key is server-side only — never exposed to the browser
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: AIInsightRequest = await req.json();
    const prompt = buildAIPrompt(body);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:
        'You are a calm, direct financial advisor. Give one specific actionable insight in 2-3 sentences. Be concrete with numbers. No fluff, no platitudes.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';

    return NextResponse.json({ data: { insight: text } });
  } catch (error) {
    console.error('[ai/insights] error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'AI insight unavailable', data: { insight: null } },
      { status: 200 } // Graceful fallback — don't fail the UI
    );
  }
}
