import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOAuthToken } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = getOAuthToken('google');
  if (!token) return NextResponse.json({ error: 'No token stored' });

  const now = Date.now();
  const expiresAt = token.expires_at ? new Date(token.expires_at as string).getTime() : null;
  const isExpired = expiresAt ? now > expiresAt : null;

  let refreshResult: Record<string, unknown> = {};
  if (token.refresh_token) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    });
    const data = await res.json() as Record<string, unknown>;
    refreshResult = {
      status: res.status,
      has_new_token: !!(data.access_token),
      error: data.error || null,
      error_description: data.error_description || null,
      new_token_prefix: data.access_token ? (data.access_token as string).substring(0, 20) : null,
    };
  }

  return NextResponse.json({
    has_access_token: !!token.access_token,
    has_refresh_token: !!token.refresh_token,
    old_token_prefix: token.access_token ? (token.access_token as string).substring(0, 20) : null,
    expires_at: token.expires_at,
    is_expired: isExpired,
    scope: token.scope,
    client_id_prefix: (process.env.GOOGLE_CLIENT_ID || '').substring(0, 25),
    refresh_result: refreshResult,
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get a fresh token via refresh
  const token = getOAuthToken('google');
  if (!token?.access_token) return NextResponse.json({ error: 'No token' });

  // First do a fresh refresh to get the newest token
  let freshToken = token.access_token as string;
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
    if (rd.access_token) freshToken = rd.access_token as string;
  }

  const devToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
  const clientCid = '3291398450';
  const managerCid = '5071931020';

  // Test 1: with MCC header
  const res1 = await fetch(`https://googleads.googleapis.com/v20/customers/${clientCid}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${freshToken}`,
      'developer-token': devToken,
      'login-customer-id': managerCid,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT customer.id FROM customer LIMIT 1' }),
  });
  const body1 = await res1.text();

  // Test 2: without MCC header
  const res2 = await fetch(`https://googleads.googleapis.com/v20/customers/${clientCid}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${freshToken}`,
      'developer-token': devToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT customer.id FROM customer LIMIT 1' }),
  });
  const body2 = await res2.text();

  return NextResponse.json({
    with_mcc: { status: res1.status, body: body1.substring(0, 300) },
    without_mcc: { status: res2.status, body: body2.substring(0, 300) },
  });
}
