'use client';

import { useQuery } from '@tanstack/react-query';
import type { PassageTypeStat, DailyTrend } from '@/lib/analytics';

interface AnalyticsData {
  totalAnswered: number;
  totalCorrect: number;
  passageTypeStats: PassageTypeStat[];
  last30DaysTrend: DailyTrend[];
  weakTypes: PassageTypeStat[];
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch('/api/analytics/student');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  const json = await res.json() as { success: boolean; data: AnalyticsData };
  if (!json.success) throw new Error('Analytics fetch failed');
  return json.data;
}

export function useStudentAnalytics() {
  return useQuery({
    queryKey: ['student-analytics'],
    queryFn: fetchAnalytics,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
