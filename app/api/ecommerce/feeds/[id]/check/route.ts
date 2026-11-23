import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { checkFeed, initEcommerceSchema } from '@/lib/ecommerce';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Downloads the feed and counts which Google Shopping fields each product has.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`feed-check:${session.id}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many checks. Try again in a few minutes.' }, { status: 429 });
  }
  const d = getDb();
  initEcommerceSchema(d);
  const feed = d.prepare('SELECT id, url FROM product_feeds WHERE id = ?').get(Number(params.id)) as any;
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const result = await checkFeed(feed.url);
  d.prepare('UPDATE product_feeds SET last_check = ? WHERE id = ?').run(JSON.stringify(result), feed.id);
  return NextResponse.json({ ok: true, check: result });
}
