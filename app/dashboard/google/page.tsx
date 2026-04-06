'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
function roasColor(r: number) {
  if (r >= 6) return '#a8cf45';
  if (r >= 4) return '#ffe600';
  if (r >= 2) return '#ff8c00';
  return '#ff4444';
}

// ── Setup Banner ─────────────────────────────────────────────────────────────
function SetupBanner({ setup }: { setup: { hasToken: boolean; hasCustomerId: boolean; hasDevToken: boolean } }) {
  const steps = [
    { done: setup.hasToken, label: 'Connect Google Account', action: 'Go to Admin → Connections and click Connect Google' },
    { done: setup.hasCustomerId, label: 'Set Google Ads Customer ID', action: 'Go to Admin → API Keys and add google_ads_customer_id' },
    { done: setup.hasDevToken, label: 'Set Developer Token', action: 'Add GOOGLE_ADS_DEVELOPER_TOKEN env var in Railway' },
  ];
  const allDone = steps.every(s => s.done);
  if (allDone) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(66,133,244,0.08) 0%, rgba(4,170,232,0.08) 100%)',
      border: '1px solid rgba(66,133,244,0.3)',
      borderRadius: 12, padding: '16px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ fontSize: 22, marginTop: 2 }}>🔗</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#4285f4', marginBottom: 8 }}>
          Connect Google Ads for live data
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
              <span style={{ color: s.done ? '#a8cf45' : '#666', fontWeight: 700, width: 14 }}>{s.done ? '✓' : '○'}</span>
              <div>
                <span style={{ color: s.done ? 'var(--muted)' : '#ccc', textDecoration: s.done ? 'line-through' : 'none' }}>
                  {s.label}
                </span>
                {!s.done && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>{s.action}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <a href="/admin/connections" style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
            background: 'rgba(66,133,244,0.15)', color: '#4285f4',
            border: '1px solid rgba(66,133,244,0.3)', textDecoration: 'none',
          }}>Connections →</a>
          <a href="/admin/keys" style={{
            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
            background: 'rgba(255,255,255,0.05)', color: 'var(--muted)',
            border: '1px solid var(--border)', textDecoration: 'none',
          }}>API Keys →</a>
        </div>
      </div>
    </div>
  );
}

// ── ROAS Bar ─────────────────────────────────────────────────────────────────
function RoasBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: roasColor(value), borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: roasColor(value), width: 36, textAlign: 'right' }}>{value.toFixed(1)}×</span>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: ${p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GooglePage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');
  const [setup, setSetup] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const d = await fetch('/api/data/google').then(r => r.json());
      setData(d.data);
      setSource(d.source);
      setSetup(d.setup || null);
      setError(d.error || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, color: 'var(--muted)' }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: '#4285f4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading Google Ads data…
    </div>
  );

  const isDemo = source === 'demo';

  const badge = isDemo
    ? { label: 'Demo Data', color: '#666' }
    : { label: '⚡ Live', color: '#a8cf45' };

  const maxRoas = Math.max(...(data?.campaigns || []).map((c: any) => c.roas), 1);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Google Ads</h1>
          <p className="section-sub">Campaign spend, revenue & ROAS — {isDemo ? 'showing demo data' : 'live from Google Ads API'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
              background: 'rgba(66,133,244,0.1)', color: '#4285f4',
              border: '1px solid rgba(66,133,244,0.25)', cursor: 'pointer', opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}33`,
          }}>{badge.label}</span>
        </div>
      </div>

      {/* ── Setup Banner ── */}
      {isDemo && setup && <SetupBanner setup={setup} />}

      {/* ── Error notice ── */}
      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#ff6666' }}>
          ⚠ API error (showing demo data): {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Spend', value: fmt(data.spend), sub: 'This month', color: 'var(--pink)' },
          { label: 'Revenue', value: fmt(data.revenue), sub: 'Conversion value', color: 'var(--green)' },
          { label: 'ROAS', value: `${data.roas.toFixed(2)}×`, sub: 'Return on ad spend', color: 'var(--yellow)' },
          { label: 'Conversions', value: data.conversions.toLocaleString(), sub: 'Sales this month', color: 'var(--blue)' },
          { label: 'Avg CPC', value: `$${data.cpc}`, sub: 'Cost per click', color: 'var(--pink)' },
          { label: 'Cost / Conv.', value: data.conversions > 0 ? `$${(data.spend / data.conversions).toFixed(2)}` : '—', sub: 'Per sale', color: 'var(--green)' },
        ].map(k => (
          <div key={k.label} className="stat-tile">
            <span className="label">{k.label}</span>
            <span className="value" style={{ color: k.color }}>{k.value}</span>
            <span className="sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Spend vs Revenue Chart ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Spend vs Revenue — Monthly</div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthly} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--green)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            <Bar dataKey="spend" name="Spend" fill="var(--pink)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Campaign Table ── */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Campaign Breakdown</div>
          {isDemo && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Connect Google Ads for live campaign data</div>}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Spend</th>
              <th>Revenue</th>
              <th style={{ minWidth: 140 }}>ROAS</th>
              <th>Conv.</th>
              <th>CPC</th>
            </tr>
          </thead>
          <tbody>
            {(data.campaigns || []).map((c: any) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>{fmt(c.spend)}</td>
                <td>{fmt(c.revenue)}</td>
                <td><RoasBar value={c.roas} max={maxRoas + 1} /></td>
                <td>{c.conversions}</td>
                <td>${c.cpc ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
