import jwt from 'jsonwebtoken';

/**
 * Other ACE apps shown inside the Marketing Suite, each in a frame.
 *
 * One sign-in for all of them. People sign in once (the ACE Customer Hub, or
 * this suite's own login); for each app the suite signs a 60-second, one-use
 * ticket with SUITE_SSO_SECRET (the same value is set on the app). The app
 * checks it and starts its own session. Nobody types a password in an app.
 *
 * The ticket names the customer account on screen, and Influence and Lead
 * Shop keep one workspace per account: switch website in the suite and the
 * app shows that website's data. Tube Stats has no login (Google sign-in
 * happens inside it). The Backlink Engine is one shared engine for now, so
 * only ACE staff see it.
 *
 * URLs can be overridden per app with an env var, e.g. LEAD_SHOP_URL.
 */
export type LinkedAppSlug = 'influence' | 'tube-stats' | 'lead-shop' | 'backlink-engine';

export interface LinkedApp {
  slug: LinkedAppSlug;
  name: string;
  blurb: string;
  url: string;
  sso: boolean;
  /** Where the app takes the ticket. */
  ssoPath?: string;
  /** Only ACE staff may open it. */
  staffOnly?: boolean;
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
  'backlink-engine': {
    slug: 'backlink-engine',
    name: 'Backlink Engine',
    blurb: 'Syndicates new posts, tracks directory listings and watches for journalist requests',
    url: process.env.BACKLINK_ENGINE_URL || 'https://ace-backlink-engine-production.up.railway.app',
    sso: true,
    ssoPath: '/sso',
    staffOnly: true,
  },
};

export function getLinkedApp(slug: string): LinkedApp | null {
  return (LINKED_APPS as Record<string, LinkedApp>)[slug] || null;
}

export interface LaunchUser {
  email: string;
  admin: boolean;
  account: { id: number; name: string; domain: string };
}

/** A one-use, 60-second sign-in ticket for one app. null when SSO is not set up. */
export function signLaunchTicket(app: LinkedApp, user: LaunchUser): string | null {
  const secret = process.env.SUITE_SSO_SECRET;
  if (!secret) return null;
  return jwt.sign(
    {
      email: user.email,
      role: user.admin ? 'admin' : 'user',
      account_id: user.account.id,
      account_name: user.account.name,
      account_domain: user.account.domain,
    },
    secret,
    { algorithm: 'HS256', expiresIn: 60, audience: app.slug, issuer: 'ace-marketing-suite', jwtid: crypto.randomUUID() },
  );
}
