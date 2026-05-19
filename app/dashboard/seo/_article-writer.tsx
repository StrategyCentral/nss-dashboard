'use client';
import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Article = {
  id: number;
  title: string;
  keyword: string | null;
  page_type: string;
  content_html: string | null;
  content_md: string | null;
  meta_description: string | null;
  source_text: string | null;
  brand_voice_id: number | null;
  serp_data: string | null;
  status: 'draft' | 'generating' | 'ready' | 'published' | 'failed' | string;
  wp_post_id: number | null;
  wp_url: string | null;
  wp_site: string | null;
  word_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
type BrandVoice = {
  id: number;
  name: string;
  voice_tone: string | null;
  style: string | null;
  vocabulary: string | null;
  avoid_phrases: string | null;
  example_text: string | null;
  is_default: number;
};

const PAGE_FORMATS = [
  { key: 'product_comparison', label: 'Product Comparison' },
  { key: 'local_service', label: 'Local Service Page' },
  { key: 'reference_url', label: 'Content with Reference URL' },
  { key: 'listicle', label: 'Listicle' },
  { key: 'guide_recommendations', label: 'Guide with Recommendations' },
];

const STATUS_FILTERS = ['all', 'draft', 'generating', 'ready', 'published', 'failed'];
const TYPE_FILTERS = ['all', 'super_page', 'rewrite', 'blog'];

const SUB_TAB_STYLE = (active: boolean, color = '#ffe600'): React.CSSProperties => ({
  padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
  background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
  border: active ? `1px solid ${color}44` : '1px solid var(--border)',
  color: active ? color : 'var(--muted)', transition: 'all 0.15s',
  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase',
});

const CHIP_STYLE = (active: boolean, color = '#E7258D'): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
  background: active ? `${color}22` : 'transparent',
  border: active ? `1px solid ${color}66` : '1px solid var(--border)',
  color: active ? color : 'var(--muted)', transition: 'all 0.15s',
  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase',
});

function statusBadge(status: string) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    draft:      { bg: 'rgba(136,136,136,0.15)', fg: '#aaa',   bd: 'rgba(136,136,136,0.3)' },
    generating: { bg: 'rgba(4,170,232,0.15)',   fg: '#04AAE8',bd: 'rgba(4,170,232,0.3)' },
    ready:      { bg: 'rgba(168,207,69,0.15)',  fg: '#A8CF45',bd: 'rgba(168,207,69,0.3)' },
    published:  { bg: 'rgba(231,37,141,0.15)',  fg: '#E7258D',bd: 'rgba(231,37,141,0.3)' },
    failed:     { bg: 'rgba(255,107,107,0.15)', fg: '#ff6b6b',bd: 'rgba(255,107,107,0.3)' },
  };
  const c = map[status] || map.draft;
  return (
    <span className="badge" style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{status}</span>
  );
}

// ── Article Preview / Editor Card ─────────────────────────────────────────────
function ArticlePreview({
  article, voices, onSave, onPublish, onClose, onDelete,
}: {
  article: Article;
  voices: BrandVoice[];
  onSave: (patch: Partial<Article>) => Promise<void>;
  onPublish: (id: number, site: 'main' | 'beauty', status: 'draft' | 'publish') => Promise<void>;
  onClose: () => void;
  onDelete?: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [meta, setMeta] = useState(article.meta_description || '');
  const [html, setHtml] = useState(article.content_html || '');
  const [saving, setSaving] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [pubSite, setPubSite] = useState<'main' | 'beauty'>('beauty');
  const [pubStatus, setPubStatus] = useState<'draft' | 'publish'>('draft');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(article.title);
    setMeta(article.meta_description || '');
    setHtml(article.content_html || '');
  }, [article.id, article.updated_at]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ title, meta_description: meta, content_html: html });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true); setPublishError(null);
    try {
      await onPublish(article.id, pubSite, pubStatus);
      setShowPublish(false);
    } catch (e: any) {
      setPublishError(e.message || String(e));
    } finally {
      setPublishing(false);
    }
  }

  const voice = voices.find(v => v.id === article.brand_voice_id);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }} />
          ) : (
            <h2 className="section-title" style={{ fontSize: 22 }}>{article.title}</h2>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
            {statusBadge(article.status)}
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{article.page_type} • {article.word_count} words {article.keyword ? `• kw: ${article.keyword}` : ''}{voice ? ` • voice: ${voice.name}` : ''}</span>
            {article.wp_url && <a href={article.wp_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--blue)' }}>View on WP →</a>}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="form-label">Meta description</div>
        {editing ? (
          <textarea className="form-input" rows={2} value={meta} onChange={e => setMeta(e.target.value)} maxLength={200} />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: meta ? 'normal' : 'italic' }}>{meta || '(none)'}</div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div className="form-label">Content</div>
        {editing ? (
          <textarea className="form-input" rows={20} value={html} onChange={e => setHtml(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        ) : (
          <div
            style={{ background: '#fff', color: '#222', padding: '24px 28px', borderRadius: 8, maxHeight: 600, overflow: 'auto', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: html || '<em>No content</em>' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <button className="btn btn-pink" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setTitle(article.title); setMeta(article.meta_description || ''); setHtml(article.content_html || ''); }}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-pink" onClick={() => setShowPublish(true)} disabled={article.status === 'generating'}>Publish to WP</button>
            <button className="btn btn-ghost" onClick={onClose}>Save & Close</button>
            {onDelete && (
              <button className="btn btn-ghost" style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }} onClick={() => { if (confirm('Delete this article?')) onDelete(article.id); }}>Delete</button>
            )}
          </>
        )}
      </div>

      {showPublish && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }}>
            <h3 className="section-title" style={{ marginBottom: 4 }}>Publish to WordPress</h3>
            <p className="section-sub" style={{ marginBottom: 16 }}>Push this article to your WP site.</p>
            <div style={{ marginBottom: 12 }}>
              <div className="form-label">Site</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={CHIP_STYLE(pubSite === 'beauty', '#E7258D')} onClick={() => setPubSite('beauty')}>NSS Beauty (/beauty/)</button>
                <button style={CHIP_STYLE(pubSite === 'main', '#04AAE8')} onClick={() => setPubSite('main')}>Main Site</button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="form-label">Status</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={CHIP_STYLE(pubStatus === 'draft', '#FFCC2A')} onClick={() => setPubStatus('draft')}>Draft</button>
                <button style={CHIP_STYLE(pubStatus === 'publish', '#A8CF45')} onClick={() => setPubStatus('publish')}>Publish</button>
              </div>
            </div>
            {publishError && <div style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 12 }}>{publishError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-pink" onClick={handlePublish} disabled={publishing}>{publishing ? 'Pushing...' : (pubStatus === 'publish' ? 'Publish now' : 'Save as Draft')}</button>
              <button className="btn btn-ghost" onClick={() => setShowPublish(false)} disabled={publishing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generate Sub-tab ──────────────────────────────────────────────────────────
function GenerateTab({ voices, onArticleReady }: { voices: BrandVoice[]; onArticleReady: (a: Article) => void }) {
  const [mode, setMode] = useState<'super_page' | 'rewrite'>('super_page');
  const [keyword, setKeyword] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [pageFormat, setPageFormat] = useState(PAGE_FORMATS[0].key);
  const [brandVoiceId, setBrandVoiceId] = useState<number | ''>('');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    if (!brandVoiceId && voices.length) {
      const def = voices.find(v => v.is_default) || voices[0];
      if (def) setBrandVoiceId(def.id);
    }
  }, [voices, brandVoiceId]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function pollArticle(id: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/seo/articles/${id}`);
        if (!r.ok) return;
        const data = await r.json();
        const art: Article = data.article;
        if (art.status !== 'generating') {
          clearInterval(pollRef.current); pollRef.current = null;
          setGenerating(false);
          if (art.status === 'failed') {
            setError('Generation failed. Check ANTHROPIC_API_KEY and try again.');
            setStatusText('');
          } else {
            setCurrentArticle(art);
            setStatusText('');
            onArticleReady(art);
          }
        }
      } catch {}
    }, 2000);
  }

  async function handleGenerate() {
    setError(null); setCurrentArticle(null);
    if (!keyword.trim()) { setError('Keyword is required'); return; }
    if (mode === 'rewrite' && !sourceText.trim()) { setError('Source text is required for rewrite'); return; }

    setGenerating(true);
    setStatusText(`Generating with Claude — pulling SERP for "${keyword}"…`);

    try {
      const payload: any = {
        mode, keyword: keyword.trim(),
        brand_voice_id: brandVoiceId || null,
        additional_instructions: instructions || null,
      };
      if (mode === 'super_page') payload.page_format = pageFormat;
      if (mode === 'rewrite') payload.source_text = sourceText;

      const r = await fetch('/api/seo/articles/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok && !data.article_id) {
        setError(data.error || 'Failed to start generation');
        setGenerating(false); setStatusText('');
        return;
      }
      const id = data.article_id;
      // Even if server returned synchronously, fetch & poll briefly to be consistent
      pollArticle(id);
    } catch (e: any) {
      setError(e.message || String(e));
      setGenerating(false); setStatusText('');
    }
  }

  async function saveArticle(patch: Partial<Article>) {
    if (!currentArticle) return;
    const r = await fetch(`/api/seo/articles/${currentArticle.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (r.ok) {
      const d = await r.json();
      setCurrentArticle(d.article);
    }
  }

  async function publishArticle(id: number, site: 'main' | 'beauty', status: 'draft' | 'publish') {
    const r = await fetch(`/api/seo/articles/${id}/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site, status }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Publish failed');
    // refresh article
    const r2 = await fetch(`/api/seo/articles/${id}`);
    if (r2.ok) { const d = await r2.json(); setCurrentArticle(d.article); }
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={CHIP_STYLE(mode === 'super_page', '#E7258D')} onClick={() => setMode('super_page')}>★ Super Page</button>
        <button style={CHIP_STYLE(mode === 'rewrite', '#04AAE8')} onClick={() => setMode('rewrite')}>↻ Rewriter Tool</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {mode === 'super_page' ? (
          <>
            <h3 className="section-title" style={{ marginBottom: 4 }}>Super Page</h3>
            <p className="section-sub" style={{ marginBottom: 16 }}>SERP-informed long-form pages built around a target keyword.</p>

            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div>
                <label className="form-label">Target keyword</label>
                <input className="form-input" placeholder="e.g. best salon shampoo bowl" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Page format</label>
                <select className="form-input" value={pageFormat} onChange={e => setPageFormat(e.target.value)}>
                  {PAGE_FORMATS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Brand voice</label>
              <select className="form-input" value={brandVoiceId || ''} onChange={e => setBrandVoiceId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">(none)</option>
                {voices.map(v => <option key={v.id} value={v.id}>{v.name}{v.is_default ? ' • default' : ''}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Additional instructions (optional)</label>
              <textarea className="form-input" rows={3} placeholder="e.g. Focus on Sydney + Melbourne; mention our 24h dispatch" value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <h3 className="section-title" style={{ marginBottom: 4 }}>Rewriter Tool</h3>
            <p className="section-sub" style={{ marginBottom: 16 }}>Paste source text and a target keyword. Claude restructures for SEO while preserving facts.</p>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Main keyword</label>
              <input className="form-input" placeholder="e.g. how to choose a tattoo chair" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Source text <span style={{ color: 'var(--muted)' }}>({sourceText.length}/5000)</span></label>
              <textarea className="form-input" rows={10} maxLength={5000} placeholder="Paste up to 5,000 characters of source content…" value={sourceText} onChange={e => setSourceText(e.target.value.slice(0, 5000))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Brand voice</label>
              <select className="form-input" value={brandVoiceId || ''} onChange={e => setBrandVoiceId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">(none)</option>
                {voices.map(v => <option key={v.id} value={v.id}>{v.name}{v.is_default ? ' • default' : ''}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Additional instructions (optional)</label>
              <textarea className="form-input" rows={3} placeholder="e.g. Keep the original CTAs; aim for ~1,000 words" value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
          </>
        )}

        {error && <div style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-pink" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : (mode === 'super_page' ? 'Generate Super Page' : 'Rewrite')}
          </button>
          {generating && statusText && <span style={{ fontSize: 12, color: 'var(--blue)' }}>{statusText}</span>}
        </div>
      </div>

      {currentArticle && (
        <ArticlePreview
          article={currentArticle}
          voices={voices}
          onSave={saveArticle}
          onPublish={publishArticle}
          onClose={() => { setCurrentArticle(null); setKeyword(''); setSourceText(''); setInstructions(''); }}
        />
      )}
    </div>
  );
}

// ── Docs Sub-tab ──────────────────────────────────────────────────────────────
function DocsTab({ voices }: { voices: BrandVoice[] }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Article | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('page_type', typeFilter);
      const r = await fetch(`/api/seo/articles?${params.toString()}`);
      if (r.ok) {
        const d = await r.json();
        setArticles(d.articles || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter, typeFilter]);

  async function openOne(id: number) {
    const r = await fetch(`/api/seo/articles/${id}`);
    if (r.ok) { const d = await r.json(); setSelected(d.article); }
  }

  async function saveSelected(patch: Partial<Article>) {
    if (!selected) return;
    const r = await fetch(`/api/seo/articles/${selected.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (r.ok) {
      const d = await r.json();
      setSelected(d.article);
      load();
    }
  }

  async function deleteOne(id: number) {
    const r = await fetch(`/api/seo/articles/${id}`, { method: 'DELETE' });
    if (r.ok) { setSelected(null); load(); }
  }

  async function publishOne(id: number, site: 'main' | 'beauty', status: 'draft' | 'publish') {
    const r = await fetch(`/api/seo/articles/${id}/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site, status }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Publish failed');
    const r2 = await fetch(`/api/seo/articles/${id}`);
    if (r2.ok) { const d = await r2.json(); setSelected(d.article); load(); }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="section-title">Saved Articles</h3>
            <p className="section-sub">{articles.length} document{articles.length === 1 ? '' : 's'}</p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Status:</span>
          {STATUS_FILTERS.map(s => <button key={s} style={CHIP_STYLE(statusFilter === s, '#A8CF45')} onClick={() => setStatusFilter(s)}>{s}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Type:</span>
          {TYPE_FILTERS.map(t => <button key={t} style={CHIP_STYLE(typeFilter === t, '#04AAE8')} onClick={() => setTypeFilter(t)}>{t}</button>)}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Keyword</th><th>Type</th><th>Status</th><th>Words</th><th>Updated</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>{loading ? 'Loading…' : 'No articles yet. Use the Generate tab to create one.'}</td></tr>
              )}
              {articles.map(a => (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => openOne(a.id)}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td style={{ color: 'var(--muted)' }}>{a.keyword || '—'}</td>
                  <td><span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.page_type}</span></td>
                  <td>{statusBadge(a.status)}</td>
                  <td>{a.word_count}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{a.updated_at?.replace('T', ' ').slice(0, 16)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => openOne(a.id)}>View</button>
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ff6b6b' }} onClick={async () => { if (confirm(`Delete "${a.title}"?`)) await deleteOne(a.id); }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ArticlePreview
          article={selected}
          voices={voices}
          onSave={saveSelected}
          onPublish={publishOne}
          onClose={() => setSelected(null)}
          onDelete={deleteOne}
        />
      )}
    </div>
  );
}

// ── Brand Voices Sub-tab ──────────────────────────────────────────────────────
function BrandVoicesTab({ voices, reload }: { voices: BrandVoice[]; reload: () => void }) {
  const [editing, setEditing] = useState<BrandVoice | null>(null);
  const [creating, setCreating] = useState(false);

  function blank(): BrandVoice {
    return { id: 0, name: '', voice_tone: '', style: '', vocabulary: '', avoid_phrases: '', example_text: '', is_default: 0 };
  }

  async function setDefault(id: number) {
    await fetch(`/api/seo/brand-voices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_default: 1 }) });
    reload();
  }
  async function remove(id: number) {
    await fetch(`/api/seo/brand-voices/${id}`, { method: 'DELETE' });
    reload();
  }

  function parseList(v: string | null): string {
    if (!v) return '';
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr.join(', '); } catch {}
    return v;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 className="section-title">Brand Voices</h3>
          <p className="section-sub">Saved voices Claude follows when generating articles.</p>
        </div>
        <button className="btn btn-pink" onClick={() => { setEditing(blank()); setCreating(true); }}>+ New Voice</button>
      </div>

      <div className="grid-2">
        {voices.map(v => (
          <div key={v.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h4 className="section-title" style={{ fontSize: 18 }}>{v.name}</h4>
              {v.is_default ? <span className="badge badge-live">Default</span> : null}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Tone:</strong> {v.voice_tone || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}><strong style={{ color: 'var(--text)' }}>Style:</strong> {v.style || '—'}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => { setEditing(v); setCreating(false); }}>Edit</button>
              {!v.is_default && <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setDefault(v.id)}>Set Default</button>}
              <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11, color: '#ff6b6b' }} onClick={async () => { if (confirm(`Delete voice "${v.name}"?`)) await remove(v.id); }}>Delete</button>
            </div>
          </div>
        ))}
        {voices.length === 0 && <p style={{ color: 'var(--muted)' }}>No voices yet.</p>}
      </div>

      {editing && (
        <BrandVoiceForm
          initial={editing}
          isNew={creating}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); reload(); }}
        />
      )}
    </div>
  );
}

function BrandVoiceForm({ initial, isNew, onClose, onSaved }: { initial: BrandVoice; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial.name);
  const [voiceTone, setVoiceTone] = useState(initial.voice_tone || '');
  const [style, setStyle] = useState(initial.style || '');
  const [vocabulary, setVocabulary] = useState(parseListInit(initial.vocabulary));
  const [avoid, setAvoid] = useState(parseListInit(initial.avoid_phrases));
  const [example, setExample] = useState(initial.example_text || '');
  const [isDefault, setIsDefault] = useState(!!initial.is_default);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseListInit(v: string | null): string {
    if (!v) return '';
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr.join(', '); } catch {}
    return v as string;
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name required'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        name, voice_tone: voiceTone, style,
        vocabulary, avoid_phrases: avoid, example_text: example,
        is_default: isDefault,
      };
      const url = isNew ? '/api/seo/brand-voices' : `/api/seo/brand-voices/${initial.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Save failed'); return; }
      onSaved();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 className="section-title" style={{ marginBottom: 4 }}>{isNew ? 'New Brand Voice' : 'Edit Brand Voice'}</h3>
        <p className="section-sub" style={{ marginBottom: 16 }}>Define how Claude should sound when writing for you.</p>

        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NSS Friendly Pro" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Voice Tone</label>
          <textarea className="form-input" rows={3} value={voiceTone} onChange={e => setVoiceTone(e.target.value)} placeholder="e.g. Raw, brutally honest, no fluff. Talks to busy salon owners as a peer who's been there." />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Style</label>
          <input className="form-input" value={style} onChange={e => setStyle(e.target.value)} placeholder="e.g. Conversational, scannable, lots of bullet points" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Preferred vocabulary (comma-separated)</label>
          <input className="form-input" value={vocabulary} onChange={e => setVocabulary(e.target.value)} placeholder="salon-grade, professional, dispatch" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Avoid phrases (comma-separated)</label>
          <input className="form-input" value={avoid} onChange={e => setAvoid(e.target.value)} placeholder="game-changer, in today's fast-paced world" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Example text</label>
          <textarea className="form-input" rows={4} value={example} onChange={e => setExample(e.target.value)} placeholder="Paste a paragraph that exemplifies this voice…" />
        </div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="bv-default" type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
          <label htmlFor="bv-default" style={{ fontSize: 12, color: 'var(--muted)' }}>Set as default voice</label>
        </div>

        {error && <div style={{ background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-pink" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArticleWriterTab() {
  const [subTab, setSubTab] = useState<'generate' | 'docs' | 'voices'>('generate');
  const [voices, setVoices] = useState<BrandVoice[]>([]);

  async function loadVoices() {
    try {
      const r = await fetch('/api/seo/brand-voices');
      if (r.ok) { const d = await r.json(); setVoices(d.voices || []); }
    } catch {}
  }
  useEffect(() => { loadVoices(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={SUB_TAB_STYLE(subTab === 'generate', '#E7258D')} onClick={() => setSubTab('generate')}>✎ Generate</button>
        <button style={SUB_TAB_STYLE(subTab === 'docs', '#A8CF45')} onClick={() => setSubTab('docs')}>📁 Docs</button>
        <button style={SUB_TAB_STYLE(subTab === 'voices', '#04AAE8')} onClick={() => setSubTab('voices')}>♪ Brand Voices</button>
      </div>

      {subTab === 'generate' && <GenerateTab voices={voices} onArticleReady={() => {}} />}
      {subTab === 'docs' && <DocsTab voices={voices} />}
      {subTab === 'voices' && <BrandVoicesTab voices={voices} reload={loadVoices} />}
    </div>
  );
}
