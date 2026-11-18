import { NextRequest, NextResponse } from 'next/server';
import { checkOAuthCallback, oauthRedirect } from '@/lib/oauth-state';
import { saveOAuthToken, getOAuthToken, getDb } from '@/lib/db';
import { siteUrl } from '@/lib/account';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || '';

  // Only an admin who started this flow here may complete it (CSRF / account-binding guard).
  const guard = await checkOAuthCallback(req, 'google');
  if (guard) return oauthRedirect(`${baseUrl}/admin/connections?error=google_${guard}`, 'google');


  if (error || !code) {
    return oauthRedirect(`${baseUrl}/admin/connections?error=google_denied`, 'google');
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
      return oauthRedirect(`${baseUrl}/admin/connections?error=google_token`, 'google');
    }

    const db = getDb();
    const getKey = (k: string) => (db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get(k) as any)?.key_value || '';

    const extra = {
      ga4_property_id: getKey('ga4_property_id'),
      google_ads_customer_id: getKey('google_ads_customer_id'),
      gsc_sites: [
        getKey('gsc_site_main') || (siteUrl() ? `${siteUrl()}/` : ''),
        getKey('gsc_site_blog'),
      ].filter(Boolean),
    };

    // Preserve existing refresh_token if Google doesn't return a new one
    // (Google only returns refresh_token on first consent, not re-consent)
    const existingToken = getOAuthToken('google');
    const refreshToken = tokenData.refresh_token || existingToken?.refresh_token;

    saveOAuthToken('google', {
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
      scope: tokenData.scope,
      extra_data: JSON.stringify(extra),
    });

    return oauthRedirect(`${baseUrl}/admin/connections?success=google`, 'google');
  } catch (e: any) {
    return oauthRedirect(`${baseUrl}/admin/connections?error=google_error`, 'google');
  }
}
