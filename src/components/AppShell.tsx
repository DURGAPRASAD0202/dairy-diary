'use client';
import { useAuth, DEMO_MODE } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { 
    isAuthenticated, loading, user, profile, 
    logOut, resendVerification, emailVerified, verifyDemoAccount 
  } = useAuth();

  // Full-screen loading splash
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #064E3B, #16A34A)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 42,
        }}>
          🥛
        </div>
        <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>DAIRY DIARY</div>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Verification guard
  if (!emailVerified) {
    return (
      <div className="lp-shell" style={{ textAlign: 'center', padding: '0 24px' }}>
        <div className="lp-card lp-in" style={{ padding: '40px 24px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>📧</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            Verify Your Email
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            We&apos;ve sent a verification link to <strong>{user?.email || profile?.email}</strong>.
            Please check your inbox (and spam folder) and click the link to activate your account.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="lp-btn" 
              onClick={() => {
                if (DEMO_MODE) {
                  verifyDemoAccount();
                } else {
                  window.location.reload();
                }
              }}
            >
              🔄 I&apos;ve Verified
            </button>
            
            <button 
              className="lp-link" 
              onClick={async () => {
                try {
                  await resendVerification();
                  alert('✅ Verification email resent!');
                } catch (e) {
                  alert('❌ Failed to resend. Please try again later.');
                }
              }}
              style={{ padding: 10 }}
            >
              Didn&apos;t receive it? Resend Email
            </button>

            <button 
              className="lp-link" 
              style={{ color: '#ef4444', marginTop: 10 }}
              onClick={logOut}
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
