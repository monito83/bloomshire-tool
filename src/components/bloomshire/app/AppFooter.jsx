// src/components/bloomshire/app/AppFooter.jsx
// Pie fijo con el aviso (herramienta de la comunidad, no oficial), el contacto por
// Discord y el "invitame un cafecito"; abre la ventana "Sobre la tool" con todo el detalle.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Coffee, Copy, Check, X, MessageCircle, ShieldAlert, Heart } from 'lucide-react';
import qrcode from 'qrcode-generator';

export const CONTACT_DISCORD = 'monito83';
export const DONATION_WALLET = '0xD3E0147850EC171EED26C2A28A23Eb29424d89d5';

function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch { /* sin portapapeles: el texto igual se puede seleccionar */ }
  };
  return { copied, copy };
}

/** QR de la wallet como SVG (modulos oscuros sobre fondo claro para que lo lean todas las camaras). */
function WalletQr({ value, size = 132 }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [value]);
  return (
    <svg viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`} width={size} height={size} className="rounded-xl bg-white p-1 shadow-[0_10px_30px_-12px_rgba(245,158,11,0.6)]" role="img" aria-label={value}>
      <path d={path.d} fill="#0b1428" shapeRendering="crispEdges" />
    </svg>
  );
}

function CopyRow({ label, value, mono = false, copied, onCopy, t }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#091122] px-3 py-2">
      <span className={`min-w-0 flex-1 break-all text-sm text-slate-100 ${mono ? 'font-mono text-[12px]' : 'font-bold'}`}>{value}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={t('about.copy', { what: label })}
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-black transition-colors cursor-pointer ${
          copied ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-200'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? t('about.copied') : t('about.copyShort')}
      </button>
    </div>
  );
}

export function AboutModal({ onClose, focus = 'about' }) {
  const { t } = useTranslation('common');
  const { copied, copy } = useCopy();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (focus === 'coffee') document.getElementById('about-coffee')?.scrollIntoView({ block: 'nearest' });
  }, [focus]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('about.title')}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-[#0b1428] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="relative flex items-start justify-between gap-3 overflow-hidden border-b border-slate-800 px-5 py-4">
          <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-xl shadow-[0_8px_30px_-8px_rgba(245,158,11,0.7)]">🌾</span>
            <div>
              <h3 className="text-lg font-black leading-tight text-amber-50">{t('about.title')}</h3>
              <p className="text-xs text-slate-400">{t('about.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('about.close')} className="relative rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-black text-amber-200"><ShieldAlert className="h-4 w-4" />{t('about.disclaimerTitle')}</h4>
            <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed text-slate-300 marker:text-amber-500/70">
              <li>{t('about.notOfficial')}</li>
              <li>{t('about.mayErr')}</li>
              <li>{t('about.noSecrets')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-black text-white"><MessageCircle className="h-4 w-4 text-indigo-300" />{t('about.contactTitle')}</h4>
            <p className="text-[12.5px] text-slate-400">{t('about.contactBody')}</p>
            <CopyRow label="Discord" value={`Discord · ${CONTACT_DISCORD}`} copied={copied === 'discord'} onCopy={() => copy('discord', CONTACT_DISCORD)} t={t} />
          </section>

          <section id="about-coffee" className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#16203a] to-[#0d1529] p-4">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />
            <h4 className="relative mb-1 flex items-center gap-2 text-sm font-black text-white"><Coffee className="h-4 w-4 text-amber-400" />{t('about.coffeeTitle')}</h4>
            <p className="relative mb-3 text-[12.5px] leading-relaxed text-slate-300">{t('about.coffeeBody')}</p>
            <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <WalletQr value={DONATION_WALLET} />
              <div className="min-w-0 flex-1 space-y-2">
                <CopyRow label={t('about.walletLabel')} value={DONATION_WALLET} mono copied={copied === 'wallet'} onCopy={() => copy('wallet', DONATION_WALLET)} t={t} />
                <p className="text-[11px] leading-relaxed text-slate-500">{t('about.walletNote', { end: DONATION_WALLET.slice(-4) })}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-[#091122]/60 px-5 py-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500"><Heart className="h-3.5 w-3.5 text-rose-400/80" />{t('about.thanks')}</span>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-4 py-1.5 font-bold text-slate-300 hover:bg-slate-700 cursor-pointer">{t('about.close')}</button>
        </div>
      </div>
    </div>
  );
}

export default function AppFooter() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(null); // null | 'about' | 'coffee'
  const { copied, copy } = useCopy();
  return (
    <>
      <footer className="flex shrink-0 items-center gap-3 border-t border-slate-800/80 bg-[#070c18] px-4 py-1.5 text-[11px] text-slate-500">
        <button type="button" onClick={() => setOpen('about')} className="flex min-w-0 items-center gap-1.5 text-left transition-colors hover:text-slate-300 cursor-pointer">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
          <span className="truncate">
            <span className="hidden md:inline">{t('about.footer')}</span>
            <span className="md:hidden">{t('about.footerShort')}</span>
          </span>
        </button>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => copy('discord', CONTACT_DISCORD)}
            title={t('about.discordTitle')}
            className="hidden items-center gap-1.5 rounded-lg px-2 py-0.5 transition-colors hover:bg-white/5 hover:text-indigo-200 sm:inline-flex cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5 text-indigo-300/80" />
            {copied === 'discord' ? t('about.copied') : t('about.footerDiscord', { user: CONTACT_DISCORD })}
          </button>
          <button
            type="button"
            onClick={() => setOpen('coffee')}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-black text-amber-300 transition-all hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200 cursor-pointer"
          >
            <Coffee className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-12" />
            {t('about.footerCoffee')}
          </button>
        </span>
      </footer>
      {open && <AboutModal focus={open} onClose={() => setOpen(null)} />}
    </>
  );
}
