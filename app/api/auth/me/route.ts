import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAccount, listAccounts } from '@/lib/account';

export const dynamic = 'force-dynamic';

/** Who is signed in, which customer account they are working in, and (ACE staff only) every account they can switch to. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const account = getAccount();
  return NextResponse.json({
    id: session.id,
    email: session.email,
    role: session.role,
    platform: session.platform,
    account: { id: account.id, name: account.name, domain: account.domain },
    accounts: session.platform ? listAccounts().map(a => ({ id: a.id, name: a.name, domain: a.domain })) : undefined,
  });
}
