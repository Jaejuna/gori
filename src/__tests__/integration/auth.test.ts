import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the db module to avoid real DB connection
const mockUser = {
  id: 'user-123',
  email: 'teacher@test.com',
  name: 'Test Teacher',
  role: 'TEACHER' as const,
  classCode: 'ABC123',
};

const mockDb = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ db: mockDb }));

describe('POST /api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a teacher and returns classCode', async () => {
    mockDb.user.findUnique.mockResolvedValue(null); // no existing user, no code collision
    mockDb.user.create.mockResolvedValue(mockUser);

    const { POST } = await import('@/app/api/register/route');

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        password: 'password123',
        role: 'TEACHER',
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { success: boolean; data: typeof mockUser };

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.classCode).toBe('ABC123');
  });

  it('registers a student with a valid class code', async () => {
    const mockStudent = {
      id: 'student-456',
      email: 'student@test.com',
      name: 'Test Student',
      role: 'STUDENT' as const,
    };

    const mockTeacher = { id: 'teacher-123', role: 'TEACHER' as const };

    mockDb.user.findUnique
      .mockResolvedValueOnce(null) // no existing user with email
      .mockResolvedValueOnce(mockTeacher); // teacher found by classCode

    mockDb.user.create.mockResolvedValue(mockStudent);

    const { POST } = await import('@/app/api/register/route');

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@test.com',
        name: 'Test Student',
        password: 'password123',
        role: 'STUDENT',
        classCode: 'ABC123',
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { success: boolean; data: typeof mockStudent };

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.role).toBe('STUDENT');
  });

  it('returns 409 when email is already taken', async () => {
    mockDb.user.findUnique.mockResolvedValue(mockUser); // email exists

    const { POST } = await import('@/app/api/register/route');

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@test.com',
        name: 'Another',
        password: 'password123',
        role: 'TEACHER',
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { success: boolean; code: string };

    expect(res.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.code).toBe('EMAIL_TAKEN');
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('@/app/api/register/route');

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@x.com' }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { success: boolean; code: string };

    expect(res.status).toBe(400);
    expect(data.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when class code is invalid', async () => {
    mockDb.user.findUnique
      .mockResolvedValueOnce(null) // no email conflict
      .mockResolvedValueOnce(null); // classCode not found

    const { POST } = await import('@/app/api/register/route');

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@test.com',
        name: 'Student',
        password: 'password123',
        role: 'STUDENT',
        classCode: 'BADCOD',
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { success: boolean; code: string };

    expect(res.status).toBe(400);
    expect(data.code).toBe('INVALID_CLASS_CODE');
  });
});
