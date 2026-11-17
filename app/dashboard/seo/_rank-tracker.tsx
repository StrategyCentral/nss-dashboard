'use client';
// SEO → Rank Tracker. Pick keywords, check where a domain sits in Google for
// each, and keep every check so movement is visible over time.
//
// Different from the Rankings tab: Rankings shows what Search Console reports
// for the site's own queries. This checks live Google results for exactly the
// keywords you choose, for any domain, and costs a little per check.
import { useCallback, useEffect, useState } from 'react';
import type { TrackedKeyword } from '@/lib/seo-store';
import {
  COUNTRIES, NotConnected, Notice, SELECT_STYLE, SMALL_BTN, SpendLine, StatTile, TableWrap,
  countryLabel, downloadCsv, slug, usd, when,
} from './_seo-shared';

interface RankState {
  configured: boolean;
  canRun: boolean;
  defaultDomain: string | null;
  monthSpendUsd: number;
  costPer10ResultsUsd: number;
  domains: Array<{ domain: string; keywords: number }>;
  domain: string | null;
  tracked: TrackedKeyword[];
}

const DEPTHS = [
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
  { value: 100, label: 'Top 100' },
];

/** Position history as a small line. Higher on the chart = better position. */
function Sparkline({ history, depth }: { history: TrackedKeyword['history']; depth: number }) {
  if (history.length < 2) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
  const width = 90, height = 26, floor = depth + 1;
  const values = history.map((point) => point.position ?? floor);
  const min = Math.min(...values), max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values.map((value, index) =>
    `${((index / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(((value - min) / span) * (height - 6) + 3).toFixed(1)}`).join(' ');
  const improved = values[values.length - 1] <= values[0];
  return (
    <svg width={width} height={height} role="img"
      aria-label={`Position history: ${history.map((point) => point.position ?? 'not found').join(', ')}`}>
      <polyline points={points} fill="none" stroke={improved ? '#A8CF45' : '#ff6b6b'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Change({ row }: { row: TrackedKeyword }) {
  const now = row.latest?.position;
  const before = row.previous_position;
  if (!row.latest || before === undefined) return <span style={{ color: 'var(--muted)' }}>—</span>;
  if (now == null && before == null) return <span style={{ color: 'var(--muted)' }}>—</span>;
  if (now != null && before == null) return <span className="up">new</span>;
  if (now == null && before != null) return <span className="down">dropped out</span>;
  const delta = (before as number) - (now as number);
  if (delta === 0) return <span className="flat">no change</span>;
  return <span className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span>;
}

export default function RankTrackerTab() {
  const [state, setState] = useState<RankState | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [location, setLocation] = useState(2036);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [depth, setDepth] = useState(50);
  const [busy, setBusy] = useState<'add' | 'check' | null>(null);
  const [note, setNote] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);

  const load = useCallback(async (forDomain?: string | null) => {
    try {
      const response = await fetch(`/api/seo/rank${forDomain ? `?domain=${encodeURIComponent(forDomain)}` : ''}`);
      if (!response.ok) return;
      const data: RankState = await response.json();
      setState(data);
      setDomain(data.domain);
      setNewDomain((current) => current || data.domain || data.defaultDomain || '');
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: object) {
    const response = await fetch('/api/seo/rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
    return data;
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const keywords = newKeywords.split(/[\n,]+/).map((keyword) => keyword.trim()).filter(Boolean);
    if (keywords.length === 0 || !newDomain.trim()) return;
    setBusy('add'); setNote(null);
    try {
      const data = await post({ action: 'add', domain: newDomain, keywords, location, device });
      setNewKeywords('');
      setNote({ tone: 'ok', text: `Added ${data.added} keyword${data.added === 1 ? '' : 's'} for ${data.domain}${data.alreadyTracked ? `; ${data.alreadyTracked} already tracked` : ''}. Run a check to get positions.` });
      await load(data.domain);
    } catch (e: any) {
      setNote({ tone: 'error', text: e.message });
    } finally { setBusy(null); }
  }

  async function check(ids?: number[]) {
    if (!domain) return;
    setBusy('check'); setNote(null);
    try {
      const data = await post(ids ? { action: 'check', ids, depth } : { action: 'check', domain, depth });
      setNote(data.failed?.length
        ? { tone: 'warn', text: `Checked ${data.checked}; ${data.failed.length} failed (${data.failed[0].error}). Cost ${usd(data.costUsd, 3)}.` }
        : { tone: 'ok', text: `Checked ${data.checked} keyword${data.checked === 1 ? '' : 's'} in the ${DEPTHS.find((item) => item.value === data.depth)?.label.toLowerCase()}. Cost ${usd(data.costUsd, 3)}.` });
      await load(domain);
    } catch (e: any) {
      setNote({ tone: 'error', text: e.message });
    } finally { setBusy(null); }
  }

  async function remove(row: TrackedKeyword) {
    if (!window.confirm(`Stop tracking "${row.keyword}"? Its history is deleted too.`)) return;
    await fetch(`/api/seo/rank?id=${row.id}`, { method: 'DELETE' });
    load(domain);
  }

  if (!state) return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading…</div>;

  const tracked = state.tracked;
  const checked = tracked.filter((row) => row.latest);
  const ranking = checked.filter((row) => row.latest!.position != null);
  const top10 = ranking.filter((row) => (row.latest!.position as number) <= 10).length;
  const average = ranking.length ? ranking.reduce((sum, row) => sum + (row.latest!.position as number), 0) / ranking.length : null;
  const estimate = tracked.length * (depth / 10) * state.costPer10ResultsUsd;
  const lastChecked = checked.map((row) => row.latest!.checked_at).sort().pop();

  function exportCsv() {
    downloadCsv(`rank-tracker-${slug(domain ?? 'export')}.csv`, [
      ['Keyword', 'Country', 'Device', 'Position', 'Previous', 'Best', 'Ranking page', 'Top 3', 'Last checked (UTC)'],
      ...tracked.map((row) => [row.keyword, countryLabel(row.location_code), row.device, row.latest?.position ?? '', row.previous_position ?? '', row.best_position ?? '',
        row.latest?.url ?? '', row.latest?.top.map((item) => item.domain).join(' | ') ?? '', row.latest?.checked_at ?? '']),
    ]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!state.configured ? <NotConnected /> : null}

      {state.canRun ? (
        <form onSubmit={add} className="card">
          <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>Track keywords</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <label style={{ flex: '1 1 300px', minWidth: 0 }}>
              <span className="form-label">Keywords (one per line)</span>
              <textarea className="form-input" rows={4} value={newKeywords} onChange={(event) => setNewKeywords(event.target.value)}
                placeholder={'salon supplies\nwaxing supplies australia'} style={{ resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 220px' }}>
              <label>
                <span className="form-label">Domain</span>
                <input className="form-input" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} placeholder="example.com" autoCapitalize="none" spellCheck={false} />
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <label>
                  <span className="form-label">Country</span>
                  <select className="form-input" style={SELECT_STYLE} value={location} onChange={(event) => setLocation(Number(event.target.value))}>
                    {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="form-label">Device</span>
                  <select className="form-input" style={{ ...SELECT_STYLE, minWidth: 110 }} value={device} onChange={(event) => setDevice(event.target.value as 'desktop' | 'mobile')}>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <span className="section-sub" style={{ marginTop: 0 }}>Adding keywords is free. You pay when positions are checked.</span>
            <button type="submit" className="btn btn-pink" disabled={busy !== null || !newKeywords.trim() || !newDomain.trim()}>{busy === 'add' ? 'Adding…' : 'Add keywords'}</button>
          </div>
        </form>
      ) : (
        <Notice tone="info">Keywords are added and checked by an admin, because each check is billed.</Notice>
      )}

      {note ? <Notice tone={note.tone}>{note.text}</Notice> : null}

      {state.domains.length > 0 && domain ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <label>
              <span className="form-label">Showing</span>
              <select className="form-input" style={{ ...SELECT_STYLE, minWidth: 240 }} value={domain} onChange={(event) => load(event.target.value)}>
                {state.domains.map((item) => <option key={item.domain} value={item.domain}>{item.domain} ({item.keywords})</option>)}
              </select>
            </label>
            <SpendLine monthSpendUsd={state.monthSpendUsd} />
          </div>

          <div className="stats-grid">
            <StatTile label="Tracked keywords" value={tracked.length} />
            <StatTile label="In the top 10" value={top10} color="var(--green)" sub={checked.length ? `of ${checked.length} checked` : 'Not checked yet'} />
            <StatTile label="Average position" value={average === null ? '—' : average.toFixed(1)} color="var(--blue)" sub="Of those found" />
            <StatTile label="Not found" value={checked.length - ranking.length} color={checked.length - ranking.length ? 'var(--yellow)' : 'var(--muted)'} sub="Outside the results checked" />
            <StatTile label="Last checked" value={<span style={{ fontSize: 15 }}>{lastChecked ? when(lastChecked) : 'Never'}</span>} />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px' }}>
              <div>
                <div className="section-title" style={{ fontSize: 15 }}>{domain}</div>
                <div className="section-sub">Position in Google’s organic results. Change is against the check before. Google varies its results a little between reads, so trust the trend over one check.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {state.canRun ? (
                  <>
                    <select className="form-input" aria-label="How deep to check" style={{ ...SELECT_STYLE, minWidth: 110, padding: '7px 10px' }} value={depth} onChange={(event) => setDepth(Number(event.target.value))}>
                      {DEPTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <button type="button" className="btn btn-pink" style={SMALL_BTN} disabled={busy !== null || !state.configured || tracked.length === 0} onClick={() => check()}>
                      {busy === 'check' ? 'Checking…' : `Check all now (about ${usd(estimate)})`}
                    </button>
                  </>
                ) : null}
                <button type="button" className="btn btn-ghost" style={SMALL_BTN} onClick={exportCsv}>Export CSV</button>
              </div>
            </div>
            <TableWrap minWidth={860}>
              <table className="data-table">
                <thead><tr><th>Keyword</th><th>Position</th><th>Change</th><th>Best</th><th>Trend</th><th>Ranking page</th><th>Top 3 now</th><th>Checked</th><th></th></tr></thead>
                <tbody>
                  {tracked.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.keyword}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{countryLabel(row.location_code)} · {row.device}</div>
                      </td>
                      <td style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800,
                        color: !row.latest ? 'var(--muted)' : row.latest.position == null ? 'var(--yellow)' : row.latest.position <= 10 ? 'var(--green)' : 'var(--text)' }}>
                        {!row.latest ? '—' : row.latest.position == null ? <span style={{ fontSize: 13 }}>not in top {row.latest.depth}</span> : `#${row.latest.position}`}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 12 }}><Change row={row} /></td>
                      <td style={{ color: 'var(--muted)' }}>{row.best_position ? `#${row.best_position}` : '—'}</td>
                      <td><Sparkline history={row.history} depth={row.latest?.depth ?? 100} /></td>
                      <td style={{ maxWidth: 200, wordBreak: 'break-all', color: 'var(--muted)', fontSize: 12 }}>
                        {row.latest?.url ? <a href={row.latest.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
                          {/google\.[a-z.]+\/goto\?/i.test(row.latest.url) ? 'Open page ↗' : row.latest.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</a> : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 200 }}>{row.latest?.top.map((item) => item.domain).join(', ') || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{row.latest ? when(row.latest.checked_at) : 'Never'}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {state.canRun ? (
                          <>
                            <button type="button" className="btn btn-ghost" style={{ ...SMALL_BTN, padding: '4px 10px' }} disabled={busy !== null || !state.configured} onClick={() => check([row.id])}>Check</button>
                            <button type="button" aria-label={`Stop tracking ${row.keyword}`} onClick={() => remove(row)}
                              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginLeft: 8, fontSize: 14 }}>✕</button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 640 }}>
          Nothing is tracked yet. Add the searches you want to win, then run a check to see where the site sits in Google for each one.
          Every check is kept, so you can see movement over time.
        </div>
      )}
    </div>
  );
}
