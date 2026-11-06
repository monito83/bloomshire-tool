// src/components/bloomshire/market/MarketCharts.jsx
// Graficos SVG livianos del Radar de Mercado (sin librerias): sparkline, precio por venta, barras por dia y oferta.
// Una sola serie por grafico (sin leyenda), grilla tenue, tooltip al pasar el mouse.
import React, { useMemo, useState } from 'react';

const C = {
  line: '#34d399',      // emerald-400
  dot: '#6ee7b7',       // emerald-300
  bar: '#10b981',       // emerald-500
  barHover: '#6ee7b7',
  supply: '#38bdf8',    // sky-400
  ref: '#94a3b8',       // slate-400
  grid: 'rgba(148,163,184,0.12)',
  axis: '#64748b',
  ring: '#0b1324'
};

const fmt = (n) => (n == null ? '–' : Math.round(n).toLocaleString());

function niceStep(span, count = 4) {
  const raw = span / count;
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** Linea minima para tablas (sin ejes). values: numeros o null. */
export function Sparkline({ values = [], width = 96, height = 26, color = C.line, title = '' }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v != null);
  if (pts.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line x1="2" x2={width - 2} y1={height / 2} y2={height / 2} stroke={C.grid} strokeDasharray="3 3" />
      </svg>
    );
  }
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const x = (i) => 2 + (i / Math.max(1, values.length - 1)) * (width - 4);
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={title}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx={x(last.i)} cy={y(last.v)} r="2.4" fill={color} stroke={C.ring} strokeWidth="1" />
    </svg>
  );
}

function Tooltip({ x, y, w, children }) {
  const left = Math.min(Math.max(x, 70), w - 70);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-700 bg-[#0a1122]/95 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-xl whitespace-nowrap"
      style={{ left: `${(left / w) * 100}%`, top: y }}
    >
      {children}
    </div>
  );
}

const W = 640;

/**
 * Precio de cada venta (puntos) + mediana diaria (linea) + puesto mas barato (punteada).
 * sales: [{at, price, n}] en Oro.  series: [{at, median}] por dia.
 */
export function PriceChart({ sales = [], series = [], cheapest = null, from, to, formatTime, labels = {} }) {
  const H = 210, padL = 46, padR = 12, padT = 14, padB = 24;
  const [hover, setHover] = useState(null);
  const prices = [...sales.map((s) => s.price), ...series.map((b) => b.median).filter((v) => v != null)];
  if (cheapest) prices.push(cheapest);
  const dataLo = Math.min(...prices), dataHi = Math.max(...prices);
  const step = niceStep(Math.max(1, dataHi - dataLo) * 1.3);
  const lo = Math.max(0, Math.floor((dataLo - (dataHi - dataLo) * 0.15) / step) * step);
  const hi = Math.max(lo + step, Math.ceil((dataHi + (dataHi - dataLo) * 0.15 + 0.0001) / step) * step);
  const x = (t) => padL + ((t - from) / Math.max(1, to - from)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const med = series.filter((b) => b.median != null);
  const half = series[1] ? (series[1].at - series[0].at) / 2 : 0;
  const medPath = med.map((b, k) => `${k ? 'L' : 'M'}${x(Math.min(to, b.at + half)).toFixed(1)},${y(b.median).toFixed(1)}`).join(' ');
  const days = series.length > 1 ? series : [];
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = null;
    sales.forEach((s) => {
      const d = Math.abs(x(s.at) - px);
      if (!best || d < best.d) best = { d, s };
    });
    setHover(best && best.d < 24 ? best.s : null);
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={labels.title || ''} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.grid} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill={C.axis}>{fmt(v)}</text>
          </g>
        ))}
        {days.map((b, i) => (i % labelEvery === 0 ? (
          <text key={b.at} x={x(b.at)} y={H - 6} fontSize="10" fill={C.axis}>{formatTime ? formatTime(b.at) : ''}</text>
        ) : null))}
        {cheapest ? (
          <g>
            <line x1={padL} x2={W - padR} y1={y(cheapest)} y2={y(cheapest)} stroke={C.ref} strokeDasharray="5 4" strokeWidth="1.2" />
            <text x={W - padR} y={y(cheapest) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill={C.ref} stroke={C.ring} strokeWidth="3" paintOrder="stroke">{labels.cheapest} {fmt(cheapest)}</text>
          </g>
        ) : null}
        {medPath ? <path d={medPath} fill="none" stroke={C.line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {sales.map((s, i) => (
          <circle key={i} cx={x(s.at)} cy={y(s.price)} r={Math.min(5, 2.5 + Math.log2(s.n || 1) * 0.8)} fill={C.dot} fillOpacity={hover === s ? 1 : 0.45} stroke={C.ring} strokeWidth="1.5" />
        ))}
        {hover ? <line x1={x(hover.at)} x2={x(hover.at)} y1={padT} y2={H - padB} stroke={C.ref} strokeOpacity="0.35" /> : null}
      </svg>
      {hover ? (
        <Tooltip x={x(hover.at)} y={`${(y(hover.price) / H) * 100}%`} w={W}>
          <div className="font-black text-emerald-300">{fmt(hover.price)} {labels.gold}</div>
          <div className="text-slate-400">{labels.unit ? labels.unit(hover.n) : hover.n} · {formatTime ? formatTime(hover.at, true) : ''}</div>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** Barras por periodo (unidades vendidas). buckets: [{at, units, gold}] */
export function VolumeBars({ buckets = [], formatTime, labels = {}, color = C.bar, width = 640 }) {
  const W = width;
  const H = 170, padL = 36, padR = 8, padT = 10, padB = 22;
  const [hover, setHover] = useState(null);
  const maxV = niceMax(Math.max(1, ...buckets.map((b) => b.units)));
  const n = buckets.length || 1;
  const slot = (W - padL - padR) / n;
  const bw = Math.max(2, slot - 2);
  const y = (v) => padT + (1 - v / maxV) * (H - padT - padB);
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={labels.title || ''} className="block" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(f * maxV)} y2={y(f * maxV)} stroke={C.grid} />
            <text x={padL - 6} y={y(f * maxV) + 3} textAnchor="end" fontSize="10" fill={C.axis}>{fmt(f * maxV)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const bx = padL + i * slot + 1;
          const h = (H - padB) - y(b.units);
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={b.at} onMouseEnter={() => setHover(i)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
              {b.units > 0 ? (
                <path
                  d={`M${bx},${H - padB} L${bx},${y(b.units) + r} Q${bx},${y(b.units)} ${bx + r},${y(b.units)} L${bx + bw - r},${y(b.units)} Q${bx + bw},${y(b.units)} ${bx + bw},${y(b.units) + r} L${bx + bw},${H - padB} Z`}
                  fill={hover === i ? C.barHover : color}
                  opacity={hover == null || hover === i ? 0.95 : 0.6}
                />
              ) : null}
              {i % labelEvery === 0 ? <text x={bx} y={H - 6} fontSize="10" fill={C.axis}>{formatTime ? formatTime(b.at) : ''}</text> : null}
            </g>
          );
        })}
      </svg>
      {hover != null && buckets[hover] ? (
        <Tooltip x={padL + hover * slot + slot / 2} y={`${(y(buckets[hover].units) / H) * 100}%`} w={W}>
          <div className="font-black text-emerald-300">{labels.unit ? labels.unit(buckets[hover].units) : buckets[hover].units}</div>
          <div className="text-slate-400">{fmt(buckets[hover].gold)} {labels.gold} · {formatTime ? formatTime(buckets[hover].at) : ''}</div>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** Oferta (unidades a la venta) en cada foto guardada. points: [{at, u}] */
export function SupplyLine({ points = [], formatTime, labels = {}, width = 640 }) {
  const W = width;
  const H = 170, padL = 36, padR = 8, padT = 10, padB = 22;
  const [hover, setHover] = useState(null);
  const data = useMemo(() => points.filter((p) => p.u != null), [points]);
  if (data.length < 2) return <p className="text-[11px] text-slate-500 py-6 text-center">{labels.empty}</p>;
  const from = data[0].at, to = data[data.length - 1].at;
  const maxV = niceMax(Math.max(1, ...data.map((p) => p.u)));
  const x = (t) => padL + ((t - from) / Math.max(1, to - from)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / maxV) * (H - padT - padB);
  const d = data.map((p, k) => `${k ? 'L' : 'M'}${x(p.at).toFixed(1)},${y(p.u).toFixed(1)}`).join(' ');
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    data.forEach((p, i) => { if (Math.abs(x(p.at) - px) < Math.abs(x(data[best].at) - px)) best = i; });
    setHover(best);
  };
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={labels.title || ''} className="block" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(f * maxV)} y2={y(f * maxV)} stroke={C.grid} />
            <text x={padL - 6} y={y(f * maxV) + 3} textAnchor="end" fontSize="10" fill={C.axis}>{fmt(f * maxV)}</text>
          </g>
        ))}
        <path d={`${d} L${x(to)},${H - padB} L${x(from)},${H - padB} Z`} fill={C.supply} opacity="0.08" />
        <path d={d} fill="none" stroke={C.supply} strokeWidth="2" strokeLinejoin="round" />
        <text x={padL} y={H - 6} fontSize="10" fill={C.axis}>{formatTime ? formatTime(from) : ''}</text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="10" fill={C.axis}>{formatTime ? formatTime(to) : ''}</text>
        {hover != null ? <circle cx={x(data[hover].at)} cy={y(data[hover].u)} r="4" fill={C.supply} stroke={C.ring} strokeWidth="2" /> : null}
      </svg>
      {hover != null ? (
        <Tooltip x={x(data[hover].at)} y={`${(y(data[hover].u) / H) * 100}%`} w={W}>
          <div className="font-black text-sky-300">{labels.unit ? labels.unit(data[hover].u) : data[hover].u}</div>
          <div className="text-slate-400">{formatTime ? formatTime(data[hover].at, true) : ''}</div>
        </Tooltip>
      ) : null}
    </div>
  );
}
