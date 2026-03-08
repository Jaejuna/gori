'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudentSummary {
  id: string;
  name: string;
  accuracy: number | null;
  weakestType: { label: string; wrongRate: number } | null;
}

export default function TeacherDashboard() {
  const { data, isLoading, error } = useQuery<StudentSummary[]>({
    queryKey: ['teacher', 'students'],
    queryFn: async () => {
      const res = await fetch('/api/teacher/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      const json = await res.json();
      return json.data;
    },
  });

  const studentCount = data?.length ?? 0;
  const lowAccuracyStudents = data?.filter((s) => s.accuracy !== null && s.accuracy < 50) ?? [];

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">선생님 대시보드</h1>
        <Button asChild>
          <Link href="/teacher/students">학생 목록 전체 보기</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">반 학생 수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{studentCount}명</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">정답률 50% 미만</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">{lowAccuracyStudents.length}명</p>
              </CardContent>
            </Card>
          </div>

          {lowAccuracyStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">주의가 필요한 학생</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowAccuracyStudents.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        {s.weakestType && (
                          <Badge variant="secondary" className="text-xs">{s.weakestType.label}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 font-bold">{s.accuracy}%</span>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/teacher/students/${s.id}`}>상세</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
