'use client';
import { useEffect, useState, useCallback } from 'react';

const DEFAULT_MARGIN = 40;

function MarginBadge({ pct }: { pct: number }) {
  const color = pct >= 45 ? '#a8cf45' : pct >= 35 ? '#ffe600' : pct >= 25 ? '#ff8c42' : '#ff5050';
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 10, border: `1px solid ${color}33` }}>{pct}%</span>;
}

function ProductRow({ product, onSave, onReset }: any) {
  const [editing, setEditing] = useState(false);
  const [margin, setMargin] = useState(product.margin_pct ?? DEFAULT_MARGIN);
  const [saleMargin, setSaleMargin] = useState(product.sale_margin_pct ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(product.id, { margin_pct: parseFloat(margin), sale_margin_pct: saleMargin !== '' ? parseFloat(saleMargin) : null });
    setSaving(false);
    setEditing(false);
  }

  const activeMargin = product.on_sale && product.sale_margin_pct != null ? product.sale_margin_pct : product.margin_pct;

  return (
    <tr style={{ background: product.customised ? 'rgba(255,230,0,0.03)' : 'transparent' }}>
      <td>
        <div style={{ fontWeight: 500, fontSize: 13, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{product.sku}</div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
        {product.categories.map((c: any) => c.name).join(', ')}
      </td>
      <td style={{ fontWeight: 600 }}>${product.regular_price}</td>
      <td>
        {product.on_sale && product.sale_price > 0
          ? <span style={{ color: '#ff5050', fontWeight: 600 }}>${product.sale_price} <span style={{ fontSize: 10, textDecoration: 'line-through', color: 'var(--muted)' }}>${product.regular_price}</span></span>
          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
      </td>
      <td>
        {editing ? (
          <input type="number" value={margin} min={0} max={100} step={1}
            onChange={e => setMargin(e.target.value)}
            style={{ width: 60, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }} />
        ) : <MarginBadge pct={product.margin_pct} />}
      </td>
      <td>
        {editing ? (
          <input type="number" value={saleMargin} min={0} max={100} step={1} placeholder="—"
            onChange={e => setSaleMargin(e.target.value)}
            style={{ width: 60, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '3px 8px', fontSize: 12 }} />
        ) : product.sale_margin_pct != null ? <MarginBadge pct={product.sale_margin_pct} /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
      </td>
      <td style={{ fontWeight: 700, color: 'var(--yellow)' }}>${product.profit_per_unit}</td>
      <td>
        {editing ? (
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={save} disabled={saving} className="btn btn-pink" style={{ fontSize: 11, padding: '3px 10px' }}>{saving ? '…' : '✓'}</button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 10px' }}>Edit</button>
            {product.customised && (
              <button onClick={() => onReset(product.id)} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px', color: 'var(--muted)' }} title="Reset to default">↺</button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function MarginsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [defaultMargin, setDefaultMargin] = useState(DEFAULT_MARGIN);
  const [editDefault, setEditDefault] = useState(false);
  const [newDefault, setNewDefault] = useState(DEFAULT_MARGIN);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkMargin, setBulkMargin] = useState('40');
  const [bulkSaleMargin, setBulkSaleMargin] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  async function loadProducts(p = page, s = search) {
    setLoading(true);
    try {
      let url = `/api/woo/products?page=${p}&per_page=20`;
      if (s) url += `&search=${encodeURIComponent(s)}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setProducts(d.products || []);
      setTotalPages(d.totalPages || 1);
      setTotal(d.total || 0);

      // Extract unique categories
      const cats = new Set<string>();
      (d.products || []).forEach((p: any) => p.categories?.forEach((c: any) => cats.add(c.name)));
      setCategories(prev => Array.from(new Set([...prev, ...Array.from(cats)])).sort());
    } catch {}
    finally { setLoading(false); }
  }

  async function loadDefault() {
    const r = await fetch('/api/margins');
    const d = await r.json();
    setDefaultMargin(d.defaultMargin ?? DEFAULT_MARGIN);
    setNewDefault(d.defaultMargin ?? DEFAULT_MARGIN);
  }

  useEffect(() => { loadDefault(); loadProducts(); }, []);

  async function saveDefault() {
    await fetch('/api/margins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_default', margin: newDefault }) });
    setDefaultMargin(newDefault);
    setEditDefault(false);
  }

  async function saveProduct(id: number, data: any) {
    const product = products.find(p => p.id === id);
    await fetch('/api/margins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_product', product_id: id, product_name: product?.name, sku: product?.sku, regular_price: product?.regular_price, sale_price: product?.sale_price, on_sale: product?.on_sale, category: product?.categories?.map((c: any) => c.name).join(', '), ...data }),
    });
    loadProducts(page, search);
  }

  async function resetProduct(id: number) {
    await fetch('/api/margins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_product', product_id: id }) });
    loadProducts(page, search);
  }

  async function bulkUpdate() {
    if (!bulkCategory) return;
    setSaving(true);
    await fetch('/api/margins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_category', category_name: bulkCategory, margin_pct: parseFloat(bulkMargin), sale_margin_pct: bulkSaleMargin ? parseFloat(bulkSaleMargin) : undefined }),
    });
    setSaving(false);
    setShowBulk(false);
    loadProducts(page, search);
  }

  function doSearch() { setPage(1); setSearch(searchInput); loadProducts(1, searchInput); }

  const customisedCount = products.filter(p => p.customised).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ fontSize: 26 }}>Product Margins</h1>
          <p className="section-sub">Set profit margins per product or bulk by category — used across all revenue reporting</p>
        </div>
        <a href="/dashboard/revenue" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>← Revenue Attribution</a>
      </div>

      {/* Default margin + bulk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Global default */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🌐 Global Default Margin</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
            Applied to all products that don&apos;t have a custom margin set. Products on sale use their sale margin if configured, otherwise the regular margin applies.
          </div>
          {editDefault ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={newDefault} min={0} max={100}
                onChange={e => setNewDefault(parseFloat(e.target.value))}
                style={{ width: 70, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', fontSize: 14 }} />
              <span style={{ color: 'var(--muted)' }}>% profit on retail price</span>
              <button onClick={saveDefault} className="btn btn-pink" style={{ fontSize: 12 }}>Save</button>
              <button onClick={() => setEditDefault(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--yellow)', fontFamily: "'Barlow Condensed',sans-serif" }}>{defaultMargin}%</span>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>profit margin on retail price</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>e.g. $100 product → ${(100 * defaultMargin / 100).toFixed(0)} profit</div>
              </div>
              <button onClick={() => setEditDefault(true)} className="btn btn-ghost" style={{ fontSize: 12, marginLeft: 'auto' }}>Edit</button>
            </div>
          )}
        </div>

        {/* Bulk update */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>⚡ Bulk Update by Category</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
            Set a specific margin for all products in a category at once. Overrides the global default for those products.
          </div>
          {showBulk ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                    <option value="">Select category…</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Regular Margin %</label>
                  <input className="form-input" type="number" value={bulkMargin} onChange={e => setBulkMargin(e.target.value)} style={{ width: 80 }} />
                </div>
                <div>
                  <label className="form-label">Sale Margin %</label>
                  <input className="form-input" type="number" value={bulkSaleMargin} placeholder="—" onChange={e => setBulkSaleMargin(e.target.value)} style={{ width: 80 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={bulkUpdate} disabled={!bulkCategory || saving} className="btn btn-pink" style={{ fontSize: 12 }}>{saving ? 'Saving…' : 'Apply to Category'}</button>
                <button onClick={() => setShowBulk(false)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowBulk(true)} className="btn btn-ghost" style={{ fontSize: 12 }}>Set Bulk Margins →</button>
          )}
        </div>
      </div>

      {/* Search + stats bar */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>All Products</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {total.toLocaleString()} products · {customisedCount} with custom margins
              {customisedCount > 0 && <span style={{ color: '#ffe600', marginLeft: 4 }}>★</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder="Search products…" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ width: 200, padding: '6px 12px', fontSize: 12 }} />
            <button onClick={doSearch} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>Search</button>
            {search && <button onClick={() => { setSearch(''); setSearchInput(''); loadProducts(1, ''); }} className="btn btn-ghost" style={{ fontSize: 12 }}>Clear</button>}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#a8cf45', label: '45%+ margin' },
            { color: '#ffe600', label: '35-44%' },
            { color: '#ff8c42', label: '25-34%' },
            { color: '#ff5050', label: '<25%' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              {l.label}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#ffe600', marginLeft: 'auto' }}>★ = custom margin set</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading products from WooCommerce…</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Retail Price</th>
                  <th>Sale Price</th>
                  <th>Regular Margin</th>
                  <th>Sale Margin</th>
                  <th>Profit/Unit</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {products.map(p => (
                    <ProductRow key={p.id} product={p} onSave={saveProduct} onReset={resetProduct} />
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setPage(p => Math.max(1, p - 1)); loadProducts(Math.max(1, page - 1), search); }}
                  disabled={page <= 1} className="btn btn-ghost" style={{ fontSize: 12 }}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
                <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); loadProducts(Math.min(totalPages, page + 1), search); }}
                  disabled={page >= totalPages} className="btn btn-ghost" style={{ fontSize: 12 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12, paddingBottom: 8 }}>
        Margins apply to Revenue Attribution, Overall ROI, and SEO ROI calculations.
        Default 40% = profit on regular retail price (not sale price).
        Sale margin = profit % when product is marked on sale in WooCommerce.
      </div>
    </div>
  );
}
