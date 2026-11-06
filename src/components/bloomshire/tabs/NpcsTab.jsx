// src/components/bloomshire/tabs/NpcsTab.jsx
// Aldeanos: titulo, presentacion y regalos salen del juego (official/npcs.json, hearts.js TASTES). El lugar es la
// sub-zona del Mega-Atlas donde esta parado (coordenadas reales del mapa), con su nombre en el idioma elegido.
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MapPin } from 'lucide-react';
import npcsData from '../../../../public/data/bloomshire/npcs.json';
import megaAtlasData from '../../../../public/data/bloomshire/mega_atlas_data.json';
import { NpcAvatar } from '../../BloomshireMegaAtlas';
import { MANUAL_NPC_COORDS, officialNpc, pickEnEs, giftName } from '../bloomshireHelpers';

const ALL_SUBS = (megaAtlasData.regions || []).flatMap((reg) => (reg.subZones || []).map((sub) => ({ reg, sub })));

/** Donde esta un aldeano en el mapa: coordenadas del Atlas (o las cargadas a mano) y la sub-zona que las contiene. */
function resolveNpcPlace(npc) {
  const nId = (npc.id || '').toLowerCase().trim();
  const nName = (npc.name || '').toLowerCase().trim();
  const atlasNpc = (megaAtlasData.npcs || []).find((an) => {
    const anId = (an.id || '').toLowerCase().trim();
    const anName = (an.name || '').toLowerCase().trim();
    return anId === nId || anName === nName || anName.startsWith(`${nName} `);
  });
  let wx = atlasNpc?.wx;
  let wy = atlasNpc?.wy;
  let regionId = null;
  let sub = null;
  if (wx != null && wy != null) {
    for (const { reg, sub: s } of ALL_SUBS) {
      if (!s.worldRect) continue;
      const [rx, ry, rw, rh] = s.worldRect;
      if (wx >= rx && wx <= rx + rw && wy >= ry && wy <= ry + rh && (!sub || !s.isRootBox)) {
        regionId = reg.id;
        sub = s;
      }
    }
  } else if (MANUAL_NPC_COORDS[nId]) {
    const manual = MANUAL_NPC_COORDS[nId];
    wx = manual.wx;
    wy = manual.wy;
    regionId = manual.regionId;
    sub = ALL_SUBS.find((x) => x.sub.id === manual.subZoneId)?.sub || null;
  }
  if (wx == null || wy == null) return null;
  return { regionId: regionId || 'bloomshire_town', sub, wx: Number(wx), wy: Number(wy) };
}

export default function NpcsTab({ locateInMegaAtlas }) {
  const { t, i18n } = useTranslation('npcs');
  const lang = i18n.language;
  const isEn = String(lang || '').toLowerCase().startsWith('en');
  const [npcFilter, setNpcFilter] = useState('');
  const [npcViewMode, setNpcViewMode] = useState('grid');

  const rows = useMemo(() => npcsData.map((npc) => {
    const off = officialNpc(npc.id);
    const place = resolveNpcPlace(npc);
    const placeName = place?.sub ? (isEn ? (place.sub.nameEn || place.sub.nameEs) : (place.sub.nameEs || place.sub.nameEn)) : '';
    const title = pickEnEs(off, 'title', lang) || npc.title || '';
    const intro = (isEn ? off?.intro_en : (off?.intro_es || off?.intro_en)) || [];
    const loved = (off?.loved || []).map((g) => giftName(g, lang, t));
    const liked = (off?.liked || []).map((g) => giftName(g, lang, t));
    const hated = (off?.hated || []).map((g) => giftName(g, lang, t));
    return { npc, title, intro, loved, liked, hated, place, placeName };
  }), [lang, isEn, t]);

  const filtered = useMemo(() => {
    const q = npcFilter.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => [r.npc.name, r.title, r.placeName, ...r.loved, ...r.liked]
      .some((x) => String(x || '').toLowerCase().includes(q)));
  }, [npcFilter, rows]);

  const locate = (r) => {
    if (!r.place || !locateInMegaAtlas) return;
    locateInMegaAtlas({
      label: t('locateLabel', { name: r.npc.name, title: r.title, place: r.placeName || 'Bloomshire' }),
      regionId: r.place.regionId,
      subZoneId: r.place.sub?.id || null,
      wx: r.place.wx,
      wy: r.place.wy,
      worldRect: [r.place.wx - 150, r.place.wy - 140, 300, 280]
    });
  };

  const chips = (list, tone) => list.map((g) => (
    <span key={g} className={`px-1.5 py-0.5 rounded border text-[9.5px] font-medium truncate max-w-full ${tone}`}>{g}</span>
  ));

  const locateBtn = (r, big) => r.place && (
    <button
      onClick={() => locate(r)}
      className={`${big ? 'w-7 h-7 rounded-lg' : 'w-6 h-6 rounded-md'} bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm`}
      title={t('locate', { name: r.npc.name })}
    >
      <MapPin className={big ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      <div className="p-3 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t('search')}
            value={npcFilter}
            onChange={(e) => setNpcFilter(e.target.value)}
            className="bg-transparent border-none text-white text-xs outline-none w-full font-medium"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">{t('showing', { n: filtered.length, total: rows.length })}</span>
          <div className="flex items-center bg-[#080d17] p-0.5 rounded-lg border border-slate-800">
            {[['grid', t('grid')], ['list', t('list')]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setNpcViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  npcViewMode === mode ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">{t('giftsNote')}</p>

      {npcViewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map((r) => (
            <div key={r.npc.id} className="p-3 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col justify-between shadow-sm gap-2 transition-all">
              <div>
                <div className="flex items-start gap-2.5 mb-2">
                  <NpcAvatar npcId={r.npc.id} name={r.npc.name} size={48} className="border border-amber-500/50 shadow-md shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-white text-xs truncate block" title={r.npc.name}>{r.npc.name}</span>
                    <div className="text-[10px] text-amber-400/90 font-medium truncate" title={r.title}>{r.title}</div>
                  </div>
                </div>

                {(r.loved.length > 0 || r.liked.length > 0) && (
                  <div className="p-2 bg-[#080d17] border border-slate-800/80 rounded-lg text-xs space-y-1.5">
                    {r.loved.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-rose-300/90 uppercase tracking-wider">{t('loves')}</div>
                        <div className="flex flex-wrap gap-1">{chips(r.loved, 'bg-rose-950/30 border-rose-500/30 text-rose-200')}</div>
                      </div>
                    )}
                    {r.liked.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('likes')}</div>
                        <div className="flex flex-wrap gap-1">{chips(r.liked, 'bg-[#101726] border-slate-700/60 text-slate-300')}</div>
                      </div>
                    )}
                    {r.hated.length > 0 && (
                      <div className="text-[9.5px] text-slate-500">{t('hates', { list: r.hated.join(', ') })}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
                {r.intro[0] && (
                  <div className="p-1.5 bg-[#09101d] border-l-2 border-amber-500/80 text-[10px] text-slate-300 italic rounded-r line-clamp-2" title={r.intro.join(' ')}>
                    &quot;{r.intro[0]}&quot;
                  </div>
                )}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] text-slate-400 truncate flex-1" title={r.placeName}>📍 {r.placeName || '—'}</span>
                  {locateBtn(r, false)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((r) => (
            <div key={r.npc.id} className="p-2.5 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 transition-all shadow-sm">
              <div className="flex items-center gap-3 min-w-[200px] shrink-0">
                <NpcAvatar npcId={r.npc.id} name={r.npc.name} size={36} className="border border-amber-500/50 shadow-sm shrink-0" />
                <div>
                  <div className="font-bold text-white text-xs">{r.npc.name}</div>
                  <div className="text-[10.5px] text-amber-400/90 font-medium">{r.title}</div>
                </div>
              </div>
              <div className="flex-1 min-w-0 hidden lg:block">
                {r.loved.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9.5px] text-rose-300/80 font-bold uppercase mr-1">{t('loves')}</span>
                    {chips(r.loved, 'bg-rose-950/30 border-rose-500/30 text-rose-200')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 truncate max-w-[180px]">📍 {r.placeName || '—'}</span>
                {locateBtn(r, true)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
