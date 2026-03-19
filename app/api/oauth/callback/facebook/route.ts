import { NextRequest, NextResponse } from 'next/server';
import { saveOAuthToken } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXTAUTH_URL || '';

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/admin/connections?error=facebook_denied`);
  }

  try {
    const redirectUri = `${baseUrl}/api/oauth/callback/facebook`;
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(`${baseUrl}/admin/connections?error=facebook_token`);
    }

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const finalToken = longData.access_token || tokenData.access_token;

    // Get ad account ID
    const adRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name&access_token=${finalToken}`);
    const adData = await adRes.json();
    const adAccounts = adData.data || [];

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days default

    saveOAuthToken('facebook', {
      access_token: finalToken,
      expires_at: expiresAt,
      scope: tokenData.scope || '',
      extra_data: JSON.stringify({ ad_accounts: adAccounts }),
    });

    return NextResponse.redirect(`${baseUrl}/admin/connections?success=facebook`);
  } catch (e: any) {
    console.error('Facebook OAuth error:', e);
    return NextResponse.redirect(`${baseUrl}/admin/connections?error=facebook_error`);
  }
}
