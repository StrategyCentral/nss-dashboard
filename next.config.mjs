import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs'] },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': __dirname,
    };
    return config;
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
