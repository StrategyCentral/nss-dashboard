import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOAuthToken, saveOAuthToken } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = getOAuthToken('google');
  if (!token) return NextResponse.json({ error: 'No token' });

  // Refresh token
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
    if (rd.access_token) accessToken = rd.access_token as string;
  }

  const devToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();

  // Test: listAccessibleCustomers - no customer ID needed
  const r1 = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
    },
  });
  const b1 = await r1.text();

  // Test with manager ID header
  const r2 = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
      'login-customer-id': '5071931020',
    },
  });
  const b2 = await r2.text();

  return NextResponse.json({
    token_prefix: accessToken.substring(0, 30),
    dev_token_len: devToken.length,
    without_manager: { status: r1.status, body: b1.substring(0, 400) },
    with_manager: { status: r2.status, body: b2.substring(0, 400) },
  });
}
