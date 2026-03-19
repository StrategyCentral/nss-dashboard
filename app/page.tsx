'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (res.ok) { router.push('/dashboard'); }
    else { setError(data.error || 'Login failed'); setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--dark)', position:'relative', overflow:'hidden' }}>
      {/* bg decoration */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(231,37,141,0.18) 0%, transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-100, left:-100, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(4,170,232,0.08) 0%, transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:400, padding:32, position:'relative' }}>
        {/* logo area */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:'var(--pink)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:900, letterSpacing:'0.05em', color:'var(--text)' }}>NATIONAL SALON</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:'0.12em', color:'var(--muted)', marginTop:-2 }}>MARKETING INTELLIGENCE</div>
            </div>
          </div>
          <div style={{ width:60, height:3, background:'linear-gradient(90deg, var(--pink), var(--blue))', borderRadius:2, margin:'0 auto' }}/>
        </div>

        {/* card */}
        <div className="card" style={{ padding:32 }}>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, marginBottom:4 }}>Sign in</h2>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:24 }}>Access your marketing dashboard</p>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div style={{ fontSize:12, color:'#ff6b6b', background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.3)', borderRadius:6, padding:'8px 12px' }}>{error}</div>}
            <button className="btn btn-pink" type="submit" disabled={loading} style={{ width:'100%', marginTop:4, opacity:loading?0.7:1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ fontSize:11, color:'var(--muted)', marginTop:20, textAlign:'center' }}>
            Default: admin@nss.com.au / nss2024!
          </p>
        </div>

        {/* colour bar */}
        <div style={{ display:'flex', gap:0, marginTop:20, borderRadius:4, overflow:'hidden', height:3 }}>
          <div style={{ flex:1, background:'var(--pink)' }}/>
          <div style={{ flex:1, background:'var(--yellow)' }}/>
          <div style={{ flex:1, background:'var(--green)' }}/>
          <div style={{ flex:1, background:'var(--blue)' }}/>
        </div>
      </div>
    </div>
  );
}
