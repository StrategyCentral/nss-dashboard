import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getGoogleAccessToken, getGoogleExtra } from '@/lib/google-auth';

const GSC_API = 'https://www.googleapis.com/webmasters/v3';

async function fetchGSC(accessToken: string, siteUrl: string, startDate: string, endDate: string, dimensions: string[]) {
  const res = await fetch(`${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit: 500,
      type: 'web',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API ${res.status}: ${err}`);
  }
  return res.json();
}

// GET: Pull live GSC data
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ source: 'not_connected', error: 'Google not connected or token expired. Re-connect in Admin → Connections.' });
  }

  const extra = getGoogleExtra();
  const sites = extra.gsc_sites?.filter(Boolean) || [];
  if (sites.length === 0) {
    return NextResponse.json({ source: 'no_sites', error: 'No Search Console sites configured. Add them in Admin → Connections.' });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '28');
  const type = searchParams.get('type') || 'query'; // 'query' or 'page'

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has 3-day lag
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const allRows: any[] = [];

    for (const siteUrl of sites) {
      try {
        const dimensions = type === 'page' ? ['page'] : ['query', 'page'];
        const data = await fetchGSC(accessToken, siteUrl, fmt(startDate), fmt(endDate), dimensions);

        for (const row of data.rows || []) {
          const keys = row.keys || [];
          if (type === 'page') {
            // Extract path from full URL
            try {
              const url = new URL(keys[0]);
              allRows.push({
                url: url.pathname,
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: Math.round((row.ctr || 0) * 1000) / 10,
                position: Math.round((row.position || 0) * 10) / 10,
                site: siteUrl,
              });
            } catch { }
          } else {
            // query + page
            let urlPath = keys[1] || '';
            try { urlPath = new URL(urlPath).pathname; } catch { }
            allRows.push({
              query: keys[0],
              url: urlPath,
              clicks: row.clicks || 0,
              impressions: row.impressions || 0,
              ctr: Math.round((row.ctr || 0) * 1000) / 10,
              position: Math.round((row.position || 0) * 10) / 10,
              site: siteUrl,
            });
          }
        }
      } catch (e: any) {
        console.error(`GSC fetch failed for ${siteUrl}:`, e.message);
      }
    }

    // Sort by clicks desc
    allRows.sort((a, b) => b.clicks - a.clicks);

    return NextResponse.json({
      source: 'live',
      sites,
      period: { start: fmt(startDate), end: fmt(endDate), days },
      type,
      total: allRows.length,
      rows: allRows,
    });
  } catch (e: any) {
    return NextResponse.json({ source: 'error', error: e.message }, { status: 500 });
  }
}

// POST: Sync GSC data into keywords table
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 });
  }

  const extra = getGoogleExtra();
  const sites = extra.gsc_sites?.filter(Boolean) || [];

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS seo_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL, position INTEGER, prev_position INTEGER,
      volume INTEGER DEFAULT 0, url TEXT DEFAULT '',
      category TEXT DEFAULT 'Uncategorized', trend TEXT DEFAULT 'flat',
      created_at TEXT DEFAULT (datetime('now'))
    )`);

    // Fetch query-level data from all sites
    const queryData: any[] = [];
    for (const siteUrl of sites) {
      try {
        const data = await fetchGSC(accessToken, siteUrl, fmt(startDate), fmt(endDate), ['query', 'page']);
        for (const row of data.rows || []) {
          const keys = row.keys || [];
          let urlPath = keys[1] || '';
          try { urlPath = new URL(urlPath).pathname; } catch { }
          queryData.push({
            query: keys[0],
            url: urlPath,
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            position: Math.round((row.position || 0) * 10) / 10,
          });
        }
      } catch (e: any) {
        console.error(`GSC sync failed for ${siteUrl}:`, e.message);
      }
    }

    // Deduplicate: keep best position per query
    const bestByQuery = new Map<string, any>();
    for (const row of queryData) {
      const existing = bestByQuery.get(row.query);
      if (!existing || row.position < existing.position) {
        bestByQuery.set(row.query, row);
      }
    }

    // Clean up duplicate keywords in existing table before adding unique index
    try {
      db.exec(`DELETE FROM seo_keywords WHERE id NOT IN (
        SELECT MIN(id) FROM seo_keywords GROUP BY keyword
      )`);
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_kw_keyword ON seo_keywords(keyword)');
    } catch {
      // If index still fails, drop and recreate
      try {
        db.exec('DROP INDEX IF EXISTS idx_kw_keyword');
        db.exec(`DELETE FROM seo_keywords WHERE id NOT IN (
          SELECT MIN(id) FROM seo_keywords GROUP BY keyword
        )`);
        db.exec('CREATE UNIQUE INDEX idx_kw_keyword ON seo_keywords(keyword)');
      } catch { /* proceed without upsert */ }
    }

    // Upsert into keywords table
    let synced = 0;
    const hasUniqueIndex = (() => {
      try {
        const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_kw_keyword'").get();
        return !!idx;
      } catch { return false; }
    })();

    const syncMany = db.transaction(() => {
      for (const [query, row] of bestByQuery) {
        const pos = Math.round(row.position);
        if (hasUniqueIndex) {
          db.prepare(`
            INSERT INTO seo_keywords (keyword, position, prev_position, volume, url, category, trend)
            VALUES (?, ?, NULL, ?, ?, 'GSC', 'flat')
            ON CONFLICT(keyword) DO UPDATE SET
              prev_position = seo_keywords.position,
              position = excluded.position,
              volume = excluded.volume,
              url = excluded.url,
              trend = CASE 
                WHEN seo_keywords.position IS NULL THEN 'flat'
                WHEN excluded.position < seo_keywords.position THEN 'up'
                WHEN excluded.position > seo_keywords.position THEN 'down'
                ELSE 'flat'
              END
          `).run(query, pos, row.impressions, row.url);
        } else {
          // Fallback: delete + insert
          db.prepare('DELETE FROM seo_keywords WHERE keyword = ?').run(query);
          db.prepare('INSERT INTO seo_keywords (keyword, position, volume, url, category, trend) VALUES (?, ?, ?, ?, ?, ?)').run(
            query, pos, row.impressions, row.url, 'GSC', 'flat'
          );
        }
        synced++;
      }
    });
    syncMany();

    // Also fetch page-level data and update structure nodes
    let pagesSynced = 0;
    for (const siteUrl of sites) {
      try {
        const pageData = await fetchGSC(accessToken, siteUrl, fmt(startDate), fmt(endDate), ['page']);
        for (const row of pageData.rows || []) {
          let urlPath = row.keys?.[0] || '';
          try { urlPath = new URL(urlPath).pathname; } catch { }
          if (!urlPath) continue;
          // Normalise trailing slash
          const normalized = urlPath.endsWith('/') ? urlPath : urlPath + '/';
          const pos = Math.round((row.position || 0) * 10) / 10;
          const clicks = row.clicks || 0;
          // Update matching structure nodes
          const result = db.prepare(`
            UPDATE seo_nodes SET position = ?, traffic = ?
            WHERE (url = ? OR url = ?) AND (position IS NULL OR position = 0 OR position > ?)
          `).run(pos, clicks, urlPath, normalized, pos);
          if (result.changes > 0) pagesSynced++;
        }
      } catch { }
    }

    return NextResponse.json({
      ok: true,
      queries_synced: synced,
      pages_synced: pagesSynced,
      sites,
      period: { start: fmt(startDate), end: fmt(endDate) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
