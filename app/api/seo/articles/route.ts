import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const pageType = searchParams.get('page_type');
    const where: string[] = [];
    const params: any[] = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (pageType) { where.push('page_type = ?'); params.push(pageType); }
    const sql = `SELECT id, title, keyword, page_type, status, word_count, wp_post_id, wp_url, wp_site, meta_description, brand_voice_id, published_at, created_at, updated_at FROM articles ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY datetime(updated_at) DESC, id DESC`;
    const articles = db.prepare(sql).all(...params);
    return NextResponse.json({ articles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { title, keyword, page_type, content_html, content_md, meta_description, source_text, brand_voice_id } = body || {};
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const db = getDb();
    const wordCount = computeWordCount(content_html || content_md || '');
    const result = db.prepare(`INSERT INTO articles
      (title, keyword, page_type, content_html, content_md, meta_description, source_text, brand_voice_id, status, word_count)
      VALUES (?,?,?,?,?,?,?,?, 'draft', ?)`).run(
      title, keyword || null, page_type || 'super_page',
      content_html || null, content_md || null, meta_description || null,
      source_text || null, brand_voice_id || null, wordCount
    );
    return NextResponse.json({ ok: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function computeWordCount(html: string): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}
