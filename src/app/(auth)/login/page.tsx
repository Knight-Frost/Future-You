'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Icon-prefixed input ──────────────────────────────────────────────────────
function AuthInput({
  label, id, type = 'text', placeholder, value, onChange,
  autoComplete, required, icon, rightSlot, hasError,
}: {
  label: string; id: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; autoComplete?: string;
  required?: boolean; icon: React.ReactNode; rightSlot?: React.ReactNode;
  hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = hasError ? '#dc2626' : focused ? '#16a34a' : '#D1D9E6';
  const shadow      = hasError ? '0 0 0 3px rgba(220,38,38,0.12)' : focused ? '0 0 0 3px rgba(22,163,74,0.08)' : 'none';
  return (
    <div>
      {label && (
        <label htmlFor={id} style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: hasError ? '#dc2626' : '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          {icon}
        </span>
        <input
          id={id} type={type} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete} required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', paddingTop: 15, paddingBottom: 15, paddingLeft: 48,
            paddingRight: rightSlot ? 48 : 16, borderRadius: 12,
            border: `1.5px solid ${borderColor}`, background: hasError ? '#fef2f2' : '#F8FAFD',
            fontSize: '0.95rem', color: '#1a2e1a', outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            boxShadow: shadow, boxSizing: 'border-box',
          }}
        />
        {rightSlot && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', zIndex: 2 }}>
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [field,    setField]    = useState<'email' | 'password' | 'both' | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [shake,    setShake]    = useState(false);

  function triggerError(msg: string, highlight: 'email' | 'password' | 'both' | null = 'both') {
    setError(msg);
    setField(highlight);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function handleEmailChange(v: string) {
    setEmail(v);
    if (error) { setError(''); setField(null); }
  }
  function handlePasswordChange(v: string) {
    setPassword(v);
    if (error) { setError(''); setField(null); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ── Client-side validation ────────────────────────────────────────────────
    if (!email.trim()) {
      triggerError('Please enter your email address.', 'email');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      triggerError('That doesn\'t look like a valid email address.', 'email');
      return;
    }
    if (!password) {
      triggerError('Please enter your password.', 'password');
      return;
    }
    if (password.length < 8) {
      triggerError('Password must be at least 8 characters.', 'password');
      return;
    }

    setError('');
    setField(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', { email: email.trim(), password, redirect: false });

      if (!result) {
        triggerError('Something went wrong. Please try again.');
        return;
      }

      if (result.error) {
        // NextAuth returns "CredentialsSignin" for all auth failures.
        // We intentionally show the same message for wrong password and unknown
        // email — distinguishing them would let attackers enumerate accounts.
        triggerError('No account found with those credentials. Check your email and password, or create a new account below.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      triggerError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .shake { animation: shake 0.45s ease; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EBF0F9 0%, #E2EAF4 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '24px 16px 80px',
      }}>
        <div
          className={shake ? 'shake' : ''}
          style={{
            width: '100%', maxWidth: 480, background: '#FFFFFF', borderRadius: 20,
            boxShadow: '0 4px 32px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06)',
            padding: '44px 48px 40px',
          }}
        >
          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700, fontSize: '2.2rem', color: '#14532d', lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.01em' }}>
              Log in to your account
            </h1>
            <div style={{ width: 48, height: 3, borderRadius: 2, background: '#E8CC7A', marginBottom: 14 }} />
            <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.5 }}>
              Welcome back. Enter your details to continue.
            </p>
          </div>

          {/* Demo callout */}
          <div style={{ background: 'rgba(22,163,74,0.08)', border: '1.5px solid rgba(22,163,74,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14532d', marginBottom: 2 }}>Try the demo account</p>
              <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#15803d' }}>demo@futureyou.app · demo123456</p>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10,
              padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ fontSize: '0.875rem', color: '#dc2626', lineHeight: 1.5, fontWeight: 500 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AuthInput
              id="email" label="Email" type="email"
              placeholder="Enter your email"
              value={email} onChange={handleEmailChange}
              autoComplete="email" required
              icon={<IconMail />}
              hasError={field === 'email' || field === 'both'}
            />

            <div>
              <label htmlFor="password" style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}>
                Password
              </label>
              <AuthInput
                id="password" label="" type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password} onChange={handlePasswordChange}
                autoComplete="current-password" required
                icon={<IconLock />}
                hasError={field === 'password' || field === 'both'}
                rightSlot={
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    style={{ color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: '4px', display: 'flex', borderRadius: 6 }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    <IconEye open={showPw} />
                  </button>
                }
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px 24px', borderRadius: 12,
                background: loading ? '#86EFAC' : '#16a34a',
                color: '#ffffff', fontSize: '1rem', fontWeight: 700, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s, transform 0.1s', marginTop: 4,
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#15803d'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = loading ? '#86EFAC' : '#16a34a'; }}
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, padding: '0 4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5 }}>
              Your information is protected with industry-standard encryption.
            </p>
          </div>

          {/* Divider + signup */}
          <div style={{ borderTop: '1px solid #E8EDF5', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid #E2E8F0', padding: '10px 16px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
            FutureYou — Secure Financial Planning Portal
          </p>
        </div>
      </div>
    </>
  );
}
