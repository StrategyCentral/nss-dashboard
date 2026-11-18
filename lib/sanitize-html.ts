/**
 * Small allow-list HTML sanitizer for previewing article HTML in the browser.
 * Keeps ordinary article markup (headings, paragraphs, lists, links, images,
 * tables, emphasis) and drops everything else: scripts, styles, frames, forms,
 * SVG, event handlers, style attributes and javascript:/data: URLs.
 *
 * Browser only (uses DOMParser). On the server it returns the text with all
 * markup escaped, which is always safe.
 */
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'dd', 'del', 'div', 'dl', 'dt',
  'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd',
  'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'section', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'article', 'header', 'footer',
  'aside', 'nav', 'main', 'details', 'summary', 'time',
]);
// Removed together with their content.
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'noscript',
  'template', 'svg', 'math', 'form', 'input', 'button', 'select', 'textarea', 'option',
  'link', 'meta', 'base', 'title', 'head', 'audio', 'video', 'source', 'track', 'canvas', 'portal',
]);
const ALLOWED_ATTRS: Record<string, string[]> = {
  '*': ['title', 'id', 'class', 'lang', 'dir'],
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan', 'align'],
  th: ['colspan', 'rowspan', 'align', 'scope'],
  ol: ['start', 'type', 'reversed'],
  time: ['datetime'],
  blockquote: ['cite'],
  q: ['cite'],
};
const URL_ATTRS = new Set(['href', 'src', 'cite']);

function safeUrl(value: string): boolean {
  const v = value.replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
  if (!v) return true;
  if (v.startsWith('#') || v.startsWith('/') || v.startsWith('.') || v.startsWith('?')) return true;
  const m = v.match(/^([a-z][a-z0-9+.-]*):/);
  if (!m) return true; // relative path
  return ['http', 'https', 'mailto', 'tel'].includes(m[1]);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clean(node: Node, doc: Document): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === 3) continue; // text
    if (child.nodeType !== 1) { child.parentNode?.removeChild(child); continue; } // comments, PIs
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) { el.parentNode?.removeChild(el); continue; }
    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep the (cleaned) children, drop the element itself.
      clean(el, doc);
      const frag = doc.createDocumentFragment();
      while (el.firstChild) frag.appendChild(el.firstChild);
      el.parentNode?.replaceChild(frag, el);
      continue;
    }
    const allowed = new Set([...(ALLOWED_ATTRS['*'] || []), ...(ALLOWED_ATTRS[tag] || [])]);
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (!allowed.has(name) || (URL_ATTRS.has(name) && !safeUrl(attr.value))) el.removeAttribute(attr.name);
    }
    if (tag === 'a' && el.getAttribute('target')) el.setAttribute('rel', 'noopener noreferrer');
    clean(el, doc);
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return escapeHtml(html);
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html');
  clean(doc.body, doc);
  return doc.body.innerHTML;
}
