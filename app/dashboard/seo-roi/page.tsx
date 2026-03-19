'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function SeoRoiPage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');

  useEffect(() => {
    fetch('/api/data/seo-roi').then(r => r.json()).then(d => { setData(d.data); setSource(d.source); });
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

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
          <h1 className="section-title" style={{ fontSize: 26 }}>SEO Cost vs Revenue</h1>
          <p className="section-sub">Monthly SEO retainer ROI against organic revenue</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile"><span className="label">Total SEO Cost</span><span className="value" style={{ color: 'var(--pink)' }}>${data.total_cost.toLocaleString()}</span><span className="sub">Last 7 months</span></div>
        <div className="stat-tile"><span className="label">Organic Revenue</span><span className="value" style={{ color: 'var(--green)' }}>${data.total_revenue.toLocaleString()}</span><span className="sub">Attributed to SEO</span></div>
        <div className="stat-tile"><span className="label">SEO ROI</span><span className="value" style={{ color: 'var(--yellow)' }}>{data.roi}%</span><span className="sub">Return on SEO spend</span></div>
        <div className="stat-tile"><span className="label">Monthly Retainer</span><span className="value" style={{ color: 'var(--blue)' }}>$1,600</span><span className="sub">Fixed cost</span></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>SEO Cost vs Organic Revenue</div></div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.monthly}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A8CF45" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#A8CF45" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E7258D" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#E7258D" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="organic_revenue" name="Organic Revenue" stroke="#A8CF45" strokeWidth={2.5} fill="url(#revGrad)" />
            <Area type="monotone" dataKey="cost" name="SEO Cost" stroke="#E7258D" strokeWidth={2} fill="url(#costGrad)" strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Month</th><th>SEO Cost</th><th>Organic Revenue</th><th>Net Profit</th><th>ROI</th></tr></thead>
          <tbody>
            {data.monthly.map((m: any) => {
              const net = m.organic_revenue - m.cost;
              const roi = ((net / m.cost) * 100).toFixed(0);
              return (
                <tr key={m.month}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td style={{ color: 'var(--pink)' }}>${m.cost.toLocaleString()}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${m.organic_revenue.toLocaleString()}</td>
                  <td style={{ color: net > 0 ? 'var(--green)' : '#ff6b6b' }}>${net.toLocaleString()}</td>
                  <td className={parseFloat(roi) > 200 ? 'roas-high' : 'roas-mid'}>{roi}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
