'use client';
import { useEffect, useState } from 'react';

const SERVICES = [
  { key: 'woocommerce_url',             label: 'Site URL',              hint: 'https://example.com.au',         group: 'WooCommerce',            sensitive: false },
  { key: 'woocommerce_key',             label: 'Consumer Key',          hint: 'ck_…',                           group: 'WooCommerce',            sensitive: true  },
  { key: 'woocommerce_secret',          label: 'Consumer Secret',       hint: 'cs_…',                           group: 'WooCommerce',            sensitive: true  },
  { key: 'meta_access_token',           label: 'Access Token',          hint: 'EAA…',                           group: 'Meta / Facebook Ads',    sensitive: true  },
  { key: 'meta_ad_account_id',          label: 'Ad Account ID',         hint: 'act_123456789',                  group: 'Meta / Facebook Ads',    sensitive: false },
  { key: 'google_ads_customer_id',      label: 'Customer ID',           hint: '123-456-7890',                   group: 'Google Ads',             sensitive: false },
  { key: 'google_ads_developer_token',  label: 'Developer Token',       hint: 'ABCDE…',                         group: 'Google Ads',             sensitive: true  },
  { key: 'gsc_site_main',              label: 'Primary Site URL',       hint: 'https://example.com.au/',        group: 'Google Search Console',  sensitive: false },
  { key: 'gsc_site_blog',              label: 'Blog / Subdomain',       hint: 'https://example.com.au/blog/',   group: 'Google Search Console',  sensitive: false },
  { key: 'ga4_property_id',            label: 'GA4 Property ID',        hint: '123456789',                      group: 'Google Analytics 4',     sensitive: false },
  { key: 'ga4_service_account',        label: 'Service Account JSON',   hint: '{"type":"service_account",…}',   group: 'Google Analytics 4',     sensitive: true  },
];

const GROUP_ICONS: Record<string, string> = {
  'WooCommerce': '🛒',
  'Meta / Facebook Ads': '📘',
  'Google Ads': '🟢',
  'Google Search Console': '🔍',
  'Google Analytics 4': '📊',
};

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ApiKeysPage() {
  const [keys, setKeys]     = useState<Record<string, string>>({});
  const [edits, setEdits]   = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, FieldStatus>>({});
  const [errMsg, setErrMsg] = useState<Record<string, string>>({});
  const [exists, setExists] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/admin/keys')
      .then(r => r.json())
      .then(d => {
        const fetched = d.keys || {};
        setKeys(fetched);
        const ex: Record<string, boolean> = {};
        Object.keys(fetched).forEach(k => { ex[k] = true; });
        setExists(ex);
      });
  }, []);

  // What to show in the input field
  function getDisplayValue(svc: typeof SERVICES[0]) {
    if (edits[svc.key] !== undefined) return edits[svc.key];
    // Sensitive: always blank so user must re-enter to update
    if (svc.sensitive) return '';
    // Non-sensitive: show the real stored value
    return keys[svc.key] || '';
  }

  // Whether Save is enabled
  function canSave(svc: typeof SERVICES[0]) {
    const edited = edits[svc.key];
    if (edited !== undefined) return edited.trim().length > 0;
    // Non-sensitive with existing value: can re-save (no change)
    if (!svc.sensitive && keys[svc.key]) return true;
    return false;
  }

  async function saveKey(svc: typeof SERVICES[0]) {
    const value = edits[svc.key] !== undefined ? edits[svc.key] : (keys[svc.key] || '');
    if (!value.trim()) return;

    setStatus(s => ({ ...s, [svc.key]: 'saving' }));

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: svc.key, key_value: value.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(s => ({ ...s, [svc.key]: 'saved' }));
        setExists(e => ({ ...e, [svc.key]: true }));
        setEdits(e => { const n = { ...e }; delete n[svc.key]; return n; });
        if (!svc.sensitive) setKeys(k => ({ ...k, [svc.key]: value.trim() }));
        setTimeout(() => setStatus(s => ({ ...s, [svc.key]: 'idle' })), 3000);
      } else {
        setStatus(s => ({ ...s, [svc.key]: 'error' }));
        setErrMsg(m => ({ ...m, [svc.key]: data.error || 'Save failed — check server logs' }));
        setTimeout(() => setStatus(s => ({ ...s, [svc.key]: 'idle' })), 5000);
      }
    } catch (e: any) {
      setStatus(s => ({ ...s, [svc.key]: 'error' }));
      setErrMsg(m => ({ ...m, [svc.key]: e.message }));
      setTimeout(() => setStatus(s => ({ ...s, [svc.key]: 'idle' })), 5000);
    }
  }

  const groups = [...new Set(SERVICES.map(s => s.group))];

  function StatusPill({ svcKey, sensitive }: { svcKey: string; sensitive: boolean }) {
    const st = status[svcKey];
    const saved = st === 'saved';
    const saving = st === 'saving';
    const err = st === 'error';
    const connected = exists[svcKey];

    if (saving) return (
      <span style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #666', borderTopColor: '#04aae8', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        Saving…
      </span>
    );
    if (saved) return (
      <span style={{ fontSize: 11, fontWeight: 700, color: '#a8cf45', display: 'flex', alignItems: 'center', gap: 4 }}>
        ✓ Saved to system
      </span>
    );
    if (err) return (
      <span style={{ fontSize: 11, color: '#ff6666' }}>✗ Error</span>
    );
    if (connected) return (
      <span style={{ fontSize: 11, color: '#04aae8', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#04aae8', display: 'inline-block' }} />
        {sensitive ? 'Connected' : 'Configured'}
      </span>
    );
    return (
      <span style={{ fontSize: 11, color: '#444', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#333', display: 'inline-block' }} />
        Not configured
      </span>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>API Keys</h1>
        <p className="section-sub">Connect data sources. Each field shows its current status — green means it's saved and active in the system.</p>
      </div>

      {groups.map(group => (
        <div key={group} className="card" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: 'var(--pink)' }} />
            <span style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {GROUP_ICONS[group]} {group}
            </span>
            {/* Group-level connected count */}
            {(() => {
              const groupKeys = SERVICES.filter(s => s.group === group).map(s => s.key);
              const connectedCount = groupKeys.filter(k => exists[k]).length;
              return connectedCount > 0 ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#04aae8', fontWeight: 600 }}>
                  {connectedCount}/{groupKeys.length} configured
                </span>
              ) : null;
            })()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SERVICES.filter(s => s.group === group).map(svc => {
              const st = status[svc.key] || 'idle';
              const isSaving = st === 'saving';
              return (
                <div key={svc.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0, fontSize: 12 }}>{svc.label}</label>
                    <StatusPill svcKey={svc.key} sensitive={svc.sensitive} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      type={svc.sensitive ? 'password' : 'text'}
                      placeholder={exists[svc.key] && svc.sensitive ? '••••••••  (enter new value to update)' : svc.hint}
                      value={getDisplayValue(svc)}
                      onChange={e => setEdits(ed => ({ ...ed, [svc.key]: e.target.value }))}
                      style={{ flex: 1 }}
                      autoComplete="off"
                      disabled={isSaving}
                    />
                    <button
                      className="btn btn-pink"
                      onClick={() => saveKey(svc)}
                      disabled={isSaving || !canSave(svc)}
                      style={{
                        whiteSpace: 'nowrap',
                        minWidth: 80,
                        background: st === 'saved' ? '#1a3a1a' : undefined,
                        borderColor: st === 'saved' ? '#a8cf45' : undefined,
                        color: st === 'saved' ? '#a8cf45' : undefined,
                        opacity: (!canSave(svc) && !isSaving) ? 0.35 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isSaving ? '…' : st === 'saved' ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                  {st === 'error' && errMsg[svc.key] && (
                    <div style={{ fontSize: 11, color: '#ff6666', marginTop: 5, padding: '4px 8px', background: 'rgba(255,68,68,0.08)', borderRadius: 4 }}>
                      ⚠ {errMsg[svc.key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="card" style={{ background: 'rgba(255,230,0,0.03)', border: '1px solid rgba(255,230,0,0.12)' }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>
          <strong style={{ color: 'var(--yellow)' }}>Note</strong> — Sensitive fields (tokens, secrets) are write-only for security — you can update them but the current value is never shown. Non-sensitive fields (IDs, URLs) show their current value so you can verify what's stored. WooCommerce is pre-configured. After adding keys, refresh the relevant dashboard page to see live data.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
