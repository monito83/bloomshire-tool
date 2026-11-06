/**
 * scripts/fetch_game.mjs — DESCARGA LA VERSION ACTUAL DEL JUEGO (para generar los datos oficiales)
 *
 *   node scripts/fetch_game.mjs           codigo (modulos que carga /play/) + idioma espanol
 *   node scripts/fetch_game.mjs --art     ademas, las imagenes listadas en assets_needed.txt
 *
 * Guarda en game-sources/v-<version>/ (fuera de git). Solo pide archivos estaticos publicos,
 * sin cuenta ni sesion: lo mismo que baja el navegador al abrir el juego.
 * Imprime la version en la ultima linea: "version=<hash> rules=<hash>".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://bloomshire.xyz/play/';
const UA = 'Bloomshire-Tool-Updater/1.0 (+https://bloomshire-tool.vercel.app)';
const withArt = process.argv.includes('--art');

async function get(url, { binary = false, tries = 3 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (err) {
      if (i >= tries) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}

/** Version del juego publicada ahora (sin descargar nada mas). */
export async function liveVersion() {
  const html = await get(BASE);
  const version = /v\/([0-9a-f]{8,16})\/js\//.exec(html)?.[1];
  const rules = /name=["']bloomshire-rules["']\s+content=["']([0-9a-zA-Z]+)["']/.exec(html)?.[1] || null;
  if (!version) throw new Error('No se encontro la version del juego en /play/');
  return { version, rules, html };
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch((e) => ({ error: e.message })); }
  }));
  return out;
}

async function main() {
  const { version, rules, html } = await liveVersion();
  const dest = path.join(ROOT, 'game-sources', `v-${version}`);
  const files = [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:m?js|json))"/g)].map((m) => m[1]))];
  files.push(`v/${version}/js/lang/es.json`);
  const save = (rel, data) => {
    const f = path.join(dest, ...rel.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, data);
  };

  const code = await pool(files, 8, async (f) => { save(f.replace(`v/${version}/`, ''), await get(BASE + f, { binary: true })); return true; });
  const codeFail = files.filter((_, i) => code[i]?.error);

  let art = 0;
  const artFail = [];
  const list = path.join(dest, 'assets_needed.txt');
  if (withArt && fs.existsSync(list)) {
    const paths = fs.readFileSync(list, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const res = await pool(paths, 6, async (p) => {
      const rel = `pack/${p}`;
      if (fs.existsSync(path.join(dest, ...rel.split('/')))) return true;
      save(rel, await get(BASE + 'pack/' + p.split('/').map(encodeURIComponent).join('/'), { binary: true }));
      return true;
    });
    res.forEach((r, i) => (r?.error ? artFail.push(paths[i]) : art++));
  }

  fs.writeFileSync(path.join(dest, 'VERSION.txt'), [
    `version=${version}`, `rules=${rules || ''}`, `date=${new Date().toISOString().slice(0, 19)}`,
    `ok=${files.length - codeFail.length}`, `failed=${codeFail.join(', ')}`, `art=${art}`, `artFailed=${artFail.join(', ')}`
  ].join('\n') + '\n');

  console.log(`Juego ${version}: ${files.length - codeFail.length}/${files.length} archivos${withArt ? `, arte ${art} (fallaron ${artFail.length})` : ''} -> ${path.relative(ROOT, dest)}`);
  // Un modulo que falta (o el idioma) rompe la generacion: mejor cortar aca
  const critical = codeFail.filter((f) => /game\/(codexdata|codex|skillbook|bestiary|bestiarytext|adventuretext|rules|catalog|npcs)\.js|lang\/es\.json/.test(f));
  if (critical.length) { console.error(`Faltan archivos clave: ${critical.join(', ')}`); process.exit(2); }
  console.log(`version=${version} rules=${rules || ''}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fetch_game.mjs')) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
