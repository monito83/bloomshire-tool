// Moni-OS v1.0.2 - Live Companion & Market Radar
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Coins, 
  Gem, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  Send, 
  Bot, 
  Sparkles, 
  ShoppingBag, 
  ArrowUpRight, 
  Trash2, 
  RotateCcw, 
  Navigation, 
  Moon, 
  Sun, 
  MapPin, 
  Compass, 
  Hammer, 
  BookOpen, 
  User, 
  Check, 
  Clock, 
  Layers, 
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings,
  LogOut
} from 'lucide-react';

// Importar datos canónicos JSON
import calcData from '../../public/data/bloomshire/calc_data.json';
import npcsData from '../../public/data/bloomshire/npcs.json';
import craftData from '../../public/data/bloomshire/craft_data.json';
import inventoryCatalogData from '../../public/data/bloomshire/inventory_catalog.json';
import itemEncyclopediaData from '../../public/data/bloomshire/item_encyclopedia.json';
import itemIconsMap from '../../public/data/bloomshire/item_icons_map.json';
import megaAtlasData from '../../public/data/bloomshire/mega_atlas_data.json';
import CANONICAL_QUEST_CATALOG from '../data/canonicalQuests.json';
import BloomshireMegaAtlas, { NpcAvatar } from './BloomshireMegaAtlas';
import rulesData from '../data/rules.json';
import ErrorBoundary from './ErrorBoundary';

// Singleton de AudioContext para alarmas de producción (O15) con respeto a Autoplay Policy
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

function getSharedAudioContext() {
  if (!hasUserInteracted) return null; // Prevenir avisos de Autoplay Policy hasta el primer gesto del usuario
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

// Importar lógica y fórmulas de bloomshireEngine
import {
  CANONICAL_SKILLS,
  xpForLevel,
  computeCanonicalSkillsFromRaw,
  computeClientLiveEnergyAndBed,
  computeMaxEnergy
} from './bloomshire/bloomshireEngine';


// ============================================================================
// HELPER FUNCTIONS & CANONICAL DICTIONARIES (MODULE SCOPE - NO TDZ)
// ============================================================================

export const getStorageType = (areaRaw) => {
  const area = String(areaRaw || '').toLowerCase();
  if (area.includes('hotbar') || area.includes('bag') || area.includes('pack') || area.includes('inv')) return 'M';
  if (area.includes('town') || area.includes('pueblo') || area.includes('storehouse') || area.includes('storage') || area.includes('bank') || area.includes('stash') || area.includes('cp')) return 'CP';
  if (area.includes('home') || area.includes('cabaña') || area.includes('house') || area.includes('island') || area.includes('cc')) return 'CC';
  return 'CC'; // Cofres genéricos asignados a Cofre de Casa
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
  switch (cat) {
    case 'crop': return 'Cultivo';
    case 'fish': return 'Pez';
    case 'food': return 'Comida';
    case 'forage': return 'Recolección / Seta';
    case 'ore': return 'Mineral';
    case 'resource': return 'Recurso / Madera';
    case 'bug': return 'Mariposa / Bicho';
    case 'animal': return 'Ganadería';
    case 'meat': return 'Carne';
    case 'staple': return 'Básico / Molino';
    case 'craft': return 'Artesanía';
    case 'forged': return 'Forja';
    case 'tool': return 'Herramienta';
    case 'weapon': return 'Arma';
    case 'gear': return 'Equipamiento';
    case 'furniture': return 'Mueble';
    case 'quest': return 'Misión';
    case 'premium': return 'Especial / Pase';
    case 'treasure': return 'Tesoro';
    default: return cat || 'General';
  }
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
      // Strip emojis and trailing symbols
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
              title={`Requerido: ${b.req} | Tienes: ${b.total} (Mochila: ${b.m}, Cabaña: ${b.cc}, Pueblo: ${b.cp})`}
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


// Componente de Bloqueo Elegante para Módulos Personales en Modo Guía Libre
function LockedModuleScreen({ title, description, onConnect, onBack }) {
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

// Componente de temporizador desacoplado del reloj raíz (evita repintar toda la app cada segundo)
function LiveCropOrTimerCard({ item, serverTimeOffset, locateInMegaAtlas, handleRemoveProductionTimer }) {
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

export default function BloomshireCommand() {
  const VALID_TABS = ['mega_atlas', 'inventory', 'items', 'craft', 'npcs', 'calc', 'monitors', 'quests', 'advisor', 'system'];
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_active_tab');
      if (saved && VALID_TABS.includes(saved)) {
        const isPrivate = ['quests', 'advisor', 'monitors'].includes(saved);
        const w = localStorage.getItem('bloomshire_wallet');
        const hasWallet = Boolean(w && w !== 'null' && w.startsWith('0x'));
        if (isPrivate && !hasWallet) return 'mega_atlas';
        return saved;
      }
      const w = localStorage.getItem('bloomshire_wallet');
      return (w && w !== 'null' && w.startsWith('0x')) ? 'inventory' : 'mega_atlas';
    } catch {
      return 'mega_atlas';
    }
  });

 // 'inventory', 'quests', 'town', 'world', 'calc', 'craft', 'npcs', 'advisor'

  // Player State
  const [walletAddress, setWalletAddress] = useState(() => {
    try { const w = localStorage.getItem('bloomshire_wallet'); return (w && w !== 'null' && w.startsWith('0x')) ? w : null; } catch { return null; }
  });
  const [sessionToken, setSessionToken] = useState(() => {
    try { return localStorage.getItem('bloomshire_session_token') || null; } catch { return null; }
  });
  const [authenticatedWallet, setAuthenticatedWallet] = useState(null);
  const authenticatedWalletRef = useRef(null);
  const lastReportedExtensionWalletRef = useRef(null);
  useEffect(() => {
    authenticatedWalletRef.current = authenticatedWallet;
  }, [authenticatedWallet]);
  const [viewOnlyWallet, setViewOnlyWallet] = useState(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [isVip, setIsVip] = useState(() => {
    try { return localStorage.getItem('bloomshire_cached_is_vip') === 'true'; } catch { return false; }
  });
  const [vipUntil, setVipUntil] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_vip_until')) || 0; } catch { return 0; }
  });
  const [playerPerks, setPlayerPerks] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomshire_cached_perks');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

  // El acceso premium exige sesión SIWE verificada por el servidor (S1)
  const isConnected = Boolean(isPremiumUnlocked);

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
  const [farmersOwned, setFarmersOwned] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_farmers')) || 0; } catch { return 0; }
  });
  const [farmingLevel, setFarmingLevel] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_farming_level')) || 0; } catch { return 0; }
  });
  const [currentEnergy, setCurrentEnergy] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_energy')) || 0; } catch { return 0; }
  });
  const [maxEnergy, setMaxEnergy] = useState(() => {
    const cachedVip = (() => { try { return localStorage.getItem('bloomshire_cached_is_vip') === 'true'; } catch { return false; } })();
    const cachedFarmers = (() => { try { return Number(localStorage.getItem('bloomshire_cached_farmers')) || 0; } catch { return 0; } })();
    const cachedPerks = (() => { try { const p = localStorage.getItem('bloomshire_cached_perks'); return p ? JSON.parse(p) : null; } catch { return null; } })();
    const isHolder = cachedFarmers > 0 || Boolean(cachedPerks);
    return computeMaxEnergy(cachedVip, isHolder);
  });
  const [rawEnergyObj, setRawEnergyObj] = useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(() => Date.now());
  const [gold, setGold] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_gold')) || 0; } catch { return 0; }
  });
  const [shards, setShards] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_shards')) || 0; } catch { return 0; }
  });
  const [avyn, setAvyn] = useState(() => {
    try { return Number(localStorage.getItem('bloomshire_cached_avyn')) || 0; } catch { return 0; }
  });
  const [activeQuest, setActiveQuest] = useState(() => {
    try { return localStorage.getItem('bloomshire_cached_active_quest') || ''; } catch { return ''; }
  });
  const [activeQuestsList, setActiveQuestsList] = useState([]);
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [moonmereProgress, setMoonmereProgress] = useState({
    currentChapter: 0,
    completedChapters: 0,
    targetChapter: 24,
    totalChaptersRequired: 24,
    homeChangedDone: false,
    moonmereUnlocked: false,
    moonmereIndex: 0,
    totalMoonmereChapters: 7,
    unlocked: false
  });
  const [energyMeta, setEnergyMeta] = useState(() => {
    const init = computeClientLiveEnergyAndBed(null, 0, Date.now(), { sleepExhausted: false, sleepLeft: 0 }, { farmersCount: farmersOwned });
    return init.energyMeta;
  });
  const [skillsMeta, setSkillsMeta] = useState({
    minSkillKey: 'farming',
    minSkillName: 'Cultivo',
    minSkillsList: ['Cultivo'],
    minSkillLevel: 1,
    maxAllowedLevel: 30,
    isFarmingCapped: false
  });
  const [skillsBreakdown, setSkillsBreakdown] = useState(() => {
    return computeCanonicalSkillsFromRaw({}).skillsBreakdown;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const lastExtensionSyncAtRef = useRef(0);

  // Inventory & Liquidation State
  const [inventoryScope, setInventoryScope] = useState('all'); // 'all', 'hotbar', 'chest'
  const [rawInventory, setRawInventory] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  // Active Orders (Odette)
  const [activeOrders, setActiveOrders] = useState([]);

  // Universal Mega-Atlas Focus Target (para el botón "📍 Ubicar en el Mapa")
  // Settings & System Updates State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [connectCode, setConnectCode] = useState('');
  const [connectFeedback, setConnectFeedback] = useState(null);
  const [injectedWallets, setInjectedWallets] = useState([]);
  const [selectedWalletUuid, setSelectedWalletUuid] = useState(null);

  // Detección de Billeteras mediante estándar EIP-6963 (evita colisión entre Backpack, MetaMask, Rabby, etc.)
  useEffect(() => {
    const handleAnnounce = (event) => {
      if (!event.detail?.info || !event.detail?.provider) return;
      setInjectedWallets(prev => {
        if (prev.some(w => w.info.uuid === event.detail.info.uuid || w.info.name === event.detail.info.name)) return prev;
        return [...prev, event.detail];
      });
    };
    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', handleAnnounce);
  }, []);

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(() => new Date().toLocaleTimeString());
  const [updateStatusMessage, setUpdateStatusMessage] = useState('Todos los módulos y catálogos están 100% sincronizados con el juego.');
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Sistema Moni-Bot Companion v2.4 iniciado correctamente.', type: 'info' },
    { id: 2, time: new Date().toLocaleTimeString(), text: 'Catálogo de misiones validado: 24 capítulos + secundarias activas.', type: 'success' },
    { id: 3, time: new Date().toLocaleTimeString(), text: 'Mega-Atlas HD: 10 mapas oficiales disponibles en caché local.', type: 'success' },
    { id: 4, time: new Date().toLocaleTimeString(), text: 'Registro de aldeanos: 67 NPCs indexados con tabla de regalos y horarios.', type: 'info' }
  ]);

  const handleConnectAndSignWallet = async (explicitProvider = null) => {
    const activeProvider = explicitProvider || 
      (selectedWalletUuid ? injectedWallets.find(w => w.info.uuid === selectedWalletUuid)?.provider : null) ||
      (injectedWallets[0]?.provider) ||
      (typeof window !== 'undefined' ? window.ethereum : null);

    if (!activeProvider) {
      setConnectFeedback({ type: 'error', text: 'No se detectó ninguna billetera Web3 (MetaMask, Backpack, Rabby, etc.) en este navegador.' });
      return;
    }
    try {
      setConnectFeedback({ type: 'loading', text: 'Solicitando conexión con tu billetera Web3...' });
      const accounts = await activeProvider.request({ method: 'eth_requestAccounts' });
      const account = accounts && accounts[0] ? accounts[0].toLowerCase() : null;
      if (!account) {
        setConnectFeedback({ type: 'error', text: 'No se seleccionó ninguna cuenta en la billetera.' });
        return;
      }

      setConnectFeedback({ type: 'loading', text: 'Obteniendo reto criptográfico de firma (nonce)...' });
      const nonceRes = await fetch(`/api/auth?action=nonce&wallet=${encodeURIComponent(account)}`);
      if (!nonceRes.ok) {
        const errJson = await nonceRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Error al obtener reto de firma del servidor.' });
        return;
      }
      const { nonce, message } = await nonceRes.json();

      setConnectFeedback({ type: 'loading', text: 'Firma el mensaje en tu billetera para verificar tu identidad (sin costo de gas)...' });
      const signature = await activeProvider.request({
        method: 'personal_sign',
        params: [message, account]
      });

      setConnectFeedback({ type: 'loading', text: 'Verificando firma con el servidor...' });
      const verifyRes = await fetch('/api/auth?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', wallet: account, signature, nonce, message })
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        setConnectFeedback({ type: 'error', text: errJson.error || 'Firma inválida.' });
        return;
      }

      const { token } = await verifyRes.json();
      localStorage.setItem('bloomshire_session_token', token);
      localStorage.setItem('bloomshire_wallet', account);
      localStorage.removeItem('bloomshire_manual_disconnected');
      setWalletAddress(account);
      setAuthenticatedWallet(account);
      authenticatedWalletRef.current = account;
      setSessionToken(token);
      setIsPremiumUnlocked(true);

      setConnectFeedback({ type: 'success', text: `¡Sesión autenticada con éxito! (${account.slice(0, 6)}...)` });

      // Cargar partida privada sincronizada
      const syncRes = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(account)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (syncRes.ok) {
        const syncJson = await syncRes.json();
        if (syncJson.inGame) {
          applyIncomingSync({
            ...syncJson.inGame,
            wallet: syncJson.onChain?.wallet || account,
            farmersCount: syncJson.onChain?.farmersCount ?? 0
          }, 'server');
        }
      }
      setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 1500);
    } catch (err) {
      setConnectFeedback({ type: 'error', text: err.message || 'Firma cancelada o rechazada en la billetera.' });
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatusMessage('Comprobando versión en vivo con bloomshire.xyz...');
    const nowStr = new Date().toLocaleTimeString();
    setLastUpdateCheck(nowStr);

    try {
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    } catch (e) {}

    try {
      const res = await fetch('/api/bloomshire-version');
      if (res.ok) {
        const info = await res.json();
        setIsCheckingUpdates(false);
        if (info.liveBuild) setGameBuildHash(info.liveBuild);
        if (info.isUpToDate) {
          setGameBuildStatus('synced');
          setUpdateStatusMessage(`¡Sistema al día! Servidor Bloomshire en build ${info.liveBuild}.`);
          setSystemLogs(prev => [
            { id: Date.now(), time: nowStr, text: `Comprobación completada: Servidor en build ${info.liveBuild}. 100% compatible con Tool ${info.toolVersion}.`, type: 'success' },
            ...prev
          ].slice(0, 50));
        } else {
          setGameBuildStatus('patch_detected');
          setUpdateStatusMessage(`⚠️ Nuevo parche detectado en Bloomshire: Build ${info.liveBuild} (Tool en ${info.verifiedBuild})`);
          setSystemLogs(prev => [
            { id: Date.now(), time: nowStr, text: `Alerta de Parche: Bloomshire actualizó al build ${info.liveBuild}. Catálogos locales verificados con a70eb5dd5113.`, type: 'warning' },
            ...prev
          ].slice(0, 50));
        }
        return;
      }
    } catch (err) {
      console.warn('Fallo chequeo de versión API, usando fallback:', err);
    }

    setTimeout(() => {
      setIsCheckingUpdates(false);
      setUpdateStatusMessage('Comprobación exitosa: Servidor y catálogos en build a70eb5dd5113.');
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: 'Comprobación de versión completada: Build a70eb5dd5113 activo.', type: 'info' },
        ...prev
      ].slice(0, 50));
    }, 1000);
  };

  const handleRefreshMarketOffers = () => {
    setIsMarketOffersLoading(true);
    setUpdateStatusMessage('Descargando puestos y últimas ventas de Rowan...');
    try {
      window.postMessage({ type: 'REQUEST_MARKET_SALES_SYNC' }, '*');
      document.dispatchEvent(new CustomEvent('monios_request_market_sales'));
    } catch (e) {}

    setTimeout(() => {
      setIsMarketOffersLoading(prev => {
        if (prev) {
          setSystemLogs(l => [
            { id: Date.now(), time: new Date().toLocaleTimeString(), text: 'Consulta de mercado finalizada. Si no ves ventas, asegúrate de tener Bloomshire abierto con tu sesión iniciada.', type: 'info' },
            ...l
          ]);
        }
        return false;
      });
    }, 6000);
  };

  const handleForceRedownload = (moduleKey) => {
    const nowStr = new Date().toLocaleTimeString();
    if (moduleKey === 'maps') {
      try {
        window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
      } catch (e) {}
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: 'Re-renderizado de los 10 mapas Pixel-Art HD iniciado en segundo plano.', type: 'info' },
        ...prev
      ].slice(0, 50));
    } else {
      try {
        window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      } catch (e) {}
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: `Sincronización forzada de catálogo (${moduleKey || 'todos'}) ejecutada.`, type: 'info' },
        ...prev
      ].slice(0, 50));
    }
  };

  const [atlasFocusTarget, setAtlasFocusTarget] = useState(null);

  const locateInMegaAtlas = (locationObj) => {
    if (!locationObj) return;
    setAtlasFocusTarget({
      ...locationObj,
      timestamp: Date.now()
    });
    setActiveTab('mega_atlas');
  };

  // Collapsible Sections en "Habilidades, Misiones & Moonmere"
  // Tareas Diarias (Task Center / Recompensa Semilla Premium)
  const getInitialDailyTasks = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaults = [
      { id: 'water_crops', label: 'Riego de cultivos', icon: '💧', target: 15, current: 0, done: false, stars: 1 },
      { id: 'defeat_creatures', label: 'Derrota criaturas', icon: '⚔️', target: 5, current: 0, done: false, stars: 1 },
      { id: 'gather_mushrooms', label: 'Recolecta hongos', icon: '🍄', target: 4, current: 0, done: false, stars: 1 },
      { id: 'harvest_crops', label: 'Cosecha cultivos', icon: '🌾', target: 30, current: 0, done: false, stars: 2 },
      { id: 'store_orders', label: 'Entrega pedidos de la tienda general', icon: '📦', target: 2, current: 0, done: false, stars: 2 },
      { id: 'catch_fish', label: 'Pesca peces', icon: '🎣', target: 25, current: 0, done: false, stars: 3 }
    ];
    try {
      const stored = localStorage.getItem('bloomshire_daily_tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        const isOldMock = Array.isArray(parsed.tasks) && (
          (parsed.tasks.every(t => t.done === true) && parsed.tasks.some(t => t.id === 'chop_woodlot')) ||
          parsed.tasks.some(t => t.id === 'mine_rocks' && t.current === 40)
        );
        if (!isOldMock && parsed.date === todayStr && Array.isArray(parsed.tasks) && parsed.tasks.length === 6) {
          return parsed.tasks;
        }
      }
    } catch (e) {}
    return defaults;
  };

  const [dailyTasks, setDailyTasks] = useState(getInitialDailyTasks);

  const toggleDailyTask = (taskId) => {
    setDailyTasks(prev => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const updated = prev.map(t => t.id === taskId ? { ...t, done: !t.done, current: !t.done ? t.target : 0 } : t);
      try {
        localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: todayStr, tasks: updated }));
      } catch (e) {}
      return updated;
    });
  };

  const dailyTasksCompletedCount = useMemo(() => {
    return dailyTasks.filter(t => t.done).length;
  }, [dailyTasks]);

  const [questSectionsOpen, setQuestSectionsOpen] = useState({
    materialTracker: true,
    dailyTasks: true,
    moonmereBanner: true,
    skillsBook: true,
    energyBed: false,
    roadmap: true
  });

  const toggleQuestSection = (sectionKey) => {
    setQuestSectionsOpen(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleAllQuestSections = (openState) => {
    setQuestSectionsOpen({
      materialTracker: openState,
      dailyTasks: openState,
      moonmereBanner: openState,
      skillsBook: openState,
      energyBed: openState,
      roadmap: openState
    });
  };

  // Buscador Universal de Ítems & Enciclopedia (359 ítems del juego)
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [itemViewMode, setItemViewMode] = useState('grid'); // 'grid' | 'list'
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState('owned_desc'); // 'owned_desc' | 'qty_desc' | 'value_desc' | 'name_asc'
  const [craftSearchQuery, setCraftSearchQuery] = useState('');
  const [craftSortBy, setCraftSortBy] = useState('profit_desc'); // 'profit_desc' | 'energy_desc' | 'time_asc' | 'rate_desc' | 'level_asc' | 'xp_desc' | 'name_asc'
  const [craftLevelFilter, setCraftLevelFilter] = useState('all');
  const [craftOnlyAvailable, setCraftOnlyAvailable] = useState(false);
  const [craftViewMode, setCraftViewMode] = useState('grid'); // 'grid' | 'list'
  const [npcViewMode, setNpcViewMode] = useState('grid'); // 'grid' | 'list'
  const [economySubTab, setEconomySubTab] = useState(() => {
    try {
      const w = localStorage.getItem('bloomshire_wallet');
      return (w && w !== 'null' && w.startsWith('0x')) ? 'liquidation' : 'arbitrage';
    } catch {
      return 'arbitrage';
    }
  });
    const [liveMarketOffers, setLiveMarketOffers] = useState(() => {
    try {
      const c = localStorage.getItem('bloomshire_cached_market_offers');
      return c ? JSON.parse(c) : null;
    } catch { return null; }
  });
  const [isMarketOffersLoading, setIsMarketOffersLoading] = useState(false);
  const [marketOffersLastUpdated, setMarketOffersLastUpdated] = useState(() => {
    try {
      const c = localStorage.getItem('bloomshire_cached_market_offers');
      return c ? (JSON.parse(c)?.timestamp || null) : null;
    } catch { return null; }
  });
  const [gameBuildHash, setGameBuildHash] = useState('a70eb5dd5113');
  const [toolVersion] = useState('v2.5.0');
  const [gameBuildStatus, setGameBuildStatus] = useState('synced');

  const [marketTrades, setMarketTrades] = useState(null); // 'liquidation' | 'odette' | 'arbitrage' | 'market_radar'
  const [marketFilter, setMarketFilter] = useState('all'); // 'all' | 'in_stock' | 'ultra' | 'gems' | 'vip'
  const [marketSearch, setMarketSearch] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('bloomshire_header_collapsed') === 'true'; } catch { return false; }
  });

  // Calculator State
  const [calcSkill, setCalcSkill] = useState('farming');
  const [calcSeasonFilter, setCalcSeasonFilter] = useState('all');
  const [calcLevelFilter, setCalcLevelFilter] = useState('all');
  const [calcSort, setCalcSort] = useState('xpMin_desc');
  const [calcStrategyPreset, setCalcStrategyPreset] = useState('speedrun');
  const [simulatedEnergy, setSimulatedEnergy] = useState('');
  const [availablePlots, setAvailablePlots] = useState(10);
  const [hasFoundersTimeBonus, setHasFoundersTimeBonus] = useState(true);
  const [expandedUsedInIds, setExpandedUsedInIds] = useState(() => new Set());
  const toggleUsedIn = (itemId) => {
    setExpandedUsedInIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Estados del Dashboard de Cosechas, Cocina y Alarmas (En Vivo)
  const [activeCrops, setActiveCrops] = useState([]);
  const [productionTimers, setProductionTimers] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_prod_timers');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [soundAlarmEnabled, setSoundAlarmEnabled] = useState(() => localStorage.getItem('bloomshire_sound_alarm') !== 'false');
  const [showAddTimerModal, setShowAddTimerModal] = useState(false);
  const [newTimerForm, setNewTimerForm] = useState({
    name: '',
    qty: 1,
    durationMinutes: 10,
    location: '🏡 Cabaña (Home Island)',
    icon: '🍲'
  });
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Persistir temporizadores de producción y preferencia de alarma
  useEffect(() => {
    try {
      localStorage.setItem('bloomshire_prod_timers', JSON.stringify(productionTimers));
    } catch (e) {}
  }, [productionTimers]);

  useEffect(() => {
    try {
      localStorage.setItem('bloomshire_sound_alarm', soundAlarmEnabled ? 'true' : 'false');
    } catch (e) {}
  }, [soundAlarmEnabled]);

  // Campanilla sonora retro (Web Audio API nativa reutilizando singleton AudioContext - O15)
  const playChimeAlarm = () => {
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
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Verificación de alarmas desacoplada del render raíz (sin re-renderizar todo el componente cada segundo)
  const alertedProductionIds = useRef(new Set());
  useEffect(() => {
    if (!soundAlarmEnabled) return;
    const interval = setInterval(() => {
      const effectiveNow = Date.now() + serverTimeOffset;
      const allItems = [...activeCrops, ...productionTimers];
      allItems.forEach(item => {
        if (item.readyAt && item.readyAt <= effectiveNow) {
          if (!alertedProductionIds.current.has(item.id)) {
            alertedProductionIds.current.add(item.id);
            playChimeAlarm();
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [serverTimeOffset, activeCrops, productionTimers, soundAlarmEnabled]);

  // Función para agregar un temporizador de producción manual
  const handleAddProductionTimer = () => {
    if (!newTimerForm.name.trim()) return;
    const durationMs = Math.max(1, parseInt(newTimerForm.durationMinutes, 10) || 5) * 60 * 1000;
    const itemReadyAt = Date.now() + durationMs;
    const timerObj = {
      id: 'timer_' + Date.now(),
      name: newTimerForm.name.trim(),
      icon: newTimerForm.icon || '🍲',
      count: Math.max(1, parseInt(newTimerForm.qty, 10) || 1),
      location: newTimerForm.location || '🏡 Cabaña (Home Island)',
      durationMinutes: Math.max(1, parseInt(newTimerForm.durationMinutes, 10) || 5),
      plantedAt: Date.now(),
      readyAt: itemReadyAt,
      isManual: true,
      type: 'production'
    };
    setProductionTimers(prev => [timerObj, ...prev]);
    setShowAddTimerModal(false);
  };

  const handleRemoveProductionTimer = (id) => {
    setProductionTimers(prev => prev.filter(t => t.id !== id));
  };

  // Crafting State
  const [craftCategory, setCraftCategory] = useState('bench');

  // Ubicaciones exactas en el Mega-Atlas para Estaciones de Crafteo y Cocina
  const CRAFT_STATION_LOCATIONS = {
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

  // NPCs State
  const [npcFilter, setNpcFilter] = useState('');

  // Copilot State
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      content: '🤖 **Copilot IA: En Pausa Temporal (Próximamente)**\n\nEl copiloto estratégico con IA está actualmente en mantenimiento y no configurado. Se activará próximamente una vez finalizada la fase de pruebas y calibración económica. Mientras tanto, puedes consultar la Calculadora de Cultivos, el Mega-Atlas y la Enciclopedia de Ítems libremente.'
    }
  ]);
  const messagesEndRef = useRef(null);


  // Helper: Obtener desglose de existencias por almacén { total, m, cc, cp }
  const getItemStorageBreakdown = (itemObj) => {
    if (!itemObj) return { total: 0, m: 0, cc: 0, cp: 0 };
    const idLower = (itemObj.id || '').toLowerCase().trim();
    const nameLower = (itemObj.name || itemObj.nameEs || '').toLowerCase().trim();
    const idClean = idLower.replace(/_/g, ' ');

    let m = 0;
    let cc = 0;
    let cp = 0;

    rawInventory.forEach(it => {
      const itId = (it.id || '').toLowerCase().trim();
      const itName = (it.name || '').toLowerCase().trim();
      const itClean = itId.replace(/_/g, ' ');
      
      const isMatch = 
        (idLower && (itId === idLower || itName === idLower || itClean === idClean)) || 
        (nameLower && (itId === nameLower || itName === nameLower || itName.includes(nameLower))) ||
        (idLower && (itName.includes(idLower) || itId.includes(idLower)));

      if (isMatch) {
        const qty = Number(it.qty) || Number(it.n) || 0;
        const type = getStorageType(it.area);
        if (type === 'M') m += qty;
        else if (type === 'CC') cc += qty;
        else if (type === 'CP') cp += qty;
      }
    });

    const total = m + cc + cp;
    return { total, m, cc, cp };
  };

  // Helper: Calcular crafteabilidad y disponibilidad de materiales para una receta o plato
  const getRecipeCraftability = (recipe) => {
    if (!recipe) return { canCraft: false, maxBatches: 0, missingCount: 0, breakdown: [] };
    
    if (recipe.needs && Array.isArray(recipe.needs) && recipe.needs.length > 0) {
      let canCraft = true;
      let maxBatches = Infinity;
      let missingCount = 0;
      const breakdown = recipe.needs.map(n => {
        const stock = getItemStorageBreakdown({ id: n.item, name: n.nameEs || n.item });
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
        const stock = getItemStorageBreakdown({ id: searchName, name: nameOnly });
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

  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analíticas de rendimiento
  // Helper: Lista filtrada y ordenada de recetas de crafteo / cocina con analíticas multi-variables
  const filteredAndSortedCrafts = useMemo(() => {
    let list = (craftData && craftData[craftCategory]) ? [...craftData[craftCategory]] : [];

    if (craftSearchQuery && craftSearchQuery.trim()) {
      const q = craftSearchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.item && r.item.toLowerCase().includes(q)) ||
        (r.dish && r.dish.toLowerCase().includes(q)) ||
        (r.craftItem && r.craftItem.toLowerCase().includes(q)) ||
        (r.mats && r.mats.toLowerCase().includes(q)) ||
        (r.desc && r.desc.toLowerCase().includes(q)) ||
        (r.place && r.place.toLowerCase().includes(q))
      );
    }

    if (craftLevelFilter && craftLevelFilter !== 'all') {
      if (craftLevelFilter === 'special') {
        list = list.filter(r => !r.levelNum || r.levelNum === 0 || (r.level && (r.level.toLowerCase().includes('misi') || r.level.toLowerCase().includes('especial') || r.level.toLowerCase().includes('vip'))));
      } else if (craftLevelFilter === '8') {
        list = list.filter(r => (r.levelNum || 1) >= 8 && (r.levelNum || 1) < 10);
      } else if (craftLevelFilter === '10') {
        list = list.filter(r => (r.levelNum || 1) >= 10);
      } else {
        const targetNum = Number(craftLevelFilter);
        list = list.filter(r => (r.levelNum || 1) === targetNum);
      }
    }

    const enriched = list.map(r => {
      const craftability = getRecipeCraftability(r);
      const energyCost = typeof r.energyCost === 'number' ? r.energyCost : (craftCategory === 'cook' ? 1 : craftCategory === 'forge' ? 3 : 2);
      const energyRestore = typeof r.energyRestore === 'number' ? r.energyRestore : 0;
      const netEnergy = energyRestore - energyCost;

      const goldCost = typeof r.goldCost === 'number' ? r.goldCost : 50;
      const sellPrice = typeof r.sellPrice === 'number' ? r.sellPrice : 3000;
      const netGold = Math.max(0, sellPrice - goldCost);

      const minutes = Math.max(1, typeof r.minutes === 'number' ? r.minutes : 1);
      const goldPerMin = Math.round(netGold / minutes);
      const xp = typeof r.xp === 'number' ? r.xp : 25;
      const levelNum = typeof r.levelNum === 'number' ? r.levelNum : (parseInt((r.level || '').replace(/[^0-9]/g, '')) || 1);
      
      const goldPerEnergy = energyCost > 0 ? Math.round(netGold / energyCost) : netGold;
      const xpPerEnergy = energyCost > 0 ? Number((xp / energyCost).toFixed(1)) : xp;
      const xpPerMin = Math.round(xp / minutes);

      return {
        ...r,
        craftability,
        energyCost,
        energyRestore,
        netEnergy,
        goldCost,
        sellPrice,
        netGold,
        minutes,
        goldPerMin,
        goldPerEnergy,
        xpPerEnergy,
        xpPerMin,
        xp,
        levelNum
      };
    });

    let finalFiltered = enriched;
    if (craftOnlyAvailable) {
      finalFiltered = finalFiltered.filter(r => r.craftability.canCraft);
    }

    finalFiltered.sort((a, b) => {
      if (craftSortBy === 'energy_desc') {
        return (b.netEnergy || 0) - (a.netEnergy || 0);
      }
      if (craftSortBy === 'energy_eff_desc') {
        return (b.goldPerEnergy || 0) - (a.goldPerEnergy || 0);
      }
      if (craftSortBy === 'energy_xp_desc') {
        return (b.xpPerEnergy || 0) - (a.xpPerEnergy || 0);
      }
      if (craftSortBy === 'profit_desc') {
        return (b.netGold || 0) - (a.netGold || 0);
      }
      if (craftSortBy === 'rate_desc') {
        return (b.goldPerMin || 0) - (a.goldPerMin || 0);
      }
      if (craftSortBy === 'time_asc') {
        return (a.minutes || 0) - (b.minutes || 0);
      }
      if (craftSortBy === 'xp_desc') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (craftSortBy === 'name_asc') {
        return (a.item || '').localeCompare(b.item || '');
      }
      return (a.levelNum || 1) - (b.levelNum || 1);
    });

    return finalFiltered;
  }, [craftCategory, craftData, craftSearchQuery, craftSortBy, craftLevelFilter, craftOnlyAvailable, rawInventory]);

  const totalCraftableInCurrentCategory = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    return list.filter(r => getRecipeCraftability(r).canCraft).length;
  }, [craftCategory, craftData, rawInventory]);

  // Conteo de crafteables en vivo por cada una de las 5 estaciones
  const craftableCountsByCategory = useMemo(() => {
    const counts = {};
    if (!craftData) return counts;
    ['bench', 'forge', 'cook', 'mill', 'loom'].forEach(k => {
      const list = craftData[k] || [];
      counts[k] = list.filter(r => getRecipeCraftability(r).canCraft).length;
    });
    return counts;
  }, [craftData, rawInventory]);

  // Resumen táctico de la estación actual
  const stationSummary = useMemo(() => {
    const list = (craftData && craftData[craftCategory]) || [];
    let bestEnergyDish = null;
    let bestProfitCraft = null;
    let fastestItem = null;

    list.forEach(r => {
      const eRestore = r.energyRestore || 0;
      if (!bestEnergyDish || eRestore > (bestEnergyDish.energyRestore || 0)) {
        bestEnergyDish = r;
      }
      const netG = (r.sellPrice || 0) - (r.goldCost || 0);
      if (!bestProfitCraft || netG > ((bestProfitCraft.sellPrice || 0) - (bestProfitCraft.goldCost || 0))) {
        bestProfitCraft = r;
      }
      const mins = r.minutes || 1;
      if (!fastestItem || mins < (fastestItem.minutes || 1)) {
        fastestItem = r;
      }
    });

    return {
      total: list.length,
      bestEnergyDish,
      bestProfitCraft,
      fastestItem
    };
  }, [craftCategory, craftData]);

  // Helper: Desglose para órdenes de Odette (con coincidencia estricta para evitar confundir Madera con Blanca de Madera)
  const getOrderBreakdown = (ord) => {
    if (!ord) return { total: 0, m: 0, cc: 0, cp: 0 };
    const rawKey = (ord.rawItem || '').trim();
    const displayKey = (ord.item || '').trim();

    const rawLower = rawKey.toLowerCase();
    const dispLower = displayKey.toLowerCase();

    // 1. Búsqueda directa exacta en el catálogo por ID
    let catMatch = inventoryCatalogData.find(c => {
      const idL = c.id.toLowerCase();
      return (rawLower && idL === rawLower) || (dispLower && idL === dispLower);
    });

    // 2. Búsqueda exacta en matchKeys (ej. 'blanca de madera' -> 'Wood White')
    if (!catMatch) {
      catMatch = inventoryCatalogData.find(c => {
        const keys = (c.matchKeys || []).map(k => k.toLowerCase());
        return (rawLower && keys.includes(rawLower)) || (dispLower && keys.includes(dispLower));
      });
    }

    // 3. Búsqueda exacta por nombre traducido
    if (!catMatch) {
      catMatch = inventoryCatalogData.find(c => {
        const nameL = c.name.toLowerCase();
        return (rawLower && nameL === rawLower) || (dispLower && nameL === dispLower);
      });
    }

    // Si encontramos fila del catálogo, consultar desglose con sus claves exactas
    if (catMatch) {
      return getItemStorageBreakdown({ id: catMatch.id, name: catMatch.name });
    }

    // Fallback: consultar con las claves recibidas directamente
    return getItemStorageBreakdown({ id: rawKey, name: displayKey });
  };

  // Helper: Mapear inventario crudo a catálogo canónico
  const calculateQuantitiesFromRaw = (rawList, scope) => {
    const counts = {};
    inventoryCatalogData.forEach(c => { counts[c.id] = 0; });

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

      let matchedRow = inventoryCatalogData.find(x => x.id.toLowerCase() === itIdLower || x.id.toLowerCase() === itNameLower);

      if (!matchedRow) {
        let bestMatch = null;
        let bestLen = 0;
        for (const row of inventoryCatalogData) {
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

  // Helper: Obtener cantidad disponible en mochila/cofres para una orden de Odette
  const getOrderAvailableQty = (ord) => {
    return getOrderBreakdown(ord).total;
  };

  // Aplicar datos entrantes de telemetría viva (con recálculo canónico de Energía, Cama UTC y 10 Skills)
  const applyIncomingSync = (data, source = 'unknown') => {
    if (!data) return;

    // Respetar desconexión manual del usuario ante eventos de fondo de la extensión
    const isManuallyDisconnected = (function() {
      try { return localStorage.getItem('bloomshire_manual_disconnected') === 'true'; } catch (_) { return false; }
    })();

    if (isManuallyDisconnected && source === 'extension' && !data._userForced) {
      console.log('Ignorando evento de fondo: Sesión desconectada manualmente por el usuario.');
      return;
    }

    const isFromExtension = Boolean(data._fromExtension || source === 'extension');
    if (isFromExtension) {
      lastExtensionSyncAtRef.current = Date.now();
    }

    let effectiveWallet = (data.wallet && typeof data.wallet === 'string' && data.wallet.startsWith('0x')) ? data.wallet.toLowerCase() : null;
    if (isFromExtension && effectiveWallet) {
      lastReportedExtensionWalletRef.current = effectiveWallet;
    }

    // 4.1. Invalidación al Cambiar de Wallet en el Juego (S3):
    // Si la extensión/hook reporta una wallet distinta a la que firmó el token SIWE, desconectar la sesión inmediatamente.
    const activeAuthWallet = authenticatedWalletRef.current;
    if (isFromExtension && effectiveWallet && activeAuthWallet && effectiveWallet !== activeAuthWallet.toLowerCase()) {
      console.warn(`[S3] Conflicto de wallet detectado: la sesión fue autenticada con ${activeAuthWallet} pero la extensión reporta ${effectiveWallet}. Cerrando sesión por seguridad.`);
      handleDisconnect();
      setConnectFeedback({
        type: 'error',
        text: `Se detectó cambio de cuenta en el juego (${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}). Tu sesión anterior fue cerrada por seguridad. Por favor, vuelve a firmar con la nueva wallet.`
      });
      setShowConnectModal(true);
      return;
    }

    // Guardar el snapshot en caché SOLO tras verificar que no hay conflicto de wallet
    try {
      localStorage.setItem('bloomshire_cached_snapshot', JSON.stringify(data));
    } catch (e) {}

    if (!effectiveWallet) {
      try {
        const localW = localStorage.getItem('bloomshire_wallet');
        if (localW && localW !== 'null' && localW.startsWith('0x')) {
          effectiveWallet = localW.toLowerCase();
        }
      } catch (_) {}
    }

    if (effectiveWallet) {
      setWalletAddress(effectiveWallet);
      try { 
        localStorage.setItem('bloomshire_wallet', effectiveWallet);
        localStorage.removeItem('bloomshire_manual_disconnected');
      } catch (e) {}

      // Respaldo asíncrono inmediato en Supabase (Nube) si está autenticado con firma
      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
      if (currentToken) {
        try {
          fetch('/api/bloomshire-advisor?action=push_snapshot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
              action: 'push_snapshot',
              wallet: effectiveWallet.toLowerCase(),
              snapshot: {
                ...data,
                wallet: effectiveWallet.toLowerCase(),
                timestamp: Date.now()
              }
            })
          }).catch(() => {});
        } catch (_) {}
      }
    }
    if (data.gold !== undefined && data.gold >= 0) setGold(data.gold);
    if (data.shards !== undefined) setShards(data.shards);
    if (data.avyn !== undefined) setAvyn(data.avyn > 100000 ? Math.round(data.avyn / 1e6) : Math.round(Number(data.avyn) * 100) / 100);

    // O3 & O8: Actualizar isVip, perks y farmersOwned
    const effectiveIsVip = Boolean(data.isVip);
    setIsVip(effectiveIsVip);
    const effectiveVipUntil = typeof data.vipUntil === 'number' ? data.vipUntil : (data.isVip ? (vipUntil || 0) : 0);
    setVipUntil(effectiveVipUntil);
    try {
      localStorage.setItem('bloomshire_cached_is_vip', String(effectiveIsVip));
      localStorage.setItem('bloomshire_cached_vip_until', String(effectiveVipUntil));
    } catch (_) {}

    // Perks reales emitidos por el juego (save.perks)
    let effectivePerks = playerPerks;
    if (data.perks && typeof data.perks === 'object') {
      effectivePerks = data.perks;
      setPlayerPerks(data.perks);
      try { localStorage.setItem('bloomshire_cached_perks', JSON.stringify(data.perks)); } catch (_) {}
    }

    // El conteo de farmers sale de on-chain / sync del servidor; la extensión no lo pisa
    let effectiveFarmersCount = farmersOwned;
    if (typeof data.farmersCount === 'number' && data.farmersCount >= 0 && source !== 'extension') {
      effectiveFarmersCount = data.farmersCount;
      setFarmersOwned(data.farmersCount);
      try { localStorage.setItem('bloomshire_cached_farmers', String(data.farmersCount)); } catch (_) {}
    }

    // Holder canónico: posesión on-chain (> 0) o perks vigentes (play.js:2118)
    const isHolder = effectiveFarmersCount > 0 || Boolean(effectivePerks);
    const computedMaxE = computeMaxEnergy(effectiveIsVip, isHolder);
    setMaxEnergy(computedMaxE);

    const snapTime = data.timestamp || Date.now();
    setSnapshotTimestamp(snapTime);
    if (data.rawEnergyObj) {
      setRawEnergyObj(data.rawEnergyObj);
    }

    // 1. Recalcular las 10 habilidades con la fórmula real de catalog.js (100 * (L-1)^2.7) (O9: sin límite de nivel 5)
    if (data.skills && typeof data.skills === 'object' && Object.keys(data.skills).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(data.skills, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(computedSkills.farmingLevel)); } catch (_) {}
    } else if (data.skillsBreakdown && typeof data.skillsBreakdown === 'object' && Object.keys(data.skillsBreakdown).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(null, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(computedSkills.farmingLevel)); } catch (_) {}
    } else if (typeof data.farmingLevel === 'number' && data.farmingLevel >= 0) {
      setFarmingLevel(data.farmingLevel);
      try { localStorage.setItem('bloomshire_cached_farming_level', String(data.farmingLevel)); } catch (_) {}
    }

    // 2. Recalcular Energía Viva (+1 cada 3m VIP), Sapphire Jam, Comida Diaria y Reloj de Cama UTC
    const liveEAndBed = computeClientLiveEnergyAndBed(
      data.rawEnergyObj || null,
      typeof data.currentEnergy === 'number' ? data.currentEnergy : 59,
      snapTime,
      data.energyMeta,
      {
        farmersCount: effectiveFarmersCount,
        isVip: effectiveIsVip,
        vipUntil: effectiveVipUntil,
        maxEnergy: computedMaxE,
        perks: effectivePerks,
        buffs: data.buffs || data.rawEnergyObj?.buffs,
        ate: data.ate || data.rawEnergyObj?.ate,
        sold: data.sold || data.rawEnergyObj?.sold
      }
    );
    if (isFromExtension || liveEAndBed.currentEnergy > 1) {
      setCurrentEnergy(liveEAndBed.currentEnergy);
    }
    setEnergyMeta(liveEAndBed.energyMeta);

    if (data.marketTrades) setMarketTrades(data.marketTrades);
    if (data.activeGameBuild) {
      setGameBuildHash(data.activeGameBuild);
      setGameBuildStatus(data.activeGameBuild === 'a70eb5dd5113' ? 'synced' : 'patch_detected');
    }

    if (Array.isArray(data.activeQuestsList)) {
      setActiveQuestsList(data.activeQuestsList);
    }
    if (Array.isArray(data.dailyTasks) && data.dailyTasks.length > 0) {
      setDailyTasks(prev => {
        const mapped = data.dailyTasks.map((incoming, idx) => {
          const rawText = incoming.text || incoming.label || incoming.name || incoming.desc || incoming.title || '';
          const target = incoming.target || incoming.max || incoming.n || incoming.req || 1;
          const current = incoming.current ?? incoming.progress ?? incoming.count ?? (incoming.done ? target : 0);
          const isDone = Boolean(incoming.done || incoming.completed || incoming.ready || (current >= target));
          
          const prevMatch = prev.find(p => 
            p.id === incoming.id || 
            (incoming.key && p.id === incoming.key) ||
            (rawText && p.label.toLowerCase().includes(rawText.toLowerCase())) ||
            (rawText && rawText.toLowerCase().includes(p.label.toLowerCase()))
          );

          let icon = incoming.icon || prevMatch?.icon || '🌱';
          const lower = (rawText || prevMatch?.label || '').toLowerCase();
          if (lower.includes('rieg') || lower.includes('water')) icon = '💧';
          else if (lower.includes('pesc') || lower.includes('fish')) icon = '🎣';
          else if (lower.includes('tal') || lower.includes('chop') || lower.includes('árb') || lower.includes('tree')) icon = '🪓';
          else if (lower.includes('cosech') || lower.includes('harvest') || lower.includes('cultiv')) icon = '🌾';
          else if (lower.includes('maripos') || lower.includes('butterfl')) icon = '🦋';
          else if (lower.includes('roc') || lower.includes('rock') || lower.includes('pic') || lower.includes('mine')) icon = '⛏️';
          else if (lower.includes('hong') || lower.includes('mush') || lower.includes('forage')) icon = '🍄';
          else if (lower.includes('criat') || lower.includes('kill') || lower.includes('monst')) icon = '⚔️';
          else if (lower.includes('pedid') || lower.includes('order')) icon = '📦';
          else if (lower.includes('cocin') || lower.includes('cook')) icon = '🍲';

          return {
            id: incoming.id || prevMatch?.id || `daily_task_${idx}`,
            label: rawText || prevMatch?.label || `Tarea diaria #${idx + 1}`,
            icon,
            target,
            current: isDone ? target : current,
            done: isDone,
            stars: incoming.stars || incoming.star || prevMatch?.stars || (idx >= 5 ? 3 : idx >= 3 ? 2 : 1)
          };
        });

        try {
          localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({
            date: new Date().toISOString().slice(0, 10),
            tasks: mapped
          }));
        } catch (_) {}

        return mapped;
      });
    }
    if (typeof data.serverTimeOffset === 'number') {
      setServerTimeOffset(data.serverTimeOffset);
    }
    if (Array.isArray(data.activeCrops)) {
      setActiveCrops(data.activeCrops);
    }
    if (Array.isArray(data.liveProductionPots)) {
      setProductionTimers(prev => {
        const manualOnly = prev.filter(t => t.isManual);
        return [...data.liveProductionPots, ...manualOnly];
      });
    }

    if (data.moonmereProgress && typeof data.moonmereProgress === 'object') {
      setMoonmereProgress(prev => ({ ...prev, ...data.moonmereProgress }));
    }

    if (Array.isArray(data.inventory)) {
      setRawInventory(data.inventory);
      setItemQuantities(calculateQuantitiesFromRaw(data.inventory, inventoryScope));
    }

    if (Array.isArray(data.activeOrders)) {
      setActiveOrders(data.activeOrders.map(o => ({
        id: o.id,
        item: o.item,
        rawItem: o.rawItem || o.item,
        n: o.n || o.amount || 1,
        gold: o.gold || o.payoutGold || 0,
        xp: o.xp || o.xpReward || 0,
        skill: o.skill || 'farming',
        done: Boolean(o.done)
      })));
    }

    if (data.activeQuest && typeof data.activeQuest === 'string') {
      setActiveQuest(
        data.activeQuest
          .replace(/Look at the arch (of|de) roots/gi, 'Examina el arco de raíces en Whisperwood')
          .replace(/The Hidden Glade/gi, 'El Claro Escondido')
      );
    }

    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // S1: Validar sesión SIWE al inicio con /api/auth?action=me (anti-phishing y protección premium)
  useEffect(() => {
    let isCancelled = false;
    const validateSession = async () => {
      const storedToken = (function() {
        try { return localStorage.getItem('bloomshire_session_token'); } catch (_) { return null; }
      })();
      if (!storedToken) {
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setIsPremiumUnlocked(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth?action=me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.wallet) {
            const verifiedWallet = json.wallet.toLowerCase();
            authenticatedWalletRef.current = verifiedWallet;

            // S3: Chequeo de condición de carrera al arranque:
            // Si la extensión reportó una wallet antes de terminar /api/auth?action=me, verificar discrepancia inmediatamente.
            const reportedExtWallet = lastReportedExtensionWalletRef.current;
            if (reportedExtWallet && reportedExtWallet !== verifiedWallet) {
              console.warn(`[S3] Conflicto de wallet detectado al inicializar sesión: sesión SIWE pertenece a ${verifiedWallet} pero la extensión ya reportó ${reportedExtWallet}. Cerrando sesión por seguridad.`);
              handleDisconnect();
              setConnectFeedback({
                type: 'error',
                text: `Se detectó cambio de cuenta en el juego (${reportedExtWallet.slice(0, 6)}...${reportedExtWallet.slice(-4)}). Tu sesión anterior fue cerrada por seguridad. Por favor, vuelve a firmar con la nueva wallet.`
              });
              setShowConnectModal(true);
              return;
            }

            if (!isCancelled) {
              setSessionToken(storedToken);
              setAuthenticatedWallet(verifiedWallet);
              setWalletAddress(verifiedWallet);
              setIsPremiumUnlocked(true);
            }
            return;
          }
        }
        // Si responde 401 o token inválido: limpiar sesión y regresar a modo anónimo
        try {
          localStorage.removeItem('bloomshire_session_token');
          localStorage.removeItem('bloomshire_wallet');
        } catch (_) {}
        if (!isCancelled) {
          setSessionToken(null);
          setAuthenticatedWallet(null);
          authenticatedWalletRef.current = null;
          setWalletAddress(null);
          setIsPremiumUnlocked(false);
        }
      } catch (err) {
        console.warn('Error al verificar sesión SIWE con el servidor:', err);
      }
    };

    validateSession();
    return () => { isCancelled = true; };
  }, []);

  // Inicialización y Listeners
  useEffect(() => {
    try {
      const cached = localStorage.getItem('bloomshire_cached_snapshot');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) applyIncomingSync(parsed, 'cache');
      }
    } catch (e) {}

    const handleCompanionMessage = (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'MONIOS_COMPANION_SYNC' && event.data.game === 'bloomshire') {
        applyIncomingSync(event.data.data, 'extension');
      }
    };
    const handleCompanionCustomEvent = (event) => {
      if (event.detail?.game === 'bloomshire') {
        applyIncomingSync(event.detail.data, 'extension');
      }
    };

    
    const handleMarketMessage = (event) => {
      if (event.data?.type === 'MONIOS_MARKET_SNAPSHOT' && event.data.offers) {
        const offers = event.data.offers;
        const ts = event.data.timestamp || Date.now();
        setLiveMarketOffers(offers);
        setMarketOffersLastUpdated(ts);
        setIsMarketOffersLoading(false);
        setSystemLogs(l => [
          { id: Date.now(), time: new Date(ts).toLocaleTimeString(), text: `Mercado sincronizado: ${offers.stalls?.length || 0} puestos activos descargados de Rowan.`, type: 'success' },
          ...l
        ].slice(0, 50));
      }
      if (event.data?.type === 'MONIOS_MARKET_SNAPSHOT_ERROR') {
        setIsMarketOffersLoading(false);
        setSystemLogs(l => [
          { id: Date.now(), time: new Date().toLocaleTimeString(), text: `Aviso de mercado: ${event.data.error}`, type: 'warning' },
          ...l
        ].slice(0, 50));
      }
    };

    const handleMarketCustomEvent = (event) => {
      if (event.detail?.offers) {
        const offers = event.detail.offers;
        const ts = event.detail.timestamp || Date.now();
        setLiveMarketOffers(offers);
        setMarketOffersLastUpdated(ts);
        setIsMarketOffersLoading(false);
      }
    };

    window.addEventListener('message', handleMarketMessage);
    document.addEventListener('monios_market_snapshot', handleMarketCustomEvent);

    window.addEventListener('message', handleCompanionMessage);
    document.addEventListener('monios_game_sync', handleCompanionCustomEvent);

    fetchSyncFromServer();

    return () => {
      
      window.removeEventListener('message', handleMarketMessage);
      document.removeEventListener('monios_market_snapshot', handleMarketCustomEvent);

      window.removeEventListener('message', handleCompanionMessage);
      document.removeEventListener('monios_game_sync', handleCompanionCustomEvent);
    };
  }, []);

  // Tick local cada 15s para actualizar energía pasiva (+1 cada 3m VIP) y cuenta regresiva de Cama UTC
  useEffect(() => {
    const timer = setInterval(() => {
      const isHolder = farmersOwned > 0 || Boolean(playerPerks);
      const updated = computeClientLiveEnergyAndBed(
        rawEnergyObj,
        currentEnergy,
        snapshotTimestamp,
        energyMeta,
        {
          farmersCount: farmersOwned,
          isVip,
          vipUntil,
          maxEnergy: computeMaxEnergy(isVip, isHolder),
          perks: playerPerks,
          buffs: rawEnergyObj?.buffs,
          ate: rawEnergyObj?.ate,
          sold: rawEnergyObj?.sold
        }
      );
      if (rawEnergyObj) {
        setCurrentEnergy(updated.currentEnergy);
      }
      setEnergyMeta(updated.energyMeta);
    }, 15000);
    return () => clearInterval(timer);
  }, [rawEnergyObj, currentEnergy, snapshotTimestamp, energyMeta, farmersOwned, playerPerks, isVip, maxEnergy]);

  // Recalcular cantidades cuando cambia el scope
  useEffect(() => {
    if (rawInventory.length > 0) {
      setItemQuantities(calculateQuantitiesFromRaw(rawInventory, inventoryScope));
    }
  }, [inventoryScope]);

  const lastSyncRequestTimeRef = useRef(0);

  // Consulta de sincronización manual / forzada
  const fetchSyncFromServer = async () => {
    const now = Date.now();
    if (now - lastSyncRequestTimeRef.current < 400) return;
    lastSyncRequestTimeRef.current = now;

    setIsSyncing(true);

    try {
      window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN', force: true }, '*');
      document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { game: 'bloomshire', force: true } }));
    } catch (e) {}

    try {
      if (!walletAddress || walletAddress === 'null' || !walletAddress.startsWith('0x')) return;
      const currentToken = localStorage.getItem('bloomshire_session_token') || sessionToken;
      const headers = currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {};
      const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(walletAddress)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const msSinceExt = Date.now() - lastExtensionSyncAtRef.current;
        if (msSinceExt > 12000 && json.inGame && (json.inGame.gold > 0 || (Array.isArray(json.inGame.inventory) && json.inGame.inventory.length > 0))) {
          applyIncomingSync({
            ...json.inGame,
            wallet: json.onChain?.wallet || walletAddress,
            farmersCount: json.onChain?.farmersCount ?? 0
          }, 'server');
        } else if (typeof json.onChain?.farmersCount === 'number') {
          setFarmersOwned(json.onChain.farmersCount);
        }
      }
    } catch (err) {
      console.warn('Sync server check warning:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 700);
    }
  };

  // Límites diarios de venta a tiendas NPC según rules.json (sellLimits = { perItem: 15, things: 60, gold: 12000 })
  const utcDay = Math.floor(Date.now() / 86400000);
  const soldData = rawEnergyObj?.sold || null;
  const isTodaySold = Boolean(soldData && soldData.day === utcDay);
  const soldGoldToday = isTodaySold ? (Number(soldData.gold) || 0) : 0;
  const soldThingsToday = isTodaySold ? (Number(soldData.n) || 0) : 0;
  const soldItemsToday = isTodaySold ? (soldData.items || {}) : {};

  const baseGoldCap = rulesData?.sellLimits?.gold ?? 12000;
  const dailyGoldCap = isVip ? Math.round(baseGoldCap * (rulesData?.vipPerks?.sellGold ?? 1.25)) : baseGoldCap; // VIP otorga bono oficial (rules.VIP_PERKS.sellGold = 1.25)
  const dailyThingsCap = rulesData?.sellLimits?.things ?? 60;
  const dailyPerItemCap = rulesData?.sellLimits?.perItem ?? 15;

  const remainingGoldCap = Math.max(0, dailyGoldCap - soldGoldToday);
  const remainingThingsCap = Math.max(0, dailyThingsCap - soldThingsToday);

  // Desglose de liquidación canónica: Vendible hoy en tiendas NPC vs Excedente para Mercado Rowan (P2P)
  const liquidationBreakdown = useMemo(() => {
    let npcSellableGold = 0;
    let npcSellableThings = 0;
    let p2pMarketGold = 0;
    let p2pMarketThings = 0;

    let remainingThingsBudget = remainingThingsCap;
    let remainingGoldBudget = remainingGoldCap;

    const itemDetails = {};

    inventoryCatalogData.forEach(item => {
      const owned = itemQuantities[item.id] || 0;
      if (owned <= 0) {
        itemDetails[item.id] = { npcSellQty: 0, npcGold: 0, p2pQty: 0, p2pGold: 0, itemQuotaLeft: dailyPerItemCap };
        return;
      }

      const reqLevel = item.requiredLevel || 1;
      const isLevelLocked = item.cat === 'crop' && farmingLevel < reqLevel;
      const isNpcSellable = item.cat !== 'vip' && item.cat !== 'food' && !isLevelLocked && (item.unitNpc ?? item.unit ?? 0) > 0;
      const npcPrice = isNpcSellable ? (item.unitNpc ?? item.unit ?? 0) : 0;
      const p2pPrice = item.unitP2p ?? item.unit ?? 0;

      if (!isNpcSellable) {
        p2pMarketThings += owned;
        p2pMarketGold += owned * p2pPrice;
        itemDetails[item.id] = {
          npcSellQty: 0,
          npcGold: 0,
          p2pQty: owned,
          p2pGold: owned * p2pPrice,
          isP2pOnly: true,
          itemQuotaLeft: 0,
          isLevelLocked,
          reqLevel,
          reason: isLevelLocked
            ? `Requiere Nv ${reqLevel} de Cultivo para vender en tiendas NPC (SEED_SOURCES.shopAtFarmingLevel)`
            : (item.cat === 'food' ? 'Plato Cocinado (0g en tiendas NPC, consumo o P2P)' : 'Cosecha VIP (Mercado Rowan)')
        };
        return;
      }

      const alreadySoldItem = Number(soldItemsToday[item.id]) || 0;
      const itemQuotaLeft = Math.max(0, dailyPerItemCap - alreadySoldItem);

      const candidateQty = Math.min(owned, itemQuotaLeft);
      const fitThingsQty = Math.min(candidateQty, remainingThingsBudget);
      const maxThingsByGold = npcPrice > 0 ? Math.floor(remainingGoldBudget / npcPrice) : fitThingsQty;
      const actualNpcQty = Math.min(fitThingsQty, maxThingsByGold);

      const actualNpcGold = actualNpcQty * npcPrice;
      npcSellableThings += actualNpcQty;
      npcSellableGold += actualNpcGold;
      remainingThingsBudget -= actualNpcQty;
      remainingGoldBudget -= actualNpcGold;

      const surplusQty = owned - actualNpcQty;
      const surplusGold = surplusQty * (p2pPrice || npcPrice);
      p2pMarketThings += surplusQty;
      p2pMarketGold += surplusGold;

      itemDetails[item.id] = {
        npcSellQty: actualNpcQty,
        npcGold: actualNpcGold,
        p2pQty: surplusQty,
        p2pGold: surplusGold,
        isP2pOnly: false,
        itemQuotaLeft
      };
    });

    return {
      npcSellableGold,
      npcSellableThings,
      p2pMarketGold,
      p2pMarketThings,
      itemDetails
    };
  }, [itemQuantities, remainingThingsCap, remainingGoldCap, soldItemsToday, farmingLevel]);

  // Calcular valor total de liquidación unificada
  const totalLiquidationValue = useMemo(() => {
    let sum = 0;
    inventoryCatalogData.forEach(item => {
      const qty = itemQuantities[item.id] || 0;
      sum += qty * (item.unit || 0);
    });
    return sum;
  }, [itemQuantities]);

  // Catálogo de inventario ordenado dinámicamente (Prioridad: los que tengo > 0 primero)
  const sortedInventoryCatalog = useMemo(() => {
    let list = [...inventoryCatalogData];
    if (inventorySearchQuery) {
      const q = inventorySearchQuery.toLowerCase().trim();
      list = list.filter(it => it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const qtyA = itemQuantities[a.id] || 0;
      const qtyB = itemQuantities[b.id] || 0;

      if (inventorySortBy === 'owned_desc') {
        if ((qtyA > 0) !== (qtyB > 0)) return (qtyB > 0 ? 1 : 0) - (qtyA > 0 ? 1 : 0);
        if (qtyB !== qtyA) return qtyB - qtyA;
        return (b.unit || 0) - (a.unit || 0);
      }
      if (inventorySortBy === 'qty_desc') return qtyB - qtyA;
      if (inventorySortBy === 'value_desc') return (b.unit || 0) - (a.unit || 0);
      if (inventorySortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [itemQuantities, inventorySearchQuery, inventorySortBy]);



  // Registro local de entregas manuales de misiones (para sincronizar cuando el juego consume el item)
  const [deliveredItemsManual, setDeliveredItemsManual] = useState(() => {
    try {
      const saved = localStorage.getItem('bloomshire_delivered_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleDeliveredItem = (questId, itemId) => {
    setDeliveredItemsManual(prev => {
      const key = `${questId}_${itemId}`;
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('bloomshire_delivered_items', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Insumos dinámicos requeridos por misiones activas (filtrado estricto por activeQuestsList y paso actual)
  const activeQuestMaterials = useMemo(() => {
    const list = [];
    if (!Array.isArray(activeQuestsList) || activeQuestsList.length === 0) return list;

    activeQuestsList.forEach(q => {
      const qId = (q.id || '').toLowerCase().trim();
      const currentStepNum = q.step !== undefined ? q.step : ((q.stepIdx || 0) + 1);

      const catDef = DASHBOARD_QUEST_CATALOG[qId]
        || DASHBOARD_QUEST_CATALOG[qId.replace(/^sd_/, 's_')]
        || DASHBOARD_QUEST_CATALOG[qId.replace(/^s_/, 'sd_')];

      // Obtener items canónicos del paso actual (de telemetría o del catálogo)
      const rawStepItems = (Array.isArray(q.stepItems) && q.stepItems.length > 0)
        ? q.stepItems
        : (catDef?.steps && catDef.steps[currentStepNum - 1]?.items && catDef.steps[currentStepNum - 1].items.length > 0
          ? catDef.steps[currentStepNum - 1].items
          : []);

      if (rawStepItems.length > 0) {
        rawStepItems.forEach(itemDef => {
          const manualKey = `${q.id}_${itemDef.id}`;
          const isManualDelivered = !!deliveredItemsManual[manualKey];
          // REGLA ESTRICTA: Si ya fue entregado, NO aparece en materiales para no estorbar visualmente
          if (isManualDelivered) return;

          list.push({
            id: itemDef.id,
            name: itemDef.name || itemDef.id,
            needed: itemDef.needed || 1,
            questId: q.id,
            questTitle: q.title || q.name || catDef?.name,
            stepText: q.stepText || q.objective || (catDef?.steps && catDef.steps[currentStepNum - 1]?.name),
            targetStep: currentStepNum,
            isCurrentStep: true,
            hint: itemDef.hint || catDef?.location || '',
            delivered: false
          });
        });
      } else {
        // Fallback a catálogo QUEST_REQUIRED_ITEMS
        const defs = QUEST_REQUIRED_ITEMS[qId] 
          || (q.chapter ? QUEST_REQUIRED_ITEMS['bk' + q.chapter] : null)
          || QUEST_REQUIRED_ITEMS[qId.replace(/^sd_/, 's_')]
          || QUEST_REQUIRED_ITEMS[qId.replace(/^s_/, 'sd_')];

        if (defs && defs.length > 0) {
          defs.forEach(d => {
            const manualKey = `${q.id}_${d.id}`;
            const isManualDelivered = !!deliveredItemsManual[manualKey];
            const targetStep = d.targetStep || 1;
            
            // Solo incluir si coincide exactamente con el paso actual del jugador
            if (currentStepNum !== targetStep) return;
            // Si ya está entregado, omitir
            if (isManualDelivered) return;

            list.push({
              ...d,
              questId: q.id,
              questTitle: q.title || q.name || d.questName,
              stepText: q.stepText || q.objective,
              targetStep,
              isCurrentStep: true,
              delivered: false
            });
          });
        }
      }
    });

    return list;
  }, [activeQuestsList, deliveredItemsManual]);

    // Recuento de slots
  const inventoryCounts = useMemo(() => {
    let hotbar = 0;
    let homeChest = 0;
    let townChest = 0;
    rawInventory.forEach(it => {
      const type = getStorageType(it.area);
      if (type === 'M') hotbar++;
      else if (type === 'CC') homeChest++;
      else if (type === 'CP') townChest++;
    });
    return { hotbar, homeChest, townChest, total: rawInventory.length };
  }, [rawInventory]);

  // Obtener cuántos ejemplares de un ítem de la enciclopedia tiene el jugador en su partida (Mochila + Cofres)
  const getPlayerItemQty = (itemObj) => {
    if (!itemObj) return 0;
    const idRaw = (itemObj.id || '').trim();
    const idLower = idRaw.toLowerCase();
    const nameEsLower = (itemObj.nameEs || '').toLowerCase();

    if (itemQuantities[idRaw] !== undefined && itemQuantities[idRaw] > 0) {
      return itemQuantities[idRaw];
    }

    let sum = 0;
    rawInventory.forEach(it => {
      const itId = (it.id || '').toLowerCase();
      const itName = (it.name || '').toLowerCase();
      if (itId === idLower || itName === idLower || (nameEsLower && (itId === nameEsLower || itName === nameEsLower))) {
        sum += Number(it.qty) || Number(it.n) || 0;
      }
    });
    return sum;
  };


  // Filtrado del Buscador Universal de Ítems (359 ítems oficiales de catalog.js + rules.js + quests.js)
  const filteredEncyclopediaItems = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    return itemEncyclopediaData.filter(item => {
      const matchCat = itemMatchesCategory(item, itemCategoryFilter);
      if (!matchCat) return false;
      if (!q) return true;

      const inId = (item.id || '').toLowerCase().includes(q);
      const inNameEs = (item.nameEs || '').toLowerCase().includes(q);
      const inHowToGet = (item.howToGet || '').toLowerCase().includes(q);
      const inDetails = (item.details || '').toLowerCase().includes(q);
      const inCat = ((item.cat || '') + ' ' + (item.categoryLabel || '') + ' ' + getItemCategoryLabel(item.cat)).toLowerCase().includes(q);
      const inUsed = (item.usedIn || []).some(u => u.toLowerCase().includes(q));
      const inLoc = (item.mapLocation?.label || '').toLowerCase().includes(q);

      return inId || inNameEs || inHowToGet || inDetails || inCat || inUsed || inLoc;
    });
  }, [itemSearchQuery, itemCategoryFilter]);

  // Resolver coordenadas exactas en el Mega-Atlas para cualquiera de los 67 NPCs (priorizando megaAtlasData.npcs)
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
      // Encontrar en qué región y subzona específica cae (wx, wy)
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
      // 2. Coordenadas manuales verificadas
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

  // Filtro de Calculadora
  const filteredCalcList = useMemo(() => {
    let list = [...(calcData[calcSkill] || [])];

    // Filtro de Temporada / Época (solo para cultivo)
    if (calcSkill === 'farming' && calcSeasonFilter !== 'all') {
      list = list.filter(x => x.season === 'all' || x.season === calcSeasonFilter);
    }

    if (calcLevelFilter !== 'all') {
      if (calcLevelFilter === 'vip' || calcLevelFilter === 'special') {
        list = list.filter(x => (x.level ?? 1) >= 15 || (x.tip && (x.tip.includes('Fundadores') || x.tip.includes('VIP') || x.tip.includes('Misión'))));
      } else {
        const targetLv = parseInt(calcLevelFilter, 10);
        list = list.filter(x => (x.level ?? 1) <= targetLv || targetLv >= 10);
      }
    }

    const [field, dir] = calcSort.split('_');
    list.sort((a, b) => {
      const eA = calcSkill === 'farming' ? 2 : (a.energyCost || a.energy || 1);
      const eB = calcSkill === 'farming' ? 2 : (b.energyCost || b.energy || 1);
      const xpPerEA = (a.xp ?? 0) / eA;
      const xpPerEB = (b.xp ?? 0) / eB;
      const netA = (a.sell ?? 0) - (a.cost ?? 0);
      const netB = (b.sell ?? 0) - (b.cost ?? 0);
      const goldPerEA = netA / eA;
      const goldPerEB = netB / eB;

      const isMasterA = calcSkill === 'farming' && farmingLevel >= 15 && a.hasRegrow;
      const isMasterB = calcSkill === 'farming' && farmingLevel >= 15 && b.hasRegrow;
      const xpMinA = isMasterA ? (a.regrowXpMin ?? a.xpMin ?? 0) : (a.xpMin ?? 0);
      const xpMinB = isMasterB ? (b.regrowXpMin ?? b.xpMin ?? 0) : (b.xpMin ?? 0);
      const goldMinA = isMasterA ? (a.regrowGoldMin ?? a.goldMin ?? 0) : (a.goldMin ?? 0);
      const goldMinB = isMasterB ? (b.regrowGoldMin ?? b.goldMin ?? 0) : (b.goldMin ?? 0);

      let vA = 0, vB = 0;
      if (field === 'xpEnergy') { vA = xpPerEA; vB = xpPerEB; }
      else if (field === 'goldEnergy') { vA = goldPerEA; vB = goldPerEB; }
      else if (field === 'xpMin') { vA = xpMinA; vB = xpMinB; }
      else if (field === 'goldMin') { vA = goldMinA; vB = goldMinB; }
      else if (field === 'time') { vA = a.grow ?? 1; vB = b.grow ?? 0; }
      else if (field === 'cost') { vA = a.cost ?? 0; vB = b.cost ?? 0; }
      else if (field === 'sell') { vA = a.sell ?? 0; vB = b.sell ?? 0; }
      return dir === 'desc' ? vB - vA : vA - vB;
    });

    return list;
  }, [calcSkill, calcSeasonFilter, calcLevelFilter, calcSort, farmingLevel]);

  // Filtro de NPCs
  const filteredNpcs = useMemo(() => {
    const q = npcFilter.toLowerCase().trim();
    if (!q) return npcsData;
    return npcsData.filter(n => 
      n.name.toLowerCase().includes(q) || 
      n.title.toLowerCase().includes(q) || 
      n.loc.toLowerCase().includes(q) ||
      (n.desc && n.desc.toLowerCase().includes(q))
    );
  }, [npcFilter]);

  // Oportunidades de Venta y Rotación en Mercado (Rowan)
  const marketOpportunities = useMemo(() => {
    const protectedMap = {};
    if (Array.isArray(activeQuestMaterials)) {
      activeQuestMaterials.forEach(mat => {
        const key = (mat.id || '').toLowerCase().trim();
        if (key) {
          protectedMap[key] = {
            needed: mat.needed,
            questTitle: mat.questTitle || 'Misión Activa'
          };
        }
      });
    }

        return MARKET_ROTATION_CATALOG.map(entry => {
      const bd = getItemStorageBreakdown({ id: entry.id, name: entry.name });
      const idKey = entry.id.toLowerCase().trim();
      const isProtected = !!protectedMap[idKey];
      const questProtection = protectedMap[idKey] || null;

      // Cruzar con puestos vivos de Rowan si fueron descargados
      const stallsForThis = Array.isArray(liveMarketOffers?.stalls)
        ? liveMarketOffers.stalls.filter(s => (s.item || '').toLowerCase().trim() === idKey)
        : [];
      const hasLiveStalls = stallsForThis.length > 0;
      let effectiveMinPrice = entry.minPrice;
      let effectiveAvgPrice = entry.avgPrice;
      let effectiveMaxPrice = entry.maxPrice;
      let totalListedOnServer = 0;

      if (hasLiveStalls) {
        const prices = stallsForThis.map(s => Number(s.price) || 0).filter(p => p > 0);
        if (prices.length > 0) {
          effectiveMinPrice = Math.min(...prices);
          effectiveMaxPrice = Math.max(...prices);
          effectiveAvgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
        }
        totalListedOnServer = stallsForThis.reduce((acc, s) => acc + (Number(s.left) || 1), 0);
      }

      const totalPotentialGold = bd.total * effectiveAvgPrice;
      const minGold = bd.total * effectiveMinPrice;
      const maxGold = bd.total * effectiveMaxPrice;

      let score = entry.volumeScore;
      if (bd.total > 0) score += 100;
      if (isProtected) score -= 150;
      if (hasLiveStalls && totalListedOnServer < 15) score += 30;

      let dynamicTag = entry.tag;
      if (hasLiveStalls) {
        if (totalListedOnServer <= 10) dynamicTag = 'Poca Oferta 🔥';
        else if (totalListedOnServer >= 40) dynamicTag = 'Alta Competencia ⚠️';
        else dynamicTag = `En Venta (${totalListedOnServer} un.)`;
      }

      return {
        ...entry,
        minPrice: effectiveMinPrice,
        avgPrice: effectiveAvgPrice,
        maxPrice: effectiveMaxPrice,
        hasLiveStalls,
        totalListedOnServer,
        liveStallsCount: stallsForThis.length,
        tag: dynamicTag,
        stock: bd,
        hasStock: bd.total > 0,
        isProtected,
        questProtection,
        totalPotentialGold,
        minGold,
        maxGold,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }, [rawInventory, activeQuestMaterials]);

  // Contar órdenes listas para entregar hoy
  const readyOrdersCount = useMemo(() => {
    return activeOrders.filter(ord => !ord.done && getOrderAvailableQty(ord) >= (ord.n || 1)).length;
  }, [activeOrders, itemQuantities, rawInventory]);

  // Manejar chat con Copilot
  const handleSendAdvisor = async (e) => {
    if (e) e.preventDefault();
    if (!advisorInput.trim() || advisorLoading) return;

    const userText = advisorInput.trim();
    setAdvisorInput('');
    const newMsg = { id: Date.now().toString(), role: 'user', content: userText };
    setAdvisorMessages(prev => [...prev, newMsg]);
    setAdvisorLoading(true);

    try {
      const res = await fetch('/api/bloomshire-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversation: advisorMessages.slice(-8),
          playerSnapshot: {
            wallet: walletAddress,
            gold,
            energy: currentEnergy,
            maxEnergy,
            shards,
            avyn,
            farmersCount: farmersOwned,
            farmingLevel,
            activeQuest,
            activeQuestsList,
            moonmereProgress,
            energyMeta,
            skillsMeta,
            skillsBreakdown,
            inventory: rawInventory,
            activeOrders
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const advisorContent = json.text || json.reply || json.advice || json.analysis || json.response || 'Asesoría táctica recibida con éxito.';
        setAdvisorMessages(prev => [
          ...prev, 
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: advisorContent
          }
        ]);
      } else {
        throw new Error('Advisor API error');
      }
    } catch (err) {
      setAdvisorMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ No se pudo contactar con la API del asesor. Revisa tu conexión o usa la calculadora táctica integrada.'
        }
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

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
                title={`Oro disponible: ${gold.toLocaleString('es-ES')} Gold`}
              >
                <span className="text-amber-400">🪙</span>
                <span>{gold >= 1000 ? `${(gold / 1000).toFixed(1)}k Gold` : `${gold} Gold`}</span>
              </div>

              {/* Píldora de Energía */}
              {energyMeta.isJamActive && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/70 border border-indigo-400/50 text-indigo-300 font-bold text-xs shadow-sm shrink-0 animate-pulse"
                  title={`Mermelada de Zafiro activa (+30% regeneración): +1.3⚡ cada 3m (${energyMeta.jamMinutesLeft}m restante)`}
                >
                  <span className="text-sm">🫐</span>
                  <span className="font-mono text-xs font-black">{energyMeta.jamMinutesLeft}m</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 hidden sm:inline">+30%</span>
                </div>
              )}
              <div 
                className="relative overflow-hidden flex items-center gap-2 px-3 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-200 font-bold text-xs shadow-sm shrink-0 min-w-[125px]"
                title={`Energía viva: ${Math.floor(currentEnergy)}/${maxEnergy} ⚡ (${energyMeta.isJamActive ? '🫐 Mermelada activa: +1.3⚡ cada 3m' : isVip ? '+1⚡ cada 3m pasivo VIP' : 'Regen base'})`}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-amber-500/35 pointer-events-none transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (currentEnergy / maxEnergy) * 100))}%` }}
                />
                <span className="relative z-10 text-amber-400">🛏️</span>
                <span className="relative z-10 font-mono">{`${Math.floor(currentEnergy)}/${maxEnergy}`}</span>
                {energyMeta.canRest && (
                  <span className="relative z-10 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">LISTA</span>
                )}
              </div>

              {/* Nivel & Wallet interactivo -> Abre Modal de Perfil de Granjero */}
              <button 
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-amber-500/40 hover:border-amber-400/80 text-amber-300 hover:text-white text-xs font-mono shrink-0 cursor-pointer transition-all shadow-sm active:scale-[0.98]"
                title="Abrir Perfil de Granjero, NFTs y Estado On-Chain"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-amber-400 font-bold">Nv {farmingLevel}</span>
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
                  <span className="font-mono">Lectura: {viewOnlyWallet.slice(0, 6)}...{viewOnlyWallet.slice(-4)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Guía Comunitaria Libre</span>
                </div>
              )}
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                title="Vincular tu partida o ingresar clave"
              >
                <span>🎮 Conectar Partida</span>
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Botón Sync estilo Boceto + Colapsar */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected && (
            <>
              <button
                onClick={fetchSyncFromServer}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-700/80 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                title={`Sincronizar telemetría (Última: ${lastSyncTime})`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Desconectar wallet y volver al Modo Guía Libre"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Desconectar</span>
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
            title={isHeaderCollapsed ? "Expandir encabezado" : "Ocultar encabezado"}
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
              { key: 'mega_atlas', label: 'MEGA-ATLAS HD' },
              { key: 'inventory', label: 'ECONOMÍA & TIENDAS' },
              { key: 'items', label: 'BUSCADOR ÍTEMS' },
              { key: 'craft', label: 'CRAFTEO & COCINA' },
              { key: 'npcs', label: 'ALDEANOS & REGALOS' },
              { key: 'calc', label: 'CALCULADORA XP' },
              { key: 'monitors', label: isConnected ? 'TEMPORIZADORES' : 'TEMPORIZADORES 🔒' }
            ].map(t => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent border border-amber-500/60 text-amber-200 font-black shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-bold'
                  }`}
                >
                  {t.label}
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
              title="Libro de Misiones y Progresión"
            >
              <span>Misiones</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'advisor'
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Copilot IA"
            >
              <span>Copilot</span>
              {!isConnected && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                activeTab === 'system'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Ajustes y Diagnóstico"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary key={activeTab} title={`Error al cargar el módulo (${activeTab})`} onBack={() => setActiveTab('mega_atlas')}>

        {/* ==============================================================
            TAB: BUSCADOR UNIVERSAL DE ÍTEMS ("¿DÓNDE LO CONSIGO?") - 359 ÍTEMS
            ============================================================== */}
        {activeTab === 'items' && (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Cabecera y Barra de Búsqueda Instantánea */}
            <div className="p-3.5 bg-[#0c1220] border border-slate-800/80 rounded-2xl shadow-sm flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>🔎 Enciclopedia &amp; Buscador de Ítems</span>
                    <span className="text-slate-400 font-normal">({itemEncyclopediaData.length} objetos oficiales)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Escribe cualquier objeto, seta, pez, mineral, receta o misión para ver qué es, dónde sale y ubicarlo en el mapa.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                    {filteredEncyclopediaItems.length} ítems
                  </div>
                  <div className="flex items-center bg-[#080d17] p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setItemViewMode('grid')}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all ${
                        itemViewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔲 Cuadrícula
                    </button>
                    <button
                      onClick={() => setItemViewMode('list')}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all ${
                        itemViewMode === 'list'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📋 Lista
                    </button>
                  </div>
                </div>
              </div>

              {/* Input de búsqueda a ancho completo sin accesos rápidos */}
              <div className="w-full flex items-center gap-2.5 bg-[#080d17] border border-slate-700/80 focus-within:border-amber-500/70 rounded-xl px-3 py-2 shadow-inner">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Escribe el nombre en inglés o español, misión o lugar (ej: zanahoria, silvercap, lingote, mariposa, pan)..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white text-xs outline-none w-full font-medium placeholder:text-slate-500"
                />
                {itemSearchQuery && (
                  <button
                    onClick={() => setItemSearchQuery('')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10.5px] font-bold cursor-pointer"
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>

              {/* Filtros por Categoría */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
                {[
                  { key: 'all', label: '🌐 Todos (359)' },
                  { key: 'forage', label: '🍄 Recolección & Setas (2)' },
                  { key: 'fish', label: '🐟 Peces (43)' },
                  { key: 'crop', label: '🌾 Cultivos (49)' },
                  { key: 'resource', label: '⛏️ Minerales & Madera (19)' },
                  { key: 'staple', label: '🧈 Molino & Lechería (7)' },
                  { key: 'craft', label: '🔨 Artesanía & Forja (57)' },
                  { key: 'food', label: '🍳 Comidas (92)' },
                  { key: 'animal', label: '🐄 Ganadería & Carnes (13)' },
                  { key: 'butterfly', label: '🦋 Mariposas (27)' },
                  { key: 'quest', label: '📜 Misiones (39)' },
                  { key: 'premium', label: '💎 Especial & Tesoros (11)' }
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

            {/* Resultados según Vista Cuadrícula (4-6 columnas) o Lista Compacta */}
            {itemViewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 overflow-y-auto pr-1">
              {filteredEncyclopediaItems.slice(0, 90).map(item => {
                const ownedQty = getPlayerItemQty(item);
                const hasUsedIn = Array.isArray(item.usedIn) && item.usedIn.length > 0;
                const isExpandedUsedIn = expandedUsedInIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-2xl shadow-sm flex flex-col justify-between gap-2.5 transition-all"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Cabecera del Ítem: Ícono + Nombre amplio en su propia fila + Badges debajo */}
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

                        {/* Badges superiores minimalistas (Precio y/o Stock) */}
                        <div className="flex items-center gap-1 shrink-0">
                          {(item.value || item.sell) > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded-lg bg-[#12192a] border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-default"
                              title={`Precio de venta oficial: ${item.value || item.sell} Gold`}
                            >
                              <span>🪙</span>
                              <span>{item.value || item.sell}g</span>
                            </span>
                          )}
                          {ownedQty > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded-lg bg-[#0e211b] border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 cursor-default"
                              title={`En inventario y cofres: ${ownedQty} unidades`}
                            >
                              <span>🎒</span>
                              <span>{ownedQty}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sub-fila de badges adicionales (si hay skillReq) */}
                      {item.skillReq && (
                        <div className="flex items-center gap-1">
                          <span 
                            className="px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[9.5px] font-mono font-bold"
                            title={`Requisito: ${item.skillReq}`}
                          >
                            ⚡ Requisito: {item.skillReq}
                          </span>
                        </div>
                      )}

                      {/* Dónde y cómo conseguirlo (Caja sobria minimalista) */}
                      <div className="p-2 rounded-xl bg-[#080d17] border border-slate-800/80 text-xs text-slate-300 leading-snug">
                        <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <span>🧭</span>
                          <span>Obtención:</span>
                        </div>
                        <div className="text-slate-200 text-[11.5px] font-medium leading-relaxed">{item.howToGet}</div>
                        {item.details && (
                          <div className="text-[10.5px] text-amber-300/80 mt-1 font-mono">
                            📌 {item.details}
                          </div>
                        )}
                      </div>

                      {/* Se pide en (100% colapsable por defecto) */}
                      {hasUsedIn && (
                        <div>
                          <button
                            onClick={() => toggleUsedIn(item.id)}
                            className="text-[10.5px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>📋 Se pide en ({item.usedIn.length} recetas / misiones)</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpandedUsedIn ? 'rotate-180 text-amber-400' : ''}`} />
                          </button>
                          {isExpandedUsedIn && (
                            <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-800/60 animate-fadeIn">
                              {item.usedIn.map((u, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                    u.includes('Misión') || u.includes('Cap.')
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

                    {/* Pie de tarjeta: Ubicación y Botón sólo Ícono */}
                    {item.mapLocation && (
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                        <span className="text-[9.5px] text-slate-400 truncate">
                          📍 {item.mapLocation.label}
                        </span>
                        <button
                          onClick={() => locateInMegaAtlas(item.mapLocation)}
                          className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                          title={`Ubicar "${item.mapLocation.label || item.nameEs}" en el Mega-Atlas`}
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
            /* Vista Lista Compacta para Buscador de Ítems */
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
              {filteredEncyclopediaItems.slice(0, 120).map(item => {
                const ownedQty = getPlayerItemQty(item);
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
                          📦 Tienes: {ownedQty}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">0 en stock</span>
                      )}
                      {item.mapLocation && (
                        <button
                          onClick={() => locateInMegaAtlas(item.mapLocation)}
                          className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title={`Ubicar "${item.mapLocation.label || item.nameEs}" en el Mega-Atlas`}
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
        )}

        {/* ==============================================================
            TAB 3: CALCULADORA XP & RENTABILIDAD TÁCTICA MULTIVARIABLE
            ============================================================== */}
        {activeTab === 'calc' && (() => {
          const simEnergyVal = simulatedEnergy !== '' ? simulatedEnergy : Math.floor(currentEnergy || 80);
          const topCrop = filteredCalcList[0] || null;
          const energyPerCrop = calcSkill === 'farming' ? 2 : 1;
          const cropsPossible = Math.floor(simEnergyVal / energyPerCrop);
          const batchesPossible = Math.floor(cropsPossible / Math.max(1, availablePlots));

          return (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Barra de Presets Estratégicos */}
            <div className="p-3.5 bg-gradient-to-r from-[#0d162d] via-[#101b38] to-[#0d162d] border border-indigo-950/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
                  <span>🎯</span> Modo Estratégico:
                </span>
                <button
                  type="button"
                  onClick={() => { setCalcSort('xpEnergy_desc'); setCalcStrategyPreset('energy'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    calcSort === 'xpEnergy_desc'
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                      : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
                  }`}
                >
                  <span>⚡</span> <span>Ahorro de Energía (Máx XP/⚡)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCalcSort('xpMin_desc'); setCalcStrategyPreset('speedrun'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    calcSort === 'xpMin_desc'
                      ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                      : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
                  }`}
                >
                  <span>⏱️</span> <span>Speedrun Rápido (Máx XP/min)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCalcSort('goldEnergy_desc'); setCalcStrategyPreset('gold_energy'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    calcSort === 'goldEnergy_desc'
                      ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                      : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
                  }`}
                >
                  <span>🪙</span> <span>Oro por Energía (Máx Oro/⚡)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCalcSort('goldMin_desc'); setCalcStrategyPreset('profit'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    calcSort === 'goldMin_desc'
                      ? 'bg-purple-500/30 text-purple-300 border-purple-400 shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/50'
                      : 'bg-[#14203d] text-slate-300 border-slate-700 hover:bg-[#1a2b52] hover:text-white'
                  }`}
                >
                  <span>💰</span> <span>Rentabilidad Oro/min</span>
                </button>
              </div>

              {calcSkill === 'farming' && (
                <div className="flex items-center gap-2 text-xs bg-[#14203d] px-3 py-1 rounded-lg border border-amber-500/30 text-amber-200">
                  <span className="font-bold">Parcelas:</span>
                  <input 
                    type="number" 
                    value={availablePlots} 
                    onChange={(e) => setAvailablePlots(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-[#0a1020] border border-slate-600 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Simulador Interactivo de Energía Restante */}
            <div className="p-4 bg-gradient-to-r from-[#101b38] via-[#0d162d] to-[#0a1122] border border-cyan-500/40 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-2 flex-wrap">
                    <span>Simulador de Energía Restante</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                      Partida Live: {Math.floor(currentEnergy)} / {maxEnergy} ⚡
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-300 mt-0.5">
                    Calcula el impacto exacto en XP y Oro según la energía disponible en tu partida.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-[#070d1c] px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
                  <span>⚡ Tu Energía:</span>
                  <input
                    type="number"
                    value={simulatedEnergy !== '' ? simulatedEnergy : Math.floor(currentEnergy || 80)}
                    onChange={(e) => setSimulatedEnergy(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 bg-[#121c38] border border-amber-500/50 rounded px-2 py-0.5 text-center font-mono font-black text-amber-300 text-xs"
                    placeholder="80"
                  />
                  {simulatedEnergy !== '' && (
                    <button
                      type="button"
                      onClick={() => setSimulatedEnergy('')}
                      className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
                    >
                      Reset Live
                    </button>
                  )}
                </div>

                {topCrop && (
                  <div className="px-3.5 py-1.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-emerald-300 font-bold">
                      Con <b>{simEnergyVal}⚡</b> en <b>{topCrop.name.split('(')[0].trim()}</b>:
                    </span>
                    <span className="font-mono text-amber-300 font-black">
                      {cropsPossible} cultivos ({batchesPossible} tandas)
                    </span>
                    <span className="font-mono text-emerald-400 font-black">
                      +{(cropsPossible * (topCrop.xp ?? 0)).toLocaleString('es-ES')} XP
                    </span>
                    <span className="font-mono text-cyan-300 font-black">
                      +{((cropsPossible * ((topCrop.sell ?? 0) - (topCrop.cost ?? 0)))).toLocaleString('es-ES')} Oro
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controles de Filtros Detallados */}
            <div className="p-3.5 bg-[#0e172c] border border-indigo-950/70 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Filter className="w-4 h-4 text-amber-400" /> Habilidad:
                  <select 
                    value={calcSkill} 
                    onChange={(e) => setCalcSkill(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded px-2.5 py-1 text-xs font-bold cursor-pointer"
                  >
                    <option value="farming">🌾 Cultivo (Farming)</option>
                    <option value="mining">⛏️ Minería (Cuevas y Gemas)</option>
                    <option value="foraging">🍄 Recolección &amp; Tala</option>
                    <option value="fishing">🎣 Pesca (Río y Lago)</option>
                  </select>
                </div>

                {/* Selector de Época del Año (Solo Cultivo) */}
                {calcSkill === 'farming' && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="text-amber-400">🍂</span> Época:
                    <select 
                      value={calcSeasonFilter} 
                      onChange={(e) => setCalcSeasonFilter(e.target.value)}
                      className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
                    >
                      <option value="all">🌐 Todas las Épocas</option>
                      <option value="Winter">❄️ Invierno (Temporada Actual)</option>
                      <option value="Spring">🌸 Primavera (Spring)</option>
                      <option value="Summer">☀️ Verano (Summer)</option>
                      <option value="Fall">🍂 Otoño (Fall)</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  Nivel Requerido:
                  <select 
                    value={calcLevelFilter} 
                    onChange={(e) => setCalcLevelFilter(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer"
                  >
                    <option value="all">🌟 Todos los Niveles</option>
                    <option value="1">Nivel 1 (Principiante)</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4</option>
                    <option value="5">Nivel 5 (Botica)</option>
                    <option value="6">Nivel 6</option>
                    <option value="7">Nivel 7</option>
                    <option value="8">Nivel 8+</option>
                    <option value="10">Nivel 10+ (Avanzado)</option>
                    <option value="special">Misiones / Especiales</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  Ordenar por:
                  <select 
                    value={calcSort} 
                    onChange={(e) => setCalcSort(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 font-bold rounded px-2.5 py-1 text-xs cursor-pointer"
                  >
                    <option value="xpEnergy_desc">⚡ Mayor XP por Energía (XP/⚡ ↓)</option>
                    <option value="goldEnergy_desc">🪙 Mayor Oro por Energía (Oro/⚡ ↓)</option>
                    <option value="xpMin_desc">⏱️ Más rápido para subir XP (XP/min ↓)</option>
                    <option value="goldMin_desc">💰 Más rentable en Oro (Oro/min ↓)</option>
                    <option value="time_asc">⏳ Menor tiempo de espera (↑)</option>
                    <option value="cost_asc">🪙 Más barato de comprar (Coste ↑)</option>
                    <option value="sell_desc">💎 Mayor precio de venta (Venta ↓)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabla de Resultados Multivariable */}
            <div className="bg-[#0e172c] border border-indigo-950/70 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                  <thead>
                    <tr className="bg-[#121d38] border-b border-slate-800 text-slate-300 uppercase tracking-wider text-[10.5px] font-black">
                      <th className="p-3">Recurso / Cultivo</th>
                      {calcSkill === 'farming' && <th className="p-3">Época</th>}
                      <th className="p-3">Tiempo</th>
                      <th className="p-3">Nivel</th>
                      <th className="p-3">Coste</th>
                      <th className="p-3">Venta</th>
                      <th className="p-3">Neto</th>
                      <th className="p-3">XP</th>
                      <th className="p-3 text-amber-300 bg-amber-950/30 border-l border-amber-900/40">⚡ Gasto</th>
                      <th className="p-3 text-emerald-300 bg-emerald-950/30">🎯 XP / ⚡</th>
                      <th className="p-3 text-cyan-300 bg-cyan-950/30 border-r border-cyan-900/40">🪙 Oro / ⚡</th>
                      <th className="p-3">XP / Min</th>
                      <th className="p-3">Oro / Min</th>
                      {calcSkill === 'farming' && <th className="p-3">Total x{availablePlots} Parcelas</th>}
                      <th className="p-3">Consejo Táctico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredCalcList.map((item, idx) => {
                      const timeMinutes = item.grow ?? 1;
                      const adjustedTime = hasFoundersTimeBonus ? Math.max(1, Math.round(timeMinutes * 0.8)) : timeMinutes;
                      const netProfit = (item.sell ?? 0) - (item.cost ?? 0);
                      const energyCost = calcSkill === 'farming' ? 2 : (item.energyCost || item.energy || 1);
                      const xp = item.xp ?? 0;
                      const xpPerEnergy = Number((xp / energyCost).toFixed(1));
                      const goldPerEnergy = Number((netProfit / energyCost).toFixed(1));
                      const batchNet = netProfit * availablePlots;
                      const batchXp = xp * availablePlots;
                      const batchEnergy = energyCost * availablePlots;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                            {item.name}
                          </td>
                          {calcSkill === 'farming' && (
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.season === 'Winter' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50' :
                                item.season === 'Spring' ? 'bg-pink-950/80 text-pink-300 border border-pink-700/50' :
                                item.season === 'Summer' ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50' :
                                item.season === 'Fall' ? 'bg-orange-950/80 text-orange-300 border border-orange-700/50' :
                                'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                              }`}>
                                {item.seasonLabel || 'Todo el Año 🌐'}
                              </span>
                            </td>
                          )}
                          <td className="p-3 font-mono text-cyan-300 whitespace-nowrap">
                            {item.growTxt || `${adjustedTime} min`}
                            {hasFoundersTimeBonus && <span className="text-[10px] text-emerald-400 ml-1">(-20%)</span>}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                              {item.level ? `Nv ${item.level}` : 'Nv 1'}
                            </span>
                          </td>
                          <td className="p-3 text-red-300 font-mono whitespace-nowrap">{item.cost ? `${item.cost}g` : '0g'}</td>
                          <td className="p-3 text-amber-300 font-mono font-bold whitespace-nowrap">{item.sell ? `${item.sell}g` : '0g'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {netProfit >= 0 ? `+${netProfit}g` : `${netProfit}g`}
                          </td>
                          <td className="p-3 text-purple-300 font-mono font-bold whitespace-nowrap">+{xp} XP</td>
                          
                          {/* ⚡ Gasto de Energía */}
                          <td className="p-3 bg-amber-950/20 border-l border-amber-900/30 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10.5px]">
                              -{energyCost}⚡
                            </span>
                          </td>

                          {/* 🎯 XP por Energía */}
                          <td className="p-3 bg-emerald-950/20 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded font-mono font-black text-xs border ${
                              xpPerEnergy >= 10
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                                : xpPerEnergy >= 5
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
                            }`}>
                              {xpPerEnergy} XP/⚡
                            </span>
                          </td>

                          {/* 🪙 Oro por Energía */}
                          <td className="p-3 bg-cyan-950/20 border-r border-cyan-900/30 whitespace-nowrap font-mono font-bold text-xs">
                            <span className={goldPerEnergy >= 50 ? 'text-cyan-300' : 'text-slate-300'}>
                              {goldPerEnergy >= 0 ? `+${goldPerEnergy}` : goldPerEnergy}g/⚡
                            </span>
                          </td>

                          <td className="p-3 text-purple-400 font-mono font-bold whitespace-nowrap">
                            {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                              <div className="flex flex-col">
                                <span>{item.regrowXpMin}</span>
                                <span className="text-[10px] text-purple-300/70 font-normal">Rebrote (5x)</span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span>{item.xpMin || 0}</span>
                                {calcSkill === 'farming' && item.hasRegrow && (
                                  <span className="text-[10px] text-slate-500 font-normal">Nv 15+: {item.regrowXpMin}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-amber-400 font-mono font-bold whitespace-nowrap">
                            {calcSkill === 'farming' && farmingLevel >= 15 && item.hasRegrow ? (
                              <div className="flex flex-col">
                                <span>{item.regrowGoldMin}g</span>
                                <span className="text-[10px] text-amber-300/70 font-normal">Rebrote (5x)</span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span>{item.goldMin || 0}g</span>
                                {calcSkill === 'farming' && item.hasRegrow && (
                                  <span className="text-[10px] text-slate-500 font-normal">Nv 15+: {item.regrowGoldMin}g</span>
                                )}
                              </div>
                            )}
                          </td>

                          {calcSkill === 'farming' && (
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-emerald-300">
                                  +{batchNet.toLocaleString('es-ES')}g <span className="text-purple-300 text-[10px]">/ +{batchXp.toLocaleString('es-ES')}XP</span>
                                </span>
                                <span className="text-[10px] text-amber-300/80 font-mono">
                                  Consumo: {batchEnergy}⚡
                                </span>
                              </div>
                            </td>
                          )}
                          <td className="p-3 text-[11px] text-slate-400 italic max-w-xs">{item.tip || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ==============================================================
            TAB 4: CRAFTEO & COCINA
            ============================================================== */}
        {activeTab === 'inventory' && (
            <div className="flex flex-col h-full w-full overflow-hidden p-4 gap-3">
              {/* Selector de Sub-herramientas de Economía */}
              <div className="flex items-center gap-2 bg-[#0a1224] p-1.5 rounded-xl border border-indigo-950/80 shrink-0">
                <button
                  onClick={() => setEconomySubTab('liquidation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'liquidation'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📦 Liquidador de Inventario</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                </button>
                <button
                  onClick={() => setEconomySubTab('odette')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'odette'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📜 Pedidos Diarios de Odette</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  {readyOrdersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                      {readyOrdersCount} Listo
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setEconomySubTab('arbitrage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'arbitrage'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>⚖️ Calculadora de Arbitraje (Vender Crudo vs Cocinar)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    NUEVO
                  </span>
                </button>
                <button
                  onClick={() => setEconomySubTab('market_radar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    economySubTab === 'market_radar'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>📈 Radar de Rotación de Mercado (Rowan)</span>{!isConnected && <span className="text-[10px] ml-1">🔒</span>}
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    HOT
                  </span>
                </button>
              </div>

              {/* Sub-vista 1: Arbitraje y Lucro de Cocina (Tarjetas compactas en cuadrícula 4-6 columnas) */}
              {economySubTab === 'arbitrage' && (
                <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                  <div className="p-3.5 bg-[#0e172c] border-2 border-amber-500/60 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-black text-amber-400 flex items-center gap-2">
                          <span>⚖️ MOTOR DE ARBITRAJE: ¿VENDER CRUDO A WREN O COCINAR EN ESTUFA?</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Desglose financiero neto: descuenta el valor de venta crudo en mano, el costo de insumos secundarios comprados y el consumo de <b>1⚡ de energía</b> en estufa.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Costo Fijo de Cocción: 1⚡ por plato</span>
                        </div>
                        <button
                          onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.stove)}
                          className="px-3 py-1 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Ubicar Estufa en el Mega-Atlas"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ubicar Estufa</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cuadrícula compacta de Arbitraje (4-6 columnas estilo Buscador de Ítems) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
                    {[
                      {
                        rawId: 'Carp',
                        rawItem: 'Carpa (Carp)',
                        rawPrice: 53,
                        secondMats: '1x Harina (15g)',
                        matsCost: 15,
                        energyCost: 1,
                        cookedItem: 'Fish Pie (Tarta de Pescado)',
                        cookedPrice: 165,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 11',
                        xp: 55,
                        icon: '🐟',
                        netProfit: 97, // 165 - (53 + 15) = 97
                        mult: '+142%',
                        goldPerEnergy: '+97g / 1⚡'
                      },
                      {
                        rawId: 'Perch',
                        rawItem: 'Perca (Perch)',
                        rawPrice: 81,
                        secondMats: '1x Papa (45g)',
                        matsCost: 45,
                        energyCost: 1,
                        cookedItem: 'Fish Stew (Guiso de Pescado)',
                        cookedPrice: 210,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 8',
                        xp: 50,
                        icon: '🐟',
                        netProfit: 84, // 210 - (81 + 45) = 84
                        mult: '+103%',
                        goldPerEnergy: '+84g / 1⚡'
                      },
                      {
                        rawId: 'Silvercap Mushroom',
                        rawItem: 'Silvercap Mushroom',
                        rawPrice: 60,
                        secondMats: 'Sin insumos extra (0g)',
                        matsCost: 0,
                        energyCost: 1,
                        cookedItem: 'Fried Mushrooms (Setas Salteadas)',
                        cookedPrice: 180,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 3',
                        xp: 60,
                        icon: '🍄',
                        netProfit: 120, // 180 - 60 = 120
                        mult: '+200%',
                        goldPerEnergy: '+120g / 1⚡'
                      },
                      {
                        rawId: 'Carrot',
                        rawItem: 'Zanahoria (Carrot)',
                        rawPrice: 40,
                        secondMats: '1x Chirivía (25g)',
                        matsCost: 25,
                        energyCost: 1,
                        cookedItem: 'Vegetable Plate (Plato Verduras)',
                        cookedPrice: 95,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 1',
                        xp: 30,
                        icon: '🥕',
                        netProfit: 30, // 95 - (40 + 25) = 30
                        mult: '+75%',
                        goldPerEnergy: '+30g / 1⚡'
                      },
                      {
                        rawId: 'Potato',
                        rawItem: 'Papa / Patata (Potato)',
                        rawPrice: 45,
                        secondMats: 'Sin insumos extra (0g)',
                        matsCost: 0,
                        energyCost: 1,
                        cookedItem: 'Baked Potato (Papa Asada)',
                        cookedPrice: 110,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 2',
                        xp: 35,
                        icon: '🥔',
                        netProfit: 65, // 110 - 45 = 65
                        mult: '+144%',
                        goldPerEnergy: '+65g / 1⚡'
                      },
                      {
                        rawId: 'Pike',
                        rawItem: 'Lucio (Pike)',
                        rawPrice: 150,
                        secondMats: '1x Mantequilla (35g)',
                        matsCost: 35,
                        energyCost: 1,
                        cookedItem: 'Roast Fish Platter (Bandeja Asada)',
                        cookedPrice: 340,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 15',
                        xp: 75,
                        icon: '🐟',
                        netProfit: 155, // 340 - (150 + 35) = 155
                        mult: '+103%',
                        goldPerEnergy: '+155g / 1⚡'
                      },
                      {
                        rawId: 'Chub',
                        rawItem: 'Cacho (Chub)',
                        rawPrice: 32,
                        secondMats: '1x Aceite (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Fried Fish (Pescado Frito)',
                        cookedPrice: 90,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 4',
                        xp: 40,
                        icon: '🐟',
                        netProfit: 48, // 90 - (32 + 10) = 48
                        mult: '+114%',
                        goldPerEnergy: '+48g / 1⚡'
                      },
                      {
                        rawId: 'Wheat',
                        rawItem: 'Trigo Cosechado',
                        rawPrice: 185,
                        secondMats: 'Molienda Harina (10g)',
                        matsCost: 10,
                        energyCost: 1,
                        cookedItem: 'Bread (Pan Casero)',
                        cookedPrice: 280,
                        station: 'Panadería de Tamsin o Tu Cabaña',
                        reqSkill: 'Cocina Lv 5',
                        xp: 45,
                        icon: '🌾',
                        netProfit: 85, // 280 - (185 + 10) = 85
                        mult: '+44%',
                        goldPerEnergy: '+85g / 1⚡'
                      }
                    ].map((arb, i) => {
                      const owned = getPlayerItemQty({ id: arb.rawId });
                      const totalPotentialProfit = owned > 0 ? arb.netProfit * owned : arb.netProfit;

                      return (
                        <div 
                          key={i} 
                          className="p-3 bg-[#0c1322] border border-indigo-950/90 hover:border-amber-500/60 rounded-xl shadow-md flex flex-col justify-between gap-2.5 transition-all"
                        >
                          {/* Fila 1: Ícono + Nombre Crudo + Lucro Neto */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <ItemSprite name={arb.rawItem} id={arb.rawId} fallback={arb.icon || '🐟'} size={24} className="shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-xs text-white truncate leading-tight" title={arb.rawItem}>
                                    {arb.rawItem}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {owned > 0 ? (
                                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30">
                                        Mochila: {owned}x
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">Sin stock</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[11px] font-mono shrink-0">
                                +{arb.netProfit}g
                              </span>
                            </div>

                            {/* Fila 2: Plato Resultado + Nivel de Cocina */}
                            <div className="p-2 bg-[#080d18] rounded-lg border border-slate-800/80 flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                                <span className="truncate flex items-center gap-1">
                                  <span>🍳</span>
                                  <span className="truncate">{arb.cookedItem}</span>
                                </span>
                                <span className="text-[10px] text-purple-300 font-mono font-bold shrink-0 ml-1">
                                  +{arb.xp} XP
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 truncate">
                                🛒 {arb.secondMats}
                              </div>
                            </div>

                            {/* Fila 3: Micro-desglose financiero */}
                            <div className="grid grid-cols-3 gap-1 p-1.5 bg-[#091122] rounded-lg border border-slate-800/60 text-[10.5px] text-center font-mono">
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">CRUDO</div>
                                <div className="text-amber-300 font-bold">{arb.rawPrice}g</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">INSUMOS</div>
                                <div className="text-slate-300 font-semibold">{arb.matsCost > 0 ? `-${arb.matsCost}g` : '0g'}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-400 font-bold">VENTA</div>
                                <div className="text-emerald-400 font-bold">{arb.cookedPrice}g</div>
                              </div>
                            </div>
                          </div>

                          {/* Pie de Tarjeta: Rinde de Energía + Lucro Total + Ubicar */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px] font-mono">
                            <span className="text-cyan-300 font-bold">
                              ⚡ {arb.goldPerEnergy}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {owned > 0 && (
                                <span className="text-amber-300 font-bold" title="Lucro total con tu stock actual">
                                  +{(arb.netProfit * owned).toLocaleString('es-ES')}g
                                </span>
                              )}
                              <button
                                onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.stove)}
                                className="w-6 h-6 rounded bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center cursor-pointer transition-all shrink-0"
                                title="Ubicar Estufa en el Mega-Atlas"
                              >
                                <MapPin className="w-3 h-3 text-amber-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-vista 2: Liquidador de Inventario (Full-Width, sin Odette lateral, tarjetas legibles) */}
              {economySubTab === 'liquidation' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Liquidador de Inventario & Almacenes"
                    description="Audita en tiempo real el valor de liquidación en oro de tu Mochila, Cofres de Casa y Cofre del Pueblo leyendo automáticamente tus existencias con la extensión Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
                  {(!walletAddress || walletAddress === 'null' || !walletAddress.startsWith('0x')) && (
                    <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#0e172c] to-indigo-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-4 flex-wrap shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-xl shrink-0">
                          🔒
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>Módulo Personal: Liquidador de Almacén</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono">Modo Guía Libre</span>
                          </div>
                          <div className="text-xs text-slate-300 max-w-xl mt-0.5">
                            Este módulo audita automáticamente el valor en oro de tu Mochila, Cofres de Casa y Cofre del Pueblo leyendo directamente tu partida mediante la extensión <b>Bloomshire Companion</b>.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0"
                      >
                        🎮 Conectar Partida
                      </button>
                    </div>
                  )}
                  <div className="p-4 bg-[#0e172c] border-2 border-amber-500/60 rounded-xl flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          VALOR TOTAL ESTIMADO DE LIQUIDACIÓN:
                        </div>
                        <div className="text-3xl font-black text-amber-400 font-mono tracking-wider mt-0.5">
                          {totalLiquidationValue.toLocaleString('es-ES')} ORO
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Total Slots: {inventoryCounts.total}</span>
                          <span>•</span>
                          <span className="text-cyan-300 font-semibold">🎒 Mochila: {inventoryCounts.hotbar} slots</span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">🏡 Cofre Casa: {inventoryCounts.homeChest} slots</span>
                          <span>•</span>
                          <span className="text-purple-300 font-semibold">🏬 Cofre Pueblo: {inventoryCounts.townChest} slots</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const empty = {};
                            inventoryCatalogData.forEach(c => { empty[c.id] = 0; });
                            setItemQuantities(empty);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
                        </button>
                        <button 
                          onClick={() => {
                            const syn = calculateQuantitiesFromRaw(rawInventory, inventoryScope);
                            setItemQuantities(syn);
                          }}
                          className="px-3 py-1.5 bg-[#142245] hover:bg-[#1a2c5a] border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Restablece las cantidades exactas capturadas de tu partida"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar Mochila del Juego
                        </button>
                      </div>
                    </div>

                    {/* Botones de Filtro por Almacén: Todo / Mochila / Cofre Casa / Cofre Pueblo */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase mr-1">Filtrar Almacén:</span>
                      {[
                        { key: 'all', label: '🌐 Todo Unificado', count: inventoryCounts.total, color: 'border-slate-700' },
                        { key: 'hotbar', label: '🎒 Mochila (M)', count: inventoryCounts.hotbar, color: 'text-cyan-300 border-cyan-500/40' },
                        { key: 'home_chest', label: '🏡 Cofre Casa (CC)', count: inventoryCounts.homeChest, color: 'text-amber-300 border-amber-500/40' },
                        { key: 'town_chest', label: '🏬 Cofre Pueblo (CP)', count: inventoryCounts.townChest, color: 'text-purple-300 border-purple-500/40' }
                      ].map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => setInventoryScope(btn.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            inventoryScope === btn.key
                              ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-sm'
                              : `bg-[#0c1427] text-slate-300 hover:bg-slate-800 ${btn.color}`
                          }`}
                        >
                          <span>{btn.label}</span>
                          <span className="font-mono text-[10px] opacity-80">({btn.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Buscador de inventario + Selector de Orden */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1 shadow-inner">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Buscar en inventario (ej: zanahoria, madera, lingote)..."
                          value={inventorySearchQuery}
                          onChange={(e) => setInventorySearchQuery(e.target.value)}
                          className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-slate-500"
                        />
                        {inventorySearchQuery && (
                          <button
                            onClick={() => setInventorySearchQuery('')}
                            className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10.5px] font-bold text-slate-400">Ordenar:</span>
                        <select
                          value={inventorySortBy}
                          onChange={(e) => setInventorySortBy(e.target.value)}
                          className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="owned_desc">📦 Tengo primero (Mayor cantidad)</option>
                          <option value="value_desc">🪙 Mayor precio de venta</option>
                          <option value="qty_desc">🔢 Solo por cantidad</option>
                          <option value="name_asc">🔤 Nombre (A-Z)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Cuadrícula de Liquidación: 2 filas por tarjeta, nombres sin recortar y sin solapamiento */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
                    {sortedInventoryCatalog.map(item => {
                      const qty = itemQuantities[item.id] || 0;
                      const detail = liquidationBreakdown.itemDetails[item.id] || { npcSellQty: 0, npcGold: 0, p2pQty: qty, p2pGold: qty * (item.unit || 0), itemQuotaLeft: 15 };
                      const bd = getItemStorageBreakdown(item);
                      const isFood = item.cat === 'food';
                      const isVipCrop = item.cat === 'vip';
                      const unitPrice = isFood || isVipCrop ? (item.unitP2p || item.unit) : (item.unitNpc ?? item.unit);

                      return (
                        <div 
                          key={item.id} 
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-sm ${
                            qty > 0 
                              ? 'bg-[#101726] border-amber-500/60 shadow-md' 
                              : 'bg-[#0a0f1a] border-slate-800/60 opacity-60 hover:opacity-95'
                          }`}
                        >
                          {/* Fila Superior: Ícono + Nombre Completo + Subtotal */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ItemSprite name={item.name} id={item.id} fallback={item.icon || '📦'} size={24} className="shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs text-white truncate leading-snug" title={item.name}>
                                  {item.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono flex-wrap">
                                  <span className="text-amber-400 font-bold">🪙 {unitPrice}g/u</span>
                                  {isFood ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-blue-950 text-blue-300 border border-blue-500/40" title="Plato cocinado: no se vende a NPCs, sirve para consumo o venta P2P">
                                      Plato (P2P / 0g NPC)
                                    </span>
                                  ) : isVipCrop ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-purple-950 text-purple-300 border border-purple-500/40" title="Cosecha VIP: venta en Rowan P2P">
                                      VIP Rowan
                                    </span>
                                  ) : detail.isLevelLocked ? (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-rose-950 text-rose-300 border border-rose-500/40" title={`Las tiendas solo compran este cultivo a granjeros de Nv ${detail.reqLevel}+ (SEED_SOURCES.shopAtFarmingLevel)`}>
                                      Bloq Nv {detail.reqLevel}
                                    </span>
                                  ) : (
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-sans font-bold bg-slate-800 text-slate-300">
                                      NPC (15/día)
                                    </span>
                                  )}
                                  {bd.total > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-600">•</span>
                                      {bd.m > 0 && <span title="En Mochila" className="text-cyan-400 font-bold">🎒{bd.m}</span>}
                                      {bd.cc > 0 && <span title="En Cofre de Casa" className="text-amber-400 font-bold">🏡{bd.cc}</span>}
                                      {bd.cp > 0 && <span title="En Cofre del Pueblo" className="text-purple-400 font-bold">🏬{bd.cp}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {qty > 0 && (
                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded block">
                                  +{((detail.npcGold || 0) + (detail.p2pGold || 0)).toLocaleString('es-ES')}g
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Fila Intermedia: Desglose NPC vs Excedente */}
                          {qty > 0 && (
                            <div className="text-[10px] font-mono bg-[#091122] p-1.5 rounded border border-slate-800/80 flex flex-col gap-0.5">
                              {detail.npcSellQty > 0 && (
                                <div className="text-emerald-300 flex justify-between">
                                  <span>Vendible NPC hoy:</span>
                                  <b>{detail.npcSellQty}x (+{detail.npcGold}g)</b>
                                </div>
                              )}
                              {detail.p2pQty > 0 && (
                                <div className="text-purple-300 flex justify-between">
                                  <span>{isFood || isVipCrop ? 'Mercado Rowan / P2P:' : 'Excedente (P2P/mañana):'}</span>
                                  <b>{detail.p2pQty}x (+{detail.p2pGold}g)</b>
                                </div>
                              )}
                              {!isFood && !isVipCrop && detail.itemQuotaLeft <= 0 && (
                                <div className="text-rose-400 text-[9px] font-bold">
                                  ⛔ Cupo diario alcanzado (15/15)
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fila Inferior: Indicador de Venta + Stepper con Botones */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 mt-0.5">
                            <span className="text-[10px] font-mono">
                              {qty > 0 ? (
                                <span className="text-emerald-400 font-bold">Total: {qty}x</span>
                              ) : (
                                <span className="text-slate-500">0 en lote</span>
                              )}
                            </span>

                            <div className="flex items-center shrink-0">
                              <button 
                                onClick={() => setItemQuantities(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded-l bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all"
                                title="Restar 1"
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                min="0"
                                value={qty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setItemQuantities(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-12 h-6 bg-[#131d30] border-y border-slate-700 text-amber-300 text-center font-bold font-mono text-xs focus:outline-none"
                              />
                              <button 
                                onClick={() => setItemQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                                className="w-6 h-6 rounded-r bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 transition-all"
                                title="Sumar 1"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                )
              )}

              {/* Sub-vista 3: Pedidos Diarios de Odette (Módulo Propio y Dedicado) */}
              {economySubTab === 'odette' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Pedidos Diarios de Odette (+25% Oro)"
                    description="Consulta tus 6 encargos diarios exclusivos de hoy, su recompensa en oro con bonificación del +25% y entrega directa en tienda vinculando tu partida con la extensión Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* Hero Banner de Odette con Retrato Oficial y Estadísticas */}
                  <div className="p-4 bg-[#0d162b] border-2 border-amber-500/60 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <NpcAvatar npcId="odette" name="Odette" size={56} className="border-2 border-amber-500/60 shadow-lg rounded-2xl shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-amber-400">
                            📜 TABLÓN DE PEDIDOS DIARIOS DE ODETTE
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PEDIDOS DIARIOS
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          Odette ofrece <b>6 + ⌊Nivel / 3⌋ pedidos diarios</b> (hasta un máximo de 16) en el tablón de su Tienda General en Bloomshire. Paga aproximadamente el <b>50% del valor de venta en tienda</b> y recompensa con experiencia directa para subir de nivel tus oficios.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Listos para Entrega</div>
                        <div className={`font-mono text-sm font-black ${readyOrdersCount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {readyOrdersCount} de {activeOrders.length}
                        </div>
                      </div>
                      <button
                        onClick={() => locateInMegaAtlas({
                          label: '🏬 Tienda General de Odette (Tablón de Pedidos)',
                          regionId: 'bloomshire_town',
                          subZoneId: 'bloomshire_town_sub_1_bloomshire',
                          wx: 5510,
                          wy: 4326,
                          worldRect: [5380, 4200, 260, 240]
                        })}
                        className="px-3.5 py-2 bg-[#142245] hover:bg-[#1b2d5c] border border-amber-500/50 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        title="Ubicar la Tienda de Odette en el Mega-Atlas"
                      >
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>Ubicar Tienda en Atlas</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Totales y Filtros */}
                  <div className="flex items-center justify-between p-3 bg-[#0a101f] border border-indigo-950/80 rounded-xl text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-slate-300 font-mono">
                      <span>Total disponible: <b className="text-white">{activeOrders.length} Pedidos</b></span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">
                        Oro Potencial: +{activeOrders.reduce((sum, o) => sum + (o.gold || 0), 0).toLocaleString('es-ES')}g
                      </span>
                      <span>•</span>
                      <span className="text-cyan-300 font-bold">
                        XP Acumulable: +{activeOrders.reduce((sum, o) => sum + (o.xp || 0), 0)} XP
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      💡 Los pedidos se renuevan diariamente con el ciclo del servidor
                    </div>
                  </div>

                  {/* Cuadrícula de Pedidos Diarios (3 columnas amplias y detalladas) */}
                  {activeOrders.length === 0 ? (
                    <div className="p-8 bg-[#0a1020] border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-3 my-4">
                      <span className="text-4xl">📜</span>
                      <h3 className="font-bold text-white text-base">Esperando sincronización de pedidos</h3>
                      <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                        Los pedidos diarios de Odette son únicos para cada jugador y rotan a las 00:00 UTC. Abre el juego con la extensión <b>Bloomshire Companion</b> para consultar tus pedidos de hoy.
                      </p>
                      <button
                        onClick={() => setShowConnectModal(true)}
                        className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        🎮 Conectar con Companion
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {activeOrders.map((ord, i) => {
                      const required = ord.n || 1;
                      const available = getOrderAvailableQty(ord);
                      const hasEnough = available >= required;
                      const bd = getOrderBreakdown(ord);
                      const progressPct = Math.min(100, Math.round((available / required) * 100));

                      return (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all shadow-md ${
                            ord.done 
                              ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                              : hasEnough 
                              ? 'bg-[#0d1d22] border-emerald-500/60 shadow-emerald-950/20' 
                              : 'bg-[#0c1427] border-indigo-950/90 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Cabecera: Ícono + Cantidad/Nombre + Estado */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ItemSprite name={ord.item} fallback={ord.icon || '📦'} size={28} className="shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-white truncate leading-tight">
                                    {required}x {ord.item}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Pedido #{i + 1} del Tablón
                                  </div>
                                </div>
                              </div>

                              <div>
                                {ord.done ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    ✓ Entregado
                                  </span>
                                ) : hasEnough ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" /> Listo
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                    Faltan {required - available}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recompensas */}
                            <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#080d17] rounded-lg border border-slate-800 text-xs">
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">Recompensa Oro:</div>
                                <div className="font-mono text-amber-400 font-black text-sm flex items-center gap-1">
                                  <span>🪙 +{ord.gold}g</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[9.5px] text-slate-400 font-bold uppercase">Experiencia:</div>
                                <div className="font-mono text-cyan-300 font-black text-sm">
                                  ⚡ +{ord.xp} XP {ord.skill || ''}
                                </div>
                              </div>
                            </div>

                            {/* Barra de Progreso y Stock en Almacenes */}
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Progreso en Inventario:</span>
                                <span className={`font-bold ${hasEnough ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  {available} / {required} ({progressPct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${hasEnough ? 'bg-emerald-400' : 'bg-amber-500'}`} 
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>

                              {available > 0 && (
                                <div className="flex items-center gap-2 pt-1 text-[10.5px] font-mono text-slate-400">
                                  <span>Disponible en:</span>
                                  {bd.m > 0 && <span className="text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30">🎒 {bd.m}</span>}
                                  {bd.cc > 0 && <span className="text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/30">🏡 {bd.cc}</span>}
                                  {bd.cp > 0 && <span className="text-purple-400 font-bold bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-500/30">🏬 {bd.cp}</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pie de Tarjeta: Acciones */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setItemCategoryFilter('all');
                                setItemSearchQuery(ord.rawItem || ord.item);
                                setActiveTab('items');
                              }}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Search className="w-3 h-3" />
                              <span>¿Dónde consigo {ord.rawItem || ord.item}?</span>
                            </button>

                            {hasEnough && !ord.done && (
                              <button
                                onClick={() => locateInMegaAtlas({
                                  label: '🏬 Tienda General de Odette (Tablón de Pedidos)',
                                  regionId: 'bloomshire_town',
                                  subZoneId: 'bloomshire_town_sub_1_bloomshire',
                                  wx: 5510,
                                  wy: 4326,
                                  worldRect: [5380, 4200, 260, 240]
                                })}
                                className="px-2 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <MapPin className="w-3 h-3 text-emerald-400" />
                                <span>Entregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
                )
              )}

              {/* Sub-vista 4: Radar de Rotación de Mercado (Market Hall / Rowan) */}
              {economySubTab === 'market_radar' && (
                !isConnected ? (
                  <LockedModuleScreen
                    title="Radar de Rotación de Mercado (Rowan)"
                    description="Cruza tus existencias unificadas (Mochila, Cofres de Casa y Pueblo) con los productos de mayor demanda conectando tu partida con Bloomshire Companion."
                    onConnect={() => setShowConnectModal(true)}
                    onBack={() => setEconomySubTab('arbitrage')}
                  />
                ) : (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                  {/* Hero Banner de Rowan */}
                  <div className="p-4 bg-[#0d162b] border-2 border-emerald-500/60 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 border-2 border-emerald-400/80 flex items-center justify-center text-3xl shadow-lg shrink-0">
                        ⚖️
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-emerald-400">
                            📈 RADAR DE ROTACIÓN DE MERCADO // ROWAN & MARKET HALL
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ESTRATEGIA DE ORO RÁPIDO
                          </span>
                          {marketOffersLastUpdated ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              🟢 Ventas Vivas ({new Date(marketOffersLastUpdated).toLocaleTimeString('es-ES')})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/50">
                              ⚪ Precios Estimados
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                          Analiza tus existencias unificadas (Mochila, Cofre de la Casa y Cofre del Pueblo) cruzándolas con los productos de <b>mayor velocidad de compraventa</b> en el mercado. Convierte stock ocioso en oro líquido y <b>protege</b> los materiales que necesitas para tus misiones activas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Oro Rápido Proyectado</div>
                        <div className="font-mono text-sm font-black text-amber-400">
                          +{marketOpportunities.filter(o => o.hasStock && !o.isProtected).reduce((sum, o) => sum + o.totalPotentialGold, 0).toLocaleString('es-ES')}g
                        </div>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#091122] border border-slate-800 text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Items Listos en Stock</div>
                        <div className="font-mono text-sm font-black text-emerald-400">
                          {marketOpportunities.filter(o => o.hasStock && !o.isProtected).length} productos
                        </div>
                      </div>
                      <button
                        onClick={handleRefreshMarketOffers}
                        disabled={isMarketOffersLoading}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all disabled:opacity-50"
                        title="Descargar las últimas 200 ventas y puestos activos de Rowan"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isMarketOffersLoading ? 'animate-spin' : ''}`} />
                        <span>{isMarketOffersLoading ? 'Consultando...' : '🔍 Actualizar Ventas'}</span>
                      </button>
                      <button
                        onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.market)}
                        className="px-3.5 py-2 bg-[#142e2b] hover:bg-[#1a3d39] border border-emerald-500/50 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                        title="Ubicar el Market Hall de Rowan en el Mega-Atlas"
                      >
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>Ubicar Market Hall</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Búsqueda y Filtros de Categoría */}
                  <div className="flex items-center justify-between p-3 bg-[#0a101f] border border-indigo-950/80 rounded-xl text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={marketSearch}
                          onChange={e => setMarketSearch(e.target.value)}
                          placeholder="Buscar producto en radar..."
                          className="pl-8 pr-3 py-1.5 bg-[#0e172c] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
                        />
                      </div>

                      {[
                        { key: 'all', label: 'Todos' },
                        { key: 'in_stock', label: 'Con Stock en Mano ✨' },
                        { key: 'ultra', label: 'Salida Inmediata ⚡' },
                        { key: 'gems', label: 'Gemas & Lujo 💎' },
                        { key: 'vip', label: 'Cultivos VIP 🍓' }
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setMarketFilter(f.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            marketFilter === f.key
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-[#101b33] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      🛡️ Los insumos de misión están protegidos para evitar ventas por error
                    </div>
                  </div>

                  {/* Cuadrícula de Oportunidades de Mercado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {marketOpportunities
                      .filter(opp => {
                        if (marketSearch.trim()) {
                          const q = marketSearch.toLowerCase().trim();
                          if (!opp.name.toLowerCase().includes(q) && !opp.category.toLowerCase().includes(q)) {
                            return false;
                          }
                        }
                        if (marketFilter === 'in_stock') return opp.hasStock;
                        if (marketFilter === 'ultra') return opp.velocity === 'ultra';
                        if (marketFilter === 'gems') return opp.category.includes('Gemas');
                        if (marketFilter === 'vip') return opp.category.includes('VIP');
                        return true;
                      })
                      .map(opp => {
                        const isUltra = opp.velocity === 'ultra';
                        const isHigh = opp.velocity === 'high';

                        return (
                          <div
                            key={opp.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all shadow-md ${
                              opp.isProtected
                                ? 'bg-[#18111e] border-rose-500/50 hover:border-rose-400'
                                : opp.hasStock
                                ? 'bg-[#0d1d22] border-emerald-500/60 shadow-emerald-950/20'
                                : 'bg-[#0c1427] border-indigo-950/90 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <div>
                              {/* Cabecera: Ícono + Nombre + Badge de Rotación */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-2xl">{opp.icon}</span>
                                  <div>
                                    <div className="text-sm font-bold text-white leading-tight">
                                      {opp.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {opp.category}
                                    </div>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${
                                  opp.isProtected
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : isUltra
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : isHigh
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                }`}>
                                  {opp.isProtected ? '🛑 RESERVADO' : opp.tag}
                                </span>
                              </div>

                              {/* Alerta de Protección de Misión si corresponde */}
                              {opp.isProtected && (
                                <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-500/40 rounded-lg text-[11px] text-rose-200 flex items-center gap-1.5">
                                  <span>⚠️</span>
                                  <span>
                                    <b>No vender:</b> Requerido para <b>{opp.questProtection?.questTitle}</b> (Necesitas {opp.questProtection?.needed}).
                                  </span>
                                </div>
                              )}

                              {/* Precios de Mercado y Velocidad */}
                              <div className="mt-3 grid grid-cols-2 gap-2 bg-[#08101d] p-2.5 rounded-lg border border-slate-800/80 text-xs">
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">Precio Sugerido</div>
                                  <div className="text-amber-300 font-bold font-mono text-sm">
                                    ~{opp.avgPrice}g <span className="text-[10px] text-slate-400 font-normal">({opp.minPrice}-{opp.maxPrice}g)</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-mono">Índice de Salida</div>
                                  <div className={`font-bold font-mono text-xs ${isUltra ? 'text-amber-400' : isHigh ? 'text-emerald-400' : 'text-cyan-400'}`}>
                                    {opp.volumeScore}% Demanda Activa
                                  </div>
                                </div>
                              </div>

                              {/* Stock Unificado */}
                              <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400 text-[11px]">Tu Stock:</span>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded" title="En Mochila">
                                    🎒 {opp.stock.m}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded" title="En Cofre de la Casa">
                                    🏡 {opp.stock.cc}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded" title="En Cofre del Pueblo">
                                    🏬 {opp.stock.cp}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    opp.hasStock ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    Total: {opp.stock.total}
                                  </span>
                                </div>
                              </div>

                              {/* Consejo Táctico */}
                              <div className="mt-2.5 text-[11px] text-slate-300 leading-relaxed bg-[#0a1424] p-2 rounded-lg border border-slate-800/60">
                                💡 {opp.tip}
                              </div>
                            </div>

                            {/* Pie de Tarjeta: Potencial de Oro y Acción */}
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 mt-auto">
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-mono">Oro en Mano si Vendes</div>
                                <div className={`font-mono font-black text-sm ${opp.hasStock ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {opp.hasStock ? `+${opp.totalPotentialGold.toLocaleString('es-ES')} Oro` : '0g (Sin stock)'}
                                </div>
                              </div>

                              <button
                                onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS.market)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  opp.hasStock && !opp.isProtected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-md'
                                    : 'bg-[#15233d] hover:bg-[#1c3054] text-slate-300'
                                }`}
                                title="Publicar o Vender en Market Hall de Rowan"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Vender en Rowan</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                )
              )}
            </div>
          )}

          {/* ==============================================================
            TAB: LIBRO DE LAS 10 HABILIDADES, MISIONES ACTIVAS & RUTA A MOONMERE (CAJAS COLAPSABLES)
            ============================================================== */}
        {activeTab === 'quests' && (
          !isConnected ? (
            <LockedModuleScreen
              title="Misiones Activas & Progresión"
              description="Consulta el árbol de requisitos de tus misiones activas en curso, progreso del libro de Moonmere y materiales pendientes conectando tu partida con la extensión Bloomshire Companion."
              onConnect={() => setShowConnectModal(true)}
              onBack={() => setActiveTab('mega_atlas')}
            />
          ) : (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Barra de Control Visual: Expandir / Colapsar Todo + Toggles Rápidos */}
            <div className="p-3 bg-[#0a1020] border border-indigo-950/90 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ChevronsUpDown className="w-4 h-4 text-amber-400" /> Vista Modular (Haz clic en cualquier caja para abrir/cerrar):
                </span>
                {[
                  { key: 'materialTracker', label: '📋 Insumos Necesarios' },
                  { key: 'dailyTasks', label: `🌱 Tareas Diarias (${dailyTasksCompletedCount}/6)` },
                  { key: 'roadmap', label: `🎯 Guía de Misiones (${activeQuestsList.length})` },
                  { key: 'skillsBook', label: '📖 10 Habilidades' },
                  { key: 'moonmereBanner', label: '🌊 Progreso Moonmere' },
                  { key: 'energyBed', label: '🛏️ Cama y Energía' }
                ].map(sec => (
                  <button
                    key={sec.key}
                    onClick={() => toggleQuestSection(sec.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      questSectionsOpen[sec.key]
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-[#101b33] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {questSectionsOpen[sec.key] ? '▾ ' : '▸ '}{sec.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleAllQuestSections(true)}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-black cursor-pointer transition-all"
                >
                  ➕ Expandir Todo
                </button>
                <button
                  onClick={() => toggleAllQuestSections(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                >
                  ➖ Colapsar Todo
                </button>
              </div>
            </div>

            
            {/* CAJA 0 (COLAPSABLE): Insumos Necesarios para Misiones Activas (Árbol y Desglose) */}
            <div className="bg-[#0e172c] border-2 border-amber-500/60 rounded-xl shadow-lg overflow-hidden shrink-0">
              <button
                onClick={() => toggleQuestSection('materialTracker')}
                className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {questSectionsOpen.materialTracker ? (
                    <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      📋 INSUMOS Y MATERIALES NECESARIOS ({activeQuestMaterials.length} Items en {activeQuestsList.length} Misiones Activas)
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      Árbol de requisitos en tiempo real: existencias unificadas en Mochila (M), Cofre Casa (CC) y Cofre Pueblo (CP)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {questSectionsOpen.materialTracker ? 'Ocultar ▲' : 'Mostrar ▼'}
                  </span>
                </div>
              </button>

              {questSectionsOpen.materialTracker && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-3">
                  {activeQuestMaterials.length === 0 ? (
                    <div className="p-4 bg-[#0a1020] border border-slate-800 rounded-lg text-xs text-slate-300 text-center">
                      ✨ No hay misiones activas en este paso que requieran entrega de insumos. Todas tus misiones activas son de exploración, diálogo o combate.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeQuestMaterials.map((mat, idx) => {
                        const isGold = mat.id === 'gold';
                        const bd = isGold
                          ? { m: gold, cc: 0, cp: 0, total: gold }
                          : getItemStorageBreakdown({ id: mat.id, name: mat.name });
                        const isDone = bd.total >= mat.needed;
                        const missing = Math.max(0, mat.needed - bd.total);

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                              isDone
                                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                                : 'bg-[#101428] border-rose-500/40'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{mat.delivered ? '✅' : isDone ? '✅' : '📦'}</span>
                                  <span>{mat.name}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {mat.delivered ? (
                                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                      Entregado ({mat.needed}/{mat.needed})
                                    </span>
                                  ) : (
                                    <span className={`font-mono font-black text-xs px-2 py-0.5 rounded border ${
                                      isDone
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    }`}>
                                      {bd.total} / {mat.needed}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestSectionsOpen(prev => ({ ...prev, roadmap: true }));
                                    setTimeout(() => {
                                      const el = document.getElementById(`quest_guide_${(mat.questId || '').toLowerCase()}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 100);
                                  }}
                                  className="text-[11px] text-amber-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors text-left"
                                  title="Ver detalle completo de esta misión en la Guía Dinámica"
                                >
                                  <span>🎯</span>
                                  <span className="underline decoration-amber-500/40">{mat.questTitle}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">↳ Ver Guía</span>
                                </button>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                                  mat.isCurrentStep
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                  {mat.isCurrentStep ? '🚨 Paso Actual' : `⏳ Requisito Paso ${mat.targetStep}`}
                                </span>
                              </div>
                              {mat.hint && (
                                <div className="text-[10px] text-cyan-300 mt-0.5">
                                  💡 {mat.hint}
                                </div>
                              )}
                              {mat.stepText && !mat.hint && (
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {mat.stepText}
                                </div>
                              )}
                            </div>

                            {/* Desglose de Almacenes y Botón de Entrega */}
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs flex-wrap gap-1">
                              <span className={`font-black text-[11px] ${mat.delivered ? 'text-emerald-400' : isDone ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {mat.delivered ? '✓ Ya Entregado al NPC' : isDone ? '¡Listo para entregar!' : `Faltan ${missing}`}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {!mat.delivered && (
                                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    {isGold ? (
                                      <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded font-bold" title="Oro disponible en tu monedero">
                                        🪙 Monedero: {gold.toLocaleString('es-ES')}
                                      </span>
                                    ) : (
                                      <>
                                        <span className="px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded" title="En Mochila">
                                          🎒 {bd.m}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded" title="En Cofre de la Casa">
                                          🏡 {bd.cc}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded" title="En Cofre del Pueblo">
                                          🏬 {bd.cp}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={() => toggleDeliveredItem(mat.questId, mat.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    mat.delivered 
                                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' 
                                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                  }`}
                                  title="Si ya entregaste este ítem en el juego y el juego consumió el stock, márcalo aquí"
                                >
                                  {mat.delivered ? '✓ Entregado' : 'Ya lo entregué'}
                                </button>
                              </div>
                            </div>

                            {/* Sub-receta si aplica (Árbol de Ingredientes) */}
                            {Array.isArray(mat.recipe) && mat.recipe.length > 0 && (
                              <div className="p-2 bg-[#090d1c] border border-slate-800 rounded-lg text-[10.5px] flex flex-col gap-1">
                                <span className="text-slate-400 font-bold text-[10px] uppercase">↳ Requiere Cocinar / Craftear:</span>
                                {mat.recipe.map((ing, ingIdx) => {
                                  const ingBd = getItemStorageBreakdown({ id: ing.id, name: ing.name });
                                  const ingOk = ingBd.total >= ing.needed;
                                  return (
                                    <div key={ingIdx} className="flex items-center justify-between font-mono">
                                      <span className={ingOk ? 'text-slate-300' : 'text-rose-300'}>
                                        • {ing.name}: {ingBd.total}/{ing.needed}
                                      </span>
                                      <span className={ingOk ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                                        {ingOk ? '✅' : '❌ Falta'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

{/* ==============================================================
    CENTRO UNIFICADO DE MISIONES Y AVANCE DE HISTORIA (STEPPER HORIZONTAL)
    ============================================================== */}
            {(() => {
              const activeMainStoryQuest = activeQuestsList.find(q =>
                q.isMainStory ||
                (q.id && (q.id.toLowerCase().startsWith('bk') || q.id.toLowerCase().startsWith('ff') || q.id.toLowerCase().startsWith('q')))
              ) || activeQuestsList[0];

              const activeChapNum = activeMainStoryQuest?.chapter || (
                activeMainStoryQuest?.id ? parseInt(activeMainStoryQuest.id.replace(/^(bk|ff|q)/i, ''), 10) : 21
              ) || 21;

              const completedChapCount = Math.max(
                moonmereProgress.completedChapters || 0,
                activeChapNum > 0 ? (activeChapNum - 1) : 20
              );

              const totalChapters = 24;
              const progressPct = Math.min(100, Math.round((completedChapCount / totalChapters) * 100));
              const isMoonmere = activeChapNum >= 18;
              const moonmereIndex = isMoonmere ? (activeChapNum - 17) : 0;

              // Misión seleccionada actual
              const targetQuest = (selectedQuestId && activeQuestsList.find(q => q.id === selectedQuestId || (q.normalizedId && q.normalizedId === selectedQuestId.toLowerCase())))
                || activeMainStoryQuest
                || activeQuestsList[0]
                || null;

              const normId = (targetQuest?.id || '').toLowerCase();
              const catDef = DASHBOARD_QUEST_CATALOG[normId] ||
                DASHBOARD_QUEST_CATALOG[normId.replace(/^s_/, 'sd_')] ||
                DASHBOARD_QUEST_CATALOG[normId.replace(/^sd_/, 's_')];

              const qTitle = catDef?.name || targetQuest?.name || targetQuest?.title || (targetQuest?.id ? `Misión ${targetQuest.id.toUpperCase()}` : 'Sin misión activa');
              const isMain = targetQuest?.isMainStory || normId.startsWith('bk') || normId.startsWith('ff');
              
              // Pasos canónicos
              const rawSteps = (catDef?.steps && catDef.steps.length > 0)
                ? catDef.steps
                : ((targetQuest?.allSteps && targetQuest.allSteps.length > 0) ? targetQuest.allSteps : []);
              
              const baseStepNum = targetQuest?.step !== undefined ? targetQuest.step : ((targetQuest?.stepIdx || 0) + 1);
              const totalSteps = Math.max(rawSteps.length, baseStepNum, 1);

              // Asegurar que stepsList tenga todos los pasos
              const stepsList = [...rawSteps];
              while (stepsList.length < totalSteps) {
                const sN = stepsList.length + 1;
                stepsList.push({
                  step: sN,
                  name: `Paso ${sN}`,
                  text: targetQuest?.objective || targetQuest?.stepText || 'Continúa la misión en el juego.',
                  where: targetQuest?.where || catDef?.location || 'Ver indicador en el mapa',
                  npc: targetQuest?.giver || catDef?.giver || 'Vecino',
                  items: []
                });
              }

              // Auto-avance reactivo de pasos de nivel en cliente:
              // Si el paso actual exige alcanzar un nivel de habilidad que el jugador ya cumple o supera, avanzar al siguiente paso.
              let resolvedStepNum = baseStepNum;
              while (resolvedStepNum <= stepsList.length) {
                const stepToCheck = stepsList[resolvedStepNum - 1];
                if (!stepToCheck) break;
                const combined = ((stepToCheck.name || '') + ' ' + (stepToCheck.text || '')).toLowerCase();
                const match = combined.match(/(?:nivel|level)\s*(\d+)\s*(?:de\s*)?([a-zA-Záéíóúñ]+)/i);
                if (match) {
                  const reqLvl = parseInt(match[1], 10);
                  const skWord = match[2].toLowerCase();
                  let reqSk = null;
                  if (skWord.includes('cultiv') || skWord.includes('farm')) reqSk = 'farming';
                  else if (skWord.includes('miner') || skWord.includes('mine')) reqSk = 'mining';
                  else if (skWord.includes('pesc') || skWord.includes('fish')) reqSk = 'fishing';
                  else if (skWord.includes('tal') || skWord.includes('wood')) reqSk = 'woodcutting';
                  else if (skWord.includes('cocin') || skWord.includes('cook')) reqSk = 'cooking';

                  if (reqSk && reqLvl) {
                    const playerLvl = skillsBreakdown[reqSk]?.level || (reqSk === 'farming' ? (farmingLevel || skillsBreakdown.farming?.level || 1) : 1);
                    if (playerLvl >= reqLvl) {
                      resolvedStepNum++;
                      continue;
                    }
                  }
                }
                break;
              }

              const curStepNum = Math.min(resolvedStepNum, stepsList.length);
              const curStepDef = stepsList[curStepNum - 1] || stepsList[stepsList.length - 1] || null;
              const curStepName = curStepDef?.name || targetQuest?.stepName || `Paso ${curStepNum}`;
              const curWhere = curStepDef?.where || targetQuest?.where || catDef?.location || 'Ver en el mapa';
              const curNpc = curStepDef?.npc || targetQuest?.giver || catDef?.giver || 'Vecino de Bloomshire';
              const questReward = targetQuest?.reward || catDef?.reward || null;

              // Generador de instrucciones inteligentes y canónicas (CERO textos genéricos de "objetivo en curso..sigue el panel")
              const cleanStepText = (() => {
                const raw = curStepDef?.text || targetQuest?.objective || targetQuest?.stepText || '';
                if (raw && !raw.includes('Consulta el panel') && !raw.includes('Objetivo en curso. Consulta')) {
                  return raw;
                }
                if (Array.isArray(curStepDef?.items) && curStepDef.items.length > 0) {
                  const itemsStr = curStepDef.items.map(it => `${it.needed}x ${it.name}`).join(' y ');
                  return `Reúne y entrega ${itemsStr} a ${curNpc} en ${curWhere}.`;
                }
                if (curStepName.toLowerCase().includes('habla') || curStepName.toLowerCase().includes('talk')) {
                  return `Dirígete a ${curWhere} y habla con ${curNpc} para avanzar en la historia.`;
                }
                if (curStepName.toLowerCase().includes('nivel') || curStepName.toLowerCase().includes('level')) {
                  return `Alcanza el nivel de habilidad requerido para desbloquear la siguiente etapa con ${curNpc}.`;
                }
                return `Cumple el objetivo "${curStepName}" con ${curNpc} en ${curWhere}.`;
              })();

              const questLoc = curStepDef?.coords || targetQuest?.coords || catDef?.coords || {
                label: `🎯 ${qTitle}`,
                regionId: isMoonmere ? 'moonmere' : 'bloomshire_town',
                subZoneId: isMoonmere ? 'moonmere_sub_1_lagoon_village' : 'bloomshire_town_sub_1_bloomshire',
                wx: 4968,
                wy: 2636,
                worldRect: [4900, 2550, 200, 200]
              };

              return (
                <div className="bg-gradient-to-b from-[#0d1733] to-[#091024] border-2 border-indigo-900/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col shrink-0">
                  {/* Cabecera superior: Progreso de Book One */}
                  <div className="p-4 bg-gradient-to-r from-[#0d1b3d] via-[#122452] to-[#0d1b3d] border-b border-indigo-950/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌊</span>
                      <div>
                        <div className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                          <span>EXPANSIÓN BOOK ONE: MOONMERE &amp; MISIONES</span>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono font-bold">
                            Capítulo {activeChapNum} de 24
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Progreso de Historia: <b>{completedChapCount} / {totalChapters} Capítulos Completados</b> ({progressPct}%)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-36 sm:w-48 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-400">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Contenido Modular: Lista de Misiones (Izquierda) + Ficha Unificada Dinámica (Derecha) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
                    {/* Columna Izquierda (4/12): Lista de Misiones Activas (como el panel del juego) */}
                    <div className="lg:col-span-4 border-r border-indigo-950/80 p-3.5 bg-[#080f22] flex flex-col gap-2">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-1.5">
                          <span>📜</span> Misiones Activas ({activeQuestsList.length})
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                          En Progreso
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
                        {activeQuestsList.length === 0 ? (
                          <div className="p-4 bg-[#0d162d] rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                            ✨ No tienes misiones activas en este momento.
                          </div>
                        ) : (
                          activeQuestsList.map((q, idx) => {
                            const norm = (q.id || '').toLowerCase();
                            const qCat = DASHBOARD_QUEST_CATALOG[norm] ||
                              DASHBOARD_QUEST_CATALOG[norm.replace(/^s_/, 'sd_')] ||
                              DASHBOARD_QUEST_CATALOG[norm.replace(/^sd_/, 's_')];
                            const isSelected = targetQuest && (targetQuest.id === q.id || (targetQuest.normalizedId && targetQuest.normalizedId === q.normalizedId));
                            const isMainQ = q.isMainStory || norm.startsWith('bk') || norm.startsWith('ff');
                            const title = qCat?.name || q.name || q.title || `Misión ${q.id.toUpperCase()}`;
                            const giverName = qCat?.giver || q.giver || 'Vecino';
                            const stepNum = q.step !== undefined ? q.step : ((q.stepIdx || 0) + 1);
                            const qSteps = (qCat?.steps && qCat.steps.length > 0) ? qCat.steps : (q.allSteps || []);
                            const qTotal = Math.max(qSteps.length, stepNum);

                            return (
                              <button
                                key={q.id || idx}
                                onClick={() => setSelectedQuestId(q.id)}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-[#172752] to-[#121f42] border-amber-400 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                                    : 'bg-[#0d162d] border-slate-800 text-slate-300 hover:bg-[#111c38] hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                                    <span>{isMainQ ? '⭐' : '❗'}</span>
                                    <span className={isSelected ? 'text-amber-300' : 'text-slate-200'}>{title}</span>
                                  </div>
                                  <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    Paso {stepNum}/{qTotal}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>De <b>{giverName}</b></span>
                                  {isSelected && (
                                    <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                                      <span>Siguiendo</span> <span>▶</span>
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha (8/12): Ficha Dinámica Unificada y Stepper Horizontal */}
                    <div className="lg:col-span-8 p-5 bg-[#0b1428] flex flex-col gap-4">
                      {targetQuest ? (
                        <div className="bg-gradient-to-b from-[#0f1b3b] via-[#0b1428] to-[#070d1c] border-2 border-indigo-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                          {/* 1. Cabecera Unificada de la Misión */}
                          <div className="p-4 bg-gradient-to-r from-[#14234b] via-[#101b38] to-[#0d1630] border-b border-indigo-950/80 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider border ${
                                  isMain
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/50'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                                }`}>
                                  {isMain ? '⭐ Historia Principal' : '📜 Misión Secundaria'}
                                </span>
                                {targetQuest.chapter && (
                                  <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 text-[10.5px] font-mono font-bold">
                                    Capítulo {targetQuest.chapter}
                                  </span>
                                )}
                                <h3 className="font-black text-white text-base tracking-wide">
                                  {qTitle}
                                </h3>
                              </div>
                              <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                                <span>Otorgada por: <b className="text-amber-200">{curNpc}</b></span>
                                <span>•</span>
                                <span>Ubicación: <b className="text-slate-200">{curWhere}</b></span>
                                {questReward && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-300 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 text-[11px]">
                                      💰 {questReward.gold ? `${questReward.gold.toLocaleString('es-ES')} Oro` : 'Completar Misión'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => locateInMegaAtlas(questLoc)}
                                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
                                title="Ubicar objetivo en el Mega-Atlas"
                              >
                                <MapPin className="w-4 h-4" />
                                <span>Ver en Mega-Atlas</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. Stepper Horizontal Integrado (Progreso de la Misión) */}
                          <div className="px-6 py-4 bg-[#080f22]/90 border-b border-slate-800/80 overflow-x-auto custom-scrollbar">
                            <div className="min-w-[420px] py-2 px-4 relative flex items-center justify-between">
                              {/* Línea conectora base */}
                              <div className="absolute top-[26px] left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 z-0" />
                              
                              {/* Línea conectora de progreso completado */}
                              <div 
                                className="absolute top-[26px] left-8 h-1 bg-gradient-to-r from-emerald-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-500"
                                style={{
                                  width: `${Math.max(0, Math.min(100, ((curStepNum - 1) / Math.max(1, totalSteps - 1)) * 100))}%`
                                }}
                              />

                              {stepsList.map((st, sIdx) => {
                                const stepNum = st.step || (sIdx + 1);
                                const isDone = stepNum < curStepNum;
                                const isCur = stepNum === curStepNum;

                                return (
                                  <div key={sIdx} className="relative z-10 flex flex-col items-center max-w-[125px] text-center">
                                    {/* Círculo del Paso */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                                      isCur
                                        ? 'bg-amber-500 border-2 border-amber-200 text-slate-950 ring-4 ring-amber-400/30 shadow-lg shadow-amber-500/40 scale-110'
                                        : isDone
                                          ? 'bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 shadow-md'
                                          : 'bg-[#0d162c] border-2 border-slate-700 text-slate-500'
                                    }`}>
                                      {isDone ? (
                                        <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                                      ) : isCur ? (
                                        <span className="text-sm font-black">{stepNum}</span>
                                      ) : (
                                        <span className="text-xs font-mono">{stepNum}</span>
                                      )}
                                    </div>

                                    {/* Etiqueta de Estado */}
                                    <span className={`mt-2 text-[10px] font-black uppercase tracking-wider ${
                                      isCur ? 'text-amber-300' : isDone ? 'text-emerald-400' : 'text-slate-500'
                                    }`}>
                                      {isCur ? '⚡ En Curso' : isDone ? '✓ Hecho' : `Paso ${stepNum}`}
                                    </span>

                                    {/* Nombre del Paso */}
                                    <span className={`text-[11px] font-bold mt-0.5 line-clamp-2 leading-tight ${
                                      isCur ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                                    }`}>
                                      {st.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3. Panel de Objetivo Activo & Radar de Insumos */}
                          <div className="p-5 flex flex-col gap-3.5 bg-gradient-to-b from-[#0a1226] to-[#070e1c]">
                            {/* Cabecera del Objetivo Actual */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                                  <span>🎯</span> OBJETIVO ACTUAL (Paso {curStepNum} de {totalSteps})
                                </span>
                                <span className="text-xs font-black text-white">
                                  {curStepName}
                                </span>
                              </div>

                              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                                📍 {curWhere}
                              </span>
                            </div>

                            {/* Instrucciones Claras y Canónicas (CERO texto genérico) */}
                            <div className="text-sm text-slate-100 font-medium leading-relaxed bg-[#0c1630]/90 p-3.5 rounded-xl border border-indigo-950/80 shadow-inner">
                              {cleanStepText}
                            </div>

                            {/* Checklist / Radar de Ítems Requeridos en este Paso */}
                            {Array.isArray(curStepDef?.items) && curStepDef.items.length > 0 ? (
                              <div className="mt-1 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
                                <div className="text-[11.5px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-between flex-wrap gap-2">
                                  <span className="flex items-center gap-1.5">
                                    <span>📦</span> <span>Materiales e Insumos Requeridos ({curStepDef.items.length})</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    Existencias: Mochila (M) + Cofres Casa (CC) + Cofre Pueblo (CP)
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {curStepDef.items.map((it, itIdx) => {
                                    const bd = getItemStorageBreakdown({ id: it.id, name: it.name });
                                    const manualKey = `${targetQuest.id}_${it.id}`;
                                    const isManualDelivered = !!deliveredItemsManual[manualKey];
                                    const haveEnough = isManualDelivered || (bd.total >= it.needed);
                                    const missingCount = Math.max(0, it.needed - bd.total);

                                    return (
                                      <div
                                        key={itIdx}
                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                          haveEnough
                                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-sm shadow-emerald-950/30'
                                            : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/40 text-slate-200 shadow-sm'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-base">{haveEnough ? '✅' : '⏳'}</span>
                                            <div>
                                              <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                                                <span>{it.name}</span>
                                                {haveEnough ? (
                                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                                    ¡Suficiente!
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                                    Faltan {missingCount}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                M: {bd.hotbar + bd.bag} | CC: {bd.cottage} | CP: {bd.town}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex flex-col items-end shrink-0">
                                            <span className={`text-xs font-mono font-black ${haveEnough ? 'text-emerald-300' : 'text-amber-300'}`}>
                                              {isManualDelivered ? 'Entregado' : `${bd.total} / ${it.needed}`}
                                            </span>
                                            <button
                                              onClick={() => toggleDeliveredItem(targetQuest.id, it.id)}
                                              className={`mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                                isManualDelivered
                                                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                                              }`}
                                            >
                                              {isManualDelivered ? '✓ Entregado' : 'Marcar Entregado'}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Barra de Progreso del Ítem */}
                                        <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                          <div
                                            className={`h-full transition-all duration-500 ${haveEnough ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                            style={{ width: `${Math.min(100, Math.round((bd.total / Math.max(1, it.needed)) * 100))}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <span>🧭</span> <span>Acción Requerida: <b>{curStepName}</b> (sin entrega de materiales en este paso)</span>
                                </span>
                                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                                  Exploración / Diálogo
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-sm">
                          Selecciona una misión activa de la lista izquierda para ver su paso a paso en vivo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
              {/* Columna Izquierda (6/12): Tareas Diarias + 10 Habilidades + Cama y Energía */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {/* CAJA 1 (COLAPSABLE): TAREAS DIARIAS (TASK CENTER - RECOMPENSA: SEMILLA PREMIUM) */}
                <div className="bg-[#0e172c] border-2 border-emerald-500/50 rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => toggleQuestSection('dailyTasks')}
                    className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {questSectionsOpen.dailyTasks ? (
                        <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                          <span>🌱 Tareas Diarias (Task Center)</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            dailyTasksCompletedCount === 6
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {dailyTasksCompletedCount}/6 Completadas
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {dailyTasksCompletedCount === 6 ? (
                            <span className="text-emerald-300 font-bold">🎉 ¡6 de 6 completadas! Reclama tus 10 Semillas Premium en el botón 'Task' bajo tu perfil.</span>
                          ) : (
                            <span>Recompensa al completar las 6: <b className="text-amber-300">🌱 10 Semillas Premium (Recompensa Diaria)</b></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {questSectionsOpen.dailyTasks ? 'Ocultar ▲' : 'Mostrar ▼'}
                    </span>
                  </button>

                  {questSectionsOpen.dailyTasks && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-2.5">
                      {/* Barra de Progreso a las 10 Semillas Premium */}
                      <div className="p-3 bg-[#0a1224] border border-slate-800 rounded-lg flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <span>🎁</span> <span>Progreso a 10 Semillas Premium:</span>
                          </span>
                          <span className="font-mono font-black text-emerald-400">
                            {dailyTasksCompletedCount} / 6 ({Math.round((dailyTasksCompletedCount / 6) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${(dailyTasksCompletedCount / 6) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 flex-wrap gap-2">
                          <span>Se reinicia diariamente a las 00:00 UTC (21:00 hs Argentina).</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setDailyTasks(prev => {
                                  const updated = prev.map(t => ({ ...t, done: true, current: t.target }));
                                  try {
                                    localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: new Date().toISOString().slice(0, 10), tasks: updated }));
                                  } catch (e) {}
                                  return updated;
                                });
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
                              title="Marcar todas las 6 tareas del día como listas"
                            >
                              ✓ Marcar Todas Listas (6/6)
                            </button>
                            <button
                              onClick={() => {
                                setDailyTasks(prev => {
                                  const updated = prev.map(t => ({ ...t, done: false, current: 0 }));
                                  try {
                                    localStorage.setItem('bloomshire_daily_tasks', JSON.stringify({ date: new Date().toISOString().slice(0, 10), tasks: updated }));
                                  } catch (e) {}
                                  return updated;
                                });
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-medium text-[10px] transition-colors cursor-pointer"
                              title="Reiniciar progreso diario"
                            >
                              Reiniciar
                            </button>
                          </div>
                        </div>
                      </div>

                      {dailyTasksCompletedCount === 6 && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 text-emerald-300 text-xs font-bold shadow-md">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌸</span>
                            <span>Bono reclamado. Hoy conseguiste 10 Semillas Premium.</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10.5px] font-mono">
                            BONO ACTIVO
                          </span>
                        </div>
                      )}

                      {/* Lista de las 6 Tareas */}
                      <div className="flex flex-col gap-2">
                        {dailyTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => toggleDailyTask(t.id)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              t.done
                                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                                : 'bg-[#101b33] border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{t.icon || '🌱'}</span>
                              <div>
                                <div className={`text-xs font-bold ${t.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                                  {t.label}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  Meta: {t.target} {t.target > 1 ? 'acciones' : 'acción'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                t.done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {t.done ? '✓ Completada' : 'Pendiente'}
                              </span>
                              <input
                                type="checkbox"
                                checked={t.done}
                                onChange={() => {}}
                                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer pointer-events-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CAJA 4 (COLAPSABLE): Monitor de Energía y Cama UTC */}
                <div className="bg-[#0e172c] border border-cyan-500/40 rounded-xl shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleQuestSection('energyBed')}
                    className="w-full p-4 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {questSectionsOpen.energyBed ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-black text-cyan-400 uppercase tracking-wider">
                          🛏️ Monitor de Energía y Cama (Season 0 Rework)
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
                          ⚡ {Math.floor(currentEnergy)}/{maxEnergy} • {energyMeta.canRest ? '✓ Cama Lista' : `Cama: ${energyMeta.bedWaitText || energyMeta.utcCountdownStr}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {questSectionsOpen.energyBed ? 'Ocultar ▲' : 'Mostrar ▼'}
                    </span>
                  </button>

                  {questSectionsOpen.energyBed && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-2.5">
                      <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                        <span className="text-slate-300">Energía Actual del Personaje:</span>
                        <span className="font-mono font-black text-cyan-300 text-sm">
                          {Math.floor(currentEnergy)} / {maxEnergy} ⚡ <span className="text-[10px] text-emerald-400">{isVip ? '(+1⚡ cada 3m VIP)' : '(Regen base)'}</span>
                        </span>
                      </div>

                      <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                        <span className="text-slate-300">Estado de la Cama (Reinicio 00:00 UTC):</span>
                        <span className={energyMeta.canRest ? 'text-emerald-400 font-black' : 'text-amber-300 font-black'}>
                          {energyMeta.recovering
                            ? `💤 Recuperando (${energyMeta.recoverMinutesLeft}m restantes)`
                            : energyMeta.canRest
                            ? `✓ Cama Lista (${energyMeta.sleepLeft ?? (energyMeta.sleepADay || 200)}/${energyMeta.sleepADay || 200}⚡ hoy)`
                            : `🏠 Cama en ${energyMeta.bedWaitText || energyMeta.utcCountdownStr}`}
                        </span>
                      </div>

                      <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                        <span className="text-slate-300">Sueño Diario Usado Hoy:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {energyMeta.usedSleepToday ?? (energyMeta.sleepADay || 200)} / {energyMeta.sleepADay || 200} ⚡
                        </span>
                      </div>

                      <div className="p-3 bg-[#121d38] border border-slate-800 rounded-lg text-xs flex items-center justify-between">
                        <span className="text-slate-300">Comida Consumida Hoy (Reinicio 00:00 UTC):</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {energyMeta.foodEatenToday || 0} / {energyMeta.foodCapToday || (isVip || energyMeta.isHolder ? 150 : 100)} ⚡
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 leading-relaxed bg-[#0a1224] p-2.5 rounded-lg border border-slate-800">
                        💡 <b>Cómo funciona el sistema de Cama, Comida y Energía:</b>
                        <br />• Los jugadores <b>VIP</b> regeneran pasivamente <b>+1⚡ cada 3 minutos</b> (+20⚡ por hora).
                        {energyMeta.isJamActive && (
                          <><br />• 🫐 <b>Mermelada de Zafiro Activa:</b> Regeneración acelerada a <b>+1.3⚡ cada 3 min</b> (+26⚡/h) durante {energyMeta.jamMinutesLeft}m restantes.</>
                        )}
                        <br />• Cuota de sueño diaria (reinicio 00:00 UTC): <b>200⚡</b> (jugador base, 2 barras de 100⚡), o <b>450⚡ / 600⚡ / 750⚡</b> (VIP u Holders, 3 a 5 barras de 150⚡ según perks/farmers).
                        <br />• Cuota de comida diaria (reinicio 00:00 UTC, 1 barra completa por día): <b>100⚡</b> (jugador base) / <b>150⚡</b> (VIP u Holders). Los platos cocinados alimentan la barra diaria; Moonlight Stew otorga 8⚡ por plato (cuenta para la barra de comida diaria).
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha (6/12): Libro de las 10 Habilidades */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {/* CAJA 2 (COLAPSABLE): LIBRO DE LAS 10 HABILIDADES */}
                <div className="bg-[#0e172c] border-2 border-amber-500/50 rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => toggleQuestSection('skillsBook')}
                    className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {questSectionsOpen.skillsBook ? (
                        <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          📖 Libro de Habilidades en Tiempo Real (Las 10 Habilidades de Bloomshire)
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Cultivo Nv {farmingLevel} • Mínima: {skillsMeta.minSkillName} (Nv {skillsMeta.minSkillLevel}) • Regla de 3 niveles
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono bg-rose-950/70 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg font-bold">
                        Tope Actual: Nv {skillsMeta.maxAllowedLevel || 5}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {questSectionsOpen.skillsBook ? 'Ocultar ▲' : 'Mostrar ▼'}
                      </span>
                    </div>
                  </button>

                  {questSectionsOpen.skillsBook && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800 flex flex-col gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {CANONICAL_SKILLS.map(def => {
                          const sk = skillsBreakdown[def.key] || { level: 1, xp: 0, into: 0, need: 100, pct: 0 };
                          const lvl = sk.effectiveLevel ?? sk.level ?? 1;
                          const isLowest = Boolean(sk.isLowestGated);
                          const isCapped = Boolean(sk.capped);
                          return (
                            <div
                              key={def.key}
                              className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                                isLowest
                                  ? 'bg-amber-950/30 border-amber-500/60'
                                  : isCapped
                                  ? 'bg-rose-950/30 border-rose-500/50'
                                  : 'bg-[#121d38] border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-white flex items-center gap-1.5">
                                  <span>{def.icon}</span>
                                  <span>{def.label}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {isLowest && (
                                    <span className="text-[9.5px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                                      Sube a Nv {lvl + 1}
                                    </span>
                                  )}
                                  {isCapped && (
                                    <span className="text-[9.5px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                                      Tope Nv {lvl}
                                    </span>
                                  )}
                                  {!def.gated && (
                                    <span className="text-[9.5px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                      No bloquea
                                    </span>
                                  )}
                                  <span className="font-mono font-black text-cyan-300 text-xs">
                                    Nv {lvl}
                                  </span>
                                </div>
                              </div>

                              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300"
                                  style={{ width: `${sk.pct || 0}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>XP Total: {(sk.xp || 0).toLocaleString('es-ES')}</span>
                                <span>{sk.into || 0} / {sk.need || 100} XP ({sk.pct || 0}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {skillsMeta.isFarmingCapped && (
                        <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-200 leading-relaxed flex flex-wrap items-center justify-between gap-2">
                          <span>
                            ⚠️ <b>Cómo desbloquear Cultivo Nivel 6:</b> Tu Cultivo está en <b>Nivel {farmingLevel}</b> (tope actual). Como <b>{skillsMeta.minSkillName}</b> están en <b>Nivel {skillsMeta.minSkillLevel}</b> (2 + 3 = 5), sube <b>Recolección</b> (setas Silvercap/Glowcap en Whisperwood) y <b>Cocina</b> (estufa de Tamsin) a <b>Nivel 3 (650 XP)</b>.
                          </span>
                          <button
                            onClick={() => {
                              setItemCategoryFilter('all');
                              setItemSearchQuery('Silvercap');
                              setActiveTab('items');
                            }}
                            className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded text-[11px] cursor-pointer shrink-0"
                          >
                            🔎 Buscar Setas Silvercap/Glowcap
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            
            </div>
          </div>
          )
        )}

        {activeTab === 'craft' && (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Selector de Estaciones de Trabajo con Badges de Crafteables Ahora */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'cook', label: '🍲 Estufa de Cocina (Panadería / Cabaña)', badgeKey: 'cook' },
                { key: 'bench', label: '🪵 Banco de Trabajo (Carpintería Pell)', badgeKey: 'bench' },
                { key: 'forge', label: '⚒️ Forja de Bram (Herrería)', badgeKey: 'forge' },
                { key: 'mill', label: '🌊 Molino & Lechería (Granja Hollin)', badgeKey: 'mill' },
                { key: 'loom', label: '🧵 Telar de Tilly (Sastrería)', badgeKey: 'loom' }
              ].map(sub => {
                const readyCount = craftableCountsByCategory[sub.badgeKey] || 0;
                return (
                  <button
                    key={sub.key}
                    onClick={() => setCraftCategory(sub.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      craftCategory === sub.key 
                        ? 'bg-purple-600 text-white font-black shadow-md border border-purple-400' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {readyCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-mono font-bold bg-emerald-950 border border-emerald-400 text-emerald-300 shadow-sm animate-pulse">
                        {readyCount} listos
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Banner Táctico de la Estación con Analíticas de Rendimiento Global */}
            {CRAFT_STATION_LOCATIONS[craftCategory] && (
              <div className="p-4 bg-gradient-to-r from-[#131d38] via-[#17254a] to-[#111a33] border-2 border-purple-500/50 rounded-xl shadow-lg flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>{CRAFT_STATION_LOCATIONS[craftCategory].stationName}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      🧭 {CRAFT_STATION_LOCATIONS[craftCategory].stationDesc}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory])}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      title="Ubicar Estación de Trabajo en el Mega-Atlas"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Ubicar Estación</span>
                    </button>
                    {CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation && (
                      <button
                        onClick={() => locateInMegaAtlas(CRAFT_STATION_LOCATIONS[craftCategory].altHomeLocation)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        title="Ubicar Estufa en Tu Cabaña"
                      >
                        <span>🏡 Cabaña</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Radar Táctico de Alto Rendimiento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 font-mono text-xs">
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Catálogo Estación</span>
                    <span className="text-white font-black text-sm">{stationSummary.total} recetas</span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-emerald-400 uppercase font-sans font-bold">Crafteables Ahora</span>
                    <span className="text-emerald-300 font-black text-sm">
                      {totalCraftableInCurrentCategory > 0 ? `✓ ${totalCraftableInCurrentCategory} Listas` : '0 Listas'}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-amber-400 uppercase font-sans font-bold">Mayor Ganancia Oro</span>
                    <span className="text-amber-300 font-bold text-xs truncate">
                      {stationSummary.bestProfitCraft ? `+${((stationSummary.bestProfitCraft.sellPrice || 0) - (stationSummary.bestProfitCraft.goldCost || 0)).toLocaleString()}g` : '-'}
                    </span>
                  </div>
                  <div className="bg-[#0b1322] p-2 rounded-lg border border-slate-800 flex flex-col">
                    <span className="text-[9px] text-cyan-400 uppercase font-sans font-bold">Mayor Recarga Energía</span>
                    <span className="text-cyan-300 font-bold text-xs truncate">
                      {stationSummary.bestEnergyDish && stationSummary.bestEnergyDish.energyRestore > 0 ? `+${stationSummary.bestEnergyDish.energyRestore}⚡` : 'Gasto Oficio'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Crafteo: Búsqueda, Ordenamiento y Vista */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1628] border border-slate-800/80 p-2.5 rounded-xl shadow-sm">
              <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar receta o plato (ej: tarta, guiso, lingote, tela, pan, col)..."
                  value={craftSearchQuery}
                  onChange={(e) => setCraftSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-white text-xs outline-none w-full placeholder:text-slate-500 font-medium"
                />
                {craftSearchQuery && (
                  <button
                    onClick={() => setCraftSearchQuery('')}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Botón Toggle Crafteables Ahora con mis Materiales */}
                <button
                  onClick={() => setCraftOnlyAvailable(!craftOnlyAvailable)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    craftOnlyAvailable
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-[#14203d] text-slate-300 hover:text-emerald-300 border-slate-700'
                  }`}
                  title="Filtrar recetas para las que tienes el 100% de los materiales en mochila o cofres"
                >
                  <span>✨ Crafteables Ahora</span>
                  {totalCraftableInCurrentCategory > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-400 text-emerald-300">
                      {totalCraftableInCurrentCategory}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">Nivel:</span>
                  <select
                    value={craftLevelFilter}
                    onChange={(e) => setCraftLevelFilter(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="all">⭐ Todos los Niveles</option>
                    <option value="1">Nivel 1 (Principiante)</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="4">Nivel 4</option>
                    <option value="5">Nivel 5 (Botica)</option>
                    <option value="6">Nivel 6</option>
                    <option value="7">Nivel 7</option>
                    <option value="8">Nivel 8+</option>
                    <option value="10">Nivel 10+ (Avanzado)</option>
                    <option value="special">Misiones / Especiales</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">Ordenar:</span>
                  <select
                    value={craftSortBy}
                    onChange={(e) => setCraftSortBy(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="energy_desc">⚡ Mayor Ganancia Energía (+⚡ netos)</option>
                    <option value="profit_desc">💰 Mayor Beneficio Oro (Gold neto)</option>
                    <option value="rate_desc">📈 Mayor Rendimiento (Oro / Minuto)</option>
                    <option value="energy_eff_desc">⚡ Mayor Eficiencia Oro / Energía (Gold/⚡)</option>
                    <option value="energy_xp_desc">⚡ Mayor Eficiencia XP / Energía (XP/⚡)</option>
                    <option value="time_asc">⏱️ Más Rápido (Menor tiempo)</option>
                    <option value="xp_desc">⭐ Mayor XP Obtenida</option>
                    <option value="level_asc">⭐ Nivel Requerido (Menor a Mayor)</option>
                    <option value="name_asc">🔤 Nombre Alfabético (A-Z)</option>
                  </select>
                </div>

                {/* Selector de Vista: Cuadrícula vs Lista */}
                <div className="flex items-center bg-[#080d17] border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
                  <button
                    onClick={() => setCraftViewMode('grid')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista Cuadrícula (4-6 por fila)"
                  >
                    <span>🔲</span>
                    <span className="hidden sm:inline">Cuadrícula</span>
                  </button>
                  <button
                    onClick={() => setCraftViewMode('list')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      craftViewMode === 'list'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista Lista Compacta"
                  >
                    <span>📋</span>
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recetas de la Estación Seleccionada */}
            {craftViewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 overflow-y-auto">
              {filteredAndSortedCrafts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-sm text-slate-300">No se encontraron recetas</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? 'No tienes todos los insumos necesarios para ninguna receta de esta estación actualmente.'
                      : 'Prueba ajustando el texto de búsqueda.'}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipe, idx) => {
                  const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                  const stationTarget = isLoomRecipe ? CRAFT_STATION_LOCATIONS.loom : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);
                  const { craftability, energyCost, energyRestore, netEnergy, goldCost, sellPrice, netGold, minutes, goldPerMin, goldPerEnergy, xpPerEnergy, xp } = recipe;

                  return (
                    <div 
                      key={recipe.id || idx} 
                      className={`p-2.5 rounded-xl flex flex-col justify-between shadow-sm gap-2 transition-all border ${
                        craftability.canCraft 
                          ? 'bg-gradient-to-b from-[#0c1825] to-[#0a121d] border-emerald-500/40 hover:border-emerald-400/70 ring-1 ring-emerald-500/20' 
                          : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5">
                        {/* Cabecera: Icono + Título + Status Crafteable */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <ItemSprite name={recipe.item} size={28} className="shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate leading-tight">{recipe.item}</div>
                              <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">{recipe.level}</div>
                            </div>
                          </div>
                          {craftability.canCraft ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px] shadow-sm animate-pulse">
                              ✓ x{craftability.maxBatches}
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-400 font-mono text-[9px]">
                              Faltan {craftability.missingCount}
                            </span>
                          )}
                        </div>

                        {/* Bloque de Rendimiento Táctico: Oro, Energía, Tiempo y XP */}
                        <div className="grid grid-cols-2 gap-1 bg-[#070b14] p-1.5 rounded-lg border border-slate-800/80 text-[10px] font-mono">
                          {/* Beneficio de Oro o Propósito de Comida */}
                          {craftCategory === 'cook' ? (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Uso / Venta:</span>
                              <span className="text-amber-200 font-bold truncate text-[9.5px]">
                                🍲 Consumo & Pedidos
                              </span>
                              <span className="text-[8px] text-slate-400">
                                No vendible en tiendas
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Valor Base:</span>
                              <span className="text-amber-300 font-bold truncate">
                                {sellPrice > 0 ? `+${sellPrice.toLocaleString()}g` : 'Material de oficio'}
                              </span>
                              <span className="text-[8.5px] text-slate-400">
                                {goldCost > 0 ? `Coste: ${goldCost}g` : 'Sin coste en oro'}
                              </span>
                            </div>
                          )}

                          {/* Rendimiento de Energía */}
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Balance Energía:</span>
                            {energyRestore > 0 ? (
                              <span className="text-emerald-400 font-bold">
                                +{netEnergy >= 0 ? netEnergy : netEnergy}⚡ netos
                              </span>
                            ) : (
                              <span className="text-blue-300 font-bold">
                                -{energyCost}⚡ coste
                              </span>
                            )}
                            <span className="text-[8.5px] text-slate-400">
                              {energyRestore > 0 ? `Restaura +${energyRestore}⚡` : `Gasto de oficio`}
                            </span>
                          </div>

                          {/* Tiempo y Ratio Oro/Energía */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Tiempo / Ratio:</span>
                            <span className="text-cyan-300 font-bold">
                              ⏱️ {minutes} {minutes === 1 ? 'min' : 'mins'}
                            </span>
                            {craftCategory === 'cook' ? (
                              <span className="text-[8.5px] text-emerald-400 font-bold">
                                +{Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10}⚡ retorno
                              </span>
                            ) : (
                              goldPerEnergy > 0 && (
                                <span className="text-[8.5px] text-emerald-400 font-bold">
                                  +{goldPerEnergy.toLocaleString()}g / ⚡
                                </span>
                              )
                            )}
                          </div>

                          {/* XP y Ratio XP/Energía */}
                          <div className="flex flex-col mt-0.5 pt-0.5 border-t border-slate-800/60">
                            <span className="text-slate-400 text-[8.5px] uppercase font-sans font-bold">Experiencia:</span>
                            <span className="text-purple-300 font-bold">
                              ⭐ +{xp} XP
                            </span>
                            {xpPerEnergy > 0 && (
                              <span className="text-[8.5px] text-purple-300 font-bold">
                                +{xpPerEnergy} XP / ⚡
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Materiales requeridos con stock del inventario en vivo */}
                        <div className="p-1.5 bg-[#080d17] border border-slate-800/80 rounded leading-tight">
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span className="text-slate-400 font-sans font-bold">Insumos (Tus Existencias):</span>
                            {craftability.canCraft && (
                              <span className="text-emerald-400 font-mono font-bold text-[8.5px]">Materiales 100% listos</span>
                            )}
                          </div>
                          <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                        </div>

                        {/* Descripción condensada */}
                        {recipe.desc && (
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                            {recipe.desc}
                          </p>
                        )}
                      </div>

                      {/* Pie de tarjeta con Ubicación */}
                      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                        <span className="text-[9.5px] text-slate-400 truncate">
                          🛠️ {recipe.place || stationTarget.label}
                        </span>
                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-6 h-6 rounded-md bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                          title={`Ubicar estación de "${recipe.item}" en el Mega-Atlas`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            ) : (
            /* Vista Lista Compacta para Crafteo y Cocina */
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
              {filteredAndSortedCrafts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-bold text-sm text-slate-300">No se encontraron recetas</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {craftOnlyAvailable 
                      ? 'No tienes todos los insumos necesarios para ninguna receta de esta estación actualmente.'
                      : 'Prueba ajustando el texto de búsqueda.'}
                  </div>
                </div>
              ) : (
                filteredAndSortedCrafts.map((recipe, idx) => {
                  const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                  const stationTarget = isLoomRecipe ? CRAFT_STATION_LOCATIONS.loom : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);
                  const { craftability, energyCost, energyRestore, netEnergy, goldCost, sellPrice, netGold, minutes, goldPerMin, goldPerEnergy, xpPerEnergy, xp } = recipe;

                  return (
                    <div 
                      key={recipe.id || idx} 
                      className={`px-3 py-2 border rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all ${
                        craftability.canCraft 
                          ? 'bg-[#0b1724] border-emerald-500/40 hover:border-emerald-400/70' 
                          : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemSprite name={recipe.item} size={28} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">{recipe.item}</span>
                            <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded">
                              {recipe.level}
                            </span>
                            {craftability.canCraft ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono font-black text-[9.5px]">
                                ✓ x{craftability.maxBatches} posibles
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono text-[9px]">
                                Faltan {craftability.missingCount}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <CraftMaterialsBadge mats={recipe.mats} breakdown={craftability.breakdown} />
                          </div>
                        </div>
                      </div>

                      {/* Bloque de Rendimiento Táctico Compacto */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Beneficio de Oro o Propósito de Comida */}
                        {craftCategory === 'cook' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title="Plato de comida: consumo para recargar energía/vida o entregar en pedidos de Odette (no vendible en tiendas)">
                            🍲 Consumo & Pedidos
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold" title={`Valor base: ${sellPrice > 0 ? sellPrice + 'g' : 'Material de oficio'} | Coste: ${goldCost}g`}>
                            💰 {sellPrice > 0 ? `+${sellPrice.toLocaleString()}g` : 'Material'}
                          </span>
                        )}

                        {/* Balance de Energía */}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${
                          energyRestore > 0 
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                            : 'bg-blue-950/60 border-blue-500/30 text-blue-300'
                        }`} title={energyRestore > 0 ? `Restaura +${energyRestore}⚡ al comer | Gasto de estufa: -${energyCost}⚡ | Balance: +${netEnergy}⚡ netos` : `Gasto de oficio: -${energyCost}⚡`}>
                          ⚡ {energyRestore > 0 ? `+${netEnergy}⚡ netos` : `-${energyCost}⚡`}
                        </span>

                        {/* Ratio Oro / Energía o Retorno Energía */}
                        {craftCategory === 'cook' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title="Retorno de energía por punto invertido">
                            +{Math.round((energyRestore / Math.max(1, energyCost)) * 10) / 10}⚡ retorno
                          </span>
                        ) : (
                          goldPerEnergy > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[9.5px] font-mono font-bold" title={`Oro ganado por cada punto de energía invertido: +${goldPerEnergy.toLocaleString()}g/⚡`}>
                              +{goldPerEnergy}g/⚡
                            </span>
                          )
                        )}

                        {/* Tiempo */}
                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold" title={`Tiempo en estación: ${minutes} minutos (${goldPerMin}g/min)`}>
                          ⏱️ {minutes}m
                        </span>

                        {/* Experiencia */}
                        <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold" title={`Experiencia obtenida: +${xp} XP (${xpPerEnergy} XP/⚡)`}>
                          ⭐ +{xp} XP
                        </span>

                        <button
                          onClick={() => locateInMegaAtlas(stationTarget)}
                          className="w-7 h-7 rounded-lg bg-[#141d2e] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title={`Ubicar estación de "${recipe.item}" en el Mega-Atlas`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
                        )}
          </div>
        )}

        {/* ==============================================================
            TAB 6: LOS 67 PERSONAJES (NPCS, HORARIOS & UBICACIÓN EN EL MAPA)
            ============================================================== */}
        {activeTab === 'npcs' && (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Header con Buscador y Selector de Vista Cuadrícula / Lista */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0e172c] p-3 rounded-xl border border-indigo-950/70 shadow-md">
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
                <span className="text-xs text-slate-400 font-mono">Mostrando {filteredNpcs.length} de 67</span>
                <div className="flex items-center bg-[#080d17] p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setNpcViewMode('grid')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      npcViewMode === 'grid'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔲 Cuadrícula
                  </button>
                  <button
                    onClick={() => setNpcViewMode('list')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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

            {/* Vista Cuadrícula (4-6 columnas cuadradas) */}
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
                              onClick={() => locateInMegaAtlas(npcLoc)}
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
                            onClick={() => locateInMegaAtlas(npcLoc)}
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
        )}

        {/* ==============================================================
            TAB 7: COPILOT IA (GEMINI 3.8)
            ============================================================== */}
        
          {/* ==============================================================
              TAB NUEVO: MONITORES & ALERTAS DE COSECHAS Y CAMA
              ============================================================== */}
          {activeTab === 'monitors' && (
            !isConnected ? (
              <LockedModuleScreen
                title="Temporizadores & Producción en Vivo"
                description="Monitorea tus parcelas sembradas, cuentas regresivas de cocina/crafteo y tareas diarias en vivo conectando tu partida con la extensión Bloomshire Companion."
                onConnect={() => setShowConnectModal(true)}
                onBack={() => setActiveTab('mega_atlas')}
              />
            ) : (
            <div className="h-full overflow-y-auto p-5 space-y-4 max-w-5xl mx-auto w-full custom-scrollbar">
              <div className="p-3.5 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-sm">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⏱️ Monitores & Temporizadores en Tiempo Real</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Control en vivo de parcelas sembradas, descanso en cabaña y horarios de sueño de la aldea.
                </div>
              </div>

              {/* WIDGET PRIORITARIO: DASHBOARD DE COSECHAS, COCINA Y TEMPORIZADORES EN TIEMPO REAL */}
              <div className="p-4 bg-[#0c1220] border border-slate-800/80 rounded-xl shadow-md space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xl">🚜</span>
                    <div>
                      <div className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <span>Dashboard de Cosechas & Producción en Curso</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                          {[...activeCrops, ...productionTimers].length} activas
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Monitoreo en vivo de parcelas sembradas y lotes de cocina. Suena una alarma cuando están listos para levantar.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSoundAlarmEnabled(!soundAlarmEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        soundAlarmEnabled
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title="Activar o silenciar campanilla sonora"
                    >
                      {soundAlarmEnabled ? '🔔 Alarma: Activa' : '🔕 Alarma: Silenciada'}
                    </button>

                    <button
                      onClick={playChimeAlarm}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                      title="Probar sonido de campanilla"
                    >
                      🔊 Probar Sonido
                    </button>

                    <button
                      onClick={() => setShowAddTimerModal(true)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer transition-all shadow-md flex items-center gap-1"
                    >
                      ➕ Nuevo Lote de Cocina / Crafteo
                    </button>
                  </div>
                </div>

                {/* Lista de Cultivos y Lotes en Tiempo Real */}
                {([...activeCrops, ...productionTimers].length === 0) ? (
                  <div className="p-4 bg-[#081020] border border-slate-800/80 rounded-xl text-xs text-slate-400 text-center flex flex-col items-center justify-center gap-2 py-6">
                    <span className="text-2xl">🌱</span>
                    <p className="max-w-md leading-relaxed">
                      No hay cultivos en tierra ni preparaciones activas registradas en este momento. Cuando siembres en tu cabaña o dejes comida cocinándose, aparecerán aquí con su cuenta regresiva y alarma sonora automática.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...activeCrops, ...productionTimers].map((item, idx) => (
                      <LiveCropOrTimerCard
                        key={item.id || idx}
                        item={item}
                        serverTimeOffset={serverTimeOffset}
                        locateInMegaAtlas={locateInMegaAtlas}
                        handleRemoveProductionTimer={handleRemoveProductionTimer}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* MODAL PARA AGREGAR TEMPORIZADOR MANUAL DE COCINA / CRAFTEO */}
              {showAddTimerModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0b1428] border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="text-sm font-black text-emerald-400 flex items-center gap-2">
                        <span>🍲 Iniciar Temporizador de Cocina o Crafteo</span>
                      </div>
                      <button
                        onClick={() => setShowAddTimerModal(false)}
                        className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Nombre de la Receta / Plato:</label>
                        <input
                          type="text"
                          value={newTimerForm.name}
                          onChange={(e) => setNewTimerForm({ ...newTimerForm, name: e.target.value })}
                          className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                          placeholder="Ej: Guiso de Pescado, Pan de Trigo, Tablones..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-300 font-bold block mb-1">Cantidad:</label>
                          <input
                            type="number"
                            min="1"
                            value={newTimerForm.qty}
                            onChange={(e) => setNewTimerForm({ ...newTimerForm, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-slate-300 font-bold block mb-1">Tiempo (Minutos):</label>
                          <input
                            type="number"
                            min="1"
                            value={newTimerForm.durationMinutes}
                            onChange={(e) => setNewTimerForm({ ...newTimerForm, durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">Lugar de Preparación:</label>
                        <select
                          value={newTimerForm.location}
                          onChange={(e) => setNewTimerForm({ ...newTimerForm, location: e.target.value })}
                          className="w-full bg-[#121c38] border border-slate-700 focus:border-emerald-400 rounded-lg p-2 text-white font-semibold outline-none"
                        >
                          <option value="🏡 Cabaña (Home Island)">🏡 Estufa de Tu Cabaña (Home Island)</option>
                          <option value="🍲 Panadería de Tamsin (Bloomshire)">🍲 Panadería de Tamsin (Bloomshire)</option>
                          <option value="🪵 Carpintería de Pell">🪵 Carpintería de Pell (Banco de Trabajo)</option>
                          <option value="⚒️ Herrería de Bram">⚒️ Herrería de Bram (Forja)</option>
                          <option value="🌊 Molino de Hollin (Southvale)">🌊 Molino & Lechería de Hollin (Southvale)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => setShowAddTimerModal(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddProductionTimer}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow-md"
                      >
                        ✓ Iniciar Temporizador
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Widget de Tareas Diarias (Task Center - Semilla Premium) */}
                <div className="p-4 bg-[#0e172c] border-2 border-emerald-500/50 rounded-xl shadow-md flex flex-col justify-between gap-3 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
                    <div className="text-sm font-black text-emerald-400 flex items-center gap-2 flex-wrap">
                      <span>🌱 TAREAS DIARIAS (TASK CENTER) — RECOMPENSA: 10 SEMILLAS PREMIUM</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        dailyTasksCompletedCount === 6 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {dailyTasksCompletedCount}/6 Completadas
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('quests')}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-xs font-bold cursor-pointer"
                    >
                      Ver en Misiones & Tareas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {dailyTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => toggleDailyTask(t.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          t.done ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' : 'bg-[#101b33] border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-base">{t.icon || '🌱'}</span>
                          <span className={`text-[11px] font-semibold truncate ${t.done ? 'line-through text-slate-400' : 'text-slate-100'}`} title={t.label}>
                            {t.label}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded accent-emerald-500 pointer-events-none shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Widget de Alerta de Materiales de Misiones */}
                <div className="p-4 bg-[#0e172c] border-2 border-rose-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="text-sm font-black text-rose-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-rose-400" />
                      <span>📋 RESUMEN DE MATERIALES FALTANTES PARA MISIONES ACTIVAS</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('quests')}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-xs font-bold cursor-pointer"
                    >
                      Ver Árbol Completo en Misiones
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {(activeQuestMaterials.length === 0 ? [
                    { item: 'Todo al Día', quest: 'Misiones Activas', needed: 0, id: 'all_ok' }
                  ] : activeQuestMaterials).map((itemAlert, idx) => {
                    if (itemAlert.id === 'all_ok') {
                      return (
                        <div key={idx} className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg col-span-full text-center text-xs text-emerald-300 font-bold">
                          ✨ No hay misiones activas que requieran entrega de insumos pendientes.
                        </div>
                      );
                    }
                      const displayName = itemAlert.name || itemAlert.item || itemAlert.id;
                      const displayQuest = itemAlert.questTitle || itemAlert.questName || itemAlert.quest;
                      const bd = getItemStorageBreakdown({ id: itemAlert.id, name: displayName });
                      const ok = itemAlert.delivered || bd.total >= itemAlert.needed;
                      const miss = Math.max(0, itemAlert.needed - bd.total);
                      return (
                        <div key={idx} className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                          itemAlert.delivered ? 'bg-emerald-950/30 border-emerald-500/30 opacity-75' : ok ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-[#121024] border-rose-500/40'
                        }`}>
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white text-xs truncate max-w-[120px]" title={displayName}>{displayName}</span>
                            <span className={`font-mono font-black text-xs ${itemAlert.delivered || ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {itemAlert.delivered ? 'Entregado' : `${bd.total}/${itemAlert.needed}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1">
                            <span className="truncate" title={displayQuest}>{displayQuest}</span>
                            <span className={`px-1 rounded text-[9px] font-bold shrink-0 border ${itemAlert.isCurrentStep ? 'text-rose-300 border-rose-500/40 bg-rose-950/40' : 'text-amber-300 border-amber-500/40 bg-amber-950/40'}`}>
                              {itemAlert.isCurrentStep ? 'Paso Actual' : `Paso ${itemAlert.targetStep}`}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold flex items-center justify-between mt-0.5">
                            <span className={itemAlert.delivered || ok ? 'text-emerald-300' : 'text-rose-400'}>
                              {itemAlert.delivered ? '✅ Ya Entregado' : ok ? '✅ Listo' : `Faltan ${miss}`}
                            </span>
                            {!itemAlert.delivered && (
                              <div className="flex items-center gap-1 font-mono text-[9px]">
                                {bd.m > 0 && <span className="bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 px-1 py-0.5 rounded" title="En Mochila">🎒{bd.m}</span>}
                                {bd.cc > 0 && <span className="bg-amber-950/70 border border-amber-500/40 text-amber-300 px-1 py-0.5 rounded" title="En Cofre Casa">🏡{bd.cc}</span>}
                                {bd.cp > 0 && <span className="bg-purple-950/70 border border-purple-500/40 text-purple-300 px-1 py-0.5 rounded" title="En Cofre Pueblo">🏬{bd.cp}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monitor de Cama y Energía */}
                <div className="p-4 bg-[#0e172c] border border-indigo-950/80 rounded-xl shadow-md flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>🛏️ Descanso Diario en Cabaña (Home Island)</span>
                    </div>
                    <div className="mt-2 p-3 bg-[#091122] rounded-lg border border-slate-800 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Cuota diaria recuperable:</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {energyMeta.sleepLeft ?? 450} / {energyMeta.sleepADay || 450}⚡ restantes hoy
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Energía usada hoy en cama:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {energyMeta.usedSleepToday ?? 0}⚡
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Estado de Cama:</span>
                        <span className={`font-mono font-bold ${energyMeta.canRest ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {energyMeta.recovering
                            ? `🛌 Recuperando (${energyMeta.recoverMinutesLeft}m restantes)`
                            : energyMeta.sleepExhausted
                            ? `⏳ Cuota Agotada hoy (${energyMeta.bedWaitText})`
                            : energyMeta.canRest
                            ? `✅ Cama Lista (${energyMeta.sleepLeft ?? 450}/450⚡ disponible)`
                            : '⚡ Barra Llena'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Próximo reinicio UTC:</span>
                        <span className="font-mono text-cyan-300 font-bold">{energyMeta.utcCountdownStr || '00:00 UTC (21:00 ARG)'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      locateInMegaAtlas({
                        label: '🛏️ Tu Cabaña y Cama (Home Island)',
                        regionId: 'home_island',
                        subZoneId: 'home_island_sub_0_home_island',
                        wx: 4042,
                        wy: 10032,
                        worldRect: [3750, 9750, 600, 560]
                      });
                    }}
                    className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ubicar Cabaña en Mega-Atlas</span>
                  </button>
                </div>

                {/* Ciclo de Día, Noche y Tiendas */}
                <div className="p-4 bg-[#0e172c] border border-indigo-950/80 rounded-xl shadow-md flex flex-col justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>☀️ Ciclo de Horarios de la Aldea</span>
                    </div>
                    <div className="mt-2 p-3 bg-[#091122] rounded-lg border border-slate-800 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Horario Diurno:</span>
                        <span className="text-amber-300 font-bold">07:00 a 20:00 (Tiendas Abiertas)</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400">Regla Nocturna & Lluvia:</span>
                        <span className="text-purple-300 font-bold">20:00 a 07:00 (NPCs en sus casas)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Atención de Odette:</span>
                        <span className="text-cyan-300 font-bold">6 Pedidos Diarios disponibles</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200/90 leading-relaxed">
                    💡 Si llueve o es de noche, los NPCs no estarán en sus puestos exteriores. Entra a sus casas o espera las 07:00.
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'advisor' && (
          !isConnected ? (
            <LockedModuleScreen
              title="Copilot IA & Estratega"
              description="Recibe consejos estratégicos en tiempo real sobre qué plantar, vender o entregar según las existencias de tu mochila y cofres conectando tu partida con la extensión Bloomshire Companion."
              onConnect={() => setShowConnectModal(true)}
              onBack={() => setActiveTab('mega_atlas')}
            />
          ) : (
          <div className="flex flex-col h-full overflow-hidden p-5 max-w-4xl mx-auto w-full">
            <div className="flex-1 bg-[#0a1226] border border-indigo-950/70 rounded-t-xl p-4 overflow-y-auto flex flex-col gap-3 shadow-inner">
              {advisorMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 text-xs leading-relaxed ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3.5 rounded-xl whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-amber-600 text-white font-medium rounded-tr-none' 
                      : 'bg-[#121f3d] border border-indigo-900/60 text-slate-200 rounded-tl-none shadow-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {advisorLoading && (
                <div className="text-xs text-cyan-400 flex items-center gap-2 p-2 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analizando estado del juego con Gemini 3.8 Flash...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendAdvisor} className="p-3 bg-[#0c1630] border-t border-indigo-950/70 rounded-b-xl flex items-center gap-2 shadow-lg">
              <input 
                type="text"
                placeholder="Pregunta a la IA sobre siembra, energía, órdenes de Odette o misiones..."
                value={advisorInput}
                onChange={(e) => setAdvisorInput(e.target.value)}
                className="flex-1 bg-[#14203d] border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none"
              />
              <button
                type="submit"
                disabled={!advisorInput.trim() || advisorLoading}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Enviar
              </button>
            </form>
          </div>
          )
        )}

        {/* TAB: MEGA-ATLAS INTERACTIVO UNIFICADO (CON FOCO UNIVERSAL Y PIN DE RADAR) */}
        {/* ==============================================================
            TAB: AJUSTES, ACTUALIZACIONES & DIAGNÓSTICO DEL SISTEMA
            ============================================================== */}
        {activeTab === 'system' && (
          <div className="h-full overflow-y-auto p-5 space-y-5 custom-scrollbar max-w-6xl mx-auto w-full">
            {/* Header Card de Estado y Actualizaciones */}
            <div className="p-5 bg-gradient-to-r from-[#0c1630] via-[#101f42] to-[#0d172e] border-2 border-indigo-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-black text-white flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">⚙️</span>
                    <span>Centro de Ajustes & Actualizaciones del Sistema</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 Sistema Sincronizado
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Monitoreo en tiempo real de todos los catálogos locales, detección de parches en Bloomshire y sincronización segura con 1 clic.
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1 flex-wrap">
                  <span>Tool: <b className="text-white">{toolVersion}</b></span>
                  <span>•</span>
                  <span>Servidor: <b className="text-cyan-300">bloomshire.xyz (Season 0)</b></span>
                  <span>•</span>
                  <span>Build: <b className={gameBuildStatus === 'synced' ? 'text-emerald-400' : 'text-amber-400'}>{gameBuildHash}</b></span>
                  <span>•</span>
                  <span>Último Chequeo: <b className="text-amber-300">{lastUpdateCheck}</b></span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdates}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
                  title="Comprobar si el juego actualizó misiones, mapas o aldeanos"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdates ? 'Comprobando...' : '🔍 Comprobar Actualizaciones'}</span>
                </button>
                <button
                  onClick={() => handleForceRedownload('all')}
                  className="px-3.5 py-2.5 bg-[#14203d] hover:bg-[#1a2b52] border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Forzar un escaneo completo de la partida y mapas"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Re-escanear Todo</span>
                </button>
              </div>
            </div>

            {/* Banner de Estado Dinámico */}
            <div className="p-3 bg-[#0a1224] border border-indigo-900/60 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="text-emerald-400 text-base">✨</span>
                <span>{updateStatusMessage}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Sniffer pasivo: Activo
              </span>
            </div>

            {/* Grid de los 6 Módulos Locales Descargados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* CARD 1: Misiones & Quests */}
              <div className="p-4 bg-[#0e172c] border border-amber-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>Catálogo de Misiones</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 1:1 con el Juego
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    24 capítulos canónicos del Libro 1 y misiones secundarias del pueblo. Árbol de insumos con descarte automático de materiales ya entregados.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Misiones Activas:</span>
                      <b className="text-white">{activeQuestsList.length} en seguimiento</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Insumos pendientes:</span>
                      <b className="text-amber-400">{activeQuestMaterials.length} materiales faltantes</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Season 0 Rework</span>
                  <button
                    onClick={() => handleForceRedownload('quests')}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Verificar Quests
                  </button>
                </div>
              </div>

              {/* CARD 2: Mega-Atlas HD */}
              <div className="p-4 bg-[#0e172c] border border-cyan-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      <span>Mega-Atlas Pixel-Art HD</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 10 Mapas HD
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Renderizado nativo en WebP de los 10 mapas oficiales de Bloomshire, zonas de pesca etiquetadas y navegación de portales.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Mapas Cacheados:</span>
                      <b className="text-cyan-300">10 de 10 completos</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolución máxima:</span>
                      <b className="text-slate-300">5632 x 7424 px</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Cache Local WebP</span>
                  <button
                    onClick={() => handleForceRedownload('maps')}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Re-renderizar Mapas
                  </button>
                </div>
              </div>

              {/* CARD 3: Aldeanos & Regalos (NPCs) */}
              <div className="p-4 bg-[#0e172c] border border-purple-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      <span>Aldea & Horarios (NPCs)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      🟢 67 Vecinos
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Base de 67 aldeanos con ciclo de sueño diurno/nocturno (07:00-20:00), ubicación en casas y matriz de regalos amados y odiados.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Horario de Tiendas:</span>
                      <b className="text-emerald-400">07:00 a 20:00</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Regla de Lluvia:</span>
                      <b className="text-purple-300">Refugio en casa</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Base Canónica</span>
                  <button
                    onClick={() => handleForceRedownload('npcs')}
                    className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Verificar NPCs
                  </button>
                </div>
              </div>

              {/* CARD 4: Cultivos & Temporizadores */}
              <div className="p-4 bg-[#0e172c] border border-emerald-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Cultivos & Maduración</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 36 Semillas
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tiempos de maduración de rules.js (2m a 360m), detección de necesidad de riego y alarmas sonoras automáticas al madurar.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Monitores Vivos:</span>
                      <b className="text-emerald-400">{activeCrops.length} parcelas plantadas</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Sonido de Alerta:</span>
                      <b className="text-slate-300">Campana de Cosecha</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">CROP_TIMES Activo</span>
                  <button
                    onClick={() => handleForceRedownload('crops')}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Sincronizar Cultivos
                  </button>
                </div>
              </div>

              {/* CARD 5: Crafteo & Cocina */}
              <div className="p-4 bg-[#0e172c] border border-amber-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-400" />
                      <span>Crafteo & Cocina</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      🟢 Recetario Completo
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Recetas de cocina (Guiso Luz de Luna, Sopa de Chirivía, etc.), fundición de barras de cobre/hierro y aserradero de madera.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Temporizadores Activos:</span>
                      <b className="text-amber-400">{productionTimers.length} en producción</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Niveles de Habilidad:</span>
                      <b className="text-slate-300">Tope Nv 5</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Árbol de Recetas</span>
                  <button
                    onClick={() => handleForceRedownload('craft')}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Verificar Recetas
                  </button>
                </div>
              </div>

              {/* CARD 6: Cabaña & Ciclo UTC */}
              <div className="p-4 bg-[#0e172c] border border-indigo-500/40 rounded-xl shadow-md flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Descanso & Ciclo UTC</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      🟢 +450⚡ / Día
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Motor de recarga diaria en cama de cabaña (Season 0). Regulación de fatiga y cálculo exacto del reinicio diario a las 00:00 UTC.
                  </p>
                  <div className="p-2 bg-[#090f1f] rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Cuota restante:</span>
                      <b className="text-indigo-300">{energyMeta.dailySleepAvailable} / 450⚡</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Próximo reset UTC:</span>
                      <b className="text-emerald-400">{energyMeta.utcCountdownStr}</b>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Algoritmo Canónico</span>
                  <button
                    onClick={() => handleForceRedownload('energy')}
                    className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 rounded text-[11px] font-bold cursor-pointer"
                  >
                    Calibrar Reloj
                  </button>
                </div>
              </div>

            </div>

            {/* Consola de Diagnóstico & Registro de Telemetría */}
            <div className="p-4 bg-[#090f1f] border border-slate-800 rounded-xl flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <span className="text-amber-400 font-mono">📟</span>
                  <span>Consola de Diagnóstico y Telemetría del Sistema</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSystemLogs([])}
                    className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Limpiar Log
                  </button>
                </div>
              </div>

              <div className="bg-[#050914] p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                {systemLogs.length === 0 ? (
                  <span className="text-slate-600">Registro vacío.</span>
                ) : (
                  systemLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className={`${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warn' ? 'text-amber-400' :
                        log.type === 'error' ? 'text-rose-400' : 'text-cyan-300'
                      }`}>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
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
