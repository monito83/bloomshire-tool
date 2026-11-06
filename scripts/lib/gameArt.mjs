// scripts/lib/gameArt.mjs
// Operaciones minimas sobre PNG (pngjs) para recortar el arte del juego:
// leer una hoja de sprites, recortar un cuadro, encimar capas y guardar.
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

export function readPng(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { width: png.width, height: png.height, data: png.data };
}

export function blank(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

/** Copia un rectangulo de src a dst; con `over`, mezcla por alfa (capas). */
export function blit(dst, src, sx, sy, w, h, dx = 0, dy = 0, over = false) {
  for (let y = 0; y < h; y++) {
    const syy = sy + y, dyy = dy + y;
    if (syy < 0 || syy >= src.height || dyy < 0 || dyy >= dst.height) continue;
    for (let x = 0; x < w; x++) {
      const sxx = sx + x, dxx = dx + x;
      if (sxx < 0 || sxx >= src.width || dxx < 0 || dxx >= dst.width) continue;
      const si = (syy * src.width + sxx) * 4, di = (dyy * dst.width + dxx) * 4;
      const a = src.data[si + 3];
      if (!over || a === 255) { src.data.copy(dst.data, di, si, si + 4); continue; }
      if (a === 0) continue;
      const da = dst.data[di + 3], oa = a + (da * (255 - a)) / 255;
      for (let c = 0; c < 3; c++) dst.data[di + c] = Math.round((src.data[si + c] * a + (dst.data[di + c] * da * (255 - a)) / 255) / oa);
      dst.data[di + 3] = Math.round(oa);
    }
  }
  return dst;
}

/** Caja opaca (alfa > umbral) de un rectangulo; null si esta vacio. */
export function opaqueBox(img, x0, y0, w, h, threshold = 8) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xx = x0 + x, yy = y0 + y;
    if (xx >= img.width || yy >= img.height) continue;
    if (img.data[(yy * img.width + xx) * 4 + 3] > threshold) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function writePng(file, img) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const png = new PNG({ width: img.width, height: img.height });
  img.data.copy(png.data);
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 6 }));
}
