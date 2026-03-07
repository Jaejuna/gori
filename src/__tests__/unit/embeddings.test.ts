import { vi, describe, it, expect, beforeEach } from 'vitest';
import { cosineSimilarity, findTopSimilar } from '@/lib/ai/similarity';

// ─── Cosine Similarity Tests ──────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0, 1, 0.5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('throws for mismatched dimensions', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vector dimension mismatch');
  });

  it('computes similarity correctly for known vectors', () => {
    const a = [1, 1, 0];
    const b = [1, 0, 0];
    // dot = 1, |a| = sqrt(2), |b| = 1 → cos = 1/sqrt(2) ≈ 0.707
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.707, 2);
  });
});

// ─── findTopSimilar Tests ─────────────────────────────────────────────────────

describe('findTopSimilar', () => {
  const candidates = [
    { id: 'q1', embedding: [1, 0, 0], content: 'Q1' },
    { id: 'q2', embedding: [0, 1, 0], content: 'Q2' },
    { id: 'q3', embedding: [0.9, 0.1, 0], content: 'Q3' }, // most similar to query
    { id: 'q4', embedding: [0, 0, 1], content: 'Q4' },
  ];

  it('returns top N most similar items', () => {
    const query = [1, 0, 0];
    const results = findTopSimilar(query, candidates, 2);
    expect(results).toHaveLength(2);
    expect(results[0].item.id).toBe('q1'); // most similar
    expect(results[0].score).toBeCloseTo(1, 5);
    expect(results[1].item.id).toBe('q3'); // second most similar
  });

  it('excludes items by id', () => {
    const query = [1, 0, 0];
    const exclude = new Set(['q1']);
    const results = findTopSimilar(query, candidates, 2, exclude);
    expect(results.every((r) => r.item.id !== 'q1')).toBe(true);
    expect(results[0].item.id).toBe('q3');
  });

  it('returns fewer items if candidates < topN', () => {
    const query = [1, 0, 0];
    const results = findTopSimilar(query, candidates, 10);
    expect(results).toHaveLength(candidates.length);
  });

  it('results are sorted by score descending', () => {
    const query = [1, 0.5, 0];
    const results = findTopSimilar(query, candidates, 4);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

// ─── Embedding Service Tests (mocked) ────────────────────────────────────────

// Module-level state for mock control (vi.mock is hoisted, can't use local vars)
let mockEmbeddingVector: number[] = Array.from({ length: 768 }, (_, i) => i * 0.001);
let featureExtractionCallCount = 0;

vi.mock('@huggingface/inference', () => ({
  InferenceClient: class {
    featureExtraction() {
      featureExtractionCallCount++;
      return Promise.resolve(mockEmbeddingVector);
    }
  },
}));

describe('getEmbedding (mocked HuggingFace)', () => {
  beforeEach(() => {
    vi.resetModules();
    featureExtractionCallCount = 0;
    process.env.HUGGINGFACE_API_KEY = 'test-key';
  });

  it('returns a 768-dim vector', async () => {
    mockEmbeddingVector = Array.from({ length: 768 }, (_, i) => i * 0.001);
    const { getEmbedding } = await import('@/lib/ai/embeddings');
    const result = await getEmbedding('테스트 문장');

    expect(result).toHaveLength(768);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[767]).toBeCloseTo(0.767, 2);
  });

  it('batch-processes texts in groups of 10', async () => {
    mockEmbeddingVector = Array.from({ length: 768 }, () => 0.1);
    const { getEmbeddingsBatch } = await import('@/lib/ai/embeddings');
    const texts = Array.from({ length: 15 }, (_, i) => `Text ${i}`);
    const results = await getEmbeddingsBatch(texts);

    expect(results).toHaveLength(15);
    expect(featureExtractionCallCount).toBe(15); // each text called individually
    results.forEach((r) => expect(r).toHaveLength(768));
  });
});
