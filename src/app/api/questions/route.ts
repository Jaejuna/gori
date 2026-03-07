import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  category: z.enum(['독서', '문학', '화법과작문', '언어와매체']).optional(),
  passageTypeId: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().refine((v) => v === 6 || v === 11).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(rawParams);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid query parameters', code: 'INVALID_PARAMS', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { category, passageTypeId, difficulty, year, month, limit, offset } = parsed.data;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (passageTypeId) {
      where.passageTypeId = passageTypeId;
    } else if (category) {
      where.passageType = { category };
    }

    if (difficulty) where.difficulty = difficulty;
    if (year) where.year = year;
    if (month) where.month = month;

    const [total, questions] = await Promise.all([
      db.question.count({ where }),
      db.question.findMany({
        where,
        select: {
          id: true,
          year: true,
          month: true,
          number: true,
          content: true,
          difficulty: true,
          tags: true,
          passageTypeId: true,
          passageType: { select: { id: true, category: true, subType: true, label: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { number: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ]);

    return Response.json({
      success: true,
      data: { questions, total, limit, offset },
    });
  } catch (error) {
    console.error('[Questions API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
