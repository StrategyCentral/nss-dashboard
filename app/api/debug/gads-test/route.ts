import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOAuthToken } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = getOAuthToken('google');
  if (!token) return NextResponse.json({ error: 'No token' });

  // Refresh
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
    console.log('[GADS DEBUG] Refresh scopes from Google:', rd.scope);
  }

  // Check actual token scopes via tokeninfo
  const tiRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
  const tiData = await tiRes.json() as Record<string, unknown>;

  const devToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();

  // Try listAccessibleCustomers
  const lacRes = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': devToken,
    },
  });
  const lacBody = await lacRes.text();

  return NextResponse.json({
    stored_scope: token.scope,
    tokeninfo_scope: tiData.scope,
    tokeninfo_email: tiData.email,
    tokeninfo_has_adwords: ((tiData.scope as string) || '').includes('adwords'),
    ads_status: lacRes.status,
    ads_error: lacBody.substring(0, 300),
  });
}
