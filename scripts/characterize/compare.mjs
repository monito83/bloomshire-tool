// scripts/characterize/compare.mjs
// Compara dos corridas de run.mjs: textos exactos, localStorage exacto y capturas pixel a pixel.
// Uso: node scripts/characterize/compare.mjs <antes> <despues> [tolerancia-de-pixeles=0.001]
// Sale con codigo 1 si algo cambio.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [a, b, tolArg] = process.argv.slice(2);
if (!a || !b) { console.error('uso: node scripts/characterize/compare.mjs <antes> <despues> [tolerancia]'); process.exit(1); }
const tolerance = Number(tolArg ?? 0.001);   // fraccion de pixeles distintos permitida

const files = [...new Set([...fs.readdirSync(a), ...fs.readdirSync(b)])].sort();
let failed = 0;
const report = (ok, msg) => { if (!ok) failed += 1; console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };

function firstDiff(x, y) {
  const lx = x.split('\n'), ly = y.split('\n');
  for (let i = 0; i < Math.max(lx.length, ly.length); i++) {
    if (lx[i] !== ly[i]) return `linea ${i + 1}: "${(lx[i] ?? '').slice(0, 80)}" -> "${(ly[i] ?? '').slice(0, 80)}"`;
  }
  return '';
}

for (const f of files) {
  const pa = path.join(a, f), pb = path.join(b, f);
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) { report(false, `${f}: falta en ${fs.existsSync(pa) ? 'despues' : 'antes'}`); continue; }
  if (f.endsWith('.png')) {
    const ia = PNG.sync.read(fs.readFileSync(pa)), ib = PNG.sync.read(fs.readFileSync(pb));
    if (ia.width !== ib.width || ia.height !== ib.height) { report(false, `${f}: tamano distinto`); continue; }
    let diff = 0;
    for (let i = 0; i < ia.data.length; i += 4) {
      if (Math.abs(ia.data[i] - ib.data[i]) > 8 || Math.abs(ia.data[i + 1] - ib.data[i + 1]) > 8 || Math.abs(ia.data[i + 2] - ib.data[i + 2]) > 8) diff += 1;
    }
    const ratio = diff / (ia.width * ia.height);
    report(ratio <= tolerance, `${f}: ${(ratio * 100).toFixed(3)}% de pixeles distintos`);
  } else {
    // Las cuentas regresivas (mm:ss) se comparan al minuto: cada tarjeta avanza de a 1 s desde el momento en que se
    // monto, y con el reloj simulado ese momento puede caer unos ms antes o despues segun el orden de los efectos.
    const loose = (t) => (/monitors|timer/.test(f) ? t.replace(/\b(\d{2}):(\d{2})\b/g, '$1:ss') : t);
    const ta = loose(fs.readFileSync(pa, 'utf8')), tb = loose(fs.readFileSync(pb, 'utf8'));
    report(ta === tb, `${f}${ta === tb ? '' : `: ${firstDiff(ta, tb)}`}`);
  }
}
console.log(failed ? `\n${failed} diferencias` : '\nsin diferencias');
process.exit(failed ? 1 : 0);
