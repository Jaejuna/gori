import { db } from '@/lib/db';
import { findTopSimilar } from '@/lib/ai/similarity';
import { checkDailyLimit, generateRecommendationReason, incrementUsage } from '@/lib/ai/llm';

const TOP_SIMILAR = 10;
const RECOMMEND_COUNT = 3;

interface PassageTypeWeight {
  passageTypeId: string;
  passageTypeLabel: string;
  wrongCount: number;
  weight: number;
}

interface RecommendationResult {
  questionId: string;
  score: number;
  reason: string;
  source: 'AI' | 'RULE';
}

/**
 * Stage 1: Analyze wrong answer patterns and compute weights per passage type.
 */
export function computePassageTypeWeights(
  answers: Array<{ isCorrect: boolean; question: { passageTypeId: string; passageType: { label: string } } }>,
): PassageTypeWeight[] {
  const map = new Map<string, { label: string; wrong: number; total: number }>();

  for (const a of answers) {
    const id = a.question.passageTypeId;
    const label = a.question.passageType.label;
    const entry = map.get(id) ?? { label, wrong: 0, total: 0 };
    entry.total++;
    if (!a.isCorrect) entry.wrong++;
    map.set(id, entry);
  }

  const weights: PassageTypeWeight[] = [];
  for (const [id, { label, wrong, total }] of map) {
    weights.push({
      passageTypeId: id,
      passageTypeLabel: label,
      wrongCount: wrong,
      weight: total > 0 ? wrong / total : 0,
    });
  }

  return weights.sort((a, b) => b.weight - a.weight);
}

/**
 * Full 3-stage recommendation pipeline.
 * Stage 1: Rule-based weak passage type analysis
 * Stage 2: Embedding similarity search
 * Stage 3: LLM reason generation (with fallback)
 */
export async function generateRecommendations(userId: string): Promise<RecommendationResult[]> {
  // Fetch student's recent answers (last 50)
  const answers = await db.answer.findMany({
    where: { session: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      isCorrect: true,
      questionId: true,
      question: {
        select: {
          passageTypeId: true,
          passageType: { select: { label: true } },
        },
      },
    },
  });

  // Already-answered question IDs
  const answeredIds = new Set(answers.map((a) => a.questionId));

  // Already-recommended question IDs
  const existingRecs = await db.recommendation.findMany({
    where: { userId },
    select: { questionId: true },
  });
  const recommendedIds = new Set(existingRecs.map((r) => r.questionId));
  const excludeIds = new Set([...answeredIds, ...recommendedIds]);

  // Stage 1: compute weak passage types
  const weights = computePassageTypeWeights(answers);
  const weakTypeIds = weights.slice(0, 3).map((w) => w.passageTypeId);

  // Fetch candidate questions (not yet answered, prefer weak types)
  const candidates = await db.$queryRaw<
    Array<{ id: string; content: string; passageTypeId: string; embedding: number[] | null }>
  >`
    SELECT id, content, "passageTypeId", embedding::float4[] AS embedding
    FROM "Question"
    WHERE embedding IS NOT NULL
    ORDER BY
      CASE WHEN "passageTypeId" = ANY(${weakTypeIds}::text[]) THEN 0 ELSE 1 END,
      RANDOM()
    LIMIT 50
  `;

  // Filter excluded IDs
  const filtered = candidates.filter((c) => !excludeIds.has(c.id));

  if (filtered.length === 0) {
    return [];
  }

  let chosen: Array<{ questionId: string; score: number; passageTypeId: string; content: string }>;

  // Stage 2: embedding similarity (if we have wrong questions with embeddings)
  const wrongAnswers = answers.filter((a) => !a.isCorrect);
  if (wrongAnswers.length > 0) {
    const wrongQIds = wrongAnswers.slice(0, 5).map((a) => a.questionId);
    const wrongQuestions = await db.$queryRaw<Array<{ id: string; embedding: number[] | null }>>`
      SELECT id, embedding::float4[] AS embedding
      FROM "Question"
      WHERE id = ANY(${wrongQIds}::text[]) AND embedding IS NOT NULL
      LIMIT 5
    `;

    if (wrongQuestions.length > 0 && wrongQuestions[0].embedding) {
      // Use first wrong question's embedding as query vector
      const queryVector = wrongQuestions[0].embedding;
      const candidatesWithEmbedding = filtered
        .filter((c) => c.embedding !== null)
        .map((c) => ({ id: c.id, embedding: c.embedding as number[], content: c.content, passageTypeId: c.passageTypeId }));

      const topSimilar = findTopSimilar(queryVector, candidatesWithEmbedding, TOP_SIMILAR);
      chosen = topSimilar.slice(0, RECOMMEND_COUNT).map((s) => ({
        questionId: s.item.id,
        score: s.score,
        passageTypeId: s.item.passageTypeId,
        content: s.item.content,
      }));
    } else {
      chosen = filtered.slice(0, RECOMMEND_COUNT).map((c) => ({
        questionId: c.id,
        score: 0.5,
        passageTypeId: c.passageTypeId,
        content: c.content,
      }));
    }
  } else {
    // No wrong answers — pick from weak types or random
    chosen = filtered.slice(0, RECOMMEND_COUNT).map((c) => ({
      questionId: c.id,
      score: 0.5,
      passageTypeId: c.passageTypeId,
      content: c.content,
    }));
  }

  // Stage 3: LLM reason generation (with rule-based fallback)
  const useLlm = process.env.NEXT_PUBLIC_USE_LLM !== 'false';
  const hasLimit = useLlm ? await checkDailyLimit(userId) : false;

  const results: RecommendationResult[] = [];

  for (const item of chosen) {
    const weakType = weights.find((w) => w.passageTypeId === item.passageTypeId);
    const passageTypeLabel = weakType?.passageTypeLabel ?? '해당 유형';
    const wrongCount = weakType?.wrongCount ?? 0;

    let reason: string | null = null;
    let source: 'AI' | 'RULE' = 'RULE';

    if (useLlm && hasLimit) {
      reason = await generateRecommendationReason(passageTypeLabel, wrongCount, item.content);
      if (reason) {
        source = 'AI';
        await incrementUsage(userId);
      }
    }

    if (!reason) {
      reason = wrongCount > 0
        ? `${passageTypeLabel} 유형에서 ${wrongCount}번 틀렸어요. 유사한 문제로 보완해보세요.`
        : `${passageTypeLabel} 유형 실력 향상을 위해 추천해요.`;
      reason = reason.slice(0, 50);
    }

    results.push({ questionId: item.questionId, score: item.score, reason, source });
  }

  return results;
}
