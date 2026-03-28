'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Icon-prefixed input ──────────────────────────────────────────────────────

function AuthInput({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  required,
  icon,
  rightSlot,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {/* Left icon */}
        <span
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {icon}
        </span>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            width: '100%',
            paddingTop: 15,
            paddingBottom: 15,
            paddingLeft: 48,
            paddingRight: rightSlot ? 48 : 16,
            borderRadius: 12,
            border: '1.5px solid #D1D9E6',
            background: '#F8FAFD',
            fontSize: '0.95rem',
            color: '#1a2e1a',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-subtle)';
            e.currentTarget.style.background = '#ffffff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#D1D9E6';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = '#F8FAFD';
          }}
        />

        {/* Right slot (e.g. eye toggle) */}
        {rightSlot && (
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
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
  const router  = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #EBF0F9 0%, #E2EAF4 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 80px',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 4px 32px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06)',
          padding: '44px 48px 40px',
        }}
      >
        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontWeight: 700,
              fontSize: '2.2rem',
              color: '#14532d',
              lineHeight: 1.15,
              marginBottom: 10,
              letterSpacing: '-0.01em',
            }}
          >
            Log in to your account
          </h1>
          {/* Gold accent underline */}
          <div style={{ width: 48, height: 3, borderRadius: 2, background: 'var(--gold-light)', marginBottom: 14 }} />
          <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.5 }}>
            Log in to access your FutureYou account.
          </p>
        </div>

        {/* Demo callout */}
        <div
          style={{
            background: 'var(--primary-subtle)',
            border: '1.5px solid rgba(22,163,74,0.18)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14532d', marginBottom: 2 }}>Try the demo account</p>
            <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#15803d' }}>demo@futureyou.app · demo123456</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AuthInput
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            icon={<IconMail />}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <label htmlFor="password" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a' }}>
                Password
              </label>
            </div>
            <AuthInput
              id="password"
              label=""
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              icon={<IconLock />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <IconEye open={showPw} />
                </button>
              }
            />
          </div>

          {error && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 24px',
              borderRadius: 12,
              background: loading ? '#86EFAC' : 'var(--primary)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, transform 0.1s',
              marginTop: 4,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}
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
          <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5, textAlign: 'center' }}>
            Your information is protected. FutureYou uses industry-standard encryption and strict security practices to protect your personal and financial information.
          </p>
        </div>

        {/* Divider + signup link */}
        <div style={{ borderTop: '1px solid #E8EDF5', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Don't have an account?{' '}
            <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #E2E8F0',
          padding: '10px 16px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
          FutureYou — Secure Financial Planning Portal
        </p>
      </div>
    </div>
  );
}
