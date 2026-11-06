// src/components/bloomshire/logbook/SpritePicker.jsx
// Selector de sprites del juego (criaturas, items, aldeanos) para el editor.
// No sube nada: guarda una ruta "game/..." que la app sirve desde sus datos.
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LoaderCircle, Check } from 'lucide-react';
import { Modal, Button, inputCls } from './adminUi';
import { mediaUrl, baseLang } from './logbookModel';
import { SPRITE_KINDS, filterSprites, loadSpriteCatalog } from './spriteCatalog';

const MAX_SHOWN = 240;

/** onPick(sprite) por cada eleccion. multiple: queda abierto para elegir varios. */
export default function SpritePicker({ onPick, onClose, multiple = false }) {
  const { t, i18n } = useTranslation('logbook');
  const lang = baseLang(i18n.language);
  const [list, setList] = useState(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState('beasts');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    loadSpriteCatalog().then((l) => alive && setList(l)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c = {};
    for (const s of list || []) c[s.kind] = (c[s.kind] || 0) + 1;
    return c;
  }, [list]);
  const shown = useMemo(() => filterSprites(list, { kind: query ? null : kind, query }), [list, kind, query]);

  const pick = (s) => {
    onPick(s);
    if (!multiple) { onClose(); return; }
    setPicked((prev) => new Set(prev).add(s.path));
  };

  return (
    <Modal
      title={t('admin.sprites.title')}
      onClose={onClose}
      width="max-w-3xl"
      footer={multiple ? <Button variant="primary" onClick={onClose}>{t('admin.sprites.done', { count: picked.size })}</Button> : null}
    >
      <p className="text-xs text-slate-400">{t('admin.sprites.hint')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-xl border border-slate-800 bg-[#0a1324] p-1">
          {SPRITE_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setKind(k); setQuery(''); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition-colors cursor-pointer ${
                kind === k && !query ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t(`admin.sprites.kinds.${k}`)}
              {counts[k] ? <span className="ml-1.5 text-[10px] font-bold text-slate-500">{counts[k]}</span> : null}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input className={`${inputCls} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.sprites.search')} autoFocus />
        </label>
      </div>

      {!list && !failed && (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" /> {t('admin.sprites.loading')}
        </div>
      )}
      {failed && <p className="py-6 text-sm font-bold text-rose-300" role="alert">{t('admin.sprites.failed')}</p>}
      {list && shown.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{t('admin.sprites.empty')}</p>}

      {list && shown.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {shown.slice(0, MAX_SHOWN).map((s) => {
            const name = lang === 'es' ? s.name_es : s.name_en;
            const on = picked.has(s.path);
            return (
              <button
                key={s.path}
                type="button"
                onClick={() => pick(s)}
                title={name}
                className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                  on ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 bg-[#0a1324] hover:border-amber-500/50 hover:bg-amber-500/[0.06]'
                }`}
              >
                <span className="flex h-16 w-full items-center justify-center rounded-lg bg-radial from-slate-700/40 to-transparent">
                  <img
                    src={mediaUrl('', s.path)}
                    alt=""
                    loading="lazy"
                    className="max-h-14 max-w-[80%] object-contain transition-transform duration-200 group-hover:scale-110"
                    style={{ imageRendering: 'pixelated', minHeight: '2.5rem' }}
                  />
                </span>
                <span className="line-clamp-2 text-[10px] font-bold leading-tight text-slate-300">{name}</span>
                {on && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-emerald-300" />}
              </button>
            );
          })}
        </div>
      )}
      {shown.length > MAX_SHOWN && <p className="text-center text-[11px] text-slate-500">{t('admin.sprites.more', { count: shown.length - MAX_SHOWN })}</p>}
    </Modal>
  );
}
