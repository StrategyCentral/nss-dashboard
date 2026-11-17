// Ported from OpenSEO (https://github.com/every-app/open-seo, commit 2df84ff), MIT License,
// Copyright (c) 2026 Ben Senescu. Full licence text: ./LICENSE-open-seo.txt
//
// Trimmed to what the ACE in-memory crawler needs: no Lighthouse, no JS
// rendering, no database row shapes.

/** How a page fetch resolved. "blocked" = WAF / bot challenge; "rate_limited" = a 429. */
export type PageFetchClass = "ok" | "blocked" | "rate_limited" | "error";

/** One outgoing link edge, deduped by target URL within a page. */
export interface PageLink {
  targetUrl: string;
  anchor: string | null;
  isInternal: boolean;
  isNofollow: boolean;
}

/** Data extracted from a single page's HTML. */
export interface PageAnalysis {
  url: string;
  statusCode: number;
  redirectUrl: string | null;
  responseTimeMs: number;
  title: string;
  metaDescription: string;
  canonical: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1s: string[];
  headingOrder: number[];
  wordCount: number;
  bodyText: string;
  /** Conservative signal of an app shell, not proof of missing content. */
  javascriptShell?: boolean;
  images: Array<{ src: string | null; alt: string | null }>;
  links: PageLink[];
  hasStructuredData: boolean;
  hreflangTags: string[];
}

/** Full result of crawling one page. */
export interface CrawledPageResult {
  id: string;
  url: string;
  statusCode: number;
  fetchClass: PageFetchClass;
  redirectUrl: string | null;
  title: string;
  metaDescription: string;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  xRobotsTag: string | null;
  headerCanonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1Count: number;
  headingOrder: number[];
  wordCount: number;
  contentHash: string | null;
  /** True when an HTML document was fetched and analysed. */
  isHtml: boolean;
  javascriptShell?: boolean;
  imagesTotal: number;
  imagesMissingAlt: number;
  links: PageLink[];
  hasStructuredData: boolean;
  hreflangTags: string[];
  isIndexable: boolean;
  responseTimeMs: number;
  /** null = not reached via links (sitemap-seeded only). */
  crawlDepth: number | null;
  inSitemap: boolean;
  /** Set when the fetch itself failed (DNS, timeout, TLS). */
  fetchError?: string;
}
