import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'NSS Marketing Dashboard', description: 'National Salon Supplies — Marketing Intelligence' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
