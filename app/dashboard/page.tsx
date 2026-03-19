'use client';
import { useEffect, useState } from 'react';

export default function OverviewPage() {
  const [fb, setFb] = useState<any>(null);
  const [ga, setGa] = useState<any>(null);
  const [seo, setSeo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/data/facebook').then(r => r.json()).then(d => setFb(d.data));
    fetch('/api/data/google').then(r => r.json()).then(d => setGa(d.data));
    fetch('/api/data/seo').then(r => r.json()).then(d => setSeo(d.data));
  }, []);

  const totalSpend = (fb?.spend || 0) + (ga?.spend || 0) + 1600;
  const totalRevenue = (fb?.revenue || 0) + (ga?.revenue || 0) + (seo ? 12800 : 0);
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '—';

  const tiles = [
    { label: 'Total Ad Spend', value: `$${totalSpend.toLocaleString()}`, color: 'var(--pink)', sub: 'This month' },
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'var(--green)', sub: 'Attributed' },
    { label: 'Overall ROAS', value: `${overallRoas}×`, color: 'var(--yellow)', sub: 'Return on ad spend' },
    { label: 'FB Ad ROAS', value: `${fb?.roas?.toFixed(2) || '—'}×`, color: 'var(--blue)', sub: 'Facebook / Meta' },
    { label: 'Google ROAS', value: `${ga?.roas?.toFixed(2) || '—'}×`, color: 'var(--pink)', sub: 'Google Ads' },
    { label: 'Avg SEO Position', value: seo?.avgPos?.toFixed(1) || '—', color: 'var(--green)', sub: 'Google Search' },
  ];

  const channels = [
    { name: 'Facebook Ads', spend: fb?.spend, revenue: fb?.revenue, roas: fb?.roas, color: 'var(--blue)' },
    { name: 'Google Ads', spend: ga?.spend, revenue: ga?.revenue, roas: ga?.roas, color: 'var(--green)' },
    { name: 'SEO', spend: 1600, revenue: 12800, roas: 8.0, color: 'var(--yellow)' },
  ];

  function roasClass(r: number) { return r >= 5 ? 'roas-high' : r >= 3 ? 'roas-mid' : 'roas-low'; }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Marketing Overview</h1>
        <p className="section-sub">National Salon Supplies — all channels at a glance</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {tiles.map(t => (
          <div key={t.label} className="stat-tile">
            <span className="label">{t.label}</span>
            <span className="value" style={{ color: t.color }}>{t.value}</span>
            <span className="sub">{t.sub}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="section-title" style={{ fontSize: 15 }}>Channel Performance</span>
          <span className="badge badge-demo">Demo Data</span>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>Channel</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>ROI</th>
          </tr></thead>
          <tbody>
            {channels.map(c => (
              <tr key={c.name}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                  {c.name}
                </td>
                <td>${c.spend?.toLocaleString() || '—'}</td>
                <td>${c.revenue?.toLocaleString() || '—'}</td>
                <td className={roasClass(c.roas)}>{c.roas?.toFixed(2)}×</td>
                <td className={roasClass(c.roas)}>{c.spend ? `${(((c.revenue - c.spend) / c.spend) * 100).toFixed(0)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--yellow)' }}>⚠ Demo Mode</strong> — Connect your API keys in Admin → API Keys to pull live data from Facebook Ads, Google Ads, Google Search Console, WooCommerce, and GA4.
        </p>
      </div>
    </div>
  );
}
