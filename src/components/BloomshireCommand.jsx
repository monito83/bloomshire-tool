// Bloomshire Tool - Live Companion & Market Radar (Modularized Architecture)
import React, { useEffect, useState, useRef } from 'react';

// Importar datos canónicos JSON

import '../i18n';
import { useTranslation } from 'react-i18next';

// Piezas de la interfaz (docs/REFACTOR_SPEC.md, fase 4)
import HeaderHud from './bloomshire/app/HeaderHud';
import MainNav from './bloomshire/app/MainNav';
import TabRouter from './bloomshire/app/TabRouter';
import ProfileModal from './bloomshire/app/ProfileModal';
import ConnectModal from './bloomshire/app/ConnectModal';

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
  const { i18n } = useTranslation('header');

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
  // Busqueda que se abre en Items desde otra pestana ("Donde consigo X?" en Odette, setas en Misiones)
  const [itemsSearchSeed, setItemsSearchSeed] = useState('');
  useEffect(() => { if (activeTab !== 'items') setItemsSearchSeed(''); }, [activeTab]);
  const openItemsSearch = (query) => { setItemsSearchSeed(query || ''); setActiveTab('items'); };
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
      localStorage.removeItem('bloomshire_cached_perks_wallet');
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
      {/* 1. Barra superior */}
      <HeaderHud
        avyn={avyn}
        currentEnergy={currentEnergy}
        energyMeta={energyMeta}
        farmingLevel={farmingLevel}
        fetchSyncFromServer={fetchSyncFromServer}
        formattedLastSyncTime={formattedLastSyncTime}
        gold={gold}
        handleDisconnect={handleDisconnect}
        isConnected={isConnected}
        isHeaderCollapsed={isHeaderCollapsed}
        isSyncStale={isSyncStale}
        isSyncing={isSyncing}
        isVip={isVip}
        maxEnergy={maxEnergy}
        setIsHeaderCollapsed={setIsHeaderCollapsed}
        setShowConnectModal={setShowConnectModal}
        setShowProfileModal={setShowProfileModal}
        shards={shards}
        viewOnlyWallet={viewOnlyWallet}
        walletAddress={walletAddress}
      />

      {/* 2. Menú principal */}
      {!isHeaderCollapsed && (
        <MainNav
          activeTab={activeTab}
          isConnected={isConnected}
          setActiveTab={setActiveTab}
        />
      )}

      {/* 3. Contenido según la pestaña, y los modales */}
      <div className="flex-1 overflow-hidden relative">
        <TabRouter
          activeCrops={activeCrops}
          activeOrders={activeOrders}
          activeQuest={activeQuest}
          activeQuestMaterials={activeQuestMaterials}
          activeQuestsList={activeQuestsList}
          activeTab={activeTab}
          atlasFocusTarget={atlasFocusTarget}
          avyn={avyn}
          currentEnergy={currentEnergy}
          dailyGoldCap={dailyGoldCap}
          dailyPerItemCap={dailyPerItemCap}
          dailyTasks={dailyTasks}
          dailyTasksCompletedCount={dailyTasksCompletedCount}
          dailyThingsCap={dailyThingsCap}
          deliveredItemsManual={deliveredItemsManual}
          energyMeta={energyMeta}
          farmersOwned={farmersOwned}
          farmingLevel={farmingLevel}
          getItemStorageBreakdown={getItemStorageBreakdown}
          getPlayerItemQty={getPlayerItemQty}
          gold={gold}
          handleAddProductionTimer={handleAddProductionTimer}
          handleCheckUpdates={handleCheckUpdates}
          handleForceRedownload={handleForceRedownload}
          handleRemoveProductionTimer={handleRemoveProductionTimer}
          inventoryScope={inventoryScope}
          isCheckingUpdates={isCheckingUpdates}
          isConnected={isConnected}
          isVip={isVip}
          itemQuantities={itemQuantities}
          locateInMegaAtlas={locateInMegaAtlas}
          maxEnergy={maxEnergy}
          moonmereProgress={moonmereProgress}
          newTimerForm={newTimerForm}
          playChimeAlarm={playChimeAlarm}
          playerPerks={playerPerks}
          productionTimers={productionTimers}
          rawInventory={rawInventory}
          remainingGoldCap={remainingGoldCap}
          remainingThingsCap={remainingThingsCap}
          serverTimeOffset={serverTimeOffset}
          setActiveTab={setActiveTab}
          setAtlasFocusTarget={setAtlasFocusTarget}
          setDailyTasks={setDailyTasks}
          setInventoryScope={setInventoryScope}
          setItemQuantities={setItemQuantities}
          setNewTimerForm={setNewTimerForm}
          setShowAddTimerModal={setShowAddTimerModal}
          setShowConnectModal={setShowConnectModal}
          setSoundAlarmEnabled={setSoundAlarmEnabled}
          setSystemLogs={setSystemLogs}
          shards={shards}
          showAddTimerModal={showAddTimerModal}
          skillsBreakdown={skillsBreakdown}
          skillsMeta={skillsMeta}
          soldGoldToday={soldGoldToday}
          soldItemsToday={soldItemsToday}
          soldThingsToday={soldThingsToday}
          soundAlarmEnabled={soundAlarmEnabled}
          systemLogs={systemLogs}
          toggleDailyTask={toggleDailyTask}
          toggleDeliveredItem={toggleDeliveredItem}
          updateStatusMessage={updateStatusMessage}
          walletAddress={walletAddress}
          itemsSearchSeed={itemsSearchSeed}
          openItemsSearch={openItemsSearch}
        />

        {showProfileModal && (
          <ProfileModal
            activeCrops={activeCrops}
            activeOrders={activeOrders}
            avyn={avyn}
            currentEnergy={currentEnergy}
            dailyTasks={dailyTasks}
            farmersOwned={farmersOwned}
            farmingLevel={farmingLevel}
            gold={gold}
            handleDisconnect={handleDisconnect}
            isVip={isVip}
            maxEnergy={maxEnergy}
            playerPerks={playerPerks}
            rawInventory={rawInventory}
            sessionToken={sessionToken}
            setShowConnectModal={setShowConnectModal}
            setShowProfileModal={setShowProfileModal}
            shards={shards}
            skillsBreakdown={skillsBreakdown}
            walletAddress={walletAddress}
          />
        )}

        {showConnectModal && (
          <ConnectModal
            applyIncomingSync={applyIncomingSync}
            connectCode={connectCode}
            connectFeedback={connectFeedback}
            handleConnectAndSignWallet={handleConnectAndSignWallet}
            injectedWallets={injectedWallets}
            setConnectCode={setConnectCode}
            setConnectFeedback={setConnectFeedback}
            setShowConnectModal={setShowConnectModal}
            setViewOnlyWallet={setViewOnlyWallet}
          />
        )}
      </div>
    </div>
  );
}
