import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const WC_KEY = 'ck_f2fcbdab70d6d74bff230207b02e2369987b2edf';
const WC_SECRET = 'cs_08088c7f6b33a10b089502ec28d203ed31b79c71';
const WC_URL = 'https://nationalsalonsupplies.com.au';
const DEFAULT_MARGIN = 40; // 40% profit margin on regular price

function initMarginsTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS product_margins (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    sku TEXT,
    regular_price REAL DEFAULT 0,
    sale_price REAL DEFAULT 0,
    margin_pct REAL DEFAULT 40,
    sale_margin_pct REAL,
    on_sale INTEGER DEFAULT 0,
    category TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const page = url.searchParams.get('page') || '1';
  const perPage = url.searchParams.get('per_page') || '50';
  const category = url.searchParams.get('category') || '';
  const search = url.searchParams.get('search') || '';

  try {
    // Fetch from WooCommerce
    let wcUrl = `${WC_URL}/wp-json/wc/v3/products?consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}&per_page=${perPage}&page=${page}&status=publish`;
    if (category) wcUrl += `&category=${category}`;
    if (search) wcUrl += `&search=${encodeURIComponent(search)}`;

    const wcRes = await fetch(wcUrl, { signal: AbortSignal.timeout(15000) });
    if (!wcRes.ok) throw new Error(`WC ${wcRes.status}`);
    const wcProducts = await wcRes.json();
    const total = wcRes.headers.get('X-WP-Total') || '0';
    const totalPages = wcRes.headers.get('X-WP-TotalPages') || '1';

    // Get saved margins from DB
    const db = getDb();
    initMarginsTable(db);
    const savedMargins = db.prepare('SELECT * FROM product_margins').all() as any[];
    const marginMap = new Map(savedMargins.map((m: any) => [m.product_id, m]));

    // Merge WC products with saved margins
    const products = wcProducts.map((p: any) => {
      const saved = marginMap.get(p.id);
      const regularPrice = parseFloat(p.regular_price || p.price || '0');
      const salePrice = parseFloat(p.sale_price || '0');
      const onSale = p.on_sale && salePrice > 0;
      const marginPct = saved?.margin_pct ?? DEFAULT_MARGIN;
      const saleMarginPct = saved?.sale_margin_pct ?? null;
      const activeMarginPct = onSale && saleMarginPct != null ? saleMarginPct : marginPct;
      const activePrice = onSale ? salePrice : regularPrice;
      const profit = activePrice * (activeMarginPct / 100);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        regular_price: regularPrice,
        sale_price: salePrice,
        on_sale: onSale,
        active_price: activePrice,
        categories: p.categories?.map((c: any) => ({ id: c.id, name: c.name })) || [],
        margin_pct: marginPct,
        sale_margin_pct: saleMarginPct,
        active_margin_pct: activeMarginPct,
        profit_per_unit: parseFloat(profit.toFixed(2)),
        cost_per_unit: parseFloat((activePrice - profit).toFixed(2)),
        customised: !!saved,
        stock_status: p.stock_status,
        image: p.images?.[0]?.src || null,
      };
    });

    return NextResponse.json({ products, total: parseInt(total), totalPages: parseInt(totalPages), page: parseInt(page) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
