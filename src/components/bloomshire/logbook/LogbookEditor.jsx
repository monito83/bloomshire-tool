// src/components/bloomshire/logbook/LogbookEditor.jsx
// Editor de una entrada: datos, lugares, etiquetas y bloques (agregar, mover,
// duplicar, borrar), edicion EN/ES y vista previa con el mismo render publico.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowUp, ArrowDown, Copy, Trash2, Plus, Eye, PencilLine, LoaderCircle, Check, X
} from 'lucide-react';
import BlockEditor, { BLOCK_ICONS, BLOCK_ORDER, newBlock } from './BlockEditor';
import LogbookBlocks, { PlaceChip } from './LogbookBlocks';
import PlaceSearch from './PlaceSearch';
import { Field, Button, ErrorNote, ConfirmDeleteModal, StatusToggle, inputCls, useAdminErrorText } from './adminUi';
import { slugify, validateEntryInput, sanitizeBlock, pickLang } from './logbookModel';
import MediaDropzone, { UploadContext } from './MediaDropzone';
import { imageFilesFrom } from './logbookUpload';

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
const hasList = (v) => Array.isArray(v) && v.some(hasText);

/** Cuantos textos tienen ingles pero no espanol (titulo, resumen y bloques). */
export function countMissingEs(entry) {
  let n = 0;
  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (k.endsWith('_en')) {
        const base = k.slice(0, -3);
        const en = obj[k];
        const es = obj[`${base}_es`];
        if ((hasText(en) && !hasText(es)) || (hasList(en) && !hasList(es))) n += 1;
      }
    }
    for (const nested of [obj.images, obj.cards]) if (Array.isArray(nested)) nested.forEach(visit);
  };
  visit({ title_en: entry.title_en, title_es: entry.title_es, summary_en: entry.summary_en, summary_es: entry.summary_es });
  (entry.blocks || []).forEach(visit);
  return n;
}

/** Limpia lineas vacias de listas antes de guardar. */
const cleanBlock = (b) => (b.type === 'list'
  ? { ...b, items_en: (b.items_en || []).filter(hasText), items_es: (b.items_es || []).filter(hasText) }
  : b);

/** Un bloque se puede guardar si pasa el saneado y su texto principal en ingles no esta vacio. */
export function isBlockComplete(b) {
  const clean = sanitizeBlock(b);
  if (!clean) return false;
  switch (clean.type) {
    case 'text':
    case 'table':
    case 'callout':
      return hasText(clean.md_en);
    case 'heading':
      return hasText(clean.text_en);
    case 'list':
      return hasList(clean.items_en);
    default:
      return true;
  }
}

let uid = 0;
const withKey = (b) => ({ ...b, _k: `k${++uid}` });
const stripKey = ({ _k, ...b }) => b;

function flattenSections(tree, lang) {
  const out = [];
  const walk = (nodes, depth) => nodes.forEach((n) => {
    out.push({ id: n.id, label: `${' '.repeat(depth)}${n.icon ? `${n.icon} ` : ''}${pickLang(n, 'title', lang)}` });
    walk(n.children, depth + 1);
  });
  walk(tree, 0);
  return out;
}

function AddBlockMenu({ onAdd, compact = false, onClose }) {
  const { t } = useTranslation('logbook');
  return (
    <div className={`grid gap-1.5 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'} lb-pop`}>
      {BLOCK_ORDER.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => { onAdd(type); if (onClose) onClose(); }}
          className="group flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-[#0b1527] px-2 py-2.5 text-[11px] font-bold text-slate-400 transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-100 cursor-pointer"
        >
          <span className="text-lg leading-none text-amber-300/90 transition-transform group-hover:scale-110" aria-hidden="true">{BLOCK_ICONS[type]}</span>
          {t(`admin.blocks.${type}`)}
        </button>
      ))}
    </div>
  );
}

export default function LogbookEditor({ initial, tree, uiLang, corpus, placesByKey, mediaBase, call = null, onSave, onDelete, onClose }) {
  const { t } = useTranslation('logbook');
  const errorText = useAdminErrorText();
  const isNew = !initial.id;
  const [draft, setDraft] = useState(() => ({
    id: initial.id || null,
    section_id: initial.section_id || '',
    slug: initial.slug || '',
    title_en: initial.title_en || '',
    title_es: initial.title_es || '',
    summary_en: initial.summary_en || '',
    summary_es: initial.summary_es || '',
    author: initial.author ?? 'Admin',
    tags: initial.tags || [],
    places: initial.places || [],
    cover_path: initial.cover_path || '',
    status: initial.status || 'draft',
    sort: Number.isInteger(initial.sort) ? initial.sort : 0,
    blocks: (initial.blocks || []).map(withKey)
  }));
  const [tagsText, setTagsText] = useState(() => (initial.tags || []).join(', '));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [editLang, setEditLang] = useState('en');
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [inserter, setInserter] = useState(null); // indice donde insertar
  const [confirmDelete, setConfirmDelete] = useState(false);
  const sections = useMemo(() => flattenSections(tree, uiLang), [tree, uiLang]);

  const update = useCallback((patch) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if ('title_en' in patch && !slugTouched) next.slug = slugify(patch.title_en);
      return next;
    });
    setDirty(true);
    setSavedAt(null);
  }, [slugTouched]);

  const L = (f) => `${f}_${editLang}`;
  const missingEs = useMemo(() => countMissingEs(draft), [draft]);

  // Bloques
  const setBlock = (i, b) => update({ blocks: draft.blocks.map((x, j) => (j === i ? { ...b, _k: x._k } : x)) });
  // Cambio funcional por clave: seguro aunque el bloque se mueva mientras sube un archivo
  const patchBlock = useCallback((k, fn) => {
    setDraft((d) => ({ ...d, blocks: d.blocks.map((x) => (x._k === k ? { ...fn(x), _k: k } : x)) }));
    setDirty(true);
    setSavedAt(null);
  }, []);
  // Imagenes pegadas o soltadas en cualquier parte del editor -> bloque nuevo que las sube
  const addImagesFromFiles = (files, at = null) => {
    if (!files.length) return;
    const block = files.length === 1
      ? { ...newBlock('image'), _pendingFiles: files }
      : { ...newBlock('gallery'), _pendingFiles: files };
    const blocks = [...draft.blocks];
    blocks.splice(at == null ? blocks.length : at, 0, withKey(block));
    update({ blocks });
  };
  const onEditorPaste = (e) => {
    const files = imageFilesFrom(e.clipboardData);
    if (!files.length || !call) return;
    e.preventDefault();
    addImagesFromFiles(files);
  };
  const onEditorDrop = (e) => {
    const files = imageFilesFrom(e.dataTransfer);
    if (!files.length || !call) return;
    e.preventDefault();
    addImagesFromFiles(files);
  };
  const addBlock = (type, at = draft.blocks.length) => {
    const blocks = [...draft.blocks];
    blocks.splice(at, 0, withKey(newBlock(type)));
    update({ blocks });
  };
  const moveBlock = (i, delta) => {
    const j = i + delta;
    if (j < 0 || j >= draft.blocks.length) return;
    const blocks = [...draft.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    update({ blocks });
  };
  const removeBlock = (i) => update({ blocks: draft.blocks.filter((_, j) => j !== i) });
  const duplicateBlock = (i) => {
    const blocks = [...draft.blocks];
    const { _pendingFiles, ...copy } = stripKey(draft.blocks[i]);
    blocks.splice(i + 1, 0, withKey(JSON.parse(JSON.stringify(copy))));
    update({ blocks });
  };

  const incomplete = useMemo(
    () => draft.blocks.map((b, i) => (isBlockComplete(cleanBlock(stripKey(b))) ? -1 : i)).filter((i) => i >= 0),
    [draft.blocks]
  );

  const payload = () => ({
    ...draft,
    id: draft.id || undefined,
    cover_path: draft.cover_path.trim() || null,
    tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
    blocks: draft.blocks.map((b) => cleanBlock(stripKey(b)))
  });

  const save = useCallback(async () => {
    if (busy) return;
    if (incomplete.length) { setError('incomplete_blocks'); return; }
    const body = payload();
    const check = validateEntryInput(body);
    if (!check.ok) { setError(check.error); return; }
    setBusy(true);
    setError(null);
    try {
      const saved = await onSave({ ...check.value, id: body.id });
      setDraft((d) => ({ ...d, id: saved.id, slug: saved.slug }));
      setSlugTouched(true);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }, [busy, incomplete, draft, tagsText, onSave]);

  // Ctrl+S y aviso al cerrar la pestaña con cambios
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    const onUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [save, dirty]);

  const close = () => {
    if (dirty && typeof window !== 'undefined' && !window.confirm(t('admin.entry.leaveConfirm'))) return;
    onClose(draft.id);
  };

  const previewEntry = useMemo(() => ({ ...payload(), blocks: draft.blocks.map((b) => sanitizeBlock(cleanBlock(stripKey(b)))).filter(Boolean) }),
      [draft, tagsText, preview]);

  if (confirmDelete) {
    return (
      <ConfirmDeleteModal
        title={t('admin.entry.deleteTitle')}
        body={t('admin.entry.deleteBody', { slug: draft.slug })}
        slug={draft.slug}
        onClose={() => setConfirmDelete(false)}
        onConfirm={(typed) => onDelete(draft.id, typed)}
      />
    );
  }

  const errorMessage = error === 'incomplete_blocks'
    ? `${t('admin.errors.incomplete_blocks')} (#${incomplete.map((i) => i + 1).join(', #')})`
    : error ? errorText(error) : null;

  return (
    <UploadContext.Provider value={{ call, mediaBase }}>
    <div
      className="mx-auto max-w-4xl space-y-6 pb-24 lb-fade"
      onPaste={preview ? undefined : onEditorPaste}
      onDragOver={(e) => { if (!preview && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); }}
      onDrop={preview ? undefined : onEditorDrop}
    >
      {/* Barra superior fija */}
      <div className="sticky -top-6 z-20 -mx-4 -mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800 bg-[#0b1428] px-4 py-3 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)] sm:-top-8 sm:-mx-8 sm:-mt-8 sm:px-8">
        <Button onClick={close}><ArrowLeft className="h-3.5 w-3.5" /> {t('admin.actions.back')}</Button>
        <h2 className="mr-auto truncate text-sm font-black text-amber-100">{isNew && !draft.id ? t('admin.entry.titleNew') : t('admin.entry.titleEdit')}</h2>

        <div className="inline-flex items-center rounded-xl border border-slate-700 bg-[#0a1324] p-0.5" role="radiogroup" aria-label={t('admin.entry.editingLang')}>
          {['en', 'es'].map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={editLang === l}
              onClick={() => setEditLang(l)}
              className={`relative rounded-lg px-3 py-1.5 text-[11px] font-black uppercase cursor-pointer ${editLang === l ? 'bg-amber-500/20 text-amber-200' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {l}
              {l === 'es' && missingEs > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] text-white" title={t('admin.entry.missingEs', { count: missingEs })}>{missingEs}</span>
              )}
            </button>
          ))}
        </div>
        <Button onClick={() => setPreview((p) => !p)}>
          {preview ? <PencilLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? t('admin.actions.editContent') : t('admin.actions.preview')}
        </Button>
        <StatusToggle value={draft.status} onChange={(s) => update({ status: s })} />
        <Button variant="primary" onClick={save} disabled={busy} title={t('admin.entry.shortcut')}>
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : savedAt && !dirty ? <Check className="h-3.5 w-3.5" /> : null}
          {busy ? t('admin.actions.saving') : savedAt && !dirty ? t('admin.actions.saved') : t('admin.actions.save')}
        </Button>
        {dirty && <span className="basis-full text-right text-[11px] font-bold text-amber-400/80">{t('admin.entry.unsaved')}</span>}
        {errorMessage && <div className="basis-full"><ErrorNote>{errorMessage}</ErrorNote></div>}
      </div>

      {preview ? (
        <article className="space-y-6 rounded-3xl border border-slate-800 bg-[#0b1428] p-6">
          <h1 className="text-3xl font-black tracking-tight text-amber-50">{pickLang(previewEntry, 'title', editLang)}</h1>
          {pickLang(previewEntry, 'summary', editLang) && <p className="text-lg text-slate-400">{pickLang(previewEntry, 'summary', editLang)}</p>}
          <LogbookBlocks blocks={previewEntry.blocks} lang={editLang} mediaBase={mediaBase} placesByKey={placesByKey} onLocate={null} onInternalLink={() => {}} onOpenImages={() => {}} />
        </article>
      ) : (
        <>
          {/* Datos de la entrada */}
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#0c172c] p-5">
            <Field label={`${t('admin.entry.title')} · ${editLang.toUpperCase()}`}>
              <input
                className={`${inputCls} !text-lg font-black`}
                value={draft[L('title')]}
                onChange={(e) => update({ [L('title')]: e.target.value })}
                placeholder={editLang === 'es' ? draft.title_en : ''}
                maxLength={200}
              />
            </Field>
            <Field label={`${t('admin.entry.summary')} · ${editLang.toUpperCase()}`}>
              <textarea className={inputCls} rows={2} value={draft[L('summary')]} onChange={(e) => update({ [L('summary')]: e.target.value })} placeholder={editLang === 'es' ? draft.summary_en : ''} maxLength={600} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('admin.entry.section')}>
                <select className={inputCls} value={draft.section_id} onChange={(e) => update({ section_id: e.target.value })}>
                  <option value="" disabled>—</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={t('admin.entry.slug')} hint={t('admin.section.slugHint')}>
                <input
                  className={`${inputCls} font-mono`}
                  value={draft.slug}
                  maxLength={80}
                  onChange={(e) => { setSlugTouched(true); update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }); }}
                />
              </Field>
              <Field label={t('admin.entry.author')}>
                <input className={inputCls} value={draft.author || ''} onChange={(e) => update({ author: e.target.value })} maxLength={80} />
              </Field>
              <Field label={t('admin.entry.tags')} hint={t('admin.entry.tagsHint')}>
                <input className={inputCls} value={tagsText} onChange={(e) => { setTagsText(e.target.value); setDirty(true); }} />
              </Field>
            </div>
            <Field label={t('admin.entry.places')}>
              <div className="space-y-2">
                {draft.places.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {draft.places.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <PlaceChip placeKey={k} place={placesByKey.get(k)} lang={uiLang} size="sm" />
                        <button type="button" onClick={() => update({ places: draft.places.filter((p) => p !== k) })} className="text-slate-500 hover:text-rose-300 cursor-pointer" aria-label={t('admin.fields.remove')}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <PlaceSearch corpus={corpus} lang={uiLang} onSelect={(p) => !draft.places.includes(p.key) && update({ places: [...draft.places, p.key] })} />
              </div>
            </Field>
            <Field label={t('admin.entry.cover')}>
              <div>
                <MediaDropzone
                  kind="image"
                  compact
                  value={draft.cover_path}
                  onUploaded={(res) => update({ cover_path: res.path })}
                  onClear={() => update({ cover_path: '' })}
                  onPathChange={(path) => update({ cover_path: path })}
                />
              </div>
            </Field>
          </section>

          {/* Bloques */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('admin.entry.content')}</h3>
            {call && <p className="text-[11px] text-slate-500">{t('admin.upload.pasteAnywhere')}</p>}
            {draft.blocks.length === 0 && <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">{t('admin.entry.emptyBlocks')}</p>}
            {draft.blocks.map((b, i) => (
              <React.Fragment key={b._k}>
                {inserter === i ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-3">
                    <AddBlockMenu compact onAdd={(type) => addBlock(type, i)} onClose={() => setInserter(null)} />
                  </div>
                ) : i > 0 && (
                  <button type="button" onClick={() => setInserter(i)} className="group flex w-full items-center gap-2 py-0.5 cursor-pointer" aria-label={t('admin.entry.insertHere')}>
                    <span className="h-px flex-1 bg-transparent transition-colors group-hover:bg-amber-500/30" />
                    <Plus className="h-3.5 w-3.5 text-slate-700 transition-colors group-hover:text-amber-300" />
                    <span className="h-px flex-1 bg-transparent transition-colors group-hover:bg-amber-500/30" />
                  </button>
                )}
                <div className={`rounded-2xl border bg-[#0c172c] transition-colors ${incomplete.includes(i) && error === 'incomplete_blocks' ? 'border-rose-500/60' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex items-center gap-2 border-b border-slate-800/80 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-xs text-amber-300" aria-hidden="true">{BLOCK_ICONS[b.type]}</span>
                    <span className="text-xs font-black text-slate-300">{t(`admin.blocks.${b.type}`)}</span>
                    <span className="text-[10px] font-bold text-slate-600">#{i + 1}</span>
                    <span className="ml-auto flex items-center gap-0.5">
                      {[
                        [ArrowUp, () => moveBlock(i, -1), t('admin.actions.moveUp'), i === 0],
                        [ArrowDown, () => moveBlock(i, 1), t('admin.actions.moveDown'), i === draft.blocks.length - 1],
                        [Copy, () => duplicateBlock(i), t('admin.fields.duplicate'), false]
                      ].map(([Icon, fn, label, disabled]) => (
                        <button key={label} type="button" onClick={fn} disabled={disabled} title={label} aria-label={label} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200 disabled:opacity-30 cursor-pointer">
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                      <button type="button" onClick={() => removeBlock(i)} title={t('admin.actions.delete')} aria-label={t('admin.actions.delete')} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                  {b.type !== 'divider' && (
                    <div className="p-3.5">
                      <BlockEditor block={b} onChange={(nb) => setBlock(i, nb)} patch={(fn) => patchBlock(b._k, fn)} editLang={editLang} corpus={corpus} placesByKey={placesByKey} uiLang={uiLang} />
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">{t('admin.entry.addBlock')}</h4>
              <AddBlockMenu onAdd={(type) => addBlock(type)} />
            </div>
          </section>

          {draft.id && (
            <div className="flex justify-end border-t border-slate-800 pt-5">
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> {t('admin.entry.deleteTitle')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </UploadContext.Provider>
  );
}
