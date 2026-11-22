'use client';
import { useEffect, useState } from 'react';

/**
 * Shows another ACE app inside the suite, with a way out to full screen.
 * `compact` is for use inside a page that already has its own title (an SEO tab).
 * `origin` is the app's own address: status messages are accepted from it only.
 */
export default function LinkedAppFrame({ slug, name, blurb, accent, compact, origin }: {
  slug: string; name: string; blurb: string; accent: string; compact?: boolean; origin?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/apps/${slug}/launch`;

  // Tube Stats tells us when a Google account is connected inside it, so
  // Settings → Connections can show which channel is linked.
  useEffect(() => {
    if (!origin) return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || !e.data || e.data.type !== 'ace-tube:google') return;
      fetch(`/api/apps/${slug}/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: !!e.data.connected, channelId: e.data.channelId, title: e.data.title }),
      }).catch(() => {});
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin, slug]);

  const openButton = (
    <a href={src} target="_blank" rel="noopener" style={{
      flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6, textDecoration: 'none',
      background: `${accent}18`, color: accent, border: `1px solid ${accent}44`,
    }}>Open full screen ↗</a>
  );

  return (
    <div>
      {compact ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <p className="section-sub" style={{ margin: 0 }}>{blurb}</p>
          {openButton}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <h1 className="section-title" style={{ fontSize: 26 }}>{name}</h1>
            <p className="section-sub">{blurb}</p>
          </div>
          {openButton}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `3px solid ${accent}`, position: 'relative' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Opening {name}…
          </div>
        )}
        <iframe
          title={name}
          src={src}
          onLoad={() => setLoaded(true)}
          allow="clipboard-write; fullscreen"
          style={{ display: 'block', width: '100%', height: compact ? 'calc(100vh - 230px)' : 'calc(100vh - 170px)', minHeight: 560, border: 0, background: 'transparent' }}
        />
      </div>
    </div>
  );
}
