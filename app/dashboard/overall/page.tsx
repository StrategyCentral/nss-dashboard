'use client';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function OverallRoiPage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');

  useEffect(() => {
    fetch('/api/data/overall').then(r => r.json()).then(d => { setData(d.data); setSource(d.source); });
  }, []);

  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

  const COLORS = ['#04AAE8', '#A8CF45', '#FFCC2A', '#E7258D'];
  function roasClass(r: number) { return r >= 5 ? 'roas-high' : r >= 3 ? 'roas-mid' : 'roas-low'; }

  const pieData = data.channels.filter((c: any) => c.spend > 0).map((c: any) => ({ name: c.name, value: c.spend }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: payload[0].payload.fill }}>{payload[0].name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Spend: ${payload[0].value?.toLocaleString()}</div>
      </div>
    );
  };

  const totalNet = data.total_revenue - data.total_spend;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Overall ROI</h1>
          <p className="section-sub">Combined performance across all marketing channels</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile"><span className="label">Total Spend</span><span className="value" style={{ color: 'var(--pink)' }}>${data.total_spend.toLocaleString()}</span><span className="sub">All channels</span></div>
        <div className="stat-tile"><span className="label">Total Revenue</span><span className="value" style={{ color: 'var(--green)' }}>${data.total_revenue.toLocaleString()}</span><span className="sub">Attributed</span></div>
        <div className="stat-tile"><span className="label">Net Profit</span><span className="value" style={{ color: 'var(--yellow)' }}>${totalNet.toLocaleString()}</span><span className="sub">Revenue minus spend</span></div>
        <div className="stat-tile"><span className="label">Overall ROAS</span><span className="value" style={{ color: 'var(--blue)' }}>{data.overall_roas}×</span><span className="sub">Blended return</span></div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Pie */}
        <div className="card">
          <div style={{ marginBottom: 14 }}><div className="section-title" style={{ fontSize: 15 }}>Spend by Channel</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ROAS comparison */}
        <div className="card">
          <div style={{ marginBottom: 14 }}><div className="section-title" style={{ fontSize: 15 }}>ROAS by Channel</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {data.channels.filter((c: any) => c.roas > 0).map((c: any, i: number) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  <span className={roasClass(c.roas)} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15 }}>{c.roas.toFixed(2)}×</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min((c.roas / 10) * 100, 100)}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.8s ease' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div className="card">
        <div style={{ marginBottom: 16 }}><div className="section-title" style={{ fontSize: 15 }}>Channel Summary</div></div>
        <table className="data-table">
          <thead><tr><th>Channel</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Net Profit</th><th>% of Total Rev</th></tr></thead>
          <tbody>
            {data.channels.map((c: any) => {
              const net = c.revenue - c.spend;
              const pct = ((c.revenue / data.total_revenue) * 100).toFixed(1);
              return (
                <tr key={c.name}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.spend > 0 ? `$${c.spend.toLocaleString()}` : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${c.revenue.toLocaleString()}</td>
                  <td>{c.roas > 0 ? <span className={roasClass(c.roas)}>{c.roas.toFixed(2)}×</span> : <span style={{ color: 'var(--muted)' }}>Organic</span>}</td>
                  <td style={{ color: net >= 0 ? 'var(--green)' : '#ff6b6b' }}>${net.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)' }}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
