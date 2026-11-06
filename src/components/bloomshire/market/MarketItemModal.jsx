// src/components/bloomshire/market/MarketItemModal.jsx
// Seguimiento de un item del mercado: recomendacion, estadisticas, precio de cada venta, volumen por dia,
// oferta en el tiempo, puestos abiertos y ultimas ventas.
import React, { useEffect, useMemo, useState } from 'react';
import { X, Store, TrendingUp, Lock, Info } from 'lucide-react';
import { DAY, itemSeries, coinAmount } from './marketModel';
import { PriceChart, VolumeBars, SupplyLine } from './MarketCharts';
import { ItemSprite } from '../bloomshireHelpers';
import { LiqChip, TrendBadge } from './marketBits';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b1426] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className="text-base font-black text-white tabular-nums mt-0.5">{value}</div>
      {hint ? <div className="text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function MarketItemModal({ data, f, t, now, onClose }) {
  const [range, setRange] = useState(14);
  const { item, name, fallback, stats, sales, stalls, supply, owned, where, plan, shopUnit, quota } = data;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const from = now - range * DAY;
  const goldSales = useMemo(() => sales.filter((s) => s.coin === 'gold' && s.at >= from), [sales, from]);
  const series = useMemo(() => itemSeries(item, sales, { now, buckets: range }), [item, sales, now, range]);
  const supplyPts = useMemo(() => supply.filter((p) => p.at >= from), [supply, from]);
  const unit = (n) => t('detail.unit', { n: f.n(n) });

  let reco;
  if (plan?.channel === 'keep') reco = { icon: Lock, tone: 'amber', text: t('detail.recoKeep') };
  else if (plan?.channel === 'market' && plan.listPrice) reco = { icon: TrendingUp, tone: 'emerald', text: t('detail.recoMarket', { price: f.gold(plan.listPrice), net: f.gold(plan.marketNet) }) };
  else if (plan?.channel === 'shop' && shopUnit) reco = { icon: Store, tone: 'amber', text: t('detail.recoShop', { price: f.gold(shopUnit), n: f.n(quota) }) };
  else if (stats.ref != null) {
    const p = stats.cheapest != null ? Math.max(1, Math.min(Math.round(stats.ref * 1.05), stats.cheapest - 1)) : Math.round(stats.ref);
    reco = { icon: TrendingUp, tone: 'emerald', text: t('detail.recoMarket', { price: f.gold(p), net: f.gold(Math.round(p * 0.975)) }) };
  } else reco = { icon: Info, tone: 'slate', text: t('detail.recoNone') };
  const recoCls = { emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100', amber: 'border-amber-500/40 bg-amber-500/10 text-amber-100', slate: 'border-slate-700 bg-slate-800/40 text-slate-300' }[reco.tone];
  const RecoIcon = reco.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6" role="dialog" aria-modal="true" aria-label={name}>
      <button type="button" aria-label={t('detail.close')} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose} />
      <div className="lb-pop relative w-full max-w-4xl max-h-full overflow-y-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0d182c] to-[#091020] shadow-2xl">
        {/* Encabezado */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-[#0d182c]/95 backdrop-blur">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
            <ItemSprite id={item} name={item} size={34} fallback={fallback || '📦'} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-white truncate">{name}</h3>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
              <LiqChip liq={plan?.liquidity || (stats.goldSales ? (stats.units24 >= 3 ? 'fast' : stats.perDay >= 1 ? 'steady' : 'slow') : 'none')} t={t} />
              {owned ? <span className="font-bold text-amber-300">{t('detail.youHave', { n: f.n(owned) })}</span> : null}
              {owned ? <span>{t('detail.where', { m: f.n(where.m), cc: f.n(where.cc), cp: f.n(where.cp) })}</span> : null}
              <span>{shopUnit ? t('detail.shopPrice', { price: f.gold(shopUnit) }) : t('detail.noShop')}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center cursor-pointer" aria-label={t('detail.close')}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Recomendacion */}
          <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${recoCls}`}>
            <RecoIcon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{t('detail.recoTitle')}</div>
              <div className="text-[13px] font-semibold">{reco.text}</div>
            </div>
          </div>

          {/* Estadisticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label={t('detail.median24')} value={f.gold(stats.median24)} />
            <Stat label={t('detail.median7')} value={f.gold(stats.median7)} />
            <Stat label={t('detail.range7')} value={stats.low7 != null ? `${f.n(stats.low7)}–${f.n(stats.high7)}` : '–'} />
            <Stat label={t('detail.perDay')} value={t('detail.perDayValue', { n: f.n1(stats.perDay) })} />
            <Stat label={t('detail.trend')} value={<TrendBadge pct={stats.trendPct} f={f} />} hint={t('detail.trendHint')} />
          </div>

          {/* Rango */}
          <div className="flex items-center gap-1 self-end bg-[#0a1224] p-1 rounded-lg border border-slate-800">
            {[7, 14, 30].map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${range === r ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>
                {t(`detail.range.${r}`)}
              </button>
            ))}
          </div>

          <section className="rounded-xl border border-slate-800 bg-[#0a1222] p-3">
            <h4 className="text-sm font-black text-white">{t('detail.priceTitle')}</h4>
            <p className="text-[11px] text-slate-500 mb-2">{t('detail.priceHint')}</p>
            {goldSales.length ? (
              <PriceChart
                sales={goldSales}
                series={series}
                cheapest={stats.cheapest}
                from={from}
                to={now}
                formatTime={f.chartTime}
                labels={{ title: t('detail.priceTitle'), cheapest: t('table.cheapest'), gold: t('coin.gold'), unit }}
              />
            ) : <p className="text-[12px] text-slate-500 py-8 text-center">{t('detail.noData')}</p>}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="rounded-xl border border-slate-800 bg-[#0a1222] p-3">
              <h4 className="text-sm font-black text-white mb-2">{t('detail.volumeTitle')}</h4>
              {series.some((b) => b.units) ? (
                <VolumeBars width={400} buckets={series} formatTime={f.day} labels={{ title: t('detail.volumeTitle'), gold: t('coin.gold'), unit }} />
              ) : <p className="text-[12px] text-slate-500 py-8 text-center">{t('detail.noData')}</p>}
            </section>
            <section className="rounded-xl border border-slate-800 bg-[#0a1222] p-3">
              <h4 className="text-sm font-black text-white">{t('detail.supplyTitle')}</h4>
              <p className="text-[11px] text-slate-500 mb-2">{t('detail.supplyHint')}</p>
              <SupplyLine width={400} points={supplyPts} formatTime={f.chartTime} labels={{ title: t('detail.supplyTitle'), unit, empty: t('detail.noData') }} />
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="rounded-xl border border-slate-800 bg-[#0a1222] p-3">
              <h4 className="text-sm font-black text-white mb-2">{t('detail.listingsTitle')}</h4>
              {stalls.length ? (
                <table className="w-full text-[12px]">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr><th className="text-left font-bold pb-1">{t('detail.seller')}</th><th className="text-right font-bold pb-1">{t('detail.qty')}</th><th className="text-right font-bold pb-1">{t('detail.price')}</th></tr>
                  </thead>
                  <tbody>
                    {stalls.slice(0, 20).map((o, i) => (
                      <tr key={o.id ?? i} className="border-t border-slate-800/70">
                        <td className="py-1.5 text-slate-300 truncate max-w-[180px]">{o.seller || t('detail.anon')}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-300">{f.n(o.left)}</td>
                        <td className={`py-1.5 text-right tabular-nums font-bold ${i === 0 ? 'text-emerald-300' : 'text-slate-100'}`}>
                          {o.coin === 'gold' ? f.gold(o.price) : `${f.n1(coinAmount(o.coin, o.price))} ${t(`coin.${o.coin}`, { defaultValue: o.coin })}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-[12px] text-slate-500 py-4 text-center">{t('detail.listingsEmpty')}</p>}
            </section>
            <section className="rounded-xl border border-slate-800 bg-[#0a1222] p-3">
              <h4 className="text-sm font-black text-white mb-2">{t('detail.salesTitle')}</h4>
              {sales.length ? (
                <table className="w-full text-[12px]">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr><th className="text-left font-bold pb-1">{t('detail.when')}</th><th className="text-right font-bold pb-1">{t('detail.qty')}</th><th className="text-right font-bold pb-1">{t('detail.price')}</th></tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 20).map((s, i) => (
                      <tr key={`${s.at}-${i}`} className="border-t border-slate-800/70">
                        <td className="py-1.5 text-slate-400">{f.dayTime(s.at)}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-300">{f.n(s.n)}</td>
                        <td className="py-1.5 text-right tabular-nums font-bold text-slate-100">
                          {s.coin === 'gold' ? f.gold(s.price) : `${f.n1(coinAmount(s.coin, s.price))} ${t(`coin.${s.coin}`, { defaultValue: s.coin })}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-[12px] text-slate-500 py-4 text-center">{t('detail.salesEmpty')}</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
