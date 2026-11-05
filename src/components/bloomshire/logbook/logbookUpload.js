// src/components/bloomshire/logbook/logbookUpload.js
// Subida de imagenes y PDF de la bitacora:
//   1) en el navegador: reduce (max 2000 px) y convierte a WebP; los sprites
//      chicos (<= 256 px) y los GIF se suben tal cual para no arruinarlos;
//   2) pide al servidor una URL firmada (upload_sign);
//   3) sube directo a Supabase Storage con progreso (XHR);
//   4) registra el archivo en logbook_media (media_register).
import { AdminApiError } from './logbookAdminApi';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 2000;
const WEBP_QUALITY = 0.86;
const KEEP_ORIGINAL_MAX_SIDE = 256;
export const IMAGE_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'];
export const ACCEPT_IMAGES = IMAGE_TYPES.join(',');
export const ACCEPT_PDF = 'application/pdf';

/** Tamaño final manteniendo proporcion (nunca agranda). */
export function fitWithin(width, height, max = MAX_IMAGE_SIDE) {
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* cae al metodo <img> */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new AdminApiError('invalid_image', 0)); };
    img.src = url;
  });
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Devuelve { blob, mime, width, height } listo para subir. */
export async function prepareImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new AdminApiError('invalid_file_type', 0);
  const bitmap = await decode(file);
  const srcW = bitmap.width || bitmap.naturalWidth;
  const srcH = bitmap.height || bitmap.naturalHeight;
  const keepOriginal = file.type === 'image/gif' || Math.max(srcW, srcH) <= KEEP_ORIGINAL_MAX_SIDE;
  if (keepOriginal) {
    if (bitmap.close) bitmap.close();
    if (file.size > MAX_UPLOAD_BYTES) throw new AdminApiError('file_too_large', 0);
    return { blob: file, mime: file.type, width: srcW, height: srcH };
  }
  const { width, height } = fitWithin(srcW, srcH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (bitmap.close) bitmap.close();
  let blob = await toBlob(canvas, 'image/webp', WEBP_QUALITY);
  let mime = 'image/webp';
  // Navegadores sin WebP devuelven PNG: aceptarlo igual
  if (blob && blob.type && blob.type !== 'image/webp') mime = blob.type;
  // Si la conversion no ayudo (y no hubo que achicar), conservar el original
  if (!blob || (blob.size >= file.size && width === srcW && file.size <= MAX_UPLOAD_BYTES)) {
    blob = file;
    mime = file.type;
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new AdminApiError('file_too_large', 0);
  return { blob, mime, width, height: blob === file ? srcH : height };
}

function putWithProgress(url, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new AdminApiError('upload_failed', xhr.status)));
    xhr.onerror = () => reject(new AdminApiError('network_error', 0));
    const form = new FormData();
    form.append('cacheControl', '31536000');
    form.append('', blob);
    xhr.send(form);
  });
}

/**
 * Sube una imagen o un PDF. Devuelve { path, mime, bytes, width, height, publicUrl }.
 * `call` es la funcion de llamada al admin con el token ya aplicado.
 */
export async function uploadMedia(file, { call, onProgress } = {}) {
  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !IMAGE_TYPES.includes(file.type)) throw new AdminApiError('invalid_file_type', 0);
  const prepared = isPdf
    ? { blob: file, mime: file.type, width: null, height: null }
    : await prepareImage(file);
  if (prepared.blob.size > MAX_UPLOAD_BYTES) throw new AdminApiError('file_too_large', 0);
  if (onProgress) onProgress(0.02);
  const signed = await call('upload_sign', { mime: prepared.mime, bytes: prepared.blob.size });
  await putWithProgress(signed.uploadUrl, prepared.blob, (p) => onProgress && onProgress(0.05 + p * 0.9));
  await call('media_register', {
    path: signed.path,
    mime: prepared.mime,
    bytes: prepared.blob.size,
    width: prepared.width || null,
    height: prepared.height || null
  });
  if (onProgress) onProgress(1);
  return {
    path: signed.path,
    mime: prepared.mime,
    bytes: prepared.blob.size,
    width: prepared.width || null,
    height: prepared.height || null,
    publicUrl: signed.publicUrl,
    name: file.name || ''
  };
}

/** Archivos de imagen dentro de un evento de pegar o soltar. */
export function imageFilesFrom(dataTransfer) {
  if (!dataTransfer) return [];
  const files = Array.from(dataTransfer.files || []);
  if (files.length) return files.filter((f) => IMAGE_TYPES.includes(f.type));
  return Array.from(dataTransfer.items || [])
    .filter((it) => it.kind === 'file' && IMAGE_TYPES.includes(it.type))
    .map((it) => it.getAsFile())
    .filter(Boolean);
}

