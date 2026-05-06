/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs'] },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      // Old → new sidebar route renames (2026-05-06)
      { source: '/dashboard/facebook',       destination: '/dashboard/meta-ads',   permanent: true },
      { source: '/dashboard/facebook/:path*', destination: '/dashboard/meta-ads/:path*', permanent: true },
      { source: '/dashboard/google',         destination: '/dashboard/google-ads', permanent: true },
      { source: '/dashboard/google/:path*',  destination: '/dashboard/google-ads/:path*', permanent: true },
    ];
  },
};
export default nextConfig;
