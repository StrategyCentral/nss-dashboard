'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';

export default function QuarterlyPage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');
  const [view, setView] = useState<'combined' | 'isolated'>('combined');

  useEffect(() => {
    fetch('/api/data/quarterly').then(r => r.json()).then(d => { setData(d.data); setSource(d.source); });
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

  const latest = data.quarters[data.quarters.length - 1];
  const prev = data.quarters[data.quarters.length - 2];
  const revChange = (((latest.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1);
  const totalSpend = data.quarters.reduce((a: number, q: any) => a + q.fb_spend + q.ga_spend, 0);
  const totalRev = data.quarters.reduce((a: number, q: any) => a + q.revenue, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => <div key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>{p.name}: ${p.value?.toLocaleString()}</div>)}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Quarterly Revenue</h1>
          <p className="section-sub">Revenue vs ad spend by quarter — Facebook & Google isolated</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile"><span className="label">Latest Quarter</span><span className="value" style={{ color: 'var(--green)' }}>${latest.revenue.toLocaleString()}</span><span className="sub">{latest.q}</span></div>
        <div className="stat-tile"><span className="label">QoQ Change</span><span className="value" style={{ color: parseFloat(revChange) >= 0 ? 'var(--green)' : '#ff6b6b' }}>{parseFloat(revChange) >= 0 ? '+' : ''}{revChange}%</span><span className="sub">vs {prev.q}</span></div>
        <div className="stat-tile"><span className="label">Total Revenue</span><span className="value" style={{ color: 'var(--yellow)' }}>${(totalRev / 1000).toFixed(0)}K</span><span className="sub">All quarters</span></div>
        <div className="stat-tile"><span className="label">Total Ad Spend</span><span className="value" style={{ color: 'var(--pink)' }}>${(totalSpend / 1000).toFixed(0)}K</span><span className="sub">FB + Google</span></div>
      </div>

      {/* Tab toggle */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${view === 'combined' ? ' active' : ''}`} onClick={() => setView('combined')}>Combined View</button>
        <button className={`tab-btn${view === 'isolated' ? ' active' : ''}`} onClick={() => setView('isolated')}>Platform Isolated</button>
      </div>

      {view === 'combined' ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Quarterly Revenue vs Total Ad Spend</div></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.quarters} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="q" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--green)" radius={[4,4,0,0]} fillOpacity={0.9} />
              <Bar dataKey="fb_spend" name="FB Spend" stackId="spend" fill="var(--blue)" radius={[0,0,0,0]} fillOpacity={0.85} />
              <Bar dataKey="ga_spend" name="GA Spend" stackId="spend" fill="var(--pink)" radius={[4,4,0,0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div style={{ marginBottom: 14, color: 'var(--blue)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14 }}>Facebook Ads</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.quarters} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="q" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="fb_spend" name="FB Spend" fill="var(--pink)" radius={[4,4,0,0]} fillOpacity={0.85} />
                <Bar dataKey="fb_revenue" name="FB Revenue" fill="var(--blue)" radius={[4,4,0,0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div style={{ marginBottom: 14, color: 'var(--green)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14 }}>Google Ads</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.quarters} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="q" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ga_spend" name="GA Spend" fill="var(--pink)" radius={[4,4,0,0]} fillOpacity={0.85} />
                <Bar dataKey="ga_revenue" name="GA Revenue" fill="var(--green)" radius={[4,4,0,0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Quarter</th><th>Revenue</th><th>FB Spend</th><th>GA Spend</th><th>Total Spend</th><th>Net ROI</th></tr></thead>
          <tbody>
            {data.quarters.map((q: any) => {
              const spend = q.fb_spend + q.ga_spend;
              const roi = (((q.revenue - spend) / spend) * 100).toFixed(0);
              return (
                <tr key={q.q}>
                  <td style={{ fontWeight: 600 }}>{q.q}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${q.revenue.toLocaleString()}</td>
                  <td>${q.fb_spend.toLocaleString()}</td>
                  <td>${q.ga_spend.toLocaleString()}</td>
                  <td>${spend.toLocaleString()}</td>
                  <td className={parseFloat(roi) > 100 ? 'roas-high' : 'roas-mid'}>{roi}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
