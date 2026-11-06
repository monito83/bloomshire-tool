// src/components/bloomshire/app/HeaderHud.jsx
// Barra superior: oro, energía, nivel y wallet, idioma, Sync, desconectar y colapsar el menú.
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Gem, LogOut, RefreshCw } from 'lucide-react';
import LanguageSwitcher from '../../LanguageSwitcher';

export default function HeaderHud({
    avyn, currentEnergy, energyMeta, farmingLevel, fetchSyncFromServer, formattedLastSyncTime,
    gold, handleDisconnect, isConnected, isHeaderCollapsed, isSyncStale, isSyncing,
    isVip, maxEnergy, setIsHeaderCollapsed, setShowConnectModal, setShowProfileModal, shards,
    viewOnlyWallet, walletAddress
  }) {
  const { t: tHeader, i18n } = useTranslation('header');
  return (
      <header className="px-4 py-2 bg-[#080d19] border-b border-slate-800/80 flex items-center justify-between gap-3 shadow-md shrink-0">
        {/* Izquierda: Indicadores de Estado Estilo Boceto (Píldoras redondeadas con alto contraste) */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Logo & Marca */}
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm shadow-inner">
              🌾
            </div>
            <span className="font-black text-white text-xs tracking-wider hidden sm:inline">BLOOMSHIRE</span>
          </div>

          {isConnected && walletAddress && walletAddress !== 'null' && walletAddress.startsWith('0x') ? (
            <>
              {/* Píldora de Oro */}
              <div 
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#12192a] border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm shrink-0" 
                title={tHeader('gold.tooltip', { amount: new Intl.NumberFormat(i18n.language || 'en').format(gold) })}
              >
                <span className="text-amber-400">🪙</span>
                <span>{gold >= 1000 ? tHeader('gold.displayK', { amount: (gold / 1000).toFixed(1) }) : tHeader('gold.display', { amount: new Intl.NumberFormat(i18n.language || 'en').format(gold) })}</span>
              </div>

              {/* Píldora de Energía */}
              {energyMeta.isJamActive && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/70 border border-indigo-400/50 text-indigo-300 font-bold text-xs shadow-sm shrink-0 animate-pulse"
                  title={tHeader('energy.jamTooltip', { minutes: energyMeta.jamMinutesLeft })}
                >
                  <span className="text-sm">🫐</span>
                  <span className="font-mono text-xs font-black">{energyMeta.jamMinutesLeft}m</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 hidden sm:inline">+30%</span>
                </div>
              )}
              <div 
                className="relative overflow-hidden flex items-center gap-2 px-3 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-200 font-bold text-xs shadow-sm shrink-0 min-w-[125px]"
                title={tHeader('energy.liveTooltip', {
                  current: Math.floor(currentEnergy),
                  max: maxEnergy,
                  detail: energyMeta.isJamActive
                    ? tHeader('energy.jamDetail')
                    : isVip
                    ? tHeader('energy.vipDetail')
                    : tHeader('energy.baseDetail')
                })}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-amber-500/35 pointer-events-none transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (currentEnergy / maxEnergy) * 100))}%` }}
                />
                <span className="relative z-10 text-amber-400">🛏️</span>
                <span className="relative z-10 font-mono">{`${Math.floor(currentEnergy)}/${maxEnergy}`}</span>
                {energyMeta.canRest && (
                  <span className="relative z-10 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">{tHeader('energy.ready')}</span>
                )}
              </div>

              {/* Nivel & Wallet interactivo -> Abre Modal de Perfil de Granjero */}
              <button 
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-amber-500/40 hover:border-amber-400/80 text-amber-300 hover:text-white text-xs font-mono shrink-0 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                title={tHeader('farmer.profileTooltip')}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-400 font-bold">{tHeader('farmer.level', { level: farmingLevel })}</span>
                <span className="text-slate-600">•</span>
                <span title={walletAddress}>{walletAddress.slice(0, 5)}...{walletAddress.slice(-3)}</span>
                <span className="text-[10px] font-sans text-amber-400/90 ml-0.5">👤</span>
              </button>

              {/* Shards / Tokens */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a]/50 border border-slate-800/80 text-indigo-300 text-[11px] font-mono shrink-0">
                <Gem className="w-3 h-3 text-indigo-400" />
                <span>{`${shards} AVS`}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">{`${avyn} $AVYN`}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {viewOnlyWallet ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="font-mono">{tHeader('mode.readOnly', { wallet: `${viewOnlyWallet.slice(0, 6)}...${viewOnlyWallet.slice(-4)}` })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>{tHeader('mode.freeGuide')}</span>
                </div>
              )}
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                title={tHeader('mode.connectGameTitle')}
              >
                <span>{tHeader('mode.connectGameButton')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Selector de Idioma + Botón Sync estilo Boceto + Desconectar + Colapsar */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          {isConnected && (
            <>
              {isSyncStale && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm" title={tHeader('sync.staleTooltip')}>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="hidden sm:inline">{tHeader('sync.staleFull')}</span>
                  <span className="sm:hidden">{tHeader('sync.staleShort')}</span>
                </div>
              )}
              <button
                onClick={fetchSyncFromServer}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title={tHeader('sync.tooltip', { time: formattedLastSyncTime })}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{tHeader('sync.button')}</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title={tHeader('disconnect.title')}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{tHeader('disconnect.button')}</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              const next = !isHeaderCollapsed;
              setIsHeaderCollapsed(next);
              try { localStorage.setItem('bloomshire_header_collapsed', String(next)); } catch {}
            }}
            className="w-8 h-8 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title={isHeaderCollapsed ? tHeader('toggle.expand') : tHeader('toggle.collapse')}
          >
            {isHeaderCollapsed ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </header>
  );
}
