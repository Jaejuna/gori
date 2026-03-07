import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const passageTypes = await db.passageType.findMany({
      orderBy: [{ category: 'asc' }, { subType: 'asc' }],
    });

    // Group by category
    const grouped = passageTypes.reduce(
      (acc, pt) => {
        if (!acc[pt.category]) acc[pt.category] = [];
        acc[pt.category].push(pt);
        return acc;
      },
      {} as Record<string, typeof passageTypes>,
    );

    return Response.json({ success: true, data: { passageTypes, grouped } });
  } catch (error) {
    console.error('[PassageTypes API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
