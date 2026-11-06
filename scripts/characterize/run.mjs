// scripts/characterize/run.mjs
// Red de seguridad para el refactor de BloomshireCommand (docs/REFACTOR_SPEC.md, fase 1).
//
// Abre la herramienta (vite dev) en Chrome, con la hora fija, las APIs simuladas y una partida de ejemplo
// inyectada como si viniera de la extension. Recorre todas las pestanas en modo guia (sin conectar) y
// conectado (sesion SIWE simulada), y guarda por cada vista:
//   <out>/<modo>__<vista>.txt   texto visible (normalizado)
//   <out>/<modo>__<vista>.png   captura
//   <out>/<modo>__storage.json  claves de localStorage que escribe la app
// Despues `compare.mjs <antes> <despues>` compara textos (exacto) y capturas (pixel a pixel con tolerancia).
//
// Uso:  npx vite --port 5199 --strictPort &   (en otra terminal)
//       CHROME_PATH=/ruta/a/chrome node scripts/characterize/run.mjs <carpeta-salida> [http://localhost:5199]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = process.argv[2];
const base = process.argv[3] || 'http://localhost:5199';
if (!out) { console.error('uso: node scripts/characterize/run.mjs <carpeta-salida> [url]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const FIXED_NOW = 1793500300000;   // 5 min despues del timestamp de la partida de ejemplo
const snapshot = JSON.parse(fs.readFileSync(new URL('./fixture_snapshot.json', import.meta.url), 'utf8'));
const WALLET = snapshot.wallet;
const TABS = ['mega_atlas', 'logbook', 'inventory', 'items', 'craft', 'npcs', 'calc', 'monitors', 'quests', 'advisor', 'system'];
const ECONOMY_SUBTABS = ['Liquidador', 'Odette', 'Arbitraje', 'Radar'];

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockApis(page, connected) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const action = url.searchParams.get('action');
    if (p.endsWith('/api/auth')) {
      if (action === 'me') return route.fulfill(connected ? json({ ok: true, wallet: WALLET }) : json({ ok: false }, 401));
      return route.fulfill(json({ ok: false }, 400));
    }
    if (p.endsWith('/api/bloomshire-advisor')) {
      return route.fulfill(json({ ok: true, inGame: null, onChain: { wallet: WALLET, farmersCount: 0 } }));
    }
    if (p.endsWith('/api/bloomshire-version')) return route.fulfill(json({ ok: true, liveBuild: '4ccdce8f2b1e' }));
    if (p.endsWith('/api/logbook')) return route.fulfill(json({ ok: false, error: 'not_configured' }, 503));
    if (p.endsWith('/api/csp-report')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill(json({ ok: false, error: 'mocked' }, 404));
  });
  // nada de red externa: imagenes de terceros, fuentes, etc. (para que la captura sea estable)
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
}

const normalize = (s) => s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

async function capture(page, name) {
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(out, `${name}.txt`), normalize(text) + '\n');
  await page.screenshot({ path: path.join(out, `${name}.png`) });
}

async function runMode(browser, mode) {
  const connected = mode === 'connected';
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'es-AR', timezoneId: 'America/Buenos_Aires' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.clock.install({ time: FIXED_NOW });
  await page.clock.pauseAt(FIXED_NOW);
  await mockApis(page, connected);

  for (const tab of TABS) {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ tab, connected, wallet }) => {
      localStorage.clear();
      localStorage.setItem('bloomshire_lang', 'es');
      localStorage.setItem('bloomshire_active_tab', tab);
      if (connected) {
        localStorage.setItem('bloomshire_wallet', wallet);
        localStorage.setItem('bloomshire_session_token', 'test-token');
      }
    }, { tab, connected, wallet: WALLET });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(500);
    if (connected) {
      await page.evaluate((data) => {
        window.postMessage({ type: 'MONIOS_COMPANION_SYNC', game: 'bloomshire', data: { ...data, _fromExtension: true } }, '*');
      }, snapshot);
      await page.clock.runFor(1000);
    }
    await capture(page, `${mode}__${tab}`);

    if (tab === 'inventory') {
      for (const sub of ECONOMY_SUBTABS) {
        const btn = page.getByRole('button', { name: new RegExp(sub) }).first();
        if (await btn.count()) {
          await btn.click();
          await page.clock.runFor(300);
          await capture(page, `${mode}__inventory_${sub.toLowerCase()}`);
        }
      }
    }
  }

  const storage = await page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
    return Object.fromEntries(Object.entries(o).sort());
  });
  fs.writeFileSync(path.join(out, `${mode}__storage.json`), JSON.stringify(storage, null, 2) + '\n');
  fs.writeFileSync(path.join(out, `${mode}__errors.txt`), errors.join('\n') + '\n');
  await context.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--font-render-hinting=none'] });
try {
  await runMode(browser, 'guest');
  await runMode(browser, 'connected');
} finally {
  await browser.close();
}
console.log(`listo: ${fs.readdirSync(out).length} archivos en ${out}`);
