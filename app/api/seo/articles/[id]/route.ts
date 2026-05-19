import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function computeWordCount(html: string): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ article });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    const body = await req.json();
    const existing: any = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed: any = {};
    const fields = ['title','keyword','page_type','content_html','content_md','meta_description','source_text','brand_voice_id','status'];
    for (const f of fields) if (f in body) allowed[f] = body[f];

    const nextHtml = 'content_html' in allowed ? allowed.content_html : existing.content_html;
    const nextMd = 'content_md' in allowed ? allowed.content_md : existing.content_md;
    const wordCount = computeWordCount(nextHtml || nextMd || '');

    const sets: string[] = [];
    const params: any[] = [];
    for (const k of Object.keys(allowed)) { sets.push(`${k} = ?`); params.push(allowed[k]); }
    sets.push('word_count = ?'); params.push(wordCount);
    sets.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    return NextResponse.json({ ok: true, article });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
