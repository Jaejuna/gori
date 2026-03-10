'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type Role = 'STUDENT' | 'TEACHER';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('STUDENT');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role, classCode: classCode || undefined }),
      });

      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? '회원가입에 실패했습니다.');
        return;
      }

      router.push('/login');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div className="flex gap-2">
              {(['STUDENT', 'TEACHER'] as Role[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  variant={role === r ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole(r)}
                >
                  {r === 'STUDENT' ? '학생' : '선생님'}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {role === 'STUDENT' && (
              <div className="space-y-2">
                <Label htmlFor="classCode">반 코드 <span className="text-red-500">*</span></Label>
                <Input
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="선생님에게 받은 6자리 코드"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">선생님에게 반 코드를 받아야 가입할 수 있습니다.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
