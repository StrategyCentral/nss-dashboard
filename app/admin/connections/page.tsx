'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Platform definitions ──────────────────────────────────────────────────────

const AD_PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook / Meta Ads',
    desc: 'Spend, revenue, ROAS & campaign performance',
    color: '#1877F2',
    bg: 'rgba(24,119,242,0.08)',
    border: 'rgba(24,119,242,0.25)',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    tokenPaste: true,
    setupSteps: [
      'Go to business.facebook.com → Settings → System Users',
      'Click the "james" system user (Admin access) → Generate token',
      'Select the "NSS Analytics" app → click Next → Generate token',
      'Copy the token and paste it below → click Save',
      'Get your Ad Account ID from Ads Manager (format: act_XXXXXXXXXX)',
    ],
    envVars: [
      { key: 'facebook_access_token', label: 'System User Access Token', hint: 'EAABsbCS...', secret: true },
      { key: 'meta_ad_account_id', label: 'Ad Account ID', hint: 'act_796136010465428', secret: false },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    desc: 'TikTok ad spend, impressions & campaign data',
    color: '#FE2C55',
    bg: 'rgba(254,44,85,0.08)',
    border: 'rgba(254,44,85,0.25)',
    icon: <svg width="26" height="26" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.76 1.52V6.75a4.85 4.85 0 01-.99-.06z" fill="#FE2C55"/></svg>,
    setupSteps: ['Go to ads.tiktok.com → Tools → TikTok for Business API', 'Create Developer App → submit for approval', 'Once approved, copy App ID + App Secret', 'Add callback URL below → Save → Connect'],
    envVars: [{ key: 'tiktok_app_id', label: 'App ID', hint: '7123456789', secret: false }, { key: 'tiktok_app_secret', label: 'App Secret', hint: 'abc...', secret: true }],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Ads',
    desc: 'LinkedIn campaign spend, clicks & lead data',
    color: '#0A66C2',
    bg: 'rgba(10,102,194,0.08)',
    border: 'rgba(10,102,194,0.25)',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    setupSteps: ['Go to linkedin.com/developers → Create App', 'Link your LinkedIn Page → request "Marketing Developer Platform"', 'Once approved → Auth tab → copy Client ID + Secret', 'Add callback URL below → Save → Connect'],
    envVars: [{ key: 'linkedin_client_id', label: 'Client ID', hint: '86abcd...', secret: false }, { key: 'linkedin_client_secret', label: 'Client Secret', hint: 'WjAB...', secret: true }],
  },
];

const GOOGLE_SECTION = {
  color: '#4285F4',
  bg: 'rgba(66,133,244,0.08)',
  border: 'rgba(66,133,244,0.25)',
  icon: <svg width="26" height="26" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  setupSteps: [
    'Go to console.cloud.google.com → create or select a project',
    'Enable 3 APIs: Google Ads API + Search Console API + Analytics Data API',
    'OAuth consent screen → External → add support@bullymarketing.com.au as test user',
    'Credentials → Create OAuth 2.0 Client ID → Web Application',
    'Add the Authorized Redirect URI shown below',
    'Copy Client ID + Client Secret → Save → Connect (covers all Google services in one click)',
  ],
  envVars: [
    { key: 'google_client_id', label: 'OAuth Client ID', hint: '123...apps.googleusercontent.com', secret: false },
    { key: 'google_client_secret', label: 'OAuth Client Secret', hint: 'GOCSPX-...', secret: true },
  ],
  properties: [
    { key: 'google_ads_customer_id', label: 'Google Ads Customer ID', hint: '123-456-7890', note: 'Found in Google Ads → top-right account selector' },
    { key: 'ga4_property_id', label: 'GA4 Property ID', hint: '123456789', note: 'GA4 → Admin → Property Settings' },
    { key: 'gsc_site_main', label: 'Search Console — Main Site', hint: 'https://nationalsalonsupplies.com.au/', note: 'Must match exactly as shown in GSC', prefill: 'https://nationalsalonsupplies.com.au/' },
    { key: 'gsc_site_blog', label: 'Search Console — Blog', hint: 'https://nationalsalonsupplies.com.au/beauty/', note: 'Subfolder property in GSC', prefill: 'https://nationalsalonsupplies.com.au/beauty/' },
  ],
};

const WOOCOMMERCE_SECTION = {
  color: '#96588A',
  bg: 'rgba(150,88,138,0.08)',
  border: 'rgba(150,88,138,0.25)',
  icon: <svg width="26" height="26" viewBox="0 0 24 24"><path fill="#96588A" d="M2.226 0h19.548A2.226 2.226 0 0124 2.226v10.365a2.226 2.226 0 01-2.226 2.226H13.2l1.168 2.85-4.48-2.85H2.226A2.226 2.226 0 010 12.591V2.226A2.226 2.226 0 012.226 0zm1.8 3.513a.735.735 0 00-.61.352.804.804 0 00-.086.673l2.497 8.37a.805.805 0 001.44.2l2.05-3.717 1.94 3.717a.805.805 0 001.44-.2l2.498-8.37a.804.804 0 00-.087-.673.735.735 0 00-.61-.352.776.776 0 00-.755.59L11.47 10.2 9.691 6.722a.776.776 0 00-.707-.482.776.776 0 00-.697.482L6.534 10.2 4.782 4.103a.776.776 0 00-.756-.59zm14.438.13c-.875 0-1.55.38-2.025 1.14-.41.65-.616 1.45-.616 2.4 0 .72.14 1.35.42 1.89.36.69.875 1.03 1.544 1.03.55 0 1.02-.23 1.41-.69v.52c0 .03.012.05.034.07.023.018.05.026.08.026h1.008a.11.11 0 00.114-.096l.6-4.943a.113.113 0 00-.025-.086.108.108 0 00-.08-.036h-1.02a.11.11 0 00-.11.096l-.046.39c-.34-.478-.79-.716-1.29-.716zm-.19 1.138c.26 0 .478.108.655.324.178.216.267.494.267.834 0 .424-.1.77-.3 1.04-.2.27-.44.404-.722.404-.27 0-.49-.12-.664-.36-.174-.24-.26-.554-.26-.94 0-.41.094-.742.282-.996.188-.253.43-.38.742-.306z"/></svg>,
  fields: [
    { key: 'woocommerce_url', label: 'Store URL', hint: 'https://nationalsalonsupplies.com.au', note: 'Your WooCommerce store domain', secret: false },
    { key: 'woocommerce_key', label: 'Consumer Key', hint: 'ck_...', note: 'WooCommerce → Settings → Advanced → REST API', secret: true },
    { key: 'woocommerce_secret', label: 'Consumer Secret', hint: 'cs_...', note: 'Generated alongside the Consumer Key', secret: true },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ConnectedBadge() {
  return <span className="badge badge-live" style={{ fontSize: 10 }}>● Connected</span>;
}
function NotConnectedBadge() {
  return <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>Not connected</span>;
}
function ConfiguredPill({ count, total }: { count: number; total: number }) {
  if (count === 0) return null;
  const all = count === total;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: all ? '#a8cf45' : '#04aae8', background: all ? 'rgba(168,207,69,0.1)' : 'rgba(4,170,232,0.1)', padding: '2px 8px', borderRadius: 10, border: `1px solid ${all ? 'rgba(168,207,69,0.2)' : 'rgba(4,170,232,0.2)'}` }}>
      {count}/{total} configured
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConnectionsPageWrapper() {
  return <Suspense fallback={null}><ConnectionsPage /></Suspense>;
}

function ConnectionsPage() {
  const [oauthStatus, setOauthStatus] = useState<Record<string, any>>({});
  const [savedKeys, setSavedKeys]     = useState<Record<string, boolean>>({});  // which keys exist in DB
  const [creds, setCreds]             = useState<Record<string, string>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'idle'|'saving'|'saved'|'error'>>({});
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});
  const [googleExpanded, setGoogleExpanded] = useState(false);
  const [wooExpanded, setWooExpanded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadOAuthStatus();
    loadSavedKeys();
    // prefill GSC URLs
    setCreds(c => ({
      ...c,
      gsc_site_main: c.gsc_site_main || 'https://nationalsalonsupplies.com.au/',
      gsc_site_blog: c.gsc_site_blog || 'https://nationalsalonsupplies.com.au/beauty/',
    }));
  }, []);

  async function loadOAuthStatus() {
    const r = await fetch('/api/oauth/status');
    if (r.ok) setOauthStatus(await r.json());
  }

  async function loadSavedKeys() {
    // Fetch which keys are saved (API returns masked values for sensitive, real values for non-sensitive)
    const r = await fetch('/api/admin/keys');
    if (!r.ok) return;
    const data = await r.json();
    const keys = data.keys || {};
    // Mark which services have a value saved
    const exists: Record<string, boolean> = {};
    Object.keys(keys).forEach(k => { exists[k] = true; });
    setSavedKeys(exists);
    // Pre-populate non-sensitive fields with real values
    const prefills: Record<string, string> = {};
    Object.entries(keys).forEach(([k, v]) => {
      if (v !== '••••••••') prefills[k] = v as string;
    });
    setCreds(c => ({ ...prefills, ...c }));
  }

  async function saveField(key: string, value: string) {
    if (!value.trim()) return;
    setFieldStatus(s => ({ ...s, [key]: 'saving' }));
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: key, key_value: value.trim() }),
      });
      if (res.ok) {
        setFieldStatus(s => ({ ...s, [key]: 'saved' }));
        setSavedKeys(k => ({ ...k, [key]: true }));
        setTimeout(() => setFieldStatus(s => ({ ...s, [key]: 'idle' })), 2500);
      } else {
        setFieldStatus(s => ({ ...s, [key]: 'error' }));
        setTimeout(() => setFieldStatus(s => ({ ...s, [key]: 'idle' })), 4000);
      }
    } catch {
      setFieldStatus(s => ({ ...s, [key]: 'error' }));
      setTimeout(() => setFieldStatus(s => ({ ...s, [key]: 'idle' })), 4000);
    }
  }

  async function disconnect(platformId: string) {
    if (!confirm(`Disconnect ${platformId}?`)) return;
    await fetch('/api/oauth/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: platformId }),
    });
    loadOAuthStatus();
  }

  // Individual field save button
  function FieldRow({ fkey, label, hint, note, secret }: { fkey: string; label: string; hint: string; note?: string; secret?: boolean }) {
    const fs = fieldStatus[fkey] || 'idle';
    const isExisting = savedKeys[fkey];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <label className="form-label" style={{ margin: 0 }}>{label}</label>
          {isExisting && fs !== 'saved' && (
            <span style={{ fontSize: 10, color: '#04aae8', fontWeight: 600 }}>● Saved</span>
          )}
          {fs === 'saved' && (
            <span style={{ fontSize: 10, color: '#a8cf45', fontWeight: 700 }}>✓ Saved to system</span>
          )}
          {fs === 'error' && (
            <span style={{ fontSize: 10, color: '#ff6666' }}>✗ Error</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            type={secret ? 'password' : 'text'}
            placeholder={isExisting && secret ? '••••••••  (enter new value to update)' : hint}
            value={creds[fkey] || ''}
            onChange={e => setCreds(c => ({ ...c, [fkey]: e.target.value }))}
            style={{ flex: 1 }}
            autoComplete="off"
          />
          <button
            className="btn btn-pink"
            onClick={() => saveField(fkey, creds[fkey] || '')}
            disabled={fs === 'saving' || !creds[fkey]?.trim()}
            style={{
              fontSize: 11, whiteSpace: 'nowrap', minWidth: 64, padding: '0 12px',
              background: fs === 'saved' ? 'rgba(168,207,69,0.15)' : undefined,
              color: fs === 'saved' ? '#a8cf45' : undefined,
              borderColor: fs === 'saved' ? 'rgba(168,207,69,0.3)' : undefined,
              opacity: (fs !== 'saving' && !creds[fkey]?.trim()) ? 0.35 : 1,
            }}
          >
            {fs === 'saving' ? '…' : fs === 'saved' ? '✓' : 'Save'}
          </button>
        </div>
        {note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{note}</div>}
      </div>
    );
  }

  const successPlatform = searchParams?.get('success');
  const errorPlatform = searchParams?.get('error');
  const callbackBase = typeof window !== 'undefined' ? window.location.origin : '';

  // Count configured fields per section
  const googleConfigured = GOOGLE_SECTION.properties.filter(p => savedKeys[p.key]).length;
  const wooConfigured = WOOCOMMERCE_SECTION.fields.filter(f => savedKeys[f.key]).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Connections</h1>
        <p className="section-sub">Connect all your platforms in one place — OAuth for Google, tokens for Meta, API keys for WooCommerce</p>
      </div>

      {successPlatform && (
        <div style={{ background: 'rgba(168,207,69,0.12)', border: '1px solid rgba(168,207,69,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
          ✓ {successPlatform.charAt(0).toUpperCase() + successPlatform.slice(1)} connected successfully!
        </div>
      )}
      {errorPlatform && (
        <div style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, color: '#ff6b6b', fontSize: 13 }}>
          Connection failed — check credentials and try again. ({errorPlatform})
        </div>
      )}

      {/* ── GOOGLE ── */}
      <div style={{ marginBottom: 8, fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 2px' }}>Google Suite</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: GOOGLE_SECTION.bg, border: `1px solid ${GOOGLE_SECTION.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {GOOGLE_SECTION.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16 }}>Google — Ads + Analytics + Search Console</span>
              {oauthStatus['google']?.connected ? <ConnectedBadge /> : <NotConnectedBadge />}
              <ConfiguredPill count={googleConfigured} total={GOOGLE_SECTION.properties.length} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              One OAuth flow covers: Google Ads (ROAS/spend) · GA4 (traffic/revenue) · Search Console × 2 properties
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {oauthStatus['google']?.connected ? (
              <>
                <a href="/api/oauth/google" className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none' }}>↻ Reconnect</a>
                <button onClick={() => disconnect('google')} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}>Disconnect</button>
              </>
            ) : (
              <button onClick={() => setGoogleExpanded(e => !e)} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>
                {googleExpanded ? '✕ Cancel' : '⚙ Set Up & Connect'}
              </button>
            )}
          </div>
        </div>

        {googleExpanded && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
            <div className="grid-2" style={{ gap: 28 }}>
              {/* Steps */}
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Setup Steps</div>
                <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {GOOGLE_SECTION.setupSteps.map((step, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(66,133,244,0.15)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step}</span>
                    </li>
                  ))}
                </ol>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>Authorized Redirect URI (add this to Google Cloud):</div>
                  <code style={{ color: 'var(--yellow)', fontSize: 11, wordBreak: 'break-all' }}>{callbackBase}/api/oauth/callback/google</code>
                </div>
              </div>

              {/* Credentials + Properties */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>OAuth Credentials</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {GOOGLE_SECTION.envVars.map(env => (
                      <FieldRow key={env.key} fkey={env.key} label={env.label} hint={env.hint} secret={env.secret} />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Property IDs & Sites</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {GOOGLE_SECTION.properties.map(prop => (
                      <FieldRow key={prop.key} fkey={prop.key} label={prop.label} hint={prop.hint} note={prop.note} secret={false} />
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <a href="/api/oauth/google" className="btn btn-pink" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Connect Google →
                  </a>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Save your IDs above first, then click Connect Google to authorise all Google services at once.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connected: show property summary inline */}
        {oauthStatus['google']?.connected && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 24px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: googleConfigured < GOOGLE_SECTION.properties.length ? 14 : 0 }}>
              {GOOGLE_SECTION.properties.map(prop => (
                <div key={prop.key} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>{prop.label.split('—').pop()?.trim() || prop.label}:</span>
                  {savedKeys[prop.key]
                    ? <span style={{ color: '#a8cf45', fontSize: 11 }}>✓</span>
                    : <span style={{ color: '#666', fontSize: 11 }}>—</span>}
                </div>
              ))}
            </div>
            {/* Inline edit for missing properties when connected */}
            {googleConfigured < GOOGLE_SECTION.properties.length && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {GOOGLE_SECTION.properties.filter(p => !savedKeys[p.key]).map(prop => (
                  <FieldRow key={prop.key} fkey={prop.key} label={prop.label} hint={prop.hint} note={prop.note} secret={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AD PLATFORMS ── */}
      <div style={{ marginBottom: 8, fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 2px' }}>Ad Platforms</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {AD_PLATFORMS.map(p => {
          const s = oauthStatus[p.id] || { connected: false };
          const isExpanded = expanded[p.id];
          const platformConfigured = p.envVars.filter(e => savedKeys[e.key]).length;

          return (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: p.bg, border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15 }}>{p.name}</span>
                    {s.connected ? <ConnectedBadge /> : <NotConnectedBadge />}
                    <ConfiguredPill count={platformConfigured} total={p.envVars.length} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {s.connected ? (
                    <>
                      <a href={`/api/oauth/${p.id}`} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', textDecoration: 'none' }}>↻ Reconnect</a>
                      <button onClick={() => disconnect(p.id)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}>Disconnect</button>
                    </>
                  ) : (
                    <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !isExpanded }))} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                      {isExpanded ? '✕ Cancel' : '⚙ Set Up'}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="grid-2" style={{ gap: 24 }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Setup Steps</div>
                      <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {p.setupSteps.map((step, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${p.color}20`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                            <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step}</span>
                          </li>
                        ))}
                      </ol>
                      {!(p as any).tokenPaste && (
                        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11 }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Callback URL: </span>
                          <code style={{ color: 'var(--yellow)', wordBreak: 'break-all' }}>{callbackBase}/api/oauth/callback/{p.id}</code>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {(p as any).tokenPaste ? 'Access Token & IDs' : 'Credentials'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        {p.envVars.map(env => (
                          <FieldRow key={env.key} fkey={env.key} label={env.label} hint={env.hint} secret={env.secret} />
                        ))}
                      </div>
                      {!(p as any).tokenPaste && (
                        <a href={`/api/oauth/${p.id}`} className="btn btn-pink" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Connect via OAuth →
                        </a>
                      )}
                      {(p as any).tokenPaste && (
                        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                          Meta&apos;s Marketing API requires app review for OAuth. Use a System User token above — it never expires and works immediately.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── WOOCOMMERCE ── */}
      <div style={{ marginBottom: 8, fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 2px' }}>E-Commerce</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: WOOCOMMERCE_SECTION.bg, border: `1px solid ${WOOCOMMERCE_SECTION.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {WOOCOMMERCE_SECTION.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15 }}>WooCommerce</span>
              {wooConfigured === WOOCOMMERCE_SECTION.fields.length ? <ConnectedBadge /> : <NotConnectedBadge />}
              <ConfiguredPill count={wooConfigured} total={WOOCOMMERCE_SECTION.fields.length} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Revenue, orders & product data via REST API</div>
          </div>
          <button onClick={() => setWooExpanded(e => !e)} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
            {wooExpanded ? '✕ Done' : wooConfigured > 0 ? '✎ Edit' : '⚙ Set Up'}
          </button>
        </div>

        {wooExpanded && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', background: 'rgba(255,255,255,0.02)' }}>
            <div className="grid-2" style={{ gap: 24 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How to get API keys</div>
                <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    'Log in to your WordPress admin',
                    'Go to WooCommerce → Settings → Advanced → REST API',
                    'Click "Add key" → set permissions to Read',
                    'Copy the Consumer Key and Consumer Secret',
                  ].map((step, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(150,88,138,0.15)', color: '#96588A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Credentials</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {WOOCOMMERCE_SECTION.fields.map(f => (
                    <FieldRow key={f.key} fkey={f.key} label={f.label} hint={f.hint} note={f.note} secret={f.secret} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="card" style={{ marginTop: 4 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>How it works</span> — Each field saves individually. Once a credential is saved, the relevant dashboard module switches from demo to live data automatically. Google&apos;s single OAuth flow covers Ads, GA4, and both Search Console properties.
        </div>
      </div>
    </div>
  );
}
