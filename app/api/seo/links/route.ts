import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  try {
    const db = getDb();
    let query = 'SELECT * FROM backlinks';
    const params: any[] = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ links: rows });
  } catch (e: any) {
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();

  // Bulk import
  if (Array.isArray(body.links)) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO backlinks (source_url, target_url, anchor_text, keyword, notes) VALUES (?,?,?,?,?)');
    let count = 0;
    for (const lnk of body.links) {
      if (lnk.source_url && lnk.target_url) {
        stmt.run(lnk.source_url.trim(), lnk.target_url.trim(), lnk.anchor_text || null, lnk.keyword || null, lnk.notes || null);
        count++;
      }
    }
    return NextResponse.json({ ok: true, count });
  }

  // Single
  const { source_url, target_url, anchor_text, keyword, notes } = body;
  if (!source_url || !target_url) return NextResponse.json({ error: 'source_url and target_url required' }, { status: 400 });
  try {
    const db = getDb();
    const result: any = db.prepare('INSERT INTO backlinks (source_url, target_url, anchor_text, keyword, notes) VALUES (?,?,?,?,?)')
      .run(source_url.trim(), target_url.trim(), anchor_text || null, keyword || null, notes || null);
    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const db = getDb();
    db.prepare('DELETE FROM backlinks WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
