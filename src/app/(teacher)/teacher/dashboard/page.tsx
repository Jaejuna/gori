'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, Activity, TrendingUp, BookOpen, Copy, Check } from 'lucide-react';

interface DashboardData {
  totalStudents: number;
  activeThisWeek: number;
  avgCorrectRate: number | null;
  totalAnswersThisWeek: number;
  classWeakAreas: { label: string; category: string; wrongRate: number }[];
  needAttention: { id: string; name: string; recentCorrectRate: number | null }[];
  recentActivity: { studentName: string; questionCount: number; date: string }[];
  classCode: string | null;
}

export default function TeacherDashboard() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['teacher', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/teacher/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      return json.data as DashboardData;
    },
  });

  const handleCopyCode = () => {
    if (!data?.classCode) return;
    void navigator.clipboard.writeText(data.classCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statCards = [
    {
      title: '반 학생 수',
      value: data ? `${data.totalStudents}명` : '—',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: '이번 주 활동 학생',
      value: data ? `${data.activeThisWeek}명` : '—',
      icon: Activity,
      color: 'text-green-500',
    },
    {
      title: '반 평균 정답률',
      value: data?.avgCorrectRate != null ? `${data.avgCorrectRate}%` : '—',
      icon: TrendingUp,
      color: 'text-indigo-500',
    },
    {
      title: '이번 주 풀이 수',
      value: data ? `${data.totalAnswersThisWeek}문항` : '—',
      icon: BookOpen,
      color: 'text-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-5xl py-8">
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">반 현황 대시보드</h1>
        {data?.classCode && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">반 코드</span>
            <span className="font-mono font-bold tracking-widest">{data.classCode}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopyCode}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No students empty state */}
      {data?.totalStudents === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-3">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">아직 등록된 학생이 없습니다</p>
            <p className="text-sm text-muted-foreground text-center">
              학생에게 반 코드{' '}
              <span className="font-mono font-bold">{data?.classCode ?? '—'}</span>를
              공유하면 자동으로 배정됩니다.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.totalStudents > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Class weak areas bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">반 전체 취약 영역</CardTitle>
            </CardHeader>
            <CardContent>
              {data.classWeakAreas.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  아직 풀이 데이터가 없습니다.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.classWeakAreas}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={72}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v) => [`${String(v)}%`, '오답률']} />
                    <Bar dataKey="wrongRate" radius={[0, 4, 4, 0]}>
                      {data.classWeakAreas.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.wrongRate >= 60 ? '#ef4444' : entry.wrongRate >= 40 ? '#f97316' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Need attention students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">관심 필요 학생</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/teacher/students">전체 보기</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data.needAttention.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  관심이 필요한 학생이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.needAttention.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {s.recentCorrectRate !== null && s.recentCorrectRate < 30 && (
                          <Badge variant="destructive" className="text-xs">위험</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            s.recentCorrectRate !== null && s.recentCorrectRate < 40
                              ? 'text-red-500 font-bold'
                              : 'font-medium'
                          }
                        >
                          {s.recentCorrectRate != null ? `${s.recentCorrectRate}%` : '—'}
                        </span>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/teacher/students/${s.id}`}>상세</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent activity feed */}
      {data && data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recentActivity.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{a.studentName}</span>
                    {'이(가) '}
                    <span className="font-medium">{a.questionCount}문제</span>를 풀었습니다
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(a.date).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
