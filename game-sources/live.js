// live.js -- THE OTHER PLAYERS, AND THE CHAT: the game's side of server/live2.js (2026-09-27).
//
// One socket to the server (/play/live). Over it the game says where you are and what you are doing -- a few
// times a second while it changes -- and how you look; and hears who else is on your map and near enough to see,
// and every line of the global chat. The other players are drawn with their own looks, doing what their games say
// they are doing, glided smoothly between the server's updates. Nothing here touches the save.
//
// A dropped socket is tried again, a little later each time (with a random wait, so a restart of the server is
// not five thousand games knocking at once).

import { ACTIONS } from './villager.js';
import { setSky } from './rules.js';
import { drawFishLine, waterAhead } from './fishline.js';

const FACE = { down: 'd', up: 'u', left: 'l', right: 'r' };
const FACED = { d: 'down', u: 'up', l: 'left', r: 'right' };
const SEND_MS = 110;                  // at most ~9 updates a second while you move
const SNAP = 200;                     // further than this from where they were: they are simply there

export class LiveClient {
  /**
   * @param url     the socket's address (wss://.../play/live)
   * @param rigFor  (look) -> a Villager dressed so (shared between players who look the same)
   * @param on      { chat({ reset?, add?, drop? }), me(me), note(text), status(online) }
   * @param water   (x, y) -> is it water (where another player's line goes: their game does not say)
   */
  constructor({ url, rigFor, on = {}, lift = null, water = null }) {
    this.url = url; this.rigFor = rigFor; this.on = on; this.lift = lift;      // (lift: a hop over stepping stones)
    this.water = water;
    this.remotes = new Map();          // lid -> the other player
    this.me = null; this.channel = null; this.tries = 0; this.closed = false;
    this.sentKey = ''; this.sentAt = 0; this.map = null; this.look = null;
    this.connect();
  }

  get online() { return this.ws?.readyState === 1; }

  connect() {
    if (this.closed) return;
    let ws;
    try { ws = new WebSocket(this.url); } catch { this.#retry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.tries = 0; this.sentKey = '';
      if (this.look) this.#send({ t: 'look', look: this.look });
      this.on.status?.(true);
    };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } this.#hear(m); };
    ws.onclose = (e) => {
      if (this.ws === ws) this.ws = null;
      this.remotes.clear();
      this.on.status?.(false);
      if (e.code === 4000) { this.closed = true; return; }       // another window took this one's place
      this.#retry();
    };
  }

  close() { this.closed = true; try { this.ws?.close(); } catch { /* gone */ } this.remotes.clear(); }

  #retry() {
    if (this.closed) return;
    const wait = Math.min(15000, 1000 * 2 ** Math.min(4, this.tries++)) + Math.random() * 1500;
    setTimeout(() => this.connect(), wait);
  }

  #send(o) { if (this.ws?.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; }

  #hear(m) {
    switch (m.t) {
      // (and this page takes pushed saves the new way -- game/session.js adopt: the server may now send it news)
      case 'hi': this.me = m.me; this.channel = m.ch; if (m.sky) setSky(m.sky); this.on.me?.(m.me, m.ch); this.on.chat?.({ reset: m.chat ?? [] }); this.on.notice?.(m.notice ?? null, m.now); this.on.message?.(m.message ?? null, m.now); this.on.folk?.(m.folkOut === true); this.#send({ t: 'rebase' }); return;
      case 'folk': this.on.folk?.(m.out === true); return;      // the townsfolk out in all weathers, or not (server: store.js folkOut)
      // the sky as an admin set it: the world's clock and weather, the same for everyone (rules.js SKY)
      case 'sky': if (m.sky && typeof m.sky === 'object') setSky(m.sky); return;
      // an update on its way, with the server's time to count down by (server/store.js notice); null: taken down
      case 'notice': this.on.notice?.(m.n && typeof m.n === 'object' ? m.n : null, m.now); return;
      // the admin's message for everyone, with the server's time it runs out by (server/store.js message); null: taken down
      case 'message': this.on.message?.(m.m && typeof m.m === 'object' ? m.m : null, m.now); return;
      case 'closed': this.on.note?.(m.why); this.on.closed?.(); return;   // the playtest has closed (server: live2.js)
      case 'me': if (this.me) this.me.name = m.name; this.on.me?.(this.me, this.channel); return;
      case 'p': this.#people(m); return;
      case 'c': this.on.chat?.({ add: m.m ?? [], drop: m.x ?? [] }); return;
      case 'no': case 'bye': this.on.note?.(m.why); return;
      case 'save': if (m.save && typeof m.save === 'object') this.on.save?.(m.save, m.why, m.applied ?? null); return;
      case 'trade': this.on.trade?.(m); return;                  // face to face (server/trade2.js): asked, the trade, its end
      case 'friend': this.on.friend?.(m); return;                // a friend request, a new friend, one no more (server/friends.js)
      case 'crypto': this.on.crypto?.(m); return;                // a listing of yours paid for in crypto (server/crypto.js)
      // the Founding Farmer you play as, as the server has it (server/founders.js: chosen, put away, sold); and a word that
      // your farmers changed hands -- ask again
      case 'founder': this.on.founder?.(m.fd ?? null); return;
      case 'founders': this.on.founders?.(); return;
      default:
    }
  }

  /** Who came into view, who moved, who went. */
  #people(m) {
    for (const p of m.add ?? []) {
      // (a Founding Farmer is drawn as one: `fd`, the server's own word -- server/live2.js)
      const had = this.remotes.get(p.i), lookKey = JSON.stringify([p.lk ?? {}, p.fd?.n ?? 0]);
      const r = had ?? { lid: p.i, x: p.x, y: p.y, t: 0 };
      r.name = p.n; r.admin = !!p.adm; r.founder = p.fd?.n ?? null;
      if (r.lookKey !== lookKey) { r.lookKey = lookKey; r.rig = this.rigFor(p.lk ?? {}, p.fd ?? null); }
      this.#aim(r, p.x, p.y, p.f, p.a, p.md === 'swim');
      this.remotes.set(p.i, r);
    }
    for (const [i, x, y, f, a, swim] of m.mv ?? []) { const r = this.remotes.get(i); if (r) this.#aim(r, x, y, f, a, !!swim); }
    for (const i of m.gone ?? []) this.remotes.delete(i);
  }

  #aim(r, x, y, f, a, swim) {
    r.tx = x; r.ty = y;
    if (Math.hypot(x - r.x, y - r.y) > SNAP) { r.x = x; r.y = y; }
    r.facing = FACED[f] ?? 'down';
    const act = ACTIONS[a] ? a : 'idle';
    if (act !== r.action) { r.action = act; r.t = 0; }
    r.swim = swim;
  }

  /* ---------------------------------------------------------------- each frame */

  /** Say where you are (when it changed, not too often), and glide everyone else toward where they are. */
  update(dt, me) {
    if (me) {
      if (me.map !== this.map) { this.map = me.map; this.remotes.clear(); this.sentKey = ''; }
      const f = FACE[me.facing] ?? 'd', x = Math.round(me.x), y = Math.round(me.y);
      const key = `${me.map}|${x}|${y}|${f}|${me.action}|${me.mode}`, now = performance.now();
      if (key !== this.sentKey && (now - this.sentAt >= SEND_MS || !this.sentKey)) {
        if (this.#send({ t: 'at', m: me.map, x, y, f, a: me.action, md: me.mode === 'swim' ? 'swim' : 'foot' })) { this.sentKey = key; this.sentAt = now; }
      }
    }
    const k = 1 - Math.exp(-dt * 10);
    for (const r of this.remotes.values()) {
      r.t += dt;
      r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k;
    }
  }

  /** How you look now (sent now, and again whenever the socket comes back). */
  setLook(look) {
    this.look = look;
    this.#send({ t: 'look', look });
  }

  /** A line for the chat (a reply when `re` is the id of the line it answers). */
  say(text, re = null) { return this.#send({ t: 'say', text, ...(re ? { re } : {}) }); }

  /** (an admin) take a line down. */
  drop(id) { return this.#send({ t: 'drop', id }); }

  /** The other players in view, to be drawn among the things on the map: { y, draw(g) }. */
  movers(rect) {
    const out = [];
    for (const r of this.remotes.values()) {
      if (r.x < rect.x0 - 16 || r.x > rect.x1 + 16 || r.y < rect.y0 - 8 || r.y > rect.y1 + 40) continue;
      out.push({ y: r.y, draw: (g) => this.#draw(g, r) });
    }
    return out;
  }

  #draw(g, r) {
    const x = Math.round(r.x), y = Math.round(r.y), up = Math.round(r.swim ? 0 : this.lift?.(r) ?? 0);
    if (!r.swim) {
      g.fillStyle = 'rgba(0, 0, 0, 0.22)';
      g.beginPath(); g.ellipse(x, y - 1, up ? 4 : 5, 2, 0, 0, Math.PI * 2); g.fill();
    }
    if (!r.rig?.draw(g, r.action, r.facing, r.t, x, y - up)) r.rig?.draw(g, r.swim ? 'swimIdle' : 'idle', r.facing, r.t, x, y - up);
    // fishing: their line from the rod's tip to the first water ahead (where it came down is their game's alone)
    if (r.action === 'fishWait' || r.action === 'fishBite' || r.action === 'fishReel') {
      const key = `${x},${y},${r.facing}`;
      if (r.fishKey !== key) { r.fishKey = key; r.fishTo = waterAhead(x, y, r.facing, this.water); }
      const tip = r.fishTo && r.rig?.tipAt?.(r.action, r.facing, r.t, x, y - up);
      if (tip) drawFishLine(g, tip, r.fishTo, { bite: r.action === 'fishBite', taut: r.action === 'fishReel' ? 1 : 0 });
    }
  }

  /** Where the other players' names go: [{ x, y, name, admin }] in world px (the top of the head). */
  tags() { return [...this.remotes.entries()].map(([lid, r]) => ({ lid, x: r.x, y: r.y, name: r.name, admin: r.admin, swim: r.swim })); }

  /** Names someone could @: everyone in view and everyone who has spoken. */
  names() { return [...this.remotes.values()].map((r) => r.name); }

  /** The other player nearest (x, y) within `reach` world px, or null. */
  nearest(x, y, reach) {
    let best = null, d0 = reach;
    for (const r of this.remotes.values()) { const d = Math.hypot(r.x - x, r.y - y); if (d <= d0) { best = r; d0 = d; } }
    return best;
  }
}
