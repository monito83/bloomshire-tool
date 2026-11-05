// src/components/bloomshire/tabs/QuestsTab.jsx
import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronsUpDown, 
  Check, 
  MapPin 
} from 'lucide-react';
import { 
  DASHBOARD_QUEST_CATALOG, 
  LockedModuleScreen 
} from '../bloomshireHelpers';
import { CANONICAL_SKILLS } from '../bloomshireEngine';

export default function QuestsTab({
  isConnected,
  onConnect,
  onBack,
  activeQuestsList = [],
  activeQuestMaterials = [],
  gold = 0,
  farmingLevel = 1,
  moonmereProgress = {},
  deliveredItemsManual = {},
  toggleDeliveredItem,
  dailyTasks = [],
  setDailyTasks,
  toggleDailyTask,
  dailyTasksCompletedCount = 0,
  energyMeta = {},
  currentEnergy = 80,
  maxEnergy = 80,
  isVip = false,
  skillsBreakdown = {},
  skillsMeta = {},
  locateInMegaAtlas,
  getItemStorageBreakdown,
  setActiveTab,
  setItemCategoryFilter,
  setItemSearchQuery
}) {
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [questSectionsOpen, setQuestSectionsOpen] = useState({
    materialTracker: true,
    dailyTasks: true,
    roadmap: true,
    skillsBook: true,
    moonmereBanner: true,
    energyBed: false
  });

  const toggleQuestSection = (sec) => {
    setQuestSectionsOpen(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const toggleAllQuestSections = (open) => {
    setQuestSectionsOpen({
      materialTracker: open,
      dailyTasks: open,
      roadmap: open,
      skillsBook: open,
      moonmereBanner: open,
      energyBed: open
    });
  };

  if (!isConnected) {
    return (
      <LockedModuleScreen
        title="Libro de Misiones & Progresión de Historia"
        description="Consulta el árbol de requisitos de tus misiones activas en curso, progreso del libro de Moonmere y materiales pendientes conectando tu partida con la extensión Bloomshire Companion."
        onConnect={onConnect}
        onBack={onBack}
      />
    );
  }

  // Active Main Story Quest & Chapter Computations
  const activeMainStoryQuest = activeQuestsList.find(q =>
    q.isMainStory ||
    (q.id && (q.id.toLowerCase().startsWith('bk') || q.id.toLowerCase().startsWith('ff') || q.id.toLowerCase().startsWith('q')))
  ) || activeQuestsList[0];

  const activeChapNum = activeMainStoryQuest?.chapter || (
    activeMainStoryQuest?.id ? parseInt(activeMainStoryQuest.id.replace(/^(bk|ff|q)/i, ''), 10) : 21
  ) || 21;

  const completedChapCount = Math.max(
    moonmereProgress.completedChapters || 0,
    activeChapNum > 0 ? (activeChapNum - 1) : 20
  );

  const totalChapters = 24;
  const progressPct = Math.min(100, Math.round((completedChapCount / totalChapters) * 100));
  const isMoonmere = activeChapNum >= 18;

  // Selected quest
  const targetQuest = (selectedQuestId && activeQuestsList.find(q => q.id === selectedQuestId || (q.normalizedId && q.normalizedId === selectedQuestId.toLowerCase())))
    || activeMainStoryQuest
    || activeQuestsList[0]
    || null;

  const normId = (targetQuest?.id || '').toLowerCase();
  const catDef = DASHBOARD_QUEST_CATALOG[normId] ||
    DASHBOARD_QUEST_CATALOG[normId.replace(/^s_/, 'sd_')] ||
    DASHBOARD_QUEST_CATALOG[normId.replace(/^sd_/, 's_')];

  const qTitle = catDef?.name || targetQuest?.name || targetQuest?.title || (targetQuest?.id ? `Misión ${targetQuest.id.toUpperCase()}` : 'Sin misión activa');
  const isMain = targetQuest?.isMainStory || normId.startsWith('bk') || normId.startsWith('ff');
  
  const rawSteps = (catDef?.steps && catDef.steps.length > 0)
    ? catDef.steps
    : ((targetQuest?.allSteps && targetQuest.allSteps.length > 0) ? targetQuest.allSteps : []);
  
  const baseStepNum = targetQuest?.step !== undefined ? targetQuest.step : ((targetQuest?.stepIdx || 0) + 1);
  const totalSteps = Math.max(rawSteps.length, baseStepNum, 1);

  const stepsList = [...rawSteps];
  while (stepsList.length < totalSteps) {
    const sN = stepsList.length + 1;
    stepsList.push({
      step: sN,
      name: `Paso ${sN}`,
      text: targetQuest?.objective || targetQuest?.stepText || 'Continúa la misión en el juego.',
      where: targetQuest?.where || catDef?.location || 'Ver indicador en el mapa',
      npc: targetQuest?.giver || catDef?.giver || 'Vecino',
      items: []
    });
  }

  // Auto-avance reactivo de pasos de nivel
  let resolvedStepNum = baseStepNum;
  while (resolvedStepNum <= stepsList.length) {
    const stepToCheck = stepsList[resolvedStepNum - 1];
    if (!stepToCheck) break;
    const combined = ((stepToCheck.name || '') + ' ' + (stepToCheck.text || '')).toLowerCase();
    const match = combined.match(/(?:nivel|level)\s*(\d+)\s*(?:de\s*)?([a-zA-Záéíóúñ]+)/i);
    if (match) {
      const reqLvl = parseInt(match[1], 10);
      const skWord = match[2].toLowerCase();
      let reqSk = null;
      if (skWord.includes('cultiv') || skWord.includes('farm')) reqSk = 'farming';
      else if (skWord.includes('miner') || skWord.includes('mine')) reqSk = 'mining';
      else if (skWord.includes('pesc') || skWord.includes('fish')) reqSk = 'fishing';
      else if (skWord.includes('tal') || skWord.includes('wood')) reqSk = 'woodcutting';
      else if (skWord.includes('cocin') || skWord.includes('cook')) reqSk = 'cooking';

      if (reqSk && reqLvl) {
        const playerLvl = skillsBreakdown[reqSk]?.level || (reqSk === 'farming' ? (farmingLevel || skillsBreakdown.farming?.level || 1) : 1);
        if (playerLvl >= reqLvl) {
          resolvedStepNum++;
          continue;
        }
      }
    }
    break;
  }

  const curStepNum = Math.min(resolvedStepNum, stepsList.length);
  const curStepDef = stepsList[curStepNum - 1] || stepsList[stepsList.length - 1] || null;
  const curStepName = curStepDef?.name || targetQuest?.stepName || `Paso ${curStepNum}`;
  const curWhere = curStepDef?.where || targetQuest?.where || catDef?.location || 'Ver en el mapa';
  const curNpc = curStepDef?.npc || targetQuest?.giver || catDef?.giver || 'Vecino de Bloomshire';
  const questReward = targetQuest?.reward || catDef?.reward || null;

  const cleanStepText = (() => {
    const raw = curStepDef?.text || targetQuest?.objective || targetQuest?.stepText || '';
    if (raw && !raw.includes('Consulta el panel') && !raw.includes('Objetivo en curso. Consulta')) {
      return raw;
    }
    if (Array.isArray(curStepDef?.items) && curStepDef.items.length > 0) {
      const itemsStr = curStepDef.items.map(it => `${it.needed}x ${it.name}`).join(' y ');
      return `Reúne y entrega ${itemsStr} a ${curNpc} en ${curWhere}.`;
    }
    if (curStepName.toLowerCase().includes('habla') || curStepName.toLowerCase().includes('talk')) {
      return `Dirígete a ${curWhere} y habla con ${curNpc} para avanzar en la historia.`;
    }
    if (curStepName.toLowerCase().includes('nivel') || curStepName.toLowerCase().includes('level')) {
      return `Alcanza el nivel de habilidad requerido para desbloquear la siguiente etapa con ${curNpc}.`;
    }
    return `Cumple el objetivo "${curStepName}" con ${curNpc} en ${curWhere}.`;
  })();

  const questLoc = curStepDef?.coords || targetQuest?.coords || catDef?.coords || {
    label: `🎯 ${qTitle}`,
    regionId: isMoonmere ? 'moonmere' : 'bloomshire_town',
    subZoneId: isMoonmere ? 'moonmere_sub_1_lagoon_village' : 'bloomshire_town_sub_1_bloomshire',
    wx: 4968,
    wy: 2636,
    worldRect: [4900, 2550, 200, 200]
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      {/* Barra de Control Visual: Expandir / Colapsar Todo + Toggles Rápidos */}
      <div className="p-3 bg-[#0a1020] border border-indigo-950/90 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ChevronsUpDown className="w-4 h-4 text-amber-400" /> Vista Modular (Haz clic en cualquier caja para abrir/cerrar):
          </span>
          {[
            { key: 'materialTracker', label: '📋 Insumos Necesarios' },
            { key: 'dailyTasks', label: `🌱 Tareas Diarias (${dailyTasksCompletedCount}/6)` },
            { key: 'roadmap', label: `🎯 Guía de Misiones (${activeQuestsList.length})` },
            { key: 'skillsBook', label: '📖 10 Habilidades' },
            { key: 'moonmereBanner', label: '🌊 Progreso Moonmere' },
            { key: 'energyBed', label: '🛏️ Cama y Energía' }
          ].map(sec => (
            <button
              key={sec.key}
              onClick={() => toggleQuestSection(sec.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                questSectionsOpen[sec.key]
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-[#101b33] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {questSectionsOpen[sec.key] ? '▾ ' : '▸ '}{sec.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleAllQuestSections(true)}
            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-black cursor-pointer transition-all"
          >
            ➕ Expandir Todo
          </button>
          <button
            onClick={() => toggleAllQuestSections(false)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
          >
            ➖ Colapsar Todo
          </button>
        </div>
      </div>

      {/* CAJA 0 (COLAPSABLE): Insumos Necesarios para Misiones Activas */}
      <div className="bg-[#0e172c] border-2 border-amber-500/60 rounded-xl shadow-lg overflow-hidden shrink-0">
        <button
          onClick={() => toggleQuestSection('materialTracker')}
          className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {questSectionsOpen.materialTracker ? (
              <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                📋 INSUMOS Y MATERIALES NECESARIOS ({activeQuestMaterials.length} Items en {activeQuestsList.length} Misiones Activas)
              </div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">
                Árbol de requisitos en tiempo real: existencias unificadas en Mochila (M), Cofre Casa (CC) y Cofre Pueblo (CP)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              {questSectionsOpen.materialTracker ? 'Ocultar ▲' : 'Mostrar ▼'}
            </span>
          </div>
        </button>

        {questSectionsOpen.materialTracker && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-3">
            {activeQuestMaterials.length === 0 ? (
              <div className="p-4 bg-[#0a1020] border border-slate-800 rounded-lg text-xs text-slate-300 text-center">
                ✨ No hay misiones activas en este paso que requieran entrega de insumos. Todas tus misiones activas son de exploración, diálogo o combate.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeQuestMaterials.map((mat, idx) => {
                  const isGold = mat.id === 'gold';
                  const bd = isGold
                    ? { m: gold, cc: 0, cp: 0, total: gold }
                    : (getItemStorageBreakdown ? getItemStorageBreakdown({ id: mat.id, name: mat.name }) : { total: 0, m: 0, cc: 0, cp: 0 });
                  const isDone = bd.total >= mat.needed;
                  const missing = Math.max(0, mat.needed - bd.total);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                          : 'bg-[#101428] border-rose-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{mat.delivered ? '✅' : isDone ? '✅' : '📦'}</span>
                            <span>{mat.name}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {mat.delivered ? (
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                Entregado ({mat.needed}/{mat.needed})
                              </span>
                            ) : (
                              <span className={`font-mono font-black text-xs px-2 py-0.5 rounded border ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                {bd.total} / {mat.needed}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuestId(mat.questId);
                            }}
                            className="text-[11px] text-amber-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors text-left"
                            title="Ver detalle de esta misión"
                          >
                            <span>🎯</span>
                            <span className="underline decoration-amber-500/40">{mat.questTitle}</span>
                            <span className="text-[9px] text-slate-400 font-mono">↳ Ver Guía</span>
                          </button>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                            mat.isCurrentStep
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {mat.isCurrentStep ? '🚨 Paso Actual' : `⏳ Requisito Paso ${mat.targetStep}`}
                          </span>
                        </div>
                        {mat.hint && (
                          <div className="text-[10px] text-cyan-300 mt-0.5">
                            💡 {mat.hint}
                          </div>
                        )}
                        {mat.stepText && !mat.hint && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {mat.stepText}
                          </div>
                        )}
                      </div>

                      {/* Desglose de Almacenes */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-1">
                        <span className={`font-black text-[11px] ${mat.delivered ? 'text-emerald-400' : isDone ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {mat.delivered ? '✓ Ya Entregado al NPC' : isDone ? '¡Listo para entregar!' : `Faltan ${missing}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!mat.delivered && (
                            <div className="flex items-center gap-1.5 font-mono text-[10px]">
                              {isGold ? (
                                <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded font-bold" title="Oro disponible">
                                  🪙 Monedero: {gold.toLocaleString('es-ES')}
                                </span>
                              ) : (
                                <>
                                  <span className="px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded" title="En Mochila">
                                    🎒 {bd.m}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded" title="En Cofre de la Casa">
                                    🏡 {bd.cc}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded" title="En Cofre del Pueblo">
                                    🏬 {bd.cp}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => toggleDeliveredItem && toggleDeliveredItem(mat.questId, mat.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              mat.delivered 
                                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' 
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                            }`}
                            title="Marcar si ya entregaste este ítem"
                          >
                            {mat.delivered ? '✓ Entregado' : 'Ya lo entregué'}
                          </button>
                        </div>
                      </div>

                      {/* Sub-receta */}
                      {Array.isArray(mat.recipe) && mat.recipe.length > 0 && (
                        <div className="p-2 bg-[#090d1c] border border-slate-800 rounded-lg text-[10.5px] flex flex-col gap-1">
                          <span className="text-slate-400 font-bold text-[10px] uppercase">↳ Requiere Cocinar / Craftear:</span>
                          {mat.recipe.map((ing, ingIdx) => {
                            const ingBd = getItemStorageBreakdown ? getItemStorageBreakdown({ id: ing.id, name: ing.name }) : { total: 0 };
                            const ingOk = ingBd.total >= ing.needed;
                            return (
                              <div key={ingIdx} className="flex items-center justify-between font-mono">
                                <span className={ingOk ? 'text-slate-300' : 'text-rose-300'}>
                                  • {ing.name}: {ingBd.total}/{ing.needed}
                                </span>
                                <span className={ingOk ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                                  {ingOk ? '✅' : '❌ Falta'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CENTRO UNIFICADO DE MISIONES Y AVANCE DE HISTORIA */}
      <div className="bg-gradient-to-b from-[#0d1733] to-[#091024] border-2 border-indigo-900/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col shrink-0">
        {/* Cabecera superior: Progreso de Book One */}
        <div className="p-4 bg-gradient-to-r from-[#0d1b3d] via-[#122452] to-[#0d1b3d] border-b border-indigo-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌊</span>
            <div>
              <div className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <span>EXPANSIÓN BOOK ONE: MOONMERE &amp; MISIONES</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold">
                  Capítulo {activeChapNum} de 24
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Progreso de Historia: <b>{completedChapCount} / {totalChapters} Capítulos Completados</b> ({progressPct}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-36 sm:w-48 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-mono font-black text-emerald-400">{progressPct}%</span>
          </div>
        </div>

        {/* Contenido: Lista de Misiones (Izquierda) + Ficha Unificada Dinámica (Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
          {/* Columna Izquierda (4/12): Lista de Misiones Activas */}
          <div className="lg:col-span-4 border-r border-indigo-950/80 p-3.5 bg-[#080f22] flex flex-col gap-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <span>📜</span> Misiones Activas ({activeQuestsList.length})
              </span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                En Progreso
              </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
              {activeQuestsList.length === 0 ? (
                <div className="p-4 bg-[#0d162d] rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                  ✨ No tienes misiones activas en este momento.
                </div>
              ) : (
                activeQuestsList.map((q, idx) => {
                  const norm = (q.id || '').toLowerCase();
                  const qCat = DASHBOARD_QUEST_CATALOG[norm] ||
                    DASHBOARD_QUEST_CATALOG[norm.replace(/^s_/, 'sd_')] ||
                    DASHBOARD_QUEST_CATALOG[norm.replace(/^sd_/, 's_')];
                  const isSelected = targetQuest && (targetQuest.id === q.id || (targetQuest.normalizedId && targetQuest.normalizedId === q.normalizedId));
                  const isMainQ = q.isMainStory || norm.startsWith('bk') || norm.startsWith('ff');
                  const title = qCat?.name || q.name || q.title || `Misión ${q.id.toUpperCase()}`;
                  const giverName = qCat?.giver || q.giver || 'Vecino';
                  const stepNum = q.step !== undefined ? q.step : ((q.stepIdx || 0) + 1);
                  const qSteps = (qCat?.steps && qCat.steps.length > 0) ? qCat.steps : (q.allSteps || []);
                  const qTotal = Math.max(qSteps.length, stepNum);

                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => setSelectedQuestId(q.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#172752] to-[#121f42] border-amber-400 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                          : 'bg-[#0d162d] border-slate-800 text-slate-300 hover:bg-[#111c38] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                          <span>{isMainQ ? '⭐' : '❗'}</span>
                          <span className={isSelected ? 'text-amber-300' : 'text-slate-200'}>{title}</span>
                        </div>
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          Paso {stepNum}/{qTotal}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>De <b>{giverName}</b></span>
                        {isSelected && (
                          <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                            <span>Siguiendo</span> <span>▶</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha (8/12): Ficha Dinámica Unificada y Stepper Horizontal */}
          <div className="lg:col-span-8 p-5 bg-[#0b1428] flex flex-col gap-4">
            {targetQuest ? (
              <div className="bg-gradient-to-b from-[#0f1b3b] via-[#0b1428] to-[#070d1c] border-2 border-indigo-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* 1. Cabecera Unificada de la Misión */}
                <div className="p-4 bg-gradient-to-r from-[#14234b] via-[#101b38] to-[#0d1630] border-b border-indigo-950/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border ${
                        isMain
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/50'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      }`}>
                        {isMain ? '⭐ Historia Principal' : '📜 Misión Secundaria'}
                      </span>
                      {targetQuest.chapter && (
                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[10.5px] font-mono font-bold">
                          Capítulo {targetQuest.chapter}
                        </span>
                      )}
                      <h3 className="font-black text-white text-base tracking-wide">
                        {qTitle}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                      <span>Otorgada por: <b className="text-amber-200">{curNpc}</b></span>
                      <span>•</span>
                      <span>Ubicación: <b className="text-slate-200">{curWhere}</b></span>
                      {questReward && (
                        <>
                          <span>•</span>
                          <span className="text-amber-300 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 text-[11px]">
                            💰 {questReward.gold ? `${questReward.gold.toLocaleString('es-ES')} Oro` : 'Completar Misión'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => locateInMegaAtlas && locateInMegaAtlas(questLoc)}
                      className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                      title="Ubicar objetivo en el Mega-Atlas"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Ver en Mega-Atlas</span>
                    </button>
                  </div>
                </div>

                {/* 2. Stepper Horizontal Integrado */}
                <div className="px-6 py-4 bg-[#080f22]/90 border-b border-slate-800/80 overflow-x-auto custom-scrollbar">
                  <div className="min-w-[420px] py-2 px-4 relative flex items-center justify-between">
                    <div className="absolute top-[26px] left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 z-0" />
                    
                    <div 
                      className="absolute top-[26px] left-8 h-1 bg-gradient-to-r from-emerald-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((curStepNum - 1) / Math.max(1, totalSteps - 1)) * 100))}%`
                      }}
                    />

                    {stepsList.map((st, sIdx) => {
                      const stepNum = st.step || (sIdx + 1);
                      const isDone = stepNum < curStepNum;
                      const isCur = stepNum === curStepNum;

                      return (
                        <div key={sIdx} className="relative z-10 flex flex-col items-center max-w-[125px] text-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                            isCur
                              ? 'bg-amber-500 border-2 border-amber-200 text-slate-950 ring-4 ring-amber-400/30 shadow-lg shadow-amber-500/40 scale-110'
                              : isDone
                                ? 'bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 shadow-md'
                                : 'bg-[#0d162c] border-2 border-slate-700 text-slate-500'
                          }`}>
                            {isDone ? (
                              <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                            ) : isCur ? (
                              <span className="text-sm font-black">{stepNum}</span>
                            ) : (
                              <span className="text-xs font-mono">{stepNum}</span>
                            )}
                          </div>

                          <span className={`mt-2 text-[10px] font-black uppercase tracking-wider ${
                            isCur ? 'text-amber-300' : isDone ? 'text-emerald-400' : 'text-slate-500'
                          }`}>
                            {isCur ? '⚡ En Curso' : isDone ? '✓ Hecho' : `Paso ${stepNum}`}
                          </span>

                          <span className={`text-[11px] font-bold mt-0.5 line-clamp-2 leading-tight ${
                            isCur ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            {st.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Panel de Objetivo Activo */}
                <div className="p-5 flex flex-col gap-3.5 bg-gradient-to-b from-[#0a1226] to-[#070e1c]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                        <span>🎯</span> OBJETIVO ACTUAL (Paso {curStepNum} de {totalSteps})
                      </span>
                      <span className="text-xs font-black text-white">
                        {curStepName}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                      📍 {curWhere}
                    </span>
                  </div>

                  <div className="text-sm text-slate-100 font-medium leading-relaxed bg-[#0c1630]/90 p-3.5 rounded-xl border border-indigo-950/80 shadow-inner">
                    {cleanStepText}
                  </div>

                  {Array.isArray(curStepDef?.items) && curStepDef.items.length > 0 ? (
                    <div className="mt-1 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
                      <div className="text-[11.5px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-between flex-wrap gap-2">
                        <span className="flex items-center gap-1.5">
                          <span>📦</span> <span>Materiales e Insumos Requeridos ({curStepDef.items.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Existencias: Mochila (M) + Cofres Casa (CC) + Cofre Pueblo (CP)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {curStepDef.items.map((it, itIdx) => {
                          const bd = getItemStorageBreakdown ? getItemStorageBreakdown({ id: it.id, name: it.name }) : { total: 0, m: 0, cc: 0, cp: 0 };
                          const manualKey = `${targetQuest.id}_${it.id}`;
                          const isManualDelivered = !!deliveredItemsManual[manualKey];
                          const haveEnough = isManualDelivered || (bd.total >= it.needed);
                          const missingCount = Math.max(0, it.needed - bd.total);

                          return (
                            <div
                              key={itIdx}
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                haveEnough
                                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-sm shadow-emerald-950/30'
                                  : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/40 text-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-base">{haveEnough ? '✅' : '⏳'}</span>
                                  <div>
                                    <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                                      <span>{it.name}</span>
                                      {haveEnough ? (
                                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                          ¡Suficiente!
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                          Faltan {missingCount}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                      M: {bd.m} | CC: {bd.cc} | CP: {bd.cp}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end shrink-0">
                                  <span className={`text-xs font-mono font-black ${haveEnough ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    {isManualDelivered ? 'Entregado' : `${bd.total} / ${it.needed}`}
                                  </span>
                                  <button
                                    onClick={() => toggleDeliveredItem && toggleDeliveredItem(targetQuest.id, it.id)}
                                    className={`mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                      isManualDelivered
                                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                                    }`}
                                  >
                                    {isManualDelivered ? '✓ Entregado' : 'Marcar Entregado'}
                                  </button>
                                </div>
                              </div>

                              <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full transition-all duration-500 ${haveEnough ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                  style={{ width: `${Math.min(100, Math.round((bd.total / Math.max(1, it.needed)) * 100))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span>🧭</span> <span>Acción Requerida: <b>{curStepName}</b> (sin entrega de materiales en este paso)</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                        Exploración / Diálogo
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-sm">
                Selecciona una misión activa de la lista izquierda para ver su paso a paso en vivo.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        {/* Columna Izquierda (6/12): Tareas Diarias + Cama y Energía */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* TAREAS DIARIAS */}
          <div className="bg-[#0e172c] border-2 border-emerald-500/50 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleQuestSection('dailyTasks')}
              className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {questSectionsOpen.dailyTasks ? (
                  <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                    <span>🌱 Tareas Diarias (Task Center)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      dailyTasksCompletedCount === 6
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {dailyTasksCompletedCount}/6 Completadas
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {dailyTasksCompletedCount === 6 ? (
                      <span className="text-emerald-300 font-bold">🎉 ¡6 de 6 completadas! Reclama tus 10 Semillas Premium en el botón 'Task' bajo tu perfil.</span>
                    ) : (
                      <span>Recompensa al completar las 6: <b className="text-amber-300">🌱 10 Semillas Premium (Recompensa Diaria)</b></span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {questSectionsOpen.dailyTasks ? 'Ocultar ▲' : 'Mostrar ▼'}
              </span>
            </button>

            {questSectionsOpen.dailyTasks && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-2.5">
                <div className="p-3 bg-[#0a1224] border border-slate-800 rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <span>🎁</span> <span>Progreso a 10 Semillas Premium:</span>
                    </span>
                    <span className="font-mono font-black text-emerald-400">
                      {dailyTasksCompletedCount} / 6 ({Math.round((dailyTasksCompletedCount / 6) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${(dailyTasksCompletedCount / 6) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 flex-wrap gap-2">
                    <span>Se reinicia diariamente a las 00:00 UTC (21:00 hs Argentina).</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (setDailyTasks) {
                            setDailyTasks(prev => {
                              const updated = prev.map(t => ({ ...t, done: true, current: t.target }));
                              try {
                                localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: new Date().toISOString().slice(0, 10), tasks: updated }));
                              } catch (e) {}
                              return updated;
                            });
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
                        title="Marcar todas las 6 tareas del día como listas"
                      >
                        ✓ Marcar Todas Listas (6/6)
                      </button>
                      <button
                        onClick={() => {
                          if (setDailyTasks) {
                            setDailyTasks(prev => {
                              const updated = prev.map(t => ({ ...t, done: false, current: 0 }));
                              try {
                                localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: new Date().toISOString().slice(0, 10), tasks: updated }));
                              } catch (e) {}
                              return updated;
                            });
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-medium text-[10px] transition-colors cursor-pointer"
                        title="Reiniciar progreso diario"
                      >
                        Reiniciar
                      </button>
                    </div>
                  </div>
                </div>

                {dailyTasksCompletedCount === 6 && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 text-emerald-300 text-xs font-bold shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌸</span>
                      <span>Bono reclamado. Hoy conseguiste 10 Semillas Premium.</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10.5px] font-mono">
                      BONO ACTIVO
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {dailyTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleDailyTask && toggleDailyTask(t.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        t.done
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-[#101b33] border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{t.icon || '🌱'}</span>
                        <div>
                          <div className={`text-xs font-bold ${t.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {t.label}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Meta: {t.target} {t.target > 1 ? 'acciones' : 'acción'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          t.done
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {t.done ? '✓ Completada' : 'Pendiente'}
                        </span>
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => {}}
                          className="w-4 h-4 rounded accent-emerald-500 cursor-pointer pointer-events-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MONITOR DE ENERGÍA Y CAMA */}
          <div className="bg-[#0e172c] border border-cyan-500/40 rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => toggleQuestSection('energyBed')}
              className="w-full p-4 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {questSectionsOpen.energyBed ? (
                  <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                    🛏️ Monitor de Energía y Cama (Season 0 Rework)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                    ⚡ {Math.floor(currentEnergy)}/{maxEnergy} • {energyMeta.canRest ? '✓ Cama Lista' : `Cama: ${energyMeta.bedWaitText || energyMeta.utcCountdownStr}`}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {questSectionsOpen.energyBed ? 'Ocultar ▲' : 'Mostrar ▼'}
              </span>
            </button>

            {questSectionsOpen.energyBed && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-2.5">
                <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-slate-300">Energía Actual del Personaje:</span>
                  <span className="font-mono font-black text-cyan-300 text-sm">
                    {Math.floor(currentEnergy)} / {maxEnergy} ⚡ <span className="text-[10px] text-emerald-400">{isVip ? '(+1⚡ cada 3m VIP)' : '(Regen base)'}</span>
                  </span>
                </div>

                <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-slate-300">Estado de la Cama (Reinicio 00:00 UTC):</span>
                  <span className={energyMeta.canRest ? 'text-emerald-400 font-black' : 'text-amber-300 font-black'}>
                    {energyMeta.recovering
                      ? `💤 Recuperando (${energyMeta.recoverMinutesLeft}m restantes)`
                      : energyMeta.canRest
                      ? `✓ Cama Lista (${energyMeta.sleepLeft ?? (energyMeta.sleepADay || 200)}/${energyMeta.sleepADay || 200}⚡ hoy)`
                      : `🏠 Cama en ${energyMeta.bedWaitText || energyMeta.utcCountdownStr}`}
                  </span>
                </div>

                <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-slate-300">Sueño Diario Usado Hoy:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {energyMeta.usedSleepToday ?? (energyMeta.sleepADay || 200)} / {energyMeta.sleepADay || 200} ⚡
                  </span>
                </div>

                <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-slate-300">Comida Consumida Hoy (Reinicio 00:00 UTC):</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {energyMeta.foodEatenToday || 0} / {energyMeta.foodCapToday || (isVip || energyMeta.isHolder ? 150 : 100)} ⚡
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed bg-[#0a1224] p-2.5 rounded-lg border border-slate-800">
                  💡 <b>Cómo funciona el sistema de Cama, Comida y Energía:</b>
                  <br />• Los jugadores <b>VIP</b> regeneran pasivamente <b>+1⚡ cada 3 minutos</b> (+20⚡ por hora).
                  {energyMeta.isJamActive && (
                    <><br />• 🫐 <b>Mermelada de Zafiro Activa:</b> Regeneración acelerada a <b>+1.3⚡ cada 3 min</b> (+26⚡/h) durante {energyMeta.jamMinutesLeft}m restantes.</>
                  )}
                  <br />• Cuota de sueño diaria (reinicio 00:00 UTC): <b>200⚡</b> (jugador base, 2 barras de 100⚡), o <b>450⚡ / 600⚡ / 750⚡</b> (VIP u Holders, 3 a 5 barras de 150⚡ según perks/farmers).
                  <br />• Cuota de comida diaria (reinicio 00:00 UTC, 1 barra completa por día): <b>100⚡</b> (jugador base) / <b>150⚡</b> (VIP u Holders). Los platos cocinados alimentan la barra diaria; Moonlight Stew otorga 8⚡ por plato (cuenta para la barra de comida diaria).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha (6/12): Libro de las 10 Habilidades */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-[#0e172c] border-2 border-amber-500/50 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => toggleQuestSection('skillsBook')}
              className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {questSectionsOpen.skillsBook ? (
                  <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    📖 Libro de Habilidades en Tiempo Real (Las 10 Habilidades de Bloomshire)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Cultivo Nv {farmingLevel} • Mínima: {skillsMeta.minSkillName} (Nv {skillsMeta.minSkillLevel}) • Regla de 3 niveles
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-rose-950/70 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg font-bold">
                  Tope Actual: Nv {skillsMeta.maxAllowedLevel || 5}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {questSectionsOpen.skillsBook ? 'Ocultar ▲' : 'Mostrar ▼'}
                </span>
              </div>
            </button>

            {questSectionsOpen.skillsBook && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {CANONICAL_SKILLS.map(def => {
                    const sk = skillsBreakdown[def.key] || { level: 1, xp: 0, into: 0, need: 100, pct: 0 };
                    const lvl = sk.effectiveLevel ?? sk.level ?? 1;
                    const isLowest = Boolean(sk.isLowestGated);
                    const isCapped = Boolean(sk.capped);
                    return (
                      <div
                        key={def.key}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                          isLowest
                            ? 'bg-amber-950/30 border-amber-500/60'
                            : isCapped
                            ? 'bg-rose-950/30 border-rose-500/50'
                            : 'bg-[#121d38] border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-white flex items-center gap-1.5">
                            <span>{def.icon}</span>
                            <span>{def.label}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isLowest && (
                              <span className="text-[9.5px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                                Sube a Nv {lvl + 1}
                              </span>
                            )}
                            {isCapped && (
                              <span className="text-[9.5px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                                Tope Nv {lvl}
                              </span>
                            )}
                            {!def.gated && (
                              <span className="text-[9.5px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                No bloquea
                              </span>
                            )}
                            <span className="font-mono font-black text-cyan-300 text-xs">
                              Nv {lvl}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300"
                            style={{ width: `${sk.pct || 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>XP Total: {(sk.xp || 0).toLocaleString('es-ES')}</span>
                          <span>{sk.into || 0} / {sk.need || 100} XP ({sk.pct || 0}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {skillsMeta.isFarmingCapped && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-200 leading-relaxed flex flex-wrap items-center justify-between gap-2">
                    <span>
                      ⚠️ <b>Cómo desbloquear Cultivo Nivel 6:</b> Tu Cultivo está en <b>Nivel {farmingLevel}</b> (tope actual). Como <b>{skillsMeta.minSkillName}</b> están en <b>Nivel {skillsMeta.minSkillLevel}</b> (2 + 3 = 5), sube <b>Recolección</b> (setas Silvercap/Glowcap en Whisperwood) y <b>Cocina</b> (estufa de Tamsin) a <b>Nivel 3 (650 XP)</b>.
                    </span>
                    <button
                      onClick={() => {
                        if (setItemCategoryFilter && setItemSearchQuery && setActiveTab) {
                          setItemCategoryFilter('all');
                          setItemSearchQuery('Silvercap');
                          setActiveTab('items');
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded text-[11px] cursor-pointer shrink-0"
                    >
                      🔎 Buscar Setas Silvercap/Glowcap
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
