// src/components/bloomshire/calcSort.js
// Orden de la Calculadora XP: un valor comparable por columna y un ordenamiento puro (lo usan la tabla,
// los presets estrategicos y el simulador). Clave de orden: "<columna>_<asc|desc>", ej. "xpEnergy_desc".

// Columnas que se pueden ordenar y su direccion al primer clic (textos y "menos es mejor" arrancan de menor a mayor)
export const CALC_SORT_COLUMNS = {
  item: 'asc',
  season: 'asc',
  time: 'asc',
  level: 'asc',
  cost: 'asc',
  sell: 'desc',
  net: 'desc',
  xp: 'desc',
  energy: 'asc',
  xpEnergy: 'desc',
  goldEnergy: 'desc',
  xpMin: 'desc',
  goldMin: 'desc',
  plots: 'desc'
};

const SEASON_ORDER = { all: 0, Spring: 1, Summer: 2, Fall: 3, Winter: 4 };

export function parseCalcSort(sortKey) {
  const [field = 'xpEnergy', dir = 'desc'] = String(sortKey || '').split('_');
  return { field, dir: dir === 'asc' ? 'asc' : 'desc' };
}

// Siguiente clave al tocar el encabezado de una columna: si ya ordena por ella invierte la direccion
export function nextCalcSort(currentKey, field) {
  const cur = parseCalcSort(currentKey);
  if (cur.field === field) return `${field}_${cur.dir === 'asc' ? 'desc' : 'asc'}`;
  return `${field}_${CALC_SORT_COLUMNS[field] || 'desc'}`;
}

// ctx: { skill, farmingLevel, name(item) }
export function calcSortValue(item, field, ctx = {}) {
  const skill = ctx.skill || 'farming';
  const isFarming = skill === 'farming';
  const energy = isFarming ? 2 : (item.energyCost || item.energy || 1);
  const net = (item.sell ?? 0) - (item.cost ?? 0);
  const master = isFarming && (ctx.farmingLevel ?? 1) >= 15 && item.hasRegrow;
  switch (field) {
    case 'item': return String(ctx.name ? ctx.name(item) : (item.name || item.id || ''));
    case 'season': return SEASON_ORDER[item.season] ?? 0;
    case 'time': return isFarming ? (item.grow ?? 1) : (item.hits ?? item.grow ?? 1);
    case 'level': return item.level ?? 1;
    case 'cost': return item.cost ?? 0;
    case 'sell': return item.sell ?? 0;
    case 'net':
    case 'plots': return net;
    case 'xp': return item.xp ?? 0;
    case 'energy': return energy;
    case 'xpEnergy': return (item.xp ?? 0) / energy;
    case 'goldEnergy': return net / energy;
    case 'xpMin': return master ? (item.regrowXpMin ?? item.xpMin ?? 0) : (item.xpMin ?? 0);
    case 'goldMin': return master ? (item.regrowGoldMin ?? item.goldMin ?? 0) : (item.goldMin ?? 0);
    default: return 0;
  }
}

// Devuelve una copia ordenada; los empates conservan el orden original (sort estable)
export function sortCalcList(list, sortKey, ctx = {}) {
  const { field, dir } = parseCalcSort(sortKey);
  const sign = dir === 'desc' ? -1 : 1;
  const locale = ctx.locale || undefined;
  return [...(list || [])].sort((a, b) => {
    const vA = calcSortValue(a, field, ctx);
    const vB = calcSortValue(b, field, ctx);
    if (typeof vA === 'string' || typeof vB === 'string') {
      return sign * String(vA).localeCompare(String(vB), locale, { sensitivity: 'base', numeric: true });
    }
    return sign * (vA - vB);
  });
}
