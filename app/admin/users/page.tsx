'use client';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'viewer' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const r = await fetch('/api/admin/users');
    const d = await r.json();
    setUsers(d.users || []);
  }
  useEffect(() => { load(); }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setError('');
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setMsg('User added!'); setForm({ email: '', password: '', role: 'viewer' }); load(); }
    else { const d = await res.json(); setError(d.error || 'Failed'); }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user?')) return;
    await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Users</h1>
        <p className="section-sub">Manage who can access the dashboard</p>
      </div>

      {/* Current users */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Current Users</div></div>
        <table className="data-table">
          <thead><tr><th>Email</th><th>Role</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td>
                  <span className="badge" style={{ background: u.role === 'admin' ? 'rgba(231,37,141,0.15)' : 'rgba(4,170,232,0.15)', color: u.role === 'admin' ? 'var(--pink)' : 'var(--blue)', border: `1px solid ${u.role === 'admin' ? 'rgba(231,37,141,0.3)' : 'rgba(4,170,232,0.3)'}` }}>{u.role}</span>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{u.created_at?.slice(0, 10)}</td>
                <td>
                  <button onClick={() => deleteUser(u.id)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add user */}
      <div className="card">
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Add User</div></div>
        <form onSubmit={addUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-3">
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ {msg}</div>}
          {error && <div style={{ fontSize: 12, color: '#ff6b6b' }}>{error}</div>}
          <div><button className="btn btn-pink" type="submit">Add User</button></div>
        </form>
      </div>
    </div>
  );
}
