'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function SeoPage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');

  useEffect(() => {
    fetch('/api/data/seo').then(r => r.json()).then(d => { setData(d.data); setSource(d.source); });
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

  function posDiff(curr: number, prev: number) {
    const d = prev - curr;
    if (d > 0) return <span className="up">↑{d}</span>;
    if (d < 0) return <span className="down">↓{Math.abs(d)}</span>;
    return <span className="flat">—</span>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>Avg Position: {payload[0].value}</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>SEO Rankings</h1>
          <p className="section-sub">Keyword positions & organic search performance</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      {/* KPI tiles */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile"><span className="label">Avg Position</span><span className="value" style={{ color: 'var(--green)' }}>{data.avgPos}</span><span className="sub">All tracked keywords</span></div>
        <div className="stat-tile"><span className="label">Organic Clicks</span><span className="value" style={{ color: 'var(--blue)' }}>{data.clicks.toLocaleString()}</span><span className="sub">Last 30 days</span></div>
        <div className="stat-tile"><span className="label">Impressions</span><span className="value" style={{ color: 'var(--yellow)' }}>{(data.impressions / 1000).toFixed(1)}K</span><span className="sub">Search impressions</span></div>
        <div className="stat-tile"><span className="label">Avg CTR</span><span className="value" style={{ color: 'var(--pink)' }}>{data.ctr}%</span><span className="sub">Click-through rate</span></div>
      </div>

      {/* Position trend chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Average Position Over Time</div>
          <div className="section-sub">Lower = better ranking</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis reversed tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[1, 12]} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="avgPos" stroke="var(--green)" strokeWidth={2.5} dot={{ fill: 'var(--green)', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Keywords table */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Keyword Rankings</div>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>Keyword</th><th>Position</th><th>Change</th><th>Search Volume</th>
          </tr></thead>
          <tbody>
            {data.rankings.map((r: any) => (
              <tr key={r.keyword}>
                <td style={{ fontWeight: 500 }}>{r.keyword}</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 6, fontWeight: 700, fontSize: 13,
                    background: r.position <= 3 ? 'rgba(168,207,69,0.15)' : r.position <= 10 ? 'rgba(255,204,42,0.15)' : 'rgba(255,255,255,0.05)',
                    color: r.position <= 3 ? 'var(--green)' : r.position <= 10 ? 'var(--yellow)' : 'var(--muted)',
                  }}>{r.position}</span>
                </td>
                <td>{posDiff(r.position, r.prev)}</td>
                <td style={{ color: 'var(--muted)' }}>{r.volume.toLocaleString()}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
