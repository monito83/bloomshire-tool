// src/components/bloomshire/tabs/ItemsTab.jsx
import React, { useState, useMemo } from 'react';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import itemEncyclopediaData from '../../../../public/data/bloomshire/item_encyclopedia.json';
import { 
  ItemSprite, 
  getItemIcon, 
  getItemCategoryLabel, 
  itemMatchesCategory 
} from '../bloomshireHelpers';

export default function ItemsTab({ getPlayerItemQty, locateInMegaAtlas }) {
  const { t } = useTranslation('items');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemViewMode, setItemViewMode] = useState('grid');
  const [expandedUsedInIds, setExpandedUsedInIds] = useState(() => new Set());

  const toggleUsedIn = (itemId) => {
    setExpandedUsedInIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Filtrado del Buscador Universal de Items (359 items oficiales de catalog.js + rules.js + quests.js)
  const filteredEncyclopediaItems = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    return itemEncyclopediaData.filter(item => {
      const matchCat = itemMatchesCategory(item, itemCategoryFilter);
      if (!matchCat) return false;
      if (!q) return true;

      const inName = (item.nameEs || '').toLowerCase().includes(q) || (item.nameEn || '').toLowerCase().includes(q) || (item.id || '').toLowerCase().includes(q);
      const inCat = ((item.cat || '') + ' ' + (item.categoryLabel || '') + ' ' + getItemCategoryLabel(item.cat)).toLowerCase().includes(q);
      const inHow = (item.howToGet || '').toLowerCase().includes(q);
      const inLoc = (item.mapLocation?.label || '').toLowerCase().includes(q);
      const inUsed = Array.isArray(item.usedIn) && item.usedIn.some(u => u.toLowerCase().includes(q));

      return inName || inCat || inHow || inLoc || inUsed;
    });
  }, [itemSearchQuery, itemCategoryFilter]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
      {/* Cabecera y Barra de Busqueda Instantanea */}
      <div className="p-3.5 bg-[#0c1220] border border-slate-800/80 rounded-2xl shadow-sm flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>{t('title')}</span>
              <span className="text-slate-400 font-normal">{t('officialItemsCount', { count: itemEncyclopediaData.length })}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {t('description')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
              {t('itemsCount', { count: filteredEncyclopediaItems.length })}
            </div>
            <div className="flex items-center bg-[#080d17] p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setItemViewMode('grid')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                  itemViewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('views.grid')}
              </button>
              <button
                onClick={() => setItemViewMode('list')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                  itemViewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('views.list')}
              </button>
            </div>
          </div>
        </div>

        {/* Input de busqueda a ancho completo sin accesos rapidos */}
        <div className="w-full flex items-center gap-2.5 bg-[#080d17] border border-slate-700/80 focus-within:border-amber-500/70 rounded-xl px-3 py-2 shadow-inner">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={itemSearchQuery}
            onChange={(e) => setItemSearchQuery(e.target.value)}
            className="bg-transparent border-none text-white text-xs outline-none w-full font-medium placeholder:text-slate-500"
          />
          {itemSearchQuery && (
            <button
              onClick={() => setItemSearchQuery('')}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10.5px] font-bold cursor-pointer"
            >
              {t('search.clear')}
            </button>
          )}
        </div>

        {/* Filtros por Categoria */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
          {[
            { key: 'all', label: t('categories.all') },
            { key: 'forage', label: t('categories.forage') },
            { key: 'fish', label: t('categories.fish') },
            { key: 'crop', label: t('categories.crop') },
            { key: 'resource', label: t('categories.resource') },
            { key: 'staple', label: t('categories.staple') },
            { key: 'craft', label: t('categories.craft') },
            { key: 'food', label: t('categories.food') },
            { key: 'animal', label: t('categories.animal') },
            { key: 'butterfly', label: t('categories.butterfly') },
            { key: 'quest', label: t('categories.quest') },
            { key: 'premium', label: t('categories.premium') }
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => setItemCategoryFilter(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                itemCategoryFilter === cat.key
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                  : 'bg-[#0b1326] text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados segun Vista Cuadricula (4-6 columnas) o Lista Compacta */}
      {itemViewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 overflow-y-auto pr-1">
          {filteredEncyclopediaItems.slice(0, 90).map(item => {
            const ownedQty = getPlayerItemQty ? getPlayerItemQty(item) : 0;
            const hasUsedIn = Array.isArray(item.usedIn) && item.usedIn.length > 0;
            const isExpandedUsedIn = expandedUsedInIds.has(item.id);

            return (
              <div
                key={item.id}
                className="p-3 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-2xl shadow-sm flex flex-col justify-between gap-2.5 transition-all"
              >
                <div className="flex flex-col gap-2">
                  {/* Cabecera del Item */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemSprite name={item.nameEs || item.id} id={item.id} fallback={item.icon || getItemIcon(item.cat)} size={26} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs leading-snug truncate" title={item.nameEs || item.id}>
                          {item.nameEs || item.id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          <span className="text-amber-400/90 font-semibold">{item.id}</span> • {item.categoryLabel || getItemCategoryLabel(item.cat)}
                        </div>
                      </div>
                    </div>

                    {/* Badges superiores (Precio y/o Stock) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(item.value || item.sell) > 0 && (
                        <span 
                          className="px-1.5 py-0.5 rounded-lg bg-[#12192a] border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-default"
                          title={t('card.sellPriceTooltip', { price: item.value || item.sell })}
                        >
                          <span>🪙</span>
                          <span>{item.value || item.sell}g</span>
                        </span>
                      )}
                      {ownedQty > 0 && (
                        <span 
                          className="px-1.5 py-0.5 rounded-lg bg-[#0e211b] border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-default"
                          title={t('card.inventoryTooltip', { count: ownedQty })}
                        >
                          <span>🎒</span>
                          <span>{ownedQty}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-fila de badges adicionales */}
                  {item.skillReq && (
                    <div className="flex items-center gap-1">
                      <span 
                        className="px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[9.5px] font-mono font-bold"
                        title={t('card.skillReqTooltip', { req: item.skillReq })}
                      >
                        {t('card.skillReq', { req: item.skillReq })}
                      </span>
                    </div>
                  )}

                  {/* Donde y como conseguirlo */}
                  <div className="p-2 rounded-xl bg-[#080d17] border border-slate-800/80 text-xs text-slate-300 leading-snug">
                    <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <span>🧭</span>
                      <span>{t('card.obtain')}</span>
                    </div>
                    <div className="text-slate-200 text-[11.5px] font-medium leading-relaxed">{item.howToGet}</div>
                    {item.details && (
                      <div className="text-[10.5px] text-amber-300/80 mt-1 font-mono">
                        📌 {item.details}
                      </div>
                    )}
                  </div>

                  {/* Se pide en (colapsable) */}
                  {hasUsedIn && (
                    <div>
                      <button
                        onClick={() => toggleUsedIn(item.id)}
                        className="text-[10.5px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{t('card.usedIn', { count: item.usedIn.length })}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isExpandedUsedIn ? 'rotate-180 text-amber-400' : ''}`} />
                      </button>
                      {isExpandedUsedIn && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-800/60 animate-fadeIn">
                          {item.usedIn.map((u, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                u.includes('Misi') || u.includes('Cap.') || u.includes('Quest')
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold'
                                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              {u}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta: Ubicacion */}
                {item.mapLocation && (
                  <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                    <span className="text-[9.5px] text-slate-400 truncate">
                      📍 {item.mapLocation.label}
                    </span>
                    <button
                      onClick={() => locateInMegaAtlas && locateInMegaAtlas(item.mapLocation)}
                      className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                      title={t('card.locateTitle', { location: item.mapLocation.label || item.nameEs })}
                    >
                      <MapPin className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista Lista Compacta */
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
          {filteredEncyclopediaItems.slice(0, 120).map(item => {
            const ownedQty = getPlayerItemQty ? getPlayerItemQty(item) : 0;
            return (
              <div
                key={item.id}
                className="px-3 py-2 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <ItemSprite name={item.nameEs || item.id} id={item.id} fallback={item.icon || getItemIcon(item.cat)} size={24} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs truncate">{item.nameEs || item.id}</span>
                      <span className="text-[9.5px] text-amber-400/90 font-mono">({item.id})</span>
                      <span className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                        {item.categoryLabel || getItemCategoryLabel(item.cat)}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-400 truncate mt-0.5">
                      🧭 {item.howToGet}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {(item.value || item.sell) > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                      🪙 {item.value || item.sell}g
                    </span>
                  )}
                  {ownedQty > 0 ? (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
                      {t('card.youHave', { count: ownedQty })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">{t('card.zeroStock')}</span>
                  )}
                  {item.mapLocation && (
                    <button
                      onClick={() => locateInMegaAtlas && locateInMegaAtlas(item.mapLocation)}
                      className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                      title={t('card.locateTitle', { location: item.mapLocation.label || item.nameEs })}
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
