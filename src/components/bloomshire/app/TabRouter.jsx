// src/components/bloomshire/app/TabRouter.jsx
// Qué pestaña se muestra y con qué props, dentro del ErrorBoundary.
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';
import { useTranslation } from 'react-i18next';
import AdminGate from '../admin/AdminGate';
import AdvisorTab from '../tabs/AdvisorTab';
import BloomshireMegaAtlas from '../../BloomshireMegaAtlas';
import CalcTab from '../tabs/CalcTab';
import CraftTab from '../tabs/CraftTab';
import ErrorBoundary from '../../ErrorBoundary';
import GameUpdatePanel from '../admin/GameUpdatePanel';
import InventoryTab from '../tabs/InventoryTab';
import ItemsTab from '../tabs/ItemsTab';
import LogbookTab from '../tabs/LogbookTab';
import MonitorsTab from '../tabs/MonitorsTab';
import NpcsTab from '../tabs/NpcsTab';
import QuestsTab from '../tabs/QuestsTab';
import SystemTab from '../tabs/SystemTab';

export default function TabRouter({
    activeCrops, activeOrders, activeQuest, activeQuestMaterials, activeQuestsList, activeTab,
    atlasFocusTarget, avyn, currentEnergy, dailyGoldCap, dailyPerItemCap, dailyTasks,
    dailyTasksCompletedCount, dailyThingsCap, deliveredItemsManual, energyMeta, farmersOwned, farmingLevel,
    getItemStorageBreakdown, getPlayerItemQty, gold, handleAddProductionTimer, handleCheckUpdates, handleForceRedownload,
    handleRemoveProductionTimer, inventoryScope, isCheckingUpdates, isConnected, isVip, itemQuantities,
    locateInMegaAtlas, maxEnergy, moonmereProgress, newTimerForm, playChimeAlarm, playerPerks,
    productionTimers, rawInventory, remainingGoldCap, remainingThingsCap, serverTimeOffset, setActiveTab,
    setAtlasFocusTarget, setDailyTasks, setInventoryScope, setItemQuantities, setNewTimerForm, setShowAddTimerModal,
    setShowConnectModal, setSoundAlarmEnabled, setSystemLogs, shards, showAddTimerModal, skillsBreakdown,
    skillsMeta, soldGoldToday, soldItemsToday, soldThingsToday, soundAlarmEnabled, systemLogs,
    toggleDailyTask, toggleDeliveredItem, updateStatusMessage, walletAddress
  }) {
  const { t: tErrors } = useTranslation('errors');
  return (
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
  );
}
