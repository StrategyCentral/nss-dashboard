'use client';
import { useState } from 'react';

/** Shows another ACE app inside the suite, with a way out to full screen. */
export default function LinkedAppFrame({ slug, name, blurb, accent }: { slug: string; name: string; blurb: string; accent: string }) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/apps/${slug}/launch`;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>{name}</h1>
          <p className="section-sub">{blurb}</p>
        </div>
        <a href={src} target="_blank" rel="noopener" style={{
          flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 6, textDecoration: 'none',
          background: `${accent}18`, color: accent, border: `1px solid ${accent}44`,
        }}>Open full screen ↗</a>
      </div>
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
          style={{ display: 'block', width: '100%', height: 'calc(100vh - 170px)', minHeight: 560, border: 0, background: 'transparent' }}
        />
      </div>
    </div>
  );
}
