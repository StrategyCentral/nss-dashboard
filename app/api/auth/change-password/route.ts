import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { getPlatformDb } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

/** Change the signed-in user's own password: current + new (12+ characters). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`chpw:${session.id}:${clientIp(req.headers)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({} as any));
  const current = String(body.current_password || '');
  const next = String(body.new_password || '');
  if (!current || !next) return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  if (next.length < 12) return NextResponse.json({ error: 'New password must be at least 12 characters' }, { status: 400 });
  if (next.length > 200) return NextResponse.json({ error: 'New password is too long' }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'New password must be different' }, { status: 400 });

  const db = getPlatformDb();
  const row = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(session.id) as { id: number; password_hash: string } | undefined;
  if (!row) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!row.password_hash || !bcrypt.compareSync(current, row.password_hash)) {
    return NextResponse.json({ error: 'Current password is wrong' }, { status: 400 });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), row.id);
  return NextResponse.json({ ok: true });
}
