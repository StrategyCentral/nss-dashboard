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
    setupSteps: ['Go to developers.facebook.com → My Apps → Create App', 'Choose "Business" type → name it "NSS Dashboard"', 'Add "Marketing API" use case in app settings', 'Copy App ID + App Secret below → Save → Connect'],
    envVars: [{ key: 'facebook_app_id', label: 'App ID', hint: '1234567890' }, { key: 'facebook_app_secret', label: 'App Secret', hint: 'abc123...', secret: true }],
    scopes: 'ads_read, ads_management, business_management',
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
    envVars: [{ key: 'tiktok_app_id', label: 'App ID', hint: '7123456789' }, { key: 'tiktok_app_secret', label: 'App Secret', hint: 'abc...', secret: true }],
    scopes: 'advertiser_info, ad.read, report.read',
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
    envVars: [{ key: 'linkedin_client_id', label: 'Client ID', hint: '86abcd...' }, { key: 'linkedin_client_secret', label: 'Client Secret', hint: 'WjAB...', secret: true }],
    scopes: 'r_ads, r_ads_reporting, rw_ads',
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
    { key: 'google_client_id', label: 'OAuth Client ID', hint: '123...apps.googleusercontent.com' },
    { key: 'google_client_secret', label: 'OAuth Client Secret', hint: 'GOCSPX-...', secret: true },
  ],
  properties: [
    { key: 'google_ads_customer_id', label: 'Google Ads Customer ID', hint: '123-456-7890', note: 'Found in Google Ads top-right corner' },
    { key: 'ga4_property_id', label: 'GA4 Property ID', hint: '123456789', note: 'GA4 → Admin → Property Settings' },
    { key: 'gsc_site_main', label: 'Search Console — Main Site', hint: 'https://nationalsalonsupplies.com.au/', note: 'Must match exactly as shown in GSC', prefill: 'https://nationalsalonsupplies.com.au/' },
    { key: 'gsc_site_blog', label: 'Search Console — Blog', hint: 'https://nationalsalonsupplies.com.au/beauty/', note: 'Subfolder property in GSC', prefill: 'https://nationalsalonsupplies.com.au/beauty/' },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConnectionsPageWrapper() {
  return <Suspense fallback={null}><ConnectionsPage /></Suspense>;
}

function ConnectionsPage() {
  const [status, setStatus] = useState<Record<string, any>>({});
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [googleExpanded, setGoogleExpanded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadStatus();
    // pre-fill GSC URLs
    setCreds(c => ({
      ...c,
      gsc_site_main: c.gsc_site_main || 'https://nationalsalonsupplies.com.au/',
      gsc_site_blog: c.gsc_site_blog || 'https://nationalsalonsupplies.com.au/beauty/',
    }));
  }, []);

  async function loadStatus() {
    const r = await fetch('/api/oauth/status');
    if (r.ok) setStatus(await r.json());
  }

  async function saveCred(key: string, value: string) {
    await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: key, key_name: key, key_value: value }),
    });
  }

  async function saveAll() {
    setSaving(true);
    const toSave = Object.entries(creds).filter(([, v]) => v.trim());
    for (const [key, value] of toSave) {
      await saveCred(key, value);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function disconnect(platformId: string) {
    if (!confirm(`Disconnect ${platformId}?`)) return;
    await fetch('/api/oauth/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: platformId }),
    });
    loadStatus();
  }

  const successPlatform = searchParams?.get('success');
  const errorPlatform = searchParams?.get('error');
  const callbackBase = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ fontSize: 26 }}>Platform Connections</h1>
        <p className="section-sub">Connect all your ad platforms & analytics via OAuth — one click per platform</p>
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

      {/* ── GOOGLE — covers Ads + GA4 + GSC (2 properties) ── */}
      <div style={{ marginBottom: 10, fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 2px' }}>Google Suite</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: GOOGLE_SECTION.bg, border: `1px solid ${GOOGLE_SECTION.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {GOOGLE_SECTION.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16 }}>Google — Ads + Analytics + Search Console</span>
              {status['google']?.connected ? (
                <span className="badge badge-live">● Connected</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>Not connected</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              One OAuth flow covers: Google Ads (ROAS/spend) · GA4 (traffic/revenue) · Search Console × 2 properties
            </div>
            {status['google']?.connected && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Connected {new Date(status['google'].updated_at).toLocaleDateString('en-AU')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {status['google']?.connected ? (
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

        {/* Expand */}
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

              {/* Credentials */}
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>OAuth Credentials</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {GOOGLE_SECTION.envVars.map(env => (
                    <div key={env.key}>
                      <label className="form-label">{env.label}</label>
                      <input className="form-input" type={env.secret ? 'password' : 'text'} placeholder={env.hint}
                        value={creds[env.key] || ''} onChange={e => setCreds(c => ({ ...c, [env.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>

                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Property IDs & Sites</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {GOOGLE_SECTION.properties.map(prop => (
                    <div key={prop.key}>
                      <label className="form-label">{prop.label}</label>
                      <input className="form-input" type="text" placeholder={prop.hint}
                        value={creds[prop.key] ?? (prop.prefill || '')}
                        onChange={e => setCreds(c => ({ ...c, [prop.key]: e.target.value }))} />
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{prop.note}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={saveAll} className="btn btn-ghost" disabled={saving}
                    style={{ fontSize: 12, background: saved ? 'rgba(168,207,69,0.15)' : undefined, color: saved ? 'var(--green)' : undefined }}>
                    {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save All'}
                  </button>
                  <a href="/api/oauth/google" className="btn btn-pink" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Connect Google →
                  </a>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>Save first, then click Connect Google to authorise all Google services at once.</p>
              </div>
            </div>
          </div>
        )}

        {/* Connected summary */}
        {status['google']?.connected && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 24px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Google Ads', key: 'google_ads_customer_id' },
              { label: 'GA4', key: 'ga4_property_id' },
              { label: 'GSC — Main', key: 'gsc_site_main' },
              { label: 'GSC — Blog', key: 'gsc_site_blog' },
            ].map(item => (
              <div key={item.key} style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>{item.label}: </span>
                <span className="badge badge-live" style={{ fontSize: 10 }}>✓ Configured</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AD PLATFORMS ── */}
      <div style={{ marginBottom: 10, fontSize: 11, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', padding: '0 2px' }}>Ad Platforms</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AD_PLATFORMS.map(p => {
          const s = status[p.id] || { connected: false };
          const isExpanded = expanded[p.id];

          return (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: p.bg, border: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15 }}>{p.name}</span>
                    {s.connected ? <span className="badge badge-live">● Connected</span> : <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>Not connected</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
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
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11 }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>Callback URL: </span>
                        <code style={{ color: 'var(--yellow)', wordBreak: 'break-all' }}>{callbackBase}/api/oauth/callback/{p.id}</code>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Credentials</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        {p.envVars.map(env => (
                          <div key={env.key}>
                            <label className="form-label">{env.label}</label>
                            <input className="form-input" type={env.secret ? 'password' : 'text'} placeholder={env.hint}
                              value={creds[env.key] || ''} onChange={e => setCreds(c => ({ ...c, [env.key]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={saveAll} className="btn btn-ghost" disabled={saving}
                          style={{ fontSize: 12, background: saved ? 'rgba(168,207,69,0.15)' : undefined, color: saved ? 'var(--green)' : undefined }}>
                          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
                        </button>
                        <a href={`/api/oauth/${p.id}`} className="btn btn-pink" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          Connect {p.name.split(' ')[0]} →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>How it works</span> &mdash; Click &ldquo;Set Up&rdquo; &rarr; enter your app credentials &rarr; Save &rarr; click Connect. You&apos;ll be redirected to the platform to authorise access. Once connected, the token is stored securely and the relevant dashboard modules switch from demo data to live data automatically. Google&apos;s single OAuth flow covers Ads, GA4, and <span style={{ color: 'var(--text)' }}>both Search Console properties</span> ({' '}
          <code style={{ fontSize: 11, color: 'var(--blue)' }}>nationalsalonsupplies.com.au</code> and{' '}
          <code style={{ fontSize: 11, color: 'var(--blue)' }}>nationalsalonsupplies.com.au/beauty</code>).
        </div>
      </div>
    </div>
  );
}
