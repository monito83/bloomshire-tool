// src/components/bloomshire/app/MainNav.jsx
// Menú principal con iconos y accesos rápidos (Misiones, Copiloto, Ajustes).
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Calculator, ChefHat, Coins, HeartHandshake, Map as MapIcon, PackageSearch, ScrollText, Settings, Sparkles, Timer } from 'lucide-react';

export default function MainNav({
    activeTab, isConnected, setActiveTab
  }) {
  const { t: tTabs } = useTranslation('tabs');
  return (
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

          {/* Accesos Rapidos Secundarios (Misiones, Copilot IA y Ajustes) */}
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
  );
}
