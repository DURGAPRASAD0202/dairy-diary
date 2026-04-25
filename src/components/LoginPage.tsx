'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'signin' | 'register';

export default function LoginPage() {
  const { signIn, register } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Sign in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regDairy, setRegDairy] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siEmail || !siPassword) { setError('Please fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      await signIn(siEmail.trim(), siPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg.includes('auth/') ? 'Incorrect email or password.' : msg);
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regDairy || !regEmail || !regPassword || !regConfirm) {
      setError('Please fill in all fields.'); return;
    }
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return; }
    if (regPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    
    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(''); setLoading(true);
    try {
      await register(regName.trim(), regDairy.trim(), regEmail.trim(), regPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg.includes('auth/') ? 'This email is already registered.' : msg);
    } finally { setLoading(false); }
  };

  const switchTab = (t: Tab) => { setTab(t); setError(''); };

  return (
    <div className="lp-shell">
      {/* Background blobs */}
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />
      <div className="lp-blob lp-blob-3" />

      {/* Brand mark (top center) */}
      <div className={`lp-brand ${mounted ? 'lp-in' : ''}`}>
        <div className="lp-icon">🥛</div>
        <div className="lp-brand-name">DAIRY DIARY</div>
        <div className="lp-brand-tag">Manage your milk business — anywhere</div>
      </div>

      {/* Auth card */}
      <div className={`lp-card ${mounted ? 'lp-in' : ''}`} style={{ transitionDelay: '0.08s' }}>

        {/* Tab switcher */}
        <div className="lp-tabs">
          <button
            className={`lp-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => switchTab('signin')}
          >
            🔑 Sign In
          </button>
          <button
            className={`lp-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            ✨ Register Free
          </button>
        </div>

        {/* ── Sign In Form ─────────────────────────────── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="lp-form">
            <div className="lp-welcome">
              <div className="lp-welcome-title">Welcome back! 👋</div>
              <div className="lp-welcome-sub">Sign in to manage your dairy</div>
            </div>

            <div className="lp-field">
              <label className="lp-label">📧 Email</label>
              <input
                className="lp-input"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="lp-field">
              <label className="lp-label">🔒 Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="lp-input"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                />
                <button type="button" className="lp-eye" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="lp-error">❌ {error}</div>}

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? <span className="lp-spinner" /> : '🚀 Sign In'}
            </button>

            <div className="lp-switch">
              Don&apos;t have an account?{' '}
              <button type="button" className="lp-link" onClick={() => switchTab('register')}>
                Register Free →
              </button>
            </div>
          </form>
        )}

        {/* ── Register Form ─────────────────────────────── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="lp-form">
            <div className="lp-welcome">
              <div className="lp-welcome-title">Create your account 🌿</div>
              <div className="lp-welcome-sub">Set up your dairy in 30 seconds</div>
            </div>

            <div className="lp-field">
              <label className="lp-label">👤 Your Name</label>
              <input
                className="lp-input"
                placeholder="e.g. Praveen Kumar"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="lp-field">
              <label className="lp-label">🐃 Dairy / Farm Name</label>
              <input
                className="lp-input"
                placeholder="e.g. Green Valley Dairy"
                value={regDairy}
                onChange={e => setRegDairy(e.target.value)}
              />
            </div>

            <div className="lp-field">
              <label className="lp-label">📧 Email</label>
              <input
                className="lp-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
              />
            </div>

            <div className="lp-2col">
              <div className="lp-field">
                <label className="lp-label">🔒 Password</label>
                <input
                  className="lp-input"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 6 chars"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>
              <div className="lp-field">
                <label className="lp-label">🔒 Confirm</label>
                <input
                  className="lp-input"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', marginTop: -4 }}>
              <button type="button" onClick={() => setShowPass(p => !p)} className="lp-eye-small">
                {showPass ? '🙈 Hide' : '👁️ Show'} password
              </button>
            </div>

            {error && <div className="lp-error">❌ {error}</div>}

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? <span className="lp-spinner" /> : '✨ Create Free Account'}
            </button>

            <div className="lp-switch">
              Already have an account?{' '}
              <button type="button" className="lp-link" onClick={() => switchTab('signin')}>
                Sign In →
              </button>
            </div>

            <div className="lp-free-badge">
              🎉 100% Free · No credit card · Your data stays private
            </div>
          </form>
        )}
      </div>

      {/* Features strip (bottom) */}
      <div className={`lp-features ${mounted ? 'lp-in' : ''}`} style={{ transitionDelay: '0.16s' }}>
        <div className="lp-feat">🥛 Track Deliveries</div>
        <div className="lp-feat-dot">·</div>
        <div className="lp-feat">💰 Manage Payments</div>
        <div className="lp-feat-dot">·</div>
        <div className="lp-feat">📊 Monthly Bills</div>
        <div className="lp-feat-dot">·</div>
        <div className="lp-feat">📱 WhatsApp Bills</div>
      </div>

      <style>{`
        .lp-shell {
          min-height: 100vh;
          background: linear-gradient(160deg, #052E16 0%, #064E3B 35%, #065F46 65%, #047857 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          gap: 20px;
          position: relative;
          overflow: hidden;
        }

        .lp-blob {
          position: absolute; border-radius: 50%;
          filter: blur(70px); opacity: 0.25;
          animation: blobDrift 10s ease-in-out infinite;
          pointer-events: none;
        }
        .lp-blob-1 { width:350px;height:350px;background:#22C55E;top:-120px;left:-100px;animation-delay:0s; }
        .lp-blob-2 { width:280px;height:280px;background:#FBBF24;bottom:-80px;right:-80px;animation-delay:4s; }
        .lp-blob-3 { width:220px;height:220px;background:#34D399;top:40%;right:-60px;animation-delay:7s; }
        @keyframes blobDrift {
          0%,100%{transform:translate(0,0) scale(1);}
          33%{transform:translate(15px,-20px) scale(1.04);}
          66%{transform:translate(-10px,12px) scale(0.96);}
        }

        /* Brand */
        .lp-brand {
          text-align:center; z-index:10;
          opacity:0; transform:translateY(-20px);
          transition: all 0.5s cubic-bezier(.34,1.56,.64,1);
        }
        .lp-in { opacity:1 !important; transform:translateY(0) scale(1) !important; }
        .lp-icon {
          width:70px;height:70px;border-radius:22px;
          background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);
          display:flex;align-items:center;justify-content:center;
          font-size:36px; margin:0 auto 10px;
          border:1.5px solid rgba(255,255,255,0.2);
          box-shadow:0 8px 30px rgba(0,0,0,0.3);
          animation: iconGlow 3s ease-in-out infinite;
        }
        @keyframes iconGlow {
          0%,100%{box-shadow:0 8px 30px rgba(0,0,0,0.3);}
          50%{box-shadow:0 8px 40px rgba(34,197,94,0.4);}
        }
        .lp-brand-name { font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px; }
        .lp-brand-tag { font-size:13px;color:rgba(255,255,255,0.7);margin-top:3px; }

        /* Card */
        .lp-card {
          width:100%;max-width:440px;
          background:rgba(255,255,255,0.98);
          backdrop-filter:blur(20px);
          border-radius:24px;
          box-shadow:0 30px 70px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.2);
          overflow:hidden;
          z-index:10;
          opacity:0; transform:translateY(24px) scale(0.97);
          transition: all 0.5s cubic-bezier(.34,1.56,.64,1);
        }

        /* Tabs */
        .lp-tabs {
          display:flex;
          border-bottom:2px solid #F3F4F6;
        }
        .lp-tab {
          flex:1; padding:14px 8px;
          border:none; background:transparent;
          font-family:'Poppins',sans-serif;font-size:14px;font-weight:600;
          color:#9CA3AF; cursor:pointer;
          transition:all 0.2s;
          position:relative;
        }
        .lp-tab.active { color:#22C55E; }
        .lp-tab.active::after {
          content:'';position:absolute;bottom:-2px;left:0;right:0;
          height:2px;background:#22C55E;border-radius:1px;
        }
        .lp-tab:hover:not(.active) { background:#F9FAFB; }

        /* Form */
        .lp-form { padding:20px 24px 24px; display:flex; flex-direction:column; gap:12px; }
        .lp-welcome { margin-bottom:4px; }
        .lp-welcome-title { font-size:20px;font-weight:700;color:#1F2937; }
        .lp-welcome-sub { font-size:13px;color:#6B7280;margin-top:2px; }

        .lp-field { display:flex; flex-direction:column; gap:5px; }
        .lp-label { font-size:13px;font-weight:600;color:#374151; }
        .lp-input {
          width:100%; height:50px; padding:0 44px 0 14px;
          border:2px solid #E5E7EB; border-radius:12px;
          font-family:'Poppins',sans-serif; font-size:15px; color:#1F2937;
          background:#F9FAFB; outline:none;
          transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;
          box-sizing:border-box;
        }
        .lp-input:focus {
          border-color:#22C55E; background:#fff;
          box-shadow:0 0 0 4px rgba(34,197,94,0.1);
        }
        .lp-2col { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .lp-eye {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          background:none; border:none; font-size:19px; cursor:pointer;
          padding:4px; opacity:0.65; transition:opacity 0.2s;
        }
        .lp-eye:hover { opacity:1; }
        .lp-eye-small {
          background:none; border:none; cursor:pointer;
          font-family:'Poppins',sans-serif; font-size:12px; color:#6B7280;
          padding:0; text-decoration:underline; text-underline-offset:2px;
        }

        .lp-error {
          background:#FEE2E2; color:#991B1B;
          border:1px solid #FECACA; border-radius:10px;
          padding:9px 12px; font-size:13px; font-weight:600;
        }

        .lp-btn {
          height:52px; border:none; border-radius:14px;
          background:linear-gradient(135deg,#22C55E,#16A34A);
          color:#fff; font-family:'Poppins',sans-serif;
          font-size:17px; font-weight:700; cursor:pointer;
          margin-top:2px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 20px rgba(34,197,94,0.35);
          transition:all 0.2s;
        }
        .lp-btn:hover:not(:disabled) {
          box-shadow:0 10px 28px rgba(34,197,94,0.5);
          transform:translateY(-2px);
        }
        .lp-btn:active:not(:disabled) { transform:translateY(0); }
        .lp-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .lp-spinner {
          width:22px;height:22px;
          border:3px solid rgba(255,255,255,0.35);
          border-top-color:#fff; border-radius:50%;
          animation:spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform:rotate(360deg); } }

        .lp-switch { text-align:center; font-size:13px; color:#6B7280; margin-top:2px; }
        .lp-link {
          background:none; border:none; cursor:pointer;
          color:#16A34A; font-weight:700; font-family:'Poppins',sans-serif;
          font-size:13px; padding:0;
        }
        .lp-link:hover { text-decoration:underline; }

        .lp-free-badge {
          text-align:center; font-size:12px; color:#6B7280;
          background:#F0FDF4; border:1px solid #BBF7D0;
          border-radius:8px; padding:8px;
        }

        /* Features strip */
        .lp-features {
          display:flex; flex-wrap:wrap; justify-content:center;
          gap:6px; z-index:10;
          opacity:0; transform:translateY(16px);
          transition:all 0.5s ease;
        }
        .lp-feat { font-size:12px; color:rgba(255,255,255,0.8); font-weight:500; }
        .lp-feat-dot { font-size:12px; color:rgba(255,255,255,0.4); }
      `}</style>
    </div>
  );
}
