export const dynamic = 'force-dynamic';

const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL || 'https://dashboard.acetradingbots.com').replace(/\/$/, '');

export default function NoAccess({ searchParams }: { searchParams: { reason?: string } }) {
  const expired = searchParams?.reason === 'token';
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
        <div className="section-title" style={{ fontSize: 22, marginBottom: 8 }}>
          {expired ? 'That sign-in link has expired' : 'No access to ACE Marketing Suite'}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
          {expired
            ? 'Open the Marketing Suite again from the ACE Customer Hub and you will be signed straight in.'
            : 'Your ACE login does not have a Marketing Suite account yet. Ask ACE support to add you, or sign in with the email and password you were given.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="btn btn-pink" href={`${HUB_URL}/marketing-suite`} target="_top">Open the Hub</a>
          <a className="btn btn-ghost" href="/">Sign in with a password</a>
        </div>
      </div>
    </div>
  );
}
