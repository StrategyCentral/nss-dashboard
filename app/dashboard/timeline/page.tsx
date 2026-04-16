'use client';
import { useEffect, useState, useRef } from 'react';

const PLATFORMS = [
  { key: 'all', label: 'All', color: '#888' },
  { key: 'Meta Ads', label: 'Meta Ads', color: '#1877F2' },
  { key: 'Google Ads', label: 'Google Ads', color: '#4285F4' },
  { key: 'SEO', label: 'SEO', color: '#a8cf45' },
  { key: 'TikTok', label: 'TikTok', color: '#69C9D0' },
  { key: 'Email', label: 'Email', color: '#ffe600' },
  { key: 'Technical', label: 'Technical', color: '#a78bfa' },
  { key: 'General', label: 'General', color: '#888' },
];

const EVENT_TYPES = [
  'campaign_change', 'budget_change', 'seo_work', 'content_published',
  'technical_change', 'link_lost', 'link_gained', 'note', 'general',
];

const TYPE_LABELS: Record<string, string> = {
  campaign_change: 'Campaign Change', budget_change: 'Budget Change',
  seo_work: 'SEO Work', content_published: 'Content Published',
  technical_change: 'Technical Change', link_lost: 'Link Lost',
  link_gained: 'Link Gained', note: 'Note', general: 'General',
};

const TYPE_ICONS: Record<string, string> = {
  campaign_change: '📣', budget_change: '💰', seo_work: '◎',
  content_published: '📝', technical_change: '⚙', link_lost: '🔴',
  link_gained: '✅', note: '💬', general: '●',
};

function getPlatformColor(platform: string) {
  return PLATFORMS.find(p => p.key === platform)?.color || '#888';
}

function groupByDate(events: any[]) {
  const groups: Record<string, any[]> = {};
  for (const ev of events) {
    const d = ev.event_date?.slice(0, 10) || 'Unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(ev);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDate(d: string) {
  try {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function EventCard({ ev, isAdmin, onEdit, onDelete }: any) {
  const color = getPlatformColor(ev.platform);
  const icon = TYPE_ICONS[ev.type] || '●';
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1 }}>{icon}</div>
        <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />
      </div>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: `${color}22`, color }}>{ev.platform}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{TYPE_LABELS[ev.type] || ev.type}</span>
              {ev.source === 'link_monitor' && <span style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', padding: '1px 6px', borderRadius: 3 }}>auto</span>}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: ev.description ? 4 : 0 }}>{ev.title}</div>
            {ev.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{ev.description}</div>}
          </div>
          {isAdmin && ev.source !== 'link_monitor' && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => onEdit(ev)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '2px 5px', opacity: 0.5 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>edit</button>
              <button onClick={() => onDelete(ev.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5050', fontSize: 12, padding: '2px 5px', opacity: 0.5 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>del</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventForm({ initial, onSave, onCancel }: { initial?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [event_date, setDate] = useState(initial?.event_date?.slice(0, 10) || today);
  const [platform, setPlatform] = useState(initial?.platform || 'SEO');
  const [type, setType] = useState(initial?.type || 'general');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');

  function submit() {
    if (!title.trim()) return;
    onSave({ event_date, platform, type, title, description });
  }

  const fieldStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as any };
  const labelStyle = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{initial ? 'Edit Event' : 'Add Timeline Event'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Date *</label>
          <input type="date" value={event_date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Platform *</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={fieldStyle}>
            {PLATFORMS.filter(p => p.key !== 'all').map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={fieldStyle}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()} placeholder="What happened?" style={fieldStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Details (optional)</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="More context..." style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>Cancel</button>
        <button onClick={submit} disabled={!title.trim()} style={{ padding: '7px 18px', background: 'var(--pink)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 12, opacity: title.trim() ? 1 : 0.4 }}>
          {initial ? 'Save Changes' : 'Add Event'}
        </button>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setIsAdmin(d.role === 'admin'); });
    loadEvents();
  }, [filter]);

  async function loadEvents() {
    setLoading(true);
    const q = filter !== 'all' ? `?platform=${encodeURIComponent(filter)}` : '';
    const r = await fetch(`/api/timeline${q}`);
    if (r.ok) { const d = await r.json(); setEvents(d.events || []); }
    setLoading(false);
  }

  async function saveEvent(data: any) {
    if (editEvent) {
      await fetch('/api/timeline', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, id: editEvent.id }) });
    } else {
      await fetch('/api/timeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setShowForm(false);
    setEditEvent(null);
    loadEvents();
  }

  async function deleteEvent(id: number) {
    if (!confirm('Delete this timeline event?')) return;
    await fetch('/api/timeline', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadEvents();
  }

  const filtered = search ? events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.description || '').toLowerCase().includes(search.toLowerCase())) : events;
  const grouped = groupByDate(filtered);
  const totalByPlatform = PLATFORMS.filter(p => p.key !== 'all').map(p => ({ ...p, count: events.filter(e => e.platform === p.key).length })).filter(p => p.count > 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Marketing Timeline</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Track changes across campaigns, SEO work, and backlinks to correlate with ranking shifts</div>
        </div>
        {isAdmin && !showForm && !editEvent && (
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', background: 'var(--pink)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            + Add Event
          </button>
        )}
      </div>

      {(showForm && !editEvent) && <EventForm onSave={saveEvent} onCancel={() => setShowForm(false)} />}
      {editEvent && <EventForm initial={editEvent} onSave={saveEvent} onCancel={() => setEditEvent(null)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {PLATFORMS.map(p => (
            <button key={p.key} onClick={() => setFilter(p.key)} style={{
              padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: filter === p.key ? 700 : 400, cursor: 'pointer',
              background: filter === p.key ? `${p.color}22` : 'rgba(255,255,255,0.05)',
              border: filter === p.key ? `1px solid ${p.color}66` : '1px solid var(--border)',
              color: filter === p.key ? p.color : 'var(--muted)',
            }}>{p.label}{p.key !== 'all' && events.filter(e => e.platform === p.key).length > 0 && ` (${events.filter(e => e.platform === p.key).length})`}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: 'var(--text)', outline: 'none', width: 180 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div>
      ) : grouped.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{search ? 'No matching events' : 'No timeline events yet'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            {search ? 'Try a different search term.' : 'Start recording campaign changes, SEO work, and other marketing actions to build a history you can cross-reference with ranking data.'}
          </div>
          {isAdmin && !search && <button onClick={() => setShowForm(true)} style={{ padding: '8px 20px', background: 'var(--pink)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13 }}>+ Add First Event</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            {grouped.map(([date, evs]) => (
              <div key={date} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: "\"Barlow Condensed\",sans-serif", letterSpacing: '0.05em' }}>{formatDate(date)}</span>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>
                {evs.map(ev => (
                  <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={(e: any) => { setEditEvent(e); setShowForm(false); }} onDelete={deleteEvent} />
                ))}
              </div>
            ))}
          </div>

          {totalByPlatform.length > 0 && (
            <div style={{ width: 180, flexShrink: 0 }}>
              <div className="card" style={{ padding: '12px 14px', position: 'sticky', top: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.05em' }}>BY PLATFORM</div>
                {totalByPlatform.map(p => (
                  <div key={p.key} onClick={() => setFilter(p.key)} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.count}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pink)' }}>{events.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
