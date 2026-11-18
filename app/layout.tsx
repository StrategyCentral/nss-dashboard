import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ACE Marketing Suite', description: 'Ads, SEO and revenue in one place.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
