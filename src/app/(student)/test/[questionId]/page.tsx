'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QuestionCard } from '@/components/question/QuestionCard';
import { AnswerFeedback } from '@/components/question/AnswerFeedback';
import type { QuestionOption } from '@/types/question';

interface QuestionDetail {
  id: string;
  year: number;
  month: number;
  number: number;
  passage?: string | null;
  content: string;
  options: QuestionOption[];
  answer: number;
  explanation?: string | null;
  difficulty: string;
  passageType: { category: string; subType: string; label: string };
}

interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation?: string | null;
}

export default function QuestionPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fetchQuestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions/${questionId}`);
      const data = await res.json() as { success: boolean; data: QuestionDetail; error?: string };
      if (data.success) {
        setQuestion(data.data);
        startTimeRef.current = Date.now();
      } else {
        setError(data.error ?? '문제를 불러올 수 없습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    void fetchQuestion();
  }, [fetchQuestion]);

  async function handleSubmit() {
    if (!selectedOption || !sessionId) return;
    setSubmitting(true);

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedOption, timeSpent }),
      });
      const data = await res.json() as { success: boolean; data: AnswerResult };
      if (data.success) {
        setResult(data.data);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }

  if (error || !question) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        {error || '문제를 찾을 수 없습니다.'}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>{question.passageType.label}</span>
        <span>{question.year}학년도 {question.month}월</span>
      </div>

      <QuestionCard
        questionNumber={question.number}
        passage={question.passage}
        content={question.content}
        options={question.options}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        isSubmitted={!!result}
        difficulty={question.difficulty}
      />

      {result && (
        <div className="mt-6">
          <AnswerFeedback
            isCorrect={result.isCorrect}
            correctAnswer={result.correctAnswer}
            selectedOption={selectedOption ?? 0}
            explanation={result.explanation}
          />
        </div>
      )}
    </div>
  );
}
