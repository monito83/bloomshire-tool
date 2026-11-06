/**
 * scripts/build_tool_guide.mjs — CAPTURAS PARA LA GUIA "COMO USAR LA TOOL"
 *
 * Compila la app, la abre en Chrome con una partida de ejemplo (la misma de scripts/characterize)
 * y saca una captura de cada modulo en ingles y en espanol:
 *   public/data/bloomshire/guide/<vista>_<en|es>.jpg
 * La Bitacora las muestra como "game/guide/<vista>_<lang>.jpg" (sin subir nada al bucket).
 * Volver a correrlo cuando cambie la interfaz.
 *
 * Uso: CHROME_PATH=/ruta/a/chrome node scripts/build_tool_guide.mjs [--only atlas,items]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/data/bloomshire/guide');
const DIST = path.join(ROOT, 'node_modules/.cache/tool-guide-dist');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const FIXED_NOW = 1793500300000; // misma hora que la partida de ejemplo
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/characterize/fixture_snapshot.json'), 'utf8'));
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/logbook_seed.json'), 'utf8'));
const WALLET = snapshot.wallet;
const LANGS = ['en', 'es'];
const tr = (lang, ns) => JSON.parse(fs.readFileSync(path.join(ROOT, `src/i18n/locales/${lang}/${ns}.json`), 'utf8'));

/** Vistas: pestaña, si va conectado y que hacer antes de la captura. */
export const SHOTS = [
  { id: 'atlas', tab: 'mega_atlas' },
  { id: 'logbook', tab: 'logbook', hash: '#logbook/bosses/orc-warlord' },
  { id: 'economy_liquidator', tab: 'inventory', sub: 'liquidation' },
  { id: 'economy_odette', tab: 'inventory', sub: 'odette' },
  { id: 'economy_radar', tab: 'inventory', sub: 'radar' },
  { id: 'items', tab: 'items' },
  { id: 'craft', tab: 'craft' },
  { id: 'npcs', tab: 'npcs' },
  { id: 'calc', tab: 'calc' },
  { id: 'timers', tab: 'monitors' },
  { id: 'quests', tab: 'quests' },
  { id: 'connect', tab: 'items', guest: true, connect: true }
];

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockApis(page, connected) {
  const meta = seed.entries.map(({ blocks, ...m }) => ({ ...m, published_at: '2026-11-06T12:00:00Z', updated_at: '2026-11-06T12:00:00Z' }));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const action = url.searchParams.get('action');
    if (p.endsWith('/api/auth')) return route.fulfill(connected && action === 'me' ? json({ ok: true, wallet: WALLET }) : json({ ok: false }, 401));
    if (p.endsWith('/api/bloomshire-advisor')) return route.fulfill(json({ ok: true, inGame: null, onChain: { wallet: WALLET, farmersCount: 0 } }));
    if (p.endsWith('/api/bloomshire-version')) return route.fulfill(json({ ok: true, liveBuild: 'guide' }));
    if (p.endsWith('/api/logbook')) {
      if (action === 'entry') {
        const e = seed.entries.find((x) => x.id === url.searchParams.get('id'));
        return route.fulfill(e ? json({ ok: true, entry: { ...e, published_at: '2026-11-06T12:00:00Z', updated_at: '2026-11-06T12:00:00Z' } }) : json({ ok: false }, 404));
      }
      return route.fulfill(json({ ok: true, sections: seed.sections, entries: meta, places: [], mediaBase: '' }));
    }
    return route.fulfill(json({ ok: false, error: 'mocked' }, 404));
  });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
}

async function shoot(browser, base, shot, lang) {
  const connected = !shot.guest;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: lang === 'es' ? 'es-AR' : 'en-US' });
  const page = await context.newPage();
  await page.clock.install({ time: FIXED_NOW });
  await mockApis(page, connected);
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ tab, connected, wallet, lang }) => {
    localStorage.clear();
    localStorage.setItem('bloomshire_lang', lang);
    localStorage.setItem('bloomshire_active_tab', tab);
    if (connected) {
      localStorage.setItem('bloomshire_wallet', wallet);
      localStorage.setItem('bloomshire_session_token', 'guide-token');
    }
  }, { tab: shot.tab, connected, wallet: WALLET, lang });
  await page.goto(`${base}/${shot.hash || ''}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  if (connected) {
    await page.evaluate((data) => {
      window.postMessage({ type: 'MONIOS_COMPANION_SYNC', game: 'bloomshire', data: { ...data, _fromExtension: true } }, '*');
    }, snapshot);
    await page.waitForTimeout(900);
  }
  if (shot.sub) {
    const label = tr(lang, 'inventory').tabs[shot.sub];
    await page.getByRole('button', { name: label }).first().click();
    await page.waitForTimeout(500);
  }
  if (shot.connect) {
    const label = tr(lang, 'header').mode.connectGameButton;
    await page.getByText(label).first().click();
    await page.waitForTimeout(1800);
  }
  await page.waitForTimeout(700);
  const file = path.join(OUT, `${shot.id}_${lang}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 78 });
  await context.close();
  return file;
}

async function main() {
  const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? new Set(process.argv[i + 1].split(',')) : null; })();
  await build({ root: ROOT, logLevel: 'warn', build: { outDir: DIST, emptyOutDir: true } });
  const server = await preview({ root: ROOT, logLevel: 'warn', build: { outDir: DIST }, preview: { port: 0, strictPort: false } });
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch({ executablePath: CHROME });
  fs.mkdirSync(OUT, { recursive: true });
  try {
    for (const shot of SHOTS) {
      if (only && !only.has(shot.id)) continue;
      for (const lang of LANGS) {
        const f = await shoot(browser, base, shot, lang);
        console.log(`  ${path.relative(ROOT, f)} (${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
      }
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.httpServer.close(r));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
