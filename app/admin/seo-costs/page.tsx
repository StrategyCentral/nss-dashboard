'use client';
import { useEffect, useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SeoCostsPage() {
  const [costs, setCosts] = useState<any[]>([]);
  const now = new Date();
  const [form, setForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1, cost: 1600, notes: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await fetch('/api/admin/seo-costs');
    const d = await r.json();
    setCosts(d.costs || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/seo-costs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setMsg('Saved!'); setTimeout(() => setMsg(''), 2000); load(); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>SEO Costs</h1>
        <p className="section-sub">Log monthly SEO retainer costs to calculate accurate ROI</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Log Monthly Cost</div></div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Year</label>
              <input className="form-input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} min={2020} max={2030} required />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Month</label>
              <select className="form-input" value={form.month} onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Cost (AUD $)</label>
              <input className="form-input" type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) }))} min={0} step={10} required />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. includes extra link building" />
            </div>
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ {msg}</div>}
          <div><button className="btn btn-pink" type="submit">Save Cost</button></div>
        </form>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Cost History</div></div>
        {costs.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No costs logged yet. Add your monthly SEO retainer above.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Month</th><th>Cost</th><th>Notes</th></tr></thead>
            <tbody>
              {costs.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{MONTHS[c.month - 1]} {c.year}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>${c.cost.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
