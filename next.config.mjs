/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs'] },
};
export default nextConfig;
