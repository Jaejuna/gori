'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QuestionOption } from '@/types/question';

interface QuestionCardProps {
  questionNumber: number;
  passage?: string | null;
  content: string;
  options: QuestionOption[];
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  difficulty?: string;
}

export function QuestionCard({
  questionNumber,
  passage,
  content,
  options,
  selectedOption,
  onSelectOption,
  onSubmit,
  isSubmitting = false,
  isSubmitted = false,
  difficulty,
}: QuestionCardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{questionNumber}번</span>
        {difficulty && (
          <Badge variant={difficulty === 'HARD' ? 'destructive' : difficulty === 'MEDIUM' ? 'secondary' : 'outline'}>
            {difficulty === 'HARD' ? '어려움' : difficulty === 'MEDIUM' ? '보통' : '쉬움'}
          </Badge>
        )}
      </div>

      {passage && (
        <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {passage}
        </div>
      )}

      <p className="text-base font-medium leading-relaxed">{content}</p>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.index}
            type="button"
            onClick={() => !isSubmitted && onSelectOption(option.index)}
            disabled={isSubmitted}
            className={[
              'w-full rounded-lg border p-3 text-left text-sm transition-colors',
              selectedOption === option.index
                ? 'border-primary bg-primary/10 font-medium'
                : 'border-border hover:bg-muted',
              isSubmitted ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="mr-2 font-semibold">{option.index}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {!isSubmitted && (
        <Button
          onClick={onSubmit}
          disabled={selectedOption === null || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '제출 중...' : '답안 제출'}
        </Button>
      )}
    </div>
  );
}
