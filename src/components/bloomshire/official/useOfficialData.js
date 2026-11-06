// src/components/bloomshire/official/useOfficialData.js
// Datos oficiales del juego generados por scripts/build_official_data.mjs
// (public/data/bloomshire/official/*.json). Se cargan bajo demanda y se
// guardan en memoria para toda la sesion.
import { useEffect, useState } from 'react';

const BASE = '/data/bloomshire/official/';
const cache = new Map(); // nombre -> datos
const pending = new Map(); // nombre -> promesa

export function loadOfficialData(name) {
  if (cache.has(name)) return Promise.resolve(cache.get(name));
  if (!pending.has(name)) {
    pending.set(name, fetch(`${BASE}${name}.json`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        pending.delete(name);
        if (data) cache.set(name, data);
        return data;
      }));
  }
  return pending.get(name);
}

/** Carga datos ya conocidos (tests y renderizado del lado del servidor). */
export function primeOfficialData(name, data) {
  cache.set(name, data);
}

/** Devuelve los datos (o null mientras cargan / si no estan disponibles). */
export default function useOfficialData(name) {
  const [data, setData] = useState(() => cache.get(name) || null);
  useEffect(() => {
    let alive = true;
    if (!cache.has(name)) loadOfficialData(name).then((d) => { if (alive && d) setData(d); });
    return () => { alive = false; };
  }, [name]);
  return data;
}
