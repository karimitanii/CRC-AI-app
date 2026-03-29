import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/config';

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value === 'user1';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (pathname.startsWith('/chat') && !authenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/login') && authenticated) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  if (
    pathname.startsWith('/api/mastra') && !authenticated
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (
    pathname.startsWith('/api/auth') &&
    !pathname.startsWith('/api/auth/login') &&
    !authenticated
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (pathname.startsWith('/api/copilotkit') && !authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/api/auth/:path*', '/api/mastra/:path*', '/api/copilotkit/:path*'],
};
