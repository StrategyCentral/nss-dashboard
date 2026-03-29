'use client';
import { useEffect, useState, useRef } from 'react';

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }
function fmtPct(n: number) { return n.toFixed(1) + '%'; }

const CHANNELS = [
  { label: 'Meta — Facebook', source: 'facebook', medium: 'paid', channel: 'Meta — Facebook', color: '#1877F2' },
  { label: 'Meta — Instagram', source: 'instagram', medium: 'paid', channel: 'Meta — Instagram', color: '#E1306C' },
  { label: 'Google Ads', source: 'google', medium: 'cpc', channel: 'Google Ads', color: '#4285F4' },
  { label: 'SEO / Organic', source: 'google', medium: 'organic', channel: 'SEO / Organic', color: '#a8cf45' },
  { label: 'Email (Klaviyo)', source: 'klaviyo', medium: 'email', channel: 'Email', color: '#ffe600' },
  { label: 'Direct', source: 'direct', medium: 'none', channel: 'Direct', color: '#888' },
];

const REPORT_TYPES = [
  { key: 'performance', label: 'Performance', desc: 'Spend, ROAS, purchases, clicks, CPM, CPC, CTR', icon: '📊' },
  { key: 'breakdown_age', label: 'Age Breakdown', desc: 'Sales & spend by age group (18-24, 25-34, etc)', icon: '👤' },
  { key: 'breakdown_gender', label: 'Gender Breakdown', desc: 'Sales & spend by gender', icon: '⚧' },
  { key: 'breakdown_region', label: 'Region Breakdown', desc: 'Sales & spend by state/country', icon: '📍' },
  { key: 'breakdown_device', label: 'Device Breakdown', desc: 'Mobile vs Desktop vs Tablet', icon: '📱' },
  { key: 'breakdown_placement', label: 'Placement Breakdown', desc: 'Feed vs Stories vs Reels vs Audience Network', icon: '🎯' },
  { key: 'breakdown_time', label: 'Time of Day', desc: 'Conversions by hour of day', icon: '🕐' },
];

function UploadCard({ reportType, onUploaded }: { reportType: typeof REPORT_TYPES[0]; onUploaded: (type: string, result: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/upload?platform=facebook&report_type=${reportType.key}`)
      .then(r => r.json())
      .then(d => { if (d.data) setUploaded(d); });
  }, [reportType.key]);

  async function handleFile(file: File) {
    setUploading(true); setError('');
    const form = new FormData();
    form.append('file', file);
    form.append('platform', 'facebook');
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Upload failed'); }
      else { setUploaded(d); onUploaded(reportType.key, d); }
    } catch { setError('Upload failed'); }
    finally { setUploading(false); }
  }

  async function clearUpload() {
    await fetch(`/api/upload?platform=facebook&report_type=${reportType.key}`, { method: 'DELETE' });
    setUploaded(null);
  }

  const isUploaded = !!uploaded?.uploadedAt;

  return (
    <div style={{ background: isUploaded ? 'rgba(168,207,69,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isUploaded ? 'rgba(168,207,69,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{reportType.icon} {reportType.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{reportType.desc}</div>
        </div>
        {isUploaded && (
          <button onClick={clearUpload} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
        )}
      </div>

      {isUploaded ? (
        <div style={{ fontSize: 11, color: '#a8cf45', background: 'rgba(168,207,69,0.08)', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
          ✓ {uploaded.filename} · {new Date(uploaded.uploadedAt).toLocaleDateString()}
          {uploaded.campaigns && ` · ${uploaded.campaigns} campaigns`}
          {uploaded.spend && ` · ${fmt(uploaded.spend)} spend`}
          {uploaded.roas && ` · ${uploaded.roas}× ROAS`}
          {uploaded.purchases && ` · ${uploaded.purchases} purchases`}
          {uploaded.dimensions && ` · ${uploaded.dimensions} ${reportType.label.toLowerCase()} segments`}
        </div>
      ) : null}

      <div
        onClick={() => fileRef.current?.click()}
        style={{ border: `1.5px dashed ${isUploaded ? 'rgba(168,207,69,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {uploading ? 'Uploading…' : isUploaded ? '↺ Replace file' : '+ Upload CSV'}
        </div>
      </div>
      {error && <div style={{ fontSize: 11, color: '#ff5050', marginTop: 6 }}>⚠ {error}</div>}
    </div>
  );
}

// Shows breakdown data in a visual table
function BreakdownView({ breakdownType, data }: any) {
  if (!data?.dimensions?.length) return null;
  const max = Math.max(...data.dimensions.map((d: any) => d.spend));

  const labels: Record<string, string> = {
    breakdown_age: 'Age Group', breakdown_gender: 'Gender', breakdown_region: 'Region',
    breakdown_device: 'Device', breakdown_placement: 'Placement', breakdown_time: 'Hour',
    breakdown_dayofweek: 'Day',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead><tr>
          <th>{labels[breakdownType] || 'Segment'}</th>
          <th>Spend</th><th>Purchases</th><th>Revenue</th><th>ROAS</th><th>CPA</th>
          <th style={{ minWidth: 120 }}>Share of Spend</th>
        </tr></thead>
        <tbody>
          {data.dimensions.map((d: any) => (
            <tr key={d.dimension}>
              <td style={{ fontWeight: 600 }}>{d.dimension}</td>
              <td>{fmt(d.spend)}</td>
              <td style={{ fontWeight: 700 }}>{d.purchases}</td>
              <td style={{ color: 'var(--green)' }}>{fmt(d.purchaseValue)}</td>
              <td style={{ color: d.roas >= 3 ? 'var(--yellow)' : '#ff5050', fontWeight: 700 }}>{d.roas > 0 ? d.roas + '×' : '—'}</td>
              <td style={{ color: 'var(--muted)' }}>{d.cpa > 0 ? fmt(d.cpa) : '—'}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(d.spend / max) * 100}%`, background: '#1877F2', opacity: 0.7, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 36 }}>{max > 0 ? ((d.spend / max) * 100).toFixed(0) : 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AttributionPage() {
  const [tab, setTab] = useState<'upload' | 'backfill' | 'breakdowns'>('upload');
  const [scanData, setScanData] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [selectedDirect, setSelectedDirect] = useState<number[]>([]);
  const [bulkChannel, setBulkChannel] = useState('');
  const [bulkCampaign, setBulkCampaign] = useState('');
  const [uploadedReports, setUploadedReports] = useState<Record<string, any>>({});
  const [activeBreakdown, setActiveBreakdown] = useState('breakdown_age');
  const [breakdownData, setBreakdownData] = useState<any>(null);

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function scan() {
    setScanLoading(true);
    try {
      const r = await fetch('/api/attribution?action=scan');
      setScanData(await r.json());
    } finally { setScanLoading(false); }
  }

  async function loadBreakdown(type: string) {
    setActiveBreakdown(type);
    const r = await fetch(`/api/upload?platform=facebook&report_type=${type}`);
    const d = await r.json();
    setBreakdownData(d.data);
  }

  useEffect(() => { if (tab === 'backfill' && !scanData) scan(); }, [tab]);
  useEffect(() => { if (tab === 'breakdowns') loadBreakdown(activeBreakdown); }, [tab]);

  async function fixIgOrders() {
    const ids = scanData?.igOrders?.map((o: any) => o.id) || [];
    if (!ids.length) return;
    setApplying('ig');
    await fetch('/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fix_ig_orders', order_ids: ids }) });
    showMsg(`✓ Fixed ${ids.length} Instagram orders → Meta Instagram`);
    setApplying(null); scan();
  }

  async function bulkAssignDirect() {
    if (!selectedDirect.length || !bulkChannel) return;
    const ch = CHANNELS.find(c => c.channel === bulkChannel);
    if (!ch) return;
    setApplying('bulk');
    await fetch('/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_date_range', order_ids: selectedDirect, utm_source: ch.source, utm_medium: ch.medium, utm_campaign: bulkCampaign || ch.label, channel: ch.channel, reason: 'Manual bulk assignment' }) });
    showMsg(`✓ Assigned ${selectedDirect.length} orders to ${bulkChannel}`);
    setSelectedDirect([]); setBulkChannel(''); setBulkCampaign('');
    setApplying(null); scan();
  }

  const reportUploaded = (type: string, result: any) => {
    setUploadedReports(p => ({ ...p, [type]: result }));
    showMsg(`✓ ${type} report uploaded successfully`);
  };

  const performanceReports = REPORT_TYPES.filter(r => r.key === 'performance');
  const breakdownReports = REPORT_TYPES.filter(r => r.key !== 'performance');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Meta Attribution</h1>
          <p className="section-sub">Upload Meta ad reports · backfill historical data · view demographic breakdowns</p>
        </div>
        <a href="/dashboard/revenue" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>← Revenue</a>
      </div>

      {msg && (
        <div style={{ background: 'rgba(168,207,69,0.12)', border: '1px solid rgba(168,207,69,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#a8cf45' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { key: 'upload', label: '📂 Upload Reports' },
          { key: 'breakdowns', label: '📊 Demographic Breakdowns' },
          { key: 'backfill', label: '🔧 Backfill History' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ fontSize: 12, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--pink)' : 'transparent'}`, color: tab === t.key ? 'var(--text)' : 'var(--muted)', fontWeight: tab === t.key ? 700 : 400, marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Upload Reports */}
      {tab === 'upload' && (
        <div>
          {/* Export instructions */}
          <div style={{ background: 'rgba(24,119,242,0.06)', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1877F2', marginBottom: 10 }}>How to export from Meta Ads Manager</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { step: '1', title: 'Performance report (main)', desc: 'Ads Manager → Ads tab → set date range → Export → Export table data → CSV. Make sure "Ad Name", "Ad Set Name", "Campaign Name", "Amount Spent", "Purchases", "Purchase Conversion Value", "Link Clicks", "Impressions", "Reach" columns are visible.', color: '#1877F2' },
                { step: '2', title: 'Breakdown reports (demographics)', desc: 'Ads Manager → Ads tab → Breakdown (top right) → choose Age, Gender, Region, Device, or Placement → Export → CSV. Upload each one separately. These power the demographic analytics in your ad detail panels.', color: '#E1306C' },
                { step: '3', title: 'Recommended columns to add', desc: 'Purchases, Purchase Conversion Value, Cost Per Purchase, Adds to Cart, Checkouts Initiated, Content Views, Reach, Frequency, CPM, Unique Link Clicks', color: '#a8cf45' },
                { step: '4', title: 'Date range tip', desc: 'Export "Maximum" date range to capture all historical data at once. The parser handles any date range — just re-upload with a fresh export whenever you want to update.', color: '#ffe600' },
              ].map(i => (
                <div key={i.step} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${i.color}22`, border: `1px solid ${i.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i.color, flexShrink: 0, marginTop: 1 }}>{i.step}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{i.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>{i.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance report */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Performance Report</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {performanceReports.map(rt => <UploadCard key={rt.key} reportType={rt} onUploaded={reportUploaded} />)}
            </div>
          </div>

          {/* Breakdown reports */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Demographic Breakdown Reports</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Each breakdown is a separate export from Meta — upload all you have for full analytics.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {breakdownReports.map(rt => <UploadCard key={rt.key} reportType={rt} onUploaded={reportUploaded} />)}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Demographic Breakdowns */}
      {tab === 'breakdowns' && (
        <div>
          {/* Breakdown type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {breakdownReports.map(rt => (
              <button key={rt.key} onClick={() => loadBreakdown(rt.key)}
                className={activeBreakdown === rt.key ? 'btn btn-pink' : 'btn btn-ghost'}
                style={{ fontSize: 11, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                {rt.icon} {rt.label}
              </button>
            ))}
          </div>

          {breakdownData ? (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{breakdownReports.find(r => r.key === activeBreakdown)?.icon} {breakdownReports.find(r => r.key === activeBreakdown)?.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{breakdownData.dimensions?.length} segments · Uploaded from Meta Ads Manager</div>
                </div>
                <a href="#upload" onClick={() => setTab('upload')} className="btn btn-ghost" style={{ fontSize: 11, textDecoration: 'none' }}>Upload new →</a>
              </div>
              <BreakdownView breakdownType={activeBreakdown} data={breakdownData} />
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{breakdownReports.find(r => r.key === activeBreakdown)?.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No {breakdownReports.find(r => r.key === activeBreakdown)?.label} data yet</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Export this breakdown from Meta Ads Manager and upload it on the Upload tab</div>
              <button onClick={() => setTab('upload')} className="btn btn-pink" style={{ fontSize: 12 }}>Upload Reports →</button>
            </div>
          )}
        </div>
      )}

      {/* TAB: Backfill History */}
      {tab === 'backfill' && (
        <div>
          {scanLoading && <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Scanning 500+ WooCommerce orders…</div>}

          {!scanLoading && scanData && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{scanData.scanned} orders scanned</div>
                <button onClick={scan} className="btn btn-ghost" style={{ fontSize: 12 }}>↺ Re-scan</button>
              </div>

              {/* Instagram quick fix */}
              {scanData.igOrders?.length > 0 && (
                <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(225,48,108,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#E1306C', marginBottom: 4 }}>📸 {scanData.igOrders.length} Instagram orders with wrong source label</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>These already have full ad attribution (campaign, ad name) — just labelled &quot;ig&quot; instead of &quot;Meta Instagram&quot;. One click fixes all.</div>
                      <div style={{ fontSize: 11, color: '#E1306C', marginTop: 6 }}>
                        Ads: {[...new Set(scanData.igOrders.map((o: any) => decodeURIComponent(o.content?.replace(/\+/g, ' ') || '')).filter(Boolean))].slice(0, 3).join(', ')}
                      </div>
                    </div>
                    <button onClick={fixIgOrders} disabled={applying === 'ig'} className="btn btn-pink"
                      style={{ fontSize: 12, minWidth: 160, background: '#E1306C', borderColor: '#E1306C' }}>
                      {applying === 'ig' ? 'Fixing…' : `Fix ${scanData.igOrders.length} orders`}
                    </button>
                  </div>
                </div>
              )}

              {/* Direct order bulk assignment */}
              {scanData.directOrders?.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🌐 {scanData.directCount} Direct / Unknown orders</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select orders and assign them to a channel. If you know your Meta campaigns were running on certain dates, assign those orders to Meta.</div>
                    </div>
                    {selectedDirect.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedDirect.length} selected</span>
                        <select className="form-input" value={bulkChannel} onChange={e => setBulkChannel(e.target.value)} style={{ fontSize: 11, padding: '4px 8px' }}>
                          <option value="">Assign to channel…</option>
                          {CHANNELS.map(c => <option key={c.channel} value={c.channel}>{c.label}</option>)}
                        </select>
                        <input className="form-input" placeholder="Campaign name" value={bulkCampaign} onChange={e => setBulkCampaign(e.target.value)} style={{ width: 200, fontSize: 11, padding: '4px 8px' }} />
                        <button onClick={bulkAssignDirect} disabled={!bulkChannel || applying === 'bulk'} className="btn btn-pink" style={{ fontSize: 11 }}>
                          {applying === 'bulk' ? 'Saving…' : 'Assign →'}
                        </button>
                        <button onClick={() => setSelectedDirect([])} className="btn btn-ghost" style={{ fontSize: 11 }}>Clear</button>
                      </div>
                    )}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr>
                        <th><input type="checkbox" checked={selectedDirect.length === scanData.directOrders.length && scanData.directOrders.length > 0}
                          onChange={e => setSelectedDirect(e.target.checked ? scanData.directOrders.map((o: any) => o.id) : [])} /></th>
                        <th>Order</th><th>Date</th><th>Revenue</th><th>Device</th>
                      </tr></thead>
                      <tbody>
                        {scanData.directOrders.map((o: any) => (
                          <tr key={o.id} style={{ background: selectedDirect.includes(o.id) ? 'rgba(255,30,142,0.05)' : 'transparent' }}>
                            <td><input type="checkbox" checked={selectedDirect.includes(o.id)} onChange={e => setSelectedDirect(p => e.target.checked ? [...p, o.id] : p.filter(id => id !== o.id))} /></td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                            <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.date}</td>
                            <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                            <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.device || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
