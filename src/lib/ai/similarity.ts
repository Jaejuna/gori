/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1]. Higher = more similar.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

export interface ScoredItem<T> {
  item: T;
  score: number;
}

/**
 * Find the top-N most similar items from a list by cosine similarity.
 * Items must have an `embedding` field.
 */
export function findTopSimilar<T extends { embedding: number[] }>(
  query: number[],
  candidates: T[],
  topN: number,
  excludeIds?: Set<string>,
  idField: keyof T = 'id' as keyof T,
): ScoredItem<T>[] {
  const scored = candidates
    .filter((c) => !excludeIds?.has(String(c[idField])))
    .map((c) => ({
      item: c,
      score: cosineSimilarity(query, c.embedding),
    }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
