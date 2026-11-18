/**
 * Storage for the SEO tools: site audits, saved research lookups, and the
 * rank tracker. Everything lives in the app's SQLite database (lib/db.ts),
 * so a report or a paid lookup is still there tomorrow.
 *
 * Tables (all created on first use, nothing to migrate by hand):
 *   seo_audits            one row per site audit, with the full report as JSON
 *   seo_lookups           every paid DataForSEO lookup: what was asked, the
 *                         answer, and what it cost. Doubles as a 7-day cache
 *                         so asking the same thing twice is free.
 *   seo_tracked_keywords  keywords being rank-tracked, per domain + country + device
 *   seo_rank_checks       one row per position check of a tracked keyword
 *
 * Nothing here is tied to one customer: rows carry the domain they are about.
 */
import { getDb } from './db';
import { getAccount } from './account';
import type { AuditReport } from './seo-audit/crawler';
import type { RankResult } from './dataforseo';

// One flag per database: each customer account has its own file.
const schemaReady = new WeakSet<object>();

function db() {
  const database = getDb();
  if (!schemaReady.has(database)) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS seo_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        requested_url TEXT NOT NULL,
        max_pages INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        error TEXT,
        pages_crawled INTEGER,
        clean_pages INTEGER,
        html_pages INTEGER,
        critical INTEGER,
        warning INTEGER,
        info INTEGER,
        duration_ms INTEGER,
        report_json TEXT,
        created_by TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        finished_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_seo_audits_domain ON seo_audits(domain, id DESC);

      CREATE TABLE IF NOT EXISTS seo_lookups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        query TEXT NOT NULL,
        location_code INTEGER NOT NULL DEFAULT 0,
        result_json TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_seo_lookups_key ON seo_lookups(kind, query, location_code, id DESC);

      CREATE TABLE IF NOT EXISTS seo_tracked_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        keyword TEXT NOT NULL,
        location_code INTEGER NOT NULL,
        device TEXT NOT NULL DEFAULT 'desktop',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(domain, keyword, location_code, device)
      );

      CREATE TABLE IF NOT EXISTS seo_rank_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracked_id INTEGER NOT NULL,
        position INTEGER,
        url TEXT,
        top_json TEXT,
        depth INTEGER NOT NULL,
        cost_usd REAL NOT NULL DEFAULT 0,
        checked_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_seo_rank_checks_tracked ON seo_rank_checks(tracked_id, id DESC);
    `);
    schemaReady.add(database);
  }
  return database;
}

// ─── The customer's own site ─────────────────────────────────────────────────

function hostOf(value: string): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The domain this deployment is about, used to prefill the SEO tools.
 * Read from what is already configured, so nothing new has to be set:
 * the Search Console property, then the store URL, then env SITE_DOMAIN.
 */
export function getDefaultDomain(): string | null {
  try {
    const read = (service: string) =>
      (db().prepare('SELECT key_value FROM api_keys WHERE service = ?').get(service) as any)?.key_value || '';
    return hostOf(read('gsc_site_main')) || hostOf(read('woocommerce_url')) || hostOf(getAccount().domain) || hostOf(process.env.SITE_DOMAIN || '');
  } catch {
    return hostOf(process.env.SITE_DOMAIN || '');
  }
}

// ─── Site audits ─────────────────────────────────────────────────────────────

export interface AuditRow {
  id: number;
  domain: string;
  requested_url: string;
  max_pages: number;
  status: 'running' | 'done' | 'failed';
  error: string | null;
  pages_crawled: number | null;
  clean_pages: number | null;
  html_pages: number | null;
  critical: number | null;
  warning: number | null;
  info: number | null;
  duration_ms: number | null;
  created_by: string | null;
  started_at: string;
  finished_at: string | null;
}

const AUDIT_COLUMNS =
  'id, domain, requested_url, max_pages, status, error, pages_crawled, clean_pages, html_pages, critical, warning, info, duration_ms, created_by, started_at, finished_at';

// An audit is capped at five minutes; one still "running" after ten died with its process.
const STALE_AUDIT_MINUTES = 10;

export function createAudit(input: { domain: string; requestedUrl: string; maxPages: number; createdBy: string }): number {
  const result = db()
    .prepare('INSERT INTO seo_audits (domain, requested_url, max_pages, created_by) VALUES (?,?,?,?)')
    .run(input.domain, input.requestedUrl, input.maxPages, input.createdBy);
  return Number(result.lastInsertRowid);
}

export function finishAudit(id: number, report: AuditReport) {
  db()
    .prepare(
      `UPDATE seo_audits SET status='done', domain=?, pages_crawled=?, clean_pages=?, html_pages=?, critical=?, warning=?, info=?,
       duration_ms=?, report_json=?, finished_at=datetime('now') WHERE id=?`,
    )
    .run(
      new URL(report.origin).hostname.replace(/^www\./, ''),
      report.stats.pagesCrawled,
      report.stats.cleanPages,
      report.stats.htmlPages,
      report.stats.critical,
      report.stats.warning,
      report.stats.info,
      report.durationMs,
      JSON.stringify(report),
      id,
    );
}

export function failAudit(id: number, message: string) {
  db().prepare("UPDATE seo_audits SET status='failed', error=?, finished_at=datetime('now') WHERE id=?").run(message, id);
}

export function listAudits(limit = 30): AuditRow[] {
  const database = db();
  database
    .prepare(
      `UPDATE seo_audits SET status='failed', error='The audit was interrupted.', finished_at=datetime('now')
       WHERE status='running' AND started_at < datetime('now', ?)`,
    )
    .run(`-${STALE_AUDIT_MINUTES} minutes`);
  return database.prepare(`SELECT ${AUDIT_COLUMNS} FROM seo_audits ORDER BY id DESC LIMIT ?`).all(limit) as AuditRow[];
}

export function getAuditReport(id: number): { row: AuditRow; report: AuditReport | null } | null {
  const found = db().prepare(`SELECT ${AUDIT_COLUMNS}, report_json FROM seo_audits WHERE id=?`).get(id) as
    | (AuditRow & { report_json: string | null })
    | undefined;
  if (!found) return null;
  const { report_json, ...row } = found;
  let report: AuditReport | null = null;
  try {
    report = report_json ? (JSON.parse(report_json) as AuditReport) : null;
  } catch {
    report = null;
  }
  return { row, report };
}

export function deleteAudit(id: number) {
  db().prepare('DELETE FROM seo_audits WHERE id=?').run(id);
}

// ─── Saved research lookups (also the cache) ─────────────────────────────────

export type LookupKind = 'keyword-ideas' | 'domain-keywords' | 'competitors' | 'backlinks';
export const LOOKUP_KINDS: LookupKind[] = ['keyword-ideas', 'domain-keywords', 'competitors', 'backlinks'];
/** A saved answer younger than this is reused instead of paying for a new one. */
export const LOOKUP_CACHE_DAYS = 7;

export interface LookupRow {
  id: number;
  kind: LookupKind;
  query: string;
  location_code: number;
  row_count: number;
  cost_usd: number;
  created_by: string | null;
  created_at: string;
}

const LOOKUP_COLUMNS = 'id, kind, query, location_code, row_count, cost_usd, created_by, created_at';

export function saveLookup(input: {
  kind: LookupKind;
  query: string;
  locationCode: number;
  result: unknown;
  rowCount: number;
  costUsd: number;
  createdBy: string;
}): LookupRow {
  const database = db();
  const result = database
    .prepare('INSERT INTO seo_lookups (kind, query, location_code, result_json, row_count, cost_usd, created_by) VALUES (?,?,?,?,?,?,?)')
    .run(input.kind, input.query, input.locationCode, JSON.stringify(input.result), input.rowCount, input.costUsd, input.createdBy);
  return database.prepare(`SELECT ${LOOKUP_COLUMNS} FROM seo_lookups WHERE id=?`).get(result.lastInsertRowid) as LookupRow;
}

function withResult(found: (LookupRow & { result_json: string }) | undefined): { row: LookupRow; result: any } | null {
  if (!found) return null;
  const { result_json, ...row } = found;
  try {
    return { row, result: JSON.parse(result_json) };
  } catch {
    return null;
  }
}

export function findFreshLookup(kind: LookupKind, query: string, locationCode: number) {
  return withResult(
    db()
      .prepare(
        `SELECT ${LOOKUP_COLUMNS}, result_json FROM seo_lookups
         WHERE kind=? AND query=? AND location_code=? AND created_at >= datetime('now', ?)
         ORDER BY id DESC LIMIT 1`,
      )
      .get(kind, query, locationCode, `-${LOOKUP_CACHE_DAYS} days`) as any,
  );
}

export function getLookup(id: number) {
  return withResult(db().prepare(`SELECT ${LOOKUP_COLUMNS}, result_json FROM seo_lookups WHERE id=?`).get(id) as any);
}

export function listLookups(kinds: LookupKind[], limit = 30): LookupRow[] {
  const marks = kinds.map(() => '?').join(',');
  return db()
    .prepare(`SELECT ${LOOKUP_COLUMNS} FROM seo_lookups WHERE kind IN (${marks}) ORDER BY id DESC LIMIT ?`)
    .all(...kinds, limit) as LookupRow[];
}

export function deleteLookup(id: number) {
  db().prepare('DELETE FROM seo_lookups WHERE id=?').run(id);
}

// ─── Rank tracker ────────────────────────────────────────────────────────────

export interface TrackedKeyword {
  id: number;
  domain: string;
  keyword: string;
  location_code: number;
  device: 'desktop' | 'mobile';
  created_at: string;
  /** Latest check, or null when never checked. position null = not in the results fetched. */
  latest: { position: number | null; url: string | null; depth: number; checked_at: string; top: Array<{ position: number; domain: string }> } | null;
  /** Position at the check before the latest one. */
  previous_position: number | null | undefined;
  best_position: number | null;
  /** Oldest first, at most 30 checks. */
  history: Array<{ position: number | null; checked_at: string }>;
}

export function addTrackedKeywords(input: { domain: string; keywords: string[]; locationCode: number; device: 'desktop' | 'mobile' }): number {
  const insert = db().prepare('INSERT OR IGNORE INTO seo_tracked_keywords (domain, keyword, location_code, device) VALUES (?,?,?,?)');
  let added = 0;
  for (const keyword of input.keywords) added += insert.run(input.domain, keyword, input.locationCode, input.device).changes;
  return added;
}

export function getTrackedRows(filter: { domain?: string; ids?: number[] }) {
  const database = db();
  if (filter.ids && filter.ids.length > 0) {
    const marks = filter.ids.map(() => '?').join(',');
    return database.prepare(`SELECT * FROM seo_tracked_keywords WHERE id IN (${marks})`).all(...filter.ids) as any[];
  }
  if (filter.domain) return database.prepare('SELECT * FROM seo_tracked_keywords WHERE domain=? ORDER BY keyword').all(filter.domain) as any[];
  return database.prepare('SELECT * FROM seo_tracked_keywords ORDER BY domain, keyword').all() as any[];
}

export function listTracked(domain?: string): TrackedKeyword[] {
  const database = db();
  const history = database.prepare(
    'SELECT position, url, top_json, depth, checked_at FROM seo_rank_checks WHERE tracked_id=? ORDER BY id DESC LIMIT 30',
  );
  const best = database.prepare('SELECT MIN(position) AS best FROM seo_rank_checks WHERE tracked_id=? AND position IS NOT NULL');
  return getTrackedRows({ domain }).map((row) => {
    const checks = history.all(row.id) as any[];
    const latest = checks[0];
    let top: Array<{ position: number; domain: string }> = [];
    try {
      top = latest?.top_json ? JSON.parse(latest.top_json) : [];
    } catch {
      top = [];
    }
    return {
      ...row,
      latest: latest ? { position: latest.position, url: latest.url, depth: latest.depth, checked_at: latest.checked_at, top } : null,
      previous_position: checks[1] ? checks[1].position : undefined,
      best_position: (best.get(row.id) as any)?.best ?? null,
      history: checks.map((check) => ({ position: check.position, checked_at: check.checked_at })).reverse(),
    };
  });
}

export function listTrackedDomains(): Array<{ domain: string; keywords: number }> {
  return db()
    .prepare('SELECT domain, COUNT(*) AS keywords FROM seo_tracked_keywords GROUP BY domain ORDER BY domain')
    .all() as Array<{ domain: string; keywords: number }>;
}

export function recordRankCheck(trackedId: number, depth: number, result: RankResult) {
  db()
    .prepare('INSERT INTO seo_rank_checks (tracked_id, position, url, top_json, depth, cost_usd) VALUES (?,?,?,?,?,?)')
    .run(trackedId, result.position, result.url, JSON.stringify(result.top), depth, result.costUsd);
}

export function deleteTracked(id: number) {
  const database = db();
  database.prepare('DELETE FROM seo_rank_checks WHERE tracked_id=?').run(id);
  database.prepare('DELETE FROM seo_tracked_keywords WHERE id=?').run(id);
}

// ─── Spend ───────────────────────────────────────────────────────────────────

/** What the SEO tools have spent at DataForSEO this calendar month (UTC), in USD. */
export function monthSpendUsd(): number {
  const database = db();
  const lookups = database
    .prepare("SELECT COALESCE(SUM(cost_usd),0) AS total FROM seo_lookups WHERE created_at >= datetime('now','start of month')")
    .get() as any;
  const checks = database
    .prepare("SELECT COALESCE(SUM(cost_usd),0) AS total FROM seo_rank_checks WHERE checked_at >= datetime('now','start of month')")
    .get() as any;
  return (lookups?.total ?? 0) + (checks?.total ?? 0);
}
