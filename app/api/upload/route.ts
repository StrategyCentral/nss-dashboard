import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// ── CSV Parsers ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Handle BOM
  const header = lines[0].replace(/^\uFEFF/, '');
  const headers = header.split(',').map(h => h.replace(/^"|"$/g, '').trim());

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());

    return headers.reduce((obj, h, i) => {
      obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim();
      return obj;
    }, {} as Record<string, string>);
  });
}

function parseFacebookAds(rows: Record<string, string>[]) {
  // Meta Ads Manager CSV column names (they vary by export type)
  const getField = (row: Record<string, string>, ...keys: string[]) => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (found && row[found]) return row[found];
    }
    return '0';
  };

  const campaigns = rows.map(row => {
    const name = getField(row, 'Campaign name', 'Campaign', 'Ad Set Name', 'Ad set name');
    const spend = parseFloat(getField(row, 'Amount spent', 'Spend', 'Cost').replace(/[^0-9.]/g, '') || '0');
    const purchases = parseFloat(getField(row, 'Purchases', 'Results', 'Conversions').replace(/[^0-9.]/g, '') || '0');
    const purchaseValue = parseFloat(getField(row, 'Purchase conversion value', 'Revenue', 'Conversion value').replace(/[^0-9.]/g, '') || '0');
    const clicks = parseFloat(getField(row, 'Link clicks', 'Clicks').replace(/[^0-9.]/g, '') || '0');
    const impressions = parseFloat(getField(row, 'Impressions').replace(/[^0-9.]/g, '') || '0');
    const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;

    return { name, spend, revenue: purchaseValue, roas: parseFloat(roas.toFixed(2)), conversions: Math.round(purchases), clicks: Math.round(clicks), impressions: Math.round(impressions), cpc: parseFloat(cpc.toFixed(2)) };
  }).filter(c => c.name && c.spend > 0);

  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    revenue: acc.revenue + c.revenue,
    conversions: acc.conversions + c.conversions,
    clicks: acc.clicks + c.clicks,
  }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 });

  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

  return {
    spend: Math.round(totals.spend),
    revenue: Math.round(totals.revenue),
    roas: parseFloat(roas.toFixed(2)),
    conversions: totals.conversions,
    cpc: parseFloat(cpc.toFixed(2)),
    campaigns: campaigns.slice(0, 20),
    monthly: [], // not available from campaign export
    uploadedAt: new Date().toISOString(),
  };
}

function parseGoogleAds(rows: Record<string, string>[]) {
  const getField = (row: Record<string, string>, ...keys: string[]) => {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
      if (found && row[found]) return row[found];
    }
    return '0';
  };

  const campaigns = rows.map(row => {
    const name = getField(row, 'Campaign', 'Campaign name');
    const spend = parseFloat(getField(row, 'Cost', 'Spend', 'Amount spent').replace(/[^0-9.]/g, '') || '0');
    const conversions = parseFloat(getField(row, 'Conversions').replace(/[^0-9.]/g, '') || '0');
    const convValue = parseFloat(getField(row, 'Conv. value', 'Conversion value', 'Revenue').replace(/[^0-9.]/g, '') || '0');
    const clicks = parseFloat(getField(row, 'Clicks').replace(/[^0-9.]/g, '') || '0');
    const impressions = parseFloat(getField(row, 'Impressions').replace(/[^0-9.]/g, '') || '0');
    const roas = spend > 0 && convValue > 0 ? convValue / spend : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;

    return { name, spend, revenue: convValue, roas: parseFloat(roas.toFixed(2)), conversions: Math.round(conversions), clicks: Math.round(clicks), impressions: Math.round(impressions), cpc: parseFloat(cpc.toFixed(2)) };
  }).filter(c => c.name && c.spend > 0);

  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    revenue: acc.revenue + c.revenue,
    conversions: acc.conversions + c.conversions,
    clicks: acc.clicks + c.clicks,
  }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 });

  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

  return {
    spend: Math.round(totals.spend),
    revenue: Math.round(totals.revenue),
    roas: parseFloat(roas.toFixed(2)),
    conversions: totals.conversions,
    cpc: parseFloat(cpc.toFixed(2)),
    campaigns: campaigns.slice(0, 20),
    monthly: [],
    uploadedAt: new Date().toISOString(),
  };
}

// ── Init upload table ─────────────────────────────────────────────────────────
function initUploadTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS uploaded_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    data TEXT NOT NULL,
    filename TEXT,
    uploaded_at TEXT DEFAULT (datetime('now'))
  )`);
}

// ── POST: upload CSV ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const platform = formData.get('platform') as string || 'facebook';

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length === 0) return NextResponse.json({ error: 'Could not parse CSV — check the file format' }, { status: 400 });

  let parsed;
  try {
    if (platform === 'facebook') parsed = parseFacebookAds(rows);
    else if (platform === 'google') parsed = parseGoogleAds(rows);
    else return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Parse error: ' + e.message }, { status: 400 });
  }

  if (parsed.campaigns.length === 0) {
    return NextResponse.json({ error: 'No campaign data found — make sure you exported a Campaigns report' }, { status: 400 });
  }

  // Save to DB
  try {
    const db = getDb();
    initUploadTable(db);
    db.prepare('INSERT OR REPLACE INTO uploaded_data (platform, data, filename) VALUES (?,?,?)').run(
      platform, JSON.stringify(parsed), file.name
    );
  } catch (e: any) {
    console.error('DB save error:', e.message);
  }

  return NextResponse.json({ ok: true, platform, campaigns: parsed.campaigns.length, spend: parsed.spend, revenue: parsed.revenue, roas: parsed.roas, uploadedAt: parsed.uploadedAt });
}

// ── GET: retrieve uploaded data ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'facebook';

  try {
    const db = getDb();
    initUploadTable(db);
    const row = db.prepare('SELECT * FROM uploaded_data WHERE platform = ? ORDER BY uploaded_at DESC LIMIT 1').get(platform) as any;
    if (!row) return NextResponse.json({ data: null });
    return NextResponse.json({ data: JSON.parse(row.data), filename: row.filename, uploadedAt: row.uploaded_at });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'facebook';

  try {
    const db = getDb();
    db.prepare('DELETE FROM uploaded_data WHERE platform = ?').run(platform);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
