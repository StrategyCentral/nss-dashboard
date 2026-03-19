import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/callback/facebook`;
  const scope = 'ads_read,ads_management,business_management';
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;

  return NextResponse.redirect(url);
}
