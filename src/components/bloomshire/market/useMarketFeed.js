// src/components/bloomshire/market/useMarketFeed.js
// Recibe el tablero del Mercado desde la extension y lo acumula en el navegador:
//  - el ultimo tablero (puestos, ventas recientes, tu historial, tus puestos)
//  - el historial de ventas de todos, sin duplicados (para estadisticas de dias/semanas)
//  - fotos de la oferta en cada actualizacion (para ver como cambia la competencia)
// Pide datos con REQUEST_MARKET_SALES_SYNC (la extension consulta /play/api/offers en la pestana del juego,
// la misma lectura que hace el juego al abrir el Mercado) y avisa si salio bien, cuando, y si fallo por que.
import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeSales, mergeSupply, normalizeBoard, supplySnapshot } from './marketModel';

export const BOARD_KEY = 'bloomshire_cached_market_offers';   // lo escribe tambien la extension (content_monios.js)
export const SALES_KEY = 'bloomshire_market_sales_v1';
export const SUPPLY_KEY = 'bloomshire_market_supply_v1';
export const AUTO_KEY = 'bloomshire_market_auto';
export const REQUEST_TIMEOUT_MS = 12000;
export const AUTO_EVERY_MS = 5 * 60e3;

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cuota o modo privado */ }
};

// ventas guardadas en forma compacta: [at, item, n, total, coin]
const packSales = (sales) => sales.map((s) => [s.at, s.item, s.n, s.total, s.coin]);
const unpackSales = (rows) => (Array.isArray(rows) ? rows : [])
  .map((r) => (Array.isArray(r) ? { at: r[0], item: r[1], n: r[2], total: r[3], coin: r[4] || 'gold', price: r[3] / (r[2] || 1) } : null))
  .filter((s) => s && s.item && s.at);

function initialState() {
  const cached = read(BOARD_KEY, null);
  const board = normalizeBoard(cached?.offers);
  const sales = mergeSales(unpackSales(read(SALES_KEY, [])), board?.recent || []).sales;
  return { board, boardAt: board ? cached?.timestamp || null : null, sales, supply: read(SUPPLY_KEY, []) };
}

export default function useMarketFeed() {
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState({ kind: 'idle' });   // idle | loading | ok | error
  const [auto, setAutoState] = useState(() => read(AUTO_KEY, false) === true);
  const timer = useRef(null);
  const pending = useRef(false);
  const current = useRef(state);
  current.current = state;

  const ingest = useCallback((offers, ts) => {
    const board = normalizeBoard(offers);
    if (!board) return false;
    const at = Number(ts) || Date.now();
    const prev = current.current;
    const merged = mergeSales(prev.sales, board.recent, at);
    const added = merged.added;
    const supply = mergeSupply(prev.supply, supplySnapshot(board.stalls, at));
    write(SALES_KEY, packSales(merged.sales));
    write(SUPPLY_KEY, supply);
    const next = { board, boardAt: at, sales: merged.sales, supply };
    current.current = next;
    setState(next);
    clearTimeout(timer.current);
    if (pending.current) {
      pending.current = false;
      setStatus({ kind: 'ok', at, added, stalls: board.stalls.length });
    }
    return true;
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== window) return;
      const d = event.data;
      if (d?.type === 'MONIOS_MARKET_SNAPSHOT' && d.offers) {
        ingest(d.offers, d.timestamp);
      } else if (d?.type === 'MONIOS_MARKET_SNAPSHOT_ERROR' && pending.current) {
        pending.current = false;
        clearTimeout(timer.current);
        setStatus({ kind: 'error', at: Date.now(), reason: d.reason || (/no detectada|not found/i.test(d.error || '') ? 'no_game_tab' : 'game_error'), detail: d.error || '' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(timer.current); };
  }, [ingest]);

  const refresh = useCallback(() => {
    pending.current = true;
    setStatus({ kind: 'loading', at: Date.now() });
    try { window.postMessage({ type: 'REQUEST_MARKET_SALES_SYNC' }, '*'); } catch { /* sin ventana */ }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!pending.current) return;
      pending.current = false;
      setStatus({ kind: 'error', at: Date.now(), reason: 'timeout' });
    }, REQUEST_TIMEOUT_MS);
  }, []);

  // actualizacion automatica opcional mientras el radar esta abierto y la pestana visible
  useEffect(() => {
    if (!auto) return undefined;
    const tick = () => { if (document.visibilityState === 'visible' && !pending.current) refresh(); };
    const id = setInterval(tick, AUTO_EVERY_MS);
    return () => clearInterval(id);
  }, [auto, refresh]);

  const setAuto = useCallback((v) => { setAutoState(v); write(AUTO_KEY, !!v); }, []);

  const clearHistory = useCallback(() => {
    write(SALES_KEY, []);
    write(SUPPLY_KEY, []);
    setState((prev) => ({ ...prev, sales: prev.board ? prev.board.recent.slice().sort((a, b) => b.at - a.at) : [], supply: [] }));
  }, []);

  return { ...state, status, refresh, auto, setAuto, clearHistory, ingest };
}
