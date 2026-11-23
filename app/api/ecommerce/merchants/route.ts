import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { PLATFORMS, STATUSES, initEcommerceSchema, isPlatform, consoleUrl, cleanLink } from '@/lib/ecommerce';

export const dynamic = 'force-dynamic';

function db() { const d = getDb(); initEcommerceSchema(d); return d; }

const platformList = () => Object.entries(PLATFORMS).map(([key, p]) => ({ key, name: p.name, idLabel: p.idLabel, color: p.color }));

function clip(v: unknown, max: number) { return String(v ?? '').trim().slice(0, max); }

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const d = db();
  const rows = d.prepare(`
    SELECT m.*, (SELECT COUNT(*) FROM product_feeds f WHERE f.merchant_id = m.id) AS feeds
    FROM merchant_centres m ORDER BY m.id
  `).all() as any[];
  return NextResponse.json({
    merchants: rows.map(r => ({ ...r, open_url: consoleUrl(r) })),
    platforms: platformList(),
    statuses: STATUSES,
    canEdit: session.role === 'admin',
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can add merchant centres.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!isPlatform(b.platform)) return NextResponse.json({ error: 'Pick a platform.' }, { status: 400 });
  const name = clip(b.name, 120) || PLATFORMS[b.platform as keyof typeof PLATFORMS].name;
  const account_ref = clip(b.account_ref, 120);
  const console_url = cleanLink(b.console_url);
  if (b.platform === 'other' && !clip(b.name, 120)) return NextResponse.json({ error: 'Give it a name.' }, { status: 400 });
  const info = db().prepare('INSERT INTO merchant_centres (platform, name, account_ref, console_url, status) VALUES (?,?,?,?,?)')
    .run(b.platform, name, account_ref, console_url, 'Setting up');
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can change merchant centres.' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  const d = db();
  if (!d.prepare('SELECT id FROM merchant_centres WHERE id = ?').get(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const sets: string[] = []; const vals: any[] = [];
  if (b.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(b.status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
    sets.push('status = ?'); vals.push(b.status);
  }
  if (b.name !== undefined) { sets.push('name = ?'); vals.push(clip(b.name, 120)); }
  if (b.account_ref !== undefined) { sets.push('account_ref = ?'); vals.push(clip(b.account_ref, 120)); }
  if (b.console_url !== undefined) { sets.push('console_url = ?'); vals.push(cleanLink(b.console_url)); }
  if (b.notes !== undefined) { sets.push('notes = ?'); vals.push(clip(b.notes, 2000)); }
  if (!sets.length) return NextResponse.json({ ok: true });
  d.prepare(`UPDATE merchant_centres SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Only an admin can remove merchant centres.' }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  const d = db();
  // Feeds stay; they just stop pointing at the removed merchant centre.
  d.prepare('UPDATE product_feeds SET merchant_id = NULL WHERE merchant_id = ?').run(id);
  d.prepare('DELETE FROM merchant_centres WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
