import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FACEBOOK_DEMO } from '@/lib/demo-data';

const AD_ACCOUNT_ID = 'act_1375323549379888';

async function fetchMetaAds(token: string) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const until = now.toISOString().slice(0, 10);
  const range = `{"since":"${since}","until":"${until}"}`;

  const [insightsRes, campaignsRes, monthlyRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=spend,purchase_roas,conversions,cpc,impressions,clicks&time_range=${range}&access_token=${token}`, { signal: AbortSignal.timeout(10000) }),
    fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=campaign_name,spend,purchase_roas,conversions,cpc&level=campaign&time_range=${range}&limit=10&access_token=${token}`, { signal: AbortSignal.timeout(10000) }),
    fetch(`https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=spend,purchase_roas,conversions&time_increment=monthly&date_preset=last_6_months&access_token=${token}`, { signal: AbortSignal.timeout(10000) }),
  ]);

  const [insightsData, campaignsData, monthlyData] = await Promise.all([insightsRes.json(), campaignsRes.json(), monthlyRes.json()]);
  if (insightsData.error) throw new Error(insightsData.error.message);

  const ins = insightsData.data?.[0] || {};
  const spend = parseFloat(ins.spend || '0');
  const roas = parseFloat(ins.purchase_roas?.[0]?.value || '0');

  return {
    spend: Math.round(spend),
    revenue: Math.round(spend * roas),
    roas,
    conversions: parseInt(ins.conversions?.[0]?.value || '0'),
    cpc: parseFloat(ins.cpc || '0'),
    campaigns: (campaignsData.data || []).map((c: any) => {
      const cs = parseFloat(c.spend || '0');
      const cr = parseFloat(c.purchase_roas?.[0]?.value || '0');
      return { name: c.campaign_name, spend: Math.round(cs), revenue: Math.round(cs * cr), roas: cr, conversions: parseInt(c.conversions?.[0]?.value || '0') };
    }),
    monthly: (monthlyData.data || []).map((m: any) => {
      const ms = parseFloat(m.spend || '0');
      const mr = parseFloat(m.purchase_roas?.[0]?.value || '0');
      return { month: new Date(m.date_start).toLocaleString('default', { month: 'short' }), spend: Math.round(ms), revenue: Math.round(ms * mr) };
    }),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Lifetime data request
  const url = new URL(req.url);
  if (url.searchParams.get('type') === 'lifetime') {
    try {
      const { getDb } = require('@/lib/db');
      const db = getDb();
      const row = db.prepare("SELECT data, filename, uploaded_at FROM uploaded_data WHERE platform = 'facebook' AND report_type = 'lifetime_per_ad' ORDER BY uploaded_at DESC LIMIT 1").get() as any;
      if (row?.data) return NextResponse.json({ data: JSON.parse(row.data), source: 'upload', filename: row.filename, uploadedAt: row.uploaded_at });
    } catch {}
    return NextResponse.json({ data: null });
  }

  // 1. Try live API token
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const tokenRow = db.prepare("SELECT key_value FROM api_keys WHERE service = 'facebook_access_token'").get() as any;
    if (tokenRow?.key_value) {
      const data = await fetchMetaAds(tokenRow.key_value);
      return NextResponse.json({ data, source: 'live' });
    }
  } catch (err: any) {
    console.error('Facebook API:', err.message);
  }

  // 2. Try uploaded CSV data — merge all stored months
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const rows = db.prepare("SELECT data, filename, uploaded_at, period FROM uploaded_data WHERE platform = 'facebook' AND report_type IN ('combined_granular','performance') ORDER BY period ASC").all() as any[];

    if (rows?.length > 0) {
      // Merge all months into one combined view
      const allCampaigns: Record<string, any> = {};
      const allDaily: any[] = [];
      const allAge: Record<string, any> = {};
      const allGender: Record<string, any> = {};
      const allAds: Record<string, any> = {};
      const periods: string[] = [];
      let totalSpend = 0, totalConversions = 0, totalClicks = 0;
      let latestFile = '', latestAt = '';

      for (const row of rows) {
        const d = JSON.parse(row.data);
        if (row.period) periods.push(row.period);
        latestFile = row.filename || latestFile;
        latestAt = row.uploaded_at || latestAt;

        totalSpend += d.spend || 0;
        totalConversions += d.conversions || 0;
        totalClicks += d.clicks || 0;

        // Merge daily
        if (d.daily?.length) allDaily.push(...d.daily);

        // Merge campaigns
        for (const c of (d.campaigns || [])) {
          if (!c.name || c.name === '0' || !c.spend) continue;
          if (!allCampaigns[c.name]) {
            allCampaigns[c.name] = { ...c, adsets: c.adsets || [] };
          } else {
            allCampaigns[c.name].spend += c.spend || 0;
            allCampaigns[c.name].conversions += c.conversions || 0;
            allCampaigns[c.name].clicks += c.clicks || 0;
            allCampaigns[c.name].impressions += (c.impressions || 0);
            // Merge adsets
            const existingAdsets: Record<string, any> = {};
            for (const a of (allCampaigns[c.name].adsets || [])) existingAdsets[a.name] = a;
            for (const a of (c.adsets || [])) {
              if (!existingAdsets[a.name]) existingAdsets[a.name] = { ...a };
              else {
                existingAdsets[a.name].spend += a.spend || 0;
                existingAdsets[a.name].conversions += a.conversions || 0;
                existingAdsets[a.name].clicks += a.clicks || 0;
              }
            }
            allCampaigns[c.name].adsets = Object.values(existingAdsets);
          }
        }

        // Merge age breakdown
        for (const a of (d.ageBreakdown || [])) {
          if (!allAge[a.age]) allAge[a.age] = { ...a };
          else { allAge[a.age].spend += a.spend; allAge[a.age].conversions += a.conversions; }
        }

        // Merge gender breakdown
        for (const g of (d.genderBreakdown || [])) {
          if (!allGender[g.gender]) allGender[g.gender] = { ...g };
          else { allGender[g.gender].spend += g.spend; allGender[g.gender].conversions += g.conversions; }
        }

        // Merge ad breakdown
        for (const a of (d.adBreakdown || [])) {
          const k = `${a.campaign}||${a.name}`;
          if (!allAds[k]) allAds[k] = { ...a };
          else { allAds[k].spend += a.spend; allAds[k].conversions += a.conversions; allAds[k].clicks += a.clicks; }
        }
      }

      // Recalc derived metrics on merged campaigns
      const campaignsArr = Object.values(allCampaigns).map((c: any) => {
        c.cpa = c.conversions > 0 ? parseFloat((c.spend / c.conversions).toFixed(2)) : 0;
        c.cpc = c.clicks > 0 ? parseFloat((c.spend / c.clicks).toFixed(2)) : 0;
        c.adsets = (c.adsets || []).map((a: any) => ({
          ...a,
          cpa: a.conversions > 0 ? parseFloat((a.spend / a.conversions).toFixed(2)) : 0,
          cpc: a.clicks > 0 ? parseFloat((a.spend / a.clicks).toFixed(2)) : 0,
        }));
        return c;
      }).sort((a: any, b: any) => b.spend - a.spend);

      // Recalc age pct
      const totalAgeSpend = Object.values(allAge).reduce((s: number, a: any) => s + a.spend, 0);
      const ageBreakdown = Object.values(allAge).map((a: any) => ({
        ...a, cpa: a.conversions > 0 ? parseFloat((a.spend/a.conversions).toFixed(2)) : 0,
        pct: totalAgeSpend > 0 ? parseFloat(((a.spend/totalAgeSpend)*100).toFixed(1)) : 0,
      }));

      const totalGenderSpend = Object.values(allGender).reduce((s: number, g: any) => s + g.spend, 0);
      const genderBreakdown = Object.values(allGender).map((g: any) => ({
        ...g, pct: totalGenderSpend > 0 ? parseFloat(((g.spend/totalGenderSpend)*100).toFixed(1)) : 0,
      })).sort((a: any, b: any) => b.spend - a.spend);

      const adBreakdown = Object.values(allAds).map((a: any) => ({
        ...a, cpa: a.conversions > 0 ? parseFloat((a.spend/a.conversions).toFixed(2)) : 0,
      })).sort((a: any, b: any) => b.spend - a.spend);

      // Sort daily chronologically
      allDaily.sort((a: any, b: any) => a.date.localeCompare(b.date));

      const dateRange = periods.length > 0 ? { start: periods[0] + '-01', end: periods[periods.length-1] + '-31' } : undefined;

      const merged = {
        format: 'combined_granular',
        spend: parseFloat(totalSpend.toFixed(2)),
        conversions: totalConversions,
        clicks: totalClicks,
        revenue: 0, roas: 0,
        cpa: totalConversions > 0 ? parseFloat((totalSpend/totalConversions).toFixed(2)) : 0,
        cpc: totalClicks > 0 ? parseFloat((totalSpend/totalClicks).toFixed(2)) : 0,
        campaigns: campaignsArr,
        daily: allDaily,
        ageBreakdown,
        genderBreakdown,
        adBreakdown,
        monthly: [],
        dateRange,
        periods,
        level: 'ad',
        reportType: 'combined_granular',
        uploadedAt: latestAt,
      };

      return NextResponse.json({ data: merged, source: 'upload', filename: latestFile, uploadedAt: latestAt, periods });
    }
  } catch (e: any) { console.error('FB upload read:', e.message); }

  // 3. Demo fallback
  return NextResponse.json({ data: FACEBOOK_DEMO, source: 'demo' });
}
