'use client';
import { useEffect, useState, useRef } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
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
    ]},
  { name: 'NSS Cold Audience Beauty Professionals', spend: 1980, revenue: 8280, roas: 4.18, conversions: 76, clicks: 1620, impressions: 36200, cpc: 1.22, cpa: 26.1, ctr: 4.48,
    adsets: [
      { name: 'Beauty Pros Lookalike 1%', campaign: 'NSS Cold Audience Beauty Professionals', spend: 1100, revenue: 4680, roas: 4.25, conversions: 43, clicks: 900, impressions: 20100, cpc: 1.22, cpa: 25.6, ctr: 4.48,
        ads: [{ name: 'IMAGE Ad 3', spend: 1100, revenue: 4680, roas: 4.25, conversions: 43, clicks: 900, impressions: 20100, cpc: 1.22, cpa: 25.6, reach: 14800, frequency: 1.36 }]},
    ]},
];

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }
function fmtK(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`; }

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

// ── Daily Spend vs WooCommerce Chart ──────────────────────────────────────────
function DailyChart({ daily, wooDaily }: { daily: any[]; wooDaily: any[] }) {
  const wooMap: Record<string, number> = {};
  for (const d of wooDaily) wooMap[d.date] = d.revenue;

  const data = daily.map(d => ({
    date: d.date.slice(5),
    spend: d.spend,
    purchases: d.conversions,
    wooRevenue: wooMap[d.date] || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, fontWeight: 700, marginBottom: 2 }}>
            {p.name}: {p.name === 'Purchases' ? p.value : `$${Math.round(p.value).toLocaleString()}`}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
        <YAxis yAxisId="left" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={50} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar yAxisId="left" dataKey="spend" name="FB Spend" fill="var(--pink)" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
        <Line yAxisId="left" type="monotone" dataKey="wooRevenue" name="Woo Revenue" stroke="#a8cf45" strokeWidth={2} dot={false} />
        <Bar yAxisId="right" dataKey="purchases" name="Purchases" fill="#04aae8" radius={[3, 3, 0, 0]} fillOpacity={0.7} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Demographics Section ──────────────────────────────────────────────────────
function DemographicsSection({ ageBreakdown, genderBreakdown }: { ageBreakdown: any[]; genderBreakdown: any[] }) {
  const maxAge = Math.max(...ageBreakdown.map((a: any) => a.spend), 1);
  const genderColors: Record<string, string> = { female: '#E1306C', male: '#1877F2', unknown: '#888' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>👤 Age Breakdown</div>
        {ageBreakdown.map((a: any) => (
          <div key={a.age} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{a.age}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(a.spend)} · {a.conversions} conv · CPA ${a.cpa}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(a.spend / maxAge) * 100}%`, background: '#1877F2', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>♀♂ Gender Breakdown</div>
        {genderBreakdown.map((g: any) => (
          <div key={g.gender} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{g.gender}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: genderColors[g.gender] || '#888' }}>{g.pct}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${g.pct}%`, background: genderColors[g.gender] || '#888', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(g.spend)} spend · {g.conversions} purchases</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ad Performance Table ──────────────────────────────────────────────────────
function AdBreakdownTable({ adBreakdown }: { adBreakdown: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? adBreakdown : adBreakdown.slice(0, 8);
  const maxSpend = Math.max(...adBreakdown.map((a: any) => a.spend), 1);

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>🖼 Ad Performance</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{adBreakdown.length} ads</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Ad Name', 'Campaign', 'Spend', 'Spend Bar', 'Conv.', 'CPA', 'Clicks', 'CTR%'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Ad Name' || h === 'Campaign' ? 'left' : 'right', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ad: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 180 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: 150 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{ad.campaign}</div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--pink)' }}>{fmt(ad.spend)}</td>
                <td style={{ padding: '10px 12px', width: 100 }}>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(ad.spend / maxSpend) * 100}%`, background: 'var(--pink)', borderRadius: 3 }} />
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#04aae8', fontWeight: 700 }}>{ad.conversions}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: ad.cpa < 3 ? '#a8cf45' : ad.cpa < 6 ? '#ffe600' : 'var(--muted)' }}>{ad.cpa > 0 ? `$${ad.cpa}` : '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{ad.clicks.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{ad.ctr > 0 ? `${ad.ctr}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adBreakdown.length > 8 && (
        <div style={{ padding: '10px 16px', textAlign: 'center' }}>
          <button onClick={() => setShowAll(!showAll)} className="btn btn-ghost" style={{ fontSize: 11 }}>
            {showAll ? '▲ Show less' : `▼ Show all ${adBreakdown.length} ads`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ad Detail Drawer ──────────────────────────────────────────────────────────
function AdDetailDrawer({ ad, adset, onClose, ageBreakdown, genderBreakdown }: any) {
  if (!ad) return null;
  const genderColors: Record<string, string> = { female: '#E1306C', male: '#1877F2' };
  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 460, zIndex: 1000,
      background: 'rgba(10,10,14,0.98)', backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(24,119,242,0.3)', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#1877F2', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Ad Detail</div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Barlow Condensed',sans-serif" }}>{ad.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{adset?.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ background: 'rgba(24,119,242,0.06)', border: '2px dashed rgba(24,119,242,0.3)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{ad.name.toLowerCase().includes('video') ? '🎬' : ad.name.toLowerCase().includes('feed') || ad.name.toLowerCase().includes('product') ? '🛒' : '🖼'}</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{ad.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Creative preview available once Meta API is connected</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Spend', value: fmt(ad.spend), color: 'var(--pink)' },
            { label: 'Conversions', value: ad.conversions, color: '#04aae8' },
            { label: 'CPA', value: ad.cpa > 0 ? `$${ad.cpa}` : '—', color: ad.cpa < 5 ? '#a8cf45' : 'var(--muted)' },
            { label: 'Clicks', value: ad.clicks?.toLocaleString() || '—', color: 'var(--muted)' },
            { label: 'CPC', value: ad.cpc > 0 ? `$${ad.cpc}` : '—', color: 'var(--muted)' },
            { label: 'CTR', value: ad.ctr > 0 ? `${ad.ctr}%` : '—', color: 'var(--muted)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        {(ageBreakdown?.length > 0 || genderBreakdown?.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Demographics (Campaign-wide)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Age</div>
                {(ageBreakdown || []).map((a: any) => (
                  <div key={a.age} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, width: 40, color: 'var(--muted)' }}>{a.age}</span>
                    <Bar100 pct={a.pct} color="#1877F2" />
                    <span style={{ fontSize: 11, width: 30, textAlign: 'right' }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Gender</div>
                {(genderBreakdown || []).map((g: any) => (
                  <div key={g.gender} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, width: 48, color: 'var(--muted)', textTransform: 'capitalize' }}>{g.gender}</span>
                    <Bar100 pct={g.pct} color={genderColors[g.gender] || '#888'} />
                    <span style={{ fontSize: 11, width: 30, textAlign: 'right' }}>{g.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontStyle: 'italic' }}>
          Connect Meta API for ad-level demographics, placements & creative preview.
        </div>
      </div>
    </div>
  );
}

// ── Adset Detail ──────────────────────────────────────────────────────────────
function AdCard({ ad, adset, onClick }: any) {
  const typeIcon = ad.name.toLowerCase().includes('video') ? '🎬' : (ad.name.toLowerCase().includes('feed') || ad.name.toLowerCase().includes('product')) ? '🛒' : '🖼';
  return (
    <div onClick={() => onClick(ad)}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(24,119,242,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div style={{ background: 'rgba(24,119,242,0.08)', height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 28 }}>{typeIcon}</div>
        <div style={{ fontSize: 11, color: '#1877F2', fontWeight: 600 }}>{typeIcon === '🎬' ? 'Video Ad' : typeIcon === '🛒' ? 'Catalog Feed' : 'Image Ad'}</div>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{ad.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Spend', value: fmt(ad.spend), color: 'var(--pink)' },
            { label: 'Conv.', value: ad.conversions, color: '#04aae8' },
            { label: 'CPA', value: ad.cpa > 0 ? `$${ad.cpa}` : '—', color: ad.cpa < 5 ? '#a8cf45' : '#ffe600' },
            { label: 'CPC', value: ad.cpc > 0 ? `$${ad.cpc}` : '—', color: 'var(--muted)' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#1877F2', textAlign: 'center' }}>Click for details →</div>
      </div>
    </div>
  );
}

function AdsetDetailView({ adsetName, ageBreakdown, genderBreakdown }: { adsetName: string; ageBreakdown?: any[]; genderBreakdown?: any[] }) {
  const router = useRouter();
  const [adset, setAdset] = useState<any>(null);
  const [selectedAd, setSelectedAd] = useState<any>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(`adset_${adsetName}`) : null;
    if (stored) { setAdset(JSON.parse(stored)); return; }
    for (const c of FB_DEMO_CAMPAIGNS) {
      const found = c.adsets.find(a => encodeURIComponent(a.name) === adsetName);
      if (found) { setAdset(found); break; }
    }
  }, [adsetName]);

  if (!adset) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/dashboard/facebook')} className="btn btn-ghost" style={{ fontSize: 12 }}>← Back</button>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{adset.campaign} /</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{adset.name}</div>
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Spend', value: fmt(adset.spend), color: 'var(--pink)' },
          { label: 'Revenue', value: adset.revenue > 0 ? fmt(adset.revenue) : '—', color: 'var(--green)' },
          { label: 'Conversions', value: adset.conversions, color: 'var(--blue)' },
          { label: 'CPA', value: adset.cpa > 0 ? `$${adset.cpa}` : '—', color: 'var(--muted)' },
          { label: 'Clicks', value: adset.clicks?.toLocaleString() || '—', color: 'var(--muted)' },
          { label: 'CTR', value: adset.ctr > 0 ? `${adset.ctr}%` : '—', color: 'var(--muted)' },
        ].map(t => <div key={t.label} className="stat-tile"><span className="label">{t.label}</span><span className="value" style={{ color: t.color }}>{t.value}</span></div>)}
      </div>
      {(ageBreakdown?.length || genderBreakdown?.length) ? (
        <DemographicsSection ageBreakdown={ageBreakdown || []} genderBreakdown={genderBreakdown || []} />
      ) : null}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ads ({adset.ads?.length || 0})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {(adset.ads || []).map((ad: any) => <AdCard key={ad.name} ad={ad} adset={adset} onClick={setSelectedAd} />)}
        </div>
      </div>
      {selectedAd && <AdDetailDrawer ad={selectedAd} adset={adset} onClose={() => setSelectedAd(null)} ageBreakdown={ageBreakdown} genderBreakdown={genderBreakdown} />}
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
  const [wooDaily, setWooDaily] = useState<any[]>([]);
  const [wooTotals, setWooTotals] = useState({ revenue: 0, orders: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'ads'>('overview');

  async function load() {
    try {
      const r = await fetch('/api/data/facebook');
      const d = await r.json();
      setFbData(d.data);
      setSource(d.source);
      setFilename(d.filename || '');
      setUploadedAt(d.uploadedAt || '');
      setLevel(d.data?.level || 'campaign');

      // Load WooCommerce daily aligned to the CSV date range
      const dr = d.data?.dateRange;
      const after = dr?.start ? `${dr.start}T00:00:00` : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const before = dr?.end ? `${dr.end}T23:59:59` : new Date().toISOString();
      try {
        const wr = await fetch(`/api/woo/daily?after=${after}&before=${before}`);
        const wd = await wr.json();
        setWooDaily(wd.daily || []);
        setWooTotals({ revenue: wd.totalRevenue || 0, orders: wd.totalOrders || 0 });
      } catch {}
    } catch {}
  }

  useEffect(() => { load(); }, []);

  const pathAdset = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('adset') : null;
  const currentAdset = adsetView || pathAdset;
  if (currentAdset) return <AdsetDetailView adsetName={currentAdset} ageBreakdown={fbData?.ageBreakdown} genderBreakdown={fbData?.genderBreakdown} />;

  const isCombined = fbData?.format === 'combined_granular';
  const campaigns = fbData?.campaigns?.length ? fbData.campaigns : FB_DEMO_CAMPAIGNS;
  const isDemo = source === 'demo' || !fbData?.campaigns?.length;

  const totals = isDemo
    ? campaigns.reduce((acc: any, c: any) => ({ spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue, conversions: acc.conversions + c.conversions, clicks: acc.clicks + c.clicks }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 })
    : { spend: fbData?.spend || 0, revenue: fbData?.revenue || 0, conversions: fbData?.conversions || 0, clicks: fbData?.clicks || 0 };

  const badge = ({ live: { label: 'Live', color: '#a8cf45' }, upload: { label: isCombined ? 'CSV (Combined)' : `CSV (${level})`, color: '#04aae8' }, demo: { label: 'Demo', color: '#888' } } as any)[source] || { label: 'Demo', color: '#888' };
  const effectiveRoas = wooTotals.revenue > 0 && totals.spend > 0 ? (wooTotals.revenue / totals.spend).toFixed(2) : null;
  const hasDailyData = isCombined && fbData?.daily?.length > 0;

  function handleViewAdset(adset: any) {
    if (typeof window !== 'undefined') localStorage.setItem(`adset_${encodeURIComponent(adset.name)}`, JSON.stringify(adset));
    setAdsetView(encodeURIComponent(adset.name));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Facebook Ads</h1>
          <p className="section-sub">
            {isCombined && fbData?.dateRange
              ? `${fbData.dateRange.start} → ${fbData.dateRange.end} · Campaign + demographics + daily breakdown`
              : 'Campaign → Adset → Ad with demographics, device & time breakdown'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowUpload(!showUpload)} className="btn btn-ghost" style={{ fontSize: 12, color: source === 'upload' ? '#04aae8' : undefined }}>📂 Upload CSV</button>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}33` }}>{badge.label}</span>
        </div>
      </div>

      {showUtmBanner && (
        <div style={{ background: 'rgba(255,140,66,0.08)', border: '1px solid rgba(255,140,66,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ff8c42', marginBottom: 6 }}>⚡ Add adset & ad names to your Meta URL parameters</div>
              <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6, display: 'block', color: '#ffe600', lineHeight: 1.8, wordBreak: 'break-all' }}>
                utm_source=&#123;&#123;site_source_name&#125;&#125;&amp;utm_medium=&#123;&#123;site_medium&#125;&#125;&amp;utm_campaign=&#123;&#123;campaign.name&#125;&#125;&amp;utm_content=&#123;&#123;ad.name&#125;&#125;&amp;utm_term=&#123;&#123;adset.name&#125;&#125;
              </code>
            </div>
            <button onClick={() => setShowUtmBanner(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}

      {showUpload && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <UploadPanelInline existingFile={filename} existingDate={uploadedAt} existingLevel={level} isCombined={isCombined}
            onUploaded={() => { load(); setShowUpload(false); }}
            onClear={async () => { await fetch('/api/upload?platform=facebook', { method: 'DELETE' }); load(); }} />
        </div>
      )}

      {isDemo && !showUpload && (
        <div style={{ background: 'rgba(24,119,242,0.06)', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Showing demo data — <span style={{ color: '#04aae8' }}>upload your Meta Ads CSV export</span> for real data</div>
          <button onClick={() => setShowUpload(true)} className="btn btn-ghost" style={{ fontSize: 11, color: '#04aae8', borderColor: 'rgba(4,170,232,0.3)' }}>Upload now →</button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Spend', value: fmt(totals.spend), color: 'var(--pink)' },
          { label: wooTotals.revenue > 0 ? 'Woo Revenue' : 'Revenue', value: wooTotals.revenue > 0 ? fmt(wooTotals.revenue) : (totals.revenue > 0 ? fmt(totals.revenue) : '—'), color: 'var(--green)' },
          { label: effectiveRoas ? 'Effective ROAS' : 'ROAS', value: effectiveRoas ? `${effectiveRoas}×` : (totals.revenue > 0 && totals.spend > 0 ? `${(totals.revenue / totals.spend).toFixed(2)}×` : '—'), color: 'var(--yellow)' },
          { label: 'Meta Purchases', value: totals.conversions.toLocaleString(), color: 'var(--blue)' },
          { label: wooTotals.orders > 0 ? 'Woo Orders' : 'Avg CPC', value: wooTotals.orders > 0 ? wooTotals.orders.toLocaleString() : (totals.clicks > 0 ? `$${(totals.spend / totals.clicks).toFixed(2)}` : '—'), color: wooTotals.orders > 0 ? '#a8cf45' : 'var(--pink)' },
          { label: 'Campaigns', value: campaigns.length, color: 'var(--muted)' },
        ].map(t => <div key={t.label} className="stat-tile"><span className="label">{t.label}</span><span className="value" style={{ color: t.color }}>{t.value}</span></div>)}
      </div>

      {/* Tab bar — only when combined data */}
      {isCombined && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {([['overview', '📊 Overview'], ['demographics', '👥 Demographics'], ['ads', '🖼 Ads']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '8px 18px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
                borderBottom: activeTab === tab ? '2px solid #1877F2' : '2px solid transparent', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Daily chart — overview tab */}
      {(activeTab === 'overview') && hasDailyData && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>📈 Daily: FB Spend vs WooCommerce Revenue</div>
            {wooTotals.revenue === 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Loading Woo data…</div>}
          </div>
          <DailyChart daily={fbData.daily} wooDaily={wooDaily} />
          {wooTotals.revenue > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
              {fbData.dateRange?.start?.slice(0, 7)} · FB Spend <strong style={{ color: 'var(--pink)' }}>{fmt(totals.spend)}</strong> → Woo Revenue <strong style={{ color: '#a8cf45' }}>{fmt(wooTotals.revenue)}</strong> · Effective ROAS <strong style={{ color: '#ffe600' }}>{effectiveRoas}×</strong>
            </div>
          )}
        </div>
      )}

      {/* Campaign table — overview tab */}
      {(activeTab === 'overview') && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 28 }} />
            <div style={{ flex: 1, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign</div>
            <div style={{ display: 'grid', gridTemplateColumns: isCombined ? 'repeat(5, 90px)' : 'repeat(6, 90px)', textAlign: 'right' }}>
              {(isCombined ? ['Spend', 'Conv.', 'CPA', 'Clicks', 'CTR'] : ['Spend', 'Revenue', 'ROAS', 'Conv.', 'CPC', 'CTR']).map(h => (
                <div key={h} style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
              ))}
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {campaigns.map((c: any) => <CampaignRowComp key={c.name} campaign={c} onViewAdset={handleViewAdset} isCombined={isCombined} />)}
          </div>
        </div>
      )}

      {/* Demographics tab */}
      {activeTab === 'demographics' && isCombined && (fbData?.ageBreakdown?.length > 0 || fbData?.genderBreakdown?.length > 0) && (
        <DemographicsSection ageBreakdown={fbData.ageBreakdown || []} genderBreakdown={fbData.genderBreakdown || []} />
      )}

      {/* Ads tab */}
      {activeTab === 'ads' && isCombined && fbData?.adBreakdown?.length > 0 && (
        <AdBreakdownTable adBreakdown={fbData.adBreakdown} />
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
        {isCombined ? 'Combined granular · Overview / Demographics / Ads tabs · Click campaigns to drill into adsets' : 'Click a campaign to expand adsets · Click "View Details" for ad-level analytics'}
      </div>
    </div>
  );
}

function UploadPanelInline({ existingFile, existingDate, existingLevel, isCombined, onUploaded, onClear }: any) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true); setError(''); setSuccess('');
    const form = new FormData(); form.append('file', file); form.append('platform', 'facebook');
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) setError(d.error || 'Upload failed');
      else if (d.reportType === 'combined_granular') {
        const dr = d.dateRange ? ` · ${d.dateRange.start} → ${d.dateRange.end}` : '';
        setSuccess(`✓ Combined granular · ${d.campaigns} campaigns · $${Math.round(d.spend || 0)} spend · ${d.purchases} purchases · CPA $${(d.cpa || 0).toFixed(2)}${dr}`);
        onUploaded();
      } else {
        setSuccess(`✓ ${d.level}-level · ${d.campaigns} campaigns · $${Math.round(d.spend || 0)} spend`);
        onUploaded();
      }
    } catch { setError('Upload failed'); } finally { setUploading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>📂 Meta Ads Manager Export</div>
        {existingFile && <button onClick={onClear} className="btn btn-ghost" style={{ fontSize: 11, color: '#ff5050', borderColor: 'rgba(255,80,80,0.3)' }}>✕ Clear</button>}
      </div>
      {existingFile && <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 10 }}>Current: {isCombined ? 'Combined granular' : existingLevel} · {existingFile}</div>}
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? '#1877F2' : 'var(--border)'}`, borderRadius: 8, padding: '14px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{uploading ? 'Uploading…' : 'Drop CSV — supports performance, breakdown, or combined granular exports'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Combined granular: Ads tab → Breakdown → Day + Age + Gender → Export CSV</div>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 11, color: '#ff5050' }}>⚠ {error}</div>}
      {success && <div style={{ marginTop: 8, fontSize: 11, color: '#a8cf45' }}>{success}</div>}
    </div>
  );
}

function CampaignRowComp({ campaign, onViewAdset, isCombined }: any) {
  const [expanded, setExpanded] = useState(false);
  const hasAdsets = campaign.adsets?.length > 0;
  const cols = isCombined ? 5 : 6;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <div onClick={() => hasAdsets && setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', background: 'rgba(255,255,255,0.03)', cursor: hasAdsets ? 'pointer' : 'default' }}>
        <div style={{ width: 28, fontSize: 14, color: 'var(--muted)' }}>{hasAdsets ? (expanded ? '▾' : '▸') : '○'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{campaign.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{campaign.adsets?.length || 0} adsets</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 90px)`, textAlign: 'right', alignItems: 'center', gap: 0 }}>
          {isCombined ? [
            <span key="sp" style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)' }}>{fmt(campaign.spend)}</span>,
            <span key="cv" style={{ fontSize: 13, fontWeight: 700, color: '#04aae8' }}>{campaign.conversions}</span>,
            <span key="cp" style={{ fontSize: 13, fontWeight: 700, color: campaign.cpa < 5 ? '#a8cf45' : 'var(--muted)' }}>{campaign.cpa > 0 ? `$${campaign.cpa}` : '—'}</span>,
            <span key="cl" style={{ fontSize: 12, color: 'var(--text)' }}>{campaign.clicks?.toLocaleString() || '—'}</span>,
            <span key="ct" style={{ fontSize: 12, color: 'var(--muted)' }}>{campaign.ctr > 0 ? `${campaign.ctr}%` : '—'}</span>,
          ] : [
            { v: fmt(campaign.spend) },
            { v: fmt(campaign.revenue), c: 'var(--green)' },
            { v: null, roas: campaign.roas },
            { v: campaign.conversions },
            { v: `$${campaign.cpc}` },
            { v: `${campaign.ctr}%` },
          ].map((m: any, i) => (
            <div key={i} style={{ textAlign: 'right' }}>
              {m.roas !== undefined ? <RoasBadge v={m.roas} /> : <span style={{ fontSize: 13, fontWeight: 700, color: m.c || 'var(--text)' }}>{m.v}</span>}
            </div>
          ))}
        </div>
      </div>
      {expanded && hasAdsets && (
        <div>
          <div style={{ padding: '6px 16px 6px 48px', background: 'rgba(24,119,242,0.03)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'grid', gridTemplateColumns: `1fr repeat(${cols}, 90px)` }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>Ad Set</div>
            {(isCombined ? ['Spend', 'Conv.', 'CPA', 'Clicks', ''] : ['Spend', 'Revenue', 'ROAS', 'Conv.', 'CPC', '']).map(h => (
              <div key={h} style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'right' }}>{h}</div>
            ))}
          </div>
          {campaign.adsets.map((a: any) => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 10px 48px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(24,119,242,0.03)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.ads?.length || 0} ads</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 90px)`, textAlign: 'right', alignItems: 'center' }}>
                {isCombined ? [
                  <span key="sp" style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.spend)}</span>,
                  <span key="cv" style={{ fontSize: 12, fontWeight: 700, color: '#04aae8' }}>{a.conversions}</span>,
                  <span key="cp" style={{ fontSize: 12, color: a.cpa < 5 ? '#a8cf45' : 'var(--muted)' }}>{a.cpa > 0 ? `$${a.cpa}` : '—'}</span>,
                  <span key="cl" style={{ fontSize: 12, color: 'var(--muted)' }}>{a.clicks?.toLocaleString()}</span>,
                  <button key="dt" onClick={() => onViewAdset(a)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px', color: '#1877F2', borderColor: 'rgba(24,119,242,0.35)' }}>Details →</button>,
                ] : [
                  <span key="sp" style={{ fontSize: 12, fontWeight: 700 }}>{fmt(a.spend)}</span>,
                  <span key="rv" style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>{fmt(a.revenue)}</span>,
                  <RoasBadge key="ro" v={a.roas} />,
                  <span key="cv" style={{ fontSize: 12 }}>{a.conversions}</span>,
                  <span key="cp2" style={{ fontSize: 12, color: 'var(--muted)' }}>${a.cpc}</span>,
                  <button key="dt" onClick={() => onViewAdset(a)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px', color: '#1877F2', borderColor: 'rgba(24,119,242,0.35)' }}>Details →</button>,
                ]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
