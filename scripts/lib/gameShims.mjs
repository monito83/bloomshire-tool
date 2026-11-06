// scripts/lib/gameShims.mjs
// Entorno minimo de navegador para poder importar los modulos del juego en Node
// (solo los que calculan datos: codexdata, skillbook, bestiary, adventuretext...).
// No hay red: cualquier fetch que no sea un archivo de idioma local falla a proposito.
import fs from 'fs';
import path from 'path';
export function installShims(srcRoot) {
  const noop = () => {};
  const elStub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'style' || k === 'dataset' || k === 'classList' ? {add: noop, remove: noop, toggle: noop} : elStub()), apply: () => elStub() });
  globalThis.window = globalThis;
  globalThis.document = { baseURI: 'https://bloomshire.xyz/play/', createElement: () => elStub(), body: elStub(), head: elStub(), addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], documentElement: elStub(), fonts: { load: async () => {} } };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.navigator ??= { userAgent: 'node', language: 'en' };
  globalThis.addEventListener = noop; globalThis.removeEventListener = noop;
  globalThis.requestAnimationFrame = noop; globalThis.matchMedia = () => ({ matches: false, addEventListener: noop });
  globalThis.Image = class { set src(v) {} };
  globalThis.location ??= { href: 'https://bloomshire.xyz/play/', search: '', hostname: 'bloomshire.xyz', origin: 'https://bloomshire.xyz', pathname: '/play/' };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const m = u.match(/js\/lang\/([a-z-]+)\.json/);
    if (m) {
      const file = path.join(srcRoot, 'js', 'lang', `${m[1]}.json`);
      const body = fs.readFileSync(file, 'utf8');
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`fetch bloqueado en la generacion: ${u}`);
  };
  return realFetch;
}
