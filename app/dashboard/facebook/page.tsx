'use client';
import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const INSTRUCTIONS = {
  facebook: {
    title: 'How to export from Meta Ads Manager',
    color: '#1877F2',
    steps: [
      'Go to business.facebook.com → Ads Manager',
      'Click "Campaigns" tab at the top',
      'Set your date range (e.g. This Month)',
      'Click "Columns" → select "Performance and Clicks" or "Custom"',
      'Make sure these columns are visible: Campaign name, Amount spent, Purchases, Purchase conversion value, Link clicks, Impressions',
      'Click "Export" (top right) → Export Table Data → CSV',
      'Upload the downloaded CSV file here',
    ],
    note: 'The file will be called something like "CampaignResults_2024-03.csv"',
  },
};

function UploadPanel({ platform, onUploaded, existingFile, existingDate }: any) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const inst = INSTRUCTIONS[platform as keyof typeof INSTRUCTIONS];

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file'); return; }
    setUploading(true); setError(''); setSuccess('');
    const form = new FormData();
    form.append('file', file);
    form.append('platform', platform);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Upload failed'); }
      else {
        setSuccess(`✓ Uploaded ${d.campaigns} campaigns · $${d.spend?.toLocaleString()} spend · ${d.roas}× ROAS`);
        onUploaded();
      }
    } catch { setError('Upload failed — please try again'); }
    finally { setUploading(false); }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            📂 Manual Data Upload
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {existingFile
              ? `Using: ${existingFile} (uploaded ${new Date(existingDate).toLocaleDateString()})`
              : 'Upload a CSV export from Meta Ads Manager to see real data'}
          </div>
        </div>
        {existingFile && (
          <button onClick={async () => { await fetch(`/api/upload?platform=${platform}`, { method: 'DELETE' }); onUploaded(); }}
            className="btn btn-ghost" style={{ fontSize: 11, color: '#ff5050', borderColor: 'rgba(255,80,80,0.3)' }}>
            ✕ Clear upload
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? inst.color : 'var(--border)'}`,
          borderRadius: 10, padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? `${inst.color}08` : 'rgba(255,255,255,0.02)',
          transition: 'all 0.15s', marginBottom: 16,
        }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {uploading ? 'Uploading…' : 'Drop CSV here or click to browse'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Meta Ads Manager export · .csv format</div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#ff5050' }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(168,207,69,0.1)', border: '1px solid rgba(168,207,69,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#a8cf45' }}>
          {success}
        </div>
      )}

      {/* Instructions */}
      <details style={{ cursor: 'pointer' }}>
        <summary style={{ fontSize: 12, color: 'var(--muted)', userSelect: 'none', marginBottom: 8 }}>
          ▸ {inst.title}
        </summary>
        <div style={{ paddingTop: 10 }}>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {inst.steps.map((step, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
          {inst.note && (
            <div style={{ fontSize: 11, color: 'var(--blue)', background: 'rgba(4,170,232,0.08)', borderRadius: 6, padding: '6px 10px', marginTop: 10 }}>
              💡 {inst.note}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default function FacebookPage() {
  const [data, setData] = useState<any>(null);
  const [source, setSource] = useState('demo');
  const [filename, setFilename] = useState('');
  const [uploadedAt, setUploadedAt] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  async function load() {
    const r = await fetch('/api/data/facebook');
    const d = await r.json();
    setData(d.data);
    setSource(d.source);
    setFilename(d.filename || '');
    setUploadedAt(d.uploadedAt || '');
  }

  useEffect(() => { load(); }, []);

  if (!data) return <div style={{ color: 'var(--muted)', padding: 40 }}>Loading…</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => <div key={p.name} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>{p.name}: ${p.value?.toLocaleString()}</div>)}
      </div>
    );
  };

  const sourceBadge: Record<string, { label: string; color: string }> = {
    live: { label: 'Live', color: '#a8cf45' },
    upload: { label: 'CSV Upload', color: '#04aae8' },
    demo: { label: 'Demo Data', color: '#888' },
  };
  const badge = sourceBadge[source] || sourceBadge.demo;

  function roasColor(r: number) {
    return r >= 5 ? '#a8cf45' : r >= 3 ? '#ffe600' : '#ff5050';
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Facebook Ads</h1>
          <p className="section-sub">Meta ad spend, revenue & ROAS by campaign</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
              border: source === 'upload' ? '1px solid rgba(4,170,232,0.4)' : undefined,
              color: source === 'upload' ? '#04aae8' : undefined }}>
            📂 {source === 'upload' ? 'Update CSV' : 'Upload CSV'}
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            background: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}33` }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          platform="facebook"
          existingFile={filename}
          existingDate={uploadedAt}
          onUploaded={() => { load(); setShowUpload(false); }}
        />
      )}

      {/* Upload nudge when on demo */}
      {source === 'demo' && !showUpload && (
        <div style={{ background: 'rgba(4,170,232,0.06)', border: '1px solid rgba(4,170,232,0.2)', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Showing demo data — <span style={{ color: '#04aae8' }}>upload a CSV from Meta Ads Manager</span> to see real NSS campaign performance
          </div>
          <button onClick={() => setShowUpload(true)} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px', color: '#04aae8', borderColor: 'rgba(4,170,232,0.3)', whiteSpace: 'nowrap' }}>
            Upload now →
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Spend', value: `$${data.spend.toLocaleString()}`, sub: 'This period', color: 'var(--pink)' },
          { label: 'Revenue', value: `$${data.revenue.toLocaleString()}`, sub: 'Attributed', color: 'var(--green)' },
          { label: 'ROAS', value: `${data.roas.toFixed(2)}×`, sub: 'Return on ad spend', color: data.roas >= 3 ? 'var(--yellow)' : '#ff5050' },
          { label: 'Conversions', value: data.conversions.toLocaleString(), sub: 'Sales', color: 'var(--blue)' },
          { label: 'Avg CPC', value: `$${data.cpc}`, sub: 'Cost per click', color: 'var(--pink)' },
          { label: 'Cost/Conv.', value: `$${data.conversions > 0 ? (data.spend / data.conversions).toFixed(2) : '—'}`, sub: 'Per sale', color: 'var(--green)' },
        ].map(tile => (
          <div key={tile.label} className="stat-tile">
            <span className="label">{tile.label}</span>
            <span className="value" style={{ color: tile.color }}>{tile.value}</span>
            <span className="sub">{tile.sub}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      {data.monthly?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ fontSize: 15 }}>Spend vs Revenue — Monthly</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
              <Bar dataKey="spend" name="Spend" fill="var(--pink)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
              <Bar dataKey="revenue" name="Revenue" fill="var(--blue)" radius={[4, 4, 0, 0]} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="section-title" style={{ fontSize: 15 }}>Campaign Breakdown</div>
          {source === 'upload' && filename && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>From: {filename}</span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Conv.</th>
            </tr></thead>
            <tbody>
              {data.campaigns.map((c: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, maxWidth: 280 }}>{c.name}</td>
                  <td>${c.spend.toLocaleString()}</td>
                  <td>${c.revenue.toLocaleString()}</td>
                  <td>
                    <span style={{ color: roasColor(c.roas), fontWeight: 700 }}>{c.roas.toFixed(2)}×</span>
                  </td>
                  <td>{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
