import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const testSession = await db.testSession.findUnique({
      where: { id },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                year: true,
                month: true,
                number: true,
                content: true,
                answer: true,
                explanation: true,
                difficulty: true,
                passageType: { select: { category: true, subType: true, label: true } },
              },
            },
          },
        },
      },
    });

    if (!testSession) {
      return Response.json(
        { success: false, error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    if (testSession.userId !== session.user.id) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const total = testSession.answers.length;
    const correct = testSession.answers.filter((a) => a.isCorrect).length;

    return Response.json({
      success: true,
      data: {
        session: testSession,
        summary: {
          total,
          correct,
          wrong: total - correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('[Session Detail API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const testSession = await db.testSession.findUnique({
      where: { id },
      select: { id: true, userId: true, endedAt: true },
    });

    if (!testSession) {
      return Response.json(
        { success: false, error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    if (testSession.userId !== session.user.id) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const updated = await db.testSession.update({
      where: { id },
      data: { endedAt: new Date() },
      select: { id: true, userId: true, startedAt: true, endedAt: true },
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Session End API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
