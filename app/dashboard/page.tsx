'use client';
import { useEffect, useState } from 'react';

const CHANNELS = [
  { key: 'facebook', name: 'Facebook Ads', color: '#1877F2', icon: 'f' },
  { key: 'google', name: 'Google Ads', color: '#4285F4', icon: 'G' },
  { key: 'seo', name: 'SEO', color: '#a8cf45', icon: '🔍' },
  { key: 'email', name: 'Email', color: '#ffe600', icon: '✉' },
];

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  if (!budget) return null;
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const color = over ? '#ff5050' : pct >= 90 ? '#ff8c42' : '#a8cf45';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmt(spent)} of {fmt(budget)}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>
          {over ? `⚠ ${fmt(spent - budget)} over` : `${Math.round(pct)}% used`}
        </span>
      </div>
    </div>
  );
}

function BudgetStatusBadge({ spent, budget }: { spent: number; budget: number }) {
  if (!budget) return null;
  const over = spent > budget;
  const nearlyMet = spent >= budget * 0.9;
  const color = over ? '#ff5050' : nearlyMet ? '#a8cf45' : '#ffe600';
  const label = over ? '🔴 Over Budget' : nearlyMet ? '✅ Budget Met' : '🟡 Under Pacing';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
      background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

function BudgetInput({ channel, period, currentBudget, onSaved }: {
  channel: string; period: string; currentBudget: number; onSaved: () => void;
}) {
  const [value, setValue] = useState(currentBudget > 0 ? String(currentBudget) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = parseFloat(value);
    if (!n || n <= 0) return;
    setSaving(true);
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, budget: n, period }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Monthly budget:</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>$</span>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="0"
          style={{ width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '3px 6px', fontSize: 11, color: 'var(--text)', outline: 'none' }}
        />
        <button onClick={save} disabled={saving}
          style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--muted)' }}>
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [fb, setFb] = useState<any>(null);
  const [ga, setGa] = useState<any>(null);
  const [seo, setSeo] = useState<any>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editBudget, setEditBudget] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const period = new Date().toISOString().slice(0, 7);

  async function loadBudgets() {
    try {
      const r = await fetch(`/api/budgets?period=${period}`);
      const d = await r.json();
      setBudgets(d.budgets || {});
    } catch {}
  }

  useEffect(() => {
    fetch('/api/data/facebook').then(r => r.json()).then(d => setFb(d.data));
    fetch('/api/data/google').then(r => r.json()).then(d => setGa(d.data));
    fetch('/api/data/seo').then(r => r.json()).then(d => setSeo(d.data));
    loadBudgets();
    // Check if admin
    fetch('/api/auth').then(r => r.json()).then(d => setIsAdmin(d?.role === 'admin')).catch(() => {});
  }, []);

  const spendMap: Record<string, number> = {
    facebook: fb?.spend || 0,
    google: ga?.spend || 0,
    seo: 1600, // will come from SEO costs module
    email: 0,
  };

  const totalSpend = Object.values(spendMap).reduce((a, b) => a + b, 0);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const totalRevenue = (fb?.revenue || 0) + (ga?.revenue || 0);
  const overallRoas = totalSpend > 0 && totalRevenue > 0 ? (totalRevenue / totalSpend).toFixed(2) : '—';

  const overBudgetChannels = CHANNELS.filter(c => budgets[c.key] && spendMap[c.key] > budgets[c.key]);
  const budgetMetChannels = CHANNELS.filter(c => budgets[c.key] && spendMap[c.key] >= budgets[c.key] * 0.9 && spendMap[c.key] <= budgets[c.key]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Marketing Overview</h1>
        <p className="section-sub">National Salon Supplies — all channels · {period}</p>
      </div>

      {/* Budget status banner — only shows if budgets are set */}
      {totalBudget > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, background: totalSpend > totalBudget ? 'rgba(255,80,80,0.08)' : 'rgba(168,207,69,0.08)',
            border: `1px solid ${totalSpend > totalBudget ? 'rgba(255,80,80,0.3)' : 'rgba(168,207,69,0.3)'}`,
            borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4,
              color: totalSpend > totalBudget ? '#ff5050' : '#a8cf45' }}>
              {totalSpend > totalBudget ? '🔴 Total Budget Exceeded' : '✅ Total Budget On Track'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {fmt(totalSpend)} spent of {fmt(totalBudget)} total budget
              {totalSpend > totalBudget && <span style={{ color: '#ff5050', fontWeight: 700 }}> (+{fmt(totalSpend - totalBudget)} over)</span>}
            </div>
            <BudgetBar spent={totalSpend} budget={totalBudget} />
          </div>
          {overBudgetChannels.length > 0 && (
            <div style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '12px 16px', minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ff5050', marginBottom: 6 }}>🔴 Over Budget</div>
              {overBudgetChannels.map(c => <div key={c.key} style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}: {fmt(spendMap[c.key])} / {fmt(budgets[c.key])}</div>)}
            </div>
          )}
          {budgetMetChannels.length > 0 && (
            <div style={{ background: 'rgba(168,207,69,0.06)', border: '1px solid rgba(168,207,69,0.2)', borderRadius: 10, padding: '12px 16px', minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a8cf45', marginBottom: 6 }}>✅ Budget Met</div>
              {budgetMetChannels.map(c => <div key={c.key} style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}: {fmt(spendMap[c.key])} / {fmt(budgets[c.key])}</div>)}
            </div>
          )}
        </div>
      )}

      {/* KPI tiles */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Ad Spend', value: fmt(totalSpend), color: 'var(--pink)', sub: period },
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'var(--green)', sub: 'Attributed' },
          { label: 'Overall ROAS', value: `${overallRoas}×`, color: 'var(--yellow)', sub: 'Return on ad spend' },
          { label: 'FB Ad Spend', value: fmt(fb?.spend || 0), color: '#1877F2', sub: 'Facebook / Meta' },
          { label: 'Google Spend', value: fmt(ga?.spend || 0), color: '#4285F4', sub: 'Google Ads' },
          { label: 'Total Budget', value: totalBudget > 0 ? fmt(totalBudget) : 'Not set', color: totalBudget > 0 ? (totalSpend > totalBudget ? '#ff5050' : '#a8cf45') : 'var(--muted)', sub: 'This month' },
        ].map(t => (
          <div key={t.label} className="stat-tile">
            <span className="label">{t.label}</span>
            <span className="value" style={{ color: t.color }}>{t.value}</span>
            <span className="sub">{t.sub}</span>
          </div>
        ))}
      </div>

      {/* Channel cards with budget */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
        {CHANNELS.map(ch => {
          const spent = spendMap[ch.key] || 0;
          const budget = budgets[ch.key] || 0;
          const editing = editBudget === ch.key;
          return (
            <div key={ch.key} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: `${ch.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: ch.color }}>
                    {ch.icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{ch.name}</span>
                </div>
                {budget > 0 && <BudgetStatusBadge spent={spent} budget={budget} />}
              </div>

              <div style={{ fontSize: 22, fontWeight: 800, color: ch.color, marginBottom: 4 }}>
                {fmt(spent)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Spent this month</div>

              {budget > 0 && <BudgetBar spent={spent} budget={budget} />}

              {isAdmin && (
                <div>
                  {editing ? (
                    <BudgetInput channel={ch.key} period={period} currentBudget={budget}
                      onSaved={() => { loadBudgets(); setEditBudget(null); }} />
                  ) : (
                    <button onClick={() => setEditBudget(ch.key)}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', background: 'none',
                        border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 5, padding: '4px 10px',
                        cursor: 'pointer', width: '100%' }}>
                      {budget > 0 ? `✏ Edit budget (${fmt(budget)})` : '+ Set monthly budget'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Channel performance table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-title" style={{ fontSize: 15 }}>Channel Performance</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{period}</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Spend</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Revenue</th>
              <th>ROAS</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map(ch => {
              const spent = spendMap[ch.key] || 0;
              const budget = budgets[ch.key] || 0;
              const revenue = ch.key === 'facebook' ? (fb?.revenue || 0) : ch.key === 'google' ? (ga?.revenue || 0) : ch.key === 'seo' ? 12800 : 0;
              const roas = spent > 0 && revenue > 0 ? (revenue / spent).toFixed(2) : '—';
              const over = budget > 0 && spent > budget;
              const met = budget > 0 && spent >= budget * 0.9;
              return (
                <tr key={ch.key}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: ch.color, fontWeight: 700, fontSize: 13 }}>{ch.icon}</span>
                      {ch.name}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--pink)' }}>{fmt(spent)}</td>
                  <td style={{ color: 'var(--muted)' }}>{budget > 0 ? fmt(budget) : <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td>
                    {budget > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#ff5050' : met ? '#a8cf45' : '#ffe600' }}>
                        {over ? '🔴 Over' : met ? '✅ Met' : '🟡 Pacing'}
                      </span>
                    ) : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No budget set</span>}
                  </td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{revenue > 0 ? fmt(revenue) : '—'}</td>
                  <td style={{ fontWeight: 800, color: parseFloat(roas) >= 4 ? '#a8cf45' : parseFloat(roas) >= 2 ? '#ffe600' : 'var(--muted)' }}>
                    {roas !== '—' ? `${roas}×` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
        {isAdmin ? 'Click "+ Set monthly budget" on any channel card to set budgets · Budgets are per-month and persist across sessions' : 'Contact your admin to set monthly budgets'}
      </div>
    </div>
  );
}
