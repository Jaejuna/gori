import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

// Mock db
const mockDb = {
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({ db: mockDb }));

const teacherSession = { user: { id: 'teacher-1', email: 'teacher@test.com', role: 'TEACHER' } };
const studentSession = { user: { id: 'student-1', email: 'student@test.com', role: 'STUDENT' } };

const sampleStudents = [
  {
    id: 'student-1',
    name: '김철수',
    email: 'student1@test.com',
    createdAt: new Date(),
    answers: [
      { isCorrect: true, createdAt: new Date(), question: { passageTypeId: 'pt1', passageType: { label: '독서 - 인문', category: '독서' } } },
      { isCorrect: false, createdAt: new Date(), question: { passageTypeId: 'pt1', passageType: { label: '독서 - 인문', category: '독서' } } },
    ],
  },
  {
    id: 'student-2',
    name: '이영희',
    email: 'student2@test.com',
    createdAt: new Date(),
    answers: [],
  },
];

describe('GET /api/teacher/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/teacher/students/route');
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 when student tries to access', async () => {
    mockAuth.mockResolvedValue(studentSession);
    const { GET } = await import('@/app/api/teacher/students/route');
    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('FORBIDDEN');
  });

  it('returns student list for teacher', async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockDb.user.findMany.mockResolvedValue(sampleStudents);

    const { GET } = await import('@/app/api/teacher/students/route');
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
  });

  it('computes accuracy correctly', async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockDb.user.findMany.mockResolvedValue(sampleStudents);

    const { GET } = await import('@/app/api/teacher/students/route');
    const res = await GET();
    const json = await res.json();

    const student1 = json.data.find((s: { id: string }) => s.id === 'student-1');
    expect(student1.accuracy).toBe(50); // 1 correct out of 2
    expect(student1.totalAnswered).toBe(2);
  });

  it('returns null accuracy for student with no answers', async () => {
    mockAuth.mockResolvedValue(teacherSession);
    mockDb.user.findMany.mockResolvedValue(sampleStudents);

    const { GET } = await import('@/app/api/teacher/students/route');
    const res = await GET();
    const json = await res.json();

    const student2 = json.data.find((s: { id: string }) => s.id === 'student-2');
    expect(student2.accuracy).toBeNull();
    expect(student2.totalAnswered).toBe(0);
  });
});
