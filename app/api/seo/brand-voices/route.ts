import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function asJsonArray(v: any): string | null {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'string') {
    // accept comma-separated
    const arr = v.split(',').map(s => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  return null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const voices = db.prepare('SELECT * FROM brand_voices ORDER BY is_default DESC, name ASC').all();
    return NextResponse.json({ voices });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { name, voice_tone, style, vocabulary, avoid_phrases, example_text, is_default } = body || {};
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const db = getDb();
    const isDef = is_default ? 1 : 0;
    const txn = db.transaction(() => {
      if (isDef) db.prepare('UPDATE brand_voices SET is_default = 0').run();
      const result = db.prepare(`INSERT INTO brand_voices
        (name, voice_tone, style, vocabulary, avoid_phrases, example_text, is_default)
        VALUES (?,?,?,?,?,?,?)`).run(
        name, voice_tone || null, style || null,
        asJsonArray(vocabulary), asJsonArray(avoid_phrases),
        example_text || null, isDef
      );
      return result.lastInsertRowid;
    });
    const id = txn();
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
