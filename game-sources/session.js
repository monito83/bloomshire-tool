// session.js -- THE GAME TALKING TO THE SERVER THAT OWNS IT (2026-09-25).
//
// The player's save comes from the server (server/world2.js) when the game opens and the rules read and
// write it (rules.js useSaveDoc). Then:
//   * act(name, args): an action -- a hoe swing, a seed, a chest -- is run HERE at once by the shared rules
//     (game/commands.js), so the game answers without waiting, and queued for the server, which runs it
//     again against its own copy. The queue goes in small batches, in order, one batch in flight at a time.
//     If the server refuses one, its save replaces this one (onResync): the server's word is the game.
//   * ask(name, args): an economic action -- buying, selling, the bank, the Exchange -- or a Founding Farmers
//     clue or puzzle (commands.js ASKED: its answer needs the server's salt) -- is the server's
//     alone; it waits for the queue, carries a request key (so a resent one is never done twice) and the
//     answer brings the server's save back with it.
// Without a server (the map editor's Play) a LocalSession runs the actions here only, and asks are refused.
//
// NOTHING THE PLAYER DID IS LOST ON THE WAY (2026-10-02, "items vanish from the hotbar"). Whenever a save comes from
// the server -- an ask's answer, a refusal, a gift over the live socket -- it says which of this page's commands it
// already holds (`applied`: their sequence numbers are this page's own, `sid`); the ones it does not hold yet are
// RE-RUN on it here (a rebase), so what they did stays on the screen and the server, running them in turn, agrees.
// Asks, trades and crypto steps go one at a time and hold the queue while they are out (an answer never overtakes
// actions it has not seen); a command carries the moment it was played (`at`), so the server times a cast and its
// reel, a sowing and its harvest, as they were played however late they arrive; the server's "slow down" keeps the
// queue for a moment later, and a lost answer is asked again, its save with it.

import { serverURL } from '../util.js';
import { run, runEconomy, ASKED } from './commands.js';

const BATCH = 40;
const RETRY_MS = [500, 1000, 2000, 4000, 8000];
const SLOW_MS = 1200;
const RIDE_OUT_MS = 60e3;                        // an ask waits this long for a server that is starting again (a deploy)                            // the server asked for a pause: the queue waits this long, then goes

const key = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);

// THE SERVER'S BUILD (2026-10-04): every answer names the game the server runs (server/newgame.js). The first one heard
// is this page's; another one later means the game was updated under it, and build.onNew is told once (gamemain.js
// loads the page again when nothing is on the way) -- an old page plays by old rules the server no longer keeps.
// (2026-10-07: the build is first the one this page's code came with -- its own address names it, /play/v/<build>/js/...
//  (server/newgame.js pageOf). A page whose browser kept old code through every refresh took the first answer's build
//  for its own, and so never knew it was old. A page loaded the old way, or the editor's, names none until it hears.)
const OWN = /\/play\/v\/([A-Za-z0-9_-]{1,64})\//.exec(import.meta.url)?.[1] ?? null;
// (QUIET UPDATES, 2026-10-11: the page's RULES -- the part of the game the server runs too, server/newgame.js -- are
//  named in the page itself; an update that leaves them as they were changes only the look, and the page goes on
//  playing until a quiet moment. `rules` in onNew: did they change? Told again should a later update change them.)
const OWN_RULES = (typeof document !== 'undefined' && document.querySelector?.('meta[name="bloomshire-rules"]')?.content) || null;
export const build = { now: OWN, rules: OWN_RULES, onNew: null, told: false, toldRules: false };
function heard(r) {
  const b = r?.headers?.get?.('X-Bloomshire-Build'), R = r?.headers?.get?.('X-Bloomshire-Rules') || null;
  if (!b) return;
  if (!build.now) { build.now = b; build.rules ??= R; return; }
  if (b === build.now) return;
  const rules = !(R && build.rules && R === build.rules);
  if (build.told && (!rules || build.toldRules)) return;
  build.told = true; if (rules) build.toldRules = true;
  try { build.onNew?.(b, { rules }); } catch { /* the game goes on */ }
}

async function post(path, body) {
  // (the build this page was opened on goes with it: a page naming none is from before, and is sent to load again)
  const r = await fetch(serverURL(path), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Bloomshire-Build': build.now ?? 'new', ...(build.rules ? { 'X-Bloomshire-Rules': build.rules } : {}) }, body: JSON.stringify(body) });
  heard(r);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error ?? `the server said ${r.status}`); e.status = r.status; throw e; }
  return data;
}

export class Session {
  /** Open the player's save on the server. Throws with .status 401 when the sign-in has ended. */
  static async open() {
    const r = await fetch(serverURL('api/state'), { credentials: 'same-origin', cache: 'no-store' });
    heard(r);
    if (!r.ok) { const e = new Error(`the game's save could not be had (${r.status})`); e.status = r.status; throw e; }
    const data = await r.json();
    return Object.assign(new Session(data.save, data.start), { questConfig: data.quests ?? null, sky: data.sky ?? null });
  }

  constructor(save, start) {
    this.save = save; this.start = start;
    this.sid = key();                           // this page's own name for its commands (two windows never share a count)
    this.seq = 0; this.acked = 0;               // the last command made here; the last the server has answered for
    this.queue = []; this.inflight = null; this.sending = []; this.failures = 0;
    this.lane = Promise.resolve();              // asks, trades and crypto steps: one at a time
    this.held = false;                          // ...and while one is out, no batch goes
    this.slowUntil = 0;                         // the server asked for a pause
    this.wantSave = false;                      // the next batch asks for the server's save (a re-run left a doubt)
    this.ctxOf = null;                          // () => the game's rules context: to re-run the queue on a save that came
    this.clock = () => Date.now();              // the server-synced clock (gamemain.js: clock.js gameNow) -- asks are stamped by it
    this.onResync = () => {};                   // (save, reason): the game reloads what it shows from the save
    this.onTrouble = () => {};                  // (text | null): a line for the player while the server is away
    this.onDrop = () => {};                     // ({ shards, why, item }): a lucky Shard came with an action (world2.js #luck)
  }
  get online() { return true; }
  /** Anything not yet with the server (Save & quit waits for it; a page closed with it asks first). */
  get unsent() { return !this.gone && (this.queue.length > 0 || !!this.inflight || this.held); }

  /** Run an action here, and send it to the server. The result is the local one (the server's comes later).
   *  A REFUSED ACTION CHANGES NOTHING HERE EITHER (2026-10-02, "items vanish from the hotbar"): the server puts its
   *  save back when a command says no (world2.js #run); so does this one, and the game reloads what it shows from it --
   *  else what a refused command had already taken (a dish's ingredients, with no room for the dish) was gone from the
   *  screen, and never sent, until the next save came from the server. */
  act(name, args, ctx) {
    const before = this.#snap();
    const r = run(name, args, ctx);
    // (what it gave here -- a fish, an ore, a crop -- goes with it: the server answers with its save if it gave
    //  something else, and the page corrects itself at once; 2026-10-02, "the fish went from 8 to 9 then back to 8")
    if (r.ok) { this.queue.push({ seq: ++this.seq, name, args, at: ctx.now, ...('got' in r ? { saw: r.got ?? null } : {}) }); this.#flush(); }
    else if (this.#putBack(before)) {
      console.warn(`[session] a refused '${name}' had changed the save: put back`);
      this.onResync(this.save, null);
    }
    return r;
  }

  /** Wait for everything queued to reach the server (and any ask, trade or crypto step out now to come back). */
  async settle() { await this.lane; await this.#drain(); }
  async #drain() {
    while (this.queue.length || this.inflight || this.wantSave) {
      if (this.inflight) await this.inflight.catch(() => {});
      else { this.#flush(); if (!this.inflight) await new Promise((ok) => setTimeout(ok, Math.max(50, this.slowUntil - Date.now()))); }
    }
  }
  /** One at a time, after the queue, holding it while out: an ask, a trade step, a crypto step. */
  #exclusive(fn) {
    const go = this.lane.then(async () => {
      await this.#drain();
      this.held = true;
      try { return await fn(); } finally { this.held = false; this.#flush(); }
    });
    this.lane = go.catch(() => {});
    return go;
  }

  /** An economic action: the server's answer, after the queue. The save comes back with it. */
  ask(name, args) {
    return this.#exclusive(async () => {
      const c = { seq: ++this.seq, name, args, key: key(), at: this.clock() };
      let started = null;
      for (let attempt = 0, slow = 0; ;) {
        try {
          const out = await post('api/cmd', { batch: [c], sid: this.sid });
          if (started) { started = null; this.onTrouble(null); }
          // (the server asked for a pause before it got to this one: the same again, a moment later)
          if (out.slow && !out.results?.length && slow++ < 8) { await new Promise((ok) => setTimeout(ok, SLOW_MS)); continue; }
          const r = out.results?.[0] ?? { ok: false, reason: 'No answer' };
          if (out.results?.length) this.acked = Math.max(this.acked, c.seq);
          if (out.save) this.#adopt(out.save, out.applied ?? this.acked, r.ok === false ? r.reason : null, r.ok !== false);
          return r;
        } catch (e) {
          if (e.status === 401) { this.gone = true; location.reload(); return { ok: false, reason: 'Signed out' }; }
          // (the server away -- no answer, or the gateway's 502/503 while it starts again after an update: quiet updates,
          //  2026-10-11 -- is waited for up to RIDE_OUT_MS; any other trouble is tried three times)
          const away = !e.status || e.status >= 500;
          if (away ? Date.now() - (started ??= Date.now()) > RIDE_OUT_MS : attempt >= 3) { this.onTrouble(null); return { ok: false, reason: 'The server could not be reached. Please try again.' }; }
          if (away) this.onTrouble('Reconnecting to Bloomshire...');
          await new Promise((ok) => setTimeout(ok, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)]));    // (the same key: never done twice)
        }
      }
    });
  }

  /** The Exchange's board: everyone's open offers, and your own of any standing. */
  async offers() {
    const r = await fetch(serverURL('api/offers'), { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    return r?.ok ? r.json() : { open: [], mine: [] };
  }

  /** FACE TO FACE (server/trade2.js): one step of a trade -- ask, answer, offer, confirm, cancel, state. What was
   *  queued reaches the server first (an offer is checked against what you carry there); a confirm carries a request
   *  key, and the trade that settles brings the save back with it. */
  trade(op, args = {}) {
    return this.#exclusive(async () => {
      try {
        const out = await post('api/trade', { op, ...args, ...(op === 'confirm' ? { key: key() } : {}) });
        if (out.save) this.#adopt(out.save, this.acked, null, true);    // (everything sent was answered first: #drain)
        return out;
      } catch (e) {
        if (e.status === 401) { this.gone = true; location.reload(); return { ok: false, reason: 'Signed out' }; }
        return { ok: false, reason: 'The server could not be reached. Please try again.' };
      }
    });
  }

  /** TRADING FOR CRYPTO (server/crypto.js): 'info' (is it open, on what chain), 'quote' (a ticket for a listing, which
   *  holds it for you), 'claim' (a payment sent: the goods, once the chain has it -- the save comes back with them). */
  crypto(op, body = {}) {
    if (op === 'info') {
      return fetch(serverURL('api/crypto'), { credentials: 'same-origin', cache: 'no-store' }).then((r) => (r.ok ? r.json() : { ok: false, open: false }))
        .catch(() => ({ ok: false, open: false, reason: 'The server could not be reached. Please try again.' }));
    }
    return this.#exclusive(async () => {
      try {
        const out = await post(`api/crypto/${op}`, body);
        if (out.save) this.#adopt(out.save, this.acked, null, true);
        return out;
      } catch (e) {
        if (e.status === 401) { this.gone = true; location.reload(); return { ok: false, reason: 'Signed out' }; }
        return { ok: false, pending: op === 'claim', reason: 'The server could not be reached. Please try again.' };
      }
    });
  }

  #flush() {
    if (this.inflight || this.held || (!this.queue.length && !this.wantSave)) return;
    if (Date.now() < this.slowUntil) { clearTimeout(this.slowT); this.slowT = setTimeout(() => this.#flush(), this.slowUntil - Date.now()); return; }
    const batch = this.queue.slice(0, BATCH), sync = this.wantSave;
    this.wantSave = false; this.sending = batch;
    this.inflight = post('api/cmd', { batch, sid: this.sid, ...(sync ? { sync: true } : {}) }).then((out) => {
      this.failures = 0; this.onTrouble(null);
      const results = out.results ?? [];
      // what the server answered for: the batch up to its last answer (a refusal stops it; "slow down" leaves the rest)
      for (const r of results) if (Number.isSafeInteger(r?.seq)) this.acked = Math.max(this.acked, r.seq);
      this.queue = this.queue.filter((c) => c.seq > this.acked);
      if (out.slow) this.slowUntil = Date.now() + SLOW_MS;
      // LUCKY SHARDS: the server rolled them and has them in its save; the same added here, and shown
      for (const r of results) {
        if (!(r?.drop?.shards > 0)) continue;
        const purse = (this.save.purse ??= { gold: 0, bank: 0, shards: 0, avyn: 0 });
        purse.shards = (purse.shards ?? 0) + r.drop.shards;
        try { this.onDrop(r.drop); } catch { /* the picture is not the Shards */ }
      }
      const bad = results.find((r) => r?.ok === false);
      if (out.save) this.#adopt(out.save, out.applied ?? this.acked, bad?.reason ?? null, !bad);
      else if (bad || (sync && out.slow)) this.wantSave = true;   // (a refusal with no save, or the save not given yet: asked again)
    }).catch((e) => {
      if (sync) this.wantSave = true;
      if (e.status === 401) { this.gone = true; location.reload(); return; }
      this.failures++;
      this.onTrouble('Reconnecting to Bloomshire...');
      return new Promise((ok) => setTimeout(ok, RETRY_MS[Math.min(this.failures - 1, RETRY_MS.length - 1)]));
    }).finally(() => { this.inflight = null; this.sending = []; this.#flush(); });
  }

  /** A save the server sent another way (the admin's desk, a trade, a payment -- over the live socket): taken as the
   *  server's word. `applied`: { [sid]: the last of each page's commands it holds } (server/live2.js). */
  adopt(save, reason = null, applied = null) {
    const upTo = applied && typeof applied === 'object' ? (Number.isSafeInteger(applied[this.sid]) ? applied[this.sid] : 0) : this.acked;
    // (a save made before answers this page has already had -- the socket and the answers travel apart: taken, it would
    //  lose what those answers brought; the current save is asked for instead)
    if (applied && typeof applied === 'object' && upTo < this.acked) { this.wantSave = true; this.#flush(); return; }
    this.#adopt(save, upTo, reason, !reason);
  }

  /** The server's save becomes this one (the same object, so every view of it follows) -- and this page's commands it
   *  does not hold yet (after `applied`) are re-run on it, in order: kept if they still go, dropped if not. */
  #adopt(save, applied, reason, quiet) {
    const pending = this.queue.filter((c) => c.seq > applied);
    for (const k of Object.keys(this.save)) delete this.save[k];
    Object.assign(this.save, save);
    this.onResync(this.save, quiet ? null : reason);
    if (!pending.length || !this.ctxOf) { this.queue = pending; return; }
    const kept = [];
    for (const c of pending) {
      const before = this.#snap();
      let r;
      try { const ctx = this.ctxOf(); if (Number.isFinite(c.at)) ctx.now = c.at; r = run(c.name, c.args, ctx); } catch { r = null; }
      if (r?.ok) { if ('got' in r) c.saw = r.got ?? null; kept.push(c); continue; }
      if (this.#putBack(before)) this.onResync(this.save, null);    // (what it had begun, undone -- and shown so)
      // NOT dropped: the page cannot always judge it here (a door gone through, a field on the map just left: Play's
      // rules see only the map on screen) -- the server does, and its save is asked for, so the two agree again
      kept.push(c); this.wantSave = true;
    }
    this.queue = kept;
    this.onResync(this.save, null);
  }

  #snap() { try { return structuredClone(this.save); } catch { return null; } }
  /** The save as it was (`snap`), if anything changed: true when it did. */
  #putBack(snap) {
    if (!snap || JSON.stringify(snap) === JSON.stringify(this.save)) return false;
    for (const k of Object.keys(this.save)) delete this.save[k];
    Object.assign(this.save, snap);
    return true;
  }
}

/** The map editor's Play: no server, the actions run here only; nothing economic -- except a quest's
 *  hand-in, which the designer plays through here by the same rules (`ctxOf`: Play's rules context). */
export class LocalSession {
  constructor(save) { this.save = save; this.onResync = () => {}; this.onTrouble = () => {}; this.ctxOf = null; }
  get online() { return false; }
  act(name, args, ctx) { return run(name, args, ctx); }
  async settle() {}
  async ask(name, args) {
    if (name === 'quest.turnIn' && this.ctxOf) return runEconomy(name, this.ctxOf(), args, {});
    // (the Founding Farmers' clues and puzzles: in the editor, the editor's own salt stands in for the server's)
    if (ASKED.has(name) && this.ctxOf) return run(name, args, { ...this.ctxOf(), salt: 'editor' });
    return { ok: false, reason: 'The shops open in the game, not in the editor' };
  }
  async offers() { return { open: [], mine: [] }; }
  async trade() { return { ok: false, reason: 'Trading opens in the game, not in the editor' }; }
  async crypto() { return { ok: false, open: false, reason: 'Trading for crypto opens in the game, not in the editor' }; }
}
