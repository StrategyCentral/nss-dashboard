import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function initBudgetsTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS monthly_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    period TEXT NOT NULL,
    budget REAL NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(channel, period)
  )`);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || new Date().toISOString().slice(0, 7);

  try {
    const db = getDb();
    initBudgetsTable(db);
    const rows = db.prepare('SELECT channel, budget, period FROM monthly_budgets WHERE period = ?').all(period) as any[];
    const budgets: Record<string, number> = {};
    for (const r of rows) budgets[r.channel] = r.budget;
    return NextResponse.json({ budgets, period });
  } catch {
    return NextResponse.json({ budgets: {}, period });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { channel, budget, period } = await req.json();
  if (!channel || budget === undefined) return NextResponse.json({ error: 'channel and budget required' }, { status: 400 });

  const p = period || new Date().toISOString().slice(0, 7);

  try {
    const db = getDb();
    initBudgetsTable(db);
    db.prepare('INSERT OR REPLACE INTO monthly_budgets (channel, period, budget) VALUES (?,?,?)').run(channel, p, parseFloat(budget));
    return NextResponse.json({ ok: true, channel, budget, period: p });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
