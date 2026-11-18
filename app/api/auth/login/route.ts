import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/db';
import { signToken, PASSWORD_COOKIE, cookieOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const db = getPlatformDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase()) as any
      || db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(PASSWORD_COOKIE, token, cookieOptions());
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
