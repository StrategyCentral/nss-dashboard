'use client';
// Small pieces shared by the SEO tools (Site Audit, Research, Backlink Profile, Rank Tracker).
import type { CSSProperties, ReactNode } from 'react';

export const COUNTRIES = [
  { code: 2036, label: 'Australia' },
  { code: 2840, label: 'United States' },
  { code: 2826, label: 'United Kingdom' },
  { code: 2124, label: 'Canada' },
  { code: 2554, label: 'New Zealand' },
];

export function countryLabel(code: number): string {
  return COUNTRIES.find((country) => country.code === code)?.label ?? (code ? `Location ${code}` : 'Worldwide');
}

export function usd(value: number | null | undefined, digits = 2): string {
  return `US$${(value ?? 0).toFixed(digits)}`;
}

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; show it in the viewer's time. */
export function when(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function slug(text: string): string {
  return text.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'export';
}

export const SMALL_BTN: CSSProperties = { fontSize: 12, padding: '7px 14px' };
export const SELECT_STYLE: CSSProperties = { width: 'auto', minWidth: 150, cursor: 'pointer' };

export function Notice({ tone, children }: { tone: 'error' | 'warn' | 'ok' | 'info'; children: ReactNode }) {
  const color = { error: '#ff6b6b', warn: 'var(--yellow)', ok: 'var(--green)', info: 'var(--blue)' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'}
      style={{ border: `1px solid ${color}`, borderRadius: 10, padding: '11px 16px', fontSize: 13, color, background: 'rgba(255,255,255,0.02)', lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className="value" style={{ color: color ?? 'var(--text)' }}>{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function Pill({ active, color = '#a8cf45', onClick, children }: { active: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{
        padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
        background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: active ? `1px solid ${color}44` : '1px solid var(--border)',
        color: active ? color : 'var(--muted)',
      }}>
      {children}
    </button>
  );
}

/** Shown wherever a tool needs DataForSEO and it has not been connected. */
export function NotConnected() {
  return (
    <Notice tone="warn">
      This needs DataForSEO, which is not connected yet. An admin can add the API login and API password under{' '}
      <a href="/admin/connections" style={{ color: 'inherit', textDecoration: 'underline' }}>Admin → Connections</a>.
    </Notice>
  );
}

export function SpendLine({ monthSpendUsd }: { monthSpendUsd: number | null }) {
  if (monthSpendUsd === null) return null;
  return <span style={{ fontSize: 12, color: 'var(--muted)' }}>DataForSEO spend this month: <strong style={{ color: 'var(--text)' }}>{usd(monthSpendUsd)}</strong></span>;
}

export function TableWrap({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return <div style={{ overflowX: 'auto' }}><div style={{ minWidth }}>{children}</div></div>;
}
