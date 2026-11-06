/**
 * api/logbook.js — Bitacora y guias (lectura publica, sin wallet)
 *
 *   GET /api/logbook?action=index              -> secciones + entradas (sin bloques) + lugares propios
 *   GET /api/logbook?action=entry&id=<uuid>     -> una entrada completa (con bloques saneados)
 *   GET /api/logbook?action=search&q=<texto>    -> busqueda en titulos, resumen, etiquetas y cuerpo
 *
 * Solo devuelve contenido publicado (y cuyas secciones ancestro esten publicadas).
 * Usa la clave de servicio de Supabase por REST (sin SDK), igual que api/bloomshire-advisor.js.
 * Las escrituras viven en api/logbook-admin.js (fase 3).
 */

import {
  UUID_RE,
  sanitizeBlocks,
  searchEntries,
  entryPlainText,
  normalizeText
} from '../src/components/bloomshire/logbook/logbookModel.js';

const DEFAULT_SUPABASE_URL = 'https://vbefuztmqqymlotdhjvh.supabase.co';
const CACHE_OK = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

const SECTION_FIELDS = 'id,parent_id,slug,title_en,title_es,description_en,description_es,icon,sort,status';
const ENTRY_META_FIELDS = 'id,section_id,slug,title_en,title_es,summary_en,summary_es,tags,places,cover_path,sort,author,published_at,updated_at';
const PLACE_FIELDS = 'id,name_en,name_es,kind,atlas_ref';

function getConfig() {
  const url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  return { url, key, mediaBase: `${url}/storage/v1/object/public/logbook` };
}

// Limite en memoria por IP (por instancia serverless; suficiente contra abusos simples)
const rate = new Map();
export function isRateLimited(ip, limit = 90, windowMs = 60000, now = Date.now()) {
  const rec = rate.get(ip);
  if (!rec || now > rec.resetAt) {
    rate.set(ip, { count: 1, resetAt: now + windowMs });
    if (rate.size > 5000) {
      for (const [k, v] of rate) if (now > v.resetAt) rate.delete(k);
    }
    return false;
  }
  rec.count += 1;
  return rec.count > limit;
}

const clientIp = (req) =>
  String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

async function rest(cfg, pathAndQuery) {
  const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const err = new Error(`supabase_${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Ids de secciones visibles: publicadas y con toda su cadena de padres publicada. */
export function visibleSectionIds(sections) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const memo = new Map();
  const isVisible = (id, depth = 0) => {
    if (memo.has(id)) return memo.get(id);
    const s = byId.get(id);
    let ok = Boolean(s) && s.status === 'published' && depth < 64;
    if (ok && s.parent_id) ok = isVisible(s.parent_id, depth + 1);
    memo.set(id, ok);
    return ok;
  };
  return new Set(sections.filter((s) => isVisible(s.id)).map((s) => s.id));
}

const publicSection = ({ status, ...rest }) => rest;

async function loadVisibleSections(cfg) {
  const sections = await rest(cfg, `logbook_sections?select=${SECTION_FIELDS}&order=sort.asc&limit=1000`);
  const visible = visibleSectionIds(sections);
  return { sections: sections.filter((s) => visible.has(s.id)).map(publicSection), visible };
}

async function actionIndex(cfg) {
  const [{ sections, visible }, entries, places] = await Promise.all([
    loadVisibleSections(cfg),
    rest(cfg, `logbook_entries?select=${ENTRY_META_FIELDS}&status=eq.published&order=sort.asc&limit=2000`),
    rest(cfg, `logbook_places?select=${PLACE_FIELDS}&order=name_en.asc&limit=2000`)
  ]);
  return {
    ok: true,
    sections,
    entries: entries.filter((e) => visible.has(e.section_id)),
    places,
    mediaBase: cfg.mediaBase,
    generatedAt: new Date().toISOString()
  };
}

async function actionEntry(cfg, id) {
  const [{ visible }, rows] = await Promise.all([
    loadVisibleSections(cfg),
    rest(cfg, `logbook_entries?select=${ENTRY_META_FIELDS},blocks&id=eq.${id}&status=eq.published&limit=1`)
  ]);
  const entry = rows[0];
  if (!entry || !visible.has(entry.section_id)) return null;
  return { ok: true, entry: { ...entry, blocks: sanitizeBlocks(entry.blocks) }, mediaBase: cfg.mediaBase };
}

/** Fragmento de ~160 caracteres alrededor de la primera palabra encontrada. */
export function makeSnippet(text, query, size = 160) {
  const plain = String(text || '').replace(/[#*_`>|[\]()~]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (!plain || !words.length) return '';
  // version sin tildes con la misma longitud que el original
  const folded = Array.from(plain).map((c) => (c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || ' ')).join('');
  const chars = Array.from(plain);
  let pos = -1;
  for (const w of words) {
    pos = folded.indexOf(w);
    if (pos >= 0) break;
  }
  if (pos < 0) return '';
  const start = Math.max(0, pos - Math.floor(size / 3));
  const end = Math.min(chars.length, start + size);
  return `${start > 0 ? '… ' : ''}${chars.slice(start, end).join('').trim()}${end < chars.length ? ' …' : ''}`;
}

async function actionSearch(cfg, q) {
  const [{ visible }, rows] = await Promise.all([
    loadVisibleSections(cfg),
    rest(cfg, `logbook_entries?select=${ENTRY_META_FIELDS},blocks&status=eq.published&limit=2000`)
  ]);
  const pool = rows.filter((e) => visible.has(e.section_id)).map((e) => {
    const blocks = sanitizeBlocks(e.blocks);
    const plain = entryPlainText({ ...e, blocks });
    return { ...e, blocks, _raw: plain, _plain: normalizeText(plain) };
  });
  const results = searchEntries(pool, q, { limit: 40 }).map(({ entry, score }) => {
    const { blocks, _raw, _plain, ...meta } = entry;
    return { ...meta, score, snippet: makeSnippet(_raw, q) };
  });
  return { ok: true, q, results };
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (isRateLimited(clientIp(req))) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  const cfg = getConfig();
  if (!cfg.key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  const action = String(req.query?.action || 'index');
  try {
    if (action === 'index') {
      const data = await actionIndex(cfg);
      res.setHeader('Cache-Control', CACHE_OK);
      return res.status(200).json(data);
    }

    if (action === 'entry') {
      const id = String(req.query?.id || '');
      if (!UUID_RE.test(id)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).json({ ok: false, error: 'invalid_id' });
      }
      const data = await actionEntry(cfg, id.toLowerCase());
      if (!data) {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
        return res.status(404).json({ ok: false, error: 'not_found' });
      }
      res.setHeader('Cache-Control', CACHE_OK);
      return res.status(200).json(data);
    }

    if (action === 'search') {
      const q = String(req.query?.q || '').trim();
      if (q.length < 2 || q.length > 80) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(400).json({ ok: false, error: 'invalid_query' });
      }
      const data = await actionSearch(cfg, q);
      res.setHeader('Cache-Control', CACHE_OK);
      return res.status(200).json(data);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ ok: false, error: 'invalid_action' });
  } catch (err) {
    console.error('[logbook] error:', err && err.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ ok: false, error: 'upstream_error' });
  }
}
