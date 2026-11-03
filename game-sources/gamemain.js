// gamemain.js -- BLOOMSHIRE, THE GAME: the page a player opens at bloomshire.xyz/play.
//
// First the WALLET DOOR (door.js): "Log in" or "Welcome back", and the wallets this browser has, each with
// its own logo, on the site's own night sky. Then
// the game: the map editor's Play (play.js), with nothing of the editor behind
// it (app.game) -- the world, the tools, the interface and the sound as the
// designer has been playing them.
//
//   * WHO MAY PLAY is the server's to say, as it always was: a wallet signs a
//     one-off message (/api/auth/wallet/challenge, /verify) and only a wallet on
//     the allowlist is given a session. The game's maps and catalogue answer
//     only to that session (server/newgame.js), and a wallet taken off the list
//     is out at once.
//   * PROGRESS is kept in this browser, one save for each wallet (rules.js
//     setSaveKey): a second wallet on the same computer starts its own farm.
//   * EVERY VISIT SIGNS IN AGAIN (the designer, 2026-09-24): a refresh, a new tab
//     or a session from last week lands at the door, and the wallet signs a fresh
//     message. The old session is ended first (main()).
//   * NOTHING IS WRITTEN to the server but the sign-in, a name and the sign-out.
//     The maps are read, never saved.

import { Assets } from './assets.js';
import { Renderer } from './render.js';
import { deserialize, resolveGid } from './doc.js';
import * as api from './io.js';
import { Play } from './play.js';
import { serverURL } from './util.js';
import { setSaveKey, useSaveDoc, setSky } from './game/rules.js';
import { Session, build } from './game/session.js';
import { loadGameUi } from './game/ui.js';
import { setLang, preferredLang, watchDom } from './i18n.js';
import { door, loadingScreen } from './door.js';
import { startClock } from './game/clock.js';
import { configure as configureQuests } from './game/quests.js';
import { HumanCheckWindow } from './game/humancheck.js';

const GAME_W = 480, GAME_H = 270;
/** The site's own address for its account API (the game itself lives under /play/). */
const site = (p) => new URL(p, location.origin).href;
const post = (url, body) => fetch(site(url), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });

/* ------------------------------------------------------------------ the game's "app"
 * Play was written inside the map editor and asks its app for a few things: the
 * map (doc), the pictures (assets), a picture of the whole map for the Map
 * window (renderer.renderRegion), what ground a tile is (terrainOfGid), and the
 * next map through a door (openMap). This is all of that, and nothing else. */
class GameApp {
  constructor(world, player) {
    this.game = true;
    this.world = world; this.player = player; this.spawn = world.spawn ?? null;
    this.doc = null; this.live = null; this.cursor = null; this.tools = null; this.zoneSel = null;
    this.settings = {}; this.view = { x: 0, y: 0, zoom: 1 }; this.hiddenWhileDragging = null;
    this._gidTerrain = new Map();
    this.assets = new Assets(this);
    // the live site speaks HTTP/2: one connection carries many pictures at once, so more may be asked for
    // together than the editor's cautious twelve (every one of them waited a round trip in turn)
    this.assets.maxActive = 32;
    // a picture that fails (a phone's connection drops) is asked for again later, never given up for good (assets.js)
    this.assets.recovering();
    this.mapFiles = new Map();          // map id -> the promise of its file: each is fetched once, a door's next map ahead of time
    // only the renderer's picture-of-a-region: no canvas of its own, no redraw loop
    this.renderer = Object.assign(Object.create(Renderer.prototype), { app: this, chunks: new Map(), cachedPx: 0, budget: 48e6, pending: false,
      cssW: GAME_W, cssH: GAME_H, dpr: 1, request() {}, draw() {} });
    this.play = new Play(this);
  }
  isDirty() { return false; }
  emit() {}
  toast(text) { note(text); }
  /** A picture arrived. The cached pieces of the ground are drawn from the TILESETS alone, so only one of
   *  those makes them stale -- the farmer's layers, the props and the icons do not (2026-09-25: clearing
   *  them for every one of the ~300 pictures of a first visit redrew the whole ground hundreds of times,
   *  which was the stutter at the start). */
  onImageLoaded(path) {
    // (the map kept while you are away, drawn before this picture came: drawn again when you are back)
    if (this.kept?.doc.tilesets?.some((t) => t.image === path)) { this.kept.chunks = new Map(); this.kept.px = 0; }
    if (!this.doc?.tilesets?.some((t) => t.image === path)) return;
    this.renderer.chunks.clear(); this.renderer.cachedPx = 0;
  }

  /** A map's file, fetched once (the game never changes a map): the same promise for every ask. */
  mapFile(id) {
    let f = this.mapFiles.get(id);
    if (!f) { f = api.openMapFile(id).then((r) => r.json); f.catch(() => this.mapFiles.delete(id)); this.mapFiles.set(id, f); }
    return f;
  }

  terrainOfGid(gid) {
    if (!gid) return null;
    if (this._gidTerrain.has(gid)) return this._gidTerrain.get(gid);
    const hit = resolveGid(this.doc, gid);
    let found = null;
    if (hit) for (const t of this.assets.terrainsByImage?.get(hit.ts.image) ?? []) if (t.holdsIndex(hit.index)) { found = t; break; }
    this._gidTerrain.set(gid, found);
    return found;
  }

  /** The next map (a door): read from the game's own maps, never saved. THE PLACE LEFT IS KEPT (2026-10-22, the designer:
   *  going in and out of a building "feels stuck"): the map you came from waits while you are away, with the pieces of
   *  its ground already drawn (the most recent, KEEP_PX of them), and coming back is that map again at once -- not read
   *  and drawn anew. (Play keeps what it made of it the same way: play.js build, park.) */
  async openMap(id) {
    const kept = this.kept?.doc.id === id ? this.kept : null;
    const json = kept ? null : await this.mapFile(id);
    const was = this.doc ? { doc: this.doc, chunks: this.renderer.chunks, px: this.renderer.cachedPx, gids: this._gidTerrain } : null;
    if (kept) { this.doc = kept.doc; this.renderer.chunks = kept.chunks; this.renderer.cachedPx = kept.px; this._gidTerrain = kept.gids; }
    else {
      // (no copy of the file first: deserialize makes the map anew from it and leaves it as it was -- 82 ms a door for
      //  the town, 2026-10-22, the crossings "as smooth as butter")
      const doc = deserialize(json);
      doc.assetSources = this.assets.sources ?? [];
      this.doc = doc;
      this._gidTerrain = new Map();
      this.renderer.chunks = new Map(); this.renderer.cachedPx = 0;
    }
    this.kept = was && was.doc !== this.doc ? keptPieces(was) : null;
  }

  /** Save & quit: what was done but is not yet with the server goes first (a few seconds at most), then home. Signed
   *  out only if the player says so (2026-10-03: a player stays signed in for the time they chose at the door; a
   *  shared computer can still be left signed out). (The save is the server's: world2.js.) */
  async quit() {
    const go = async (signOut) => {
      if (this.session?.unsent) { note('Saving your farm...'); await Promise.race([this.session.settle(), new Promise((ok) => setTimeout(ok, 6000))]); }
      if (signOut) { try { await post('/api/auth/logout'); } catch { /* going home anyway */ } }
      this.quitting = true;
      location.href = '/';
    };
    const asked = this.play?.gameUi?.askYesNo?.({ question: 'Sign out as well?', detail: 'Your farm is saved either way. Stay signed in and next time you come straight in.',
      yes: 'Sign out', no: 'Stay signed in', onYes: () => go(true), onNo: () => go(false) });
    if (!asked) go(false);
  }
}

/* ------------------------------------------------------------------ the place left, kept */
const KEEP_PX = 16e6;                   // the drawn ground kept for the map you left: its most recent pieces, about 64 MB
/** The map you left as it waits (openMap): its pieces of ground the most recently drawn first, up to KEEP_PX. */
function keptPieces(was) {
  if (was.px <= KEEP_PX) return was;
  const all = [...was.chunks], chunks = new Map();
  let px = 0, i = all.length - 1;
  for (; i >= 0 && px + (all[i][1].px ?? 0) <= KEEP_PX; i--) px += all[i][1].px ?? 0;
  for (const e of all.slice(i + 1)) chunks.set(e[0], e[1]);
  return { ...was, chunks, px };
}

/* ------------------------------------------------------------------ a line of news */
function note(text) {
  let n = document.getElementById('gameNote');
  if (!n) {
    n = document.createElement('div'); n.id = 'gameNote';
    n.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10001;padding:8px 14px;border-radius:6px;' +
      'background:rgba(18,20,42,.92);border:1px solid #4fd1c5;color:#e6ecff;font:13px/1.3 system-ui,sans-serif;pointer-events:none;transition:opacity .6s';
    document.body.append(n);
  }
  n.textContent = text; n.style.opacity = '1';
  clearTimeout(note.t); note.t = setTimeout(() => { n.style.opacity = '0'; }, 3200);
}

/* ------------------------------------------------------------------ the wallet door: door.js (plain HTML) */

async function main() {
  document.title = 'Bloomshire';
  // THE PLAYER'S LANGUAGE (2026-09-28, i18n.js): the one this browser chose, before a word is shown -- the door's
  // words and every plain HTML part translated as they appear (watchDom)
  const langP = setLang(preferredLang(), { keep: false }).catch(() => 'en');
  watchDom(document.body);
  await langP;
  // WHAT NEEDS NO SIGN-IN IS FETCHED AT ONCE, side by side, while the wallet is at the door: where the world
  // starts and the server's clock (the code itself is preloaded by the page: build-game.mjs)
  const worldP = fetch(serverURL('world.json')).then((r) => r.json());
  const clockP = startClock().catch(() => {});
  let account = null;
  // the session and the server's kind, asked side by side (one trip to the server, not two)
  const [sessionR, env] = await Promise.all([
    fetch(site('/api/session'), { credentials: 'same-origin' }).catch(() => null),
    fetch(site('/api/env'), { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}))]);
  let closed = '';                                   // (the playtest closed: the door says so at once -- server/auth.js CLOSED_TEXT)
  try { if (sessionR?.ok) account = (await sessionR.json()).account; } catch { /* not signed in */ }
  if (!account) try { closed = (await (await fetch(site('/play/api/door'), { credentials: 'same-origin' })).json()).closed ?? ''; } catch { /* the door as ever */ }
  // SIGNED IN STAYS SIGNED IN (2026-10-03, the designer: "sign in just once"). A session this browser still holds
  // comes straight in; it lasts as long as the player chose at the door (2 days, 3 or a week: server/auth.js
  // STAY_DAYS), or until they Save & quit and sign out, or clear the site's data. (Until then every visit ended the
  // session here and the wallet signed again -- 7 sign-ins a player in two days.)
  void env;
  // (the name is asked in the game, by Marlow, when you wake: game/quests.js q01)
  if (!account) account = await door(account, closed, post);

  const loading = loadingScreen();
  const world = await worldP;
  setSaveKey(`bloomshire.game.${account.id}.`);
  // a Founding Farmer's bigger energy bar, when the account says so (the server does not send it yet)
  const app = new GameApp(world, { id: account.id, name: account.name, named: account.named !== false, founding: account.founding === true, admin: account.role === 'admin' });
  try {
    // the catalogue and the first map side by side (the map is read once the catalogue is in); real time is
    // the SERVER's (crops, the energy recovery), so its clock is read before anything runs
    app.mapFile(world.start);
    app.play.uiLoading = loadGameUi(app.assets);                  // the interface too: it needs no catalogue
    // THE PLAYER'S SAVE IS THE SERVER'S (server/world2.js): fetched beside the catalogue, and from here on
    // everything the rules keep is kept in it (rules.js useSaveDoc) and every action goes to the server
    const sessionP = Session.open();
    await Promise.all([app.assets.load(), clockP]);
    const session = await sessionP;
    useSaveDoc(session.save);
    if (session.questConfig) configureQuests(session.questConfig);   // the server's say over the quests (world2.js)
    if (session.sky) setSky(session.sky);                               // the sky as an admin set it (world2.js, rules.js SKY)
    app.session = session;
    session.onResync = (save, reason) => app.play.reloadFromSave(reason);
    session.ctxOf = () => app.play.rulesCtx();                     // (to re-run what the server has not seen yet on a save it sends)
    session.clock = () => app.play.rulesCtx().now;                  // (the same clock the actions are played by)
    // a page closed with actions not yet with the server: asked first (they go in a moment)
    window.addEventListener('beforeunload', (e) => { if (session.unsent && !app.quitting) { e.preventDefault(); e.returnValue = ''; } });
    session.onTrouble = (text) => { if (text) note(text); };
    session.onDrop = (d) => app.play?.luckyShard?.(d);
    session.onAvyn = (a) => { app.play?.sound?.cue?.(app.play.sound.has?.('shardGain') ? 'shardGain' : 'magicCast', { gain: 0.7 }); app.play?.gameUi?.notify?.(a.why === 'forage' ? `A lucky find! +${a.avyn} $AVYN` : `The order paid +${a.avyn} $AVYN too!`); };
    // (the picture check, owed after play no person keeps up: server/world2.js #beat, game/humancheck.js)
    session.onCheck = () => { if (app.play) (app.play.humanCheck ??= new HumanCheckWindow(app.play)).open(); };
    // THE GAME WAS UPDATED UNDER THIS PAGE (session.js build): it loads itself again, so it plays by the server's rules --
    // once nothing it did is still on the way (the farm, the bag: all of it is with the server by then). Once a minute at
    // most, should the server keep changing its mind.
    // QUIET UPDATES (2026-10-11, the designer: "that player can keep on playing the game but the update will still
    // happen"): not at once, but at the next quiet moment -- the tab out of sight, the player idle for a while with no
    // window open (or four times that with one), or just arrived somewhere new (a door, a road: the change of place hides the load) -- and, when the
    // rules changed (the server's own, server/newgame.js RULES), within RULES_WITHIN at the latest (the server stops
    // taking an old page's actions a while after that); a new look only, within LOOK_WITHIN. Nothing is said before.
    // (window.bloomshireQuiet: the checks' shorter times)
    const Q = { idle: 45e3, rules: 10 * 60e3, look: 60 * 60e3, ...(window.bloomshireQuiet ?? {}) };
    let lastInput = Date.now(), due = null, quietT = null, placeAt = null;
    for (const ev of ['keydown', 'pointerdown', 'touchstart', 'wheel']) window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true });
    build.onNew = (b, { rules = true } = {}) => {
      const by = Date.now() + (rules ? Q.rules : Q.look);
      due = due ? Math.min(due, by) : by;
      placeAt ??= app.doc?.id ?? null;
      quietT ??= setInterval(() => {
        const P = app.play, moving = !!P?.travelling, place = app.doc?.id ?? null;
        const arrived = !moving && placeAt && place && place !== placeAt;
        if (moving) return;
        // (a window open -- a shop, a talk, the guide: four times as long without a touch first, so nobody is reloaded
        //  while reading)
        const idle = Date.now() - lastInput > (P?.gameUi?.stack?.top ? 4 : 1) * Q.idle;
        if (!(document.hidden || arrived || idle || Date.now() > due)) return;
        clearInterval(quietT);
        let last = 0;
        try { last = Number(sessionStorage.getItem('bloomshire.updated')) || 0; } catch { /* no storage: reload anyway */ }
        // (once a minute at most -- and never given up: 2026-10-07, two deploys rolled back inside 20 s, and a page that had
        //  just loaded the new version heard the old one again, gave up, and stayed on the old rules all day)
        const wait = Math.max(0, 60e3 - (Date.now() - last));
        const go = () => {
          if (session.unsent) { setTimeout(go, 500); return; }
          try { sessionStorage.setItem('bloomshire.updated', String(Date.now())); } catch { /* as above */ }
          note('Bloomshire was updated. Loading the new version...');
          app.quitting = true;
          location.reload();
        };
        setTimeout(go, wait);
      }, 1000);
    };
    // a visit starts where the server says: home -- or, for a farmer not yet awake, Marlow's house
    await app.openMap(session.save.where && world.maps?.includes?.(session.save.where) ? session.save.where : world.start);
  } catch (e) {
    // the session ended, or the wallet came off the list: back to the door
    if (e?.status === 401 || /401|403/.test(String(e?.message))) { location.reload(); return; }
    throw e;
  }
  // everything the first frame shows, in before it is drawn (Play.prepare), then the game
  await app.play.prepare(loading.progress);
  document.body.style.background = '#000';
  app.play.start();
  loading.close();
  // A HANDLE FOR SUPPORT AND THE CHECKS (as the editor's window.editor) -- on our own machines and for the game's admins
  // only (2026-10-04: a script pasted in the chat read the game through it, and one could drive a farmer with it): the
  // local test servers (localhost, 127.0.0.1, [::1], *.localhost), where the tests and the video tools run, and an
  // admin's own browser. A player's browser on bloomshire.xyz gets none.
  const ours = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/.test(location.hostname);
  if (ours || app.player?.admin === true) window.bloomshire = { app, play: app.play };
}

main().catch((e) => {
  console.error(e);
  note(`Bloomshire could not start: ${e?.message ?? e}`);
});
