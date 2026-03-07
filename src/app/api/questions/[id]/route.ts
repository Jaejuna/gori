import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const question = await db.question.findUnique({
      where: { id },
      select: {
        id: true,
        year: true,
        month: true,
        number: true,
        passage: true,
        content: true,
        options: true,
        answer: true,
        explanation: true,
        difficulty: true,
        tags: true,
        passageTypeId: true,
        passageType: { select: { id: true, category: true, subType: true, label: true } },
        createdAt: true,
      },
    });

    if (!question) {
      return Response.json(
        { success: false, error: 'Question not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    return Response.json({ success: true, data: question });
  } catch (error) {
    console.error('[Question Detail API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
