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

// Detect if this is a combined granular export (Campaign+Adset+Ad+Day+Age+Gender all in one)
function isCombinedGranular(headers: string[]): boolean {
  const h = headers.map(k => k.toLowerCase().replace(/['"]/g, '').trim());
  return (
    h.some(k => k === 'day') &&
    h.some(k => k === 'age') &&
    h.some(k => k === 'gender') &&
    h.some(k => k.includes('campaign name') || k === 'campaign name') &&
    h.some(k => k.includes('ad set name') || k.includes('adset name')) &&
    h.some(k => k === 'ad name' || k === 'ad')
  );
}

function parseCombinedGranular(rows: Record<string, string>[]) {
  // Filter out summary rows (empty campaign name) and rows without a valid date
  const dataRows = rows.filter(r => {
    const campaign = g(r, 'Campaign name', 'Campaign');
    const day = r['Day'] || r['day'] || '';
    return campaign && day && /^\d{4}-\d{2}-\d{2}$/.test(day);
  });

  const campaigns: Record<string, any> = {};
  const dailyMap: Record<string, { date: string; spend: number; conversions: number; clicks: number; impressions: number }> = {};
  const ageMap: Record<string, { age: string; spend: number; conversions: number; clicks: number }> = {};
  const genderMap: Record<string, { gender: string; spend: number; conversions: number }> = {};
  const adMap: Record<string, { name: string; campaign: string; adset: string; spend: number; conversions: number; clicks: number; impressions: number }> = {};

  for (const row of dataRows) {
    const campaignName = g(row, 'Campaign name', 'Campaign');
    const adsetName = g(row, 'Ad Set Name', 'Ad set name', 'Adset');
    const adName = g(row, 'Ad Name', 'Ad name');
    const day = row['Day'] || '';
    const age = row['Age'] || row['age'] || '';
    const gender = (row['Gender'] || row['gender'] || '').toLowerCase();
    const spend = n(g(row, 'Amount spent', 'Spend'));
    const isPurchase = (row['Result type'] || '').toLowerCase().includes('purchase');
    const purchases = isPurchase ? n(row['Results'] || '0') : 0;
    const clicks = n(g(row, 'Link clicks', 'Clicks'));
    const impressions = n(g(row, 'Impressions'));

    // Campaigns
    if (!campaigns[campaignName]) campaigns[campaignName] = { name: campaignName, spend: 0, conversions: 0, clicks: 0, impressions: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, cpa: 0, adsets: {} };
    campaigns[campaignName].spend += spend;
    campaigns[campaignName].conversions += purchases;
    campaigns[campaignName].clicks += clicks;
    campaigns[campaignName].impressions += impressions;

    // Adsets
    if (!campaigns[campaignName].adsets[adsetName]) campaigns[campaignName].adsets[adsetName] = { name: adsetName, campaign: campaignName, spend: 0, conversions: 0, clicks: 0, impressions: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, cpa: 0, ads: {} };
    campaigns[campaignName].adsets[adsetName].spend += spend;
    campaigns[campaignName].adsets[adsetName].conversions += purchases;
    campaigns[campaignName].adsets[adsetName].clicks += clicks;
    campaigns[campaignName].adsets[adsetName].impressions += impressions;

    // Ads
    const adKey = `${campaignName}||${adsetName}||${adName}`;
    if (!campaigns[campaignName].adsets[adsetName].ads[adKey]) campaigns[campaignName].adsets[adsetName].ads[adKey] = { name: adName, campaign: campaignName, adset: adsetName, spend: 0, conversions: 0, clicks: 0, impressions: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, cpa: 0 };
    campaigns[campaignName].adsets[adsetName].ads[adKey].spend += spend;
    campaigns[campaignName].adsets[adsetName].ads[adKey].conversions += purchases;
    campaigns[campaignName].adsets[adsetName].ads[adKey].clicks += clicks;
    campaigns[campaignName].adsets[adsetName].ads[adKey].impressions += impressions;

    // Daily
    if (day) {
      if (!dailyMap[day]) dailyMap[day] = { date: day, spend: 0, conversions: 0, clicks: 0, impressions: 0 };
      dailyMap[day].spend += spend;
      dailyMap[day].conversions += purchases;
      dailyMap[day].clicks += clicks;
      dailyMap[day].impressions += impressions;
    }

    // Age (skip unknown/empty)
    if (age && age.toLowerCase() !== 'unknown' && age !== '') {
      if (!ageMap[age]) ageMap[age] = { age, spend: 0, conversions: 0, clicks: 0 };
      ageMap[age].spend += spend;
      ageMap[age].conversions += purchases;
      ageMap[age].clicks += clicks;
    }

    // Gender (skip unknown/empty)
    if (gender && gender !== 'unknown' && gender !== '') {
      if (!genderMap[gender]) genderMap[gender] = { gender, spend: 0, conversions: 0 };
      genderMap[gender].spend += spend;
      genderMap[gender].conversions += purchases;
    }

    // Ad flat breakdown
    if (!adMap[adKey]) adMap[adKey] = { name: adName, campaign: campaignName, adset: adsetName, spend: 0, conversions: 0, clicks: 0, impressions: 0 };
    adMap[adKey].spend += spend;
    adMap[adKey].conversions += purchases;
    adMap[adKey].clicks += clicks;
    adMap[adKey].impressions += impressions;
  }

  const calc = (obj: any) => {
    obj.roas = 0; obj.revenue = 0;
    obj.cpc = obj.clicks > 0 ? parseFloat((obj.spend / obj.clicks).toFixed(2)) : 0;
    obj.ctr = obj.impressions > 0 ? parseFloat(((obj.clicks / obj.impressions) * 100).toFixed(2)) : 0;
    obj.cpa = obj.conversions > 0 ? parseFloat((obj.spend / obj.conversions).toFixed(2)) : 0;
    obj.spend = parseFloat(obj.spend.toFixed(2));
  };

  const campaignsArr = Object.values(campaigns).map((c: any) => {
    calc(c);
    c.adsets = Object.values(c.adsets).map((a: any) => {
      calc(a);
      a.ads = Object.values(a.ads).map((d: any) => { calc(d); return d; });
      return a;
    });
    return c;
  }).sort((a: any, b: any) => b.spend - a.spend);

  const totals = campaignsArr.reduce((acc: any, c: any) => ({
    spend: acc.spend + c.spend, conversions: acc.conversions + c.conversions,
    clicks: acc.clicks + c.clicks, impressions: acc.impressions + c.impressions,
  }), { spend: 0, conversions: 0, clicks: 0, impressions: 0 });

  const daily = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, spend: parseFloat(d.spend.toFixed(2)) }));

  const dates = daily.map(d => d.date);
  const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : { start: '', end: '' };

  const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const ageBreakdown = ageOrder.filter(a => ageMap[a]).map(a => {
    const d = ageMap[a];
    return { age: a, spend: parseFloat(d.spend.toFixed(2)), conversions: d.conversions, clicks: d.clicks,
      cpa: d.conversions > 0 ? parseFloat((d.spend / d.conversions).toFixed(2)) : 0,
      pct: totals.spend > 0 ? parseFloat(((d.spend / totals.spend) * 100).toFixed(1)) : 0 };
  });

  const totalGenderSpend = Object.values(genderMap).reduce((s: number, g: any) => s + g.spend, 0);
  const genderBreakdown = Object.values(genderMap).map((d: any) => ({
    gender: d.gender, spend: parseFloat(d.spend.toFixed(2)), conversions: d.conversions,
    pct: totalGenderSpend > 0 ? parseFloat(((d.spend / totalGenderSpend) * 100).toFixed(1)) : 0,
  })).sort((a: any, b: any) => b.spend - a.spend);

  const adBreakdown = Object.values(adMap).map((d: any) => ({
    name: d.name, campaign: d.campaign, adset: d.adset,
    spend: parseFloat(d.spend.toFixed(2)), conversions: d.conversions, clicks: d.clicks,
    cpa: d.conversions > 0 ? parseFloat((d.spend / d.conversions).toFixed(2)) : 0,
    ctr: d.impressions > 0 ? parseFloat(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
  })).sort((a, b) => b.spend - a.spend);

  return {
    format: 'combined_granular', dateRange,
    spend: parseFloat(totals.spend.toFixed(2)), conversions: totals.conversions,
    clicks: totals.clicks, impressions: totals.impressions,
    roas: 0, revenue: 0,
    cpc: totals.clicks > 0 ? parseFloat((totals.spend / totals.clicks).toFixed(2)) : 0,
    cpa: totals.conversions > 0 ? parseFloat((totals.spend / totals.conversions).toFixed(2)) : 0,
    campaigns: campaignsArr, monthly: [], daily,
    ageBreakdown, genderBreakdown, adBreakdown,
    level: 'ad', reportType: 'combined_granular',
    uploadedAt: new Date().toISOString(),
  };
}

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

  let parsed: any;
  let dataLevel: string;
  let reportType: string;

  // Check for combined granular format first (has Day+Age+Gender+Campaign+Adset+Ad)
  if (isCombinedGranular(headers)) {
    parsed = parseCombinedGranular(rows);
    dataLevel = 'ad';
    reportType = 'combined_granular';
    if (!parsed.campaigns?.length) return NextResponse.json({ error: 'No campaign data found — check the file has spend data' }, { status: 400 });
  } else {
    const detected = detectMetaReportType(rows, headers);
    dataLevel = detected.level;
    reportType = detected.reportType;

    if (reportType === 'performance') {
      const perfRows = parseMetaPerformance(rows);
      if (perfRows.length === 0) return NextResponse.json({ error: 'No ad data found — check the file has spend data' }, { status: 400 });
      parsed = aggregatePerformance(perfRows, detected.level);
      dataLevel = detected.level;
    } else {
      const bdRows = parseMetaBreakdown(rows, reportType);
      if (bdRows.length === 0) return NextResponse.json({ error: 'No breakdown data found' }, { status: 400 });
      parsed = aggregateBreakdown(bdRows, reportType, detected.level);
      dataLevel = `${detected.level}_${reportType}`;
    }
  }

  try {
    const db = getDb();
    initUploadTable(db);
    db.prepare('INSERT OR REPLACE INTO uploaded_data (platform, level, report_type, data, filename) VALUES (?,?,?,?,?)').run(
      platform, dataLevel, reportType, JSON.stringify(parsed), file.name
    );
  } catch (e: any) { console.error('DB save:', e.message); }

  const summary = reportType === 'combined_granular'
    ? { campaigns: parsed.campaigns?.length || 0, spend: parsed.spend, purchases: parsed.conversions, cpa: parsed.cpa, dateRange: parsed.dateRange }
    : reportType === 'performance'
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
