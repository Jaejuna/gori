import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculatePassageTypeStats, calculateLast30DaysTrend, getWeakTypes } from '@/lib/analytics';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const answers = await db.answer.findMany({
      where: { userId: session.user.id },
      select: {
        isCorrect: true,
        createdAt: true,
        question: {
          select: {
            passageType: {
              select: { subType: true, label: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const passageTypeStats = calculatePassageTypeStats(answers);
    const last30DaysTrend = calculateLast30DaysTrend(answers);
    const weakTypes = getWeakTypes(passageTypeStats);

    return Response.json({
      success: true,
      data: {
        totalAnswered: answers.length,
        totalCorrect: answers.filter((a) => a.isCorrect).length,
        passageTypeStats,
        last30DaysTrend,
        weakTypes,
      },
    });
  } catch (error) {
    console.error('[Analytics API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
