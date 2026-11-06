import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import fs from 'fs';

import i18n from '../src/i18n/index';
import {
  normalizeBoard, mergeSales, saleKey, itemStats, marketTable, itemSeries, suggestListPrice, netAfterFee,
  parseShopPrice, liquidity, quickGoldPlan, mySummary, supplySnapshot, mergeSupply, weightedMedian, coinAmount,
  DAY, HOUR, SALES_KEEP_MS
} from '../src/components/bloomshire/market/marketModel';
import MarketRadar from '../src/components/bloomshire/market/MarketRadar';
import MarketItemModal from '../src/components/bloomshire/market/MarketItemModal';
import { makeFormat } from '../src/components/bloomshire/market/marketFormat';
import { BOARD_KEY, SALES_KEY } from '../src/components/bloomshire/market/useMarketFeed';

const NOW = Date.UTC(2026, 10, 5, 23, 0, 0);

// Tablero con la forma de /play/api/offers (game/session.js offers(), game/ui.js #stalls/#saleRow/#historyRow)
const rawBoard = {
  open: [],
  mine: [],
  stalls: [
    { id: 's1', item: 'Copper Bar', price: 80, coin: 'gold', left: 10, byName: 'Ana' },
    { id: 's2', item: 'Copper Bar', price: 74, coin: 'gold', left: 4, byName: 'Beto' },
    { id: 's3', item: 'Copper Bar', price: 5, coin: 'shards', left: 3, byName: 'Cris' },
    { id: 's4', item: 'Iron Pickaxe', price: 900, coin: 'gold', left: 1, slot: { uses: 40 } },
    { id: 's5', item: 'Plank', price: 2000000, coin: 'avyn', left: 2 },
    { id: 'bad', item: '', price: 10 }
  ],
  recent: [
    { item: 'Copper Bar', n: 5, price: 76, total: 380, coin: 'gold', at: NOW - 1 * HOUR },
    { item: 'Copper Bar', n: 2, price: 78, total: 156, coin: 'gold', at: NOW - 3 * HOUR },
    { item: 'Copper Bar', n: 1, price: 60, total: 60, coin: 'gold', at: NOW - 3 * DAY },
    { item: 'Copper Bar', n: 3, price: 62, total: 186, coin: 'gold', at: NOW - 4 * DAY },
    { item: 'Plank', n: 10, price: 50, total: 500, coin: 'gold', at: NOW - 2 * HOUR },
    { item: 'Plank', n: 1, price: 4, total: 4, coin: 'shards', at: NOW - 2 * HOUR },
    { item: 'Plank', n: 1, price: 0, total: 0, coin: 'gold', at: NOW - 2 * HOUR }
  ],
  history: [
    { side: 'sold', item: 'Plank', n: 4, price: 50, total: 200, fee: 5, coin: 'gold', who: 'Dani', at: NOW - 5 * HOUR },
    { side: 'bought', item: 'Copper Bar', n: 1, price: 70, total: 70, coin: 'gold', who: 'Ana', at: NOW - 2 * DAY },
    { side: 'sold', item: 'Plank', n: 2, price: 45, total: 90, fee: 2, coin: 'gold', who: 'Eli', at: NOW - 3 * DAY }
  ],
  myStalls: [
    { id: 'm1', item: 'Plank', price: 52, coin: 'gold', left: 6, status: 'open', proceeds: 104 },
    { id: 'm2', item: 'Copper Bar', price: 90, coin: 'gold', left: 0, status: 'sold', proceeds: 0 }
  ]
};

describe('Radar de Mercado: tablero', () => {
  it('normaliza la forma real de api/offers y descarta filas invalidas', () => {
    const b = normalizeBoard(rawBoard);
    expect(b.stalls).toHaveLength(5);
    expect(b.stalls.find((o) => o.id === 's4').tool).toBe(true);
    expect(b.recent).toHaveLength(6);           // la venta con precio 0 se descarta
    expect(b.history[0]).toMatchObject({ side: 'sold', fee: 5, who: 'Dani' });
    expect(b.myStalls).toHaveLength(2);
  });

  it('rechaza lo que no es un tablero', () => {
    expect(normalizeBoard(null)).toBeNull();
    expect(normalizeBoard({ error: 'Signed out' })).toBeNull();
    expect(normalizeBoard({ stalls: [] })).not.toBeNull();
  });

  it('convierte $AVYN desde sus unidades minimas', () => {
    expect(coinAmount('avyn', 2000000)).toBe(2);
    expect(coinAmount('gold', 75)).toBe(75);
  });
});

describe('Radar de Mercado: historial acumulado', () => {
  const recent = normalizeBoard(rawBoard).recent;

  it('suma ventas sin duplicar y cuenta solo las nuevas', () => {
    const first = mergeSales([], recent, NOW);
    expect(first.added).toBe(6);
    const again = mergeSales(first.sales, recent, NOW);
    expect(again.added).toBe(0);
    expect(again.sales).toHaveLength(6);
    const newer = { item: 'Plank', n: 1, price: 55, total: 55, coin: 'gold', at: NOW - 60e3 };
    const third = mergeSales(again.sales, [newer, ...recent], NOW);
    expect(third.added).toBe(1);
    expect(third.sales[0]).toEqual(newer);   // la mas nueva primero
  });

  it('olvida las ventas mas viejas que el limite', () => {
    const old = { item: 'Plank', n: 1, price: 50, total: 50, coin: 'gold', at: NOW - SALES_KEEP_MS - 1 };
    expect(mergeSales([old], [], NOW).sales).toHaveLength(0);
  });

  it('la clave de una venta es estable', () => {
    expect(saleKey(recent[0])).toBe(saleKey({ ...recent[0] }));
  });

  it('guarda fotos de la oferta por item (sin herramientas) y sin repetir la misma hora', () => {
    const b = normalizeBoard(rawBoard);
    const snap = supplySnapshot(b.stalls, NOW);
    expect(snap.items['Copper Bar']).toEqual({ l: 3, u: 17, min: 74 });
    expect(snap.items['Iron Pickaxe']).toBeUndefined();
    const list = mergeSupply(mergeSupply([], snap), snap);
    expect(list).toHaveLength(1);
  });
});

describe('Radar de Mercado: estadisticas', () => {
  const b = normalizeBoard(rawBoard);
  const sales = mergeSales([], b.recent, NOW).sales;

  it('mediana ponderada por unidades', () => {
    expect(weightedMedian([{ price: 10, n: 1 }, { price: 20, n: 5 }])).toBe(20);
    expect(weightedMedian([])).toBeNull();
  });

  it('calcula precios en Oro, volumen, tendencia y oferta', () => {
    const st = itemStats('Copper Bar', sales, b.stalls, NOW);
    expect(st.sales24).toBe(2);
    expect(st.units24).toBe(7);
    expect(st.median24).toBe(76);
    expect(st.median7).toBe(76);
    expect(st.trendPct).toBeCloseTo(((76 - 62) / 62) * 100, 5);
    expect(st.cheapest).toBe(74);                 // el de shards no cuenta como Oro
    expect(st.listings).toBe(3);
    expect(st.unitsListed).toBe(17);
    expect(st.gold24).toBe(536);
    expect(st.low7).toBe(60);
    expect(st.high7).toBe(78);
  });

  it('las ventas en otras monedas no ensucian el precio en Oro', () => {
    const st = itemStats('Plank', sales, b.stalls, NOW);
    expect(st.median24).toBe(50);
    expect(st.otherCoinSales).toBe(1);
    expect(st.cheapest).toBeNull();
    expect(st.cheapestOther).toMatchObject({ coin: 'avyn' });
  });

  it('la tabla incluye todo item con ventas o puestos (salvo herramientas)', () => {
    const ids = marketTable(sales, b.stalls, NOW).map((r) => r.item).sort();
    expect(ids).toEqual(['Copper Bar', 'Plank']);
  });

  it('serie diaria con unidades y mediana', () => {
    const s = itemSeries('Copper Bar', sales, { now: NOW, buckets: 7 });
    expect(s).toHaveLength(7);
    expect(s.reduce((a, x) => a + x.units, 0)).toBe(11);
    expect(s[6].units).toBe(7);
    expect(s[6].median).toBe(76);
  });

  it('precio sugerido: apenas por debajo del mas barato sin bajar del 90% de la mediana', () => {
    expect(suggestListPrice({ ref: 76, cheapest: 74 })).toBe(73);
    expect(suggestListPrice({ ref: 100, cheapest: 50 })).toBe(90);
    expect(suggestListPrice({ ref: 100, cheapest: null })).toBe(100);
    expect(suggestListPrice({ ref: null, cheapest: 40 })).toBe(39);
    expect(suggestListPrice({ ref: null, cheapest: null })).toBeNull();
  });

  it('comision del mercado como el juego (2.5%, minimo 1, nada si vale 1)', () => {
    expect(netAfterFee(100)).toBe(97);
    expect(netAfterFee(1)).toBe(1);
    expect(netAfterFee(2)).toBe(1);
    expect(netAfterFee(1000)).toBe(975);
  });

  it('lee el precio de tienda del Codex', () => {
    expect(parseShopPrice('Sells for 1,950 Gold at a shop')).toBe(1950);
    expect(parseShopPrice('Sells for 545 Gold at a shop')).toBe(545);
    expect(parseShopPrice('')).toBeNull();
  });

  it('liquidez', () => {
    expect(liquidity(null)).toBe('none');
    expect(liquidity({ goldSales: 4, units24: 7, sales24: 2, perDay: 3 })).toBe('fast');
    expect(liquidity({ goldSales: 4, units24: 0, sales24: 0, perDay: 1.5 })).toBe('steady');
    expect(liquidity({ goldSales: 1, units24: 0, sales24: 0, perDay: 0.2 })).toBe('slow');
  });
});

describe('Radar de Mercado: oro rapido', () => {
  const b = normalizeBoard(rawBoard);
  const sales = mergeSales([], b.recent, NOW).sales;
  const statsById = Object.fromEntries(marketTable(sales, b.stalls, NOW).map((s) => [s.item, s]));

  it('elige mercado cuando paga bastante mas que la tienda y se vende rapido', () => {
    const plan = quickGoldPlan({ stock: { 'Copper Bar': 20 }, statsById, shop: { 'Copper Bar': 30 }, quota: { 'Copper Bar': 15 } });
    expect(plan[0]).toMatchObject({ item: 'Copper Bar', channel: 'market', listPrice: 73, liquidity: 'steady' });
    expect(plan[0].marketNet).toBe(netAfterFee(73));
  });

  it('elige tienda cuando paga parecido y respeta el cupo diario', () => {
    const plan = quickGoldPlan({ stock: { 'Copper Bar': 20 }, statsById, shop: { 'Copper Bar': 70 }, quota: { 'Copper Bar': 15 } });
    expect(plan[0]).toMatchObject({ channel: 'shop', qtyNow: 15, goldNow: 15 * 70 });
  });

  it('si la tienda ya no compra mas hoy, pasa al mercado', () => {
    const plan = quickGoldPlan({ stock: { 'Copper Bar': 5 }, statsById, shop: { 'Copper Bar': 70 }, quota: { 'Copper Bar': 0 } });
    expect(plan[0].channel).toBe('market');
  });

  it('reserva lo que pide una mision y vende solo el excedente', () => {
    const plan = quickGoldPlan({ stock: { 'Copper Bar': 5, Plank: 3 }, statsById, shop: { 'Copper Bar': 70, Plank: 20 }, quota: {}, reserved: { 'Copper Bar': 5, Plank: 1 } });
    const copper = plan.find((r) => r.item === 'Copper Bar');
    const plank = plan.find((r) => r.item === 'Plank');
    expect(copper.channel).toBe('keep');
    expect(plank.qty).toBe(2);
    expect(plank.reservedQty).toBe(1);
  });

  it('ignora items sin precio de tienda ni de mercado', () => {
    expect(quickGoldPlan({ stock: { Mystery: 3 }, statsById, shop: {} })).toHaveLength(0);
  });
});

describe('Radar de Mercado: mis ventas', () => {
  it('resume lo cobrado y lo que falta retirar', () => {
    const s = mySummary(normalizeBoard(rawBoard), NOW);
    expect(s.gold24).toBe(195);
    expect(s.gold7).toBe(195 + 88);
    expect(s.sales7).toBe(2);
    expect(s.toCollect).toBe(104);
    expect(s.openStalls).toBe(1);
  });
});

// localStorage minimo para renderizar con datos guardados
function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
}

describe('Radar de Mercado: render', () => {
  const realNow = Date.now;
  beforeEach(() => { Date.now = () => NOW; });
  afterEach(async () => {
    Date.now = realNow;
    delete globalThis.localStorage;
    await i18n.changeLanguage('en');
  });

  it('sin datos: invita a actualizar y no rompe', async () => {
    await i18n.changeLanguage('es');
    const html = renderToString(<MarketRadar rawInventory={[]} />);
    expect(html).toContain('Radar de Mercado');
    expect(html).toContain('Actualizar ventas');
    expect(html).toContain('Todavía no hay datos del mercado');
  });

  it('con un tablero guardado: KPIs y oro rapido sobre el stock', async () => {
    await i18n.changeLanguage('es');
    globalThis.localStorage = fakeStorage({ [BOARD_KEY]: JSON.stringify({ offers: rawBoard, timestamp: NOW - 2 * 60e3 }) });
    const html = renderToString(
      <MarketRadar rawInventory={[{ id: 'Copper Bar', qty: 12, area: 'pack' }, { id: 'Plank', qty: 3, area: 'home' }]} />
    );
    expect(html).toContain('Datos de hace');
    expect(html).toContain('Si querés oro ya');
    expect(html).toContain('Publicar a 73g');
    expect(html).toMatch(/Ventas 24 h/);
    expect(JSON.parse(globalThis.localStorage.getItem(SALES_KEY) || '[]')).toEqual([]); // solo se escribe al llegar datos nuevos
  });

  it('el detalle de un item muestra recomendacion, graficos y puestos', async () => {
    await i18n.changeLanguage('en');
    const b = normalizeBoard(rawBoard);
    const sales = mergeSales([], b.recent, NOW).sales.filter((s) => s.item === 'Copper Bar');
    const stats = itemStats('Copper Bar', sales, b.stalls, NOW);
    const t = i18n.getFixedT('en', 'market');
    const html = renderToString(
      <MarketItemModal
        f={makeFormat('en', t)}
        t={t}
        now={NOW}
        onClose={() => {}}
        data={{
          item: 'Copper Bar', name: 'Copper Bar', stats, sales, stalls: b.stalls.filter((o) => o.item === 'Copper Bar'),
          supply: [{ at: NOW - DAY, u: 30 }, { at: NOW, u: 17 }], owned: 12, where: { m: 12, cc: 0, cp: 0 },
          plan: quickGoldPlan({ stock: { 'Copper Bar': 12 }, statsById: { 'Copper Bar': stats }, shop: { 'Copper Bar': 30 } })[0],
          shopUnit: 30, quota: 15
        }}
      />
    );
    expect(html).toContain('List it at 73g');
    expect(html).toContain('Price of each sale');
    expect(html).toContain('Open stalls now');
    expect(html).toContain('Ana');
    expect(html).toContain('<svg');
  });
});

describe('Extension: el tablero del mercado llega a la herramienta', () => {
  const bridge = fs.readFileSync('extension/content_bridge.js', 'utf8');
  const background = fs.readFileSync('extension/background.js', 'utf8');
  const monios = fs.readFileSync('extension/content_monios.js', 'utf8');
  const hook = fs.readFileSync('extension/content_hook.js', 'utf8');

  it('el bridge reenvia el tablero y los errores al background', () => {
    expect(bridge).toContain("'__BLOOMSHIRE_MARKET_SNAPSHOT'");
    expect(bridge).toContain("type: 'BLOOMSHIRE_MARKET_SNAPSHOT'");
    expect(bridge).toContain("type: 'BLOOMSHIRE_MARKET_SNAPSHOT_ERROR'");
  });

  it('el background reparte el error a la herramienta y la herramienta lo publica', () => {
    expect(background).toContain("'BLOOMSHIRE_INJECT_MARKET_ERROR'");
    expect(monios).toContain("message.type === 'BLOOMSHIRE_INJECT_MARKET_ERROR'");
  });

  it('el hook distingue sesion cerrada y no toma un error como tablero', () => {
    expect(hook).toContain("'signed_out'");
    expect(hook).toMatch(/url\.includes\('api\/offers'\) && resp\.ok/);
  });

  it('el manifest declara los iconos del juego', () => {
    const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
    for (const size of ['16', '32', '48', '128']) {
      expect(manifest.icons[size]).toBe(`icons/icon-${size}.png`);
      expect(fs.existsSync(`extension/${manifest.icons[size]}`)).toBe(true);
    }
    expect(manifest.action.default_icon['32']).toBe('icons/icon-32.png');
  });
});
