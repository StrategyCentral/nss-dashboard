import jwt from 'jsonwebtoken';

/**
 * Other ACE apps shown inside the Marketing Suite, each in a frame.
 *
 * Apps with their own login (Influence, Lead Shop) get one-click sign-in:
 * the suite signs a 60-second ticket with SUITE_SSO_SECRET (the same value is
 * set on the app), the app checks it at /api/auth/sso, finds or creates the
 * user by email and starts its own session. Tube Stats has no login.
 *
 * URLs can be overridden per app with an env var, e.g. LEAD_SHOP_URL.
 */
export type LinkedAppSlug = 'influence' | 'tube-stats' | 'lead-shop';

export interface LinkedApp {
  slug: LinkedAppSlug;
  name: string;
  blurb: string;
  url: string;
  sso: boolean;
}

export const LINKED_APPS: Record<LinkedAppSlug, LinkedApp> = {
  'influence': {
    slug: 'influence',
    name: 'Influence',
    blurb: 'Social posting and scheduling across your channels',
    url: process.env.INFLUENCE_URL || 'https://ace-influence-production.up.railway.app',
    sso: true,
  },
  'tube-stats': {
    slug: 'tube-stats',
    name: 'Tube Stats',
    blurb: 'Channel and video stats across YouTube, Rumble, Vimeo and Twitch',
    url: process.env.TUBE_STATS_URL || 'https://acetubestats.com',
    sso: false,
  },
  'lead-shop': {
    slug: 'lead-shop',
    name: 'Lead Shop',
    blurb: 'Affiliate links and rank and rent sites: leads, sales and rent in one place',
    url: process.env.LEAD_SHOP_URL || 'https://ace-lead-shop-production.up.railway.app',
    sso: true,
  },
};

export function getLinkedApp(slug: string): LinkedApp | null {
  return (LINKED_APPS as Record<string, LinkedApp>)[slug] || null;
}

/** A one-use, 60-second sign-in ticket for one app. null when SSO is not set up. */
export function signLaunchTicket(app: LinkedApp, user: { email: string; admin: boolean }): string | null {
  const secret = process.env.SUITE_SSO_SECRET;
  if (!secret) return null;
  return jwt.sign(
    { email: user.email, role: user.admin ? 'admin' : 'user' },
    secret,
    { algorithm: 'HS256', expiresIn: 60, audience: app.slug, issuer: 'ace-marketing-suite', jwtid: crypto.randomUUID() },
  );
}
