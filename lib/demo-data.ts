// ── SEO Demo ──────────────────────────────────────────────────────────────────
export const SEO_DEMO = {
  rankings: [
    { keyword: 'salon supplies australia', position: 4, prev: 7, volume: 1900 },
    { keyword: 'hair salon supplies', position: 2, prev: 5, volume: 3200 },
    { keyword: 'professional salon products', position: 6, prev: 9, volume: 880 },
    { keyword: 'beauty supply store online', position: 8, prev: 12, volume: 2100 },
    { keyword: 'nail salon supplies wholesale', position: 3, prev: 3, volume: 720 },
    { keyword: 'salon furniture australia', position: 11, prev: 15, volume: 590 },
  ],
  trend: [
    { month: 'Sep', avgPos: 9.2 }, { month: 'Oct', avgPos: 8.1 },
    { month: 'Nov', avgPos: 7.4 }, { month: 'Dec', avgPos: 6.8 },
    { month: 'Jan', avgPos: 6.1 }, { month: 'Feb', avgPos: 5.6 },
    { month: 'Mar', avgPos: 4.9 },
  ],
  clicks: 3842, impressions: 48200, ctr: 7.97, avgPos: 4.9,
};

// ── Facebook Ads Demo ─────────────────────────────────────────────────────────
export const FACEBOOK_DEMO = {
  spend: 4820,
  revenue: 21480,
  roas: 4.46,
  conversions: 184,
  cpc: 1.24,
  campaigns: [
    { name: 'Salon Starter Kit — Retargeting', spend: 1240, revenue: 7380, roas: 5.95, conversions: 62 },
    { name: 'Nail Tech Essentials — Cold', spend: 980, revenue: 3920, roas: 4.00, conversions: 38 },
    { name: 'Hair Colour Range — Warm', spend: 1620, revenue: 6480, roas: 4.00, conversions: 54 },
    { name: 'Furniture Promo — Broad', spend: 980, revenue: 3700, roas: 3.78, conversions: 30 },
  ],
  monthly: [
    { month: 'Sep', spend: 3200, revenue: 12800 },
    { month: 'Oct', spend: 3800, revenue: 16200 },
    { month: 'Nov', spend: 5200, revenue: 24400 },
    { month: 'Dec', spend: 4100, revenue: 19800 },
    { month: 'Jan', spend: 3600, revenue: 15300 },
    { month: 'Feb', spend: 4200, revenue: 18900 },
    { month: 'Mar', spend: 4820, revenue: 21480 },
  ],
};

// ── Google Ads Demo ───────────────────────────────────────────────────────────
export const GOOGLE_DEMO = {
  spend: 3640,
  revenue: 18200,
  roas: 5.00,
  conversions: 147,
  cpc: 0.89,
  campaigns: [
    { name: 'Brand — Exact', spend: 480, revenue: 4320, roas: 9.00, conversions: 38 },
    { name: 'Salon Supplies — Broad', spend: 1240, revenue: 6200, roas: 5.00, conversions: 54 },
    { name: 'Competitor Conquesting', spend: 920, revenue: 4140, roas: 4.50, conversions: 32 },
    { name: 'Shopping — All Products', spend: 1000, revenue: 3540, roas: 3.54, conversions: 23 },
  ],
  monthly: [
    { month: 'Sep', spend: 2400, revenue: 10800 },
    { month: 'Oct', spend: 2900, revenue: 13200 },
    { month: 'Nov', spend: 4100, revenue: 20500 },
    { month: 'Dec', spend: 3200, revenue: 16000 },
    { month: 'Jan', spend: 2800, revenue: 13440 },
    { month: 'Feb', spend: 3300, revenue: 16500 },
    { month: 'Mar', spend: 3640, revenue: 18200 },
  ],
};

// ── Quarterly Revenue Demo ────────────────────────────────────────────────────
export const QUARTERLY_DEMO = {
  quarters: [
    { q: 'Q1 2024', revenue: 84200, fb_spend: 9200, ga_spend: 7100, fb_revenue: 32400, ga_revenue: 36200 },
    { q: 'Q2 2024', revenue: 91600, fb_spend: 10800, ga_spend: 8200, fb_revenue: 38900, ga_revenue: 41200 },
    { q: 'Q3 2024', revenue: 78400, fb_spend: 8600, ga_spend: 6900, fb_revenue: 29800, ga_revenue: 33100 },
    { q: 'Q4 2024', revenue: 118200, fb_spend: 13100, ga_spend: 9800, fb_revenue: 54800, ga_revenue: 52400 },
    { q: 'Q1 2025', revenue: 97800, fb_spend: 11600, ga_spend: 8900, fb_revenue: 43200, ga_revenue: 42800 },
  ],
};

// ── SEO ROI Demo ──────────────────────────────────────────────────────────────
export const SEO_ROI_DEMO = {
  monthly: [
    { month: 'Sep', cost: 1600, organic_revenue: 6200 },
    { month: 'Oct', cost: 1600, organic_revenue: 7400 },
    { month: 'Nov', cost: 1600, organic_revenue: 8900 },
    { month: 'Dec', cost: 1600, organic_revenue: 9800 },
    { month: 'Jan', cost: 1600, organic_revenue: 10200 },
    { month: 'Feb', cost: 1600, organic_revenue: 11400 },
    { month: 'Mar', cost: 1600, organic_revenue: 12800 },
  ],
  total_cost: 11200,
  total_revenue: 66700,
  roi: 495,
};

// ── Overall ROI Demo ──────────────────────────────────────────────────────────
export const OVERALL_DEMO = {
  total_spend: 19260,
  total_revenue: 106380,
  overall_roas: 5.52,
  channels: [
    { name: 'Facebook Ads', spend: 4820, revenue: 21480, roas: 4.46 },
    { name: 'Google Ads', spend: 3640, revenue: 18200, roas: 5.00 },
    { name: 'SEO', spend: 1600, revenue: 12800, roas: 8.00 },
    { name: 'Organic / Direct', spend: 0, revenue: 53900, roas: 0 },
  ],
};
