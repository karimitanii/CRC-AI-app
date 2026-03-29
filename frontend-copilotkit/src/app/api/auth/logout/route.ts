import { NextResponse } from 'next/server';
import { clearLoginCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearLoginCookie(response);
  return response;
}
