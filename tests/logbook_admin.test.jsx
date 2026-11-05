import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SignJWT } from 'jose';

import i18n from '../src/i18n/index';
import megaAtlasData from '../public/data/bloomshire/mega_atlas_data.json';
import handler, { safePasswordEquals, isSameOrigin, _resetLoginLimits } from '../api/logbook-admin.js';
import {
  slugify, validateSectionInput, validateEntryInput, wouldCreateCycle, buildTree, buildPlaceCorpus
} from '../src/components/bloomshire/logbook/logbookModel';
import LogbookEditor, { countMissingEs } from '../src/components/bloomshire/logbook/LogbookEditor';
import SectionEditorModal from '../src/components/bloomshire/logbook/SectionEditorModal';
import { newBlock, BLOCK_ORDER } from '../src/components/bloomshire/logbook/BlockEditor';
import { DEMO_SECTIONS, DEMO_ENTRIES } from '../src/components/bloomshire/logbook/logbookDemoData';

const SECRET = 'x'.repeat(40);
const PASSWORD = 'correct-horse-battery';
const HOST = 'bloomshire-tool.vercel.app';
const S1 = '11111111-1111-4111-8111-111111111111';
const S2 = '22222222-2222-4222-8222-222222222222';
const E1 = 'aaaaaaaa-0000-4000-8000-000000000001';

describe('Bitacora admin: validaciones del modelo', () => {
  it('slugify', () => {
    expect(slugify('The Gloom Cave — Guía!')).toBe('the-gloom-cave-guia');
    expect(slugify('  ')).toBe('');
  });

  it('validateSectionInput exige titulo EN, genera slug y limpia columnas', () => {
    expect(validateSectionInput({ title_en: '' }).error).toBe('title_required');
    const ok = validateSectionInput({ title_en: 'Boss Guides', evil: 1, status: 'x' });
    expect(ok.ok).toBe(true);
    expect(ok.value).toEqual(expect.objectContaining({ slug: 'boss-guides', status: 'published', parent_id: null }));
    expect(ok.value.evil).toBeUndefined();
    expect(validateSectionInput({ title_en: 'A', slug: 'Bad Slug' }).error).toBe('invalid_slug');
    expect(validateSectionInput({ title_en: 'A', parent_id: 'nope' }).error).toBe('invalid_parent');
  });

  it('validateEntryInput sanea bloques, etiquetas y lugares', () => {
    const r = validateEntryInput({
      section_id: S1,
      title_en: 'Gloom Cave',
      tags: ['Boss', 'boss', ' cave ', 3],
      places: ['region:whisperwood', 'region:whisperwood'],
      blocks: [{ type: 'text', md_en: 'hi' }, { type: 'script', src: 'x' }, { type: 'image', path: '../x' }],
      status: 'published'
    });
    expect(r.ok).toBe(true);
    expect(r.value.tags).toEqual(['boss', 'cave']);
    expect(r.value.places).toEqual(['region:whisperwood']);
    expect(r.value.blocks).toHaveLength(1);
    expect(r.value.slug).toBe('gloom-cave');
    expect(validateEntryInput({ section_id: S1, title_en: 'x', places: ['javascript:1'] }).error).toBe('invalid_place');
    expect(validateEntryInput({ title_en: 'x' }).error).toBe('section_required');
    expect(validateEntryInput({ section_id: S1, title_en: 'x', cover_path: '../a' }).error).toBe('invalid_cover');
  });

  it('wouldCreateCycle', () => {
    const secs = [{ id: 'a', parent_id: null }, { id: 'b', parent_id: 'a' }, { id: 'c', parent_id: 'b' }];
    expect(wouldCreateCycle(secs, 'a', 'c')).toBe(true);
    expect(wouldCreateCycle(secs, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(secs, 'c', 'a')).toBe(false);
  });

  it('countMissingEs cuenta titulos, bloques y tarjetas sin espanol', () => {
    expect(countMissingEs({
      title_en: 'A', title_es: 'A', summary_en: 'S', summary_es: '',
      blocks: [{ type: 'text', md_en: 'x', md_es: '' }, { type: 'statcards', cards: [{ label_en: 'L', label_es: '' }] }]
    })).toBe(3);
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

let ipCounter = 0;
async function call(body, { token = null, origin = `https://${HOST}`, method = 'POST', ip } = {}) {
  const res = mockRes();
  const headers = { host: HOST, 'x-forwarded-for': ip || `10.1.0.${++ipCounter % 250}` };
  if (origin) headers.origin = origin;
  if (token) headers.authorization = `Bearer ${token}`;
  await handler({ method, headers, body }, res);
  return res;
}

async function login() {
  const r = await call({ action: 'login', password: PASSWORD });
  return r.body.token;
}

describe('Bitacora admin: api/logbook-admin.js', () => {
  let db;
  let requests;
  beforeEach(() => {
    _resetLoginLimits();
    process.env.SUPABASE_URL = 'https://abc.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.SESSION_SECRET = SECRET;
    process.env.LOGBOOK_ADMIN_PASSWORD = PASSWORD;
    db = {
      logbook_sections: [
        { id: S1, parent_id: null, slug: 'guides', title_en: 'Guides', status: 'published', sort: 0 },
        { id: S2, parent_id: S1, slug: 'bosses', title_en: 'Bosses', status: 'draft', sort: 0 }
      ],
      logbook_entries: [{ id: E1, section_id: S1, slug: 'gloom-cave', title_en: 'Gloom', status: 'draft', published_at: null, blocks: [] }],
      logbook_places: []
    };
    requests = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = new URL(url);
      const table = u.pathname.split('/').pop();
      const method = opts.method || 'GET';
      const body = opts.body ? JSON.parse(opts.body) : undefined;
      requests.push({ method, table, query: u.search, body });
      const idEq = u.searchParams.get('id');
      const match = (r) => !idEq || `eq.${r.id}` === idEq;
      const json = (status, data) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) });
      if (method === 'GET') return json(200, db[table].filter(match));
      if (method === 'POST') {
        if (db[table].some((r) => r.slug === body.slug && (r.parent_id ?? r.section_id) === (body.parent_id ?? body.section_id))) return json(409, { code: '23505' });
        const row = { id: 'cccccccc-0000-4000-8000-00000000000' + db[table].length, ...body };
        db[table].push(row);
        return json(201, [row]);
      }
      if (method === 'PATCH') {
        const rows = db[table].filter(match).map((r) => Object.assign(r, body));
        return json(200, rows);
      }
      if (method === 'DELETE') {
        db[table] = db[table].filter((r) => !match(r));
        return { ok: true, status: 204, json: async () => null, text: async () => '' };
      }
      return json(500, {});
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'LOGBOOK_ADMIN_PASSWORD']) delete process.env[k];
  });

  it('comparacion de contraseña en tiempo constante', () => {
    expect(safePasswordEquals(PASSWORD, PASSWORD)).toBe(true);
    expect(safePasswordEquals('x', PASSWORD)).toBe(false);
    expect(safePasswordEquals(undefined, PASSWORD)).toBe(false);
    expect(safePasswordEquals('x', '')).toBe(false);
  });

  it('solo POST y mismo origen', async () => {
    expect((await call({ action: 'login' }, { method: 'GET' })).code).toBe(405);
    expect((await call({ action: 'login', password: PASSWORD }, { origin: 'https://evil.com' })).code).toBe(403);
    expect((await call({ action: 'login', password: PASSWORD }, { origin: null })).code).toBe(403);
    expect(isSameOrigin({ headers: { origin: `https://${HOST}`, host: HOST } })).toBe(true);
  });

  it('503 si falta configuracion (clave, secreto o contraseña)', async () => {
    delete process.env.LOGBOOK_ADMIN_PASSWORD;
    expect((await call({ action: 'login', password: 'x' })).body.error).toBe('not_configured');
    process.env.LOGBOOK_ADMIN_PASSWORD = PASSWORD;
    process.env.SESSION_SECRET = 'short';
    expect((await call({ action: 'login', password: PASSWORD })).code).toBe(503);
  });

  it('login: contraseña mala 401, buena devuelve JWT de 12 h', async () => {
    const bad = await call({ action: 'login', password: 'nope' });
    expect(bad.code).toBe(401);
    const ok = await call({ action: 'login', password: PASSWORD });
    expect(ok.code).toBe(200);
    expect(ok.body.token.split('.')).toHaveLength(3);
    const hours = (ok.body.expiresAt - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThanOrEqual(12);
    expect(ok.headers['cache-control']).toBe('no-store');
  });

  it('bloquea tras 5 intentos fallidos desde la misma IP (incluso con la contraseña buena)', async () => {
    for (let i = 0; i < 5; i++) expect((await call({ action: 'login', password: 'bad' }, { ip: '7.7.7.7' })).code).toBe(401);
    expect((await call({ action: 'login', password: PASSWORD }, { ip: '7.7.7.7' })).code).toBe(429);
    expect((await call({ action: 'login', password: PASSWORD }, { ip: '8.8.8.8' })).code).toBe(200);
  });

  it('toda accion exige un JWT valido', async () => {
    expect((await call({ action: 'tree' })).code).toBe(401);
    expect((await call({ action: 'tree' }, { token: 'abc.def.ghi' })).code).toBe(401);
    const forged = await new SignJWT({ role: 'logbook_admin', pwv: 'x' }).setProtectedHeader({ alg: 'HS256' })
      .setIssuer('bloomshire-tool').setAudience('logbook-admin').setExpirationTime('1h')
      .sign(new TextEncoder().encode('y'.repeat(40)));
    expect((await call({ action: 'tree' }, { token: forged })).code).toBe(401);
    expect((await call({ action: 'nope' }, { token: await login() })).code).toBe(400);
  });

  it('cambiar la contraseña invalida las sesiones existentes', async () => {
    const token = await login();
    expect((await call({ action: 'me' }, { token })).code).toBe(200);
    process.env.LOGBOOK_ADMIN_PASSWORD = 'another-password-123';
    expect((await call({ action: 'me' }, { token })).code).toBe(401);
  });

  it('tree incluye borradores', async () => {
    const r = await call({ action: 'tree' }, { token: await login() });
    expect(r.code).toBe(200);
    expect(r.body.sections.map((s) => s.slug)).toEqual(['guides', 'bosses']);
    expect(r.body.entries[0].status).toBe('draft');
  });

  it('section_save crea, valida padre, evita ciclos y slugs repetidos', async () => {
    const token = await login();
    const created = await call({ action: 'section_save', section: { title_en: 'Zones', title_es: 'Zonas' } }, { token });
    expect(created.code).toBe(200);
    expect(created.body.section.slug).toBe('zones');
    expect((await call({ action: 'section_save', section: { title_en: 'Zones' } }, { token })).body.error).toBe('slug_taken');
    expect((await call({ action: 'section_save', section: { title_en: 'X', parent_id: 'eeeeeeee-0000-4000-8000-000000000000' } }, { token })).body.error).toBe('invalid_parent');
    expect((await call({ action: 'section_save', section: { id: S1, title_en: 'Guides', slug: 'guides', parent_id: S2 } }, { token })).body.error).toBe('cycle');
    expect((await call({ action: 'section_save', section: { title_en: '' } }, { token })).body.error).toBe('title_required');
  });

  it('entry_save sanea bloques y fija published_at al publicar', async () => {
    const token = await login();
    const r = await call({ action: 'entry_save', entry: { id: E1, section_id: S1, title_en: 'Gloom', slug: 'gloom-cave', status: 'published', blocks: [{ type: 'text', md_en: 'ok' }, { type: 'iframe', src: 'x' }] } }, { token });
    expect(r.code).toBe(200);
    const patch = requests.find((q) => q.method === 'PATCH' && q.table === 'logbook_entries');
    expect(patch.body.blocks).toEqual([{ type: 'text', md_en: 'ok', md_es: '' }]);
    expect(typeof patch.body.published_at).toBe('string');
    expect(patch.body.id).toBeUndefined();
    expect((await call({ action: 'entry_save', entry: { section_id: 'eeeeeeee-0000-4000-8000-000000000000', title_en: 'x' } }, { token })).body.error).toBe('invalid_section');
  });

  it('borrar exige escribir el slug', async () => {
    const token = await login();
    expect((await call({ action: 'section_delete', id: S1, confirmSlug: 'nope' }, { token })).body.error).toBe('confirm_mismatch');
    expect(db.logbook_sections).toHaveLength(2);
    expect((await call({ action: 'section_delete', id: S1, confirmSlug: 'guides' }, { token })).code).toBe(200);
    expect(db.logbook_sections.some((s) => s.id === S1)).toBe(false);
    expect((await call({ action: 'entry_delete', id: E1, confirmSlug: 'gloom-cave' }, { token })).code).toBe(200);
  });

  it('reordenar valida ids y escribe sort', async () => {
    const token = await login();
    expect((await call({ action: 'section_reorder', ids: ['x'] }, { token })).code).toBe(400);
    expect((await call({ action: 'section_reorder', ids: [S2, S1] }, { token })).code).toBe(200);
    expect(db.logbook_sections.find((s) => s.id === S2).sort).toBe(0);
    expect(db.logbook_sections.find((s) => s.id === S1).sort).toBe(10);
  });

  it('errores de Supabase no filtran detalles', async () => {
    const token = await login();
    fetch.mockImplementation(async () => ({ ok: false, status: 500, json: async () => ({ message: 'secret detail' }), text: async () => '' }));
    const r = await call({ action: 'tree' }, { token });
    expect(r.code).toBe(502);
    expect(JSON.stringify(r.body)).not.toContain('secret');
  });
});

// ---------------------------------------------------------------------------

describe('Bitacora admin: interfaz', () => {
  const tree = buildTree(DEMO_SECTIONS, DEMO_ENTRIES);
  const corpus = buildPlaceCorpus(megaAtlasData, []);
  const placesByKey = new Map(corpus.map((p) => [p.key, p]));
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('el editor muestra todos los tipos de bloque y los datos', () => {
    const entry = { ...DEMO_ENTRIES[0], blocks: BLOCK_ORDER.map(newBlock) };
    const html = renderToString(
      <LogbookEditor initial={entry} tree={tree} uiLang="en" corpus={corpus} placesByKey={placesByKey} mediaBase="/x" onSave={async () => entry} onDelete={async () => {}} onClose={() => {}} />
    );
    expect(html).toContain('Edit entry');
    for (const label of ['Text', 'Heading', 'Gallery', 'YouTube video', 'Stat cards', 'Callout', 'PDF file']) expect(html).toContain(label);
    expect(html).toContain('layout-showcase');
  });

  it('el editor y el modal de seccion en espanol', async () => {
    await i18n.changeLanguage('es');
    const html = renderToString(
      <LogbookEditor initial={{ section_id: DEMO_SECTIONS[0].id }} tree={tree} uiLang="es" corpus={corpus} placesByKey={placesByKey} mediaBase="/x" onSave={async () => ({})} onDelete={async () => {}} onClose={() => {}} />
    );
    expect(html).toContain('Nueva entrada');
    expect(html).toContain('Agregar bloque');
    const modal = renderToString(<SectionEditorModal tree={tree} lang="es" initial={{}} onSave={async () => {}} onDelete={async () => {}} onClose={() => {}} />);
    expect(modal).toContain('Nueva sección');
    expect(modal).toContain('Nivel principal');
  });
});

describe('Bitacora admin: bloques incompletos', async () => {
  const { isBlockComplete } = await import('../src/components/bloomshire/logbook/LogbookEditor');
  it('texto vacio, imagen sin ruta o video invalido no se pueden guardar', () => {
    expect(isBlockComplete({ type: 'text', md_en: '', md_es: 'hola' })).toBe(false);
    expect(isBlockComplete({ type: 'callout', variant: 'tip', md_en: '  ' })).toBe(false);
    expect(isBlockComplete({ type: 'image', path: '' })).toBe(false);
    expect(isBlockComplete({ type: 'youtube', url: 'nope' })).toBe(false);
    expect(isBlockComplete({ type: 'list', items_en: ['', ' '] })).toBe(false);
    expect(isBlockComplete({ type: 'text', md_en: 'ok' })).toBe(true);
    expect(isBlockComplete({ type: 'divider' })).toBe(true);
  });
});
