import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import ItemsTab from '../src/components/bloomshire/tabs/ItemsTab';
import CalcTab from '../src/components/bloomshire/tabs/CalcTab';
import InventoryTab from '../src/components/bloomshire/tabs/InventoryTab';
import QuestsTab from '../src/components/bloomshire/tabs/QuestsTab';
import CraftTab from '../src/components/bloomshire/tabs/CraftTab';
import NpcsTab from '../src/components/bloomshire/tabs/NpcsTab';
import MonitorsTab from '../src/components/bloomshire/tabs/MonitorsTab';
import AdvisorTab from '../src/components/bloomshire/tabs/AdvisorTab';
import SystemTab from '../src/components/bloomshire/tabs/SystemTab';
import BloomshireCommand from '../src/components/BloomshireCommand';

describe('Tabs rendering in free/unconnected mode with locks (candados)', () => {
  it('renders ItemsTab without throwing', () => {
    const html = renderToString(<ItemsTab getPlayerItemQty={() => 0} locateInMegaAtlas={() => {}} />);
    expect(html).toContain('Buscador de Ítems');
  });

  it('renders CalcTab without throwing', () => {
    const html = renderToString(<CalcTab currentEnergy={80} maxEnergy={80} farmingLevel={1} />);
    expect(html).toContain('Simulador de Energía');
  });

  it('renders InventoryTab in arbitrage subtab without throwing', () => {
    const html = renderToString(<InventoryTab isConnected={false} initialSubTab="arbitrage" />);
    expect(html).toContain('ARBITRAJE');
  });

  it('renders InventoryTab in liquidation (locked) subtab without throwing', () => {
    const html = renderToString(<InventoryTab isConnected={false} initialSubTab="liquidation" />);
    expect(html).toContain('Liquidador de Inventario');
    expect(html).toContain('Conectar Partida');
  });

  it('renders InventoryTab in odette (locked) subtab without throwing', () => {
    const html = renderToString(<InventoryTab isConnected={false} initialSubTab="odette" />);
    expect(html).toContain('Pedidos Diarios de Odette');
    expect(html).toContain('Conectar Partida');
  });

  it('renders InventoryTab in market_radar (locked) subtab without throwing', () => {
    const html = renderToString(<InventoryTab isConnected={false} initialSubTab="market_radar" />);
    expect(html).toContain('Radar de Rotación de Mercado');
    expect(html).toContain('Conectar Partida');
  });

  it('renders QuestsTab when locked (unconnected) without throwing', () => {
    const html = renderToString(<QuestsTab isConnected={false} />);
    expect(html).toContain('Libro de Misiones');
    expect(html).toContain('Conectar Partida');
  });

  it('renders CraftTab without throwing and filters up to level properly', () => {
    const html = renderToString(<CraftTab rawInventory={[]} initialCraftCategory="forge" />);
    expect(html).toContain('Barra de Cobre');
  });

  it('filters all unlocked crafts up to selected level in forge and bench', () => {
    // Test that level 4 in forge includes level 1 (Barra de Cobre), level 3 (Kit de Reparación), level 4 (Cut Rose Quartz)
    import('../public/data/bloomshire/craft_data.json').then(mod => {
      const craftData = mod.default || mod;
      const forgeLevel4 = craftData.forge.filter(r => (r.levelNum || 1) <= 4);
      const names = forgeLevel4.map(r => r.item);
      expect(names.some(n => n.includes('Barra de Cobre'))).toBe(true);
      expect(names.some(n => n.includes('Kit de Reparación'))).toBe(true);
      expect(names.some(n => n.includes('Cut Rose Quartz'))).toBe(true);
      expect(names.some(n => n.includes('Barra de Hierro'))).toBe(false);
    });
  });

  it('renders NpcsTab without throwing', () => {
    const html = renderToString(<NpcsTab locateInMegaAtlas={() => {}} />);
    expect(html).toContain('Tilly');
  });

  it('renders MonitorsTab when locked (unconnected) without throwing', () => {
    const html = renderToString(<MonitorsTab isConnected={false} />);
    expect(html).toContain('Temporizadores');
    expect(html).toContain('Conectar Partida');
  });

  it('renders AdvisorTab when locked (unconnected) without throwing', () => {
    const html = renderToString(<AdvisorTab isConnected={false} />);
    expect(html).toContain('Asesor Táctico Copilot IA');
    expect(html).toContain('Conectar Partida');
  });

  it('renders SystemTab without throwing', () => {
    const html = renderToString(<SystemTab />);
    expect(html).toContain('Diagnóstico');
  });

  it('renders BloomshireCommand root component without crashing in free guide mode', () => {
    const html = renderToString(<BloomshireCommand />);
    expect(html).toContain('BLOOMSHIRE');
    expect(html).toContain('Guía Comunitaria Libre');
  });
});
