/** @type {import('next').NextConfig} */

// ─── Security headers ─────────────────────────────────────────────────────────
// Applied to every route. Tighten CSP script-src once Next.js nonce support is
// wired in — 'unsafe-inline' is required for hydration until then.
const securityHeaders = [
  // Prevent page from being embedded in <iframe> (clickjacking)
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't send referrer to cross-origin destinations
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Disable browser features not used by the app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Force HTTPS for 2 years once on a real domain (max-age in seconds)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // TODO: replace 'unsafe-inline' on script-src with a nonce for production
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js hydration requires these
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://avatars.githubusercontent.com",
      // LLM API calls are server-to-server — browsers never connect to it directly,
      // so it must not appear in connect-src (also avoids triggering commit hooks).
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // xlsx uses Node.js built-ins that don't exist in the browser.
      // Tell webpack to provide empty stubs so the client bundle builds cleanly.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        zlib: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
