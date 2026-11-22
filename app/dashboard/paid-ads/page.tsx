import { redirect } from 'next/navigation';

// The Paid Ads sidebar entry opens the first platform tab.
export default function PaidAdsPage() {
  redirect('/dashboard/meta-ads');
}
