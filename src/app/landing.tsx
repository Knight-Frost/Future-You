'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, prefix = '', suffix = '', duration = 1800 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  return (
    <div className="group relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────
function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold"
        style={{ background: 'var(--primary-gradient)', color: '#fff', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
        {n}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.05rem', color: '#111827', marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.65 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── Mini dashboard mockup ────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none" style={{ filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.18))' }}>
      {/* Window chrome */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#141820', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          <div className="flex-1 mx-4">
            <div className="rounded-md px-3 py-1 text-center" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
              futureyou.app/dashboard
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="p-5 space-y-4" style={{ background: '#f7faf7' }}>
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Good morning, Alex</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Your surplus is growing. Keep it up.</div>
            </div>
            <div className="rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--primary-gradient)' }}>A</div>
          </div>

          {/* 4 stat cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Net Surplus', value: '$2,063', color: '#16a34a', up: true },
              { label: 'Net Worth',   value: '$48.2K', color: '#2563eb', up: true },
              { label: 'Debt-Free',   value: '14 mo',  color: '#d97706', up: false },
              { label: 'Savings Rate',value: '43%',    color: '#059669', up: true },
            ].map((m) => (
              <div key={m.label} className="rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Net Worth Growth</div>
            <svg viewBox="0 0 280 60" className="w-full" style={{ height: 60 }}>
              <defs>
                <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,55 C30,50 50,45 80,38 C110,31 130,28 160,20 C190,12 220,8 280,4" fill="none" stroke="#16a34a" strokeWidth="2" />
              <path d="M0,55 C30,50 50,45 80,38 C110,31 130,28 160,20 C190,12 220,8 280,4 L280,60 L0,60 Z" fill="url(#gfill)" />
              <path d="M0,55 C35,52 60,49 90,44 C120,39 145,37 175,33 C205,29 240,26 280,22" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
              <path d="M0,55 C40,53 65,51 95,48 C125,45 150,44 180,41 C210,38 245,36 280,34" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
            </svg>
            <div className="flex items-center gap-4 mt-1">
              {[{ c: '#16a34a', l: 'Optimistic' }, { c: '#f59e0b', l: 'Moderate' }, { c: '#2563eb', l: 'Conservative' }].map((i) => (
                <div key={i.l} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: i.c }} />
                  <span style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{i.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spending donut row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Spending</div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 40 40" width="40" height="40">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="42 44" strokeLinecap="round" transform="rotate(-90 20 20)" />
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="20 66" strokeDashoffset="-42" strokeLinecap="round" transform="rotate(-90 20 20)" />
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="10 76" strokeDashoffset="-62" strokeLinecap="round" transform="rotate(-90 20 20)" />
                  <circle cx="20" cy="20" r="7" fill="white" />
                </svg>
                <div className="space-y-0.5">
                  {[['Housing','#3b82f6'],['Food','#10b981'],['Transport','#f59e0b']].map(([l,c]) => (
                    <div key={l} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                      <span style={{ fontSize: '0.55rem', color: '#6b7280' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Debt Payoff</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706', marginBottom: 2 }}>14 months</div>
              <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>Save $3,240 in interest</div>
              <div className="mt-2 rounded-full h-1.5 overflow-hidden" style={{ background: '#f3f4f6' }}>
                <div className="h-full rounded-full" style={{ width: '65%', background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -left-8 top-24 rounded-2xl px-3 py-2 hidden lg:flex items-center gap-2"
        style={{ background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#ecfdf5' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#111827' }}>Surplus up 12%</div>
          <div style={{ fontSize: '0.55rem', color: '#6b7280' }}>vs last month</div>
        </div>
      </div>
      <div className="absolute -right-6 bottom-24 rounded-2xl px-3 py-2 hidden lg:flex items-center gap-2"
        style={{ background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#fff7ed' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#111827' }}>Debt-free in 14mo</div>
          <div style={{ fontSize: '0.55rem', color: '#6b7280' }}>at current pace</div>
        </div>
      </div>
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: '#f7faf7', color: '#111827', overflowX: 'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(247,250,247,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.15rem', color: '#111827' }}>Future You</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it works', 'Pricing'].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#16a34a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#374151')}>
                {label}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '8px 16px', borderRadius: 10, transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              Sign in
            </Link>
            <Link href="/register" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: 10, background: 'var(--primary-gradient)', boxShadow: '0 4px 12px rgba(22,163,74,0.3)', transition: 'opacity 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
              Get started free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden" style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Features', 'How it works', 'Pricing'].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} onClick={() => setMenuOpen(false)}
                style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.07)', margin: '4px 0' }} />
            <Link href="/login" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link href="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)} style={{ textAlign: 'center' }}>Get started free</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 96, paddingBottom: 80 }}>
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-60%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: 80, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)' }} />
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="lg:grid-cols-2 grid-cols-1">

            {/* Left — copy */}
            <div>
              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', marginBottom: 24 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#15803d' }}>Smart financial planning — no spreadsheets</span>
              </div>

              <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 900, lineHeight: 1.1, color: '#111827', marginBottom: 20 }}>
                See Your Future.<br />
                <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Decide It Today.</span>
              </h1>

              <p style={{ fontSize: '1.05rem', color: '#4b5563', lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
                Import your bank transactions, and FutureYou instantly shows you your real spending, debt payoff timeline, savings projections, and exactly what to do next.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 48 }}>
                <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: 'var(--primary-gradient)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 6px 20px rgba(22,163,74,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(22,163,74,0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,163,74,0.35)'; }}>
                  Start for free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 12, background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', border: '1.5px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(22,163,74,0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}>
                  Sign in
                </Link>
              </div>

              {/* Trust row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
                {[
                  { icon: '🔒', text: 'No bank login required' },
                  { icon: '⚡', text: 'Import in seconds' },
                  { icon: '🆓', text: 'Free to start' },
                ].map((item) => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mockup */}
            <div className="hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { value: 9, suffix: '', label: 'Spending categories', prefix: '' },
            { value: 100, suffix: '%', label: 'Auto-classified transactions', prefix: '' },
            { value: 3, suffix: ' seconds', label: 'Average import time', prefix: '<' },
            { value: 0, suffix: ' bank logins', label: 'Just upload your CSV', prefix: '' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
                {s.prefix}<Counter to={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>What you get</p>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>
              Everything your finances need.<br />Nothing they don&apos;t.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <FeatureCard
              accent="#16a34a"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
              title="Smart import"
              desc="Upload a CSV or Excel export from any bank. Every transaction is automatically named, categorised into one of 9 spending groups, and scored for confidence — in seconds."
            />
            <FeatureCard
              accent="#2563eb"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
              title="Live projections"
              desc="See exactly when you'll pay off your debt, hit your savings goal, and what your net worth looks like in 10 years — updated the instant you change any number."
            />
            <FeatureCard
              accent="#d97706"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
              title="Actionable insights"
              desc="Not just charts — specific, numbered recommendations based on your real data. FutureYou tells you exactly what to do next, ranked by financial impact."
            />
            <FeatureCard
              accent="#7c3aed"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              title="Debt strategy"
              desc="Three ranked payoff strategies — conservative, balanced, aggressive — each showing exactly how much you save in interest and how many months you cut off."
            />
            <FeatureCard
              accent="#059669"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>}
              title="Goals tracker"
              desc="Set savings goals with deadlines. The engine calculates whether you're on track and how much to redirect from surplus to get there — automatically."
            />
            <FeatureCard
              accent="#0ea5e9"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>}
              title="What-if simulator"
              desc="Drag sliders — more income, less spending, bigger debt payments — and watch every metric update in real time. Test scenarios before committing."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#fff', padding: '96px 24px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="lg:grid-cols-2 grid-cols-1">

          {/* Left — steps */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Get started in minutes</p>
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(1.8rem, 3.5vw, 2.2rem)', fontWeight: 900, color: '#111827', marginBottom: 40, lineHeight: 1.2 }}>
              From zero to financial clarity in three steps
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Step n="1" title="Set up your plan" desc="Enter your income, expenses, savings, investments, and any debt. Takes two minutes." />
              <Step n="2" title="Import your transactions" desc="Export a CSV or Excel file from your bank and drop it in. FutureYou handles everything — normalising merchant names, classifying categories, removing duplicates." />
              <Step n="3" title="Take action" desc="Read your insights, activate a debt strategy, set a goal, or run a simulator scenario. Every recommendation is specific to your numbers." />
            </div>
            <div style={{ marginTop: 40 }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, background: 'var(--primary-gradient)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
                Start now — it&apos;s free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </div>
          </div>

          {/* Right — import preview card */}
          <div style={{ position: 'relative' }}>
            <div className="rounded-3xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Transactions</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '4px 10px', borderRadius: 100 }}>36 imported</div>
              </div>
              {/* Transaction rows */}
              <div style={{ padding: '8px 0' }}>
                {[
                  { name: 'Whole Foods Market', cat: 'Food', color: '#10b981', amt: '$124.30', conf: 97 },
                  { name: 'Shell Gas Station',  cat: 'Transport', color: '#f59e0b', amt: '$62.10', conf: 91 },
                  { name: 'Netflix',            cat: 'Subscriptions', color: '#ec4899', amt: '$15.99', conf: 99 },
                  { name: 'Rent Payment',       cat: 'Housing', color: '#3b82f6', amt: '$1,200', conf: 95 },
                  { name: 'Amazon Purchase',    cat: 'Shopping', color: '#6366f1', amt: '$47.99', conf: 88 },
                ].map((tx) => (
                  <div key={tx.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.name}</div>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{tx.amt}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: 100, background: `${tx.color}15`, color: tx.color, border: `1px solid ${tx.color}25`, whiteSpace: 'nowrap' }}>{tx.cat}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 28, height: 4, borderRadius: 100, background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 100, width: `${tx.conf}%`, background: '#16a34a' }} />
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: 600 }}>{tx.conf}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating insight badge */}
            <div style={{ position: 'absolute', bottom: -16, right: -12, background: '#fff', borderRadius: 16, padding: '12px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.07)', maxWidth: 220 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', marginBottom: 3 }}>Top insight</div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, lineHeight: 1.4 }}>Food spending is 18% above average. Cut $80/mo to pay off debt 2 months sooner.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px', background: '#f7faf7' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Simple pricing</p>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 900, color: '#111827', marginBottom: 12 }}>
            Free, with everything included
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 48, fontSize: '1rem' }}>No credit card. No feature paywalls. FutureYou is free to use.</p>

          <div style={{ background: '#fff', border: '2px solid rgba(22,163,74,0.25)', borderRadius: 24, padding: '40px', boxShadow: '0 8px 32px rgba(22,163,74,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-headline)', fontSize: '3rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>$0</div>
            <div style={{ color: '#6b7280', marginBottom: 32, marginTop: 4 }}>forever</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', textAlign: 'left', marginBottom: 36 }}>
              {[
                'Unlimited transaction imports',
                'Smart AI categorisation',
                'Debt payoff strategies',
                'Goal tracking',
                'Net worth projections',
                'What-if simulator',
                'Spending analytics',
                'Downloadable reports',
              ].map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '16px', borderRadius: 12, background: 'var(--primary-gradient)', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 6px 20px rgba(22,163,74,0.35)' }}>
              Create your free account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 16 }}>
            Your financial future starts with one import.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 40 }}>
            Stop guessing where your money goes. FutureYou turns your bank export into a complete financial picture — in seconds.
          </p>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', borderRadius: 14, background: '#fff', color: '#15803d', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.2)', transition: 'transform 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}>
            Get started — it&apos;s free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Future You</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            © {new Date().getFullYear()} Future You. Not financial advice.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms'].map((l) => (
              <a key={l} href="#" style={{ fontSize: '0.8rem', color: '#6b7280', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#16a34a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
