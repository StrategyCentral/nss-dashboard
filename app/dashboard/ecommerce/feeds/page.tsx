'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Field = { key: string; label: string; required: boolean };
type Check = {
  checked_at: string; ok: boolean; error?: string; http_status?: number; bytes?: number; format?: string;
  products: number; unique_ids: number; coverage: Record<string, number>; score: number;
};
type Feed = {
  id: number; name: string; url: string; merchant_id: number | null;
  merchant_name: string | null; last_check: Check | null;
};
type MerchantOpt = { id: number; name: string; platform: string };

const num = (n: number) => n.toLocaleString('en-AU');
const pct = (have: number, of: number) => (of ? Math.round((100 * have) / of) : 0);
const tone = (p: number) => (p >= 95 ? '#a8cf45' : p >= 60 ? '#ff8c00' : '#ff4d4d');

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function ProductFeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [merchants, setMerchants] = useState<MerchantOpt[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState({ url: '', name: '', merchant_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const r = await fetch('/api/ecommerce/feeds');
    if (r.ok) {
      const d = await r.json();
      setFeeds(d.feeds); setMerchants(d.merchants); setFields(d.fields); setCanEdit(d.canEdit);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function check(id: number) {
    setChecking(c => ({ ...c, [id]: true }));
    const r = await fetch(`/api/ecommerce/feeds/${id}/check`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setChecking(c => ({ ...c, [id]: false }));
    if (r.ok) setFeeds(fs => fs.map(f => f.id === id ? { ...f, last_check: d.check } : f));
    else alert(d.error || 'Could not check the feed.');
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await fetch('/api/ecommerce/feeds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error || 'Could not add the feed.'); return; }
    setForm({ url: '', name: '', merchant_id: '' });
    await load();
    check(d.id); // check a new feed straight away
  }

  async function setMerchant(id: number, merchant_id: string) {
    await fetch('/api/ecommerce/feeds', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, merchant_id: merchant_id ? Number(merchant_id) : null }) });
    load();
  }

  async function remove(f: Feed) {
    if (!confirm(`Remove the feed "${f.name}"? This only removes it from the suite, not from your website.`)) return;
    await fetch(`/api/ecommerce/feeds?id=${f.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Product Feeds</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
          The product files your merchant centres read. Check one to see how many products it sends and which Google Shopping fields are missing.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
          {feeds.map(f => {
            const c = f.last_check;
            const busyCheck = !!checking[f.id];
            return (
              <div key={f.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{f.name}</div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{f.url}</a>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                      <span>Sends to</span>
                      {canEdit ? (
                        <select value={f.merchant_id ?? ''} onChange={e => setMerchant(f.id, e.target.value)} aria-label="Merchant centre" className="form-input"
                          style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                          <option value="">Not linked</option>
                          {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text)' }}>{f.merchant_name || 'Not linked'}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {c?.ok && (
                      <div style={{ textAlign: 'right', marginRight: 6 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: tone(c.score), lineHeight: 1 }}>{c.score}%</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Feed score</div>
                      </div>
                    )}
                    <button type="button" onClick={() => check(f.id)} disabled={busyCheck} className="btn btn-ghost" style={{ fontSize: 12, padding: '8px 14px', opacity: busyCheck ? 0.6 : 1 }}>
                      {busyCheck ? 'Checking…' : c ? 'Check again' : 'Check now'}
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => remove(f)} aria-label={`Remove ${f.name}`} title="Remove"
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 2 }}>×</button>
                    )}
                  </div>
                </div>

                {busyCheck && !c && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Downloading the feed… big feeds take up to 45 seconds.</div>}

                {c && !c.ok && (
                  <div style={{ fontSize: 12, color: '#ff6b6b', marginTop: 12 }}>
                    {c.error || 'The check failed.'} <span style={{ color: 'var(--muted)' }}>({when(c.checked_at)})</span>
                  </div>
                )}

                {c?.ok && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                      <span><b style={{ color: 'var(--text)' }}>{num(c.products)}</b> products</span>
                      {c.unique_ids < c.products && c.unique_ids > 0 && (
                        <span style={{ color: '#ff8c00' }}>{num(c.products - c.unique_ids)} duplicate IDs</span>
                      )}
                      {c.format && <span>{c.format.toUpperCase()}</span>}
                      {c.bytes ? <span>{(c.bytes / 1024 / 1024).toFixed(1)} MB</span> : null}
                      <span>Checked {when(c.checked_at)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '8px 18px' }}>
                      {fields.map(fd => {
                        const have = c.coverage[fd.key] || 0;
                        const p = pct(have, c.products);
                        return (
                          <div key={fd.key} title={`${num(have)} of ${num(c.products)} products`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span style={{ color: fd.required ? 'var(--text)' : 'var(--muted)' }}>{fd.label}{fd.required ? '' : ' (optional)'}</span>
                              <span style={{ color: fd.required ? tone(p) : 'var(--muted)', fontWeight: 600 }}>{p}%</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                              <div style={{ width: `${p}%`, height: '100%', borderRadius: 2, background: fd.required ? tone(p) : '#555' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {feeds.length === 0 && (
            <div className="card" style={{ color: 'var(--muted)', fontSize: 13 }}>
              No product feeds yet for this website.{canEdit ? ' Paste your feed URL below (WooCommerce feed plugins give you one).' : ''}
            </div>
          )}
        </div>
      )}

      {canEdit && !loading && (
        <form onSubmit={add} className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>Add feed</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required
              placeholder="Feed URL, e.g. https://yoursite.com/feed.xml" aria-label="Feed URL" className="form-input" style={{ flex: '2 1 280px' }} />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name (optional)" aria-label="Name" className="form-input" style={{ flex: '1 1 150px' }} />
            <select value={form.merchant_id} onChange={e => setForm(f => ({ ...f, merchant_id: e.target.value }))} aria-label="Merchant centre" className="form-input" style={{ flex: '0 1 220px' }}>
              <option value="">Sends to… (optional)</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button type="submit" disabled={busy} className="btn btn-pink" aria-label="Add feed"
              style={{ width: 42, height: 40, padding: 0, fontSize: 22, lineHeight: 1, opacity: busy ? 0.6 : 1 }}>+</button>
          </div>
          {error && <div style={{ fontSize: 12, color: '#ff6b6b', marginTop: 8 }}>{error}</div>}
          {merchants.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Tip: add your merchant centres under <Link href="/dashboard/ecommerce/merchant" style={{ color: 'var(--pink)' }}>Merchant Centres</Link> first, so each feed can show where it goes.
            </div>
          )}
        </form>
      )}
    </div>
  );
}
