// src/components/bloomshire/official/BeastSearchResults.jsx
// Resultados de criaturas en el buscador del Mega-Atlas: cada criatura que
// coincide con lo escrito, con las regiones donde vive. Tocar una region la
// selecciona en el mapa y abre la ficha de la criatura.
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useOfficialData from './useOfficialData';
import BeastIcon from './BeastIcon';
import { searchBeasts, atlasRegionsOfBeast } from './compendiumModel';
import { baseLang, pickLang } from '../logbook/logbookModel';

export default function BeastSearchResults({ query, regions, onPick }) {
  const { t, i18n } = useTranslation('compendium');
  const lang = baseLang(i18n.language);
  const bestiary = useOfficialData('bestiary');
  const results = useMemo(() => searchBeasts(bestiary, query).slice(0, 8), [bestiary, query]);
  const regionById = useMemo(() => new Map((regions || []).map((r) => [r.id, r])), [regions]);
  if (!results.length) return null;
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-2 space-y-1.5">
      <div className="px-1 text-[10px] font-black uppercase tracking-wider text-rose-300">🐾 {t('search.title', { count: results.length })}</div>
      {results.map((b) => (
        <div key={b.id} className="rounded-lg border border-slate-800 bg-[#0c1424] p-1.5">
          <div className="flex items-center gap-2">
            <BeastIcon beast={b} size={26} />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-slate-100">{pickLang(b, 'name', lang)}</span>
            {b.stats.boss && <span className="rounded bg-rose-500/20 px-1 text-[8.5px] font-black uppercase text-rose-300">{t('boss')}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {atlasRegionsOfBeast(b).map((rid) => {
              const r = regionById.get(rid);
              if (!r) return null;
              return (
                <button
                  key={rid}
                  type="button"
                  onClick={() => onPick(rid, b.id)}
                  title={t('search.goTo')}
                  className="rounded-md border border-slate-700 bg-[#080d17] px-1.5 py-0.5 text-[10px] font-bold text-amber-200 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10 cursor-pointer"
                >
                  {r.icon} {lang === 'es' ? r.name : r.enName}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
