'use client';
import { useState } from 'react';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setError('');
    if (form.next.length < 12) { setError('New password must be at least 12 characters.'); return; }
    if (form.next !== form.confirm) { setError('The new passwords do not match.'); return; }
    setSaving(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: form.current, new_password: form.next }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) { setMsg('Password changed.'); setForm({ current: '', next: '', confirm: '' }); }
    else setError(d.error || 'Could not change the password.');
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Change Password</h1>
        <p className="section-sub">For signing in with email and password on this site. Hub sign-in is not affected.</p>
      </div>
      <div className="card" style={{ maxWidth: 420 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="form-label">Current password</label>
            <input className="form-input" type="password" autoComplete="current-password" value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">New password (12+ characters)</label>
            <input className="form-input" type="password" autoComplete="new-password" value={form.next}
              onChange={e => setForm(f => ({ ...f, next: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Confirm new password</label>
            <input className="form-input" type="password" autoComplete="new-password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
          </div>
          {msg && <div style={{ fontSize: 12, color: 'var(--green)' }}>✓ {msg}</div>}
          {error && <div style={{ fontSize: 12, color: '#ff6b6b' }}>{error}</div>}
          <div><button className="btn btn-pink" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Change Password'}</button></div>
        </form>
      </div>
    </div>
  );
}
