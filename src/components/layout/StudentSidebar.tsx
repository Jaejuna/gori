'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, BookOpen, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '내 대시보드', icon: LayoutDashboard },
  { href: '/test', label: '문제 풀기', icon: BookOpen },
  { href: '/recommendations', label: 'AI 추천 문제', icon: Sparkles },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <span>📚</span>
          <span>수능 국어 AI</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t">
        <div className="mb-2 px-3 py-1 text-xs text-muted-foreground truncate">
          {session?.user?.name ?? session?.user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => void signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </aside>
  );
}
