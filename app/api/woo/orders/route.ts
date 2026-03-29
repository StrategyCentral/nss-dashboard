import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const WC_KEY = 'ck_f2fcbdab70d6d74bff230207b02e2369987b2edf';
const WC_SECRET = 'cs_08088c7f6b33a10b089502ec28d203ed31b79c71';
const WC_URL = 'https://nationalsalonsupplies.com.au';
const DEFAULT_MARGIN = 40;

function getMeta(order: any, key: string) {
  return order.meta_data?.find((m: any) => m.key === key)?.value || '';
}

function mapChannel(source: string, medium: string, campaign: string, referrer: string) {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  const c = campaign.toLowerCase();
  const r = referrer.toLowerCase();

  if (m === 'cpc' || m === 'ppc' || m === 'paid') {
    if (s.includes('google') || c.includes('google')) return { channel: 'Google Ads', color: '#4285F4', icon: '📢' };
    if (s.includes('facebook') || s.includes('fb') || c.includes('facebook')) return { channel: 'Meta — Facebook', color: '#1877F2', icon: 'f' };
    if (s.includes('instagram')) return { channel: 'Meta — Instagram', color: '#E1306C', icon: '📸' };
    if (s.includes('tiktok')) return { channel: 'TikTok Ads', color: '#FE2C55', icon: '♪' };
    return { channel: 'Paid (Other)', color: '#ff8c42', icon: '💰' };
  }
  if (m === 'organic' || s === 'google' || r.includes('google.com')) return { channel: 'SEO / Organic', color: '#a8cf45', icon: '🔍' };
  if (m === 'email' || s.includes('email') || s.includes('klaviyo')) return { channel: 'Email', color: '#ffe600', icon: '✉' };
  if (m === 'social' || s.includes('facebook') || s.includes('instagram')) return { channel: 'Social (Organic)', color: '#c084fc', icon: '📱' };
  if (m === 'referral' || (r && !r.includes('nationalsalonsupplies'))) return { channel: 'Referral', color: '#22d3ee', icon: '🔗' };
  if (!source && !medium) return { channel: 'Direct', color: '#888', icon: '🌐' };
  return { channel: 'Other', color: '#888', icon: '🌐' };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || 'this_month';
  const perPage = 100;

  // Date range
  const now = new Date();
  let after: string, before: string;
  if (period === 'this_month') {
    after = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    before = now.toISOString();
  } else if (period === 'last_month') {
    after = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    before = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  } else if (period === '90d') {
    after = new Date(now.getTime() - 90 * 86400000).toISOString();
    before = now.toISOString();
  } else {
    after = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    before = now.toISOString();
  }

  try {
    // Fetch orders from WooCommerce
    const ordersRes = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}&per_page=${perPage}&after=${after}&before=${before}&status=completed,processing`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (!ordersRes.ok) throw new Error(`WC ${ordersRes.status}`);
    const orders = await ordersRes.json();

    // Get saved product margins
    const db = getDb();
    const savedMargins = db.prepare('SELECT product_id, margin_pct, sale_margin_pct, on_sale FROM product_margins').all() as any[];
    const marginMap = new Map(savedMargins.map((m: any) => [m.product_id, m]));
    const globalDefaultRow = db.prepare("SELECT key_value FROM api_keys WHERE service = 'default_margin'").get() as any;
    const defaultMargin = globalDefaultRow ? parseFloat(globalDefaultRow.key_value) : DEFAULT_MARGIN;

    // Process orders
    const channelData: Record<string, { channel: string; color: string; icon: string; revenue: number; profit: number; orders: number; items: number }> = {};
    const orderList: any[] = [];
    let totalRevenue = 0;
    let totalProfit = 0;

    for (const order of orders) {
      const source = getMeta(order, '_wc_order_attribution_utm_source');
      const medium = getMeta(order, '_wc_order_attribution_utm_medium');
      const campaign = getMeta(order, '_wc_order_attribution_utm_campaign');
      const referrer = getMeta(order, '_wc_order_attribution_referrer');
      const { channel, color, icon } = mapChannel(source, medium, campaign, referrer);

      const orderTotal = parseFloat(order.total || '0');

      // Calculate profit per order using per-product margins
      let orderProfit = 0;
      for (const item of (order.line_items || [])) {
        const saved = marginMap.get(item.product_id);
        const itemTotal = parseFloat(item.total || '0');
        let marginPct = defaultMargin;
        if (saved) {
          const isOnSale = saved.on_sale && saved.sale_margin_pct != null;
          marginPct = isOnSale ? saved.sale_margin_pct : saved.margin_pct;
        }
        orderProfit += itemTotal * (marginPct / 100);
      }

      totalRevenue += orderTotal;
      totalProfit += orderProfit;

      // Aggregate by channel
      if (!channelData[channel]) channelData[channel] = { channel, color, icon, revenue: 0, profit: 0, orders: 0, items: 0 };
      channelData[channel].revenue += orderTotal;
      channelData[channel].profit += orderProfit;
      channelData[channel].orders += 1;
      channelData[channel].items += (order.line_items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);

      // Track campaign breakdown within channel
      const campaignKey = campaign || source || 'Unknown';
      if (!channelData[channel].campaigns) channelData[channel].campaigns = {};
      if (!channelData[channel].campaigns[campaignKey]) channelData[channel].campaigns[campaignKey] = { name: campaignKey, revenue: 0, profit: 0, orders: 0 };
      channelData[channel].campaigns[campaignKey].revenue += orderTotal;
      channelData[channel].campaigns[campaignKey].profit += orderProfit;
      channelData[channel].campaigns[campaignKey].orders += 1;

      orderList.push({
        id: order.id,
        date: order.date_created,
        total: orderTotal,
        profit: parseFloat(orderProfit.toFixed(2)),
        margin_pct: orderTotal > 0 ? parseFloat(((orderProfit / orderTotal) * 100).toFixed(1)) : 0,
        channel,
        color,
        source,
        medium,
        campaign,
        customer: order.billing ? `${order.billing.first_name} ${order.billing.last_name}`.trim() : 'Guest',
        items: order.line_items?.map((i: any) => ({ name: i.name, qty: i.quantity, total: parseFloat(i.total) })) || [],
      });
    }

    // Sort channels by revenue
    const channels = Object.values(channelData)
      .map(c => ({
        ...c,
        revenue: parseFloat(c.revenue.toFixed(2)),
        profit: parseFloat(c.profit.toFixed(2)),
        margin_pct: c.revenue > 0 ? parseFloat(((c.profit / c.revenue) * 100).toFixed(1)) : 0,
        revenue_pct: totalRevenue > 0 ? parseFloat(((c.revenue / totalRevenue) * 100).toFixed(1)) : 0,
        cost_per_sale: c.orders > 0 ? 0 : 0, // No ad spend in WC data — placeholder
        campaigns: Object.values(c.campaigns || {}).map((cam: any) => ({
          ...cam,
          revenue: parseFloat(cam.revenue.toFixed(2)),
          profit: parseFloat(cam.profit.toFixed(2)),
          margin_pct: cam.revenue > 0 ? parseFloat(((cam.profit / cam.revenue) * 100).toFixed(1)) : 0,
        })).sort((a: any, b: any) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? parseFloat((totalRevenue / orders.length).toFixed(2)) : 0,
        avgMarginPct: totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : defaultMargin,
      },
      channels,
      orders: orderList.slice(0, 50), // latest 50
      period,
      after,
      before,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
