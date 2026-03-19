import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const tokens = db.prepare('SELECT platform, expires_at, scope, extra_data, updated_at FROM oauth_tokens').all() as any[];

  const platforms = ['facebook', 'google', 'tiktok', 'linkedin'];
  const status: Record<string, any> = {};

  for (const p of platforms) {
    const t = tokens.find(x => x.platform === p);
    if (!t) { status[p] = { connected: false }; continue; }
    const expired = t.expires_at ? new Date(t.expires_at) < new Date() : false;
    let extra: any = {};
    try { extra = JSON.parse(t.extra_data || '{}'); } catch {}
    status[p] = {
      connected: !expired,
      expired,
      scope: t.scope,
      updated_at: t.updated_at,
      ad_accounts: extra.ad_accounts || extra.advertiser_ids || [],
      ga4_property_id: extra.ga4_property_id,
      gsc_sites: extra.gsc_sites || [],
      google_ads_customer_id: extra.google_ads_customer_id,
    };
  }

  return NextResponse.json(status);
}
