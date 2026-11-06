// src/components/bloomshire/tabs/SystemTab.jsx
import React from 'react';
import { DATA_GAME_VERSION } from '../state/useSystemUpdates';
import { 
  BookOpen, 
  Compass, 
  User, 
  Sparkles, 
  Hammer, 
  Moon, 
  RefreshCw, 
  Zap 
} from 'lucide-react';

export default function SystemTab({
  toolVersion = 'v1.0.2',
  gameBuildStatus = 'synced',
  gameBuildHash = DATA_GAME_VERSION,
  lastUpdateCheck = 'hace instantes',
  handleCheckUpdates,
  isCheckingUpdates = false,
  handleForceRedownload,
  updateStatusMessage = 'Todos los catálogos están sincronizados y al día.',
  activeQuestsList = [],
  activeQuestMaterials = [],
  activeCrops = [],
  productionTimers = [],
  energyMeta = {},
  systemLogs = [],
  setSystemLogs,
  headerSlot = null
}) {
  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 custom-scrollbar max-w-6xl mx-auto w-full">
      {/* Panel real de actualizaciones del juego (solo admin) o la cabecera anterior */}
      {headerSlot || (
        <>
      {/* Header Card de Estado y Actualizaciones */}
      <div className="p-5 bg-gradient-to-r from-[#0c1630] via-[#101f42] to-[#0d172e] border-2 border-indigo-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-white flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">⚙️</span>
              <span>Centro de Ajustes & Actualizaciones del Sistema</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              🟢 Sistema Sincronizado
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Monitoreo en tiempo real de todos los catálogos locales, detección de parches en Bloomshire y sincronización segura con 1 clic.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
            <span>Tool: <b className="text-white">{toolVersion}</b></span>
            <span>•</span>
            <span>Servidor: <b className="text-cyan-300">bloomshire.xyz (Season 0)</b></span>
            <span>•</span>
            <span>Build: <b className={gameBuildStatus === 'synced' ? 'text-emerald-400' : 'text-amber-400'}>{gameBuildHash}</b></span>
            <span>•</span>
            <span>Último Chequeo: <b className="text-amber-300">{lastUpdateCheck}</b></span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
            title="Comprobar si el juego actualizó misiones, mapas o aldeanos"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdates ? 'Comprobando...' : '🔍 Comprobar Actualizaciones'}</span>
          </button>
          <button
            onClick={() => handleForceRedownload && handleForceRedownload('all')}
            className="px-3.5 py-2.5 bg-[#14203d] hover:bg-[#1a2b52] border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Forzar un escaneo completo de la partida y mapas"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Re-escanear Todo</span>
          </button>
        </div>
      </div>

      {/* Banner de Estado Dinámico */}
      <div className="p-3 bg-[#0a1224] border border-indigo-900/60 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-200 font-medium">
          <span className="text-emerald-400 text-base">✨</span>
          <span>{updateStatusMessage}</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Sniffer pasivo: Activo
        </span>
      </div>

        </>
      )}

      {/* Grid de los 6 Módulos Locales Descargados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* CARD 1: Misiones & Quests */}
        <div className="p-4 bg-[#0e172c] border border-amber-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Catálogo de Misiones</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                🟢 1:1 con el Juego
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              24 capítulos canónicos del Libro 1 y misiones secundarias del pueblo. Árbol de insumos con descarte automático de materiales ya entregados.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Misiones Activas:</span>
                <b className="text-white">{activeQuestsList.length} en seguimiento</b>
              </div>
              <div className="flex justify-between">
                <span>Insumos pendientes:</span>
                <b className="text-amber-400">{activeQuestMaterials.length} materiales faltantes</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Season 0 Rework</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('quests')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Verificar Quests
            </button>
          </div>
        </div>

        {/* CARD 2: Mega-Atlas HD */}
        <div className="p-4 bg-[#0e172c] border border-cyan-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Mega-Atlas Pixel-Art HD</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                🟢 10 Mapas HD
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Renderizado nativo en WebP de los 10 mapas oficiales de Bloomshire, zonas de pesca etiquetadas y navegación de portales.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Mapas Cacheados:</span>
                <b className="text-cyan-300">10 de 10 completos</b>
              </div>
              <div className="flex justify-between">
                <span>Resolución máxima:</span>
                <b className="text-slate-300">5632 x 7424 px</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Cache Local WebP</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('maps')}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Re-renderizar Mapas
            </button>
          </div>
        </div>

        {/* CARD 3: Aldeanos & Regalos (NPCs) */}
        <div className="p-4 bg-[#0e172c] border border-purple-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Aldea & Horarios (NPCs)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                🟢 67 Vecinos
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Base de 67 aldeanos con ciclo de sueño diurno/nocturno (07:00-20:00), ubicación en casas y matriz de regalos amados y odiados.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Horario de Tiendas:</span>
                <b className="text-emerald-400">07:00 a 20:00</b>
              </div>
              <div className="flex justify-between">
                <span>Regla de Lluvia:</span>
                <b className="text-purple-300">Refugio en casa</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Base Canónica</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('npcs')}
              className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Verificar NPCs
            </button>
          </div>
        </div>

        {/* CARD 4: Cultivos & Temporizadores */}
        <div className="p-4 bg-[#0e172c] border border-emerald-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Cultivos & Maduración</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                🟢 36 Semillas
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tiempos de maduración de rules.js (2m a 360m), detección de necesidad de riego y alarmas sonoras automáticas al madurar.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Monitores Vivos:</span>
                <b className="text-emerald-400">{activeCrops.length} parcelas plantadas</b>
              </div>
              <div className="flex justify-between">
                <span>Sonido de Alerta:</span>
                <b className="text-slate-300">Campana de Cosecha</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">CROP_TIMES Activo</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('crops')}
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Sincronizar Cultivos
            </button>
          </div>
        </div>

        {/* CARD 5: Crafteo & Cocina */}
        <div className="p-4 bg-[#0e172c] border border-amber-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                <span>Crafteo & Cocina</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                🟢 Recetario Completo
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Recetas de cocina (Guiso Luz de Luna, Sopa de Chirivía, etc.), fundición de barras de cobre/hierro y aserradero de madera.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Temporizadores Activos:</span>
                <b className="text-amber-400">{productionTimers.length} en producción</b>
              </div>
              <div className="flex justify-between">
                <span>Niveles de Habilidad:</span>
                <b className="text-slate-300">Tope Nv 5</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Árbol de Recetas</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('craft')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Verificar Recetas
            </button>
          </div>
        </div>

        {/* CARD 6: Cabaña & Ciclo UTC */}
        <div className="p-4 bg-[#0e172c] border border-indigo-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-white text-sm flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Descanso & Ciclo UTC</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                🟢 +450⚡ / Día
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Motor de recarga diaria en cama de cabaña (Season 0). Regulación de fatiga y cálculo exacto del reinicio diario a las 00:00 UTC.
            </p>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Cuota restante:</span>
                <b className="text-indigo-300">{energyMeta.dailySleepAvailable ?? 450} / 450⚡</b>
              </div>
              <div className="flex justify-between">
                <span>Próximo reset UTC:</span>
                <b className="text-emerald-400">{energyMeta.utcCountdownStr || '23:59:59'}</b>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Algoritmo Canónico</span>
            <button
              onClick={() => handleForceRedownload && handleForceRedownload('energy')}
              className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 rounded text-[11px] font-bold cursor-pointer"
            >
              Calibrar Reloj
            </button>
          </div>
        </div>

      </div>

      {/* Consola de Diagnóstico & Registro de Telemetría */}
      <div className="p-4 bg-[#090f1f] border border-slate-800 rounded-xl flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span className="text-amber-400 font-mono">📟</span>
            <span>Consola de Diagnóstico y Telemetría del Sistema</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSystemLogs && setSystemLogs([])}
              className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Limpiar Log
            </button>
          </div>
        </div>

        <div className="bg-[#050914] p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
          {systemLogs.length === 0 ? (
            <span className="text-slate-600">Registro vacío.</span>
          ) : (
            systemLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span className={`${
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'warn' ? 'text-amber-400' :
                  log.type === 'error' ? 'text-rose-400' : 'text-cyan-300'
                }`}>
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

