import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Upload,
  Sparkles,
  ShieldCheck,
  Hand,
  MousePointer,
  ChevronsUpDown,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X
} from 'lucide-react';
import megaAtlasData from '../../public/data/bloomshire/mega_atlas_data.json';
import RegionCompendium from './bloomshire/official/RegionCompendium';
import BeastSearchResults from './bloomshire/official/BeastSearchResults';
import useOfficialData from './bloomshire/official/useOfficialData';
import { searchBeasts, atlasRegionsOfBeast } from './bloomshire/official/compendiumModel';
import mapsMetaData from '../../public/data/bloomshire/maps/maps_meta.json';
import { officialNpc, pickEnEs, giftName, OFFICIAL_QUESTS_CLUES } from './bloomshire/bloomshireHelpers';
import npcLooksData from '../../public/data/bloomshire/npc_looks.json';

// Coordenadas exactas de ensamblaje de los 10 mapas exteriores reales en el lienzo unificado (8650 x 10650 px)
const REAL_MAP_SLOTS = [
  { mapId: 'bloomshire', label: 'Bloomshire Central (Moonmere, Pueblo, Southvale, Bahía)', ox: 2800, oy: 2200, w: 5632, h: 7424 },
  { mapId: 'whisperwood', label: 'Bosque Whisperwood', ox: 2800, oy: 2200, w: 1792, h: 5504 },
  { mapId: 'stonepeak', label: 'Montañas de Stonepeak', ox: 6640, oy: 2200, w: 1792, h: 5504 },
  { mapId: 'everbloom', label: 'The Everbloom', ox: 1550, oy: 120, w: 2560, h: 1920 },
  { mapId: 'frosthaven', label: 'Frosthaven', ox: 5850, oy: 120, w: 2688, h: 1952 },
  { mapId: 'barrowmire', label: 'The Barrowmire & Night Court', ox: 80, oy: 2200, w: 2560, h: 1920 },
  { mapId: 'dreaming_fields', label: 'The Dreaming Fields', ox: 1100, oy: 4350, w: 1536, h: 1152 },
  { mapId: 'home_island', label: 'Tu Isla (Home Island)', ox: 3650, oy: 9750, w: 768, h: 512 },
  { mapId: 'vip_quarter', label: 'Barrio VIP (VIP Quarter)', ox: 5100, oy: 9720, w: 768, h: 672 },
  { mapId: 'colosseum', label: 'El Coliseo (Colosseum)', ox: 6050, oy: 9600, w: 1152, h: 928 }
];

// Mapas pre-instalados de fábrica en el servidor (/data/bloomshire/maps/*.webp) para que cualquier visitante vea el 10/10 sin extensión
const DEFAULT_BUNDLED_MAPS = Object.fromEntries(
  Object.entries(mapsMetaData || {}).map(([mapId, m]) => [
    mapId,
    {
      mapId,
      dataUrl: m.url,
      pixelWidth: m.pixelWidth,
      pixelHeight: m.pixelHeight,
      scale: m.scale,
      fishingSpots: m.fishingSpots || [],
      bundled: true
    }
  ])
);

const MAP_OFFSET_LOOKUP = Object.fromEntries(REAL_MAP_SLOTS.map(s => [s.mapId, s]));

// Sprites públicos oficiales del CDN de Bloomshire (200 OK sin sesión)
const PACK_CDN = 'https://bloomshire.xyz/play/pack';
const PUBLIC_SPRITES = {
  wood: `${PACK_CDN}/Icons/RPG%20icons/Extras/Wood.png`,
  stone: `${PACK_CDN}/Icons/RPG%20icons/Extras/Stones.png`,
  goldenFish: `${PACK_CDN}/Icons/Fish/River/Golden%20Fish.png`,
  ghostCatfish: `${PACK_CDN}/Icons/Fish/River/Ghost%20Catfish.png`,
  butterfly: `${PACK_CDN}/Animals/Forest/Bugs/Butterfly/Butterflies.png`,
  chest: `${PACK_CDN}/Objects/Exterior/chest.png`,
  cavesSheet: `${PACK_CDN}/Tileset/Caves.png`
};

// Persistencia en IndexedDB para almacenar los 10 mapas Pixel-Art completos sin límite de 5MB de localStorage
const IDB_NAME = 'monios_bloomshire_real_atlas_v1';
const IDB_STORE = 'rendered_maps';

function openAtlasIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'mapId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadAllRenderedMapsFromIdb() {
  try {
    const db = await openAtlasIdb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const mapObj = {};
        (getAllReq.result || []).forEach(item => {
          if (item && item.mapId && item.dataUrl) {
            mapObj[item.mapId] = item;
          }
        });
        resolve(mapObj);
      };
      getAllReq.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

async function saveRenderedMapToIdb(mapPayload) {
  try {
    if (!mapPayload || !mapPayload.mapId || !mapPayload.dataUrl) return;
    const db = await openAtlasIdb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(mapPayload);
  } catch { }
}


// Retratos Oficiales de Bloomshire 64x64 generados directamente
export function NpcAvatar({ npcId, name = '', size = 64, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const idKey = (npcId || '').toLowerCase().trim();

  if (!idKey || hasError) {
    return (
      <div 
        className={`rounded-xl bg-[#141d2e] border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        👤
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-[#141d2e] border border-amber-500/40 shadow-inner shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={`/data/bloomshire/portraits/${idKey}.png`}
        alt={name || idKey}
        className="w-full h-full object-cover scale-[1.18] -translate-y-[6%]"
        style={{ imageRendering: 'pixelated' }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function BloomshireMegaAtlas({ focusTarget = null, onClearFocusTarget = null }) {
  const { t: tA, i18n: i18nA } = useTranslation('atlas');
  const atlasEn = String(i18nA.language || '').toLowerCase().startsWith('en');
  // Nombres de zona: el oficial del juego en ingles, el de la tool en espanol
  const subName = (s) => (atlasEn ? (s?.nameEn || s?.nameEs) : s?.nameEs) || '';
  const regName = (r) => (atlasEn ? (r?.enName || r?.name) : r?.name) || '';
  // Pistas de misiones: el texto del juego (quests.json _clues) y la mision a la que pertenecen
  const clueKeyOf = (c) => c?.clueKey || String(c?.id || '').replace(/_\d+$/, '');
  const clueLabel = (c) => {
    const o = OFFICIAL_QUESTS_CLUES[clueKeyOf(c)];
    if (!o) return c?.name || '';
    const text = atlasEn ? o.text_en : (o.text_es || o.text_en);
    const quest = atlasEn ? o.quest_en : (o.quest_es || o.quest_en);
    return quest ? `✨ ${text} (${quest})` : `✨ ${text}`;
  };
  // Puertas del mapa: el nombre del lugar es el del juego; solo se traduce el prefijo
  const doorLabel = (d) => {
    const name = String(d?.name || '');
    const m = name.match(/^🚪 Paso a (.+)$/) || name.match(/^🕳️ Cueva: (.+)$/);
    if (!m) return name;
    return name.startsWith('🚪') ? tA('panel.doorTo', { name: m[1] }) : tA('panel.cave', { name: m[1] });
  };
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estado de cámara (Zoom & Pan sobre el lienzo de 8650 x 10650)
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef(false);
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);

  // Herramienta activa del cursor: 'hand' (mover sin seleccionar), 'pointer' (seleccionar sin latigazo), 'zoom' (lupa al clic)
  const [cursorTool, setCursorTool] = useState('pointer');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activePin, setActivePin] = useState(null);

  // Mapas Pixel-Art reales pre-cargados de fábrica (10/10) + actualizables desde el motor del juego
  const [realMaps, setRealMaps] = useState(() => ({ ...DEFAULT_BUNDLED_MAPS }));
  const [isSyncingMaps, setIsSyncingMaps] = useState(false);
  const [lastSyncedMapName, setLastSyncedMapName] = useState('');

  // Selección y Hover
  const [selectedRegionId, setSelectedRegionId] = useState('bloomshire_town');
  const [selectedSubZone, setSelectedSubZone] = useState(() => {
    const townReg = megaAtlasData.regions.find(r => r.id === 'bloomshire_town');
    return townReg?.subZones?.[0] || null;
  });
  const [hoveredSubZoneId, setHoveredSubZoneId] = useState(null);
  const [hoveredNpcId, setHoveredNpcId] = useState(null);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [expandedRegions, setExpandedRegions] = useState({
    moonmere: true,
    bloomshire_town: true,
    whisperwood: true,
    stonepeak: true
  });

  // Buscador y Capas visibles
  const [searchQuery, setSearchQuery] = useState('');
  const [focusBeast, setFocusBeast] = useState(null); // { id, ts } criatura elegida en el buscador
  const bestiaryData = useOfficialData('bestiary');
  const [showPixelArtLayer, setShowPixelArtLayer] = useState(true);
  const [showSubZonesLayer, setShowSubZonesLayer] = useState(true);
  const [showLabelsLayer, setShowLabelsLayer] = useState(true);
  const [showFishingLayer, setShowFishingLayer] = useState(true);
  const [showDoorsLayer, setShowDoorsLayer] = useState(true);
  const [showNpcsLayer, setShowNpcsLayer] = useState(true);
  const [showCluesLayer, setShowCluesLayer] = useState(true);

  // Cargar mapas reales guardados en IndexedDB al montar y escuchar nuevos mapas desde la extensión
  const ingestMapPayload = useCallback((payload) => {
    if (!payload || !payload.mapId || !payload.dataUrl) return;
    setRealMaps(prev => {
      if (prev[payload.mapId]?.renderedAt === payload.renderedAt) return prev;
      return { ...prev, [payload.mapId]: payload };
    });
    setLastSyncedMapName(payload.mapId);
    saveRenderedMapToIdb(payload);
  }, []);

  useEffect(() => {
    loadAllRenderedMapsFromIdb().then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        setRealMaps(prev => ({ ...prev, ...saved }));
      }
    });

    const onWindowMsg = (e) => {
      if (e.data?.type === 'MONIOS_BLOOMSHIRE_MAP' && e.data.payload) {
        ingestMapPayload(e.data.payload);
      } else if (e.data?.type === 'MONIOS_COMPANION_SYNC' && e.data?.data?._renderedMap) {
        ingestMapPayload(e.data.data._renderedMap);
      }
    };

    const onCustomMap = (e) => {
      if (e.detail?.mapId && e.detail?.dataUrl) {
        ingestMapPayload(e.detail);
      }
    };

    const onCustomSync = (e) => {
      if (e.detail?.data?._renderedMap) {
        ingestMapPayload(e.detail.data._renderedMap);
      }
    };

    window.addEventListener('message', onWindowMsg);
    document.addEventListener('monios_bloomshire_map', onCustomMap);
    document.addEventListener('monios_game_sync', onCustomSync);

    return () => {
      window.removeEventListener('message', onWindowMsg);
      document.removeEventListener('monios_bloomshire_map', onCustomMap);
      document.removeEventListener('monios_game_sync', onCustomSync);
    };
  }, [ingestMapPayload]);

  // Solicitar sincronización segura de los 10 mapas reales desde la pestaña activa del juego
  const handleSyncRealMaps = () => {
    setIsSyncingMaps(true);
    window.postMessage({ type: 'SYNC_BLOOMSHIRE_REAL_MAPS' }, '*');
    window.postMessage({ type: 'FORCE_SYNC_ALL' }, '*');
    document.dispatchEvent(new CustomEvent('monios_sync_real_maps'));
    document.dispatchEvent(new CustomEvent('monios_force_sync'));
    setTimeout(() => {
      setIsSyncingMaps(false);
    }, 16000);
  };

  // Exportar todos los mapas Pixel-Art renderizados a un archivo JSON descargable
  const handleExportMapsPack = () => {
    const count = Object.keys(realMaps).length;
    if (count === 0) return;
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), maps: realMaps })], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bloomshire_pixel_maps_hd_${count}maps.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 800);
  };

  // Importar pack de mapas Pixel-Art desde archivo JSON
  const handleImportMapsPack = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const mapsObj = parsed.maps || parsed;
        Object.values(mapsObj).forEach(m => {
          if (m && m.mapId && m.dataUrl) {
            ingestMapPayload(m);
          }
        });
      } catch { }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Cerrar pantalla completa con Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const selectedRegion = useMemo(() => {
    return megaAtlasData.regions.find(r => r.id === selectedRegionId) || megaAtlasData.regions[0];
  }, [selectedRegionId]);

  const hoveredSubZoneObj = useMemo(() => {
    if (!hoveredSubZoneId) return null;
    for (const r of megaAtlasData.regions) {
      const found = r.subZones.find(s => s.id === hoveredSubZoneId);
      if (found) return { ...found, regionName: regName(r), regionColor: r.color, regionIcon: r.icon };
    }
    return null;
  }, [hoveredSubZoneId]);

  // Recolectar zonas de pesca reales de todos los mapas cargados (game/ui.js #mapPicture)
  const allFishingSpots = useMemo(() => {
    const out = [];
    Object.values(realMaps).forEach(m => {
      const slot = MAP_OFFSET_LOOKUP[m.mapId];
      if (!slot || !Array.isArray(m.fishingSpots)) return;
      m.fishingSpots.forEach((spot, i) => {
        out.push({
          id: `fish_${m.mapId}_${i}`,
          mapId: m.mapId,
          wx: slot.ox + spot.x,
          wy: slot.oy + spot.y,
          w: spot.w,
          h: spot.h
        });
      });
    });
    return out;
  }, [realMaps]);

  // Regiones donde viven las criaturas que coinciden con la busqueda (Bestiario oficial)
  const beastRegionIds = useMemo(
    () => new Set(searchBeasts(bestiaryData, searchQuery).flatMap((b) => atlasRegionsOfBeast(b))),
    [bestiaryData, searchQuery]
  );

  const handlePickBeast = (regionId, beastId) => {
    const reg = megaAtlasData.regions.find((r) => r.id === regionId);
    if (!reg) return;
    handleSelectRegion(reg);
    setRightPanelOpen(true);
    setFocusBeast({ id: beastId, ts: Date.now() });
  };

  // Filtrado de regiones y sub-zonas en el árbol lateral
  const filteredRegions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return megaAtlasData.regions;

    return megaAtlasData.regions
      .map(r => {
        const regMatches =
          r.name.toLowerCase().includes(q) ||
          r.enName.toLowerCase().includes(q) ||
          r.desc.toLowerCase().includes(q);

        const matchingSubs = r.subZones.filter(s =>
          s.nameEs.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q) ||
          (s.npcs || []).some(n => n.name.toLowerCase().includes(q)) ||
          (s.doors || []).some(d => d.name.toLowerCase().includes(q)) ||
          (s.clues || []).some(c => clueLabel(c).toLowerCase().includes(q))
        );

        if (regMatches) return r;
        if (matchingSubs.length > 0) return { ...r, subZones: matchingSubs };
        if (beastRegionIds.has(r.id)) return r;
        return null;
      })
      .filter(Boolean);
  }, [searchQuery, beastRegionIds]);

  // Auto-enfoque suave (Fly-To) hacia una caja [wx, wy, w, h] en el lienzo de 8650 x 10650
  const focusOnWorldRect = useCallback((rect, targetZoom = 2.4) => {
    if (!rect) return;
    const [rx, ry, rw, rh] = rect;
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;

    const normX = 0.5 - cx / 8650;
    const normY = 0.5 - cy / 10650;

    const vw = viewportRef.current?.clientWidth || 900;
    const vh = viewportRef.current?.clientHeight || 650;

    setZoom(targetZoom);
    setPan({
      x: normX * vw * targetZoom * 0.85,
      y: normY * vh * targetZoom * 0.85
    });
  }, []);

  // Escuchar peticiones externas de "📍 Ubicar en el Mapa" (desde Crafteo, Cocina, Misiones, Buscador de Ítems o NPCs)
  useEffect(() => {
    if (!focusTarget) return;
    const { regionId, subZoneId, wx, wy, worldRect, label, labelKey } = focusTarget;
    if (regionId) {
      setSelectedRegionId(regionId);
      setExpandedRegions(prev => ({ ...prev, [regionId]: true }));
      const reg = megaAtlasData.regions.find(r => r.id === regionId);
      if (reg) {
        const sub = subZoneId
          ? reg.subZones.find(s => s.id === subZoneId)
          : reg.subZones.find(s => !s.isRootBox) || reg.subZones[0];
        if (sub) setSelectedSubZone(sub);
      }
    }
    if (wx != null && wy != null) {
      setActivePin({
        wx: Number(wx),
        wy: Number(wy),
        label: (labelKey ? tA(labelKey) : label) || tA('pin.default')
      });
    }
    const targetRect =
      Array.isArray(worldRect) && worldRect.length === 4
        ? worldRect
        : wx != null && wy != null
          ? [Number(wx) - 220, Number(wy) - 220, 440, 440]
          : null;

    if (targetRect) {
      setTimeout(() => focusOnWorldRect(targetRect, 3.2), 60);
    }
  }, [focusTarget, focusOnWorldRect]);

  const allRegionsExpanded = useMemo(() => {
    return megaAtlasData.regions.every(r => Boolean(expandedRegions[r.id]));
  }, [expandedRegions]);

  const handleToggleAllRegions = () => {
    const nextState = !allRegionsExpanded;
    const updated = {};
    megaAtlasData.regions.forEach(r => {
      updated[r.id] = nextState;
    });
    setExpandedRegions(updated);
  };

  // Selección desde el árbol izquierdo (siempre centra la cámara) vs desde el SVG (respeta modo de cursor y evita efecto látigo)
  const handleSelectRegion = (reg, fromSvg = false) => {
    if (fromSvg && (hasDraggedRef.current || cursorTool === 'hand')) return;
    setSelectedRegionId(reg.id);
    setExpandedRegions(prev => ({ ...prev, [reg.id]: true }));
    if (reg.subZones && reg.subZones.length > 0) {
      const firstSub = reg.subZones.find(s => !s.isRootBox) || reg.subZones[0];
      setSelectedSubZone(firstSub);
    } else {
      setSelectedSubZone(null);
    }
    if (!fromSvg || cursorTool === 'zoom') {
      focusOnWorldRect(reg.worldBounds, 1.9);
    }
  };

  const handleSelectSubZone = (reg, sub, fromSvg = false) => {
    if (fromSvg && (hasDraggedRef.current || cursorTool === 'hand')) return;
    setSelectedRegionId(reg.id);
    setSelectedSubZone(sub);
    setExpandedRegions(prev => ({ ...prev, [reg.id]: true }));
    if (!fromSvg || cursorTool === 'zoom') {
      focusOnWorldRect(sub.worldRect, 3.1);
    }
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.22 : -0.22;
    setZoom(z => Math.min(15.0, Math.max(0.75, Number((z + delta).toFixed(2)))));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 5) {
      hasDraggedRef.current = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handleMouseUp = (e) => {
    if (isDragging && !hasDraggedRef.current && cursorTool === 'zoom' && viewportRef.current) {
      // En modo Lupa: un clic limpio acerca (+0.65x) o con Alt/Shift aleja (-0.55x)
      const delta = e.altKey || e.shiftKey ? -0.55 : 0.65;
      setZoom(z => Math.min(15.0, Math.max(0.75, Number((z + delta).toFixed(2)))));
    }
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const loadedRealMapsCount = Object.keys(realMaps).length;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-[#080d19] text-slate-200 flex flex-col select-none overflow-hidden'
          : 'flex flex-col h-full w-full bg-[#080d19] text-slate-200 select-none overflow-hidden'
      }
    >
      {/* BARRA SUPERIOR DE CONTROLES CON ESTÉTICA ORIGINAL DE BLOOMSHIRE (MUSTARD / WOOD UI) */}
      <div className="px-4 py-2 bg-[#0b1222] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setLeftPanelOpen(v => !v)}
            className="px-2 py-1 rounded-lg bg-[#101726] hover:bg-[#141d2e] border border-slate-800/80 text-amber-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
            title={leftPanelOpen ? tA('toolbar.hideListTitle') : tA('toolbar.showListTitle')}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            <span>{leftPanelOpen ? tA('toolbar.hideList') : tA('toolbar.showList')}</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg bg-[#141d2e] border border-amber-500/60 text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-inner">
            <img src={PUBLIC_SPRITES.chest} alt="" className="w-4 h-4 object-none" style={{ imageRendering: 'pixelated', objectPosition: '-40px 0' }} />
            {tA('toolbar.title', { n: loadedRealMapsCount })}
          </span>

        </div>

        {/* Interruptores de Capas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: tA('toolbar.layerArt'), state: showPixelArtLayer, set: setShowPixelArtLayer },
            { label: tA('toolbar.layerSubs'), state: showSubZonesLayer, set: setShowSubZonesLayer },
            { label: tA('toolbar.layerLabels'), state: showLabelsLayer, set: setShowLabelsLayer },
            { label: tA('toolbar.layerFishing'), state: showFishingLayer, set: setShowFishingLayer },
            { label: tA('toolbar.layerDoors'), state: showDoorsLayer, set: setShowDoorsLayer },
            { label: tA('toolbar.layerNpcs'), state: showNpcsLayer, set: setShowNpcsLayer },
            { label: tA('toolbar.layerClues'), state: showCluesLayer, set: setShowCluesLayer },
          ].map((layer, idx) => (
            <button
              key={idx}
              onClick={() => layer.set(!layer.state)}
              className={`px-2 py-1 rounded-md text-[10.5px] font-bold border transition-all cursor-pointer ${layer.state
                  ? 'bg-[#141d2e] border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-[#080d17] border-slate-800/60 text-amber-200/40'
                }`}
            >
              {layer.label}
            </button>
          ))}

          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-[#101726] border border-slate-800/80 rounded-lg px-1.5 py-0.5">
            <button
              onClick={() => setZoom(z => Math.max(0.75, Number((z - 0.35).toFixed(2))))}
              className="p-1 text-amber-200 hover:text-white cursor-pointer"
              title={tA('toolbar.zoomOut')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10.5px] font-mono font-bold text-amber-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(15.0, Number((z + 0.35).toFixed(2))))}
              className="p-1 text-amber-200 hover:text-white cursor-pointer"
              title={tA('toolbar.zoomIn')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 text-amber-300 hover:text-white cursor-pointer border-l border-slate-800/80 pl-1.5"
              title={tA('toolbar.center')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setRightPanelOpen(v => !v)}
            className="px-2 py-1 rounded-lg bg-[#101726] hover:bg-[#141d2e] border border-slate-800/80 text-amber-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
            title={rightPanelOpen ? tA('toolbar.hidePanelTitle') : tA('toolbar.showPanelTitle')}
          >
            {rightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span>{rightPanelOpen ? tA('toolbar.hidePanel') : tA('toolbar.showPanel')}</span>
          </button>

          {/* Botones de Mapas HD & Import/Export + Pantalla Completa (Solo Iconos sobre el lateral derecho) */}
          <div className="flex items-center gap-1 border-l border-slate-800/80 pl-2 ml-1">
            <button
              onClick={handleSyncRealMaps}
              disabled={isSyncingMaps}
              className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-400/60 text-white cursor-pointer shadow-md disabled:opacity-60"
              title={tA('toolbar.syncHd')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMaps ? 'animate-spin' : ''}`} />
            </button>

            {loadedRealMapsCount > 0 && (
              <button
                onClick={handleExportMapsPack}
                className="p-1.5 rounded-lg bg-[#101726] hover:bg-[#162035] border border-slate-700/70 text-amber-300 cursor-pointer"
                title={tA('toolbar.export')}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-[#101726] hover:bg-[#162035] border border-slate-800/80 text-amber-200/80 cursor-pointer"
              title={tA('toolbar.import')}
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportMapsPack}
              className="hidden"
            />

            {/* Pantalla Completa: solo icono en el lateral */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1.5 rounded-lg cursor-pointer transition-all shadow-md ml-0.5 ${isFullscreen
                  ? 'bg-rose-700 hover:bg-rose-600 text-white border border-rose-400'
                  : 'bg-gradient-to-r from-[#e9a83a] to-[#c98219] hover:from-[#f5b94e] hover:to-[#d99126] text-[#1c0f05] border border-[#ffe292]'
                }`}
              title={isFullscreen ? tA('toolbar.exitFull') : tA('toolbar.full')}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO SI AÚN NO SE SINCRONIZARON LOS 10 LIENZOS PIXEL-ART DESDE LA PESTAÑA DEL JUEGO */}
      {loadedRealMapsCount < 10 && (
        <div className="px-4 py-1.5 bg-[#291809] border-b border-slate-800/80 flex items-center justify-between text-[11px] text-amber-300">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>
              {loadedRealMapsCount === 0
                ? tA('banner.none')
                : tA('banner.some', { n: loadedRealMapsCount, last: lastSyncedMapName ? tA('banner.last', { name: lastSyncedMapName }) : '' })}
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-300 shrink-0">
            {tA('banner.passive')}
          </span>
        </div>
      )}

      {/* CUERPO PRINCIPAL: ÁRBOL LATERAL IZQUIERDO + GRAN MAPA UNIFICADO + INSPECTOR DERECHO */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* 1. SIDEBAR IZQUIERDO: ÁRBOL DE REGIONES Y SUB-ZONAS CON BOTÓN EXPANDIR/COLAPSAR TODO */}
        {leftPanelOpen && (
          <aside className="w-80 bg-[#0c1220] border-r-2 border-slate-800/80 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-800/60 flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-[#080d17] border border-slate-800/80 rounded-lg px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="text"
                  placeholder={tA('list.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-slate-200 placeholder-amber-200/40 outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-amber-300 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-[10.5px] text-amber-200/70 flex items-center justify-between gap-1">
                <button
                  onClick={handleToggleAllRegions}
                  className="px-2 py-1 rounded bg-[#101726] hover:bg-[#162035] border border-slate-700/70 text-amber-300 font-black flex items-center gap-1 cursor-pointer transition-all"
                  title={tA('list.toggleAllTitle')}
                >
                  <ChevronsUpDown className="w-3 h-3 text-amber-300" />
                  <span>{allRegionsExpanded ? tA('list.collapse') : tA('list.expand')}</span>
                </button>
                <button
                  onClick={handleResetView}
                  className="px-2 py-1 rounded bg-[#080d17] hover:bg-[#162035] border border-slate-800/80 text-amber-300 font-bold cursor-pointer"
                >
                  {tA('list.world')}
                </button>
              </div>
            </div>

            {/* Lista Jerárquica de las 12 Regiones y sus 111 Sub-Zonas */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              <BeastSearchResults query={searchQuery} regions={megaAtlasData.regions} onPick={handlePickBeast} />
              {filteredRegions.map(reg => {
                const isRegSel = selectedRegionId === reg.id;
                const isExpanded = Boolean(expandedRegions[reg.id] || searchQuery.trim().length > 0);
                const visibleSubs = reg.subZones.filter(s => !s.isRootBox || reg.subZones.length === 1);
                const hasRealArt = Boolean(realMaps[reg.mapId]);

                return (
                  <div
                    key={reg.id}
                    className={`rounded-xl border transition-all overflow-hidden ${isRegSel
                        ? 'bg-[#101726] border-amber-500/60 shadow-md'
                        : 'bg-[#0e1628] border-slate-800/60 hover:border-slate-800/80'
                      }`}
                  >
                    {/* Cabecera de Región */}
                    <div
                      onMouseEnter={() => setHoveredRegionId(reg.id)}
                      onMouseLeave={() => setHoveredRegionId(null)}
                      onClick={() => handleSelectRegion(reg)}
                      className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#162035]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRegions(prev => ({ ...prev, [reg.id]: !prev[reg.id] }));
                          }}
                          className="text-amber-200/70 hover:text-white p-0.5"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-sm">{reg.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-black truncate flex items-center gap-1.5" style={{ color: reg.color }}>
                            <span className="truncate">{regName(reg)}</span>
                            {hasRealArt && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                                HD
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-amber-200/60">
                            {tA('list.subs', { count: visibleSubs.length })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-[#080d17] text-amber-300 px-1.5 py-0.5 rounded border border-slate-800/80">
                        {tA('list.go')}
                      </span>
                    </div>

                    {/* Sub-zonas desplegables */}
                    {isExpanded && (
                      <div className="px-2 pb-2 pt-1 border-t border-slate-800/80 bg-[#080d17]/90 space-y-1">
                        {visibleSubs.map(sub => {
                          const isSubSel = selectedSubZone?.id === sub.id;
                          const isSubHov = hoveredSubZoneId === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onMouseEnter={() => setHoveredSubZoneId(sub.id)}
                              onMouseLeave={() => setHoveredSubZoneId(null)}
                              onClick={() => handleSelectSubZone(reg, sub)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all flex items-center justify-between gap-1.5 ${isSubSel
                                  ? 'bg-amber-500/20 border border-amber-500/70 text-amber-200 font-black shadow-sm'
                                  : isSubHov
                                    ? 'bg-[#141d2e] text-amber-300 border border-amber-500/60/60 font-semibold'
                                    : 'text-slate-200/85 hover:bg-[#131d33]'
                                }`}
                            >
                              <div className="truncate">
                                <span className="mr-1">📍</span>
                                <span>{subName(sub)}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-[9.5px] font-mono">
                                {sub.doors?.length > 0 && <span title={tA('list.doors')}>🕳️{sub.doors.length}</span>}
                                {sub.npcs?.length > 0 && <span title={tA('list.npcs')}>👤{sub.npcs.length}</span>}
                                {sub.clues?.length > 0 && <span title={tA('list.clues')}>✨{sub.clues.length}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* 2. LIENZO CENTRAL INTERACTIVO: EL CONTINENTE UNIFICADO (8650 x 10650) */}
        <main
          ref={viewportRef}
          onWheel={handleWheelZoom}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 bg-[#070b14] relative overflow-hidden flex items-center justify-center ${isDragging
              ? 'cursor-grabbing'
              : cursorTool === 'hand'
                ? 'cursor-grab'
                : cursorTool === 'zoom'
                  ? 'cursor-zoom-in'
                  : 'cursor-default'
            }`}
        >
          {/* GUÍA PASO A PASO INTERACTIVA DE LA RUTA DIARIA (CUANDO SE ACTIVA LA CAPA) */}

          {/* Banner de Pin Ubicado cuando se viene desde "📍 Ubicar en el Mapa" */}
          {activePin && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-[#0e1628]/95 border-2 border-[#ffcf5a] text-amber-300 px-3.5 py-2 rounded-xl shadow-2xl">
              <MapPin className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
              <div className="text-xs">
                <div className="font-black text-amber-300">{tA('pin.title')}</div>
                <div className="font-semibold text-white">{activePin.label}</div>
              </div>
              <button
                onClick={() => {
                  setActivePin(null);
                  if (onClearFocusTarget) onClearFocusTarget();
                }}
                className="ml-2 p-1 rounded bg-[#141d2e] hover:bg-[#593a1c] text-amber-200 cursor-pointer"
                title={tA('pin.remove')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Controles de Cursor Flotantes (Mano / Puntero / Lupa) encima de la cruceta */}
          <div className="absolute bottom-36 left-3 z-20 bg-[#0b1222]/95 border border-slate-800/80 rounded-xl p-1 flex flex-col items-center gap-1 shadow-2xl">
            <button
              onClick={() => setCursorTool('hand')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${cursorTool === 'hand'
                  ? 'bg-[#ffcf5a] text-[#1c0f05] font-black shadow'
                  : 'text-amber-300/80 hover:bg-[#101726]'
                }`}
              title={tA('tools.hand')}
            >
              <Hand className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCursorTool('pointer')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${cursorTool === 'pointer'
                  ? 'bg-[#ffcf5a] text-[#1c0f05] font-black shadow'
                  : 'text-amber-300/80 hover:bg-[#101726]'
                }`}
              title={tA('tools.pointer')}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCursorTool('zoom')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${cursorTool === 'zoom'
                  ? 'bg-[#ffcf5a] text-[#1c0f05] font-black shadow'
                  : 'text-amber-300/80 hover:bg-[#101726]'
                }`}
              title={tA('tools.zoom')}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Cruceta Direccional Flotante para Desplazamiento Suave sin arrastrar */}
          <div className="absolute bottom-14 left-3 z-20 bg-[#0b1222]/90 border border-slate-800/80 rounded-xl p-1.5 flex flex-col items-center gap-1 shadow-xl">
            <button
              onClick={() => setPan(p => ({ ...p, y: p.y + 140 }))}
              className="w-6 h-6 rounded bg-[#101726] hover:bg-[#ffcf5a] hover:text-[#1c0f05] text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer"
              title={tA('tools.up')}
            >
              ▲
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPan(p => ({ ...p, x: p.x + 140 }))}
                className="w-6 h-6 rounded bg-[#101726] hover:bg-[#ffcf5a] hover:text-[#1c0f05] text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer"
                title={tA('tools.left')}
              >
                ◀
              </button>
              <button
                onClick={handleResetView}
                className="w-6 h-6 rounded bg-[#141d2e] hover:bg-[#ffcf5a] hover:text-[#1c0f05] text-amber-300 text-[10px] font-black flex items-center justify-center cursor-pointer"
                title={tA('tools.reset')}
              >
                ●
              </button>
              <button
                onClick={() => setPan(p => ({ ...p, x: p.x - 140 }))}
                className="w-6 h-6 rounded bg-[#101726] hover:bg-[#ffcf5a] hover:text-[#1c0f05] text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer"
                title={tA('tools.right')}
              >
                ▶
              </button>
            </div>
            <button
              onClick={() => setPan(p => ({ ...p, y: p.y - 140 }))}
              className="w-6 h-6 rounded bg-[#101726] hover:bg-[#ffcf5a] hover:text-[#1c0f05] text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer"
              title={tA('tools.down')}
            >
              ▼
            </button>
          </div>
          {/* Cartel Superior Flotante Estilo Original de Bloomshire (drawArrivalCard de play.js) */}
          {hoveredSubZoneObj && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3"
              style={{
                background: 'rgba(28, 16, 6, 0.92)',
                border: '2px solid rgba(232, 182, 74, 0.85)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.85)'
              }}
            >
              <span className="text-[#f2c55c] text-xs">◆</span>
              <span className="text-lg">{hoveredSubZoneObj.regionIcon}</span>
              <div className="text-center">
                <div
                  className="text-sm font-black tracking-wide"
                  style={{
                    color: '#ffe292',
                    textShadow: '0 2px 0 #3b2207, 0 3px 6px #120801'
                  }}
                >
                  {subName(hoveredSubZoneObj)}{!atlasEn && (<>{' '}
                  <span className="text-amber-300/75 font-mono text-[11px]">({hoveredSubZoneObj.nameEn})</span></>)}
                </div>
                <div className="text-[11px] text-slate-200 font-semibold">
                  {hoveredSubZoneObj.regionName}
                </div>
              </div>
              <span className="text-[#f2c55c] text-xs">◆</span>
            </div>
          )}

          {/* Contenedor Transformable (Zoom + Pan) */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.18s ease-out'
            }}
            className="w-full h-full flex items-center justify-center p-4"
          >
            <svg
              viewBox="0 0 8650 10650"
              className="w-full h-full max-w-[865px] max-h-[1065px] rounded-2xl shadow-[0_0_90px_rgba(0,0,0,0.95)] border-4 border-slate-800/80 bg-[#070b14]"
              style={{ imageRendering: 'pixelated' }}
            >
              <defs>
                {/* Cuadrícula de Tiles (cada 160px = 10 tiles de 16px) como el Editor Oficial (render.js drawGrid) */}
                <pattern id="bloomshireTileGrid" width="160" height="160" patternUnits="userSpaceOnUse">
                  <path d="M 160 0 L 0 0 0 160" fill="none" stroke="rgba(255, 236, 200, 0.08)" strokeWidth="3" />
                </pattern>

                {/* Textura de Pradera Verde Original de Bloomshire (doc.background = #5a8f3c) */}
                <pattern id="grassBiomePattern" width="128" height="128" patternUnits="userSpaceOnUse">
                  <rect width="128" height="128" fill="#5a8f3c" />
                  <rect x="16" y="16" width="16" height="16" fill="#4f8233" />
                  <rect x="80" y="48" width="16" height="16" fill="#659c44" />
                  <rect x="32" y="96" width="16" height="16" fill="#659c44" />
                  <rect x="96" y="112" width="16" height="16" fill="#4f8233" />
                </pattern>

                {/* Textura de Bosque Denso Whisperwood */}
                <pattern id="forestBiomePattern" width="128" height="128" patternUnits="userSpaceOnUse">
                  <rect width="128" height="128" fill="#3b6e28" />
                  <rect x="16" y="32" width="32" height="32" fill="#2f591f" rx="8" />
                  <rect x="80" y="80" width="32" height="32" fill="#2f591f" rx="8" />
                  <rect x="64" y="16" width="16" height="16" fill="#498233" />
                </pattern>

                {/* Textura Rocosa Stonepeak */}
                <pattern id="mountainBiomePattern" width="128" height="128" patternUnits="userSpaceOnUse">
                  <rect width="128" height="128" fill="#6e655f" />
                  <rect x="16" y="16" width="32" height="24" fill="#5c534d" />
                  <rect x="72" y="64" width="40" height="28" fill="#7d736c" />
                  <rect x="24" y="88" width="24" height="24" fill="#524a45" />
                </pattern>

                {/* Textura de Agua Pixelada de Moonmere y Bahía */}
                <pattern id="waterPixelPattern" width="128" height="128" patternUnits="userSpaceOnUse">
                  <rect width="128" height="128" fill="#2874a6" />
                  <rect x="16" y="24" width="48" height="8" fill="#4896c7" />
                  <rect x="72" y="80" width="48" height="8" fill="#4896c7" />
                  <rect x="32" y="112" width="32" height="8" fill="#1f5f8b" />
                </pattern>
              </defs>

              {/* Fondo Exterior del Mapa (OUTSIDE = #16130f de render.js) */}
              <rect width="8650" height="10650" fill="#080c16" />
              <rect width="8650" height="10650" fill="url(#bloomshireTileGrid)" />

              {/* Masa Continental Base con el color exacto de césped de Bloomshire (#5a8f3c) cuando aún no se cargó el PNG real */}
              <rect
                x="2800"
                y="2200"
                width="5632"
                height="7424"
                fill="url(#grassBiomePattern)"
                stroke="#ffcf5a"
                strokeWidth="12"
                rx="16"
              />
              {/* Bioma Bosque Oeste (Whisperwood base) */}
              <rect x="2800" y="2200" width="1792" height="5504" fill="url(#forestBiomePattern)" />
              {/* Bioma Montaña Este (Stonepeak base) */}
              <rect x="6640" y="2200" width="1792" height="5504" fill="url(#mountainBiomePattern)" />
              {/* Bioma Lago Moonmere Base */}
              <rect x="4592" y="2200" width="2048" height="1344" fill="url(#waterPixelPattern)" />
              {/* Bioma Mar del Sur y Bahía */}
              <rect x="2800" y="8850" width="5632" height="774" fill="url(#waterPixelPattern)" />

              {/* Río Principal de Bloomshire y Caminos Empedrados Base (visibles si aún no se cargó el mapa real) */}
              {!realMaps.bloomshire && (
                <g>
                  <path
                    d="M 5220 3300 C 5160 4000, 5180 4600, 5260 5300 C 5320 6200, 5280 7400, 5400 8950"
                    stroke="#2874a6"
                    strokeWidth="140"
                    fill="none"
                  />
                  {/* Caminos de Piedra estilo Pueblo */}
                  <path
                    d="M 1373 4069 L 2923 3658 L 4576 4264 L 5730 4264 L 6640 4328 L 7600 4328"
                    stroke="#c2a67d"
                    strokeWidth="56"
                    fill="none"
                  />
                  <path
                    d="M 5730 2800 L 5730 4264 L 5800 6200 L 6100 8850"
                    stroke="#c2a67d"
                    strokeWidth="56"
                    fill="none"
                  />
                </g>
              )}

              {/* =================================================================================
                  CAPA 0 (ESTRELLA): LIENZOS PIXEL-ART REALES DEL MOTOR DEL JUEGO (10 MAPAS UNIFICADOS)
                 ================================================================================= */}
              {showPixelArtLayer &&
                REAL_MAP_SLOTS.map(slot => {
                  const rendered = realMaps[slot.mapId];
                  if (!rendered || !rendered.dataUrl) return null;
                  return (
                    <image
                      key={`real_map_${slot.mapId}`}
                      href={rendered.dataUrl}
                      x={slot.ox}
                      y={slot.oy}
                      width={slot.w}
                      height={slot.h}
                      preserveAspectRatio="none"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  );
                })}

              {/* Líneas punteadas de conexión de Portales Exteriores (Everbloom, Frosthaven, Barrowmire, Dreaming Fields, Islas) */}
              <path d="M 3168 2788 L 2830 2040" stroke="#f472b6" strokeWidth="32" strokeDasharray="50 30" fill="none" opacity="0.8" />
              <path d="M 2800 4956 L 2636 4956" stroke="#e879f9" strokeWidth="32" strokeDasharray="50 30" fill="none" opacity="0.8" />
              <path d="M 8416 2312 L 6602 2072" stroke="#67e8f9" strokeWidth="32" strokeDasharray="50 30" fill="none" opacity="0.8" />
              <path d="M 5504 5000 L 4034 9750" stroke="#a3e635" strokeWidth="28" strokeDasharray="45 35" fill="none" opacity="0.75" />
              <path d="M 5443 5416 L 5480 9720" stroke="#fde047" strokeWidth="28" strokeDasharray="45 35" fill="none" opacity="0.75" />

              {/* CAPA 1: MARCOS DE LAS 12 MACRO-REGIONES UNIFICADAS */}
              {megaAtlasData.regions.map(reg => {
                const [rx, ry, rw, rh] = reg.worldBounds;
                const isRegSelected = selectedRegionId === reg.id;
                const isRegHovered = hoveredRegionId === reg.id;
                const hasRealMap = Boolean(realMaps[reg.mapId] && showPixelArtLayer);

                return (
                  <g
                    key={reg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRegion(reg, true);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      focusOnWorldRect(reg.worldBounds, 1.9);
                    }}
                    className={cursorTool === 'hand' ? 'cursor-grab' : 'cursor-pointer'}
                  >
                    <rect
                      x={rx}
                      y={ry}
                      width={rw}
                      height={rh}
                      fill={hasRealMap ? 'rgba(0, 0, 0, 0.01)' : reg.fill}
                      stroke={isRegSelected ? '#ffcf5a' : reg.color}
                      strokeWidth={isRegSelected || isRegHovered ? 24 : 10}
                      strokeDasharray={isRegSelected ? 'none' : '45 22'}
                      rx="18"
                    />

                    {/* Placa Real de Nombre de Región estilo UI de Bloomshire (play.js drawArrivalCard) */}
                    <g transform={`translate(${rx + rw / 2}, ${ry + 115})`} pointerEvents="none">
                      <rect
                        x="-460"
                        y="-62"
                        width="920"
                        height="112"
                        rx="56"
                        fill="rgba(28, 16, 6, 0.86)"
                        stroke="rgba(232, 182, 74, 0.85)"
                        strokeWidth="6"
                      />
                      <text x="-415" y="14" fill="#f2c55c" fontSize="48" textAnchor="middle">◆</text>
                      <text x="415" y="14" fill="#f2c55c" fontSize="48" textAnchor="middle">◆</text>
                      <text
                        x="0"
                        y="18"
                        fill="#ffe292"
                        fontSize="68"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ textShadow: '0 4px 0 #3b2207, 0 6px 12px #000' }}
                      >
                        {reg.icon} {reg.enName.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* CAPA 1.5: ZONAS DE PESCA OFICIALES DEL MOTOR (game/ui.js #mapPicture) */}
              {showFishingLayer &&
                allFishingSpots.map(spot => (
                  <g key={spot.id} pointerEvents="none">
                    <rect
                      x={spot.wx}
                      y={spot.wy}
                      width={spot.w}
                      height={spot.h}
                      fill="rgba(70, 200, 255, 0.34)"
                      stroke="#e8fbff"
                      strokeWidth="6"
                      strokeDasharray="18 12"
                      rx="8"
                    />
                    <circle
                      cx={spot.wx + spot.w / 2}
                      cy={spot.wy + spot.h / 2}
                      r="34"
                      fill="rgba(20, 40, 70, 0.85)"
                      stroke="#e8fbff"
                      strokeWidth="4"
                    />
                    <image
                      href={PUBLIC_SPRITES.goldenFish}
                      x={spot.wx + spot.w / 2 - 24}
                      y={spot.wy + spot.h / 2 - 24}
                      width="48"
                      height="48"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </g>
                ))}

              {/* CAPA 2: LAS 111 SUB-ZONAS CANÓNICAS INTERACTIVAS (HOVER & CLICK) */}
              {showSubZonesLayer &&
                megaAtlasData.regions.map(reg => {
                  const hasRealMap = Boolean(realMaps[reg.mapId] && showPixelArtLayer);
                  return reg.subZones
                    .filter(sub => !sub.isRootBox)
                    .map(sub => {
                      const [sx, sy, sw, sh] = sub.worldRect;
                      const isSel = selectedSubZone?.id === sub.id;
                      const isHov = hoveredSubZoneId === sub.id;
                      const cx = sx + sw / 2;
                      const cy = sy + sh / 2;
                      const pillW = Math.min(Math.max(sw * 0.82, 260), 430);

                      return (
                        <g
                          key={sub.id}
                          onMouseEnter={() => setHoveredSubZoneId(sub.id)}
                          onMouseLeave={() => setHoveredSubZoneId(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSubZone(reg, sub, true);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            focusOnWorldRect(sub.worldRect, 3.1);
                          }}
                          className={cursorTool === 'hand' ? 'cursor-grab' : 'cursor-pointer'}
                        >
                          <rect
                            x={sx}
                            y={sy}
                            width={sw}
                            height={sh}
                            fill={
                              isSel
                                ? 'rgba(255, 207, 90, 0.36)'
                                : isHov
                                  ? 'rgba(233, 168, 58, 0.30)'
                                  : hasRealMap
                                    ? 'rgba(20, 14, 8, 0.05)'
                                    : 'rgba(20, 14, 8, 0.28)'
                            }
                            stroke={isSel ? '#ffcf5a' : isHov ? '#ffe292' : reg.color}
                            strokeWidth={isSel ? 18 : isHov ? 14 : 6}
                            strokeDasharray={isSel || isHov ? 'none' : '24 14'}
                            rx="12"
                          />

                          {/* Cartel de Sub-Zona con Estética Original de Madera/Oro de Bloomshire (drawZones / drawArrivalCard) */}
                          {showLabelsLayer && (
                            <g pointerEvents="none">
                              <rect
                                x={cx - pillW / 2}
                                y={cy - 34}
                                width={pillW}
                                height="68"
                                fill={isSel ? '#ffcf5a' : isHov ? '#3b2207' : 'rgba(28, 16, 6, 0.86)'}
                                stroke={isSel ? '#3b2207' : '#e9a83a'}
                                strokeWidth={isSel ? '5' : '3.5'}
                                rx="34"
                              />
                              <text
                                x={cx}
                                y={cy + 11}
                                fill={isSel ? '#1b1612' : '#ffe292'}
                                fontSize="31"
                                fontWeight="900"
                                textAnchor="middle"
                              >
                                {subName(sub).length > 25 ? `${subName(sub).slice(0, 23)}…` : subName(sub)}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    });
                })}

              {/* CAPA 3: LAS 58 PUERTAS, CUEVAS E INTERIORES */}
              {showDoorsLayer &&
                megaAtlasData.doors.map(d => {
                  const isCave = d.kind === 'cave';
                  return (
                    <g key={d.id} className="cursor-pointer">
                      <circle
                        cx={d.wx}
                        cy={d.wy}
                        r={isCave ? 44 : 28}
                        fill={isCave ? '#3b1d0a' : '#28180b'}
                        stroke={isCave ? '#ffcf5a' : '#e9a83a'}
                        strokeWidth={isCave ? 8 : 5}
                      />
                      <text x={d.wx} y={d.wy + 13} fontSize={isCave ? '38' : '26'} textAnchor="middle" pointerEvents="none">
                        {isCave ? '🕳️' : '🏠'}
                      </text>
                      {isCave && showLabelsLayer && (
                        <g pointerEvents="none">
                          <rect
                            x={d.wx - 175}
                            y={d.wy - 88}
                            width="350"
                            height="42"
                            rx="21"
                            fill="rgba(28, 16, 6, 0.92)"
                            stroke="#ffcf5a"
                            strokeWidth="3"
                          />
                          <text
                            x={d.wx}
                            y={d.wy - 59}
                            fill="#ffe292"
                            fontSize="26"
                            fontWeight="900"
                            textAnchor="middle"
                          >
                            {d.name.replace('🕳️ Cueva: ', '')}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* CAPA: RUTA DIARIA DE FARMEO (DAILY LOOP DE SETAS Y RECURSOS) */}

              {/* CAPA 4: LOS 57 NPCS - PINES ESTÉTICOS Y LIGEROS ESTILO BOCETO */}
              {showNpcsLayer &&
                megaAtlasData.npcs.map(n => {
                  const isHov = hoveredNpcId === n.id;
                  const isSel = selectedNpc?.id === n.id;
                  const textWidth = Math.max(34, Math.round(n.name.length * 8.2 + 14));
                  const hasPortrait = true;

                  return (
                    <g
                      key={n.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNpcId(n.id)}
                      onMouseLeave={() => setHoveredNpcId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNpc(n);
                        focusOnWorldRect([n.wx - 180, n.wy - 180, 360, 360], 4.2);
                      }}
                    >
                      {/* Glow sutil si está hovered o seleccionado */}
                      {(isHov || isSel) && (
                        <circle
                          cx={n.wx}
                          cy={n.wy - 10}
                          r="22"
                          fill="rgba(245, 158, 11, 0.28)"
                        />
                      )}

                      {/* Pin Circular Liviano Dorado - SIN FONDO NEGRO */}
                      <circle
                        cx={n.wx}
                        cy={n.wy - 10}
                        r={isHov || isSel ? "16" : "13"}
                        fill={isHov || isSel ? "#f59e0b" : "rgba(30, 41, 59, 0.9)"}
                        stroke={isHov || isSel ? "#fef08a" : "#f59e0b"}
                        strokeWidth={isHov || isSel ? "2.5" : "1.8"}
                      />

                      {hasPortrait ? (
                        <image
                          href={`/data/bloomshire/portraits/${n.id.toLowerCase()}.png`}
                          x={n.wx - (isHov || isSel ? 12 : 9)}
                          y={n.wy - 10 - (isHov || isSel ? 12 : 9)}
                          width={isHov || isSel ? 24 : 18}
                          height={isHov || isSel ? 24 : 18}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ imageRendering: 'pixelated' }}
                          pointerEvents="none"
                        />
                      ) : (
                        <text
                          x={n.wx}
                          y={n.wy - 5}
                          fontSize={isHov || isSel ? "14" : "12"}
                          textAnchor="middle"
                          fill={isHov || isSel ? "#0f172a" : "#fef08a"}
                          pointerEvents="none"
                        >
                          👤
                        </text>
                      )}

                      {/* Placa de Nombre Compacta ajustada EXACTAMENTE al texto */}
                      <g transform={`translate(${n.wx}, ${n.wy + 7})`}>
                        <rect
                          x={-textWidth / 2}
                          y="0"
                          width={textWidth}
                          height="18"
                          rx="9"
                          fill="rgba(15, 23, 42, 0.88)"
                          stroke={isHov || isSel ? "#fef08a" : "rgba(245, 158, 11, 0.7)"}
                          strokeWidth={isHov || isSel ? "1.8" : "1"}
                        />
                        <text
                          x="0"
                          y="13"
                          fill={isHov || isSel ? "#fef08a" : "#f1f5f9"}
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {n.name}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* CAPA 6: RADAR / PIN ACTIVO DE "📍 UBICAR EN EL MAPA" */}
              {activePin && (
                <g transform={`translate(${activePin.wx}, ${activePin.wy})`} pointerEvents="none">
                  <circle r="135" fill="rgba(255, 207, 90, 0.22)" stroke="#ffcf5a" strokeWidth="8" strokeDasharray="24 14" />
                  <circle r="75" fill="rgba(239, 68, 68, 0.35)" stroke="#fef08a" strokeWidth="10" />
                  <circle r="28" fill="#ef4444" stroke="#ffffff" strokeWidth="8" />
                  <g transform="translate(0, -115)">
                    <rect
                      x="-310"
                      y="-48"
                      width="620"
                      height="76"
                      rx="38"
                      fill="rgba(28, 16, 6, 0.96)"
                      stroke="#ffcf5a"
                      strokeWidth="8"
                    />
                    <text
                      x="0"
                      y="2"
                      fill="#ffe292"
                      fontSize="36"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      📍 {activePin.label.length > 30 ? `${activePin.label.slice(0, 28)}…` : activePin.label}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Botones flotantes de Viaje Rápido en la base del Mapa con Estética Madera/Oro */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1.5 bg-[#0b1222]/95 border-2 border-slate-800/80 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
            <span className="text-[10px] font-black text-amber-400 uppercase mr-1">{tA('travel')}</span>
            {megaAtlasData.regions.slice(0, 8).map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRegion(r, false)}
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-all ${selectedRegionId === r.id
                    ? 'bg-[#ffcf5a] text-[#1c0f05] font-black shadow'
                    : 'bg-[#101726] text-slate-200 hover:bg-[#162035] border border-slate-800/80'
                  }`}
              >
                {r.icon} {r.enName.replace('The ', '')}
              </button>
            ))}
          </div>
          {/* TARJETA FLOTANTE DE PERSONAJE (HUD OBSIDIAN - SIN ABRIR LA BARRA LATERAL) */}
          {selectedNpc && (() => {
            const idKey = selectedNpc.id.toLowerCase();
            // Titulo, presentacion y regalos: los del juego (official/npcs.json); el lugar, la sub-zona donde esta
            const off = officialNpc(idKey);
            const npcTitle = pickEnEs(off, 'title', i18nA.language);
            const npcIntro = (atlasEn ? off?.intro_en : (off?.intro_es || off?.intro_en)) || [];
            const gifts = (off?.loved || []).map((g) => giftName(g, i18nA.language, tA));
            let npcSub = null;
            for (const reg of megaAtlasData.regions) {
              for (const s of reg.subZones || []) {
                const [rx, ry, rw, rh] = s.worldRect || [];
                if (s.worldRect && selectedNpc.wx >= rx && selectedNpc.wx <= rx + rw && selectedNpc.wy >= ry && selectedNpc.wy <= ry + rh && (!npcSub || !s.isRootBox)) npcSub = s;
              }
            }

            return (
              <div
                className="absolute top-4 right-4 z-40 max-w-sm w-88 bg-[#090f1d]/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-4 flex flex-col gap-3 animate-fadeIn select-text"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header de la Tarjeta Flotante */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <NpcAvatar npcId={idKey} name={selectedNpc.name} size={64} className="border-2 border-amber-400/80 shadow-md" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-base leading-tight truncate">{selectedNpc.name}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                          {tA('npc.villager')}
                        </span>
                      </div>
                      <div className="text-xs text-amber-300 font-semibold truncate mt-0.5">
                        {npcTitle || (selectedNpc.inBuilding ? tA('npc.inBuilding', { name: selectedNpc.inBuilding }) : tA('npc.fallbackTitle'))}
                      </div>
                      {selectedNpc.inBuilding && (
                        <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                          {tA('npc.building', { name: selectedNpc.inBuilding })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón Cerrar X */}
                  <button
                    onClick={() => setSelectedNpc(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:border-rose-500/60 border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all shrink-0 shadow"
                    title={tA('npc.close')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Detalles y Atributos */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0d1527] border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">{tA('npc.usual')}</span>
                      <span className="text-slate-200 font-bold">{npcSub ? subName(npcSub) : selectedNpc.map}</span>
                    </div>
                  </div>

                  {/* Cita Textual Oficial del Personaje */}
                  {npcIntro.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#11192e] border-l-2 border-amber-400 text-[11px] text-amber-100/90 leading-relaxed italic shadow-inner">
                      &quot;{npcIntro.join(' ')}&quot;
                    </div>
                  )}

                  {/* Regalos que ama (hearts.js TASTES) */}
                  {gifts.length > 0 && (
                    <div className="p-2 rounded-xl bg-[#141f17] border border-emerald-500/30 flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="text-emerald-300 font-bold flex items-center gap-1.5 shrink-0">
                        <span>🎁</span> {tA('npc.gifts')}
                      </span>
                      <span className="text-emerald-100 font-semibold text-right">
                        {gifts.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Botón de acción: Centrar en el mapa */}
                  <button
                    onClick={() => focusOnWorldRect([selectedNpc.wx - 200, selectedNpc.wy - 200, 400, 400], 4.5)}
                    className="w-full py-1.5 rounded-xl bg-[#141d2e] hover:bg-amber-400 hover:text-slate-950 border border-amber-500/60 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow"
                  >
                    <span>🎯</span> {tA('npc.center', { name: selectedNpc.name })}
                  </button>
                </div>
              </div>
            );
          })()}
        </main>

        {/* 3. PANEL DERECHO: INSPECTOR DETALLADO CON ÍCONOS PIXEL-ART OFICIALES */}
        {rightPanelOpen && (
          <aside className="w-92 bg-[#0c1220] border-l-2 border-slate-800/80 p-4 flex flex-col gap-3.5 overflow-y-auto shrink-0">
            {selectedSubZone ? (
              <>
                <div className="pb-3 border-b border-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/60 bg-[#101726] text-amber-300"
                    >
                      {selectedRegion?.icon} {regName(selectedRegion)}
                    </span>
                    <button
                      onClick={() => focusOnWorldRect(selectedSubZone.worldRect, 3.1)}
                      className="px-2 py-0.5 rounded bg-[#141d2e] hover:bg-amber-400 hover:text-slate-950 border border-amber-500/60 text-amber-300 text-[10px] font-black cursor-pointer transition-all"
                      title={tA('panel.centerTitle')}
                    >
                      {tA('panel.center')}
                    </button>
                  </div>

                  <h3
                    className="text-base font-black mt-2 leading-snug text-amber-300"
                  >
                    📍 {subName(selectedSubZone)}
                  </h3>
                  <div className="text-xs font-mono text-amber-400">
                    {tA('panel.official', { name: selectedSubZone.nameEn })}
                  </div>
                </div>

                {/* PUERTAS, CUEVAS Y EDIFICIOS EN ESTA SUB-ZONA */}
                {selectedSubZone.doors && selectedSubZone.doors.length > 0 && (
                  <div className="bg-[#0e1628] border border-amber-500/50 rounded-xl p-3">
                    <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <img src={PUBLIC_SPRITES.stone} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                      <span>{tA('panel.doors', { n: selectedSubZone.doors.length })}</span>
                    </div>
                    <div className="space-y-1">
                      {selectedSubZone.doors.map((d, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-amber-100 bg-[#080d17] border border-amber-500/30 px-2.5 py-1.5 rounded-lg font-semibold"
                        >
                          {doorLabel(d)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NPCS EN ESTA SUB-ZONA CON FOTOS OFICIALES Y CLIC INTERACTIVO */}
                {selectedSubZone.npcs && selectedSubZone.npcs.length > 0 && (
                  <div className="bg-[#0e1726] border border-emerald-500/40 rounded-xl p-3">
                    <div className="text-[11px] font-black text-emerald-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>{tA('panel.npcs', { n: selectedSubZone.npcs.length })}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{tA('panel.npcsHint')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubZone.npcs.map((n, idx) => {
                        const matchNpc = megaAtlasData.npcs.find(x => x.name.toLowerCase() === n.name.toLowerCase());
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const npcObj = matchNpc || { id: n.name.toLowerCase(), name: n.name, inBuilding: n.inBuilding, map: selectedRegion?.name || 'Bloomshire' };
                              setSelectedNpc(npcObj);
                              if (matchNpc) {
                                focusOnWorldRect([matchNpc.wx - 180, matchNpc.wy - 180, 360, 360], 4.2);
                              }
                            }}
                            className="flex items-center gap-2 px-2.5 py-1 bg-[#141f2e] hover:bg-emerald-950/90 border border-slate-700/80 hover:border-emerald-500/60 rounded-xl text-xs text-slate-200 font-bold cursor-pointer transition-all shadow-sm"
                            title={tA('panel.npcTitle', { name: n.name })}
                          >
                            <NpcAvatar npcId={n.name} name={n.name} size={24} className="border border-amber-500/40" />
                            <span>{n.name}</span>
                            {n.inBuilding && <span className="text-[10px] font-normal text-slate-400">({n.inBuilding})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PISTAS Y SECRETOS DE MISIÓN EN ESTA SUB-ZONA */}
                {selectedSubZone.clues && selectedSubZone.clues.length > 0 && (
                  <div className="bg-[#211230] border border-purple-400/50 rounded-xl p-3">
                    <div className="text-[11px] font-black text-purple-300 uppercase tracking-wider mb-2">
                      {tA('panel.clues', { n: selectedSubZone.clues.length })}
                    </div>
                    <div className="space-y-1">
                      {selectedSubZone.clues.map((c, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-purple-100 bg-purple-950/60 border border-purple-500/30 px-2.5 py-1.5 rounded-lg font-semibold"
                        >
                          {clueLabel(c)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Datos oficiales del juego: libro de exploracion y Bestiario de la region */}
                <RegionCompendium regionId={selectedRegionId} focusBeast={focusBeast} />

                {/* Todas las sub-zonas hermanas de esta región */}
                <div className="mt-auto pt-3 border-t border-slate-800/60">
                  <div className="text-[10.5px] font-bold text-amber-400 uppercase mb-1.5">
                    {tA('panel.siblings', { name: regName(selectedRegion) })}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedRegion?.subZones || [])
                      .filter(s => !s.isRootBox)
                      .map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSubZone(selectedRegion, s)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${selectedSubZone?.id === s.id
                              ? 'bg-[#ffcf5a] text-[#1c0f05] font-black'
                              : 'bg-[#080d17] text-slate-200/80 hover:bg-[#162035] border border-slate-800/80'
                            }`}
                        >
                          {subName(s)}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-amber-200/70">
                {tA('panel.pick')}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
