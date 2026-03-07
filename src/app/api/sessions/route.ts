import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const testSession = await db.testSession.create({
      data: { userId: session.user.id },
      select: { id: true, userId: true, startedAt: true, endedAt: true },
    });

    return Response.json({ success: true, data: testSession }, { status: 201 });
  } catch (error) {
    console.error('[Sessions API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
