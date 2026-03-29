import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, SESSION_USER } from './config';

const DEMO_USERNAME = 'user1';
const DEMO_PASSWORD = '12345';

export function validateDemoCredentials(username: string, password: string): boolean {
  return username === DEMO_USERNAME && password === DEMO_PASSWORD;
}

export async function getSessionUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return value === SESSION_USER ? SESSION_USER : null;
}

export function applyLoginCookie(response: NextResponse, username: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: username,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export function clearLoginCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
