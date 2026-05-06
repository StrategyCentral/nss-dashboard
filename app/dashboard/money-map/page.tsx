'use client';

export default function MoneyMapPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, lineHeight: 1.0 }}>Money Map</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Web rings, money sites, silos — the asset map of everything you market</div>
        </div>
        <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255, 230, 0, 0.12)', color: '#ffe600', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(255, 230, 0, 0.25)' }}>
          Coming Soon
        </div>
      </div>

      <div className="card" style={{ padding: 32, borderTop: '3px solid #e879f9' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>What this becomes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, background: 'rgba(232,121,249,0.06)', borderRadius: 8, border: '1px solid rgba(232,121,249,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e879f9', marginBottom: 4, letterSpacing: '0.05em' }}>WR-1 / WRS-1 Inner Ring</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Money site, supporting blog (theme-mirrored), wiki, brand-owned social</div>
          </div>
          <div style={{ padding: 16, background: 'rgba(132,204,22,0.06)', borderRadius: 8, border: '1px solid rgba(132,204,22,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a8cf45', marginBottom: 4, letterSpacing: '0.05em' }}>WR-2 / WRS-2 Middle Ring</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Affiliate microsites, niche blogs, forums, podcast feed, secondary brand channels</div>
          </div>
          <div style={{ padding: 16, background: 'rgba(4,170,232,0.06)', borderRadius: 8, border: '1px solid rgba(4,170,232,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#04aae8', marginBottom: 4, letterSpacing: '0.05em' }}>WR-3 / WRS-3 Outer Ring</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Republish points, guest posts, citations, syndication, pseudonymous accounts</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Visual asset map per client based on the Network Empire web ring methodology. Each silo gets a price ladder (Free → $X9 → $XX9 → $XXX9). Vertical templates seeded from the 18-industry / 2,466-Google-category dataset.<br/><br/>
          <strong style={{ color: 'var(--text)' }}>Spec:</strong> <code style={{ color: 'var(--pink)' }}>PROJECTS/ACE BUSINESS SUITE/ACE MARKETING SUITE/money-map-spec.md</code>
        </div>
      </div>
    </div>
  );
}
