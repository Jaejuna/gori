'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecommendationReview } from '@/components/teacher/RecommendationReview';

interface PassageTypeStat {
  passageTypeId: string;
  label: string;
  category: string;
  total: number;
  wrong: number;
  wrongRate: number;
}

interface WrongAnswer {
  questionId: string;
  content: string;
  passageTypeLabel: string;
  answeredAt: string;
}

interface Rec {
  id: string;
  reason: string;
  score: number;
  source: string;
  isReviewedByTeacher: boolean;
  teacherApproved: boolean | null;
  question: { id: string; content: string; passageType: { label: string } };
}

interface StudentDetail {
  student: { id: string; name: string; email: string };
  passageTypeStats: PassageTypeStat[];
  recentWrong: WrongAnswer[];
  recommendations: Rec[];
  totalAnswered: number;
  totalCorrect: number;
}

export default function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<StudentDetail>({
    queryKey: ['teacher', 'student', studentId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/students/${studentId}`);
      if (!res.ok) throw new Error('Failed to fetch student detail');
      const json = await res.json();
      return json.data;
    },
  });

  function handleReviewUpdate() {
    queryClient.invalidateQueries({ queryKey: ['teacher', 'student', studentId] });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <p className="text-red-500">학생 데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const { student, passageTypeStats, recentWrong, recommendations, totalAnswered, totalCorrect } = data;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const sortedStats = [...passageTypeStats].sort((a, b) => b.wrongRate - a.wrongRate);

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/teacher/students">목록으로</Link>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 풀이</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAnswered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">정답</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalCorrect}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">정답률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${accuracy !== null && accuracy < 50 ? 'text-red-500' : ''}`}>
              {accuracy !== null ? `${accuracy}%` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Passage type wrong rate */}
      {sortedStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">지문 유형별 오답률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedStats.map((stat) => (
                <div key={stat.passageTypeId} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{stat.label}</Badge>
                    <span className="text-xs text-muted-foreground">{stat.total}문제</span>
                  </div>
                  <span className={`font-bold text-sm ${stat.wrongRate >= 50 ? 'text-red-500' : ''}`}>
                    {stat.wrongRate}% 오답
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent wrong answers */}
      {recentWrong.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 오답 문제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentWrong.map((w) => (
                <div key={w.questionId} className="flex items-center gap-3 rounded-lg border p-3">
                  <Badge variant="outline" className="text-xs shrink-0">{w.passageTypeLabel}</Badge>
                  <p className="text-sm line-clamp-1 flex-1">{w.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 추천 목록 검토</CardTitle>
        </CardHeader>
        <CardContent>
          <RecommendationReview
            recommendations={recommendations}
            studentId={studentId}
            onUpdate={handleReviewUpdate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
