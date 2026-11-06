// src/components/bloomshire/market/marketFormat.js
// Formatos compartidos del Radar de Mercado (numeros, horas, "hace X").
import { DAY, HOUR } from './marketModel';

export const localeOf = (lang) => (String(lang || '').startsWith('es') ? 'es-AR' : 'en-US');

export function makeFormat(lang, t) {
  const loc = localeOf(lang);
  const nf = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' });
  const day = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
  const dayTime = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const n = (v) => (v == null || !Number.isFinite(Number(v)) ? '–' : nf.format(Math.round(Number(v))));
  return {
    n,
    n1: (v) => (v == null ? '–' : nf1.format(v)),
    gold: (v) => (v == null ? '–' : `${n(v)}g`),
    time: (at) => time.format(at),
    day: (at) => day.format(at),
    dayTime: (at) => dayTime.format(at),
    chartTime: (at, full) => (full ? dayTime.format(at) : day.format(at)),
    ago: (at, now = Date.now()) => {
      const ms = Math.max(0, now - at);
      if (ms < 60e3) return t('ago.now');
      if (ms < HOUR) return t('ago.min', { n: Math.floor(ms / 60e3) });
      if (ms < DAY) return t('ago.h', { n: Math.floor(ms / HOUR) });
      return t('ago.d', { n: Math.floor(ms / DAY) });
    },
    span: (days) => {
      if (days == null) return '–';
      if (days < 1 / 24) return t('ago.min', { n: Math.max(1, Math.round(days * 1440)) });
      if (days < 1) return t('ago.h', { n: Math.max(1, Math.round(days * 24)) });
      return t('ago.d', { n: Math.round(days) });
    },
    pct: (v) => (v == null ? '–' : `${v > 0 ? '+' : ''}${nf.format(Math.round(v))}%`)
  };
}
