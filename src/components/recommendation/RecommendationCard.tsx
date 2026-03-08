import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Recommendation } from '@/hooks/useRecommendations';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

const DIFFICULTY_COLOR: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  EASY: 'secondary',
  MEDIUM: 'outline',
  HARD: 'destructive',
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { question, reason, source } = recommendation;
  const difficulty = question.difficulty;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{question.passageType.label}</Badge>
            <Badge variant={DIFFICULTY_COLOR[difficulty] ?? 'outline'}>
              {DIFFICULTY_LABEL[difficulty] ?? difficulty}
            </Badge>
            {source === 'AI' && (
              <Badge variant="outline" className="text-xs">AI 추천</Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-sm font-normal text-muted-foreground mt-1">
          {reason}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm line-clamp-2 mb-4">
          {question.content}
        </p>
        <Button asChild size="sm">
          <Link href={`/test/${question.id}`}>바로 풀기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
