let _db: any = null;
let _dbError: string | null = null;

export function getDb() {
  if (_db) return _db;
  if (_dbError) throw new Error(_dbError);
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    const DATA_DIR = process.env.DATA_DIR || '/tmp/nss-data';
    const DB_PATH = path.join(DATA_DIR, 'nss.db');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    initSchema(_db);
    return _db;
  } catch (e: any) {
    _dbError = e.message;
    throw e;
  }
}

function initSchema(db: any) {
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
  `);
  try {
    const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    if (count === 0) {
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
