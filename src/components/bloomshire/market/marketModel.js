// src/components/bloomshire/market/marketModel.js
// Modelo puro del Radar de Mercado (Market Hall / Rowan).
//
// Fuente: el tablero del Mercado del juego, GET /play/api/offers (game/session.js offers()):
//   stalls   puestos abiertos de todos     { id, item, price, coin, left, byName, slot, held }
//   recent   ultimas ventas de todos       { item, n, price, total, coin, at, slot }   (sin nombres)
//   history  tus ventas y compras          { side: 'sold'|'bought', item, n, price, total, fee, coin, who, at }
//   myStalls tus puestos                   { id, item, price, coin, left, status, proceeds }
// Precios en unidades de la moneda (catalog.js COINS): gold y shards x1, $AVYN x1e6.
// Las estadisticas de precio se calculan en Oro; las otras monedas se cuentan aparte.

export const MARKET_FEE_RATE = 0.025;      // catalog.js marketFee: 2.5% de lo cobrado, al vendedor
export const HOUR = 3600e3;
export const DAY = 24 * HOUR;
export const SALES_KEEP_MS = 45 * DAY;     // cuanto historial guardamos en el navegador
export const SALES_KEEP_MAX = 20000;
export const SUPPLY_KEEP_MAX = 600;        // fotos de la oferta (una por actualizacion)

export const COIN_UNIT = { gold: 1, shards: 1, avyn: 1e6, eth: 1e9, usdg: 1e6 };

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Valor en la moneda (no en sus unidades minimas). */
export const coinAmount = (coin, units) => num(units) / (COIN_UNIT[coin] || 1);

/** El tablero tal como llega de la extension, saneado. Devuelve null si no parece un tablero. */
export function normalizeBoard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const arr = (v) => (Array.isArray(v) ? v : []);
  if (!Array.isArray(raw.stalls) && !Array.isArray(raw.recent) && !Array.isArray(raw.history)) return null;
  const stalls = arr(raw.stalls)
    .map((o) => ({
      id: o?.id ?? null,
      item: str(o?.item),
      price: num(o?.price),
      coin: str(o?.coin) || 'gold',
      left: Math.max(0, num(o?.left)) || 1,
      seller: str(o?.byName),
      tool: o?.slot?.uses != null,
      held: o?.held || null
    }))
    .filter((o) => o.item && o.price > 0);
  const recent = arr(raw.recent).map(normalizeSale).filter(Boolean);
  const history = arr(raw.history)
    .map((e) => {
      const s = normalizeSale(e);
      if (!s) return null;
      return { ...s, side: e.side === 'bought' ? 'bought' : 'sold', fee: num(e.fee), who: str(e.who) };
    })
    .filter(Boolean);
  const myStalls = arr(raw.myStalls)
    .map((o) => ({
      id: o?.id ?? null,
      item: str(o?.item),
      price: num(o?.price),
      coin: str(o?.coin) || 'gold',
      left: Math.max(0, num(o?.left)),
      status: str(o?.status) || 'open',
      proceeds: Math.max(0, num(o?.proceeds))
    }))
    .filter((o) => o.item);
  return { stalls, recent, history, myStalls };
}

function normalizeSale(e) {
  if (!e || typeof e !== 'object') return null;
  const item = str(e.item);
  const n = Math.max(1, Math.round(num(e.n) || 1));
  const at = num(e.at);
  let price = num(e.price);
  let total = num(e.total);
  if (!total && price) total = price * n;
  if (!price && total) price = total / n;
  if (!item || !at || price <= 0) return null;
  return { item, n, price, total, coin: str(e.coin) || 'gold', at };
}

/** Clave estable de una venta (las ventas no traen id). */
export const saleKey = (s) => `${s.at}|${s.item}|${s.n}|${s.total}|${s.coin}`;

/**
 * Suma las ventas nuevas al historial guardado: sin duplicados, de la mas nueva a la mas vieja,
 * sin las de hace mas de SALES_KEEP_MS y como mucho SALES_KEEP_MAX.
 * Devuelve { sales, added }.
 */
export function mergeSales(stored, incoming, now = Date.now()) {
  const seen = new Set();
  const out = [];
  let added = 0;
  const oldest = now - SALES_KEEP_MS;
  const push = (s, isNew) => {
    if (!s || s.at < oldest) return;
    const k = saleKey(s);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
    if (isNew) added += 1;
  };
  (Array.isArray(stored) ? stored : []).forEach((s) => push(s, false));
  (Array.isArray(incoming) ? incoming : []).forEach((s) => push(s, true));
  out.sort((a, b) => b.at - a.at);
  return { sales: out.slice(0, SALES_KEEP_MAX), added };
}

/** Foto de la oferta: por item, cuantos puestos, cuantas unidades y el mas barato en Oro. */
export function supplySnapshot(stalls, at = Date.now()) {
  const items = {};
  (stalls || []).forEach((o) => {
    if (o.tool) return;
    const r = items[o.item] || (items[o.item] = { l: 0, u: 0, min: 0 });
    r.l += 1;
    r.u += o.left;
    if (o.coin === 'gold' && (!r.min || o.price < r.min)) r.min = o.price;
  });
  return { at, items };
}

export function mergeSupply(stored, snap) {
  const list = (Array.isArray(stored) ? stored : []).filter((s) => s && s.at && s.at !== snap.at);
  list.push(snap);
  list.sort((a, b) => a.at - b.at);
  return list.slice(-SUPPLY_KEEP_MAX);
}

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Mediana ponderada por unidades (una venta de 20 pesa mas que una de 1). */
export function weightedMedian(sales) {
  const list = sales.filter((s) => s.price > 0).map((s) => ({ p: s.price, w: s.n })).sort((a, b) => a.p - b.p);
  const total = list.reduce((acc, x) => acc + x.w, 0);
  if (!total) return null;
  let run = 0;
  for (const x of list) {
    run += x.w;
    if (run >= total / 2) return x.p;
  }
  return list[list.length - 1].p;
}

/** Estadisticas de un item (en Oro). `sales` y `stalls` pueden traer otros items: se filtran. */
export function itemStats(item, sales, stalls, now = Date.now()) {
  const all = (sales || []).filter((s) => s.item === item);
  const gold = all.filter((s) => s.coin === 'gold');
  const d1 = gold.filter((s) => s.at >= now - DAY);
  const d7 = gold.filter((s) => s.at >= now - 7 * DAY);
  const prev = gold.filter((s) => s.at < now - DAY && s.at >= now - 7 * DAY);
  const units = (list) => list.reduce((acc, s) => acc + s.n, 0);
  const goldOf = (list) => list.reduce((acc, s) => acc + s.total, 0);

  const live = (stalls || []).filter((o) => o.item === item && !o.tool);
  const liveGold = live.filter((o) => o.coin === 'gold').sort((a, b) => a.price - b.price);
  const median24 = weightedMedian(d1);
  const median7 = weightedMedian(d7);
  const medianPrev = weightedMedian(prev);
  const ref = median24 ?? median7 ?? weightedMedian(gold);
  const trendPct = median24 != null && medianPrev ? ((median24 - medianPrev) / medianPrev) * 100 : null;

  // velocidad: unidades por dia sobre la ventana que de verdad tenemos cubierta
  const firstAt = gold.length ? gold[gold.length - 1].at : null;
  const spanDays = firstAt ? Math.max(1 / 24, Math.min(7, (now - firstAt) / DAY)) : null;
  const perDay = spanDays ? units(d7) / spanDays : 0;

  return {
    item,
    sales: all.length,
    goldSales: gold.length,
    otherCoinSales: all.length - gold.length,
    last: gold[0] || null,
    lastAt: all[0]?.at || null,
    median24,
    median7,
    ref,
    trendPct,
    sales24: d1.length,
    units24: units(d1),
    units7: units(d7),
    gold24: goldOf(d1),
    gold7: goldOf(d7),
    perDay,
    low7: d7.length ? Math.min(...d7.map((s) => s.price)) : null,
    high7: d7.length ? Math.max(...d7.map((s) => s.price)) : null,
    listings: live.length,
    unitsListed: live.reduce((acc, o) => acc + o.left, 0),
    cheapest: liveGold[0]?.price ?? null,
    cheapestOther: live.find((o) => o.coin !== 'gold') || null
  };
}

/** Todos los items con actividad (ventas o puestos), con sus estadisticas. */
export function marketTable(sales, stalls, now = Date.now()) {
  const ids = new Set();
  (sales || []).forEach((s) => ids.add(s.item));
  (stalls || []).forEach((o) => { if (!o.tool) ids.add(o.item); });
  return [...ids].map((id) => itemStats(id, sales, stalls, now));
}

/** Serie diaria (o por hora) de un item: unidades vendidas y precio mediano, para graficos. */
export function itemSeries(item, sales, { now = Date.now(), buckets = 14, size = DAY } = {}) {
  const start = Math.floor((now - buckets * size) / size) * size + size;
  const out = Array.from({ length: buckets }, (_, i) => ({ at: start + i * size, units: 0, gold: 0, median: null, list: [] }));
  (sales || []).forEach((s) => {
    if (s.item !== item || s.coin !== 'gold') return;
    const i = Math.floor((s.at - start) / size);
    if (i < 0 || i >= buckets) return;
    out[i].units += s.n;
    out[i].gold += s.total;
    out[i].list.push(s);
  });
  out.forEach((b) => { b.median = weightedMedian(b.list); delete b.list; });
  return out;
}

/** Precio sugerido para publicar: apenas por debajo del mas barato, sin regalar por debajo del mercado. */
export function suggestListPrice(stats) {
  if (!stats) return null;
  const ref = stats.ref;
  const cheapest = stats.cheapest;
  if (ref == null && cheapest == null) return null;
  if (ref == null) return Math.max(1, cheapest - 1);
  const floor = Math.max(1, Math.round(ref * 0.9));
  if (cheapest == null) return Math.max(1, Math.round(ref));
  return Math.max(floor, Math.min(Math.round(ref * 1.05), cheapest - 1));
}

export const netAfterFee = (gold) => Math.max(0, gold - Math.max(gold > 1 ? 1 : 0, Math.floor((gold * 250 + 5000) / 10000)));

/** "Sells for 1,950 Gold at a shop" -> 1950 (precio de venta en tienda del Codex). */
export function parseShopPrice(worthEn) {
  const m = /([\d,.]+)\s*Gold/i.exec(String(worthEn || ''));
  if (!m) return null;
  const n = Number(m[1].replace(/[,.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Que tan rapido se vende: 'fast' | 'steady' | 'slow' | 'none'. */
export function liquidity(stats, qty = 1) {
  if (!stats || !stats.goldSales) return 'none';
  if (stats.units24 >= Math.max(3, qty) || stats.sales24 >= 5) return 'fast';
  if (stats.perDay >= 1) return 'steady';
  return 'slow';
}

/**
 * Plan de oro rapido sobre tu stock.
 * stock: { [itemId]: cantidad }  shop: { [itemId]: precio tienda }  quota: { [itemId]: unidades que la tienda te compra hoy }
 * reserved: { [itemId]: unidades que pide una mision activa } (esas no se venden; el excedente si).
 * Por item: canal recomendado ('shop' | 'market' | 'keep'), cantidad, oro esperado y cuanto tardaria.
 */
export function quickGoldPlan({ stock = {}, statsById = {}, shop = {}, quota = {}, reserved = {} }) {
  const rows = [];
  Object.entries(stock).forEach(([item, owned]) => {
    if (!(owned > 0)) return;
    const keep = Math.min(owned, Math.max(0, reserved[item] || 0));
    const qty = owned - keep;
    const st = statsById[item] || null;
    const shopUnit = shop[item] || null;
    const listPrice = suggestListPrice(st);
    const marketNet = listPrice ? netAfterFee(listPrice) : null;
    const liq = liquidity(st, qty);
    const isProtected = qty <= 0;
    if (!shopUnit && !marketNet && !isProtected) return;

    let channel = 'shop';
    if (isProtected) channel = 'keep';
    else if (!shopUnit) channel = 'market';
    else if (marketNet && liq !== 'none' && liq !== 'slow' && marketNet >= shopUnit * 1.1) channel = 'market';

    const shopQty = shopUnit ? Math.min(qty, quota[item] ?? qty) : 0;
    if (channel === 'shop' && shopQty <= 0 && marketNet) channel = 'market';   // la tienda ya no te compra mas hoy
    // en el mercado: lo que el mercado absorbe en ~2 dias, minimo 1
    const marketQty = marketNet ? (liq === 'none' ? qty : Math.max(1, Math.min(qty, Math.ceil((st?.perDay || 1) * 2)))) : 0;
    const qtyNow = channel === 'market' ? marketQty : channel === 'shop' ? shopQty : 0;
    const unitNow = channel === 'market' ? marketNet : channel === 'shop' ? shopUnit : 0;
    const daysToSell = channel === 'market' && st?.perDay ? qty / st.perDay : null;

    rows.push({
      item,
      qty: isProtected ? owned : qty,
      owned,
      reservedQty: keep,
      channel,
      isProtected,
      shopUnit,
      shopQty,
      listPrice,
      marketNet,
      liquidity: liq,
      qtyNow,
      goldNow: qtyNow * (unitNow || 0),
      goldAll: (isProtected ? 0 : qty) * Math.max(shopUnit || 0, marketNet || 0),
      daysToSell,
      stats: st
    });
  });
  const rank = (r) => (r.channel === 'keep' ? -1 : r.goldNow * (r.channel === 'shop' || r.liquidity === 'fast' ? 1.2 : 1));
  return rows.sort((a, b) => rank(b) - rank(a));
}

/** Resumen de tus ventas (del historial propio del tablero) y lo que tenes para cobrar. */
export function mySummary(board, now = Date.now()) {
  const hist = board?.history || [];
  const sold = hist.filter((h) => h.side === 'sold' && h.coin === 'gold');
  const in24 = sold.filter((h) => h.at >= now - DAY);
  const in7 = sold.filter((h) => h.at >= now - 7 * DAY);
  const net = (list) => list.reduce((acc, h) => acc + h.total - (h.fee || 0), 0);
  const stalls = board?.myStalls || [];
  return {
    gold24: net(in24),
    gold7: net(in7),
    sales7: in7.length,
    openStalls: stalls.filter((o) => o.status === 'open').length,
    toCollect: stalls.filter((o) => o.coin === 'gold').reduce((acc, o) => acc + o.proceeds, 0),
    stalls
  };
}
