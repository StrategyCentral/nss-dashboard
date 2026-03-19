import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  const costs = db.prepare('SELECT * FROM seo_costs ORDER BY year DESC, month DESC').all();
  return NextResponse.json({ costs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { year, month, cost, notes } = await req.json();
  if (!year || !month || cost == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const db = getDb();
  db.prepare('INSERT INTO seo_costs (year, month, cost, notes) VALUES (?,?,?,?) ON CONFLICT(year, month) DO UPDATE SET cost=excluded.cost, notes=excluded.notes').run(year, month, cost, notes || '');
  return NextResponse.json({ ok: true });
}
