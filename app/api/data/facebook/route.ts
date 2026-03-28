import { NextResponse } from 'next/server';
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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  // 2. Try uploaded CSV data
  try {
    const { getDb } = require('@/lib/db');
    const db = getDb();
    const uploaded = db.prepare("SELECT data, filename, uploaded_at FROM uploaded_data WHERE platform = 'facebook' ORDER BY uploaded_at DESC LIMIT 1").get() as any;
    if (uploaded?.data) {
      const data = JSON.parse(uploaded.data);
      // Fill monthly from demo if not in upload
      if (!data.monthly?.length) data.monthly = FACEBOOK_DEMO.monthly;
      return NextResponse.json({ data, source: 'upload', filename: uploaded.filename, uploadedAt: uploaded.uploaded_at });
    }
  } catch {}

  // 3. Demo fallback
  return NextResponse.json({ data: FACEBOOK_DEMO, source: 'demo' });
}
