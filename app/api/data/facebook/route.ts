import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { FACEBOOK_DEMO } from '@/lib/demo-data';

const AD_ACCOUNT_ID = 'act_1375323549379888';

async function fetchMetaAds(token: string) {
  const since = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
  const until = Math.floor(Date.now() / 1000);

  // Top-level account insights
  const insightsRes = await fetch(
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=spend,purchase_roas,conversions,cpc,impressions,clicks&time_range={"since":"${new Date(since*1000).toISOString().slice(0,10)}","until":"${new Date(until*1000).toISOString().slice(0,10)}"}&access_token=${token}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const insightsData = await insightsRes.json();

  // Campaign breakdown
  const campaignsRes = await fetch(
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=campaign_name,spend,purchase_roas,conversions,cpc&level=campaign&time_range={"since":"${new Date(since*1000).toISOString().slice(0,10)}","until":"${new Date(until*1000).toISOString().slice(0,10)}"}&limit=10&access_token=${token}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const campaignsData = await campaignsRes.json();

  // Monthly trend (last 6 months)
  const monthlyRes = await fetch(
    `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=spend,purchase_roas,conversions&time_increment=monthly&date_preset=last_6_months&access_token=${token}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const monthlyData = await monthlyRes.json();

  if (insightsData.error) throw new Error(insightsData.error.message);

  const ins = insightsData.data?.[0] || {};
  const spend = parseFloat(ins.spend || '0');
  const roas = parseFloat(ins.purchase_roas?.[0]?.value || '0');
  const revenue = spend * roas;
  const conversions = parseInt(ins.conversions?.[0]?.value || '0');
  const cpc = parseFloat(ins.cpc || '0');

  const campaigns = (campaignsData.data || []).map((c: any) => {
    const cSpend = parseFloat(c.spend || '0');
    const cRoas = parseFloat(c.purchase_roas?.[0]?.value || '0');
    return {
      name: c.campaign_name,
      spend: Math.round(cSpend),
      revenue: Math.round(cSpend * cRoas),
      roas: cRoas,
      conversions: parseInt(c.conversions?.[0]?.value || '0'),
    };
  });

  const monthly = (monthlyData.data || []).map((m: any) => {
    const mSpend = parseFloat(m.spend || '0');
    const mRoas = parseFloat(m.purchase_roas?.[0]?.value || '0');
    return {
      month: new Date(m.date_start).toLocaleString('default', { month: 'short' }),
      spend: Math.round(mSpend),
      revenue: Math.round(mSpend * mRoas),
    };
  });

  return { spend: Math.round(spend), revenue: Math.round(revenue), roas, conversions, cpc: cpc.toFixed(2), campaigns, monthly };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Try to get token from DB
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const tokenRow = db.prepare("SELECT key_value FROM api_keys WHERE service = 'facebook_access_token'").get() as any;

    if (tokenRow?.key_value) {
      const data = await fetchMetaAds(tokenRow.key_value);
      return NextResponse.json({ data, source: 'live' });
    }
  } catch (err: any) {
    // Token missing or API error — fall through to demo
    console.error('Facebook API error:', err.message);
  }

  return NextResponse.json({ data: FACEBOOK_DEMO, source: 'demo' });
}
