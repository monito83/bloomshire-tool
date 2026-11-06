// src/components/bloomshire/market/MarketRadar.jsx
// Radar de Mercado (Market Hall de Rowan): estado de la sincronizacion, KPIs, "oro rapido" sobre tu stock,
// tabla de todo el mercado con tendencia y seguimiento por item, y tus ventas.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, MapPin, Zap, Store, TrendingUp, Search, CircleCheck, TriangleAlert,
  Clock, Coins, Package, History, Lock, ArrowRight, Radar, Wallet, Hourglass
} from 'lucide-react';
import useMarketFeed from './useMarketFeed';
import useOfficialData from '../official/useOfficialData';
import { DAY, itemStats, itemSeries, quickGoldPlan, mySummary, parseShopPrice, coinAmount } from './marketModel';
import { makeFormat } from './marketFormat';
import { Sparkline } from './MarketCharts';
import MarketItemModal from './MarketItemModal';
import { LiqChip, TrendBadge, CHAPTER_EMOJI } from './marketBits';
import { ItemSprite, getStorageType } from '../bloomshireHelpers';

function Kpi({ icon: Icon, label, value, hint, tone = 'emerald' }) {
  const tones = {
    emerald: 'from-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'from-amber-500/15 text-amber-300 border-amber-500/30',
    sky: 'from-sky-500/15 text-sky-300 border-sky-500/30',
    violet: 'from-violet-500/15 text-violet-300 border-violet-500/30'
  };
  return (
    <div className={`lb-fade relative overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />{label}
      </div>
      <div className="mt-1 text-xl font-black text-white tabular-nums">{value}</div>
      {hint ? <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">{hint}</div> : null}
    </div>
  );
}

export default function MarketRadar({
  rawInventory = [],
  activeQuestMaterials = [],
  soldItemsToday = {},
  dailyPerItemCap = 15,
  onLocateMarket = () => {}
}) {
  const { t, i18n } = useTranslation('market');
  const lang = i18n.language || 'en';
  const f = useMemo(() => makeFormat(lang, t), [lang, t]);
  const feed = useMarketFeed();
  const codex = useOfficialData('codex');
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState('quick');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState('units24');
  const [showAllShop, setShowAllShop] = useState(false);
  const [showAllMarket, setShowAllMarket] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30e3);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (feed.status.kind === 'ok') setNow(Date.now()); }, [feed.status]);

  // Codex: nombre por idioma y precio de tienda
  const { nameById, shopById, emojiById } = useMemo(() => {
    const nameMap = {}, shop = {}, emoji = {};
    (codex?.items || []).forEach((it) => {
      nameMap[it.id] = { en: it.name_en || it.id, es: it.name_es || it.name_en || it.id };
      emoji[it.id] = CHAPTER_EMOJI[it.chapter] || '📦';
      const p = parseShopPrice(it.worth_en);
      if (p) shop[it.id] = p;
    });
    return { nameById: nameMap, shopById: shop, emojiById: emoji };
  }, [codex]);
  const sprite = (id, size) => <ItemSprite id={id} name={id} size={size} fallback={emojiById[id] || '📦'} />;
  const nameOf = (id) => {
    const n = nameById[id];
    return n ? (lang.startsWith('es') ? n.es : n.en) : id;
  };

  // Tu stock por item (con desglose por lugar)
  const stock = useMemo(() => {
    const total = {}, where = {};
    (rawInventory || []).forEach((it) => {
      if (!it?.id || it.tier) return;   // herramientas: no se venden por unidad
      const q = typeof it.qty === 'number' ? it.qty : typeof it.count === 'number' ? it.count : 1;
      if (!(q > 0)) return;
      total[it.id] = (total[it.id] || 0) + q;
      const w = where[it.id] || (where[it.id] = { m: 0, cc: 0, cp: 0 });
      const type = getStorageType(it.area);
      if (type === 'M') w.m += q; else if (type === 'CP') w.cp += q; else w.cc += q;
    });
    return { total, where };
  }, [rawInventory]);

  // Lo que piden las misiones activas (en ids del stock)
  const reserved = useMemo(() => {
    const out = {};
    const byLower = {};
    Object.keys(stock.total).forEach((id) => { byLower[id.toLowerCase()] = id; });
    (activeQuestMaterials || []).forEach((m) => {
      const key = String(m?.id || '').toLowerCase().trim();
      const id = byLower[key] || byLower[key.replace(/_/g, ' ')];
      if (id) out[id] = Math.max(out[id] || 0, Number(m.needed) || 0);
    });
    return out;
  }, [activeQuestMaterials, stock]);

  const quota = useMemo(() => {
    const out = {};
    Object.keys(stock.total).forEach((id) => { out[id] = Math.max(0, dailyPerItemCap - (Number(soldItemsToday?.[id]) || 0)); });
    return out;
  }, [stock, soldItemsToday, dailyPerItemCap]);

  // Ventas y puestos agrupados por item
  const stalls = feed.board?.stalls || [];
  const grouped = useMemo(() => {
    const sales = {}, st = {};
    feed.sales.forEach((s) => { (sales[s.item] || (sales[s.item] = [])).push(s); });
    stalls.forEach((o) => { if (!o.tool) (st[o.item] || (st[o.item] = [])).push(o); });
    return { sales, stalls: st };
  }, [feed.sales, stalls]);

  const statsById = useMemo(() => {
    const out = {};
    const ids = new Set([...Object.keys(grouped.sales), ...Object.keys(grouped.stalls)]);
    ids.forEach((id) => { out[id] = itemStats(id, grouped.sales[id] || [], grouped.stalls[id] || [], now); });
    return out;
  }, [grouped, now]);

  const hasMarketData = feed.sales.length > 0 || stalls.length > 0;

  const plan = useMemo(() => quickGoldPlan({ stock: stock.total, statsById, shop: shopById, quota, reserved }),
    [stock, statsById, shopById, quota, reserved]);
  const shopRows = plan.filter((r) => r.channel === 'shop' && r.goldNow > 0);
  const marketRows = plan.filter((r) => r.channel === 'market' && r.goldNow > 0);
  const keepRows = plan.filter((r) => r.channel === 'keep');
  const quickTotal = [...shopRows, ...marketRows].reduce((acc, r) => acc + r.goldNow, 0);

  // KPIs
  const kpi = useMemo(() => {
    const d1 = feed.sales.filter((s) => s.at >= now - DAY);
    const goldOnes = d1.filter((s) => s.coin === 'gold');
    return {
      sales24: d1.length,
      units24: d1.reduce((a, s) => a + s.n, 0),
      gold24: goldOnes.reduce((a, s) => a + s.total, 0),
      stalls: stalls.length,
      unitsListed: stalls.reduce((a, o) => a + o.left, 0),
      historyCount: feed.sales.length,
      since: feed.sales.length ? feed.sales[feed.sales.length - 1].at : null
    };
  }, [feed.sales, stalls, now]);

  const mine = useMemo(() => mySummary(feed.board, now), [feed.board, now]);

  // Tabla de todo el mercado
  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = Object.values(statsById);
    if (onlyMine) rows = rows.filter((r) => stock.total[r.item] > 0);
    if (q) rows = rows.filter((r) => r.item.toLowerCase().includes(q) || nameOf(r.item).toLowerCase().includes(q));
    const key = {
      units24: (r) => r.units24 * 1e6 + r.units7,
      gold24: (r) => r.gold24 * 1e3 + r.gold7,
      trend: (r) => (r.trendPct == null ? -1e9 : r.trendPct),
      price: (r) => r.ref ?? r.cheapest ?? -1,
      supply: (r) => r.unitsListed
    }[sortBy];
    return rows.sort((a, b) => key(b) - key(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsById, query, onlyMine, sortBy, stock, nameById, lang]);

  const sparkById = useMemo(() => {
    const out = {};
    tableRows.slice(0, 120).forEach((r) => {
      out[r.item] = itemSeries(r.item, grouped.sales[r.item] || [], { now, buckets: 14 }).map((b) => b.median);
    });
    return out;
  }, [tableRows, grouped, now]);

  // Estado de la sincronizacion
  const status = feed.status;
  const fresh = feed.boardAt && now - feed.boardAt < 15 * 60e3;
  let statusLine;
  if (status.kind === 'loading') {
    statusLine = { tone: 'sky', icon: RefreshCw, spin: true, text: t('refreshing') };
  } else if (status.kind === 'ok') {
    statusLine = { tone: 'emerald', icon: CircleCheck, text: t(status.added ? 'status.ok' : 'status.okNone', { time: f.time(status.at), added: f.n(status.added), stalls: f.n(status.stalls) }) };
  } else if (status.kind === 'error') {
    statusLine = { tone: 'rose', icon: TriangleAlert, text: t(`status.error.${status.reason}`, { defaultValue: t('status.error.game_error') }) };
  } else if (!feed.boardAt) {
    statusLine = { tone: 'slate', icon: Clock, text: t('status.never') };
  } else {
    statusLine = { tone: fresh ? 'emerald' : 'amber', icon: Clock, text: t(fresh ? 'status.fresh' : 'status.stale', { ago: f.ago(feed.boardAt, now) }) };
  }
  const toneCls = {
    sky: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    slate: 'border-slate-600/50 bg-slate-800/40 text-slate-300'
  }[statusLine.tone];
  const StatusIcon = statusLine.icon;
  const loading = status.kind === 'loading';

  const sel = selected ? {
    item: selected,
    name: nameOf(selected),
    fallback: emojiById[selected] || '📦',
    stats: statsById[selected] || itemStats(selected, [], [], now),
    sales: grouped.sales[selected] || [],
    stalls: (grouped.stalls[selected] || []).slice().sort((a, b) => (a.coin === 'gold' ? 0 : 1) - (b.coin === 'gold' ? 0 : 1) || a.price - b.price),
    supply: feed.supply.map((s) => ({ at: s.at, u: s.items?.[selected]?.u ?? 0 })),
    owned: stock.total[selected] || 0,
    where: stock.where[selected] || { m: 0, cc: 0, cp: 0 },
    plan: plan.find((r) => r.item === selected) || null,
    shopUnit: shopById[selected] || null,
    quota: quota[selected] ?? dailyPerItemCap
  } : null;

  const planRow = (r) => (
    <button
      key={r.item}
      type="button"
      onClick={() => setSelected(r.item)}
      className="group w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0b1426] hover:bg-[#0f1b33] hover:border-emerald-500/40 px-3 py-2.5 text-left transition-all cursor-pointer"
    >
      <div className="w-9 h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        {sprite(r.item, 26)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-slate-100 text-[13px] truncate">{nameOf(r.item)}</span>
          {r.channel === 'market' ? <LiqChip liq={r.liquidity} t={t} /> : null}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {r.channel === 'shop'
            ? <>{t('quick.qtyNow', { n: f.n(r.qtyNow) })} <span className="text-slate-500">{t('quick.of', { n: f.n(r.owned) })}</span> · {t('quick.each', { price: f.gold(r.shopUnit) })}</>
            : r.channel === 'market'
              ? <>{t('quick.listAt', { price: f.gold(r.listPrice) })} · {t('quick.net', { net: f.gold(r.marketNet) })}{r.daysToSell ? ` · ${t('quick.sellsIn', { t: f.span(r.daysToSell) })}` : ''}</>
              : <>{f.n(r.owned)} · {t('quick.keepHint')}</>}
        </div>
      </div>
      {r.channel !== 'keep' ? (
        <div className="text-right shrink-0">
          <div className="text-[14px] font-black text-amber-300 tabular-nums">+{f.gold(r.goldNow)}</div>
          {r.channel === 'market' && r.shopUnit ? (
            <div className="text-[10px] text-emerald-400 font-bold">{t('quick.vsShop', { pct: f.n(((r.marketNet - r.shopUnit) / r.shopUnit) * 100) })}</div>
          ) : null}
        </div>
      ) : <Lock className="w-4 h-4 text-amber-400/80 shrink-0" aria-hidden="true" />}
      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden="true" />
    </button>
  );

  const hasStock = Object.keys(stock.total).length > 0;

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 pb-4">
      {/* Cabecera */}
      <div className="lb-fade relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0c1a2e] via-[#0b1426] to-[#0a1220] p-4 shadow-[0_0_40px_rgba(16,185,129,0.06)]">
        <div className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 border border-emerald-300/50 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/40">
              <Radar className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white tracking-tight">{t('title')}</h2>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-slate-800/50" title={t('autoHint')}>
              <input type="checkbox" className="accent-emerald-500 w-3.5 h-3.5" checked={feed.auto} onChange={(e) => feed.setAuto(e.target.checked)} />
              {t('auto')}
            </label>
            <button
              type="button"
              onClick={onLocateMarket}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:border-emerald-500/50 hover:text-white text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />{t('locate')}
            </button>
            <button
              type="button"
              onClick={feed.refresh}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-900/30 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-wait active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              {loading ? t('refreshing') : t('refresh')}
            </button>
          </div>
        </div>
        <div role="status" aria-live="polite" className={`relative mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold ${toneCls}`} key={`${status.kind}-${status.at || 0}`}>
          <StatusIcon className={`w-4 h-4 shrink-0 ${statusLine.spin ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="lb-fade">{statusLine.text}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Kpi icon={Zap} label={t('kpi.sales24')} value={f.n(kpi.sales24)} hint={t('kpi.sales24Hint', { units: f.n(kpi.units24) })} />
        <Kpi icon={Coins} tone="amber" label={t('kpi.gold24')} value={f.gold(kpi.gold24)} hint={t('kpi.gold24Hint')} />
        <Kpi icon={Store} tone="sky" label={t('kpi.stalls')} value={f.n(kpi.stalls)} hint={t('kpi.stallsHint', { units: f.n(kpi.unitsListed) })} />
        <Kpi icon={History} tone="violet" label={t('kpi.history')} value={f.n(kpi.historyCount)} hint={kpi.since ? t('kpi.historyHint', { date: f.dayTime(kpi.since) }) : t('kpi.historyEmpty')} />
      </div>

      {/* Vistas */}
      <div className="flex items-center gap-1 bg-[#0a1224] p-1 rounded-xl border border-slate-800 w-fit">
        {[['quick', Zap], ['market', Package], ['mine', Wallet]].map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${view === key ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />{t(`views.${key}`)}
          </button>
        ))}
      </div>

      {/* Oro rapido */}
      {view === 'quick' && (
        <div className="flex flex-col gap-3 lb-fade">
          {!hasStock ? (
            <div className="rounded-xl border border-slate-800 bg-[#0b1426] p-6 text-center text-sm text-slate-400">{t('quick.emptyStock')}</div>
          ) : (
            <>
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-amber-300/90">{t('quick.headline')}</div>
                  <div className="text-3xl font-black text-white tabular-nums">{t('quick.headlineValue', { gold: f.n(quickTotal) })}</div>
                </div>
                <p className="text-xs text-slate-400 max-w-md">{t('quick.headlineHint')}</p>
              </div>
              {!hasMarketData ? (
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[12px] text-sky-200">{t('quick.noMarketData')}</div>
              ) : null}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <section className="rounded-2xl border border-slate-800 bg-[#0a1222] p-3 flex flex-col gap-2">
                  <header className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-amber-300 mt-0.5" aria-hidden="true" />
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-white">{t('quick.shopTitle')}</h3>
                      <p className="text-[11px] text-slate-400">{t('quick.shopHint', { cap: dailyPerItemCap })}</p>
                    </div>
                    <span className="text-sm font-black text-amber-300 tabular-nums">+{f.gold(shopRows.reduce((a, r) => a + r.goldNow, 0))}</span>
                  </header>
                  {shopRows.length ? (showAllShop ? shopRows : shopRows.slice(0, 6)).map((r) => planRow(r))
                    : <p className="text-[12px] text-slate-500 py-4 text-center">{t('quick.emptyShop')}</p>}
                  {shopRows.length > 6 ? (
                    <button type="button" onClick={() => setShowAllShop((v) => !v)} className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer self-center py-1">
                      {showAllShop ? t('quick.showLess') : t('quick.showAll', { n: shopRows.length })}
                    </button>
                  ) : null}
                </section>
                <section className="rounded-2xl border border-slate-800 bg-[#0a1222] p-3 flex flex-col gap-2">
                  <header className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-300 mt-0.5" aria-hidden="true" />
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-white">{t('quick.marketTitle')}</h3>
                      <p className="text-[11px] text-slate-400">{t('quick.marketHint')}</p>
                    </div>
                    <span className="text-sm font-black text-amber-300 tabular-nums">+{f.gold(marketRows.reduce((a, r) => a + r.goldNow, 0))}</span>
                  </header>
                  {marketRows.length ? (showAllMarket ? marketRows : marketRows.slice(0, 6)).map((r) => planRow(r))
                    : <p className="text-[12px] text-slate-500 py-4 text-center">{t('quick.emptyMarket')}</p>}
                  {marketRows.length > 6 ? (
                    <button type="button" onClick={() => setShowAllMarket((v) => !v)} className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 cursor-pointer self-center py-1">
                      {showAllMarket ? t('quick.showLess') : t('quick.showAll', { n: marketRows.length })}
                    </button>
                  ) : null}
                </section>
              </div>
              {keepRows.length ? (
                <section className="rounded-2xl border border-amber-500/20 bg-[#0a1222] p-3 flex flex-col gap-2">
                  <header className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-300" aria-hidden="true" />
                    <h3 className="text-sm font-black text-white">{t('quick.keepTitle')}</h3>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{keepRows.map((r) => planRow(r))}</div>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Todo el mercado */}
      {view === 'market' && (
        <div className="flex flex-col gap-2 lb-fade">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('table.search')}
                aria-label={t('table.search')}
                className="pl-8 pr-3 py-1.5 w-56 rounded-lg bg-[#0a1222] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
              <input type="checkbox" className="accent-emerald-500" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              {t('table.onlyMine')}
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 ml-auto">
              {t('table.sort')}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#0a1222] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 cursor-pointer">
                {['units24', 'gold24', 'trend', 'price', 'supply'].map((k) => <option key={k} value={k}>{t(`table.sortBy.${k}`)}</option>)}
              </select>
            </label>
          </div>
          {!hasMarketData ? (
            <div className="rounded-xl border border-slate-800 bg-[#0b1426] p-6 text-center text-sm text-slate-400">{t('table.empty')}</div>
          ) : !tableRows.length ? (
            <div className="rounded-xl border border-slate-800 bg-[#0b1426] p-6 text-center text-sm text-slate-400">{t('table.noMatch')}</div>
          ) : (
            <div className="rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#0a1222] text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="text-left font-bold px-3 py-2">{t('table.item')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.last')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.median')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.trend')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.sold24')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.supply')}</th>
                    <th className="text-right font-bold px-2 py-2">{t('table.cheapest')}</th>
                    <th className="text-center font-bold px-3 py-2 hidden md:table-cell">{t('table.chart')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr
                      key={r.item}
                      onClick={() => setSelected(r.item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.item); } }}
                      tabIndex={0}
                      className="border-t border-slate-800/80 bg-[#0b1426] hover:bg-[#10203a] cursor-pointer transition-colors focus:outline-none focus:bg-[#10203a]"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-[170px]">
                          {sprite(r.item, 22)}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-100 truncate">{nameOf(r.item)}</div>
                            {stock.total[r.item] ? <div className="text-[10px] text-amber-300/90 font-bold">{t('table.have', { n: f.n(stock.total[r.item]) })}</div> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                        {r.last ? f.gold(r.last.price) : r.otherCoinSales ? <span className="text-slate-500">{t('table.otherCoin')}</span> : '–'}
                        {r.lastAt ? <div className="text-[10px] text-slate-500">{f.ago(r.lastAt, now)}</div> : null}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-black text-emerald-300">{r.median24 != null ? f.gold(r.median24) : r.median7 != null ? <span className="text-slate-400 font-bold">{f.gold(r.median7)}*</span> : '–'}</td>
                      <td className="px-2 py-2 text-right"><TrendBadge pct={r.trendPct} f={f} /></td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-200">{f.n(r.units24)}</td>
                      <td className="px-2 py-2 text-right text-slate-300 whitespace-nowrap">{r.listings ? t('table.listings', { count: r.listings, n: f.n(r.listings), units: f.n(r.unitsListed) }) : <span className="text-slate-500">{t('table.noSupply')}</span>}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-200">
                        {r.cheapest != null ? f.gold(r.cheapest) : r.cheapestOther ? <span className="text-slate-400">{f.n1(coinAmount(r.cheapestOther.coin, r.cheapestOther.price))} {t(`coin.${r.cheapestOther.coin}`, { defaultValue: r.cheapestOther.coin })}</span> : '–'}
                      </td>
                      <td className="px-3 py-1 hidden md:table-cell"><div className="flex justify-center"><Sparkline values={sparkById[r.item] || []} title={nameOf(r.item)} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate-500">{t('table.clickHint')}</p>
        </div>
      )}

      {/* Mis ventas */}
      {view === 'mine' && (
        <div className="flex flex-col gap-3 lb-fade">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Kpi icon={Coins} tone="amber" label={t('mine.gold24')} value={f.gold(mine.gold24)} />
            <Kpi icon={Coins} tone="emerald" label={t('mine.gold7')} value={f.gold(mine.gold7)} hint={t('mine.sales7', { n: f.n(mine.sales7) })} />
            <Kpi icon={Wallet} tone="violet" label={t('mine.toCollect')} value={f.gold(mine.toCollect)} hint={mine.toCollect ? t('mine.toCollectHint') : ''} />
            <Kpi icon={Store} tone="sky" label={t('mine.openStalls')} value={f.n(mine.openStalls)} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded-2xl border border-slate-800 bg-[#0a1222] p-3">
              <h3 className="text-sm font-black text-white mb-2">{t('mine.stallsTitle')}</h3>
              {mine.stalls.length ? (
                <ul className="flex flex-col gap-1.5">
                  {mine.stalls.map((o, i) => (
                    <li key={o.id ?? i}>
                      <button type="button" onClick={() => setSelected(o.item)} className="w-full flex items-center gap-2.5 rounded-lg bg-[#0b1426] hover:bg-[#0f1b33] border border-slate-800 px-2.5 py-2 text-left cursor-pointer">
                        {sprite(o.item, 22)}
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-bold text-slate-100 truncate">{nameOf(o.item)}</div>
                          <div className="text-[11px] text-slate-400">
                            {o.coin === 'gold' ? f.gold(o.price) : `${f.n1(coinAmount(o.coin, o.price))} ${t(`coin.${o.coin}`, { defaultValue: o.coin })}`} · {o.status === 'open' ? t('mine.left', { n: f.n(o.left) }) : t('mine.statusDone')}
                          </div>
                        </div>
                        {o.proceeds > 0 && o.coin === 'gold' ? <span className="text-[11px] font-black text-amber-300">{t('mine.proceeds', { gold: f.gold(o.proceeds) })}</span> : null}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${o.status === 'open' ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>
                          {o.status === 'open' ? t('mine.statusOpen') : t('mine.statusDone')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[12px] text-slate-500 py-4 text-center">{t('mine.emptyStalls')}</p>}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-[#0a1222] p-3">
              <h3 className="text-sm font-black text-white mb-2">{t('mine.historyTitle')}</h3>
              {(feed.board?.history || []).length ? (
                <ul className="flex flex-col gap-1">
                  {feed.board.history.slice(0, 40).map((h, i) => {
                    const sold = h.side === 'sold';
                    const amount = h.coin === 'gold' ? f.gold(sold ? h.total - h.fee : h.total) : `${f.n1(coinAmount(h.coin, sold ? h.total - h.fee : h.total))} ${t(`coin.${h.coin}`, { defaultValue: h.coin })}`;
                    return (
                      <li key={`${h.at}-${i}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#0f1b33]">
                        {sprite(h.item, 20)}
                        <div className="flex-1 min-w-0 text-[12px]">
                          <span className="text-slate-400">{sold ? t('mine.sold') : t('mine.bought')}</span>{' '}
                          <span className="font-bold text-slate-100">{h.n > 1 ? `${f.n(h.n)} ` : ''}{nameOf(h.item)}</span>
                          <div className="text-[10.5px] text-slate-500">{f.ago(h.at, now)}{h.who ? ` · ${h.who}` : ''}</div>
                        </div>
                        <span className={`text-[12px] font-black tabular-nums ${sold ? 'text-emerald-300' : 'text-rose-300'}`}>{sold ? '+' : '−'}{amount}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-[12px] text-slate-500 py-4 text-center">{t('mine.empty')}</p>}
            </section>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 text-[11px] text-slate-500 pt-1">
        <p className="flex items-start gap-1.5 max-w-3xl"><Hourglass className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />{t('footer')}</p>
        {feed.sales.length ? (
          <button
            type="button"
            onClick={() => { if (window.confirm(t('clearConfirm'))) feed.clearHistory(); }}
            className="shrink-0 text-slate-500 hover:text-rose-300 underline-offset-2 hover:underline cursor-pointer"
          >
            {t('clear')}
          </button>
        ) : null}
      </div>

      {sel ? <MarketItemModal data={sel} f={f} t={t} now={now} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
