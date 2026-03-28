import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const DEFAULT_MARGIN = 40;

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

// GET: return all saved margins + global default
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  initMarginsTable(db);
  const margins = db.prepare('SELECT * FROM product_margins ORDER BY product_name ASC').all();
  const globalDefault = db.prepare("SELECT key_value FROM api_keys WHERE service = 'default_margin'").get() as any;
  return NextResponse.json({ margins, defaultMargin: globalDefault?.key_value ? parseFloat(globalDefault.key_value) : DEFAULT_MARGIN });
}

// POST: save one or many product margins, or update global default
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  initMarginsTable(db);

  // Update global default margin
  if (body.action === 'set_default') {
    db.prepare(`INSERT INTO api_keys (service, key_name, key_value) VALUES ('default_margin','default_margin',?)
      ON CONFLICT(service) DO UPDATE SET key_value=excluded.key_value`).run(String(body.margin));
    return NextResponse.json({ ok: true });
  }

  // Bulk update by category - set margin for all products in a category
  if (body.action === 'bulk_category') {
    const { category_name, margin_pct, sale_margin_pct } = body;
    // Products in this category should already be in DB from previous syncs
    // Update all matching rows
    if (sale_margin_pct !== undefined) {
      db.prepare(`UPDATE product_margins SET margin_pct = ?, sale_margin_pct = ?, updated_at = datetime('now') WHERE category LIKE ?`).run(margin_pct, sale_margin_pct, `%${category_name}%`);
    } else {
      db.prepare(`UPDATE product_margins SET margin_pct = ?, updated_at = datetime('now') WHERE category LIKE ?`).run(margin_pct, `%${category_name}%`);
    }
    return NextResponse.json({ ok: true });
  }

  // Save single product margin
  if (body.action === 'save_product') {
    const { product_id, product_name, sku, regular_price, sale_price, margin_pct, sale_margin_pct, on_sale, category } = body;
    db.prepare(`INSERT INTO product_margins (product_id, product_name, sku, regular_price, sale_price, margin_pct, sale_margin_pct, on_sale, category)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(product_id) DO UPDATE SET
        product_name=excluded.product_name, sku=excluded.sku,
        regular_price=excluded.regular_price, sale_price=excluded.sale_price,
        margin_pct=excluded.margin_pct, sale_margin_pct=excluded.sale_margin_pct,
        on_sale=excluded.on_sale, category=excluded.category,
        updated_at=datetime('now')`
    ).run(product_id, product_name, sku || '', regular_price || 0, sale_price || 0, margin_pct ?? DEFAULT_MARGIN, sale_margin_pct ?? null, on_sale ? 1 : 0, category || '');
    return NextResponse.json({ ok: true });
  }

  // Bulk save multiple products at once
  if (body.action === 'bulk_save' && Array.isArray(body.products)) {
    const insert = db.prepare(`INSERT INTO product_margins (product_id, product_name, sku, regular_price, sale_price, margin_pct, sale_margin_pct, on_sale, category)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(product_id) DO UPDATE SET
        margin_pct=excluded.margin_pct, sale_margin_pct=excluded.sale_margin_pct,
        updated_at=datetime('now')`);
    const tx = db.transaction((products: any[]) => { for (const p of products) insert.run(p.product_id, p.product_name, p.sku || '', p.regular_price || 0, p.sale_price || 0, p.margin_pct ?? DEFAULT_MARGIN, p.sale_margin_pct ?? null, p.on_sale ? 1 : 0, p.category || ''); });
    tx(body.products);
    return NextResponse.json({ ok: true, count: body.products.length });
  }

  // Reset product to default
  if (body.action === 'reset_product') {
    db.prepare('DELETE FROM product_margins WHERE product_id = ?').run(body.product_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
