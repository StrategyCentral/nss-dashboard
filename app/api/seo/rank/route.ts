// Rank tracker: where a domain sits in Google for the keywords you choose,
// checked on demand (or by a scheduler) and kept as history.
//
//   GET    /api/seo/rank[?domain=example.com]   tracked keywords with latest,
//                                               previous and best position + history
//   POST   /api/seo/rank   { action: "add", domain, keywords[], location?, device? }   admin
//   POST   /api/seo/rank   { action: "check", domain? | ids?, depth? }                  admin or scheduler
//   DELETE /api/seo/rank?id=4                                                          admin
//
// Cost: DataForSEO bills US$0.002 per 10 results fetched, per keyword, per
// check. 20 keywords at depth 50 = about US$0.20 a check.
//
// Scheduling: there is no built-in timer. Any scheduler can run the check by
// calling POST with the header  x-cron-key: <SEO_CRON_KEY>  (env var; unset =
// scheduled checks are off). At most 100 keywords are checked per call.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  DEFAULT_LOCATION_CODE,
  RANK_COST_PER_10_RESULTS_USD,
  RANK_DEPTHS,
  cleanDomain,
  isDataForSeoConfigured,
  rankForKeyword,
} from '@/lib/dataforseo';
import {
  addTrackedKeywords,
  deleteTracked,
  getDefaultDomain,
  getTrackedRows,
  listTracked,
  listTrackedDomains,
  monthSpendUsd,
  recordRankCheck,
} from '@/lib/seo-store';

const MAX_KEYWORDS_PER_ADD = 200;
const MAX_KEYWORDS_PER_CHECK = 100;
const PARALLEL_LOOKUPS = 5;

function isScheduler(req: NextRequest): boolean {
  const key = process.env.SEO_CRON_KEY;
  return Boolean(key) && req.headers.get('x-cron-key') === key;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const domains = listTrackedDomains();
    const asked = new URL(req.url).searchParams.get('domain');
    const domain = (asked && cleanDomain(asked)) || domains[0]?.domain || null;
    return NextResponse.json({
      configured: isDataForSeoConfigured(),
      canRun: session.role === 'admin',
      defaultDomain: getDefaultDomain(),
      monthSpendUsd: monthSpendUsd(),
      costPer10ResultsUsd: RANK_COST_PER_10_RESULTS_USD,
      domains,
      domain,
      tracked: domain ? listTracked(domain) : [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  deleteTracked(id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const scheduler = isScheduler(req);
  if (!scheduler) {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON with an "action".' }, { status: 400 });
  }

  if (body.action === 'add') {
    const domain = typeof body.domain === 'string' ? cleanDomain(body.domain) : null;
    if (!domain) return NextResponse.json({ error: 'That is not a valid domain.' }, { status: 400 });
    const seen = new Set<string>();
    for (const raw of Array.isArray(body.keywords) ? body.keywords : []) {
      if (typeof raw !== 'string') continue;
      const keyword = raw.trim().replace(/\s+/g, ' ').toLowerCase();
      if (keyword && keyword.length <= 100) seen.add(keyword);
    }
    const keywords = Array.from(seen);
    if (keywords.length === 0) return NextResponse.json({ error: 'Add at least one keyword.' }, { status: 400 });
    if (keywords.length > MAX_KEYWORDS_PER_ADD) {
      return NextResponse.json({ error: `Add at most ${MAX_KEYWORDS_PER_ADD} keywords at a time.` }, { status: 400 });
    }
    const added = addTrackedKeywords({
      domain,
      keywords,
      locationCode: Number(body.location) || DEFAULT_LOCATION_CODE,
      device: body.device === 'mobile' ? 'mobile' : 'desktop',
    });
    return NextResponse.json({ ok: true, added, alreadyTracked: keywords.length - added, domain });
  }

  if (body.action === 'check') {
    if (!isDataForSeoConfigured()) {
      return NextResponse.json({ error: 'DataForSEO is not connected. Add it under Admin → Connections.' }, { status: 503 });
    }
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
    const domain = typeof body.domain === 'string' ? cleanDomain(body.domain) : null;
    // The scheduler may check everything; a person must name a domain or keywords.
    if (!scheduler && ids.length === 0 && !domain) {
      return NextResponse.json({ error: 'Choose a domain or keywords to check.' }, { status: 400 });
    }
    const rows = getTrackedRows({ ids, domain: ids.length ? undefined : domain ?? undefined });
    if (rows.length === 0) return NextResponse.json({ error: 'Nothing to check.' }, { status: 400 });
    if (rows.length > MAX_KEYWORDS_PER_CHECK) {
      return NextResponse.json(
        { error: `That is ${rows.length} keywords. Check at most ${MAX_KEYWORDS_PER_CHECK} at a time.` },
        { status: 400 },
      );
    }
    const depth = (RANK_DEPTHS as readonly number[]).includes(Number(body.depth)) ? Number(body.depth) : 50;

    // A few at a time: fast enough, and one failed keyword cannot fail the rest.
    let next = 0;
    let costUsd = 0;
    let checked = 0;
    const errors: Array<{ keyword: string; error: string }> = [];
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_LOOKUPS, rows.length) }, async () => {
        for (;;) {
          const row = rows[next++];
          if (!row) return;
          const result = await rankForKeyword(row.keyword, row.domain, {
            locationCode: row.location_code,
            depth,
            device: row.device,
          });
          if (result.error) {
            // Not recorded: a failed lookup is not "not ranking".
            errors.push({ keyword: row.keyword, error: result.error });
            continue;
          }
          recordRankCheck(row.id, depth, result);
          costUsd += result.costUsd;
          checked += 1;
        }
      }),
    );
    return NextResponse.json({ ok: true, checked, failed: errors, depth, costUsd, monthSpendUsd: monthSpendUsd() });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
