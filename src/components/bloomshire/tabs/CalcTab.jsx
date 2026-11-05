// src/components/bloomshire/tabs/CalcTab.jsx
import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import calcData from '../../../../public/data/bloomshire/calc_data.json';

export default function CalcTab({ 
  currentEnergy = 80, 
  maxEnergy = 80, 
  farmingLevel = 1, 
  playerPerks = null 
}) {
  const [calcSkill, setCalcSkill] = useState('farming');
  const [calcLevelFilter, setCalcLevelFilter] = useState('all');
  const [calcSort, setCalcSort] = useState('xpEnergy_desc');
  const [calcSeasonFilter, setCalcSeasonFilter] = useState('all');
  const [availablePlots, setAvailablePlots] = useState(8);
  const [simulatedEnergy, setSimulatedEnergy] = useState('');
  const [calcStrategyPreset, setCalcStrategyPreset] = useState('energy');

  const hasFoundersTimeBonus = Boolean(playerPerks?.fast && playerPerks.fast < 1);

  const filteredCalcList = useMemo(() => {
    let list = [...(calcData[calcSkill] || [])];

    // Filtro de Temporada / Época (solo para cultivo)
    if (calcSkill === 'farming' && calcSeasonFilter !== 'all') {
      list = list.filter(x => x.season === 'all' || x.season === calcSeasonFilter);
    }

    if (calcLevelFilter !== 'all') {
      if (calcLevelFilter === 'vip' || calcLevelFilter === 'special') {
        list = list.filter(x => (x.level ?? 1) >= 15 || (x.tip && (x.tip.includes('Fundadores') || x.tip.includes('VIP') || x.tip.includes('Misión'))));
      } else {
        const targetLv = parseInt(calcLevelFilter, 10);
        list = list.filter(x => (x.level ?? 1) <= targetLv || targetLv >= 10);
      }
    }

    const [field, dir] = calcSort.split('_');
    list.sort((a, b) => {
      const eA = calcSkill === 'farming' ? 2 : (a.energyCost || a.energy || 1);
      const eB = calcSkill === 'farming' ? 2 : (b.energyCost || b.energy || 1);
      const xpPerEA = (a.xp ?? 0) / eA;
      const xpPerEB = (b.xp ?? 0) / eB;
      const netA = (a.sell ?? 0) - (a.cost ?? 0);
      const netB = (b.sell ?? 0) - (b.cost ?? 0);
      const goldPerEA = netA / eA;
      const goldPerEB = netB / eB;

      const isMasterA = calcSkill === 'farming' && farmingLevel >= 15 && a.hasRegrow;
      const isMasterB = calcSkill === 'farming' && farmingLevel >= 15 && b.hasRegrow;
      const xpMinA = isMasterA ? (a.regrowXpMin ?? a.xpMin ?? 0) : (a.xpMin ?? 0);
      const xpMinB = isMasterB ? (b.regrowXpMin ?? b.xpMin ?? 0) : (b.xpMin ?? 0);
      const goldMinA = isMasterA ? (a.regrowGoldMin ?? a.goldMin ?? 0) : (a.goldMin ?? 0);
      const goldMinB = isMasterB ? (b.regrowGoldMin ?? b.goldMin ?? 0) : (b.goldMin ?? 0);

      let vA = 0, vB = 0;
      if (field === 'xpEnergy') { vA = xpPerEA; vB = xpPerEB; }
      else if (field === 'goldEnergy') { vA = goldPerEA; vB = goldPerEB; }
      else if (field === 'xpMin') { vA = xpMinA; vB = xpMinB; }
      else if (field === 'goldMin') { vA = goldMinA; vB = goldMinB; }
      else if (field === 'time') { vA = a.grow ?? 1; vB = b.grow ?? 0; }
      else if (field === 'cost') { vA = a.cost ?? 0; vB = b.cost ?? 0; }
      else if (field === 'sell') { vA = a.sell ?? 0; vB = b.sell ?? 0; }
      return dir === 'desc' ? vB - vA : vA - vB;
    });

    return list;
  }, [calcSkill, calcSeasonFilter, calcLevelFilter, calcSort, farmingLevel]);

  const simEnergyVal = simulatedEnergy !== '' ? simulatedEnergy : Math.floor(currentEnergy || 80);
  const topCrop = filteredCalcList[0] || null;
  const energyPerCrop = calcSkill === 'farming' ? 2 : 1;
  const cropsPossible = Math.floor(simEnergyVal / energyPerCrop);
  const batchesPossible = Math.floor(cropsPossible / Math.max(1, availablePlots));

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      {/* Barra de Presets Estratégicos */}
      <div className="p-3.5 bg-gradient-to-r from-[#0d162d] via-[#101b38] to-[#0d162d] border border-indigo-950/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <span>🎯</span> Modo Estratégico:
          </span>
          <button
            type="button"
            onClick={() => { setCalcSort('xpEnergy_desc'); setCalcStrategyPreset('energy'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              calcSort === 'xpEnergy_desc'
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>⚡</span> <span>Ahorro de Energía (Máx XP/⚡)</span>
          </button>
          <button
            type="button"
            onClick={() => { setCalcSort('xpMin_desc'); setCalcStrategyPreset('speedrun'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              calcSort === 'xpMin_desc'
                ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>⏱️</span> <span>Speedrun Rápido (Máx XP/min)</span>
          </button>
          <button
            type="button"
            onClick={() => { setCalcSort('goldEnergy_desc'); setCalcStrategyPreset('gold_energy'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              calcSort === 'goldEnergy_desc'
                ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>🪙</span> <span>Oro por Energía (Máx Oro/⚡)</span>
          </button>
          <button
            type="button"
            onClick={() => { setCalcSort('goldMin_desc'); setCalcStrategyPreset('profit'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              calcSort === 'goldMin_desc'
                ? 'bg-purple-500/30 text-purple-300 border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/50'
                : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
            }`}
          >
            <span>💰</span> <span>Rentabilidad Oro/min</span>
          </button>
        </div>

        {calcSkill === 'farming' && (
          <div className="flex items-center gap-2 text-xs bg-[#14203d] px-3 py-1 rounded-lg border border-amber-500/30 text-amber-200">
            <span className="font-bold">Parcelas:</span>
            <input 
              type="number" 
              value={availablePlots} 
              onChange={(e) => setAvailablePlots(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-[#0a1020] border border-slate-600 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
            />
          </div>
        )}
      </div>

      {/* Simulador Interactivo de Energía Restante */}
      <div className="p-4 bg-gradient-to-r from-[#101b38] via-[#0d162d] to-[#0a1122] border border-cyan-500/40 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-2 flex-wrap">
              <span>Simulador de Energía Restante</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                Partida Live: {Math.floor(currentEnergy)} / {maxEnergy} ⚡
              </span>
            </div>
            <div className="text-[11.5px] text-slate-300 mt-0.5">
              Calcula el impacto exacto en XP y Oro según la energía disponible en tu partida.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#070d1c] px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
            <span>⚡ Tu Energía:</span>
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
                Reset Live
              </button>
            )}
          </div>

          {topCrop && (
            <div className="px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-3 text-xs flex-wrap">
              <span className="text-emerald-300 font-bold">
                Con <b>{simEnergyVal}⚡</b> en <b>{topCrop.name.split('(')[0].trim()}</b>:
              </span>
              <span className="font-mono text-amber-300 font-black">
                {cropsPossible} cultivos ({batchesPossible} tandas)
              </span>
              <span className="font-mono text-emerald-400 font-black">
                +{(cropsPossible * (topCrop.xp ?? 0)).toLocaleString('es-ES')} XP
              </span>
              <span className="font-mono text-cyan-300 font-black">
                +{((cropsPossible * ((topCrop.sell ?? 0) - (topCrop.cost ?? 0)))).toLocaleString('es-ES')} Oro
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Filtros Detallados */}
      <div className="p-3.5 bg-[#0e172c] border border-indigo-950/70 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-amber-400" /> Habilidad:
            <select 
              value={calcSkill} 
              onChange={(e) => setCalcSkill(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-amber-300 rounded px-2.5 py-1 text-xs font-bold cursor-pointer"
            >
              <option value="farming">🌾 Cultivo (Farming)</option>
              <option value="mining">⛏️ Minería (Cuevas y Gemas)</option>
              <option value="foraging">🍄 Recolección &amp; Tala</option>
              <option value="fishing">🎣 Pesca (Río y Lago)</option>
            </select>
          </div>

          {/* Selector de Época del Año (Solo Cultivo) */}
          {calcSkill === 'farming' && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="text-amber-400">🍂</span> Época:
              <select 
                value={calcSeasonFilter} 
                onChange={(e) => setCalcSeasonFilter(e.target.value)}
                className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
              >
                <option value="all">🌐 Todas las Épocas</option>
                <option value="Winter">❄️ Invierno (Temporada Actual)</option>
                <option value="Spring">🌸 Primavera (Spring)</option>
                <option value="Summer">☀️ Verano (Summer)</option>
                <option value="Fall">🍂 Otoño (Fall)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            Nivel Requerido:
            <select 
              value={calcLevelFilter} 
              onChange={(e) => setCalcLevelFilter(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
            >
              <option value="all">🌟 Todos los Niveles</option>
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

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            Ordenar por:
            <select 
              value={calcSort} 
              onChange={(e) => setCalcSort(e.target.value)}
              className="bg-[#14203d] border border-slate-700 text-amber-300 font-bold rounded px-2.5 py-1 text-xs cursor-pointer"
            >
              <option value="xpEnergy_desc">⚡ Mayor XP por Energía (XP/⚡ ↓)</option>
              <option value="goldEnergy_desc">🪙 Mayor Oro por Energía (Oro/⚡ ↓)</option>
              <option value="xpMin_desc">⏱️ Más rápido para subir XP (XP/min ↓)</option>
              <option value="goldMin_desc">💰 Más rentable en Oro (Oro/min ↓)</option>
              <option value="time_asc">⏳ Menor tiempo de espera (↑)</option>
              <option value="cost_asc">🪙 Más barato de comprar (Coste ↑)</option>
              <option value="sell_desc">💎 Mayor precio de venta (Venta ↓)</option>
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
                <th className="p-3">Recurso / Cultivo</th>
                {calcSkill === 'farming' && <th className="p-3">Época</th>}
                <th className="p-3">Tiempo</th>
                <th className="p-3">Nivel</th>
                <th className="p-3">Coste</th>
                <th className="p-3">Venta</th>
                <th className="p-3">Neto</th>
                <th className="p-3">XP</th>
                <th className="p-3 text-amber-300 bg-amber-950/30 border-l border-amber-900/40">⚡ Gasto</th>
                <th className="p-3 text-emerald-300 bg-emerald-950/30">🎯 XP / ⚡</th>
                <th className="p-3 text-cyan-300 bg-cyan-950/30 border-r border-cyan-900/40">🪙 Oro / ⚡</th>
                <th className="p-3">XP / Min</th>
                <th className="p-3">Oro / Min</th>
                {calcSkill === 'farming' && <th className="p-3">Total x{availablePlots} Parcelas</th>}
                <th className="p-3">Consejo Táctico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredCalcList.map((item, idx) => {
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
                      {item.name}
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
                          {item.seasonLabel || 'Todo el Año 🌐'}
                        </span>
                      </td>
                    )}
                    <td className="p-3 font-mono text-cyan-300 whitespace-nowrap">
                      {item.growTxt || `${adjustedTime} min`}
                      {hasFoundersTimeBonus && <span className="text-[10px] text-emerald-400 ml-1">(-20%)</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                        {item.level ? `Nv ${item.level}` : 'Nv 1'}
                      </span>
                    </td>
                    <td className="p-3 text-red-300 font-mono whitespace-nowrap">{item.cost ? `${item.cost}g` : '0g'}</td>
                    <td className="p-3 text-amber-300 font-mono font-bold whitespace-nowrap">{item.sell ? `${item.sell}g` : '0g'}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {netProfit >= 0 ? `+${netProfit}g` : `${netProfit}g`}
                    </td>
                    <td className="p-3 text-purple-300 font-mono font-bold whitespace-nowrap">+{xp} XP</td>
                    
                    {/* ⚡ Gasto de Energía */}
                    <td className="p-3 bg-amber-950/20 border-l border-amber-900/30 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10.5px]">
                        -{energyCost}⚡
                      </span>
                    </td>

                    {/* 🎯 XP por Energía */}
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

                    {/* 🪙 Oro por Energía */}
                    <td className="p-3 bg-cyan-950/20 border-r border-cyan-900/30 whitespace-nowrap font-mono font-bold text-xs">
                      <span className={goldPerEnergy >= 50 ? 'text-cyan-300' : 'text-slate-300'}>
                        {goldPerEnergy >= 0 ? `+${goldPerEnergy}` : goldPerEnergy}g/⚡
                      </span>
                    </td>

                    <td className="p-3 text-purple-400 font-mono font-bold whitespace-nowrap">
                      {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                        <div className="flex flex-col">
                          <span>{item.regrowXpMin}</span>
                          <span className="text-[10px] text-purple-300/70 font-normal">Rebrote (5x)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span>{item.xpMin || 0}</span>
                          {calcSkill === 'farming' && item.hasRegrow && (
                            <span className="text-[10px] text-slate-500 font-normal">Nv 15+: {item.regrowXpMin}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-amber-400 font-mono font-bold whitespace-nowrap">
                      {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                        <div className="flex flex-col">
                          <span>{item.regrowGoldMin}g</span>
                          <span className="text-[10px] text-amber-300/70 font-normal">Rebrote (5x)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span>{item.goldMin || 0}g</span>
                          {calcSkill === 'farming' && item.hasRegrow && (
                            <span className="text-[10px] text-slate-500 font-normal">Nv 15+: {item.regrowGoldMin}g</span>
                          )}
                        </div>
                      )}
                    </td>

                    {calcSkill === 'farming' && (
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-emerald-300">
                            +{batchNet.toLocaleString('es-ES')}g <span className="text-purple-300 text-[10px]">/ +{batchXp.toLocaleString('es-ES')}XP</span>
                          </span>
                          <span className="text-[10px] text-amber-300/80 font-mono">
                            Consumo: {batchEnergy}⚡
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="p-3 text-[11px] text-slate-400 italic max-w-xs">{item.tip || '-'}</td>
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

