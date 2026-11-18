import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPlatformDb, currentAccountId } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * Logins for the account being worked in. An account admin manages their own
 * account's users. ACE staff manage the users of whichever account they have
 * open, and can also add other ACE staff ({ staff: true }).
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getPlatformDb();
  const accountId = currentAccountId();
  const users = db.prepare('SELECT id, email, role, created_at, account_id FROM users WHERE account_id = ? ORDER BY id').all(accountId);
  const staff = session.platform
    ? db.prepare('SELECT id, email, role, created_at FROM users WHERE account_id IS NULL ORDER BY id').all()
    : [];
  return NextResponse.json({ users, staff, platform: session.platform });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { email, password, role, staff } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (staff && !session.platform) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getPlatformDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (email, password_hash, role, account_id) VALUES (?,?,?,?)')
      .run(String(email).trim().toLowerCase(), hash, role || 'viewer', staff ? null : currentAccountId());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  if (id === session.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  const db = getPlatformDb();
  const target = db.prepare('SELECT id, account_id FROM users WHERE id = ?').get(id) as any;
  if (!target) return NextResponse.json({ ok: true });
  // An account admin can only remove users of their own account.
  if (!session.platform && target.account_id !== session.accountId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
