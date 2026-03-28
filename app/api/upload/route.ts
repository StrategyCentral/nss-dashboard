import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function initUploadTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS uploaded_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'campaign',
    data TEXT NOT NULL,
    filename TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    UNIQUE(platform, level)
  )`);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].replace(/^\uFEFF/, '');
  const headers = header.split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '', inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += char; }
    }
    values.push(current.trim());
    return headers.reduce((obj, h, i) => { obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim(); return obj; }, {} as Record<string, string>);
  });
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g,'').includes(key.toLowerCase().replace(/\s/g,'')));
    if (found && row[found]) return row[found];
  }
  return '';
}

function detectLevel(rows: Record<string, string>[]): 'campaign' | 'adset' | 'ad' {
  if (!rows.length) return 'campaign';
  const keys = Object.keys(rows[0]).map(k => k.toLowerCase());
  if (keys.some(k => k.includes('ad name') || k === 'ad')) return 'ad';
  if (keys.some(k => k.includes('ad set') || k.includes('adset'))) return 'adset';
  return 'campaign';
}

function parseFacebook(rows: Record<string, string>[], level: string) {
  return rows.map(row => {
    const campaign = getField(row, 'Campaign name', 'Campaign');
    const adset = getField(row, 'Ad Set Name', 'Ad set name', 'Adset name');
    const ad = getField(row, 'Ad Name', 'Ad name');
    const spend = parseFloat(getField(row, 'Amount spent', 'Spend', 'Cost').replace(/[^0-9.]/g, '') || '0');
    const purchases = parseFloat(getField(row, 'Purchases', 'Results', 'Conversions').replace(/[^0-9.]/g, '') || '0');
    const purchaseValue = parseFloat(getField(row, 'Purchase conversion value', 'Revenue', 'Conversion value', 'Purchase value').replace(/[^0-9.]/g, '') || '0');
    const clicks = parseFloat(getField(row, 'Link clicks', 'Clicks').replace(/[^0-9.]/g, '') || '0');
    const impressions = parseFloat(getField(row, 'Impressions').replace(/[^0-9.]/g, '') || '0');
    const reach = parseFloat(getField(row, 'Reach').replace(/[^0-9.]/g, '') || '0');
    const frequency = parseFloat(getField(row, 'Frequency').replace(/[^0-9.]/g, '') || '0');
    const ctr = parseFloat(getField(row, 'CTR', 'Link CTR').replace(/[^0-9.]/g, '') || '0');
    const cpc = clicks > 0 ? spend / clicks : 0;
    const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return { campaign, adset, ad, spend, revenue: purchaseValue, roas: parseFloat(roas.toFixed(2)), conversions: Math.round(purchases), clicks: Math.round(clicks), impressions: Math.round(impressions), reach: Math.round(reach), frequency: parseFloat(frequency.toFixed(2)), ctr: parseFloat(ctr.toFixed(2)), cpc: parseFloat(cpc.toFixed(2)), cpa: parseFloat(cpa.toFixed(2)) };
  }).filter(r => (r.campaign || r.adset || r.ad) && r.spend > 0);
}

function aggregateFacebook(rows: ReturnType<typeof parseFacebook>, level: string) {
  // Group into campaigns → adsets → ads structure
  const campaigns: Record<string, any> = {};

  for (const row of rows) {
    const cKey = row.campaign || 'Unknown Campaign';
    if (!campaigns[cKey]) campaigns[cKey] = { name: cKey, spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, adsets: {} };
    campaigns[cKey].spend += row.spend;
    campaigns[cKey].revenue += row.revenue;
    campaigns[cKey].conversions += row.conversions;
    campaigns[cKey].clicks += row.clicks;
    campaigns[cKey].impressions += row.impressions;

    if (level === 'adset' || level === 'ad') {
      const aKey = row.adset || 'Unknown Adset';
      if (!campaigns[cKey].adsets[aKey]) campaigns[cKey].adsets[aKey] = { name: aKey, campaign: cKey, spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, ads: {} };
      campaigns[cKey].adsets[aKey].spend += row.spend;
      campaigns[cKey].adsets[aKey].revenue += row.revenue;
      campaigns[cKey].adsets[aKey].conversions += row.conversions;
      campaigns[cKey].adsets[aKey].clicks += row.clicks;
      campaigns[cKey].adsets[aKey].impressions += row.impressions;

      if (level === 'ad' && row.ad) {
        const dKey = row.ad;
        if (!campaigns[cKey].adsets[aKey].ads[dKey]) campaigns[cKey].adsets[aKey].ads[dKey] = { name: dKey, adset: aKey, campaign: cKey, spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, frequency: 0 };
        campaigns[cKey].adsets[aKey].ads[dKey].spend += row.spend;
        campaigns[cKey].adsets[aKey].ads[dKey].revenue += row.revenue;
        campaigns[cKey].adsets[aKey].ads[dKey].conversions += row.conversions;
        campaigns[cKey].adsets[aKey].ads[dKey].clicks += row.clicks;
        campaigns[cKey].adsets[aKey].ads[dKey].impressions += row.impressions;
        campaigns[cKey].adsets[aKey].ads[dKey].reach += row.reach;
      }
    }
  }

  // Compute derived metrics
  const addMetrics = (obj: any) => {
    obj.roas = obj.spend > 0 && obj.revenue > 0 ? parseFloat((obj.revenue / obj.spend).toFixed(2)) : 0;
    obj.cpc = obj.clicks > 0 ? parseFloat((obj.spend / obj.clicks).toFixed(2)) : 0;
    obj.cpa = obj.conversions > 0 ? parseFloat((obj.spend / obj.conversions).toFixed(2)) : 0;
    obj.ctr = obj.impressions > 0 ? parseFloat(((obj.clicks / obj.impressions) * 100).toFixed(2)) : 0;
    obj.spend = parseFloat(obj.spend.toFixed(2));
    obj.revenue = parseFloat(obj.revenue.toFixed(2));
  };

  const result = Object.values(campaigns).map((c: any) => {
    addMetrics(c);
    c.adsets = Object.values(c.adsets).map((a: any) => {
      addMetrics(a);
      a.ads = Object.values(a.ads).map((d: any) => { addMetrics(d); return d; });
      return a;
    });
    return c;
  });

  const totals = result.reduce((acc, c) => ({ spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue, conversions: acc.conversions + c.conversions, clicks: acc.clicks + c.clicks }), { spend: 0, revenue: 0, conversions: 0, clicks: 0 });

  return {
    spend: parseFloat(totals.spend.toFixed(2)),
    revenue: parseFloat(totals.revenue.toFixed(2)),
    roas: totals.spend > 0 && totals.revenue > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0,
    conversions: totals.conversions,
    cpc: totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0,
    campaigns: result,
    monthly: [],
    level,
    uploadedAt: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const platform = formData.get('platform') as string || 'facebook';

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: 'Could not parse CSV — check file format' }, { status: 400 });

  const level = detectLevel(rows);
  const parsed = parseFacebook(rows, level);
  const aggregated = aggregateFacebook(parsed, level);

  if (aggregated.campaigns.length === 0) return NextResponse.json({ error: 'No campaign data found — export a Campaigns/Adsets/Ads report from Meta Ads Manager' }, { status: 400 });

  try {
    const db = getDb();
    initUploadTable(db);
    db.prepare('INSERT OR REPLACE INTO uploaded_data (platform, level, data, filename) VALUES (?,?,?,?)').run(platform, level, JSON.stringify(aggregated), file.name);
  } catch (e: any) { console.error('DB save error:', e.message); }

  return NextResponse.json({ ok: true, platform, level, campaigns: aggregated.campaigns.length, spend: aggregated.spend, revenue: aggregated.revenue, roas: aggregated.roas, uploadedAt: aggregated.uploadedAt });
}

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
    return NextResponse.json({ data: JSON.parse(row.data), filename: row.filename, uploadedAt: row.uploaded_at, level: row.level });
  } catch { return NextResponse.json({ data: null }); }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'facebook';
  try { const db = getDb(); db.prepare('DELETE FROM uploaded_data WHERE platform = ?').run(platform); } catch {}
  return NextResponse.json({ ok: true });
}
