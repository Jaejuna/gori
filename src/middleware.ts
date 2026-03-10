import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/register'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (req.auth.user as { role?: string } | undefined)?.role;

  if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/student') && role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
