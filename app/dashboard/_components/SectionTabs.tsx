'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type SectionTab = { href: string; icon: string; label: string; color: string };

function tabStyle(active: boolean, color: string) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${color}44` : '1px solid var(--border)',
    color: active ? color : 'var(--muted)', textDecoration: 'none', transition: 'all 0.15s',
  } as const;
}

/**
 * A section's sub tabs across the top of the page (Paid Ads, Ecommerce):
 * one sidebar entry, one tab per sub page.
 */
export function SectionTabs({ title, label, tabs }: { title: string; label: string; tabs: SectionTab[] }) {
  const pathname = usePathname();
  return (
    <>
      <div style={{ fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <nav aria-label={label} style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} style={tabStyle(active, t.color)} aria-current={active ? 'page' : undefined}>
              <span style={{ fontFamily: 'monospace' }}>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
