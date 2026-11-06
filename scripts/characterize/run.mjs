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

async function capture(page, name, { png = true } = {}) {
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(out, `${name}.txt`), normalize(text) + '\n');
  if (png) await page.screenshot({ path: path.join(out, `${name}.png`) });
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

// Escenarios de interaccion: cubren la logica que el refactor mueve (sesion, sync, cache, filtros, temporizadores)
async function runScenarios(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'es-AR', timezoneId: 'America/Buenos_Aires' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.clock.install({ time: FIXED_NOW });
  await page.clock.pauseAt(FIXED_NOW);
  await mockApis(page, true);

  const dumpStorage = async (name) => {
    const storage = await page.evaluate(() => {
      const o = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); }
      return Object.fromEntries(Object.entries(o).sort());
    });
    fs.writeFileSync(path.join(out, `${name}__storage.json`), JSON.stringify(storage, null, 2) + '\n');
  };
  const start = async (tab, { cache = false, inject = true } = {}) => {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ tab, wallet, cache, data }) => {
      localStorage.clear();
      localStorage.setItem('bloomshire_lang', 'es');
      localStorage.setItem('bloomshire_active_tab', tab);
      localStorage.setItem('bloomshire_wallet', wallet);
      localStorage.setItem('bloomshire_session_token', 'test-token');
      if (cache) localStorage.setItem('bloomshire_cached_snapshot', JSON.stringify(data));
    }, { tab, wallet: WALLET, cache, data: snapshot });
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(500);
    if (inject) {
      await page.evaluate((data) => window.postMessage({ type: 'MONIOS_COMPANION_SYNC', game: 'bloomshire', data: { ...data, _fromExtension: true } }, '*'), snapshot);
      await page.clock.runFor(1000);
    }
  };
  const click = async (re) => { await page.getByRole('button', { name: re }).first().click(); await page.clock.runFor(800); };

  // 1) partida restaurada desde la cache (sin mensaje de la extension)
  await start('inventory', { cache: true, inject: false });
  await capture(page, 'scenario__cache_restore');

  // 2) energia y reloj de cama: 3 minutos despues (tick de 15 s)
  await start('quests');
  await page.clock.runFor(3 * 60e3);
  await capture(page, 'scenario__energy_tick');

  // 3) boton Sync del HUD
  await start('inventory');
  await click(/^Sync$/);
  await page.clock.runFor(1000);
  await capture(page, 'scenario__sync_click');

  // 4) filtro de almacen en el Liquidador (recalcula cantidades por scope)
  await start('inventory');
  await click(/Liquidador/);
  await click(/Mochila \(M\)/);
  await capture(page, 'scenario__scope_mochila');

  // 5) temporizador manual en Temporizadores
  await start('monitors');
  await click(/Nuevo Lote/);
  await page.getByPlaceholder(/Guiso de Pescado/).fill('Pan de prueba');
  await click(/Iniciar Temporizador/);
  await capture(page, 'scenario__add_timer');
  await dumpStorage('scenario__add_timer');

  // 6) perfil (clic en la wallet del HUD)
  await start('mega_atlas');
  await click(/0x111/);
  await capture(page, 'scenario__profile_modal');

  // 7) la extension reporta otra wallet: la sesion se cierra y se abre el modal de conexion
  await start('inventory');
  await page.evaluate((data) => window.postMessage({ type: 'MONIOS_COMPANION_SYNC', game: 'bloomshire', data: { ...data, wallet: '0x2222222222222222222222222222222222222222', _fromExtension: true } }, '*'), snapshot);
  await page.clock.runFor(1000);
  await capture(page, 'scenario__wallet_conflict');
  await dumpStorage('scenario__wallet_conflict');

  // 8) desconectar desde el HUD
  await start('inventory');
  await click(/Desconectar/);
  await capture(page, 'scenario__disconnect', { png: false });   // (cae en el Mega-Atlas, cuyo mapa todavia se esta dibujando)
  await dumpStorage('scenario__disconnect');

  // 9) invitado: abrir el modal de conexion
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('bloomshire_lang', 'es'); localStorage.setItem('bloomshire_active_tab', 'items'); });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.clock.runFor(500);
  await page.getByText(/Conectar Partida/).first().click();
  await page.clock.runFor(800);
  await capture(page, 'scenario__connect_modal');

  fs.writeFileSync(path.join(out, 'scenario__errors.txt'), errors.join('\n') + '\n');
  await context.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--font-render-hinting=none'] });
try {
  await runMode(browser, 'guest');
  await runMode(browser, 'connected');
  await runScenarios(browser);
} finally {
  await browser.close();
}
console.log(`listo: ${fs.readdirSync(out).length} archivos en ${out}`);
