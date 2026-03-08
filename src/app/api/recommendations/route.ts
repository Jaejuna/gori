import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateRecommendations } from '@/lib/ai/recommendation';

/**
 * POST /api/recommendations
 * Generate AI recommendations for the authenticated student.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const recommendations = await generateRecommendations(session.user.id);

    if (recommendations.length === 0) {
      return Response.json({ success: true, data: { created: 0, recommendations: [] } });
    }

    // Store recommendations in DB
    const created = await db.recommendation.createMany({
      data: recommendations.map((r) => ({
        userId: session.user!.id!,
        questionId: r.questionId,
        score: r.score,
        reason: r.reason,
        source: r.source,
      })),
      skipDuplicates: true,
    });

    return Response.json({ success: true, data: { created: created.count, recommendations } });
  } catch (error) {
    console.error('[Recommendations POST Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/recommendations
 * Get pending (not completed) recommendations for the authenticated student.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const recommendations = await db.recommendation.findMany({
      where: {
        userId: session.user.id,
        isCompleted: false,
        teacherApproved: { not: false }, // exclude explicitly rejected
      },
      include: {
        question: {
          select: { id: true, content: true, difficulty: true, passageType: { select: { label: true } } },
        },
      },
      orderBy: { score: 'desc' },
    });

    return Response.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('[Recommendations GET Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
