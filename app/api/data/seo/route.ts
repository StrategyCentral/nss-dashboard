import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { SEO_DEMO } from '@/lib/demo-data';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // TODO: pull from Google Search Console OAuth token when connected
  return NextResponse.json({ data: SEO_DEMO, source: 'demo' });
}
