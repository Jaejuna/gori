import { InferenceClient } from '@huggingface/inference';

const MODEL = 'jhgan/ko-sroberta-multitask';
const EMBEDDING_DIM = 768;
const TIMEOUT_MS = 30_000;
const BATCH_SIZE = 10;

function getClient(): InferenceClient {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY is not set');
  return new InferenceClient(apiKey);
}

/**
 * Get a 768-dim embedding vector for a single text.
 * Throws on timeout or API error.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getClient();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await client.featureExtraction({
      model: MODEL,
      inputs: text,
      signal: controller.signal,
    });

    const vector = flattenEmbedding(result);
    if (vector.length !== EMBEDDING_DIM) {
      throw new Error(`Expected ${EMBEDDING_DIM}-dim vector, got ${vector.length}`);
    }
    return vector;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`HuggingFace embedding timeout after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get embeddings for multiple texts in batches of BATCH_SIZE.
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((t) => getEmbedding(t)));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Flatten HuggingFace featureExtraction output to a flat number[].
 * The output can be number[], number[][], or nested arrays.
 */
function flattenEmbedding(result: unknown): number[] {
  if (Array.isArray(result)) {
    if (result.length > 0 && typeof result[0] === 'number') {
      return result as number[];
    }
    if (result.length > 0 && Array.isArray(result[0])) {
      // Mean-pool over tokens if shape is [tokens, dim]
      const inner = result as number[][];
      if (inner.length === 1) return inner[0];
      const dim = inner[0].length;
      const mean = new Array<number>(dim).fill(0);
      for (const row of inner) {
        for (let j = 0; j < dim; j++) mean[j] += row[j];
      }
      return mean.map((v) => v / inner.length);
    }
  }
  throw new Error('Unexpected embedding shape from HuggingFace API');
}
