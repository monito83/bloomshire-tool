import React, { useState, useMemo } from 'react';
import { MapPin, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import defaultCraftData from '../../../../public/data/bloomshire/craft_data.json';
import {
  CRAFT_STATION_LOCATIONS,
  getRecipeCraftability,
  ItemSprite,
  CraftMaterialsBadge
} from '../bloomshireHelpers';

export default function CraftTab({
  rawInventory = [],
  locateInMegaAtlas = () => {},
  craftData: propCraftData,
  initialCraftCategory = 'bench',
  skillsBreakdown = null
}) {
  const { t, i18n } = useTranslation('craft');
  // En ingles, los textos de las recetas (que la tool guarda en espanol) se arman desde sus datos
  const craftEn = String(i18n.language || '').toLowerCase().startsWith('en');
  const placeKeyOf = (place) => {
    const p = String(place || '');
    if (/Estufa/.test(p)) return 'stove';
    if (/Banco/.test(p)) return 'bench';
    if (/Yunque/.test(p)) return 'anvil';
    if (/Forja/.test(p)) return 'forge';
    if (/Lecher/.test(p)) return 'dairy';
    if (/Molino/.test(p)) return 'mill';
    if (/Telar/.test(p)) return 'loom';
    return null;
  };
  const recipeView = (r) => {
    if (!craftEn || !r) return r;
    const placeKey = placeKeyOf(r.place);
    const place = placeKey ? t(`recipe.places.${placeKey}`) : r.place;
    const lvl = String(r.level || '');
    let level = lvl;
    let m;
    if ((m = lvl.match(/^Cocina Lv (\d+) • (.+)$/))) level = t('recipe.cookLevel', { n: m[1], tier: m[2] });
    else if ((m = lvl.match(/^Artesan\S+ Lv (\d+) \(\+(\d+) XP\)$/))) level = t('recipe.craftLevel', { n: m[1], xp: m[2] });
    else if ((m = lvl.match(/^Lecher\S+ \(Hollin\) • Lv (\d+)$/))) level = t('recipe.dairyLevel', { n: m[1] });
    else if ((m = lvl.match(/^Molino \(Hollin\) • Lv (\d+)$/))) level = t('recipe.millLevel', { n: m[1] });
    const d = String(r.desc || '');
    let desc = d;
    if ((m = d.match(/Tipo de plato: (\w+)/))) desc = t('recipe.cookDesc', { energy: r.energyRestore, health: r.healthRestore, kind: m[1], min: r.minutes });
    else if ((m = d.match(/Consume (\d+)⚡ y (\d+)g en (\d+) min/))) desc = t('recipe.craftDesc', { place, energy: m[1], gold: m[2], min: m[3] });
    else if ((m = d.match(/Produce (\d+) unidad/))) desc = t('recipe.makeDesc', { place, n: m[1] });
    const emoji = (String(r.item || '').match(/\s(\p{Extended_Pictographic}\S*)$/u) || [])[1];
    return { ...r, item: r.dish ? `${r.dish}${emoji ? ` ${emoji}` : ''}` : r.item, level, desc, place };
  };
  const craftData = propCraftData || defaultCraftData;
  const [craftCategory, setCraftCategory] = useState(initialCraftCategory);
  const [craftViewMode, setCraftViewMode] = useState('grid');
  const [craftSearchQuery, setCraftSearchQuery] = useState('');
  const [craftLevelFilter, setCraftLevelFilter] = useState('all');
  const [craftSortBy, setCraftSortBy] = useState('level_asc');
  const [craftOnlyAvailable, setCraftOnlyAvailable] = useState(false);

  const currentSkillLevel = useMemo(() => {
    if (!skillsBreakdown) return null;
    if (craftCategory === 'cook') return skillsBreakdown.cooking?.level || 1;
    return skillsBreakdown.crafting?.level || 1;
  }, [skillsBreakdown, craftCategory]);

  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analiticas multi-variables
  const filteredAndSortedCrafts = useMemo(() => {
    let list = (craftData && craftData[craftCategory]) ? [...craftData[craftCategory]] : [];

    if (craftSearchQuery && craftSearchQuery.trim()) {
      const q = craftSearchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.item && r.item.toLowerCase().includes(q)) ||
        (r.dish && r.dish.toLowerCase().includes(q)) ||
        (r.craftItem && r.craftItem.toLowerCase().includes(q)) ||
        (r.mats && r.mats.toLowerCase().includes(q)) ||
        (r.desc && r.desc.toLowerCase().includes(q)) ||
        (r.place && r.place.toLowerCase().includes(q))
      );
    }

    if (craftLevelFilter && craftLevelFilter !== 'all') {
      if (craftLevelFilter === 'special') {
        list = list.filter(r => !r.levelNum || r.levelNum === 0 || (r.level && (r.level.toLowerCase().includes('misi') || r.level.toLowerCase().includes('especial') || r.level.toLowerCase().includes('vip'))));
      } else {
        const targetNum = Number(craftLevelFilter);
        list = list.filter(r => (r.levelNum || 1) <= targetNum);
      }
    }

    const enriched = list.map(r => {
      const craftability = getRecipeCraftability(r, rawInventory);
      const energyCost = typeof r.energyCost === 'number' ? r.energyCost : (craftCategory === 'cook' ? 1 : craftCategory === 'forge' ? 3 : 2);
      const energyRestore = typeof r.energyRestore === 'number' ? r.energyRestore : 0;
      const netEnergy = energyRestore - energyCost;

      const goldCost = typeof r.goldCost === 'number' ? r.goldCost : 50;
      const sellPrice = typeof r.sellPrice === 'number' ? r.sellPrice : 3000;
      const netGold = Math.max(0, sellPrice - goldCost);

      const minutes = Math.max(1, typeof r.minutes === 'number' ? r.minutes : 1);
      const goldPerMin = Math.round(netGold / minutes);
      const xp = typeof r.xp === 'number' ? r.xp : 25;
      const levelNum = typeof r.levelNum === 'number' ? r.levelNum : (parseInt((r.level || '').replace(/[^0-9]/g, '')) || 1);
      
      const goldPerEnergy = energyCost > 0 ? Math.round(netGold / energyCost) : netGold;
      const xpPerEnergy = energyCost > 0 ? Number((xp / energyCost).toFixed(1)) : xp;
      const xpPerMin = Math.round(xp / minutes);

      return {
        ...r,
        craftability,
        energyCost,
        energyRestore,
        netEnergy,
        goldCost,
        sellPrice,
        netGold,
        minutes,
        goldPerMin,
        goldPerEnergy,
        xpPerEnergy,
        xpPerMin,
        xp,
        levelNum
      };
    });

    let finalFiltered = enriched;
    if (craftOnlyAvailable) {
      finalFiltered = finalFiltered.filter(r => r.craftability.canCraft);
    }

    finalFiltered.sort((a, b) => {
      if (craftSortBy === 'energy_desc') {
        return (b.netEnergy || 0) - (a.netEnergy || 0);
      }
      if (craftSortBy === 'energy_eff_desc') {
        return (b.goldPerEnergy || 0) - (a.goldPerEnergy || 0);
      }
      if (craftSortBy === 'energy_xp_desc') {
        return (b.xpPerEnergy || 0) - (a.xpPerEnergy || 0);
      }
      if (craftSortBy === 'profit_desc') {
        return (b.netGold || 0) - (a.netGold || 0);
      }
      if (craftSortBy === 'rate_desc') {
        return (b.goldPerMin || 0) - (a.goldPerMin || 0);
      }
      if (craftSortBy === 'time_asc') {
        return (a.minutes || 0) - (b.minutes || 0);
      }
      if (craftSortBy === 'xp_desc') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (craftSortBy === 'name_asc') {
        return (a.item || '').localeCompare(b.item || '');
      }
      return (a.levelNum || 1) - (b.levelNum || 1);
    });

    return finalFiltered;
  }, [craftCategory, craftData, craftSearchQuery, craftSortBy, craftLevelFilter, craftOnlyAvailable, rawInventory]);

  const totalCraftableInCurrentCategory = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    return list.filter(r => getRecipeCraftability(r, rawInventory).canCraft).length;
  }, [craftCategory, craftData, rawInventory]);

  // Conteo de crafteables en vivo por cada una de las 5 estaciones
  const craftableCountsByCategory = useMemo(() => {
    const counts = {};
    if (!craftData) return counts;
    ['bench', 'forge', 'cook', 'mill', 'loom'].forEach(k => {
      const list = craftData[k] || [];
      counts[k] = list.filter(r => getRecipeCraftability(r, rawInventory).canCraft).length;
    });
    return counts;
  }, [craftData, rawInventory]);

  // Resumen tactico de la estacion actual
  const stationSummary = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    let bestEnergyDish = null;
    let bestProfitCraft = null;
    let fastestItem = null;

    list.forEach(r => {
      const eRestore = r.energyRestore || 0;
      if (!bestEnergyDish || eRestore > (bestEnergyDish.energyRestore || 0)) {
        bestEnergyDish = r;
      }
      const netG = (r.sellPrice || 0) - (r.goldCost || 0);
      if (!bestProfitCraft || netG > ((bestProfitCraft.sellPrice || 0) - (bestProfitCraft.goldCost || 0))) {
        bestProfitCraft = r;
      }
      const mins = r.minutes || 1;
      if (!fastestItem || mins < (fastestItem.minutes || 1)) {
        fastestItem = r;
      }
    });

    return {
      total: list.length,
      bestEnergyDish,
      bestProfitCraft,
      fastestItem
    };
  }, [craftCategory, craftData]);

  return (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Selector de Estaciones de Trabajo con Badges de Crafteables Ahora */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'cook', label: t('tabs.cook'), badgeKey: 'cook' },
                { key: 'bench', label: t('tabs.bench'), badgeKey: 'bench' },
                { key: 'forge', label: t('tabs.forge'), badgeKey: 'forge' },
                { key: 'mill', label: t('tabs.mill'), badgeKey: 'mill' },
                { key: 'loom', label: t('tabs.loom'), badgeKey: 'loom' }
              ].map(sub => {
                const readyCount = craftableCountsByCategory[sub.badgeKey] || 0;
                return (
                  <button
                    key={sub.key}
                    onClick={() => setCraftCategory(sub.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      craftCategory === sub.key 
                        ? 'bg-purple-600 text-white font-black shadow-md border border-purple-400' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {readyCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-mono font-bold bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-sm animate-pulse">
                        {t('readyBadge', { count: readyCount })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Banner Tactico de la Estacion con Analiticas de Rendimiento Global */}
            {CRAFT_STATION_LOCATIONS[craftCategory] && (
              <div className="p-4 bg-gradient-to-r from-[#131d38] via-[#17254a] to-[#111a33] border-2 border-purple-500/50 rounded-xl shadow-lg flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>{t(`stations.${craftCategory}.name`)}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      🧭 {t(`stations.${craftCategory}.desc`)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory])}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      title={t('locateStationTitle')}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t('locateStation')}</span>
                    </button>
                    {CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation && (
                      <button
                        onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title={t('cabinTitle')}
                      >
                        <span>{t('cabinButton')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Radar Tactico de Alto Rendimiento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 font-mono text-xs">
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">{t('radar.stationCatalog')}</span>
                    <span className="text-white font-black text-sm">{t('radar.recipesCount', { count: stationSummary.total })}</span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-emerald-400 uppercase font-sans font-bold">{t('radar.craftableNow')}</span>
                    <span className="text-emerald-300 font-black text-sm">
                      {totalCraftableInCurrentCategory > 0 ? t('radar.readyCount', { count: totalCraftableInCurrentCategory }) : t('radar.zeroReady')}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-amber-400 uppercase font-sans font-bold">{t('radar.maxGoldProfit')}</span>
                    <span className="text-amber-300 font-bold text-xs truncate">
                      {stationSummary.bestProfitCraft ? `+${new Intl.NumberFormat(i18n.language).format((stationSummary.bestProfitCraft.sellPrice || 0) - (stationSummary.bestProfitCraft.goldCost || 0))}g` : '-'}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-cyan-400 uppercase font-sans font-bold">{t('radar.maxEnergyRestore')}</span>
                    <span className="text-cyan-300 font-bold text-xs truncate">
                      {stationSummary.bestEnergyDish && stationSummary.bestEnergyDish.energyRestore > 0 ? `+${stationSummary.bestEnergyDish.energyRestore}⚡` : t('radar.craftCost')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Crafteo: Busqueda, Ordenamiento y Vista */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1628] border border-slate-800/80 p-2.5 rounded-xl shadow-sm">
              <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={t('controls.searchPlaceholder')}
                  value={craftSearchQuery}
                  onChange={(e) => setCraftSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-slate-500 font-medium"
                />
                {craftSearchQuery && (
                  <button
                    onClick={() => setCraftSearchQuery('')}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Boton Toggle Crafteables Ahora con mis Materiales */}
                <button
                  onClick={() => setCraftOnlyAvailable(!craftOnlyAvailable)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    craftOnlyAvailable
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-[#14203d] text-slate-300 hover:text-emerald-300 border-slate-700'
                  }`}
                  title={t('controls.filterAvailableTitle')}
                >
                  <span>{t('controls.filterAvailable')}</span>
                  {totalCraftableInCurrentCategory > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-400 text-emerald-300">
                      {totalCraftableInCurrentCategory}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-bold text-slate-400">{t('controls.levelLabel')}</span>
                  <select
                    value={craftLevelFilter}
                    onChange={(e) => setCraftLevelFilter(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="all">{t('controls.levels.all')}</option>
                    <option value="1">{t('controls.levels.upTo1')}</option>
                    <option value="2">{t('controls.levels.upTo', { level: 2 })}</option>
                    <option value="3">{t('controls.levels.upTo', { level: 3 })}</option>
                    <option value="4">{t('controls.levels.upTo', { level: 4 })}</option>
                    <option value="5">{t('controls.levels.upTo5')}</option>
                    <option value="6">{t('controls.levels.upTo', { level: 6 })}</option>
                    <option value="7">{t('controls.levels.upTo', { level: 7 })}</option>
                    <option value="8">{t('controls.levels.upTo', { level: 8 })}</option>
                    <option value="9">{t('controls.levels.upTo', { level: 9 })}</option>
                    <option value="10">{t('controls.levels.upTo10')}</option>
                    <option value="11">{t('controls.levels.upTo', { level: 11 })}</option>
                    <option value="12">{t('controls.levels.upTo', { level: 12 })}</option>
                    <option value="13">{t('controls.levels.upTo', { level: 13 })}</option>
                    <option value="14">{t('controls.levels.upTo', { level: 14 })}</option>
                    <option value="15">{t('controls.levels.upTo', { level: 15 })}</option>
                    <option value="16">{t('controls.levels.upTo', { level: 16 })}</option>
                    <option value="17">{t('controls.levels.upTo', { level: 17 })}</option>
                    <option value="18">{t('controls.levels.upTo', { level: 18 })}</option>
                    <option value="19">{t('controls.levels.upTo', { level: 19 })}</option>
                    <option value="20">{t('controls.levels.upTo', { level: 20 })}</option>
                    <option value="22">{t('controls.levels.upTo', { level: 22 })}</option>
                    <option value="25">{t('controls.levels.upTo', { level: 25 })}</option>
                    <option value="28">{t('controls.levels.upTo', { level: 28 })}</option>
                    <option value="30">{t('controls.levels.upTo30')}</option>
                    <option value="special">{t('controls.levels.special')}</option>
                  </select>

                  {currentSkillLevel && currentSkillLevel > 1 && (
                    <button
                      type="button"
                      onClick={() => setCraftLevelFilter(String(currentSkillLevel))}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        craftLevelFilter === String(currentSkillLevel)
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                          : 'bg-[#14203d] hover:bg-[#1c2e56] text-amber-300 border-amber-500/40'
                      }`}
                      title={t('controls.myLevelTitle', {
                        skill: craftCategory === 'cook' ? t('controls.skills.cook') : t('controls.skills.craft'),
                        level: currentSkillLevel
                      })}
                    >
                      <span>{t('controls.myLevelButton', { level: currentSkillLevel })}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">{t('controls.sortLabel')}</span>
                  <select
                    value={craftSortBy}
                    onChange={(e) => setCraftSortBy(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="energy_desc">{t('controls.sort.energy_desc')}</option>
                    <option value="profit_desc">{t('controls.sort.profit_desc')}</option>
                    <option value="rate_desc">{t('controls.sort.rate_desc')}</option>
                    <option value="energy_eff_desc">{t('controls.sort.energy_eff_desc')}</option>
                    <option value="energy_xp_desc">{t('controls.sort.energy_xp_desc')}</option>
                    <option value="time_asc">{t('controls.sort.time_asc')}</option>
                    <option value="xp_desc">{t('controls.sort.xp_desc')}</option>
                    <option value="level_asc">{t('controls.sort.level_asc')}</option>
                    <option value="name_asc">{t('controls.sort.name_asc')}</option>
                  </select>
                </div>

                {/* Selector de Vista: Cuadricula vs Lista */}
                <div className="flex items-center bg-[#080d17] border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
                  <button
                    onClick={() => setCraftViewMode('grid')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={t('controls.viewGridTitle')}
                  >
                    <span>🔲</span>
                    <span className="hidden sm:inline">{t('controls.viewGrid')}</span>
                  </button>
                  <button
                    onClick={() => setCraftViewMode('list')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'list'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={t('controls.viewListTitle')}
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">{t('controls.viewList')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recetas de la Estacion Seleccionada */}
            {craftViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 overflow-y-auto">
              {filteredAndSortedCrafts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-sm text-slate-300">{t('empty.title')}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? t('empty.availableDesc')
                      : t('empty.searchDesc')}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipeRaw, idx) => {
                  const recipe = recipeView(recipeRaw);
                  const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                  const stationTarget = isLoomRecipe ? CRAFT_STATION_LOCATIONS.loom : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);
                  const { craftability, energyCost, energyRestore, netEnergy, goldCost, sellPrice, netGold, minutes, goldPerMin, goldPerEnergy, xpPerEnergy, xp } = recipe;

                  return (
                    <div 
                      key={recipe.id || idx} 
                      className={`p-2.5 rounded-xl flex flex-col justify-between shadow-sm gap-2 transition-all border ${
                        craftability.canCraft 
                          ? 'bg-gradient-to-b from-[#0c1825] to-[#0a121d] border-emerald-500/40 hover:border-emerald-400/70 ring-1 ring-emerald-500/20' 
                          : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5">
                        {/* Cabecera: Icono + Titulo + Status Crafteable */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemSprite name={recipeRaw.item} size={28} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate leading-tight">{recipe.item}</div>
                              <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">{recipe.level}</div>
                            </div>
                          </div>
                          {craftability.canCraft ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px] shadow-sm animate-pulse">
                              {t('card.batchCount', { count: craftability.maxBatches })}
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-400 font-mono text-[9px]">
                              {t('card.missingCount', { count: craftability.missingCount })}
                            </span>
                          )}
                        </div>

                        {/* Bloque de Rendimiento Tactico: Oro, Energia, Tiempo y XP */}
                        <div className="grid grid-cols-2 gap-1 bg-[#070b14] p-1.5 rounded-lg border border-slate-800/80 text-[10px] font-mono">
                          {/* Beneficio de Oro o Proposito de Comida */}
                          {craftCategory === 'cook' ? (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">{t('card.useSale')}</span>
                              <span className="text-amber-200 font-bold truncate text-[9.5px]">
                                {t('card.consumptionOrders')}
                              </span>
                              <span className="text-[8px] text-slate-400">
                                {t('card.notSellable')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">{t('card.baseValue')}</span>
                              <span className="text-amber-300 font-bold truncate">
                                {sellPrice > 0 ? `+${new Intl.NumberFormat(i18n.language).format(sellPrice)}g` : t('card.craftingMaterial')}
                              </span>
                              <span className="text-[8.5px] text-slate-400">
                                {goldCost > 0 ? t('card.costWithGold', { cost: goldCost }) : t('card.noGoldCost')}
                              </span>
                            </div>
                          )}

                          {/* Rendimiento de Energia */}
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">{t('card.energyBalance')}</span>
                            {energyRestore > 0 ? (
                              <span className="text-emerald-400 font-bold">
                                {t('card.netEnergy', { net: netEnergy })}
                              </span>
                            ) : (
                              <span className="text-blue-300 font-bold">
                                {t('card.costEnergy', { cost: energyCost })}
                              </span>
                            )}
                            <span className="text-[8.5px] text-slate-400">
                              {energyRestore > 0 ? t('card.restoreEnergy', { restore: energyRestore }) : t('card.craftEnergyCost')}
                            </span>
                          </div>

                          {/* Tiempo y Ratio Oro/Energia */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">{t('card.timeRatio')}</span>
                            <span className="text-cyan-300 font-bold">
                              {minutes === 1 ? t('card.timeMinute', { count: 1 }) : t('card.timeMinutes', { count: minutes })}
                            </span>
                            {craftCategory === 'cook' ? (
                              <span className="text-[8.5px] text-emerald-400 font-bold">
                                {t('card.returnRatio', { ratio: Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10 })}
                              </span>
                            ) : (
                              goldPerEnergy > 0 && (
                                <span className="text-[8.5px] text-emerald-400 font-bold">
                                  +{new Intl.NumberFormat(i18n.language).format(goldPerEnergy)}g / ⚡
                                </span>
                              )
                            )}
                          </div>

                          {/* XP y Ratio XP/Energia */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">{t('card.experience')}</span>
                            <span className="text-purple-300 font-bold">
                              ⭐ +{xp} XP
                            </span>
                            {xpPerEnergy > 0 && (
                              <span className="text-[8.5px] text-purple-300 font-bold">
                                +{xpPerEnergy} XP / ⚡
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Materiales requeridos con stock del inventario en vivo */}
                        <div className="p-1.5 bg-[#080d17] border border-slate-800/80 rounded leading-tight">
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span className="text-slate-400 font-sans font-bold">{t('card.ingredients')}</span>
                            {craftability.canCraft && (
                              <span className="text-emerald-400 font-mono font-bold text-[8.5px]">{t('card.materialsReady')}</span>
                            )}
                          </div>
                          <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                        </div>

                        {/* Descripcion condensada */}
                        {recipe.desc && (
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                            {recipe.desc}
                          </p>
                        )}
                      </div>

                      {/* Pie de tarjeta con Ubicacion */}
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                        <span className="text-[9.5px] text-slate-400 truncate">
                          🛠️ {recipe.place || stationTarget.label}
                        </span>
                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                          title={t('card.locateStationItem', { item: recipe.item })}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            ) : (
            /* Vista Lista Compacta para Crafteo y Cocina */
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
              {filteredAndSortedCrafts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-sm text-slate-300">{t('empty.title')}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? t('empty.availableDesc')
                      : t('empty.searchDesc')}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipeRaw, idx) => {
                  const recipe = recipeView(recipeRaw);
                  const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                  const stationTarget = isLoomRecipe ? CRAFT_STATION_LOCATIONS.loom : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);
                  const { craftability, energyCost, energyRestore, netEnergy, goldCost, sellPrice, netGold, minutes, goldPerMin, goldPerEnergy, xpPerEnergy, xp } = recipe;

                  return (
                    <div 
                      key={recipe.id || idx} 
                      className={`px-3 py-2 border rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all ${
                        craftability.canCraft 
                          ? 'bg-[#0b1724] border-emerald-500/40 hover:border-emerald-400/70' 
                          : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemSprite name={recipeRaw.item} size={28} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">{recipe.item}</span>
                            <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded">
                              {recipe.level}
                            </span>
                            {craftability.canCraft ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px]">
                                {t('card.batchPossibleList', { count: craftability.maxBatches })}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[9px]">
                                {t('card.missingCount', { count: craftability.missingCount })}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                          </div>
                        </div>
                      </div>

                      {/* Bloque de Rendimiento Tactico Compacto */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Beneficio de Oro o Proposito de Comida */}
                        {craftCategory === 'cook' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title={t('card.consumptionOrdersTooltip')}>
                            {t('card.consumptionOrders')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title={t('card.baseValueTooltip', { sell: sellPrice > 0 ? sellPrice + 'g' : t('card.craftingMaterial'), cost: goldCost })}>
                            {sellPrice > 0 ? `💰 +${new Intl.NumberFormat(i18n.language).format(sellPrice)}g` : t('card.materialBadge')}
                          </span>
                        )}

                        {/* Balance de Energia */}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                          energyRestore > 0 
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                            : 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                        }`} title={energyRestore > 0 ? t('card.energyTooltip', { restore: energyRestore, cost: energyCost, net: netEnergy }) : t('card.craftCostTooltip', { cost: energyCost })}>
                          {energyRestore > 0 ? `⚡ ${t('card.netEnergy', { net: netEnergy })}` : `⚡ -${energyCost}⚡`}
                        </span>

                        {/* Ratio Oro / Energia o Retorno Energia */}
                        {craftCategory === 'cook' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title={t('card.energyReturnTooltip')}>
                            {t('card.returnRatio', { ratio: Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10 })}
                          </span>
                        ) : (
                          goldPerEnergy > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title={t('card.goldPerEnergyTooltip', { ratio: new Intl.NumberFormat(i18n.language).format(goldPerEnergy) })}>
                              +{goldPerEnergy}g/⚡
                            </span>
                          )
                        )}

                        {/* Tiempo */}
                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold" title={t('card.timeRateTooltip', { minutes, rate: goldPerMin })}>
                          ⏱️ {minutes}m
                        </span>

                        {/* Experiencia */}
                        <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold" title={t('card.xpTooltip', { xp, ratio: xpPerEnergy })}>
                          ⭐ +{xp} XP
                        </span>

                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title={t('card.locateStationItem', { item: recipe.item })}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
  );
}
