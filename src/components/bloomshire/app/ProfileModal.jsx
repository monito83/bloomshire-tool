// src/components/bloomshire/app/ProfileModal.jsx
// Modal de perfil de granjero: wallet, NFTs y boosts, estado de la nube, desconectar.
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';

export default function ProfileModal({
    activeCrops, activeOrders, avyn, currentEnergy, dailyTasks, farmersOwned,
    farmingLevel, gold, handleDisconnect, isVip, maxEnergy, playerPerks,
    rawInventory, sessionToken, setShowConnectModal, setShowProfileModal, shards, skillsBreakdown,
    walletAddress
  }) {
  return (
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
  );
}
