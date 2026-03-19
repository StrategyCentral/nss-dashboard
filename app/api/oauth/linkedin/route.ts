import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/callback/linkedin`;
  const state = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64');
  const scope = encodeURIComponent('r_ads r_ads_reporting rw_ads');

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

  return NextResponse.redirect(url);
}
