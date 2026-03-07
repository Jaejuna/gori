'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { PassageTypeStat } from '@/lib/analytics';

interface PassageTypeRadarProps {
  stats: PassageTypeStat[];
}

export function PassageTypeRadar({ stats }: PassageTypeRadarProps) {
  const data = stats.map((s) => ({
    subject: s.subType,
    accuracy: s.accuracy,
    fullMark: 100,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        아직 풀이 데이터가 없습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="정답률"
          dataKey="accuracy"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.4}
        />
        <Tooltip formatter={(value) => [`${String(value)}%`, '정답률']} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
