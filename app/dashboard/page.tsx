'use client';
import { useEffect, useState } from 'react';

const PRESET_COLORS = [
  '#ff1e8e','#1877F2','#4285F4','#a8cf45','#ffe600','#04aae8',
  '#69C9D0','#ff6900','#e4405f','#00b4d8','#a78bfa','#f97316',
  '#22d3ee','#34d399','#fb7185','#888888',
];
const PRESET_ICONS = ['f','G','◎','✉','♪','$','⊕','◫','★','▲','●','⟳','📱','🎯','🔍','💰'];

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  if (!budget) return null;
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const color = over ? '#ff5050' : pct >= 90 ? '#a8cf45' : pct >= 70 ? '#ffe600' : '#04aae8';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmt(spent)} of {fmt(budget)}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>
          {over ? `over by ${fmt(spent - budget)}` : `${Math.round(pct)}% used`}
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
  const label = over ? 'Over' : nearlyMet ? 'Met' : 'Pacing';
  const dot = over ? '🔴' : nearlyMet ? '✅' : '🟡';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
      background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {dot} {label}
    </span>
  );
}

function AddChannelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState('#888888');
  const [icon, setIcon] = useState('●');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleNameChange(v: string) {
    setName(v);
    setKey(v.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  }

  async function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    const r = await fetch('/api/budgets/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name, color, icon }),
    });
    setSaving(false);
    if (r.ok) { onSaved(); onClose(); } else { setError('Failed to save'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Add Budget Channel</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Channel Name *</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. TikTok Ads"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Key (auto-generated)</label>
            <input value={key} onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Colour</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 24, height: 24, borderRadius: 6, background: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0,
                }} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{
                  width: 32, height: 32, borderRadius: 6, background: icon === ic ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: icon === ic ? '1px solid var(--pink)' : '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: 14,
                }}>{ic}</button>
              ))}
            </div>
          </div>
          {error && <div style={{ fontSize: 12, color: '#ff5050' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 18px', background: 'var(--pink)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 12 }}>
              {saving ? 'Saving...' : 'Add Channel'}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    await fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, budget: n, period }) });
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Monthly:</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>$</span>
        <input type="number" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="0"
          style={{ width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 6px', fontSize: 11, color: 'var(--text)', outline: 'none' }} />
        <button onClick={save} disabled={saving} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--muted)' }}>
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [fb, setFb] = useState<any>(null);
  const [ga, setGa] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editBudget, setEditBudget] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const period = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setIsAdmin(d.role === 'admin'); });
    loadChannels();
    loadBudgets();
    fetch('/api/data/facebook').then(r => r.json()).then(d => setFb(d.data || d)).catch(() => {});
    fetch('/api/data/google').then(r => r.json()).then(d => setGa(d.data || d)).catch(() => {});
  }, []);

  async function loadChannels() {
    const r = await fetch('/api/budgets/channels');
    if (r.ok) { const d = await r.json(); setChannels(d.channels || []); }
  }

  async function loadBudgets() {
    const r = await fetch(`/api/budgets?period=${period}`);
    if (r.ok) { const d = await r.json(); setBudgets(d.budgets || {}); }
  }

  async function removeChannel(key: string, name: string) {
    if (!confirm(`Remove "${name}" from the budget dashboard? Budget history is preserved.`)) return;
    setRemovingKey(key);
    await fetch('/api/budgets/channels', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) });
    setRemovingKey(null);
    loadChannels();
  }

  const spendMap: Record<string, number> = {
    meta: fb?.spend || 0, facebook: fb?.spend || 0, google: ga?.spend || 0,
  };

  const totalSpend = channels.reduce((s, ch) => s + (spendMap[ch.key] || 0), 0);
  const totalBudget = channels.reduce((s, ch) => s + (budgets[ch.key] || 0), 0);
  const totalRevenue = (fb?.revenue || 0) + (ga?.revenue || 0);
  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : null;
  const overBudgetChannels = channels.filter(ch => (budgets[ch.key] || 0) > 0 && (spendMap[ch.key] || 0) > (budgets[ch.key] || 0));
  const budgetMetChannels = channels.filter(ch => (budgets[ch.key] || 0) > 0 && (spendMap[ch.key] || 0) >= (budgets[ch.key] || 0) * 0.9 && (spendMap[ch.key] || 0) <= (budgets[ch.key] || 0));

  return (
    <div>
      {showAddChannel && <AddChannelModal onClose={() => setShowAddChannel(false)} onSaved={loadChannels} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Marketing Overview</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{period}</span>
          {isAdmin && (
            <button onClick={() => setShowAddChannel(true)} style={{ fontSize: 11, padding: '6px 14px', background: 'rgba(255,30,142,0.12)', border: '1px solid rgba(255,30,142,0.3)', borderRadius: 6, cursor: 'pointer', color: 'var(--pink)', fontWeight: 700 }}>
              + Add Channel
            </button>
          )}
        </div>
      </div>

      {totalBudget > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, background: totalSpend > totalBudget ? 'rgba(255,80,80,0.06)' : 'rgba(168,207,69,0.06)', border: `1px solid ${totalSpend > totalBudget ? 'rgba(255,80,80,0.2)' : 'rgba(168,207,69,0.2)'}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: totalSpend > totalBudget ? '#ff5050' : '#a8cf45' }}>
              {totalSpend > totalBudget ? 'Total Budget Exceeded' : 'Total Budget On Track'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmt(totalSpend)} spent of {fmt(totalBudget)} total budget</div>
            <BudgetBar spent={totalSpend} budget={totalBudget} />
          </div>
          {overBudgetChannels.length > 0 && (
            <div style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '12px 16px', minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ff5050', marginBottom: 6 }}>Over Budget</div>
              {overBudgetChannels.map(c => <div key={c.key} style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}: {fmt(spendMap[c.key] || 0)} / {fmt(budgets[c.key])}</div>)}
            </div>
          )}
          {budgetMetChannels.length > 0 && (
            <div style={{ background: 'rgba(168,207,69,0.06)', border: '1px solid rgba(168,207,69,0.2)', borderRadius: 10, padding: '12px 16px', minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a8cf45', marginBottom: 6 }}>Budget Met</div>
              {budgetMetChannels.map(c => <div key={c.key} style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}: {fmt(spendMap[c.key] || 0)} / {fmt(budgets[c.key])}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Ad Spend', value: fmt(totalSpend), color: 'var(--pink)', sub: period },
          { label: 'Total Revenue', value: fmt(totalRevenue), color: 'var(--green)', sub: 'Attributed' },
          { label: 'Overall ROAS', value: overallRoas ? `${overallRoas}x` : '--', color: 'var(--yellow)', sub: 'Return on ad spend' },
          { label: 'Meta/FB Spend', value: fmt(fb?.spend || 0), color: '#1877F2', sub: 'Meta Ads' },
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

      {channels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>No budget channels yet</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Add channels for each platform you want to track budgets against.</div>
          {isAdmin && <button onClick={() => setShowAddChannel(true)} style={{ padding: '8px 20px', background: 'var(--pink)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13 }}>+ Add First Channel</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 }}>
          {channels.map(ch => {
            const spent = spendMap[ch.key] || 0;
            const budget = budgets[ch.key] || 0;
            const editing = editBudget === ch.key;
            return (
              <div key={ch.key} className="card" style={{ position: 'relative' }}>
                {isAdmin && (
                  <button onClick={() => removeChannel(ch.key, ch.name)} disabled={removingKey === ch.key} title="Remove channel"
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, opacity: 0.4, lineHeight: 1, padding: 2, transition: 'opacity 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>x</button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${ch.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: ch.color }}>{ch.icon}</div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{ch.name}</span>
                  </div>
                  {budget > 0 && <BudgetStatusBadge spent={spent} budget={budget} />}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: ch.color, marginBottom: 4 }}>{fmt(spent)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Spent this month</div>
                {budget > 0 && <BudgetBar spent={spent} budget={budget} />}
                {isAdmin && (
                  editing ? (
                    <BudgetInput channel={ch.key} period={period} currentBudget={budget} onSaved={() => { loadBudgets(); setEditBudget(null); }} />
                  ) : (
                    <button onClick={() => setEditBudget(ch.key)} style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', width: '100%' }}>
                      {budget > 0 ? `Edit budget (${fmt(budget)})` : '+ Set monthly budget'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-title" style={{ fontSize: 15 }}>Channel Performance</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{period}</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Channel</th><th>Spend</th><th>Budget</th><th>Status</th><th>Revenue</th><th>ROAS</th></tr></thead>
          <tbody>
            {channels.map(ch => {
              const spent = spendMap[ch.key] || 0;
              const budget = budgets[ch.key] || 0;
              const revenue = (ch.key === 'meta' || ch.key === 'facebook') ? (fb?.revenue || 0) : ch.key === 'google' ? (ga?.revenue || 0) : ch.key === 'seo' ? 12800 : 0;
              const roas = spent > 0 && revenue > 0 ? (revenue / spent).toFixed(2) : null;
              const over = budget > 0 && spent > budget;
              const met = budget > 0 && spent >= budget * 0.9;
              return (
                <tr key={ch.key}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: ch.color, fontWeight: 700, fontSize: 13 }}>{ch.icon}</span>{ch.name}</div></td>
                  <td style={{ fontWeight: 700, color: 'var(--pink)' }}>{fmt(spent)}</td>
                  <td style={{ color: 'var(--muted)' }}>{budget > 0 ? fmt(budget) : <span style={{ opacity: 0.4 }}>--</span>}</td>
                  <td>{budget > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: over ? '#ff5050' : met ? '#a8cf45' : '#ffe600' }}>{over ? 'Over' : met ? 'Met' : 'Pacing'}</span> : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No budget</span>}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{revenue > 0 ? fmt(revenue) : '--'}</td>
                  <td style={{ fontWeight: 800, color: roas && parseFloat(roas) >= 4 ? '#a8cf45' : roas && parseFloat(roas) >= 2 ? '#ffe600' : 'var(--muted)' }}>{roas ? `${roas}x` : '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
        {isAdmin ? 'Hover a channel card and click x to remove it · Click a budget to edit · Budgets persist month-to-month' : 'Contact your admin to manage budgets'}
      </div>
    </div>
  );
}
