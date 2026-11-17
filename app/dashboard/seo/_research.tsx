'use client';
// SEO → Keyword Research and SEO → Backlink Profile.
//
// Both ask DataForSEO, which bills per lookup. Every answer is saved, and the
// same question asked again within a week is answered from the saved copy for
// free. "Refresh" pays for new data.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BacklinkProfile, CompetitorRow, KeywordRow } from '@/lib/dataforseo';
import type { LookupKind, LookupRow } from '@/lib/seo-store';
import {
  COUNTRIES, NotConnected, Notice, Pill, SELECT_STYLE, SMALL_BTN, SpendLine, StatTile, TableWrap,
  countryLabel, downloadCsv, slug, usd, when,
} from './_seo-shared';

interface Status {
  configured: boolean;
  canRun: boolean;
  defaultDomain: string | null;
  monthSpendUsd: number;
  cacheDays: number;
  history: LookupRow[];
}

interface Answer {
  lookup: LookupRow;
  result: any;
  cached: boolean;
}

const KIND_LABEL: Record<LookupKind, string> = {
  'keyword-ideas': 'Keyword ideas',
  'domain-keywords': 'Domain keywords',
  competitors: 'Competitors',
  backlinks: 'Backlink profile',
};

/** Shared plumbing: status, history, run a lookup, reopen a saved one. */
function useResearch(kinds: LookupKind[]) {
  const [status, setStatus] = useState<Status | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/seo/research');
      if (response.ok) setStatus(await response.json());
    } catch {}
  }, []);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  async function request(run: () => Promise<Response>) {
    setLoading(true); setError(null);
    try {
      const response = await run();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `The lookup failed (${response.status}).`);
      setAnswer({ lookup: data.lookup, result: data.result, cached: Boolean(data.cached) });
    } catch (e: any) {
      setError(e.message || 'The lookup failed.');
    } finally {
      setLoading(false);
      refreshStatus();
    }
  }

  const lookUp = (kind: LookupKind, query: string, location: number, refresh = false) =>
    request(() => fetch('/api/seo/research', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, query, location, refresh }),
    }));
  const open = (id: number) => request(() => fetch(`/api/seo/research?id=${id}`));
  const remove = async (id: number) => {
    if (!window.confirm('Delete this saved lookup?')) return;
    await fetch(`/api/seo/research?id=${id}`, { method: 'DELETE' });
    if (answer?.lookup.id === id) setAnswer(null);
    refreshStatus();
  };

  const history = useMemo(() => (status?.history ?? []).filter((row) => kinds.includes(row.kind)), [status, kinds]);
  return { status, answer, setAnswer, loading, error, lookUp, open, remove, history };
}

function AnswerHeader({ answer, canRun, loading, onRefresh, onExport, summary }: {
  answer: Answer; canRun: boolean; loading: boolean; onRefresh: () => void; onExport: () => void; summary: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px' }}>
      <div>
        <div className="section-title" style={{ fontSize: 15 }}>{summary}</div>
        <div className="section-sub">
          {answer.cached
            ? `Saved copy from ${when(answer.lookup.created_at)}: free to view.`
            : `Fresh data, cost ${usd(answer.lookup.cost_usd, 4)}.`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {canRun && answer.cached ? <button type="button" className="btn btn-ghost" style={SMALL_BTN} disabled={loading} onClick={onRefresh}>Refresh (paid)</button> : null}
        <button type="button" className="btn btn-ghost" style={SMALL_BTN} onClick={onExport}>Export CSV</button>
      </div>
    </div>
  );
}

function History({ rows, activeId, canRun, onOpen, onRemove }: {
  rows: LookupRow[]; activeId: number | null; canRun: boolean; onOpen: (id: number) => void; onRemove: (id: number) => void;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '14px 20px' }}>
        <div className="section-title" style={{ fontSize: 15 }}>Saved lookups</div>
        <div className="section-sub">Opening one is free.</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '0 20px 18px', fontSize: 13, color: 'var(--muted)' }}>Nothing saved yet.</div>
      ) : (
        <TableWrap minWidth={620}>
          <table className="data-table">
            <thead><tr><th>Lookup</th><th>Asked</th><th>Country</th><th>Rows</th><th>Cost</th><th>When</th><th></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={activeId === row.id ? { background: 'rgba(168,207,69,0.06)' } : undefined}>
                  <td style={{ color: 'var(--muted)' }}>{KIND_LABEL[row.kind]}</td>
                  <td style={{ fontWeight: 600 }}>{row.query}</td>
                  <td style={{ color: 'var(--muted)' }}>{countryLabel(row.location_code)}</td>
                  <td>{row.row_count}</td>
                  <td>{usd(row.cost_usd, 4)}</td>
                  <td style={{ color: 'var(--muted)' }}>{when(row.created_at)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="btn btn-ghost" style={{ ...SMALL_BTN, padding: '4px 10px' }} onClick={() => onOpen(row.id)}>Open</button>
                    {canRun ? <button type="button" aria-label={`Delete lookup ${row.query}`} onClick={() => onRemove(row.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginLeft: 8, fontSize: 14 }}>✕</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

function difficultyColor(value: number | null): string {
  if (value === null) return 'var(--muted)';
  return value < 30 ? 'var(--green)' : value < 60 ? 'var(--yellow)' : '#ff6b6b';
}

// ─── Keyword Research ────────────────────────────────────────────────────────

const KEYWORD_KINDS: LookupKind[] = ['keyword-ideas', 'domain-keywords', 'competitors'];
const MODES: Array<{ kind: LookupKind; label: string; field: string; placeholder: string; help: string }> = [
  { kind: 'keyword-ideas', label: 'Keyword ideas', field: 'Phrase', placeholder: 'salon supplies', help: 'Longer searches that contain your phrase, with how many people search each month.' },
  { kind: 'domain-keywords', label: 'Domain keywords', field: 'Domain', placeholder: 'example.com', help: 'What a site already ranks for in Google: yours, or a competitor’s.' },
  { kind: 'competitors', label: 'Competitors', field: 'Domain', placeholder: 'example.com', help: 'Sites that rank for the same searches as this one.' },
];

export function KeywordResearchTab() {
  const research = useResearch(KEYWORD_KINDS);
  const { status, answer, loading, error } = research;
  const [kind, setKind] = useState<LookupKind>('keyword-ideas');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(2036);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [trackDomain, setTrackDomain] = useState('');
  const [trackNote, setTrackNote] = useState<string | null>(null);

  const mode = MODES.find((item) => item.kind === kind)!;
  const canRun = Boolean(status?.canRun);
  useEffect(() => { if (status?.defaultDomain) setTrackDomain((current) => current || status.defaultDomain!); }, [status?.defaultDomain]);
  useEffect(() => { setPicked(new Set()); setTrackNote(null); }, [answer?.lookup.id]);

  const shownKind = answer?.lookup.kind;
  const keywords: KeywordRow[] = shownKind === 'keyword-ideas' || shownKind === 'domain-keywords' ? answer?.result?.keywords ?? [] : [];
  const competitors: CompetitorRow[] = shownKind === 'competitors' ? answer?.result?.competitors ?? [] : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim() && !loading) research.lookUp(kind, query, location);
  }

  function toggle(keyword: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(keyword)) next.delete(keyword); else next.add(keyword);
      return next;
    });
  }

  async function trackPicked() {
    if (!answer || picked.size === 0 || !trackDomain.trim()) return;
    setTrackNote(null);
    try {
      const response = await fetch('/api/seo/rank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', domain: trackDomain, keywords: Array.from(picked), location: answer.lookup.location_code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTrackNote(`Added ${data.added} to the Rank Tracker for ${data.domain}${data.alreadyTracked ? ` (${data.alreadyTracked} were already tracked)` : ''}.`);
      setPicked(new Set());
    } catch (e: any) {
      setTrackNote(e.message || 'Could not add those keywords.');
    }
  }

  function exportCsv() {
    if (!answer) return;
    const name = `${slug(KIND_LABEL[answer.lookup.kind])}-${slug(answer.lookup.query)}.csv`;
    if (competitors.length) {
      downloadCsv(name, [['Domain', 'Shared keywords', 'Their avg position', 'Their total keywords', 'Est. monthly visits'],
        ...competitors.map((row) => [row.domain, row.sharedKeywords, row.avgPosition, row.totalKeywords, row.estimatedTraffic === null ? '' : Math.round(row.estimatedTraffic)])]);
    } else {
      downloadCsv(name, [['Keyword', 'Monthly searches', 'Difficulty', 'CPC (USD)', 'Intent', 'Position', 'URL'],
        ...keywords.map((row) => [row.keyword, row.searchVolume, row.difficulty, row.cpcUsd, row.intent, row.position, row.url])]);
    }
  }

  if (!status) return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!status.configured ? <NotConnected /> : null}
      {canRun ? (
        <form onSubmit={submit} className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {MODES.map((item) => <Pill key={item.kind} active={kind === item.kind} onClick={() => setKind(item.kind)}>{item.label}</Pill>)}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 240px', minWidth: 0 }}>
              <span className="form-label">{mode.field}</span>
              <input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode.placeholder} autoCapitalize="none" spellCheck={false} />
            </label>
            <label>
              <span className="form-label">Country</span>
              <select className="form-input" style={SELECT_STYLE} value={location} onChange={(event) => setLocation(Number(event.target.value))}>
                {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-pink" disabled={!query.trim() || loading || !status.configured}>{loading ? 'Looking up…' : 'Look up'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="section-sub" style={{ marginTop: 0 }}>{mode.help} About US$0.02 a lookup; free if asked in the last {status.cacheDays} days.</span>
            <SpendLine monthSpendUsd={status.monthSpendUsd} />
          </div>
        </form>
      ) : (
        <Notice tone="info">Lookups are run by an admin, because each one is billed. Saved lookups are listed below.</Notice>
      )}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {answer && KEYWORD_KINDS.includes(answer.lookup.kind) ? (
        <div className="card" style={{ padding: 0 }}>
          <AnswerHeader answer={answer} canRun={canRun} loading={loading} onExport={exportCsv}
            onRefresh={() => research.lookUp(answer.lookup.kind, answer.lookup.query, answer.lookup.location_code, true)}
            summary={`${KIND_LABEL[answer.lookup.kind]}: ${answer.lookup.query} · ${countryLabel(answer.lookup.location_code)} · ${answer.lookup.row_count} of ${answer.result?.total ?? answer.lookup.row_count}`} />

          {competitors.length > 0 ? (
            <TableWrap>
              <table className="data-table">
                <thead><tr><th>Competitor</th><th>Shared keywords</th><th>Their avg position</th><th>Their total keywords</th><th>Est. monthly visits</th><th></th></tr></thead>
                <tbody>
                  {competitors.map((row) => (
                    <tr key={row.domain}>
                      <td style={{ fontWeight: 600 }}>{row.domain}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>{row.sharedKeywords}</td>
                      <td>{row.avgPosition === null ? '—' : row.avgPosition.toFixed(1)}</td>
                      <td>{row.totalKeywords?.toLocaleString('en-AU') ?? '—'}</td>
                      <td>{row.estimatedTraffic === null ? '—' : Math.round(row.estimatedTraffic).toLocaleString('en-AU')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canRun ? <button type="button" className="btn btn-ghost" style={{ ...SMALL_BTN, padding: '4px 10px' }} disabled={loading}
                          onClick={() => { setKind('domain-keywords'); setQuery(row.domain); research.lookUp('domain-keywords', row.domain, answer.lookup.location_code); }}>
                          Their keywords
                        </button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : keywords.length > 0 ? (
            <>
              <TableWrap minWidth={720}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {canRun ? <th style={{ width: 30 }}><span style={{ position: 'absolute', left: -9999 }}>Select</span></th> : null}
                      <th>Keyword</th><th>Monthly searches</th><th>Difficulty</th><th>CPC (USD)</th><th>Intent</th>
                      {shownKind === 'domain-keywords' ? <><th>Position</th><th>Page</th></> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((row) => (
                      <tr key={`${row.keyword}|${row.url ?? ''}`}>
                        {canRun ? <td><input type="checkbox" aria-label={`Select ${row.keyword}`} checked={picked.has(row.keyword)} onChange={() => toggle(row.keyword)} /></td> : null}
                        <td style={{ fontWeight: 600 }}>{row.keyword}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 700 }}>{row.searchVolume?.toLocaleString('en-AU') ?? '—'}</td>
                        <td style={{ color: difficultyColor(row.difficulty), fontWeight: 700 }}>{row.difficulty ?? '—'}</td>
                        <td>{row.cpcUsd != null ? row.cpcUsd.toFixed(2) : '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{row.intent ?? '—'}</td>
                        {shownKind === 'domain-keywords' ? (
                          <>
                            <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{row.position ?? '—'}</td>
                            <td style={{ color: 'var(--muted)', maxWidth: 240, wordBreak: 'break-all' }}>{row.url ? row.url.replace(/^https?:\/\/[^/]+/, '') || '/' : '—'}</td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              {canRun ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{picked.size} selected</span>
                  <input className="form-input" style={{ width: 220 }} value={trackDomain} onChange={(event) => setTrackDomain(event.target.value)}
                    placeholder="Track for domain" aria-label="Domain to track these keywords for" autoCapitalize="none" spellCheck={false} />
                  <button type="button" className="btn btn-ghost" style={SMALL_BTN} disabled={picked.size === 0 || !trackDomain.trim()} onClick={trackPicked}>Add to Rank Tracker</button>
                  {trackNote ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{trackNote}</span> : null}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ padding: '0 20px 18px', fontSize: 13, color: 'var(--muted)' }}>DataForSEO has nothing for that.</div>
          )}
        </div>
      ) : null}

      <History rows={research.history} activeId={answer?.lookup.id ?? null} canRun={canRun} onOpen={research.open} onRemove={research.remove} />
    </div>
  );
}

// ─── Backlink Profile ────────────────────────────────────────────────────────

const BACKLINK_KINDS: LookupKind[] = ['backlinks'];

function spamColor(value: number | null): string {
  if (value === null) return 'var(--muted)';
  return value < 20 ? 'var(--green)' : value < 50 ? 'var(--yellow)' : '#ff6b6b';
}

export function BacklinkProfileTab() {
  const research = useResearch(BACKLINK_KINDS);
  const { status, answer, loading, error } = research;
  const [domain, setDomain] = useState('');
  const [view, setView] = useState<'domains' | 'links' | 'anchors'>('domains');
  const canRun = Boolean(status?.canRun);
  useEffect(() => { if (status?.defaultDomain) setDomain((current) => current || status.defaultDomain!); }, [status?.defaultDomain]);

  const profile: Omit<BacklinkProfile, 'costUsd'> | null = answer?.lookup.kind === 'backlinks' ? answer.result : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (domain.trim() && !loading) research.lookUp('backlinks', domain, 0);
  }

  function exportCsv() {
    if (!profile || !answer) return;
    const base = `backlinks-${slug(answer.lookup.query)}`;
    if (view === 'domains') {
      downloadCsv(`${base}-referring-domains.csv`, [['Referring domain', 'Rank', 'Backlinks', 'Spam score', 'First seen'],
        ...profile.referringDomains.map((row) => [row.domain, row.rank, row.backlinks, row.spamScore, row.firstSeen])]);
    } else if (view === 'links') {
      downloadCsv(`${base}-links.csv`, [['From', 'To', 'Anchor', 'Follow', 'Target broken', 'Rank', 'Spam score', 'First seen'],
        ...profile.backlinks.map((row) => [row.fromUrl, row.toUrl, row.anchor, row.dofollow ? 'follow' : 'nofollow', row.isBroken ? 'yes' : 'no', row.rank, row.spamScore, row.firstSeen])]);
    } else {
      downloadCsv(`${base}-anchors.csv`, [['Anchor text', 'Backlinks', 'Referring domains', 'Spam score'],
        ...profile.anchors.map((row) => [row.anchor, row.backlinks, row.referringDomains, row.spamScore])]);
    }
  }

  if (!status) return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>;
  const summary = profile?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!status.configured ? <NotConnected /> : null}
      {canRun ? (
        <form onSubmit={submit} className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 260px', minWidth: 0 }}>
              <span className="form-label">Domain</span>
              <input className="form-input" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" autoCapitalize="none" spellCheck={false} />
            </label>
            <button type="submit" className="btn btn-pink" disabled={!domain.trim() || loading || !status.configured}>{loading ? 'Looking up…' : 'Look up'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="section-sub" style={{ marginTop: 0 }}>
              Who links to a site: yours or a competitor’s. About US$0.10 a lookup; free if asked in the last {status.cacheDays} days.
              This is what DataForSEO has found on the web. The Link Monitor tab is for links you are watching yourself.
            </span>
            <SpendLine monthSpendUsd={status.monthSpendUsd} />
          </div>
        </form>
      ) : (
        <Notice tone="info">Lookups are run by an admin, because each one is billed. Saved lookups are listed below.</Notice>
      )}

      {error ? <Notice tone="error">{error}</Notice> : null}

      {profile && answer ? (
        <>
          {summary ? (
            <div className="stats-grid">
              <StatTile label="Backlinks" value={summary.backlinks.toLocaleString('en-AU')} />
              <StatTile label="Referring domains" value={summary.referringDomains.toLocaleString('en-AU')} sub={`${summary.referringMainDomains.toLocaleString('en-AU')} root domains`} color="var(--green)" />
              <StatTile label="Domain rank" value={summary.rank ?? '—'} sub="0–1000, higher is stronger" color="var(--blue)" />
              <StatTile label="Spam score" value={summary.spamScore ?? '—'} sub="0–100, lower is cleaner" color={spamColor(summary.spamScore)} />
              <StatTile label="Broken backlinks" value={summary.brokenBacklinks.toLocaleString('en-AU')} sub="Point at pages that no longer load" color={summary.brokenBacklinks ? 'var(--yellow)' : 'var(--muted)'} />
            </div>
          ) : null}
          <div className="card" style={{ padding: 0 }}>
            <AnswerHeader answer={answer} canRun={canRun} loading={loading} onExport={exportCsv}
              onRefresh={() => research.lookUp('backlinks', answer.lookup.query, 0, true)}
              summary={`Backlink profile: ${answer.lookup.query}`} />
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', flexWrap: 'wrap' }}>
              <Pill active={view === 'domains'} onClick={() => setView('domains')}>Referring domains ({profile.referringDomains.length} of {profile.referringDomainsTotal})</Pill>
              <Pill active={view === 'links'} onClick={() => setView('links')}>Links ({profile.backlinks.length} of {profile.backlinksTotal})</Pill>
              <Pill active={view === 'anchors'} onClick={() => setView('anchors')}>Anchor text ({profile.anchors.length} of {profile.anchorsTotal})</Pill>
            </div>
            {view === 'domains' ? (
              <TableWrap>
                <table className="data-table">
                  <thead><tr><th>Referring domain</th><th>Rank</th><th>Backlinks</th><th>Spam score</th><th>First seen</th></tr></thead>
                  <tbody>
                    {profile.referringDomains.map((row) => (
                      <tr key={row.domain}>
                        <td style={{ fontWeight: 600 }}>{row.domain}</td>
                        <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{row.rank ?? '—'}</td>
                        <td>{row.backlinks}</td>
                        <td style={{ color: spamColor(row.spamScore), fontWeight: 700 }}>{row.spamScore ?? '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{row.firstSeen ? row.firstSeen.slice(0, 10) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : view === 'links' ? (
              <TableWrap minWidth={820}>
                <table className="data-table">
                  <thead><tr><th>From</th><th>To</th><th>Anchor</th><th>Type</th><th>Rank</th><th>Spam</th></tr></thead>
                  <tbody>
                    {profile.backlinks.map((row) => (
                      <tr key={row.fromUrl + row.toUrl}>
                        <td style={{ maxWidth: 260 }}>
                          <a href={row.fromUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>{row.fromUrl.replace(/^https?:\/\//, '')}</a>
                          {row.fromTitle ? <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{row.fromTitle.slice(0, 80)}</div> : null}
                        </td>
                        <td style={{ maxWidth: 200, wordBreak: 'break-all', color: row.isBroken ? 'var(--yellow)' : 'var(--text)' }}>
                          {row.toUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}{row.isBroken ? ' (broken)' : ''}
                        </td>
                        <td style={{ maxWidth: 180, color: 'var(--muted)', wordBreak: 'break-word' }}>{row.anchor || '—'}</td>
                        <td style={{ color: row.dofollow ? 'var(--green)' : 'var(--muted)' }}>{row.dofollow ? 'follow' : 'nofollow'}</td>
                        <td>{row.rank ?? '—'}</td>
                        <td style={{ color: spamColor(row.spamScore), fontWeight: 700 }}>{row.spamScore ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <TableWrap>
                <table className="data-table">
                  <thead><tr><th>Anchor text</th><th>Backlinks</th><th>Referring domains</th><th>Spam score</th></tr></thead>
                  <tbody>
                    {profile.anchors.map((row) => (
                      <tr key={row.anchor}>
                        <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{row.anchor}</td>
                        <td>{row.backlinks}</td>
                        <td>{row.referringDomains}</td>
                        <td style={{ color: spamColor(row.spamScore), fontWeight: 700 }}>{row.spamScore ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        </>
      ) : null}

      <History rows={research.history} activeId={answer?.lookup.id ?? null} canRun={canRun} onOpen={research.open} onRemove={research.remove} />
    </div>
  );
}
