import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getPlatformDb } from './db';

/**
 * Sign-in for ACE Marketing Suite. Two doors, one session shape:
 *  - email + password on this site      -> cookie `nss_token`
 *  - the ACE Customer Hub (/sso/consume) -> cookie `ams_session`, which also
 *    works when the suite is shown inside the Hub in a frame.
 *
 * A user belongs to one customer account, or to none: ACE staff, who can
 * open every account and manage them.
 */
const SECRET = process.env.JWT_SECRET || 'nss-dashboard-secret-change-me';

export const PASSWORD_COOKIE = 'nss_token';
export const SSO_COOKIE = 'ams_session';
export const ACCOUNT_COOKIE = 'ams_account';
export const SESSION_COOKIES = [SSO_COOKIE, PASSWORD_COOKIE];
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  id: number;
  email: string;
  role: string;
  /** The customer account this user belongs to. null = ACE staff. */
  accountId: number | null;
  /** ACE staff: can see and manage every account. */
  platform: boolean;
}

export function signToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

/**
 * The signed-in user, read fresh from the users table on every request, so a
 * removed user or a changed role takes effect at once.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIES) {
    const token = cookieStore.get(name)?.value;
    const claims = token ? verifyToken(token) : null;
    if (!claims) continue;
    const user = getPlatformDb().prepare('SELECT id, email, role, account_id FROM users WHERE id = ?').get(claims.id) as any;
    if (!user) continue;
    return { id: user.id, email: user.email, role: user.role, accountId: user.account_id ?? null, platform: user.account_id == null };
  }
  return null;
}

/**
 * Cookie settings. In production the cookie is `SameSite=None; Secure;
 * Partitioned` so it is kept when the suite runs in a frame inside the Hub
 * (a different site), and is only ever sent back under that same top-level
 * site. Plain Lax in local dev, where there is no HTTPS.
 */
export function cookieOptions(maxAge = SESSION_TTL_SECONDS) {
  const prod = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    maxAge,
    secure: prod,
    sameSite: (prod ? 'none' : 'lax') as 'none' | 'lax',
    ...(prod ? { partitioned: true } : {}),
  };
}
