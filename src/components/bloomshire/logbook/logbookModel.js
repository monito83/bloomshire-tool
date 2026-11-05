// src/components/bloomshire/logbook/logbookModel.js
// Leonman's Logbook — modelo puro (sin React ni red): arbol de secciones,
// idioma con respaldo a ingles, busqueda sin tildes, lugares y validaciones.
// Lo usan la pestaña, el servidor (api/logbook.js) y los tests.

export const LOGBOOK_BUCKET = 'logbook';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Rutas dentro del bucket: solo caracteres seguros, sin "..", sin barra inicial.
export const MEDIA_PATH_RE = /^(?!.*\.\.)(?!\/)[A-Za-z0-9][A-Za-z0-9/_.-]{0,240}$/;
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const PLACE_KEY_RE = /^(region|sub|npc|door|clue|custom):[A-Za-z0-9_-]{1,80}$/;

export const BLOCK_TYPES = [
  'text', 'heading', 'image', 'gallery', 'youtube', 'table', 'callout',
  'list', 'divider', 'file', 'place', 'statcards'
];
export const CALLOUT_VARIANTS = ['note', 'tip', 'warning'];

// ---------------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------------

export const baseLang = (lang) => (String(lang || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
const hasList = (v) => Array.isArray(v) && v.some(hasText);

/** Devuelve obj[field_es] si el idioma es es y existe; si no, obj[field_en]. */
export function pickLang(obj, field, lang) {
  if (!obj) return '';
  if (baseLang(lang) === 'es') {
    const es = obj[`${field}_es`];
    if (hasText(es) || hasList(es)) return es;
  }
  const en = obj[`${field}_en`];
  if (hasText(en) || Array.isArray(en)) return en;
  return Array.isArray(obj[`${field}_es`]) ? [] : '';
}

/** true si el idioma pedido es es y algun texto del objeto/bloques no tiene version es. */
export function isMissingTranslation(entry, lang) {
  if (!entry || baseLang(lang) !== 'es') return false;
  if (hasText(entry.title_en) && !hasText(entry.title_es)) return true;
  if (hasText(entry.summary_en) && !hasText(entry.summary_es)) return true;
  for (const b of Array.isArray(entry.blocks) ? entry.blocks : []) {
    for (const k of Object.keys(b || {})) {
      if (!k.endsWith('_en')) continue;
      const base = k.slice(0, -3);
      const en = b[k];
      const es = b[`${base}_es`];
      if ((hasText(en) && !hasText(es)) || (hasList(en) && !hasList(es))) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Texto y busqueda
// ---------------------------------------------------------------------------

/** Minusculas, sin tildes ni signos; colapsa espacios. "Whís-pér" -> "whis per" */
export function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Texto plano de una entrada (todas las lenguas) para la busqueda. */
export function entryPlainText(entry) {
  if (!entry) return '';
  const parts = [entry.title_en, entry.title_es, entry.summary_en, entry.summary_es, ...(entry.tags || [])];
  const walk = (v) => {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (k === 'type' || k === 'path' || k === 'id' || k === 'variant') continue;
        walk(val);
      }
    }
  };
  walk(entry.blocks || []);
  return parts.filter(Boolean).join(' ');
}

/**
 * Busca entradas: todas las palabras deben aparecer (sin tildes, EN+ES).
 * Puntaje: titulo > tags > resumen > cuerpo. Devuelve [{entry, score}] ordenado.
 */
export function searchEntries(entries, query, { limit = 50 } = {}) {
  const words = normalizeText(query).split(' ').filter((w) => w.length > 0);
  if (!words.length) return [];
  const out = [];
  for (const e of entries || []) {
    const title = normalizeText(`${e.title_en || ''} ${e.title_es || ''}`);
    const tags = normalizeText((e.tags || []).join(' '));
    const summary = normalizeText(`${e.summary_en || ''} ${e.summary_es || ''}`);
    const body = e._plain != null ? e._plain : normalizeText(entryPlainText(e));
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (title.includes(w)) score += title.split(' ').some((t) => t.startsWith(w)) ? 12 : 8;
      else if (tags.includes(w)) score += 6;
      else if (summary.includes(w)) score += 4;
      else if (body.includes(w)) score += 1;
      else { ok = false; break; }
    }
    if (ok) out.push({ entry: e, score });
  }
  out.sort((a, b) => b.score - a.score || String(a.entry.title_en).localeCompare(String(b.entry.title_en)));
  return out.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Arbol de secciones
// ---------------------------------------------------------------------------

const bySort = (a, b) =>
  (Number(a.sort) || 0) - (Number(b.sort) || 0) ||
  String(a.title_en || '').localeCompare(String(b.title_en || ''));

/**
 * Arma el arbol: [{...section, children:[], entries:[], path:['slug',...], depth, total}]
 * Ignora ciclos y padres inexistentes (quedan en la raiz).
 */
export function buildTree(sections = [], entries = []) {
  const nodes = new Map();
  for (const s of sections) {
    if (s && s.id) nodes.set(s.id, { ...s, children: [], entries: [], path: [], depth: 0, total: 0 });
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : null;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  for (const e of entries) {
    const n = e && nodes.get(e.section_id);
    if (n) n.entries.push(e);
  }
  const seen = new Set();
  const finalize = (list, parentPath, depth) => {
    list.sort(bySort);
    const kept = [];
    for (const n of list) {
      if (seen.has(n.id)) continue; // proteccion contra ciclos
      seen.add(n.id);
      n.path = [...parentPath, n.slug];
      n.depth = depth;
      n.entries.sort(bySort);
      n.children = finalize(n.children, n.path, depth + 1);
      n.total = n.entries.length + n.children.reduce((acc, c) => acc + c.total, 0);
      kept.push(n);
    }
    return kept;
  };
  return finalize(roots, [], 0);
}

/** Indice plano: secciones por id, entradas por id y por ruta "a/b/entrada". */
export function indexTree(tree) {
  const sectionsById = new Map();
  const entriesById = new Map();
  const byPath = new Map();
  const walk = (nodes, ancestors) => {
    for (const n of nodes) {
      const chain = [...ancestors, n];
      sectionsById.set(n.id, { node: n, ancestors });
      byPath.set(n.path.join('/'), { kind: 'section', id: n.id });
      for (const e of n.entries) {
        entriesById.set(e.id, { entry: e, section: n, ancestors: chain });
        byPath.set([...n.path, e.slug].join('/'), { kind: 'entry', id: e.id });
      }
      walk(n.children, chain);
    }
  };
  walk(tree, []);
  return { sectionsById, entriesById, byPath };
}

export function entryPath(index, entryId) {
  const hit = index && index.entriesById.get(entryId);
  return hit ? [...hit.section.path, hit.entry.slug].join('/') : '';
}

/** Lista plana de entradas en el orden del arbol (para anterior/siguiente). */
export function flattenEntries(tree) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      out.push(...n.entries);
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

// ---------------------------------------------------------------------------
// Enlaces internos (#logbook/ruta)
// ---------------------------------------------------------------------------

export const LOGBOOK_HASH_PREFIX = '#logbook';

export function parseLogbookHash(hash) {
  const h = String(hash || '');
  if (!h.toLowerCase().startsWith(LOGBOOK_HASH_PREFIX)) return null;
  const rest = h.slice(LOGBOOK_HASH_PREFIX.length).replace(/^\/+/, '');
  const segs = rest.split('/').map((s) => {
    try { return decodeURIComponent(s); } catch { return ''; }
  }).filter(Boolean);
  if (!segs.every((s) => SLUG_RE.test(s))) return { path: '' };
  return { path: segs.join('/') };
}

export const buildLogbookHash = (path) => (path ? `${LOGBOOK_HASH_PREFIX}/${path}` : LOGBOOK_HASH_PREFIX);

// ---------------------------------------------------------------------------
// Archivos y videos
// ---------------------------------------------------------------------------

export function isSafeMediaPath(path) {
  return typeof path === 'string' && MEDIA_PATH_RE.test(path);
}

/** URL publica del bucket; null si la ruta no es segura o falta la base. */
export function mediaUrl(mediaBase, path) {
  if (!isSafeMediaPath(path)) return null;
  const base = String(mediaBase || '');
  if (!/^https:\/\/[A-Za-z0-9.-]+\/storage\/v1\/object\/public\/logbook\/?$/.test(base) && !base.startsWith('/')) return null;
  return `${base.replace(/\/+$/, '')}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** Acepta un id de 11 caracteres o una URL de YouTube; devuelve el id o null. */
export function parseYouTubeId(input) {
  const s = String(input || '').trim();
  if (YOUTUBE_ID_RE.test(s)) return s;
  let url;
  try { url = new URL(s); } catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[2];
    }
  }
  return id && YOUTUBE_ID_RE.test(id) ? id : null;
}

/** Segundo de inicio opcional (?t=90 o 1m30s). */
export function parseYouTubeStart(value) {
  if (value == null || value === '') return 0;
  if (Number.isFinite(Number(value))) return Math.max(0, Math.floor(Number(value)));
  const m = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

export function youTubeEmbedUrl(id, start = 0) {
  if (!YOUTUBE_ID_RE.test(String(id || ''))) return null;
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1' });
  if (start > 0) params.set('start', String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export const youTubeThumbUrl = (id) =>
  (YOUTUBE_ID_RE.test(String(id || '')) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

/** Solo http(s), mailto y enlaces internos #logbook. Todo lo demas -> null. */
export function safeHref(href) {
  const s = String(href || '').trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith(LOGBOOK_HASH_PREFIX)) return parseLogbookHash(s) ? s : null;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') return u.href;
  } catch { /* no es URL absoluta */ }
  return null;
}

// ---------------------------------------------------------------------------
// Bloques: normalizacion defensiva antes de mostrar
// ---------------------------------------------------------------------------

const str = (v, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : '');
const strList = (v, max = 200) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max).map((x) => x.slice(0, 2000)) : []);

/** Copia "limpia" de un bloque o null si no es valido. Nunca confia en el contenido. */
export function sanitizeBlock(raw) {
  if (!raw || typeof raw !== 'object' || !BLOCK_TYPES.includes(raw.type)) return null;
  const t = raw.type;
  switch (t) {
    case 'text':
    case 'table':
      return { type: t, md_en: str(raw.md_en), md_es: str(raw.md_es) };
    case 'callout':
      return {
        type: t,
        variant: CALLOUT_VARIANTS.includes(raw.variant) ? raw.variant : 'note',
        title_en: str(raw.title_en, 200), title_es: str(raw.title_es, 200),
        md_en: str(raw.md_en), md_es: str(raw.md_es)
      };
    case 'heading':
      return { type: t, level: raw.level === 3 ? 3 : 2, text_en: str(raw.text_en, 300), text_es: str(raw.text_es, 300) };
    case 'image':
      if (!isSafeMediaPath(raw.path)) return null;
      return {
        type: t, path: raw.path,
        alt_en: str(raw.alt_en, 300), alt_es: str(raw.alt_es, 300),
        caption_en: str(raw.caption_en, 500), caption_es: str(raw.caption_es, 500),
        width: Number.isFinite(raw.width) ? raw.width : null,
        height: Number.isFinite(raw.height) ? raw.height : null
      };
    case 'gallery': {
      const images = (Array.isArray(raw.images) ? raw.images : [])
        .map((img) => sanitizeBlock({ ...(img || {}), type: 'image' }))
        .filter(Boolean)
        .slice(0, 60);
      if (!images.length) return null;
      return { type: t, images, caption_en: str(raw.caption_en, 500), caption_es: str(raw.caption_es, 500) };
    }
    case 'youtube': {
      const id = parseYouTubeId(raw.id || raw.url);
      if (!id) return null;
      return { type: t, id, start: parseYouTubeStart(raw.start), title_en: str(raw.title_en, 200), title_es: str(raw.title_es, 200) };
    }
    case 'list':
      return { type: t, ordered: Boolean(raw.ordered), items_en: strList(raw.items_en), items_es: strList(raw.items_es) };
    case 'divider':
      return { type: t };
    case 'file':
      if (!isSafeMediaPath(raw.path)) return null;
      return {
        type: t, path: raw.path,
        label_en: str(raw.label_en, 200), label_es: str(raw.label_es, 200),
        bytes: Number.isFinite(raw.bytes) ? raw.bytes : null
      };
    case 'place':
      if (!PLACE_KEY_RE.test(String(raw.key || ''))) return null;
      return { type: t, key: raw.key, note_en: str(raw.note_en, 1000), note_es: str(raw.note_es, 1000) };
    case 'statcards': {
      const cards = (Array.isArray(raw.cards) ? raw.cards : []).slice(0, 24).map((c) => ({
        icon: str(c && c.icon, 8),
        value: str(c && c.value, 60),
        label_en: str(c && c.label_en, 120), label_es: str(c && c.label_es, 120),
        hint_en: str(c && c.hint_en, 240), hint_es: str(c && c.hint_es, 240)
      })).filter((c) => c.value || c.label_en);
      if (!cards.length) return null;
      return { type: t, cards };
    }
    default:
      return null;
  }
}

export const sanitizeBlocks = (blocks) =>
  (Array.isArray(blocks) ? blocks : []).slice(0, 400).map(sanitizeBlock).filter(Boolean);

// ---------------------------------------------------------------------------
// Lugares (Mega-Atlas + lugares propios)
// ---------------------------------------------------------------------------

const stripEmoji = (s) => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();

function regionForPoint(atlas, wx, wy) {
  for (const reg of atlas.regions || []) {
    for (const sub of reg.subZones || []) {
      if (sub.isRootBox || !Array.isArray(sub.worldRect)) continue;
      const [x, y, w, h] = sub.worldRect;
      if (wx >= x && wx <= x + w && wy >= y && wy <= y + h) return { regionId: reg.id, subZoneId: sub.id };
    }
  }
  for (const reg of atlas.regions || []) {
    if (!Array.isArray(reg.worldBounds)) continue;
    const [x, y, w, h] = reg.worldBounds;
    if (wx >= x && wx <= x + w && wy >= y && wy <= y + h) return { regionId: reg.id, subZoneId: null };
  }
  return { regionId: null, subZoneId: null };
}

/**
 * Corpus de lugares: [{key, kind, name_en, name_es, icon, regionName_en, target}]
 * target = objeto para locateInMegaAtlas (o null si no hay coordenadas).
 */
export function buildPlaceCorpus(atlas, customPlaces = []) {
  const out = [];
  const regionsById = new Map((atlas?.regions || []).map((r) => [r.id, r]));
  for (const reg of atlas?.regions || []) {
    out.push({
      key: `region:${reg.id}`, kind: 'region', icon: reg.icon || '🗺️',
      name_en: reg.enName || reg.name, name_es: reg.name || reg.enName, regionName_en: '',
      target: { regionId: reg.id, worldRect: reg.worldBounds, label: reg.enName || reg.name }
    });
    for (const sub of reg.subZones || []) {
      if (sub.isRootBox) continue;
      out.push({
        key: `sub:${sub.id}`, kind: 'sub', icon: '📍',
        name_en: sub.nameEn || sub.nameEs, name_es: sub.nameEs || sub.nameEn,
        regionName_en: reg.enName || reg.name, regionName_es: reg.name || reg.enName,
        target: { regionId: reg.id, subZoneId: sub.id, worldRect: sub.worldRect, label: sub.nameEn || sub.nameEs }
      });
    }
  }
  const pointItems = [
    ['npc', atlas?.npcs, '🧑‍🌾'],
    ['door', atlas?.doors, '🚪'],
    ['clue', atlas?.clues, '🔎']
  ];
  for (const [kind, list, icon] of pointItems) {
    for (const p of list || []) {
      const name = stripEmoji(p.name);
      const loc = Number.isFinite(p.wx) ? regionForPoint(atlas, p.wx, p.wy) : { regionId: null };
      const reg = loc.regionId ? regionsById.get(loc.regionId) : null;
      out.push({
        key: `${kind}:${p.id}`, kind, icon,
        name_en: name, name_es: name,
        regionName_en: reg ? (reg.enName || reg.name) : '', regionName_es: reg ? (reg.name || reg.enName) : '',
        target: Number.isFinite(p.wx) ? { ...loc, wx: p.wx, wy: p.wy, label: name } : null
      });
    }
  }
  const atlasByKey = new Map(out.map((p) => [p.key, p]));
  for (const c of customPlaces || []) {
    if (!c || !c.id) continue;
    const linked = c.atlas_ref ? atlasByKey.get(c.atlas_ref) || atlasByKey.get(`sub:${c.atlas_ref}`) || atlasByKey.get(`region:${c.atlas_ref}`) : null;
    out.push({
      key: `custom:${c.id}`, kind: 'custom', icon: '✨',
      name_en: c.name_en, name_es: c.name_es || c.name_en,
      regionName_en: linked ? linked.name_en : '', regionName_es: linked ? linked.name_es : '',
      target: linked ? linked.target : null
    });
  }
  for (const p of out) p._norm = normalizeText(`${p.name_en} ${p.name_es} ${p.regionName_en || ''} ${p.regionName_es || ''}`);
  return out;
}

const KIND_RANK = { region: 0, sub: 1, custom: 2, npc: 3, door: 4, clue: 5 };

/** Autocompletado: prefijo de palabra > contiene; regiones primero. */
export function searchPlaces(corpus, query, { limit = 8 } = {}) {
  const q = normalizeText(query);
  if (!q) return [];
  const results = [];
  for (const p of corpus || []) {
    const names = normalizeText(`${p.name_en} ${p.name_es}`);
    let score = -1;
    if (names.startsWith(q)) score = 100;
    else if (names.split(' ').some((w) => w.startsWith(q))) score = 70;
    else if (names.includes(q)) score = 40;
    else if (p._norm && p._norm.includes(q)) score = 10;
    if (score >= 0) results.push({ p, score: score - (KIND_RANK[p.kind] ?? 9) });
  }
  results.sort((a, b) => b.score - a.score || String(a.p.name_en).localeCompare(String(b.p.name_en)));
  return results.slice(0, limit).map((r) => r.p);
}

export function placeLabel(place, lang) {
  if (!place) return '';
  return baseLang(lang) === 'es' ? (place.name_es || place.name_en) : (place.name_en || place.name_es);
}

/** Entradas que mencionan un lugar (en `places` o en bloques "place"). */
export function entryHasPlace(entry, key) {
  if (!entry || !key) return false;
  if ((entry.places || []).includes(key)) return true;
  return (entry.blocks || []).some((b) => b && b.type === 'place' && b.key === key);
}

// ---------------------------------------------------------------------------
// Edicion (fase 3): slugs y validacion de lo que llega al servidor de admin.
// Se usa en api/logbook-admin.js (autoridad) y en el editor (aviso temprano).
// ---------------------------------------------------------------------------

export const LIMITS = {
  title: 200,
  description: 2000,
  summary: 600,
  icon: 8,
  tags: 20,
  tag: 40,
  places: 40,
  author: 80,
  blocksJsonBytes: 400 * 1024
};

/** "The Gloom Cave — Guía!" -> "the-gloom-cave-guia" */
export function slugify(s, max = 80) {
  return normalizeText(s).replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '');
}

const trimOrNull = (v, max) => {
  if (v == null) return null;
  if (typeof v !== 'string') return undefined; // tipo invalido
  const t = v.trim();
  if (t.length > max) return undefined;
  return t.length ? t : null;
};

const fail = (error, field) => ({ ok: false, error, field });

/** Valida una seccion. Devuelve {ok, value} con solo columnas permitidas. */
export function validateSectionInput(input) {
  if (!input || typeof input !== 'object') return fail('invalid_body');
  const v = {};
  if (input.id != null && !UUID_RE.test(String(input.id))) return fail('invalid_id', 'id');
  if (input.parent_id != null && !UUID_RE.test(String(input.parent_id))) return fail('invalid_parent', 'parent_id');
  v.parent_id = input.parent_id ? String(input.parent_id).toLowerCase() : null;
  const title = trimOrNull(input.title_en, LIMITS.title);
  if (!title) return fail('title_required', 'title_en');
  v.title_en = title;
  const fields = [['title_es', LIMITS.title], ['description_en', LIMITS.description], ['description_es', LIMITS.description], ['icon', LIMITS.icon]];
  for (const [k, max] of fields) {
    const t = trimOrNull(input[k], max);
    if (t === undefined) return fail('invalid_field', k);
    v[k] = t;
  }
  const slug = String(input.slug || '').trim() || slugify(title);
  if (!SLUG_RE.test(slug) || slug.length > 80) return fail('invalid_slug', 'slug');
  v.slug = slug;
  v.status = input.status === 'draft' ? 'draft' : 'published';
  v.sort = Number.isInteger(input.sort) ? Math.max(-100000, Math.min(100000, input.sort)) : 0;
  return { ok: true, value: v };
}

/** Valida una entrada; sanea bloques, etiquetas y lugares. */
export function validateEntryInput(input) {
  if (!input || typeof input !== 'object') return fail('invalid_body');
  const v = {};
  if (input.id != null && !UUID_RE.test(String(input.id))) return fail('invalid_id', 'id');
  if (!UUID_RE.test(String(input.section_id || ''))) return fail('section_required', 'section_id');
  v.section_id = String(input.section_id).toLowerCase();
  const title = trimOrNull(input.title_en, LIMITS.title);
  if (!title) return fail('title_required', 'title_en');
  v.title_en = title;
  const fields = [['title_es', LIMITS.title], ['summary_en', LIMITS.summary], ['summary_es', LIMITS.summary], ['author', LIMITS.author]];
  for (const [k, max] of fields) {
    const t = trimOrNull(input[k], max);
    if (t === undefined) return fail('invalid_field', k);
    v[k] = t;
  }
  const slug = String(input.slug || '').trim() || slugify(title);
  if (!SLUG_RE.test(slug) || slug.length > 80) return fail('invalid_slug', 'slug');
  v.slug = slug;
  if (input.cover_path != null && input.cover_path !== '' && !isSafeMediaPath(input.cover_path)) return fail('invalid_cover', 'cover_path');
  v.cover_path = input.cover_path || null;
  v.status = input.status === 'published' ? 'published' : 'draft';
  v.sort = Number.isInteger(input.sort) ? Math.max(-100000, Math.min(100000, input.sort)) : 0;
  const tags = Array.isArray(input.tags) ? input.tags : [];
  v.tags = [...new Set(tags.filter((t) => typeof t === 'string').map((t) => t.trim().toLowerCase().slice(0, LIMITS.tag)).filter(Boolean))].slice(0, LIMITS.tags);
  const places = Array.isArray(input.places) ? input.places : [];
  if (places.some((p) => !PLACE_KEY_RE.test(String(p)))) return fail('invalid_place', 'places');
  v.places = [...new Set(places)].slice(0, LIMITS.places);
  if (input.blocks != null && !Array.isArray(input.blocks)) return fail('invalid_blocks', 'blocks');
  v.blocks = sanitizeBlocks(input.blocks || []);
  if (JSON.stringify(v.blocks).length > LIMITS.blocksJsonBytes) return fail('too_large', 'blocks');
  return { ok: true, value: v };
}

/** true si mover `id` debajo de `newParentId` crearia un ciclo. */
export function wouldCreateCycle(sections, id, newParentId) {
  if (!id || !newParentId) return false;
  const byId = new Map(sections.map((s) => [s.id, s]));
  let cur = newParentId;
  for (let i = 0; cur && i < 256; i++) {
    if (cur === id) return true;
    cur = byId.get(cur)?.parent_id || null;
  }
  return false;
}
