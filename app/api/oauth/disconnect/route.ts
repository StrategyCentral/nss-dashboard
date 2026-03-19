import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { platform } = await req.json();
  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM oauth_tokens WHERE platform = ?').run(platform);
  return NextResponse.json({ ok: true });
}
