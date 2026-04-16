import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const CHECK_STALE_HOURS = 24;
const FETCH_TIMEOUT_MS = 12000;

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname.replace(/^www\./, '') + url.pathname;
  } catch {
    return u;
  }
}

async function checkLink(link: any): Promise<{
  status: string; http_status: number | null;
  target_found: boolean; keyword_found: boolean;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(link.source_url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NSSBot/1.0)' },
        redirect: 'follow',
      });
    } finally {
      clearTimeout(timer);
    }
    const http_status = resp.status;
    if (http_status >= 400) {
      return { status: 'dead', http_status, target_found: false, keyword_found: false };
    }
    const html = await resp.text();
    const lowerHtml = html.toLowerCase();

    // Check if target URL appears as href anywhere in the page
    const normTarget = normalizeUrl(link.target_url).toLowerCase();
    const target_found = lowerHtml.includes(normTarget) ||
      lowerHtml.includes(link.target_url.toLowerCase());

    // Check keyword in visible text (strip tags roughly)
    let keyword_found = false;
    if (link.keyword) {
      const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      keyword_found = textContent.toLowerCase().includes(link.keyword.toLowerCase());
    }

    const status = target_found ? 'alive' : 'alive_no_target';
    return { status, http_status, target_found, keyword_found };
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError' || e?.message?.includes('abort');
    return {
      status: isTimeout ? 'timeout' : 'error',
      http_status: null,
      target_found: false,
      keyword_found: false,
    };
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: number[] | undefined = body.ids;
  const forceAll: boolean = body.force_all === true;

  try {
    const db = getDb();
    let links: any[];

    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      links = db.prepare(`SELECT * FROM backlinks WHERE id IN (${placeholders})`).all(...ids);
    } else if (forceAll) {
      links = db.prepare('SELECT * FROM backlinks').all();
    } else {
      // Check stale (never checked or checked > 24h ago)
      const cutoff = new Date(Date.now() - CHECK_STALE_HOURS * 60 * 60 * 1000).toISOString();
      links = db.prepare(
        "SELECT * FROM backlinks WHERE last_checked IS NULL OR last_checked < ?"
      ).all(cutoff);
    }

    if (links.length === 0) return NextResponse.json({ ok: true, checked: 0, results: [] });

    const results: any[] = [];
    const updateStmt = db.prepare(
      'UPDATE backlinks SET status=?, http_status=?, target_found=?, keyword_found=?, last_checked=datetime(\'now\') WHERE id=?'
    );

    for (const link of links) {
      const prev_status = link.status;
      const result = await checkLink(link);
      updateStmt.run(result.status, result.http_status, result.target_found ? 1 : 0, result.keyword_found ? 1 : 0, link.id);

      // Auto-create timeline event when link dies
      if (prev_status === 'alive' && (result.status === 'dead' || result.status === 'error' || result.status === 'timeout')) {
        try {
          db.prepare(
            'INSERT INTO timeline_events (event_date, platform, type, title, description, source, source_id) VALUES (date(\'now\'),?,?,?,?,?,?)'
          ).run(
            'SEO',
            'link_lost',
            `🔴 Backlink Lost: ${new URL(link.source_url).hostname}`,
            `Link from ${link.source_url} pointing to ${link.target_url} is no longer alive (HTTP ${result.http_status || 'error'}). Keyword: "${link.keyword || 'N/A'}"`,
            'link_monitor',
            String(link.id)
          );
        } catch {}
      }

      // Auto-create timeline event when a dead link comes back
      if ((prev_status === 'dead' || prev_status === 'error') && result.status === 'alive') {
        try {
          db.prepare(
            'INSERT INTO timeline_events (event_date, platform, type, title, description, source, source_id) VALUES (date(\'now\'),?,?,?,?,?,?)'
          ).run(
            'SEO',
            'link_gained',
            `✅ Backlink Recovered: ${new URL(link.source_url).hostname}`,
            `Link from ${link.source_url} pointing to ${link.target_url} is back online.`,
            'link_monitor',
            String(link.id)
          );
        } catch {}
      }

      results.push({ id: link.id, ...result });
    }

    return NextResponse.json({ ok: true, checked: links.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
