import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOAuthToken, saveOAuthToken } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = getOAuthToken('google');
  if (!token) return NextResponse.json({ error: 'No token' });

  // Get fresh access token via refresh
  let accessToken = token.access_token as string;
  if (token.refresh_token) {
    const rr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    });
    const rd = await rr.json() as Record<string, unknown>;
    if (rd.access_token) {
      accessToken = rd.access_token as string;
      // Save refreshed token
      saveOAuthToken('google', {
        access_token: accessToken,
        refresh_token: token.refresh_token,
        expires_at: rd.expires_in ? new Date(Date.now() + (rd.expires_in as number) * 1000).toISOString() : undefined,
        scope: token.scope,
        extra_data: token.extra_data,
      });
    }
  }

  const devToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
  const clientCid = '3291398450';
  const managerCid = '5071931020';

  // Test 1: Validate token against userinfo
  const uiRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const uiData = await uiRes.json() as Record<string, unknown>;

  // Test 2: Google Ads API with fresh token
  const adsRes = await fetch(`https://googleads.googleapis.com/v20/customers/${clientCid}/googleAds:search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      'login-customer-id': managerCid,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' }),
  });
  const adsBody = await adsRes.text();

  return NextResponse.json({
    token_prefix: accessToken.substring(0, 25),
    scope: token.scope,
    userinfo_status: uiRes.status,
    userinfo_email: uiData.email || uiData.error,
    ads_status: adsRes.status,
    ads_body: adsBody.substring(0, 500),
    dev_token: devToken,
    client_cid: clientCid,
    manager_cid: managerCid,
  });
}
