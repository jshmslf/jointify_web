import { NextRequest, NextResponse } from 'next/server';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
const PROTECTED_ROUTES = [
  '/dashboard',
  '/transactions',
  '/accounts',
  '/debts',
  '/goals',
  '/budgets',
  '/reports',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/login/:path*',
    '/register',
    '/register/:path*',
    '/forgot-password',
    '/forgot-password/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/transactions',
    '/transactions/:path*',
    '/accounts',
    '/accounts/:path*',
    '/debts',
    '/debts/:path*',
    '/goals',
    '/goals/:path*',
    '/budgets',
    '/budgets/:path*',
    '/reports',
    '/reports/:path*',
  ],
};
