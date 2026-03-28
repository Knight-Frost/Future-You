'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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
      {label && (
        <label
          htmlFor={id}
          style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none',
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
            paddingTop: 15, paddingBottom: 15,
            paddingLeft: 48, paddingRight: rightSlot ? 48 : 16,
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

        {rightSlot && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

const IconPerson = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

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

// ─── Password requirement row ─────────────────────────────────────────────────

function PwRule({ met, text }: { met: boolean; text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: met ? '#16a34a' : '#94A3B8', fontStyle: 'italic' }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: met ? '#16a34a' : '#CBD5E1', flexShrink: 0 }} />
      {text}
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [agreed,          setAgreed]          = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  const pwRules = [
    { met: password.length >= 8,              text: 'Must be 8–64 characters' },
    { met: /[A-Z]/.test(password),            text: 'Must include 1 uppercase letter (A–Z)' },
    { met: /[a-z]/.test(password),            text: 'Must include 1 lowercase letter (a–z)' },
    { met: /[0-9]/.test(password),            text: 'Must include 1 number (0–9)' },
    { met: /[@#$%!?]/.test(password),         text: 'Must include 1 special character (@, #, $, %, !, ?)' },
  ];

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms of Use and Privacy Policy.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
      await signIn('credentials', { email, password, redirect: false });
      router.push('/onboarding');
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
          maxWidth: 520,
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
            Create Your Account
          </h1>
          {/* Gold accent underline */}
          <div style={{ width: 48, height: 3, borderRadius: 2, background: 'var(--gold-light)', marginBottom: 14 }} />
          <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.5 }}>
            Join FutureYou to start building your path to financial freedom.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AuthInput
            id="name"
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
            icon={<IconPerson />}
          />

          <AuthInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            icon={<IconMail />}
          />

          {/* Password with live rules */}
          <div>
            <label htmlFor="password" style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                <IconLock />
              </span>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                autoComplete="new-password"
                required
                style={{
                  width: '100%', paddingTop: 15, paddingBottom: 15,
                  paddingLeft: 48, paddingRight: 48,
                  borderRadius: 12, border: '1.5px solid #D1D9E6',
                  background: '#F8FAFD', fontSize: '0.95rem', color: '#1a2e1a',
                  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-subtle)'; e.currentTarget.style.background = '#ffffff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#D1D9E6'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F8FAFD'; }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex' }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <IconEye open={showPw} />
              </button>
            </div>

            {/* Password rules — always visible once the field is touched */}
            <ul style={{ marginTop: 10, paddingLeft: 4, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pwRules.map((r) => <PwRule key={r.text} met={r.met} text={r.text} />)}
            </ul>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#1a2e1a', marginBottom: 8 }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                <IconLock />
              </span>
              <input
                id="confirm-password"
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                style={{
                  width: '100%', paddingTop: 15, paddingBottom: 15,
                  paddingLeft: 48, paddingRight: 48,
                  borderRadius: 12,
                  border: `1.5px solid ${passwordMismatch ? 'var(--danger)' : passwordsMatch ? 'var(--primary)' : '#D1D9E6'}`,
                  background: passwordMismatch ? 'var(--danger-bg)' : '#F8FAFD',
                  fontSize: '0.95rem', color: '#1a2e1a',
                  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  if (!passwordMismatch && !passwordsMatch) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-subtle)';
                    e.currentTarget.style.background = '#ffffff';
                  }
                }}
                onBlur={(e) => {
                  if (!passwordMismatch && !passwordsMatch) {
                    e.currentTarget.style.borderColor = '#D1D9E6';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = '#F8FAFD';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex' }}
                aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
              >
                <IconEye open={showConfirmPw} />
              </button>
            </div>

            {/* Match / mismatch feedback */}
            {confirmPassword.length > 0 && (
              <p style={{ marginTop: 6, fontSize: '0.78rem', fontStyle: 'italic', color: passwordsMatch ? '#16a34a' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                {passwordsMatch ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Passwords match</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Passwords do not match</>
                )}
              </p>
            )}
          </div>

          {/* Terms checkbox */}
          <label
            htmlFor="terms"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}
          >
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
              I agree to the{' '}
              <Link href="/terms" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Terms of Use</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>.
            </span>
          </label>

          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px 24px', borderRadius: 12,
              background: loading ? '#86EFAC' : 'var(--primary)',
              color: '#ffffff', fontSize: '1rem', fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', marginTop: 4, letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, padding: '0 4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5, textAlign: 'center' }}>
            Your account is protected with industry-standard encryption and secure data practices.
          </p>
        </div>

        {/* Copyright + divider + login link */}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#CBD5E1', marginTop: 20 }}>
          © {new Date().getFullYear()} FutureYou — Financial Planning Platform
        </p>

        <div style={{ borderTop: '1px solid #E8EDF5', marginTop: 20, paddingTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          borderTop: '1px solid #E2E8F0', padding: '10px 16px', textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
          FutureYou — Secure Financial Planning Portal
        </p>
      </div>
    </div>
  );
}
