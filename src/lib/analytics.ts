export interface AnswerRecord {
  isCorrect: boolean;
  createdAt: Date;
  question: {
    passageType: {
      subType: string;
      label: string;
      category: string;
    };
  };
}

export interface PassageTypeStat {
  subType: string;
  label: string;
  category: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number; // 0–100
  wrongRate: number; // 0–100
}

export interface DailyTrend {
  date: string; // YYYY-MM-DD
  wrongCount: number;
  totalCount: number;
}

export function calculatePassageTypeStats(answers: AnswerRecord[]): PassageTypeStat[] {
  const map: Record<string, PassageTypeStat> = {};

  for (const a of answers) {
    const { subType, label, category } = a.question.passageType;
    if (!map[subType]) {
      map[subType] = { subType, label, category, total: 0, correct: 0, wrong: 0, accuracy: 0, wrongRate: 0 };
    }
    map[subType].total += 1;
    if (a.isCorrect) {
      map[subType].correct += 1;
    } else {
      map[subType].wrong += 1;
    }
  }

  return Object.values(map).map((stat) => ({
    ...stat,
    accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    wrongRate: stat.total > 0 ? Math.round((stat.wrong / stat.total) * 100) : 0,
  }));
}

export function calculateLast30DaysTrend(answers: AnswerRecord[]): DailyTrend[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);

  const map: Record<string, { wrongCount: number; totalCount: number }> = {};

  for (const a of answers) {
    const d = new Date(a.createdAt);
    if (d < cutoff) continue;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!map[key]) map[key] = { wrongCount: 0, totalCount: 0 };
    map[key].totalCount += 1;
    if (!a.isCorrect) map[key].wrongCount += 1;
  }

  // Fill in all 30 days (including zeros)
  const result: DailyTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, ...(map[key] ?? { wrongCount: 0, totalCount: 0 }) });
  }

  return result;
}

export function getWeakTypes(stats: PassageTypeStat[], topN = 3): PassageTypeStat[] {
  return [...stats]
    .filter((s) => s.total > 0)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, topN);
}
