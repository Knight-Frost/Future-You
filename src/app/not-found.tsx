import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center animate-fade-in max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-12">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary-gradient)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <span className="font-bold text-[#0F172A] text-lg" style={{ letterSpacing: '-0.01em' }}>FutureYou</span>
        </div>

        {/* 404 display */}
        <div
          className="text-[8rem] font-black leading-none mb-6 tabular-nums"
          style={{
            background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.06em',
          }}
        >
          404
        </div>

        <h1 className="heading-section mb-3">Page not found</h1>
        <p className="body-sm mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back on track.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/plan" className="btn btn-secondary">
            Financial Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
