// src/components/bloomshire/app/ConnectModal.jsx
// Modal de conexión: firma SIWE, extensión o lectura pública.
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';

export default function ConnectModal({
    applyIncomingSync, connectCode, connectFeedback, handleConnectAndSignWallet, injectedWallets, setConnectCode,
    setConnectFeedback, setShowConnectModal, setViewOnlyWallet
  }) {
  return (
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
  );
}
