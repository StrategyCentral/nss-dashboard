/**
 * The customer account a request is working in, and that customer's own site
 * and store settings. Nothing in the app should name a customer directly:
 * ask here instead.
 */
import { getDb, getPlatformDb, currentAccountId, PRIMARY_ACCOUNT_ID } from './db';

export interface Account {
  id: number;
  name: string;
  domain: string;
  created_at?: string;
}

export function listAccounts(): Account[] {
  return getPlatformDb().prepare('SELECT id, name, domain, created_at FROM accounts ORDER BY id').all() as Account[];
}

export function getAccountById(id: number): Account | null {
  return (getPlatformDb().prepare('SELECT id, name, domain, created_at FROM accounts WHERE id = ?').get(id) as Account) || null;
}

/** The account this request is for. */
export function getAccount(): Account {
  return getAccountById(currentAccountId()) || { id: PRIMARY_ACCOUNT_ID, name: 'ACE Marketing Suite', domain: '' };
}

export function cleanDomain(input: string): string {
  return String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
}

export function createAccount(name: string, domain: string): Account {
  const info = getPlatformDb().prepare('INSERT INTO accounts (name, domain) VALUES (?,?)').run(name.trim(), cleanDomain(domain));
  const account = getAccountById(Number(info.lastInsertRowid))!;
  return account;
}

export function updateAccount(id: number, name: string, domain: string) {
  getPlatformDb().prepare('UPDATE accounts SET name = ?, domain = ? WHERE id = ?').run(name.trim(), cleanDomain(domain), id);
}

function key(service: string): string {
  try {
    return (getDb().prepare('SELECT key_value FROM api_keys WHERE service = ?').get(service) as any)?.key_value || '';
  } catch {
    return '';
  }
}

/** The customer's website, no trailing slash: the saved store URL, else their domain. '' when neither is set. */
export function siteUrl(): string {
  const saved = key('woocommerce_url').trim().replace(/\/+$/, '');
  if (saved) return /^https?:\/\//.test(saved) ? saved : `https://${saved}`;
  const domain = getAccount().domain;
  return domain ? `https://${domain}` : '';
}

// The first customer's store keys were written into the code before accounts
// existed. They are kept here, for that one account only, so its dashboard
// keeps working until the keys are saved under Admin -> Connections -> WooCommerce.
// TODO: once saved there, delete these two lines and rotate the keys.
const LEGACY_PRIMARY_WC_KEY = 'ck_f2fcbdab70d6d74bff230207b02e2369987b2edf';
const LEGACY_PRIMARY_WC_SECRET = 'cs_08088c7f6b33a10b089502ec28d203ed31b79c71';

/** WooCommerce REST credentials for this account (Admin -> Connections -> WooCommerce). */
export function storeCreds(): { url: string; key: string; secret: string } {
  const primary = currentAccountId() === PRIMARY_ACCOUNT_ID;
  return {
    url: siteUrl(),
    key: key('woocommerce_key') || (primary ? LEGACY_PRIMARY_WC_KEY : ''),
    secret: key('woocommerce_secret') || (primary ? LEGACY_PRIMARY_WC_SECRET : ''),
  };
}

export class StoreNotConnectedError extends Error {
  constructor() {
    super('No store connected. Add the store URL and keys under Admin → Connections → WooCommerce.');
  }
}

/** Same as storeCreds(), but throws a plain-English error when the store is not set up. */
export function requireStore() {
  const creds = storeCreds();
  if (!creds.url || !creds.key || !creds.secret) throw new StoreNotConnectedError();
  return creds;
}
