import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { SITE_STRUCTURE_NODES, SITE_LINKS } from '@/lib/seo-data';

function initStructureTable(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      url TEXT DEFAULT '',
      type TEXT DEFAULT 'page',
      status TEXT DEFAULT 'planned',
      position INTEGER,
      traffic INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      silo TEXT,
      parent TEXT,
      working_on INTEGER DEFAULT 0,
      keywords TEXT DEFAULT '[]',
      issues TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS seo_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_node TEXT NOT NULL,
      to_node TEXT NOT NULL,
      type TEXT DEFAULT 'internal'
    );
  `);
  const count = (db.prepare('SELECT COUNT(*) as c FROM seo_nodes').get() as any).c;
  if (count === 0) {
    const insertNode = db.prepare('INSERT OR IGNORE INTO seo_nodes (id,label,url,type,status,position,traffic,clicks,silo,parent,working_on) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const n of SITE_STRUCTURE_NODES) {
      insertNode.run(n.id, n.label, n.url, n.type, n.status, n.position, n.traffic, n.clicks, n.silo, n.parent, n.workingOn ? 1 : 0);
    }
    const insertLink = db.prepare('INSERT INTO seo_links (from_node,to_node,type) VALUES (?,?,?)');
    for (const l of SITE_LINKS) {
      insertLink.run(l.from, l.to, l.type);
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    initStructureTable(db);
    const nodes = db.prepare('SELECT * FROM seo_nodes').all();
    const links = db.prepare('SELECT * FROM seo_links').all();
    return NextResponse.json({ nodes, links });
  } catch {
    return NextResponse.json({ nodes: SITE_STRUCTURE_NODES, links: SITE_LINKS });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { action } = body;
  try {
    const db = getDb();
    initStructureTable(db);

    if (action === 'add_node') {
      const { id, label, url, type, silo, parent } = body;
      const nodeId = id || `node-${Date.now()}`;
      db.prepare('INSERT OR REPLACE INTO seo_nodes (id,label,url,type,status,silo,parent) VALUES (?,?,?,?,?,?,?)').run(nodeId, label, url || '', type || 'page', 'planned', silo || null, parent || null);
      if (parent) db.prepare('INSERT INTO seo_links (from_node,to_node,type) VALUES (?,?,?)').run(parent, nodeId, 'internal');
      return NextResponse.json({ ok: true, id: nodeId });
    }

    if (action === 'update_node') {
      const { id, ...updates } = body;
      const fields = Object.entries(updates).filter(([k]) => k !== 'action').map(([k]) => `${k} = ?`).join(', ');
      const values = Object.entries(updates).filter(([k]) => k !== 'action').map(([, v]) => v);
      db.prepare(`UPDATE seo_nodes SET ${fields} WHERE id = ?`).run(...values, id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_working') {
      const { id } = body;
      db.prepare('UPDATE seo_nodes SET working_on = 1 - working_on WHERE id = ?').run(id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete_node') {
      const { id } = body;
      db.prepare('DELETE FROM seo_nodes WHERE id = ?').run(id);
      db.prepare('DELETE FROM seo_links WHERE from_node = ? OR to_node = ?').run(id, id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
