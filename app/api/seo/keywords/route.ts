import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { SEO_KEYWORDS_EXTENDED } from '@/lib/seo-data';

function initKeywordsTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS seo_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    position INTEGER,
    prev_position INTEGER,
    volume INTEGER DEFAULT 0,
    url TEXT DEFAULT '',
    category TEXT DEFAULT 'Uncategorized',
    trend TEXT DEFAULT 'flat',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  const count = (db.prepare('SELECT COUNT(*) as c FROM seo_keywords').get() as any).c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO seo_keywords (keyword,position,prev_position,volume,url,category,trend) VALUES (?,?,?,?,?,?,?)');
    for (const k of SEO_KEYWORDS_EXTENDED) {
      insert.run(k.keyword, k.position, k.prev, k.volume, k.url, k.category, k.trend);
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    initKeywordsTable(db);
    const keywords = db.prepare('SELECT * FROM seo_keywords ORDER BY position ASC').all();
    return NextResponse.json({ keywords });
  } catch {
    return NextResponse.json({ keywords: SEO_KEYWORDS_EXTENDED.map(k => ({ ...k, prev_position: k.prev })) });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { keyword, position, volume, url, category } = body;
  if (!keyword) return NextResponse.json({ error: 'Keyword required' }, { status: 400 });
  try {
    const db = getDb();
    initKeywordsTable(db);
    const result = db.prepare('INSERT INTO seo_keywords (keyword,position,prev_position,volume,url,category,trend) VALUES (?,?,?,?,?,?,?)').run(
      keyword, position || null, position || null, volume || 0, url || '', category || 'Uncategorized', 'flat'
    );
    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  try {
    const db = getDb();
    db.prepare('DELETE FROM seo_keywords WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
