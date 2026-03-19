'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function GooglePage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');

  useEffect(() => {
    fetch('/api/data/google').then(r => r.json()).then(d => { setData(d.data); setSource(d.source); });
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

  function roasClass(r: number) { return r >= 5 ? 'roas-high' : r >= 3 ? 'roas-mid' : 'roas-low'; }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Google Ads</h1>
          <p className="section-sub">Adwords spend, revenue & ROAS by campaign</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile"><span className="label">Total Spend</span><span className="value" style={{ color: 'var(--pink)' }}>${data.spend.toLocaleString()}</span><span className="sub">This month</span></div>
        <div className="stat-tile"><span className="label">Revenue</span><span className="value" style={{ color: 'var(--green)' }}>${data.revenue.toLocaleString()}</span><span className="sub">Attributed</span></div>
        <div className="stat-tile"><span className="label">ROAS</span><span className="value" style={{ color: 'var(--yellow)' }}>{data.roas.toFixed(2)}×</span><span className="sub">Return on ad spend</span></div>
        <div className="stat-tile"><span className="label">Conversions</span><span className="value" style={{ color: 'var(--blue)' }}>{data.conversions}</span><span className="sub">Sales this month</span></div>
        <div className="stat-tile"><span className="label">Avg CPC</span><span className="value" style={{ color: 'var(--pink)' }}>${data.cpc}</span><span className="sub">Cost per click</span></div>
        <div className="stat-tile"><span className="label">Cost/Conv.</span><span className="value" style={{ color: 'var(--green)' }}>${(data.spend / data.conversions).toFixed(2)}</span><span className="sub">Per sale</span></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Spend vs Revenue — Monthly</div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.monthly} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
            <Bar dataKey="spend" name="Spend" fill="var(--pink)" radius={[4,4,0,0]} fillOpacity={0.85} />
            <Bar dataKey="revenue" name="Revenue" fill="var(--green)" radius={[4,4,0,0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Campaign Breakdown</div></div>
        <table className="data-table">
          <thead><tr><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Conv.</th></tr></thead>
          <tbody>
            {data.campaigns.map((c: any) => (
              <tr key={c.name}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>${c.spend.toLocaleString()}</td>
                <td>${c.revenue.toLocaleString()}</td>
                <td className={roasClass(c.roas)}>{c.roas.toFixed(2)}×</td>
                <td>{c.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
