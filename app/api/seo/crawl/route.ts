import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { nodeId, url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  const fullUrl = url.startsWith('http') ? url : `https://nationalsalonsupplies.com.au${url}`;

  try {
    // Fetch the page with a browser-like UA
    const pageRes = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NSS-Dashboard-Crawler/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    const isLive = pageRes.ok;
    const html = isLive ? await pageRes.text() : '';

    // ── Word Count ────────────────────────────────────────────────────────────
    let wordCount = 0;
    if (html) {
      // Strip scripts, styles, nav, footer, header
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      wordCount = bodyText.split(/\s+/).filter(w => w.length > 2).length;
    }

    // ── Meta Data ─────────────────────────────────────────────────────────────
    const getMeta = (html: string, name: string) => {
      const match = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'));
      return match?.[1] || null;
    };
    const getTitle = (html: string) => html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;

    const metaTitle = getTitle(html);
    const metaDesc = getMeta(html, 'description');
    const ogTitle = getMeta(html, 'og:title');
    const ogDesc = getMeta(html, 'og:description');
    const ogImage = getMeta(html, 'og:image');
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || null;
    const robots = getMeta(html, 'robots');
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() || null;
    const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
    const imgCount = (html.match(/<img[^>]*>/gi) || []).length;
    const imgNoAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
    const internalLinks = (html.match(/href=["'][^"']*["']/gi) || []).length;

    // ── Schema Detection ──────────────────────────────────────────────────────
    const schemaMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const schemas: string[] = [];
    for (const block of schemaMatches) {
      try {
        const json = block.replace(/<[^>]+>/g, '');
        const parsed = JSON.parse(json);
        const types = Array.isArray(parsed) ? parsed.map((p: any) => p['@type']) : [parsed['@type']];
        schemas.push(...types.filter(Boolean));
      } catch {}
    }

    // ── SEO Issues ────────────────────────────────────────────────────────────
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string }> = [];

    if (!metaTitle) issues.push({ severity: 'error', message: 'Missing page title tag' });
    else if (metaTitle.length < 30) issues.push({ severity: 'warning', message: `Title too short (${metaTitle.length} chars — aim for 50–60)` });
    else if (metaTitle.length > 65) issues.push({ severity: 'warning', message: `Title too long (${metaTitle.length} chars — aim for 50–60)` });

    if (!metaDesc) issues.push({ severity: 'error', message: 'Missing meta description' });
    else if (metaDesc.length < 100) issues.push({ severity: 'warning', message: `Meta description too short (${metaDesc.length} chars — aim for 140–160)` });
    else if (metaDesc.length > 165) issues.push({ severity: 'warning', message: `Meta description too long (${metaDesc.length} chars — aim for 140–160)` });

    if (!h1) issues.push({ severity: 'error', message: 'Missing H1 tag' });
    if (!canonical) issues.push({ severity: 'warning', message: 'No canonical URL set' });
    if (imgNoAlt > 0) issues.push({ severity: 'warning', message: `${imgNoAlt} image${imgNoAlt > 1 ? 's' : ''} missing alt text` });
    if (wordCount < 300 && wordCount > 0) issues.push({ severity: 'warning', message: `Low word count (${wordCount} words — aim for 600+ for category pages)` });
    if (schemas.length === 0) issues.push({ severity: 'info', message: 'No structured data (schema markup) detected' });
    if (robots && robots.includes('noindex')) issues.push({ severity: 'error', message: 'Page is set to noindex — Google will not rank this page!' });
    if (!ogImage) issues.push({ severity: 'info', message: 'No OG image set (affects social share appearance)' });

    if (issues.length === 0) issues.push({ severity: 'info', message: 'No major SEO issues detected' });

    // ── Backlinks (via free API — DataForSEO free tier or Open PageRank) ─────
    // Using Open PageRank API (free, no auth needed for basic queries)
    let backlinks = { count: null as number | null, domainRating: null as number | null, error: null as string | null };
    try {
      const domain = new URL(fullUrl).hostname;
      const oprRes = await fetch(`https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`, {
        headers: { 'API-OPR': 'openpr_free' }, // free tier
        signal: AbortSignal.timeout(5000),
      });
      if (oprRes.ok) {
        const oprData = await oprRes.json();
        const entry = oprData?.response?.[0];
        if (entry) {
          backlinks.domainRating = entry.page_rank_decimal || null;
        }
      }
    } catch {
      backlinks.error = 'Backlink API unavailable';
    }

    // ── Update node in DB ─────────────────────────────────────────────────────
    if (nodeId) {
      try {
        const db = getDb();
        const newStatus = isLive ? 'live' : 'planned';
        const crawlData = JSON.stringify({ wordCount, schemas, metaTitle, metaDesc, h1, issues, crawledAt: new Date().toISOString() });
        db.prepare(`UPDATE seo_nodes SET 
          status = ?,
          issues = ?,
          updated_at = datetime('now')
          WHERE id = ?`
        ).run(newStatus, crawlData, nodeId);
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      isLive,
      status: isLive ? pageRes.status : 0,
      wordCount,
      meta: { title: metaTitle, description: metaDesc, ogTitle, ogDesc, ogImage, canonical, robots, h1, h2Count, h3Count, imgCount, imgNoAlt },
      schemas,
      issues,
      backlinks,
      internalLinks,
      crawledAt: new Date().toISOString(),
      url: fullUrl,
    });

  } catch (err: any) {
    // Page unreachable
    if (nodeId) {
      try {
        const db = getDb();
        db.prepare("UPDATE seo_nodes SET status = 'planned' WHERE id = ?").run(nodeId);
      } catch {}
    }
    return NextResponse.json({
      ok: true,
      isLive: false,
      status: 0,
      wordCount: 0,
      meta: {},
      schemas: [],
      issues: [{ severity: 'error', message: `Page unreachable: ${err.message}` }],
      backlinks: { count: null, domainRating: null, error: 'Page unreachable' },
      crawledAt: new Date().toISOString(),
      url: fullUrl,
    });
  }
}
