import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';

/**
 * OAuth CSRF protection. The start route (admin only) stores a random state
 * in an httpOnly cookie and sends it to the provider; the callback only
 * accepts a code when an admin is signed in and the returned state matches.
 */
const cookieName = (provider: string) => `oauth_state_${provider}`;

export function newOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setOAuthStateCookie(res: NextResponse, provider: string, state: string): NextResponse {
  res.cookies.set(cookieName(provider), state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/oauth',
    maxAge: 10 * 60,
  });
  return res;
}

function clearStateCookie(res: NextResponse, provider: string): NextResponse {
  res.cookies.set(cookieName(provider), '', { path: '/api/oauth', maxAge: 0 });
  return res;
}

/**
 * Returns null when the callback may proceed, else a short error code for the
 * redirect (?error=<provider>_<code>).
 */
export async function checkOAuthCallback(req: NextRequest, provider: string): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== 'admin') return 'auth';
  const expected = req.cookies.get(cookieName(provider))?.value || '';
  const got = new URL(req.url).searchParams.get('state') || '';
  if (!expected || !got || expected.length !== got.length) return 'state';
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))) return 'state';
  return null;
}

/** Redirect and drop the one-time state cookie. */
export function oauthRedirect(url: string, provider: string): NextResponse {
  return clearStateCookie(NextResponse.redirect(url), provider);
}
