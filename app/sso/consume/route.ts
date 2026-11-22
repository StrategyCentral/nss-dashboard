export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPlatformDb } from '@/lib/db';
import { signToken, SSO_COOKIE, cookieOptions } from '@/lib/auth';

/**
 * GET /sso/consume?token=<hub jwt>&next=/dashboard/seo
 *
 * Where the ACE Customer Hub lands people (Hub: /api/sso/launch?to=marketing-suite).
 * One login, the Hub's: nobody types a password here.
 *
 *   no token            -> back to the Hub launch (which handles its own login)
 *   bad / expired token -> /no-access (never loop back to the Hub)
 *   Hub admin           -> signed in as ACE staff: every customer account
 *   email already has a login here -> signed in as that user, in their account
 *   anyone else         -> /no-access
 *
 * The token is checked with the shared secret when HUB_JWT_SECRET is set on
 * this service. Without it, the Hub is asked to verify its own token, so
 * the suite works with no extra setup.
 */
const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL || process.env.HUB_URL || 'https://dashboard.acetradingbots.com').replace(/\/$/, '');
const STAFF_ROLES = (process.env.SUITE_STAFF_ROLES || 'admin,super_admin').split(',').map(r => r.trim()).filter(Boolean);
const SSO_TTL_SECONDS = 60 * 60 * 12;

function publicUrl(request: NextRequest, path: string): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return host ? new URL(path, `${proto}://${host}`).toString() : new URL(path, request.url).toString();
}

// After signing in, the only /api path allowed as a landing spot: opening a linked app.
const APP_LAUNCH = /^\/api\/apps\/[a-z0-9-]{1,40}\/launch$/;

function safeNext(next: string | null): string {
  if (next && APP_LAUNCH.test(next)) return next;
  if (!next || next === '/' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')
    || /[\u0000-\u001f\u007f]/.test(next) || next.startsWith('/sso') || next.startsWith('/api/')) return '/dashboard';
  try {
    const base = 'https://suite.invalid';
    if (new URL(next, base).origin !== base) return '/dashboard';
  } catch {
    return '/dashboard';
  }
  return next;
}

async function verifyHubToken(token: string): Promise<{ email: string; hub_user_id: string; role?: string } | null> {
  const secret = process.env.HUB_JWT_SECRET;
  if (secret) {
    try {
      const p = jwt.verify(token, secret, { issuer: 'ace-hub', algorithms: ['HS256'] }) as any;
      if (typeof p?.email !== 'string' || typeof p?.hub_user_id !== 'string') return null;
      return { email: p.email, hub_user_id: p.hub_user_id, role: p.role };
    } catch {
      return null;
    }
  }
  try {
    const r = await fetch(`${HUB_URL}/api/sso/verify?token=${encodeURIComponent(token)}`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.ok || typeof d.email !== 'string' || typeof d.hub_user_id !== 'string') return null;
    return { email: d.email, hub_user_id: d.hub_user_id, role: d.role };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    const launch = `${HUB_URL}/api/sso/launch?to=marketing-suite${next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : ''}`;
    return NextResponse.redirect(launch);
  }

  const hub = await verifyHubToken(token);
  if (!hub) return NextResponse.redirect(publicUrl(request, '/no-access?reason=token'));

  const email = hub.email.trim().toLowerCase();
  const isStaff = !!hub.role && STAFF_ROLES.includes(hub.role);
  const db = getPlatformDb();
  let user = db.prepare('SELECT id, email, role, account_id FROM users WHERE lower(email) = ?').get(email) as any;

  if (isStaff) {
    if (!user) {
      // First visit by a Hub admin: give them a staff login. The password is random
      // and never shown: they always arrive through the Hub.
      const hash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
      const info = db.prepare('INSERT INTO users (email, password_hash, role, account_id, hub_user_id) VALUES (?,?,?,NULL,?)')
        .run(email, hash, 'admin', hub.hub_user_id);
      user = { id: Number(info.lastInsertRowid), email, role: 'admin', account_id: null };
    } else if (user.account_id != null || user.role !== 'admin') {
      // A Hub admin is ACE staff here, whatever this login was before.
      db.prepare('UPDATE users SET account_id = NULL, role = ?, hub_user_id = ? WHERE id = ?').run('admin', hub.hub_user_id, user.id);
      user = { ...user, role: 'admin', account_id: null };
    }
  }
  if (!user) return NextResponse.redirect(publicUrl(request, '/no-access?reason=role'));

  const session = signToken({ id: user.id, email: user.email, role: user.role });
  const res = NextResponse.redirect(publicUrl(request, next));
  res.cookies.set(SSO_COOKIE, session, cookieOptions(SSO_TTL_SECONDS));
  return res;
}
