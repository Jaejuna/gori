import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock auth
const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

// Mock db
const mockDb = {
  question: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  passageType: {
    findMany: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({ db: mockDb }));

const mockSession = { user: { id: 'user-1', email: 'test@test.com', role: 'STUDENT' } };

const sampleQuestion = {
  id: 'q-1',
  year: 2024,
  month: 11,
  number: 1,
  passage: '지문',
  content: '문제 내용',
  options: [
    { index: 1, text: '보기1' },
    { index: 2, text: '보기2' },
    { index: 3, text: '보기3' },
    { index: 4, text: '보기4' },
    { index: 5, text: '보기5' },
  ],
  answer: 3,
  explanation: '해설',
  difficulty: 'MEDIUM',
  tags: ['독서'],
  passageTypeId: 'pt-1',
  passageType: { id: 'pt-1', category: '독서', subType: '인문', label: '독서 - 인문' },
  createdAt: new Date(),
};

describe('GET /api/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import('@/app/api/questions/route');
    const req = new Request('http://localhost/api/questions');
    const res = await GET(req);
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('returns paginated questions with default params', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.question.count.mockResolvedValue(32);
    mockDb.question.findMany.mockResolvedValue([sampleQuestion]);

    const { GET } = await import('@/app/api/questions/route');
    const req = new Request('http://localhost/api/questions');
    const res = await GET(req);
    const data = await res.json() as { success: boolean; data: { questions: unknown[]; total: number; limit: number; offset: number } };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(32);
    expect(data.data.limit).toBe(20);
    expect(data.data.offset).toBe(0);
    expect(Array.isArray(data.data.questions)).toBe(true);
  });

  it('filters by category and difficulty', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.question.count.mockResolvedValue(5);
    mockDb.question.findMany.mockResolvedValue([sampleQuestion]);

    const { GET } = await import('@/app/api/questions/route');
    const req = new Request('http://localhost/api/questions?category=독서&difficulty=HARD');
    const res = await GET(req);
    const data = await res.json() as { success: boolean; data: { total: number } };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Verify db was called with the right where clause
    const whereArg = mockDb.question.findMany.mock.calls[0][0].where as Record<string, unknown>;
    expect(whereArg.difficulty).toBe('HARD');
    expect((whereArg.passageType as Record<string, unknown>)?.category).toBe('독서');
  });

  it('supports pagination via limit and offset', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.question.count.mockResolvedValue(100);
    mockDb.question.findMany.mockResolvedValue([sampleQuestion]);

    const { GET } = await import('@/app/api/questions/route');
    const req = new Request('http://localhost/api/questions?limit=10&offset=20');
    const res = await GET(req);
    const data = await res.json() as { success: boolean; data: { limit: number; offset: number } };

    expect(res.status).toBe(200);
    expect(data.data.limit).toBe(10);
    expect(data.data.offset).toBe(20);

    const callArg = mockDb.question.findMany.mock.calls[0][0] as { take: number; skip: number };
    expect(callArg.take).toBe(10);
    expect(callArg.skip).toBe(20);
  });

  it('returns 400 for invalid query params', async () => {
    mockAuth.mockResolvedValue(mockSession);

    const { GET } = await import('@/app/api/questions/route');
    const req = new Request('http://localhost/api/questions?difficulty=INVALID');
    const res = await GET(req);
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(400);
    expect(data.code).toBe('INVALID_PARAMS');
  });
});

describe('GET /api/questions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import('@/app/api/questions/[id]/route');
    const req = new Request('http://localhost/api/questions/q-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'q-1' }) });
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('returns 404 for nonexistent question', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.question.findUnique.mockResolvedValue(null);

    const { GET } = await import('@/app/api/questions/[id]/route');
    const req = new Request('http://localhost/api/questions/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('returns question detail for valid id', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.question.findUnique.mockResolvedValue(sampleQuestion);

    const { GET } = await import('@/app/api/questions/[id]/route');
    const req = new Request('http://localhost/api/questions/q-1');
    const res = await GET(req, { params: Promise.resolve({ id: 'q-1' }) });
    const data = await res.json() as { success: boolean; data: typeof sampleQuestion };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('q-1');
    expect(data.data.options).toHaveLength(5);
  });
});

describe('GET /api/passage-types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import('@/app/api/passage-types/route');
    const res = await GET();
    const data = await res.json() as { success: boolean; code: string };

    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('returns grouped passage types', async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockDb.passageType.findMany.mockResolvedValue([
      { id: 'pt-1', category: '독서', subType: '인문', label: '독서 - 인문' },
      { id: 'pt-2', category: '문학', subType: '현대시', label: '문학 - 현대시' },
    ]);

    const { GET } = await import('@/app/api/passage-types/route');
    const res = await GET();
    const data = await res.json() as { success: boolean; data: { passageTypes: unknown[]; grouped: Record<string, unknown[]> } };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.passageTypes).toHaveLength(2);
    expect(data.data.grouped['독서']).toHaveLength(1);
    expect(data.data.grouped['문학']).toHaveLength(1);
  });
});
