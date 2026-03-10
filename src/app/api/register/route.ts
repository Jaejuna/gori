import { db } from '@/lib/db';
import { hashPassword, generateClassCode } from '@/lib/auth-utils';

type RegisterBody = {
  email: string;
  name: string;
  password: string;
  role: 'STUDENT' | 'TEACHER';
  classCode?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const { email, name, password, role, classCode } = body;

    if (!email || !name || !password || !role) {
      return Response.json(
        { success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 },
      );
    }

    if (!['STUDENT', 'TEACHER'].includes(role)) {
      return Response.json(
        { success: false, error: 'Invalid role', code: 'INVALID_ROLE' },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { success: false, error: 'Email already registered', code: 'EMAIL_TAKEN' },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    if (role === 'TEACHER') {
      let newClassCode = generateClassCode();
      // Ensure class code is unique
      let codeExists = await db.user.findUnique({ where: { classCode: newClassCode } });
      while (codeExists) {
        newClassCode = generateClassCode();
        codeExists = await db.user.findUnique({ where: { classCode: newClassCode } });
      }

      const user = await db.user.create({
        data: { email, name, password: hashedPassword, role, classCode: newClassCode },
        select: { id: true, email: true, name: true, role: true, classCode: true },
      });

      return Response.json({ success: true, data: user }, { status: 201 });
    }

    // STUDENT — classCode is required
    if (!classCode) {
      return Response.json(
        { success: false, error: '반 코드를 입력해주세요', code: 'CLASS_CODE_REQUIRED' },
        { status: 400 },
      );
    }

    const teacher = await db.user.findUnique({
      where: { classCode },
      select: { id: true, role: true },
    });
    if (!teacher || teacher.role !== 'TEACHER') {
      return Response.json(
        { success: false, error: '존재하지 않는 반 코드입니다', code: 'INVALID_CLASS_CODE' },
        { status: 400 },
      );
    }
    const teacherId = teacher.id;

    const user = await db.user.create({
      data: { email, name, password: hashedPassword, role, teacherId },
      select: { id: true, email: true, name: true, role: true },
    });

    return Response.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error('[Register API Error]', error);
    return Response.json(
      { success: false, error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
