// Bloomshire Tool - Live Companion & Market Radar (Modularized Architecture)
import React, { useState, useRef } from 'react';
import {
  Coins,
  Gem,
  RefreshCw,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Settings,
  LogOut,
  Map as MapIcon,
  PackageSearch,
  ChefHat,
  HeartHandshake,
  Calculator,
  Timer,
  ScrollText
} from 'lucide-react';

// Importar datos canónicos JSON

import BloomshireMegaAtlas from './BloomshireMegaAtlas';
import ErrorBoundary from './ErrorBoundary';
import '../i18n';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

// Pestañas
import ItemsTab from './bloomshire/tabs/ItemsTab';
import CalcTab from './bloomshire/tabs/CalcTab';
import InventoryTab from './bloomshire/tabs/InventoryTab';
import QuestsTab from './bloomshire/tabs/QuestsTab';
import CraftTab from './bloomshire/tabs/CraftTab';
import NpcsTab from './bloomshire/tabs/NpcsTab';
import MonitorsTab from './bloomshire/tabs/MonitorsTab';
import AdvisorTab from './bloomshire/tabs/AdvisorTab';
import SystemTab from './bloomshire/tabs/SystemTab';
import LogbookTab from './bloomshire/tabs/LogbookTab';
import AdminGate from './bloomshire/admin/AdminGate';
import GameUpdatePanel from './bloomshire/admin/GameUpdatePanel';

// Estado y lógica (docs/REFACTOR_SPEC.md, fase 3): cada archivo es dueño de sus datos
import useWalletSession from './bloomshire/state/useWalletSession';
import useCloudBackup from './bloomshire/state/useCloudBackup';
import useActiveTab from './bloomshire/state/useActiveTab';
import useDailyTasks from './bloomshire/state/useDailyTasks';
import useProductionTimers from './bloomshire/state/useProductionTimers';
import usePlayerState from './bloomshire/state/usePlayerState';
import useQuestMaterials from './bloomshire/state/useQuestMaterials';
import useSystemUpdates from './bloomshire/state/useSystemUpdates';
import useCompanionSync from './bloomshire/state/useCompanionSync';

export default function BloomshireCommand() {
  const { t: tHeader, i18n } = useTranslation('header');
  const { t: tTabs } = useTranslation('tabs');
  const { t: tErrors } = useTranslation('errors');

  // (el orden de los hooks respeta el orden de los efectos de antes donde importa: la sesion se valida antes de
  //  restaurar la cache y escuchar a la extension, que van al final en useCompanionSync)
  const applySnapshotRef = useRef(() => {});
  const disconnectRef = useRef(() => {});
  const wallet = useWalletSession({ applySnapshotRef, disconnectRef });
  const backup = useCloudBackup();
  const tab = useActiveTab();
  const tasks = useDailyTasks();
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('bloomshire_header_collapsed') === 'true'; } catch { return false; }
  });
  const timers = useProductionTimers();
  const player = usePlayerState(i18n);
  const quests = useQuestMaterials(player.activeQuestsList);
  const system = useSystemUpdates();

  const {
    walletAddress, setWalletAddress, sessionToken, setSessionToken, setAuthenticatedWallet, authenticatedWalletRef,
    lastReportedExtensionWalletRef, viewOnlyWallet, setViewOnlyWallet, setIsPremiumUnlocked, isConnected,
    showConnectModal, setShowConnectModal, showProfileModal, setShowProfileModal,
    connectCode, setConnectCode, connectFeedback, setConnectFeedback,
    injectedWallets, handleConnectAndSignWallet
  } = wallet;
  const { activeTab, setActiveTab, atlasFocusTarget, setAtlasFocusTarget, locateInMegaAtlas } = tab;
  const { dailyTasks, setDailyTasks, toggleDailyTask, dailyTasksCompletedCount } = tasks;
  const {
    activeCrops, setActiveCrops, productionTimers, setProductionTimers, soundAlarmEnabled, setSoundAlarmEnabled,
    showAddTimerModal, setShowAddTimerModal, newTimerForm, setNewTimerForm, serverTimeOffset,
    playChimeAlarm, handleAddProductionTimer, handleRemoveProductionTimer
  } = timers;
  const {
    isVip, setIsVip, setVipUntil, playerPerks, setPlayerPerks, farmersOwned, setFarmersOwned,
    farmingLevel, setFarmingLevel, currentEnergy, setCurrentEnergy, maxEnergy, setMaxEnergy, setRawEnergyObj,
    gold, setGold, shards, setShards, avyn, setAvyn, activeQuest, activeQuestsList, setActiveQuestsList,
    moonmereProgress, energyMeta, skillsMeta, skillsBreakdown, setSkillsBreakdown,
    isSyncing, isSyncStale, setIsSyncStale, formattedLastSyncTime,
    inventoryScope, setInventoryScope, rawInventory, setRawInventory, itemQuantities, setItemQuantities,
    activeOrders, setActiveOrders,
    soldGoldToday, soldThingsToday, soldItemsToday,
    dailyGoldCap, dailyThingsCap, dailyPerItemCap, remainingGoldCap, remainingThingsCap,
    getItemStorageBreakdown, getPlayerItemQty
  } = player;
  const { deliveredItemsManual, toggleDeliveredItem, activeQuestMaterials } = quests;
  const { isCheckingUpdates, updateStatusMessage, systemLogs, setSystemLogs, handleCheckUpdates, handleForceRedownload } = system;

  const handleDisconnect = () => {
    try {
      localStorage.setItem('bloomshire_manual_disconnected', 'true');
      localStorage.removeItem('bloomshire_session_token');
      localStorage.removeItem('bloomshire_wallet');
      localStorage.removeItem('bloomshire_cached_is_vip');
    } catch (_) {}
    setWalletAddress(null);
    setSessionToken(null);
    setAuthenticatedWallet(null);
    setIsSyncStale(false);
    authenticatedWalletRef.current = null;
    lastReportedExtensionWalletRef.current = null;
    setViewOnlyWallet(null);
    setIsPremiumUnlocked(false);
    setIsVip(false);
    setVipUntil(0);
    try { localStorage.removeItem('bloomshire_cached_vip_until'); } catch (_) {}
    setPlayerPerks(null);
    setGold(0);
    setCurrentEnergy(0);
    setMaxEnergy(100);
    setShards(0);
    setAvyn(0);
    setFarmersOwned(0);
    setFarmingLevel(0);
    setSkillsBreakdown({});
    setActiveQuestsList([]);
    setActiveOrders([]);
    setActiveCrops([]);
    setProductionTimers([]);
    setRawEnergyObj(null);
    setRawInventory([]);
    setItemQuantities({});
    setActiveTab('mega_atlas');
    try {
      localStorage.removeItem('bloomshire_wallet');
      localStorage.removeItem('bloomshire_cached_gold');
      localStorage.removeItem('bloomshire_cached_shards');
      localStorage.removeItem('bloomshire_cached_avyn');
      localStorage.removeItem('bloomshire_cached_energy');
      localStorage.removeItem('bloomshire_cached_farming_level');
      localStorage.removeItem('bloomshire_cached_farmers');
      localStorage.removeItem('bloomshire_cached_is_vip');
      localStorage.removeItem('bloomshire_cached_perks');
      localStorage.removeItem('bloomshire_cached_active_quest');
      localStorage.removeItem('bloomshire_prod_timers');
      localStorage.removeItem('bloomshire_daily_tasks');
      localStorage.removeItem('bloomshire_cached_snapshot');
      localStorage.removeItem('bloomshire_cached_market_offers');
      localStorage.setItem('bloomshire_active_tab', 'mega_atlas');
    } catch (_) {}
  };
  disconnectRef.current = handleDisconnect;

  const { applyIncomingSync, fetchSyncFromServer } = useCompanionSync({
    wallet, player, timers, tasks, queueCloudBackup: backup.queueCloudBackup, handleDisconnect
  });
  applySnapshotRef.current = applyIncomingSync;

  return (
    <div className="flex flex-col h-full bg-[#080d1a] text-slate-100 font-sans select-none overflow-hidden">
      
      {/* 1. MASTER HEADER HUD PRO GAMING (Sleek Obsidian Dashboard 48px - Estilo Boceto) */}
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

      {/* 2. NAVEGACIÓN PRINCIPAL HORIZONTAL (Diseño Sobrio y Limpio Idéntico al Boceto) */}
      {!isHeaderCollapsed && (
        <nav className="px-5 py-2 bg-[#0e1628] border-y border-slate-800/90 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: 'mega_atlas', label: tTabs('titles.mega_atlas'), Icon: MapIcon },
              { key: 'logbook', label: tTabs('titles.logbook'), Icon: BookOpen },
              { key: 'inventory', label: tTabs('titles.inventory'), Icon: Coins },
              { key: 'items', label: tTabs('titles.items'), Icon: PackageSearch },
              { key: 'craft', label: tTabs('titles.craft'), Icon: ChefHat },
              { key: 'npcs', label: tTabs('titles.npcs'), Icon: HeartHandshake },
              { key: 'calc', label: tTabs('titles.calc'), Icon: Calculator },
              { key: 'monitors', label: isConnected ? tTabs('titles.monitors') : tTabs('titles.monitorsLocked'), Icon: Timer }
            ].map(t => {
              const isActive = activeTab === t.key;
              const TabIcon = t.Icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`group px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/60 text-amber-200 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-bold'
                  }`}
                >
                  <TabIcon
                    aria-hidden="true"
                    strokeWidth={2.2}
                    className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 ${
                      isActive ? 'text-amber-300 opacity-100' : 'opacity-60 group-hover:opacity-100 group-hover:text-amber-300/90 group-hover:-translate-y-px'
                    }`}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Accesos Rápidos Secundarios (Misiones, Copilot IA y Ajustes) */}
          <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-800/80">
            <button
              onClick={() => setActiveTab('quests')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'quests'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={tTabs('titles.questsTitle')}
            >
              <ScrollText aria-hidden="true" strokeWidth={2.2} className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'quests' ? 'opacity-100' : 'opacity-60'}`} />
              <span>{tTabs('titles.quests')}</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'advisor'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={tTabs('titles.advisorTitle')}
            >
              <Sparkles aria-hidden="true" strokeWidth={2.2} className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'advisor' ? 'opacity-100' : 'opacity-60'}`} />
              <span>{tTabs('titles.advisor')}</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                activeTab === 'system'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={tTabs('titles.systemTitle')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary key={activeTab} title={tErrors('boundary.moduleTitle', { tab: activeTab })} onBack={() => setActiveTab('mega_atlas')}>

        {/* ==============================================================
            TAB: BUSCADOR UNIVERSAL DE ÍTEMS ("¿DÓNDE LO CONSIGO?") - 359 ÍTEMS
            ============================================================== */}
        {/* SUBMÓDULOS DE PESTAÑAS DESACOPLADAS (FASE 7) */}
        {activeTab === 'items' && (
          <ItemsTab
            getPlayerItemQty={getPlayerItemQty}
            locateInMegaAtlas={locateInMegaAtlas}
          />
        )}

        {activeTab === 'calc' && (
          <CalcTab
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            farmingLevel={farmingLevel}
            playerPerks={playerPerks}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            isConnected={isConnected}
            walletAddress={walletAddress}
            gold={gold}
            farmingLevel={farmingLevel}
            rawInventory={rawInventory}
            itemQuantities={itemQuantities}
            setItemQuantities={setItemQuantities}
            inventoryScope={inventoryScope}
            setInventoryScope={setInventoryScope}
            activeOrders={activeOrders}
            activeQuestMaterials={activeQuestMaterials}
            remainingThingsCap={remainingThingsCap}
            remainingGoldCap={remainingGoldCap}
            dailyGoldCap={dailyGoldCap}
            dailyThingsCap={dailyThingsCap}
            soldGoldToday={soldGoldToday}
            soldThingsToday={soldThingsToday}
            soldItemsToday={soldItemsToday}
            dailyPerItemCap={dailyPerItemCap}
            locateInMegaAtlas={locateInMegaAtlas}
            setShowConnectModal={setShowConnectModal}
            getPlayerItemQty={getPlayerItemQty}
          />
        )}

        {activeTab === 'quests' && (
          <QuestsTab
            isConnected={isConnected}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
            activeQuestsList={activeQuestsList}
            activeQuestMaterials={activeQuestMaterials}
            gold={gold}
            farmingLevel={farmingLevel}
            moonmereProgress={moonmereProgress}
            deliveredItemsManual={deliveredItemsManual}
            toggleDeliveredItem={toggleDeliveredItem}
            dailyTasks={dailyTasks}
            setDailyTasks={setDailyTasks}
            toggleDailyTask={toggleDailyTask}
            dailyTasksCompletedCount={dailyTasksCompletedCount}
            energyMeta={energyMeta}
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            isVip={isVip}
            skillsBreakdown={skillsBreakdown}
            skillsMeta={skillsMeta}
            locateInMegaAtlas={locateInMegaAtlas}
            getItemStorageBreakdown={(itemObj) => getItemStorageBreakdown(itemObj, rawInventory)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'craft' && (
          <CraftTab
            rawInventory={rawInventory}
            locateInMegaAtlas={locateInMegaAtlas}
            skillsBreakdown={skillsBreakdown}
          />
        )}

        {activeTab === 'npcs' && (
          <NpcsTab
            locateInMegaAtlas={locateInMegaAtlas}
          />
        )}

        {activeTab === 'monitors' && (
          <MonitorsTab
            isConnected={isConnected}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
            activeCrops={activeCrops}
            productionTimers={productionTimers}
            serverTimeOffset={serverTimeOffset}
            locateInMegaAtlas={locateInMegaAtlas}
            handleRemoveProductionTimer={handleRemoveProductionTimer}
            soundAlarmEnabled={soundAlarmEnabled}
            setSoundAlarmEnabled={setSoundAlarmEnabled}
            playChimeAlarm={playChimeAlarm}
            showAddTimerModal={showAddTimerModal}
            setShowAddTimerModal={setShowAddTimerModal}
            newTimerForm={newTimerForm}
            setNewTimerForm={setNewTimerForm}
            handleAddProductionTimer={handleAddProductionTimer}
            dailyTasks={dailyTasks}
            toggleDailyTask={toggleDailyTask}
            dailyTasksCompletedCount={dailyTasksCompletedCount}
            activeQuestMaterials={activeQuestMaterials}
            getItemStorageBreakdown={(itemObj) => getItemStorageBreakdown(itemObj, rawInventory)}
            energyMeta={energyMeta}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'advisor' && (
          <AdvisorTab
            walletAddress={walletAddress}
            gold={gold}
            currentEnergy={currentEnergy}
            maxEnergy={maxEnergy}
            shards={shards}
            avyn={avyn}
            farmersOwned={farmersOwned}
            farmingLevel={farmingLevel}
            activeQuest={activeQuest}
            activeQuestsList={activeQuestsList}
            moonmereProgress={moonmereProgress}
            energyMeta={energyMeta}
            skillsMeta={skillsMeta}
            skillsBreakdown={skillsBreakdown}
            rawInventory={rawInventory}
            activeOrders={activeOrders}
            locateInMegaAtlas={locateInMegaAtlas}
            isConnected={isConnected}
            setShowConnectModal={setShowConnectModal}
            onConnect={() => setShowConnectModal(true)}
            onBack={() => setActiveTab('mega_atlas')}
          />
        )}

        {activeTab === 'system' && (
          <AdminGate>
            {({ token, expiresAt, logout }) => (
              <SystemTab
                headerSlot={<GameUpdatePanel token={token} expiresAt={expiresAt} onLogout={logout} />}
                handleCheckUpdates={handleCheckUpdates}
                isCheckingUpdates={isCheckingUpdates}
                handleForceRedownload={handleForceRedownload}
                updateStatusMessage={updateStatusMessage}
                activeQuestsList={activeQuestsList}
                activeQuestMaterials={activeQuestMaterials}
                activeCrops={activeCrops}
                productionTimers={productionTimers}
                energyMeta={energyMeta}
                systemLogs={systemLogs}
                setSystemLogs={setSystemLogs}
              />
            )}
          </AdminGate>
        )}

        {activeTab === 'logbook' && (
          <LogbookTab locateInMegaAtlas={locateInMegaAtlas} />
        )}

        {activeTab === 'mega_atlas' && (
          <BloomshireMegaAtlas
            focusTarget={atlasFocusTarget}
            onClearFocusTarget={() => setAtlasFocusTarget(null)}
          />
        )}

        {/* MODAL DE CONEXIÓN Y DESBLOQUEO PREMIUM */}
        </ErrorBoundary>
      
        {/* MODAL DE PERFIL DE GRANJERO, NFTS Y BOOSTS */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0b1428] border-2 border-amber-500/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👨‍🌾</span>
                  <div>
                    <h3 className="text-base font-black text-amber-400">Perfil de Granjero • Bloomshire</h3>
                    <div className="text-[11px] text-slate-400 font-mono">Robinhood Chain • Season 0</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Wallet Info Box */}
              <div className="p-3.5 bg-[#101b33] border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">Wallet Vinculada:</span>
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#080d17] p-2 rounded-lg border border-slate-700/80 font-mono text-xs text-amber-200 break-all select-all">
                  <span>{walletAddress || '0x...'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (walletAddress) navigator.clipboard.writeText(walletAddress);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] shrink-0 cursor-pointer"
                    title="Copiar dirección"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Perks & NFTs Oficiales */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💎 Tus NFTs & Boosts Activos:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#0f172a] border border-amber-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">👨‍🌾</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Founding Farmers</div>
                      <div className="text-[10px] text-amber-300 font-mono font-bold">{farmersOwned} NFT{farmersOwned === 1 ? '' : 's'} Poseído{farmersOwned === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Bono de Velocidad</div>
                      <div className="text-[10px] text-emerald-300 font-mono font-bold">
                        {playerPerks?.fast
                          ? `-${Math.round((1 - playerPerks.fast) * 100)}% Crecimiento`
                          : farmersOwned >= 15
                          ? '-30% Crecimiento'
                          : farmersOwned >= 7
                          ? '-20% Crecimiento'
                          : 'Sin bono (< 7 Farmers)'}
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-purple-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">🐾</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">Mascota de Granja</div>
                      <div className="text-[10px] text-purple-300 font-mono font-bold">Perro Activo (+10% Drop)</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#0f172a] border border-cyan-500/30 rounded-xl flex items-center gap-2.5">
                    <span className="text-xl">🔋</span>
                    <div>
                      <div className="font-bold text-white text-[11px]">{isVip ? 'Estamina VIP' : farmersOwned > 0 ? 'Estamina Holder' : 'Estamina Base'}</div>
                      <div className="text-[10px] text-cyan-300 font-mono font-bold">{maxEnergy}⚡ {isVip ? '(Regen +1 / 3m)' : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado de Supabase */}
              <div className="p-2.5 bg-[#0a1222] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">☁️</span>
                  <div>
                    <div className="font-bold text-slate-300 text-[11px]">Respaldo en Supabase</div>
                    <div className="text-[10px] text-slate-400">Tabla: player_sessions</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
                      if (!currentToken) {
                        alert('Para guardar tu partida en la nube necesitas autenticar tu wallet con tu firma.');
                        setShowConnectModal(true);
                        return;
                      }
                      fetch('/api/bloomshire-advisor?action=push_snapshot', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${currentToken}`
                        },
                        body: JSON.stringify({
                          action: 'push_snapshot',
                          wallet: walletAddress.toLowerCase(),
                          snapshot: {
                            gold,
                            shards,
                            avyn,
                            currentEnergy,
                            maxEnergy,
                            farmingLevel,
                            inventory: rawInventory,
                            activeOrders,
                            activeCrops,
                            dailyTasks,
                            skills: skillsBreakdown,
                            timestamp: Date.now()
                          }
                        })
                      }).then(res => {
                        if (res.ok) alert('¡Partida respaldada exitosamente en Supabase con firma!');
                        else alert('Error de autorización al respaldar en la nube.');
                      }).catch(() => {});
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10.5px] font-bold cursor-pointer transition-all shadow-sm"
                >
                  Guardar en Nube
                </button>
              </div>

              {/* Botones de Acción: Cerrar y Desconectar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleDisconnect();
                    setShowProfileModal(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <span>🔴 Desconectar Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showConnectModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0b1428] border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎮</span>
                        <h3 className="text-base font-black text-amber-400">Vincular Partida • Bloomshire Companion</h3>
                      </div>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Opción 1: Firma Web3 Segura (SIWE) */}
                      <div className="p-4 bg-gradient-to-br from-[#101b33] to-[#0a1426] border border-cyan-500/40 rounded-xl space-y-2.5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold rounded-full border border-cyan-500/30">
                          RECOMENDADO
                        </div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>🛡️ Opción 1: Autenticación Criptográfica Web3</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          Firma un mensaje criptográfico con tu billetera (MetaMask, Rabby o navegador) para verificar tu propiedad. <b>Sin costo de gas</b>. Protege tu partida en la nube para que nadie más pueda ver ni sobrescribir tus datos en Supabase.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleConnectAndSignWallet()}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
                          >
                            <span>🔐 Conectar y Firmar con Billetera (Web3)</span>
                          </button>
                        </div>
                        {injectedWallets.length > 1 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                              Seleccionar Billetera (EIP-6963):
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {injectedWallets.map(w => (
                                <button
                                  key={w.info.uuid}
                                  type="button"
                                  onClick={() => handleConnectAndSignWallet(w.provider)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d172e] hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer transition-all active:scale-95"
                                >
                                  {w.info.icon && <img src={w.info.icon} alt={w.info.name} className="w-3.5 h-3.5 rounded" />}
                                  <span>{w.info.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>✓ Compatible con EVM (Ethereum / Arbitrum)</span>
                          <span>•</span>
                          <span>✓ Sesión JWT segura de 24 horas (renovable)</span>
                        </div>
                      </div>

                      {/* Opción 2: Extensión */}
                      <div className="p-4 bg-[#101b33] border border-amber-500/30 rounded-xl space-y-2">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>⚡ Opción 2: Sincronización Automática (Extensión)</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          La extensión oficial <b>Bloomshire Companion</b> lee tu partida localmente en tu navegador con 0 latencia:
                        </p>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[10.5px]">
                          ℹ️ <b>Nota:</b> La extensión sincroniza tus existencias locales. Para desbloquear los módulos con candado (Misiones, Liquidador y Asesor IA), firma con tu billetera en la <b>Opción 1</b>.
                        </div>
                        <div className="pt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => {
                              window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
                              document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { force: true } }));
                              setConnectFeedback({ type: 'info', text: '📡 Señal emitida. Buscando extensión Bloomshire Companion...' });
                              setTimeout(() => {
                                const snap = localStorage.getItem('bloomshire_cached_snapshot');
                                const w = localStorage.getItem('bloomshire_wallet');
                                if (snap) {
                                  try {
                                    const parsed = JSON.parse(snap);
                                    if (parsed && (parsed.gold > 0 || (parsed.inventory && parsed.inventory.length > 0))) {
                                      applyIncomingSync(parsed, 'cache');
                                      setConnectFeedback({ 
                                        type: 'success', 
                                        text: '¡Partida vinculada desde la caché de la extensión! Recuerda firmar en la Opción 1 para desbloquear los candados.' 
                                      });
                                      return;
                                    }
                                  } catch (_) {}
                                }
                                if (w && w.startsWith('0x')) {
                                  setConnectFeedback({ 
                                    type: 'success', 
                                    text: `¡Partida vinculada a ${w.slice(0, 6)}...! Recuerda firmar en la Opción 1 para desbloquear los candados.` 
                                  });
                                } else {
                                  setConnectFeedback({ 
                                    type: 'info', 
                                    text: '⚠️ Señal enviada. Si estás en Incógnito, recuerda habilitar la extensión en chrome://extensions. O abre bloomshire.xyz/play en otra pestaña y pulsa "Forzar Sincronización" en el icono de la extensión.' 
                                  });
                                }
                              }, 1500);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                          >
                            <span>⚡ Detectar / Sincronizar Extensión Companion</span>
                          </button>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                          <li>Instala la extensión en Chrome / Brave / Edge.</li>
                          <li>Abre tu partida en <a href="https://bloomshire.xyz/play/" target="_blank" rel="noreferrer" className="text-amber-400 underline font-bold">bloomshire.xyz/play/</a>.</li>
                          <li>Esta tool detectará tu inventario, oro y cultivos en menos de 1 segundo.</li>
                        </ol>
                      </div>

                      {/* Opción 3: Modo Lectura Pública */}
                      <div className="p-4 bg-[#101b33] border border-slate-800 rounded-xl space-y-2.5">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>🔍 Opción 3: Modo Lectura Pública (Manual)</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Ingresa una wallet (<code className="text-cyan-300 font-mono">0x...</code>) para ver sus NFTs on-chain públicos en modo solo lectura (sin modificar datos):
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={connectCode}
                            onChange={(e) => setConnectCode(e.target.value.trim())}
                            placeholder="0x..."
                            className="flex-1 bg-[#091122] border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white font-mono text-xs outline-none"
                          />
                          <button
                            onClick={async () => {
                              if (!connectCode) return;
                              const cleanCode = connectCode.trim();

                              if (/^0x[0-9a-fA-F]{40}$/.test(cleanCode)) {
                                const targetWallet = cleanCode.toLowerCase();
                                setViewOnlyWallet(targetWallet);

                                try {
                                  setConnectFeedback({ type: 'loading', text: 'Consultando perfil on-chain en el servidor...' });
                                  const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(targetWallet)}`);
                                  if (res.ok) {
                                    const json = await res.json();
                                    if (json.onChain) {
                                      setConnectFeedback({ type: 'success', text: `Perfil público consultado (${targetWallet.slice(0, 6)}... - ${json.onChain.farmersCount ?? 0} Farmers). Modo solo lectura.` });
                                    } else {
                                      setConnectFeedback({ type: 'info', text: `Wallet ${targetWallet.slice(0, 6)}... vinculada en modo solo lectura.` });
                                    }
                                  }
                                } catch (_) {
                                  setConnectFeedback({ type: 'info', text: `Wallet ${targetWallet.slice(0, 6)}... vinculada en modo solo lectura.` });
                                }
                                setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 2000);
                              } else {
                                setConnectFeedback({ type: 'error', text: 'Dirección inválida. Debe ser una dirección de Ethereum válida de 42 caracteres (0x...).' });
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer transition-all border border-slate-700 shrink-0"
                          >
                            Ver Perfil
                          </button>
                        </div>
                      </div>

                      {connectFeedback && (
                        <div className={`p-2.5 rounded-lg text-xs font-bold ${connectFeedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : connectFeedback.type === 'loading' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'}`}>
                          {connectFeedback.text}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-500">¿Dudas? Consulta la guía en el Mega-Atlas.</span>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

      </div>
    </div>
  );
}
