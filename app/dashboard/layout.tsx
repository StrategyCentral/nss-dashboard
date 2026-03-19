'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '◈', label: 'Overview' },
  { href: '/dashboard/seo', icon: '◎', label: 'SEO Rankings' },
  { href: '/dashboard/facebook', icon: 'f', label: 'Facebook Ads' },
  { href: '/dashboard/google', icon: 'G', label: 'Google Ads' },
  { href: '/dashboard/quarterly', icon: '◫', label: 'Quarterly Revenue' },
  { href: '/dashboard/seo-roi', icon: '$', label: 'SEO ROI' },
  { href: '/dashboard/overall', icon: '⊕', label: 'Overall ROI' },
];
const ADMIN = [
  { href: '/admin/connections', icon: '⟳', label: 'Connections' },
  { href: '/admin/keys', icon: '⚿', label: 'API Keys' },
  { href: '/admin/users', icon: '◉', label: 'Users' },
  { href: '/admin/seo-costs', icon: '⊞', label: 'SEO Costs' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // check session
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) { router.push('/'); return; }
      setRole(d.role);
    });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 'var(--sidebar)', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '0 8px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        {/* Logo */}
        <div style={{ padding: '20px 8px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.1 }}>NATIONAL</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1.1 }}>SALON SUPPLIES</div>
            </div>
          </div>
          {/* colour stripe */}
          <div style={{ display: 'flex', marginTop: 10, borderRadius: 2, overflow: 'hidden', height: 2 }}>
            <div style={{ flex: 1, background: 'var(--pink)' }}/>
            <div style={{ flex: 1, background: 'var(--yellow)' }}/>
            <div style={{ flex: 1, background: 'var(--green)' }}/>
            <div style={{ flex: 1, background: 'var(--blue)' }}/>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', padding: '12px 14px 4px', textTransform: 'uppercase' }}>Reports</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
              style={isActive(item.href) ? { background: 'rgba(231,37,141,0.12)', color: 'var(--pink)' } : {}}>
              <span style={{ width: 18, textAlign: 'center', fontSize: 13, fontFamily: 'monospace' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {role === 'admin' && (
            <>
              <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', padding: '16px 14px 4px', textTransform: 'uppercase' }}>Admin</div>
              {ADMIN.map(item => (
                <Link key={item.href} href={item.href} className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                  style={isActive(item.href) ? { background: 'rgba(231,37,141,0.12)', color: 'var(--pink)' } : {}}>
                  <span style={{ width: 18, textAlign: 'center', fontSize: 13, fontFamily: 'monospace' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 8px' }}>
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
