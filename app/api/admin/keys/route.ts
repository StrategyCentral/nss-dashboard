import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = getDb();
  const rows = db.prepare('SELECT service, key_name FROM api_keys').all() as any[];
  const keys: Record<string, string> = {};
  rows.forEach(r => { keys[r.service] = '••••••••'; });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { service, key_name, key_value } = await req.json();
  if (!service || !key_value) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const db = getDb();
  db.prepare('INSERT INTO api_keys (service, key_name, key_value) VALUES (?,?,?) ON CONFLICT(service) DO UPDATE SET key_value=excluded.key_value, updated_at=datetime("now")').run(service, key_name, key_value);
  return NextResponse.json({ ok: true });
}
