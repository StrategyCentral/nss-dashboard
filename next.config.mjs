/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs'] },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // The suite is shown inside the ACE Customer Hub in a frame. Only the Hub
  // (and this site itself) may frame it. HUB_ORIGIN can list more, space-separated.
  async headers() {
    const hub = process.env.HUB_ORIGIN || 'https://dashboard.acetradingbots.com';
    const dev = process.env.NODE_ENV !== 'production' ? ' http://localhost:* http://127.0.0.1:*' : '';
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${hub}${dev}` }] }];
  },
  async redirects() {
    return [
      { source: '/dashboard/facebook',       destination: '/dashboard/meta-ads',   permanent: true },
      { source: '/dashboard/facebook/:path*', destination: '/dashboard/meta-ads/:path*', permanent: true },
      { source: '/dashboard/google',         destination: '/dashboard/google-ads', permanent: true },
      { source: '/dashboard/google/:path*',  destination: '/dashboard/google-ads/:path*', permanent: true },
    ];
  },
};
export default nextConfig;
