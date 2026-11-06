/**
 * scripts/build_extension_zip.mjs — EMPAQUETA LA EXTENSION PARA DESCARGAR
 *
 * Arma public/downloads/bloomshire-companion.zip con la carpeta extension/ adentro de una carpeta
 * "bloomshire-companion/" (asi al descomprimir queda lista para "Cargar descomprimida" en Chrome).
 * Corre antes de cada build (npm run build), asi el zip siempre coincide con el manifest del repo.
 * Fechas fijas en el zip: el mismo codigo da el mismo archivo.
 *
 * Uso: node scripts/build_extension_zip.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { zipSync } from 'fflate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'extension');
const OUT_DIR = path.join(ROOT, 'public/downloads');
export const ZIP_NAME = 'bloomshire-companion.zip';
const FOLDER = 'bloomshire-companion';
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');

/** Lista los archivos de la extension (sin ocultos), con rutas relativas y barras "/". */
export function listExtensionFiles(dir = SRC, base = '') {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) out.push(...listExtensionFiles(full, rel));
    else out.push(rel);
  }
  return out;
}

export function buildExtensionZip() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const files = {};
  for (const rel of listExtensionFiles()) {
    files[`${FOLDER}/${rel}`] = [new Uint8Array(fs.readFileSync(path.join(SRC, rel))), { mtime: FIXED_DATE }];
  }
  const zip = zipSync(files, { level: 9 });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, ZIP_NAME), zip);
  return { version: manifest.version, files: Object.keys(files).length, bytes: zip.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildExtensionZip();
  console.log(`extension v${r.version}: ${r.files} archivos, ${(r.bytes / 1024).toFixed(0)} KB -> public/downloads/${ZIP_NAME}`);
}
