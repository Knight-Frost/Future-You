/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
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
