// weather.js -- THE SKY OVER BLOOMSHIRE (2026-09-27): the light of the day, and the rain.
//
// The designer: "a proper day progression cycle: morning, noon, afternoon, night, and then it repeats" and "it
// should rain every two to three days in the Bloomshire calendar".
//
// Both come from the SERVER'S clock (game/clock.js) and nothing else, so every player sees the same sky at the same
// moment -- the same dusk, the same shower -- and the server could ask the same questions (this file is pure).
//
//   * THE LIGHT follows the Bloomshire clock (a day is 8 real hours: rules.js WORLD_TIME): a cool dawn, a warm
//     morning, a clear noon, a golden afternoon, a red-violet evening, a deep blue night. The world is multiplied by
//     the colour of the hour; the street lamps glow from dusk until dawn.
//   * THE RAIN falls on every second or third day (which one is decided by the day's number, the same for everyone):
//     one shower on a rainy day, starting between seven in the morning and four in the afternoon and lasting five to
//     nine Bloomshire hours, softly at first and last; some showers are heavy.

import { WORLD_TIME, SKY, worldMs, isNight } from './rules.js';

const DAY_MS = WORLD_TIME.dayRealHours * 3600e3;
const LIGHT_MS = WORLD_TIME.daylight.realHours * 3600e3;
const DAWN = WORLD_TIME.daylight.from * 60;                              // 05:00, in clock minutes
const LIGHT_MIN = (WORLD_TIME.daylight.to - WORLD_TIME.daylight.from) * 60;
const NIGHT_MIN = 24 * 60 - LIGHT_MIN;

/** A number for a day, in [0, 1): the same on every machine. */
export function dayRandom(n) {
  let h = Math.imul((n | 0) ^ 0x9e3779b9, 2654435761) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489917) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The Bloomshire day (from 0) at server time t, and how far into it: minutes since dawn (0-1440). (The world's
 *  clock: an admin may have set the time of day -- rules.js SKY.shift.) */
export function dayAt(t) {
  const since = worldMs(t) - WORLD_TIME.epoch, day = Math.floor(since / DAY_MS), into = since - day * DAY_MS;
  const fromDawn = into < LIGHT_MS ? (into / LIGHT_MS) * LIGHT_MIN : LIGHT_MIN + ((into - LIGHT_MS) / (DAY_MS - LIGHT_MS)) * NIGHT_MIN;
  return { day, fromDawn, clock: (DAWN + fromDawn) % 1440 };
}

/** The world's own time (ms) at a Bloomshire day's minute since dawn. */
export function worldAt(day, fromDawn) {
  const into = fromDawn < LIGHT_MIN ? (fromDawn / LIGHT_MIN) * LIGHT_MS : LIGHT_MS + ((fromDawn - LIGHT_MIN) / NIGHT_MIN) * (DAY_MS - LIGHT_MS);
  return WORLD_TIME.epoch + day * DAY_MS + into;
}
/** Server time at a Bloomshire day's minute since dawn (the other way round). */
export function timeOf(day, fromDawn) { return worldAt(day, fromDawn) - SKY.shift; }

/**
 * AN ADMIN SETS THE TIME OF DAY: the shift that makes the world's clock read `clock` (minutes, 0-1439) at server
 * time t -- forward from where it is (later today, or tomorrow at that hour), so the calendar never runs back.
 */
export function shiftTo(clock, t) {
  const { day, fromDawn } = dayAt(t);
  const want = ((clock - DAWN) % 1440 + 1440) % 1440;
  return worldAt(want >= fromDawn ? day : day + 1, want) - t;
}

/** An admin's weather at server time t: its rain (0 dry), or null when the sky has its own way. */
export function setWeatherAt(t) {
  for (const w of SKY.windows) if (t >= w.from && t < w.to) return w.rain;
  return null;
}
/** A stretch [a, b) with every admin's weather taken out of it: the pieces left. */
function outsideWindows(a, b) {
  let parts = [[a, b]];
  for (const w of SKY.windows) {
    parts = parts.flatMap(([x, y]) => (w.to <= x || w.from >= y ? [[x, y]] : [[x, Math.min(y, w.from)], [Math.max(x, w.to), y]].filter(([p, q]) => q > p)));
  }
  return parts;
}

/* ---------------------------------------------------------------- the rain */

const rainy = new Map();           // day -> does it rain (worked out forward from the first day, once)
let reach = -1, nextRain = 1;      // the days worked out so far, and the next rainy one after them

/** Does it rain on this Bloomshire day? The first rain is on day 1; after each rainy day the next is 2 or 3 days on. */
export function rainsOn(day) {
  if (day < 0) return false;
  if (day > reach) {
    for (let d = reach + 1; d <= day; d++) {
      const yes = d === nextRain;
      rainy.set(d, yes);
      if (yes) nextRain = d + (dayRandom(d * 3 + 11) < 0.5 ? 2 : 3);
    }
    reach = day;
    if (rainy.size > 4000) for (const k of rainy.keys()) { if (k < day - 100) rainy.delete(k); else break; }
  }
  return rainy.get(day) ?? false;
}

/** A rainy day's shower: { from, to } in minutes since dawn, and whether it is heavy. */
export function showerOf(day) {
  const start = (2 + dayRandom(day * 7 + 1) * 9) * 60;                  // 07:00 - 16:00
  const hours = 5 + dayRandom(day * 7 + 2) * 4;                         // 5 - 9 Bloomshire hours
  return { from: start, to: start + hours * 60, heavy: dayRandom(day * 7 + 3) > 0.62 };
}

/** How hard it is raining at server time t: 0 (dry) to 1. (An admin's weather first.) */
export function rainAt(t) {
  const set = setWeatherAt(t);
  if (set != null) return set;
  const { day, fromDawn } = dayAt(t);
  for (const d of [day, day - 1]) {                                     // (a late shower runs past midnight)
    if (!rainsOn(d)) continue;
    const s = showerOf(d), m = fromDawn + (d === day ? 0 : 1440);
    if (m < s.from || m > s.to) continue;
    const ease = Math.min(1, (m - s.from) / 40, (s.to - m) / 40);       // forty minutes coming on, forty going
    return Math.max(0, ease) * (s.heavy ? 1 : 0.62);
  }
  return 0;
}

/** Rain this light or less is no rain at all (the very first and last moments of a shower). */
export const DRY = 0.02;

/**
 * NOBODY STAYS OUT AT NIGHT OR IN THE RAIN (the designer, 2026-10-01: "when it's raining they will go back to their
 * houses... when it's night they will go back into their houses... the only time they will be showing up is the
 * daytime when there is no rain"): the townsfolk, the schoolchildren and the birds keep in by night and while any
 * rain falls. Why they are in at server time t -- 'night' or 'rain' -- or null on a dry day.
 */
export function keptIn(t) { return isNight(t) ? 'night' : rainAt(t) > DRY ? 'rain' : null; }

/** The first moment from a to b (server time) that rain is falling -- a shower's start, or `a` itself if one is
 *  already under way -- or null if it stays dry all that while. (farm.js: rain waters what grows outdoors) */
export function firstRainBetween(a, b) {
  if (!(b > a)) return null;
  let first = null;
  const seen = (from, to) => { const x = Math.max(a, from); if (Math.min(b, to) > x && (first == null || x < first)) first = x; };
  // an admin's rain (their dry spell keeps the sky's own shower off)
  for (const w of SKY.windows) if (w.rain > 0) seen(w.from, w.to);
  for (let d = Math.max(0, dayAt(a).day - 1), last = dayAt(b).day; d <= last; d++) {
    if (!rainsOn(d)) continue;
    const s = showerOf(d);
    for (const [from, to] of outsideWindows(timeOf(d, s.from), timeOf(d, s.to))) seen(from, to);
  }
  return first;
}

/** The next rain after t: { at, day } (server time), for the forecast. */
export function nextRainAfter(t) {
  const { day } = dayAt(t);
  for (let d = day; d < day + 6; d++) {
    if (!rainsOn(d)) continue;
    const at = timeOf(d, showerOf(d).from);
    if (at > t) return { at, day: d };
  }
  return null;
}

/* ---------------------------------------------------------------- the light */

/** The colour of the hour: [clock minute, r, g, b, strength]. The world is multiplied by it. (At night the colour is only
 *  the night's blue: sky.js lays a shade over it, lifting round the player and the lamps -- 2026-09-29.) */
const LIGHT = [
  [0, 24, 38, 118, 0.52], [270, 24, 38, 118, 0.52],                     // the night (its blue; sky.js's shade darkens it)
  [330, 110, 84, 150, 0.42],                                             // first light
  [390, 255, 168, 112, 0.2],                                             // sunrise
  [480, 255, 226, 186, 0.07],                                            // morning
  [660, 255, 255, 255, 0], [840, 255, 255, 255, 0],                      // noon
  [990, 255, 214, 150, 0.1],                                             // afternoon
  [1110, 255, 150, 92, 0.2],                                             // the golden hour
  [1185, 150, 84, 132, 0.36],                                            // dusk
  [1260, 24, 38, 118, 0.52], [1440, 24, 38, 118, 0.52],                 // night again
];

/** Morning, Noon, Afternoon, Evening or Night, by the clock (minutes). */
export function phaseOf(clock) {
  const h = clock / 60;
  return h >= 5 && h < 11 ? 'Morning' : h < 14 && h >= 11 ? 'Noon' : h >= 14 && h < 18 ? 'Afternoon' : h >= 18 && h < 21 ? 'Evening' : 'Night';
}

/** The light at a clock minute: { r, g, b, a } -- and how dark it is (0 day, 1 deep night), for the lamps. */
export function lightAt(clock) {
  let i = 0;
  while (i < LIGHT.length - 2 && LIGHT[i + 1][0] <= clock) i++;
  const [m0, r0, g0, b0, a0] = LIGHT[i], [m1, r1, g1, b1, a1] = LIGHT[i + 1];
  const k = m1 > m0 ? Math.max(0, Math.min(1, (clock - m0) / (m1 - m0))) : 0;
  const L = (p, q) => p + (q - p) * k;
  const a = L(a0, a1);
  const dark = clock < 330 || clock >= 1260 ? 1 : clock < 420 ? (420 - clock) / 90 : clock > 1140 ? (clock - 1140) / 120 : 0;
  return { r: L(r0, r1), g: L(g0, g1), b: L(b0, b1), a, dark: Math.max(0, Math.min(1, dark)) };
}

/** Everything the sky is at server time t. */
export function skyAt(t) {
  const { day, clock } = dayAt(t);
  return { day, clock, phase: phaseOf(clock), light: lightAt(clock), rain: rainAt(t) };
}
