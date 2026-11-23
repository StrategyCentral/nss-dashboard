'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Platform = { key: string; name: string; idLabel: string; color: string };
type Merchant = {
  id: number; platform: string; name: string; account_ref: string; console_url: string;
  status: string; notes: string; feeds: number; open_url: string;
};

const STATUS_COLOR: Record<string, string> = {
  'Active': '#a8cf45', 'Setting up': '#04aae8', 'Under review': '#ff8c00', 'Suspended': '#ff4d4d', 'Paused': '#888',
};

export default function MerchantCentresPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ platform: 'google', account_ref: '', name: '', console_url: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await fetch('/api/ecommerce/merchants');
    if (r.ok) {
      const d = await r.json();
      setMerchants(d.merchants); setPlatforms(d.platforms); setStatuses(d.statuses); setCanEdit(d.canEdit);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const platform = (key: string) => platforms.find(p => p.key === key);
  const chosen = platform(form.platform);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await fetch('/api/ecommerce/merchants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error || 'Could not add it.'); return; }
    setForm(f => ({ ...f, account_ref: '', name: '', console_url: '' }));
    load();
  }

  async function patch(id: number, body: object) {
    setMerchants(ms => ms.map(m => m.id === id ? { ...m, ...body } : m));
    await fetch('/api/ecommerce/merchants', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
  }

  async function remove(m: Merchant) {
    if (!confirm(`Remove ${m.name} from this website? Its feeds stay under Product Feeds.`)) return;
    await fetch(`/api/ecommerce/merchants?id=${m.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Merchant Centres</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
          Every place this website sells its products. Open one to manage it, and link its feed under Product Feeds.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 18 }}>
          {merchants.map(m => {
            const p = platform(m.platform);
            const color = p?.color || '#888';
            return (
              <div key={m.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, borderTop: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p?.name || m.platform}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {p?.idLabel || 'ID'}: {m.account_ref || <em>not set</em>}
                    </div>
                  </div>
                  {canEdit && (
                    <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.name}`} title="Remove"
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {canEdit ? (
                    <select value={m.status} onChange={e => patch(m.id, { status: e.target.value })} aria-label="Status" className="form-input"
                      style={{ width: 'auto', padding: '5px 8px', fontSize: 12, color: STATUS_COLOR[m.status] || 'var(--text)' }}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[m.status] || 'var(--text)' }}>● {m.status}</span>
                  )}
                  <Link href="/dashboard/ecommerce/feeds" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>
                    {m.feeds === 1 ? '1 feed' : `${m.feeds} feeds`} →
                  </Link>
                </div>

                {canEdit ? (
                  <textarea defaultValue={m.notes} placeholder="Notes (issues, who has access, next step)" rows={2} className="form-input"
                    onBlur={e => { if (e.target.value !== m.notes) patch(m.id, { notes: e.target.value }); }}
                    style={{ fontSize: 12, padding: '7px 9px', resize: 'vertical' }} />
                ) : m.notes ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{m.notes}</div>
                ) : null}

                {m.open_url && (
                  <a href={m.open_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"
                    style={{ textAlign: 'center', fontSize: 12, padding: '8px 12px', textDecoration: 'none', marginTop: 'auto' }}>
                    Open {p?.name || 'console'} ↗
                  </a>
                )}
              </div>
            );
          })}

          {merchants.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', color: 'var(--muted)', fontSize: 13 }}>
              No merchant centres yet for this website.{canEdit ? ' Add the first one below.' : ''}
            </div>
          )}
        </div>
      )}

      {canEdit && !loading && (
        <form onSubmit={add} className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>Add more</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} aria-label="Platform" className="form-input" style={{ width: 230, flex: '0 0 auto' }}>
              {platforms.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
            <input value={form.account_ref} onChange={e => setForm(f => ({ ...f, account_ref: e.target.value }))}
              placeholder={chosen?.idLabel || 'Account ID'} aria-label={chosen?.idLabel || 'Account ID'} className="form-input" style={{ flex: '1 1 150px' }} />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required={form.platform === 'other'}
              placeholder={form.platform === 'other' ? 'Name' : 'Name (optional)'} aria-label="Name" className="form-input" style={{ flex: '1 1 150px' }} />
            {form.platform === 'other' && (
              <input value={form.console_url} onChange={e => setForm(f => ({ ...f, console_url: e.target.value }))}
                placeholder="Login link (optional)" aria-label="Login link" className="form-input" style={{ flex: '1 1 180px' }} />
            )}
            <button type="submit" disabled={busy} className="btn btn-pink" aria-label="Add merchant centre"
              style={{ width: 42, height: 40, padding: 0, fontSize: 22, lineHeight: 1, opacity: busy ? 0.6 : 1 }}>+</button>
          </div>
          {error && <div style={{ fontSize: 12, color: '#ff6b6b', marginTop: 8 }}>{error}</div>}
        </form>
      )}
    </div>
  );
}
