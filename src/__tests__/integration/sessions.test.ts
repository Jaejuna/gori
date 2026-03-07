import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

const mockDb = {
  testSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  answer: {
    create: vi.fn(),
  },
  question: {
    findUnique: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockSession = { user: { id: 'user-1', email: 'test@test.com', role: 'STUDENT' } };

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST();
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('creates a new test session', async () => {
    mockAuth.mockResolvedValue(mockSession);
    const fakeSession = { id: 'session-1', userId: 'user-1', startedAt: new Date(), endedAt: null };
    mockDb.testSession.create.mockResolvedValue(fakeSession);

    const { POST } = await import('@/app/api/sessions/route');
    const res = await POST();
    const data = await res.json() as { success: boolean; data: { id: string; userId: string } };

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('session-1');
    expect(mockDb.testSession.create).toHaveBeenCalledWith({
      data: { userId: 'user-1' },
      select: expect.any(Object),
    });
  });
});

describe('POST /api/sessions/[id]/answers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/[id]/answers/route');
    const req = new Request('http://localhost/api/sessions/s-1/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'q-1', selectedOption: 3 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's-1' }) });
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('submits a correct answer and returns isCorrect=true', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.testSession.findUnique.mockResolvedValue({
      id: 's-1', userId: 'user-1', endedAt: null,
    });
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', answer: 3, explanation: '해설',
    });
    mockDb.answer.create.mockResolvedValue({
      id: 'ans-1', questionId: 'q-1', sessionId: 's-1',
      selectedOption: 3, isCorrect: true, timeSpent: 30, createdAt: new Date(),
    });

    const { POST } = await import('@/app/api/sessions/[id]/answers/route');
    const req = new Request('http://localhost/api/sessions/s-1/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'q-1', selectedOption: 3, timeSpent: 30 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's-1' }) });
    const data = await res.json() as { success: boolean; data: { isCorrect: boolean; correctAnswer: number; explanation: string | null } };

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.isCorrect).toBe(true);
    expect(data.data.correctAnswer).toBe(3);
    expect(data.data.explanation).toBeNull(); // no explanation for correct
  });

  it('submits a wrong answer and returns isCorrect=false with explanation', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.testSession.findUnique.mockResolvedValue({
      id: 's-1', userId: 'user-1', endedAt: null,
    });
    mockDb.question.findUnique.mockResolvedValue({
      id: 'q-1', answer: 3, explanation: '정답은 3번입니다.',
    });
    mockDb.answer.create.mockResolvedValue({
      id: 'ans-2', questionId: 'q-1', sessionId: 's-1',
      selectedOption: 2, isCorrect: false, timeSpent: 45, createdAt: new Date(),
    });

    const { POST } = await import('@/app/api/sessions/[id]/answers/route');
    const req = new Request('http://localhost/api/sessions/s-1/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'q-1', selectedOption: 2, timeSpent: 45 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 's-1' }) });
    const data = await res.json() as { success: boolean; data: { isCorrect: boolean; explanation: string } };

    expect(res.status).toBe(201);
    expect(data.data.isCorrect).toBe(false);
    expect(data.data.explanation).toBe('정답은 3번입니다.');
  });

  it('returns 404 when session not found', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.testSession.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/sessions/[id]/answers/route');
    const req = new Request('http://localhost/api/sessions/bad-id/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 'q-1', selectedOption: 1 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'bad-id' }) });
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns session results with summary', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.testSession.findUnique.mockResolvedValue({
      id: 's-1',
      userId: 'user-1',
      startedAt: new Date(),
      endedAt: new Date(),
      answers: [
        { id: 'a-1', isCorrect: true, question: { id: 'q-1', content: '문제1', answer: 3, explanation: null, difficulty: 'EASY', passageType: { category: '독서', subType: '인문', label: '독서 - 인문' } } },
        { id: 'a-2', isCorrect: false, question: { id: 'q-2', content: '문제2', answer: 2, explanation: '해설', difficulty: 'HARD', passageType: { category: '독서', subType: '과학', label: '독서 - 과학' } } },
      ],
    });

    const { GET } = await import('@/app/api/sessions/[id]/route');
    const req = new Request('http://localhost/api/sessions/s-1');
    const res = await GET(req, { params: Promise.resolve({ id: 's-1' }) });
    const data = await res.json() as { success: boolean; data: { summary: { total: number; correct: number; accuracy: number } } };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.total).toBe(2);
    expect(data.data.summary.correct).toBe(1);
    expect(data.data.summary.accuracy).toBe(50);
  });

  it('returns 403 when session belongs to different user', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.testSession.findUnique.mockResolvedValue({
      id: 's-1', userId: 'other-user', startedAt: new Date(), endedAt: null, answers: [],
    });

    const { GET } = await import('@/app/api/sessions/[id]/route');
    const req = new Request('http://localhost/api/sessions/s-1');
    const res = await GET(req, { params: Promise.resolve({ id: 's-1' }) });
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(403);
    expect(data.code).toBe('FORBIDDEN');
  });
});
