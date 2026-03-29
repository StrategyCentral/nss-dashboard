import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function initTable(db: any) {
  db.exec(`CREATE TABLE IF NOT EXISTS meta_manual_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_label TEXT NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    adset_name TEXT,
    ad_name TEXT,
    spend REAL DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    purchase_value REAL DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    add_to_cart INTEGER DEFAULT 0,
    initiate_checkout INTEGER DEFAULT 0,
    age_18_24_pct REAL,
    age_25_34_pct REAL,
    age_35_44_pct REAL,
    age_45_54_pct REAL,
    age_55_plus_pct REAL,
    female_pct REAL,
    male_pct REAL,
    mobile_pct REAL,
    desktop_pct REAL,
    peak_hour INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(period_label, campaign_name, adset_name, ad_name)
  )`);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  initTable(db);
  const rows = db.prepare('SELECT * FROM meta_manual_data ORDER BY date_from DESC, campaign_name ASC').all();
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = getDb();
  initTable(db);

  if (body.action === 'save') {
    const { period_label, date_from, date_to, campaign_name, adset_name, ad_name, spend, purchases, purchase_value, reach, impressions, clicks, add_to_cart, initiate_checkout, age_18_24_pct, age_25_34_pct, age_35_44_pct, age_45_54_pct, age_55_plus_pct, female_pct, male_pct, mobile_pct, desktop_pct, peak_hour, notes } = body;

    db.prepare(`INSERT INTO meta_manual_data 
      (period_label, date_from, date_to, campaign_name, adset_name, ad_name, spend, purchases, purchase_value, reach, impressions, clicks, add_to_cart, initiate_checkout, age_18_24_pct, age_25_34_pct, age_35_44_pct, age_45_54_pct, age_55_plus_pct, female_pct, male_pct, mobile_pct, desktop_pct, peak_hour, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(period_label, campaign_name, adset_name, ad_name) DO UPDATE SET
        spend=excluded.spend, purchases=excluded.purchases, purchase_value=excluded.purchase_value,
        reach=excluded.reach, impressions=excluded.impressions, clicks=excluded.clicks,
        add_to_cart=excluded.add_to_cart, initiate_checkout=excluded.initiate_checkout,
        age_18_24_pct=excluded.age_18_24_pct, age_25_34_pct=excluded.age_25_34_pct,
        age_35_44_pct=excluded.age_35_44_pct, age_45_54_pct=excluded.age_45_54_pct,
        age_55_plus_pct=excluded.age_55_plus_pct, female_pct=excluded.female_pct,
        male_pct=excluded.male_pct, mobile_pct=excluded.mobile_pct, desktop_pct=excluded.desktop_pct,
        peak_hour=excluded.peak_hour, notes=excluded.notes, updated_at=datetime('now')`
    ).run(period_label, date_from, date_to, campaign_name, adset_name || '', ad_name || '', spend || 0, purchases || 0, purchase_value || 0, reach || 0, impressions || 0, clicks || 0, add_to_cart || 0, initiate_checkout || 0, age_18_24_pct || null, age_25_34_pct || null, age_35_44_pct || null, age_45_54_pct || null, age_55_plus_pct || null, female_pct || null, male_pct || null, mobile_pct || null, desktop_pct || null, peak_hour || null, notes || null);

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete') {
    db.prepare('DELETE FROM meta_manual_data WHERE id = ?').run(body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
