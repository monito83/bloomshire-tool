import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import i18n from '../src/i18n/index';
import handler from '../api/tool-admin.js';
import loginHandler, { _resetLoginLimits } from '../api/logbook-admin.js';
import AdminGate from '../src/components/bloomshire/admin/AdminGate';
import meta from '../public/data/bloomshire/official/meta.json';

const HOST = 'bloomshire-tool.vercel.app';
const PASSWORD = 'correct-horse-battery';

function mockRes() {
  const res = { headers: {}, code: 0, body: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}
const call = async (h, body, token) => {
  const res = mockRes();
  await h({ method: 'POST', headers: { host: HOST, origin: `https://${HOST}`, 'x-forwarded-for': '1.2.3.4', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body }, res);
  return res;
};

describe('api/tool-admin.js (Ajustes, solo admin)', () => {
  let ghCalls;
  let runs;
  let live;
  beforeEach(() => {
    _resetLoginLimits();
    process.env.SESSION_SECRET = 'x'.repeat(40);
    process.env.LOGBOOK_ADMIN_PASSWORD = PASSWORD;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    process.env.GITHUB_UPDATE_TOKEN = 'gh-token';
    ghCalls = [];
    runs = [{ id: 1, status: 'completed', conclusion: 'success', event: 'schedule', created_at: '2026-11-05T09:23:00Z', updated_at: '2026-11-05T09:25:00Z', html_url: 'https://github.com/x' }];
    live = `<meta name="bloomshire-rules" content="${meta.rulesHash}"><script src="v/${meta.gameVersion}/js/play.js"></script>`;
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      if (String(url).startsWith('https://bloomshire.xyz/')) return { ok: true, status: 200, text: async () => live };
      ghCalls.push({ url, method: opts.method || 'GET', auth: opts.headers?.Authorization, body: opts.body });
      if (String(url).includes('/dispatches')) return { ok: true, status: 204, json: async () => null };
      return { ok: true, status: 200, json: async () => ({ workflow_runs: runs }) };
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ['SESSION_SECRET', 'LOGBOOK_ADMIN_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_UPDATE_TOKEN']) delete process.env[k];
  });
  const login = async () => (await call(loginHandler, { action: 'login', password: PASSWORD })).body.token;

  it('exige sesion de admin', async () => {
    expect((await call(handler, { action: 'status' })).code).toBe(401);
    expect((await call(handler, { action: 'status' }, 'a.b.c')).code).toBe(401);
  });

  it('status compara la version en vivo con la de los datos', async () => {
    const token = await login();
    let r = await call(handler, { action: 'status' }, token);
    expect(r.code).toBe(200);
    expect(r.body.upToDate).toBe(true);
    expect(r.body.tool.gameVersion).toBe(meta.gameVersion);
    live = '<meta name="bloomshire-rules" content="ffffffffffff"><script src="v/aaaaaaaaaaaa/js/play.js"></script>';
    r = await call(handler, { action: 'status' }, token);
    expect(r.body.upToDate).toBe(false);
    expect(r.body.live.gameVersion).toBe('aaaaaaaaaaaa');
  });

  it('runs y run_update usan el token de GitHub y evitan corridas dobles', async () => {
    const token = await login();
    const r = await call(handler, { action: 'runs' }, token);
    expect(r.body.runs[0]).toEqual(expect.objectContaining({ status: 'completed', conclusion: 'success' }));
    expect(ghCalls[0].auth).toBe('Bearer gh-token');
    const ok = await call(handler, { action: 'run_update' }, token);
    expect(ok.code).toBe(200);
    expect(ghCalls.some((c) => c.url.endsWith('/actions/workflows/game-update.yml/dispatches') && c.method === 'POST' && JSON.parse(c.body).ref === 'main')).toBe(true);
    runs = [{ ...runs[0], status: 'in_progress', conclusion: null }];
    expect((await call(handler, { action: 'run_update' }, token)).body.error).toBe('update_running');
  });

  it('sin token de GitHub avisa en vez de fallar', async () => {
    delete process.env.GITHUB_UPDATE_TOKEN;
    const token = await login();
    expect((await call(handler, { action: 'status' }, token)).body.github.configured).toBe(false);
    expect((await call(handler, { action: 'run_update' }, token)).body.error).toBe('github_not_configured');
  });
});

describe('Ajustes detras del acceso de admin', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });
  it('sin sesion muestra la pantalla de acceso y no el contenido', async () => {
    const html = renderToString(<AdminGate>{() => <div>SECRETO</div>}</AdminGate>);
    expect(html).toContain('Settings are for admins');
    expect(html).not.toContain('SECRETO');
    await i18n.changeLanguage('es');
    expect(renderToString(<AdminGate>{() => <div />}</AdminGate>)).toContain('Ajustes es solo para administradores');
  });
});
