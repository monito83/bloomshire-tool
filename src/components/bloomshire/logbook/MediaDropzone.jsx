// src/components/bloomshire/logbook/MediaDropzone.jsx
// Zona para subir imagenes/PDF: clic para elegir, arrastrar y soltar, o pegar
// (Ctrl+V) una captura. Muestra miniatura, progreso y errores. Tambien acepta
// pegar la URL publica o la ruta del bucket (modo avanzado), o elegir un
// sprite del juego (no se sube nada).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageUp, FileUp, RefreshCw, Trash2, LoaderCircle, Link2, FileText, Swords } from 'lucide-react';
import { uploadMedia, imageFilesFrom, ACCEPT_IMAGES, ACCEPT_PDF } from './logbookUpload';
import { mediaUrl, extractMediaPath, isGameSprite } from './logbookModel';
import SpritePicker from './SpritePicker';
import { inputCls, useAdminErrorText } from './adminUi';

/** call = llamada al admin con el token; mediaBase = URL publica del bucket. */
export const UploadContext = createContext({ call: null, mediaBase: '' });

export function useUploader() {
  const { call } = useContext(UploadContext);
  const errorText = useAdminErrorText();
  const [progress, setProgress] = useState(null); // null | 0..1
  const [error, setError] = useState(null);
  const upload = useCallback(async (files, onEach) => {
    if (!call) { setError('not_available'); return; }
    setError(null);
    for (let i = 0; i < files.length; i++) {
      try {
        setProgress(0.01);
        const res = await uploadMedia(files[i], {
          call,
          onProgress: (p) => setProgress((i + p) / files.length)
        });
        onEach(res, i);
      } catch (err) {
        setError(err);
        break;
      }
    }
    setProgress(null);
  }, [call]);
  return { upload, progress, error: error ? errorText(error) : null, busy: progress != null };
}

function ProgressBar({ value }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-200" style={{ width: `${Math.round((value || 0) * 100)}%` }} />
    </div>
  );
}

/**
 * kind: 'image' | 'pdf'. multiple: permite varios archivos (galeria).
 * onUploaded(result) se llama por cada archivo subido.
 * pendingFiles: archivos pegados/soltados fuera de la zona que hay que subir al montar.
 * onPickSprite(sprite): eleccion de un sprite del juego; si falta se usa onPathChange(sprite.path).
 */
export default function MediaDropzone({ kind = 'image', value = '', onUploaded, onClear, onPathChange, multiple = false, pendingFiles = null, onPendingDone, compact = false, onPickSprite = null }) {
  const { t } = useTranslation('logbook');
  const { mediaBase } = useContext(UploadContext);
  const { upload, progress, error, busy } = useUploader();
  const [over, setOver] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualError, setManualError] = useState(false);
  const [picking, setPicking] = useState(false);
  const pickSprite = onPickSprite || (onPathChange ? (s) => onPathChange(s.path) : null);
  const inputRef = useRef(null);
  const isPdf = kind === 'pdf';
  const url = value ? mediaUrl(mediaBase, value) : null;

  const accept = (files) => {
    const list = Array.from(files || []).filter((f) => (isPdf ? f.type === 'application/pdf' : f.type.startsWith('image/')));
    if (!list.length) return;
    upload(multiple ? list : list.slice(0, 1), (res) => onUploaded(res));
  };

  // Archivos que llegaron pegando/soltando sobre el editor
  useEffect(() => {
    if (!pendingFiles || !pendingFiles.length) return;
    const files = pendingFiles;
    if (onPendingDone) onPendingDone();
    accept(files);
  }, [pendingFiles]);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    accept(e.dataTransfer.files);
  };
  const onPaste = (e) => {
    const files = isPdf ? Array.from(e.clipboardData.files || []) : imageFilesFrom(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    accept(files);
  };

  const Icon = isPdf ? FileUp : ImageUp;
  const showPreview = Boolean(value) && !multiple;

  return (
    <div className="space-y-2" onPaste={onPaste}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={isPdf ? ACCEPT_PDF : ACCEPT_IMAGES}
        multiple={multiple}
        onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
      />

      {showPreview ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-[#0a1324] p-2.5">
          {isPdf ? (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300"><FileText className="h-7 w-7" /></span>
          ) : (
            <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950">
              {url ? <img src={url} alt="" className={`max-h-full max-w-full object-contain ${isGameSprite(value) ? 'h-12' : ''}`} style={isGameSprite(value) ? { imageRendering: 'pixelated' } : undefined} /> : null}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-500" title={value}>{value}</span>
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-200 cursor-pointer">
            <RefreshCw className="h-3 w-3" /> {t('admin.upload.replace')}
          </button>
          {onClear && (
            <button type="button" onClick={onClear} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer" aria-label={t('admin.fields.remove')}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && inputRef.current && inputRef.current.click()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); inputRef.current && inputRef.current.click(); } }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center outline-none transition-all ${compact ? 'px-3 py-3' : 'px-4 py-6'} ${
            over
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : 'border-slate-700 bg-[#0a1324] hover:border-amber-500/50 hover:bg-amber-500/[0.04] focus:border-amber-500/60'
          }`}
        >
          <Icon className={`h-6 w-6 transition-transform group-hover:-translate-y-0.5 ${over ? 'text-amber-300' : 'text-amber-400/70'}`} />
          <span className="text-xs font-bold text-slate-300">
            {isPdf ? t('admin.upload.dropPdf') : multiple ? t('admin.upload.dropImages') : t('admin.upload.dropImage')}
          </span>
          {!isPdf && <span className="text-[11px] text-slate-500">{t('admin.upload.pasteHint')}</span>}
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-200">
          <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span className="shrink-0">{t('admin.upload.uploading', { pct: Math.round(progress * 100) })}</span>
          <ProgressBar value={progress} />
        </div>
      )}
      {error && <p className="text-xs font-bold text-rose-300" role="alert">{error}</p>}

      {manualError && <p className="text-xs font-bold text-rose-300" role="alert">{t('admin.upload.invalidPath')}</p>}
      {picking && pickSprite && <SpritePicker multiple={multiple} onPick={pickSprite} onClose={() => setPicking(false)} />}
      {((!isPdf && pickSprite) || onPathChange) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {!isPdf && pickSprite && !manual && (
            <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/80 hover:text-amber-200 cursor-pointer">
              <Swords className="h-3 w-3" /> {t('admin.sprites.open')}
            </button>
          )}
          {onPathChange && (
            manual ? (
              <input
                className={`${inputCls} w-full font-mono text-xs`}
                defaultValue={value}
                placeholder={t('admin.upload.pathPlaceholder')}
                autoFocus
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) { setManual(false); setManualError(false); return; }
                  const path = extractMediaPath(raw);
                  if (path) { onPathChange(path); setManual(false); setManualError(false); } else setManualError(true);
                }}
              />
            ) : (
              <button type="button" onClick={() => setManual(true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 cursor-pointer">
                <Link2 className="h-3 w-3" /> {t('admin.upload.usePath')}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
