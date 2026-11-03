// io.js -- talking to the editor's server (server.mjs). Nothing else in the
// editor knows URLs.

import { serverURL } from './util.js';

async function call(method, url, body, { headers, full = false } = {}) {
  let r;
  try {
    r = await fetch(serverURL(url), {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : null), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
  } catch {
    const e = new Error('the editor server is not running (start it with Start Map Editor.bat)');
    e.status = 0;
    throw e;
  }
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const e = new Error(data?.error ?? `${r.status} ${r.statusText}`);
    e.status = r.status;
    // a save refused because someone else saved first carries their name
    if (data && typeof data === 'object') Object.assign(e, data);
    throw e;
  }
  return full ? { data, res: r } : data;
}

const header = (res, name) => { try { return decodeURIComponent(res.headers.get(name) ?? ''); } catch { return ''; } };

const enc = encodeURIComponent;

export const listMaps = () => call('GET', '/api/maps');
export const getMap = (id) => call('GET', `/api/maps/${enc(id)}`);

/** Move a map to the bin (maps/.deleted). `purge` erases it -- scratch servers only. */
export const deleteMap = (id, { purge = false } = {}) => call('DELETE', `/api/maps/${enc(id)}${purge ? '?purge=1' : ''}`);
/** The maps in the bin, newest first. */
export const listDeleted = () => call('GET', '/api/deleted');
/** Take a map back out of the bin (under its own id if that is still free). */
export const restoreDeleted = (file) => call('POST', `/api/deleted/${enc(file)}/restore`, {});
/** Erase one map from the bin -- scratch servers (the self-test) only. */
export const purgeDeleted = (file) => call('DELETE', `/api/deleted/${enc(file)}`);

/**
 * A map AND the revision it is at.
 *
 * The revision is what makes shared editing safe: hand it back on save and the
 * server can tell whether anyone else has saved in the meantime.
 */
export async function openMapFile(id) {
  const { data, res } = await call('GET', `/api/maps/${enc(id)}`, undefined, { full: true });
  return { json: data, rev: res.headers.get('x-map-rev') ?? '', savedBy: header(res, 'x-map-saved-by') };
}

/**
 * Save. `rev` is the revision this copy started from; the server refuses the
 * save if someone else has moved it on. Passing rev: '' means "I have seen the
 * warning and I mean it", which is the choice the editor offers afterwards.
 */
export const putMap = (id, json, { overwrite = true, rev, as = '' } = {}) =>
  call('PUT', `/api/maps/${enc(id)}?overwrite=${overwrite ? 1 : 0}${as ? `&by=${enc(as)}` : ''}`, json,
       rev === undefined ? undefined : { headers: { 'X-Map-Rev': rev } });

/** Say "I am in this map", and find out who else is. */
export const checkIn = (id, as = '') => call('POST', `/api/maps/${enc(id)}/here${as ? `?name=${enc(as)}` : ''}`, {});

/** Who is at this keyboard. Hosted the door answers; on your own machine, nobody. */
export const whoami = () => call('GET', '/api/whoami');
export const getRecovery = (id) => call('GET', `/api/maps/${enc(id)}/recovery`);
export const putRecovery = (id, json) => call('PUT', `/api/maps/${enc(id)}/recovery`, json);
export const deleteRecovery = (id) => call('DELETE', `/api/maps/${enc(id)}/recovery`);
export const putExport = (id, text) => call('PUT', `/api/exports/${enc(id)}`, text);
export const getPrefabs = () => call('GET', '/api/prefabs');
export const putPrefabs = (json) => call('PUT', '/api/prefabs', json);
export const listReferences = () => call('GET', '/api/reference');
export const putReference = (name, dataUrl) => call('PUT', `/api/reference/${enc(name)}`, dataUrl);
export const deleteReference = (name) => call('DELETE', `/api/reference/${enc(name)}`);
export const rebuildManifest = () => call('POST', '/api/manifest/rebuild');
export const info = () => call('GET', '/api/info');
