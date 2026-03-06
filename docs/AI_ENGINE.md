# AI_ENGINE.md — AI 추천 엔진 상세 명세

---

## 1. 개요

3단계 파이프라인으로 구성된 하이브리드 추천 엔진:

| 단계 | 방식 | 모델/비용 | 필수 여부 |
|------|------|-----------|-----------|
| Stage 1 | Rule-based 오답 패턴 분석 | 코드 로직 / $0 | 필수 |
| Stage 2 | 임베딩 유사도 검색 | HuggingFace 무료 API | 선택 (fallback 존재) |
| Stage 3 | LLM 추천 이유 생성 | Claude Haiku / ~$0.001 | 선택 (rule-based fallback) |

---

## 2. Stage 1: 오답 패턴 분석

### 2.1 가중치 계산

```typescript
// lib/ai/recommendation.ts

interface WeightedPassageType {
  passageTypeId: string;
  subType: string;
  wrongRate: number;     // 전체 오답률
  recentWrongRate: number; // 최근 7일 오답률
  repeatCount: number;   // 같은 유형에서 반복 오답 횟수
  weightedScore: number; // 최종 가중치 점수
}

async function analyzeWeakPoints(userId: string): Promise<WeightedPassageType[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 전체 오답 조회
  const allAnswers = await db.answer.findMany({
    where: { userId, isCorrect: false },
    include: { question: { include: { passageType: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // 최근 7일 오답
  const recentAnswers = allAnswers.filter(a => a.createdAt >= sevenDaysAgo);

  // 지문 유형별 집계
  const typeMap = new Map<string, {
    total: number; wrong: number; recentWrong: number; ids: string[]
  }>();

  for (const answer of allAnswers) {
    const key = answer.question.passageTypeId;
    const entry = typeMap.get(key) ?? { total: 0, wrong: 0, recentWrong: 0, ids: [] };
    entry.total++;
    entry.wrong++;
    entry.ids.push(answer.questionId);
    typeMap.set(key, entry);
  }

  for (const answer of recentAnswers) {
    const key = answer.question.passageTypeId;
    const entry = typeMap.get(key)!;
    entry.recentWrong++;
  }

  // 가중치 계산
  // Score = wrongRate × 1.0 + recentWrongRate × 1.5 + (repeatCount > 2 ? 2.0 : 1.0)
  return Array.from(typeMap.entries()).map(([id, data]) => ({
    passageTypeId: id,
    subType: allAnswers.find(a => a.question.passageTypeId === id)!.question.passageType.subType,
    wrongRate: data.wrong / data.total,
    recentWrongRate: data.recentWrong / Math.max(data.total, 1),
    repeatCount: data.wrong,
    weightedScore: (data.wrong / data.total) * 1.0
      + (data.recentWrong / Math.max(data.total, 1)) * 1.5
      + (data.wrong > 2 ? 2.0 : 1.0),
  })).sort((a, b) => b.weightedScore - a.weightedScore);
}
```

---

## 3. Stage 2: HuggingFace 임베딩 & 유사도 검색

### 3.1 임베딩 서비스

```typescript
// lib/ai/embeddings.ts
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const MODEL = 'jhgan/ko-sroberta-multitask';
const EMBEDDING_DIM = 768;
const TIMEOUT_MS = 30_000;

export async function getEmbedding(text: string): Promise<number[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await hf.featureExtraction({
      model: MODEL,
      inputs: text,
    });

    // 결과가 2D 배열인 경우 mean pooling
    if (Array.isArray(result[0])) {
      return meanPooling(result as number[][]);
    }
    return result as number[];
  } finally {
    clearTimeout(timeout);
  }
}

function meanPooling(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) result[i] += vec[i];
  }
  return result.map(v => v / vectors.length);
}

// 배치 임베딩 (10개씩 처리)
export async function batchEmbed(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(batch.map(getEmbedding));
    results.push(...embeddings);
    // Rate limiting: 배치 사이 500ms 대기
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return results;
}
```

### 3.2 임베딩 텍스트 구성 전략

```typescript
// 문제 임베딩 시 지문 + 문항을 결합 (최대 512 토큰)
function buildEmbeddingText(question: Question): string {
  const parts = [
    `[${question.passageType.category}/${question.passageType.subType}]`,
    question.passage ? question.passage.slice(0, 300) : '',
    question.content.slice(0, 100),
  ];
  return parts.filter(Boolean).join(' ');
}
```

### 3.3 코사인 유사도 (pgvector)

```typescript
// lib/ai/similarity.ts
export async function findSimilarQuestions(
  targetEmbedding: number[],
  excludeIds: string[],
  passageTypeIds: string[],
  limit = 10
): Promise<string[]> {
  const embeddingStr = `[${targetEmbedding.join(',')}]`;

  const results = await db.$queryRaw<{ id: string; similarity: number }[]>`
    SELECT id, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM "Question"
    WHERE embedding IS NOT NULL
      AND id NOT IN (${excludeIds.length ? Prisma.join(excludeIds) : Prisma.sql`''`})
      AND "passageTypeId" IN (${Prisma.join(passageTypeIds)})
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  return results.map(r => r.id);
}
```

---

## 4. Stage 3: LLM 추천 이유 생성

### 4.1 Claude Haiku 클라이언트

```typescript
// lib/ai/llm.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RecommendationInput {
  studentName: string;
  weakPassageTypes: { subType: string; wrongRate: number }[];
  question: {
    year: number;
    month: number;
    number: number;
    passageType: string;
    difficulty: string;
  };
}

export async function generateRecommendationReason(
  input: RecommendationInput
): Promise<string> {
  const prompt = `다음 학생의 오답 패턴을 분석하고, 추천 문제의 이유를 1문장(50자 이내)으로 작성해주세요.

학생 취약 영역:
${input.weakPassageTypes.map(t => `- ${t.subType}: 오답률 ${Math.round(t.wrongRate * 100)}%`).join('\n')}

추천 문제: ${input.question.year}학년도 ${input.question.month}월 수능 ${input.question.number}번 (${input.question.passageType}, ${input.question.difficulty})

응답 형식: 추천 이유 1문장만 출력 (다른 설명 없이)
예시: "${input.question.passageType} 영역 반복 오답 패턴 극복을 위한 유사 구조 문제"`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  // 50자 초과 시 자름
  return text.trim().slice(0, 50);
}
```

### 4.2 일일 LLM 호출 제한 (비용 제어)

```typescript
// lib/ai/llm.ts
const DAILY_LLM_LIMIT = 3;

export async function checkAndIncrementLlmUsage(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await db.lLMUsage.upsert({
    where: { userId_date: { userId, date: today } },
    update: { callCount: { increment: 1 } },
    create: { userId, date: today, callCount: 1 },
  });

  return usage.callCount <= DAILY_LLM_LIMIT;
}
```

### 4.3 Rule-based Fallback

```typescript
// lib/ai/recommendation.ts

const REASON_TEMPLATES: Record<string, string[]> = {
  '인문': ['인문 지문 추론 능력 강화를 위한 기출 연습', '인문 계열 독해 오답 패턴 극복 문제'],
  '과학': ['과학 지문 정보 처리 속도 향상용', '과학 기술 지문 핵심 파악 연습'],
  '현대소설': ['현대소설 인물 심리 파악 약점 보완', '현대소설 서술 방식 이해 강화'],
  '고전시가': ['고전시가 해석 능력 향상을 위한 기출', '고전시가 표현법 집중 학습'],
  // ... 나머지 유형
};

export function generateFallbackReason(passageType: string, wrongRate: number): string {
  const templates = REASON_TEMPLATES[passageType] ?? [
    `${passageType} 취약 영역 집중 강화 문제`,
    `${passageType} 오답 패턴 극복을 위한 유사 기출`,
  ];
  const idx = wrongRate > 0.6 ? 0 : 1 % templates.length;
  return templates[idx];
}
```

---

## 5. 전체 추천 엔진 통합

```typescript
// lib/ai/recommendation.ts

export async function refreshRecommendations(userId: string): Promise<void> {
  try {
    // Stage 1
    const weakPoints = await analyzeWeakPoints(userId);
    if (weakPoints.length === 0) return;

    const topWeakTypeIds = weakPoints.slice(0, 3).map(w => w.passageTypeId);

    // 이미 푼 문제 IDs
    const answeredIds = await db.answer
      .findMany({ where: { userId }, select: { questionId: true } })
      .then(answers => answers.map(a => a.questionId));

    // Stage 2 (임베딩 가능 시)
    let candidateIds: string[];
    try {
      // 최근 오답 문제의 임베딩 가져오기
      const recentWrongQuestion = await db.answer.findFirst({
        where: { userId, isCorrect: false },
        orderBy: { createdAt: 'desc' },
        include: { question: true },
      });

      if (recentWrongQuestion?.question.embedding) {
        const embedding = recentWrongQuestion.question.embedding as number[];
        candidateIds = await findSimilarQuestions(embedding, answeredIds, topWeakTypeIds);
      } else {
        throw new Error('No embedding available');
      }
    } catch {
      // Stage 2 fallback: 단순 필터 기반 후보
      const candidates = await db.question.findMany({
        where: {
          id: { notIn: answeredIds },
          passageTypeId: { in: topWeakTypeIds },
        },
        orderBy: { year: 'desc' },
        take: 10,
      });
      candidateIds = candidates.map(q => q.id);
    }

    // 상위 3개 추천
    const topCandidates = candidateIds.slice(0, 3);

    // Stage 3: LLM or Fallback
    const useLLM = process.env.NEXT_PUBLIC_USE_LLM === 'true';

    for (const questionId of topCandidates) {
      const question = await db.question.findUnique({
        where: { id: questionId },
        include: { passageType: true },
      });
      if (!question) continue;

      let reason: string;
      const weakType = weakPoints.find(w => w.passageTypeId === question.passageTypeId);

      if (useLLM && weakType) {
        const canCallLLM = await checkAndIncrementLlmUsage(userId);
        if (canCallLLM) {
          try {
            reason = await generateRecommendationReason({
              studentName: '', // 익명
              weakPassageTypes: weakPoints.slice(0, 3).map(w => ({
                subType: w.subType,
                wrongRate: w.wrongRate,
              })),
              question: {
                year: question.year,
                month: question.month,
                number: question.number,
                passageType: question.passageType.subType,
                difficulty: question.difficulty,
              },
            });
          } catch {
            reason = generateFallbackReason(
              question.passageType.subType,
              weakType?.wrongRate ?? 0.5
            );
          }
        } else {
          reason = generateFallbackReason(
            question.passageType.subType,
            weakType?.wrongRate ?? 0.5
          );
        }
      } else {
        reason = generateFallbackReason(
          question.passageType.subType,
          weakType?.wrongRate ?? 0.5
        );
      }

      // DB upsert
      await db.recommendation.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: { reason, score: weakType?.weightedScore ?? 0.5, updatedAt: new Date() },
        create: {
          userId,
          questionId,
          reason,
          score: weakType?.weightedScore ?? 0.5,
          source: useLLM ? 'AI' : 'RULE',
        },
      });
    }
  } catch (error) {
    // 추천 실패는 사용자 경험에 영향 없도록 silent fail
    console.error('[Recommendation] Failed to refresh:', error);
  }
}
```

---

## 6. 임베딩 사전 생성 (Admin)

새 문제 데이터 추가 시 임베딩을 일괄 생성하는 관리자 API:

```typescript
// app/api/admin/embed/route.ts
// 실행: POST /api/admin/embed  (NEXTAUTH_SECRET 헤더로 인증)

export async function POST(req: Request) {
  const authHeader = req.headers.get('x-admin-secret');
  if (authHeader !== process.env.NEXTAUTH_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 임베딩 없는 문제 조회
  const questions = await db.question.findMany({
    where: { embedding: null },
    take: 50,  // 배치 크기 제한
  });

  let processed = 0;
  for (const q of questions) {
    const text = buildEmbeddingText(q);
    const embedding = await getEmbedding(text);

    await db.$executeRaw`
      UPDATE "Question"
      SET embedding = ${`[${embedding.join(',')}]`}::vector
      WHERE id = ${q.id}
    `;
    processed++;
  }

  return Response.json({ processed });
}
```
