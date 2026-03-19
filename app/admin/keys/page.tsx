'use client';
import { useEffect, useState } from 'react';

const SERVICES = [
  { key: 'woocommerce_url', label: 'WooCommerce Site URL', hint: 'https://nationalsalonsupplies.com.au', group: 'WooCommerce' },
  { key: 'woocommerce_key', label: 'Consumer Key', hint: 'ck_...', group: 'WooCommerce' },
  { key: 'woocommerce_secret', label: 'Consumer Secret', hint: 'cs_...', group: 'WooCommerce' },
  { key: 'meta_access_token', label: 'Meta Access Token', hint: 'EAA...', group: 'Meta / Facebook Ads' },
  { key: 'meta_ad_account_id', label: 'Ad Account ID', hint: 'act_123456789', group: 'Meta / Facebook Ads' },
  { key: 'google_ads_customer_id', label: 'Google Ads Customer ID', hint: '123-456-7890', group: 'Google Ads' },
  { key: 'google_ads_developer_token', label: 'Developer Token', hint: 'ABCDE...', group: 'Google Ads' },
  { key: 'google_search_console', label: 'GSC Service Account JSON', hint: '{"type":"service_account",...}', group: 'Google Search Console' },
  { key: 'ga4_property_id', label: 'GA4 Property ID', hint: '123456789', group: 'Google Analytics 4' },
  { key: 'ga4_service_account', label: 'GA4 Service Account JSON', hint: '{"type":"service_account",...}', group: 'Google Analytics 4' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/keys').then(r => r.json()).then(d => setKeys(d.keys || {}));
  }, []);

  async function saveKey(service: string, value: string) {
    const res = await fetch('/api/admin/keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, key_name: service, key_value: value }),
    });
    if (res.ok) { setSaved(s => ({ ...s, [service]: true })); setTimeout(() => setSaved(s => ({ ...s, [service]: false })), 2000); }
  }

  const groups = [...new Set(SERVICES.map(s => s.group))];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>API Keys</h1>
        <p className="section-sub">Connect data sources. Keys are stored encrypted in the database.</p>
      </div>

      {groups.map(group => (
        <div key={group} className="card" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 20, borderRadius: 3, background: 'var(--pink)' }}/>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.04em' }}>{group}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SERVICES.filter(s => s.group === group).map(svc => (
              <div key={svc.key}>
                <label className="form-label">{svc.label}</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="form-input" type={svc.key.includes('secret') || svc.key.includes('token') || svc.key.includes('json') ? 'password' : 'text'}
                    placeholder={svc.hint}
                    value={keys[svc.key] || ''}
                    onChange={e => setKeys(k => ({ ...k, [svc.key]: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-pink" onClick={() => saveKey(svc.key, keys[svc.key] || '')}
                    style={{ whiteSpace: 'nowrap', background: saved[svc.key] ? 'var(--green)' : undefined }}>
                    {saved[svc.key] ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--yellow)' }}>Note</strong> — WooCommerce keys are already pre-configured. After adding Meta or Google keys, refresh the relevant dashboard pages to see live data instead of demo data.
        </p>
      </div>
    </div>
  );
}
