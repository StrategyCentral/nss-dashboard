import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/callback/facebook`;
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');

  // ads_read is the only scope needed for reading ad performance data
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=ads_read&state=${state}&response_type=code`;

  return NextResponse.redirect(url);
}
