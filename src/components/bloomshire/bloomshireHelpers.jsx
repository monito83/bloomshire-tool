// src/components/bloomshire/bloomshireHelpers.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import itemIconsMap from '../../../public/data/bloomshire/item_icons_map.json';
import CANONICAL_QUEST_CATALOG from '../../data/canonicalQuests.json';
import defaultInventoryCatalog from '../../../public/data/bloomshire/inventory_catalog.json';
import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';

// Singleton de AudioContext para alarmas de producción con respeto a Autoplay Policy
let sharedAudioContext = null;
let hasUserInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    hasUserInteracted = true;
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    window.removeEventListener('click', markInteracted);
    window.removeEventListener('keydown', markInteracted);
    window.removeEventListener('touchstart', markInteracted);
  };
  window.addEventListener('click', markInteracted, { passive: true });
  window.addEventListener('keydown', markInteracted, { passive: true });
  window.addEventListener('touchstart', markInteracted, { passive: true });
}

export function getSharedAudioContext() {
  if (!hasUserInteracted) return null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (e) {
    return null;
  }
}

export const playChimeAlarm = () => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do5, Mi5, Sol5, Do6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
    });
  } catch (e) {
    // Silencioso ante bloqueos de audio
  }
};

export const getStorageType = (areaRaw) => {
  const area = String(areaRaw || '').toLowerCase();
  if (area.includes('hotbar') || area.includes('bag') || area.includes('pack') || area.includes('inv')) return 'M';
  if (area.includes('town') || area.includes('pueblo') || area.includes('storehouse') || area.includes('storage') || area.includes('bank') || area.includes('stash') || area.includes('cp')) return 'CP';
  if (area.includes('home') || area.includes('cabaña') || area.includes('house') || area.includes('island') || area.includes('cc')) return 'CC';
  return 'CC';
};

export const NPC_FAVORITE_GIFTS = {
  clara: ['🍓 Frutilla', '🌾 Harina', '🍯 Miel'],
  tamsin: ['🌾 Trigo', '🥚 Huevos', '🍬 Azúcar'],
  wren: ['🐟 Perca', '🐟 Carpa', '🪱 Cebo'],
  bram: ['⛏️ Lingote Hierro', '⛏️ Lingote Cobre', '⬛ Carbón'],
  juniper: ['🍄 Glowcap', '🍄 Silvercap', '🌿 Raíces'],
  hollis: ['🥛 Leche', '🌾 Heno', '🍎 Manzana'],
  willa: ['🍯 Miel', '🌸 Flor Silvestre', '🥞 Panal'],
  dara: ['🍒 Cerezos Grises', '💧 Agua Pura', '🌱 Abono'],
  odette: ['💎 Joyas', '💎 Amatista', '🪙 Moneda Antigua'],
  pell: ['🪵 Madera Noble', '🪵 Tablas Roble', '🔩 Clavos'],
  tilly: ['🧵 Tela', '🧶 Lana', '🪡 Hilo de Seda'],
  hazel: ['🌱 Semilla de Calabaza', '💧 Regadera', '🌾 Fertilizante'],
  maren: ['🐟 Trucha Tigre', '🍞 Pan Casero', '🍄 Setas'],
  greta: ['🥛 Queso de Cabra', '🥚 Huevos Frescos', '🌾 Heno'],
  cole: ['⛏️ Mineral de Estaño', '⬛ Carbón', '🍖 Carne Asada'],
  dunn: ['⛏️ Mineral de Hierro', '⛏️ Pizarra', '🍞 Ración Minera'],
  silas: ['🕯️ Vela de Cera', '🌸 Caléndula Lunar', '📜 Pergamino'],
  marven: ['🐟 Pez Fantasma', '⭐ Fruta Estelar', '🍄 Glowcap']
};

export const getNpcFavoriteGifts = (npc) => {
  if (!npc) return ['🍞 Pan Casero', '🌸 Flores', '🍎 Fruta'];
  const id = (npc.id || '').toLowerCase().trim();
  if (NPC_FAVORITE_GIFTS[id]) return NPC_FAVORITE_GIFTS[id];
  const title = (npc.title || '').toLowerCase();
  if (title.includes('bake') || title.includes('panad') || title.includes('cook')) return ['🌾 Harina', '🥚 Huevos', '🍯 Miel'];
  if (title.includes('fish') || title.includes('pesc')) return ['🐟 Carpa', '🐟 Perca', '🪱 Cebo'];
  if (title.includes('smith') || title.includes('herr') || title.includes('miner')) return ['⛏️ Lingote Cobre', '⛏️ Lingote Hierro', '⬛ Carbón'];
  if (title.includes('farm') || title.includes('cultiv')) return ['🌾 Trigo', '🥕 Zanahoria', '🥔 Papa'];
  if (title.includes('animal') || title.includes('pastor')) return ['🥛 Leche', '🌾 Heno', '🍎 Manzana'];
  return ['🍞 Pan Casero', '🌸 Flores Silvestres', '🍯 Miel'];
};

export const getItemCategoryLabel = (cat) => {
  if (i18n && typeof i18n.t === 'function') {
    const key = 'categories.' + (cat || 'general');
    const translated = i18n.t(key, { ns: 'common' });
    if (translated && translated !== key) return translated;
  }
  return cat || 'General';
};

export const getItemIcon = (cat) => {
  switch (cat) {
    case 'crop': return '🌾';
    case 'fish': return '🐟';
    case 'food': return '🍳';
    case 'forage': return '🍄';
    case 'ore':
    case 'resource': return '⛏️';
    case 'bug': return '🦋';
    case 'animal':
    case 'meat': return '🐄';
    case 'staple': return '🧈';
    case 'craft':
    case 'forged':
    case 'tool': return '🔨';
    case 'weapon': return '⚔️';
    case 'gear': return '🛡️';
    case 'furniture': return '🪑';
    case 'quest': return '📜';
    case 'premium':
    case 'treasure': return '💎';
    default: return '📦';
  }
};

export const itemMatchesCategory = (item, catFilter) => {
  if (catFilter === 'all') return true;
  const cat = (item.cat || item.category || '').toLowerCase();
  switch (catFilter) {
    case 'forage': return cat === 'forage';
    case 'fish': return cat === 'fish';
    case 'crop': return cat === 'crop';
    case 'resource':
    case 'mining': return cat === 'resource' || cat === 'ore';
    case 'staple': return cat === 'staple';
    case 'craft': return ['craft', 'forged', 'tool', 'gear', 'weapon', 'furniture'].includes(cat);
    case 'food': return cat === 'food';
    case 'animal': return cat === 'animal' || cat === 'meat';
    case 'butterfly':
    case 'bug': return cat === 'bug';
    case 'quest': return cat === 'quest';
    case 'premium': return cat === 'premium' || cat === 'treasure';
    default: return cat === catFilter;
  }
};

export const MANUAL_NPC_COORDS = {
  dunn: { wx: 7216, wy: 3528, regionId: 'stonepeak', subZoneId: 'stonepeak_sub_1_the_mining_camp', subName: 'Campamento Minero (Dunn)' },
  silas: { wx: 6240, wy: 3680, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Cementerio Noreste' },
  aurel: { wx: 6290, wy: 3650, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Criptas del Cementerio' },
  nella: { wx: 5460, wy: 4560, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Mercado Exterior' },
  teodor: { wx: 5540, wy: 4580, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Puestos del Mercado' },
  brenna: { wx: 7528, wy: 4616, regionId: 'stonepeak', subZoneId: 'stonepeak_sub_12_the_quarry', subName: 'Cantera de Stonepeak' },
  sefa: { wx: 7080, wy: 4100, regionId: 'stonepeak', subZoneId: 'stonepeak_sub_12_the_quarry', subName: 'Colinas del Este' },
  corin: { wx: 4950, wy: 6180, regionId: 'southvale', subZoneId: 'southvale_sub_19_hollin_s_farm', subName: 'Viñedos del Sur' },
  pim: { wx: 5210, wy: 4720, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Riberas del Río' },
  oriel: { wx: 3672, wy: 4584, regionId: 'whisperwood', subZoneId: 'whisperwood_sub_8_the_hidden_glade', subName: 'Santuario del Bosque' },
  aldous: { wx: 5740, wy: 4200, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Biblioteca' },
  wick: { wx: 5120, wy: 4420, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Puente Central del Río' },
  sable: { wx: 5410, wy: 4650, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Callejón del Mercado' },
  vesper: { wx: 5620, wy: 4860, regionId: 'bloomshire_town', subZoneId: 'bloomshire_town_sub_1_bloomshire', subName: 'Distrito Sur del Pueblo' }
};

export const QUEST_REQUIRED_ITEMS = {
  bk12: [
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 5, questName: 'Cap. 12: Día de Mercado', targetStep: 1 }
  ],
  bk18: [],
  ff18: [],
  bk20: [],
  ff20: [],
  bk21: [
    { id: 'wood', name: 'Madera común (Wood)', needed: 80, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'The Woodlot de Pell' },
    { id: 'stone', name: 'Piedra (Stone)', needed: 40, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Stonepeak' },
    { id: 'gold', name: 'Oro (Gold)', needed: 15000, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Monedero / Venta a Odette' }
  ],
  ff21: [
    { id: 'wood', name: 'Madera común (Wood)', needed: 80, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'The Woodlot de Pell' },
    { id: 'stone', name: 'Piedra (Stone)', needed: 40, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Stonepeak' },
    { id: 'gold', name: 'Oro (Gold)', needed: 15000, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Monedero / Venta a Odette' }
  ],
  bk22: [
    { id: 'Ghost Catfish', name: 'Bagre Fantasma (Ghost Catfish)', needed: 5, questName: 'Cap. 22: El Agua Gris (Grey Water)', targetStep: 2, hint: 'Pesca nocturna en Lago Moonmere' }
  ],
  ff22: [
    { id: 'Ghost Catfish', name: 'Bagre Fantasma (Ghost Catfish)', needed: 5, questName: 'Cap. 22: El Agua Gris (Grey Water)', targetStep: 2, hint: 'Pesca nocturna en Lago Moonmere' }
  ],
  bk23: [
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 25, questName: 'Cap. 23: Visión Lunar (Moonsight)', targetStep: 1, hint: 'Cultivo Nv 1' },
    { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 25, questName: 'Cap. 23: Visión Lunar (Moonsight)', targetStep: 1, hint: 'Whisperwood / Moonmere' }
  ],
  ff23: [
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 25, questName: 'Cap. 23: Visión Lunar (Moonsight)', targetStep: 1, hint: 'Cultivo Nv 1' },
    { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 25, questName: 'Cap. 23: Visión Lunar (Moonsight)', targetStep: 1, hint: 'Whisperwood / Moonmere' }
  ],
  bk24: [
    { id: 'wood', name: 'Madera común (Wood)', needed: 60, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'The Woodlot' },
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 40, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'Cultivo Nv 1' },
    { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 20, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'Whisperwood / Moonmere' }
  ],
  ff24: [
    { id: 'wood', name: 'Madera común (Wood)', needed: 60, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'The Woodlot' },
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 40, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'Cultivo Nv 1' },
    { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 20, questName: 'Cap. 24: El Canto de la Puerta', targetStep: 1, hint: 'Whisperwood / Moonmere' }
  ],
  sd_bram: [
    { id: 'Copper Ore', name: 'Mena de Cobre (Copper Ore)', needed: 20, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 2, hint: 'Cuevas de Stonepeak' },
    { id: 'Iron Ore', name: 'Mineral de Hierro (Iron Ore)', needed: 5, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 2, hint: 'Cuevas profundas de Stonepeak (Nivel 5+ Minería)' }
  ],
  s_bram: [
    { id: 'Copper Ore', name: 'Mena de Cobre (Copper Ore)', needed: 20, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 2, hint: 'Cuevas de Stonepeak' },
    { id: 'Iron Ore', name: 'Mineral de Hierro (Iron Ore)', needed: 5, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 2, hint: 'Cuevas profundas de Stonepeak (Nivel 5+ Minería)' }
  ],
  sd_clara: [
    { id: 'Egg', name: 'Huevo de Gallina (Egg)', needed: 12, questName: 'Secundaria: Huevos para la Panadería (Clara)', targetStep: 2, hint: 'Granja de Hollin (sur del pueblo)' }
  ],
  s_clara: [
    { id: 'Egg', name: 'Huevo de Gallina (Egg)', needed: 12, questName: 'Secundaria: Huevos para la Panadería (Clara)', targetStep: 2, hint: 'Granja de Hollin (sur del pueblo)' }
  ],
  sd_elsie: [
    { id: 'Honey', name: 'Miel de Abeja (Honey)', needed: 5, questName: 'Secundaria: Miel para las Pinturas (Elsie)', targetStep: 2, hint: 'Colmenas o apicultura' }
  ],
  s_elsie: [
    { id: 'Honey', name: 'Miel de Abeja (Honey)', needed: 5, questName: 'Secundaria: Miel para las Pinturas (Elsie)', targetStep: 2, hint: 'Colmenas o apicultura' }
  ],
  sd_wren: [
    { id: 'Tiger Trout', name: 'Trucha Tigre', needed: 1, questName: 'Secundaria: La Trucha de Wren', targetStep: 2 }
  ],
  s_wren: [
    { id: 'Tiger Trout', name: 'Trucha Tigre', needed: 1, questName: 'Secundaria: La Trucha de Wren', targetStep: 2 }
  ],
  sd_juniper: [
    { id: 'Silvercap Mushroom', name: 'Seta Silvercap', needed: 2, questName: 'Secundaria: Setas de Juniper', targetStep: 2 }
  ],
  s_juniper: [
    { id: 'Silvercap Mushroom', name: 'Seta Silvercap', needed: 2, questName: 'Secundaria: Setas de Juniper', targetStep: 2 }
  ],
  sd_tamsin: [
    { id: 'Carrot', name: 'Zanahoria', needed: 4, questName: 'Secundaria: Verduras de Tamsin', targetStep: 2 },
    { id: 'Parsnip', name: 'Chirivía', needed: 2, questName: 'Secundaria: Verduras de Tamsin', targetStep: 2 }
  ],
  s_tamsin: [
    { id: 'Carrot', name: 'Zanahoria', needed: 4, questName: 'Secundaria: Verduras de Tamsin', targetStep: 2 },
    { id: 'Parsnip', name: 'Chirivía', needed: 2, questName: 'Secundaria: Verduras de Tamsin', targetStep: 2 }
  ],
  sd_pell: [
    { id: 'Wood', name: 'Madera', needed: 10, questName: 'Secundaria: Madera para Pell', targetStep: 2 }
  ],
  s_pell: [
    { id: 'Wood', name: 'Madera', needed: 10, questName: 'Secundaria: Madera para Pell', targetStep: 2 }
  ],
  sd_lena_winter: [
    { id: 'Winter Kale', name: 'Col de Invierno (Winter Kale)', needed: 15, questName: 'Secundaria: El Jardín de Invierno (Lena)', targetStep: 3, hint: 'Semillas de Hazel' }
  ],
  s_lena_winter: [
    { id: 'Winter Kale', name: 'Col de Invierno (Winter Kale)', needed: 15, questName: 'Secundaria: El Jardín de Invierno (Lena)', targetStep: 3, hint: 'Semillas de Hazel' }
  ],
  sd_hazel: [
    { id: 'Wild Seeds', name: 'Semillas Silvestres', needed: 1, questName: 'Secundaria: Semillas de Hazel', targetStep: 2 }
  ],
  s_hazel: [
    { id: 'Wild Seeds', name: 'Semillas Silvestres', needed: 1, questName: 'Secundaria: Semillas de Hazel', targetStep: 2 }
  ],
  sd_hugo: [
    { id: 'Wheat', name: 'Trigo Cosechado', needed: 8, questName: 'Secundaria: El Molino de Hugo', targetStep: 2 }
  ],
  sd_mabel: [
    { id: 'Parsnip Soup', name: 'Sopa de Chirivía', needed: 2, questName: 'Secundaria: La Cocina de Mabel', targetStep: 2, recipe: [
      { id: 'Parsnip', name: 'Chirivía', needed: 8 }
    ] }
  ],
  sd_lena: [
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 4, questName: 'Secundaria: El Jardín de Lena', targetStep: 2 }
  ],
  s_marlow: [
    { id: 'crop:*', name: 'Cultivos varios', needed: 3, questName: 'Secundaria: Parcela de Marlow', targetStep: 2 }
  ]
};

export function ItemSprite({ name = '', id = '', fallback = '📦', size = 20, className = '' }) {
  const [hasError, setHasError] = useState(false);
  
  const iconUrl = useMemo(() => {
    const rawKeys = [name, id].filter(Boolean);
    for (const raw of rawKeys) {
      let clean = String(raw).toLowerCase().trim();
      if (!clean) continue;
      clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
      if (!clean) continue;

      if (itemIconsMap[clean]) return itemIconsMap[clean];
      if (itemIconsMap[clean.replace(/s$/, '')]) return itemIconsMap[clean.replace(/s$/, '')];
      if (itemIconsMap[clean.replace(/es$/, '')]) return itemIconsMap[clean.replace(/es$/, '')];
      
      const noParen = clean.replace(/\s*\([^)]*\)/g, '').trim();
      if (noParen && itemIconsMap[noParen]) return itemIconsMap[noParen];
      if (noParen && itemIconsMap[noParen.replace(/s$/, '')]) return itemIconsMap[noParen.replace(/s$/, '')];
      if (noParen && itemIconsMap[noParen.replace(/es$/, '')]) return itemIconsMap[noParen.replace(/es$/, '')];
      
      const parenMatch = clean.match(/\(([^)]+)\)/);
      if (parenMatch) {
        const inside = parenMatch[1].trim();
        if (itemIconsMap[inside]) return itemIconsMap[inside];
        if (itemIconsMap[inside.replace(/s$/, '')]) return itemIconsMap[inside.replace(/s$/, '')];
        if (itemIconsMap[inside.replace(/es$/, '')]) return itemIconsMap[inside.replace(/es$/, '')];
      }

      if (clean.includes('/')) {
        for (const part of clean.split('/')) {
          const p = part.trim();
          if (itemIconsMap[p]) return itemIconsMap[p];
          if (itemIconsMap[p.replace(/s$/, '')]) return itemIconsMap[p.replace(/s$/, '')];
        }
      }

      if (clean.includes(' o ')) {
        const first = clean.split(' o ')[0].trim();
        if (itemIconsMap[first]) return itemIconsMap[first];
        if (itemIconsMap[first.replace(/s$/, '')]) return itemIconsMap[first.replace(/s$/, '')];
      }
    }
    return null;
  }, [name, id]);

  if (!iconUrl || hasError) {
    return <span className={`shrink-0 select-none ${className}`} style={{ fontSize: size }}>{fallback}</span>;
  }

  return (
    <img
      src={iconUrl}
      alt={name || id}
      className={`shrink-0 object-contain inline-block select-none ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      onError={() => setHasError(true)}
    />
  );
}

export function CraftMaterialsBadge({ mats = '', breakdown = null }) {
  const { t } = useTranslation('common');
  if (breakdown && Array.isArray(breakdown) && breakdown.length > 0) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
        {breakdown.map((b, i) => {
          const isOk = b.hasEnough;
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 border rounded px-1.5 py-0.5 text-[10px] font-mono shadow-sm transition-all ${
                isOk
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
              title={t('craftMaterialsBadge.tooltip', { req: b.req, total: b.total, m: b.m, cc: b.cc, cp: b.cp })}
            >
              <ItemSprite name={b.item} id={b.item} size={15} className="shrink-0" />
              <span className="truncate">{b.nameEs || b.item}</span>
              <span className={`font-bold ml-0.5 ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                {b.total}/{b.req}
              </span>
              {isOk && <span className="text-[9px] text-emerald-400">✓</span>}
            </span>
          );
        })}
      </div>
    );
  }

  if (!mats) return null;
  const parts = mats.split('+').map(s => s.trim()).filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
      {parts.map((part, i) => {
        const m = part.match(/^(.*?)(?:\s*(?:x\s*(\d+)|\((\d+)\)|(\d+)\s*x))?$/i);
        const nameOnly = m && m[1] ? m[1].trim() : part;
        const qtyOnly = m && (m[2] || m[3] || m[4]) ? `x${m[2] || m[3] || m[4]}` : '';
        const searchName = nameOnly.replace(/\s*\([^)]*\)/g, '').split(' o ')[0].trim();

        return (
          <span 
            key={i} 
            className="inline-flex items-center gap-1 bg-[#091122] border border-slate-700/80 rounded px-1.5 py-0.5 text-[10.5px] font-mono text-amber-200/90 shadow-sm"
          >
            <ItemSprite name={searchName || nameOnly} id={searchName} size={15} className="shrink-0" />
            <span className="truncate">{nameOnly}</span>
            {qtyOnly && <span className="text-amber-400 font-bold ml-0.5">{qtyOnly}</span>}
          </span>
        );
      })}
    </div>
  );
}

export const DASHBOARD_QUEST_CATALOG = { ...CANONICAL_QUEST_CATALOG };

export const MARKET_ROTATION_CATALOG = [
  {
    id: 'Plank',
    name: 'Tablón de Madera (Plank)',
    icon: '🪵',
    avgPrice: 55,
    minPrice: 45,
    maxPrice: 68,
    velocity: 'ultra',
    volumeScore: 98,
    category: 'Construcción & Crafteo',
    tag: 'Salida Inmediata ⚡',
    tip: 'Alta demanda constante: otros jugadores lo compran para expandir granjas y reparar muelles.'
  },
  {
    id: 'Copper Bar',
    name: 'Lingote de Cobre (Copper Bar)',
    icon: '🧱',
    avgPrice: 75,
    minPrice: 60,
    maxPrice: 90,
    velocity: 'ultra',
    volumeScore: 94,
    category: 'Minería & Forja',
    tag: 'Salida Inmediata ⚡',
    tip: 'Material básico de toda herramienta. Se vende en minutos a precios entre 70g y 80g.'
  },
  {
    id: 'Iron Bar',
    name: 'Lingote de Hierro (Iron Bar)',
    icon: '🔩',
    avgPrice: 165,
    minPrice: 140,
    maxPrice: 195,
    velocity: 'high',
    volumeScore: 89,
    category: 'Minería & Forja',
    tag: 'Alta Rotación 🚀',
    tip: 'Muy codiciado por jugadores en transición a nivel 5 y herramientas avanzadas.'
  },
  {
    id: 'Zaffiro',
    name: 'Zafiro (Gema)',
    icon: '💎',
    avgPrice: 420,
    minPrice: 380,
    maxPrice: 470,
    velocity: 'high',
    volumeScore: 85,
    category: 'Gemas & Lujo',
    tag: 'Oro Pesado 💰',
    tip: 'Gema requerida para recetas de joyería y ofrendas. Excelente inyección de oro si tienes stock.'
  },
  {
    id: 'Cuarzo',
    name: 'Cuarzo (Gema)',
    icon: '🔮',
    avgPrice: 85,
    minPrice: 70,
    maxPrice: 105,
    velocity: 'high',
    volumeScore: 88,
    category: 'Gemas & Lujo',
    tag: 'Alta Rotación 🚀',
    tip: 'Gema común pero de rotación constante para transmutaciones y encargos.'
  },
  {
    id: 'Cuarzo Rosa',
    name: 'Cuarzo Rosa (Gema)',
    icon: '💖',
    avgPrice: 140,
    minPrice: 120,
    maxPrice: 165,
    velocity: 'high',
    volumeScore: 82,
    category: 'Gemas & Lujo',
    tag: 'Alta Rotación 🚀',
    tip: 'Insumo de botica y pociones; tiene compraventa rápida en lotes de 5 a 10 unidades.'
  },
  {
    id: 'Topacio',
    name: 'Topacio (Gema)',
    icon: '✨',
    avgPrice: 280,
    minPrice: 240,
    maxPrice: 320,
    velocity: 'medium',
    volumeScore: 78,
    category: 'Gemas & Lujo',
    tag: 'Salida Media ⏳',
    tip: 'Precio atractivo. Se recomienda publicar a precio ligeramente inferior al tope para acelerar venta.'
  },
  {
    id: 'Seta Silvercap',
    name: 'Seta Silvercap (Mushroom)',
    icon: '🍄',
    avgPrice: 210,
    minPrice: 175,
    maxPrice: 250,
    velocity: 'high',
    volumeScore: 87,
    category: 'Recolección Silvestre',
    tag: 'Alta Rotación 🚀',
    tip: 'Insumo medicinal muy cotizado en el Market Hall para crafteo de elixires.'
  },
  {
    id: 'Seta Glowcap',
    name: 'Seta Glowcap (Mushroom)',
    icon: '🏮',
    avgPrice: 180,
    minPrice: 150,
    maxPrice: 220,
    velocity: 'ultra',
    volumeScore: 92,
    category: 'Recolección Silvestre',
    tag: 'Salida Inmediata ⚡',
    tip: 'Todo el mundo necesita Glowcaps para misiones de Moonmere. Demanda continua.'
  },
  {
    id: 'Arroz (Rice)',
    name: 'Arroz Cosechado (Rice)',
    icon: '🌾',
    avgPrice: 420,
    minPrice: 360,
    maxPrice: 490,
    velocity: 'high',
    volumeScore: 84,
    category: 'Cultivos Nv 5',
    tag: 'Alta Rotación 🚀',
    tip: 'Ingrediente principal de platos de alta energía (Onigiri / Sushi). Cocineros lo compran siempre.'
  },
  {
    id: 'Calabaza Dorada (VIP)',
    name: 'Calabaza Dorada (Golden Pumpkin VIP)',
    icon: '🎃',
    avgPrice: 2850,
    minPrice: 2500,
    maxPrice: 3300,
    velocity: 'medium',
    volumeScore: 72,
    category: 'Cultivo Especial VIP',
    tag: 'Mega Oro 👑',
    tip: 'Excelente retorno si necesitas una inyección masiva de oro; ponla a ~2.700g para que vuele.'
  },
  {
    id: 'Fresa Diamante (VIP)',
    name: 'Fresa Diamante (VIP)',
    icon: '🍓',
    avgPrice: 1350,
    minPrice: 1150,
    maxPrice: 1550,
    velocity: 'high',
    volumeScore: 86,
    category: 'Cultivo Especial VIP',
    tag: 'Alta Rotación 🚀',
    tip: 'Gran volumen de compra por jugadores VIP y gourmets.'
  },
  {
    id: 'Pimiento Fuego Solar',
    name: 'Pimiento Fuego Solar',
    icon: '🌶️',
    avgPrice: 850,
    minPrice: 750,
    maxPrice: 980,
    velocity: 'high',
    volumeScore: 83,
    category: 'Cultivos & Especias',
    tag: 'Alta Rotación 🚀',
    tip: 'Especias picantes necesarias para estofados de alta resistencia.'
  },
  {
    id: 'Ghost Catfish',
    name: 'Bagre Fantasma (Ghost Catfish)',
    icon: '🐟',
    avgPrice: 360,
    minPrice: 300,
    maxPrice: 430,
    velocity: 'medium',
    volumeScore: 75,
    category: 'Pesca Nocturna',
    tag: 'Salida Media ⏳',
    tip: 'Pez raro de Moonmere que piden misiones de capítulo posterior.'
  },
  {
    id: 'Mariposa Blanca de Madera',
    name: 'Mariposa Blanca (Woodland Butterfly)',
    icon: '🦋',
    avgPrice: 60,
    minPrice: 48,
    maxPrice: 75,
    velocity: 'medium',
    volumeScore: 70,
    category: 'Captura de Bichos',
    tag: 'Salida Media ⏳',
    tip: 'Comprada para exhibición en museo y transmutación de tintes.'
  }
];

export const CRAFT_STATION_LOCATIONS = {
  market: {
    stationName: '⚖️ Mercado Central (Rowan) — Market Hall de Bloomshire',
    stationDesc: 'En la plaza central de Bloomshire Town, habla con Rowan en el Market Hall para comprar y vender artículos.',
    label: '🏛️ Market Hall (Rowan)',
    regionId: 'bloomshire_town',
    subZoneId: 'bloomshire_town_sub_1_bloomshire',
    wx: 5740,
    wy: 4320,
    worldRect: [5620, 4200, 260, 240]
  },
  bench: {
    stationName: '🪵 Banco de Trabajo — Carpintería de Pell (Noreste del Pueblo)',
    stationDesc: 'Camina al este desde la Plaza Central y sube hacia el noreste hasta The Carpenter\'s Shop (Pell).',
    label: '🪵 Carpintería de Pell (Banco de Trabajo)',
    regionId: 'bloomshire_town',
    subZoneId: 'bloomshire_town_sub_1_bloomshire',
    wx: 6397,
    wy: 4215,
    worldRect: [6240, 4100, 300, 240]
  },
  forge: {
    stationName: '⚒️ La Forja y Yunque — Herrería de Bram (Este de la Plaza)',
    stationDesc: 'Camina al este desde la Plaza Central pasando la Tienda de Semillas hasta The Forge (Bram).',
    label: '⚒️ Herrería de Bram (Forja y Yunque)',
    regionId: 'bloomshire_town',
    subZoneId: 'bloomshire_town_sub_1_bloomshire',
    wx: 6126,
    wy: 4245,
    worldRect: [5980, 4120, 280, 240]
  },
  cook: {
    stationName: '🍲 Estufa de Cocina — Panadería de Tamsin (Oeste) o Tu Cabaña (Home Island)',
    stationDesc: 'Puedes cocinar en la estufa pública de The Bakery (Tamsin, al oeste del puente) o en la estufa dentro de tu Cabaña.',
    label: '🍲 Panadería de Tamsin (Estufa de Cocina)',
    regionId: 'bloomshire_town',
    subZoneId: 'bloomshire_town_sub_1_bloomshire',
    wx: 5106,
    wy: 4246,
    worldRect: [4960, 4120, 280, 240],
    altHomeLocation: {
      label: '🏡 Estufa de Tu Cabaña (Home Island)',
      regionId: 'home_island',
      subZoneId: 'home_cottage_sub',
      wx: 4034,
      wy: 10012,
      worldRect: [3930, 9930, 220, 220]
    }
  },
  mill: {
    stationName: '🌊 Molino de Agua & 🥛 Lechería — Granja de Hollin (Southvale)',
    stationDesc: 'Sal por el camino sur de Bloomshire hacia Southvale y entra a la Granja de Hollin (Oeste) para moler Harina, Azúcar, Arroz y batir Mantequilla/Queso.',
    label: '🌊 Molino y Lechería (Granja de Hollin - Southvale)',
    regionId: 'southvale',
    subZoneId: 'southvale_sub_19_hollin_s_farm',
    wx: 4888,
    wy: 6080,
    worldRect: [4608, 5816, 560, 528]
  },
  loom: {
    stationName: '🧵 Telar de Sastrería — Taller de Tilly (Orilla Oeste del Pueblo)',
    stationDesc: 'Cruza el puente al oeste de la Plaza Central y baja unos pasos hasta The Tailor\'s (Tilly) para tejer Tela (Cloth) con Lana.',
    label: '🧵 Sastrería de Tilly (Telar de Tela)',
    regionId: 'bloomshire_town',
    subZoneId: 'bloomshire_town_sub_1_bloomshire',
    wx: 4992,
    wy: 4589,
    worldRect: [4860, 4460, 260, 240]
  }
};

export function LockedModuleScreen({ title, description, onConnect, onBack }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[460px]">
      <div className="max-w-md w-full bg-[#0a1224] border-2 border-amber-500/40 rounded-2xl p-7 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
          🔒
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Modo Guía Libre Activo
          </div>
          <h2 className="text-base font-black text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="w-full pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          <button
            onClick={onConnect}
            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🎮 Conectar Partida / Companion</span>
          </button>
          <button
            onClick={onBack}
            className="w-full py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ← Volver al Mega-Atlas HD
          </button>
        </div>
      </div>
    </div>
  );
}

export function LiveCropOrTimerCard({ item, serverTimeOffset, locateInMegaAtlas, handleRemoveProductionTimer }) {
  const [ticker, setTicker] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const effectiveNow = ticker + (serverTimeOffset || 0);
  const isCrop = item.type === 'crop';
  const baseMinutes = (isCrop && item.regrowMinutes && (item.harvestCount || 0) > 0)
    ? item.regrowMinutes
    : (item.growMinutes || item.durationMinutes || 15);
  const actualGrowMinutes = baseMinutes * (item.k ?? 1);
  const totalMs = actualGrowMinutes * 60 * 1000;
  const remMs = item.readyAt ? Math.max(0, item.readyAt - effectiveNow) : 0;

  const isWithered = isCrop && Boolean(item.isWithered || (item.witherAt && effectiveNow >= item.witherAt));
  const isReady = isCrop
    ? (!isWithered && Boolean(item.isRipe || (item.readyAt && effectiveNow >= item.readyAt)))
    : Boolean(item.readyAt && remMs === 0);
  const isSecondWater = isCrop && !isWithered && !isReady && Boolean(item.needsWaterStage === 'second');
  const isFirstWater = isCrop && !isWithered && !isReady && !item.rained && Boolean(item.needsWaterStage === 'first' || (item.needsWater && !item.wateredAt));
  const isRained = isCrop && Boolean(item.rained);

  const elapsed = item.readyAt ? Math.max(0, totalMs - remMs) : (item.plantedAt ? (effectiveNow - item.plantedAt) : 0);
  const pct = isReady ? 100 : (isWithered ? 100 : Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100))));

  const mins = Math.floor(remMs / 60000);
  const secs = Math.floor((remMs % 60000) / 1000);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  let statusBadge = null;
  if (isWithered) {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-rose-500 text-slate-950 border-rose-300">
        🥀 MARCHITO
      </span>
    );
  } else if (isReady) {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-emerald-500 text-slate-950 border-emerald-300">
        ✨ ¡LISTO!
      </span>
    );
  } else if (isSecondWater) {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-amber-500 text-slate-950 border-amber-300 animate-pulse">
        💧 2.° RIEGO
      </span>
    );
  } else if (isFirstWater) {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-sky-500/20 text-sky-300 border-sky-500/40">
        💧 1.ER RIEGO
      </span>
    );
  } else if (isRained) {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-indigo-500/30 text-indigo-200 border-indigo-400/50">
        🌧️ LLUVIA
      </span>
    );
  } else {
    statusBadge = (
      <span className="font-mono font-black text-xs px-2 py-0.5 rounded border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
        {timeStr}
      </span>
    );
  }

  let statusDesc = `${timeStr} restantes`;
  if (isWithered) {
    statusDesc = 'Marchito tras 5h maduro sin cosechar';
  } else if (isReady) {
    const msToWither = item.witherAt ? Math.max(0, item.witherAt - effectiveNow) : 0;
    const witherMins = Math.floor(msToWither / 60000);
    statusDesc = msToWither > 0 ? `Marchita en ${witherMins}m (5h tope)` : '¡Listo para cosechar!';
  } else if (isSecondWater) {
    statusDesc = '¡Requiere 2.° riego para madurar!';
  } else if (isFirstWater) {
    statusDesc = item.outdoors ? 'Requiere riego (o lluvia al aire libre) 🌧️' : 'Sin regar (crecimiento pausado)';
  } else if (isRained) {
    statusDesc = 'Regado por lluvia (creciendo) 🌧️';
  } else if (isCrop) {
    statusDesc = `Creciendo (etapa ${item.stage ?? 0}/${item.lastStage ?? 4})`;
  }

  return (
    <div
      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all shadow-sm ${
        isWithered
          ? 'bg-rose-950/40 border-rose-500/70 shadow-rose-950/20'
          : isReady
          ? 'bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-500/50 shadow-emerald-900/20 animate-pulse'
          : isSecondWater
          ? 'bg-amber-950/50 border-amber-500/80 ring-1 ring-amber-500/40'
          : isFirstWater
          ? 'bg-sky-950/40 border-sky-500/60'
          : isRained
          ? 'bg-indigo-950/40 border-indigo-500/50'
          : 'bg-[#091224] border-slate-800 hover:border-slate-700'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{item.icon || '🌱'}</span>
            <div>
              <div className="font-bold text-white text-sm leading-tight flex items-center gap-1.5 flex-wrap">
                <span>{item.count > 1 ? `${item.count}x ` : ''}{item.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{isCrop ? 'Cultivo en Parcela' : 'Cocina / Crafteo'}</span>
                {isCrop && item.k && item.k < 1 && (
                  <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[9px]">
                    ⚡ -{Math.round((1 - item.k) * 100)}% tiempo
                  </span>
                )}
                {isCrop && item.regrowMinutes && (
                  <span className="px-1 py-0.2 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold text-[9px]">
                    🔁 Rebrote ({item.harvestCount || 1}/{item.harvests || 5})
                  </span>
                )}
                {isRained && (
                  <span className="px-1 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-[9px]">
                    🌧️ Lluvia
                  </span>
                )}
              </div>
            </div>
          </div>

          {statusBadge}
        </div>

        {/* Barra de Progreso */}
        <div className="mt-2.5">
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isWithered
                  ? 'bg-rose-500'
                  : isReady
                  ? 'bg-emerald-400'
                  : isSecondWater
                  ? 'bg-amber-400'
                  : isFirstWater
                  ? 'bg-sky-400'
                  : isRained
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>{pct}% completado</span>
            <span className={isWithered ? 'text-rose-400 font-bold' : isReady ? 'text-emerald-300 font-bold' : isSecondWater ? 'text-amber-300 font-bold' : isRained ? 'text-indigo-300 font-bold' : ''}>
              {statusDesc}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-300 truncate max-w-[140px]" title={item.location}>
            {item.location || 'Huerto'}
          </span>
          {isCrop && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border border-slate-700/60 text-emerald-400/90 bg-emerald-950/30">
              🌱 Parcela en Huerto
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {item.atlasTarget && (
            <button
              onClick={() => locateInMegaAtlas(item.atlasTarget)}
              className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 flex items-center justify-center cursor-pointer transition-all shrink-0"
              title="Ver ubicación en Mega-Atlas"
            >
              <MapPin className="w-3 h-3" />
            </button>
          )}
          {item.isManual && (
            <button
              onClick={() => handleRemoveProductionTimer(item.id)}
              className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded text-[10px] font-bold cursor-pointer"
              title="Eliminar este temporizador"
            >
              ✕ Listo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const getItemStorageBreakdown = (itemObj, rawInventory = []) => {
  if (!itemObj) return { total: 0, m: 0, cc: 0, cp: 0 };
  const idLower = (itemObj.id || '').toLowerCase().trim();
  const nameLower = (itemObj.name || itemObj.nameEs || '').toLowerCase().trim();
  const idClean = idLower.replace(/_/g, ' ');

  let m = 0;
  let cc = 0;
  let cp = 0;

  rawInventory.forEach(it => {
    if (!it) return;
    const itId = (it.id || '').toLowerCase().trim();
    const itName = (it.name || '').toLowerCase().trim();
    const itIdClean = itId.replace(/_/g, ' ');

    const match = (
      (idLower && (itId === idLower || itIdClean === idClean || itIdClean === idLower || itName === idLower || itName === idClean)) ||
      (nameLower && (itName === nameLower || itId === nameLower || itIdClean === nameLower))
    );

    if (match) {
      const qty = typeof it.count === 'number' ? it.count : (typeof it.qty === 'number' ? it.qty : 1);
      const type = getStorageType(it.area);
      if (type === 'M') m += qty;
      else if (type === 'CP') cp += qty;
      else cc += qty;
    }
  });

  const total = m + cc + cp;
  return { total, m, cc, cp };
};

export const getRecipeCraftability = (recipe, rawInventory = []) => {
  if (!recipe) return { canCraft: false, maxBatches: 0, missingCount: 0, breakdown: [] };
  
  if (recipe.needs && Array.isArray(recipe.needs) && recipe.needs.length > 0) {
    let canCraft = true;
    let maxBatches = Infinity;
    let missingCount = 0;
    const breakdown = recipe.needs.map(n => {
      const stock = getItemStorageBreakdown({ id: n.item, name: n.nameEs || n.item }, rawInventory);
      const req = Number(n.qty) || 1;
      const hasEnough = stock.total >= req;
      if (!hasEnough) {
        canCraft = false;
        missingCount++;
      }
      const possible = req > 0 ? Math.floor(stock.total / req) : 0;
      if (possible < maxBatches) maxBatches = possible;
      return {
        item: n.item,
        nameEs: n.nameEs || n.item,
        req,
        total: stock.total,
        m: stock.m,
        cc: stock.cc,
        cp: stock.cp,
        hasEnough
      };
    });

    return {
      canCraft: canCraft && maxBatches > 0 && maxBatches !== Infinity,
      maxBatches: canCraft && maxBatches !== Infinity ? maxBatches : 0,
      missingCount,
      breakdown
    };
  }

  if (recipe.mats && typeof recipe.mats === 'string') {
    const parts = recipe.mats.split('+').map(s => s.trim()).filter(Boolean);
    let canCraft = true;
    let maxBatches = Infinity;
    let missingCount = 0;
    const breakdown = parts.map(part => {
      const m = part.match(/^(.*?)(?:\s*(?:x\s*(\d+)|\((\d+)\)|(\d+)\s*x))?$/i);
      const nameOnly = m && m[1] ? m[1].trim() : part;
      const req = m && (m[2] || m[3] || m[4]) ? Number(m[2] || m[3] || m[4]) : 1;
      const searchName = nameOnly.replace(/\s*\([^)]*\)/g, '').split(' o ')[0].trim();
      const stock = getItemStorageBreakdown({ id: searchName, name: nameOnly }, rawInventory);
      const hasEnough = stock.total >= req;
      if (!hasEnough) {
        canCraft = false;
        missingCount++;
      }
      const possible = req > 0 ? Math.floor(stock.total / req) : 0;
      if (possible < maxBatches) maxBatches = possible;
      return {
        item: searchName,
        nameEs: nameOnly,
        req,
        total: stock.total,
        m: stock.m,
        cc: stock.cc,
        cp: stock.cp,
        hasEnough
      };
    });

    return {
      canCraft: canCraft && maxBatches > 0 && maxBatches !== Infinity,
      maxBatches: canCraft && maxBatches !== Infinity ? maxBatches : 0,
      missingCount,
      breakdown
    };
  }

  return { canCraft: false, maxBatches: 0, missingCount: 0, breakdown: [] };
};

// Helper: Mapear inventario crudo a catálogo canónico
export const calculateQuantitiesFromRaw = (rawList, scope = 'all', catalog = defaultInventoryCatalog) => {
  const counts = {};
  (catalog || []).forEach(c => { counts[c.id] = 0; });

  if (!Array.isArray(rawList)) return counts;

  const filtered = rawList.filter(it => {
    const type = getStorageType(it.area);
    if (scope === 'hotbar') return type === 'M';
    if (scope === 'home_chest') return type === 'CC';
    if (scope === 'town_chest') return type === 'CP';
    if (scope === 'chest') return type === 'CC' || type === 'CP';
    return true;
  });

  filtered.forEach(it => {
    const itId = (it.id || '').trim();
    const itName = (it.name || '').trim();
    const itIdLower = itId.toLowerCase();
    const itNameLower = itName.toLowerCase();
    const qty = Number(it.qty) || Number(it.n) || 0;

    if (itIdLower.startsWith('tool:') || itIdLower.startsWith('seed:')) return;

    let matchedRow = (catalog || []).find(x => x.id.toLowerCase() === itIdLower || x.id.toLowerCase() === itNameLower);

    if (!matchedRow) {
      let bestMatch = null;
      let bestLen = 0;
      for (const row of (catalog || [])) {
        const keys = row.matchKeys || [row.id.toLowerCase()];
        for (const key of keys) {
          if (itIdLower === key || itNameLower === key || itIdLower.includes(key) || itNameLower.includes(key)) {
            if (key.length > bestLen) {
              bestMatch = row;
              bestLen = key.length;
            }
          }
        }
      }
      matchedRow = bestMatch;
    }

    if (matchedRow && qty > 0) {
      counts[matchedRow.id] = (counts[matchedRow.id] || 0) + qty;
    }
  });

  return counts;
};

// Helper: Desglose para órdenes de Odette (con coincidencia estricta para evitar confundir Madera con Blanca de Madera)
export const getOrderBreakdown = (ord, rawInventory = [], catalog = defaultInventoryCatalog) => {
  if (!ord) return { total: 0, m: 0, cc: 0, cp: 0 };
  const rawKey = (ord.rawItem || '').trim();
  const displayKey = (ord.item || '').trim();

  const rawLower = rawKey.toLowerCase();
  const dispLower = displayKey.toLowerCase();

  // 1. Búsqueda directa exacta en el catálogo por ID
  let catMatch = (catalog || []).find(c => {
    const idL = c.id.toLowerCase();
    return (rawLower && idL === rawLower) || (dispLower && idL === dispLower);
  });

  // 2. Búsqueda exacta en matchKeys (ej. 'blanca de madera' -> 'Wood White')
  if (!catMatch) {
    catMatch = (catalog || []).find(c => {
      const keys = (c.matchKeys || []).map(k => k.toLowerCase());
      return (rawLower && keys.includes(rawLower)) || (dispLower && keys.includes(dispLower));
    });
  }

  // 3. Búsqueda exacta por nombre traducido
  if (!catMatch) {
    catMatch = (catalog || []).find(c => {
      const nameL = c.name.toLowerCase();
      return (rawLower && nameL === rawLower) || (dispLower && nameL === dispLower);
    });
  }

  // Si encontramos fila del catálogo, consultar desglose con sus claves exactas
  if (catMatch) {
    return getItemStorageBreakdown({ id: catMatch.id, name: catMatch.name }, rawInventory);
  }

  // Fallback: consultar con las claves recibidas directamente
  return getItemStorageBreakdown({ id: rawKey, name: displayKey }, rawInventory);
};

// Helper: Obtener cantidad disponible en mochila/cofres para una orden de Odette
export const getOrderAvailableQty = (ord, rawInventory = [], catalog = defaultInventoryCatalog) => {
  return getOrderBreakdown(ord, rawInventory, catalog).total;
};

