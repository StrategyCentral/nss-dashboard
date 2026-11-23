import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { FEED_FIELDS, initEcommerceSchema, cleanLink } from '@/lib/ecommerce';

export const dynamic = 'force-dynamic';

function db() { const d = getDb(); initEcommerceSchema(d); return d; }

function merchantOrNull(d: any, v: unknown): number | null {
  const id = Number(v);
  return id && d.prepare('SELECT id FROM merchant_centres WHERE id = ?').get(id) ? id : null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const d = db();
  const feeds = (d.prepare(`
    SELECT f.*, m.name AS merchant_name, m.platform AS merchant_platform
    FROM product_feeds f LEFT JOIN merchant_centres m ON m.id = f.merchant_id ORDER BY f.id
  `).all() as any[]).map(f => ({ ...f, last_check: f.last_check ? JSON.parse(f.last_check) : null }));
  const merchants = d.prepare('SELECT id, name, platform FROM merchant_centres ORDER BY id').all();
  return NextResponse.json({ feeds, merchants, fields: FEED_FIELDS, canEdit: session.role === 'admin' });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can add feeds.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const url = cleanLink(b.url);
  if (!url) return NextResponse.json({ error: 'Paste the feed URL, e.g. https://yoursite.com/feed.xml' }, { status: 400 });
  const d = db();
  const name = String(b.name || '').trim().slice(0, 120) || new URL(url).hostname;
  const info = d.prepare('INSERT INTO product_feeds (name, url, merchant_id) VALUES (?,?,?)').run(name, url, merchantOrNull(d, b.merchant_id));
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can change feeds.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  const d = db();
  if (!d.prepare('SELECT id FROM product_feeds WHERE id = ?').get(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.merchant_id !== undefined) d.prepare('UPDATE product_feeds SET merchant_id = ? WHERE id = ?').run(merchantOrNull(d, b.merchant_id), id);
  if (b.name !== undefined) d.prepare('UPDATE product_feeds SET name = ? WHERE id = ?').run(String(b.name).trim().slice(0, 120), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can remove feeds.' }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  db().prepare('DELETE FROM product_feeds WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
