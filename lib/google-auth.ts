import { getOAuthToken, saveOAuthToken } from './db';

export async function getGoogleAccessToken(): Promise<string | null> {
  const token = getOAuthToken('google');
  if (!token?.access_token) return null;

  // Check if token is expired or about to expire (within 5 min)
  if (token.expires_at) {
    const expiresAt = new Date(token.expires_at).getTime();
    const now = Date.now();
    if (now > expiresAt - 5 * 60 * 1000) {
      // Token expired or about to — try refresh
      if (!token.refresh_token) return null;
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          }),
        });
        const data = await res.json();
        if (data.access_token) {
          saveOAuthToken('google', {
            access_token: data.access_token,
            refresh_token: token.refresh_token, // preserve existing
            expires_at: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : token.expires_at,
            scope: token.scope,
            extra_data: token.extra_data,
          });
          return data.access_token;
        }
      } catch (e) {
        console.error('Google token refresh failed:', e);
      }
      return null;
    }
  }

  return token.access_token;
}

export function getGoogleExtra(): { ga4_property_id?: string; google_ads_customer_id?: string; gsc_sites?: string[] } {
  const token = getOAuthToken('google');
  if (!token?.extra_data) return {};
  try { return JSON.parse(token.extra_data); } catch { return {}; }
}
