import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const WC_KEY = 'ck_f2fcbdab70d6d74bff230207b02e2369987b2edf';
const WC_SECRET = 'cs_08088c7f6b33a10b089502ec28d203ed31b79c71';
const WC_URL = 'https://nationalsalonsupplies.com.au';

async function fetchPage(after: string, before: string, page: number): Promise<any[]> {
  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/orders?after=${after}&before=${before}&status=completed,processing&per_page=100&page=${page}&consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`WC ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const after = url.searchParams.get('after') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const before = url.searchParams.get('before') || new Date().toISOString();

  try {
    // Fetch up to 3 pages (300 orders) to cover a month
    const [p1, p2, p3] = await Promise.all([
      fetchPage(after, before, 1),
      fetchPage(after, before, 2).catch(() => []),
      fetchPage(after, before, 3).catch(() => []),
    ]);
    const orders = [...p1, ...p2, ...p3];

    // Group by date
    const byDay: Record<string, { date: string; orders: number; revenue: number }> = {};
    for (const order of orders) {
      const date = (order.date_created || '').slice(0, 10);
      if (!date) continue;
      if (!byDay[date]) byDay[date] = { date, orders: 0, revenue: 0 };
      byDay[date].orders += 1;
      byDay[date].revenue += parseFloat(order.total || '0');
    }

    const daily = Object.values(byDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, revenue: parseFloat(d.revenue.toFixed(2)) }));

    const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = daily.reduce((s, d) => s + d.orders, 0);

    return NextResponse.json({ daily, totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalOrders, dateRange: { after, before } });
  } catch (err: any) {
    console.error('WooCommerce daily:', err.message);
    return NextResponse.json({ error: err.message, daily: [] }, { status: 500 });
  }
}
