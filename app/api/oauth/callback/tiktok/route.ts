import { NextRequest, NextResponse } from 'next/server';
import { checkOAuthCallback, oauthRedirect } from '@/lib/oauth-state';
import { saveOAuthToken } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('auth_code') || searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || '';

  // Only an admin who started this flow here may complete it (CSRF / account-binding guard).
  const guard = await checkOAuthCallback(req, 'tiktok');
  if (guard) return oauthRedirect(`${baseUrl}/admin/connections?error=tiktok_${guard}`, 'tiktok');


  if (error || !code) {
    return oauthRedirect(`${baseUrl}/admin/connections?error=tiktok_denied`, 'tiktok');
  }

  try {
    const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.TIKTOK_APP_ID,
        secret: process.env.TIKTOK_APP_SECRET,
        auth_code: code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      return oauthRedirect(`${baseUrl}/admin/connections?error=tiktok_token`, 'tiktok');
    }

    const { access_token, refresh_token, expires_in, advertiser_ids } = tokenData.data;
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : undefined;

    saveOAuthToken('tiktok', {
      access_token,
      refresh_token,
      expires_at: expiresAt,
      extra_data: JSON.stringify({ advertiser_ids }),
    });

    return oauthRedirect(`${baseUrl}/admin/connections?success=tiktok`, 'tiktok');
  } catch (e: any) {
    console.error('TikTok OAuth error:', e);
    return oauthRedirect(`${baseUrl}/admin/connections?error=tiktok_error`, 'tiktok');
  }
}
