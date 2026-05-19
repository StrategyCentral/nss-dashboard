import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

function asJsonArray(v: any): string | null {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'string') {
    const arr = v.split(',').map(s => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  }
  return null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    const voice = db.prepare('SELECT * FROM brand_voices WHERE id = ?').get(id);
    if (!voice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ voice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    const body = await req.json();
    const existing: any = db.prepare('SELECT * FROM brand_voices WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fields: any = {};
    if ('name' in body) fields.name = body.name;
    if ('voice_tone' in body) fields.voice_tone = body.voice_tone;
    if ('style' in body) fields.style = body.style;
    if ('vocabulary' in body) fields.vocabulary = asJsonArray(body.vocabulary);
    if ('avoid_phrases' in body) fields.avoid_phrases = asJsonArray(body.avoid_phrases);
    if ('example_text' in body) fields.example_text = body.example_text;
    if ('is_default' in body) fields.is_default = body.is_default ? 1 : 0;

    const txn = db.transaction(() => {
      if (fields.is_default === 1) db.prepare('UPDATE brand_voices SET is_default = 0').run();
      const sets: string[] = [];
      const params: any[] = [];
      for (const k of Object.keys(fields)) { sets.push(`${k} = ?`); params.push(fields[k]); }
      sets.push("updated_at = datetime('now')");
      params.push(id);
      if (sets.length > 1) db.prepare(`UPDATE brand_voices SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    });
    txn();

    const voice = db.prepare('SELECT * FROM brand_voices WHERE id = ?').get(id);
    return NextResponse.json({ ok: true, voice });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const id = Number(ctx.params.id);
    db.prepare('DELETE FROM brand_voices WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
