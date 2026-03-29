'use client';
import { useEffect, useState } from 'react';

function fmt(n: number) { return '$' + Math.round(n).toLocaleString(); }

const CHANNELS = [
  { label: 'Meta — Facebook', source: 'facebook', medium: 'paid', channel: 'Meta — Facebook', color: '#1877F2' },
  { label: 'Meta — Instagram', source: 'instagram', medium: 'paid', channel: 'Meta — Instagram', color: '#E1306C' },
  { label: 'SEO / Organic', source: 'google', medium: 'organic', channel: 'SEO / Organic', color: '#a8cf45' },
  { label: 'Google Ads', source: 'google', medium: 'cpc', channel: 'Google Ads', color: '#4285F4' },
  { label: 'Email (Klaviyo)', source: 'klaviyo', medium: 'email', channel: 'Email', color: '#ffe600' },
  { label: 'Direct', source: 'direct', medium: 'none', channel: 'Direct', color: '#888' },
];

const EMPTY_META_FORM = {
  period_label: '', date_from: '', date_to: '',
  campaign_name: '', adset_name: '', ad_name: '',
  spend: '', purchases: '', purchase_value: '',
  reach: '', impressions: '', clicks: '',
  add_to_cart: '', initiate_checkout: '',
  age_18_24_pct: '', age_25_34_pct: '', age_35_44_pct: '', age_45_54_pct: '', age_55_plus_pct: '',
  female_pct: '', male_pct: '',
  mobile_pct: '', desktop_pct: '',
  peak_hour: '', notes: '',
};

// ── Meta Manual Entry Tab ─────────────────────────────────────────────────────
function MetaManualTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY_META_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function load() {
    const r = await fetch('/api/meta-manual');
    const d = await r.json();
    setEntries(d.data || []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.campaign_name || !form.date_from || !form.date_to) { setMsg('Campaign name and dates are required'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/meta-manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', ...form,
          period_label: form.period_label || `${form.date_from} → ${form.date_to}`,
          spend: parseFloat(form.spend) || 0,
          purchases: parseInt(form.purchases) || 0,
          purchase_value: parseFloat(form.purchase_value) || 0,
          reach: parseInt(form.reach) || 0,
          impressions: parseInt(form.impressions) || 0,
          clicks: parseInt(form.clicks) || 0,
          add_to_cart: parseInt(form.add_to_cart) || 0,
          initiate_checkout: parseInt(form.initiate_checkout) || 0,
          age_18_24_pct: parseFloat(form.age_18_24_pct) || null,
          age_25_34_pct: parseFloat(form.age_25_34_pct) || null,
          age_35_44_pct: parseFloat(form.age_35_44_pct) || null,
          age_45_54_pct: parseFloat(form.age_45_54_pct) || null,
          age_55_plus_pct: parseFloat(form.age_55_plus_pct) || null,
          female_pct: parseFloat(form.female_pct) || null,
          male_pct: parseFloat(form.male_pct) || null,
          mobile_pct: parseFloat(form.mobile_pct) || null,
          desktop_pct: parseFloat(form.desktop_pct) || null,
          peak_hour: parseInt(form.peak_hour) || null,
        }),
      });
      if (r.ok) { setMsg('✓ Saved'); setForm({ ...EMPTY_META_FORM }); setShowForm(false); load(); }
      else setMsg('Save failed');
    } finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  }

  async function deleteEntry(id: number) {
    await fetch('/api/meta-manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    load();
  }

  const F = (key: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} placeholder={placeholder}
        value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  // Group entries by period
  const grouped = entries.reduce((acc: any, e: any) => {
    const key = e.period_label;
    if (!acc[key]) acc[key] = { label: key, entries: [], totalSpend: 0, totalPurchases: 0, totalValue: 0 };
    acc[key].entries.push(e);
    acc[key].totalSpend += e.spend || 0;
    acc[key].totalPurchases += e.purchases || 0;
    acc[key].totalValue += e.purchase_value || 0;
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📊 Meta Ads Manual Data Entry</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Enter Meta Ads Manager data by period — campaign, adset, or ad level. Includes demographics, device, and time of day.
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-pink" style={{ fontSize: 12 }}>
          {showForm ? '✕ Cancel' : '+ Add Period Data'}
        </button>
      </div>

      {msg && <div style={{ background: msg.startsWith('✓') ? 'rgba(168,207,69,0.1)' : 'rgba(255,80,80,0.1)', border: `1px solid ${msg.startsWith('✓') ? 'rgba(168,207,69,0.3)' : 'rgba(255,80,80,0.3)'}`, borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: msg.startsWith('✓') ? '#a8cf45' : '#ff5050' }}>{msg}</div>}

      {/* Entry form */}
      {showForm && (
        <div style={{ background: 'rgba(24,119,242,0.04)', border: '1px solid rgba(24,119,242,0.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1877F2', marginBottom: 16 }}>New Meta Ads Period Entry</div>

          {/* Period + Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {F('period_label', 'Period Label', 'text', 'e.g. March 2026 Campaign')}
            {F('date_from', 'Date From', 'date')}
            {F('date_to', 'Date To', 'date')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {F('campaign_name', 'Campaign Name *', 'text', 'NSS Ongoing Advantage+')}
            {F('adset_name', 'Adset Name', 'text', 'NSS Advantage+ Ongoing')}
            {F('ad_name', 'Ad Name', 'text', 'IMAGE AD 1')}
          </div>

          {/* Core metrics */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Performance Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {F('spend', 'Spend ($)', 'number', '0.00')}
            {F('purchases', 'Purchases', 'number', '0')}
            {F('purchase_value', 'Purchase Value ($)', 'number', '0.00')}
            {F('add_to_cart', 'Add to Cart', 'number', '0')}
            {F('initiate_checkout', 'Initiate Checkout', 'number', '0')}
            {F('reach', 'Reach', 'number', '0')}
            {F('impressions', 'Impressions', 'number', '0')}
            {F('clicks', 'Link Clicks', 'number', '0')}
            <div style={{ gridColumn: 'span 2' }}>{F('notes', 'Notes', 'text', 'Optional context')}</div>
          </div>

          {/* Demographics */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Demographics (from Meta Ads Manager breakdowns) — optional
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              In Meta Ads Manager → your campaign → Breakdown → By Delivery → Age / Gender / Device / Placement / Time of day
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
              <div><label className="form-label">18–24 %</label><input className="form-input" type="number" placeholder="12" value={form.age_18_24_pct} onChange={e => setForm(f => ({ ...f, age_18_24_pct: e.target.value }))} /></div>
              <div><label className="form-label">25–34 %</label><input className="form-input" type="number" placeholder="31" value={form.age_25_34_pct} onChange={e => setForm(f => ({ ...f, age_25_34_pct: e.target.value }))} /></div>
              <div><label className="form-label">35–44 %</label><input className="form-input" type="number" placeholder="28" value={form.age_35_44_pct} onChange={e => setForm(f => ({ ...f, age_35_44_pct: e.target.value }))} /></div>
              <div><label className="form-label">45–54 %</label><input className="form-input" type="number" placeholder="18" value={form.age_45_54_pct} onChange={e => setForm(f => ({ ...f, age_45_54_pct: e.target.value }))} /></div>
              <div><label className="form-label">55+ %</label><input className="form-input" type="number" placeholder="11" value={form.age_55_plus_pct} onChange={e => setForm(f => ({ ...f, age_55_plus_pct: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              <div><label className="form-label">Female %</label><input className="form-input" type="number" placeholder="78" value={form.female_pct} onChange={e => setForm(f => ({ ...f, female_pct: e.target.value }))} /></div>
              <div><label className="form-label">Male %</label><input className="form-input" type="number" placeholder="21" value={form.male_pct} onChange={e => setForm(f => ({ ...f, male_pct: e.target.value }))} /></div>
              <div><label className="form-label">Mobile %</label><input className="form-input" type="number" placeholder="61" value={form.mobile_pct} onChange={e => setForm(f => ({ ...f, mobile_pct: e.target.value }))} /></div>
              <div><label className="form-label">Desktop %</label><input className="form-input" type="number" placeholder="34" value={form.desktop_pct} onChange={e => setForm(f => ({ ...f, desktop_pct: e.target.value }))} /></div>
              <div><label className="form-label">Peak Hour (0–23)</label><input className="form-input" type="number" placeholder="18" value={form.peak_hour} onChange={e => setForm(f => ({ ...f, peak_hour: e.target.value }))} /></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} className="btn btn-pink" style={{ fontSize: 12 }}>{saving ? 'Saving…' : 'Save Entry'}</button>
            <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_META_FORM }); }} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* How to export from Meta */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ fontSize: 12, color: 'var(--blue)', cursor: 'pointer', padding: '8px 0' }}>▸ Where to find this data in Meta Ads Manager</summary>
        <div style={{ background: 'rgba(24,119,242,0.05)', borderRadius: 10, padding: 14, marginTop: 8 }}>
          {[
            { label: 'Core metrics (spend, purchases, value)', desc: 'Ads Manager → Campaigns/Ad sets/Ads tab → set your date range → read the columns directly' },
            { label: 'Age breakdown', desc: 'Ads Manager → select campaign → Breakdown (top right) → By Delivery → Age' },
            { label: 'Gender breakdown', desc: 'Breakdown → By Delivery → Gender' },
            { label: 'Device breakdown', desc: 'Breakdown → By Delivery → Device' },
            { label: 'Time of day (peak hour)', desc: 'Ads Manager → Reporting → Create Report → Breakdown: Hour of Day → look for the hour with most purchases' },
            { label: 'Placement breakdown', desc: 'Breakdown → By Delivery → Placement' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <span style={{ color: '#1877F2', fontWeight: 700, fontSize: 12, minWidth: 200, flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Saved entries */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>No manual data entered yet</div>
          <div style={{ fontSize: 12 }}>Add your historical Meta Ads data using the button above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.values(grouped).map((group: any) => {
            const roas = group.totalSpend > 0 ? (group.totalValue / group.totalSpend).toFixed(2) : '—';
            const cps = group.totalPurchases > 0 ? (group.totalSpend / group.totalPurchases).toFixed(2) : '—';
            return (
              <div key={group.label} style={{ border: '1px solid rgba(24,119,242,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Period header */}
                <div style={{ background: 'rgba(24,119,242,0.07)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === group.label ? null : group.label)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#1877F2', fontSize: 14 }}>👤</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{group.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{group.entries.length} entries</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Spend', value: fmt(group.totalSpend), color: 'var(--pink)' },
                      { label: 'Purchases', value: group.totalPurchases, color: 'var(--text)' },
                      { label: 'Revenue', value: fmt(group.totalValue), color: 'var(--green)' },
                      { label: 'ROAS', value: `${roas}×`, color: 'var(--yellow)' },
                      { label: '$ / Purchase', value: `$${cps}`, color: 'var(--blue)' },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.label}</div>
                      </div>
                    ))}
                    <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>{expandedId === group.label ? '▾' : '▸'}</span>
                  </div>
                </div>

                {/* Expanded entries */}
                {expandedId === group.label && (
                  <div style={{ padding: 0 }}>
                    {group.entries.map((e: any) => {
                      const eRoas = e.spend > 0 && e.purchase_value > 0 ? (e.purchase_value / e.spend).toFixed(2) : '—';
                      const eCps = e.purchases > 0 ? (e.spend / e.purchases).toFixed(2) : '—';
                      return (
                        <div key={e.id} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{e.campaign_name}</div>
                            {e.adset_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>↳ {e.adset_name}</div>}
                            {e.ad_name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>  ↳ {e.ad_name}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
                            <span style={{ color: 'var(--pink)' }}>{fmt(e.spend)} spend</span>
                            <span style={{ color: 'var(--green)' }}>{fmt(e.purchase_value)} revenue</span>
                            <span style={{ color: 'var(--yellow)' }}>{eRoas}× ROAS</span>
                            <span>{e.purchases} purchases</span>
                            <span style={{ color: 'var(--blue)' }}>${eCps}/purchase</span>
                            {e.female_pct && <span style={{ color: 'var(--muted)' }}>👩{e.female_pct}% female</span>}
                            {e.mobile_pct && <span style={{ color: 'var(--muted)' }}>📱{e.mobile_pct}% mobile</span>}
                            {e.peak_hour != null && <span style={{ color: 'var(--muted)' }}>🕐 Peak: {e.peak_hour}:00</span>}
                          </div>
                          <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: '#ff5050', cursor: 'pointer', fontSize: 16, opacity: 0.5, flexShrink: 0 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Instagram Fix Tab ─────────────────────────────────────────────────────────
function InstagramFixTab() {
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedDirect, setSelectedDirect] = useState<number[]>([]);
  const [bulkChannel, setBulkChannel] = useState('Meta — Facebook');
  const [bulkCampaign, setBulkCampaign] = useState('');
  const [overrides, setOverrides] = useState<any[]>([]);
  const [showOverrides, setShowOverrides] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const r = await fetch('/api/attribution?action=scan');
      const d = await r.json();
      setScanData(d);
    } finally { setLoading(false); }
  }

  useEffect(() => { scan(); }, []);

  async function fixIg() {
    const ids = scanData?.igOrders?.map((o: any) => o.id) || [];
    if (!ids.length) return;
    setApplying(true);
    await fetch('/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fix_ig_orders', order_ids: ids }) });
    setMsg(`✓ Fixed ${ids.length} Instagram orders — they now show as Meta Instagram`);
    setTimeout(() => setMsg(''), 4000);
    setApplying(false);
    scan();
  }

  async function bulkAssign() {
    if (!selectedDirect.length || !bulkChannel) return;
    const ch = CHANNELS.find(c => c.channel === bulkChannel);
    if (!ch) return;
    setApplying(true);
    await fetch('/api/attribution', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk_date_range', order_ids: selectedDirect, utm_source: ch.source, utm_medium: ch.medium, utm_campaign: bulkCampaign || ch.label, channel: ch.channel, reason: 'Manual bulk assignment' }) });
    setMsg(`✓ Assigned ${selectedDirect.length} orders to ${bulkChannel}`);
    setSelectedDirect([]); setBulkCampaign('');
    setTimeout(() => setMsg(''), 4000);
    setApplying(false);
    scan();
  }

  async function loadOverrides() {
    const r = await fetch('/api/attribution?action=overrides');
    const d = await r.json();
    setOverrides(d.overrides || []);
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Scanning orders…</div>;

  return (
    <div>
      {msg && <div style={{ background: 'rgba(168,207,69,0.1)', border: '1px solid rgba(168,207,69,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#a8cf45' }}>{msg}</div>}

      {/* Quick stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Orders Scanned', value: scanData?.scanned || 0, color: 'var(--text)' },
          { label: 'Instagram (ig source)', value: scanData?.igOrders?.length || 0, sub: 'Quick fix available', color: '#E1306C' },
          { label: 'Direct / Unknown', value: scanData?.directCount || 0, sub: 'Manual assign', color: '#888' },
        ].map(t => (
          <div key={t.label} className="stat-tile">
            <span className="label">{t.label}</span>
            <span className="value" style={{ color: t.color }}>{t.value}</span>
            {(t as any).sub && <span className="sub">{(t as any).sub}</span>}
          </div>
        ))}
      </div>

      {/* Instagram quick fix */}
      {(scanData?.igOrders?.length || 0) > 0 && (
        <div style={{ background: 'rgba(225,48,108,0.06)', border: '1px solid rgba(225,48,108,0.25)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#E1306C', marginBottom: 6 }}>
                📸 {scanData.igOrders.length} Instagram orders have wrong source label
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                These orders already have full Meta attribution (campaign name, ad name) — the UTM source is just set to &quot;ig&quot; instead of &quot;instagram&quot;. One click fixes them all.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ marginTop: 0 }}>
                  <thead><tr><th>Order</th><th>Date</th><th>Revenue</th><th>Campaign</th><th>Ad</th></tr></thead>
                  <tbody>
                    {scanData.igOrders.slice(0, 5).map((o: any) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.date}</td>
                        <td>{fmt(o.total)}</td>
                        <td style={{ fontSize: 12 }}>{decodeURIComponent((o.campaign || '').replace(/\+/g, ' '))}</td>
                        <td style={{ fontSize: 12, color: '#E1306C' }}>{decodeURIComponent((o.content || '').replace(/\+/g, ' '))}</td>
                      </tr>
                    ))}
                    {scanData.igOrders.length > 5 && <tr><td colSpan={5} style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center' }}>…and {scanData.igOrders.length - 5} more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <button onClick={fixIg} disabled={applying} className="btn btn-pink" style={{ fontSize: 12, minWidth: 120, flexShrink: 0, background: '#E1306C', borderColor: '#E1306C' }}>
              {applying ? 'Fixing…' : 'Fix All →'}
            </button>
          </div>
        </div>
      )}

      {/* Direct order assignment */}
      {(scanData?.directCount || 0) > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🌐 {scanData.directCount} Direct / Unknown orders</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Select orders from dates when Meta ads were running, then assign to Meta Facebook or Instagram.
              </div>
            </div>
            {selectedDirect.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{selectedDirect.length} selected</span>
                <select className="form-input" value={bulkChannel} onChange={e => setBulkChannel(e.target.value)} style={{ fontSize: 11, padding: '4px 8px' }}>
                  {CHANNELS.map(c => <option key={c.channel} value={c.channel}>{c.label}</option>)}
                </select>
                <input className="form-input" placeholder="Campaign name (optional)" value={bulkCampaign} onChange={e => setBulkCampaign(e.target.value)} style={{ width: 200, fontSize: 11, padding: '4px 8px' }} />
                <button onClick={bulkAssign} disabled={applying} className="btn btn-pink" style={{ fontSize: 11 }}>{applying ? 'Saving…' : 'Assign →'}</button>
                <button onClick={() => setSelectedDirect([])} className="btn btn-ghost" style={{ fontSize: 11 }}>Clear</button>
              </div>
            )}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedDirect.length === scanData.directOrders?.length} onChange={e => setSelectedDirect(e.target.checked ? scanData.directOrders.map((o: any) => o.id) : [])} /></th>
                <th>Order</th><th>Date</th><th>Revenue</th><th>Items</th><th>Device</th>
              </tr>
            </thead>
            <tbody>
              {(scanData.directOrders || []).map((o: any) => (
                <tr key={o.id} style={{ background: selectedDirect.includes(o.id) ? 'rgba(255,30,142,0.05)' : 'transparent' }}>
                  <td><input type="checkbox" checked={selectedDirect.includes(o.id)} onChange={e => setSelectedDirect(p => e.target.checked ? [...p, o.id] : p.filter(id => id !== o.id))} /></td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.id}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.date}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{o.items}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.device || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overrides log */}
      <div style={{ marginTop: 16 }}>
        <button onClick={() => { setShowOverrides(!showOverrides); if (!showOverrides) loadOverrides(); }} className="btn btn-ghost" style={{ fontSize: 12 }}>
          {showOverrides ? 'Hide' : 'View'} Applied Overrides
        </button>
        {showOverrides && overrides.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead><tr><th>Order</th><th>Channel</th><th>Campaign</th><th>Reason</th></tr></thead>
              <tbody>
                {overrides.slice(0, 50).map((o: any) => (
                  <tr key={o.order_id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--blue)', fontSize: 12 }}>#{o.order_id}</td>
                    <td style={{ fontSize: 12, color: 'var(--blue)' }}>{o.channel}</td>
                    <td style={{ fontSize: 12 }}>{o.utm_campaign || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{o.override_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AttributionPage() {
  const [tab, setTab] = useState<'meta' | 'fix'>('meta');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Attribution Backfill</h1>
          <p className="section-sub">Fix historical Meta attribution — enter manual data or auto-fix mis-labelled orders</p>
        </div>
        <a href="/dashboard/revenue" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>← Revenue Attribution</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <button onClick={() => setTab('meta')} className={tab === 'meta' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 12 }}>
          📊 Meta Manual Entry
        </button>
        <button onClick={() => setTab('fix')} className={tab === 'fix' ? 'btn btn-pink' : 'btn btn-ghost'} style={{ fontSize: 12 }}>
          🔧 Auto-Fix Orders
        </button>
      </div>

      {tab === 'meta' && <MetaManualTab />}
      {tab === 'fix' && <InstagramFixTab />}
    </div>
  );
}
