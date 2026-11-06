// src/components/bloomshire/tabs/CalcTab.jsx
import React, { useState, useMemo } from 'react';
import { Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import calcData from '../../../../public/data/bloomshire/calc_data.json';
import { sortCalcList, nextCalcSort, parseCalcSort } from '../calcSort';

// Claves de orden del desplegable y de los presets (estrategias); el resto sale de tocar una columna
const STRATEGY_SORTS = ['xpEnergy_desc', 'goldEnergy_desc', 'xpMin_desc', 'goldMin_desc', 'time_asc', 'cost_asc', 'sell_desc'];
const HEADER_KEY = { plots: 'totalPlots', xpEnergy: 'xpPerEnergy', goldEnergy: 'goldPerEnergy', xpMin: 'xpPerMin', goldMin: 'goldPerMin' };

export default function CalcTab({ 
  currentEnergy = 80, 
  maxEnergy = 80, 
  farmingLevel = 1, 
  playerPerks = null 
}) {
  const { t, i18n } = useTranslation('calc');
  const calcEn = String(i18n.language || '').toLowerCase().startsWith('en');
  // Nombres del juego (codice oficial) y tiempo de cada recurso segun sus reglas (golpes de pico y hacha)
  const itemName = (item) => (calcEn ? item.name_en : item.name_es) || item.name;
  const growLabel = (item, minutes) => {
    if (calcSkill === 'farming') return item.growTxt || `${minutes} min`;
    if (item.hits) return item.toolTier ? t(item.toolKind === 'axe' ? 'grow.axeHits' : 'grow.pickHits', { n: item.hits, tool: t(`grow.tiers.${item.toolTier}`) }) : t('grow.hits', { n: item.hits });
    return '—';
  };
  const [calcSkill, setCalcSkill] = useState('farming');
  const [calcLevelFilter, setCalcLevelFilter] = useState('all');
  // calcSort ordena la tabla; strategySort decide el cultivo que recomienda el simulador (no cambia al tocar columnas)
  const [calcSort, setCalcSort] = useState('xpEnergy_desc');
  const [strategySort, setStrategySort] = useState('xpEnergy_desc');
  const chooseStrategy = (key) => { setCalcSort(key); setStrategySort(key); };
  const [calcSeasonFilter, setCalcSeasonFilter] = useState('all');
  const [availablePlots, setAvailablePlots] = useState(8);
  const [simulatedEnergy, setSimulatedEnergy] = useState('');
  const [calcStrategyPreset, setCalcStrategyPreset] = useState('energy');

  const hasFoundersTimeBonus = Boolean(playerPerks?.fast && playerPerks.fast < 1);

  const filteredCalcList = useMemo(() => {
    let list = [...(calcData[calcSkill] || [])];

    // Filtro de Temporada / Epoca (solo para cultivo)
    if (calcSkill === 'farming' && calcSeasonFilter !== 'all') {
      list = list.filter(x => x.season === 'all' || x.season === calcSeasonFilter);
    }

    if (calcLevelFilter !== 'all') {
      if (calcLevelFilter === 'vip' || calcLevelFilter === 'special') {
        list = list.filter(x => (x.level ?? 1) >= 15);
      } else {
        const targetLv = parseInt(calcLevelFilter, 10);
        list = list.filter(x => (x.level ?? 1) <= targetLv || targetLv >= 10);
      }
    }

    return list;
  }, [calcSkill, calcSeasonFilter, calcLevelFilter]);

  const sortCtx = { skill: calcSkill, farmingLevel, name: itemName, locale: i18n.language };
  const tableList = useMemo(
    () => sortCalcList(filteredCalcList, calcSort, sortCtx),
    [filteredCalcList, calcSort, calcSkill, farmingLevel, i18n.language]
  );
  const { field: sortField, dir: sortDir } = parseCalcSort(calcSort);
  const headerLabel = (field) => t(`table.headers.${HEADER_KEY[field] || field}`, { plots: availablePlots });

  // Encabezado que ordena al tocarlo (primer clic segun la columna; el segundo invierte)
  const renderSortTh = (field, children, className = '') => {
    const active = sortField === field;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        className={className ? `p-0 ${className}` : 'p-0'}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => setCalcSort(prev => nextCalcSort(prev, field))}
          title={t('table.sortBy', { col: headerLabel(field) })}
          className={`group w-full p-3 flex items-center gap-1 text-left uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-white hover:bg-white/5 ${active ? 'text-white' : ''}`}
        >
          <span className="whitespace-nowrap">{children}</span>
          <Icon className={`w-3 h-3 shrink-0 transition-all duration-200 ${active ? 'opacity-100 text-amber-300' : 'opacity-30 group-hover:opacity-80'}`} />
        </button>
      </th>
    );
  };

  const simEnergyVal = simulatedEnergy !== '' ? simulatedEnergy : Math.floor(currentEnergy || 80);
  const topCrop = sortCalcList(filteredCalcList, strategySort, sortCtx)[0] || null;
  const energyPerCrop = calcSkill === 'farming' ? 2 : 1;
  const cropsPossible = Math.floor(simEnergyVal / energyPerCrop);
  const batchesPossible = Math.floor(cropsPossible / Math.max(1, availablePlots));

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      {/* Barra de Presets Estrategicos */}
      <div className="p-3.5 bg-gradient-to-r from-[#0d162d] via-[#101b38] to-[#0d162d] border border-indigo-950/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <span>🎯</span> {t('strategicMode')}
          </span>
          <button
            type="button"
            onClick={() => { chooseStrategy('xpEnergy_desc'); setCalcStrategyPreset('energy'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              strategySort === 'xpEnergy_desc'
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>⚡</span> <span>{t('presets.energy')}</span>
          </button>
          <button
            type="button"
            onClick={() => { chooseStrategy('xpMin_desc'); setCalcStrategyPreset('speedrun'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              strategySort === 'xpMin_desc'
                ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>⏱️</span> <span>{t('presets.speedrun')}</span>
          </button>
          <button
            type="button"
            onClick={() => { chooseStrategy('goldEnergy_desc'); setCalcStrategyPreset('gold_energy'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              strategySort === 'goldEnergy_desc'
                ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>🪙</span> <span>{t('presets.gold_energy')}</span>
          </button>
          <button
            type="button"
            onClick={() => { chooseStrategy('goldMin_desc'); setCalcStrategyPreset('profit'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              strategySort === 'goldMin_desc'
                ? 'bg-purple-500/30 text-purple-300 border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>💰</span> <span>{t('presets.profit')}</span>
          </button>
        </div>

        {calcSkill === 'farming' && (
          <div className="flex items-center gap-2 text-xs bg-[#14203d] px-3 py-1 rounded-lg border border-amber-500/30 text-amber-200">
            <span className="font-bold">{t('plots')}</span>
            <input 
              type="number" 
              value={availablePlots} 
              onChange={(e) => setAvailablePlots(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-[#0a1020] border border-slate-600 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
            />
          </div>
        )}
      </div>

      {/* Simulador Interactivo de Energia Restante */}
      <div className="p-4 bg-gradient-to-r from-[#101b38] via-[#0d162d] to-[#0a1122] border border-cyan-500/40 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-2 flex-wrap">
              <span>{t('simulator.title')}</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                {t('simulator.liveGame', { current: Math.floor(currentEnergy), max: maxEnergy })}
              </span>
            </div>
            <div className="text-[11.5px] text-slate-300 mt-0.5">
              {t('simulator.description')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#070d1c] px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
            <span>{t('simulator.yourEnergy')}</span>
            <input
              type="number"
              value={simulatedEnergy !== '' ? simulatedEnergy : Math.floor(currentEnergy || 80)}
              onChange={(e) => setSimulatedEnergy(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 bg-[#121c38] border border-amber-500/50 rounded px-2 py-0.5 text-center font-mono font-black text-amber-300 text-xs"
              placeholder="80"
            />
            {simulatedEnergy !== '' && (
              <button
                type="button"
                onClick={() => setSimulatedEnergy('')}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
              >
                {t('simulator.resetLive')}
              </button>
            )}
          </div>

          {topCrop && (
            <div className="px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-3 text-xs flex-wrap">
              <span className="text-emerald-300 font-bold">
                <Trans
                  i18nKey="simulator.withEnergy"
                  ns="calc"
                  values={{ energy: simEnergyVal, crop: itemName(topCrop) }}
                  components={{ bold: <b /> }}
                />
              </span>
              <span className="font-mono text-amber-300 font-black">
                {t('simulator.cropsAndBatches', { crops: cropsPossible, batches: batchesPossible })}
              </span>
              <span className="font-mono text-emerald-400 font-black">
                {t('simulator.xpGain', { amount: new Intl.NumberFormat(i18n.language).format(cropsPossible * (topCrop.xp ?? 0)) })}
              </span>
              <span className="font-mono text-cyan-300 font-black">
                {t('simulator.goldGain', { amount: new Intl.NumberFormat(i18n.language).format(cropsPossible * ((topCrop.sell ?? 0) - (topCrop.cost ?? 0))) })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Filtros Detallados */}
      <div className="p-3.5 bg-[#0e172c] border border-indigo-950/70 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-amber-400" /> {t('filters.skillLabel')}
            <select 
              value={calcSkill} 
              onChange={(e) => setCalcSkill(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-amber-300 rounded px-2.5 py-1 text-xs font-bold cursor-pointer"
            >
              <option value="farming">{t('filters.skills.farming')}</option>
              <option value="mining">{t('filters.skills.mining')}</option>
              <option value="foraging">{t('filters.skills.foraging')}</option>
              <option value="fishing">{t('filters.skills.fishing')}</option>
            </select>
          </div>

          {/* Selector de Epoca del Ano (Solo Cultivo) */}
          {calcSkill === 'farming' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="text-amber-400">🍂</span> {t('filters.seasonLabel')}
              <select 
                value={calcSeasonFilter} 
                onChange={(e) => setCalcSeasonFilter(e.target.value)}
                className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
              >
                <option value="all">{t('filters.seasons.all')}</option>
                <option value="Winter">{t('filters.seasons.Winter')}</option>
                <option value="Spring">{t('filters.seasons.Spring')}</option>
                <option value="Summer">{t('filters.seasons.Summer')}</option>
                <option value="Fall">{t('filters.seasons.Fall')}</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            {t('filters.levelLabel')}
            <select 
              value={calcLevelFilter} 
              onChange={(e) => setCalcLevelFilter(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
            >
              <option value="all">{t('filters.levels.all')}</option>
              <option value="1">{t('filters.levels.level1')}</option>
              <option value="2">{t('filters.levels.level2')}</option>
              <option value="3">{t('filters.levels.level3')}</option>
              <option value="4">{t('filters.levels.level4')}</option>
              <option value="5">{t('filters.levels.level5')}</option>
              <option value="6">{t('filters.levels.level6')}</option>
              <option value="7">{t('filters.levels.level7')}</option>
              <option value="8">{t('filters.levels.level8')}</option>
              <option value="10">{t('filters.levels.level10')}</option>
              <option value="special">{t('filters.levels.special')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            {t('filters.sortLabel')}
            <select 
              value={calcSort} 
              onChange={(e) => chooseStrategy(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-amber-300 font-bold rounded px-2.5 py-1 text-xs cursor-pointer"
            >
              <option value="xpEnergy_desc">{t('filters.sort.xpEnergy_desc')}</option>
              <option value="goldEnergy_desc">{t('filters.sort.goldEnergy_desc')}</option>
              <option value="xpMin_desc">{t('filters.sort.xpMin_desc')}</option>
              <option value="goldMin_desc">{t('filters.sort.goldMin_desc')}</option>
              <option value="time_asc">{t('filters.sort.time_asc')}</option>
              <option value="cost_asc">{t('filters.sort.cost_asc')}</option>
              <option value="sell_desc">{t('filters.sort.sell_desc')}</option>
              {!STRATEGY_SORTS.includes(calcSort) && (
                <option value={calcSort}>
                  {t('filters.sort.column', { col: headerLabel(sortField), dir: t(sortDir === 'asc' ? 'filters.sort.dirAsc' : 'filters.sort.dirDesc') })}
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados Multivariable */}
      <div className="bg-[#0e172c] border border-indigo-950/70 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-[#121d38] border-b border-slate-800 text-slate-300 uppercase tracking-wider text-[10.5px] font-black">
                {renderSortTh('item', t('table.headers.item'))}
                {calcSkill === 'farming' && renderSortTh('season', t('table.headers.season'))}
                {renderSortTh('time', t('table.headers.time'))}
                {renderSortTh('level', t('table.headers.level'))}
                {renderSortTh('cost', t('table.headers.cost'))}
                {renderSortTh('sell', t('table.headers.sell'))}
                {renderSortTh('net', t('table.headers.net'))}
                {renderSortTh('xp', t('table.headers.xp'))}
                {renderSortTh('energy', t('table.headers.energy'), 'text-amber-300 bg-amber-950/30 border-l border-amber-900/40')}
                {renderSortTh('xpEnergy', t('table.headers.xpPerEnergy'), 'text-emerald-300 bg-emerald-950/30')}
                {renderSortTh('goldEnergy', t('table.headers.goldPerEnergy'), 'text-cyan-300 bg-cyan-950/30 border-r border-cyan-900/40')}
                {renderSortTh('xpMin', t('table.headers.xpPerMin'))}
                {renderSortTh('goldMin', t('table.headers.goldPerMin'))}
                {calcSkill === 'farming' && renderSortTh('plots', t('table.headers.totalPlots', { plots: availablePlots }))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tableList.map((item, idx) => {
                const timeMinutes = item.grow ?? 1;
                const adjustedTime = hasFoundersTimeBonus ? Math.max(1, Math.round(timeMinutes * 0.8)) : timeMinutes;
                const netProfit = (item.sell ?? 0) - (item.cost ?? 0);
                const energyCost = calcSkill === 'farming' ? 2 : (item.energyCost || item.energy || 1);
                const xp = item.xp ?? 0;
                const xpPerEnergy = Number((xp / energyCost).toFixed(1));
                const goldPerEnergy = Number((netProfit / energyCost).toFixed(1));
                const batchNet = netProfit * availablePlots;
                const batchXp = xp * availablePlots;
                const batchEnergy = energyCost * availablePlots;

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                      {itemName(item)}
                    </td>
                    {calcSkill === 'farming' && (
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.season === 'Winter' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50' :
                          item.season === 'Spring' ? 'bg-pink-950/80 text-pink-300 border border-pink-700/50' :
                          item.season === 'Summer' ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50' :
                          item.season === 'Fall' ? 'bg-orange-950/80 text-orange-300 border border-orange-700/50' :
                          'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                        }`}>
                          {item.season && item.season !== 'all' ? t(`filters.seasons.${item.season}`) : t('table.allYear')}
                        </span>
                      </td>
                    )}
                    <td className="p-3 font-mono text-cyan-300 whitespace-nowrap">
                      {growLabel(item, adjustedTime)}
                      {hasFoundersTimeBonus && <span className="text-[10px] text-emerald-400 ml-1">(-20%)</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                        {t('table.levelBadge', { level: item.level || 1 })}
                      </span>
                    </td>
                    <td className="p-3 text-red-300 font-mono whitespace-nowrap">{item.cost ? `${item.cost}g` : '0g'}</td>
                    <td className="p-3 text-amber-300 font-mono font-bold whitespace-nowrap">{item.sell ? `${item.sell}g` : '0g'}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {netProfit >= 0 ? `+${new Intl.NumberFormat(i18n.language).format(netProfit)}g` : `${new Intl.NumberFormat(i18n.language).format(netProfit)}g`}
                    </td>
                    <td className="p-3 text-purple-300 font-mono font-bold whitespace-nowrap">+{xp} XP</td>
                    
                    {/* ⚡ Gasto de Energia */}
                    <td className="p-3 bg-amber-950/20 border-l border-amber-900/30 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10.5px]">
                        -{energyCost}⚡
                      </span>
                    </td>

                    {/* 🎯 XP por Energia */}
                    <td className="p-3 bg-emerald-950/20 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-mono font-black text-xs border ${
                        xpPerEnergy >= 10
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                          : xpPerEnergy >= 5
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700'
                      }`}>
                        {xpPerEnergy} XP/⚡
                      </span>
                    </td>

                    {/* 🪙 Oro por Energia */}
                    <td className="p-3 bg-cyan-950/20 border-r border-cyan-900/30 whitespace-nowrap font-mono font-bold text-xs">
                      <span className={goldPerEnergy >= 50 ? 'text-cyan-300' : 'text-slate-300'}>
                        {goldPerEnergy >= 0 ? `+${goldPerEnergy}` : goldPerEnergy}g/⚡
                      </span>
                    </td>

                    <td className="p-3 text-purple-400 font-mono font-bold whitespace-nowrap">
                      {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                        <div className="flex flex-col">
                          <span>{item.regrowXpMin}</span>
                          <span className="text-[10px] text-purple-300/70 font-normal">{t('table.regrowBadge')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span>{item.xpMin || 0}</span>
                          {calcSkill === 'farming' && item.hasRegrow && (
                            <span className="text-[10px] text-slate-500 font-normal">{t('table.regrowLevel', { val: item.regrowXpMin })}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-amber-400 font-mono font-bold whitespace-nowrap">
                      {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                        <div className="flex flex-col">
                          <span>{item.regrowGoldMin}g</span>
                          <span className="text-[10px] text-amber-300/70 font-normal">{t('table.regrowBadge')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span>{item.goldMin || 0}g</span>
                          {calcSkill === 'farming' && item.hasRegrow && (
                            <span className="text-[10px] text-slate-500 font-normal">{t('table.regrowLevel', { val: item.regrowGoldMin + 'g' })}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {calcSkill === 'farming' && (
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-emerald-300">
                            +{new Intl.NumberFormat(i18n.language).format(batchNet)}g <span className="text-purple-300 text-[10px]">/ +{new Intl.NumberFormat(i18n.language).format(batchXp)}XP</span>
                          </span>
                          <span className="text-[10px] text-amber-300/80 font-mono">
                            {t('table.consumption', { energy: batchEnergy })}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
