import { NextRequest, NextResponse } from 'next/server';

// Facebook Marketing API requires Meta app review for ads scopes.
// Use the System User token paste method on the Connections page instead.
export async function GET(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${base}/admin/connections?error=facebook_review_required`);
}
