import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const appId = process.env.TIKTOK_APP_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/callback/tiktok`;
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');
  const scope = 'advertiser_info,ad.read,campaign.read,adgroup.read,creative.read,report.read';

  const url = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(url);
}
