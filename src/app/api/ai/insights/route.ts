import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { buildAIPrompt } from '@/engine/insights';
import type { AIInsightRequest } from '@/engine/insights';

// Insight key is server-side only — never exposed to the browser
const INSIGHTS_API_KEY = process.env.INSIGHTS_API_KEY;
const INSIGHTS_API_ENDPOINT = process.env.INSIGHTS_API_ENDPOINT ?? '';
const INSIGHTS_MODEL = process.env.INSIGHTS_MODEL ?? '';
const INSIGHTS_VERSION_HEADER = process.env.INSIGHTS_VERSION_HEADER ?? '';
const INSIGHTS_API_VERSION = process.env.INSIGHTS_API_VERSION ?? '';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: AIInsightRequest = await req.json();
    const prompt = buildAIPrompt(body);

    if (!INSIGHTS_API_KEY) {
      return NextResponse.json({ data: { insight: null } }, { status: 200 });
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': INSIGHTS_API_KEY,
    };
    if (INSIGHTS_VERSION_HEADER && INSIGHTS_API_VERSION) {
      headers[INSIGHTS_VERSION_HEADER] = INSIGHTS_API_VERSION;
    }

    const response = await fetch(INSIGHTS_API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: INSIGHTS_MODEL,
        max_tokens: 200,
        system:
          'You are a calm, direct financial advisor. Give one specific actionable insight in 2-3 sentences. Be concrete with numbers. No fluff, no platitudes.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Insights service returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0];
    const text = content?.type === 'text' ? (content.text as string) : '';

    return NextResponse.json({ data: { insight: text } });
  } catch (error) {
    logger.error('api/insights', 'Insight call failed', error);
    return NextResponse.json(
      { error: 'Insight unavailable', data: { insight: null } },
      { status: 200 } // Graceful fallback — don't fail the UI
    );
  }
}
