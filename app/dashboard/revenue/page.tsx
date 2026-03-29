'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '90d', label: '90 Days' },
];

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }
function fmtPct(n: number) { return n.toFixed(1) + '%'; }

function MarginPill({ pct }: { pct: number }) {
  const color = pct >= 40 ? '#a8cf45' : pct >= 30 ? '#ffe600' : '#ff5050';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 10, border: `1px solid ${color}33` }}>
      {fmtPct(pct)}
    </span>
  );
}

function ChannelRow({ channel, fbUploadData }: any) {
  const [expanded, setExpanded] = useState(false);
  const hasCampaigns = channel.campaigns?.length > 0;

  // Match FB spend data to campaigns if available
  const fbCampaigns = fbUploadData?.campaigns || [];
  const enrichedCampaigns = (channel.campaigns || []).map((cam: any) => {
    const match = fbCampaigns.find((fc: any) =>
      fc.name?.toLowerCase().slice(0, 20) === cam.name?.toLowerCase().slice(0, 20) ||
      cam.name?.toLowerCase().includes(fc.name?.toLowerCase().slice(0, 12))
    );
    const spend = match?.spend || null;
    const cps = spend && cam.orders > 0 ? spend / cam.orders : null;
    return { ...cam, spend, cps };
  });

  const perSale = channel.orders > 0 ? channel.revenue / channel.orders : 0;

  return (
    <>
      <tr onClick={() => hasCampaigns && setExpanded(!expanded)}
        style={{ cursor: hasCampaigns ? 'pointer' : 'default', background: expanded ? 'rgba(255,255,255,0.035)' : 'transparent',
          transition: 'background 0.1s' }}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: channel.color, boxShadow: `0 0 6px ${channel.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: 15 }}>{channel.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{channel.channel}</span>
            {hasCampaigns && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {expanded ? '▾' : '▸'} {channel.campaigns.length}
              </span>
            )}
          </div>
        </td>
        {/* SALES */}
        <td>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontFamily: "'Barlow Condensed',sans-serif" }}>
            {channel.orders}
          </span>
        </td>
        {/* $ PER SALE */}
        <td>
          {channel.orders > 0
            ? <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{fmt(perSale)}</span>
            : <span style={{ color: 'var(--muted)' }}>—</span>}
        </td>
        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(channel.revenue)}</td>
        <td style={{ fontWeight: 700, color: 'var(--yellow)' }}>{fmt(channel.profit)}</td>
        <td><MarginPill pct={channel.margin_pct} /></td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
              <div style={{ height: '100%', width: `${channel.revenue_pct}%`, background: channel.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 36 }}>{channel.revenue_pct}%</span>
          </div>
        </td>
      </tr>

      {/* Campaign breakdown */}
      {expanded && hasCampaigns && enrichedCampaigns.map((cam: any, i: number) => {
        const camPerSale = cam.orders > 0 ? cam.revenue / cam.orders : 0;
        const shareOfChannel = channel.revenue > 0 ? (cam.revenue / channel.revenue) * 100 : 0;
        return (
          <tr key={i} style={{ background: 'rgba(255,255,255,0.015)' }}>
            <td style={{ paddingLeft: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 20, background: channel.color, opacity: 0.4, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text)' }}>{cam.name}</span>
              </div>
            </td>
            {/* SALES */}
            <td style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: "'Barlow Condensed',sans-serif" }}>{cam.orders}</td>
            {/* $ PER SALE */}
            <td>
              {cam.cps != null
                ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>{fmt(cam.cps)}</span>
                : cam.orders > 0
                  ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmt(camPerSale)}</span>
                  : <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
            </td>
            <td style={{ fontSize: 12, color: 'var(--green)' }}>{fmt(cam.revenue)}</td>
            <td style={{ fontSize: 12, color: 'var(--yellow)' }}>{fmt(cam.profit)}</td>
            <td><MarginPill pct={cam.margin_pct} /></td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', minWidth: 60 }}>
                  <div style={{ height: '100%', width: `${shareOfChannel}%`, background: channel.color, opacity: 0.5, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 36 }}>{shareOfChannel.toFixed(0)}%</span>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [view, setView] = useState<'channels' | 'orders'>('channels');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function load(p = period) {
    setLoading(true); setError('');
    try {
      const [ordersRes, fbRes] = await Promise.all([
        fetch(`/api/woo/orders?period=${p}`),
        fetch('/api/data/facebook'),
      ]);
      const ordersData = await ordersRes.json();
      const fbJson = await fbRes.json();
      if (ordersData.error) throw new Error(ordersData.error);
      setData(ordersData);
      if (fbJson.data?.campaigns?.length) setFbData(fbJson.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function changePeriod(p: string) { setPeriod(p); load(p); }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,10,14,0.95)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ fontSize: 12, color: p.color, fontWeight: 600, marginBottom: 2 }}>
            {p.name}: ${Math.round(p.value).toLocaleString()}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Revenue Attribution</h1>
          <p className="section-sub">Click any channel to expand campaign breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => changePeriod(p.key)}
              className={period === p.key ? 'btn btn-pink' : 'btn btn-ghost'}
              style={{ fontSize: 11, padding: '5px 10px' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Loading orders from WooCommerce…</div>}

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ color: '#ff5050', fontWeight: 700, marginBottom: 4 }}>⚠ Could not load orders</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPIs */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Revenue', value: fmt(data.summary.totalRevenue), sub: data.summary.totalOrders + ' orders', color: 'var(--green)' },
              { label: 'Total Profit', value: fmt(data.summary.totalProfit), sub: fmtPct(data.summary.avgMarginPct) + ' avg margin', color: 'var(--yellow)' },
              { label: 'Avg Order Value', value: fmt(data.summary.avgOrderValue), sub: 'Per transaction', color: 'var(--blue)' },
              { label: 'Profit Margin', value: fmtPct(data.summary.avgMarginPct), sub: 'Across all products', color: data.summary.avgMarginPct >= 40 ? 'var(--green)' : 'var(--yellow)' },
            ].map(t => (
              <div key={t.label} className="stat-tile">
                <span className="label">{t.label}</span>
                <span className="value" style={{ color: t.color }}>{t.value}</span>
                <span className="sub">{t.sub}</span>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Revenue by Channel</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.channels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} axisLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={120} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#a8cf45" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Profit by Channel</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.channels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} axisLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={120} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="profit" name="Profit" fill="#ffe600" radius={[0, 4, 4, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel / Orders table */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="section-title" style={{ fontSize: 14 }}>Channel Performance</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  ▸ Click any channel to see campaign breakdown
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setView('channels')} className={view === 'channels' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '4px 10px' }}>Channels</button>
                <button onClick={() => setView('orders')} className={view === 'orders' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '4px 10px' }}>Orders ({data.orders.length})</button>
              </div>
            </div>

            {view === 'channels' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Channel</th>
                      <th style={{ color: '#ffffff', fontWeight: 800, fontSize: 12 }}>SALES</th>
                      <th style={{ color: 'var(--blue)', fontWeight: 800, fontSize: 12 }}>$ PER SALE</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                      <th>Margin</th>
                      <th style={{ minWidth: 130 }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels.map((channel: any) => (
                      <ChannelRow key={channel.channel} channel={channel} fbUploadData={fbData} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 12 }}>TOTAL</td>
                      <td style={{ fontWeight: 900, fontSize: 18, fontFamily: "'Barlow Condensed',sans-serif" }}>{data.summary.totalOrders}</td>
                      <td style={{ fontWeight: 700, color: 'var(--blue)' }}>
                        {data.summary.totalOrders > 0 ? fmt(data.summary.totalRevenue / data.summary.totalOrders) : '—'}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--green)' }}>{fmt(data.summary.totalRevenue)}</td>
                      <td style={{ fontWeight: 800, color: 'var(--yellow)' }}>{fmt(data.summary.totalProfit)}</td>
                      <td><MarginPill pct={data.summary.avgMarginPct} /></td>
                      <td style={{ color: 'var(--muted)' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {view === 'orders' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th><th>Date</th><th>Customer</th><th>Channel</th>
                      <th>Revenue</th><th>Profit</th><th>Margin</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o: any) => (
                      <>
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                          <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                          <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(o.date).toLocaleDateString()}</td>
                          <td style={{ fontSize: 12 }}>{o.customer}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.color }} />
                              <span style={{ fontSize: 12 }}>{o.channel}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                          <td style={{ color: 'var(--yellow)', fontWeight: 600 }}>{fmt(o.profit)}</td>
                          <td><MarginPill pct={o.margin_pct} /></td>
                          <td style={{ color: 'var(--muted)', fontSize: 12 }}>{expandedOrder === o.id ? '▴' : '▾'}</td>
                        </tr>
                        {expandedOrder === o.id && (
                          <tr key={`${o.id}-exp`}>
                            <td colSpan={8} style={{ padding: '0 0 12px 40px' }}>
                              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginTop: 4 }}>
                                {o.items.map((item: any, i: number) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                                    <span>{item.qty}× {item.name}</span>
                                    <span style={{ color: 'var(--text)' }}>{fmt(item.total)}</span>
                                  </div>
                                ))}
                                {o.campaign && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 8 }}>Campaign: {o.campaign}</div>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', paddingBottom: 8 }}>
            Attribution via WooCommerce Order Attribution (UTM source/medium/campaign) · Profit from per-product margins ·{' '}
            <a href="/admin/margins" style={{ color: 'var(--blue)' }}>Edit margins →</a>
          </div>
        </>
      )}
    </div>
  );
}
