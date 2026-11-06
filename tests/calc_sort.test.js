import { describe, it, expect } from 'vitest';
import calcData from '../public/data/bloomshire/calc_data.json';
import { sortCalcList, nextCalcSort, parseCalcSort, calcSortValue, CALC_SORT_COLUMNS } from '../src/components/bloomshire/calcSort';
import { inventorySignature, calculateLocalQuantities } from '../src/components/bloomshire/state/inventoryLocal';

const ids = (list) => list.map(x => x.id);
const ctx = { skill: 'farming', farmingLevel: 1, name: (x) => x.name_es };

describe('Calculadora XP: orden por columnas', () => {
  it('primer clic usa la direccion de la columna y el segundo la invierte', () => {
    expect(nextCalcSort('xpEnergy_desc', 'item')).toBe('item_asc');
    expect(nextCalcSort('item_asc', 'item')).toBe('item_desc');
    expect(nextCalcSort('item_desc', 'item')).toBe('item_asc');
    expect(nextCalcSort('item_asc', 'xp')).toBe('xp_desc');
    expect(nextCalcSort('xp_desc', 'xp')).toBe('xp_asc');
    expect(nextCalcSort('xpEnergy_desc', 'xpEnergy')).toBe('xpEnergy_asc');
    expect(parseCalcSort('cost_asc')).toEqual({ field: 'cost', dir: 'asc' });
  });

  it('cada columna ordena de menor a mayor y de mayor a menor en todos los oficios', () => {
    for (const skill of Object.keys(calcData)) {
      const c = { ...ctx, skill };
      for (const field of Object.keys(CALC_SORT_COLUMNS)) {
        const asc = sortCalcList(calcData[skill], `${field}_asc`, c).map(x => calcSortValue(x, field, c));
        const desc = sortCalcList(calcData[skill], `${field}_desc`, c).map(x => calcSortValue(x, field, c));
        for (let i = 1; i < asc.length; i++) {
          if (typeof asc[i] === 'string') {
            expect(asc[i - 1].localeCompare(asc[i], undefined, { sensitivity: 'base', numeric: true })).toBeLessThanOrEqual(0);
            expect(desc[i - 1].localeCompare(desc[i], undefined, { sensitivity: 'base', numeric: true })).toBeGreaterThanOrEqual(0);
          } else {
            expect(asc[i - 1]).toBeLessThanOrEqual(asc[i]);
            expect(desc[i - 1]).toBeGreaterThanOrEqual(desc[i]);
          }
        }
      }
    }
  });

  it('no modifica la lista original', () => {
    const before = ids(calcData.farming);
    sortCalcList(calcData.farming, 'item_desc', ctx);
    expect(ids(calcData.farming)).toEqual(before);
  });

  it('el orden por defecto (XP por energia) queda igual que antes', () => {
    const list = sortCalcList(calcData.farming, 'xpEnergy_desc', ctx);
    const vals = list.map(x => (x.xp ?? 0) / 2);
    expect(vals).toEqual([...vals].sort((a, b) => b - a));
  });
});

describe('Liquidador: huella del inventario', () => {
  const inv = [
    { id: 'Carrot', area: 'hotbar', qty: 5 },
    { id: 'Carrot', area: 'house', qty: 10 }
  ];

  it('es igual si nada cambio y distinta si cambia una cantidad o un almacen', () => {
    expect(inventorySignature(inv)).toBe(inventorySignature(inv.map(x => ({ ...x }))));
    expect(inventorySignature(inv)).not.toBe(inventorySignature([{ ...inv[0], qty: 6 }, inv[1]]));
    expect(inventorySignature(inv)).not.toBe(inventorySignature([{ ...inv[0], area: 'house' }, inv[1]]));
    expect(inventorySignature(null)).toBe('');
  });

  it('las cantidades dependen del filtro de almacen', () => {
    const all = calculateLocalQuantities(inv, 'all');
    const bag = calculateLocalQuantities(inv, 'hotbar');
    expect(all.Carrot).toBe(15);
    expect(bag.Carrot).toBe(5);
    expect(calculateLocalQuantities(inv, "home_chest").Carrot).toBe(10);
  });
});

describe('Liquidador: la sincronizacion respeta el filtro elegido', () => {
  it('useCompanionSync lee el filtro desde una ref y no recalcula si el inventario no cambio', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/components/bloomshire/state/useCompanionSync.js', 'utf8');
    expect(src).toMatch(/inventoryScopeRef\.current = inventoryScope/);
    expect(src).toMatch(/calculateLocalQuantities\(data\.inventory, inventoryScopeRef\.current\)/);
    expect(src).not.toMatch(/calculateLocalQuantities\(data\.inventory, inventoryScope\)/);
    expect(src).toMatch(/sig !== lastInventorySigRef\.current/);
  });
});
