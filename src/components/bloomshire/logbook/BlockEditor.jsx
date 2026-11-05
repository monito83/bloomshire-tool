// src/components/bloomshire/logbook/BlockEditor.jsx
// Campos de edicion de cada tipo de bloque. Los textos con idioma usan
// <campo>_en / <campo>_es segun el idioma que se esta editando; en modo ES se
// muestra el original en ingles como referencia para traducir.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Field, inputCls } from './adminUi';
import PlaceSearch from './PlaceSearch';
import { PlaceChip } from './LogbookBlocks';
import { parseYouTubeId, CALLOUT_VARIANTS } from './logbookModel';

export const BLOCK_ICONS = {
  text: '¶', heading: 'H', image: '🖼️', gallery: '🎞️', youtube: '▶', table: '▦',
  callout: '💡', list: '•', divider: '—', file: '📄', place: '📍', statcards: '📊'
};

export const BLOCK_ORDER = ['text', 'heading', 'list', 'callout', 'table', 'image', 'gallery', 'youtube', 'place', 'statcards', 'file', 'divider'];

export function newBlock(type) {
  switch (type) {
    case 'text': return { type, md_en: '', md_es: '' };
    case 'heading': return { type, level: 2, text_en: '', text_es: '' };
    case 'image': return { type, path: '', alt_en: '', alt_es: '', caption_en: '', caption_es: '' };
    case 'gallery': return { type, images: [{ path: '', alt_en: '', alt_es: '' }], caption_en: '', caption_es: '' };
    case 'youtube': return { type, id: '', url: '', start: 0, title_en: '', title_es: '' };
    case 'table': return { type, md_en: '| Column | Column |\n| --- | --- |\n|  |  |', md_es: '' };
    case 'callout': return { type, variant: 'tip', title_en: '', title_es: '', md_en: '', md_es: '' };
    case 'list': return { type, ordered: false, items_en: [], items_es: [] };
    case 'file': return { type, path: '', label_en: '', label_es: '', bytes: null };
    case 'place': return { type, key: '', note_en: '', note_es: '' };
    case 'statcards': return { type, cards: [{ icon: '', value: '', label_en: '', label_es: '', hint_en: '', hint_es: '' }] };
    default: return { type: 'divider' };
  }
}

/** Texto en ingles de referencia, visible solo al editar en espanol. */
function EnRef({ show, text }) {
  const { t } = useTranslation('logbook');
  if (!show || !text || (Array.isArray(text) && !text.length)) return null;
  const value = Array.isArray(text) ? text.join('\n') : text;
  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-2.5 py-1.5">
      <div className="text-[9px] font-black uppercase tracking-widest text-sky-400/80">{t('admin.entry.enReference')}</div>
      <div className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs text-slate-400">{value}</div>
    </div>
  );
}

export default function BlockEditor({ block, onChange, editLang, corpus, placesByKey, uiLang }) {
  const { t } = useTranslation('logbook');
  const L = (f) => `${f}_${editLang}`;
  const isEs = editLang === 'es';
  const set = (patch) => onChange({ ...block, ...patch });
  const setL = (f, v) => set({ [L(f)]: v });

  const mdArea = (field, { mono = false, hint = t('admin.fields.markdownHint'), label = t('admin.fields.markdown'), rows = 5 } = {}) => (
    <Field label={label} hint={hint}>
      <div className="space-y-1.5">
        <EnRef show={isEs} text={block[`${field}_en`]} />
        <textarea
          className={`${inputCls} ${mono ? 'font-mono text-xs' : ''} leading-relaxed`}
          rows={rows}
          value={block[L(field)] || ''}
          onChange={(e) => setL(field, e.target.value)}
        />
      </div>
    </Field>
  );

  const line = (field, label, opts = {}) => (
    <Field label={label} hint={opts.hint}>
      <div className="space-y-1.5">
        {opts.lang !== false && <EnRef show={isEs} text={block[`${field}_en`]} />}
        <input
          className={inputCls}
          value={(opts.lang === false ? block[field] : block[L(field)]) || ''}
          onChange={(e) => (opts.lang === false ? set({ [field]: e.target.value }) : setL(field, e.target.value))}
          placeholder={opts.placeholder}
        />
      </div>
    </Field>
  );

  switch (block.type) {
    case 'text':
      return mdArea('md', { rows: 6 });

    case 'heading':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          {line('text', t('admin.fields.headingText'))}
          <Field label={t('admin.fields.level')}>
            <select className={inputCls} value={block.level === 3 ? 3 : 2} onChange={(e) => set({ level: Number(e.target.value) })}>
              <option value={2}>{t('admin.fields.level2')}</option>
              <option value={3}>{t('admin.fields.level3')}</option>
            </select>
          </Field>
        </div>
      );

    case 'callout':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <Field label={t('admin.fields.variant')}>
              <select className={inputCls} value={block.variant} onChange={(e) => set({ variant: e.target.value })}>
                {CALLOUT_VARIANTS.map((v) => <option key={v} value={v}>{t(`blocks.${v}`)}</option>)}
              </select>
            </Field>
            {line('title', t('admin.fields.calloutTitle'))}
          </div>
          {mdArea('md', { rows: 3 })}
        </div>
      );

    case 'table':
      return mdArea('md', { mono: true, hint: t('admin.fields.tableHint'), rows: 6 });

    case 'list': {
      const items = block[L('items')] || [];
      return (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
            <input type="checkbox" checked={Boolean(block.ordered)} onChange={(e) => set({ ordered: e.target.checked })} className="accent-amber-500" />
            {t('admin.fields.ordered')}
          </label>
          <Field label={t('admin.fields.items')} hint={t('admin.fields.markdownHint')}>
            <div className="space-y-1.5">
              <EnRef show={isEs} text={block.items_en} />
              <textarea className={inputCls} rows={5} value={items.join('\n')} onChange={(e) => setL('items', e.target.value.split('\n'))} />
            </div>
          </Field>
        </div>
      );
    }

    case 'image':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {line('path', t('admin.fields.path'), { lang: false, placeholder: 'guides/gloom-cave/1.webp' })}
          {line('alt', t('admin.fields.alt'))}
          <div className="sm:col-span-2">{line('caption', t('admin.fields.caption'))}</div>
        </div>
      );

    case 'gallery': {
      const images = block.images || [];
      const setImg = (i, patch) => set({ images: images.map((im, j) => (j === i ? { ...im, ...patch } : im)) });
      return (
        <div className="space-y-2.5">
          {images.map((im, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
              <span className="w-7 text-center text-[11px] font-black text-amber-300">#{i + 1}</span>
              <input className={`${inputCls} font-mono text-xs`} value={im.path || ''} placeholder={t('admin.fields.path')} onChange={(e) => setImg(i, { path: e.target.value })} />
              <input className={inputCls} value={im[L('alt')] || ''} placeholder={isEs && im.alt_en ? im.alt_en : t('admin.fields.alt')} onChange={(e) => setImg(i, { [L('alt')]: e.target.value })} />
              <button type="button" onClick={() => set({ images: images.filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer" aria-label={t('admin.fields.remove')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set({ images: [...images, { path: '', alt_en: '', alt_es: '' }] })} className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> {t('admin.fields.addImage')}
          </button>
          {line('caption', t('admin.fields.caption'))}
        </div>
      );
    }

    case 'youtube': {
      const raw = block.url != null && block.url !== '' ? block.url : block.id || '';
      const parsed = parseYouTubeId(raw);
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Field label={t('admin.fields.youtubeUrl')} hint={raw && !parsed ? undefined : null}>
              <input
                className={`${inputCls} ${raw && !parsed ? '!border-rose-500/60' : ''}`}
                value={raw}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(e) => set({ url: e.target.value, id: parseYouTubeId(e.target.value) || '' })}
              />
            </Field>
            <Field label={t('admin.fields.start')}>
              <input type="number" min={0} className={`${inputCls} !w-28`} value={block.start || 0} onChange={(e) => set({ start: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
          </div>
          {raw && !parsed && <p className="text-xs font-bold text-rose-300">{t('admin.fields.youtubeInvalid')}</p>}
          {line('title', t('admin.fields.videoTitle'))}
        </div>
      );
    }

    case 'file':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {line('path', t('admin.fields.path'), { lang: false, placeholder: 'docs/guide.pdf' })}
          {line('label', t('admin.fields.fileLabel'))}
        </div>
      );

    case 'place': {
      const place = block.key ? placesByKey.get(block.key) : null;
      return (
        <div className="space-y-3">
          <Field label={t('admin.fields.pickPlace')}>
            <div className="space-y-2">
              {block.key && (
                <div className="flex items-center gap-2">
                  <PlaceChip placeKey={block.key} place={place} lang={uiLang} size="sm" />
                  <button type="button" onClick={() => set({ key: '' })} className="text-slate-500 hover:text-rose-300 cursor-pointer" aria-label={t('admin.fields.remove')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <PlaceSearch corpus={corpus} lang={uiLang} onSelect={(p) => set({ key: p.key })} placeholder={t('places.filterPlaceholder')} />
            </div>
          </Field>
          {line('note', t('admin.fields.note'))}
        </div>
      );
    }

    case 'statcards': {
      const cards = block.cards || [];
      const setCard = (i, patch) => set({ cards: cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
      return (
        <div className="space-y-2.5">
          {cards.map((c, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_6rem_1fr_1fr_auto] items-center gap-2">
              <input className={`${inputCls} text-center`} value={c.icon || ''} placeholder="⚡" maxLength={8} aria-label={t('admin.fields.icon')} onChange={(e) => setCard(i, { icon: e.target.value })} />
              <input className={`${inputCls} font-bold`} value={c.value || ''} placeholder={t('admin.fields.value')} maxLength={60} onChange={(e) => setCard(i, { value: e.target.value })} />
              <input className={inputCls} value={c[L('label')] || ''} placeholder={isEs && c.label_en ? c.label_en : t('admin.fields.label')} onChange={(e) => setCard(i, { [L('label')]: e.target.value })} />
              <input className={inputCls} value={c[L('hint')] || ''} placeholder={isEs && c.hint_en ? c.hint_en : t('admin.fields.hint')} onChange={(e) => setCard(i, { [L('hint')]: e.target.value })} />
              <button type="button" onClick={() => set({ cards: cards.filter((_, j) => j !== i) })} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer" aria-label={t('admin.fields.remove')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set({ cards: [...cards, { icon: '', value: '', label_en: '', label_es: '', hint_en: '', hint_es: '' }] })} className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> {t('admin.fields.addCard')}
          </button>
        </div>
      );
    }

    case 'divider':
    default:
      return null;
  }
}
