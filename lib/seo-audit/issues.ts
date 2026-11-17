// Ported from OpenSEO (https://github.com/every-app/open-seo, commit 2df84ff), MIT License,
// Copyright (c) 2026 Ben Senescu. Full licence text: ./LICENSE-open-seo.txt
//
// The issue catalogue, the per-page checks and the duplicate / redirect checks
// are OpenSEO's. ACE changes: the fix text names our crawler, the checks that
// needed JavaScript rendering or billing are dropped, and the link-graph
// checks (broken internal links, orphan pages) run in memory here instead of
// in a Cloudflare Durable Object.

import type { CrawledPageResult } from "./types";

export const CRAWL_USER_AGENT_TOKEN = "ACE-SEO-Audit";

export type IssueSeverity = "critical" | "warning" | "info";

interface AuditIssueDescriptor {
  severity: IssueSeverity;
  title: string;
  explanation: string;
  howToFix: string;
}

export const AUDIT_ISSUE_TYPES = {
  "blocked-page": {
    severity: "critical",
    title: "Crawler was blocked",
    explanation:
      "The site returned a bot challenge or access denial (for example a Cloudflare challenge or a 403) instead of the page. The page could not be audited, and other crawlers such as search engines may meet the same friction.",
    howToFix: `If you own this site, allow the "${CRAWL_USER_AGENT_TOKEN}" user agent in your firewall or bot-protection settings (on Cloudflare: a WAF custom rule that skips bot protection when the user agent contains "${CRAWL_USER_AGENT_TOKEN}"). Then run the audit again.`,
  },
  "javascript-rendering-suspected": {
    severity: "warning",
    title: "Content may require JavaScript",
    explanation:
      "The page's HTML holds a JavaScript app container with very little readable content and no headings, links or images. The page probably loads its content in the browser. Content checks were skipped because this HTML may not be the complete page.",
    howToFix:
      "Serve important content and navigation in the initial HTML using server-side rendering or prerendering. This audit does not run JavaScript, so it cannot confirm what the loaded page contains. This warning does not prove that search engines cannot index the page.",
  },
  "rate-limited-page": {
    severity: "warning",
    title: "Rate limited (429)",
    explanation:
      "The server answered 429 Too Many Requests, so this page could not be audited. The crawler waited and tried once more before moving on.",
    howToFix: `Raise the rate limit for crawlers, or allow the "${CRAWL_USER_AGENT_TOKEN}" user agent in your rate-limiting rules. Then run the audit again. A lower page limit also helps when the limit is strict.`,
  },
  "crawl-rate-limited": {
    severity: "warning",
    title: "Crawl stopped early: rate limit",
    explanation:
      "The site refused several pages in a row with 429 Too Many Requests, so the crawler stopped requesting pages. This report is incomplete; URLs that were not fetched are not recorded as broken.",
    howToFix: `Run the audit again once the site's rate limit resets, or allow the "${CRAWL_USER_AGENT_TOKEN}" user agent on the site.`,
  },
  "crawl-time-limit": {
    severity: "warning",
    title: "Crawl stopped early: time limit",
    explanation:
      "The audit reached its time limit before visiting every URL it found, so this report covers part of the site. URLs that were not fetched are not recorded as broken, and orphan pages are not checked on a partial crawl.",
    howToFix:
      "Run the audit again with a lower page limit. A slow site takes longer per page, so the same limit covers fewer pages.",
  },
  "crawl-page-limit": {
    severity: "warning",
    title: "Crawl stopped early: page limit",
    explanation:
      "The audit reached its page limit before visiting every URL it found, so this report covers part of the site. Orphan pages are not checked on a partial crawl.",
    howToFix:
      "Run the audit again with a higher page limit.",
  },
  "sitemap-url-blocked-by-robots": {
    severity: "warning",
    title: "Sitemap URL blocked by robots.txt",
    explanation:
      "The sitemap lists this URL, but robots.txt tells crawlers not to fetch it. The two files contradict each other: the sitemap asks search engines to index a page they are not allowed to read.",
    howToFix:
      "Decide which is right. If the page should rank, remove the Disallow rule that covers it. If it should stay private, take it out of the sitemap. A whole site blocked this way is usually a leftover from before launch.",
  },
  "disallowed-by-robots": {
    severity: "info",
    title: "Linked URL blocked by robots.txt",
    explanation:
      "A page on the site links to this URL, but robots.txt tells crawlers not to fetch it. That is often intentional (cart, account, search and filter pages); this is a heads-up, not an error.",
    howToFix:
      "If the page should rank, remove the Disallow rule that covers it. If the block is intentional, no action is needed.",
  },
  "server-error": {
    severity: "critical",
    title: "Server error (5xx)",
    explanation:
      "The page returned a 5xx server error. Search engines that repeatedly see server errors crawl the site less and may drop the page from the index.",
    howToFix:
      "Check the server logs for this URL and fix the underlying error. If the page is gone, return a 404/410 or redirect it to a relevant page instead of erroring.",
  },
  "broken-internal-link": {
    severity: "critical",
    title: "Broken internal link",
    explanation:
      "This page links to an internal URL that returns an error status (4xx/5xx). Broken links waste crawl budget, leak link equity and frustrate visitors.",
    howToFix:
      "Update the link to point at the correct live URL, or remove it. If the target was moved, link directly to the new URL rather than relying on a redirect.",
  },
  "missing-title": {
    severity: "critical",
    title: "Missing title tag",
    explanation:
      "The page has no <title>. The title is the strongest on-page relevance signal and the headline shown in search results; without it search engines write one themselves, usually badly.",
    howToFix:
      "Add a unique, descriptive <title> of roughly 50–60 characters that includes the page's primary topic.",
  },
  "broken-page": {
    severity: "warning",
    title: "Page returns an error (4xx)",
    explanation:
      "This crawled URL returned a client error (for example 404). If it is referenced from your sitemap or other pages, crawlers keep wasting requests on it.",
    howToFix:
      "If the page should exist, restore it. If it is intentionally gone, remove it from the sitemap and internal links, and consider a 301 redirect to the closest live page.",
  },
  "duplicate-title": {
    severity: "warning",
    title: "Duplicate title",
    explanation:
      "Multiple pages share the same title tag. Search engines use titles to tell pages apart; duplicates make pages compete with each other and lower click-through rates.",
    howToFix:
      "Write a unique title for each page describing its specific content. For templated pages, include the distinguishing attribute (name, category, location) in the template.",
  },
  "duplicate-meta-description": {
    severity: "warning",
    title: "Duplicate meta description",
    explanation:
      "Multiple pages share the same meta description, so search results show identical snippets and people cannot tell the pages apart.",
    howToFix:
      "Write a unique meta description per page, or remove the duplicated one entirely. Search engines will build a snippet from page content, which beats a wrong duplicate.",
  },
  "duplicate-content": {
    severity: "warning",
    title: "Duplicate page content",
    explanation:
      "Two or more URLs serve identical visible text. Search engines pick one version to index and ignore the rest, and ranking signals get split across the duplicates.",
    howToFix:
      "Consolidate duplicates: pick the canonical URL, add rel=canonical from the others, and 301-redirect duplicate URLs where possible (common causes: trailing-slash variants, URL parameters, http/https or www variants).",
  },
  "missing-meta-description": {
    severity: "warning",
    title: "Missing meta description",
    explanation:
      "The page has no meta description. Search engines will assemble a snippet from page text, which is often less compelling and hurts click-through rate.",
    howToFix:
      "Add a meta description of roughly 70–160 characters that summarises the page and gives a reason to click.",
  },
  "missing-h1": {
    severity: "warning",
    title: "Missing H1 heading",
    explanation:
      "The page has no H1. The H1 tells people and search engines what the page is about; pages without one tend to have weaker topical clarity.",
    howToFix:
      "Add a single H1 that states the page's main topic, consistent with the title tag.",
  },
  "multiple-h1": {
    severity: "warning",
    title: "Multiple H1 headings",
    explanation:
      "The page has more than one H1, which dilutes the main-topic signal and usually points to a templating mistake (for example a logo and a headline both marked up as H1).",
    howToFix:
      "Keep one H1 for the page's main heading and demote the others to H2/H3 (or unstyled elements for non-headings like logos).",
  },
  "redirect-chain": {
    severity: "warning",
    title: "Redirect chain",
    explanation:
      "Reaching the final page takes two or more consecutive redirects. Each hop adds latency, leaks link equity and burns crawl budget; long chains may not be followed at all.",
    howToFix:
      "Point the first URL (and any internal links) directly at the final destination so there is at most one redirect.",
  },
  "redirect-loop": {
    severity: "warning",
    title: "Redirect loop",
    explanation:
      "This redirect eventually points back to itself, so the URL never resolves. Browsers and crawlers give up with an error.",
    howToFix:
      "Trace the redirect rules for this URL and break the cycle so the chain ends at a real 200 page.",
  },
  "canonical-conflict": {
    severity: "warning",
    title: "Conflicting canonical signals",
    explanation:
      "The page declares different canonical URLs in its HTML <link rel=canonical> and its HTTP Link header. When signals conflict, search engines ignore both and choose their own canonical.",
    howToFix:
      "Pick one canonical URL and declare it in exactly one place (the HTML head is the most common); remove or align the other declaration.",
  },
  "thin-content": {
    severity: "warning",
    title: "Thin content",
    explanation:
      "The page has very little visible text. Thin pages rarely rank and can drag down sitewide quality assessments. If the site renders in the browser, the content may simply be invisible to plain-HTML crawlers.",
    howToFix:
      "Expand the page with useful content, noindex it, or fold it into a stronger page. If the content exists but is rendered by JavaScript, make sure it is server-rendered or pre-rendered.",
  },
  "images-missing-alt": {
    severity: "warning",
    title: "Images missing alt text",
    explanation:
      "One or more images on the page lack alt attributes. Alt text is an accessibility requirement and the main way search engines understand images.",
    howToFix:
      'Add descriptive alt text to meaningful images; use an empty alt (alt="") only for purely decorative ones.',
  },
  "orphan-page": {
    severity: "warning",
    title: "Orphan page",
    explanation:
      "No crawled page links to this URL; it was only discoverable through the sitemap. Pages without internal links get little crawl attention and no internal link equity, and visitors cannot find them by browsing.",
    howToFix:
      "Link to this page from relevant pages (navigation, related content, hub pages), or remove it from the sitemap if it should not be indexed.",
  },
  "no-outgoing-links": {
    severity: "warning",
    title: "Page has no outgoing links",
    explanation:
      "The page contains no links at all, a dead end. Link equity that flows into it stops there, crawlers have nowhere to go next, and visitors have to reach for the back button.",
    howToFix:
      "Add links to related pages, the parent category or the homepage. If the page's navigation is rendered by JavaScript, make sure it also exists in the server-rendered HTML.",
  },
  "title-too-long": {
    severity: "info",
    title: "Title too long",
    explanation:
      "The title exceeds about 60 characters, so search results will truncate it and the ending may be cut off mid-phrase.",
    howToFix:
      "Shorten the title to roughly 50–60 characters, with the most important words first.",
  },
  "title-too-short": {
    severity: "info",
    title: "Title too short",
    explanation:
      "The title is under about 10 characters, which is usually too generic to describe the page or attract clicks.",
    howToFix:
      "Expand the title into a descriptive phrase (roughly 30–60 characters) that states what the page offers.",
  },
  "meta-description-too-long": {
    severity: "info",
    title: "Meta description too long",
    explanation:
      "The meta description exceeds about 160 characters, so search engines will truncate the snippet.",
    howToFix:
      "Trim the description to roughly 70–160 characters while keeping the core message and call to action.",
  },
  "meta-description-too-short": {
    severity: "info",
    title: "Meta description too short",
    explanation:
      "The meta description is under about 70 characters. Short descriptions waste the snippet space, and search engines often ignore them in favour of text pulled from the page.",
    howToFix:
      "Expand the description to roughly 70–160 characters that summarise the page and give a reason to click.",
  },
  "heading-order-skip": {
    severity: "info",
    title: "Heading levels skip",
    explanation:
      "The heading hierarchy skips levels (for example an H4 directly after an H2). This weakens document structure for accessibility tools and content parsing.",
    howToFix:
      "Adjust heading levels so they descend one step at a time (H1 → H2 → H3) without skipping.",
  },
  "slow-response": {
    severity: "info",
    title: "Slow server response",
    explanation:
      "The HTML response took over 1.5 seconds. A slow first byte drags down every later performance metric and reduces crawl rate on large sites.",
    howToFix:
      "Look at server and database time and caching for this route; serving cached or statically generated HTML usually fixes it.",
  },
  "noindex-page": {
    severity: "info",
    title: "Page is noindex",
    explanation:
      "The page asks search engines not to index it (robots meta tag or X-Robots-Tag header). That is often intentional; this is a heads-up, not an error.",
    howToFix:
      "If this page should rank, remove the noindex directive. If it is intentional (admin, thank-you, filter pages), no action is needed.",
  },
  "canonicalized-page": {
    severity: "info",
    title: "Canonicalised to another URL",
    explanation:
      "The page declares a different URL as its canonical, telling search engines to index that URL instead. Fine when intentional (parameter pages, syndication); a problem if this page was meant to rank.",
    howToFix:
      "If this page should rank on its own, set its canonical to itself. Otherwise no action is needed.",
  },
  "deep-page": {
    severity: "info",
    title: "Page is deep in the site structure",
    explanation:
      "The page is 5 or more clicks from the start page. Deep pages get crawled less often and receive less link equity.",
    howToFix:
      "Add links from higher-level pages (hubs, category pages, navigation) to shorten the path to this page.",
  },
} as const satisfies Record<string, AuditIssueDescriptor>;

export type AuditIssueType = keyof typeof AUDIT_ISSUE_TYPES;

export const ISSUE_SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export interface DetectedIssue {
  issueType: AuditIssueType;
  pageId: string | null;
  pageUrl: string;
  details?: Record<string, unknown>;
}

const TITLE_MAX_CHARS = 60;
const TITLE_MIN_CHARS = 10;
const META_DESCRIPTION_MAX_CHARS = 160;
const META_DESCRIPTION_MIN_CHARS = 70;
const THIN_CONTENT_WORDS = 150;
const SLOW_RESPONSE_MS = 1500;
const DEEP_PAGE_DEPTH = 5;
const MAX_FLAGGED_TEXT_CHARS = 100;
const DUPLICATE_GROUP_SAMPLE = 3;

function truncateFlaggedText(text: string): string {
  return text.length > MAX_FLAGGED_TEXT_CHARS
    ? `${text.slice(0, MAX_FLAGGED_TEXT_CHARS)}…`
    : text;
}

function hasHeadingLevelSkip(headingOrder: number[]): boolean {
  for (let i = 1; i < headingOrder.length; i++) {
    if (headingOrder[i] > headingOrder[i - 1] + 1) return true;
  }
  return false;
}

/** Checks that need only one page. */
export function runPageReporters(page: CrawledPageResult): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const report = (issueType: AuditIssueType, details?: Record<string, unknown>) =>
    issues.push({ issueType, pageId: page.id, pageUrl: page.url, details });

  if (page.fetchClass === "blocked") {
    report("blocked-page", { statusCode: page.statusCode });
    return issues;
  }
  if (page.fetchClass === "rate_limited") {
    report("rate-limited-page", { statusCode: page.statusCode });
    return issues;
  }
  if (page.fetchClass === "error") return issues;

  if (page.statusCode >= 500) {
    report("server-error", { statusCode: page.statusCode });
    return issues;
  }
  if (page.statusCode >= 400) {
    report("broken-page", { statusCode: page.statusCode });
    return issues;
  }
  // Redirects are normal on their own; chains and loops are flagged below.
  if (page.statusCode >= 300) return issues;

  if (page.responseTimeMs > SLOW_RESPONSE_MS) {
    report("slow-response", { responseTimeMs: page.responseTimeMs });
  }

  // Content checks only make sense for analysed HTML (a PDF has no title tag).
  if (!page.isHtml) return issues;

  if (!page.isIndexable) {
    report("noindex-page", { robotsMeta: page.robotsMeta, xRobotsTag: page.xRobotsTag });
  }
  if (
    page.canonicalUrl &&
    page.headerCanonicalUrl &&
    page.canonicalUrl !== page.headerCanonicalUrl
  ) {
    report("canonical-conflict", {
      htmlCanonical: page.canonicalUrl,
      headerCanonical: page.headerCanonicalUrl,
    });
  }
  const effectiveCanonical = page.canonicalUrl ?? page.headerCanonicalUrl;
  if (effectiveCanonical && effectiveCanonical !== page.url) {
    report("canonicalized-page", { canonicalUrl: effectiveCanonical });
  }

  if (page.crawlDepth !== null && page.crawlDepth >= DEEP_PAGE_DEPTH) {
    report("deep-page", { crawlDepth: page.crawlDepth });
  }

  // An app shell cannot show what the rendered page is missing. Report the
  // coverage gap instead of thin-content / missing-heading claims.
  if (page.javascriptShell) {
    report("javascript-rendering-suspected", { wordCount: page.wordCount });
    return issues;
  }

  if (!page.title) {
    report("missing-title");
  } else if (page.title.length > TITLE_MAX_CHARS) {
    report("title-too-long", {
      length: page.title.length,
      max: TITLE_MAX_CHARS,
      title: truncateFlaggedText(page.title),
    });
  } else if (page.title.length < TITLE_MIN_CHARS) {
    report("title-too-short", {
      length: page.title.length,
      min: TITLE_MIN_CHARS,
      title: page.title,
    });
  }

  if (!page.metaDescription) {
    report("missing-meta-description");
  } else if (page.metaDescription.length > META_DESCRIPTION_MAX_CHARS) {
    report("meta-description-too-long", {
      length: page.metaDescription.length,
      max: META_DESCRIPTION_MAX_CHARS,
      description: truncateFlaggedText(page.metaDescription),
    });
  } else if (page.metaDescription.length < META_DESCRIPTION_MIN_CHARS) {
    report("meta-description-too-short", {
      length: page.metaDescription.length,
      min: META_DESCRIPTION_MIN_CHARS,
      description: page.metaDescription,
    });
  }

  if (page.h1Count === 0) {
    report("missing-h1");
  } else if (page.h1Count > 1) {
    report("multiple-h1", { h1Count: page.h1Count });
  }
  if (hasHeadingLevelSkip(page.headingOrder)) report("heading-order-skip");

  if (page.isIndexable && page.wordCount < THIN_CONTENT_WORDS) {
    report("thin-content", { wordCount: page.wordCount });
  }
  if (page.imagesMissingAlt > 0) {
    report("images-missing-alt", {
      imagesMissingAlt: page.imagesMissingAlt,
      imagesTotal: page.imagesTotal,
    });
  }

  if (page.isIndexable && page.links.length === 0) report("no-outgoing-links");

  return issues;
}

function isOkPage(page: CrawledPageResult): boolean {
  return page.fetchClass === "ok" && page.statusCode >= 200 && page.statusCode < 300;
}

/**
 * Pages the owner already de-duplicated (noindex, or canonicalised to another
 * URL) do not belong in duplicate groups. App shells are left out too: their
 * placeholder titles and loading text are not real duplicates.
 */
function isDuplicateCandidate(page: CrawledPageResult): boolean {
  if (!isOkPage(page) || !page.isHtml || !page.isIndexable || page.javascriptShell) return false;
  const effectiveCanonical = page.canonicalUrl ?? page.headerCanonicalUrl;
  return !effectiveCanonical || effectiveCanonical === page.url;
}

export function findDuplicates(pages: CrawledPageResult[]): DetectedIssue[] {
  const candidates = pages.filter(isDuplicateCandidate);
  const issues: DetectedIssue[] = [];

  const emit = (
    keyOf: (page: CrawledPageResult) => string | null,
    issueType: AuditIssueType,
  ) => {
    const groups = new Map<string, CrawledPageResult[]>();
    for (const page of candidates) {
      const key = keyOf(page);
      if (!key) continue;
      const group = groups.get(key);
      if (group) group.push(page);
      else groups.set(key, [page]);
    }
    groups.forEach((group) => {
      if (group.length < 2) return;
      for (const page of group) {
        issues.push({
          issueType,
          pageId: page.id,
          pageUrl: page.url,
          details: {
            groupSize: group.length,
            otherUrls: group
              .filter((other) => other.id !== page.id)
              .slice(0, DUPLICATE_GROUP_SAMPLE)
              .map((other) => other.url),
          },
        });
      }
    });
  };

  emit((page) => page.title || null, "duplicate-title");
  emit((page) => page.metaDescription || null, "duplicate-meta-description");
  emit((page) => (page.wordCount > 0 ? page.contentHash : null), "duplicate-content");
  return issues;
}

export function findRedirectChainsAndLoops(pages: CrawledPageResult[]): DetectedIssue[] {
  const redirects = new Map<string, CrawledPageResult>();
  for (const page of pages) {
    if (page.statusCode >= 300 && page.statusCode < 400 && page.redirectUrl) {
      redirects.set(page.url, page);
    }
  }

  const redirectTargets = new Set<string>();
  redirects.forEach((page) => redirectTargets.add(page.redirectUrl!));

  const issues: DetectedIssue[] = [];
  const walked = new Set<string>();

  // Walk from chain heads (redirects nothing else redirects to), so a 5-hop
  // chain yields one issue, not five.
  redirects.forEach((head, url) => {
    if (redirectTargets.has(url)) return;

    const hops: string[] = [url];
    const seen = new Set(hops);
    walked.add(url);
    let current: string | null = head.redirectUrl;
    let isLoop = false;
    while (current) {
      if (seen.has(current)) {
        isLoop = true;
        hops.push(current);
        break;
      }
      hops.push(current);
      seen.add(current);
      if (redirects.has(current)) walked.add(current);
      current = redirects.get(current)?.redirectUrl ?? null;
    }

    if (isLoop) {
      issues.push({ issueType: "redirect-loop", pageId: head.id, pageUrl: url, details: { hops } });
    } else if (hops.length > 2) {
      // url -> a -> b: two redirects before content = a chain
      issues.push({
        issueType: "redirect-chain",
        pageId: head.id,
        pageUrl: url,
        details: { hops, finalUrl: hops[hops.length - 1] },
      });
    }
  });

  // Headless cycles (every member is also a target, e.g. a↔b or a→a) are
  // never reached from a head; emit one loop issue per cycle.
  redirects.forEach((page, url) => {
    if (walked.has(url)) return;
    const cycle: string[] = [];
    let current: string | null = url;
    while (current && !walked.has(current)) {
      walked.add(current);
      cycle.push(current);
      current = redirects.get(current)?.redirectUrl ?? null;
    }
    issues.push({
      issueType: "redirect-loop",
      pageId: page.id,
      pageUrl: url,
      details: { hops: [...cycle, url] },
    });
  });

  return issues;
}

/**
 * Link-graph checks over the whole crawl.
 *
 * Broken internal link: a crawled page links to a crawled URL that answered
 * 4xx/5xx. A target the crawl never fetched is not reported either way.
 *
 * Orphan page: in the sitemap, loaded fine, and no other crawled page links to
 * it. Only checked on a complete crawl: on a partial one the linking page may
 * simply not have been reached.
 */
export function findLinkGraphIssues(
  pages: CrawledPageResult[],
  options: { startUrl: string; crawlComplete: boolean },
): DetectedIssue[] {
  const byUrl = new Map<string, CrawledPageResult>();
  for (const page of pages) byUrl.set(page.url, page);

  const issues: DetectedIssue[] = [];
  const hasInboundLink = new Set<string>();

  for (const page of pages) {
    if (!isOkPage(page) || !page.isHtml) continue;
    for (const link of page.links) {
      if (!link.isInternal || link.targetUrl === page.url) continue;
      hasInboundLink.add(link.targetUrl);
      const target = byUrl.get(link.targetUrl);
      if (!target) continue;
      // A redirect that lands on a real page still counts as linked.
      if (target.redirectUrl) hasInboundLink.add(target.redirectUrl);
      if (target.fetchClass === "ok" && target.statusCode >= 400) {
        issues.push({
          issueType: "broken-internal-link",
          pageId: page.id,
          pageUrl: page.url,
          details: {
            targetUrl: link.targetUrl,
            statusCode: target.statusCode,
            anchor: link.anchor,
          },
        });
      }
    }
  }

  if (options.crawlComplete) {
    for (const page of pages) {
      if (!page.inSitemap || !isOkPage(page) || !page.isHtml) continue;
      if (page.url === options.startUrl || page.crawlDepth === 0) continue;
      if (hasInboundLink.has(page.url)) continue;
      issues.push({ issueType: "orphan-page", pageId: page.id, pageUrl: page.url });
    }
  }

  return issues;
}
