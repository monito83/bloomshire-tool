// src/components/bloomshire/official/RegionCompendium.jsx
// Panel del Mega-Atlas con los datos oficiales del juego para la region elegida:
// libro de exploracion (para que sirve la zona y sus lugares) y Bestiario
// (criaturas, estadisticas, ataques, recompensas y debilidades de los jefes).
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Heart, Swords, Wind, Coins, Trophy, Search, X } from 'lucide-react';
import useOfficialData from './useOfficialData';
import { beastsForRegion, adventureForRegion, FAMILY_ICONS, WEAPON_ICONS, goldRange } from './compendiumModel';
import { baseLang, pickLang, normalizeText } from '../logbook/logbookModel';

const fmt = (n, lang) => (Number.isFinite(n) ? new Intl.NumberFormat(lang).format(n) : '—');

function Section({ icon, title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0a1120]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span aria-hidden="true">{icon}</span>
        <span className="flex-1 text-[10.5px] font-black uppercase tracking-wider text-amber-300">{title}</span>
        {count != null && <span className="rounded-md bg-slate-800 px-1.5 text-[10px] font-black text-slate-400 tabular-nums">{count}</span>}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-2 border-t border-slate-800/70 px-3 py-2.5 lb-fade">{children}</div>}
    </section>
  );
}

function Stat({ icon: Icon, value, label, cls }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${cls}`} title={label}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {value}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function BeastCard({ beast, families, lang }) {
  const { t } = useTranslation('compendium');
  const [open, setOpen] = useState(false);
  const family = families.get(beast.family);
  const facts = pickLang(beast, 'facts', lang) || [];
  const isBoss = beast.stats.boss;
  return (
    <div className={`rounded-lg border transition-colors ${isBoss ? 'border-rose-500/40 bg-rose-500/[0.05]' : 'border-slate-800 bg-[#0c1424]'} ${open ? 'border-amber-500/40' : ''}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-2.5 py-2 text-left cursor-pointer" aria-expanded={open}>
        <span className="text-base" aria-hidden="true">{FAMILY_ICONS[beast.family] || '❔'}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12px] font-bold text-slate-100">{pickLang(beast, 'name', lang)}</span>
            {isBoss && <span className="shrink-0 rounded bg-rose-500/20 px-1 text-[8.5px] font-black uppercase tracking-wider text-rose-300">{t('boss')}</span>}
          </span>
          <span className="block text-[10px] text-slate-500">
            {family ? pickLang(family, 'name', lang) : ''}{beast.tier ? ` · ${'★'.repeat(Math.min(beast.tier, 5))}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 gap-1">
          <Stat icon={Heart} value={fmt(beast.stats.hp, lang)} label={t('stats.hp')} cls="text-rose-300" />
          <Stat icon={Swords} value={fmt(beast.stats.damage, lang)} label={t('stats.damage')} cls="text-amber-300" />
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-800/70 px-2.5 py-2 text-[11px] leading-snug lb-fade">
          {pickLang(beast, 'description', lang) && <p className="italic text-slate-300">{pickLang(beast, 'description', lang)}</p>}
          <div className="flex flex-wrap gap-1">
            <Stat icon={Heart} value={fmt(beast.stats.hp, lang)} label={t('stats.hp')} cls="text-rose-300" />
            <Stat icon={Swords} value={fmt(beast.stats.damage, lang)} label={t('stats.damage')} cls="text-amber-300" />
            <Stat icon={Wind} value={fmt(beast.stats.speed, lang)} label={t('stats.speed')} cls="text-sky-300" />
            {goldRange(beast.stats.gold) && <Stat icon={Coins} value={goldRange(beast.stats.gold)} label={t('stats.gold')} cls="text-yellow-300" />}
            {beast.reward > 0 && <Stat icon={Trophy} value={fmt(beast.reward, lang)} label={t('stats.reward')} cls="text-emerald-300" />}
          </div>
          {facts.length > 0 && (
            <ul className="space-y-0.5">
              {facts.map((f, i) => <li key={i} className="text-slate-300">• {f}</li>)}
            </ul>
          )}
          {beast.weapons && (beast.weapons.weak || beast.weapons.immune) && (
            <div className="flex flex-wrap gap-1.5">
              {beast.weapons.weak && (
                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  {WEAPON_ICONS[beast.weapons.weak]} {t('weak', { weapon: t(`weapons.${beast.weapons.weak}`) })}
                </span>
              )}
              {beast.weapons.immune && (
                <span className="rounded-md border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                  {WEAPON_ICONS[beast.weapons.immune]} {t('immune', { weapon: t(`weapons.${beast.weapons.immune}`) })}
                </span>
              )}
            </div>
          )}
          {pickLang(beast, 'where', lang) && <p className="text-[10.5px] text-slate-500">📍 {pickLang(beast, 'where', lang)}</p>}
          {beast.reward > 0 && <p className="text-[10px] text-slate-500">{t('rewardHint', { gold: fmt(beast.reward, lang) })}</p>}
        </div>
      )}
    </div>
  );
}

export default function RegionCompendium({ regionId }) {
  const { t, i18n } = useTranslation('compendium');
  const lang = baseLang(i18n.language);
  const bestiary = useOfficialData('bestiary');
  const adventure = useOfficialData('adventure');
  const [query, setQuery] = useState('');
  const [allPlaces, setAllPlaces] = useState(false);

  const families = useMemo(() => new Map((bestiary?.families || []).map((f) => [f.id, f])), [bestiary]);
  const beasts = useMemo(() => beastsForRegion(bestiary, regionId), [bestiary, regionId]);
  const adv = useMemo(() => adventureForRegion(adventure, regionId), [adventure, regionId]);
  const shown = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return beasts;
    return beasts.filter((b) => normalizeText(`${b.name_en} ${b.name_es || ''} ${b.family}`).includes(q));
  }, [beasts, query]);

  if (!bestiary && !adventure) return null;

  return (
    <div className="space-y-2.5">
      {adv && (
        <Section icon="🧭" title={t('adventure.title')} count={adv.places.length}>
          {adv.region && pickLang(adv.region, 'about', lang) && (
            <p className="text-[11.5px] leading-snug text-slate-200">{pickLang(adv.region, 'about', lang)}</p>
          )}
          {adv.region && pickLang(adv.region, 'hint', lang) && (
            <p className="text-[10.5px] italic text-amber-200/70">💡 {pickLang(adv.region, 'hint', lang)}</p>
          )}
          <ul className="space-y-1.5">
            {(allPlaces ? adv.places : adv.places.slice(0, 3)).map((p) => (
              <li key={`${p.map}-${p.id}`} className="rounded-lg border border-slate-800/80 bg-[#0c1424] px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-100">
                  <span aria-hidden="true">{p.cave ? '🕳️' : '📍'}</span>
                  {pickLang(p, 'name', lang)}
                </div>
                {pickLang(p, 'words', lang) && <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{pickLang(p, 'words', lang)}</p>}
                {pickLang(p, 'way', lang) && <p className="mt-0.5 text-[10px] text-sky-300/80">➜ {pickLang(p, 'way', lang)}</p>}
              </li>
            ))}
          </ul>
          {adv.places.length > 3 && (
            <button type="button" onClick={() => setAllPlaces((v) => !v)} className="w-full rounded-lg border border-slate-800 py-1 text-[10.5px] font-bold text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/[0.05] cursor-pointer">
              {allPlaces ? t('adventure.showLess') : t('adventure.showAll', { count: adv.places.length })}
            </button>
          )}
        </Section>
      )}

      {beasts.length > 0 && (
        <Section icon="🐾" title={t('bestiary.title')} count={beasts.length}>
          {beasts.length > 6 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#080d17] px-2 py-1">
              <Search className="h-3 w-3 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('bestiary.search')}
                aria-label={t('bestiary.search')}
                className="w-full bg-transparent text-[11px] text-slate-100 placeholder:text-slate-600 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-200 cursor-pointer" aria-label={t('bestiary.clear')}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            {shown.map((b) => <BeastCard key={b.id} beast={b} families={families} lang={lang} />)}
          </div>
          <p className="text-[9.5px] text-slate-600">{t('bestiary.source')}</p>
        </Section>
      )}
    </div>
  );
}
