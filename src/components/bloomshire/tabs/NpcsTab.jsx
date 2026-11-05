// src/components/bloomshire/tabs/NpcsTab.jsx
import React, { useState, useMemo } from 'react';
import { Search, MapPin } from 'lucide-react';
import npcsData from '../../../../public/data/bloomshire/npcs.json';
import megaAtlasData from '../../../../public/data/bloomshire/mega_atlas_data.json';
import { NpcAvatar } from '../../BloomshireMegaAtlas';
import { getNpcFavoriteGifts, MANUAL_NPC_COORDS } from '../bloomshireHelpers';

export default function NpcsTab({ locateInMegaAtlas }) {
  const [npcFilter, setNpcFilter] = useState('');
  const [npcViewMode, setNpcViewMode] = useState('grid');

  const resolveNpcMapLocation = (npc) => {
    if (!npc) return null;
    const nId = (npc.id || '').toLowerCase().trim();
    const nName = (npc.name || '').toLowerCase().trim();

    // 1. Prioridad: Buscar en megaAtlasData.npcs (coordenadas reales de píxel)
    const atlasNpc = (megaAtlasData.npcs || []).find(an => {
      const anId = (an.id || '').toLowerCase().trim();
      const anName = (an.name || '').toLowerCase().trim();
      return anId === nId || anName === nName || anName.startsWith(nName + ' ');
    });

    let wx = atlasNpc?.wx;
    let wy = atlasNpc?.wy;
    let regionId = null;
    let subZoneId = null;
    let subZoneName = null;

    if (wx != null && wy != null) {
      for (const reg of (megaAtlasData.regions || [])) {
        for (const sub of (reg.subZones || [])) {
          if (sub.worldRect) {
            const [rx, ry, rw, rh] = sub.worldRect;
            if (wx >= rx && wx <= rx + rw && wy >= ry && wy <= ry + rh) {
              if (!subZoneName || (!sub.isRootBox && sub.nameEs)) {
                regionId = reg.id;
                subZoneId = sub.id;
                subZoneName = sub.nameEs || sub.nameEn || sub.id;
              }
            }
          }
        }
      }
      if (!regionId) regionId = 'bloomshire_town';
    } else if (MANUAL_NPC_COORDS[nId]) {
      const manual = MANUAL_NPC_COORDS[nId];
      wx = manual.wx;
      wy = manual.wy;
      regionId = manual.regionId;
      subZoneId = manual.subZoneId;
      subZoneName = manual.subName;
    }

    if (wx == null || wy == null) {
      wx = 5752;
      wy = 4472;
      regionId = 'bloomshire_town';
      subZoneId = 'bloomshire_town_sub_1_bloomshire';
      subZoneName = 'Pueblo de Bloomshire';
    }

    const placeLabel = npc.loc || subZoneName || 'Bloomshire';

    return {
      label: `📍 ${npc.name} (${npc.title || 'Aldeano'}) — ${placeLabel}`,
      regionId,
      subZoneId,
      wx: Number(wx),
      wy: Number(wy),
      worldRect: [Number(wx) - 150, Number(wy) - 140, 300, 280]
    };
  };

  const filteredNpcs = useMemo(() => {
    const q = npcFilter.toLowerCase().trim();
    if (!q) return npcsData;
    return npcsData.filter(npc => {
      const inName = (npc.name || '').toLowerCase().includes(q);
      const inTitle = (npc.title || '').toLowerCase().includes(q);
      const inLoc = (npc.loc || '').toLowerCase().includes(q);
      const inDesc = (npc.desc || '').toLowerCase().includes(q);
      const inGifts = (getNpcFavoriteGifts(npc) || []).some(g => g.toLowerCase().includes(q));
      return inName || inTitle || inLoc || inDesc || inGifts;
    });
  }, [npcFilter]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      <div className="p-3 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text"
            placeholder="🔍 Buscar personaje por nombre, oficio o lugar..."
            value={npcFilter}
            onChange={(e) => setNpcFilter(e.target.value)}
            className="bg-transparent border-none text-white text-xs outline-none w-full font-medium"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">Mostrando {filteredNpcs.length} de {npcsData.length}</span>
          <div className="flex items-center bg-[#080d17] p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setNpcViewMode('grid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                npcViewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔲 Cuadrícula
            </button>
            <button
              onClick={() => setNpcViewMode('list')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                npcViewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Lista
            </button>
          </div>
        </div>
      </div>

      {/* Vista Cuadrícula */}
      {npcViewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 overflow-y-auto">
          {filteredNpcs.map(npc => {
            const npcLoc = resolveNpcMapLocation(npc);
            return (
              <div key={npc.id} className="p-3 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col justify-between shadow-sm gap-2 transition-all">
                <div>
                  <div className="flex items-start gap-2.5 mb-2">
                    <NpcAvatar npcId={npc.id} name={npc.name} size={48} className="border border-amber-500/50 shadow-md shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white text-xs truncate block" title={npc.name}>{npc.name}</span>
                      <div className="text-[10px] text-amber-400/90 font-medium truncate" title={npc.title}>{npc.title}</div>
                      <span className="text-[9px] bg-purple-950/60 border border-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-mono inline-block mt-0.5 truncate max-w-full" title={npc.schedule}>
                        {npc.schedule}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#080d17] border border-slate-800/80 rounded-lg text-xs space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      🎁 Le agrada:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getNpcFavoriteGifts(npc).map(g => (
                        <span key={g} className="px-1.5 py-0.5 rounded bg-[#101726] border border-slate-700/60 text-slate-300 text-[9.5px] font-medium truncate max-w-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  {npc.desc && (
                    <div className="text-[10.5px] text-slate-400 mt-1.5 line-clamp-2 leading-tight" title={npc.desc}>{npc.desc}</div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
                  {npc.quote && (
                    <div className="p-1.5 bg-[#09101d] border-l-2 border-amber-500/80 text-[10px] text-slate-300 italic rounded-r line-clamp-1" title={npc.quote}>
                      &quot;{npc.quote}&quot;
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] text-slate-400 truncate flex-1" title={npc.loc}>📍 {npc.loc}</span>
                    {npcLoc && (
                      <button
                        onClick={() => locateInMegaAtlas && locateInMegaAtlas(npcLoc)}
                        className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                        title={`Ubicar a ${npc.name} (${npc.loc}) en el Mega-Atlas`}
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista Lista Compacta */
        <div className="space-y-1.5 overflow-y-auto">
          {filteredNpcs.map(npc => {
            const npcLoc = resolveNpcMapLocation(npc);
            return (
              <div 
                key={npc.id} 
                className="p-2.5 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-[200px] shrink-0">
                  <NpcAvatar npcId={npc.id} name={npc.name} size={36} className="border border-amber-500/50 shadow-sm shrink-0" />
                  <div>
                    <div className="font-bold text-white text-xs">{npc.name}</div>
                    <div className="text-[10.5px] text-amber-400/90 font-medium">{npc.title}</div>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-1.5 min-w-[140px] shrink-0">
                  <span className="text-[10px] bg-purple-950/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-mono truncate">
                    🕒 {npc.schedule}
                  </span>
                </div>

                <div className="flex-1 min-w-0 hidden lg:block">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase mr-1">🎁 Gustos:</span>
                    {getNpcFavoriteGifts(npc).map(g => (
                      <span key={g} className="px-1.5 py-0.5 rounded bg-[#101726] border border-slate-700/60 text-slate-300 text-[9.5px]">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 truncate max-w-[180px]">📍 {npc.loc}</span>
                  {npcLoc && (
                    <button
                      onClick={() => locateInMegaAtlas && locateInMegaAtlas(npcLoc)}
                      className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                      title={`Ubicar a ${npc.name} en el Mega-Atlas`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
