'use client';
import { useEffect, useState } from 'react';

type Account = { id: number; name: string; domain: string; created_at?: string; users?: number };

/**
 * ACE staff only. Every customer on the platform is an account with its own
 * data, connections and logins. Opening one switches the whole suite to it.
 */
export default function CustomersPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: '', domain: '', email: '', password: '' });
  const [editing, setEditing] = useState<Account | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch('/api/accounts');
    if (!r.ok) { setAllowed(false); return; }
    const d = await r.json();
    setAllowed(!!d.platform);
    setAccounts(d.accounts || []);
    setCurrent(d.current ?? null);
  }
  useEffect(() => { load(); }, []);

  async function post(body: any) {
    const r = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setError(''); setBusy(true);
    const { ok, d } = await post({ action: 'create', ...form });
    setBusy(false);
    if (!ok) { setError(d.error || 'Could not add the customer.'); return; }
    setMsg(`${d.account.name} added.${form.email ? ` ${form.email} can sign in now.` : ''}`);
    setForm({ name: '', domain: '', email: '', password: '' });
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setMsg(''); setError('');
    const { ok, d } = await post({ action: 'update', id: editing.id, name: editing.name, domain: editing.domain });
    if (!ok) { setError(d.error || 'Could not save.'); return; }
    setEditing(null);
    load();
  }

  async function open(id: number) {
    const { ok } = await post({ action: 'switch', id });
    if (ok) window.location.href = '/dashboard';
  }

  if (allowed === false) {
    return <div className="card"><div className="section-title" style={{ fontSize: 15 }}>Customers</div><p className="section-sub">Only ACE staff can manage customer accounts.</p></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Customers</h1>
        <p className="section-sub">Each customer is an account with its own data, connections and logins. Nothing is shared between them.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <table className="data-table">
          <thead><tr><th>Customer</th><th>Website</th><th>Logins</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>
                  {a.name}
                  {a.id === current && <span className="badge badge-live" style={{ fontSize: 10, marginLeft: 8 }}>● Open now</span>}
                </td>
                <td style={{ color: 'var(--muted)' }}>{a.domain || '—'}</td>
                <td>{a.users ?? 0}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{a.created_at?.slice(0, 10)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, marginRight: 6 }} onClick={() => setEditing({ ...a })}>Edit</button>
                  <button className="btn btn-pink" style={{ padding: '4px 10px', fontSize: 11 }} disabled={a.id === current} onClick={() => open(a.id)}>
                    {a.id === current ? 'Open' : 'Open account'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
          To add or remove a customer&apos;s logins, open their account and go to Admin → Users.
        </p>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ fontSize: 15, marginBottom: 16 }}>Edit {accounts.find(a => a.id === editing.id)?.name}</div>
          <form onSubmit={saveEdit} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Customer name</label>
              <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Website</label>
              <input className="form-input" value={editing.domain} onChange={e => setEditing({ ...editing, domain: e.target.value })} placeholder="example.com" />
            </div>
            <button className="btn btn-pink" type="submit">Save</button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="section-title" style={{ fontSize: 15, marginBottom: 4 }}>Add a customer</div>
        <p className="section-sub" style={{ marginBottom: 16 }}>The account starts empty. Add their first login here, or leave it blank and add logins later.</p>
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label className="form-label">Customer name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Business name" required />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input className="form-input" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="example.com" />
            </div>
            <div>
              <label className="form-label">First login email (optional)</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="owner@example.com" />
            </div>
            <div>
              <label className="form-label">Password for that login</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8 characters or more" disabled={!form.email} />
            </div>
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ {msg}</div>}
          {error && <div style={{ fontSize: 12, color: '#ff6b6b' }}>{error}</div>}
          <div><button className="btn btn-pink" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add customer'}</button></div>
        </form>
      </div>
    </div>
  );
}
