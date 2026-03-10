'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PassageType {
  id: string;
  category: string;
  subType: string;
  label: string;
}

interface GroupedTypes {
  [category: string]: PassageType[];
}

export default function TestStartPage() {
  const router = useRouter();
  const [passageTypes, setPassageTypes] = useState<PassageType[]>([]);
  const [grouped, setGrouped] = useState<GroupedTypes>({});
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [noQuestionsError, setNoQuestionsError] = useState(false);

  const fetchPassageTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/passage-types');
      const data = await res.json() as { success: boolean; data: { passageTypes: PassageType[]; grouped: GroupedTypes } };
      if (data.success) {
        setPassageTypes(data.data.passageTypes);
        setGrouped(data.data.grouped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPassageTypes();
  }, [fetchPassageTypes]);

  async function handleStart() {
    if (!selectedTypeId) return;
    setStarting(true);
    setNoQuestionsError(false);
    try {
      // Create a session
      const sessionRes = await fetch('/api/sessions', { method: 'POST' });
      const sessionData = await sessionRes.json() as { success: boolean; data: { id: string } };
      if (!sessionData.success) return;

      // Get first question of selected type
      const qRes = await fetch(`/api/questions?passageTypeId=${selectedTypeId}&limit=1`);
      const qData = await qRes.json() as { success: boolean; data: { questions: { id: string }[] } };
      if (!qData.success || qData.data.questions.length === 0) {
        setNoQuestionsError(true);
        return;
      }

      const firstQuestion = qData.data.questions[0];
      router.push(`/test/${firstQuestion.id}?sessionId=${sessionData.data.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">문제 풀기</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">홈으로</Link>
        </Button>
      </div>
      <p className="mb-4 text-muted-foreground">풀고 싶은 지문 유형을 선택하세요.</p>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, types]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {types.map((pt) => (
                  <Badge
                    key={pt.id}
                    variant={selectedTypeId === pt.id ? 'default' : 'outline'}
                    className="cursor-pointer select-none py-1 px-3 text-sm"
                    onClick={() => setSelectedTypeId(pt.id)}
                  >
                    {pt.subType}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button
          className="w-full"
          disabled={!selectedTypeId || starting}
          onClick={handleStart}
        >
          {starting ? '시작 중...' : '문제 시작'}
        </Button>
      </div>

      {noQuestionsError && (
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-center text-sm text-orange-700">
          선택한 지문 유형에 등록된 문제가 없습니다. 다른 유형을 선택해 주세요.
        </div>
      )}

      {passageTypes.length === 0 && (
        <p className="mt-4 text-center text-muted-foreground">
          등록된 지문 유형이 없습니다.
        </p>
      )}
    </div>
  );
}
