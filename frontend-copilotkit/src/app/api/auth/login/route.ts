import { NextRequest, NextResponse } from 'next/server';
import { applyLoginCookie, validateDemoCredentials } from '@/lib/auth';
import { SESSION_USER } from '@/lib/config';

interface LoginRequestBody {
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginRequestBody;
  const username = body.username?.trim() ?? '';
  const password = body.password ?? '';

  if (!validateDemoCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  applyLoginCookie(response, SESSION_USER);
  return response;
}
