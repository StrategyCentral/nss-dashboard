import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function siteCreds(site: 'main' | 'beauty') {
  if (site === 'main') {
    return {
      url: (process.env.WP_MAIN_URL || 'https://nationalsalonsupplies.com.au').replace(/\/$/, ''),
      user: process.env.WP_MAIN_USER || '',
      pass: process.env.WP_MAIN_APP_PASSWORD || '',
    };
  }
  return {
    url: (process.env.WP_BEAUTY_URL || 'https://nationalsalonsupplies.com.au/beauty').replace(/\/$/, ''),
    user: process.env.WP_BEAUTY_USER || '',
    pass: process.env.WP_BEAUTY_APP_PASSWORD || '',
  };
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    const article: any = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: any = {};
    try { body = await req.json(); } catch {}
    const site: 'main' | 'beauty' = body?.site === 'main' ? 'main' : 'beauty';
    const status: 'draft' | 'publish' = body?.status === 'publish' ? 'publish' : 'draft';

    const { url, user, pass } = siteCreds(site);
    if (!user || !pass) return NextResponse.json({ error: `WP credentials missing for ${site} site (set WP_${site.toUpperCase()}_USER and WP_${site.toUpperCase()}_APP_PASSWORD)` }, { status: 400 });

    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const endpoint = `${url}/wp-json/wp/v2/posts`;

    const wpBody: any = {
      title: article.title,
      content: article.content_html || '',
      status,
    };
    if (article.meta_description) wpBody.excerpt = article.meta_description;

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wpBody),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ error: `WP responded ${r.status}: ${data?.message || JSON.stringify(data).slice(0, 500)}` }, { status: 500 });
    }

    const wpPostId = data?.id || null;
    const wpUrl = data?.link || null;
    const newStatus = status === 'publish' ? 'published' : 'draft';
    db.prepare(`UPDATE articles SET wp_post_id = ?, wp_url = ?, wp_site = ?, status = ?, published_at = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(wpPostId, wpUrl, site, newStatus, status === 'publish' ? new Date().toISOString() : null, id);

    return NextResponse.json({ ok: true, wp_post_id: wpPostId, wp_url: wpUrl, site, status: newStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
