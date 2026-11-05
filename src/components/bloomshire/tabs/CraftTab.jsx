import React, { useState, useMemo } from 'react';
import { MapPin, Search } from 'lucide-react';
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
  initialCraftCategory = 'bench'
}) {
  const craftData = propCraftData || defaultCraftData;
  const [craftCategory, setCraftCategory] = useState(initialCraftCategory);
  const [craftViewMode, setCraftViewMode] = useState('grid');
  const [craftSearchQuery, setCraftSearchQuery] = useState('');
  const [craftLevelFilter, setCraftLevelFilter] = useState('all');
  const [craftSortBy, setCraftSortBy] = useState('level_asc');
  const [craftOnlyAvailable, setCraftOnlyAvailable] = useState(false);

  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analíticas multi-variables
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
      } else if (craftLevelFilter === '8') {
        list = list.filter(r => (r.levelNum || 1) >= 8 && (r.levelNum || 1) < 10);
      } else if (craftLevelFilter === '10') {
        list = list.filter(r => (r.levelNum || 1) >= 10);
      } else {
        const targetNum = Number(craftLevelFilter);
        list = list.filter(r => (r.levelNum || 1) === targetNum);
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

  // Resumen táctico de la estación actual
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
                { key: 'cook', label: '🍲 Estufa de Cocina (Panadería / Cabaña)', badgeKey: 'cook' },
                { key: 'bench', label: '🪵 Banco de Trabajo (Carpintería Pell)', badgeKey: 'bench' },
                { key: 'forge', label: '⚒️ Forja de Bram (Herrería)', badgeKey: 'forge' },
                { key: 'mill', label: '🌊 Molino & Lechería (Granja Hollin)', badgeKey: 'mill' },
                { key: 'loom', label: '🧵 Telar de Tilly (Sastrería)', badgeKey: 'loom' }
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
                        {readyCount} listos
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Banner Táctico de la Estación con Analíticas de Rendimiento Global */}
            {CRAFT_STATION_LOCATIONS[craftCategory] && (
              <div className="p-4 bg-gradient-to-r from-[#131d38] via-[#17254a] to-[#111a33] border-2 border-purple-500/50 rounded-xl shadow-lg flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>{CRAFT_STATION_LOCATIONS[craftCategory].stationName}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      🧭 {CRAFT_STATION_LOCATIONS[craftCategory].stationDesc}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory])}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      title="Ubicar Estación de Trabajo en el Mega-Atlas"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Ubicar Estación</span>
                    </button>
                    {CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation && (
                      <button
                        onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Ubicar Estufa en Tu Cabaña"
                      >
                        <span>🏡 Cabaña</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Radar Táctico de Alto Rendimiento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 font-mono text-xs">
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Catálogo Estación</span>
                    <span className="text-white font-black text-sm">{stationSummary.total} recetas</span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-emerald-400 uppercase font-sans font-bold">Crafteables Ahora</span>
                    <span className="text-emerald-300 font-black text-sm">
                      {totalCraftableInCurrentCategory > 0 ? `✓ ${totalCraftableInCurrentCategory} Listas` : '0 Listas'}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-amber-400 uppercase font-sans font-bold">Mayor Ganancia Oro</span>
                    <span className="text-amber-300 font-bold text-xs truncate">
                      {stationSummary.bestProfitCraft ? `+${((stationSummary.bestProfitCraft.sellPrice || 0) - (stationSummary.bestProfitCraft.goldCost || 0)).toLocaleString()}g` : '-'}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-cyan-400 uppercase font-sans font-bold">Mayor Recarga Energía</span>
                    <span className="text-cyan-300 font-bold text-xs truncate">
                      {stationSummary.bestEnergyDish && stationSummary.bestEnergyDish.energyRestore > 0 ? `+${stationSummary.bestEnergyDish.energyRestore}⚡` : 'Gasto Oficio'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Crafteo: Búsqueda, Ordenamiento y Vista */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1628] border border-slate-800/80 p-2.5 rounded-xl shadow-sm">
              <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar receta o plato (ej: tarta, guiso, lingote, tela, pan, col)..."
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
                {/* Botón Toggle Crafteables Ahora con mis Materiales */}
                <button
                  onClick={() => setCraftOnlyAvailable(!craftOnlyAvailable)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    craftOnlyAvailable
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-[#14203d] text-slate-300 hover:text-emerald-300 border-slate-700'
                  }`}
                  title="Filtrar recetas para las que tienes el 100% de los materiales en mochila o cofres"
                >
                  <span>✨ Crafteables Ahora</span>
                  {totalCraftableInCurrentCategory > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-400 text-emerald-300">
                      {totalCraftableInCurrentCategory}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">Nivel:</span>
                  <select
                    value={craftLevelFilter}
                    onChange={(e) => setCraftLevelFilter(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="all">⭐ Todos los Niveles</option>
                    <option value="1">Nivel 1 (Principiante)</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4</option>
                    <option value="5">Nivel 5 (Botica)</option>
                    <option value="6">Nivel 6</option>
                    <option value="7">Nivel 7</option>
                    <option value="8">Nivel 8+</option>
                    <option value="10">Nivel 10+ (Avanzado)</option>
                    <option value="special">Misiones / Especiales</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">Ordenar:</span>
                  <select
                    value={craftSortBy}
                    onChange={(e) => setCraftSortBy(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="energy_desc">⚡ Mayor Ganancia Energía (+⚡ netos)</option>
                    <option value="profit_desc">💰 Mayor Beneficio Oro (Gold neto)</option>
                    <option value="rate_desc">📈 Mayor Rendimiento (Oro / Minuto)</option>
                    <option value="energy_eff_desc">⚡ Mayor Eficiencia Oro / Energía (Gold/⚡)</option>
                    <option value="energy_xp_desc">⚡ Mayor Eficiencia XP / Energía (XP/⚡)</option>
                    <option value="time_asc">⏱️ Más Rápido (Menor tiempo)</option>
                    <option value="xp_desc">⭐ Mayor XP Obtenida</option>
                    <option value="level_asc">⭐ Nivel Requerido (Menor a Mayor)</option>
                    <option value="name_asc">🔤 Nombre Alfabético (A-Z)</option>
                  </select>
                </div>

                {/* Selector de Vista: Cuadrícula vs Lista */}
                <div className="flex items-center bg-[#080d17] border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
                  <button
                    onClick={() => setCraftViewMode('grid')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista Cuadrícula (4-6 por fila)"
                  >
                    <span>🔲</span>
                    <span className="hidden sm:inline">Cuadrícula</span>
                  </button>
                  <button
                    onClick={() => setCraftViewMode('list')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'list'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista Lista Compacta"
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recetas de la Estación Seleccionada */}
            {craftViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 overflow-y-auto">
              {filteredAndSortedCrafts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-sm text-slate-300">No se encontraron recetas</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? 'No tienes todos los insumos necesarios para ninguna receta de esta estación actualmente.'
                      : 'Prueba ajustando el texto de búsqueda.'}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipe, idx) => {
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
                        {/* Cabecera: Icono + Título + Status Crafteable */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemSprite name={recipe.item} size={28} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate leading-tight">{recipe.item}</div>
                              <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">{recipe.level}</div>
                            </div>
                          </div>
                          {craftability.canCraft ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px] shadow-sm animate-pulse">
                              ✓ x{craftability.maxBatches}
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-400 font-mono text-[9px]">
                              Faltan {craftability.missingCount}
                            </span>
                          )}
                        </div>

                        {/* Bloque de Rendimiento Táctico: Oro, Energía, Tiempo y XP */}
                        <div className="grid grid-cols-2 gap-1 bg-[#070b14] p-1.5 rounded-lg border border-slate-800/80 text-[10px] font-mono">
                          {/* Beneficio de Oro o Propósito de Comida */}
                          {craftCategory === 'cook' ? (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Uso / Venta:</span>
                              <span className="text-amber-200 font-bold truncate text-[9.5px]">
                                🍲 Consumo & Pedidos
                              </span>
                              <span className="text-[8px] text-slate-400">
                                No vendible en tiendas
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Valor Base:</span>
                              <span className="text-amber-300 font-bold truncate">
                                {sellPrice > 0 ? `+${sellPrice.toLocaleString()}g` : 'Material de oficio'}
                              </span>
                              <span className="text-[8.5px] text-slate-400">
                                {goldCost > 0 ? `Coste: ${goldCost}g` : 'Sin coste en oro'}
                              </span>
                            </div>
                          )}

                          {/* Rendimiento de Energía */}
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Balance Energía:</span>
                            {energyRestore > 0 ? (
                              <span className="text-emerald-400 font-bold">
                                +{netEnergy >= 0 ? netEnergy : netEnergy}⚡ netos
                              </span>
                            ) : (
                              <span className="text-blue-300 font-bold">
                                -{energyCost}⚡ coste
                              </span>
                            )}
                            <span className="text-[8.5px] text-slate-400">
                              {energyRestore > 0 ? `Restaura +${energyRestore}⚡` : `Gasto de oficio`}
                            </span>
                          </div>

                          {/* Tiempo y Ratio Oro/Energía */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Tiempo / Ratio:</span>
                            <span className="text-cyan-300 font-bold">
                              ⏱️ {minutes} {minutes === 1 ? 'min' : 'mins'}
                            </span>
                            {craftCategory === 'cook' ? (
                              <span className="text-[8.5px] text-emerald-400 font-bold">
                                +{Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10}⚡ retorno
                              </span>
                            ) : (
                              goldPerEnergy > 0 && (
                                <span className="text-[8.5px] text-emerald-400 font-bold">
                                  +{goldPerEnergy.toLocaleString()}g / ⚡
                                </span>
                              )
                            )}
                          </div>

                          {/* XP y Ratio XP/Energía */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Experiencia:</span>
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
                            <span className="text-slate-400 font-sans font-bold">Insumos (Tus Existencias):</span>
                            {craftability.canCraft && (
                              <span className="text-emerald-400 font-mono font-bold text-[8.5px]">Materiales 100% listos</span>
                            )}
                          </div>
                          <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                        </div>

                        {/* Descripción condensada */}
                        {recipe.desc && (
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                            {recipe.desc}
                          </p>
                        )}
                      </div>

                      {/* Pie de tarjeta con Ubicación */}
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                        <span className="text-[9.5px] text-slate-400 truncate">
                          🛠️ {recipe.place || stationTarget.label}
                        </span>
                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                          title={`Ubicar estación de "${recipe.item}" en el Mega-Atlas`}
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
                  <div className="font-bold text-sm text-slate-300">No se encontraron recetas</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? 'No tienes todos los insumos necesarios para ninguna receta de esta estación actualmente.'
                      : 'Prueba ajustando el texto de búsqueda.'}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipe, idx) => {
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
                        <ItemSprite name={recipe.item} size={28} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">{recipe.item}</span>
                            <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded">
                              {recipe.level}
                            </span>
                            {craftability.canCraft ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px]">
                                ✓ x{craftability.maxBatches} posibles
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[9px]">
                                Faltan {craftability.missingCount}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                          </div>
                        </div>
                      </div>

                      {/* Bloque de Rendimiento Táctico Compacto */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Beneficio de Oro o Propósito de Comida */}
                        {craftCategory === 'cook' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title="Plato de comida: consumo para recargar energía/vida o entregar en pedidos de Odette (no vendible en tiendas)">
                            🍲 Consumo & Pedidos
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title={`Valor base: ${sellPrice > 0 ? sellPrice + 'g' : 'Material de oficio'} | Coste: ${goldCost}g`}>
                            💰 {sellPrice > 0 ? `+${sellPrice.toLocaleString()}g` : 'Material'}
                          </span>
                        )}

                        {/* Balance de Energía */}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                          energyRestore > 0 
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                            : 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                        }`} title={energyRestore > 0 ? `Restaura +${energyRestore}⚡ al comer | Gasto de estufa: -${energyCost}⚡ | Balance: +${netEnergy}⚡ netos` : `Gasto de oficio: -${energyCost}⚡`}>
                          ⚡ {energyRestore > 0 ? `+${netEnergy}⚡ netos` : `-${energyCost}⚡`}
                        </span>

                        {/* Ratio Oro / Energía o Retorno Energía */}
                        {craftCategory === 'cook' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title="Retorno de energía por punto invertido">
                            +{Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10}⚡ retorno
                          </span>
                        ) : (
                          goldPerEnergy > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title={`Oro ganado por cada punto de energía invertido: +${goldPerEnergy.toLocaleString()}g/⚡`}>
                              +{goldPerEnergy}g/⚡
                            </span>
                          )
                        )}

                        {/* Tiempo */}
                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold" title={`Tiempo en estación: ${minutes} minutos (${goldPerMin}g/min)`}>
                          ⏱️ {minutes}m
                        </span>

                        {/* Experiencia */}
                        <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold" title={`Experiencia obtenida: +${xp} XP (${xpPerEnergy} XP/⚡)`}>
                          ⭐ +{xp} XP
                        </span>

                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title={`Ubicar estación de "${recipe.item}" en el Mega-Atlas`}
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
