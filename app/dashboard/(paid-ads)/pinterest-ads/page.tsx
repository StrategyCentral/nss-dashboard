'use client';
import Link from 'next/link';

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, lineHeight: 1.0, letterSpacing: '0.01em' }}>Pinterest Ads</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Spend, ROAS, pin performance, audience analytics</div>
        </div>
        <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255, 230, 0, 0.12)', color: 'var(--yellow, #ffe600)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(255, 230, 0, 0.25)' }}>
          Coming Soon
        </div>
      </div>

      <div className="card" style={{ padding: 32, borderTop: `3px solid #e60023` }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Planned sub-sections</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Overview</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Spend / impressions / saves / ROAS</div></div><div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Pin Performance</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Top performing pins</div></div><div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Audiences</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Demographics + interests</div></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          This tab is scaffolded but not built. The dedicated build chat for this section will live-build the UI here.
          Spec lives in the brain: <code style={{ color: 'var(--pink)' }}>PROJECTS/ACE BUSINESS SUITE/ace-business-suite-architecture.md</code>.
        </div>
      </div>
    </div>
  );
}
