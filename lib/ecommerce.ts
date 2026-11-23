/**
 * Ecommerce: the merchant centres a website sells through (Google Merchant
 * Center, Meta Commerce, TikTok Shop, ...) and the product feeds that fill them.
 * Both live in the website's own database, so the Account switcher switches them.
 */
import { safeFetch, UnsafeUrlError } from './safe-fetch';

export type PlatformKey = 'google' | 'microsoft' | 'meta' | 'tiktok' | 'pinterest' | 'amazon' | 'ebay' | 'other';

export const PLATFORMS: Record<PlatformKey, { name: string; idLabel: string; color: string; console: (id: string) => string }> = {
  google:    { name: 'Google Merchant Center',    idLabel: 'Merchant ID', color: '#a8cf45', console: id => id ? `https://merchants.google.com/mc/overview?a=${encodeURIComponent(id)}` : 'https://merchants.google.com/' },
  microsoft: { name: 'Microsoft Merchant Center', idLabel: 'Store ID',    color: '#04aae8', console: () => 'https://ads.microsoft.com/' },
  meta:      { name: 'Meta Commerce Manager',     idLabel: 'Catalog ID',  color: '#4f7cff', console: id => id ? `https://business.facebook.com/commerce/catalogs/${encodeURIComponent(id)}` : 'https://business.facebook.com/commerce/' },
  tiktok:    { name: 'TikTok Shop',               idLabel: 'Shop ID',     color: '#69C9D0', console: () => 'https://seller.tiktokshop.com/' },
  pinterest: { name: 'Pinterest Catalogs',        idLabel: 'Account ID',  color: '#ff1e8e', console: () => 'https://www.pinterest.com/business/catalogs/' },
  amazon:    { name: 'Amazon Seller Central',     idLabel: 'Seller ID',   color: '#ff8c00', console: () => 'https://sellercentral.amazon.com.au/' },
  ebay:      { name: 'eBay Seller Hub',           idLabel: 'Username',    color: '#e53238', console: () => 'https://www.ebay.com.au/sh/ovw' },
  other:     { name: 'Other',                     idLabel: 'Account ID',  color: '#888888', console: () => '' },
};

export const STATUSES = ['Active', 'Setting up', 'Under review', 'Suspended', 'Paused'] as const;

export function isPlatform(v: unknown): v is PlatformKey {
  return typeof v === 'string' && v in PLATFORMS;
}

export function initEcommerceSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS merchant_centres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      account_ref TEXT NOT NULL DEFAULT '',
      console_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Setting up',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS product_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      merchant_id INTEGER,
      last_check TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/** Where "Open" goes: the saved link, else the platform's console for that ID. */
export function consoleUrl(m: { platform: string; account_ref: string; console_url: string }): string {
  if (m.console_url) return m.console_url;
  return isPlatform(m.platform) ? PLATFORMS[m.platform].console(m.account_ref) : '';
}

/** A link someone typed in: must be a plain http(s) URL. Returns '' when it is not. */
export function cleanLink(raw: unknown): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

// ── Feed check ───────────────────────────────────────────────────────────────

/** What Google Shopping wants on every product. `ids` = GTIN or MPN, either counts. */
export const FEED_FIELDS = [
  { key: 'id',                      label: 'ID',               required: true },
  { key: 'title',                   label: 'Title',            required: true },
  { key: 'description',             label: 'Description',      required: true },
  { key: 'link',                    label: 'Link',             required: true },
  { key: 'image_link',              label: 'Image',            required: true },
  { key: 'price',                   label: 'Price',            required: true },
  { key: 'availability',            label: 'Availability',     required: true },
  { key: 'brand',                   label: 'Brand',            required: true },
  { key: 'ids',                     label: 'GTIN or MPN',      required: true },
  { key: 'condition',               label: 'Condition',        required: false },
  { key: 'google_product_category', label: 'Google category',  required: false },
  { key: 'sale_price',              label: 'Sale price',       required: false },
] as const;

export type FeedCheck = {
  checked_at: string;
  ok: boolean;
  error?: string;
  http_status?: number;
  bytes?: number;
  format?: 'xml' | 'csv' | 'tsv';
  products: number;
  unique_ids: number;
  coverage: Record<string, number>; // field key -> products that have it
  score: number;                    // 0-100: share of required fields filled, across all products
};

const MAX_BYTES = 80 * 1024 * 1024;
const TIMEOUT_MS = 45_000;

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error('Feed is bigger than 80 MB; check it in the merchant centre instead.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
}

function hasTag(block: string, tag: string): boolean {
  // <g:brand>Acme</g:brand>, <brand>Acme</brand>, <g:brand><![CDATA[Acme]]></g:brand>
  const re = new RegExp(`<(?:g:)?${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[\\s*)?[^<\\s\\]]`, 'i');
  return re.test(block);
}

function tagValue(block: string, tag: string): string {
  const m = block.match(new RegExp(`<(?:g:)?${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[)?\\s*([^<\\]]*)`, 'i'));
  return (m?.[1] || '').trim();
}

function checkXml(text: string) {
  const blocks = text.match(/<item[\s>][\s\S]*?<\/item>/gi) || text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const coverage: Record<string, number> = Object.fromEntries(FEED_FIELDS.map(f => [f.key, 0]));
  const ids = new Set<string>();
  for (const b of blocks) {
    for (const f of FEED_FIELDS) {
      if (f.key === 'ids') { if (hasTag(b, 'gtin') || hasTag(b, 'mpn')) coverage.ids++; continue; }
      if (f.key === 'image_link') { if (hasTag(b, 'image_link')) coverage.image_link++; continue; }
      // Atom feeds put the link in an attribute: <link href="..."/>
      if (f.key === 'link') { if (hasTag(b, 'link') || /<link\s[^>]*href=/i.test(b)) coverage.link++; continue; }
      if (hasTag(b, f.key)) coverage[f.key]++;
    }
    const id = tagValue(b, 'id');
    if (id) ids.add(id);
  }
  return { products: blocks.length, unique_ids: ids.size, coverage };
}

function splitRow(line: string, sep: string): string[] {
  if (sep === '\t') return line.split('\t');
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

function checkDelimited(text: string, sep: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const head = splitRow(lines[0] || '', sep).map(h => h.trim().toLowerCase().replace(/^g:/, '').replace(/\s+/g, '_'));
  const col = (k: string) => head.indexOf(k);
  const coverage: Record<string, number> = Object.fromEntries(FEED_FIELDS.map(f => [f.key, 0]));
  const ids = new Set<string>();
  for (const line of lines.slice(1)) {
    const cells = splitRow(line, sep);
    const filled = (k: string) => { const i = col(k); return i >= 0 && !!(cells[i] || '').trim(); };
    for (const f of FEED_FIELDS) {
      if (f.key === 'ids') { if (filled('gtin') || filled('mpn')) coverage.ids++; continue; }
      if (filled(f.key)) coverage[f.key]++;
    }
    const i = col('id');
    if (i >= 0 && cells[i]?.trim()) ids.add(cells[i].trim());
  }
  return { products: Math.max(0, lines.length - 1), unique_ids: ids.size, coverage };
}

/** Counts products and field coverage in a feed file's text. */
export function scoreFeedText(text: string, contentType = '') {
  const looksXml = /^\s*(?:\uFEFF)?</.test(text) || contentType.toLowerCase().includes('xml');
  let format: NonNullable<FeedCheck['format']>;
  let parsed: { products: number; unique_ids: number; coverage: Record<string, number> };
  if (looksXml) { format = 'xml'; parsed = checkXml(text); }
  else {
    const first = text.split(/\r?\n/, 1)[0] || '';
    format = first.includes('\t') ? 'tsv' : 'csv';
    parsed = checkDelimited(text, format === 'tsv' ? '\t' : ',');
  }
  const required = FEED_FIELDS.filter(f => f.required);
  const score = parsed.products
    ? Math.round(100 * required.reduce((s, f) => s + (parsed.coverage[f.key] || 0), 0) / (required.length * parsed.products))
    : 0;
  return { format, ...parsed, score };
}

export async function checkFeed(url: string): Promise<FeedCheck> {
  const checked_at = new Date().toISOString();
  const empty = { products: 0, unique_ids: 0, coverage: {}, score: 0 };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await safeFetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'ACE-Marketing-Suite-FeedCheck/1.0', Accept: '*/*' } }, { allowHttp: true });
    if (!res.ok) return { checked_at, ok: false, http_status: res.status, error: `The feed URL answered ${res.status}.`, ...empty };
    const text = await readCapped(res);
    const parsed = scoreFeedText(text, res.headers.get('content-type') || '');
    return {
      checked_at, ok: parsed.products > 0, http_status: res.status, bytes: Buffer.byteLength(text), ...parsed,
      ...(parsed.products ? {} : { error: 'No products found. Is this the feed file itself (XML, CSV or TSV), not a web page?' }),
    };
  } catch (e: any) {
    const error = e instanceof UnsafeUrlError ? `That URL can't be checked: ${e.message}.`
      : e?.name === 'AbortError' ? 'The feed took longer than 45 seconds to download.'
      : e?.message || 'Could not download the feed.';
    return { checked_at, ok: false, error, ...empty };
  } finally {
    clearTimeout(timer);
  }
}
