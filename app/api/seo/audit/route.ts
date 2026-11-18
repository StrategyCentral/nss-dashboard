// Site audit: crawl a site and report its technical SEO issues. Free: it
// reads the site directly, no paid API.
//
//   GET    /api/seo/audit            past audits (newest first) + the default domain
//   GET    /api/seo/audit?id=12      one saved report
//   POST   /api/seo/audit            { url, maxPages?, respectRobots? }   admin
//   DELETE /api/seo/audit?id=12      admin
//
// POST answers with a stream of JSON lines so the page can show progress:
//   {"type":"started","id":12}
//   {"type":"progress","crawled":12,"queued":40,"limit":50,"currentUrl":"…"}
//   {"type":"result","id":12,"report":{…}}   or   {"type":"error","message":"…"}
// The report is saved before the last line is sent, so it survives a closed tab.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AuditError, DEFAULT_MAX_PAGES, MAX_PAGES_LIMIT, runSiteAudit } from '@/lib/seo-audit/crawler';
import { createAudit, deleteAudit, failAudit, finishAudit, getAuditReport, getDefaultDomain, listAudits } from '@/lib/seo-store';

// One audit holds up to five outbound connections for up to five minutes.
const MAX_CONCURRENT_AUDITS = 3;
let runningAudits = 0;

function domainOf(input: string): string {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return input.slice(0, 200);
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (id) {
      const found = getAuditReport(id);
      if (!found) return NextResponse.json({ error: 'That audit no longer exists.' }, { status: 404 });
      return NextResponse.json(found);
    }
    return NextResponse.json({ audits: listAudits(), defaultDomain: getDefaultDomain() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  deleteAudit(id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { url?: unknown; maxPages?: unknown; respectRobots?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON: { "url": "example.com", "maxPages": 50 }' }, { status: 400 });
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || url.length > 2000) return NextResponse.json({ error: 'Enter a website address.' }, { status: 400 });
  const maxPages = body.maxPages === undefined ? DEFAULT_MAX_PAGES : Number(body.maxPages);
  if (!Number.isFinite(maxPages) || maxPages < 1 || maxPages > MAX_PAGES_LIMIT) {
    return NextResponse.json({ error: `The page limit must be between 1 and ${MAX_PAGES_LIMIT}.` }, { status: 400 });
  }
  // Only an explicit false switches robots.txt off.
  const respectRobots = body.respectRobots !== false;

  if (runningAudits >= MAX_CONCURRENT_AUDITS) {
    return NextResponse.json({ error: `${MAX_CONCURRENT_AUDITS} audits are already running. Try again in a minute.` }, { status: 429 });
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener('abort', () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          // The reader went away. The crawl carries on so the report is still saved.
          open = false;
        }
      };

      runningAudits += 1;
      let auditId = 0;
      try {
        auditId = createAudit({ domain: domainOf(url), requestedUrl: url, maxPages, createdBy: session.email });
        send({ type: 'started', id: auditId });
        const report = await runSiteAudit({
          url,
          maxPages,
          respectRobots,
          signal: abort.signal,
          onProgress: (progress) => send({ type: 'progress', ...progress }),
        });
        finishAudit(auditId, report);
        send({ type: 'result', id: auditId, report });
      } catch (e) {
        const known = e instanceof AuditError;
        const message = known ? (e as AuditError).message : 'The audit failed unexpectedly.';
        if (!known) console.error('[seo audit]', e);
        if (auditId) {
          try { failAudit(auditId, message); } catch {}
        }
        send({ type: 'error', message });
      } finally {
        runningAudits -= 1;
        if (open) {
          try { controller.close(); } catch {}
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
