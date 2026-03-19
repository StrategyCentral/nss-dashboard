import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/callback/google`;
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');

  // All Google scopes in one flow: Ads + Search Console + Analytics
  const scopes = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId || '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(url.toString());
}
