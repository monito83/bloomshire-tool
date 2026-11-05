// src/components/bloomshire/tabs/MonitorsTab.jsx
import React from 'react';
import { MapPin, BookOpen } from 'lucide-react';
import { LockedModuleScreen, LiveCropOrTimerCard } from '../bloomshireHelpers';

export default function MonitorsTab({
  isConnected,
  onConnect,
  onBack,
  activeCrops = [],
  productionTimers = [],
  serverTimeOffset = 0,
  locateInMegaAtlas,
  handleRemoveProductionTimer,
  soundAlarmEnabled = true,
  setSoundAlarmEnabled,
  playChimeAlarm,
  showAddTimerModal = false,
  setShowAddTimerModal,
  newTimerForm = { name: '', qty: 1, durationMinutes: 5, location: '🏡 Cabaña (Home Island)', icon: '🍲' },
  setNewTimerForm,
  handleAddProductionTimer,
  dailyTasks = [],
  toggleDailyTask,
  dailyTasksCompletedCount = 0,
  activeQuestMaterials = [],
  getItemStorageBreakdown,
  energyMeta = {},
  setActiveTab
}) {
  if (!isConnected) {
    return (
      <LockedModuleScreen
        title="Temporizadores & Producción en Vivo"
        description="Monitorea tus parcelas sembradas, cuentas regresivas de cocina/crafteo y tareas diarias en vivo conectando tu partida con la extensión Bloomshire Companion."
        onConnect={onConnect}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 max-w-5xl mx-auto w-full custom-scrollbar">
      <div className="p-3.5 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-sm">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span>⏱️ Monitores & Temporizadores en Tiempo Real</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          Control en vivo de parcelas sembradas, descanso en cabaña y horarios de sueño de la aldea.
        </div>
      </div>

      {/* WIDGET PRIORITARIO: DASHBOARD DE COSECHAS, COCINA Y TEMPORIZADORES EN TIEMPO REAL */}
      <div className="p-4 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-md space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xl">🚜</span>
            <div>
              <div className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>Dashboard de Cosechas & Producción en Curso</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                  {[...activeCrops, ...productionTimers].length} activas
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Monitoreo en vivo de parcelas sembradas y lotes de cocina. Suena una alarma cuando están listos para levantar.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSoundAlarmEnabled && setSoundAlarmEnabled(!soundAlarmEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                soundAlarmEnabled
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Activar o silenciar campanilla sonora"
            >
              {soundAlarmEnabled ? '🔔 Alarma: Activa' : '🔕 Alarma: Silenciada'}
            </button>

            <button
              onClick={playChimeAlarm}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
              title="Probar sonido de campanilla"
            >
              🔊 Probar Sonido
            </button>

            <button
              onClick={() => setShowAddTimerModal && setShowAddTimerModal(true)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer transition-all shadow-md flex items-center gap-1"
            >
              ➕ Nuevo Lote de Cocina / Crafteo
            </button>
          </div>
        </div>

        {/* Lista de Cultivos y Lotes en Tiempo Real */}
        {([...activeCrops, ...productionTimers].length === 0) ? (
          <div className="p-4 bg-[#081020] border border-slate-800/80 rounded-xl text-xs text-slate-400 text-center flex flex-col items-center justify-center gap-2 py-6">
            <span className="text-2xl">🌱</span>
            <p className="max-w-md leading-relaxed">
              No hay cultivos en tierra ni preparaciones activas registradas en este momento. Cuando siembres en tu cabaña o dejes comida cocinándose, aparecerán aquí con su cuenta regresiva y alarma sonora automática.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...activeCrops, ...productionTimers].map((item, idx) => (
              <LiveCropOrTimerCard
                key={item.id || idx}
                item={item}
                serverTimeOffset={serverTimeOffset}
                locateInMegaAtlas={locateInMegaAtlas}
                handleRemoveProductionTimer={handleRemoveProductionTimer}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL PARA AGREGAR TEMPORIZADOR MANUAL */}
      {showAddTimerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1428] border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <span>🍲 Iniciar Temporizador de Cocina o Crafteo</span>
              </div>
              <button
                onClick={() => setShowAddTimerModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nombre de la Receta / Plato:</label>
                <input
                  type="text"
                  value={newTimerForm.name}
                  onChange={(e) => setNewTimerForm && setNewTimerForm({ ...newTimerForm, name: e.target.value })}
                  className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                  placeholder="Ej: Guiso de Pescado, Pan de Trigo, Tablones..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={newTimerForm.qty}
                    onChange={(e) => setNewTimerForm && setNewTimerForm({ ...newTimerForm, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Tiempo (Minutos):</label>
                  <input
                    type="number"
                    min="1"
                    value={newTimerForm.durationMinutes}
                    onChange={(e) => setNewTimerForm && setNewTimerForm({ ...newTimerForm, durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Lugar de Preparación:</label>
                <select
                  value={newTimerForm.location}
                  onChange={(e) => setNewTimerForm && setNewTimerForm({ ...newTimerForm, location: e.target.value })}
                  className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                >
                  <option value="🏡 Cabaña (Home Island)">🏡 Estufa de Tu Cabaña (Home Island)</option>
                  <option value="🍲 Panadería de Tamsin (Bloomshire)">🍲 Panadería de Tamsin (Bloomshire)</option>
                  <option value="🪵 Carpintería de Pell">🪵 Carpintería de Pell (Banco de Trabajo)</option>
                  <option value="⚒️ Herrería de Bram">⚒️ Herrería de Bram (Forja)</option>
                  <option value="🌊 Molino de Hollin (Southvale)">🌊 Molino & Lechería de Hollin (Southvale)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddTimerModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProductionTimer}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow-md"
              >
                ✓ Iniciar Temporizador
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget de Tareas Diarias (Task Center - Semilla Premium) */}
        <div className="p-4 bg-[#0e172c] border-2 border-emerald-500/50 rounded-xl shadow-md flex flex-col justify-between gap-3 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
            <div className="text-sm font-black text-emerald-400 flex items-center gap-2 flex-wrap">
              <span>🌱 TAREAS DIARIAS (TASK CENTER) — RECOMPENSA: 10 SEMILLAS PREMIUM</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                dailyTasksCompletedCount === 6 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {dailyTasksCompletedCount}/6 Completadas
              </span>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('quests')}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-xs font-bold cursor-pointer"
            >
              Ver en Misiones & Tareas
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {dailyTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleDailyTask && toggleDailyTask(t.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  t.done ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' : 'bg-[#101b33] border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-base">{t.icon || '🌱'}</span>
                  <span className={`text-[11px] font-semibold truncate ${t.done ? 'line-through text-slate-400' : 'text-slate-100'}`} title={t.label}>
                    {t.label}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 rounded accent-emerald-500 pointer-events-none shrink-0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Widget de Alerta de Materiales de Misiones */}
        <div className="p-4 bg-[#0e172c] border-2 border-rose-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="text-sm font-black text-rose-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-400" />
              <span>📋 RESUMEN DE MATERIALES FALTANTES PARA MISIONES ACTIVAS</span>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('quests')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-xs font-bold cursor-pointer"
            >
              Ver Árbol Completo en Misiones
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {(activeQuestMaterials.length === 0 ? [
              { item: 'Todo al Día', quest: 'Misiones Activas', needed: 0, id: 'all_ok' }
            ] : activeQuestMaterials).map((itemAlert, idx) => {
              if (itemAlert.id === 'all_ok') {
                return (
                  <div key={idx} className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg col-span-full text-center text-xs text-emerald-300 font-bold">
                    ✨ No hay misiones activas que requieran entrega de insumos pendientes.
                  </div>
                );
              }
              const displayName = itemAlert.name || itemAlert.item || itemAlert.id;
              const displayQuest = itemAlert.questTitle || itemAlert.questName || itemAlert.quest;
              const bd = getItemStorageBreakdown ? getItemStorageBreakdown({ id: itemAlert.id, name: displayName }) : { total: 0, m: 0, cc: 0, cp: 0 };
              const ok = itemAlert.delivered || bd.total >= itemAlert.needed;
              const miss = Math.max(0, itemAlert.needed - bd.total);
              return (
                <div key={idx} className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                  itemAlert.delivered ? 'bg-emerald-950/30 border-emerald-500/30 opacity-75' : ok ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-[#121024] border-rose-500/40'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs truncate max-w-[120px]" title={displayName}>{displayName}</span>
                    <span className={`font-mono font-black text-xs ${itemAlert.delivered || ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {itemAlert.delivered ? 'Entregado' : `${bd.total}/${itemAlert.needed}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1">
                    <span className="truncate" title={displayQuest}>{displayQuest}</span>
                    <span className={`px-1 rounded text-[9px] font-bold shrink-0 border ${itemAlert.isCurrentStep ? 'text-rose-300 border-rose-500/40 bg-rose-950/40' : 'text-amber-300 border-amber-500/40 bg-amber-950/40'}`}>
                      {itemAlert.isCurrentStep ? 'Paso Actual' : `Paso ${itemAlert.targetStep}`}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold flex items-center justify-between mt-0.5">
                    <span className={itemAlert.delivered || ok ? 'text-emerald-300' : 'text-rose-400'}>
                      {itemAlert.delivered ? '✅ Ya Entregado' : ok ? '✅ Listo' : `Faltan ${miss}`}
                    </span>
                    {!itemAlert.delivered && (
                      <div className="flex items-center gap-1 font-mono text-[9px]">
                        {bd.m > 0 && <span className="bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 px-1 py-0.5 rounded" title="En Mochila">🎒{bd.m}</span>}
                        {bd.cc > 0 && <span className="bg-amber-950/70 border border-amber-500/40 text-amber-300 px-1 py-0.5 rounded" title="En Cofre Casa">🏡{bd.cc}</span>}
                        {bd.cp > 0 && <span className="bg-purple-950/70 border border-purple-500/40 text-purple-300 px-1 py-0.5 rounded" title="En Cofre Pueblo">🏬{bd.cp}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monitor de Cama y Energía */}
        <div className="p-4 bg-[#0e172c] border border-indigo-950/80 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>🛏️ Descanso Diario en Cabaña (Home Island)</span>
            </div>
            <div className="mt-2 p-3 bg-[#091122] rounded-lg border border-slate-800 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Cuota diaria recuperable:</span>
                <span className="font-mono text-emerald-300 font-bold">
                  {energyMeta.sleepLeft ?? 450} / {energyMeta.sleepADay || 450}⚡ restantes hoy
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Energía usada hoy en cama:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {energyMeta.usedSleepToday ?? 0}⚡
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Estado de Cama:</span>
                <span className={`font-mono font-bold ${energyMeta.canRest ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {energyMeta.recovering
                    ? `🛌 Recuperando (${energyMeta.recoverMinutesLeft}m restantes)`
                    : energyMeta.sleepExhausted
                    ? `⏳ Cuota Agotada hoy (${energyMeta.bedWaitText})`
                    : energyMeta.canRest
                    ? `✅ Cama Lista (${energyMeta.sleepLeft ?? 450}/450⚡ disponible)`
                    : '⚡ Barra Llena'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Próximo reinicio UTC:</span>
                <span className="font-mono text-cyan-300 font-bold">{energyMeta.utcCountdownStr || '00:00 UTC (21:00 ARG)'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              locateInMegaAtlas && locateInMegaAtlas({
                label: '🛏️ Tu Cabaña y Cama (Home Island)',
                regionId: 'home_island',
                subZoneId: 'home_island_sub_0_home_island',
                wx: 4042,
                wy: 10032,
                worldRect: [3750, 9750, 600, 560]
              });
            }}
            className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Ubicar Cabaña en Mega-Atlas</span>
          </button>
        </div>

        {/* Ciclo de Día, Noche y Tiendas */}
        <div className="p-4 bg-[#0e172c] border border-indigo-950/80 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>☀️ Ciclo de Horarios de la Aldea</span>
            </div>
            <div className="mt-2 p-3 bg-[#091122] rounded-lg border border-slate-800 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Horario Diurno:</span>
                <span className="text-amber-300 font-bold">07:00 a 20:00 (Tiendas Abiertas)</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Regla Nocturna & Lluvia:</span>
                <span className="text-purple-300 font-bold">20:00 a 07:00 (NPCs en sus casas)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Atención de Odette:</span>
                <span className="text-cyan-300 font-bold">6 Pedidos Diarios disponibles</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200/90 leading-relaxed">
            💡 Si llueve o es de noche, los NPCs no estarán en sus puestos exteriores. Entra a sus casas o espera las 07:00.
          </div>
        </div>
      </div>
    </div>
  );
}
