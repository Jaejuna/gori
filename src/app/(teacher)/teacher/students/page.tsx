'use client';

import { useQuery } from '@tanstack/react-query';
import { StudentTable } from '@/components/teacher/StudentTable';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  totalAnswered: number;
  accuracy: number | null;
  lastActive: string | null;
  weakestType: { label: string; category: string; wrongRate: number } | null;
}

export default function TeacherStudentsPage() {
  const { data, isLoading, error } = useQuery<StudentSummary[]>({
    queryKey: ['teacher', 'students'],
    queryFn: async () => {
      const res = await fetch('/api/teacher/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">학생 목록</h1>
        <Button asChild variant="outline">
          <Link href="/teacher/dashboard">대시보드</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500">학생 목록을 불러오는 중 오류가 발생했습니다.</p>
      ) : (
        <StudentTable students={data ?? []} />
      )}
    </div>
  );
}
