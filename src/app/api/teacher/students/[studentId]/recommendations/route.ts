import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  recommendationId: z.string(),
  approved: z.boolean(),
});

const postSchema = z.object({
  questionId: z.string(),
  reason: z.string().max(50).optional(),
});

async function verifyTeacherAccess(teacherId: string, studentId: string) {
  const student = await db.user.findFirst({
    where: { id: studentId, teacherId },
  });
  return !!student;
}

/**
 * PATCH /api/teacher/students/[studentId]/recommendations
 * Approve or exclude a recommendation.
 */
export async function PATCH(
  req: Request,
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

    if (!(await verifyTeacherAccess(session.user.id, studentId))) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const { recommendationId, approved } = parsed.data;

    const updated = await db.recommendation.update({
      where: { id: recommendationId, userId: studentId },
      data: { isReviewedByTeacher: true, teacherApproved: approved },
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Teacher Recommendation PATCH Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/teacher/students/[studentId]/recommendations
 * Directly add a recommendation question for a student.
 */
export async function POST(
  req: Request,
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

    if (!(await verifyTeacherAccess(session.user.id, studentId))) {
      return Response.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const { questionId, reason } = parsed.data;

    const recommendation = await db.recommendation.create({
      data: {
        userId: studentId,
        questionId,
        reason: reason ?? '선생님이 직접 추가한 문제입니다.',
        score: 1.0,
        source: 'TEACHER_ADDED',
        isReviewedByTeacher: true,
        teacherApproved: true,
      },
    });

    return Response.json({ success: true, data: recommendation }, { status: 201 });
  } catch (error) {
    console.error('[Teacher Recommendation POST Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
