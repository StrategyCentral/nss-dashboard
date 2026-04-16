import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM budget_channels WHERE active = 1 ORDER BY sort_order, id').all();
    return NextResponse.json({ channels: rows });
  } catch (e: any) {
    return NextResponse.json({ channels: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { key, name, color, icon } = await req.json();
  if (!key || !name) return NextResponse.json({ error: 'key and name required' }, { status: 400 });
  try {
    const db = getDb();
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM budget_channels').get() as any)?.m || 0;
    db.prepare('INSERT OR REPLACE INTO budget_channels (key, name, color, icon, sort_order, active) VALUES (?,?,?,?,?,1)')
      .run(key.toLowerCase().replace(/[^a-z0-9_]/g, '_'), name, color || '#888888', icon || '●', maxOrder + 1);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  try {
    const db = getDb();
    db.prepare('UPDATE budget_channels SET active = 0 WHERE key = ?').run(key);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
