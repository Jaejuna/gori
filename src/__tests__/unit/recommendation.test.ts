import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computePassageTypeWeights } from '@/lib/ai/recommendation';

// ─── computePassageTypeWeights Tests ──────────────────────────────────────────

function makeAnswer(isCorrect: boolean, passageTypeId: string, passageTypeName: string) {
  return {
    isCorrect,
    questionId: `q-${Math.random()}`,
    question: {
      passageTypeId,
      passageType: { label: passageTypeName },
    },
  };
}

describe('computePassageTypeWeights', () => {
  it('returns empty array for no answers', () => {
    expect(computePassageTypeWeights([])).toEqual([]);
  });

  it('computes wrong count and weight correctly', () => {
    const answers = [
      makeAnswer(false, 'pt1', '독서'),
      makeAnswer(false, 'pt1', '독서'),
      makeAnswer(true, 'pt1', '독서'),
    ];
    const weights = computePassageTypeWeights(answers);
    expect(weights).toHaveLength(1);
    expect(weights[0].wrongCount).toBe(2);
    expect(weights[0].weight).toBeCloseTo(2 / 3, 5);
  });

  it('sorts by weight descending', () => {
    const answers = [
      makeAnswer(false, 'pt1', '독서'),
      makeAnswer(true, 'pt1', '독서'),
      makeAnswer(false, 'pt2', '문학'),
      makeAnswer(false, 'pt2', '문학'),
    ];
    const weights = computePassageTypeWeights(answers);
    expect(weights[0].passageTypeId).toBe('pt2'); // 2/2 = 1.0
    expect(weights[1].passageTypeId).toBe('pt1'); // 1/2 = 0.5
  });

  it('handles all-correct answers (weight 0)', () => {
    const answers = [makeAnswer(true, 'pt1', '독서'), makeAnswer(true, 'pt1', '독서')];
    const weights = computePassageTypeWeights(answers);
    expect(weights[0].weight).toBe(0);
    expect(weights[0].wrongCount).toBe(0);
  });

  it('handles multiple passage types', () => {
    const answers = [
      makeAnswer(false, 'pt1', '독서'),
      makeAnswer(false, 'pt2', '문학'),
      makeAnswer(false, 'pt3', '화법과작문'),
    ];
    const weights = computePassageTypeWeights(answers);
    expect(weights).toHaveLength(3);
    weights.forEach((w) => expect(w.weight).toBe(1));
  });
});

// ─── LLM Fallback Tests ───────────────────────────────────────────────────────

// Mock modules for integration-style tests
vi.mock('@/lib/db', () => ({
  db: {
    answer: { findMany: vi.fn() },
    recommendation: { findMany: vi.fn(), createMany: vi.fn() },
    llmUsage: { findFirst: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/ai/llm', () => ({
  checkDailyLimit: vi.fn(),
  generateRecommendationReason: vi.fn(),
  incrementUsage: vi.fn(),
}));

describe('generateRecommendations (mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: NEXT_PUBLIC_USE_LLM not set → undefined (LLM enabled)
    delete process.env.NEXT_PUBLIC_USE_LLM;
  });

  it('returns empty array when no candidates exist', async () => {
    const { db } = await import('@/lib/db');
    const { generateRecommendations } = await import('@/lib/ai/recommendation');

    vi.mocked(db.answer.findMany).mockResolvedValue([]);
    vi.mocked(db.recommendation.findMany).mockResolvedValue([]);
    vi.mocked(db.$queryRaw).mockResolvedValue([]);

    const result = await generateRecommendations('user-1');
    expect(result).toEqual([]);
  });

  it('uses rule-based fallback when NEXT_PUBLIC_USE_LLM=false', async () => {
    process.env.NEXT_PUBLIC_USE_LLM = 'false';

    const { db } = await import('@/lib/db');
    const { generateRecommendationReason } = await import('@/lib/ai/llm');
    const { generateRecommendations } = await import('@/lib/ai/recommendation');

    vi.mocked(db.answer.findMany).mockResolvedValue([
      {
        isCorrect: false,
        questionId: 'q1',
        question: { passageTypeId: 'pt1', passageType: { label: '독서' } },
      } as never,
    ]);
    vi.mocked(db.recommendation.findMany).mockResolvedValue([]);
    vi.mocked(db.$queryRaw).mockResolvedValue([
      { id: 'q2', content: '샘플 문제', passageTypeId: 'pt1', embedding: [0.1, 0.2, 0.3] },
    ]);

    const result = await generateRecommendations('user-1');

    expect(generateRecommendationReason).not.toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].source).toBe('RULE');
  });

  it('excludes already-answered questions', async () => {
    const { db } = await import('@/lib/db');
    const { generateRecommendations } = await import('@/lib/ai/recommendation');

    // Student answered q1
    vi.mocked(db.answer.findMany).mockResolvedValue([
      {
        isCorrect: false,
        questionId: 'q1',
        question: { passageTypeId: 'pt1', passageType: { label: '독서' } },
      } as never,
    ]);
    vi.mocked(db.recommendation.findMany).mockResolvedValue([]);

    // Candidates: q1 and q2
    vi.mocked(db.$queryRaw).mockResolvedValue([
      { id: 'q1', content: 'Q1', passageTypeId: 'pt1', embedding: [1, 0, 0] },
      { id: 'q2', content: 'Q2', passageTypeId: 'pt1', embedding: [0.9, 0.1, 0] },
    ]);

    const result = await generateRecommendations('user-1');
    // q1 is already answered, so only q2 should appear
    expect(result.every((r) => r.questionId !== 'q1')).toBe(true);
  });
});
