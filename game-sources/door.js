// door.js -- THE WAY IN to the game (bloomshire.xyz/play): "Log in" (or "Welcome back"), and under it the
// wallets this browser has, each under its own name and its own logo. Then the loading bar.
//
// PLAIN HTML, NOT A CANVAS (2026-09-26, the designer: "it should only say log in or welcome back, and below
// it the wallets with their original logos"). A wallet's logo is whatever the wallet hands over when it
// announces itself (EIP-6963 `info.icon`): usually an SVG in a data: address. An <img> shows any of them as
// the browser would; the canvas door before this drew them itself, and some -- Phantom's among them -- never
// appeared. Nothing here ships a brand's artwork or guesses at one.
//
// WALLETS ARE FOUND AS THEY ASK TO BE: the page asks once, and keeps listening while the door is open, so a
// wallet that wakes a moment late still gets its button. An older wallet that only sets window.ethereum gets
// one too. The wallet used last on this computer comes first, and the door says "Welcome back".
//
// It looks like the site's home page (landing/): the same night, the same stars, the logo, the game's
// letters; its art comes from the site itself (/assets, /fonts), so the door needs nothing of the game's.
//
// A PHONE'S OWN BROWSER HAS NO WALLET IN IT (2026-09-29): it lists the wallet apps, and a tap opens the app only to
// connect and sign -- WalletConnect (walletconnect.js) -- while the game stays in the browser, which can turn on its
// side. The wallet apps' own browsers (OPEN_IN) are still there, one tap further.

import { WalletConnect } from './walletconnect.js';

export const LAST = 'bloomshire.lastWallet';
const CSS = `
@font-face { font-family: 'Bloomshire Pixel'; src: url(/fonts/bloomshire-pixel.woff) format('woff'); font-display: swap; }
#door { position: fixed; inset: 0; z-index: 10000; overflow: auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 16px 48px; color: #e4e9ff; font: 16px/1.5 ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif;
  background: #0b1330;
  background-image: radial-gradient(ellipse 70% 55% at 50% 12%, #1a2d66 0%, rgba(26,45,102,0) 70%), linear-gradient(180deg, #0b1330 0%, #0d1738 50%, #060b1e 100%); }
#door .stars { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; }
#door .mark { position: relative; display: block; width: min(320px, 72vw); margin: 0 0 18px; line-height: 0; }
#door .mark img { width: 100%; height: auto; filter: drop-shadow(0 10px 18px rgba(0,0,0,.45)); }
#door .card { position: relative; width: min(380px, 100%); padding: 26px 22px 22px; border-radius: 18px;
  background: linear-gradient(180deg, rgba(30,46,100,.72), rgba(16,26,62,.82)); border: 1px solid rgba(172,190,255,.18);
  box-shadow: 0 24px 60px rgba(0,0,0,.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  animation: doorIn .6s cubic-bezier(.2,.7,.2,1) both; }
@keyframes doorIn { from { opacity: 0; transform: translateY(10px); } }
#door h1 { margin: 0 0 18px; text-align: center; font: 26px/1.2 'Bloomshire Pixel', ui-monospace, monospace; color: #fff4e0;
  letter-spacing: .02em; -webkit-font-smoothing: none; text-shadow: 0 3px 0 rgba(0,0,0,.3); }
#door ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
#door .wallet { position: relative; display: flex; align-items: center; gap: 14px; width: 100%; min-height: 60px; padding: 10px 14px;
  border-radius: 12px; border: 1px solid rgba(172,190,255,.16); background: rgba(255,255,255,.045); color: #fff4e0; cursor: pointer; text-align: left;
  font: 17px/1.2 ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif; font-weight: 600;
  transition: background-color .15s ease, border-color .15s ease, transform .15s ease; }
#door .wallet:hover:not(:disabled) { background: rgba(255,255,255,.09); border-color: rgba(255,203,79,.55); transform: translateY(-1px); }
#door .wallet:focus-visible { outline: 3px solid #ffcb4f; outline-offset: 2px; }
#door .wallet:disabled { cursor: default; opacity: .45; }
#door .wallet.is-busy { opacity: 1; border-color: rgba(255,203,79,.7); }
#door .logo { flex: none; width: 36px; height: 36px; border-radius: 9px; object-fit: contain; background: rgba(255,255,255,.06); }
#door .logo--none { display: grid; place-items: center; color: #9ba7d4; }
#door .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#door .tag { flex: none; font: 11px/1 'Bloomshire Pixel', ui-monospace, monospace; letter-spacing: .08em; color: #b6e36f; -webkit-font-smoothing: none; }
#door .spin { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,203,79,.25); border-top-color: #ffcb4f; animation: doorSpin .8s linear infinite; }
@keyframes doorSpin { to { transform: rotate(360deg); } }
#door .status { margin: 16px 2px 0; min-height: 1.5em; text-align: center; font-size: 14px; color: #9ba7d4; }
#door .status.is-error { color: #ffb0a8; }
#door .status:empty { min-height: 0; margin: 0; }
#door .none { margin: 4px 0 0; text-align: center; color: #c9d2f5; }
#door .none small { display: block; margin-top: 6px; color: #9ba7d4; font-size: 14px; }
#door form { display: flex; flex-direction: column; gap: 12px; }
#door .wallet.done { border-color: rgba(182,227,111,.55); }
#door .wallet.done .name::before { content: '✓  '; color: #b6e36f; }
#door li > .go { width: 100%; }
#door .xlogo { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: #000; }
#door .xlogo svg { width: 18px; height: 18px; fill: #fff; }
#door .go:disabled { cursor: default; opacity: .4; filter: grayscale(.6); }
#door input { width: 100%; min-height: 50px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(172,190,255,.25); background: rgba(6,11,30,.6);
  color: #fff4e0; font: 17px/1 ui-rounded, 'Segoe UI', system-ui, sans-serif; outline: none; }
#door input:focus { border-color: #ffcb4f; box-shadow: 0 0 0 3px rgba(255,203,79,.2); }
#door .go { min-height: 50px; border-radius: 12px; border: 0; cursor: pointer; color: #4b2507; font: 17px/1 'Bloomshire Pixel', ui-monospace, monospace; letter-spacing: .04em;
  background: linear-gradient(180deg, #ffe39a, #ffcb4f 50%, #f7b53a); box-shadow: 0 4px 0 #e0921c, 0 6px 0 rgba(0,0,0,.3); -webkit-font-smoothing: none; }
#door .go:active { transform: translateY(4px); box-shadow: 0 0 0 #e0921c; }
#door .stay { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; margin: 16px 0 0; color: #9ba7d4; font-size: 13px; }
#door .stay > span { width: 100%; text-align: center; }
#door .stay button { min-height: 34px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(172,190,255,.22); background: rgba(255,255,255,.04);
  color: #c9d2f5; cursor: pointer; font: 14px/1 ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif; }
#door .stay button[aria-checked="true"] { border-color: #ffcb4f; background: rgba(255,203,79,.14); color: #fff4e0; }
#door .stay button:focus-visible { outline: 3px solid #ffcb4f; outline-offset: 2px; }
#door .home { position: relative; margin-top: 22px; color: #7f8bbd; font-size: 13px; text-decoration: none; }
#door .home:hover { color: #c9d2f5; }
#door button.home { background: none; border: 0; padding: 4px 8px; cursor: pointer; font: inherit; font-size: 13px; }
#door .bar { width: min(280px, 70vw); height: 8px; margin-top: 8px; border-radius: 4px; background: rgba(255,255,255,.08); overflow: hidden; position: relative; }
#door .bar > i { display: block; height: 100%; width: 0; border-radius: 4px; background: linear-gradient(90deg, #ffcb4f, #b6e36f); transition: width .25s ease; }
@media (prefers-reduced-motion: reduce) { #door .card { animation: none; } #door .spin { animation-duration: 2.4s; } }
#door a.wallet { text-decoration: none; box-sizing: border-box; }
#door li[hidden] { display: none; }
#door .more { display: block; width: 100%; margin: 2px 0 0; padding: 10px 6px; border: 0; background: none; cursor: pointer; color: #9ba7d4;
  font: 14px/1.4 ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif; text-decoration: underline; text-underline-offset: 3px; }
#door .more:hover, #door .more:focus-visible { color: #fff4e0; }
/* a phone held on its side: little height -- a smaller logo, the card from the top, the page scrolls */
@media (max-height: 520px) { #door { justify-content: flex-start; padding-top: 14px; } #door .mark { width: min(220px, 46vw); margin-bottom: 10px; } #door .card { padding: 18px 18px 16px; } }
`;

let styled = false;
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }
const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v); n.append(...kids); return n; };
/** HOW LONG TO STAY SIGNED IN (2026-10-03): the player's pick, kept on this device; the server holds the session that
 *  long (server/auth.js STAY_DAYS). A week unless they pick otherwise. */
const STAY = 'bloomshire.stay', STAYS = [[2, '2 days'], [3, '3 days'], [7, '1 week']];
const stayKept = () => { try { const n = Number(localStorage.getItem(STAY)); return STAYS.some(([d]) => d === n) ? n : 7; } catch { return 7; } };
const remember = () => { try { return JSON.parse(localStorage.getItem(LAST) ?? 'null'); } catch { return null; } };

/** The stars behind the door (the site's own, a little quieter). */
function stars(root) {
  const c = el('canvas', { class: 'stars', 'aria-hidden': 'true' }), g = c.getContext('2d');
  root.prepend(c);
  let list = [], raf = 0, t = 0, last = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lay = () => {
    const dpr = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    list = Array.from({ length: Math.round((innerWidth * innerHeight) / 8000) }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, p: Math.random() * 6.3, s: 0.4 + Math.random(), px: Math.max(1, Math.round(dpr)) }));
    draw();
  };
  const draw = () => { g.clearRect(0, 0, c.width, c.height); for (const s of list) { g.fillStyle = `rgba(255,246,224,${(0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.s + s.p))).toFixed(3)})`; g.fillRect(Math.round(s.x), Math.round(s.y), s.px, s.px); } };
  const tick = (now) => { raf = requestAnimationFrame(tick); if (now - last < 120) return; t += (now - last) / 1000; last = now; draw(); };
  lay(); addEventListener('resize', lay);
  if (!still) raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', lay); };
}

/** The page behind the door: the logo (a way home), and a card to put things in. */
function frame() {
  style();
  const root = el('div', { id: 'door' });
  const card = el('div', { class: 'card', role: 'dialog', 'aria-labelledby': 'doorTitle' });
  root.append(el('a', { class: 'mark', href: '/', 'aria-label': 'Bloomshire home' }, el('img', { src: '/assets/brand/bloomshire-logo.png', alt: 'Bloomshire', width: '489', height: '186' })), card);
  document.body.append(root);
  const stop = stars(root);
  return { root, card, close: () => { stop(); root.remove(); } };
}

/* ------------------------------------------------------------ the wallets */

/**
 * Keep a list of the wallets that announce themselves (EIP-6963) while the door is open; `onChange` hears
 * of each. An older wallet that only sets window.ethereum is added if nobody has announced in a moment.
 */
function watchWallets(onChange) {
  const found = new Map();
  const add = (d) => {
    if (!d?.provider || [...found.values()].some((w) => w.provider === d.provider)) return;
    const key = d.info?.rdns || d.info?.uuid || `w${found.size}`;
    if (found.has(key)) return;
    found.set(key, { key, name: d.info?.name || 'Wallet', icon: typeof d.info?.icon === 'string' && /^(data:image\/|https:\/\/)/i.test(d.info.icon) ? d.info.icon : null, rdns: d.info?.rdns ?? null, provider: d.provider });
    onChange([...found.values()]);
  };
  const on = (e) => add(e.detail);
  window.addEventListener('eip6963:announceProvider', on);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const late = setTimeout(() => {
    if (!found.size && window.ethereum) add({ info: { name: window.ethereum.isMetaMask ? 'MetaMask' : 'Browser wallet', rdns: 'injected' }, provider: window.ethereum });
    if (!found.size) onChange([]);
  }, 700);
  return () => { clearTimeout(late); window.removeEventListener('eip6963:announceProvider', on); };
}

/** A phone or a tablet (an iPad calls itself a Mac, but has fingers). */
export const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
/** The game, from the top: what a wallet app's browser is asked to open. */
export const GAME_URL = () => `${location.origin}/play/`;
/** The wallet apps with a browser of their own, and how each is asked to open a page in it (their published links). */
export const OPEN_IN = [
  ['MetaMask', (u) => `https://metamask.app.link/dapp/${u.replace(/^https?:\/\//, '')}`],
  ['Coinbase Wallet', (u) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(u)}`],
  ['Trust Wallet', (u) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(u)}`],
  ['Phantom', (u) => `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}`],
  ['OKX Wallet', (u) => `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(u)}`)}`],
];

/** WALLETCONNECT's project id (Reown Cloud: cloud.reown.com, with bloomshire.xyz among its allowed addresses). It is
 *  public: it names the site to WalletConnect's relay. Set 2026-09-29 (the designer's project). Empty: a phone's
 *  browser offers only the wallet apps' own browsers (OPEN_IN). */
export const WC_PROJECT = '3464e4cfaa640d28e394e3b0277af34b';
const ANDROID = /Android/i.test(navigator.userAgent);
/** The wallet apps a phone's browser asks through WalletConnect, each by its own link (WalletConnect's registry,
 *  2026-09-29): `<app>wc?uri=<the pairing link>` opens it to connect, `<app>wc?requestId=..&sessionTopic=..` brings
 *  it back to sign. Phantom's and Coinbase's have no such link: they stay with OPEN_IN. On Android the pairing link
 *  itself (wc:) is offered too: the phone asks which of its wallet apps should open it. */
export const WC_APPS = [
  { key: 'metamask', name: 'MetaMask', app: 'metamask://' },
  { key: 'trust', name: 'Trust Wallet', app: 'trust://' },
  { key: 'okx', name: 'OKX Wallet', app: 'okex://main/' },
  { key: 'bitget', name: 'Bitget Wallet', app: 'bitkeep://' },
  { key: 'rainbow', name: 'Rainbow', app: 'rainbow://' },
  { key: 'robinhood', name: 'Robinhood Wallet', app: 'robinhood-wallet://' },
  ...(ANDROID ? [{ key: 'wc', name: 'Another wallet app', app: null }] : []),
];
/** Who asks, as the wallet app shows it. `redirect` (2026-09-29, the designer: after connecting and after signing
 *  "the wallet should redirect me back ... to the browser where the game is open"): MetaMask on Android goes back to
 *  the app that opened it -- the browser, the same tab -- only when the asker HAS a redirect (MetaMask's own code,
 *  WalletConnect2Session.redirect: Minimizer.goBack), else it shows a "return to the site" note. It is left EMPTY:
 *  a wallet that opens the address it names would open the game again in a new tab, and this door is a web page
 *  with no app to name. (MetaMask on an iPhone opens the named address instead: for later.) */
export const WC_META = () => ({ name: 'Bloomshire', description: 'A farming game in the valley of Bloomshire.', url: location.origin,
  icons: [`${location.origin}/assets/brand/icon-180.png`], redirect: {} });
/** A message as personal_sign carries it: its UTF-8 bytes in hex. */
const hexOf = (s) => `0x${Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('')}`;
/** A wait with an end: `ms` later it is given up, in words. */
const within = (p, ms, words = 'That took too long. Pick a wallet to try again.') =>
  Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error(words)), Math.max(0, ms)))]);

const WALLET_GLYPH = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 6h14a2 2 0 0 1 2 2v1h-5a3 3 0 0 0 0 6h5v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm11 5h6v2h-6a1 1 0 0 1 0-2Z"/></svg>';

/**
 * THE DOOR. Resolves with the account the server signed this browser in as. (A new farmer is named in the
 * game itself, by Marlow when they wake -- 2026-09-26.)
 * `message` is a word to show.
 */
export function door(account0 = null, message = '', post, opts = {}) {
  // (BLOOMSHIRE TOWN HALL, 2026-10-27, landing/townhall.html: the same door, its answer from Town Hall's own verify --
  //  any wallet comes in there, a visitor if the game would turn it away -- the whole answer resolved, a way back to the
  //  hall, the wallet apps' browsers sent to the hall, and a "Not now" that resolves null)
  const verifyUrl = opts.verify ?? '/api/auth/wallet/verify', pageUrl = opts.url ?? GAME_URL;
  return new Promise((resolve) => {
    const f = frame();
    let stopWatch = null, busy = false;
    const done = (acct) => { stopWatch?.(); wcStop(); f.close(); resolve(acct); };

    const last = remember();
    const title = el('h1', { id: 'doorTitle' }, last ? 'Welcome back' : 'Log in');
    const list = el('ul', { 'aria-label': 'Wallets in this browser' });
    const status = el('p', { class: 'status', role: 'status' });
    const say = (text, error = false) => { status.textContent = text; status.classList.toggle('is-error', error); };
    if (message) say(message, true);
    let stay = stayKept();
    const stayRow = el('div', { class: 'stay', role: 'radiogroup', 'aria-label': 'Stay signed in for' }, el('span', {}, 'Stay signed in for'));
    for (const [d, label] of STAYS) {
      const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(d === stay) }, label);
      b.addEventListener('click', () => {
        stay = d;
        try { localStorage.setItem(STAY, String(d)); } catch { /* private mode: this visit only */ }
        for (const x of stayRow.querySelectorAll('button')) x.setAttribute('aria-checked', String(x === b));
      });
      stayRow.append(b);
    }
    f.card.append(title, list, stayRow, status);
    if (opts.cancel) {
      const not = el('button', { type: 'button', class: 'home' }, opts.cancel);
      not.addEventListener('click', () => { if (!busy) done(null); });
      f.root.append(not);
    } else f.root.append(el('a', { class: 'home', href: '/' }, 'Back to bloomshire.xyz'));

    /** Challenge, signature, answer (server/auth.js): the same for a wallet in the browser and a wallet app. */
    async function signIn(address, sign) {
      const cr = await post('/api/auth/wallet/challenge', { address }), ch = await cr.json();
      if (!cr.ok) throw new Error(ch.error ?? 'The valley did not answer.');
      const signature = await sign(ch.message);
      const vr = await post(verifyUrl, { nonce: ch.nonce, signature, stay }), out = await vr.json();
      if (!vr.ok) {
        // THE X STEP FOR NEWCOMERS (server/xdoor.js): a refused sign-in may have a step waiting, filed under its nonce
        const e = new Error(out.error ?? 'That signature was refused.');
        if (vr.status === 403) { const tk = await fetch(`/play/api/xdoor/ticket?nonce=${encodeURIComponent(ch.nonce)}`).then((r) => r.json()).catch(() => null); if (tk?.ok) e.ticket = tk.ticket; }
        throw e;
      }
      return opts.verify ? out : out.account;      // (the name is asked in the game: Marlow, game/quests.js q01)
    }

    // WALLETCONNECT, READY BEFORE THE TAP: a browser follows a link into an app only in the tap itself, so the pairing
    // link is made as the door opens -- and made again every two minutes while nobody taps (each lives five)
    const wcOn = !!WC_PROJECT && MOBILE && !window.ethereum;
    let wc = null, wcUri = '', wcReady = null, wcTimer = 0, wcFailed = false, openIn = false;
    const wcLink = (a) => (a.app ? `${a.app}wc?uri=${encodeURIComponent(wcUri)}` : wcUri);
    function wcPrepare() {
      clearTimeout(wcTimer);
      wc?.close().catch(() => {});
      const mine = wc = new WalletConnect({ projectId: WC_PROJECT, metadata: WC_META() });
      wcUri = '';
      mine.onEnd = () => { if (mine === wc && !busy) { wcFailed = true; draw(); } };
      wcReady = mine.propose().then((uri) => {
        if (mine !== wc) return;
        wcUri = uri; wcFailed = false;
        for (const a of list.querySelectorAll('a[data-wc]')) a.href = wcLink(WC_APPS.find((x) => x.key === a.dataset.wc));
        wcTimer = setTimeout(() => { if (!busy) wcPrepare(); }, 120000);
      }, (err) => {
        if (mine !== wc) return;
        console.warn('WalletConnect:', err?.message ?? err);
        wcFailed = true;
        if (!busy) draw();
      });
      return wcReady;
    }
    // (back from elsewhere with an old link: a fresh one)
    const wcShow = () => { if (document.visibilityState === 'visible' && wc && !busy && !wcFailed && Date.now() > (wc.expires ?? 0) - 170000) wcPrepare(); };
    function wcStop() { clearTimeout(wcTimer); document.removeEventListener('visibilitychange', wcShow); }
    if (wcOn) { document.addEventListener('visibilitychange', wcShow); wcPrepare(); }

    let wallets = [];
    const draw = () => {
      list.replaceChildren();
      if (!wallets.length && wcOn && !wcFailed && !openIn) {
        // THE WALLET APPS, ASKED FROM HERE: a tap opens the app to connect; the game waits in this browser
        list.append(el('li', { class: 'none' }, 'Pick your wallet app.', el('small', {}, 'It opens and asks to connect. Then come back here to sign in.')));
        const apps = WC_APPS.slice().sort((a, b) => (b.key === last?.wc) - (a.key === last?.wc));
        for (const a of apps) {
          const link = el('a', { class: 'wallet', rel: 'noopener', 'data-wc': a.key });
          if (wcUri) link.href = wcLink(a);
          link.append(glyph(), el('span', { class: 'name' }, a.name));
          if (last?.wc === a.key) link.append(el('span', { class: 'tag' }, 'LAST USED'));
          link.addEventListener('click', (e) => connectApp(a, link, e));
          list.append(el('li', {}, link));
        }
        const other = el('button', { class: 'more', type: 'button' }, 'Or open Bloomshire inside your wallet app\'s browser');
        other.addEventListener('click', () => { openIn = true; say(''); draw(); });
        list.append(el('li', {}, other));
        return;
      }
      if (!wallets.length && MOBILE) {
        // A WALLET APP'S OWN BROWSER (2026-09-29): the wallet apps have browsers of their own, with the wallet
        // inside -- each button opens the game there, and the door finds the wallet as it does on a computer
        list.append(el('li', { class: 'none' }, 'Open Bloomshire in your wallet app.', el('small', {}, 'On a phone, the game runs inside your wallet\'s own browser. Pick yours:')));
        for (const [name, link] of OPEN_IN) {
          const a = el('a', { class: 'wallet', href: link(pageUrl()), rel: 'noopener' });
          a.append(glyph(), el('span', { class: 'name' }, name));
          list.append(el('li', {}, a));
        }
        if (wcOn && !wcFailed) {
          const back = el('button', { class: 'more', type: 'button' }, 'Back to the wallet apps');
          back.addEventListener('click', () => { openIn = false; draw(); });
          list.append(el('li', {}, back));
        }
        return;
      }
      if (!wallets.length) {
        list.append(el('li', { class: 'none' }, 'No wallet found in this browser.', el('small', {}, 'Bloomshire opens with an EVM wallet, such as MetaMask, Rabby or Phantom. Add one, then come back.')));
        return;
      }
      // the one used last on this computer first
      const order = wallets.slice().sort((a, b) => (b.rdns && b.rdns === last?.rdns) - (a.rdns && a.rdns === last?.rdns));
      for (const w of order) {
        const b = el('button', { class: 'wallet', type: 'button' });
        let logo;
        if (w.icon) { logo = el('img', { class: 'logo', src: w.icon, alt: '', width: '36', height: '36' }); logo.addEventListener('error', () => logo.replaceWith(glyph()), { once: true }); }
        else logo = glyph();
        b.append(logo, el('span', { class: 'name' }, w.name));
        if (last && w.rdns && w.rdns === last.rdns && wallets.length > 1) b.append(el('span', { class: 'tag' }, 'LAST USED'));
        b.addEventListener('click', () => connect(w, b));
        list.append(el('li', {}, b));
      }
    };
    const glyph = () => { const s = el('span', { class: 'logo logo--none', 'aria-hidden': 'true' }); s.innerHTML = WALLET_GLYPH; return s; };

    async function connect(w, button) {
      if (busy) return;
      busy = true;
      for (const b of list.querySelectorAll('button')) b.disabled = b !== button;
      button.classList.add('is-busy'); button.append(el('span', { class: 'spin', 'aria-hidden': 'true' }));
      say(`Waiting for ${w.name}...`);
      try {
        const accounts = await w.provider.request({ method: 'eth_requestAccounts' });
        const address = accounts?.[0];
        if (!address) throw new Error('That wallet gave no address.');
        const account = await signIn(address, (message) => {
          say('Sign the message in your wallet. It is a message, not a transaction: it costs nothing.');
          return w.provider.request({ method: 'personal_sign', params: [message, address] });
        });
        try { localStorage.setItem(LAST, JSON.stringify({ rdns: w.rdns, name: w.name })); } catch { /* private mode */ }
        busy = false;
        done(account);
      } catch (err) {
        busy = false;
        if (err?.ticket) { showTask(err.ticket); return; }
        draw();
        say(err?.code === 4001 ? 'You closed the wallet window. Pick a wallet to try again.' : String(err?.message ?? err), true);
      }
    }

    /**
     * A WALLET APP, FROM THE PHONE'S BROWSER: the tap follows the link into the app (the pairing), and the door waits
     * here -- for the app's yes, then for its signature. The app's button stays: a tap on it opens the app again (to
     * sign, it brings the app forward with the request's own link).
     */
    async function connectApp(a, link, e) {
      if (busy) { if (!link.classList.contains('is-busy')) e.preventDefault(); return; }
      if (!wcUri) {
        // (tapped before the link was made: made now, and followed if the browser still lets it)
        e.preventDefault();
        say('Getting ready...');
        await wcReady?.catch(() => {});
        if (!wcUri) return;
        say('');
        location.href = wcLink(a);
      }
      busy = true;
      const flow = wc;
      let cancelled = false;
      clearTimeout(wcTimer);
      // (the rest put away while it waits: on a phone the words and the Cancel stay in sight, under the one app)
      for (const li of list.children) if (!li.contains(link)) li.hidden = true;
      link.classList.add('is-busy'); link.append(el('span', { class: 'spin', 'aria-hidden': 'true' }));
      const cancel = el('button', { class: 'more', type: 'button' }, 'Cancel');
      cancel.addEventListener('click', () => { cancelled = true; busy = false; flow.close().catch(() => {}); wcPrepare(); draw(); say(''); });
      list.append(el('li', {}, cancel));
      say(a.app ? `Approve the connection in ${a.name}, then come back here.` : 'Approve the connection in your wallet app, then come back here.');
      try {
        const { address } = await within(flow.approved, (flow.expires ?? Date.now() + 300000) - Date.now() + 5000);
        const account = await signIn(address, async (message) => {
          const { id, topic, answer } = await flow.request('personal_sign', [hexOf(message), address]);
          if (a.app) {
            link.href = `${a.app}wc?requestId=${id}&sessionTopic=${topic}`;
            link.querySelector('.name')?.replaceWith(el('span', { class: 'name' }, `Sign in ${a.name}`));
            say(`Connected. Now sign the message in ${a.name}: tap it above if it did not open. It is a message, not a transaction: it costs nothing.`);
          } else say('Connected. Now open your wallet app and sign the message there. It is a message, not a transaction: it costs nothing.');
          return within(answer, 5 * 60000);
        });
        try { localStorage.setItem(LAST, JSON.stringify({ wc: a.key, name: a.name })); } catch { /* private mode */ }
        busy = false;
        flow.close().catch(() => {});             // (the session ends: it was only for signing in)
        done(account);
      } catch (err) {
        if (cancelled) return;
        busy = false;
        flow.close().catch(() => {});
        wcPrepare();
        if (err?.ticket) { showTask(err.ticket); return; }
        draw();
        say(err?.rejected ? `You said no in ${a.app ? a.name : 'your wallet app'}. Pick a wallet to try again.` : String(err?.message ?? err), true);
      }
    }

    /**
     * THE X STEP FOR NEWCOMERS (2026-10-11, the designer; server/xdoor.js): the door open to everyone, a wallet not on
     * the list signs and is asked for one last step -- connect its X account (X's own sign-in), follow two accounts,
     * like and repost a post (X's own screens, trusted) -- then signs once more and comes in. The ticket rides in the
     * address through X and back; what was clicked is kept for this tab.
     */
    let taskOn = false;
    // THE X LOGO, X's own (the designer, 2026-10-11: "the official logo, not the logo you make"): the mark as x.com draws
    // it (Simple Icons' "X", source x.com, guidelines about.x.com brand toolkit), white on black, as X's guidelines allow
    const xLogo = () => { const s = el('span', { class: 'xlogo', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>'; return s; };
    const XERR = { denied: 'X sign-in was cancelled. Connect your X account to come in.', x: 'X did not answer. Please try again in a moment.',
      setup: 'Connecting X is not set up yet. Please try again a little later.', expired: 'That step expired. Pick your wallet and sign in again.' };
    async function showTask(ticket, err = null) {
      taskOn = true;
      const r = await fetch(`/play/api/xdoor/task?ticket=${encodeURIComponent(ticket)}`).then((x) => x.json()).catch(() => null);
      const clean = () => { try { history.replaceState(null, '', location.pathname); } catch { /* fine */ } };
      if (!r?.ok) { taskOn = false; clean(); draw(); say(r?.reason ?? XERR.expired, true); return; }
      const key = `bloomshire.xdoor.${ticket}`;
      let clicked = {};
      try { clicked = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { clicked = {}; }
      const mark = (k) => { clicked[k] = true; try { sessionStorage.setItem(key, JSON.stringify(clicked)); } catch { /* this tab only */ } render(); };
      const step = (text, k, href) => {
        const b = el('button', { class: `wallet${clicked[k] ? ' done' : ''}`, type: 'button' }, xLogo(), el('span', { class: 'name' }, text));
        b.addEventListener('click', () => { window.open(href, '_blank', 'noopener'); mark(k); });
        return el('li', {}, b);
      };
      const render = () => {
        list.replaceChildren();
        list.append(el('li', { class: 'none' }, 'One last step', el('small', {}, 'Bloomshire is open to everyone today. Before you come in: connect your X account, follow us, and like and repost our post.'),
          ...(r.task.minDays > 0 ? [el('small', {}, `Your X account must be at least ${r.task.minDays} days old.`)] : [])));
        if (r.x) list.append(el('li', {}, el('div', { class: 'wallet done' }, xLogo(), el('span', { class: 'name' }, `X connected: @${r.x}`))));
        else {
          const c = el('button', { class: 'wallet', type: 'button' }, xLogo(), el('span', { class: 'name' }, 'Connect your X account'));
          c.addEventListener('click', () => { location.href = `/play/x/start?ticket=${encodeURIComponent(ticket)}`; });
          list.append(el('li', {}, c));
        }
        const need = [];
        for (const h of r.task.follow ?? []) { need.push(`f:${h}`); list.append(step(`Follow @${h}`, `f:${h}`, `https://x.com/intent/follow?screen_name=${encodeURIComponent(h)}`)); }
        if (r.task.postId) {
          need.push('like', 'repost');
          list.append(step('Like our post', 'like', `https://x.com/intent/like?tweet_id=${r.task.postId}`));
          list.append(step('Repost our post', 'repost', `https://x.com/intent/retweet?tweet_id=${r.task.postId}`));
        }
        const ready = !!r.x && need.every((k) => clicked[k]);
        const go = el('button', { class: 'go', type: 'button' }, 'Log in');
        go.disabled = !ready;
        go.addEventListener('click', async () => {
          go.disabled = true;
          const d = await post('/play/api/xdoor/done', { ticket }).then((x) => x.json()).catch(() => null);
          if (!d?.ok) { go.disabled = false; say(d?.reason ?? 'That did not go through. Please try again.', true); return; }
          try { sessionStorage.removeItem(key); } catch { /* fine */ }
          taskOn = false; clean(); draw();
          say('All set! Now pick your wallet and sign once more to log in.');
        });
        list.append(el('li', {}, go));
        const back = el('button', { class: 'more', type: 'button' }, 'Cancel');
        back.addEventListener('click', () => { taskOn = false; clean(); draw(); say(''); });
        list.append(el('li', {}, back));
        if (!ready) say(r.x ? 'Tap each step above; X opens in a new tab. Then come back and tap Log in.' : 'First connect your X account.');
        else say('');
      };
      render();
      if (err) say(err === 'young' ? `That X account is too new. Bloomshire needs an X account at least ${r.task.minDays} days old.` : XERR[err] ?? XERR.x, true);
    }

    stopWatch = watchWallets((w) => { wallets = w; if (!busy && !taskOn) draw(); });
    // (back from X: the step resumes, the ticket in the address)
    { const q = new URLSearchParams(location.search); if (q.get('xdoor')) showTask(q.get('xdoor'), q.get('xerr')); else if (q.get('xerr')) say(XERR[q.get('xerr')] ?? XERR.x, true); }
  });
}

/** The loading bar, on the same night as the door. */
export function loadingScreen() {
  const f = frame();
  f.card.remove();
  const bar = el('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Loading Bloomshire', 'aria-valuemin': '0', 'aria-valuemax': '100' }, el('i'));
  f.root.append(bar);
  const fill = bar.firstChild;
  return {
    progress: (done, all) => { const p = all ? Math.round((100 * done) / all) : 0; fill.style.width = `${p}%`; bar.setAttribute('aria-valuenow', String(p)); },
    close: () => { f.root.style.transition = 'opacity .4s ease'; f.root.style.opacity = '0'; setTimeout(() => f.close(), 420); },
  };
}
