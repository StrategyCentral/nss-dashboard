'use client';
import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useRouter } from 'next/navigation';

const FB_DEMO_CAMPAIGNS = [
  { name: 'NSS Ongoing Advantage+ Shopping', spend: 2840, revenue: 13200, roas: 4.65, conversions: 108, clicks: 2290, impressions: 48400, cpc: 1.24, cpa: 26.3, ctr: 4.73,
    adsets: [
      { name: 'NSS Advantage+ Ongoing', campaign: 'NSS Ongoing Advantage+ Shopping', spend: 1820, revenue: 8640, roas: 4.75, conversions: 71, clicks: 1480, impressions: 31200, cpc: 1.23, cpa: 25.6, ctr: 4.74,
        ads: [
          { name: 'IMAGE AD 1', spend: 680, revenue: 3240, roas: 4.76, conversions: 27, clicks: 550, impressions: 11600, cpc: 1.24, cpa: 25.2, reach: 8200, frequency: 1.41 },
          { name: 'IMAGE Ad 2', spend: 590, revenue: 2820, roas: 4.78, conversions: 23, clicks: 480, impressions: 10100, cpc: 1.23, cpa: 25.7, reach: 7400, frequency: 1.36 },
          { name: 'Productfeed Ad', spend: 550, revenue: 2580, roas: 4.69, conversions: 21, clicks: 450, impressions: 9500, cpc: 1.22, cpa: 26.2, reach: 7100, frequency: 1.34 },
        ]},
      { name: 'NSS Retargeting Warm', campaign: 'NSS Ongoing Advantage+ Shopping', spend: 1020, revenue: 4560, roas: 4.47, conversions: 37, clicks: 810, impressions: 17200, cpc: 1.26, cpa: 27.6, ctr: 4.71,
        ads: [
          { name: 'Spring Sale 2023 Ad 3', spend: 520, revenue: 2280, roas: 4.38, conversions: 18, clicks: 410, impressions: 8700, cpc: 1.27, cpa: 28.9, reach: 6100, frequency: 1.43 },
          { name: 'VIDEO AD 1', spend: 500, revenue: 2280, roas: 4.56, conversions: 19, clicks: 400, impressions: 8500, cpc: 1.25, cpa: 26.3, reach: 5900, frequency: 1.44 },
        ]},
    ]},
  { name: 'NSS Cold Audience Beauty Professionals', spend: 1980, revenue: 8280, roas: 4.18, conversions: 76, clicks: 1620, impressions: 36200, cpc: 1.22, cpa: 26.1, ctr: 4.48,
    adsets: [
      { name: 'Beauty Pros Lookalike 1%', campaign: 'NSS Cold Audience Beauty Professionals', spend: 1100, revenue: 4680, roas: 4.25, conversions: 43, clicks: 900, impressions: 20100, cpc: 1.22, cpa: 25.6, ctr: 4.48,
        ads: [
          { name: 'IMAGE Ad 3', spend: 1100, revenue: 4680, roas: 4.25, conversions: 43, clicks: 900, impressions: 20100, cpc: 1.22, cpa: 25.6, reach: 14800, frequency: 1.36 },
        ]},
      { name: 'Beauty Pros Interest Broad', campaign: 'NSS Cold Audience Beauty Professionals', spend: 880, revenue: 3600, roas: 4.09, conversions: 33, clicks: 720, impressions: 16100, cpc: 1.22, cpa: 26.7, ctr: 4.47,
        ads: [
          { name: 'IMAGE AD 1', spend: 880, revenue: 3600, roas: 4.09, conversions: 33, clicks: 720, impressions: 16100, cpc: 1.22, cpa: 26.7, reach: 12200, frequency: 1.32 },
        ]},
    ]},
];

const DEMO_ADSET_DETAIL = {
  demographics: { age: [{ label: '18-24', pct: 12 },{ label: '25-34', pct: 31 },{ label: '35-44', pct: 28 },{ label: '45-54', pct: 18 },{ label: '55+', pct: 11 }], gender: [{ label: 'Female', pct: 78 },{ label: 'Male', pct: 21 },{ label: 'Other', pct: 1 }] },
  devices: [{ label: 'Mobile', pct: 61, icon: '📱' },{ label: 'Desktop', pct: 34, icon: '💻' },{ label: 'Tablet', pct: 5, icon: '📊' }],
  timeOfDay: [0,1,0,0,0,1,2,4,6,8,9,10,9,8,7,8,9,10,11,10,8,6,4,2],
  placements: [{ label: 'Facebook Feed', pct: 42 },{ label: 'Instagram Feed', pct: 28 },{ label: 'Instagram Stories', pct: 18 },{ label: 'Facebook Reels', pct: 7 },{ label: 'Audience Network', pct: 5 }],
  topRegions: [{ label: 'NSW', pct: 34 },{ label: 'VIC', pct: 28 },{ label: 'QLD', pct: 18 },{ label: 'WA', pct: 10 },{ label: 'SA', pct: 6 },{ label: 'Other', pct: 4 }],
};

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }

function RoasBadge({ v }: { v: number }) {
  const color = v >= 5 ? '#a8cf45' : v >= 3.5 ? '#ffe600' : v >= 2 ? '#ff8c42' : '#ff5050';
  return <span style={{ color, fontWeight: 800 }}>{v.toFixed(2)}×</span>;
}

function Bar100({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ── Ad Detail Drawer ──────────────────────────────────────────────────────────
function AdDetailDrawer({ ad, adset, onClose }: any) {
  if (!ad) return null;
  const d = DEMO_ADSET_DETAIL;
  const maxHour = Math.max(...d.timeOfDay);

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 460, zIndex: 1000,
      background: 'rgba(10,10,14,0.98)', backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(24,119,242,0.3)', overflowY: 'auto',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#1877F2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ad Detail</div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Barlow Condensed',sans-serif" }}>{ad.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{adset?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Creative placeholder */}
        <div style={{ background: 'rgba(24,119,242,0.06)', border: '2px dashed rgba(24,119,242,0.3)', borderRadius: 12, padding: 28, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🖼</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{ad.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Creative preview available once Meta API is connected</div>
          <div style={{ fontSize: 11, color: '#1877F2', marginTop: 8 }}>
            {ad.name.toLowerCase().includes('video') ? '🎬 Video Ad' : ad.name.toLowerCase().includes('feed') ? '🛒 Catalog Feed Ad' : '🖼 Image Ad'}
          </div>
        </div>

        {/* Ad metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Spend', value: fmt(ad.spend), color: 'var(--pink)' },
            { label: 'Revenue', value: fmt(ad.revenue), color: 'var(--green)' },
            { label: 'ROAS', value: `${ad.roas}×`, color: 'var(--yellow)' },
            { label: 'Conversions', value: ad.conversions, color: 'var(--blue)' },
            { label: 'CPC', value: `$${ad.cpc}`, color: 'var(--muted)' },
            { label: 'CPA', value: `$${ad.cpa}`, color: 'var(--muted)' },
            { label: 'Reach', value: (ad.reach || 0).toLocaleString(), color: 'var(--muted)' },
            { label: 'Frequency', value: ad.frequency || '—', color: 'var(--muted)' },
            { label: 'Impressions', value: ad.impressions?.toLocaleString() || '—', color: 'var(--muted)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Demographics */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Demographics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Age</div>
              {d.demographics.age.map(a => (
                <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, width: 40, color: 'var(--muted)' }}>{a.label}</span>
                  <Bar100 pct={a.pct} color="#1877F2" />
                  <span style={{ fontSize: 11, width: 30, textAlign: 'right', color: 'var(--text)' }}>{a.pct}%</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Gender</div>
              {d.demographics.gender.map(g => (
                <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, width: 48, color: 'var(--muted)' }}>{g.label}</span>
                  <Bar100 pct={g.pct} color="#E1306C" />
                  <span style={{ fontSize: 11, width: 30, textAlign: 'right', color: 'var(--text)' }}>{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Device Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.devices.map(dev => (
              <div key={dev.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{dev.icon}</span>
                <span style={{ fontSize: 12, width: 70, color: 'var(--text)' }}>{dev.label}</span>
                <Bar100 pct={dev.pct} color="#04aae8" />
                <span style={{ fontSize: 12, width: 36, textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{dev.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Time of Day (Conversions)</div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
            {d.timeOfDay.map((val, h) => (
              <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', background: val > 0 ? `rgba(24,119,242,${0.2 + (val / maxHour) * 0.8})` : 'rgba(255,255,255,0.05)', borderRadius: 3, height: `${Math.max(4, (val / maxHour) * 50)}px`, transition: 'height 0.4s ease' }} />
                {h % 4 === 0 && <span style={{ fontSize: 8, color: 'var(--muted)' }}>{h}h</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Placements */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Placement Breakdown</div>
          {d.placements.map(p => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, flex: 1, color: 'var(--text)' }}>{p.label}</span>
              <Bar100 pct={p.pct} color="#a8cf45" />
              <span style={{ fontSize: 12, width: 36, textAlign: 'right', color: 'var(--muted)' }}>{p.pct}%</span>
            </div>
          ))}
        </div>

        {/* Top regions */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Top Regions (AU)</div>
          {d.topRegions.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, width: 40, color: 'var(--text)', fontWeight: 600 }}>{r.label}</span>
              <Bar100 pct={r.pct} color="#ffe600" />
              <span style={{ fontSize: 12, width: 36, textAlign: 'right', color: 'var(--muted)' }}>{r.pct}%</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>
          Demographics & placement data available live once Meta API is connected. Device & region from WooCommerce order attribution.
        </div>
      </div>
    </div>
  );
}

// ── Adset Detail (inline on adset page) ───────────────────────────────────────
function AdCard({ ad, adset, onClick }: any) {
  const typeIcon = ad.name.toLowerCase().includes('video') ? '🎬' : ad.name.toLowerCase().includes('feed') || ad.name.toLowerCase().includes('product') ? '🛒' : '🖼';
  return (
    <div onClick={() => onClick(ad)}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(24,119,242,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {/* Creative area */}
      <div style={{ background: 'rgba(24,119,242,0.08)', height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 36 }}>{typeIcon}</div>
        <div style={{ fontSize: 11, color: '#1877F2', fontWeight: 600 }}>{typeIcon === '🎬' ? 'Video Ad' : typeIcon === '🛒' ? 'Catalog Feed' : 'Image Ad'}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>{ad.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Spend', value: fmt(ad.spend), color: 'var(--pink)' },
            { label: 'Revenue', value: fmt(ad.revenue), color: 'var(--green)' },
            { label: 'ROAS', value: `${ad.roas}×`, color: ad.roas >= 4 ? '#a8cf45' : ad.roas >= 3 ? '#ffe600' : '#ff5050' },
            { label: 'Conv.', value: ad.conversions, color: 'var(--blue)' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#1877F2', textAlign: 'center' }}>Click for full analytics →</div>
      </div>
    </div>
  );
}

// ── Adset Detail Page Component ───────────────────────────────────────────────
function AdsetDetailView({ adsetName }: { adsetName: string }) {
  const router = useRouter();
  const [adset, setAdset] = useState<any>(null);
  const [selectedAd, setSelectedAd] = useState<any>(null);

  useEffect(() => {
    const key = `adset_${adsetName}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (stored) { setAdset(JSON.parse(stored)); return; }
    // Fallback: find in demo data
    for (const c of FB_DEMO_CAMPAIGNS) {
      const found = c.adsets.find(a => encodeURIComponent(a.name) === adsetName);
      if (found) { setAdset(found); break; }
    }
  }, [adsetName]);

  if (!adset) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;
  const d = DEMO_ADSET_DETAIL;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/dashboard/facebook')} className="btn btn-ghost" style={{ fontSize: 12 }}>← Back to Campaigns</button>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{adset.campaign} /</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{adset.name}</div>
      </div>

      {/* Adset KPIs */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Spend', value: fmt(adset.spend), color: 'var(--pink)' },
          { label: 'Revenue', value: fmt(adset.revenue), color: 'var(--green)' },
          { label: 'ROAS', value: `${adset.roas}×`, color: 'var(--yellow)' },
          { label: 'Conversions', value: adset.conversions, color: 'var(--blue)' },
          { label: 'CPC', value: `$${adset.cpc}`, color: 'var(--pink)' },
          { label: 'CTR', value: `${adset.ctr}%`, color: 'var(--muted)' },
        ].map(t => (
          <div key={t.label} className="stat-tile">
            <span className="label">{t.label}</span>
            <span className="value" style={{ color: t.color }}>{t.value}</span>
          </div>
        ))}
      </div>

      {/* Breakdown panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Device */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📱 Device</div>
          {d.devices.map(dev => (
            <div key={dev.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>{dev.icon}</span>
              <span style={{ fontSize: 12, flex: 1 }}>{dev.label}</span>
              <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${dev.pct}%`, background: '#04aae8', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: 'right' }}>{dev.pct}%</span>
            </div>
          ))}
        </div>

        {/* Age */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>👤 Age Groups</div>
          {d.demographics.age.map(a => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, width: 44, color: 'var(--muted)' }}>{a.label}</span>
              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${a.pct}%`, background: '#1877F2', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, width: 32, textAlign: 'right' }}>{a.pct}%</span>
            </div>
          ))}
        </div>

        {/* Regions */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📍 Top Regions</div>
          {d.topRegions.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, width: 36, fontWeight: 600 }}>{r.label}</span>
              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: '#ffe600', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, width: 32, textAlign: 'right' }}>{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time of day */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>🕐 Conversions by Hour of Day</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
          {d.timeOfDay.map((val, h) => {
            const max = Math.max(...d.timeOfDay);
            return (
              <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', background: val > 0 ? `rgba(24,119,242,${0.2 + (val / max) * 0.8})` : 'rgba(255,255,255,0.04)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (val / max) * 64)}px`, transition: 'height 0.5s ease', cursor: 'default' }} title={`${h}:00 — ${val} conversions`} />
                {h % 3 === 0 && <span style={{ fontSize: 8, color: 'var(--muted)' }}>{h}h</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Peak: 6pm–9pm · From WooCommerce order session times</div>
      </div>

      {/* Ads grid */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ads in this Adset ({adset.ads?.length || 0})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {(adset.ads || []).map((ad: any) => <AdCard key={ad.name} ad={ad} adset={adset} onClick={setSelectedAd} />)}
        </div>
      </div>

      {/* Ad detail drawer */}
      {selectedAd && <AdDetailDrawer ad={selectedAd} adset={adset} onClose={() => setSelectedAd(null)} />}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function FacebookPage() {
  const router = useRouter();
  const [adsetView, setAdsetView] = useState<string | null>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [source, setSource] = useState('demo');
  const [filename, setFilename] = useState('');
  const [uploadedAt, setUploadedAt] = useState('');
  const [level, setLevel] = useState('campaign');
  const [showUpload, setShowUpload] = useState(false);
  const [showUtmBanner, setShowUtmBanner] = useState(true);

  async function load() {
    try {
      const r = await fetch('/api/data/facebook');
      const d = await r.json();
      setFbData(d.data); setSource(d.source); setFilename(d.filename || ''); setUploadedAt(d.uploadedAt || ''); setLevel(d.data?.level || 'campaign');
    } catch {}
  }

  useEffect(() => { load(); }, []);

  // Check if we're in adset detail view
  const pathAdset = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('adset') : null;
  const currentAdset = adsetView || pathAdset;
  if (currentAdset) return <AdsetDetailView adsetName={currentAdset} />;

  const campaigns = fbData?.campaigns?.length ? fbData.campaigns : FB_DEMO_CAMPAIGNS;
  const isDemo = source === 'demo' || !fbData?.campaigns?.length;
  const totals = campaigns.reduce((acc: any, c: any) => ({ spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue, conversions: acc.conversions + c.conversions, clicks: acc.clicks + c.clicks }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 });
  const badge = { live: { label: 'Live', color: '#a8cf45' }, upload: { label: `CSV (${level})`, color: '#04aae8' }, demo: { label: 'Demo', color: '#888' } }[source] || { label: 'Demo', color: '#888' };

  function handleViewAdset(adset: any) {
    if (typeof window !== 'undefined') localStorage.setItem(`adset_${encodeURIComponent(adset.name)}`, JSON.stringify(adset));
    setAdsetView(encodeURIComponent(adset.name));
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return <div style={{ background: 'rgba(10,10,14,0.95)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 600, marginBottom: 2 }}>{p.name}: ${Math.round(p.value).toLocaleString()}</div>)}
    </div>;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Facebook Ads</h1>
          <p className="section-sub">Campaign → Adset → Ad with demographics, device & time breakdown</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowUpload(!showUpload)} className="btn btn-ghost" style={{ fontSize: 12, color: source === 'upload' ? '#04aae8' : undefined }}>📂 Upload CSV</button>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}33` }}>{badge.label}</span>
        </div>
      </div>

      {/* UTM fix banner */}
      {showUtmBanner && (
        <div style={{ background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ff8c42', marginBottom: 6 }}>⚡ Add adset & ad names to your Meta URL parameters</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Your current params capture source/medium but not adset or ad name. Update each ad&apos;s URL parameters to:</div>
              <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6, display: 'block', color: '#ffe600', lineHeight: 1.8, wordBreak: 'break-all' }}>
                utm_source=&#123;&#123;site_source_name&#125;&#125;&amp;utm_medium=&#123;&#123;site_medium&#125;&#125;&amp;utm_campaign=&#123;&#123;campaign.name&#125;&#125;&amp;utm_content=&#123;&#123;ad.name&#125;&#125;&amp;utm_term=&#123;&#123;adset.name&#125;&#125;
              </code>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Meta Ads Manager → open each ad → Tracking section → URL parameters → replace with above. Every future order will then capture the exact ad that caused it.</div>
            </div>
            <button onClick={() => setShowUtmBanner(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <UploadPanelInline existingFile={filename} existingDate={uploadedAt} existingLevel={level} onUploaded={() => { load(); setShowUpload(false); }} onClear={async () => { await fetch('/api/upload?platform=facebook', { method: 'DELETE' }); load(); }} />
        </div>
      )}

      {isDemo && !showUpload && (
        <div style={{ background: 'rgba(24,119,242,0.06)', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Showing demo data — <span style={{ color: '#04aae8' }}>upload adset or ad-level CSV</span> for real breakdown</div>
          <button onClick={() => setShowUpload(true)} className="btn btn-ghost" style={{ fontSize: 11, color: '#04aae8', borderColor: 'rgba(4,170,232,0.3)' }}>Upload now →</button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Spend', value: fmt(totals.spend), color: 'var(--pink)' },
          { label: 'Revenue', value: fmt(totals.revenue), color: 'var(--green)' },
          { label: 'ROAS', value: `${totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0'}×`, color: 'var(--yellow)' },
          { label: 'Conversions', value: totals.conversions.toLocaleString(), color: 'var(--blue)' },
          { label: 'Avg CPC', value: `$${totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0'}`, color: 'var(--pink)' },
          { label: 'Campaigns', value: campaigns.length, color: 'var(--muted)' },
        ].map(t => <div key={t.label} className="stat-tile"><span className="label">{t.label}</span><span className="value" style={{ color: t.color }}>{t.value}</span></div>)}
      </div>

      {/* Monthly chart */}
      {fbData?.monthly?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Spend vs Revenue — Monthly</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={fbData.monthly} barGap={4}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="spend" name="Spend" fill="var(--pink)" radius={[4, 4, 0, 0]} fillOpacity={0.85} /><Bar dataKey="revenue" name="Revenue" fill="var(--blue)" radius={[4, 4, 0, 0]} fillOpacity={0.85} /></BarChart></ResponsiveContainer>
        </div>
      )}

      {/* Campaigns */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 28 }} />
          <div style={{ flex: 1, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 90px)', textAlign: 'right' }}>
            {['Spend', 'Revenue', 'ROAS', 'Conv.', 'CPC', 'CTR'].map(h => <div key={h} style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>)}
          </div>
        </div>
        <div style={{ padding: 12 }}>
          {campaigns.map((c: any) => <CampaignRowComp key={c.name} campaign={c} onViewAdset={handleViewAdset} />)}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>Click a campaign to expand adsets · Click &quot;View Details&quot; on any adset for ad-level analytics &amp; demographics</div>
    </div>
  );
}

function UploadPanelInline({ existingFile, existingDate, existingLevel, onUploaded, onClear }: any) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const levelLabels: Record<string, string> = { campaign: 'Campaign', adset: 'Adset', ad: 'Ad' };

  async function handleFile(file: File) {
    setUploading(true); setError(''); setSuccess('');
    const form = new FormData(); form.append('file', file); form.append('platform', 'facebook');
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) setError(d.error || 'Upload failed');
      else { setSuccess(`✓ ${levelLabels[d.level]} data · ${d.campaigns} campaigns · ${fmt(d.spend)} spend · ${d.roas}× ROAS`); onUploaded(); }
    } catch { setError('Upload failed'); } finally { setUploading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>📂 Meta Ads Manager Export</div>
        {existingFile && <button onClick={onClear} className="btn btn-ghost" style={{ fontSize: 11, color: '#ff5050', borderColor: 'rgba(255,80,80,0.3)' }}>✕ Clear upload</button>}
      </div>
      {existingFile && <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 10 }}>Current: {levelLabels[existingLevel] || existingLevel}-level · {existingFile}</div>}
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? '#1877F2' : 'var(--border)'}`, borderRadius: 8, padding: '14px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{uploading ? 'Uploading…' : 'Drop CSV — Campaign / Adset / Ad level all supported'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Ads Manager → Campaigns/Ad sets/Ads tab → Export → CSV</div>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 11, color: '#ff5050' }}>⚠ {error}</div>}
      {success && <div style={{ marginTop: 8, fontSize: 11, color: '#a8cf45' }}>{success}</div>}
    </div>
  );
}

function CampaignRowComp({ campaign, onViewAdset }: any) {
  const [expanded, setExpanded] = useState(false);
  const hasAdsets = campaign.adsets?.length > 0;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <div onClick={() => hasAdsets && setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', background: 'rgba(255,255,255,0.03)', cursor: hasAdsets ? 'pointer' : 'default' }}>
        <div style={{ width: 28, fontSize: 14, color: 'var(--muted)' }}>{hasAdsets ? (expanded ? '▾' : '▸') : '○'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{campaign.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{campaign.adsets?.length || 0} adsets</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 90px)', textAlign: 'right', alignItems: 'center' }}>
          {[
            { v: fmt(campaign.spend) },
            { v: fmt(campaign.revenue), c: 'var(--green)' },
            { v: null, roas: campaign.roas },
            { v: campaign.conversions },
            { v: `$${campaign.cpc}` },
            { v: `${campaign.ctr}%` },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: 'right' }}>
              {m.roas !== undefined ? <RoasBadge v={m.roas} /> : <span style={{ fontSize: 13, fontWeight: 700, color: (m as any).c || 'var(--text)' }}>{m.v}</span>}
            </div>
          ))}
        </div>
      </div>
      {expanded && hasAdsets && (
        <div>
          <div style={{ padding: '6px 16px 6px 48px', background: 'rgba(24,119,242,0.03)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: '1fr repeat(6, 90px)' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>Ad Set</div>
            {['Spend', 'Revenue', 'ROAS', 'Conv.', 'CPC', ''].map(h => <div key={h} style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'right' }}>{h}</div>)}
          </div>
          {campaign.adsets.map((a: any) => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 10px 48px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(24,119,242,0.03)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.ads?.length || 0} ads</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 90px)', textAlign: 'right', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.spend)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{fmt(a.revenue)}</span>
                <RoasBadge v={a.roas} />
                <span style={{ fontSize: 12 }}>{a.conversions}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>${a.cpc}</span>
                <button onClick={() => onViewAdset(a)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px', color: '#1877F2', borderColor: 'rgba(24,119,242,0.35)' }}>Details →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
