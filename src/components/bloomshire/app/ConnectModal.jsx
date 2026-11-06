// src/components/bloomshire/app/ConnectModal.jsx
// Modal de conexión: firma SIWE, extensión o lectura pública.
// Movido tal cual desde BloomshireCommand (docs/REFACTOR_SPEC.md, fase 4).
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

export default function ConnectModal({
    applyIncomingSync, connectCode, connectFeedback, handleConnectAndSignWallet, injectedWallets, setConnectCode,
    setConnectFeedback, setShowConnectModal, setViewOnlyWallet
  }) {
  const { t } = useTranslation('session');
  const feedbackText = connectFeedback
    ? (connectFeedback.key ? t(connectFeedback.key, connectFeedback.params) : connectFeedback.text)
    : '';
  return (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0b1428] border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎮</span>
                        <h3 className="text-base font-black text-amber-400">{t('connect.title')}</h3>
                      </div>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        aria-label={t('connect.close')}
                        className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Opcion 1: Firma Web3 Segura (SIWE) */}
                      <div className="p-4 bg-gradient-to-br from-[#101b33] to-[#0a1426] border border-cyan-500/40 rounded-xl space-y-2.5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold rounded-full border border-cyan-500/30">
                          {t('connect.recommended')}
                        </div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{t('connect.o1Title')}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          <Trans t={t} i18nKey="connect.o1Body" components={{ b: <b /> }} />
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleConnectAndSignWallet()}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
                          >
                            <span>{t('connect.o1Button')}</span>
                          </button>
                        </div>
                        {injectedWallets.length > 1 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
                              {t('connect.pickWallet')}
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
                          <span>{t('connect.evm')}</span>
                          <span>•</span>
                          <span>{t('connect.jwt')}</span>
                        </div>
                      </div>

                      {/* Opcion 2: Extension */}
                      <div className="p-4 bg-[#101b33] border border-amber-500/30 rounded-xl space-y-2">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{t('connect.o2Title')}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          <Trans t={t} i18nKey="connect.o2Body" components={{ b: <b /> }} />
                        </p>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[10.5px]">
                          <Trans t={t} i18nKey="connect.o2Note" components={{ b: <b /> }} />
                        </div>
                        <div className="pt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => {
                              window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
                              document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { force: true } }));
                              setConnectFeedback({ type: 'info', key: 'feedback.searching' });
                              setTimeout(() => {
                                const snap = localStorage.getItem('bloomshire_cached_snapshot');
                                const w = localStorage.getItem('bloomshire_wallet');
                                if (snap) {
                                  try {
                                    const parsed = JSON.parse(snap);
                                    if (parsed && (parsed.gold > 0 || (parsed.inventory && parsed.inventory.length > 0))) {
                                      applyIncomingSync(parsed, 'cache');
                                      setConnectFeedback({ type: 'success', key: 'feedback.linkedCache' });
                                      return;
                                    }
                                  } catch (_) {}
                                }
                                if (w && w.startsWith('0x')) {
                                  setConnectFeedback({ type: 'success', key: 'feedback.linkedWallet', params: { wallet: w.slice(0, 6) } });
                                } else {
                                  setConnectFeedback({ type: 'info', key: 'feedback.notFound' });
                                }
                              }, 1500);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                          >
                            <span>{t('connect.o2Button')}</span>
                          </button>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                          <li>{t('connect.o2Step1')}</li>
                          <li><Trans t={t} i18nKey="connect.o2Step2" components={{ a: <a href="https://bloomshire.xyz/play/" target="_blank" rel="noreferrer" className="text-amber-400 underline font-bold" /> }} /></li>
                          <li>{t('connect.o2Step3')}</li>
                        </ol>
                      </div>

                      {/* Opcion 3: Modo Lectura Publica */}
                      <div className="p-4 bg-[#101b33] border border-slate-800 rounded-xl space-y-2.5">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{t('connect.o3Title')}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          <Trans t={t} i18nKey="connect.o3Body" components={{ code: <code className="text-cyan-300 font-mono" /> }} />
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
                                  setConnectFeedback({ type: 'loading', key: 'feedback.lookingUp' });
                                  const res = await fetch(`/api/bloomshire-advisor?action=sync&wallet=${encodeURIComponent(targetWallet)}`);
                                  if (res.ok) {
                                    const json = await res.json();
                                    if (json.onChain) {
                                      setConnectFeedback({ type: 'success', key: 'feedback.publicProfile', params: { wallet: targetWallet.slice(0, 6), farmers: json.onChain.farmersCount ?? 0 } });
                                    } else {
                                      setConnectFeedback({ type: 'info', key: 'feedback.readOnly', params: { wallet: targetWallet.slice(0, 6) } });
                                    }
                                  }
                                } catch (_) {
                                  setConnectFeedback({ type: 'info', key: 'feedback.readOnly', params: { wallet: targetWallet.slice(0, 6) } });
                                }
                                setTimeout(() => { setShowConnectModal(false); setConnectFeedback(null); }, 2000);
                              } else {
                                setConnectFeedback({ type: 'error', key: 'feedback.badAddress' });
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs cursor-pointer transition-all border border-slate-700 shrink-0"
                          >
                            {t('connect.o3Button')}
                          </button>
                        </div>
                      </div>

                      {connectFeedback && (
                        <div className={`p-2.5 rounded-lg text-xs font-bold ${connectFeedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : connectFeedback.type === 'loading' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'}`}>
                          {feedbackText}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-500">{t('connect.help')}</span>
                      <button
                        onClick={() => { setShowConnectModal(false); setConnectFeedback(null); }}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
                      >
                        {t('connect.close')}
                      </button>
                    </div>
                  </div>
                </div>
  );
}
