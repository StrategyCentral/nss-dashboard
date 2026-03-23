import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Demo revenue data keyed by product URL / category URL
const DEMO_REVENUE: Record<string, any> = {
  '/waxing/wax-strips/': {
    thisMonth: 4840, lastMonth: 3920,
    channels: [
      { name: 'SEO / Organic', value: 1840, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 1200, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Facebook', value: 920, color: '#1877F2', icon: 'f' },
      { name: 'Meta — Instagram', value: 640, color: '#E1306C', icon: '📸' },
      { name: 'Direct / Email', value: 240, color: '#ffe600', icon: '✉' },
    ],
    orders: 124, avgOrderValue: 39, topProduct: 'Wax Strips 100pk',
  },
  '/waxing/': {
    thisMonth: 18400, lastMonth: 15200,
    channels: [
      { name: 'SEO / Organic', value: 7200, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 4800, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Facebook', value: 3200, color: '#1877F2', icon: 'f' },
      { name: 'Meta — Instagram', value: 2100, color: '#E1306C', icon: '📸' },
      { name: 'TikTok Ads', value: 680, color: '#FE2C55', icon: '♪' },
      { name: 'Direct / Email', value: 420, color: '#ffe600', icon: '✉' },
    ],
    orders: 412, avgOrderValue: 44, topProduct: 'Wax Strips 100pk',
  },
  '/nails/': {
    thisMonth: 14200, lastMonth: 11800,
    channels: [
      { name: 'SEO / Organic', value: 5400, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 3800, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Facebook', value: 2400, color: '#1877F2', icon: 'f' },
      { name: 'Meta — Instagram', value: 1900, color: '#E1306C', icon: '📸' },
      { name: 'TikTok Ads', value: 480, color: '#FE2C55', icon: '♪' },
      { name: 'Direct / Email', value: 220, color: '#ffe600', icon: '✉' },
    ],
    orders: 318, avgOrderValue: 44, topProduct: 'Gel Polish Set 36pc',
  },
  '/nails/gel-polish/': {
    thisMonth: 6840, lastMonth: 5200,
    channels: [
      { name: 'SEO / Organic', value: 2400, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 1800, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Instagram', value: 1600, color: '#E1306C', icon: '📸' },
      { name: 'Meta — Facebook', value: 720, color: '#1877F2', icon: 'f' },
      { name: 'TikTok Ads', value: 320, color: '#FE2C55', icon: '♪' },
    ],
    orders: 156, avgOrderValue: 44, topProduct: 'Gel Polish Set 36pc',
  },
  '/tanning/': {
    thisMonth: 9800, lastMonth: 8400,
    channels: [
      { name: 'SEO / Organic', value: 3800, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 2600, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Facebook', value: 1900, color: '#1877F2', icon: 'f' },
      { name: 'Meta — Instagram', value: 1200, color: '#E1306C', icon: '📸' },
      { name: 'Direct / Email', value: 300, color: '#ffe600', icon: '✉' },
    ],
    orders: 224, avgOrderValue: 44, topProduct: 'Spray Tan Solution 1L',
  },
  '/tanning/spray-tan/': {
    thisMonth: 5200, lastMonth: 4100,
    channels: [
      { name: 'SEO / Organic', value: 2100, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: 1400, color: '#4285F4', icon: '📢' },
      { name: 'Meta — Instagram', value: 980, color: '#E1306C', icon: '📸' },
      { name: 'Meta — Facebook', value: 520, color: '#1877F2', icon: 'f' },
      { name: 'Direct / Email', value: 200, color: '#ffe600', icon: '✉' },
    ],
    orders: 118, avgOrderValue: 44, topProduct: 'Spray Tan Solution 1L',
  },
  '/blog/how-to-brazilian-wax/': {
    thisMonth: 1240, lastMonth: 980,
    channels: [
      { name: 'SEO / Organic', value: 940, color: '#a8cf45', icon: '🔍' },
      { name: 'Direct / Email', value: 180, color: '#ffe600', icon: '✉' },
      { name: 'Social (Organic)', value: 120, color: '#c084fc', icon: '♻' },
    ],
    orders: 28, avgOrderValue: 44, topProduct: 'Wax Starter Kit',
  },
  '/blog/gel-nails-at-home/': {
    thisMonth: 2180, lastMonth: 1640,
    channels: [
      { name: 'SEO / Organic', value: 1640, color: '#a8cf45', icon: '🔍' },
      { name: 'Social (Organic)', value: 340, color: '#c084fc', icon: '♻' },
      { name: 'Direct / Email', value: 200, color: '#ffe600', icon: '✉' },
    ],
    orders: 49, avgOrderValue: 44, topProduct: 'Gel Nail Kit Pro',
  },
};

function getDefaultRevenue(traffic: number) {
  const thisMonth = Math.round(traffic * 4.2);
  const lastMonth = Math.round(thisMonth * 0.84);
  const seo = Math.round(thisMonth * 0.38);
  const google = Math.round(thisMonth * 0.24);
  const fbig = Math.round(thisMonth * 0.22);
  const direct = thisMonth - seo - google - fbig;
  return {
    thisMonth, lastMonth,
    channels: [
      { name: 'SEO / Organic', value: seo, color: '#a8cf45', icon: '🔍' },
      { name: 'Google Ads', value: google, color: '#4285F4', icon: '📢' },
      { name: 'Meta Ads', value: fbig, color: '#1877F2', icon: 'f' },
      { name: 'Direct / Email', value: direct, color: '#ffe600', icon: '✉' },
    ],
    orders: Math.round(traffic * 0.04),
    avgOrderValue: 44,
    topProduct: 'Various',
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const pageUrl = url.searchParams.get('url') || '';
  const traffic = parseInt(url.searchParams.get('traffic') || '0');

  // Try to get from WooCommerce if keys configured
  try {
    const db = getDb();
    const wcKey = db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get('woocommerce_key') as any;
    const wcSecret = db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get('woocommerce_secret') as any;
    const wcUrl = db.prepare('SELECT key_value FROM api_keys WHERE service = ?').get('woocommerce_url') as any;

    if (wcKey && wcSecret && wcUrl) {
      // Real WooCommerce integration would query orders by UTM source / referrer
      // For now fall through to demo data
    }
  } catch {}

  // Return demo data keyed by URL, or generate from traffic estimate
  const data = DEMO_REVENUE[pageUrl] || getDefaultRevenue(traffic);
  return NextResponse.json({ data, source: 'demo' });
}
