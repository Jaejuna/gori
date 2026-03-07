import { describe, it, expect } from 'vitest';
import sampleQuestions from '../../../prisma/seed/questions/sample.json';
import { PASSAGE_TYPES, PASSAGE_TYPE_MAP } from '@/constants/passageTypes';
import type { SeedQuestion, QuestionOption } from '@/types/question';

const questions = sampleQuestions as SeedQuestion[];

describe('PASSAGE_TYPES constant', () => {
  it('has 12 or more passage types', () => {
    expect(PASSAGE_TYPES.length).toBeGreaterThanOrEqual(12);
  });

  it('every passage type has required fields', () => {
    for (const pt of PASSAGE_TYPES) {
      expect(pt.key).toBeTruthy();
      expect(pt.category).toBeTruthy();
      expect(pt.subType).toBeTruthy();
      expect(pt.label).toBeTruthy();
    }
  });

  it('covers all 4 categories', () => {
    const categories = new Set(PASSAGE_TYPES.map((pt) => pt.category));
    expect(categories.has('독서')).toBe(true);
    expect(categories.has('문학')).toBe(true);
    expect(categories.has('화법과작문')).toBe(true);
    expect(categories.has('언어와매체')).toBe(true);
  });
});

describe('sample.json seed data', () => {
  it('has 30 or more questions', () => {
    expect(questions.length).toBeGreaterThanOrEqual(30);
  });

  it('every question has required fields', () => {
    for (const q of questions) {
      expect(q.year).toBeTypeOf('number');
      expect(q.month).toBeTypeOf('number');
      expect(q.number).toBeTypeOf('number');
      expect(q.content).toBeTruthy();
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.answer).toBeTypeOf('number');
      expect(q.difficulty).toBeTruthy();
      expect(Array.isArray(q.tags)).toBe(true);
      expect(q.passageTypeKey).toBeTruthy();
    }
  });

  it('every answer is in range 1–5', () => {
    for (const q of questions) {
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(5);
    }
  });

  it('every question has exactly 5 options', () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(5);
    }
  });

  it('option indices are 1–5', () => {
    for (const q of questions) {
      const indices = (q.options as QuestionOption[]).map((o) => o.index);
      expect(indices).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('year is a valid exam year (2020–2030)', () => {
    for (const q of questions) {
      expect(q.year).toBeGreaterThanOrEqual(2020);
      expect(q.year).toBeLessThanOrEqual(2030);
    }
  });

  it('month is 6 or 11 (수능/모의)', () => {
    for (const q of questions) {
      expect([6, 11]).toContain(q.month);
    }
  });

  it('difficulty is EASY, MEDIUM, or HARD', () => {
    const valid = new Set(['EASY', 'MEDIUM', 'HARD']);
    for (const q of questions) {
      expect(valid.has(q.difficulty)).toBe(true);
    }
  });

  it('every passageTypeKey maps to a known passage type', () => {
    for (const q of questions) {
      expect(PASSAGE_TYPE_MAP[q.passageTypeKey]).toBeDefined();
    }
  });

  it('question numbers are unique within same year/month', () => {
    const seen = new Set<string>();
    for (const q of questions) {
      const key = `${q.year}-${q.month}-${q.number}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
