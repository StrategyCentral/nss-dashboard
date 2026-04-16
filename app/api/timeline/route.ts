import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  const limit = parseInt(url.searchParams.get('limit') || '200');
  try {
    const db = getDb();
    let query = 'SELECT * FROM timeline_events';
    const params: any[] = [];
    if (platform && platform !== 'all') {
      query += ' WHERE platform = ?';
      params.push(platform);
    }
    query += ' ORDER BY event_date DESC, id DESC LIMIT ?';
    params.push(limit);
    const rows = db.prepare(query).all(...params);
    return NextResponse.json({ events: rows });
  } catch (e: any) {
    return NextResponse.json({ events: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { event_date, platform, type, title, description, source, source_id } = await req.json();
  if (!event_date || !platform || !title) return NextResponse.json({ error: 'event_date, platform, title required' }, { status: 400 });
  try {
    const db = getDb();
    const result: any = db.prepare(
      'INSERT INTO timeline_events (event_date, platform, type, title, description, source, source_id) VALUES (?,?,?,?,?,?,?)'
    ).run(event_date, platform, type || 'general', title, description || null, source || 'manual', source_id || null);
    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, event_date, platform, type, title, description } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const db = getDb();
    db.prepare('UPDATE timeline_events SET event_date=?, platform=?, type=?, title=?, description=? WHERE id=?')
      .run(event_date, platform, type, title, description || null, id);
    return NextResponse.json({ ok: true });
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
    db.prepare('DELETE FROM timeline_events WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
