import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Brain, BarChart2, Users } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: '수능 국어 전 영역',
    desc: '독서·문학·화법과작문·언어와매체 — 지문 유형별로 집중 훈련',
  },
  {
    icon: Brain,
    title: 'AI 맞춤 추천',
    desc: '오답 패턴을 분석해 취약한 유형의 문제를 우선 추천',
  },
  {
    icon: BarChart2,
    title: '취약 영역 시각화',
    desc: '레이더 차트·오답 추이 그래프로 학습 현황을 한눈에',
  },
  {
    icon: Users,
    title: '선생님 대시보드',
    desc: '반 전체 현황과 관심 필요 학생을 즉시 파악',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span>📚</span>
          <span>수능 국어 AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">회원가입</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-4">AI 기반 수능 국어 학습</Badge>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          취약한 유형만 골라서<br />
          <span className="text-primary">집중 훈련</span>하세요
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          풀이 기록을 분석해 오답이 잦은 지문 유형을 찾아드립니다.
          AI가 추천하는 문제로 약점을 빠르게 보완하세요.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link href="/register">무료로 시작하기</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">로그인</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">주요 기능</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-2xl font-bold">지금 바로 시작해보세요</h2>
        <p className="mt-3 text-muted-foreground">학생이라면 선생님께 반 코드를 받아 가입하세요.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">학생 가입</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">선생님 가입</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © 2026 수능 국어 AI. All rights reserved.
      </footer>
    </div>
  );
}
