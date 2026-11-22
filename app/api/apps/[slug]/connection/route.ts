import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * What a linked app last told the suite about its own connection.
 * Today: Tube Stats, which signs in to Google inside the app and reports the
 * YouTube channel it is showing. Saved per customer account, shown under
 * Settings → Connections. No Google token ever reaches the suite.
 */
const SERVICE = 'tube_stats_channel';
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function read() {
  try {
    const row = getDb().prepare('SELECT key_value FROM api_keys WHERE service = ?').get(SERVICE) as any;
    return row ? JSON.parse(row.key_value) : null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  if (params.slug !== 'tube-stats') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const saved = read();
  return NextResponse.json({ connected: !!saved?.connected, title: saved?.title || '', channelId: saved?.channelId || '', at: saved?.at || '' });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (params.slug !== 'tube-stats') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const before = read();
  const value = body?.connected
    ? { connected: true, channelId: clean(body.channelId, 64), title: clean(body.title, 120), at: new Date().toISOString() }
    // Signing out of Google in the app: keep the channel name so the card can say which one was linked.
    : { connected: false, channelId: before?.channelId || '', title: before?.title || '', at: new Date().toISOString() };
  getDb().prepare(
    "INSERT INTO api_keys (service, key_name, key_value) VALUES (?, ?, ?) ON CONFLICT(service) DO UPDATE SET key_value = excluded.key_value, updated_at = datetime('now')"
  ).run(SERVICE, SERVICE, JSON.stringify(value));
  return NextResponse.json({ ok: true });
}
