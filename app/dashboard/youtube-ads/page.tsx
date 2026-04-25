'use client';
import { useState } from 'react';

const TAB_STYLE = (active: boolean, color: string) => ({
  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : 'var(--muted)',
  borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
  transition: 'all 0.15s',
});

const CHECKLIST_SECTIONS = [
  {
    title: 'Campaign Setup', icon: '⚙️', color: '#04aae8',
    items: [
      { id: 'c1', text: 'Choose the right campaign objective (Sales, Leads, Website traffic, Brand awareness)' },
      { id: 'c2', text: 'Set campaign subtype to Video — select correct format (Skippable in-stream, Non-skippable, Bumper, In-feed)' },
      { id: 'c3', text: 'Set a realistic daily budget and bid strategy (Target CPV, Target CPM, or Maximize Conversions)' },
      { id: 'c4', text: 'Define campaign dates — start and end date if running a promotion' },
      { id: 'c5', text: 'Enable conversion tracking before launching (confirm tags fire correctly)' },
      { id: 'c6', text: 'Link Google Ads to GA4 for full-funnel visibility' },
    ],
  },
  {
    title: 'Audience Targeting', icon: '🎯', color: '#ff1e8e',
    items: [
      { id: 'a1', text: 'Define core audience persona: age, gender, household income, parental status' },
      { id: 'a2', text: 'Add in-market audiences relevant to your product/service' },
      { id: 'a3', text: 'Layer affinity audiences for broader reach' },
      { id: 'a4', text: 'Create Customer Match audience from your email list' },
      { id: 'a5', text: 'Build remarketing audiences: website visitors, YouTube viewers, app users' },
      { id: 'a6', text: 'Use Similar Audiences (based on your best converters)' },
      { id: 'a7', text: 'Exclude existing customers if running acquisition campaigns' },
      { id: 'a8', text: 'Set audience bid adjustments for high-value segments' },
    ],
  },
  {
    title: 'Ad Creative', icon: '🎬', color: '#a8cf45',
    items: [
      { id: 'cr1', text: 'Hook within first 3 seconds — grab attention before the skip button appears' },
      { id: 'cr2', text: 'State the value proposition clearly in the first 5 seconds' },
      { id: 'cr3', text: 'Include a strong, specific CTA verbally AND on screen' },
      { id: 'cr4', text: 'Match the landing page message to the ad message exactly' },
      { id: 'cr5', text: 'Test at least 3 creative variants per ad group (different hooks or offers)' },
      { id: 'cr6', text: 'Add captions/subtitles — 85% of YouTube is watched without sound' },
      { id: 'cr7', text: 'Upload companion banner (300x60px) to appear alongside ad on desktop' },
      { id: 'cr8', text: 'Check preview on mobile — most YouTube views are mobile' },
    ],
  },
  {
    title: 'Placement & Brand Safety', icon: '🛡️', color: '#ffe600',
    items: [
      { id: 'p1', text: 'Exclude irrelevant placement categories (games, kids content, etc.)' },
      { id: 'p2', text: 'Add a placement exclusion list for known low-quality channels/videos' },
      { id: 'p3', text: 'Set content exclusions: Sensitive social issues, Tragedy & conflict, Profanity' },
      { id: 'p4', text: 'Exclude kids/family content placements if not relevant to audience' },
      { id: 'p5', text: 'Whitelist specific high-performing YouTube channels (narrow targeting)' },
      { id: 'p6', text: 'Set digital content label exclusions (DL-MA, DL-T) for brand safety' },
    ],
  },
  {
    title: 'Tracking & Measurement', icon: '📊', color: '#f97316',
    items: [
      { id: 't1', text: 'Confirm conversion actions fire correctly — use Google Tag Assistant to test' },
      { id: 't2', text: 'Set view-through conversion window (7 days max for YouTube)' },
      { id: 't3', text: 'Add UTM params to all destination URLs: utm_source=youtube&utm_medium=cpc&utm_campaign={{campaign.name}}' },
      { id: 't4', text: 'Enable auto-tagging in Google Ads account settings' },
      { id: 't5', text: 'Confirm GA4 captures YouTube sessions with correct source/medium' },
      { id: 't6', text: 'Set up custom GA4 report for YouTube traffic → conversions' },
      { id: 't7', text: 'Track view rate, earned views, and brand lift separately from direct conversions' },
    ],
  },
  {
    title: 'Optimisation & Scaling', icon: '🚀', color: '#a78bfa',
    items: [
      { id: 'o1', text: 'Review performance at ad group level before making campaign-level changes' },
      { id: 'o2', text: 'Pause ads with view rate below 20% after 1,000+ impressions' },
      { id: 'o3', text: 'Check placement report weekly — exclude low-performing placements' },
      { id: 'o4', text: 'Analyse audience insights — identify and exclude low-conversion segments' },
      { id: 'o5', text: 'Test different video lengths: 6s bumper, 15s, 30s, 60s, 2min+' },
      { id: 'o6', text: 'Scale budgets by 20-30% at a time to avoid resetting the learning phase' },
      { id: 'o7', text: 'A/B test landing pages specifically for YouTube traffic' },
      { id: 'o8', text: 'Set frequency caps — aim for 3-5 impressions per user per week maximum' },
    ],
  },
  {
    title: 'NSS-Specific Actions', icon: '💅', color: '#ff1e8e',
    items: [
      { id: 'n1', text: 'Create beauty professional targeted ad group (salon owners, hairdressers, beauty therapists)' },
      { id: 'n2', text: 'Build product demonstration videos for hero SKUs (shampoos, colour, styling)' },
      { id: 'n3', text: 'Run 6-second bumper ads as retargeting for website visitors who did not purchase' },
      { id: 'n4', text: 'Add UTM params to all NSS YouTube ads matching the attribution dashboard format' },
      { id: 'n5', text: 'Target competitor brand keywords as placements (e.g. Wella, Schwarzkopf tutorials)' },
      { id: 'n6', text: 'Upload customer email list to Customer Match for loyalty and upsell campaigns' },
    ],
  },
];

function CheckItem({ item, checked, onToggle, color }: { item: { id: string; text: string }; checked: boolean; onToggle: () => void; color: string }) {
  return (
    <div onClick={onToggle} style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px',
      borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
      background: checked ? `${color}0a` : 'transparent',
      borderLeft: checked ? `3px solid ${color}` : '3px solid transparent',
      marginBottom: 4,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? color : 'var(--border)'}`,
        background: checked ? color : 'transparent', flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        {checked && <span style={{ color: '#000', fontSize: 11, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{
        fontSize: 13, lineHeight: 1.5,
        color: checked ? 'var(--muted)' : 'var(--text)',
        textDecoration: checked ? 'line-through' : 'none',
        transition: 'all 0.15s',
      }}>
        {item.text}
      </span>
    </div>
  );
}

export default function YouTubeAdsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [notes, setNotes] = useState('');

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const totalItems = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((doneCount / totalItems) * 100);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>YouTube Ads</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Campaign checklist & optimisation guide — Ed Leake framework
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: pct === 100 ? '#a8cf45' : pct >= 50 ? '#ffe600' : '#ff1e8e' }}>{pct}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doneCount} / {totalItems} complete</div>
        </div>
      </div>

      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.4s',
          background: pct === 100 ? '#a8cf45' : 'linear-gradient(90deg, #ff1e8e, #ffe600)',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['all', 'todo', 'done'] as const).map(f => (
          <button key={f} style={TAB_STYLE(filter === f, '#04aae8')} onClick={() => setFilter(f)}>
            {f === 'all' ? '☰ All' : f === 'todo' ? '○ To Do' : '✓ Done'}
          </button>
        ))}
        <button onClick={() => setChecked({})} style={{
          marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
        }}>
          Reset all
        </button>
      </div>

      {CHECKLIST_SECTIONS.map(section => {
        const sectionDone = section.items.filter(i => checked[i.id]).length;
        const visibleItems = section.items.filter(i =>
          filter === 'todo' ? !checked[i.id] : filter === 'done' ? checked[i.id] : true
        );
        if (visibleItems.length === 0) return null;
        return (
          <div key={section.title} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>{section.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: section.color }}>{section.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sectionDone} / {section.items.length} complete</div>
              </div>
              <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.round((sectionDone / section.items.length) * 100)}%`,
                  background: section.color, borderRadius: 2, transition: 'width 0.4s',
                }} />
              </div>
            </div>
            {visibleItems.map(item => (
              <CheckItem key={item.id} item={item} checked={!!checked[item.id]} onToggle={() => toggle(item.id)} color={section.color} />
            ))}
          </div>
        );
      })}

      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📝 Campaign Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about your YouTube Ads campaigns, test results, ideas..."
          style={{
            width: '100%', minHeight: 120, background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
            color: 'var(--text)', fontSize: 13, resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
