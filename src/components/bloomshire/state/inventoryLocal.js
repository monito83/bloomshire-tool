// src/components/bloomshire/state/inventoryLocal.js
// Cuentas de inventario que usa el componente principal (movidas tal cual desde BloomshireCommand).
// OJO: NO son iguales a las de bloomshireHelpers.jsx (aca se busca tambien por "includes" y se lee qty/n);
// cambiarlas cambiaria numeros en pantalla.
import inventoryCatalogData from '../../../../public/data/bloomshire/inventory_catalog.json';
import { getStorageType } from '../bloomshireHelpers';

// Desglose de existencias por almacen { total, m, cc, cp }
export function getLocalStorageBreakdown(itemObj, rawInventory) {
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
}

// Mapear inventario crudo a catalogo canonico
export function calculateLocalQuantities(rawList, scope) {
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
}

// Cuantos ejemplares de un item de la enciclopedia tiene el jugador (Mochila + Cofres)
export function getLocalPlayerItemQty(itemObj, itemQuantities, rawInventory) {
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
}
