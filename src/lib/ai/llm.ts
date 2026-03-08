import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 256;
const DAILY_LIMIT = 3;
const TIMEOUT_MS = 20_000;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Check if a user has remaining LLM calls for today.
 * Returns true if under the daily limit.
 */
export async function checkDailyLimit(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await db.llmUsage.findFirst({
    where: { userId, date: today },
  });

  return !usage || usage.callCount < DAILY_LIMIT;
}

/**
 * Increment the daily LLM call counter for a user.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.llmUsage.upsert({
    where: { userId_date: { userId, date: today } },
    update: { callCount: { increment: 1 } },
    create: { userId, date: today, callCount: 1 },
  });
}

/**
 * Generate a recommendation reason using Claude Haiku.
 * Returns null if the API call fails (caller should use fallback).
 */
export async function generateRecommendationReason(
  passageType: string,
  wrongCount: number,
  questionContent: string,
): Promise<string | null> {
  const client = getClient();

  const prompt = `학생이 "${passageType}" 유형에서 ${wrongCount}번 오답을 낸 학생에게 다음 문제를 추천하는 이유를 한 문장(50자 이내)으로 작성해 주세요.
문제: ${questionContent.slice(0, 100)}
이유:`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal },
    );

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
    if (!text) return null;
    return text.slice(0, 50);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
