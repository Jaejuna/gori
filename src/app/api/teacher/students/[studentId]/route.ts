import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/teacher/students/[studentId]
 * Returns detailed analytics for a specific student (teacher-only).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'TEACHER') {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const { studentId } = await params;

    // Verify student belongs to this teacher
    const student = await db.user.findFirst({
      where: { id: studentId, teacherId: session.user.id },
      select: { id: true, name: true, email: true },
    });

    if (!student) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    // Fetch answers with passage type
    const answers = await db.answer.findMany({
      where: { userId: studentId },
      select: {
        isCorrect: true,
        createdAt: true,
        question: {
          select: {
            id: true,
            content: true,
            passageTypeId: true,
            passageType: { select: { label: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Passage type stats
    const typeMap = new Map<string, { label: string; category: string; wrong: number; total: number }>();
    for (const a of answers) {
      const id = a.question.passageTypeId;
      const entry = typeMap.get(id) ?? {
        label: a.question.passageType.label,
        category: String(a.question.passageType.category),
        wrong: 0,
        total: 0,
      };
      entry.total++;
      if (!a.isCorrect) entry.wrong++;
      typeMap.set(id, entry);
    }

    const passageTypeStats = Array.from(typeMap.entries()).map(([id, e]) => ({
      passageTypeId: id,
      label: e.label,
      category: e.category,
      total: e.total,
      wrong: e.wrong,
      wrongRate: e.total > 0 ? Math.round((e.wrong / e.total) * 100) : 0,
    }));

    // Recent wrong answers (last 10)
    const recentWrong = answers
      .filter((a) => !a.isCorrect)
      .slice(0, 10)
      .map((a) => ({
        questionId: a.question.id,
        content: a.question.content.slice(0, 80),
        passageTypeLabel: a.question.passageType.label,
        answeredAt: a.createdAt,
      }));

    // Recommendations
    const recommendations = await db.recommendation.findMany({
      where: { userId: studentId },
      include: {
        question: {
          select: {
            id: true,
            content: true,
            passageType: { select: { label: true } },
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return Response.json({
      success: true,
      data: {
        student,
        passageTypeStats,
        recentWrong,
        recommendations,
        totalAnswered: answers.length,
        totalCorrect: answers.filter((a) => a.isCorrect).length,
      },
    });
  } catch (error) {
    console.error('[Teacher Student Detail GET Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
