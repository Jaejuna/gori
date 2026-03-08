'use client';

import { useStudentAnalytics } from '@/hooks/useStudentAnalytics';
import { useRecommendations } from '@/hooks/useRecommendations';
import { PassageTypeRadar } from '@/components/charts/PassageTypeRadar';
import { ProgressLine } from '@/components/charts/ProgressLine';
import { RecommendationCard } from '@/components/recommendation/RecommendationCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const { data, isLoading, error } = useStudentAnalytics();
  const { data: recommendations, isLoading: recsLoading } = useRecommendations();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const isEmpty = !data || data.totalAnswered === 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 학습 현황</h1>
        <Button asChild>
          <Link href="/test">문제 풀기</Link>
        </Button>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-lg">아직 풀이 기록이 없어요.</p>
            <p className="mt-2 text-sm text-muted-foreground">문제를 풀면 분석 결과가 여기에 표시됩니다.</p>
            <Button asChild className="mt-6">
              <Link href="/test">첫 문제 풀어보기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">총 풀이 수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.totalAnswered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">정답 수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{data.totalCorrect}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">정답률</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {data.totalAnswered > 0
                    ? Math.round((data.totalCorrect / data.totalAnswered) * 100)
                    : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weak types TOP 3 */}
          {data.weakTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">가장 틀린 유형 TOP 3</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.weakTypes.map((wt, i) => (
                    <div key={wt.subType} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">#{i + 1}</span>
                        <Badge variant="secondary">{wt.category}</Badge>
                        <span className="font-medium">{wt.subType}</span>
                      </div>
                      <div className="text-right text-sm">
                        <span className="text-red-500 font-bold">{wt.wrongRate}% 오답률</span>
                        <span className="ml-2 text-muted-foreground">({wt.total}문제)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">지문 유형별 정답률</CardTitle>
            </CardHeader>
            <CardContent>
              <PassageTypeRadar stats={data.passageTypeStats} />
            </CardContent>
          </Card>

          {/* Line chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 30일 오답 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressLine trend={data.last30DaysTrend} />
            </CardContent>
          </Card>

          {/* Today's recommendations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">오늘의 추천</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/recommendations">전체 보기</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : !recommendations || recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  아직 풀이 기록이 없어요
                </p>
              ) : (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
