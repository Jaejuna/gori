import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/teacher/dashboard
 * Returns class-wide statistics for the teacher's dashboard.
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

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'TEACHER') {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const teacher = await db.user.findUnique({
      where: { id: session.user.id },
      select: { classCode: true },
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const students = await db.user.findMany({
      where: { teacherId: session.user.id },
      select: {
        id: true,
        name: true,
        answers: {
          select: {
            isCorrect: true,
            createdAt: true,
            question: {
              select: {
                passageType: { select: { label: true, category: true, subType: true } },
              },
            },
          },
        },
      },
    });

    const totalStudents = students.length;

    // Students who answered at least once this week
    const activeThisWeek = students.filter((s) =>
      s.answers.some((a) => a.createdAt >= oneWeekAgo),
    ).length;

    // Total answers this week
    const allAnswers = students.flatMap((s) => s.answers);
    const answersThisWeek = allAnswers.filter((a) => a.createdAt >= oneWeekAgo);
    const totalAnswersThisWeek = answersThisWeek.length;

    // Class average correct rate
    const totalAnswerCount = allAnswers.length;
    const totalCorrect = allAnswers.filter((a) => a.isCorrect).length;
    const avgCorrectRate =
      totalAnswerCount > 0 ? Math.round((totalCorrect / totalAnswerCount) * 100) : null;

    // Class-wide weak areas by passage type
    const typeMap = new Map<
      string,
      { label: string; category: string; wrong: number; total: number }
    >();
    for (const a of allAnswers) {
      const key = a.question.passageType.label;
      const entry = typeMap.get(key) ?? {
        label: a.question.passageType.label,
        category: String(a.question.passageType.category),
        wrong: 0,
        total: 0,
      };
      entry.total++;
      if (!a.isCorrect) entry.wrong++;
      typeMap.set(key, entry);
    }
    const classWeakAreas = Array.from(typeMap.values())
      .filter((e) => e.total >= 2)
      .map((e) => ({
        label: e.label,
        category: e.category,
        wrongRate: Math.round((e.wrong / e.total) * 100),
      }))
      .sort((a, b) => b.wrongRate - a.wrongRate)
      .slice(0, 8);

    // Students needing attention: bottom 3 by recent accuracy
    const studentStats = students.map((s) => {
      const total = s.answers.length;
      const correct = s.answers.filter((a) => a.isCorrect).length;
      const recentCorrectRate = total > 0 ? Math.round((correct / total) * 100) : null;
      return { id: s.id, name: s.name, recentCorrectRate };
    });
    const needAttention = studentStats
      .filter((s) => s.recentCorrectRate !== null)
      .sort((a, b) => (a.recentCorrectRate ?? 0) - (b.recentCorrectRate ?? 0))
      .slice(0, 3);

    // Recent activity: per-student per-day answer counts (last 5 unique entries)
    const activityMap = new Map<string, { studentName: string; questionCount: number; date: Date }>();
    for (const s of students) {
      for (const a of s.answers) {
        const dateKey = `${s.id}_${a.createdAt.toISOString().split('T')[0]}`;
        const entry = activityMap.get(dateKey) ?? {
          studentName: s.name,
          questionCount: 0,
          date: a.createdAt,
        };
        entry.questionCount++;
        activityMap.set(dateKey, entry);
      }
    }
    const recentActivity = Array.from(activityMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map((e) => ({ studentName: e.studentName, questionCount: e.questionCount, date: e.date }));

    return Response.json({
      success: true,
      data: {
        totalStudents,
        activeThisWeek,
        avgCorrectRate,
        totalAnswersThisWeek,
        classWeakAreas,
        needAttention,
        recentActivity,
        classCode: teacher?.classCode ?? null,
      },
    });
  } catch (error) {
    console.error('[Teacher Dashboard GET Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
