import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const WC_KEY = 'ck_f2fcbdab70d6d74bff230207b02e2369987b2edf';
const WC_SECRET = 'cs_08088c7f6b33a10b089502ec28d203ed31b79c71';
const WC_URL = 'https://nationalsalonsupplies.com.au';

function initTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_names (
      campaign_id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'google',
      campaign_name TEXT NOT NULL,
      adset_name TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS attribution_overrides (
      order_id INTEGER PRIMARY KEY,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      channel TEXT,
      override_reason TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function getMeta(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value || '';
}

// Scan orders and extract all unresolved campaign IDs / unattributed orders
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'scan';

  const db = getDb();
  initTables(db);

  if (action === 'names') {
    // Return saved campaign names
    const names = db.prepare('SELECT * FROM campaign_names ORDER BY platform, campaign_name').all();
    return NextResponse.json({ names });
  }

  if (action === 'overrides') {
    const overrides = db.prepare('SELECT * FROM attribution_overrides ORDER BY order_id DESC LIMIT 200').all();
    return NextResponse.json({ overrides });
  }

  // Scan last 500 orders for issues
  try {
    const pages = [1, 2, 3, 4, 5];
    let allOrders: any[] = [];
    for (const page of pages) {
      const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}&per_page=100&page=${page}&status=completed,processing`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) break;
      const batch = await res.json();
      if (!batch.length) break;
      allOrders = allOrders.concat(batch);
    }

    // Get saved campaign names
    const savedNames = db.prepare('SELECT * FROM campaign_names').all() as any[];
    const nameMap = new Map(savedNames.map((n: any) => [n.campaign_id, n]));

    // Get existing overrides
    const existingOverrides = db.prepare('SELECT order_id FROM attribution_overrides').all() as any[];
    const overrideSet = new Set(existingOverrides.map((o: any) => o.order_id));

    const googleCampaigns: Record<string, { id: string; orders: number; revenue: number; dates: string[]; sampleUrl: string }> = {};
    const directOrders: any[] = [];
    const igOrders: any[] = [];
    const partialUtmOrders: any[] = [];
    let totalScanned = 0;

    for (const order of allOrders) {
      totalScanned++;
      if (overrideSet.has(order.id)) continue; // already overridden

      const source = getMeta(order, '_wc_order_attribution_utm_source');
      const medium = getMeta(order, '_wc_order_attribution_utm_medium');
      const campaign = getMeta(order, '_wc_order_attribution_utm_campaign');
      const content = getMeta(order, '_wc_order_attribution_utm_content');
      const term = getMeta(order, '_wc_order_attribution_utm_term');
      const entry = getMeta(order, '_wc_order_attribution_session_entry');
      const total = parseFloat(order.total || '0');
      const date = order.date_created?.slice(0, 10) || '';

      // Extract Google campaign ID
      const gidMatch = entry.match(/gad_campaignid[=:](\d+)/);
      if (gidMatch && source.includes('google')) {
        const gid = gidMatch[1];
        if (!googleCampaigns[gid]) googleCampaigns[gid] = { id: gid, orders: 0, revenue: 0, dates: [], sampleUrl: entry.slice(0, 200) };
        googleCampaigns[gid].orders++;
        googleCampaigns[gid].revenue += total;
        if (!googleCampaigns[gid].dates.includes(date)) googleCampaigns[gid].dates.push(date);
      }

      // Direct/unknown orders
      if (!source || source === '(direct)') {
        directOrders.push({ id: order.id, date, total, items: order.line_items?.length || 0, device: getMeta(order, '_wc_order_attribution_device_type') });
      }

      // Instagram/Facebook orders with source=ig
      if (source === 'ig' || (source === 'facebook' && medium === 'ig')) {
        igOrders.push({ id: order.id, date, total, campaign, content, term });
      }

      // Partial UTM (content is just "/" or empty when source is google/cpc)
      if (source.includes('google') && medium === 'cpc' && (!content || content === '/') && !gidMatch) {
        partialUtmOrders.push({ id: order.id, date, total, source, campaign });
      }
    }

    // Enrich google campaigns with saved names
    const googleCampaignList = Object.values(googleCampaigns).map(c => ({
      ...c,
      revenue: parseFloat(c.revenue.toFixed(2)),
      savedName: nameMap.get(c.id)?.campaign_name || null,
      dateRange: c.dates.length ? `${c.dates.sort()[0]} → ${c.dates.sort().reverse()[0]}` : null,
    })).sort((a, b) => b.orders - a.orders);

    return NextResponse.json({
      scanned: totalScanned,
      googleCampaigns: googleCampaignList,
      directOrders: directOrders.slice(0, 50),
      directCount: directOrders.length,
      igOrders,
      partialUtmOrders: partialUtmOrders.slice(0, 20),
      partialCount: partialUtmOrders.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  initTables(db);

  // Save campaign name mapping
  if (body.action === 'save_campaign_name') {
    db.prepare(`INSERT INTO campaign_names (campaign_id, platform, campaign_name, adset_name, notes)
      VALUES (?,?,?,?,?)
      ON CONFLICT(campaign_id) DO UPDATE SET campaign_name=excluded.campaign_name, adset_name=excluded.adset_name, notes=excluded.notes, updated_at=datetime('now')`
    ).run(body.campaign_id, body.platform || 'google', body.campaign_name, body.adset_name || null, body.notes || null);
    return NextResponse.json({ ok: true });
  }

  // Bulk override: assign a campaign name to all orders with a given Google campaign ID
  if (body.action === 'apply_google_campaign') {
    const { campaign_id, campaign_name, platform } = body;
    // Fetch orders with this campaign ID from WC
    const pages = [1, 2, 3, 4, 5];
    let count = 0;
    const insert = db.prepare(`INSERT INTO attribution_overrides (order_id, utm_source, utm_medium, utm_campaign, channel, override_reason)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(order_id) DO UPDATE SET utm_campaign=excluded.utm_campaign, override_reason=excluded.override_reason, updated_at=datetime('now')`);

    for (const page of pages) {
      const res = await fetch(`${WC_URL}/wp-json/wc/v3/orders?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}&per_page=100&page=${page}&status=completed,processing`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      const orders = await res.json();
      if (!orders.length) break;

      for (const order of orders) {
        const entry = getMeta(order, '_wc_order_attribution_session_entry');
        const gidMatch = entry.match(/gad_campaignid[=:](\d+)/);
        if (gidMatch && gidMatch[1] === campaign_id) {
          insert.run(order.id, 'google', 'cpc', campaign_name, 'Google Ads', `Auto from gad_campaignid=${campaign_id}`);
          count++;
        }
      }
    }
    return NextResponse.json({ ok: true, count });
  }

  // Bulk override: assign orders in a date range to a campaign
  if (body.action === 'bulk_date_range') {
    const { order_ids, utm_source, utm_medium, utm_campaign, utm_content, channel, reason } = body;
    const insert = db.prepare(`INSERT INTO attribution_overrides (order_id, utm_source, utm_medium, utm_campaign, utm_content, channel, override_reason)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(order_id) DO UPDATE SET utm_source=excluded.utm_source, utm_medium=excluded.utm_medium, utm_campaign=excluded.utm_campaign, utm_content=excluded.utm_content, channel=excluded.channel, override_reason=excluded.override_reason, updated_at=datetime('now')`);
    const tx = db.transaction((ids: number[]) => {
      for (const id of ids) insert.run(id, utm_source, utm_medium, utm_campaign, utm_content || null, channel, reason);
    });
    tx(order_ids);
    return NextResponse.json({ ok: true, count: order_ids.length });
  }

  // Fix ig/instagram source to proper channel
  if (body.action === 'fix_ig_orders') {
    const { order_ids } = body;
    const insert = db.prepare(`INSERT INTO attribution_overrides (order_id, utm_source, utm_medium, channel, override_reason)
      VALUES (?,?,?,?,?)
      ON CONFLICT(order_id) DO UPDATE SET utm_source=excluded.utm_source, channel=excluded.channel, override_reason=excluded.override_reason, updated_at=datetime('now')`);
    const tx = db.transaction((ids: number[]) => {
      for (const id of ids) insert.run(id, 'instagram', 'paid', 'Meta — Instagram', 'Fixed ig source → Meta Instagram');
    });
    tx(order_ids);
    return NextResponse.json({ ok: true, count: order_ids.length });
  }

  // Single order override
  if (body.action === 'override_order') {
    const { order_id, utm_source, utm_medium, utm_campaign, utm_content, channel, reason } = body;
    db.prepare(`INSERT INTO attribution_overrides (order_id, utm_source, utm_medium, utm_campaign, utm_content, channel, override_reason)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(order_id) DO UPDATE SET utm_source=excluded.utm_source, utm_medium=excluded.utm_medium, utm_campaign=excluded.utm_campaign, utm_content=excluded.utm_content, channel=excluded.channel, override_reason=excluded.override_reason, updated_at=datetime('now')`
    ).run(order_id, utm_source, utm_medium, utm_campaign, utm_content || null, channel, reason || 'Manual override');
    return NextResponse.json({ ok: true });
  }

  // Delete override
  if (body.action === 'delete_override') {
    db.prepare('DELETE FROM attribution_overrides WHERE order_id = ?').run(body.order_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
