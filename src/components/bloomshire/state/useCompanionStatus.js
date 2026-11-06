// src/components/bloomshire/state/useCompanionStatus.js
// ¿Esta instalada la extension Bloomshire Companion, y en que version?
// - Desde la 1.3.0 la extension deja su version en <html data-bloomshire-companion="x.y.z">,
//   la anuncia con MONIOS_COMPANION_READY y responde a MONIOS_COMPANION_PING.
// - Las versiones anteriores no dicen su version: si mandan datos de la partida
//   (MONIOS_COMPANION_SYNC) estan instaladas pero viejas.
import { useCallback, useEffect, useState } from 'react';
import manifest from '../../../../extension/manifest.json';

export const LATEST_EXTENSION_VERSION = manifest.version;
export const EXTENSION_ZIP_URL = '/downloads/bloomshire-companion.zip';
const ATTR = 'data-bloomshire-companion';
const SETTLE_MS = 1200;

let legacySeenAt = 0;
/** Lo llama useCompanionSync cuando llegan datos de la extension. */
export function markCompanionSeen() { legacySeenAt = Date.now(); }

/** -1, 0 o 1 comparando versiones "x.y.z" (lo que no es numero cuenta como 0). */
export function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** 'checking' | 'missing' | 'outdated' | 'ok' */
export function companionState({ version, legacy, settled }, latest = LATEST_EXTENSION_VERSION) {
  if (version) return compareVersions(version, latest) < 0 ? 'outdated' : 'ok';
  if (legacy) return 'outdated';
  return settled ? 'missing' : 'checking';
}

const readAttr = () => {
  try { return document.documentElement.getAttribute(ATTR) || null; } catch { return null; }
};

export default function useCompanionStatus() {
  const [version, setVersion] = useState(readAttr);
  const [legacy, setLegacy] = useState(() => legacySeenAt > 0);
  const [settled, setSettled] = useState(false);

  const ping = useCallback(() => {
    setSettled(false);
    try { window.postMessage({ type: 'MONIOS_COMPANION_PING', game: 'bloomshire' }, '*'); } catch { /* sin ventana */ }
    const id = setTimeout(() => {
      setVersion((v) => v || readAttr());
      setLegacy(legacySeenAt > 0);
      setSettled(true);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== window || event.data?.game !== 'bloomshire') return;
      if (event.data.type === 'MONIOS_COMPANION_READY') {
        setVersion(typeof event.data.version === 'string' ? event.data.version : null);
        // las versiones viejas anunciaban "1.0.0" fijo: igual cuentan como desactualizadas
        setSettled(true);
      } else if (event.data.type === 'MONIOS_COMPANION_SYNC') {
        setLegacy(true);
      }
    };
    window.addEventListener('message', onMessage);
    const stop = ping();
    return () => { window.removeEventListener('message', onMessage); stop(); };
  }, [ping]);

  const state = companionState({ version, legacy, settled });
  return { state, version, latest: LATEST_EXTENSION_VERSION, zipUrl: EXTENSION_ZIP_URL, recheck: ping };
}
