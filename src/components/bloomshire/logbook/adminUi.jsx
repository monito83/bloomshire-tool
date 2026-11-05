// src/components/bloomshire/logbook/adminUi.jsx
// Piezas de interfaz compartidas por el panel de administracion de la bitacora.
import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TriangleAlert, LoaderCircle, LockKeyhole } from 'lucide-react';
import { adminLogin } from './logbookAdminApi';

const KNOWN_ERRORS = new Set([
  'invalid_password', 'too_many_attempts', 'not_configured', 'not_available', 'unauthorized', 'title_required',
  'invalid_slug', 'slug_taken', 'section_required', 'invalid_section', 'invalid_parent', 'cycle', 'confirm_mismatch',
  'invalid_cover', 'invalid_place', 'too_large', 'network_error'
]);

export function useAdminErrorText() {
  const { t } = useTranslation('logbook');
  return (err) => {
    if (!err) return '';
    const code = typeof err === 'string' ? err : err.code || err.message;
    return KNOWN_ERRORS.has(code) ? t(`admin.errors.${code}`) : t('admin.errors.generic');
  };
}

export const inputCls =
  'w-full rounded-xl border border-slate-700/80 bg-[#0a1324] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-amber-500/60 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]';

export function Field({ label, hint, children, className = '', aside = null }) {
  const id = useId();
  return (
    <label className={`block space-y-1.5 ${className}`} htmlFor={id}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        {aside}
      </span>
      {React.isValidElement(children) ? React.cloneElement(children, { id: children.props.id || id }) : children}
      {hint && <span className="block text-[11px] leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-200" role="alert">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span>{children}</span>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width = 'max-w-lg' }) {
  const { t } = useTranslation('logbook');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm lb-fade" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c172c] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] lb-pop`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <h3 className="text-base font-black text-amber-100">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-slate-200 cursor-pointer" aria-label={t('admin.actions.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-[#0a1324]/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Button({ variant = 'ghost', children, className = '', ...props }) {
  const styles = {
    primary: 'bg-gradient-to-b from-amber-400 to-amber-600 text-[#1a1205] shadow-[0_6px_20px_-8px_rgba(245,158,11,0.7)] hover:from-amber-300 hover:to-amber-500',
    ghost: 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100',
    danger: 'border border-rose-500/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Confirmacion fuerte: hay que escribir el slug. */
export function ConfirmDeleteModal({ title, body, slug, onConfirm, onClose }) {
  const { t } = useTranslation('logbook');
  const errorText = useAdminErrorText();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try { await onConfirm(typed); } catch (err) { setError(err); setBusy(false); }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <Button onClick={onClose}>{t('admin.actions.cancel')}</Button>
          <Button variant="danger" disabled={typed !== slug || busy} onClick={run}>
            {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {t('admin.section.deleteConfirm')}
          </Button>
        </>
      )}
    >
      <p className="text-sm text-slate-300">{body}</p>
      <input className={`${inputCls} font-mono`} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={slug} autoFocus />
      <ErrorNote>{error ? errorText(error) : null}</ErrorNote>
    </Modal>
  );
}

export function AdminLoginModal({ onClose, onSuccess }) {
  const { t } = useTranslation('logbook');
  const errorText = useAdminErrorText();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await adminLogin(password);
      setPassword('');
      onSuccess({ token: session.token, expiresAt: session.expiresAt });
    } catch (err) {
      setError(err);
      setBusy(false);
      setTimeout(() => inputRef.current && inputRef.current.select(), 0);
    }
  };
  return (
    <Modal title={t('admin.login.title')} onClose={onClose} width="max-w-sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
            <LockKeyhole className="h-5 w-5 text-amber-300" />
          </span>
          <p className="text-sm text-slate-400">{t('admin.login.body')}</p>
        </div>
        <Field label={t('admin.login.password')}>
          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        <ErrorNote>{error ? errorText(error) : null}</ErrorNote>
        <Button variant="primary" className="w-full py-2.5" disabled={!password || busy} onClick={submit}>
          {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
          {busy ? t('admin.login.submitting') : t('admin.login.submit')}
        </Button>
      </form>
    </Modal>
  );
}

/** Interruptor Borrador / Publicado. */
export function StatusToggle({ value, onChange }) {
  const { t } = useTranslation('logbook');
  return (
    <div className="inline-flex rounded-xl border border-slate-700 bg-[#0a1324] p-0.5" role="radiogroup" aria-label={t('admin.status.label')}>
      {['draft', 'published'].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          title={t(`admin.status.${s}Hint`)}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            value === s
              ? s === 'published' ? 'bg-emerald-500/20 text-emerald-200 shadow-inner' : 'bg-slate-700/60 text-slate-100'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {t(`admin.status.${s}`)}
        </button>
      ))}
    </div>
  );
}
