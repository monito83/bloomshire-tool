// src/components/bloomshire/logbook/LogbookBlocks.jsx
// Renderizado de los bloques de una entrada. Todo pasa por sanitizeBlock antes
// de llegar aca; ademas solo se muestran imagenes del bucket y videos de YouTube.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CirclePlay, Info, Lightbulb, TriangleAlert, Download, FileText, MapPin, Maximize2 } from 'lucide-react';
import LogbookMarkdown, { MarkdownTable, parseMarkdownTable } from './LogbookMarkdown';
import {
  pickLang,
  mediaUrl,
  youTubeEmbedUrl,
  youTubeThumbUrl,
  placeLabel
} from './logbookModel';

const formatBytes = (n, lang) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  const fmt = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  if (n < 1024 * 1024) return `${fmt.format(n / 1024)} KB`;
  return `${fmt.format(n / (1024 * 1024))} MB`;
};

function YouTubeBlock({ block, lang }) {
  const { t } = useTranslation('logbook');
  const [playing, setPlaying] = useState(false);
  const title = pickLang(block, 'title', lang);
  const thumb = youTubeThumbUrl(block.id);
  const src = youTubeEmbedUrl(block.id, block.start);
  return (
    <figure className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-black shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
        {playing && src ? (
          <iframe
            src={src}
            title={title || t('blocks.playVideo')}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center cursor-pointer"
            aria-label={t('blocks.playVideo')}
          >
            {thumb && (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:opacity-90 group-hover:scale-[1.03]"
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
            <span className="relative flex flex-col items-center gap-2">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/90 shadow-[0_0_40px_rgba(225,29,72,0.55)] ring-4 ring-white/10 transition-transform duration-300 group-hover:scale-110">
                <CirclePlay className="h-9 w-9 text-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/90">{t('blocks.playVideo')}</span>
            </span>
            {title && (
              <span className="absolute bottom-3 left-4 right-4 text-left text-sm font-bold text-white drop-shadow line-clamp-2">{title}</span>
            )}
          </button>
        )}
      </div>
      {!playing && <figcaption className="text-[11px] text-slate-500">{t('blocks.videoPrivacy')}</figcaption>}
    </figure>
  );
}

function ImageFigure({ image, lang, mediaBase, onOpen, compact = false }) {
  const { t } = useTranslation('logbook');
  const [failed, setFailed] = useState(false);
  const url = mediaUrl(mediaBase, image.path);
  const alt = pickLang(image, 'alt', lang);
  const caption = pickLang(image, 'caption', lang);
  if (!url || failed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-xs text-slate-500">
        {t('blocks.imageUnavailable')}
      </div>
    );
  }
  return (
    <figure className="space-y-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="group relative block w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 cursor-zoom-in"
        aria-label={alt || t('blocks.openImage')}
      >
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={image.width || undefined}
          height={image.height || undefined}
          onError={() => setFailed(true)}
          className={`w-full ${compact ? 'aspect-[4/3] object-cover' : 'max-h-[560px] object-contain'} transition-transform duration-500 group-hover:scale-[1.02]`}
          style={{ imageRendering: 'auto' }}
        />
        <span className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>
      {caption && !compact && <figcaption className="text-xs italic text-slate-400">{caption}</figcaption>}
    </figure>
  );
}

const CALLOUT_STYLE = {
  note: { icon: Info, ring: 'border-sky-500/40 bg-sky-500/[0.07]', text: 'text-sky-300', glow: 'from-sky-500/20' },
  tip: { icon: Lightbulb, ring: 'border-emerald-500/40 bg-emerald-500/[0.07]', text: 'text-emerald-300', glow: 'from-emerald-500/20' },
  warning: { icon: TriangleAlert, ring: 'border-amber-500/50 bg-amber-500/[0.08]', text: 'text-amber-300', glow: 'from-amber-500/25' }
};

export function PlaceChip({ placeKey, place, lang, onLocate, size = 'md' }) {
  const { t } = useTranslation('logbook');
  const label = place ? placeLabel(place, lang) : t('places.unknown');
  const canLocate = Boolean(place && place.target && onLocate);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <button
      type="button"
      disabled={!canLocate}
      onClick={() => canLocate && onLocate(place.target)}
      title={canLocate ? t('places.viewInAtlas') : t('places.noCoords')}
      data-place={placeKey}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold transition-all ${pad} ${
        canLocate
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20 hover:-translate-y-px cursor-pointer'
          : 'border-slate-700 bg-slate-800/60 text-slate-400 cursor-default'
      }`}
    >
      <span aria-hidden="true">{place ? place.icon : '📍'}</span>
      <span>{label}</span>
      {canLocate && <MapPin className="h-3 w-3 opacity-70" />}
    </button>
  );
}

export default function LogbookBlocks({ blocks, lang, mediaBase, placesByKey, onLocate, onInternalLink, onOpenImages }) {
  const { t } = useTranslation('logbook');
  return (
    <div className="space-y-6">
      {(blocks || []).map((b, idx) => {
        const key = `b-${idx}`;
        switch (b.type) {
          case 'text':
            return <LogbookMarkdown key={key} md={pickLang(b, 'md', lang)} onInternalLink={onInternalLink} />;

          case 'heading': {
            const text = pickLang(b, 'text', lang);
            return b.level === 3
              ? <h3 key={key} className="text-lg font-black text-amber-100 tracking-tight">{text}</h3>
              : (
                <h2 key={key} className="flex items-center gap-3 pt-2 text-2xl font-black tracking-tight text-amber-50">
                  <span className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-300 to-amber-600" />
                  {text}
                </h2>
              );
          }

          case 'image':
            return (
              <ImageFigure
                key={key}
                image={b}
                lang={lang}
                mediaBase={mediaBase}
                onOpen={() => onOpenImages && onOpenImages([b], 0)}
              />
            );

          case 'gallery': {
            const caption = pickLang(b, 'caption', lang);
            const cols = b.images.length === 1 ? 'grid-cols-1' : b.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';
            return (
              <figure key={key} className="space-y-2">
                <div className={`grid gap-2.5 ${cols}`}>
                  {b.images.map((img, i) => (
                    <div key={`${key}-${i}`} className="relative">
                      <ImageFigure image={img} lang={lang} mediaBase={mediaBase} compact onOpen={() => onOpenImages && onOpenImages(b.images, i)} />
                      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-black text-amber-200">#{i + 1}</span>
                    </div>
                  ))}
                </div>
                {caption && <figcaption className="text-xs italic text-slate-400">{caption}</figcaption>}
              </figure>
            );
          }

          case 'youtube':
            return <YouTubeBlock key={key} block={b} lang={lang} />;

          case 'table':
            return <MarkdownTable key={key} table={parseMarkdownTable(pickLang(b, 'md', lang))} onInternalLink={onInternalLink} keyPrefix={key} />;

          case 'callout': {
            const s = CALLOUT_STYLE[b.variant] || CALLOUT_STYLE.note;
            const Icon = s.icon;
            const title = pickLang(b, 'title', lang) || t(`blocks.${b.variant}`);
            return (
              <aside key={key} className={`relative overflow-hidden rounded-2xl border ${s.ring} p-4 pl-5`}>
                <span className={`pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${s.glow} to-transparent blur-2xl`} />
                <div className={`relative mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest ${s.text}`}>
                  <Icon className="h-4 w-4" />
                  <span>{title}</span>
                </div>
                <LogbookMarkdown md={pickLang(b, 'md', lang)} onInternalLink={onInternalLink} className="relative text-sm" />
              </aside>
            );
          }

          case 'list': {
            const items = pickLang(b, 'items', lang) || [];
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
              <Tag key={key} className={`${b.ordered ? 'list-decimal' : 'list-disc'} space-y-1.5 pl-6 text-[15px] text-slate-300 marker:text-amber-400/80`}>
                {items.map((it, i) => (
                  <li key={i} className="pl-1"><LogbookMarkdown md={it} onInternalLink={onInternalLink} className="!space-y-1" /></li>
                ))}
              </Tag>
            );
          }

          case 'divider':
            return (
              <div key={key} className="flex items-center gap-3 py-2" aria-hidden="true">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                <span className="text-amber-500/60">✦</span>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              </div>
            );

          case 'file': {
            const url = mediaUrl(mediaBase, b.path);
            if (!url) return null;
            const label = pickLang(b, 'label', lang) || b.path.split('/').pop();
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="group flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-[#0d1a30] p-4 transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-[0_10px_30px_-15px_rgba(245,158,11,0.4)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-100">{label}</span>
                  <span className="text-[11px] text-slate-500">{t('blocks.pdf')}{b.bytes ? ` · ${formatBytes(b.bytes, lang)}` : ''}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:text-amber-200">
                  <Download className="h-4 w-4" />
                  {t('blocks.download')}
                </span>
              </a>
            );
          }

          case 'place': {
            const place = placesByKey ? placesByKey.get(b.key) : null;
            const note = pickLang(b, 'note', lang);
            return (
              <div key={key} className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3.5">
                <PlaceChip placeKey={b.key} place={place} lang={lang} onLocate={onLocate} />
                {place && place.kind && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">{t(`places.kind.${place.kind}`)}</span>}
                {note && <div className="basis-full"><LogbookMarkdown md={note} onInternalLink={onInternalLink} className="text-sm" /></div>}
              </div>
            );
          }

          case 'statcards':
            return (
              <div key={key} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {b.cards.map((c, i) => {
                  const label = pickLang(c, 'label', lang);
                  const hint = pickLang(c, 'hint', lang);
                  return (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-[#13213b] to-[#0b1426] p-4 transition-all hover:-translate-y-0.5 hover:border-amber-500/40"
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10 blur-xl transition-opacity group-hover:opacity-100 opacity-60" />
                      {c.icon && <div className="mb-1 text-xl" aria-hidden="true">{c.icon}</div>}
                      <div className="text-2xl font-black tracking-tight text-amber-200 tabular-nums">{c.value}</div>
                      {label && <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>}
                      {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
                    </div>
                  );
                })}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
