import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

function computeWordCount(html: string): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

function extractMeta(content: string): { meta: string; body: string } {
  // Look for <!-- meta: ... --> at the top
  const m = content.match(/<!--\s*meta:\s*([\s\S]*?)-->/i);
  let meta = '';
  let body = content;
  if (m) {
    meta = m[1].trim();
    body = content.replace(m[0], '').trim();
  } else {
    // Try first <p> as fallback
    const p = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (p) meta = p[1].replace(/<[^>]+>/g, '').slice(0, 160);
  }
  return { meta, body };
}

function extractTitle(content: string, fallback: string): string {
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  const h2 = content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2) return h2[1].replace(/<[^>]+>/g, '').trim();
  return fallback;
}

async function fetchSerp(keyword: string): Promise<any[] | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword, gl: 'au', hl: 'en' }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const organic = Array.isArray(data.organic) ? data.organic.slice(0, 10) : [];
    return organic.map((o: any) => ({ title: o.title, link: o.link, snippet: o.snippet }));
  } catch {
    return null;
  }
}

function buildSystemPrompt(brandVoice: any | null): string {
  const voiceLines: string[] = [];
  if (brandVoice) {
    if (brandVoice.voice_tone) voiceLines.push(`Voice tone: ${brandVoice.voice_tone}`);
    if (brandVoice.style) voiceLines.push(`Style: ${brandVoice.style}`);
    try {
      const vocab = brandVoice.vocabulary ? JSON.parse(brandVoice.vocabulary) : null;
      if (Array.isArray(vocab) && vocab.length) voiceLines.push(`Preferred vocabulary: ${vocab.join(', ')}`);
    } catch {}
    try {
      const avoid = brandVoice.avoid_phrases ? JSON.parse(brandVoice.avoid_phrases) : null;
      if (Array.isArray(avoid) && avoid.length) voiceLines.push(`Avoid phrases: ${avoid.join(', ')}`);
    } catch {}
    if (brandVoice.example_text) voiceLines.push(`Example tone snippet:\n${brandVoice.example_text}`);
  }
  const voiceBlock = voiceLines.length ? `\n\nBRAND VOICE:\n${voiceLines.join('\n')}` : '';
  return `You are an expert SEO content writer creating publication-ready articles for a salon/beauty professional supply business based in Australia. Output VALID HTML only — no markdown fences, no preamble.

OUTPUT FORMAT (strict):
1. Begin with: <!-- meta: 150-160 char meta description here -->
2. Then <h1>Title</h1>
3. Then well-structured body with <h2>, <h3>, <p>, <ul>/<ol>/<li>, <strong>, <em>, <a href="...">. Use semantic HTML.
4. Include 3-6 internal-link suggestions as <a href="/suggested-slug">anchor</a> placeholders where they would naturally fit.
5. Australian English spelling. Concrete, helpful, scannable. Avoid fluff and AI-sounding filler.
6. Target 1200-2200 words for super pages; 800-1400 for rewrites.${voiceBlock}`;
}

function buildSuperPagePrompt(args: { keyword: string; pageFormat?: string; additionalInstructions?: string; serp?: any[] | null }): string {
  const formatHint: Record<string, string> = {
    'product_comparison': 'Structure as a product/option comparison with a comparison table and clear pros/cons per item.',
    'local_service': 'Local service landing page — include service description, areas served (Australia), what to expect, pricing guidance, and an FAQ.',
    'reference_url': 'Use the keyword topic as the spine; include a "Quick answer" box near the top, then deeper sections.',
    'listicle': 'Numbered listicle with a strong intro, 7-12 items, mini-summary per item, and a wrap-up.',
    'guide_recommendations': 'Comprehensive guide with recommendations — include "Top picks at a glance" near top, then detailed reviews/sections.',
  };
  const formatLine = args.pageFormat ? (formatHint[args.pageFormat] || '') : '';
  const serpBlock = args.serp && args.serp.length
    ? `\n\nSERP CONTEXT (top results competitors are ranking with — beat them on depth and clarity, do not copy):\n${args.serp.map((s, i) => `${i + 1}. ${s.title}\n   ${s.snippet || ''}`).join('\n')}`
    : '';
  const extra = args.additionalInstructions ? `\n\nADDITIONAL INSTRUCTIONS:\n${args.additionalInstructions}` : '';
  return `Write a Super Page targeting the keyword: "${args.keyword}".
${formatLine}${serpBlock}${extra}

Include a compelling H1, a strong intro (2-3 sentences), well-organised H2/H3 sections, scannable lists where useful, and a closing CTA paragraph that invites the reader to explore relevant products/services.`;
}

function buildRewritePrompt(args: { keyword: string; sourceText: string; additionalInstructions?: string; serp?: any[] | null }): string {
  const serpBlock = args.serp && args.serp.length
    ? `\n\nSERP CONTEXT (so your rewrite competes with what's ranking — improve on these, do not copy):\n${args.serp.map((s, i) => `${i + 1}. ${s.title}\n   ${s.snippet || ''}`).join('\n')}`
    : '';
  const extra = args.additionalInstructions ? `\n\nADDITIONAL INSTRUCTIONS:\n${args.additionalInstructions}` : '';
  return `Rewrite the source text below targeting the main keyword: "${args.keyword}". Preserve facts. Improve structure, clarity, and SEO. Re-organise with strong H2s. Add an intro and conclusion. Insert the keyword naturally (no stuffing).${serpBlock}${extra}

SOURCE TEXT:
${args.sourceText}`;
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<{ content: string; tokensUsed: number }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Claude API ${r.status}: ${txt.slice(0, 500)}`);
  }
  const data = await r.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { content: text, tokensUsed };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { mode, keyword, source_text, page_format, brand_voice_id, additional_instructions } = body || {};
  if (mode !== 'super_page' && mode !== 'rewrite') return NextResponse.json({ error: 'mode must be super_page or rewrite' }, { status: 400 });
  if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  if (mode === 'rewrite' && !source_text) return NextResponse.json({ error: 'source_text required for rewrite' }, { status: 400 });

  const db = getDb();

  // Resolve brand voice
  let brandVoice: any = null;
  if (brand_voice_id) {
    brandVoice = db.prepare('SELECT * FROM brand_voices WHERE id = ?').get(brand_voice_id);
  }
  if (!brandVoice) {
    brandVoice = db.prepare('SELECT * FROM brand_voices WHERE is_default = 1 LIMIT 1').get();
  }

  const placeholderTitle = `${mode === 'super_page' ? 'Super Page' : 'Rewrite'}: ${keyword}`;
  const insArt = db.prepare(`INSERT INTO articles
    (title, keyword, page_type, source_text, brand_voice_id, status, word_count)
    VALUES (?,?,?,?,?, 'generating', 0)`).run(
    placeholderTitle, keyword, mode, source_text || null, brandVoice?.id || null
  );
  const articleId = Number(insArt.lastInsertRowid);

  const insJob = db.prepare(`INSERT INTO generation_jobs
    (article_id, job_type, model, status)
    VALUES (?,?,?, 'running')`).run(articleId, mode, ANTHROPIC_MODEL);
  const jobId = Number(insJob.lastInsertRowid);

  try {
    const serp = await fetchSerp(keyword);
    const systemPrompt = buildSystemPrompt(brandVoice);
    const userPrompt = mode === 'super_page'
      ? buildSuperPagePrompt({ keyword, pageFormat: page_format, additionalInstructions: additional_instructions, serp })
      : buildRewritePrompt({ keyword, sourceText: source_text, additionalInstructions: additional_instructions, serp });

    db.prepare('UPDATE generation_jobs SET prompt = ? WHERE id = ?').run(userPrompt.slice(0, 8000), jobId);

    const { content, tokensUsed } = await callClaude(systemPrompt, userPrompt);
    const { meta, body: htmlBody } = extractMeta(content);
    const title = extractTitle(htmlBody, placeholderTitle.replace(/^Super Page: |^Rewrite: /, ''));
    const wordCount = computeWordCount(htmlBody);

    db.prepare(`UPDATE articles SET
      title = ?, content_html = ?, meta_description = ?, serp_data = ?, status = 'ready', word_count = ?, updated_at = datetime('now')
      WHERE id = ?`).run(title, htmlBody, meta || null, serp ? JSON.stringify(serp) : null, wordCount, articleId);

    db.prepare(`UPDATE generation_jobs SET status = 'completed', tokens_used = ?, completed_at = datetime('now') WHERE id = ?`)
      .run(tokensUsed, jobId);

    return NextResponse.json({ ok: true, article_id: articleId, job_id: jobId });
  } catch (e: any) {
    const msg = (e?.message || String(e)).slice(0, 1000);
    try {
      db.prepare(`UPDATE articles SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(articleId);
      db.prepare(`UPDATE generation_jobs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?`).run(msg, jobId);
    } catch {}
    return NextResponse.json({ ok: false, article_id: articleId, error: msg }, { status: 500 });
  }
}
