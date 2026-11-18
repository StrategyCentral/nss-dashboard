// Ported from OpenSEO (https://github.com/every-app/open-seo, commit 2df84ff), MIT License,
// Copyright (c) 2026 Ben Senescu. Full licence text: ./LICENSE-open-seo.txt
//
// ACE change: OpenSEO runs on Cloudflare Workers and resolves hostnames over
// DNS-over-HTTPS. This runs on Node, so it asks the system resolver, and it
// checks every host the crawl touches (start URL, redirect targets), not only
// the start URL.
//
// Why this file matters: the audit makes the server fetch whatever URL it is
// given. Without these checks a caller could point it at Railway's private
// network or a cloud metadata address and read the answer back.

import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "169.254.169.254",
  "100.100.100.200",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".home.arpa",
];

export class AuditUrlError extends Error {
  constructor(
    public code: "INVALID_URL" | "TARGET_BLOCKED" | "DNS_FAILED",
    message: string,
  ) {
    super(message);
  }
}

function normalizeHost(hostname: string): string {
  let host = hostname.toLowerCase().trim();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host.includes("%")) host = host.split("%", 1)[0];
  if (host.endsWith(".")) host = host.slice(0, -1);
  return host;
}

function isPrivateIpv4(host: string): boolean {
  const parts = normalizeHost(host)
    .split(".")
    .map((x) => Number(x));
  if (
    parts.length !== 4 ||
    parts.some((x) => !Number.isInteger(x) || x < 0 || x > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function parseMappedIpv4FromIpv6(host: string): string | null {
  const normalized = normalizeHost(host);
  if (!normalized.startsWith("::ffff:")) return null;
  const mapped = normalized.slice("::ffff:".length);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) return mapped;

  const segments = mapped.split(":").filter(Boolean);
  if (segments.length !== 2) return null;
  const high = Number.parseInt(segments[0], 16);
  const low = Number.parseInt(segments[1], 16);
  if (
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return null;
  }
  return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
}

function isPrivateIpv6(host: string): boolean {
  const value = normalizeHost(host);
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  ) {
    return true;
  }
  const mappedIpv4 = parseMappedIpv4FromIpv6(value);
  return Boolean(mappedIpv4 && isPrivateIpv4(mappedIpv4));
}

function isIpLiteral(host: string): boolean {
  const normalized = normalizeHost(host);
  return /^\d+\.\d+\.\d+\.\d+$/.test(normalized) || normalized.includes(":");
}

function isPrivateAddress(address: string): boolean {
  return isPrivateIpv4(address) || isPrivateIpv6(address);
}

function isBlockedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  if (isIpLiteral(host)) return isPrivateAddress(host);
  return false;
}

/**
 * Cheap check with no DNS: scheme, private IP literals, internal hostnames.
 * Used to filter links before they are queued.
 */
export function isCrawlableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return !isBlockedHost(parsed.hostname);
}

/**
 * One audit's view of which hosts are safe to fetch. Resolves each hostname
 * once and refuses it when any address is private. A host that does not
 * resolve is refused too: fetching it would fail anyway.
 */
export function createHostGuard() {
  const verdicts = new Map<string, Promise<boolean>>();

  const resolvesPublic = async (host: string): Promise<boolean> => {
    if (isIpLiteral(host)) return !isPrivateAddress(host);
    try {
      const records = await lookup(host, { all: true });
      return (
        records.length > 0 &&
        records.every((record) => !isPrivateAddress(record.address))
      );
    } catch {
      return false;
    }
  };

  return async function isSafeToFetch(url: string): Promise<boolean> {
    if (!isCrawlableUrl(url)) return false;
    const host = normalizeHost(new URL(url).hostname);
    let verdict = verdicts.get(host);
    if (!verdict) {
      verdict = resolvesPublic(host);
      verdicts.set(host, verdict);
    }
    return verdict;
  };
}

export type HostGuard = ReturnType<typeof createHostGuard>;

/** Turn what someone typed ("example.com") into a validated start URL. */
export async function normalizeAndValidateStartUrl(
  input: string,
  isSafeToFetch: HostGuard,
): Promise<string> {
  let raw = input.trim();
  if (!raw) throw new AuditUrlError("INVALID_URL", "Enter a website address.");
  // "ftp://x" must be refused, not read as a host called "ftp".
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new AuditUrlError("INVALID_URL", "Only http and https addresses can be audited.");
  }
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AuditUrlError("INVALID_URL", "That is not a valid website address.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AuditUrlError("INVALID_URL", "Only http and https addresses can be audited.");
  }
  if (parsed.username || parsed.password) {
    throw new AuditUrlError("INVALID_URL", "Remove the username and password from the address.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new AuditUrlError("TARGET_BLOCKED", "That address is on a private network and cannot be audited.");
  }
  parsed.hash = "";
  const url = parsed.toString();
  if (!(await isSafeToFetch(url))) {
    throw new AuditUrlError(
      "DNS_FAILED",
      `${parsed.hostname} does not resolve to a public address. Check the spelling.`,
    );
  }
  return url;
}
