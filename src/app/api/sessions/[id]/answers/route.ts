import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.number().int().min(1).max(5),
  timeSpent: z.number().int().min(0).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const { id: sessionId } = await params;

    // Verify session belongs to user
    const testSession = await db.testSession.findUnique({
      where: { id: sessionId },
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

    if (testSession.endedAt) {
      return Response.json(
        { success: false, error: 'Session already ended', code: 'SESSION_ENDED' },
        { status: 409 },
      );
    }

    const body = await req.json();
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request body', code: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { questionId, selectedOption, timeSpent } = parsed.data;

    // Fetch correct answer
    const question = await db.question.findUnique({
      where: { id: questionId },
      select: { id: true, answer: true, explanation: true },
    });

    if (!question) {
      return Response.json(
        { success: false, error: 'Question not found', code: 'QUESTION_NOT_FOUND' },
        { status: 404 },
      );
    }

    const isCorrect = selectedOption === question.answer;

    const answer = await db.answer.create({
      data: {
        userId: session.user.id,
        questionId,
        sessionId,
        selectedOption,
        isCorrect,
        timeSpent: timeSpent ?? null,
      },
      select: {
        id: true,
        questionId: true,
        sessionId: true,
        selectedOption: true,
        isCorrect: true,
        timeSpent: true,
        createdAt: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        answer,
        correctAnswer: question.answer,
        isCorrect,
        explanation: isCorrect ? null : question.explanation,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Answer Submit API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
