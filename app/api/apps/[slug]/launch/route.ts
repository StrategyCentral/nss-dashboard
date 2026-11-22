import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLinkedApp, signLaunchTicket } from '@/lib/linked-apps';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><meta charset="utf-8"><title>${title}</title>
<body style="margin:0;background:#111;color:#ddd;font:14px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="max-width:440px;text-align:center;line-height:1.5"><div style="font-weight:700;font-size:16px;margin-bottom:8px">${title}</div>${body}</div></body>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/**
 * Opens a linked ACE app: straight to it, or through its one-click sign-in.
 * Used as the frame src on /dashboard/<app> and by "Open full screen".
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const app = getLinkedApp(params.slug);
  if (!app) return page('Unknown app', 'This app is not part of the suite.', 404);

  const session = await getSession();
  if (!session) return page('Signed out', 'Sign in to the Marketing Suite again, then reopen this tab.', 401);

  if (!app.sso) return NextResponse.redirect(app.url, { headers: { 'Cache-Control': 'no-store' } });

  const ticket = signLaunchTicket(app, { email: session.email, admin: session.platform && session.role === 'admin' });
  if (!ticket) {
    return page(`${app.name} is not connected yet`,
      `One-click sign-in needs <code>SUITE_SSO_SECRET</code> set on the Marketing Suite and on ${app.name}. ` +
      `Until then, <a style="color:#ff1e8e" href="${app.url}" target="_blank" rel="noopener">open ${app.name} in a new tab</a>.`);
  }
  const url = new URL('/api/auth/sso', app.url);
  url.searchParams.set('ticket', ticket);
  return NextResponse.redirect(url.toString(), { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
