'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Canonical sidebar — see brain doc:
// PROJECTS/ACE BUSINESS SUITE/ace-business-suite-architecture.md §4.1
// Sub-tabs (Overview > Overall ROI / Revenue Attribution / etc; SEO > Rankings / Link Monitor / etc)
// are rendered as top-of-page tabs inside each section, not in this sidebar.
const NAV = [
  { href: '/dashboard',                 icon: '◈', label: 'Overview' },
  { href: '/dashboard/timeline',        icon: '◷', label: 'Timeline' },
  { href: '/dashboard/money-map',       icon: '⌖', label: 'Money Map' },
  { href: '/dashboard/seo',             icon: '◎', label: 'SEO' },
  { href: '/dashboard/meta-ads',        icon: 'M', label: 'Meta Ads' },
  { href: '/dashboard/google-ads',      icon: 'G', label: 'Google Ads' },
  { href: '/dashboard/tiktok-ads',      icon: '♪', label: 'TikTok Ads' },
  { href: '/dashboard/reddit-ads',      icon: 'R', label: 'Reddit Ads' },
  { href: '/dashboard/pinterest-ads',   icon: 'P', label: 'Pinterest Ads' },
];
const ADMIN = [
  { href: '/admin/connections',  icon: '⟳', label: 'Connections' },
  { href: '/admin/attribution',  icon: '⊞', label: 'Attribution Backfill' },
  { href: '/admin/margins',      icon: '%', label: 'Product Margins' },
  { href: '/admin/users',        icon: '◉', label: 'Users' },
  { href: '/admin/seo-costs',    icon: '⊞', label: 'SEO Costs' },
];
// ACE staff only: the customer accounts on the platform.
const STAFF = [
  { href: '/admin/customers',    icon: '▣', label: 'Customers' },
];

type Me = {
  email: string;
  role: string;
  platform: boolean;
  account: { id: number; name: string; domain: string };
  accounts?: { id: number; name: string; domain: string }[];
};

const CONDENSED = "'Barlow Condensed',sans-serif";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  // Shown inside the ACE Customer Hub: the Hub already has a sidebar, so the
  // suite's own menu becomes a slim bar across the top and Sign Out goes away.
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    let framed = false;
    try { framed = window.self !== window.top; } catch { framed = true; }
    setEmbedded(framed);
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.push('/'); return; }
      setMe(d);
    });
  }, []);

  // Tell the Hub which page is open, so a refresh or a shared link lands on the same one.
  useEffect(() => {
    if (!embedded) return;
    try { window.parent.postMessage({ type: 'ace-suite:navigate', path: pathname }, '*'); } catch {}
  }, [embedded, pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function switchAccount(id: number) {
    const r = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'switch', id }) });
    if (r.ok) window.location.reload();
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const isAdmin = me?.role === 'admin';
  const adminItems = isAdmin ? [...ADMIN, ...(me?.platform ? STAFF : [])] : [];
  const activeStyle = { background: 'rgba(231,37,141,0.12)', color: 'var(--pink)' };

  // Which customer's data is on screen. ACE staff can switch; a customer just sees their own name.
  const accountPicker = me && (
    me.platform && (me.accounts?.length || 0) > 1 ? (
      <select
        aria-label="Customer account"
        value={me.account.id}
        onChange={e => switchAccount(Number(e.target.value))}
        className="form-input"
        style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600, width: embedded ? 220 : '100%' }}
      >
        {me.accounts!.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    ) : (
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{me.account.name}</div>
    )
  );

  if (embedded) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <nav style={{ display: 'flex', gap: 2, overflowX: 'auto', flex: 1, alignItems: 'center' }}>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                style={{ padding: '7px 10px', whiteSpace: 'nowrap', gap: 6, ...(isActive(item.href) ? activeStyle : {}) }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            {adminItems.length > 0 && <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px', flexShrink: 0 }} />}
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                style={{ padding: '7px 10px', whiteSpace: 'nowrap', fontSize: 12, ...(isActive(item.href) ? activeStyle : {}) }}>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontFamily: CONDENSED, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Account</span>
            {accountPicker}
          </div>
        </header>
        <main style={{ padding: '24px 24px 40px' }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 'var(--sidebar)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '0 8px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        {/* Logo */}
        <div style={{ padding: '20px 8px 14px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: CONDENSED, fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.1 }}>ACE</div>
              <div style={{ fontFamily: CONDENSED, fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.1 }}>MARKETING SUITE</div>
            </div>
          </div>
          {/* colour stripe */}
          <div style={{ display: 'flex', marginTop: 10, borderRadius: 2, overflow: 'hidden', height: 2 }}>
            <div style={{ flex: 1, background: 'var(--pink)' }}/>
            <div style={{ flex: 1, background: 'var(--yellow)' }}/>
            <div style={{ flex: 1, background: 'var(--green)' }}/>
            <div style={{ flex: 1, background: 'var(--blue)' }}/>
          </div>
          {/* The customer account on screen */}
          {me && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontFamily: CONDENSED, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Account</div>
              {accountPicker}
              {me.account.domain && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{me.account.domain}</div>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: CONDENSED, letterSpacing: '0.1em', color: 'var(--muted)', padding: '12px 14px 4px', textTransform: 'uppercase' }}>Marketing</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              style={isActive(item.href) ? activeStyle : {}}>
              <span style={{ width: 18, textAlign: 'center', fontSize: 13, fontFamily: 'monospace' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {adminItems.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontFamily: CONDENSED, letterSpacing: '0.1em', color: 'var(--muted)', padding: '16px 14px 4px', textTransform: 'uppercase' }}>Admin</div>
              {adminItems.map(item => (
                <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                  style={isActive(item.href) ? activeStyle : {}}>
                  <span style={{ width: 18, textAlign: 'center', fontSize: 13, fontFamily: 'monospace' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
          {me && <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 14px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.email}</div>}
          <Link href="/dashboard/password" className={`nav-item${isActive('/dashboard/password') ? ' active' : ''}`}
            style={isActive('/dashboard/password') ? activeStyle : {}}>
            <span style={{ width: 18, textAlign: 'center' }}>⚿</span>
            <span>Change Password</span>
          </Link>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ width: 18, textAlign: 'center' }}>→</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 'var(--sidebar)', flex: 1, padding: '28px 32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
