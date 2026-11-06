// src/components/bloomshire/app/ConnectModal.jsx
// Ventana de conexion en dos pasos, con el estado de cada uno:
//   1) Extension Bloomshire Companion: trae los datos de la partida (descarga .zip + tutorial).
//   2) Firma con la wallet: desbloquea los modulos con candado y la partida en la nube.
// Con los dos pasos la tool queda completa.
import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  X, Puzzle, Wallet, Check, Download, RefreshCw, ChevronDown, LoaderCircle, ShieldCheck, Copy, Sparkles, Lock, Map as MapIcon
} from 'lucide-react';
import useCompanionStatus from '../state/useCompanionStatus';

const GAME_URL = 'https://bloomshire.xyz/play/';
const EXT_PAGE = 'chrome://extensions';

function StatusPill({ tone, children }) {
  const tones = {
    ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    warn: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    off: 'border-slate-700 bg-slate-800/60 text-slate-400',
    busy: 'border-sky-500/40 bg-sky-500/10 text-sky-300'
  };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StepBadge({ n, done, accent }) {
  return done ? (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 shadow-[0_0_24px_-6px_rgba(16,185,129,0.8)]">
      <Check className="h-5 w-5" strokeWidth={3} />
    </span>
  ) : (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${accent}`}>{n}</span>
  );
}

function CopyChip({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* sin portapapeles */ }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#091122] px-1.5 py-0.5 font-mono text-[10.5px] text-amber-200 transition-colors hover:border-amber-500/50 cursor-pointer" title={label}>
      {text}
      {done ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-500" />}
    </button>
  );
}

export default function ConnectModal({
    applyIncomingSync, connectFeedback, handleConnectAndSignWallet, injectedWallets,
    setConnectFeedback, setShowConnectModal, isConnected = false, walletAddress = null
  }) {
  const { t } = useTranslation('session');
  const ext = useCompanionStatus();
  const extReady = ext.state === 'ok' || ext.state === 'outdated';
  const signed = Boolean(isConnected);
  const [showGuide, setShowGuide] = useState(false);
  const doneCount = (extReady ? 1 : 0) + (signed ? 1 : 0);

  // Si no hay extension, el tutorial se abre solo
  useEffect(() => { if (ext.state === 'missing') setShowGuide(true); }, [ext.state]);

  const close = () => { setShowConnectModal(false); setConnectFeedback(null); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const feedbackText = connectFeedback
    ? (connectFeedback.key ? t(connectFeedback.key, connectFeedback.params) : connectFeedback.text)
    : '';

  const syncNow = () => {
    window.postMessage({ type: 'FORCE_SYNC_ALL', force: true }, '*');
    document.dispatchEvent(new CustomEvent('monios_force_sync', { detail: { force: true } }));
    setConnectFeedback({ type: 'loading', key: 'feedback.searching' });
    ext.recheck();
    setTimeout(() => {
      const snap = localStorage.getItem('bloomshire_cached_snapshot');
      if (snap) {
        try {
          const parsed = JSON.parse(snap);
          if (parsed && (parsed.gold > 0 || (parsed.inventory && parsed.inventory.length > 0))) {
            applyIncomingSync(parsed, 'cache');
            setConnectFeedback({ type: 'success', key: signed ? 'feedback.linkedFull' : 'feedback.linkedCache' });
            return;
          }
        } catch { /* cache rota: seguimos */ }
      }
      setConnectFeedback({ type: 'info', key: 'feedback.notFound' });
    }, 1500);
  };

  const extPill = {
    checking: <StatusPill tone="busy"><LoaderCircle className="h-3 w-3 animate-spin" />{t('connect.ext.checking')}</StatusPill>,
    missing: <StatusPill tone="off">{t('connect.ext.missing')}</StatusPill>,
    outdated: <StatusPill tone="warn">{ext.version ? t('connect.ext.outdated', { version: ext.version }) : t('connect.ext.outdatedOld')}</StatusPill>,
    ok: <StatusPill tone="ok"><Check className="h-3 w-3" />{t('connect.ext.ok', { version: ext.version })}</StatusPill>
  }[ext.state];

  const guideSteps = [
    <Trans key="1" t={t} i18nKey="connect.guide.s1" values={{ version: ext.latest }} components={{ b: <b className="text-slate-100" /> }} />,
    <span key="2" className="flex flex-wrap items-center gap-1.5">
      <Trans t={t} i18nKey="connect.guide.s2" components={{ b: <b className="text-slate-100" /> }} />
      <CopyChip text={EXT_PAGE} label={t('connect.guide.copy')} />
    </span>,
    <Trans key="3" t={t} i18nKey="connect.guide.s3" components={{ b: <b className="text-slate-100" /> }} />,
    <Trans key="4" t={t} i18nKey="connect.guide.s4" components={{ b: <b className="text-slate-100" /> }} />,
    <Trans key="5" t={t} i18nKey="connect.guide.s5" components={{ a: <a href={GAME_URL} target="_blank" rel="noreferrer" className="font-bold text-amber-300 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-200" /> }} />
  ];

  const tiers = [
    { icon: MapIcon, key: 'free', on: true },
    { icon: Puzzle, key: 'ext', on: extReady },
    { icon: Lock, key: 'sign', on: signed }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4" onMouseDown={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('connect.title')}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-[#0b1428] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Cabecera con progreso */}
        <div className="relative overflow-hidden border-b border-slate-800 px-5 py-4 sm:px-6">
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-xl shadow-[0_8px_30px_-8px_rgba(245,158,11,0.7)]">🎮</span>
              <div>
                <h3 className="text-lg font-black leading-tight text-amber-50">{t('connect.title')}</h3>
                <p className="text-xs text-slate-400">{t('connect.subtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={close} aria-label={t('connect.close')} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-4 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[0, 1].map((i) => (
                <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <span className={`block h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700 ${i < doneCount ? 'w-full' : 'w-0'}`} />
                </span>
              ))}
            </div>
            <span className={`text-[11px] font-black ${doneCount === 2 ? 'text-emerald-300' : 'text-slate-400'}`}>
              {doneCount === 2 ? t('connect.complete') : t('connect.progress', { done: doneCount })}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6">
          {/* Paso 1: extension */}
          <section className={`rounded-2xl border p-4 transition-colors ${extReady && ext.state === 'ok' ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-amber-500/30 bg-[#0e1931]'}`}>
            <div className="flex items-start gap-3">
              <StepBadge n={1} done={ext.state === 'ok'} accent="border-amber-500/50 bg-amber-500/10 text-amber-300" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-black text-white"><Puzzle className="h-4 w-4 text-amber-400" />{t('connect.ext.title')}</h4>
                  {extPill}
                </div>
                <p className="text-[12px] leading-relaxed text-slate-300">{t('connect.ext.body')}</p>
                <p className="text-[11px] text-slate-500">{t('connect.ext.readOnly')}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-12">
              {ext.state !== 'ok' && (
                <a
                  href={ext.zipUrl}
                  download
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-[0_8px_24px_-10px_rgba(245,158,11,0.8)] transition-all hover:from-amber-300 hover:to-amber-500 active:scale-[0.98]"
                >
                  <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  {ext.state === 'outdated' ? t('connect.ext.update', { version: ext.latest }) : t('connect.ext.download', { version: ext.latest })}
                </a>
              )}
              {extReady && (
                <button type="button" onClick={syncNow} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-black text-amber-200 transition-all hover:bg-amber-500/20 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />{t('connect.ext.sync')}
                </button>
              )}
              {ext.state === 'missing' && (
                <button type="button" onClick={ext.recheck} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />{t('connect.ext.recheck')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                aria-expanded={showGuide}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 transition-colors hover:text-amber-200 cursor-pointer"
              >
                {ext.state === 'outdated' ? t('connect.guide.toggleUpdate') : t('connect.guide.toggle')}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showGuide ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showGuide && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-[#091122] p-3.5 sm:ml-12 animate-in fade-in slide-in-from-top-1 duration-200">
                <ol className="space-y-2.5">
                  {guideSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-slate-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-[10px] font-black text-amber-300">{i + 1}</span>
                      <span className="min-w-0">{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 border-t border-slate-800 pt-2.5 text-[11px] text-slate-500">{t('connect.guide.browsers')}</p>
                <p className="mt-1 text-[11px] text-slate-500">{t('connect.guide.updateHow')}</p>
              </div>
            )}
          </section>

          {/* Paso 2: firma */}
          <section className={`rounded-2xl border p-4 transition-colors ${signed ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-cyan-500/30 bg-[#0e1931]'}`}>
            <div className="flex items-start gap-3">
              <StepBadge n={2} done={signed} accent="border-cyan-500/50 bg-cyan-500/10 text-cyan-300" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-black text-white"><Wallet className="h-4 w-4 text-cyan-400" />{t('connect.sign.title')}</h4>
                  {signed
                    ? <StatusPill tone="ok"><Check className="h-3 w-3" />{t('connect.sign.ok', { wallet: walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '' })}</StatusPill>
                    : <StatusPill tone="off">{t('connect.sign.pending')}</StatusPill>}
                </div>
                <p className="text-[12px] leading-relaxed text-slate-300">{t('connect.sign.body')}</p>
                <p className="flex items-start gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400/80" />{t('connect.sign.safe')}</p>
              </div>
            </div>
            {!signed && (
              <div className="mt-3 space-y-2.5 sm:pl-12">
                <button
                  type="button"
                  onClick={() => handleConnectAndSignWallet()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-3.5 py-2.5 text-xs font-black text-white shadow-[0_8px_28px_-10px_rgba(34,211,238,0.7)] transition-all hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] sm:w-auto cursor-pointer"
                >
                  <Wallet className="h-4 w-4" />{t('connect.sign.button')}
                </button>
                {injectedWallets.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">{t('connect.pickWallet')}</span>
                    {injectedWallets.map((w) => (
                      <button
                        key={w.info.uuid}
                        type="button"
                        onClick={() => handleConnectAndSignWallet(w.provider)}
                        className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-[#0d172e] px-2.5 py-1 text-xs font-bold text-cyan-200 transition-all hover:bg-cyan-950/80 active:scale-95 cursor-pointer"
                      >
                        {w.info.icon && <img src={w.info.icon} alt="" className="h-3.5 w-3.5 rounded" />}
                        <span>{w.info.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Que suma cada paso */}
          <section className="rounded-2xl border border-slate-800 bg-[#091122]/70 p-4">
            <h4 className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />{t('connect.tiers.title')}
            </h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {tiers.map(({ icon: Icon, key, on }) => (
                <div key={key} className={`rounded-xl border p-3 transition-colors ${on ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-slate-800 bg-slate-900/40'}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <Icon className={`h-4 w-4 ${on ? 'text-emerald-300' : 'text-slate-500'}`} />
                    {on && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className={`text-[12px] font-black ${on ? 'text-slate-100' : 'text-slate-400'}`}>{t(`connect.tiers.${key}.title`)}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{t(`connect.tiers.${key}.body`)}</div>
                </div>
              ))}
            </div>
          </section>

          {connectFeedback && (
            <div
              role="status"
              className={`rounded-xl border p-3 text-xs font-bold ${
                connectFeedback.type === 'success' ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                  : connectFeedback.type === 'loading' ? 'animate-pulse border-amber-500/40 bg-amber-950/60 text-amber-300'
                    : connectFeedback.type === 'info' ? 'border-sky-500/40 bg-sky-950/50 text-sky-200'
                      : 'border-rose-500/40 bg-rose-950/60 text-rose-300'
              }`}
            >
              {feedbackText}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-[#091122]/60 px-5 py-3 text-xs sm:px-6">
          <span className="text-slate-500">{t('connect.help')}</span>
          <button type="button" onClick={close} className="rounded-lg bg-slate-800 px-4 py-1.5 font-bold text-slate-300 hover:bg-slate-700 cursor-pointer">
            {t('connect.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
