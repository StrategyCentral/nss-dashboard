import { NextRequest, NextResponse } from 'next/server';

/**
 * Cross-site request guard. The session cookie has to be SameSite=None so the
 * suite can run in a frame inside the ACE Customer Hub, so every request that
 * changes something must prove it came from this site's own pages: a POST,
 * PUT, PATCH or DELETE to /api whose Origin is another site is refused.
 * Requests with no Origin (schedulers, server-to-server) pass through and are
 * still checked by each route's own auth.
 */
export function middleware(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return NextResponse.next();
  const origin = req.headers.get('origin');
  if (!origin) return NextResponse.next();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  let originHost = '';
  try { originHost = new URL(origin).host; } catch {}
  if (host && originHost === host) return NextResponse.next();
  return NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 });
}

export const config = { matcher: ['/api/:path*'] };
