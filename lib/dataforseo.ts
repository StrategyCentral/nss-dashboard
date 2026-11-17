/**
 * DataForSEO: the paid data source behind keyword, backlink and ranking numbers.
 *
 * The site audit needs none of this; it reads the site directly. Search
 * volume, difficulty, backlinks and Google positions cannot be read off a
 * website, so they come from DataForSEO's API, pay-as-you-go.
 *
 * Credentials, first match wins:
 *   1. Admin -> Connections -> DataForSEO (api_keys rows dataforseo_login /
 *      dataforseo_password), so each customer deployment can carry its own.
 *   2. Env DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD.
 * Both are the API login and API password from app.dataforseo.com/api-access,
 * not the dashboard password.
 *
 * Every endpoint here was run against the live API on 2026-11-17.
 */
import { getDb } from './db';

const API_BASE = 'https://api.dataforseo.com'
const REQUEST_TIMEOUT_MS = 30_000

// DataForSEO location codes. 2036 = Australia, 2840 = United States.
export const DEFAULT_LOCATION_CODE = 2036
export const DEFAULT_LANGUAGE_CODE = 'en'

export class DataForSeoError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function credentials(): { login: string; password: string } | null {
  try {
    const db = getDb()
    const read = (service: string) =>
      ((db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get(service) as any)?.key_value || '').trim()
    const login = read('dataforseo_login')
    const password = read('dataforseo_password')
    if (login && password) return { login, password }
  } catch {
    // No database (or no table yet): fall through to the environment.
  }
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  return login && password ? { login, password } : null
}

export function isDataForSeoConfigured(): boolean {
  return credentials() !== null
}

function authHeader(): string {
  const found = credentials()
  if (!found) throw new DataForSeoError(503, 'DataForSEO is not connected.')
  return 'Basic ' + Buffer.from(`${found.login}:${found.password}`).toString('base64')
}

interface DataForSeoTask<T> {
  status_code: number
  status_message: string
  cost?: number
  result: T[] | null
}

interface DataForSeoEnvelope<T> {
  status_code: number
  status_message: string
  cost?: number
  tasks?: DataForSeoTask<T>[]
}

/** POST one task and return its first result plus what the call cost in USD. */
async function postTask<T>(path: string, task: Record<string, unknown>): Promise<{ result: T | null; costUsd: number }> {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify([task]),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (response.status === 401) throw new DataForSeoError(401, 'DataForSEO rejected the API login or password.')
  if (response.status === 402) throw new DataForSeoError(402, 'The DataForSEO balance is empty. Top it up to continue.')
  if (!response.ok) throw new DataForSeoError(response.status, `DataForSEO answered ${response.status}.`)

  const envelope = (await response.json()) as DataForSeoEnvelope<T>
  // 20000 = OK. Errors are reported inside a 200 response.
  if (envelope.status_code !== 20000) throw new DataForSeoError(502, envelope.status_message)
  const first = envelope.tasks?.[0]
  if (!first) throw new DataForSeoError(502, 'DataForSEO returned no task.')
  if (first.status_code !== 20000) throw new DataForSeoError(502, first.status_message)
  return { result: first.result?.[0] ?? null, costUsd: envelope.cost ?? first.cost ?? 0 }
}

export interface KeywordRow {
  keyword: string
  searchVolume: number | null
  /** 0-100, DataForSEO's estimate of how hard page one is. */
  difficulty: number | null
  cpcUsd: number | null
  competition: number | null
  intent: string | null
  /** Only for a domain's ranked keywords. */
  position?: number | null
  url?: string | null
}

interface LabsKeywordData {
  keyword?: string
  keyword_info?: { search_volume?: number | null; cpc?: number | null; competition?: number | null }
  keyword_properties?: { keyword_difficulty?: number | null }
  search_intent_info?: { main_intent?: string | null }
}

function toKeywordRow(data: LabsKeywordData | undefined): KeywordRow {
  return {
    keyword: data?.keyword ?? '',
    searchVolume: data?.keyword_info?.search_volume ?? null,
    difficulty: data?.keyword_properties?.keyword_difficulty ?? null,
    cpcUsd: data?.keyword_info?.cpc ?? null,
    competition: data?.keyword_info?.competition ?? null,
    intent: data?.search_intent_info?.main_intent ?? null,
  }
}

export interface KeywordQuery {
  locationCode?: number
  languageCode?: string
  limit?: number
}

/** Longer keywords that contain the seed phrase, highest search volume first. */
export async function keywordSuggestions(seed: string, query: KeywordQuery = {}) {
  const { result, costUsd } = await postTask<{ total_count?: number; items?: LabsKeywordData[] | null }>(
    '/v3/dataforseo_labs/google/keyword_suggestions/live',
    {
      keyword: seed,
      location_code: query.locationCode ?? DEFAULT_LOCATION_CODE,
      language_code: query.languageCode ?? DEFAULT_LANGUAGE_CODE,
      limit: query.limit ?? 50,
      include_seed_keyword: true,
      order_by: ['keyword_info.search_volume,desc'],
    }
  )
  return {
    total: result?.total_count ?? 0,
    costUsd,
    keywords: (result?.items ?? []).map(toKeywordRow).filter((row) => row.keyword),
  }
}

/** Keywords a domain already ranks for in Google, highest search volume first. */
export async function rankedKeywords(domain: string, query: KeywordQuery = {}) {
  type RankedItem = {
    keyword_data?: LabsKeywordData
    ranked_serp_element?: { serp_item?: { rank_absolute?: number | null; url?: string | null } }
  }
  const { result, costUsd } = await postTask<{ total_count?: number; items?: RankedItem[] | null }>(
    '/v3/dataforseo_labs/google/ranked_keywords/live',
    {
      target: domain,
      location_code: query.locationCode ?? DEFAULT_LOCATION_CODE,
      language_code: query.languageCode ?? DEFAULT_LANGUAGE_CODE,
      limit: query.limit ?? 50,
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
    }
  )
  return {
    total: result?.total_count ?? 0,
    costUsd,
    keywords: (result?.items ?? [])
      .map((item) => ({
        ...toKeywordRow(item.keyword_data),
        position: item.ranked_serp_element?.serp_item?.rank_absolute ?? null,
        url: item.ranked_serp_element?.serp_item?.url ?? null,
      }))
      .filter((row) => row.keyword),
  }
}

// ─── Competitors ─────────────────────────────────────────────────────────────

export interface CompetitorRow {
  domain: string
  /** Keywords both domains rank for. */
  sharedKeywords: number
  /** Their average position on those shared keywords. */
  avgPosition: number | null
  /** Every keyword the competitor ranks for in this country. */
  totalKeywords: number | null
  /** DataForSEO's estimate of their monthly organic visits. */
  estimatedTraffic: number | null
}

/** Domains that rank for the same keywords as the target, most overlap first. */
export async function competitorDomains(domain: string, query: KeywordQuery = {}) {
  type Item = {
    domain?: string
    avg_position?: number | null
    intersections?: number | null
    full_domain_metrics?: { organic?: { count?: number | null; etv?: number | null } | null }
  }
  const { result, costUsd } = await postTask<{ total_count?: number; items?: Item[] | null }>(
    '/v3/dataforseo_labs/google/competitors_domain/live',
    {
      target: domain,
      location_code: query.locationCode ?? DEFAULT_LOCATION_CODE,
      language_code: query.languageCode ?? DEFAULT_LANGUAGE_CODE,
      // +1: the first row is the target itself.
      limit: (query.limit ?? 50) + 1,
      // Leaves out Wikipedia, YouTube, Reddit and the like, which "compete" with everyone.
      exclude_top_domains: true,
    }
  )
  const competitors: CompetitorRow[] = (result?.items ?? [])
    .filter((item) => item.domain && item.domain !== domain)
    .map((item) => ({
      domain: item.domain as string,
      sharedKeywords: item.intersections ?? 0,
      avgPosition: item.avg_position ?? null,
      totalKeywords: item.full_domain_metrics?.organic?.count ?? null,
      estimatedTraffic: item.full_domain_metrics?.organic?.etv ?? null,
    }))
  return { total: Math.max((result?.total_count ?? 0) - 1, 0), costUsd, competitors }
}

// ─── Backlinks ───────────────────────────────────────────────────────────────

export interface BacklinkSummary {
  /** 0-1000, DataForSEO's PageRank-style score for the domain. */
  rank: number | null
  backlinks: number
  referringDomains: number
  referringMainDomains: number
  /** Links pointing at a page on the target that no longer loads. */
  brokenBacklinks: number
  /** 0-100, average spam score of the linking pages. */
  spamScore: number | null
  firstSeen: string | null
}

export interface ReferringDomainRow {
  domain: string
  rank: number | null
  backlinks: number
  spamScore: number | null
  firstSeen: string | null
}

export interface BacklinkRow {
  fromUrl: string
  fromDomain: string
  fromTitle: string | null
  toUrl: string
  anchor: string | null
  dofollow: boolean
  /** The page being linked to is broken. */
  isBroken: boolean
  rank: number | null
  spamScore: number | null
  firstSeen: string | null
}

export interface AnchorRow {
  anchor: string
  backlinks: number
  referringDomains: number
  spamScore: number | null
}

export interface BacklinkProfile {
  domain: string
  costUsd: number
  summary: BacklinkSummary | null
  referringDomainsTotal: number
  referringDomains: ReferringDomainRow[]
  backlinksTotal: number
  backlinks: BacklinkRow[]
  anchorsTotal: number
  anchors: AnchorRow[]
}

/**
 * A domain's backlink profile: totals, the strongest referring domains, one
 * backlink per referring domain, and the anchor texts used. Four calls, run
 * together; about US$0.10 in all at the default limit.
 */
export async function backlinkProfile(domain: string, limit = 50): Promise<BacklinkProfile> {
  type SummaryResult = {
    rank?: number | null
    backlinks?: number
    referring_domains?: number
    referring_main_domains?: number
    broken_backlinks?: number
    backlinks_spam_score?: number | null
    first_seen?: string | null
  }
  type DomainItem = { domain?: string; rank?: number | null; backlinks?: number; backlinks_spam_score?: number | null; first_seen?: string | null }
  type LinkItem = {
    url_from?: string
    domain_from?: string
    page_from_title?: string | null
    url_to?: string
    anchor?: string | null
    dofollow?: boolean
    is_broken?: boolean
    rank?: number | null
    backlink_spam_score?: number | null
    first_seen?: string | null
  }
  type AnchorItem = { anchor?: string | null; backlinks?: number; referring_domains?: number; backlinks_spam_score?: number | null }
  type Listing<T> = { total_count?: number; items?: T[] | null }

  const [summary, domains, links, anchors] = await Promise.all([
    postTask<SummaryResult>('/v3/backlinks/summary/live', { target: domain, include_subdomains: true }),
    postTask<Listing<DomainItem>>('/v3/backlinks/referring_domains/live', {
      target: domain,
      limit,
      order_by: ['rank,desc'],
      exclude_internal_backlinks: true,
    }),
    postTask<Listing<LinkItem>>('/v3/backlinks/backlinks/live', {
      target: domain,
      limit,
      mode: 'one_per_domain',
      order_by: ['rank,desc'],
    }),
    postTask<Listing<AnchorItem>>('/v3/backlinks/anchors/live', { target: domain, limit, order_by: ['backlinks,desc'] }),
  ])

  const s = summary.result
  return {
    domain,
    costUsd: summary.costUsd + domains.costUsd + links.costUsd + anchors.costUsd,
    summary: s
      ? {
          rank: s.rank ?? null,
          backlinks: s.backlinks ?? 0,
          referringDomains: s.referring_domains ?? 0,
          referringMainDomains: s.referring_main_domains ?? 0,
          brokenBacklinks: s.broken_backlinks ?? 0,
          spamScore: s.backlinks_spam_score ?? null,
          firstSeen: s.first_seen ?? null,
        }
      : null,
    referringDomainsTotal: domains.result?.total_count ?? 0,
    referringDomains: (domains.result?.items ?? [])
      .filter((item) => item.domain)
      .map((item) => ({
        domain: item.domain as string,
        rank: item.rank ?? null,
        backlinks: item.backlinks ?? 0,
        spamScore: item.backlinks_spam_score ?? null,
        firstSeen: item.first_seen ?? null,
      })),
    backlinksTotal: links.result?.total_count ?? 0,
    backlinks: (links.result?.items ?? [])
      .filter((item) => item.url_from && item.url_to)
      .map((item) => ({
        fromUrl: item.url_from as string,
        fromDomain: item.domain_from ?? '',
        fromTitle: item.page_from_title ?? null,
        toUrl: item.url_to as string,
        anchor: item.anchor ?? null,
        dofollow: Boolean(item.dofollow),
        isBroken: Boolean(item.is_broken),
        rank: item.rank ?? null,
        spamScore: item.backlink_spam_score ?? null,
        firstSeen: item.first_seen ?? null,
      })),
    anchorsTotal: anchors.result?.total_count ?? 0,
    anchors: (anchors.result?.items ?? []).map((item) => ({
      anchor: item.anchor || '(no anchor text)',
      backlinks: item.backlinks ?? 0,
      referringDomains: item.referring_domains ?? 0,
      spamScore: item.backlinks_spam_score ?? null,
    })),
  }
}

// ─── Rank check ──────────────────────────────────────────────────────────────

export const RANK_DEPTHS = [20, 50, 100] as const
export const MAX_RANK_KEYWORDS = 25
/** DataForSEO bills live Google results per 10 results fetched. */
export const RANK_COST_PER_10_RESULTS_USD = 0.002

export interface RankResult {
  keyword: string
  /** Position among organic results; null = not in the results fetched. */
  position: number | null
  /** Position on the page counting every block (ads, maps, AI overview). */
  absolutePosition: number | null
  url: string | null
  /** The first three organic results, so you can see who is winning. */
  top: Array<{ position: number; domain: string }>
  costUsd: number
  error?: string
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '')
}

/** True when `host` is the domain itself or one of its subdomains. */
function hostMatches(host: string, domain: string): boolean {
  const a = bareHost(host)
  const b = bareHost(domain)
  return a === b || a.endsWith('.' + b)
}

/**
 * The site a search result belongs to.
 *
 * Google wraps many live results in a google.com/goto redirect, and DataForSEO
 * then reports the domain as "google.com" with an encoded URL. The real site
 * is only in the breadcrumb ("https://www.example.com › shop › wax"). When the
 * breadcrumb is not a URL the site is unknown, which is better than crediting
 * google.com with the result. (Approach from OpenSEO, MIT.)
 */
function resultSite(item: { url?: string | null; domain?: string | null; breadcrumb?: string | null }): string | null {
  const wrapped = /^https?:\/\/(www\.)?google\.[a-z.]+\/goto\?/i.test(item.url ?? '')
  if (!wrapped) return item.domain ? bareHost(item.domain) : null
  const first = item.breadcrumb?.split('›')[0]?.trim()
  if (!first || !/^https?:\/\//i.test(first)) return null
  try {
    return bareHost(new URL(first).hostname)
  } catch {
    return null
  }
}

/**
 * Where a domain sits in Google for one keyword, right now.
 *
 * One live read of the results page. Google does not show every reader the
 * same page, so a position can differ by a few places between two checks made
 * minutes apart; the trend over several checks is what to trust.
 */
export async function rankForKeyword(
  keyword: string,
  domain: string,
  options: { locationCode?: number; languageCode?: string; depth?: number; device?: 'desktop' | 'mobile' } = {}
): Promise<RankResult> {
  type SerpItem = { type?: string; rank_group?: number; rank_absolute?: number; domain?: string | null; url?: string | null; breadcrumb?: string | null }
  try {
    const { result, costUsd } = await postTask<{ items?: SerpItem[] | null }>('/v3/serp/google/organic/live/advanced', {
      keyword,
      location_code: options.locationCode ?? DEFAULT_LOCATION_CODE,
      language_code: options.languageCode ?? DEFAULT_LANGUAGE_CODE,
      depth: options.depth ?? 50,
      device: options.device ?? 'desktop',
    })
    const organic = (result?.items ?? [])
      .filter((item) => item.type === 'organic')
      .map((item) => ({ item, site: resultSite(item) }))
    const hit = organic.find((row) => row.site !== null && hostMatches(row.site, domain))
    return {
      keyword,
      // rank_group counts organic results only, which is what people mean by
      // "my ranking". rank_absolute also counts the map pack, AI overview, etc.
      position: hit?.item.rank_group ?? null,
      absolutePosition: hit?.item.rank_absolute ?? null,
      // May be a google.com/goto link; it still opens the ranking page.
      url: hit?.item.url ?? null,
      top: organic
        .filter((row) => row.site !== null)
        .slice(0, 3)
        .map((row) => ({ position: row.item.rank_group ?? 0, domain: row.site as string })),
      costUsd,
    }
  } catch (e) {
    return {
      keyword,
      position: null,
      absolutePosition: null,
      url: null,
      top: [],
      costUsd: 0,
      error: e instanceof DataForSeoError ? e.message : 'Lookup failed',
    }
  }
}

/** Turn what someone typed ("https://www.Example.com/page") into "example.com". */
export function cleanDomain(input: string): string | null {
  const stripped = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(stripped) ? stripped : null
}
