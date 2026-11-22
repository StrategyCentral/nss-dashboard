import LinkedAppFrame from '../_components/LinkedAppFrame';
import { LINKED_APPS } from '@/lib/linked-apps';

export const dynamic = 'force-dynamic';

export default function Page() {
  const app = LINKED_APPS['tube-stats'];
  let origin = '';
  try { origin = new URL(app.url).origin; } catch {}
  return <LinkedAppFrame slug={app.slug} name={app.name} blurb={app.blurb} accent="#ff4444" origin={origin} />;
}
