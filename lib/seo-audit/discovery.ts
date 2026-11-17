// Ported from OpenSEO (https://github.com/every-app/open-seo, commit 2df84ff), MIT License,
// Copyright (c) 2026 Ben Senescu. Full licence text: ./LICENSE-open-seo.txt
//
// robots.txt and sitemap.xml discovery. ACE changes: plain Node fetch through
// the audit's host guard, no crawler-access credentials, no Workflow state.

import robotsParser from "robots-parser";
import { XMLParser } from "fast-xml-parser";
import { isSameOrigin, normalizeUrl } from "./url-utils";
import type { HostGuard } from "./url-policy";
import { CRAWL_USER_AGENT_TOKEN } from "./issues";

export const CRAWL_USER_AGENT = `Mozilla/5.0 (compatible; ${CRAWL_USER_AGENT_TOKEN}/1.0)`;

const ROBOTS_FETCH_TIMEOUT_MS = 10_000;
const SITEMAP_FETCH_TIMEOUT_MS = 15_000;
// RFC 9309: parsers must handle at least 500 KiB and may ignore the rest.
const MAX_ROBOTS_TXT_BYTES = 500 * 1024;
const MAX_SITEMAP_DEPTH = 3;
const MAX_SITEMAP_DOCS = 50;
const SITEMAP_CONCURRENCY = 5;
// Sitemap shards can legally reach 50 MB; oversized ones are skipped whole,
// since truncated XML would not parse anyway.
const MAX_SITEMAP_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECT_HOPS = 5;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "sitemap" || name === "url",
});

export interface RobotsResult {
  found: boolean;
  isAllowed: (url: string) => boolean;
  sitemapUrls: string[];
}

/** Read a response body up to maxBytes; null when the body exceeds it. */
export async function readBodyCapped(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/**
 * Redirects are followed by hand so every hop goes back through the host
 * guard: a redirect cannot carry the fetch somewhere the caller could not
 * have pointed it directly.
 */
async function fetchFollowingRedirects(
  url: string,
  timeoutMs: number,
  isSafeToFetch: HostGuard,
): Promise<{ response: Response; finalUrl: string } | null> {
  const deadline = Date.now() + timeoutMs;
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!(await isSafeToFetch(current))) return null;
    const response = await fetch(current, {
      headers: { "User-Agent": CRAWL_USER_AGENT, Accept: "*/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    });
    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: current };
    }
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) return null;
    try {
      current = new URL(location, current).toString();
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchRobots(origin: string, isSafeToFetch: HostGuard): Promise<RobotsResult> {
  let text: string | null = null;
  try {
    const fetched = await fetchFollowingRedirects(
      `${origin}/robots.txt`,
      ROBOTS_FETCH_TIMEOUT_MS,
      isSafeToFetch,
    );
    if (fetched?.response.ok) {
      const body = await readBodyCapped(fetched.response, MAX_ROBOTS_TXT_BYTES);
      // HTML served at /robots.txt (a soft 404) is not a robots file.
      if (body !== null && !/^\s*<(!doctype|html)/i.test(body)) text = body;
    } else {
      await fetched?.response.body?.cancel();
    }
  } catch {
    text = null;
  }

  if (text === null) return { found: false, isAllowed: () => true, sitemapUrls: [] };

  const robots = robotsParser(`${origin}/robots.txt`, text);
  return {
    found: true,
    // Our token, so a group written for this crawler wins over `*`.
    isAllowed: (url: string) => robots.isAllowed(url, CRAWL_USER_AGENT_TOKEN) ?? true,
    sitemapUrls: robots.getSitemaps(),
  };
}

function isProbablySitemapXml(contentType: string | null, body: string): boolean {
  if (contentType?.toLowerCase().includes("xml")) return true;
  const trimmed = body.trimStart().toLowerCase();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<urlset") ||
    trimmed.startsWith("<sitemapindex")
  );
}

function sitemapLocations(input: unknown): string[] {
  if (!input) return [];
  const entries = Array.isArray(input) ? input : [input];
  const locations: string[] = [];
  for (const entry of entries) {
    if (entry && typeof entry === "object") {
      const loc = (entry as Record<string, unknown>)["loc"];
      if (typeof loc === "string") locations.push(loc.trim());
    }
  }
  return locations;
}

async function fetchSitemapDocument(
  sitemapUrl: string,
  isSafeToFetch: HostGuard,
): Promise<{ nestedSitemaps: string[]; pageUrls: string[] }> {
  const empty = { nestedSitemaps: [], pageUrls: [] };
  try {
    const fetched = await fetchFollowingRedirects(sitemapUrl, SITEMAP_FETCH_TIMEOUT_MS, isSafeToFetch);
    if (!fetched) return empty;
    const { response } = fetched;
    const finalUrl = normalizeUrl(fetched.finalUrl, sitemapUrl);
    if (!finalUrl || !isSameOrigin(finalUrl, sitemapUrl) || !response.ok) {
      await response.body?.cancel();
      return empty;
    }
    const body = await readBodyCapped(response, MAX_SITEMAP_BYTES);
    if (body === null || !isProbablySitemapXml(response.headers.get("content-type"), body)) {
      return empty;
    }
    const parsed = xmlParser.parse(body) as {
      sitemapindex?: { sitemap?: unknown };
      urlset?: { url?: unknown };
    };
    const normalizeAll = (locations: string[]) =>
      locations
        .map((loc) => normalizeUrl(loc, finalUrl))
        .filter((loc): loc is string => loc !== null);
    return {
      nestedSitemaps: normalizeAll(sitemapLocations(parsed?.sitemapindex?.sitemap)),
      pageUrls: normalizeAll(sitemapLocations(parsed?.urlset?.url)),
    };
  } catch {
    return empty;
  }
}

/**
 * Read robots.txt, then every sitemap it names plus the default /sitemap.xml
 * (sitemap indexes are followed up to three levels).
 */
export async function discoverSite(
  origin: string,
  maxPages: number,
  isSafeToFetch: HostGuard,
): Promise<{ robots: RobotsResult; sitemapUrls: string[]; sitemapFound: boolean }> {
  const robots = await fetchRobots(origin, isSafeToFetch);

  const sources = new Set(robots.sitemapUrls);
  sources.add(`${origin}/sitemap.xml`);

  const maxDiscoveredUrls = Math.min(Math.max(maxPages * 20, 500), 20_000);
  const allUrls = new Set<string>();
  const seenDocs = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [];
  sources.forEach((source) => {
    const url = normalizeUrl(source, origin);
    if (url && isSameOrigin(url, origin)) queue.push({ url, depth: MAX_SITEMAP_DEPTH });
  });

  let fetchedDocs = 0;
  let sitemapFound = false;

  while (queue.length > 0 && allUrls.size < maxDiscoveredUrls && fetchedDocs < MAX_SITEMAP_DOCS) {
    const batch = queue.splice(0, SITEMAP_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ url, depth }) => {
        if (depth <= 0 || seenDocs.has(url)) return;
        seenDocs.add(url);
        fetchedDocs += 1;

        const result = await fetchSitemapDocument(url, isSafeToFetch);
        if (result.pageUrls.length > 0 || result.nestedSitemaps.length > 0) sitemapFound = true;

        for (const pageUrl of result.pageUrls) {
          if (allUrls.size >= maxDiscoveredUrls) break;
          if (isSameOrigin(pageUrl, origin)) allUrls.add(pageUrl);
        }
        if (depth <= 1) return;
        for (const nested of result.nestedSitemaps) {
          if (isSameOrigin(nested, origin) && !seenDocs.has(nested)) {
            queue.push({ url: nested, depth: depth - 1 });
          }
        }
      }),
    );
  }

  return { robots, sitemapUrls: Array.from(allUrls), sitemapFound };
}
