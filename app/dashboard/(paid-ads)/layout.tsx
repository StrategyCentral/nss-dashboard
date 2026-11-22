'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Paid Ads: one sidebar entry, one tab per ad platform across the top of the page.
// The platform pages keep their own URLs (/dashboard/meta-ads etc.); this
// route group only adds the shared tab strip.
const PAID_ADS_TABS = [
  { href: '/dashboard/meta-ads',      icon: 'M', label: 'Meta Ads',      color: '#04aae8' },
  { href: '/dashboard/google-ads',    icon: 'G', label: 'Google Ads',    color: '#a8cf45' },
  { href: '/dashboard/tiktok-ads',    icon: '♪', label: 'TikTok Ads',    color: '#69C9D0' },
  { href: '/dashboard/reddit-ads',    icon: 'R', label: 'Reddit Ads',    color: '#ff8c00' },
  { href: '/dashboard/pinterest-ads', icon: 'P', label: 'Pinterest Ads', color: '#ff1e8e' },
];

function tabStyle(active: boolean, color: string) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${color}44` : '1px solid var(--border)',
    color: active ? color : 'var(--muted)', textDecoration: 'none', transition: 'all 0.15s',
  } as const;
}

export default function PaidAdsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        Paid Ads
      </div>
      <nav aria-label="Paid ads platforms" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {PAID_ADS_TABS.map(t => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} style={tabStyle(active, t.color)} aria-current={active ? 'page' : undefined}>
              <span style={{ fontFamily: 'monospace' }}>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
