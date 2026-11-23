import { SectionTabs } from '../_components/SectionTabs';

// Ecommerce: where this website sells its products (merchant centres) and the
// product feeds that fill them. Tabs across the top, like Paid Ads.
const ECOMMERCE_TABS = [
  { href: '/dashboard/ecommerce/merchant', icon: '⛁', label: 'Merchant Centres', color: '#a8cf45' },
  { href: '/dashboard/ecommerce/feeds',    icon: '≡', label: 'Product Feeds',    color: '#04aae8' },
];

export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionTabs title="Ecommerce" label="Ecommerce sections" tabs={ECOMMERCE_TABS} />
      {children}
    </div>
  );
}
