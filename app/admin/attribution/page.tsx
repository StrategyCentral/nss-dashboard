'use client';
import { useEffect, useState } from 'react';

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }

const CHANNELS = [
  { label: 'Google Ads', source: 'google', medium: 'cpc', channel: 'Google Ads', color: '#4285F4' },
  { label: 'Meta — Facebook', source: 'facebook', medium: 'paid', channel: 'Meta — Facebook', color: '#1877F2' },
  { label: 'Meta — Instagram', source: 'instagram', medium: 'paid', channel: 'Meta — Instagram', color: '#E1306C' },
  { label: 'SEO / Organic', source: 'google', medium: 'organic', channel: 'SEO / Organic', color: '#a8cf45' },
  { label: 'Email (Klaviyo)', source: 'klaviyo', medium: 'email', channel: 'Email', color: '#ffe600' },
  { label: 'Direct', source: 'direct', medium: 'none', channel: 'Direct', color: '#888' },
];

export default function AttributionPage() {
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState('');
  const [selectedDirect, setSelectedDirect] = useState<number[]>([]);
  const [bulkChannel, setBulkChannel] = useState('');
  const [bulkCampaign, setBulkCampaign] = useState('');
  const [overrides, setOverrides] = useState<any[]>([]);
  const [showOverrides, setShowOverrides] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const r = await fetch('/api/attribution?action=scan');
      const d = await r.json();
      setScanData(d);
      // Pre-fill saved names
      const names: Record<string, string> = {};
      (d.googleCampaigns || []).forEach((c: any) => { if (c.savedName) names[c.id] = c.savedName; });
      setCampaignNames(names);
    } finally { setLoading(false); }
  }

  async function loadOverrides() {
    const r = await fetch('/api/attribution?action=overrides');
    const d = await r.json();
    setOverrides(d.overrides || []);
  }

  useEffect(() => { scan(); }, []);
  useEffect(() => { if (showOverrides) loadOverrides(); }, [showOverrides]);

  async function saveCampaignName(id: string) {
    const name = campaignNames[id];
    if (!name) return;
    await fetch('/api/attribution', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_campaign_name', campaign_id: id, platform: 'google', campaign_name: name }),
    });
    setSavedMsg(`Saved name for campaign ${id}`);
    setTimeout(() => setSavedMsg(''), 3000);
  }

  async function applyGoogleCampaign(id: string) {
    const name = campaignNames[id];
    if (!name) { alert('Enter a campaign name first'); return; }
    setApplying(id);
    const r = await fetch('/api/attribution', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'apply_google_campaign', campaign_id: id, campaign_name: name }),
    });
    const d = await r.json();
    setSavedMsg(`✓ Applied "${name}" to ${d.count} orders`);
    setTimeout(() => setSavedMsg(''), 4000);
    setApplying(null);
    scan();
  }

  async function fixIgOrders() {
    const ids = scanData?.igOrders?.map((o: any) => o.id) || [];
    if (!ids.length) return;
    setApplying('ig');
    await fetch('/api/attribution', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix_ig_orders', order_ids: ids }),
    });
    setSavedMsg(`✓ Fixed ${ids.length} Instagram orders`);
    setTimeout(() => setSavedMsg(''), 3000);
    setApplying(null);
    scan();
  }

  async function bulkAssignDirect() {
    if (!selectedDirect.length || !bulkChannel) return;
    const ch = CHANNELS.find(c => c.channel === bulkChannel);
    if (!ch) return;
    setApplying('bulk');
    await fetch('/api/attribution', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_date_range', order_ids: selectedDirect, utm_source: ch.source, utm_medium: ch.medium, utm_campaign: bulkCampaign || ch.label, channel: ch.channel, reason: 'Manual bulk assignment' }),
    });
    setSavedMsg(`✓ Assigned ${selectedDirect.length} orders to ${bulkChannel}`);
    setSelectedDirect([]);
    setBulkChannel('');
    setBulkCampaign('');
    setTimeout(() => setSavedMsg(''), 3000);
    setApplying(null);
    scan();
  }

  async function deleteOverride(orderId: number) {
    await fetch('/api/attribution', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_override', order_id: orderId }),
    });
    loadOverrides();
    scan();
  }

  const allDirectSelected = selectedDirect.length === (scanData?.directOrders?.length || 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Attribution Backfill</h1>
          <p className="section-sub">Recover & manually assign historical order attribution — {scanData?.scanned || '…'} orders scanned</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowOverrides(!showOverrides); }} className="btn btn-ghost" style={{ fontSize: 12 }}>
            {showOverrides ? 'Hide Overrides' : `View Overrides (${overrides.length})`}
          </button>
          <button onClick={scan} className="btn btn-ghost" style={{ fontSize: 12 }}>↺ Re-scan</button>
          <a href="/dashboard/revenue" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>← Revenue</a>
        </div>
      </div>

      {savedMsg && (
        <div style={{ background: 'rgba(168,207,69,0.12)', border: '1px solid rgba(168,207,69,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#a8cf45' }}>
          {savedMsg}
        </div>
      )}

      {loading && <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Scanning {'>'}500 orders from WooCommerce…</div>}

      {!loading && scanData && (
        <>
          {/* Summary */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Google Campaign IDs', value: scanData.googleCampaigns?.length || 0, sub: 'Need naming', color: '#4285F4' },
              { label: 'Instagram Orders', value: scanData.igOrders?.length || 0, sub: 'Source fix needed', color: '#E1306C' },
              { label: 'Direct / Unknown', value: scanData.directCount || 0, sub: 'Manual assignment', color: '#888' },
              { label: 'Partial UTM', value: scanData.partialCount || 0, sub: 'Content = /', color: '#ffe600' },
            ].map(t => (
              <div key={t.label} className="stat-tile">
                <span className="label">{t.label}</span>
                <span className="value" style={{ color: t.color }}>{t.value}</span>
                <span className="sub">{t.sub}</span>
              </div>
            ))}
          </div>

          {/* SECTION 1: Instagram fix — quick win */}
          {scanData.igOrders?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(225,48,108,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E1306C', marginBottom: 4 }}>
                    📸 {scanData.igOrders.length} Instagram orders — source set to &quot;ig&quot; instead of &quot;instagram&quot;
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    These are already attributed with ad names and campaign names — just the source label is wrong. One click fixes them all.
                  </div>
                </div>
                <button onClick={fixIgOrders} disabled={applying === 'ig'} className="btn btn-pink"
                  style={{ fontSize: 12, minWidth: 140, background: '#E1306C', borderColor: '#E1306C' }}>
                  {applying === 'ig' ? 'Fixing…' : `Fix ${scanData.igOrders.length} orders →`}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Date</th><th>Revenue</th><th>Campaign</th><th>Ad</th></tr></thead>
                  <tbody>
                    {scanData.igOrders.slice(0, 5).map((o: any) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.date}</td>
                        <td>{fmt(o.total)}</td>
                        <td style={{ fontSize: 12 }}>{decodeURIComponent(o.campaign?.replace(/\+/g, ' ') || '—')}</td>
                        <td style={{ fontSize: 12, color: '#E1306C' }}>{decodeURIComponent(o.content?.replace(/\+/g, ' ') || '—')}</td>
                      </tr>
                    ))}
                    {scanData.igOrders.length > 5 && <tr><td colSpan={5} style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>…and {scanData.igOrders.length - 5} more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 2: Google campaign ID naming */}
          {scanData.googleCampaigns?.length > 0 && (
            <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(66,133,244,0.25)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4285F4', marginBottom: 4 }}>📢 Google Campaign IDs — name them to unlock full campaign attribution</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                Google auto-tagging passes campaign IDs in the URL but not names. Name each one below and click Apply — all matching orders get updated automatically.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {scanData.googleCampaigns.map((c: any) => (
                  <div key={c.id} style={{ background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Campaign ID: <span style={{ fontFamily: 'monospace', color: '#4285F4' }}>{c.id}</span></div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{c.orders} orders · {fmt(c.revenue)} · {c.dateRange}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 4 }}>
                          {c.sampleUrl?.slice(0, 80)}…
                        </div>
                        {c.savedName && <div style={{ fontSize: 11, color: '#a8cf45' }}>✓ Currently named: &quot;{c.savedName}&quot;</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input className="form-input" placeholder="e.g. NSS Shopping — Beauty"
                          value={campaignNames[c.id] || ''}
                          onChange={e => setCampaignNames(p => ({ ...p, [c.id]: e.target.value }))}
                          style={{ width: 240, fontSize: 12 }} />
                        <button onClick={() => saveCampaignName(c.id)} className="btn btn-ghost" style={{ fontSize: 11 }}>Save Name</button>
                        <button onClick={() => applyGoogleCampaign(c.id)} disabled={!campaignNames[c.id] || applying === c.id}
                          className="btn btn-pink" style={{ fontSize: 11, minWidth: 100 }}>
                          {applying === c.id ? 'Applying…' : `Apply to ${c.orders} orders`}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
                💡 Check your Google Ads account for these campaign IDs: Campaigns tab → look for IDs {scanData.googleCampaigns.map((c: any) => c.id).join(', ')}
              </div>
            </div>
          )}

          {/* SECTION 3: Direct order bulk assignment */}
          {scanData.directOrders?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🌐 {scanData.directCount} Direct / Unknown orders</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Select orders and bulk-assign to a channel. Useful if you know an ad was running on specific dates.
                  </div>
                </div>
                {selectedDirect.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedDirect.length} selected</span>
                    <select className="form-input" value={bulkChannel} onChange={e => setBulkChannel(e.target.value)} style={{ fontSize: 11, padding: '4px 8px' }}>
                      <option value="">Assign to channel…</option>
                      {CHANNELS.map(c => <option key={c.channel} value={c.channel}>{c.label}</option>)}
                    </select>
                    <input className="form-input" placeholder="Campaign name (optional)" value={bulkCampaign} onChange={e => setBulkCampaign(e.target.value)} style={{ width: 180, fontSize: 11, padding: '4px 8px' }} />
                    <button onClick={bulkAssignDirect} disabled={!bulkChannel || applying === 'bulk'} className="btn btn-pink" style={{ fontSize: 11 }}>
                      {applying === 'bulk' ? 'Saving…' : 'Assign →'}
                    </button>
                    <button onClick={() => setSelectedDirect([])} className="btn btn-ghost" style={{ fontSize: 11 }}>Clear</button>
                  </div>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox" checked={allDirectSelected} onChange={e => setSelectedDirect(e.target.checked ? scanData.directOrders.map((o: any) => o.id) : [])} />
                      </th>
                      <th>Order</th><th>Date</th><th>Revenue</th><th>Items</th><th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanData.directOrders.map((o: any) => (
                      <tr key={o.id} style={{ background: selectedDirect.includes(o.id) ? 'rgba(255,30,142,0.06)' : 'transparent' }}>
                        <td>
                          <input type="checkbox" checked={selectedDirect.includes(o.id)}
                            onChange={e => setSelectedDirect(p => e.target.checked ? [...p, o.id] : p.filter(id => id !== o.id))} />
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.date}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{o.items}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.device || '—'}</td>
                      </tr>
                    ))}
                    {scanData.directCount > 50 && (
                      <tr><td colSpan={6} style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>Showing 50 of {scanData.directCount} — re-scan after applying to see remaining</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: Overrides log */}
          {showOverrides && (
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Applied Overrides ({overrides.length})</div>
              <table className="data-table">
                <thead><tr><th>Order</th><th>Source</th><th>Campaign</th><th>Channel</th><th>Reason</th><th></th></tr></thead>
                <tbody>
                  {overrides.map((o: any) => (
                    <tr key={o.order_id}>
                      <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.order_id}</td>
                      <td style={{ fontSize: 12 }}>{o.utm_source}/{o.utm_medium}</td>
                      <td style={{ fontSize: 12 }}>{o.utm_campaign || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--blue)' }}>{o.channel}</td>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{o.override_reason}</td>
                      <td>
                        <button onClick={() => deleteOverride(o.order_id)} className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 7px', color: '#ff5050', borderColor: 'rgba(255,80,80,0.3)' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
