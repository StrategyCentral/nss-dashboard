/**
 * ACE site-audit crawler.
 *
 * The parsing, URL rules and issue checks are ported from OpenSEO (MIT, see
 * ./LICENSE-open-seo.txt). This file is ours: OpenSEO drives its crawl with
 * Cloudflare Workflows, a Durable Object and a database. The Marketing Suite
 * has no database yet, so one audit is one in-memory run that returns a
 * report. Nothing is stored on the server.
 *
 * What it does: start at one URL, read robots.txt and the sitemap, follow
 * same-site links breadth-first up to a page limit, analyse each HTML page,
 * then run the cross-page checks (duplicates, redirect chains, broken
 * internal links, orphan pages).
 *
 * What it does not do: run JavaScript, score page speed (Lighthouse), or
 * check links to other sites.
 */

import { createHash } from "node:crypto";
import { analyzeHtml } from "./page-analyzer";
import { classifyFetch } from "./classify-fetch";
import { CRAWL_USER_AGENT, discoverSite } from "./discovery";
import {
  AUDIT_ISSUE_TYPES,
  ISSUE_SEVERITY_ORDER,
  findDuplicates,
  findLinkGraphIssues,
  findRedirectChainsAndLoops,
  runPageReporters,
  type AuditIssueType,
  type DetectedIssue,
  type IssueSeverity,
} from "./issues";
import {
  AuditUrlError,
  createHostGuard,
  normalizeAndValidateStartUrl,
  type HostGuard,
} from "./url-policy";
import { isAuditablePageUrl, isSameOrigin, normalizeUrl } from "./url-utils";
import type { CrawledPageResult } from "./types";

export const DEFAULT_MAX_PAGES = 50;
export const MAX_PAGES_LIMIT = 300;

const CONCURRENCY = 5;
const PAGE_FETCH_TIMEOUT_MS = 20_000;
const MAX_HTML_BYTES = 1024 * 1024;
const CRAWL_TIME_BUDGET_MS = 5 * 60 * 1000;
const START_URL_REDIRECT_HOPS = 5;
const RATE_LIMIT_DEFAULT_WAIT_MS = 3_000;
const RATE_LIMIT_MAX_WAIT_MS = 10_000;
const RATE_LIMIT_STOP_AFTER = 5;
const MAX_ITEMS_PER_ISSUE = 200;
const MAX_STORED_TEXT_CHARS = 300;

export type StopReason = "page-limit" | "time-limit" | "rate-limited";

export interface AuditProgress {
  crawled: number;
  queued: number;
  limit: number;
  currentUrl: string;
}

export interface AuditIssueGroup {
  type: AuditIssueType;
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
  /** Every occurrence, including those past the `items` cap. */
  count: number;
  items: Array<{ url: string; details?: Record<string, unknown> }>;
}

export interface AuditPageSummary {
  url: string;
  statusCode: number;
  fetchClass: CrawledPageResult["fetchClass"];
  fetchError?: string;
  redirectUrl: string | null;
  title: string;
  metaDescription: string;
  canonicalUrl: string | null;
  h1Count: number;
  wordCount: number;
  isHtml: boolean;
  isIndexable: boolean;
  responseTimeMs: number;
  crawlDepth: number | null;
  inSitemap: boolean;
  internalLinks: number;
  externalLinks: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  hasStructuredData: boolean;
  issueTypes: AuditIssueType[];
}

export interface AuditReport {
  requestedUrl: string;
  startUrl: string;
  origin: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  maxPages: number;
  stats: {
    pagesCrawled: number;
    htmlPages: number;
    /** HTML pages that loaded and carry no critical or warning issue. */
    cleanPages: number;
    critical: number;
    warning: number;
    info: number;
    robotsTxtFound: boolean;
    sitemapFound: boolean;
    sitemapUrls: number;
    /** URLs robots.txt disallows. Not fetched unless respectedRobots is false. */
    disallowedByRobots: number;
    respectedRobots: boolean;
    urlsNotCrawled: number;
    stopReason: StopReason | null;
  };
  issueGroups: AuditIssueGroup[];
  pages: AuditPageSummary[];
}

export class AuditError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function clampMaxPages(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_PAGES;
  return Math.min(Math.max(Math.round(parsed), 1), MAX_PAGES_LIMIT);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeFetchError(error: unknown): string {
  if (error && typeof error === "object") {
    const named = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    if (named.name === "TimeoutError") return "Timed out";
    if (named.cause?.code) return named.cause.code;
    if (named.cause?.message) return named.cause.message;
    if (named.message) return named.message;
  }
  return "Request failed";
}

/** Read at most maxBytes of a body as text, then stop downloading. */
async function readTextUpTo(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytesRead = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - bytesRead;
    const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
    bytesRead += chunk.byteLength;
    parts.push(decoder.decode(chunk, { stream: true }));
    if (bytesRead >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  parts.push(decoder.decode());
  return parts.join("");
}

function retryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");
  if (!header) return RATE_LIMIT_DEFAULT_WAIT_MS;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds * 1000, 500), RATE_LIMIT_MAX_WAIT_MS);
  }
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(Math.max(date - Date.now(), 500), RATE_LIMIT_MAX_WAIT_MS);
  }
  return RATE_LIMIT_DEFAULT_WAIT_MS;
}

function headerCanonical(response: Response, pageUrl: string): string | null {
  const link = response.headers.get("link");
  if (!link) return null;
  const match = /<([^>]+)>\s*;[^,]*\brel\s*=\s*"?canonical"?/i.exec(link);
  return match ? normalizeUrl(match[1], pageUrl, { keepTrackingParams: true }) : null;
}

function blocksIndexing(directive: string | null): boolean {
  return Boolean(directive && /\b(noindex|none)\b/i.test(directive));
}

function emptyPage(
  id: string,
  url: string,
  crawlDepth: number | null,
  inSitemap: boolean,
): CrawledPageResult {
  return {
    id,
    url,
    statusCode: 0,
    fetchClass: "error",
    redirectUrl: null,
    title: "",
    metaDescription: "",
    canonicalUrl: null,
    robotsMeta: null,
    xRobotsTag: null,
    headerCanonicalUrl: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    h1Count: 0,
    headingOrder: [],
    wordCount: 0,
    contentHash: null,
    isHtml: false,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    links: [],
    hasStructuredData: false,
    hreflangTags: [],
    isIndexable: true,
    responseTimeMs: 0,
    crawlDepth,
    inSitemap,
  };
}

async function fetchOnce(url: string): Promise<{ response: Response; responseTimeMs: number }> {
  const started = Date.now();
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": CRAWL_USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
  });
  // Measured at the response headers, i.e. server response time, not download.
  return { response, responseTimeMs: Date.now() - started };
}

/** Fetch and analyse one URL. Never throws: a failed fetch is a page record. */
async function crawlPage(
  id: string,
  url: string,
  crawlDepth: number | null,
  inSitemap: boolean,
  isSafeToFetch: HostGuard,
): Promise<{ page: CrawledPageResult; rateLimited: boolean }> {
  const page = emptyPage(id, url, crawlDepth, inSitemap);
  let rateLimited = false;

  if (!(await isSafeToFetch(url))) {
    page.fetchError = "Address is not on the public internet";
    return { page, rateLimited };
  }

  try {
    let { response, responseTimeMs } = await fetchOnce(url);
    if (response.status === 429) {
      rateLimited = true;
      const wait = retryAfterMs(response);
      await response.body?.cancel();
      await sleep(wait);
      ({ response, responseTimeMs } = await fetchOnce(url));
    }

    page.statusCode = response.status;
    page.responseTimeMs = responseTimeMs;
    page.xRobotsTag = response.headers.get("x-robots-tag");
    page.headerCanonicalUrl = headerCanonical(response, url);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      page.redirectUrl = location ? normalizeUrl(location, url) : null;
      page.fetchClass = "ok";
      return { page, rateLimited };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const looksHtml = contentType === "" || /html/i.test(contentType);
    const html = looksHtml ? await readTextUpTo(response, MAX_HTML_BYTES) : "";
    if (!looksHtml) await response.body?.cancel();

    page.fetchClass = classifyFetch(
      response.status,
      response.headers.has("cf-mitigated"),
      html.slice(0, 20_000),
    );
    if (page.fetchClass !== "ok" || !looksHtml || response.status >= 400) {
      return { page, rateLimited };
    }

    const analysis = analyzeHtml(html, url, response.status, responseTimeMs);
    page.isHtml = true;
    page.title = analysis.title;
    page.metaDescription = analysis.metaDescription;
    page.canonicalUrl = analysis.canonical
      ? normalizeUrl(analysis.canonical, url, { keepTrackingParams: true })
      : null;
    page.robotsMeta = analysis.robotsMeta;
    page.ogTitle = analysis.ogTitle;
    page.ogDescription = analysis.ogDescription;
    page.ogImage = analysis.ogImage;
    page.h1Count = analysis.h1s.length;
    page.headingOrder = analysis.headingOrder;
    page.wordCount = analysis.wordCount;
    page.contentHash = createHash("sha256").update(analysis.bodyText).digest("hex");
    page.javascriptShell = analysis.javascriptShell;
    page.imagesTotal = analysis.images.length;
    page.imagesMissingAlt = analysis.images.filter((image) => image.alt === null).length;
    page.links = analysis.links;
    page.hasStructuredData = analysis.hasStructuredData;
    page.hreflangTags = analysis.hreflangTags;
    page.isIndexable = !blocksIndexing(page.robotsMeta) && !blocksIndexing(page.xRobotsTag);
    return { page, rateLimited };
  } catch (error) {
    page.statusCode = 0;
    page.fetchClass = "error";
    page.fetchError = describeFetchError(error);
    return { page, rateLimited };
  }
}

/**
 * Follow redirects on the start URL so the audit anchors to the site's real
 * origin. Without this, auditing a domain that 301s elsewhere (apex -> www,
 * .net -> .com) dead-ends after one page, because the target is another
 * origin and the crawl only follows same-site links.
 */
async function resolveStartUrl(startUrl: string, isSafeToFetch: HostGuard): Promise<string> {
  let current = startUrl;
  for (let hop = 0; hop < START_URL_REDIRECT_HOPS; hop++) {
    let response: Response;
    try {
      ({ response } = await fetchOnce(current));
    } catch {
      return current;
    }
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (response.status < 300 || response.status >= 400 || !location) return current;
    let next: string;
    try {
      next = new URL(location, current).toString();
    } catch {
      return current;
    }
    try {
      current = await normalizeAndValidateStartUrl(next, isSafeToFetch);
    } catch {
      throw new AuditError(
        "TARGET_BLOCKED",
        `${startUrl} redirects to an address that cannot be audited.`,
      );
    }
  }
  return current;
}

function truncate(text: string): string {
  return text.length > MAX_STORED_TEXT_CHARS ? `${text.slice(0, MAX_STORED_TEXT_CHARS)}…` : text;
}

export async function runSiteAudit(options: {
  url: string;
  maxPages?: number;
  /**
   * Default true: URLs that robots.txt disallows are reported, not fetched.
   * False is for auditing a site you own that is still blocked before launch.
   */
  respectRobots?: boolean;
  onProgress?: (progress: AuditProgress) => void;
  signal?: AbortSignal;
}): Promise<AuditReport> {
  const startedAt = Date.now();
  const maxPages = clampMaxPages(options.maxPages);
  const respectRobots = options.respectRobots !== false;
  const isSafeToFetch = createHostGuard();

  let validated: string;
  try {
    validated = await normalizeAndValidateStartUrl(options.url, isSafeToFetch);
  } catch (error) {
    if (error instanceof AuditUrlError) throw new AuditError(error.code, error.message);
    throw error;
  }

  const startUrl = normalizeUrl(await resolveStartUrl(validated, isSafeToFetch));
  if (!startUrl) throw new AuditError("INVALID_URL", "That is not a valid website address.");
  const origin = new URL(startUrl).origin;

  const { robots, sitemapUrls, sitemapFound } = await discoverSite(origin, maxPages, isSafeToFetch);
  const inSitemap = new Set(sitemapUrls);

  // Frontier. Linked URLs are crawled breadth-first before sitemap-only URLs,
  // so a small page limit goes to the pages closest to the start page.
  type Entry = { depth: number | null; state: "queued" | "started" };
  const frontier = new Map<string, Entry>();
  const linkQueue: string[] = [];
  const sitemapQueue: string[] = [];
  const disallowedByRobots = new Set<string>();

  const enqueue = (url: string, depth: number | null, isStart = false) => {
    const existing = frontier.get(url);
    if (existing) {
      // Reached by a link after being seeded from the sitemap: it now has a depth.
      if (existing.state === "queued" && existing.depth === null && depth !== null) {
        existing.depth = depth;
        linkQueue.push(url);
      }
      return;
    }
    if (!isStart && (!isSameOrigin(url, origin) || !isAuditablePageUrl(url))) return;
    if (!robots.isAllowed(url)) {
      disallowedByRobots.add(url);
      // The start page is always fetched: it is the page that was asked for.
      if (respectRobots && !isStart) return;
    }
    frontier.set(url, { depth, state: "queued" });
    (depth === null ? sitemapQueue : linkQueue).push(url);
  };

  enqueue(startUrl, 0, true);
  for (const url of sitemapUrls) enqueue(url, null);

  const takeNext = (): string | null => {
    for (const queue of [linkQueue, sitemapQueue]) {
      while (queue.length > 0) {
        const url = queue.shift()!;
        const entry = frontier.get(url);
        if (entry && entry.state === "queued") {
          entry.state = "started";
          return url;
        }
      }
    }
    return null;
  };

  const queuedCount = () => {
    let count = 0;
    frontier.forEach((entry) => {
      if (entry.state === "queued") count += 1;
    });
    return count;
  };

  const pages: CrawledPageResult[] = [];
  let startedCount = 0;
  let inFlight = 0;
  let consecutiveRateLimits = 0;
  let stopReason: StopReason | null = null;
  let aborted = false;

  const worker = async () => {
    for (;;) {
      if (options.signal?.aborted) {
        aborted = true;
        return;
      }
      if (stopReason) return;
      if (Date.now() - startedAt > CRAWL_TIME_BUDGET_MS) {
        if (queuedCount() > 0) stopReason = "time-limit";
        return;
      }
      if (startedCount >= maxPages) {
        if (queuedCount() > 0) stopReason = "page-limit";
        return;
      }

      const url = takeNext();
      if (!url) {
        if (inFlight === 0) return;
        await sleep(50);
        continue;
      }

      startedCount += 1;
      inFlight += 1;
      try {
        const entry = frontier.get(url)!;
        const { page, rateLimited } = await crawlPage(
          `p${startedCount}`,
          url,
          entry.depth,
          inSitemap.has(url),
          isSafeToFetch,
        );
        // A link may have reached this URL while it was being fetched.
        page.crawlDepth = entry.depth;
        pages.push(page);

        if (page.fetchClass === "rate_limited") {
          consecutiveRateLimits += 1;
          if (consecutiveRateLimits >= RATE_LIMIT_STOP_AFTER) stopReason = "rate-limited";
        } else if (!rateLimited) {
          consecutiveRateLimits = 0;
        }

        if (page.redirectUrl) enqueue(page.redirectUrl, entry.depth);
        if (page.isHtml) {
          const childDepth = entry.depth === null ? null : entry.depth + 1;
          for (const link of page.links) {
            if (link.isInternal) enqueue(link.targetUrl, childDepth);
          }
        }

        options.onProgress?.({
          crawled: pages.length,
          queued: queuedCount(),
          limit: maxPages,
          currentUrl: url,
        });
      } finally {
        inFlight -= 1;
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  if (aborted) throw new AuditError("ABORTED", "The audit was cancelled.");

  const startPage = pages.find((page) => page.url === startUrl);
  if (pages.length === 1 && startPage && startPage.fetchClass === "error") {
    throw new AuditError(
      "START_UNREACHABLE",
      `Could not load ${startUrl} (${startPage.fetchError ?? "request failed"}).`,
    );
  }

  const urlsNotCrawled = queuedCount();
  const crawlComplete = stopReason === null && urlsNotCrawled === 0;

  // Issues
  const detected: DetectedIssue[] = [];
  for (const page of pages) detected.push(...runPageReporters(page));
  detected.push(...findDuplicates(pages));
  detected.push(...findRedirectChainsAndLoops(pages));
  detected.push(...findLinkGraphIssues(pages, { startUrl, crawlComplete }));
  disallowedByRobots.forEach((url) => {
    detected.push({
      issueType: inSitemap.has(url) ? "sitemap-url-blocked-by-robots" : "disallowed-by-robots",
      pageId: null,
      pageUrl: url,
    });
  });
  if (stopReason) {
    const stopIssue: AuditIssueType =
      stopReason === "page-limit"
        ? "crawl-page-limit"
        : stopReason === "time-limit"
          ? "crawl-time-limit"
          : "crawl-rate-limited";
    detected.push({
      issueType: stopIssue,
      pageId: null,
      pageUrl: startUrl,
      details: { pagesCrawled: pages.length, urlsNotCrawled },
    });
  }

  const groups = new Map<AuditIssueType, AuditIssueGroup>();
  const issueTypesByPage = new Map<string, Set<AuditIssueType>>();
  for (const issue of detected) {
    const descriptor = AUDIT_ISSUE_TYPES[issue.issueType];
    let group = groups.get(issue.issueType);
    if (!group) {
      group = {
        type: issue.issueType,
        severity: descriptor.severity,
        title: descriptor.title,
        explanation: descriptor.explanation,
        howToFix: descriptor.howToFix,
        count: 0,
        items: [],
      };
      groups.set(issue.issueType, group);
    }
    group.count += 1;
    if (group.items.length < MAX_ITEMS_PER_ISSUE) {
      group.items.push({ url: issue.pageUrl, details: issue.details });
    }
    if (issue.pageId) {
      const types = issueTypesByPage.get(issue.pageId) ?? new Set<AuditIssueType>();
      types.add(issue.issueType);
      issueTypesByPage.set(issue.pageId, types);
    }
  }

  const issueGroups = Array.from(groups.values()).sort(
    (a, b) =>
      ISSUE_SEVERITY_ORDER[a.severity] - ISSUE_SEVERITY_ORDER[b.severity] ||
      b.count - a.count ||
      a.title.localeCompare(b.title),
  );

  const severityTotals: Record<IssueSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const group of issueGroups) severityTotals[group.severity] += group.count;

  const pageSummaries: AuditPageSummary[] = pages
    .map((page) => {
      const types = Array.from(issueTypesByPage.get(page.id) ?? []);
      return {
        url: page.url,
        statusCode: page.statusCode,
        fetchClass: page.fetchClass,
        fetchError: page.fetchError,
        redirectUrl: page.redirectUrl,
        title: truncate(page.title),
        metaDescription: truncate(page.metaDescription),
        canonicalUrl: page.canonicalUrl ?? page.headerCanonicalUrl,
        h1Count: page.h1Count,
        wordCount: page.wordCount,
        isHtml: page.isHtml,
        isIndexable: page.isIndexable,
        responseTimeMs: page.responseTimeMs,
        crawlDepth: page.crawlDepth,
        inSitemap: page.inSitemap,
        internalLinks: page.links.filter((link) => link.isInternal).length,
        externalLinks: page.links.filter((link) => !link.isInternal).length,
        imagesTotal: page.imagesTotal,
        imagesMissingAlt: page.imagesMissingAlt,
        hasStructuredData: page.hasStructuredData,
        issueTypes: types,
      };
    })
    .sort((a, b) => (a.crawlDepth ?? 99) - (b.crawlDepth ?? 99) || a.url.localeCompare(b.url));

  const htmlPages = pageSummaries.filter((page) => page.isHtml);
  const cleanPages = htmlPages.filter((page) =>
    page.issueTypes.every((type) => AUDIT_ISSUE_TYPES[type].severity === "info"),
  ).length;

  const finishedAt = Date.now();
  return {
    requestedUrl: options.url,
    startUrl,
    origin,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    maxPages,
    stats: {
      pagesCrawled: pages.length,
      htmlPages: htmlPages.length,
      cleanPages,
      critical: severityTotals.critical,
      warning: severityTotals.warning,
      info: severityTotals.info,
      robotsTxtFound: robots.found,
      sitemapFound,
      sitemapUrls: sitemapUrls.length,
      disallowedByRobots: disallowedByRobots.size,
      respectedRobots: respectRobots,
      urlsNotCrawled,
      stopReason,
    },
    issueGroups,
    pages: pageSummaries,
  };
}
