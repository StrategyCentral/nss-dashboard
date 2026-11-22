import { NextRequest, NextResponse } from 'next/server';
import { checkOAuthCallback, oauthRedirect } from '@/lib/oauth-state';
import { saveOAuthToken } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || '';

  // Only an admin who started this flow here may complete it (CSRF / account-binding guard).
  const guard = await checkOAuthCallback(req, 'linkedin');
  if (guard) return oauthRedirect(`${baseUrl}/admin/connections?error=linkedin_${guard}`, 'linkedin');


  if (error || !code) {
    return oauthRedirect(`${baseUrl}/admin/connections?error=linkedin_denied`, 'linkedin');
  }

  try {
    const redirectUri = `${baseUrl}/api/oauth/callback/linkedin`;
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return oauthRedirect(`${baseUrl}/admin/connections?error=linkedin_token`, 'linkedin');
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : undefined;

    saveOAuthToken('linkedin', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      scope: tokenData.scope,
    });

    return oauthRedirect(`${baseUrl}/admin/connections?success=linkedin`, 'linkedin');
  } catch (e: any) {
    console.error('LinkedIn OAuth error:', e);
    return oauthRedirect(`${baseUrl}/admin/connections?error=linkedin_error`, 'linkedin');
  }
}
