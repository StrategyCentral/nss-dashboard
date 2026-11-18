/**
 * Storage. ACE Marketing Suite keeps one SQLite file per customer account, so
 * one customer's ads, orders, keys and SEO data can never leak into another's.
 *
 *   account 1  -> $DATA_DIR/nss.db          (the original file: National Salon
 *                                            Supplies, the first customer. It
 *                                            also holds the platform tables:
 *                                            users + accounts.)
 *   account N  -> $DATA_DIR/account-N.db
 *
 * getDb()         the signed-in user's account (what every data route wants)
 * getPlatformDb() users + accounts, whoever is asking
 */
const _dbs = new Map<number, any>();
let _dbError: string | null = null;

export const PRIMARY_ACCOUNT_ID = 1;

function openAccountDb(accountId: number) {
  const cached = _dbs.get(accountId);
  if (cached) return cached;
  if (_dbError) throw new Error(_dbError);
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    const DATA_DIR = process.env.DATA_DIR || '/tmp/nss-data';
    const primary = accountId === PRIMARY_ACCOUNT_ID;
    const DB_PATH = path.join(DATA_DIR, primary ? 'nss.db' : `account-${accountId}.db`);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db, primary);
    if (primary) initPlatformSchema(db);
    _dbs.set(accountId, db);
    return db;
  } catch (e: any) {
    // Only a failure to open the primary file is fatal for the whole process.
    if (accountId === PRIMARY_ACCOUNT_ID) _dbError = e.message;
    throw e;
  }
}

/** Users and customer accounts. Always the primary file. */
export function getPlatformDb() {
  return openAccountDb(PRIMARY_ACCOUNT_ID);
}

/**
 * Which account this request is for.
 *  - a customer's user      -> their own account, always
 *  - ACE staff (no account) -> the account they picked (ams_account cookie)
 *  - a scheduler            -> x-account-id, only with a valid x-cron-key
 *  - nobody / no request    -> the primary account (routes still check the
 *                              session themselves before returning anything)
 */
export function currentAccountId(): number {
  try {
    const { cookies, headers } = require('next/headers');
    const { verifyToken, SESSION_COOKIES, ACCOUNT_COOKIE } = require('./auth');
    const store = cookies();
    const pdb = getPlatformDb();
    const exists = (id: number) => Number.isInteger(id) && id > 0 && !!pdb.prepare('SELECT id FROM accounts WHERE id = ?').get(id);

    let session: any = null;
    for (const name of SESSION_COOKIES) {
      const raw = store.get(name)?.value;
      session = raw ? verifyToken(raw) : null;
      if (session) break;
    }
    if (!session) {
      const cronKey = process.env.SEO_CRON_KEY;
      const h = headers();
      if (cronKey && h.get('x-cron-key') === cronKey) {
        const asked = Number(h.get('x-account-id'));
        if (exists(asked)) return asked;
      }
      return PRIMARY_ACCOUNT_ID;
    }
    const user = pdb.prepare('SELECT account_id FROM users WHERE id = ?').get(session.id) as any;
    if (!user) return PRIMARY_ACCOUNT_ID;
    if (user.account_id) return user.account_id;
    const picked = Number(store.get(ACCOUNT_COOKIE)?.value);
    return exists(picked) ? picked : PRIMARY_ACCOUNT_ID;
  } catch {
    return PRIMARY_ACCOUNT_ID;
  }
}

/** The signed-in user's account database. */
export function getDb() {
  return openAccountDb(currentAccountId());
}

/**
 * Platform tables: customer accounts, and which account each user belongs to.
 * users.account_id NULL = ACE staff, who can open every account.
 */
function initPlatformSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  const has = db.prepare('SELECT id FROM accounts WHERE id = ?').get(PRIMARY_ACCOUNT_ID);
  if (!has) {
    // The first customer. Everything already in this file is theirs.
    db.prepare('INSERT INTO accounts (id, name, domain) VALUES (?,?,?)').run(
      PRIMARY_ACCOUNT_ID,
      process.env.PRIMARY_ACCOUNT_NAME || 'National Salon Supplies',
      process.env.PRIMARY_ACCOUNT_DOMAIN || 'nationalsalonsupplies.com.au',
    );
  }
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as any[];
  if (!cols.some(c => c.name === 'account_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN account_id INTEGER`);
    // One-off: every user that existed before accounts did belongs to the first customer.
    db.prepare('UPDATE users SET account_id = ?').run(PRIMARY_ACCOUNT_ID);
  }
  if (!cols.some(c => c.name === 'hub_user_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN hub_user_id TEXT`);
  }
}

function initSchema(db: any, primary: boolean) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT UNIQUE NOT NULL,
      key_name TEXT NOT NULL,
      key_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      scope TEXT,
      extra_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS seo_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      cost REAL NOT NULL,
      notes TEXT,
      UNIQUE(year, month)
    );
    CREATE TABLE IF NOT EXISTS budget_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#888888',
      icon TEXT NOT NULL DEFAULT '●',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date TEXT NOT NULL,
      platform TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      description TEXT,
      hours REAL,
      source TEXT DEFAULT 'manual',
      source_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS backlinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_url TEXT NOT NULL,
      target_url TEXT NOT NULL,
      anchor_text TEXT,
      keyword TEXT,
      status TEXT DEFAULT 'unchecked',
      http_status INTEGER,
      keyword_found INTEGER DEFAULT 0,
      target_found INTEGER DEFAULT 0,
      last_checked TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS brand_voices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      voice_tone TEXT,
      style TEXT,
      vocabulary TEXT,
      avoid_phrases TEXT,
      example_text TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      keyword TEXT,
      page_type TEXT NOT NULL DEFAULT 'super_page',
      content_html TEXT,
      content_md TEXT,
      meta_description TEXT,
      source_text TEXT,
      brand_voice_id INTEGER,
      serp_data TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      wp_post_id INTEGER,
      wp_url TEXT,
      wp_site TEXT,
      word_count INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      job_type TEXT NOT NULL,
      prompt TEXT,
      model TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      tokens_used INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);
  try {
    const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    // Logins live in the primary file only; other account files never get a seeded user.
    if (primary && count === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('nss2024!', 10);
      db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)').run('admin@nss.com.au', hash, 'admin');
    }
  } catch {}
  try {
    const chCount = (db.prepare('SELECT COUNT(*) as c FROM budget_channels').get() as any).c;
    if (chCount === 0) {
      const defaults = [
        { key: 'meta', name: 'Meta Ads', color: '#1877F2', icon: 'f', sort_order: 1 },
        { key: 'google', name: 'Google Ads', color: '#4285F4', icon: 'G', sort_order: 2 },
        { key: 'seo', name: 'SEO', color: '#a8cf45', icon: '◎', sort_order: 3 },
        { key: 'tiktok', name: 'TikTok Ads', color: '#69C9D0', icon: '♪', sort_order: 4 },
        { key: 'email', name: 'Email', color: '#ffe600', icon: '✉', sort_order: 5 },
      ];
      const stmt = db.prepare('INSERT OR IGNORE INTO budget_channels (key, name, color, icon, sort_order) VALUES (?,?,?,?,?)');
      for (const ch of defaults) stmt.run(ch.key, ch.name, ch.color, ch.icon, ch.sort_order);
    }
  } catch {}
  try {
    const bvCount = (db.prepare('SELECT COUNT(*) as c FROM brand_voices').get() as any).c;
    if (bvCount === 0) {
      db.prepare('INSERT INTO brand_voices (name, voice_tone, style, is_default) VALUES (?,?,?,1)')
        .run(primary ? 'NSS Default' : 'Default', primary ? 'Friendly, expert, helpful — speaks to salon professionals' : 'Friendly, expert, helpful', 'Conversational with practical detail');
    }
  } catch {}
  // uploaded_data (CSV uploads) table + migrations for older volumes
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS uploaded_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'campaign',
      report_type TEXT NOT NULL DEFAULT 'performance',
      data TEXT NOT NULL,
      filename TEXT,
      period TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    )`);
  } catch {}
  try { db.exec(`ALTER TABLE uploaded_data ADD COLUMN level TEXT NOT NULL DEFAULT 'campaign'`); } catch {}
  try { db.exec(`ALTER TABLE uploaded_data ADD COLUMN report_type TEXT NOT NULL DEFAULT 'performance'`); } catch {}
  try { db.exec(`ALTER TABLE uploaded_data ADD COLUMN period TEXT`); } catch {}
  // Migration: add hours column to timeline_events if missing
  try {
    db.prepare('SELECT hours FROM timeline_events LIMIT 1').get();
  } catch {
    try { db.exec('ALTER TABLE timeline_events ADD COLUMN hours REAL'); } catch {}
  }
}

export function getOAuthToken(platform: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM oauth_tokens WHERE platform = ?').get(platform) as any;
}

export function saveOAuthToken(platform: string, data: {
  access_token: string; refresh_token?: string; expires_at?: string; scope?: string; extra_data?: string;
}) {
  const db = getDb();
  db.prepare(`INSERT INTO oauth_tokens (platform, access_token, refresh_token, expires_at, scope, extra_data)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(platform) DO UPDATE SET
      access_token=excluded.access_token, refresh_token=excluded.refresh_token,
      expires_at=excluded.expires_at, scope=excluded.scope, extra_data=excluded.extra_data,
      updated_at=datetime('now')`
  ).run(platform, data.access_token, data.refresh_token||null, data.expires_at||null, data.scope||null, data.extra_data||null);
}
