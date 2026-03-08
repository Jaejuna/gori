'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  totalAnswered: number;
  accuracy: number | null;
  lastActive: string | null;
  weakestType: { label: string; category: string; wrongRate: number } | null;
}

interface StudentTableProps {
  students: StudentSummary[];
}

type SortKey = 'name' | 'accuracy' | 'lastActive';

export function StudentTable({ students }: StudentTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('accuracy');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === 'accuracy') {
        const aVal = a.accuracy ?? -1;
        const bVal = b.accuracy ?? -1;
        cmp = aVal - bVal;
      } else if (sortKey === 'lastActive') {
        const aVal = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const bVal = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        cmp = aVal - bVal;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function sortIndicator(k: SortKey): string {
    if (sortKey !== k) return ' ↕';
    return sortAsc ? ' ↑' : ' ↓';
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="학생 이름 또는 이메일 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {sorted.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">
            {search ? '검색 결과가 없습니다.' : '아직 등록된 학생이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('name')}>
                    이름 {sortIndicator('name')}
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden md:table-cell">취약 유형</th>
                <th className="text-right p-3 font-medium">
                  <button onClick={() => handleSort('accuracy')}>
                    정답률 {sortIndicator('accuracy')}
                  </button>
                </th>
                <th className="text-right p-3 font-medium hidden md:table-cell">
                  <button onClick={() => handleSort('lastActive')}>
                    최근 활동 {sortIndicator('lastActive')}
                  </button>
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                  <td className="p-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-muted-foreground text-xs">{s.email}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {s.weakestType ? (
                      <div>
                        <Badge variant="secondary" className="text-xs">{s.weakestType.label}</Badge>
                        <span className="ml-2 text-red-500 text-xs">{s.weakestType.wrongRate}% 오답</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">데이터 없음</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {s.accuracy !== null ? (
                      <span className={s.accuracy < 50 ? 'text-red-500 font-bold' : 'font-medium'}>
                        {s.accuracy}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    <p className="text-xs text-muted-foreground">{s.totalAnswered}문제</p>
                  </td>
                  <td className="p-3 text-right hidden md:table-cell text-xs text-muted-foreground">
                    {s.lastActive ? new Date(s.lastActive).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/teacher/students/${s.id}`}>상세</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
