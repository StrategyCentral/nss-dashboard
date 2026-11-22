'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const CONDENSED = "'Barlow Condensed',sans-serif";

export type NavAccount = { id: number; name: string; domain: string };
export type NavMe = {
  email: string;
  role: string;
  platform: boolean;
  account: NavAccount;
  accounts?: NavAccount[];
};

/** Open/close state for a menu that shuts on an outside click or Escape. */
function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

const panelStyle = (side: 'left' | 'right', width: number | string) => ({
  position: 'absolute', top: 'calc(100% + 6px)', [side]: 0, width, zIndex: 80,
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)', padding: 6,
} as React.CSSProperties);

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 6,
  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
  fontSize: 13, textDecoration: 'none',
} as React.CSSProperties;

/**
 * Settings: every admin page (Connections, Users, …) behind one button, so the
 * main menu only holds the tools people work in.
 */
export function SettingsMenu({ items, pathname }: { items: { href: string; icon: string; label: string }[]; pathname: string }) {
  const { open, setOpen, ref } = useMenu();
  if (items.length === 0) return null;
  const onSettings = items.some(i => pathname.startsWith(i.href));
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} className="nav-item"
        style={{ padding: '7px 10px', gap: 6, border: 'none', background: onSettings ? 'rgba(231,37,141,0.12)' : 'none', color: onSettings ? 'var(--pink)' : undefined, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace' }}>⚙</span>
        <span>Settings</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div role="menu" style={panelStyle('right', 220)}>
          {items.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)} className="nav-item"
                style={{ padding: '8px 10px', ...(active ? { background: 'rgba(231,37,141,0.12)', color: 'var(--pink)' } : {}) }}>
                <span style={{ width: 16, textAlign: 'center', fontSize: 12, fontFamily: 'monospace' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Which website is on screen. ACE staff can switch between every website and
 * add a new one; a customer just sees their own name.
 */
export function AccountSwitcher({ me, side = 'left', width = '100%' }: { me: NavMe; side?: 'left' | 'right'; width?: number | string }) {
  const { open, setOpen, ref } = useMenu();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!me.platform) {
    return <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{me.account.name}</div>;
  }

  const accounts = me.accounts?.length ? me.accounts : [me.account];
  const canAdd = me.role === 'admin';

  async function post(body: object) {
    const r = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, d: await r.json().catch(() => ({})) };
  }

  async function switchTo(id: number) {
    if (id === me.account.id) { setOpen(false); return; }
    setBusy(true);
    const { ok } = await post({ action: 'switch', id });
    if (ok) window.location.reload(); else setBusy(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    const created = await post({ action: 'create', name: form.name, domain: form.domain });
    if (!created.ok) { setError(created.d.error || 'Could not add the website.'); setBusy(false); return; }
    // Open the new website straight away: its Connections page is the next step.
    const switched = await post({ action: 'switch', id: created.d.account.id });
    if (switched.ok) window.location.href = '/admin/connections'; else window.location.reload();
  }

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label="Switch website" onClick={() => { setOpen(o => !o); setAdding(false); setError(''); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.account.name}</span>
        <span style={{ fontSize: 9, opacity: 0.7, flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div style={panelStyle(side, 280)}>
          <div style={{ fontSize: 10, fontFamily: CONDENSED, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '6px 10px 4px' }}>Websites</div>
          <div role="listbox" aria-label="Websites" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {accounts.map(a => {
              const current = a.id === me.account.id;
              return (
                <button key={a.id} type="button" role="option" aria-selected={current} disabled={busy} onClick={() => switchTo(a.id)} className="nav-item"
                  style={{ ...rowStyle, ...(current ? { background: 'rgba(231,37,141,0.12)' } : {}) }}>
                  <span style={{ width: 14, color: 'var(--pink)', fontSize: 12, flexShrink: 0 }}>{current ? '✓' : ''}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    {a.domain && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.domain}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {canAdd && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
              {!adding ? (
                <>
                  <button type="button" onClick={() => setAdding(true)} className="nav-item" style={{ ...rowStyle, color: 'var(--pink)', fontWeight: 600 }}>
                    <span style={{ width: 14, flexShrink: 0 }}>+</span><span>Add website</span>
                  </button>
                  <Link href="/admin/customers" onClick={() => setOpen(false)} className="nav-item" style={{ ...rowStyle, color: 'var(--muted)' }}>
                    <span style={{ width: 14, flexShrink: 0 }}>▣</span><span>Manage websites</span>
                  </Link>
                </>
              ) : (
                <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 6px 6px' }}>
                  <input className="form-input" autoFocus required placeholder="Name, e.g. Cam Wells Paving" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 12, padding: '7px 9px' }} />
                  <input className="form-input" placeholder="Website, e.g. camwellspaving.com.au" value={form.domain}
                    onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} style={{ fontSize: 12, padding: '7px 9px' }} />
                  {error && <div style={{ fontSize: 11, color: '#ff6b6b' }}>{error}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="submit" disabled={busy} className="btn btn-pink" style={{ flex: 1, fontSize: 12, padding: '7px 10px', opacity: busy ? 0.7 : 1 }}>{busy ? 'Adding…' : 'Add and open'}</button>
                    <button type="button" onClick={() => { setAdding(false); setError(''); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 10px' }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
