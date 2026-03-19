import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { OVERALL_DEMO } from '@/lib/demo-data';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: OVERALL_DEMO, source: 'demo' });
}
