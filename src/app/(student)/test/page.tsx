'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
    try {
      // Create a session
      const sessionRes = await fetch('/api/sessions', { method: 'POST' });
      const sessionData = await sessionRes.json() as { success: boolean; data: { id: string } };
      if (!sessionData.success) return;

      // Get first question of selected type
      const qRes = await fetch(`/api/questions?passageTypeId=${selectedTypeId}&limit=1`);
      const qData = await qRes.json() as { success: boolean; data: { questions: { id: string }[] } };
      if (!qData.success || qData.data.questions.length === 0) return;

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
      <h1 className="mb-6 text-2xl font-bold">문제 풀기</h1>
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

      {passageTypes.length === 0 && (
        <p className="mt-4 text-center text-muted-foreground">
          등록된 지문 유형이 없습니다.
        </p>
      )}
    </div>
  );
}
