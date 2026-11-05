// src/components/bloomshire/logbook/SectionEditorModal.jsx
// Crear / editar / borrar una seccion del arbol (profundidad libre).
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { Modal, Field, Button, ErrorNote, ConfirmDeleteModal, StatusToggle, inputCls, useAdminErrorText } from './adminUi';
import { slugify, validateSectionInput, pickLang } from './logbookModel';

const ICONS = ['📜', '🗺️', '⚔️', '🐉', '🕷️', '🍲', '🌾', '🎣', '⛏️', '💎', '🧪', '🏰', '🌲', '🌊', '❄️', '🌙', '🎁', '⭐'];

/** Lista plana con sangria para el selector "Dentro de", sin la propia seccion ni sus descendientes. */
function flattenForSelect(tree, excludeId, lang) {
  const out = [];
  const walk = (nodes, depth) => {
    for (const n of nodes) {
      if (n.id === excludeId) continue;
      out.push({ id: n.id, label: `${' '.repeat(depth)}${n.icon ? `${n.icon} ` : ''}${pickLang(n, 'title', lang)}` });
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

export default function SectionEditorModal({ tree, lang, initial, onSave, onDelete, onClose }) {
  const { t } = useTranslation('logbook');
  const errorText = useAdminErrorText();
  const isNew = !initial.id;
  const [form, setForm] = useState(() => ({
    id: initial.id || null,
    parent_id: initial.parent_id || null,
    title_en: initial.title_en || '',
    title_es: initial.title_es || '',
    description_en: initial.description_en || '',
    description_es: initial.description_es || '',
    icon: initial.icon || '📜',
    slug: initial.slug || '',
    sort: Number.isInteger(initial.sort) ? initial.sort : 0,
    status: initial.status || 'published'
  }));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parents = useMemo(() => flattenForSelect(tree, form.id, lang), [tree, form.id, lang]);

  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === 'title_en' && !slugTouched) next.slug = slugify(v);
    return next;
  });

  const save = async () => {
    const check = validateSectionInput(form);
    if (!check.ok) { setError(check.error); return; }
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...check.value, id: form.id || undefined });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  if (confirmDelete) {
    return (
      <ConfirmDeleteModal
        title={t('admin.section.deleteTitle')}
        body={t('admin.section.deleteBody', { slug: form.slug })}
        slug={form.slug}
        onClose={() => setConfirmDelete(false)}
        onConfirm={(typed) => onDelete(form.id, typed)}
      />
    );
  }

  return (
    <Modal
      title={isNew ? t('admin.section.titleNew') : t('admin.section.titleEdit')}
      onClose={onClose}
      footer={(
        <>
          {!isNew && (
            <Button variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> {t('admin.actions.delete')}
            </Button>
          )}
          <Button onClick={onClose}>{t('admin.actions.cancel')}</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {busy ? t('admin.actions.saving') : t('admin.actions.save')}
          </Button>
        </>
      )}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`${t('admin.section.title')} · EN`}>
          <input className={inputCls} value={form.title_en} onChange={(e) => set('title_en', e.target.value)} maxLength={200} autoFocus />
        </Field>
        <Field label={`${t('admin.section.title')} · ES`}>
          <input className={inputCls} value={form.title_es} onChange={(e) => set('title_es', e.target.value)} maxLength={200} placeholder={form.title_en} />
        </Field>
      </div>

      <Field label={t('admin.section.icon')}>
        <div className="flex flex-wrap items-center gap-1.5">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => set('icon', ic)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all cursor-pointer ${form.icon === ic ? 'bg-amber-500/25 ring-2 ring-amber-400/70' : 'bg-slate-800/60 hover:bg-slate-700/60'}`}
            >
              {ic}
            </button>
          ))}
          <input className={`${inputCls} !w-16 text-center`} value={form.icon} onChange={(e) => set('icon', e.target.value.slice(0, 8))} aria-label={t('admin.section.icon')} />
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('admin.section.parent')}>
          <select className={inputCls} value={form.parent_id || ''} onChange={(e) => set('parent_id', e.target.value || null)}>
            <option value="">{t('admin.section.root')}</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label={t('admin.status.label')}>
          <div><StatusToggle value={form.status} onChange={(v) => set('status', v)} /></div>
        </Field>
      </div>

      <Field label={t('admin.section.slug')} hint={t('admin.section.slugHint')}>
        <input
          className={`${inputCls} font-mono`}
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
          maxLength={80}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={`${t('admin.section.description')} · EN`}>
          <textarea className={`${inputCls} min-h-[72px]`} value={form.description_en} onChange={(e) => set('description_en', e.target.value)} maxLength={2000} />
        </Field>
        <Field label={`${t('admin.section.description')} · ES`}>
          <textarea className={`${inputCls} min-h-[72px]`} value={form.description_es} onChange={(e) => set('description_es', e.target.value)} maxLength={2000} placeholder={form.description_en} />
        </Field>
      </div>

      <ErrorNote>{error ? errorText(error) : null}</ErrorNote>
    </Modal>
  );
}
