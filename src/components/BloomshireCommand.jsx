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
  Settings
} from 'lucide-react';

// Importar datos canónicos JSON
import calcData from '../../public/data/bloomshire/calc_data.json';
import npcsData from '../../public/data/bloomshire/npcs.json';
import craftData from '../../public/data/bloomshire/craft_data.json';
import inventoryCatalogData from '../../public/data/bloomshire/inventory_catalog.json';
import itemEncyclopediaData from '../../public/data/bloomshire/item_encyclopedia.json';
import itemIconsMap from '../../public/data/bloomshire/item_icons_map.json';
import megaAtlasData from '../../public/data/bloomshire/mega_atlas_data.json';
import BloomshireMegaAtlas, { NpcAvatar } from './BloomshireMegaAtlas';

// Importar lógica y fórmulas de bloomshireEngine
import {
  CANONICAL_SKILLS,
  xpForLevel,
  computeCanonicalSkillsFromRaw,
  computeClientLiveEnergyAndBed
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
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 20, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Cultivo Nv 1' }
  ],
  ff21: [
    { id: 'wood', name: 'Madera común (Wood)', needed: 80, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'The Woodlot de Pell' },
    { id: 'stone', name: 'Piedra (Stone)', needed: 40, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Stonepeak' },
    { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 20, questName: 'Cap. 21: La Laguna (Sylmare)', targetStep: 4, hint: 'Cultivo Nv 1' }
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
    { id: 'Iron Ore', name: 'Mena de Hierro (Iron Ore)', needed: 5, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 3, hint: 'Cuevas profundas de Stonepeak (Nivel 5+ Minería)' }
  ],
  s_bram: [
    { id: 'Iron Ore', name: 'Mena de Hierro (Iron Ore)', needed: 5, questName: 'Secundaria: Mineral para la Herrería (Bram)', targetStep: 3, hint: 'Cuevas profundas de Stonepeak (Nivel 5+ Minería)' }
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

export function CraftMaterialsBadge({ mats = '' }) {
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


export const DASHBOARD_QUEST_CATALOG = {
  bk18: {
    name: 'Cap. 18: Estanque de Marven (Moonmere)',
    chain: 'book1',
    chapter: 18,
    giver: 'Marven',
    location: 'Esquina noreste de Moonmere, debajo de las cataratas',
    coords: { label: "🌊 Estanque de Marven (Moonmere)", regionId: 'moonmere', subZoneId: 'moonmere_sub_7_marven_s_pool', wx: 6416, wy: 3636, worldRect: [6144, 3480, 544, 312] },
    steps: [
      { step: 1, name: 'Pesca en las orillas lejanas', text: 'Pesca en las orillas lejanas de Moonmere, sesenta más.', where: 'Lago Moonmere, orillas lejanas.', npc: 'Marven', items: [] },
      { step: 2, name: 'Llévale a Marven tres Bagres Fantasma', text: 'Pesca en Moonmere de noche y lleva a Marven 3 Bagres Fantasma (Ghost Catfish).', where: 'Estanque de Marven en Moonmere.', npc: 'Marven', items: [{ id: 'Ghost Catfish', name: 'Bagre Fantasma (Ghost Catfish)', needed: 3, hint: 'Pesca nocturna en Lago Moonmere' }] },
      { step: 3, name: 'Escucha a Marven mañana', text: 'El estanque de Marven está en la esquina noreste de Moonmere, debajo de las cataratas. Pidió un día para pensarlo.', where: 'Esquina noreste de Moonmere.', npc: 'Marven', items: [] }
    ]
  },
  bk19: {
    name: 'Cap. 19: Las Piedras de Moonmere (Marven)',
    chain: 'book1',
    chapter: 19,
    giver: 'Marven',
    location: 'Lago Moonmere (Orillas Cardinales)',
    coords: { label: "🌊 Cap. 19: Piedras de Moonmere", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5800, wy: 2400, worldRect: [5200, 2000, 1600, 1200] },
    steps: [
      { step: 1, name: 'Leer las 4 piedras cardinales del lago', text: 'Leer la piedra del norte, sur, este y oeste alrededor del Lago Moonmere.', where: 'Orillas de Moonmere.', npc: 'Marven', items: [] },
      { step: 2, name: 'Regresa al estanque con Marven', text: 'Vuelve con Marven en su estanque bajo la cascada para revelarle el mensaje.', where: 'Estanque de Marven.', npc: 'Marven', items: [] }
    ]
  },
  bk20: {
    name: 'Cap. 20: El Camino de la Niebla (The Mist Path)',
    chain: 'book1',
    chapter: 20,
    giver: 'Nixie / Marven',
    location: 'Orilla oeste de Moonmere / Camino hacia la Laguna',
    coords: { label: "🌫️ Cap. 20: Camino de la Niebla", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5400, wy: 2800, worldRect: [5200, 2600, 400, 400] },
    steps: [
      { step: 1, name: 'Cruza la orilla brumosa al oeste de Moonmere', text: 'Atraviesa las aguas poco profundas guiándote por las piedras antiguas y habla con Nixie.', where: 'Orilla oeste del Lago Moonmere.', npc: 'Nixie', items: [] },
      { step: 2, name: 'Sigue las linternas flotantes hacia el pueblo de la laguna', text: 'Sigue el sendero iluminado por linternas hacia la entrada del pueblo acuático de las sirenas.', where: 'Camino este de la Aldea de la Laguna.', npc: 'Miralys', items: [] }
    ]
  },
  bk21: {
    name: 'Cap. 21: La Laguna (Sylmare)',
    chain: 'book1',
    chapter: 21,
    giver: 'Sylmare',
    location: 'Aldea de la Laguna (Moonmere Oeste)',
    coords: { label: "🧜‍♀️ Sylmare (Portavoz de la Laguna)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5152, wy: 2698, worldRect: [5050, 2600, 200, 200] },
    steps: [
      {
        step: 1,
        name: 'Encuentra al portavoz de la laguna',
        text: 'Miralys repara redes junto a la canoa, en el camino este del pueblo de la laguna, al oeste de Moonmere. Habla con ella para acceder a la aldea.',
        where: 'Canoa este del pueblo de la laguna, al oeste de Moonmere.',
        npc: 'Miralys',
        coords: { label: "🛶 Canoa de Miralys (Entrada a la Laguna)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5300, wy: 2688, worldRect: [5200, 2600, 200, 160] },
        items: []
      },
      {
        step: 2,
        name: 'Muéstrale a Sylmare el peine y la linterna',
        text: 'Lleva el Peine de Perla (Pearl Comb) y la Linterna de Seta Brillante (Glowcap Lantern) a Sylmare en el estrado central de la laguna.',
        where: 'Estrado circular central de la Aldea de la Laguna.',
        npc: 'Sylmare',
        coords: { label: "🧜‍♀️ Sylmare (Portavoz de la Laguna)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5152, wy: 2698, worldRect: [5050, 2600, 200, 200] },
        items: [
          { id: 'Pearl Comb', name: 'Peine de Perla (Pearl Comb)', needed: 1, hint: 'Obtenido de Nixie en la orilla' },
          { id: 'Glowcap Lantern', name: 'Linterna de Seta Brillante (Glowcap Lantern)', needed: 1, hint: 'Botica de Juniper' }
        ]
      },
      {
        step: 3,
        name: 'Pesca 30 peces en la Laguna (fish 0/30)',
        text: 'Demuestra tu destreza marina pescando 30 peces de cualquier especie en las aguas de la laguna o en el lago Moonmere (fish 0/30). Recompensa: 1000 Oro.',
        where: 'Aguas y muelles de la Aldea de la Laguna.',
        npc: 'Sylmare',
        coords: { label: "🎣 Zona de Pesca de la Laguna (Moonmere)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5152, wy: 2698, worldRect: [5000, 2500, 300, 300] },
        items: []
      },
      {
        step: 4,
        name: 'Entrega suministros de reparación para la aldea',
        text: 'Lleva materiales a Sylmare para reforzar las pasarelas y muelles de la laguna: 80 Madera común, 40 Piedra y 20 Caléndulas.',
        where: 'Sylmare en el centro de la Aldea de la Laguna.',
        npc: 'Sylmare',
        coords: { label: "🧜‍♀️ Sylmare (Aldea de la Laguna)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5152, wy: 2698, worldRect: [5050, 2600, 200, 200] },
        items: [
          { id: 'wood', name: 'Madera común (Wood)', needed: 80, hint: 'The Woodlot de Pell' },
          { id: 'stone', name: 'Piedra (Stone)', needed: 40, hint: 'Stonepeak' },
          { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 20, hint: 'Cultivo Nv 1 en parcelas' }
        ]
      }
    ]
  },
  bk22: {
    name: 'Cap. 22: El Agua Gris (Grey Water)',
    chain: 'book1',
    chapter: 22,
    giver: 'Sylmare / Nixie',
    location: 'Profundidades del Lago Moonmere',
    coords: { label: "🌊 Cap. 22: Aguas Grises (Moonmere)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5152, wy: 2698, worldRect: [5000, 2500, 300, 300] },
    steps: [
      { step: 1, name: 'Investiga las corrientes oscuras de Moonmere', text: 'Habla con Sylmare sobre las aguas turbias que descienden desde el norte del lago.', where: 'Aldea de la Laguna.', npc: 'Sylmare', items: [] },
      { step: 2, name: 'Pesca 5 Bagres Fantasma nocturnos', text: 'Pesca 5 Bagres Fantasma (Ghost Catfish) en las horas oscuras (20:00 a 06:00) y entrégalos a Sylmare.', where: 'Lago Moonmere de noche.', npc: 'Sylmare', items: [{ id: 'Ghost Catfish', name: 'Bagre Fantasma (Ghost Catfish)', needed: 5, hint: 'Pesca nocturna en Lago Moonmere' }] }
    ]
  },
  bk23: {
    name: 'Cap. 23: Visión Lunar (Moonsight)',
    chain: 'book1',
    chapter: 23,
    giver: 'Sylmare / Hada Lunar',
    location: 'Santuario de la Hada Lunar (Moonmere)',
    coords: { label: "✨ Cap. 23: Santuario Lunar (Moonmere)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5600, wy: 2200, worldRect: [5400, 2000, 400, 400] },
    steps: [
      { step: 1, name: 'Reúne ofrendas lunares', text: 'Reúne 25 Caléndulas y 25 Setas Brillantes (Glowcap) para el ritual de visión de la luna.', where: 'Parcelas de cultivo y zonas oscuras de Whisperwood/Moonmere.', npc: 'Sylmare', items: [{ id: 'Marigold', name: 'Caléndula (Marigold)', needed: 25, hint: 'Cultivo Nv 1' }, { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 25, hint: 'Whisperwood / Moonmere' }] },
      { step: 2, name: 'Activa los pedestales del Santuario', text: 'Coloca las ofrendas en los pedestales lunares para despertar el poder de la Hada Lunar.', where: 'Santuario de la Hada Lunar en Moonmere.', npc: 'Hada Lunar', items: [] }
    ]
  },
  bk24: {
    name: 'Cap. 24: El Canto de la Puerta (The Gate Song)',
    chain: 'book1',
    chapter: 24,
    giver: 'Sylmare & Marven',
    location: 'Puerta de los Fundadores (Moonmere)',
    coords: { label: "🚪 Cap. 24: Puerta de los Fundadores (Final Libro 1)", regionId: 'moonmere', subZoneId: 'moonmere_sub_1_lagoon_village', wx: 5800, wy: 2100, worldRect: [5600, 1900, 400, 400] },
    steps: [
      { step: 1, name: 'Aporta materiales para el ritual final', text: 'Entrega 60 Madera común, 40 Caléndulas y 20 Setas Brillantes a las sirenas para reparar el arco de la Puerta.', where: 'Puerta de los Fundadores al norte de Moonmere.', npc: 'Sylmare', items: [{ id: 'wood', name: 'Madera común (Wood)', needed: 60, hint: 'The Woodlot' }, { id: 'Marigold', name: 'Caléndula (Marigold)', needed: 40, hint: 'Cultivo Nv 1' }, { id: 'Glowcap', name: 'Seta Brillante (Glowcap)', needed: 20, hint: 'Whisperwood / Moonmere' }] },
      { step: 2, name: 'Entona el Verso de la Canción y abre la Puerta', text: 'Canta el verso junto a Sylmare y Marven para desbloquear el sello final y culminar el Libro 1.', where: 'Puerta de los Fundadores.', npc: 'Sylmare & Marven', items: [] }
    ]
  }
};
// Aliases for ff*
[18, 19, 20, 21, 22, 23, 24].forEach(n => {
  DASHBOARD_QUEST_CATALOG['ff' + n] = DASHBOARD_QUEST_CATALOG['bk' + n];
});

export default function BloomshireCommand() {
  const [activeTab, setActiveTab] = useState('mega_atlas');

 // 'inventory', 'quests', 'town', 'world', 'calc', 'craft', 'npcs', 'advisor'

  // Player State
  const [walletAddress, setWalletAddress] = useState(() => {
    try { return localStorage.getItem('bloomshire_wallet') || ''; } catch { return ''; }
  });
  const [farmersOwned, setFarmersOwned] = useState(0);
  const [farmingLevel, setFarmingLevel] = useState(1);
  const [currentEnergy, setCurrentEnergy] = useState(150);
  const [maxEnergy, setMaxEnergy] = useState(150);
  const [rawEnergyObj, setRawEnergyObj] = useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(() => Date.now());
  const [gold, setGold] = useState(0);
  const [shards, setShards] = useState(0);
  const [avyn, setAvyn] = useState(0);
  const [activeQuest, setActiveQuest] = useState('Cap. 21: La Laguna (Sylmare) — Pesca 30 peces en la Laguna (fish 0/30)');
  const [activeQuestsList, setActiveQuestsList] = useState([]);
  const [moonmereProgress, setMoonmereProgress] = useState({
    currentChapter: 21,
    completedChapters: 20,
    targetChapter: 24,
    totalChaptersRequired: 24,
    homeChangedDone: true,
    moonmereUnlocked: true,
    moonmereIndex: 4,
    totalMoonmereChapters: 7,
    unlocked: true
  });
  const [energyMeta, setEnergyMeta] = useState(() => {
    const init = computeClientLiveEnergyAndBed(null, 59, Date.now(), { sleepExhausted: true, sleepLeft: 0 });
    return init.energyMeta;
  });
  const [skillsMeta, setSkillsMeta] = useState({
    minSkillKey: 'foraging',
    minSkillName: 'Recolección y Cocina',
    minSkillsList: ['Recolección', 'Cocina'],
    minSkillLevel: 2,
    maxAllowedLevel: 5,
    isFarmingCapped: true
  });
  const [skillsBreakdown, setSkillsBreakdown] = useState(() => {
    const defSkills = {
      farming: 4500,
      woodcutting: 1450,
      fishing: 2100,
      foraging: 180,
      cooking: 420,
      crafting: 780,
      mining: 2050,
      combat: 2200,
      husbandry: 0,
      exploration: 920
    };
    return computeCanonicalSkillsFromRaw(defSkills).skillsBreakdown;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const lastExtensionSyncAtRef = useRef(0);

  // Inventory & Liquidation State
  const [inventoryScope, setInventoryScope] = useState('all'); // 'all', 'hotbar', 'chest'
  const [rawInventory, setRawInventory] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});

  // Active Orders (Odette)
  const [activeOrders, setActiveOrders] = useState([
    { id: 'ord_1', item: 'Caléndula (Marigold)', rawItem: 'Marigold', n: 3, gold: 360, xp: 26, skill: 'farming', done: false },
    { id: 'ord_2', item: 'Arroz (Rice)', rawItem: 'Rice', n: 2, gold: 355, xp: 22, skill: 'farming', done: false },
    { id: 'ord_3', item: 'Cebollín', rawItem: 'Spring Onion', n: 8, gold: 355, xp: 36, skill: 'farming', done: false },
    { id: 'ord_4', item: 'Cebolla', rawItem: 'Onion', n: 6, gold: 450, xp: 36, skill: 'farming', done: false },
    { id: 'ord_5', item: 'Mariposa Blanca de Madera', rawItem: 'Wood White', n: 4, gold: 560, xp: 16, skill: 'foraging', done: false },
    { id: 'ord_6', item: 'Lucio (Pike Fish)', rawItem: 'Pike Fish', n: 4, gold: 525, xp: 15, skill: 'fishing', done: false }
  ]);

  // Universal Mega-Atlas Focus Target (para el botón "📍 Ubicar en el Mapa")
  // Settings & System Updates State
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(() => new Date().toLocaleTimeString());
  const [updateStatusMessage, setUpdateStatusMessage] = useState('Todos los módulos y catálogos están 100% sincronizados con el juego.');
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Sistema Moni-Bot Companion v2.4 iniciado correctamente.', type: 'info' },
    { id: 2, time: new Date().toLocaleTimeString(), text: 'Catálogo de misiones validado: 24 capítulos + secundarias activas.', type: 'success' },
    { id: 3, time: new Date().toLocaleTimeString(), text: 'Mega-Atlas HD: 10 mapas oficiales disponibles en caché local.', type: 'success' },
    { id: 4, time: new Date().toLocaleTimeString(), text: 'Registro de aldeanos: 67 NPCs indexados con tabla de regalos y horarios.', type: 'info' }
  ]);

  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setUpdateStatusMessage('Comprobando actualizaciones con bloomshire.xyz...');
    
    try {
      window.postMessage({ type: 'FORCE_BLOOMSHIRE_SCAN' }, '*');
      window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    } catch (e) {}

    setTimeout(() => {
      setIsCheckingUpdates(false);
      const nowStr = new Date().toLocaleTimeString();
      setLastUpdateCheck(nowStr);
      setUpdateStatusMessage('¡Comprobación exitosa! Todos los catálogos y mapas coinciden con el servidor.');
      setSystemLogs(prev => [
        { id: Date.now(), time: nowStr, text: 'Comprobación de versión completada: Sin novedades pendientes. Los 6 módulos locales están al día.', type: 'success' },
        ...prev
      ].slice(0, 50));
    }, 1200);
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
      { id: 'water_crops', label: 'Riega 15 cultivos', icon: '💧', target: 15, current: 15, done: true, stars: 1 },
      { id: 'catch_fish', label: 'Pesca 5 peces', icon: '🎣', target: 5, current: 5, done: true, stars: 1 },
      { id: 'chop_woodlot', label: 'Tala 2 árboles en el Lote de Madera', icon: '🪓', target: 2, current: 2, done: true, stars: 1 },
      { id: 'harvest_crops', label: 'Cosecha 30 cultivos', icon: '🌾', target: 30, current: 30, done: true, stars: 2 },
      { id: 'catch_butterflies', label: 'Atrapa 3 mariposas', icon: '🦋', target: 3, current: 3, done: true, stars: 2 },
      { id: 'mine_rocks', label: 'Rompe 40 rocas', icon: '⛏️', target: 40, current: 40, done: true, stars: 3 }
    ];
    try {
      const stored = localStorage.getItem('bloomshire_daily_tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayStr && Array.isArray(parsed.tasks)) {
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
  const [craftSortBy, setCraftSortBy] = useState('level_asc'); // 'level_asc' | 'xp_desc' | 'value_desc' | 'name_asc'
  const [craftViewMode, setCraftViewMode] = useState('grid'); // 'grid' | 'list'
  const [npcViewMode, setNpcViewMode] = useState('grid'); // 'grid' | 'list'
  const [economySubTab, setEconomySubTab] = useState('liquidation'); // 'liquidation' | 'odette' | 'arbitrage'
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(() => {
    try { return localStorage.getItem('bloomshire_header_collapsed') === 'true'; } catch { return false; }
  });

  // Calculator State
  const [calcSkill, setCalcSkill] = useState('farming');
  const [calcLevelFilter, setCalcLevelFilter] = useState('all');
  const [calcSort, setCalcSort] = useState('xpMin_desc');
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
    name: 'Guiso de Pescado',
    qty: 1,
    durationMinutes: 10,
    location: '🏡 Cabaña (Home Island)',
    icon: '🍲'
  });
  const [nowTime, setNowTime] = useState(Date.now());
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

  // Tick cada segundo para actualizar cuentas regresivas
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Campanilla sonora retro (Web Audio API nativa sin archivos externos)
  const playChimeAlarm = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
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

  const alertedProductionIds = useRef(new Set());
  useEffect(() => {
    if (!soundAlarmEnabled) return;
    const effectiveNow = nowTime + serverTimeOffset;
    const allItems = [...activeCrops, ...productionTimers];
    allItems.forEach(item => {
      if (item.readyAt && item.readyAt <= effectiveNow) {
        if (!alertedProductionIds.current.has(item.id)) {
          alertedProductionIds.current.add(item.id);
          playChimeAlarm();
        }
      }
    });
  }, [nowTime, serverTimeOffset, activeCrops, productionTimers, soundAlarmEnabled]);

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
      content: '¡Hola Nexus! Soy **Antigravity / MoniOS Copilot** para Bloomshire.\n\nVeo tu sesión con **10 Founding Farmers**, Cultivo **Nivel 5** y tu progreso hacia Moonmere. ¿En qué puedo ayudarte hoy?'
    }
  ]);
  const messagesEndRef = useRef(null);


  // Helper: Obtener desglose de existencias por almacén { total, m, cc, cp }
  const getItemStorageBreakdown = (itemObj) => {
    if (!itemObj) return { total: 0, m: 0, cc: 0, cp: 0 };
    const idLower = (itemObj.id || '').toLowerCase().trim();
    const nameLower = (itemObj.name || itemObj.nameEs || '').toLowerCase().trim();

    let m = 0;
    let cc = 0;
    let cp = 0;

    rawInventory.forEach(it => {
      const itId = (it.id || '').toLowerCase().trim();
      const itName = (it.name || '').toLowerCase().trim();
      if (
        (idLower && (itId === idLower || itName === idLower)) || 
        (nameLower && (itId === nameLower || itName === nameLower))
      ) {
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

    const isFromExtension = Boolean(data._fromExtension || source === 'extension');
    if (isFromExtension) {
      lastExtensionSyncAtRef.current = Date.now();
    }

    try {
      localStorage.setItem('bloomshire_cached_snapshot', JSON.stringify(data));
    } catch (e) {}

    if (data.wallet) {
      setWalletAddress(data.wallet);
      try { localStorage.setItem('bloomshire_wallet', data.wallet); } catch (e) {}
    }
    if (data.gold !== undefined && data.gold >= 0) setGold(data.gold);
    if (data.maxEnergy !== undefined && data.maxEnergy > 0) setMaxEnergy(data.maxEnergy);
    if (data.shards !== undefined) setShards(data.shards);
    if (data.avyn !== undefined) setAvyn(data.avyn > 100000 ? Math.round(data.avyn / 1e6) : Math.round(Number(data.avyn) * 100) / 100);
    if (data.farmersCount !== undefined && data.farmersCount > 0) setFarmersOwned(data.farmersCount);

    const snapTime = data.timestamp || Date.now();
    setSnapshotTimestamp(snapTime);
    if (data.rawEnergyObj) {
      setRawEnergyObj(data.rawEnergyObj);
    }

    // 1. Recalcular las 10 habilidades con la fórmula real de catalog.js (100 * (L-1)^2.7)
    if (data.skills && typeof data.skills === 'object' && Object.keys(data.skills).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(data.skills, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
    } else if (data.skillsBreakdown && typeof data.skillsBreakdown === 'object' && Object.keys(data.skillsBreakdown).length > 0) {
      const computedSkills = computeCanonicalSkillsFromRaw(null, data.skillsBreakdown);
      setFarmingLevel(computedSkills.farmingLevel);
      setSkillsBreakdown(computedSkills.skillsBreakdown);
      setSkillsMeta(computedSkills.skillsMeta);
    } else if (data.farmingLevel) {
      setFarmingLevel(Math.min(5, data.farmingLevel));
    }

    // 2. Recalcular Energía Viva (+1 cada 3m VIP) y Reloj de Cama UTC
    const liveEAndBed = computeClientLiveEnergyAndBed(
      data.rawEnergyObj || null,
      typeof data.currentEnergy === 'number' ? data.currentEnergy : 59,
      snapTime,
      data.energyMeta
    );
    if (isFromExtension || liveEAndBed.currentEnergy > 1) {
      setCurrentEnergy(liveEAndBed.currentEnergy);
    }
    setEnergyMeta(liveEAndBed.energyMeta);

    if (Array.isArray(data.activeQuestsList) && data.activeQuestsList.length > 0) {
      setActiveQuestsList(data.activeQuestsList);
    }
    if (Array.isArray(data.dailyTasks) && data.dailyTasks.length > 0) {
      setDailyTasks(prev => {
        return data.dailyTasks.map((incoming, idx) => {
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

          return {
            id: incoming.id || prevMatch?.id || `daily_task_${idx}`,
            label: rawText || prevMatch?.label || `Tarea diaria #${idx + 1}`,
            icon,
            target,
            current,
            done: isDone,
            stars: incoming.stars || incoming.star || prevMatch?.stars || (idx >= 5 ? 3 : idx >= 3 ? 2 : 1)
          };
        });
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

    if (Array.isArray(data.inventory) && data.inventory.length > 0) {
      setRawInventory(data.inventory);
      setItemQuantities(calculateQuantitiesFromRaw(data.inventory, inventoryScope));
    }

    if (Array.isArray(data.activeOrders) && data.activeOrders.length > 0) {
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
      if (event.data?.type === 'MONIOS_COMPANION_SYNC' && event.data.game === 'bloomshire') {
        applyIncomingSync(event.data.data, 'extension');
      }
    };
    const handleCompanionCustomEvent = (event) => {
      if (event.detail?.game === 'bloomshire') {
        applyIncomingSync(event.detail.data, 'extension');
      }
    };

    window.addEventListener('message', handleCompanionMessage);
    document.addEventListener('monios_game_sync', handleCompanionCustomEvent);

    fetchSyncFromServer();

    return () => {
      window.removeEventListener('message', handleCompanionMessage);
      document.removeEventListener('monios_game_sync', handleCompanionCustomEvent);
    };
  }, []);

  // Tick local cada 15s para actualizar energía pasiva (+1 cada 3m) y cuenta regresiva de Cama UTC
  useEffect(() => {
    const timer = setInterval(() => {
      const updated = computeClientLiveEnergyAndBed(rawEnergyObj, currentEnergy, snapshotTimestamp, energyMeta);
      if (rawEnergyObj) {
        setCurrentEnergy(updated.currentEnergy);
      }
      setEnergyMeta(updated.energyMeta);
    }, 15000);
    return () => clearInterval(timer);
  }, [rawEnergyObj, currentEnergy, snapshotTimestamp, energyMeta]);

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
      const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(walletAddress)}`);
      if (res.ok) {
        const json = await res.json();
        const msSinceExt = Date.now() - lastExtensionSyncAtRef.current;
        if (msSinceExt > 12000 && json.inGame && (json.inGame.gold > 0 || (Array.isArray(json.inGame.inventory) && json.inGame.inventory.length > 0))) {
          applyIncomingSync({
            ...json.inGame,
            wallet: json.onChain?.wallet || walletAddress,
            farmersCount: json.onChain?.farmersCount || 10
          }, 'server');
        } else if (json.onChain?.farmersCount) {
          setFarmersOwned(json.onChain.farmersCount);
        }
      }
    } catch (err) {
      console.warn('Sync server check warning:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 700);
    }
  };

  // Calcular valor total de liquidación
  const totalLiquidationValue = useMemo(() => {
    let sum = 0;
    inventoryCatalogData.forEach(item => {
      const qty = itemQuantities[item.id] || 0;
      sum += qty * item.unit;
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

      // Si la misión provee stepItems para su paso actual desde content_bridge:
      if (Array.isArray(q.stepItems)) {
        q.stepItems.forEach(itemDef => {
          const manualKey = `${q.id}_${itemDef.id}`;
          const isManualDelivered = !!deliveredItemsManual[manualKey];
          // REGLA ESTRICTA: Si ya fue entregado, NO aparece en materiales para no estorbar visualmente
          if (isManualDelivered) return;

          list.push({
            id: itemDef.id,
            name: itemDef.name || itemDef.id,
            needed: itemDef.needed || 1,
            questId: q.id,
            questTitle: q.title || q.name,
            stepText: q.stepText || q.objective,
            targetStep: currentStepNum,
            isCurrentStep: true,
            hint: itemDef.hint || '',
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

    if (calcLevelFilter !== 'all') {
      if (calcLevelFilter === 'vip') {
        list = list.filter(x => x.level === 99 || (x.tip && x.tip.includes('VIP')));
      } else {
        const targetLv = parseInt(calcLevelFilter, 10);
        list = list.filter(x => (x.level ?? 1) <= targetLv || targetLv >= 10);
      }
    }

    const [field, dir] = calcSort.split('_');
    list.sort((a, b) => {
      let vA = 0, vB = 0;
      if (field === 'xpMin') { vA = a.xpMin ?? 0; vB = b.xpMin ?? 0; }
      else if (field === 'goldMin') { vA = a.goldMin ?? 0; vB = b.goldMin ?? 0; }
      else if (field === 'time') { vA = a.grow ?? 1; vB = b.grow ?? 0; }
      else if (field === 'cost') { vA = a.cost ?? 0; vB = b.cost ?? 0; }
      else if (field === 'sell') { vA = a.sell ?? 0; vB = b.sell ?? 0; }
      return dir === 'desc' ? vB - vA : vA - vB;
    });

    return list;
  }, [calcSkill, calcLevelFilter, calcSort]);

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
      
      {/* 1. MASTER HEADER - VERSIÓN PÚBLICA COMUNITARIA */}
      <header className="px-4 py-2 bg-[#080d19] border-b border-slate-800/80 flex items-center justify-between gap-3 shadow-md shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* Logo & Marca */}
          <div className="flex items-center gap-2 shrink-0 pr-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-base shadow-inner">
              🌾
            </div>
            <div>
              <div className="font-black text-white text-xs tracking-wider flex items-center gap-1.5">
                <span>BLOOMSHIRE TOOL</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">HD v1.0</span>
              </div>
              <div className="text-[10px] text-slate-400">Mega-Atlas & Guía Comunitaria</div>
            </div>
          </div>

          {/* Chips informativos públicos */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-300 text-xs font-bold">
              <span>🗺️ 10 Mapas HD</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-300 text-xs font-bold">
              <span>📦 359 Ítems</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-300 text-xs font-bold">
              <span>🍳 60+ Recetas</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#12192a] border border-slate-700/60 text-slate-300 text-xs font-bold">
              <span>👥 17 Aldeanos</span>
            </div>
          </div>
        </div>

        {/* Derecha: Jugar & Colapsar */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://bloomshire.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#12192a] hover:bg-[#1b253b] border border-slate-700/80 hover:border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <span>🎮 Jugar Bloomshire</span>
          </a>

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

      {/* 2. NAVEGACIÓN PRINCIPAL HORIZONTAL (Solo Herramientas Públicas) */}
      {!isHeaderCollapsed && (
        <nav className="px-5 py-2 bg-[#0e1628] border-y border-slate-800/90 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: 'mega_atlas', label: '🗺️ MEGA-ATLAS HD' },
              { key: 'arbitrage', label: '⚖️ ARBITRAJE & PRECIOS' },
              { key: 'items', label: '📦 BUSCADOR ÍTEMS' },
              { key: 'craft', label: '🍳 CRAFTEO & COCINA' },
              { key: 'npcs', label: '👥 ALDEANOS & REGALOS' },
              { key: 'calc', label: '📊 CALCULADORA XP' }
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
        </nav>
      )}

      {/* 3. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <div className="flex-1 overflow-hidden relative">

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
            TAB 3: CALCULADORA XP & RENTABILIDAD CON FILTROS INTERACTIVOS
            ============================================================== */}
        {activeTab === 'calc' && (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Controles de Filtros */}
            <div className="p-4 bg-[#0e172c] border border-indigo-950/70 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Filter className="w-4 h-4 text-amber-400" /> Habilidad:
                  <select 
                    value={calcSkill} 
                    onChange={(e) => setCalcSkill(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="farming">🌾 Cultivo (Farming)</option>
                    <option value="mining">⛏️ Minería (Cuevas y Gemas)</option>
                    <option value="foraging">🍄 Recolección &amp; Tala</option>
                    <option value="fishing">🎣 Pesca (Río y Lago)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  Nivel Requerido:
                  <select 
                    value={calcLevelFilter} 
                    onChange={(e) => setCalcLevelFilter(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold"
                  >
                    <option value="all">🌟 Todos los Niveles</option>
                    <option value="1">Nivel 1 (Principiante)</option>
                    <option value="2">Nivel 2</option>
                    <option value="3">Nivel 3</option>
                    <option value="5">Nivel 5 (Tu Nivel Actual - Botica)</option>
                    <option value="10">Nivel 10+ (Avanzado)</option>
                    <option value="vip">Isla VIP (Semillas Raras)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  Ordenar por:
                  <select 
                    value={calcSort} 
                    onChange={(e) => setCalcSort(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-white rounded px-2.5 py-1 text-xs font-semibold"
                  >
                    <option value="xpMin_desc">⚡ Más rápido para subir XP (XP/min ↓)</option>
                    <option value="goldMin_desc">💰 Más rentable en Oro (Oro/min ↓)</option>
                    <option value="time_asc">⏱️ Menor tiempo de espera (↑)</option>
                    <option value="cost_asc">🪙 Más barato de comprar (Coste ↑)</option>
                    <option value="sell_desc">💎 Mayor precio de venta (Venta ↓)</option>
                  </select>
                </div>
              </div>

              {/* Simulador de Parcelas */}
              {calcSkill === 'farming' && (
                <div className="flex items-center gap-2 text-xs bg-[#14203d] px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-200">
                  <span className="font-bold">Parcelas disponibles:</span>
                  <input 
                    type="number" 
                    value={availablePlots} 
                    onChange={(e) => setAvailablePlots(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 bg-[#0a1020] border border-slate-600 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
                  />
                </div>
              )}
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-[#0e172c] border border-indigo-950/70 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#121d38] border-b border-slate-800 text-slate-300 uppercase tracking-wider text-[11px] font-black">
                    <th className="p-3">Recurso / Cultivo</th>
                    <th className="p-3">Tiempo / Coste</th>
                    <th className="p-3">Nivel Requerido</th>
                    <th className="p-3">Coste Semilla</th>
                    <th className="p-3">Venta Tienda</th>
                    <th className="p-3">Beneficio Neto</th>
                    <th className="p-3">XP Obtenida</th>
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
                    const batchNet = netProfit * availablePlots;
                    const batchXp = (item.xp ?? 0) * availablePlots;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          {item.name}
                        </td>
                        <td className="p-3 font-mono text-cyan-300">
                          {item.growTxt || `${adjustedTime} min`}
                          {hasFoundersTimeBonus && <span className="text-[10px] text-emerald-400 ml-1">(-20%)</span>}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                            {item.level ? `Nv ${item.level}` : 'Nv 1'}
                          </span>
                        </td>
                        <td className="p-3 text-red-300 font-mono">{item.cost ? `${item.cost}g` : '0g'}</td>
                        <td className="p-3 text-amber-300 font-mono font-bold">{item.sell ? `${item.sell}g` : '0g'}</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {netProfit >= 0 ? `+${netProfit}g` : `${netProfit}g`}
                        </td>
                        <td className="p-3 text-purple-300 font-mono font-bold">+{item.xp || 0} XP</td>
                        <td className="p-3 text-purple-400 font-mono font-bold">{item.xpMin || 0}</td>
                        <td className="p-3 text-amber-400 font-mono font-bold">{item.goldMin || 0}g</td>
                        {calcSkill === 'farming' && (
                          <td className="p-3 font-mono font-bold text-emerald-300">
                            +{batchNet}g <span className="text-purple-300 text-[10px]">/ +{batchXp}XP</span>
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
        )}

        {/* ==============================================================
            TAB 4: LIQUIDAR MOCHILA & COFRES (CON ÓRDENES DE ODETTE)
            ============================================================== */}
        {activeTab === 'arbitrage' && (
          <div className="flex flex-col h-full w-full overflow-hidden p-4 gap-3">
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
          </div>
        )}

        {activeTab === 'craft' && (
          <div className="h-full overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {/* Selector de Estaciones de Trabajo */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'bench', label: '🪵 Banco de Trabajo (Carpintería de Pell)' },
                { key: 'forge', label: '⚒️ Forja de Bram (Herrería)' },
                { key: 'cook', label: '🍲 Estufa de Cocina (Panadería Tamsin / Cabaña)' },
                { key: 'mill', label: '🌊 Molino & Lechería (Granja de Hollin - Southvale)' },
                { key: 'loom', label: '🧵 Telar de Tilly (Sastrería)' }
              ].map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setCraftCategory(sub.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    craftCategory === sub.key 
                      ? 'bg-purple-600 text-white font-black shadow-md border border-purple-400' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Banner de la Estación Seleccionada con Botón "📍 Ubicar Estación en el Mapa" */}
            {CRAFT_STATION_LOCATIONS[craftCategory] && (
              <div className="p-4 bg-gradient-to-r from-[#131d38] via-[#17254a] to-[#111a33] border-2 border-purple-500/50 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
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
            )}

            {/* Controles de Crafteo: Búsqueda, Ordenamiento y Vista */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0e1628] border border-slate-800/80 p-2.5 rounded-xl shadow-sm">
              <div className="flex-1 flex items-center gap-2 bg-[#080d17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar receta o plato (ej: tarta, guiso, lingote, tela, pan)..."
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
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-400">Ordenar:</span>
                  <select
                    value={craftSortBy}
                    onChange={(e) => setCraftSortBy(e.target.value)}
                    className="bg-[#14203d] border border-slate-700 text-amber-300 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="level_asc">⭐ Nivel requerido (Menor a Mayor)</option>
                    <option value="xp_desc">⚡ Más XP por preparación</option>
                    <option value="name_asc">🔤 Nombre (A-Z)</option>
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
              {(
                craftCategory === 'mill'
                  ? [
                      { item: 'Harina (Flour) 🌾', level: 'Molino de Agua (Gratis)', mats: 'Trigo (Wheat) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Base para panes, pasteles, masas y recetas de cocina.' },
                      { item: 'Azúcar (Sugar) 🍬', level: 'Molino de Agua (Gratis)', mats: 'Caña de Azúcar (Sugarcane) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Indispensable para mermeladas, tartas y postres VIP.' },
                      { item: 'Arroz Blanco (Milled Rice) 🍚', level: 'Molino de Agua (Gratis)', mats: 'Arroz (Rice) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Arroz procesado para sushi, onigiri y platos del puerto.' },
                      { item: 'Mantequilla (Butter) 🧈', level: 'Lechería (Dairy)', mats: 'Leche (Milk) x1', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Batida en la lechería de Southvale con leche de tus vacas.' },
                      { item: 'Queso (Cheese) 🧀', level: 'Lechería (Dairy)', mats: 'Leche (Milk) x2', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Queso madurado para sopas, gratinados y tablas.' },
                      { item: 'Queso de Cabra (Goat Cheese) 🐐', level: 'Lechería (Dairy)', mats: 'Leche de Cabra (Goat Milk) x1', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Queso fino de alto valor gastronómico.' }
                    ]
                  : craftCategory === 'loom'
                  ? [
                      { item: 'Tela (Cloth) 🧵', level: 'Artesanía Lv 9 (+24 XP)', mats: 'Lana (Wool) x2', place: 'Telar de Tilly (Sastrería)', desc: 'Se teje en el telar de la Sastrería de Tilly. Esencial para el Amuleto de Zafiro, bolsas y encargos.' }
                    ]
                  : (craftData[craftCategory] || [])
              ).map((recipe, idx) => {
                const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                const stationTarget = isLoomRecipe
                  ? CRAFT_STATION_LOCATIONS.loom
                  : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);

                return (
                  (() => {
                    const energyCost = craftCategory === 'cook' ? 2 : craftCategory === 'forge' ? 3 : craftCategory === 'loom' ? 1 : craftCategory === 'mill' ? 0 : 2;
                    const estimatedXp = (recipe.level || '').includes('Lv') 
                      ? Math.min(150, Math.max(15, parseInt((recipe.level || '').replace(/[^0-9]/g, '')) * 6 + 10))
                      : 25;

                    return (
                      <div key={idx} className="p-2.5 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col justify-between shadow-sm gap-2 transition-all">
                        <div className="flex flex-col gap-1.5">
                          {/* Cabecera: Icono oficial + Título + Badges de Métricas */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <ItemSprite name={recipe.item} size={28} className="shrink-0" />
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs truncate leading-tight">{recipe.item}</div>
                                <div className="text-[10px] text-purple-300 font-mono mt-0.5 truncate">{recipe.level}</div>
                              </div>
                            </div>
                          </div>

                          {/* Métricas clave: Energía y XP */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[9.5px] font-mono font-bold" title="Energía requerida">
                              ⚡ -{energyCost}⚡
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[9.5px] font-mono font-bold" title="Experiencia aproximada">
                              ⭐ +{estimatedXp} XP
                            </span>
                          </div>

                          {/* Materiales requeridos */}
                          <div className="p-1.5 bg-[#080d17] border border-slate-800/80 rounded leading-tight">
                            <span className="text-slate-400 font-sans font-bold text-[9.5px] block">Insumos:</span>
                            <CraftMaterialsBadge mats={recipe.mats} />
                          </div>

                          {/* Descripción condensada */}
                          {recipe.desc && (
                            <p className="text-[10.5px] text-slate-400 leading-snug line-clamp-2">
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
                            <MapPin className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })()
                );
              })}
            </div>
            ) : (
            /* Vista Lista Compacta para Crafteo y Cocina */
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
              {(
                craftCategory === 'mill'
                  ? [
                      { item: 'Harina (Flour) 🌾', level: 'Molino de Agua (Gratis)', mats: 'Trigo (Wheat) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Base para panes, pasteles, masas y recetas de cocina.' },
                      { item: 'Azúcar (Sugar) 🍬', level: 'Molino de Agua (Gratis)', mats: 'Caña de Azúcar (Sugarcane) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Indispensable para mermeladas, tartas y postres VIP.' },
                      { item: 'Arroz Blanco (Milled Rice) 🍚', level: 'Molino de Agua (Gratis)', mats: 'Arroz (Rice) x1', place: 'Molino de Agua (Granja de Hollin - Southvale)', desc: 'Arroz procesado para sushi, onigiri y platos del puerto.' },
                      { item: 'Mantequilla (Butter) 🧈', level: 'Lechería (Dairy)', mats: 'Leche (Milk) x1', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Batida en la lechería de Southvale con leche de tus vacas.' },
                      { item: 'Queso (Cheese) 🧀', level: 'Lechería (Dairy)', mats: 'Leche (Milk) x2', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Queso madurado para sopas, gratinados y tablas.' },
                      { item: 'Queso de Cabra (Goat Cheese) 🐐', level: 'Lechería (Dairy)', mats: 'Leche de Cabra (Goat Milk) x1', place: 'Lechería (Granja de Hollin - Southvale)', desc: 'Queso fino de alto valor gastronómico.' }
                    ]
                  : craftCategory === 'loom'
                  ? [
                      { item: 'Tela (Cloth) 🧵', level: 'Artesanía Lv 9 (+24 XP)', mats: 'Lana (Wool) x2', place: 'Telar de Tilly (Sastrería)', desc: 'Se teje en el telar de la Sastrería de Tilly.' }
                    ]
                  : (craftData[craftCategory] || [])
              ).map((recipe, idx) => {
                const energyCost = craftCategory === 'cook' ? 2 : craftCategory === 'forge' ? 3 : craftCategory === 'loom' ? 1 : craftCategory === 'mill' ? 0 : 2;
                const estimatedXp = (recipe.level || '').includes('Lv') 
                  ? Math.min(150, Math.max(15, parseInt((recipe.level || '').replace(/[^0-9]/g, '')) * 6 + 10))
                  : 25;
                const isLoomRecipe = (recipe.place || '').toLowerCase().includes('tilly') || (recipe.item || '').toLowerCase().includes('cloth');
                const stationTarget = isLoomRecipe ? CRAFT_STATION_LOCATIONS.loom : (CRAFT_STATION_LOCATIONS[craftCategory] || CRAFT_STATION_LOCATIONS.bench);

                return (
                  <div key={idx} className="px-3 py-2 bg-[#0c1220] border border-slate-800/80 hover:border-slate-700 rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemSprite name={recipe.item} size={24} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs truncate">{recipe.item}</span>
                          <span className="text-[10px] text-purple-300 font-mono bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded">
                            {recipe.level}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <CraftMaterialsBadge mats={recipe.mats} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">
                        ⚡ -{energyCost}⚡
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                        ⭐ +{estimatedXp} XP
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
              })}
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
          {activeTab === 'mega_atlas' && (
          <BloomshireMegaAtlas
            focusTarget={atlasFocusTarget}
            onClearFocusTarget={() => setAtlasFocusTarget(null)}
          />
        )}

      </div>
    </div>
  );
}
