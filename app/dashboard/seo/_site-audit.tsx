'use client';
// SEO → Site Audit. Crawls a site and lists its technical SEO issues with the
// fix for each. Free (reads the site directly). Every audit is saved, so past
// reports can be reopened and compared.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuditIssueGroup, AuditPageSummary, AuditProgress, AuditReport } from '@/lib/seo-audit/crawler';
import type { AuditRow } from '@/lib/seo-store';
import { Notice, SELECT_STYLE, SMALL_BTN, StatTile, TableWrap, downloadCsv, when } from './_seo-shared';

const PAGE_LIMITS = [25, 50, 100, 200, 300];
const SEVERITY = {
  critical: { label: 'Critical', color: '#ff6b6b' },
  warning: { label: 'Warning', color: '#FFCC2A' },
  info: { label: 'Notice', color: '#04AAE8' },
} as const;

const DETAIL_LABELS: Record<string, string> = {
  statusCode: 'Status', responseTimeMs: 'Response (ms)', length: 'Length', max: 'Max', min: 'Min', title: 'Title',
  description: 'Description', h1Count: 'H1 count', wordCount: 'Words', imagesMissingAlt: 'Missing alt', imagesTotal: 'Images',
  canonicalUrl: 'Canonical', htmlCanonical: 'HTML canonical', headerCanonical: 'Header canonical', crawlDepth: 'Clicks from start',
  targetUrl: 'Links to', anchor: 'Link text', groupSize: 'Pages sharing it', otherUrls: 'Also on', hops: 'Path', finalUrl: 'Ends at',
  robotsMeta: 'Robots meta', xRobotsTag: 'X-Robots-Tag', pagesCrawled: 'Pages crawled', urlsNotCrawled: 'URLs not reached',
};

function formatDetails(details?: Record<string, unknown>): string {
  if (!details) return '';
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${DETAIL_LABELS[key] ?? key}: ${Array.isArray(value) ? value.join(key === 'hops' ? ' → ' : ', ') : String(value)}`)
    .join(' · ');
}

function pathOf(url: string, origin: string): string {
  return url.startsWith(origin) ? url.slice(origin.length) || '/' : url;
}

function IssueGroup({ group, origin }: { group: AuditIssueGroup; origin: string }) {
  const [open, setOpen] = useState(false);
  const tone = SEVERITY[group.severity];
  return (
    <div className="card" style={{ padding: 0 }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
        <span className="badge" style={{ background: `${tone.color}22`, color: tone.color, border: `1px solid ${tone.color}55`, flexShrink: 0 }}>{tone.label}</span>
        <span style={{ flex: 1, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700 }}>{group.title}</span>
        <span style={{ fontWeight: 800, color: tone.color, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18 }}>{group.count}</span>
        <span style={{ color: 'var(--muted)', width: 12 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginTop: 14 }}>{group.explanation}</p>
          <div className="form-label" style={{ marginTop: 14, color: 'var(--green)' }}>How to fix</div>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{group.howToFix}</p>
          <div className="form-label" style={{ marginTop: 14 }}>
            Affected {group.count > group.items.length ? `(first ${group.items.length} of ${group.count})` : `(${group.count})`}
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map((item, index) => (
              <div key={`${item.url}-${index}`} style={{ fontSize: 12 }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>{pathOf(item.url, origin)}</a>
                {item.details ? <div style={{ color: 'var(--muted)', marginTop: 2, wordBreak: 'break-word' }}>{formatDetails(item.details)}</div> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PagesTable({ pages, origin }: { pages: AuditPageSummary[]; origin: string }) {
  const [onlyIssues, setOnlyIssues] = useState(false);
  const shown = onlyIssues ? pages.filter((page) => page.issueTypes.length > 0) : pages;
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ fontSize: 15 }}>Pages crawled ({shown.length})</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyIssues} onChange={(event) => setOnlyIssues(event.target.checked)} />
          Only pages with issues
        </label>
      </div>
      <TableWrap minWidth={760}>
        <table className="data-table">
          <thead><tr><th>Page</th><th>Status</th><th>Title</th><th>Words</th><th>H1</th><th>ms</th><th>Depth</th><th>Issues</th></tr></thead>
          <tbody>
            {shown.map((page) => {
              const bad = page.statusCode === 0 || page.statusCode >= 400;
              return (
                <tr key={page.url}>
                  <td style={{ maxWidth: 280 }}><a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>{pathOf(page.url, origin)}</a></td>
                  <td style={{ color: bad ? '#ff6b6b' : page.statusCode >= 300 ? 'var(--yellow)' : 'var(--green)', fontWeight: 700 }}>
                    {page.statusCode === 0 ? (page.fetchError ?? 'failed') : page.statusCode}
                  </td>
                  <td style={{ maxWidth: 260, color: 'var(--muted)' }}>{page.redirectUrl ? `→ ${pathOf(page.redirectUrl, origin)}` : page.title || '—'}</td>
                  <td>{page.isHtml ? page.wordCount : '—'}</td>
                  <td>{page.isHtml ? page.h1Count : '—'}</td>
                  <td>{page.responseTimeMs || '—'}</td>
                  <td>{page.crawlDepth ?? 'sitemap'}</td>
                  <td style={{ color: page.issueTypes.length ? 'var(--yellow)' : 'var(--muted)', fontWeight: 700 }}>{page.issueTypes.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function Report({ report }: { report: AuditReport }) {
  const { stats } = report;
  const stopText: Record<string, string> = {
    'page-limit': `Stopped at the ${report.maxPages}-page limit with ${stats.urlsNotCrawled} URLs not reached. Raise the limit for a full picture.`,
    'time-limit': `Stopped at the time limit with ${stats.urlsNotCrawled} URLs not reached.`,
    'rate-limited': 'Stopped early: the site kept answering 429 Too Many Requests.',
  };
  const exportIssues = () => {
    const rows: unknown[][] = [['Severity', 'Issue', 'URL', 'Details', 'How to fix']];
    for (const group of report.issueGroups) {
      for (const item of group.items) rows.push([SEVERITY[group.severity].label, group.title, item.url, formatDetails(item.details), group.howToFix]);
    }
    downloadCsv(`site-audit-${new URL(report.origin).hostname}-${report.finishedAt.slice(0, 10)}.csv`, rows);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="section-title" style={{ wordBreak: 'break-all' }}>{report.origin}</div>
          <div className="section-sub">{when(report.finishedAt)} · took {(report.durationMs / 1000).toFixed(1)}s</div>
        </div>
        <button type="button" className="btn btn-ghost" style={SMALL_BTN} onClick={exportIssues} disabled={report.issueGroups.length === 0}>Export issues (CSV)</button>
      </div>
      {stats.stopReason ? <Notice tone="warn">{stopText[stats.stopReason]}</Notice> : null}
      <div className="stats-grid">
        <StatTile label="Pages crawled" value={stats.pagesCrawled} sub={`${stats.htmlPages} HTML pages`} />
        <StatTile label="Clean pages" value={`${stats.cleanPages}/${stats.htmlPages}`} sub="No critical or warning issue" color="var(--green)" />
        <StatTile label="Critical" value={stats.critical} color={stats.critical ? SEVERITY.critical.color : 'var(--muted)'} />
        <StatTile label="Warnings" value={stats.warning} color={stats.warning ? SEVERITY.warning.color : 'var(--muted)'} />
        <StatTile label="Notices" value={stats.info} color={stats.info ? SEVERITY.info.color : 'var(--muted)'} />
        <StatTile label="Sitemap URLs" value={stats.sitemapFound ? stats.sitemapUrls : 'None'}
          sub={`robots.txt ${stats.robotsTxtFound ? 'found' : 'missing'}${stats.disallowedByRobots ? ` · ${stats.disallowedByRobots} blocked${stats.respectedRobots ? ', not crawled' : ', crawled anyway'}` : ''}`} />
      </div>
      {report.issueGroups.length === 0
        ? <Notice tone="ok">No issues found on the pages crawled.</Notice>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{report.issueGroups.map((group) => <IssueGroup key={group.type} group={group} origin={report.origin} />)}</div>}
      <PagesTable pages={report.pages} origin={report.origin} />
    </div>
  );
}

export default function SiteAuditTab({ isAdmin }: { isAdmin: boolean }) {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [ignoreRobots, setIgnoreRobots] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const prefilled = useRef(false);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/seo/audit');
      if (!response.ok) return;
      const data = await response.json();
      setAudits(data.audits || []);
      if (!prefilled.current && data.defaultDomain) {
        prefilled.current = true;
        setUrl((current) => current || data.defaultDomain);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
    return () => abortRef.current?.abort();
  }, [loadHistory]);

  async function openAudit(id: number) {
    setError(null);
    try {
      const response = await fetch(`/api/seo/audit?id=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!data.report) throw new Error(data.row?.error || 'That audit has no report.');
      setReport(data.report);
      setOpenId(id);
    } catch (e: any) {
      setError(e.message || 'Could not open that audit.');
    }
  }

  async function removeAudit(id: number) {
    if (!window.confirm('Delete this saved audit?')) return;
    await fetch(`/api/seo/audit?id=${id}`, { method: 'DELETE' });
    if (openId === id) { setReport(null); setOpenId(null); }
    loadHistory();
  }

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || running) return;
    setRunning(true); setError(null); setProgress(null); setReport(null); setOpenId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/seo/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages, respectRobots: !ignoreRobots }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `The audit could not start (${response.status}).`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      const handle = (line: string) => {
        if (!line.trim()) return;
        const message = JSON.parse(line);
        if (message.type === 'progress') setProgress(message as AuditProgress);
        if (message.type === 'error') throw new Error(message.message);
        if (message.type === 'result') { finished = true; setReport(message.report); setOpenId(message.id); }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(handle);
      }
      handle(buffer);
      if (!finished) throw new Error('The connection dropped before the audit finished. It may still be saved: check Past audits in a minute.');
    } catch (e: any) {
      if (!controller.signal.aborted) setError(e.message || 'The audit failed.');
    } finally {
      setRunning(false);
      abortRef.current = null;
      loadHistory();
    }
  }

  const percent = progress ? Math.min(100, Math.round((progress.crawled / progress.limit) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isAdmin ? (
        <form onSubmit={run} className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 260px', minWidth: 0 }}>
              <span className="form-label">Website</span>
              <input className="form-input" value={url} onChange={(event) => setUrl(event.target.value)} disabled={running}
                placeholder="example.com" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </label>
            <label>
              <span className="form-label">Page limit</span>
              <select className="form-input" style={SELECT_STYLE} value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))} disabled={running}>
                {PAGE_LIMITS.map((limit) => <option key={limit} value={limit}>{limit} pages</option>)}
              </select>
            </label>
            {running
              ? <button type="button" className="btn btn-ghost" onClick={() => abortRef.current?.abort()}>Cancel</button>
              : <button type="submit" className="btn btn-pink" disabled={!url.trim()}>Run audit</button>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', marginTop: 12 }}>
            <input type="checkbox" checked={ignoreRobots} disabled={running} onChange={(event) => setIgnoreRobots(event.target.checked)} />
            Crawl pages that robots.txt blocks (for your own site before launch)
          </label>
          <p className="section-sub" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Free. Reads robots.txt and the sitemap, then follows same-site links up to the page limit. It reads raw HTML: it does not run JavaScript or measure page speed.
          </p>
        </form>
      ) : (
        <Notice tone="info">Audits are run by an admin. Past reports are listed below.</Notice>
      )}

      {running && (
        <div className="card" role="status" aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
            <strong style={{ color: 'var(--green)' }}>
              {progress ? `Crawling: ${progress.crawled} of up to ${progress.limit} pages` : 'Reading robots.txt and the sitemap'}
            </strong>
            {progress ? <span style={{ color: 'var(--muted)' }}>{progress.queued} queued</span> : null}
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent}%`, background: 'var(--green)', transition: 'width 0.3s' }} />
          </div>
          {progress ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{progress.currentUrl}</div> : null}
        </div>
      )}

      {error ? <Notice tone="error">{error}</Notice> : null}
      {report && !running ? <Report report={report} /> : null}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px' }}>
          <div className="section-title" style={{ fontSize: 15 }}>Past audits</div>
          <div className="section-sub">Every audit is saved. Open one to see the full report again.</div>
        </div>
        {audits.length === 0 ? (
          <div style={{ padding: '0 20px 18px', fontSize: 13, color: 'var(--muted)' }}>No audits yet.</div>
        ) : (
          <TableWrap minWidth={720}>
            <table className="data-table">
              <thead><tr><th>Site</th><th>When</th><th>Pages</th><th>Clean</th><th>Critical</th><th>Warnings</th><th>Notices</th><th></th></tr></thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id} style={openId === audit.id ? { background: 'rgba(168,207,69,0.06)' } : undefined}>
                    <td style={{ fontWeight: 600 }}>{audit.domain}</td>
                    <td style={{ color: 'var(--muted)' }}>{when(audit.started_at)}</td>
                    {audit.status === 'done' ? (
                      <>
                        <td>{audit.pages_crawled}</td>
                        <td style={{ color: 'var(--green)' }}>{audit.clean_pages}/{audit.html_pages}</td>
                        <td style={{ color: audit.critical ? SEVERITY.critical.color : 'var(--muted)', fontWeight: 700 }}>{audit.critical}</td>
                        <td style={{ color: audit.warning ? SEVERITY.warning.color : 'var(--muted)', fontWeight: 700 }}>{audit.warning}</td>
                        <td style={{ color: audit.info ? SEVERITY.info.color : 'var(--muted)', fontWeight: 700 }}>{audit.info}</td>
                      </>
                    ) : (
                      <td colSpan={5} style={{ color: audit.status === 'failed' ? '#ff6b6b' : 'var(--yellow)' }}>
                        {audit.status === 'failed' ? `Failed: ${audit.error ?? 'unknown reason'}` : 'Running…'}
                      </td>
                    )}
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {audit.status === 'done' ? <button type="button" className="btn btn-ghost" style={{ ...SMALL_BTN, padding: '4px 10px' }} onClick={() => openAudit(audit.id)}>Open</button> : null}
                      {isAdmin ? <button type="button" aria-label={`Delete audit of ${audit.domain}`} onClick={() => removeAudit(audit.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginLeft: 8, fontSize: 14 }}>✕</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
