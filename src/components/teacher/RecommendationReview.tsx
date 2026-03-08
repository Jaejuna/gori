'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ReviewRec {
  id: string;
  reason: string;
  score: number;
  source: string;
  isReviewedByTeacher: boolean;
  teacherApproved: boolean | null;
  question: {
    id: string;
    content: string;
    passageType: { label: string };
  };
}

interface RecommendationReviewProps {
  recommendations: ReviewRec[];
  studentId: string;
  onUpdate?: () => void;
}

export function RecommendationReview({ recommendations, studentId, onUpdate }: RecommendationReviewProps) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function handleDecision(recId: string, approved: boolean) {
    setPending((p) => new Set([...p, recId]));
    try {
      await fetch(`/api/teacher/students/${studentId}/recommendations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId, approved }),
      });
      onUpdate?.();
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(recId);
        return next;
      });
    }
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">추천 문제가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => {
        const isLoading = pending.has(rec.id);
        const reviewed = rec.isReviewedByTeacher;

        return (
          <Card key={rec.id}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{rec.question.passageType.label}</Badge>
                    {rec.source === 'TEACHER_ADDED' && (
                      <Badge variant="outline" className="text-xs">직접 추가</Badge>
                    )}
                    {reviewed && (
                      <Badge
                        variant={rec.teacherApproved ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {rec.teacherApproved ? '승인됨' : '제외됨'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{rec.reason}</p>
                  <p className="text-sm line-clamp-1">{rec.question.content}</p>
                </div>
                {!reviewed && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleDecision(rec.id, true)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleDecision(rec.id, false)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      제외
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
