'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyTrend } from '@/lib/analytics';

interface ProgressLineProps {
  trend: DailyTrend[];
}

export function ProgressLine({ trend }: ProgressLineProps) {
  // Show only last 14 days for readability, labeled MM/DD
  const data = trend.slice(-14).map((d) => ({
    date: d.date.slice(5), // MM-DD
    오답수: d.wrongCount,
    풀이수: d.totalCount,
  }));

  const hasData = trend.some((d) => d.totalCount > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
        아직 풀이 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="오답수" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="풀이수" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
