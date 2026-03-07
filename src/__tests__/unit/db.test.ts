import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockDbInstance = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  user: {},
  question: {},
  passageType: {},
  testSession: {},
  answer: {},
  recommendation: {},
  llmUsage: {},
};

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      $connect = mockDbInstance.$connect;
      $disconnect = mockDbInstance.$disconnect;
      user = mockDbInstance.user;
      question = mockDbInstance.question;
      passageType = mockDbInstance.passageType;
      testSession = mockDbInstance.testSession;
      answer = mockDbInstance.answer;
      recommendation = mockDbInstance.recommendation;
      llmUsage = mockDbInstance.llmUsage;
    },
  };
});

describe('Prisma singleton client (db)', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).prisma = undefined;
  });

  it('exports a db instance', async () => {
    const { db } = await import('@/lib/db');
    expect(db).toBeDefined();
  });

  it('db instance has expected Prisma model accessors', async () => {
    const { db } = await import('@/lib/db');
    expect(db).toHaveProperty('user');
    expect(db).toHaveProperty('question');
    expect(db).toHaveProperty('passageType');
    expect(db).toHaveProperty('testSession');
    expect(db).toHaveProperty('answer');
    expect(db).toHaveProperty('recommendation');
    expect(db).toHaveProperty('llmUsage');
  });

  it('db instance has $connect method', async () => {
    const { db } = await import('@/lib/db');
    expect(typeof db.$connect).toBe('function');
  });
});
