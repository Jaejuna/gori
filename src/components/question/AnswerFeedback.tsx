'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  correctAnswer: number;
  selectedOption: number;
  explanation?: string | null;
  onNext?: () => void;
  nextQuestionId?: string | null;
}

export function AnswerFeedback({
  isCorrect,
  correctAnswer,
  selectedOption,
  explanation,
  onNext,
  nextQuestionId,
}: AnswerFeedbackProps) {
  return (
    <div className={[
      'rounded-lg border p-4 space-y-3',
      isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50',
    ].join(' ')}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{isCorrect ? '✅' : '❌'}</span>
        <span className="font-bold text-lg">
          {isCorrect ? '정답입니다!' : '오답입니다.'}
        </span>
      </div>

      {!isCorrect && (
        <p className="text-sm text-muted-foreground">
          정답: <span className="font-semibold text-foreground">{correctAnswer}번</span>
          {' '}/ 선택: <span className="font-semibold text-foreground">{selectedOption}번</span>
        </p>
      )}

      {!isCorrect && explanation && (
        <div className="mt-2 rounded bg-white/60 p-3 text-sm leading-relaxed">
          <p className="mb-1 font-medium">해설</p>
          <p>{explanation}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {nextQuestionId ? (
          <Button asChild className="flex-1">
            <Link href={`/test/${nextQuestionId}`}>다음 문제</Link>
          </Button>
        ) : onNext ? (
          <Button onClick={onNext} className="flex-1">다음 문제</Button>
        ) : null}
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard">대시보드로</Link>
        </Button>
      </div>
    </div>
  );
}
