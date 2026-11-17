// Paid SEO research from DataForSEO: keyword ideas, a domain's keywords, its
// competitors, and its backlink profile. Every answer is saved.
//
//   GET    /api/seo/research                  status + past lookups (no cost)
//   GET    /api/seo/research?id=7             one saved answer (no cost)
//   POST   /api/seo/research                  admin; may cost money
//          { kind, query, location?, refresh? }
//          kind: keyword-ideas | domain-keywords | competitors | backlinks
//   DELETE /api/seo/research?id=7             admin
//
// The same question asked again within 7 days is answered from the saved copy
// for free. Send refresh:true to pay for fresh data.
//
// Paid calls are POST with a JSON body on purpose: a link on another website
// cannot make a signed-in admin's browser send one.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  DataForSeoError,
  DEFAULT_LOCATION_CODE,
  backlinkProfile,
  cleanDomain,
  competitorDomains,
  isDataForSeoConfigured,
  keywordSuggestions,
  rankedKeywords,
} from '@/lib/dataforseo';
import {
  LOOKUP_CACHE_DAYS,
  LOOKUP_KINDS,
  deleteLookup,
  findFreshLookup,
  getDefaultDomain,
  getLookup,
  listLookups,
  monthSpendUsd,
  saveLookup,
  type LookupKind,
} from '@/lib/seo-store';

const ROW_LIMIT = 100;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (id) {
      const found = getLookup(id);
      if (!found) return NextResponse.json({ error: 'That lookup no longer exists.' }, { status: 404 });
      return NextResponse.json({ lookup: found.row, result: found.result, cached: true });
    }
    return NextResponse.json({
      configured: isDataForSeoConfigured(),
      canRun: session.role === 'admin',
      defaultDomain: getDefaultDomain(),
      monthSpendUsd: monthSpendUsd(),
      cacheDays: LOOKUP_CACHE_DAYS,
      history: listLookups(LOOKUP_KINDS, 60),
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
  deleteLookup(id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { kind?: unknown; query?: unknown; location?: unknown; refresh?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON: { "kind": "keyword-ideas", "query": "…" }' }, { status: 400 });
  }
  const kind = body.kind as LookupKind;
  if (!LOOKUP_KINDS.includes(kind)) return NextResponse.json({ error: 'Unknown lookup kind.' }, { status: 400 });

  const raw = typeof body.query === 'string' ? body.query.trim() : '';
  let query: string | null;
  if (kind === 'keyword-ideas') {
    query = raw.replace(/\s+/g, ' ').toLowerCase();
    if (!query || query.length > 80) return NextResponse.json({ error: 'Enter a phrase of up to 80 characters.' }, { status: 400 });
  } else {
    query = cleanDomain(raw);
    if (!query) return NextResponse.json({ error: 'That is not a valid domain.' }, { status: 400 });
  }
  // Backlinks are worldwide; the country only matters for the keyword lookups.
  const locationCode = kind === 'backlinks' ? 0 : Number(body.location) || DEFAULT_LOCATION_CODE;

  try {
    if (body.refresh !== true) {
      const saved = findFreshLookup(kind, query, locationCode);
      if (saved) return NextResponse.json({ lookup: saved.row, result: saved.result, cached: true, monthSpendUsd: monthSpendUsd() });
    }
    if (!isDataForSeoConfigured()) {
      return NextResponse.json({ error: 'DataForSEO is not connected. Add it under Admin → Connections.' }, { status: 503 });
    }

    let result: any;
    let rowCount = 0;
    let costUsd = 0;
    if (kind === 'keyword-ideas') {
      const data = await keywordSuggestions(query, { limit: ROW_LIMIT, locationCode });
      result = { total: data.total, keywords: data.keywords };
      rowCount = data.keywords.length;
      costUsd = data.costUsd;
    } else if (kind === 'domain-keywords') {
      const data = await rankedKeywords(query, { limit: ROW_LIMIT, locationCode });
      result = { total: data.total, keywords: data.keywords };
      rowCount = data.keywords.length;
      costUsd = data.costUsd;
    } else if (kind === 'competitors') {
      const data = await competitorDomains(query, { limit: 50, locationCode });
      result = { total: data.total, competitors: data.competitors };
      rowCount = data.competitors.length;
      costUsd = data.costUsd;
    } else {
      const { costUsd: cost, ...profile } = await backlinkProfile(query, ROW_LIMIT);
      result = profile;
      rowCount = profile.referringDomains.length;
      costUsd = cost;
    }

    const lookup = saveLookup({ kind, query, locationCode, result, rowCount, costUsd, createdBy: session.email });
    return NextResponse.json({ lookup, result, cached: false, monthSpendUsd: monthSpendUsd() });
  } catch (e: any) {
    if (e instanceof DataForSeoError) {
      return NextResponse.json({ error: e.message }, { status: e.status >= 400 && e.status < 600 ? e.status : 502 });
    }
    console.error('[seo research]', e);
    return NextResponse.json({ error: 'The lookup failed.' }, { status: 502 });
  }
}
