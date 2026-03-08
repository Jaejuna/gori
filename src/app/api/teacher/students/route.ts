import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/teacher/students
 * Returns the teacher's student list with accuracy stats and weakest passage type.
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

    const students = await db.user.findMany({
      where: { teacherId: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        answers: {
          select: {
            isCorrect: true,
            createdAt: true,
            question: {
              select: {
                passageTypeId: true,
                passageType: { select: { label: true, category: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = students.map((s) => {
      const total = s.answers.length;
      const correct = s.answers.filter((a) => a.isCorrect).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
      const lastActive = s.answers[0]?.createdAt ?? null;

      // Compute weakest passage type
      const typeMap = new Map<string, { label: string; category: string; wrong: number; total: number }>();
      for (const a of s.answers) {
        const id = a.question.passageTypeId;
        const entry = typeMap.get(id) ?? { label: a.question.passageType.label, category: String(a.question.passageType.category), wrong: 0, total: 0 };
        entry.total++;
        if (!a.isCorrect) entry.wrong++;
        typeMap.set(id, entry);
      }

      let weakestType: { label: string; category: string; wrongRate: number } | null = null;
      let maxWrongRate = -1;
      for (const entry of typeMap.values()) {
        const rate = entry.total > 0 ? entry.wrong / entry.total : 0;
        if (rate > maxWrongRate) {
          maxWrongRate = rate;
          weakestType = { label: entry.label, category: entry.category, wrongRate: Math.round(rate * 100) };
        }
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        totalAnswered: total,
        accuracy,
        lastActive,
        weakestType,
      };
    });

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('[Teacher Students GET Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
