'use client';

import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationCard } from '@/components/recommendation/RecommendationCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RecommendationsPage() {
  const { data, isLoading, error } = useRecommendations();

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8 space-y-4">
        <h1 className="text-2xl font-bold">AI 추천 문제</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <h1 className="text-2xl font-bold mb-4">AI 추천 문제</h1>
        <p className="text-red-500">추천 문제를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI 추천 문제</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">대시보드</Link>
        </Button>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground text-lg">아직 풀이 기록이 없어요</p>
          <p className="mt-2 text-sm text-muted-foreground">
            문제를 풀면 AI가 취약 유형을 분석해 맞춤 문제를 추천해 드립니다.
          </p>
          <Button asChild className="mt-6">
            <Link href="/test">문제 풀러 가기</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
