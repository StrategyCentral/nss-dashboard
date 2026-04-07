import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GOOGLE_DEMO } from '@/lib/demo-data';
import { getOAuthToken, saveOAuthToken, getDb } from '@/lib/db';

const GOOGLE_ADS_API_VERSION = 'v18';

// ── Token refresh ──────────────────────────────────────────────────────────────
async function getValidGoogleToken(): Promise<string | null> {
  const token = getOAuthToken('google');
  if (!token?.access_token) return null;

  // Check expiry (refresh 5 min early)
  if (token.expires_at) {
    const expiresAt = new Date(token.expires_at).getTime();
    if (Date.now() < expiresAt - 5 * 60 * 1000) return token.access_token;
  }

  if (!token.refresh_token) return token.access_token; // no refresh token, try anyway

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
      'login-customer-id': cid, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    });
    const data = await res.json();
    if (!data.access_token) return token.access_token;

    saveOAuthToken('google', {
      access_token: data.access_token,
      refresh_token: token.refresh_token,
      expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      scope: token.scope,
      extra_data: token.extra_data,
    });
    return data.access_token;
  } catch {
    return token.access_token;
  }
}

// ── Google Ads GAQL query helper ───────────────────────────────────────────────
async function gaqlQuery(accessToken: string, customerId: string, query: string) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'login-customer-id': cid,
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': devToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Build dashboard data from Google Ads API ───────────────────────────────────
async function fetchGoogleAdsData(accessToken: string, customerId: string) {
  // Strip hyphens from customer ID
  const cid = customerId.replace(/-/g, '');

  const [campaignRes, monthlyRes] = await Promise.all([
    // This-month campaign breakdown
    gaqlQuery(accessToken, cid, `
      SELECT campaign.name,
             metrics.cost_micros,
             metrics.conversions_value,
             metrics.conversions,
             metrics.clicks,
             metrics.average_cpc,
             metrics.impressions
      FROM campaign
      WHERE segments.date DURING THIS_MONTH
        AND campaign.status = 'ENABLED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `),
    // Monthly trend last 6 months
    gaqlQuery(accessToken, cid, `
      SELECT segments.month,
             metrics.cost_micros,
             metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING LAST_6_MONTHS
      ORDER BY segments.month ASC
    `),
  ]);

  // Aggregate campaign-level totals
  const campaigns = (campaignRes.results || []).map((r: any) => {
    const spend = (r.metrics?.costMicros || 0) / 1_000_000;
    const revenue = r.metrics?.conversionsValue || 0;
    return {
      name: r.campaign?.name || 'Unknown',
      spend: Math.round(spend),
      revenue: Math.round(revenue),
      roas: spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0,
      conversions: Math.round(r.metrics?.conversions || 0),
      clicks: r.metrics?.clicks || 0,
      cpc: parseFloat(((r.metrics?.averageCpc || 0) / 1_000_000).toFixed(2)),
    };
  });

  // Overall KPIs
  const totalSpend = campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s: number, c: any) => s + c.revenue, 0);
  const totalConversions = campaigns.reduce((s: number, c: any) => s + c.conversions, 0);
  const totalClicks = campaigns.reduce((s: number, c: any) => s + c.clicks, 0);
  const roas = totalSpend > 0 ? parseFloat((totalRevenue / totalSpend).toFixed(2)) : 0;
  const avgCpc = totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0;

  // Monthly rollup — group by month string
  const monthMap: Record<string, { spend: number; revenue: number }> = {};
  for (const r of (monthlyRes.results || [])) {
    const key = r.segments?.month || '';
    if (!key) continue;
    if (!monthMap[key]) monthMap[key] = { spend: 0, revenue: 0 };
    monthMap[key].spend += (r.metrics?.costMicros || 0) / 1_000_000;
    monthMap[key].revenue += r.metrics?.conversionsValue || 0;
  }

  const monthly = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      month: new Date(key + '-01').toLocaleString('default', { month: 'short' }),
      spend: Math.round(v.spend),
      revenue: Math.round(v.revenue),
    }));

  return { spend: Math.round(totalSpend), revenue: Math.round(totalRevenue), roas, conversions: totalConversions, cpc: avgCpc, campaigns, monthly };
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check credentials
  const accessToken = await getValidGoogleToken();
  const db = getDb();
  const getKey = (k: string) => (db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get(k) as any)?.key_value || '';
  const customerId = getKey('google_ads_customer_id');
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

  if (!accessToken || !customerId || !devToken) {
    return NextResponse.json({
      data: GOOGLE_DEMO,
      source: 'demo',
      setup: {
        hasToken: !!accessToken,
        hasCustomerId: !!customerId,
        hasDevToken: !!devToken,
      },
    });
  }

  try {
    const data = await fetchGoogleAdsData(accessToken, customerId);
    return NextResponse.json({ data, source: 'live' });
  } catch (err: any) {
    console.error('[Google Ads] API error:', err.message);
    return NextResponse.json({ data: GOOGLE_DEMO, source: 'demo', error: err.message });
  }
}
