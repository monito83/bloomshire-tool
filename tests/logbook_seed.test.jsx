import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import megaAtlasData from '../public/data/bloomshire/mega_atlas_data.json';
import seed from '../src/data/logbook_seed.json';
import handler, { SEED_CONFIRM, _resetLoginLimits } from '../api/logbook-admin.js';
import { validateSectionInput, validateEntryInput, buildPlaceCorpus } from '../src/components/bloomshire/logbook/logbookModel';

const SECRET = 'y'.repeat(40);
const PASSWORD = 'seed-test-password';
const HOST = 'bloomshire-tool.vercel.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function placesOf(entry) {
  const out = [...(entry.places || [])];
  for (const b of entry.blocks || []) if (b.type === 'place' && b.key) out.push(b.key);
  return out;
}

describe('Bitacora: contenido inicial (seed)', () => {
  it('tiene secciones y entradas con ids unicos', () => {
    expect(seed.sections.length).toBeGreaterThanOrEqual(3);
    expect(seed.entries.length).toBeGreaterThanOrEqual(20);
    const ids = [...seed.sections, ...seed.entries].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID_RE);
  });

  it('cada seccion y entrada pasa la validacion del admin', () => {
    const sectionIds = new Set(seed.sections.map((s) => s.id));
    for (const s of seed.sections) expect(validateSectionInput(s).ok, s.slug).toBe(true);
    for (const e of seed.entries) {
      const r = validateEntryInput(e);
      expect(r.ok, `${e.slug}: ${r.error}`).toBe(true);
      expect(sectionIds.has(e.section_id)).toBe(true);
      // la validacion no debe tirar bloques
      expect(r.value.blocks.length).toBe(e.blocks.length);
    }
  });

  it('todas las entradas tienen titulo en ingles y espanol', () => {
    for (const e of seed.entries) {
      expect(e.title_en, e.slug).toBeTruthy();
      expect(e.title_es, e.slug).toBeTruthy();
    }
  });

  it('todos los lugares existen en el Atlas', () => {
    const keys = new Set(buildPlaceCorpus(megaAtlasData, []).map((p) => p.key));
    for (const e of seed.entries) {
      for (const k of placesOf(e)) expect(keys.has(k), `${e.slug} -> ${k}`).toBe(true);
    }
  });

  it('autor Admin y sin rastros de Leonman', () => {
    for (const e of seed.entries) expect(e.author).toBe('Admin');
    expect(JSON.stringify(seed)).not.toMatch(/leonman/i);
  });
});

// ---------------------------------------------------------------------------

function mockRes() {
  const res = { headers: {}, code: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

let ip = 0;
async function call(body, token) {
  const res = mockRes();
  const headers = { host: HOST, origin: `https://${HOST}`, 'x-forwarded-for': `10.9.0.${++ip % 250}` };
  if (token) headers.authorization = `Bearer ${token}`;
  await handler({ method: 'POST', headers, body }, res);
  return res;
}

describe('Bitacora admin: seed_reset', () => {
  let requests;
  beforeEach(() => {
    _resetLoginLimits();
    process.env.SUPABASE_URL = 'https://abc.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SESSION_SECRET = SECRET;
    process.env.LOGBOOK_ADMIN_PASSWORD = PASSWORD;
    requests = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = new URL(url);
      const method = opts.method || 'GET';
      const body = opts.body ? JSON.parse(opts.body) : undefined;
      requests.push({ method, table: u.pathname.split('/').pop(), query: u.search, body });
      const data = method === 'POST' ? body : [];
      return { ok: true, status: method === 'DELETE' ? 204 : 200, json: async () => data, text: async () => JSON.stringify(data) };
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'LOGBOOK_ADMIN_PASSWORD']) delete process.env[k];
  });

  it('exige sesion y la palabra de confirmacion', async () => {
    expect((await call({ action: 'seed_reset', confirm: SEED_CONFIRM })).code).toBe(401);
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const bad = await call({ action: 'seed_reset', confirm: 'borrar' }, token);
    expect(bad.code).toBe(400);
    expect(bad.body.error).toBe('confirm_mismatch');
    expect(requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  });

  it('borra todo y carga secciones y entradas como Admin', async () => {
    const token = (await call({ action: 'login', password: PASSWORD })).body.token;
    const r = await call({ action: 'seed_reset', confirm: SEED_CONFIRM }, token);
    expect(r.code).toBe(200);
    expect(r.body).toEqual(expect.objectContaining({ ok: true, sections: seed.sections.length, entries: seed.entries.length }));

    const deletes = requests.filter((q) => q.method === 'DELETE').map((q) => q.table);
    expect(deletes).toEqual(expect.arrayContaining(['logbook_entries', 'logbook_sections', 'logbook_places']));
    const firstPost = requests.findIndex((q) => q.method === 'POST');
    const lastDelete = requests.map((q) => q.method).lastIndexOf('DELETE');
    expect(lastDelete).toBeLessThan(firstPost);

    const posted = (table) => requests.filter((q) => q.method === 'POST' && q.table === table).flatMap((q) => q.body);
    expect(posted('logbook_sections')).toHaveLength(seed.sections.length);
    const entries = posted('logbook_entries');
    expect(entries).toHaveLength(seed.entries.length);
    for (const e of entries) {
      expect(e.author).toBe('Admin');
      expect(e.id).toMatch(UUID_RE);
    }
  });
});
