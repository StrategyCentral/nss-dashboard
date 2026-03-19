import { NextRequest, NextResponse } from 'next/server';
import { saveOAuthToken, getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || '';

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/admin/connections?error=google_denied`);
  }

  try {
    const redirectUri = `${baseUrl}/api/oauth/callback/google`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, redirect_uri: redirectUri, grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/admin/connections?error=google_token`);
    }

    const db = getDb();
    const getKey = (k: string) => (db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get(k) as any)?.key_value || '';

    const extra = {
      ga4_property_id: getKey('ga4_property_id'),
      google_ads_customer_id: getKey('google_ads_customer_id'),
      gsc_sites: [
        getKey('gsc_site_main') || 'https://nationalsalonsupplies.com.au/',
        getKey('gsc_site_blog') || 'https://nationalsalonsupplies.com.au/beauty/',
      ].filter(Boolean),
    };

    saveOAuthToken('google', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
      scope: tokenData.scope,
      extra_data: JSON.stringify(extra),
    });

    return NextResponse.redirect(`${baseUrl}/admin/connections?success=google`);
  } catch (e: any) {
    return NextResponse.redirect(`${baseUrl}/admin/connections?error=google_error`);
  }
}
