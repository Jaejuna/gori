import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/recommendations/[userId]
 * Get recommendations for a specific user.
 * Students can only access their own. Teachers can access their students'.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const { userId } = await params;
    const userRole = (session.user as { role?: string }).role;

    // Students can only view their own recommendations
    if (userRole !== 'TEACHER' && session.user.id !== userId) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Teachers can only view recommendations for their own students
    if (userRole === 'TEACHER') {
      const student = await db.user.findFirst({
        where: { id: userId, teacherId: session.user.id },
      });
      if (!student) {
        return Response.json(
          { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
          { status: 403 },
        );
      }
    }

    const recommendations = await db.recommendation.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            content: true,
            difficulty: true,
            passageType: { select: { label: true, category: true } },
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return Response.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('[Recommendations userId GET Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
