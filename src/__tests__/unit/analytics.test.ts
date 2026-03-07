import { describe, it, expect } from 'vitest';
import {
  calculatePassageTypeStats,
  calculateLast30DaysTrend,
  getWeakTypes,
  type AnswerRecord,
} from '@/lib/analytics';

function makeAnswer(isCorrect: boolean, subType: string, daysAgo = 0): AnswerRecord {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    isCorrect,
    createdAt: d,
    question: {
      passageType: { subType, label: `독서 - ${subType}`, category: '독서' },
    },
  };
}

describe('calculatePassageTypeStats', () => {
  it('returns empty array for no answers', () => {
    expect(calculatePassageTypeStats([])).toEqual([]);
  });

  it('calculates accuracy correctly', () => {
    const answers: AnswerRecord[] = [
      makeAnswer(true, '인문'),
      makeAnswer(true, '인문'),
      makeAnswer(false, '인문'),
      makeAnswer(false, '과학'),
      makeAnswer(false, '과학'),
    ];

    const stats = calculatePassageTypeStats(answers);
    const inmun = stats.find((s) => s.subType === '인문')!;
    const science = stats.find((s) => s.subType === '과학')!;

    expect(inmun.total).toBe(3);
    expect(inmun.correct).toBe(2);
    expect(inmun.wrong).toBe(1);
    expect(inmun.accuracy).toBe(67); // Math.round(2/3*100)
    expect(inmun.wrongRate).toBe(33);

    expect(science.total).toBe(2);
    expect(science.correct).toBe(0);
    expect(science.wrong).toBe(2);
    expect(science.accuracy).toBe(0);
    expect(science.wrongRate).toBe(100);
  });

  it('handles 100% accuracy', () => {
    const answers = [makeAnswer(true, '인문'), makeAnswer(true, '인문')];
    const stats = calculatePassageTypeStats(answers);
    expect(stats[0].accuracy).toBe(100);
    expect(stats[0].wrongRate).toBe(0);
  });
});

describe('calculateLast30DaysTrend', () => {
  it('returns 30 entries', () => {
    const trend = calculateLast30DaysTrend([]);
    expect(trend).toHaveLength(30);
  });

  it('all entries are zero for no answers', () => {
    const trend = calculateLast30DaysTrend([]);
    trend.forEach((d) => {
      expect(d.wrongCount).toBe(0);
      expect(d.totalCount).toBe(0);
    });
  });

  it('counts answers within last 30 days', () => {
    const answers: AnswerRecord[] = [
      makeAnswer(true, '인문', 0),   // today
      makeAnswer(false, '인문', 1),  // yesterday
      makeAnswer(false, '과학', 1),  // yesterday
      makeAnswer(true, '인문', 35),  // >30 days ago — excluded
    ];

    const trend = calculateLast30DaysTrend(answers);
    const totalCount = trend.reduce((sum, d) => sum + d.totalCount, 0);
    const wrongCount = trend.reduce((sum, d) => sum + d.wrongCount, 0);

    expect(totalCount).toBe(3); // excludes the 35-days-ago one
    expect(wrongCount).toBe(2);
  });

  it('entries have YYYY-MM-DD date format', () => {
    const trend = calculateLast30DaysTrend([]);
    trend.forEach((d) => {
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('getWeakTypes', () => {
  it('returns empty for no stats', () => {
    expect(getWeakTypes([])).toEqual([]);
  });

  it('returns top N by wrongRate descending', () => {
    const stats = calculatePassageTypeStats([
      makeAnswer(false, '인문'),
      makeAnswer(true, '인문'),  // 50% wrong
      makeAnswer(false, '과학'),
      makeAnswer(false, '과학'), // 100% wrong
      makeAnswer(true, '기술'),
      makeAnswer(true, '기술'),
      makeAnswer(true, '기술'), // 0% wrong
    ]);

    const weak = getWeakTypes(stats, 2);
    expect(weak).toHaveLength(2);
    expect(weak[0].subType).toBe('과학'); // highest wrong rate first
    expect(weak[1].subType).toBe('인문');
  });

  it('excludes types with zero total answers', () => {
    const stats = [
      { subType: '인문', label: '인문', category: '독서', total: 0, correct: 0, wrong: 0, accuracy: 0, wrongRate: 0 },
      { subType: '과학', label: '과학', category: '독서', total: 5, correct: 1, wrong: 4, accuracy: 20, wrongRate: 80 },
    ];
    const weak = getWeakTypes(stats);
    expect(weak).toHaveLength(1);
    expect(weak[0].subType).toBe('과학');
  });
});
