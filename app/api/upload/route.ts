import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function initUploadTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS uploaded_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'campaign',
    report_type TEXT NOT NULL DEFAULT 'performance',
    data TEXT NOT NULL,
    filename TEXT,
    uploaded_at TEXT DEFAULT (datetime('now')),
    UNIQUE(platform, level, report_type)
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

function g(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_]/g, '').includes(key.toLowerCase().replace(/[\s_]/g, '')));
    if (found && row[found] && row[found] !== '-') return row[found];
  }
  return '';
}

function n(val: string): number { return parseFloat(val.replace(/[^0-9.]/g, '') || '0') || 0; }

// Detect what type of Meta export this is
function detectMetaReportType(rows: Record<string, string>[], headers: string[]): { level: string; reportType: string } {
  const h = headers.map(k => k.toLowerCase());
  const hasAdName = h.some(k => k === 'ad name' || k === 'ad');
  const hasAdSetName = h.some(k => k.includes('ad set name') || k.includes('adset name'));
  const hasAge = h.some(k => k === 'age');
  const hasGender = h.some(k => k === 'gender');
  const hasRegion = h.some(k => k === 'region' || k === 'country');
  const hasDevice = h.some(k => k.includes('device') || k === 'impression device');
  const hasPlacement = h.some(k => k.includes('placement'));
  const hasHour = h.some(k => k.includes('hour') || k.includes('time'));
  const hasDayOfWeek = h.some(k => k.includes('day of week'));

  const level = hasAdName ? 'ad' : hasAdSetName ? 'adset' : 'campaign';
  const reportType = hasAge ? 'breakdown_age' : hasGender ? 'breakdown_gender' : hasRegion ? 'breakdown_region' :
    hasDevice ? 'breakdown_device' : hasPlacement ? 'breakdown_placement' :
    hasHour ? 'breakdown_time' : hasDayOfWeek ? 'breakdown_dayofweek' : 'performance';

  return { level, reportType };
}

function parseMetaPerformance(rows: Record<string, string>[]) {
  return rows.map(row => {
    const campaign = g(row, 'Campaign name', 'Campaign');
    const adset = g(row, 'Ad Set Name', 'Ad set name', 'Adset');
    const ad = g(row, 'Ad Name', 'Ad name');
    const spend = n(g(row, 'Amount spent', 'Spend'));
    const impressions = n(g(row, 'Impressions'));
    const reach = n(g(row, 'Reach'));
    const frequency = n(g(row, 'Frequency'));
    const clicks = n(g(row, 'Link clicks', 'Clicks'));
    const uniqueClicks = n(g(row, 'Unique link clicks'));
    const ctr = n(g(row, 'CTR', 'Link CTR'));
    const cpc = n(g(row, 'CPC', 'Cost per link click'));
    const cpm = n(g(row, 'CPM'));
    const purchases = n(g(row, 'Purchases', 'Purchase', 'Results'));
    const purchaseValue = n(g(row, 'Purchase conversion value', 'Purchases conversion value', 'Revenue'));
    const addToCart = n(g(row, 'Adds to cart', 'Add to cart'));
    const checkouts = n(g(row, 'Checkouts initiated', 'Checkout'));
    const viewContent = n(g(row, 'Content views', 'View content'));
    const costPerPurchase = n(g(row, 'Cost per purchase', 'Cost per result'));
    const roas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0;

    return {
      campaign, adset, ad, spend, impressions, reach, frequency,
      clicks, uniqueClicks, ctr, cpc, cpm,
      purchases, purchaseValue, roas: parseFloat(roas.toFixed(2)),
      addToCart, checkouts, viewContent, costPerPurchase,
      // Funnel ratios
      addToCartRate: impressions > 0 ? (addToCart / impressions) * 100 : 0,
      checkoutRate: addToCart > 0 ? (checkouts / addToCart) * 100 : 0,
      purchaseRate: checkouts > 0 ? (purchases / checkouts) * 100 : 0,
    };
  }).filter(r => (r.campaign || r.adset || r.ad) && r.spend > 0);
}

function parseMetaBreakdown(rows: Record<string, string>[], breakdownType: string) {
  // Breakdown exports have an extra dimension column (age/gender/region/device etc)
  return rows.map(row => {
    const campaign = g(row, 'Campaign name', 'Campaign');
    const adset = g(row, 'Ad Set Name', 'Ad set name');
    const ad = g(row, 'Ad Name', 'Ad name');
    const spend = n(g(row, 'Amount spent', 'Spend'));
    const impressions = n(g(row, 'Impressions'));
    const purchases = n(g(row, 'Purchases', 'Results'));
    const purchaseValue = n(g(row, 'Purchase conversion value'));
    const clicks = n(g(row, 'Link clicks', 'Clicks'));

    // Extract the breakdown dimension value
    let dimension = '';
    if (breakdownType === 'breakdown_age') dimension = g(row, 'Age');
    else if (breakdownType === 'breakdown_gender') dimension = g(row, 'Gender');
    else if (breakdownType === 'breakdown_region') dimension = g(row, 'Region', 'Country');
    else if (breakdownType === 'breakdown_device') dimension = g(row, 'Impression device', 'Device');
    else if (breakdownType === 'breakdown_placement') dimension = g(row, 'Placement', 'Publisher platform');
    else if (breakdownType === 'breakdown_time') dimension = g(row, 'Hour', 'Time of day');
    else if (breakdownType === 'breakdown_dayofweek') dimension = g(row, 'Day of week');

    return { campaign, adset, ad, spend, impressions, purchases, purchaseValue, clicks, dimension };
  }).filter(r => r.dimension && r.spend > 0);
}

function aggregatePerformance(rows: ReturnType<typeof parseMetaPerformance>, level: string) {
  const campaigns: Record<string, any> = {};

  for (const row of rows) {
    const cKey = row.campaign || 'Unknown Campaign';
    if (!campaigns[cKey]) campaigns[cKey] = { name: cKey, spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0, reach: 0, addToCart: 0, checkouts: 0, adsets: {} };
    const c = campaigns[cKey];
    c.spend += row.spend; c.revenue += row.purchaseValue; c.purchases += row.purchases;
    c.clicks += row.clicks; c.impressions += row.impressions; c.reach += row.reach;
    c.addToCart += row.addToCart; c.checkouts += row.checkouts;

    if (level === 'adset' || level === 'ad') {
      const aKey = row.adset || 'Unknown Adset';
      if (!c.adsets[aKey]) c.adsets[aKey] = { name: aKey, campaign: cKey, spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0, reach: 0, addToCart: 0, checkouts: 0, viewContent: 0, ads: {} };
      const a = c.adsets[aKey];
      a.spend += row.spend; a.revenue += row.purchaseValue; a.purchases += row.purchases;
      a.clicks += row.clicks; a.impressions += row.impressions; a.reach += row.reach;
      a.addToCart += row.addToCart; a.checkouts += row.checkouts; a.viewContent += row.viewContent;

      if (level === 'ad' && row.ad) {
        const dKey = row.ad;
        if (!a.ads[dKey]) a.ads[dKey] = { name: dKey, adset: aKey, campaign: cKey, spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0, reach: 0, frequency: 0, addToCart: 0, checkouts: 0, viewContent: 0, cpc: 0, cpm: 0, ctr: 0, costPerPurchase: 0 };
        const d = a.ads[dKey];
        d.spend += row.spend; d.revenue += row.purchaseValue; d.purchases += row.purchases;
        d.clicks += row.clicks; d.impressions += row.impressions; d.reach += row.reach;
        d.frequency = row.frequency || d.frequency;
        d.addToCart += row.addToCart; d.checkouts += row.checkouts; d.viewContent += row.viewContent;
        d.cpc = row.cpc || d.cpc; d.cpm = row.cpm || d.cpm; d.ctr = row.ctr || d.ctr;
        d.costPerPurchase = row.costPerPurchase || d.costPerPurchase;
      }
    }
  }

  const addMetrics = (obj: any) => {
    obj.roas = obj.spend > 0 && obj.revenue > 0 ? parseFloat((obj.revenue / obj.spend).toFixed(2)) : 0;
    obj.cpc = obj.clicks > 0 ? parseFloat((obj.spend / obj.clicks).toFixed(2)) : 0;
    obj.cpa = obj.purchases > 0 ? parseFloat((obj.spend / obj.purchases).toFixed(2)) : 0;
    obj.ctr = obj.impressions > 0 ? parseFloat(((obj.clicks / obj.impressions) * 100).toFixed(2)) : 0;
    obj.spend = parseFloat(obj.spend.toFixed(2));
    obj.revenue = parseFloat(obj.revenue.toFixed(2));
    obj.conversionRate = obj.clicks > 0 ? parseFloat(((obj.purchases / obj.clicks) * 100).toFixed(2)) : 0;
    obj.addToCartRate = obj.clicks > 0 ? parseFloat(((obj.addToCart / obj.clicks) * 100).toFixed(1)) : 0;
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

  const totals = result.reduce((acc, c) => ({
    spend: acc.spend + c.spend, revenue: acc.revenue + c.revenue,
    purchases: acc.purchases + c.purchases, clicks: acc.clicks + c.clicks,
    addToCart: acc.addToCart + c.addToCart,
  }), { spend: 0, revenue: 0, purchases: 0, clicks: 0, addToCart: 0 });

  return {
    spend: parseFloat(totals.spend.toFixed(2)),
    revenue: parseFloat(totals.revenue.toFixed(2)),
    roas: totals.spend > 0 && totals.revenue > 0 ? parseFloat((totals.revenue / totals.spend).toFixed(2)) : 0,
    conversions: totals.purchases,
    cpc: totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0,
    campaigns: result,
    monthly: [],
    level,
    reportType: 'performance',
    uploadedAt: new Date().toISOString(),
  };
}

function aggregateBreakdown(rows: ReturnType<typeof parseMetaBreakdown>, breakdownType: string, level: string) {
  // Group by dimension
  const dimensions: Record<string, { dimension: string; spend: number; impressions: number; purchases: number; purchaseValue: number; clicks: number }> = {};

  for (const row of rows) {
    const d = row.dimension;
    if (!dimensions[d]) dimensions[d] = { dimension: d, spend: 0, impressions: 0, purchases: 0, purchaseValue: 0, clicks: 0 };
    dimensions[d].spend += row.spend;
    dimensions[d].impressions += row.impressions;
    dimensions[d].purchases += row.purchases;
    dimensions[d].purchaseValue += row.purchaseValue;
    dimensions[d].clicks += row.clicks;
  }

  const result = Object.values(dimensions).map(d => ({
    ...d,
    roas: d.spend > 0 && d.purchaseValue > 0 ? parseFloat((d.purchaseValue / d.spend).toFixed(2)) : 0,
    cpa: d.purchases > 0 ? parseFloat((d.spend / d.purchases).toFixed(2)) : 0,
    spend: parseFloat(d.spend.toFixed(2)),
    purchaseValue: parseFloat(d.purchaseValue.toFixed(2)),
  })).sort((a, b) => b.spend - a.spend);

  return { dimensions: result, breakdownType, level, uploadedAt: new Date().toISOString() };
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

  const headers = Object.keys(rows[0]);
  const { level, reportType } = detectMetaReportType(rows, headers);

  let parsed: any;
  let dataLevel = level;

  if (reportType === 'performance') {
    const perfRows = parseMetaPerformance(rows);
    if (perfRows.length === 0) return NextResponse.json({ error: 'No ad data found — check the file has spend data' }, { status: 400 });
    parsed = aggregatePerformance(perfRows, level);
    dataLevel = level;
  } else {
    // Breakdown report
    const bdRows = parseMetaBreakdown(rows, reportType);
    if (bdRows.length === 0) return NextResponse.json({ error: 'No breakdown data found' }, { status: 400 });
    parsed = aggregateBreakdown(bdRows, reportType, level);
    dataLevel = `${level}_${reportType}`;
  }

  try {
    const db = getDb();
    initUploadTable(db);
    db.prepare('INSERT OR REPLACE INTO uploaded_data (platform, level, report_type, data, filename) VALUES (?,?,?,?,?)').run(
      platform, dataLevel, reportType, JSON.stringify(parsed), file.name
    );
  } catch (e: any) { console.error('DB save:', e.message); }

  const summary = reportType === 'performance'
    ? { campaigns: parsed.campaigns?.length || 0, spend: parsed.spend, revenue: parsed.revenue, roas: parsed.roas, purchases: parsed.conversions }
    : { dimensions: parsed.dimensions?.length || 0, breakdownType: reportType };

  return NextResponse.json({ ok: true, platform, level: dataLevel, reportType, ...summary, uploadedAt: parsed.uploadedAt });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'facebook';
  const reportType = url.searchParams.get('report_type') || 'performance';

  try {
    const db = getDb();
    initUploadTable(db);
    const row = db.prepare('SELECT * FROM uploaded_data WHERE platform = ? AND report_type = ? ORDER BY uploaded_at DESC LIMIT 1').get(platform, reportType) as any;
    if (!row) return NextResponse.json({ data: null });
    return NextResponse.json({ data: JSON.parse(row.data), filename: row.filename, uploadedAt: row.uploaded_at, level: row.level, reportType: row.report_type });
  } catch { return NextResponse.json({ data: null }); }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || 'facebook';
  const reportType = url.searchParams.get('report_type') || 'performance';
  try { const db = getDb(); db.prepare('DELETE FROM uploaded_data WHERE platform = ? AND report_type = ?').run(platform, reportType); } catch {}
  return NextResponse.json({ ok: true });
}
