/**
 * api/logbook-admin.js — Leonman's Logbook: administracion (fase 3)
 *
 * POST /api/logbook-admin   body JSON { action, ... }
 *   login            { password }                -> { token, expiresAt }   (sin token)
 *   me                                           -> { ok, expiresAt }
 *   tree                                         -> secciones + entradas (incluye borradores) + lugares
 *   entry_get        { id }                      -> entrada completa (incluye borradores)
 *   section_save     { section }                 -> crea (sin id) o actualiza
 *   section_delete   { id, confirmSlug }         -> borra la seccion, sus subsecciones y entradas
 *   section_reorder  { parent_id, ids[] }        -> sort = posicion en ids
 *   entry_save       { entry }                   -> crea (sin id) o actualiza
 *   entry_delete     { id, confirmSlug }
 *   upload_sign      { mime, bytes, kind }        -> { path, uploadUrl } URL firmada de Supabase Storage
 *   media_register   { path, mime, bytes, width, height, alt_en, alt_es } -> fila en logbook_media
 *
 * Subidas: el navegador reduce y convierte la imagen a WebP y la sube DIRECTO a
 * Supabase con la URL firmada (asi no pasa por el limite de 4,5 MB de Vercel).
 * El servidor elige la ruta (entries/AAAA/MM/<uuid>.<ext>); el bucket limita
 * tipos (webp/png/jpeg/gif/pdf) y tamaño (10 MB).
 *
 * Seguridad:
 *   - Contraseña en LOGBOOK_ADMIN_PASSWORD, comparada en tiempo constante.
 *   - Limite de intentos fallidos por IP (5 cada 15 min) y global por instancia.
 *   - JWT HS256 de 12 h firmado con SESSION_SECRET (jose). Incluye una huella de la
 *     contraseña: si se cambia LOGBOOK_ADMIN_PASSWORD, todas las sesiones caen.
 *   - Solo mismo origen (Origin debe coincidir con el host). Toda escritura exige el JWT.
 *   - Bloques saneados en el servidor (validateEntryInput) antes de guardar.
 */

import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import {
  UUID_RE,
  validateSectionInput,
  validateEntryInput,
  wouldCreateCycle,
  sanitizeBlocks
} from '../src/components/bloomshire/logbook/logbookModel.js';

const DEFAULT_SUPABASE_URL = 'https://vbefuztmqqymlotdhjvh.supabase.co';
const JWT_ISSUER = 'bloomshire-tool';
const JWT_AUDIENCE = 'logbook-admin';
const SESSION_HOURS = 12;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

export const UPLOAD_TYPES = {
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'application/pdf': { ext: 'pdf', kind: 'file' }
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_PATH_RE = /^entries\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(webp|png|jpg|gif|pdf)$/;

const SECTION_FIELDS = 'id,parent_id,slug,title_en,title_es,description_en,description_es,icon,sort,status,created_at,updated_at';
const ENTRY_META_FIELDS = 'id,section_id,slug,title_en,title_es,summary_en,summary_es,tags,places,cover_path,sort,status,author,published_at,created_at,updated_at';

export function getConfig() {
  const url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  const secret = (process.env.SESSION_SECRET || '').trim();
  const password = process.env.LOGBOOK_ADMIN_PASSWORD || '';
  return {
    url,
    key,
    secret: secret.length >= 32 ? secret : '',
    password: password.length >= 8 ? password : '',
    mediaBase: `${url}/storage/v1/object/public/logbook`
  };
}

// ---------------------------------------------------------------------------
// Intentos fallidos (memoria por instancia)
// ---------------------------------------------------------------------------

const failsByIp = new Map();
let globalFails = [];

export function _resetLoginLimits() {
  failsByIp.clear();
  globalFails = [];
}

function recentFails(ip, now) {
  const list = (failsByIp.get(ip) || []).filter((t) => now - t < FAIL_WINDOW_MS);
  failsByIp.set(ip, list);
  globalFails = globalFails.filter((t) => now - t < FAIL_WINDOW_MS);
  return list;
}

function isLoginBlocked(ip, now = Date.now()) {
  return recentFails(ip, now).length >= MAX_FAILS_PER_IP || globalFails.length >= MAX_FAILS_GLOBAL;
}

function registerFail(ip, now = Date.now()) {
  const list = recentFails(ip, now);
  list.push(now);
  failsByIp.set(ip, list);
  globalFails.push(now);
  if (failsByIp.size > 5000) {
    for (const [k, v] of failsByIp) if (!v.some((t) => now - t < FAIL_WINDOW_MS)) failsByIp.delete(k);
  }
}

// ---------------------------------------------------------------------------
// Contraseña y sesion
// ---------------------------------------------------------------------------

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();

/** Comparacion en tiempo constante (hashea ambos lados para igualar longitudes). */
export function safePasswordEquals(given, expected) {
  if (typeof given !== 'string' || !expected) return false;
  return crypto.timingSafeEqual(sha256(given), sha256(expected));
}

const passwordFingerprint = (cfg) =>
  crypto.createHmac('sha256', cfg.secret).update(`logbook-admin:${cfg.password}`).digest('hex').slice(0, 16);

async function issueToken(cfg) {
  const expiresAt = Date.now() + SESSION_HOURS * 3600 * 1000;
  const token = await new SignJWT({ role: 'logbook_admin', pwv: passwordFingerprint(cfg) })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject('logbook-admin')
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(new TextEncoder().encode(cfg.secret));
  return { token, expiresAt };
}

export async function verifyToken(req, cfg) {
  const header = String(req.headers?.authorization || '');
  const m = header.match(/^Bearer\s+([A-Za-z0-9_\-.]+)$/);
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], new TextEncoder().encode(cfg.secret), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256']
    });
    if (payload.role !== 'logbook_admin' || payload.pwv !== passwordFingerprint(cfg)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Supabase REST
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function rest(cfg, method, pathAndQuery, body) {
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    Accept: 'application/json'
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers.Prefer = 'return=representation';
  }
  const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 409) throw new HttpError(409, 'slug_taken');
  if (!res.ok) {
    let code = '';
    try { code = (await res.json())?.code || ''; } catch { /* sin cuerpo */ }
    if (code === '23505') throw new HttpError(409, 'slug_taken');
    if (code === '23503') throw new HttpError(400, 'invalid_reference');
    throw new HttpError(502, 'upstream_error');
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

async function loadSections(cfg) {
  return rest(cfg, 'GET', `logbook_sections?select=${SECTION_FIELDS}&order=sort.asc&limit=1000`);
}

const actions = {
  async me(_cfg, _body, session) {
    return { ok: true, expiresAt: session.exp * 1000 };
  },

  async tree(cfg) {
    const [sections, entries, places] = await Promise.all([
      loadSections(cfg),
      rest(cfg, 'GET', `logbook_entries?select=${ENTRY_META_FIELDS}&order=sort.asc&limit=2000`),
      rest(cfg, 'GET', 'logbook_places?select=id,name_en,name_es,kind,atlas_ref&order=name_en.asc&limit=2000')
    ]);
    return { ok: true, admin: true, sections, entries, places, mediaBase: cfg.mediaBase };
  },

  async entry_get(cfg, body) {
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) throw new HttpError(400, 'invalid_id');
    const rows = await rest(cfg, 'GET', `logbook_entries?select=${ENTRY_META_FIELDS},blocks,source_ref&id=eq.${id.toLowerCase()}&limit=1`);
    if (!rows[0]) throw new HttpError(404, 'not_found');
    return { ok: true, entry: { ...rows[0], blocks: sanitizeBlocks(rows[0].blocks) } };
  },

  async section_save(cfg, body) {
    const check = validateSectionInput(body.section);
    if (!check.ok) throw new HttpError(400, check.error);
    const value = check.value;
    const id = body.section.id ? String(body.section.id).toLowerCase() : null;
    if (value.parent_id) {
      const sections = await loadSections(cfg);
      if (!sections.some((s) => s.id === value.parent_id)) throw new HttpError(400, 'invalid_parent');
      if (id && wouldCreateCycle(sections, id, value.parent_id)) throw new HttpError(400, 'cycle');
    }
    const rows = id
      ? await rest(cfg, 'PATCH', `logbook_sections?id=eq.${id}`, value)
      : await rest(cfg, 'POST', 'logbook_sections', value);
    if (!rows || !rows[0]) throw new HttpError(404, 'not_found');
    return { ok: true, section: rows[0] };
  },

  async section_delete(cfg, body) {
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) throw new HttpError(400, 'invalid_id');
    const rows = await rest(cfg, 'GET', `logbook_sections?select=id,slug&id=eq.${id.toLowerCase()}&limit=1`);
    if (!rows[0]) throw new HttpError(404, 'not_found');
    if (body.confirmSlug !== rows[0].slug) throw new HttpError(400, 'confirm_mismatch');
    await rest(cfg, 'DELETE', `logbook_sections?id=eq.${id.toLowerCase()}`);
    return { ok: true };
  },

  async section_reorder(cfg, body) {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length || ids.length > 500 || ids.some((i) => !UUID_RE.test(i))) throw new HttpError(400, 'invalid_ids');
    if (new Set(ids).size !== ids.length) throw new HttpError(400, 'invalid_ids');
    const kind = body.kind === 'entries' ? 'logbook_entries' : 'logbook_sections';
    for (let i = 0; i < ids.length; i++) {
      await rest(cfg, 'PATCH', `${kind}?id=eq.${ids[i].toLowerCase()}`, { sort: i * 10 });
    }
    return { ok: true };
  },

  async entry_save(cfg, body) {
    const check = validateEntryInput(body.entry);
    if (!check.ok) throw new HttpError(400, check.error);
    const value = check.value;
    const id = body.entry.id ? String(body.entry.id).toLowerCase() : null;
    const sec = await rest(cfg, 'GET', `logbook_sections?select=id&id=eq.${value.section_id}&limit=1`);
    if (!sec[0]) throw new HttpError(400, 'invalid_section');
    let previous = null;
    if (id) {
      const rows = await rest(cfg, 'GET', `logbook_entries?select=id,status,published_at&id=eq.${id}&limit=1`);
      previous = rows[0];
      if (!previous) throw new HttpError(404, 'not_found');
    }
    if (value.status === 'published' && !(previous && previous.published_at)) value.published_at = new Date().toISOString();
    const rows = id
      ? await rest(cfg, 'PATCH', `logbook_entries?id=eq.${id}`, value)
      : await rest(cfg, 'POST', 'logbook_entries', value);
    return { ok: true, entry: { ...rows[0], blocks: sanitizeBlocks(rows[0].blocks) } };
  },

  async upload_sign(cfg, body) {
    const type = UPLOAD_TYPES[String(body.mime || '')];
    if (!type) throw new HttpError(400, 'invalid_file_type');
    const bytes = Number(body.bytes);
    if (!Number.isFinite(bytes) || bytes <= 0) throw new HttpError(400, 'invalid_file');
    if (bytes > MAX_UPLOAD_BYTES) throw new HttpError(400, 'file_too_large');
    const now = new Date();
    const path = `entries/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${type.ext}`;
    const res = await fetch(`${cfg.url}/storage/v1/object/upload/sign/logbook/${path}`, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!res.ok) throw new HttpError(502, 'upstream_error');
    const data = await res.json();
    const rel = String(data?.url || '');
    if (!rel.startsWith('/object/upload/sign/logbook/')) throw new HttpError(502, 'upstream_error');
    return { ok: true, path, uploadUrl: `${cfg.url}/storage/v1${rel}`, publicUrl: `${cfg.mediaBase}/${path}` };
  },

  async media_register(cfg, body) {
    const path = String(body.path || '');
    if (!UPLOAD_PATH_RE.test(path)) throw new HttpError(400, 'invalid_file');
    const type = UPLOAD_TYPES[String(body.mime || '')];
    if (!type) throw new HttpError(400, 'invalid_file_type');
    const int = (v) => (Number.isInteger(v) && v > 0 && v < 1e9 ? v : null);
    const text = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : null);
    const rows = await rest(cfg, 'POST', 'logbook_media', {
      path,
      kind: type.kind,
      mime: body.mime,
      bytes: int(body.bytes),
      width: int(body.width),
      height: int(body.height),
      alt_en: text(body.alt_en),
      alt_es: text(body.alt_es)
    });
    return { ok: true, media: rows && rows[0] };
  },

  async entry_delete(cfg, body) {
    const id = String(body.id || '');
    if (!UUID_RE.test(id)) throw new HttpError(400, 'invalid_id');
    const rows = await rest(cfg, 'GET', `logbook_entries?select=id,slug&id=eq.${id.toLowerCase()}&limit=1`);
    if (!rows[0]) throw new HttpError(404, 'not_found');
    if (body.confirmSlug !== rows[0].slug) throw new HttpError(400, 'confirm_mismatch');
    await rest(cfg, 'DELETE', `logbook_entries?id=eq.${id.toLowerCase()}`);
    return { ok: true };
  }
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const clientIp = (req) =>
  String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

/** El navegador siempre manda Origin en un POST con fetch; debe ser este mismo sitio. */
export function isSameOrigin(req) {
  const origin = String(req.headers?.origin || '');
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!isSameOrigin(req)) return res.status(403).json({ ok: false, error: 'forbidden_origin' });

  const cfg = getConfig();
  if (!cfg.key || !cfg.secret || !cfg.password) return res.status(503).json({ ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'invalid_body' });
  const action = String(body.action || '');

  try {
    if (action === 'login') {
      const ip = clientIp(req);
      if (isLoginBlocked(ip)) {
        res.setHeader('Retry-After', String(FAIL_WINDOW_MS / 1000));
        return res.status(429).json({ ok: false, error: 'too_many_attempts' });
      }
      if (!safePasswordEquals(body.password, cfg.password)) {
        registerFail(ip);
        // Pequeña demora aleatoria: frena la fuerza bruta y oculta tiempos
        if (!process.env.VITEST) await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 300)));
        return res.status(401).json({ ok: false, error: 'invalid_password' });
      }
      const session = await issueToken(cfg);
      return res.status(200).json({ ok: true, ...session });
    }

    if (!Object.prototype.hasOwnProperty.call(actions, action)) {
      return res.status(400).json({ ok: false, error: 'invalid_action' });
    }
    const session = await verifyToken(req, cfg);
    if (!session) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const result = await actions[action](cfg, body, session);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ ok: false, error: err.code });
    console.error('[logbook-admin] error:', err && err.message);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}
