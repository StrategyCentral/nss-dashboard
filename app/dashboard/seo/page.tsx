'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '12m', label: '12 Months' },
];

const NODE_COLORS: Record<string, string> = {
  home: '#ff1e8e', silo: '#a8cf45', category: '#04aae8',
  post: '#ffe600', 'sa-post': '#f97316', page: '#a78bfa',
  'location-page': '#22d3ee', product: '#ff8c42', 'product-cat': '#c084fc',
};

const NODE_TYPE_LABELS: Record<string, string> = {
  home: 'Home', silo: 'Silo', category: 'Category',
  post: 'Blog Post', 'sa-post': 'SA Post', page: 'Page',
  'location-page': 'Location Page', product: 'Product', 'product-cat': 'Product Category',
};

const ALL_TYPES = ['silo', 'category', 'post', 'sa-post', 'page', 'location-page', 'product-cat', 'product'];

const TREND_DATA: Record<string, any[]> = {
  '7d': [
    { label: 'Mon', current: 5.2, previous: 6.8 }, { label: 'Tue', current: 4.9, previous: 6.5 },
    { label: 'Wed', current: 5.1, previous: 6.2 }, { label: 'Thu', current: 4.7, previous: 6.0 },
    { label: 'Fri', current: 4.8, previous: 5.8 }, { label: 'Sat', current: 4.5, previous: 5.6 },
    { label: 'Sun', current: 4.9, previous: 5.9 },
  ],
  '30d': [
    { label: 'Oct 1', current: 7.2, previous: 9.1 }, { label: 'Oct 8', current: 6.8, previous: 8.7 },
    { label: 'Oct 15', current: 6.4, previous: 8.3 }, { label: 'Oct 22', current: 6.0, previous: 7.9 },
    { label: 'Oct 29', current: 5.7, previous: 7.5 }, { label: 'Nov 5', current: 5.4, previous: 7.2 },
    { label: 'Nov 12', current: 5.1, previous: 6.8 }, { label: 'Nov 19', current: 4.9, previous: 6.4 },
    { label: 'Nov 26', current: 4.9, previous: 6.1 },
  ],
  '90d': [
    { label: 'Sep', current: 9.2, previous: 11.4 }, { label: 'Oct', current: 8.1, previous: 10.2 },
    { label: 'Nov', current: 7.4, previous: 9.6 }, { label: 'Dec', current: 6.8, previous: 8.9 },
    { label: 'Jan', current: 6.1, previous: 8.1 }, { label: 'Feb', current: 5.6, previous: 7.4 },
    { label: 'Mar', current: 4.9, previous: 6.8 },
  ],
  '12m': [
    { label: 'Apr', current: 13.1, previous: 15.2 }, { label: 'May', current: 12.4, previous: 14.6 },
    { label: 'Jun', current: 11.8, previous: 13.9 }, { label: 'Jul', current: 11.2, previous: 13.1 },
    { label: 'Aug', current: 10.4, previous: 12.3 }, { label: 'Sep', current: 9.2, previous: 11.4 },
    { label: 'Oct', current: 8.1, previous: 10.2 }, { label: 'Nov', current: 7.4, previous: 9.6 },
    { label: 'Dec', current: 6.8, previous: 8.9 }, { label: 'Jan', current: 6.1, previous: 8.1 },
    { label: 'Feb', current: 5.6, previous: 7.4 }, { label: 'Mar', current: 4.9, previous: 6.8 },
  ],
};

const KPI = {
  current: { avgPos: 4.9, clicks: 3842, impressions: 48200, ctr: 7.97 },
  previous: { avgPos: 6.8, clicks: 2910, impressions: 38400, ctr: 6.82 },
};

// ── Small Components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, prev, tooltip }: any) {
  const raw = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  const pct = prev ? ((raw - prev) / Math.abs(prev)) * 100 : 0;
  const isPositive = label === 'Avg Position' ? pct < 0 : pct > 0;
  return (
    <div className="stat-tile" style={{ position: 'relative', overflow: 'hidden', cursor: 'help' }} title={tooltip}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${color}08, transparent 70%)`, pointerEvents: 'none' }} />
      <span className="label">{label}</span>
      <span className="value" style={{ color }}>{value}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span className="sub" style={{ margin: 0 }}>{sub}</span>
        {prev != null && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: isPositive ? 'rgba(168,207,69,0.15)' : 'rgba(255,80,80,0.15)',
            color: isPositive ? 'var(--green)' : '#ff5050' }}>
            {isPositive ? '↑' : '↓'}{Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function PosBadge({ pos }: { pos: number | null }) {
  if (pos == null) return <span style={{ fontSize: 10, color: 'var(--muted)' }}>—</span>;
  const color = pos <= 3 ? '#a8cf45' : pos <= 10 ? '#ffe600' : pos <= 20 ? '#ff8c42' : '#888';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 800,
      background: `${color}22`, color, border: `1.5px solid ${color}66`,
      boxShadow: pos <= 3 ? `0 0 8px ${color}44` : 'none' }}>{pos}</span>
  );
}

// ── Node Detail Panel ─────────────────────────────────────────────────────────

function NodeDetailPanel({ node, keywords, nodes, onClose, onRefresh }: any) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({ label: '', url: '', type: 'page', status: 'planned' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reassignParent, setReassignParent] = useState('');
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const SHOW_REVENUE_TYPES = ['product', 'product-cat', 'category', 'silo'];

  useEffect(() => {
    if (!node) return;
    setEditing(false);
    setShowDeleteConfirm(false);
    setRevenueData(null);
    if (SHOW_REVENUE_TYPES.includes(node.type) && node.url) {
      setRevenueLoading(true);
      fetch(`/api/woo/revenue?url=${encodeURIComponent(node.url)}&traffic=${node.traffic || 0}`)
        .then(r => r.json())
        .then(d => { setRevenueData(d.data); setRevenueLoading(false); })
        .catch(() => setRevenueLoading(false));
    }
  }, [node?.id]);

  if (!node) return null;

  const color = NODE_COLORS[node.type] || '#888';
  const estRevenue = Math.round((node.traffic || 0) * 4.2);
  const nodeKeywords = (keywords || []).filter((k: any) => k.url === node.url);
  const childNodes = (nodes || []).filter((n: any) => n.parent === (node.id || node.nodeId));
  const showRevenue = SHOW_REVENUE_TYPES.includes(node.type);
  const maxChannel = revenueData ? Math.max(...revenueData.channels.map((c: any) => c.value), 1) : 1;

  async function saveEdit() {
    await fetch('/api/seo/structure', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_node', id: node.id || node.nodeId, ...editForm }),
    });
    setEditing(false);
    onRefresh();
  }

  async function deleteNode() {
    if (childNodes.length > 0 && reassignParent) {
      for (const child of childNodes) {
        await fetch('/api/seo/structure', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_node', id: child.id || child.nodeId, parent: reassignParent }),
        });
      }
    }
    await fetch('/api/seo/structure', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_node', id: node.id || node.nodeId }),
    });
    onClose();
    onRefresh();
  }

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, zIndex: 1000,
      background: 'rgba(10,10,14,0.97)', backdropFilter: 'blur(20px)',
      borderLeft: `1px solid ${color}44`, padding: 24, overflowY: 'auto',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {NODE_TYPE_LABELS[node.type] || node.type}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Barlow Condensed',sans-serif" }}>{node.label}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { if (!editing) setEditForm({ label: node.label, url: node.url || '', type: node.type, status: node.status }); setEditing(!editing); setShowDeleteConfirm(false); }}
            style={{ background: editing ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${editing ? '#a78bfa44' : 'var(--border)'}`,
              color: editing ? '#a78bfa' : 'var(--muted)', padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
            {editing ? '✕ Cancel' : '✏ Edit'}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(!showDeleteConfirm); setEditing(false); }}
            style={{ background: showDeleteConfirm ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showDeleteConfirm ? 'rgba(255,80,80,0.4)' : 'var(--border)'}`,
              color: showDeleteConfirm ? '#ff5050' : 'var(--muted)', padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
            🗑
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--muted)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label className="form-label">Page Name</label>
              <input className="form-input" value={editForm.label} onChange={e => setEditForm((f: any) => ({ ...f, label: e.target.value }))} /></div>
            <div><label className="form-label">URL</label>
              <input className="form-input" value={editForm.url} onChange={e => setEditForm((f: any) => ({ ...f, url: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="form-label">Type</label>
                <select className="form-input" value={editForm.type} onChange={e => setEditForm((f: any) => ({ ...f, type: e.target.value }))}>
                  {ALL_TYPES.map(t => <option key={t} value={t}>{NODE_TYPE_LABELS[t] || t}</option>)}
                </select></div>
              <div><label className="form-label">Status</label>
                <select className="form-input" value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                  {['live', 'planned', 'broken'].map(s => <option key={s} value={s}>{s}</option>)}
                </select></div>
            </div>
          </div>
          <button onClick={saveEdit} className="btn btn-pink" style={{ fontSize: 12, marginTop: 12, width: '100%' }}>Save Changes</button>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#ff5050', fontWeight: 700, marginBottom: 8 }}>⚠ Delete &quot;{node.label}&quot;?</div>
          {childNodes.length > 0 ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                This page has <strong style={{ color: 'var(--text)' }}>{childNodes.length} child page{childNodes.length > 1 ? 's' : ''}</strong>. Reassign them first:
              </div>
              <label className="form-label">Reassign children to</label>
              <select className="form-input" value={reassignParent} onChange={e => setReassignParent(e.target.value)} style={{ marginBottom: 12 }}>
                <option value="">— Select new parent —</option>
                {nodes.filter((n: any) => (n.id || n.nodeId) !== (node.id || node.nodeId)).map((n: any) => (
                  <option key={n.id || n.nodeId} value={n.id || n.nodeId}>{n.label}</option>
                ))}
              </select>
              <button onClick={deleteNode} disabled={!reassignParent} className="btn btn-ghost"
                style={{ fontSize: 12, width: '100%', color: '#ff5050', borderColor: 'rgba(255,80,80,0.4)', opacity: !reassignParent ? 0.4 : 1 }}>
                Reassign &amp; Delete
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Permanently removes this page from the structure map.</div>
              <button onClick={deleteNode} className="btn btn-ghost"
                style={{ fontSize: 12, width: '100%', color: '#ff5050', borderColor: 'rgba(255,80,80,0.4)' }}>
                Confirm Delete
              </button>
            </>
          )}
          <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost" style={{ fontSize: 12, width: '100%', marginTop: 8 }}>Cancel</button>
        </div>
      )}

      {node.url && (
        <div style={{ fontSize: 12, color: 'var(--blue)', background: 'rgba(4,170,232,0.08)', padding: '6px 10px', borderRadius: 6, marginBottom: 16 }}>
          {node.url}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Position', value: node.position || '—', color },
          { label: 'Monthly Visits', value: (node.traffic || 0).toLocaleString(), color: '#04aae8', hint: 'Estimated organic visits/month from Google' },
          { label: 'Clicks (GSC)', value: (node.clicks || 0).toLocaleString(), color: '#a8cf45' },
          { label: 'Est. Revenue', value: estRevenue > 0 ? '$' + estRevenue.toLocaleString() : '—', color: '#ffe600', hint: 'Estimated based on traffic × avg conversion rate' },
          { label: 'Status', value: node.status, color: node.status === 'live' ? '#a8cf45' : node.status === 'broken' ? '#ff5050' : '#888' },
          { label: 'Type', value: NODE_TYPE_LABELS[node.type] || node.type, color: NODE_COLORS[node.type] || '#888' },
        ].map(m => (
          <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }} title={(m as any).hint || ''}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Breakdown — product, product-cat, category, silo */}
      {showRevenue && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Revenue {['product-cat', 'silo'].includes(node.type) ? '— Category Total' : '— This Page'}
          </div>

          {revenueLoading ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: 14, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              Loading revenue data…
            </div>
          ) : revenueData ? (
            <>
              {/* Month totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(168,207,69,0.08)', border: '1px solid rgba(168,207,69,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>This Month</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#a8cf45', fontFamily: "'Barlow Condensed',sans-serif" }}>
                    ${revenueData.thisMonth.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {revenueData.orders} orders · ${revenueData.avgOrderValue} avg
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Last Month</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', fontFamily: "'Barlow Condensed',sans-serif" }}>
                    ${revenueData.lastMonth.toLocaleString()}
                  </div>
                  {(() => {
                    const diff = revenueData.thisMonth - revenueData.lastMonth;
                    const pct = ((diff / revenueData.lastMonth) * 100).toFixed(1);
                    const up = diff >= 0;
                    return <div style={{ fontSize: 11, color: up ? '#a8cf45' : '#ff5050', marginTop: 2 }}>{up ? '↑' : '↓'}{Math.abs(Number(pct))}% vs last month</div>;
                  })()}
                </div>
              </div>

              {/* Channel breakdown */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Revenue by Channel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...revenueData.channels].sort((a: any, b: any) => b.value - a.value).map((ch: any) => (
                  <div key={ch.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 13 }}>{ch.icon}</span>
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{ch.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ch.color }}>${ch.value.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(ch.value / maxChannel) * 100}%`, background: ch.color,
                        borderRadius: 2, boxShadow: `0 0 6px ${ch.color}55`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>

              {revenueData.topProduct && revenueData.topProduct !== 'Various' && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                  Top seller: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{revenueData.topProduct}</span>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
                Attribution via UTM / WooCommerce order source. Connect WooCommerce API for live data.
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Keywords */}
      {nodeKeywords.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Ranking Keywords
          </div>
          {nodeKeywords.map((k: any) => (
            <div key={k.id || k.keyword} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12 }}>{k.keyword}</span>
              <PosBadge pos={k.position} />
            </div>
          ))}
        </div>
      )}

      {/* Ranking Opportunity */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Ranking Opportunity
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 14 }}>
          {node.position ? (
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.9 }}>
              <span style={{ color: '#ff8c42', fontWeight: 700 }}>{Math.max(1, 18 - node.position)} backlinks</span> from DA 30+ sites<br />
              <span style={{ color: '#ffe600', fontWeight: 700 }}>~{Math.ceil(node.position * 1.4)} months</span> at current pace<br />
              <span style={{ color: '#c084fc', fontWeight: 700 }}>+{Math.ceil(node.position * 120)} words</span> supporting content needed
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Publish this page to unlock ranking data</div>
          )}
        </div>
      </div>

      {node.status === 'broken' && (
        <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#ff5050', fontWeight: 700, marginBottom: 4 }}>⚠ Broken Internal Link</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Fix this link to restore SEO equity flow between pages.</div>
        </div>
      )}
    </div>
  );
}

// ── Site Structure Visualiser ─────────────────────────────────────────────────

function SiteStructureVisualiser({ nodes, links, keywords, onRefresh }: any) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [addForm, setAddForm] = useState({ label: '', url: '', type: 'category', silo: '', parent: '' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['home', 'silo-waxing', 'silo-nails', 'silo-tanning']));

  async function toggleWorking(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch('/api/seo/structure', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_working', id }),
    });
    onRefresh();
  }

  async function addNode() {
    if (!addForm.label) return;
    await fetch('/api/seo/structure', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_node', ...addForm }),
    });
    setAddForm({ label: '', url: '', type: 'category', silo: '', parent: '' });
    setShowAddNode(false);
    onRefresh();
  }

  const typeOrder = ['home', 'silo', 'category', 'post', 'sa-post', 'page', 'location-page', 'product-cat', 'product'];

  function getChildren(parentId: string) {
    return nodes.filter((n: any) => n.parent === parentId);
  }

  function renderNode(node: any, depth: number = 0): any {
    const color = NODE_COLORS[node.type] || '#888';
    const isLive = node.status === 'live';
    const isBroken = node.status === 'broken';
    const isWorking = node.working_on === 1 || node.working_on === true;
    const children = getChildren(node.id || node.nodeId);
    const isExpanded = expanded.has(node.id || node.nodeId);

    return (
      <div key={node.id || node.nodeId} style={{ marginLeft: depth * 20, position: 'relative' }}>
        {depth > 0 && (
          <div style={{ position: 'absolute', left: -16, top: 18, width: 12, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div
            onClick={() => setSelectedNode(node)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${isLive ? color + '55' : isBroken ? '#ff505055' : '#ffffff15'}`,
              background: isLive ? `${color}08` : 'rgba(255,255,255,0.02)',
              boxShadow: isLive ? `0 0 10px ${color}30` : isBroken ? '0 0 10px rgba(255,80,80,0.3)' : 'none',
              opacity: node.status === 'planned' ? 0.5 : 1, transition: 'all 0.15s' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0,
              boxShadow: isLive ? `0 0 5px ${color}` : 'none' }} />
            {isWorking && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a8cf45',
                animation: 'pulse-glow 1.5s ease-in-out infinite', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isLive ? 'var(--text)' : 'var(--muted)' }}>{node.label}</span>
                {isWorking && <span style={{ fontSize: 10, color: '#a8cf45', background: 'rgba(168,207,69,0.12)', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>In Progress</span>}
                {isBroken && <span style={{ fontSize: 10, color: '#ff5050', background: 'rgba(255,80,80,0.1)', padding: '1px 5px', borderRadius: 3 }}>Broken</span>}
              </div>
              {node.url && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{node.url}</div>}
            </div>
            <PosBadge pos={node.position} />
            {(node.traffic || 0) > 0 && <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{(node.traffic || 0).toLocaleString()} visits/mo</span>}
          </div>
          <button onClick={(e) => toggleWorking(node.id || node.nodeId, e)} title="Toggle In Progress"
            style={{ background: isWorking ? 'rgba(168,207,69,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isWorking ? 'rgba(168,207,69,0.4)' : 'var(--border)'}`,
              color: isWorking ? '#a8cf45' : 'var(--muted)', width: 26, height: 26, borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>⚡</button>
          {children.length > 0 && (
            <button
              onClick={() => setExpanded(s => { const n = new Set(s); const id = node.id || node.nodeId; n.has(id) ? n.delete(id) : n.add(id); return n; })}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, width: 20, padding: 0 }}>
              {isExpanded ? '▾' : '▸'}
            </button>
          )}
        </div>
        {children.length > 0 && isExpanded && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 3, top: 0, bottom: 12, width: 1, background: 'rgba(255,255,255,0.07)' }} />
            {children.sort((a: any, b: any) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type))
              .map((c: any) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const rootNodes = nodes.filter((n: any) => !n.parent || n.type === 'home');

  return (
    <div>
      <style>{`@keyframes pulse-glow { 0%,100%{opacity:1;box-shadow:0 0 4px #a8cf45,0 0 8px #a8cf45} 50%{opacity:0.4;box-shadow:0 0 12px #a8cf45,0 0 20px #a8cf45} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Site Structure Map</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Visual SEO silo architecture — click any page for full detail</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {[{ color: '#a8cf45', label: 'Live' }, { color: '#fff', label: 'Planned', dim: true }, { color: '#ff5050', label: 'Broken' }, { color: '#a8cf45', label: 'In Progress ⚡', pulse: true }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, opacity: (l as any).dim ? 0.3 : 1,
                animation: l.pulse ? 'pulse-glow 1.5s ease-in-out infinite' : 'none' }} />
              {l.label}
            </div>
          ))}
          <button onClick={() => setShowAddNode(!showAddNode)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>+ Add Page</button>
        </div>
      </div>

      {showAddNode && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label className="form-label">Page Name *</label>
              <input className="form-input" placeholder="e.g. Wax Strips" value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} /></div>
            <div><label className="form-label">URL</label>
              <input className="form-input" placeholder="/waxing/wax-strips/" value={addForm.url} onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))} /></div>
            <div><label className="form-label">Type</label>
              <select className="form-input" value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
                {ALL_TYPES.map(t => <option key={t} value={t}>{NODE_TYPE_LABELS[t] || t}</option>)}
              </select></div>
            <div><label className="form-label">Silo</label>
              <input className="form-input" placeholder="e.g. Waxing" value={addForm.silo} onChange={e => setAddForm(f => ({ ...f, silo: e.target.value }))} /></div>
            <div><label className="form-label">Parent Page</label>
              <select className="form-input" value={addForm.parent} onChange={e => setAddForm(f => ({ ...f, parent: e.target.value }))}>
                <option value="">— None (root) —</option>
                {nodes.map((n: any) => <option key={n.id || n.nodeId} value={n.id || n.nodeId}>{n.label}</option>)}
              </select></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addNode} className="btn btn-pink" style={{ fontSize: 12 }}>Add Page</button>
            <button onClick={() => setShowAddNode(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
        {rootNodes.map((n: any) => renderNode(n, 0))}
      </div>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          keywords={keywords}
          nodes={nodes}
          onClose={() => setSelectedNode(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ── Main SEO Page ─────────────────────────────────────────────────────────────

export default function SeoPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [period, setPeriod] = useState('30d');
  const [comparePeriod, setComparePeriod] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showAddKw, setShowAddKw] = useState(false);
  const [addKwForm, setAddKwForm] = useState({ keyword: '', url: '', category: 'Waxing', volume: '', position: '' });
  const [saving, setSaving] = useState(false);
  const [source] = useState('demo');

  useEffect(() => {
    loadKeywords();
    loadStructure();
  }, []);

  async function loadKeywords() {
    try {
      const r = await fetch('/api/seo/keywords');
      if (r.ok) { const d = await r.json(); setKeywords(d.keywords || []); }
    } catch {}
  }

  async function loadStructure() {
    try {
      const r = await fetch('/api/seo/structure');
      if (r.ok) { const d = await r.json(); setNodes(d.nodes || []); setLinks(d.links || []); }
    } catch {}
  }

  async function addKeyword() {
    setSaving(true);
    try {
      await fetch('/api/seo/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addKwForm, volume: parseInt(addKwForm.volume) || 0, position: parseInt(addKwForm.position) || null }),
      });
      setAddKwForm({ keyword: '', url: '', category: 'Waxing', volume: '', position: '' });
      setShowAddKw(false);
      loadKeywords();
    } finally { setSaving(false); }
  }

  const trendData = TREND_DATA[period];
  const { current, previous } = KPI;
  const categories = ['All', ...Array.from(new Set(keywords.map((k: any) => k.category || 'Uncategorized')))];
  const filtered = keywords
    .filter((k: any) => activeCategory === 'All' || k.category === activeCategory)
    .filter((k: any) => !searchTerm || k.keyword?.toLowerCase().includes(searchTerm.toLowerCase()));
  const displayed = showAll ? filtered : filtered.slice(0, 10);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'rgba(10,10,14,0.95)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.dataKey === 'current' ? 'Current' : 'Previous'}:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>#{p.value}</span>
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
          <h1 className="section-title" style={{ fontSize: 26 }}>SEO Rankings</h1>
          <p className="section-sub">Keyword positions, site structure &amp; organic growth</p>
        </div>
        <span className={`badge ${source === 'demo' ? 'badge-demo' : 'badge-live'}`}>{source === 'demo' ? 'Demo Data' : 'Live'}</span>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <KpiCard label="Avg Position" value={current.avgPos} sub="vs prev period" color="var(--green)" prev={previous.avgPos} tooltip="Average ranking across all keywords. Lower = better. Green means you improved." />
        <KpiCard label="Organic Clicks" value={current.clicks.toLocaleString()} sub="Last 30 days" color="var(--blue)" prev={previous.clicks} tooltip="Total clicks from Google. More clicks = more free traffic without paying for ads." />
        <KpiCard label="Impressions" value={(current.impressions / 1000).toFixed(1) + 'K'} sub="Search impressions" color="var(--yellow)" prev={previous.impressions} tooltip="How many times NSS appeared in Google results." />
        <KpiCard label="Avg CTR" value={current.ctr + '%'} sub="Click-through rate" color="var(--pink)" prev={previous.ctr} tooltip="% of people who clicked after seeing NSS in Google." />
      </div>

      {/* Trend Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-title" style={{ fontSize: 15 }}>Average Position Over Time</div>
            <div className="section-sub">Trending down = climbing up Google ↓ is good</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={period === p.key ? 'btn btn-pink' : 'btn btn-ghost'}
                  style={{ fontSize: 11, padding: '5px 10px' }}>{p.label}</button>
              ))}
            </div>
            <button onClick={() => setComparePeriod(!comparePeriod)}
              className={comparePeriod ? 'btn btn-pink' : 'btn btn-ghost'}
              style={{ fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: comparePeriod ? 'white' : 'var(--muted)', display: 'inline-block' }} />
              Compare Period
            </button>
          </div>
        </div>
        {comparePeriod && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 20, height: 2, background: '#a8cf45', borderRadius: 1 }} />
              <span style={{ color: 'var(--muted)' }}>Current Period</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 20, height: 2, borderBottom: '2px dashed #04aae8' }} />
              <span style={{ color: 'var(--muted)' }}>Previous Period</span>
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData}>
            <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis reversed tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="current" stroke="#a8cf45" strokeWidth={2.5}
              dot={{ fill: '#a8cf45', strokeWidth: 0, r: 3 }} activeDot={{ r: 6, filter: 'url(#glow)' }}
              animationDuration={800} filter="url(#glow)" />
            {comparePeriod && (
              <Line type="monotone" dataKey="previous" stroke="#04aae8" strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} opacity={0.6} animationDuration={800} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Keywords Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-title" style={{ fontSize: 15 }}>Keyword Rankings</div>
            <div className="section-sub">{filtered.length} keywords · {categories.length - 1} categories</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Search keywords…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} style={{ width: 180, padding: '6px 12px', fontSize: 12 }} />
            <button onClick={() => setShowAddKw(!showAddKw)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              + Add Keyword
            </button>
          </div>
        </div>

        {showAddKw && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div><label className="form-label">Keyword *</label>
                <input className="form-input" placeholder="e.g. wax strips australia" value={addKwForm.keyword}
                  onChange={e => setAddKwForm(f => ({ ...f, keyword: e.target.value }))} /></div>
              <div><label className="form-label">Page URL</label>
                <input className="form-input" placeholder="/waxing/wax-strips/" value={addKwForm.url}
                  onChange={e => setAddKwForm(f => ({ ...f, url: e.target.value }))} /></div>
              <div><label className="form-label">Category</label>
                <select className="form-input" value={addKwForm.category} onChange={e => setAddKwForm(f => ({ ...f, category: e.target.value }))}>
                  {['Waxing', 'Nails', 'Tanning', 'Hair', 'Skincare', 'Equipment', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className="form-label">Volume/mo</label>
                <input className="form-input" type="number" placeholder="1200" value={addKwForm.volume}
                  onChange={e => setAddKwForm(f => ({ ...f, volume: e.target.value }))} /></div>
              <div><label className="form-label">Position</label>
                <input className="form-input" type="number" placeholder="8" value={addKwForm.position}
                  onChange={e => setAddKwForm(f => ({ ...f, position: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addKeyword} className="btn btn-pink" style={{ fontSize: 12 }} disabled={saving}>
                {saving ? 'Saving…' : 'Add Keyword'}
              </button>
              <button onClick={() => setShowAddKw(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
              background: activeCategory === cat ? 'var(--pink)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeCategory === cat ? 'var(--pink)' : 'var(--border)'}`,
              color: activeCategory === cat ? 'white' : 'var(--muted)',
              fontWeight: activeCategory === cat ? 600 : 400,
            }}>{cat}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>Keyword</th><th>Position</th><th>Change</th>
              <th>Search Vol</th><th>Page URL</th><th>Category</th>
            </tr></thead>
            <tbody>
              {displayed.map((r: any) => {
                const diff = (r.prev_position || r.prev || r.position) - r.position;
                const isTop = r.position <= 3;
                const isDown = diff < 0;
                return (
                  <tr key={r.id || r.keyword}
                    style={{ background: isTop ? 'rgba(168,207,69,0.04)' : isDown ? 'rgba(255,80,80,0.03)' : 'transparent' }}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {isTop && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a8cf45', boxShadow: '0 0 6px #a8cf45', flexShrink: 0 }} />}
                        {!isTop && isDown && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5050', flexShrink: 0 }} />}
                        {r.keyword}
                      </div>
                    </td>
                    <td><PosBadge pos={r.position} /></td>
                    <td>{(() => {
                      const d = (r.prev_position || r.prev || r.position) - r.position;
                      if (d > 0) return <span style={{ color: 'var(--green)', fontWeight: 700 }}>↑{d}</span>;
                      if (d < 0) return <span style={{ color: '#ff5050', fontWeight: 700 }}>↓{Math.abs(d)}</span>;
                      return <span style={{ color: 'var(--muted)' }}>—</span>;
                    })()}</td>
                    <td style={{ color: 'var(--muted)' }}>{(r.volume || 0).toLocaleString()}/mo</td>
                    <td>{r.url
                      ? <span style={{ fontSize: 11, color: 'var(--blue)', background: 'rgba(4,170,232,0.08)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{r.url}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      {r.category || 'Uncategorized'}
                    </span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 10 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => setShowAll(!showAll)} className="btn btn-ghost" style={{ fontSize: 12 }}>
              {showAll ? '↑ Show Less' : `↓ View All ${filtered.length} Keywords`}
            </button>
          </div>
        )}
      </div>

      {/* Site Structure */}
      <div className="card">
        <SiteStructureVisualiser nodes={nodes} links={links} keywords={keywords} onRefresh={loadStructure} />
      </div>
    </div>
  );
}
