'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: '90d', label: '90 Days' },
];

function fmt(n: number, prefix = '$') { return `${prefix}${Math.round(n).toLocaleString()}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [view, setView] = useState<'channels' | 'orders'>('channels');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function load(p = period) {
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/woo/orders?period=${p}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Revenue Attribution</h1>
          <p className="section-sub">What caused each sale — channel performance with real profit margins</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => changePeriod(p.key)}
              className={period === p.key ? 'btn btn-pink' : 'btn btn-ghost'}
              style={{ fontSize: 11, padding: '5px 10px' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Loading order data from WooCommerce…</div>}

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ color: '#ff5050', fontWeight: 700, marginBottom: 4 }}>⚠ Could not load orders</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary KPIs */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Revenue', value: fmt(data.summary.totalRevenue), sub: `${data.summary.totalOrders} orders`, color: 'var(--green)' },
              { label: 'Total Profit', value: fmt(data.summary.totalProfit), sub: `${fmtPct(data.summary.avgMarginPct)} avg margin`, color: 'var(--yellow)' },
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

          {/* Channel breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Bar chart */}
            <div className="card">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Revenue by Channel</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.channels} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} axisLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={120} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                    {data.channels.map((c: any, i: number) => <Cell key={i} fill={c.color} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit by channel */}
            <div className="card">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Profit by Channel</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.channels} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} axisLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--muted)', fontSize: 11 }} width={120} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]}>
                    {data.channels.map((c: any, i: number) => <Cell key={i} fill={c.color} fillOpacity={0.6} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel table */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-title" style={{ fontSize: 14 }}>Channel Performance</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setView('channels')} className={view === 'channels' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '4px 10px' }}>Channels</button>
                <button onClick={() => setView('orders')} className={view === 'orders' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 11, padding: '4px 10px' }}>Orders ({data.orders.length})</button>
              </div>
            </div>

            {view === 'channels' && (
              <table className="data-table">
                <thead><tr>
                  <th>Channel</th><th>Orders</th><th>Revenue</th><th>Profit</th><th>Margin</th><th>% of Revenue</th>
                </tr></thead>
                <tbody>
                  {data.channels.map((c: any) => (
                    <tr key={c.channel}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                          <span style={{ fontSize: 13 }}>{c.icon}</span>
                          <span style={{ fontWeight: 500 }}>{c.channel}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{c.orders}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(c.revenue)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--yellow)' }}>{fmt(c.profit)}</td>
                      <td>
                        <span style={{ color: c.margin_pct >= 40 ? 'var(--green)' : c.margin_pct >= 30 ? 'var(--yellow)' : '#ff5050', fontWeight: 700 }}>
                          {fmtPct(c.margin_pct)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.revenue_pct}%`, background: c.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 36 }}>{c.revenue_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {view === 'orders' && (
              <div>
                <table className="data-table">
                  <thead><tr>
                    <th>Order</th><th>Date</th><th>Customer</th><th>Channel</th><th>Revenue</th><th>Profit</th><th>Margin</th><th></th>
                  </tr></thead>
                  <tbody>
                    {data.orders.map((o: any) => (
                      <>
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                          <td style={{ fontFamily: 'monospace', color: 'var(--blue)' }}>#{o.id}</td>
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
                          <td style={{ color: o.margin_pct >= 40 ? 'var(--green)' : 'var(--yellow)', fontWeight: 700 }}>{fmtPct(o.margin_pct)}</td>
                          <td style={{ color: 'var(--muted)', fontSize: 12 }}>{expandedOrder === o.id ? '▴' : '▾'}</td>
                        </tr>
                        {expandedOrder === o.id && (
                          <tr key={`${o.id}-items`}>
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

          {/* Attribution note */}
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', paddingBottom: 8 }}>
            Attribution via WooCommerce Order Attribution (UTM source/medium/campaign). Profit calculated using per-product margins.
            <a href="/admin/margins" style={{ color: 'var(--blue)', marginLeft: 6 }}>Edit product margins →</a>
          </div>
        </>
      )}
    </div>
  );
}
