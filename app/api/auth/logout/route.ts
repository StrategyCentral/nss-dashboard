import { NextResponse } from 'next/server';
import { PASSWORD_COOKIE, SSO_COOKIE, ACCOUNT_COOKIE, cookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const name of [PASSWORD_COOKIE, SSO_COOKIE, ACCOUNT_COOKIE]) {
    res.cookies.set(name, '', cookieOptions(0));
  }
  // Sessions from before the cookie settings changed were plain (not partitioned).
  res.headers.append('Set-Cookie', `${PASSWORD_COOKIE}=; Path=/; Max-Age=0; HttpOnly`);
  return res;
}
