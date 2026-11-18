import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession, ACCOUNT_COOKIE, cookieOptions } from '@/lib/auth';
import { getPlatformDb } from '@/lib/db';
import { createAccount, getAccount, getAccountById, listAccounts, updateAccount, cleanDomain } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * Customer accounts. Each one has its own data file, connections and users.
 *
 *   GET            ACE staff: every account, with its user count. Others: their own.
 *   POST           ACE staff admins:
 *                    { action: 'create', name, domain, email?, password? }  new customer (+ their first login)
 *                    { action: 'update', id, name, domain }
 *                  ACE staff:
 *                    { action: 'switch', id }                               work in that account
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const current = getAccount();
  if (!session.platform) return NextResponse.json({ accounts: [current], current: current.id, platform: false });
  const counts = getPlatformDb().prepare('SELECT account_id, COUNT(*) AS n FROM users WHERE account_id IS NOT NULL GROUP BY account_id').all() as any[];
  const byId = new Map(counts.map(c => [c.account_id, c.n]));
  return NextResponse.json({
    accounts: listAccounts().map(a => ({ ...a, users: byId.get(a.id) || 0 })),
    current: current.id,
    platform: true,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.platform) return NextResponse.json({ error: 'Only ACE staff can manage customer accounts.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === 'switch') {
    const account = getAccountById(Number(body.id));
    if (!account) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
    const res = NextResponse.json({ ok: true, account });
    res.cookies.set(ACCOUNT_COOKIE, String(account.id), cookieOptions());
    return res;
  }

  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (action === 'create') {
    const name = String(body.name || '').trim();
    const domain = cleanDomain(body.domain || '');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!name) return NextResponse.json({ error: 'Give the customer a name.' }, { status: 400 });
    if (email && password.length < 8) return NextResponse.json({ error: 'The first login needs a password of 8 characters or more.' }, { status: 400 });
    const pdb = getPlatformDb();
    if (email && pdb.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return NextResponse.json({ error: 'That email already has a login.' }, { status: 409 });
    }
    const account = createAccount(name, domain);
    if (email) {
      pdb.prepare('INSERT INTO users (email, password_hash, role, account_id) VALUES (?,?,?,?)')
        .run(email, bcrypt.hashSync(password, 10), 'admin', account.id);
    }
    return NextResponse.json({ ok: true, account });
  }

  if (action === 'update') {
    const account = getAccountById(Number(body.id));
    if (!account) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Give the customer a name.' }, { status: 400 });
    updateAccount(account.id, name, body.domain || '');
    return NextResponse.json({ ok: true, account: getAccountById(account.id) });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
