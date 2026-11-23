import { SectionTabs } from '../_components/SectionTabs';

// Paid Ads: one sidebar entry, one tab per ad platform across the top of the page.
// The platform pages keep their own URLs (/dashboard/meta-ads etc.); this
// route group only adds the shared tab strip.
const PAID_ADS_TABS = [
  { href: '/dashboard/meta-ads',      icon: 'M', label: 'Meta Ads',      color: '#04aae8' },
  { href: '/dashboard/google-ads',    icon: 'G', label: 'Google Ads',    color: '#a8cf45' },
  { href: '/dashboard/tiktok-ads',    icon: '♪', label: 'TikTok Ads',    color: '#69C9D0' },
  { href: '/dashboard/reddit-ads',    icon: 'R', label: 'Reddit Ads',    color: '#ff8c00' },
  { href: '/dashboard/pinterest-ads', icon: 'P', label: 'Pinterest Ads', color: '#ff1e8e' },
];

export default function PaidAdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionTabs title="Paid Ads" label="Paid ads platforms" tabs={PAID_ADS_TABS} />
      {children}
    </div>
  );
}
