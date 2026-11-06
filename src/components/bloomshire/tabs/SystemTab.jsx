// src/components/bloomshire/tabs/SystemTab.jsx
// Ajustes (solo admin): el panel real de actualizaciones del juego (headerSlot), lo que tiene la tool cargado
// segun sus datos (official/meta.json y los catalogos) y lo que llega de la partida en esta sesion, mas el registro.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Compass, User, Sprout, Hammer, Moon } from 'lucide-react';
import meta from '../../../../public/data/bloomshire/official/meta.json';
import officialQuests from '../../../../public/data/bloomshire/official/quests.json';
import officialNpcs from '../../../../public/data/bloomshire/official/npcs.json';
import craftData from '../../../../public/data/bloomshire/craft_data.json';
import calcData from '../../../../public/data/bloomshire/calc_data.json';
import megaAtlasData from '../../../../public/data/bloomshire/mega_atlas_data.json';

const QUEST_COUNT = Object.keys(officialQuests).filter((k) => !k.startsWith('_')).length;
const NPC_COUNT = Object.keys(officialNpcs).length;
const RECIPE_COUNT = Object.values(craftData).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
const CROP_COUNT = (calcData.farming || []).length;
const SUBZONE_COUNT = (megaAtlasData.regions || []).reduce((n, r) => n + (r.subZones || []).length, 0);

export default function SystemTab({
  handleCheckUpdates,
  isCheckingUpdates = false,
  updateStatusMessage = '',
  activeQuestsList = [],
  activeQuestMaterials = [],
  activeCrops = [],
  productionTimers = [],
  energyMeta = {},
  systemLogs = [],
  setSystemLogs,
  headerSlot = null
}) {
  const { t, i18n } = useTranslation('session');
  const fmt = (n) => Number(n || 0).toLocaleString(i18n.language);
  const generated = meta.generatedAt ? new Date(meta.generatedAt).toLocaleString(i18n.language) : '—';

  const cards = [
    { Icon: BookOpen, tone: 'amber', title: t('settings.cards.quests'), rows: [[t('settings.rows.inGame'), fmt(QUEST_COUNT)], [t('settings.rows.following'), fmt(activeQuestsList.length)], [t('settings.rows.missing'), fmt(activeQuestMaterials.length)]] },
    { Icon: Compass, tone: 'cyan', title: t('settings.cards.atlas'), rows: [[t('settings.rows.regions'), fmt(meta.counts?.regions)], [t('settings.rows.places'), fmt(meta.counts?.places)], [t('settings.rows.subzones'), fmt(SUBZONE_COUNT)]] },
    { Icon: User, tone: 'purple', title: t('settings.cards.npcs'), rows: [[t('settings.rows.npcs'), fmt(NPC_COUNT)], [t('settings.rows.beasts'), fmt(meta.counts?.beasts)]] },
    { Icon: Sprout, tone: 'emerald', title: t('settings.cards.crops'), rows: [[t('settings.rows.crops'), fmt(CROP_COUNT)], [t('settings.rows.growing'), fmt(activeCrops.length)], [t('settings.rows.timers'), fmt(productionTimers.length)]] },
    { Icon: Hammer, tone: 'orange', title: t('settings.cards.craft'), rows: [[t('settings.rows.recipes'), fmt(RECIPE_COUNT)], [t('settings.rows.codex'), fmt(meta.counts?.codex)]] },
    { Icon: Moon, tone: 'indigo', title: t('settings.cards.energy'), rows: [[t('settings.rows.sleepLeft'), energyMeta.sleepLeft != null ? `${fmt(Math.floor(energyMeta.sleepLeft))}⚡` : '—'], [t('settings.rows.reset'), energyMeta.utcCountdownStr || '00:00 UTC']] }
  ];
  const TONES = {
    amber: 'border-amber-500/40 text-amber-400', cyan: 'border-cyan-500/40 text-cyan-400', purple: 'border-purple-500/40 text-purple-400',
    emerald: 'border-emerald-500/40 text-emerald-400', orange: 'border-orange-500/40 text-orange-400', indigo: 'border-indigo-500/40 text-indigo-400'
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 custom-scrollbar max-w-6xl mx-auto w-full">
      {headerSlot}

      <div className="p-4 bg-[#0a1224] border border-indigo-900/60 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="font-black text-white text-sm">⚙️ {t('settings.title')}</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {t('settings.data', { version: meta.gameVersion || '—', date: generated })}
          </span>
          {updateStatusMessage && <span className="text-slate-300">{updateStatusMessage}</span>}
        </div>
        {handleCheckUpdates && (
          <button
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer transition-all disabled:opacity-50"
          >
            {isCheckingUpdates ? t('settings.checking') : t('settings.check')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ Icon, tone, title, rows }) => (
          <div key={title} className={`p-4 bg-[#0e172c] border rounded-xl shadow-md flex flex-col gap-2 ${TONES[tone].split(' ')[0]}`}>
            <span className="font-black text-white text-sm flex items-center gap-2">
              <Icon className={`w-4 h-4 ${TONES[tone].split(' ')[1]}`} />
              <span>{title}</span>
            </span>
            <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span>{label}</span>
                  <b className="text-white">{value}</b>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#090f1f] border border-slate-800 rounded-xl flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span className="text-amber-400 font-mono">📟</span>
            <span>{t('settings.log')}</span>
          </div>
          <button
            onClick={() => setSystemLogs && setSystemLogs([])}
            className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            {t('settings.clear')}
          </button>
        </div>
        <div className="bg-[#050914] p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
          {systemLogs.length === 0 ? (
            <span className="text-slate-600">{t('settings.empty')}</span>
          ) : (
            systemLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400'
                    : log.type === 'warning' || log.type === 'warn' ? 'text-amber-400'
                    : log.type === 'error' ? 'text-rose-400' : 'text-cyan-300'
                }>
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
