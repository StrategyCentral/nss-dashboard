import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getDb } from '../../../../lib/db';

const SENSITIVE = ['secret', 'token', 'json', 'key', 'password'];
const isSensitive = (s: string) => SENSITIVE.some(k => s.includes(k));

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const db = getDb();
    const rows = db.prepare('SELECT service, key_value FROM api_keys').all() as any[];
    const keys: Record<string, string> = {};
    rows.forEach(r => {
      // Return actual value for non-sensitive fields (IDs, URLs) so UI can display them
      keys[r.service] = isSensitive(r.service) ? '••••••••' : r.key_value;
    });
    return NextResponse.json({ keys });
  } catch (e: any) {
    console.error('[API Keys GET]', e.message);
    return NextResponse.json({ keys: {} });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { service, key_value } = await req.json();
    if (!service || key_value === undefined || key_value === '') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const db = getDb();
    // Fixed: use single quotes inside SQL so datetime('now') works correctly in SQLite
    db.prepare(
      "INSERT INTO api_keys (service, key_name, key_value) VALUES (?, ?, ?) ON CONFLICT(service) DO UPDATE SET key_value = excluded.key_value, updated_at = datetime('now')"
    ).run(service, service, key_value);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[API Keys POST]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
