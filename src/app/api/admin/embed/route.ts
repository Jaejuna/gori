import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getEmbeddingsBatch } from '@/lib/ai/embeddings';

/**
 * Admin-only endpoint to generate and store embeddings for all questions.
 * POST /api/admin/embed
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Only teachers or admins can trigger embedding generation
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'TEACHER') {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Fetch questions without embeddings (embedding is Unsupported vector type, use raw query)
    const questions = await db.$queryRaw<{ id: string; content: string; passage: string | null }[]>`
      SELECT id, content, passage FROM "Question"
      WHERE embedding IS NULL
      LIMIT 100
    `;

    if (questions.length === 0) {
      return Response.json({ success: true, data: { processed: 0, message: 'All questions already have embeddings' } });
    }

    const texts = questions.map((q) =>
      q.passage ? `${q.passage}\n${q.content}` : q.content,
    );

    const embeddings = await getEmbeddingsBatch(texts);

    // Store embeddings using raw query (pgvector Unsupported type)
    let processed = 0;
    for (let i = 0; i < questions.length; i++) {
      const vectorStr = `[${embeddings[i].join(',')}]`;
      await db.$executeRaw`
        UPDATE "Question"
        SET embedding = ${vectorStr}::vector
        WHERE id = ${questions[i].id}
      `;
      processed++;
    }

    return Response.json({ success: true, data: { processed } });
  } catch (error) {
    console.error('[Embed API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
