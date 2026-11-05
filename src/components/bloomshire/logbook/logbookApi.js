// src/components/bloomshire/logbook/logbookApi.js
// Cliente de /api/logbook. En desarrollo local (vite dev no ejecuta /api) cae a
// datos de demostracion; en produccion un fallo se muestra como error real.
import { sanitizeBlocks, searchEntries, entryPlainText, normalizeText } from './logbookModel';

const API = '/api/logbook';

const isDev = () => {
  try { return Boolean(import.meta.env && import.meta.env.DEV); } catch { return false; }
};

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    const err = new Error('not_json');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (!res.ok || !data || data.ok === false) {
    const err = new Error((data && data.error) || `http_${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

let demoModule = null;
const loadDemo = async () => {
  // En produccion import.meta.env.DEV es false: el import queda como codigo muerto y no entra al build
  if (!import.meta.env.DEV) throw new Error('demo_disabled');
  if (!demoModule) demoModule = await import('./logbookDemoData.js');
  return demoModule;
};

const shouldUseDemo = (err) => isDev() && (err.message === 'not_json' || err.message === 'not_configured' || err.status === 404 || err.status === 503);

export async function fetchLogbookIndex(signal) {
  try {
    return await getJson(`${API}?action=index`, signal);
  } catch (err) {
    if (err.name !== 'AbortError' && shouldUseDemo(err)) return (await loadDemo()).DEMO_INDEX;
    throw err;
  }
}

export async function fetchLogbookEntry(id, { demo = false, signal } = {}) {
  if (demo) {
    const e = (await loadDemo()).getDemoEntry(id);
    if (!e) { const err = new Error('not_found'); err.status = 404; throw err; }
    return { ...e, blocks: sanitizeBlocks(e.blocks) };
  }
  const data = await getJson(`${API}?action=entry&id=${encodeURIComponent(id)}`, signal);
  return { ...data.entry, blocks: sanitizeBlocks(data.entry.blocks) };
}

export async function searchLogbook(q, { demo = false, signal } = {}) {
  if (demo) {
    const { DEMO_ENTRIES } = await loadDemo();
    return searchEntries(DEMO_ENTRIES.map((e) => ({ ...e, _plain: normalizeText(entryPlainText(e)) })), q, { limit: 40 })
      .map(({ entry, score }) => { const { blocks, _plain, ...meta } = entry; return { ...meta, score, snippet: '' }; });
  }
  const data = await getJson(`${API}?action=search&q=${encodeURIComponent(q)}`, signal);
  return data.results || [];
}
