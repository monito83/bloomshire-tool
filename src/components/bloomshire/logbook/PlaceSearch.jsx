// src/components/bloomshire/logbook/PlaceSearch.jsx
// Autocompletado de lugares (regiones, zonas, aldeanos, entradas, pistas y
// lugares propios). Sin distinguir mayusculas ni tildes; busca en EN y ES.
// En la fase 4 el editor lo reutiliza con onCreate para "Agregar 'X' como lugar nuevo".
import React, { useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X } from 'lucide-react';
import { searchPlaces, placeLabel } from './logbookModel';

export default function PlaceSearch({ corpus, lang, onSelect, placeholder, autoFocus = false, onCreate = null, createLabel = null }) {
  const { t } = useTranslation('logbook');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef(null);
  const results = useMemo(() => searchPlaces(corpus, q, { limit: 8 }), [corpus, q]);
  const canCreate = Boolean(onCreate && q.trim().length >= 2);
  const optionCount = results.length + (canCreate ? 1 : 0);

  const choose = (p) => {
    onSelect(p);
    setQ('');
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (ev) => {
    if (!open && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) { setOpen(true); return; }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive((a) => (optionCount ? (a + 1) % optionCount : 0)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive((a) => (optionCount ? (a - 1 + optionCount) % optionCount : 0)); }
    else if (ev.key === 'Enter') {
      if (active < results.length && results[active]) { ev.preventDefault(); choose(results[active]); }
      else if (canCreate && active === results.length) { ev.preventDefault(); onCreate(q.trim()); setQ(''); setOpen(false); }
    } else if (ev.key === 'Escape') { setOpen(false); }
  };

  const showList = open && q.trim().length > 0;

  return (
    <div className="relative">
      <div className="group flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#0a1324] px-3 py-2 transition-colors focus-within:border-emerald-500/60 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-400/80" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={t('places.filterLabel')}
          value={q}
          autoFocus={autoFocus}
          placeholder={placeholder || t('places.filterPlaceholder')}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); inputRef.current && inputRef.current.focus(); }} className="text-slate-500 hover:text-slate-200 cursor-pointer" aria-label={t('search.clear')}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-700 bg-[#0c1830]/95 p-1 shadow-2xl backdrop-blur-md lb-pop"
        >
          {results.map((p, i) => (
            <li
              key={p.key}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${i === active ? 'bg-emerald-500/15 text-emerald-100' : 'text-slate-300'}`}
            >
              <span className="w-5 text-center" aria-hidden="true">{p.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{placeLabel(p, lang)}</span>
                {(p.regionName_en || p.regionName_es) && (
                  <span className="block truncate text-[11px] text-slate-500">
                    {lang === 'es' ? (p.regionName_es || p.regionName_en) : (p.regionName_en || p.regionName_es)}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">{t(`places.kind.${p.kind}`)}</span>
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={active === results.length}
              onMouseDown={(e) => { e.preventDefault(); onCreate(q.trim()); setQ(''); setOpen(false); }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-bold ${active === results.length ? 'bg-amber-500/15 text-amber-200' : 'text-amber-300'}`}
            >
              <span aria-hidden="true">＋</span>
              <span>{createLabel ? createLabel(q.trim()) : q.trim()}</span>
            </li>
          )}
          {!results.length && !canCreate && (
            <li className="px-3 py-2 text-xs text-slate-500">{t('places.noMatches', { q: q.trim() })}</li>
          )}
        </ul>
      )}
    </div>
  );
}
