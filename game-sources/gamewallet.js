// gamewallet.js -- THE PLAYER'S BLOOMSHIRE WALLET (2026-09-30): an ordinary Ethereum wallet, made in the player's own
// browser and kept there, for everything the game does with crypto -- Averyn Shards in and out, swaps, sending and
// receiving -- without another wallet's pop-ups. Sign-in stays with the player's own wallet.
//
// NON-CUSTODIAL, ON THIS DEVICE ONLY (the designer, 2026-09-30):
//   * the key is made here (ONE account, its private key -- no recovery words since 2026-10-03, the designer: "seed
//     phrase is a riskier thing"; wallets made before keep their words inside, unused), and LOCKED WITH THE PLAYER'S
//     PASSWORD before it is kept (ethers' keystore: scrypt, AES). What this browser keeps is that locked copy and the
//     address -- nothing that opens it.
//   * it is UNLOCKED FOR ONE ACTION AT A TIME (a send, a swap, the key shown): the password each time, the key held
//     only while that action runs, never written anywhere, never sent anywhere, never logged.
//   * on another device the player RESTORES it from its private key. Nobody can recover a lost password AND a lost key
//     -- the game says so plainly, and asks for the key back (or its last 6 characters) before the wallet is kept.
//   * the server keeps only the ADDRESS, linked to the account by a signature (server/gamewallet.js): the Shards it
//     deposits are that farmer's.
// Reads (balances, prices) go to the chain's public RPC; sends are signed here and handed to that RPC.

import { chainRead, chainDirect, relayAsk } from './walletapp.js';
import { ROBINHOOD_UNISWAP } from './cryptopay.js';

const STORE = (account) => `bloomshire.gameWallet.${account}`;
/** The shortest password the wallet takes. */
export const MIN_PASSWORD = 8;
let lib = null;
/** ethers (js/vendor, VENDOR.md), loaded when the wallet is first opened. */
export const ethersLib = () => (lib ??= import('../vendor/ethers-6.17.0.min.js').then((m) => m.ethers).catch((e) => { lib = null; throw e; }));

/** The message the wallet signs to be linked to the account (server/gamewallet.js linkMessage: exactly this). */
export const linkMessage = (accountId, address, time) =>
  `Bloomshire wallet\nThis wallet belongs to my Bloomshire account.\nAccount: ${accountId}\nWallet: ${String(address).toLowerCase()}\nTime: ${time}`;

/** The wallet kept on this device for this account: { address, keystore, made } -- or null. */
export function kept(account) {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(STORE(account)) ?? 'null'); } catch { return null; }
  return r && /^0x[0-9a-fA-F]{40}$/.test(r.address ?? '') && typeof r.keystore === 'string' ? r : null;
}

/** A brand-new wallet, not kept yet: ONE account and its private key, no recovery words (2026-10-03): { wallet, key }. */
export async function freshKey() {
  const ethers = await ethersLib();
  const wallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
  return { wallet, key: wallet.privateKey };
}

/** The wallet a private key makes (an account imported into MetaMask by its key has no words: MetaMask can show its key,
 *  "Account details", "Show private key") -- or throws, in words. */
export async function fromKey(text) {
  const ethers = await ethersLib();
  let k = String(text ?? '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(k)) k = `0x${k}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) throw new Error('That is not a private key: 64 letters and numbers (0-9 and a-f), as your wallet shows it.');
  try { return new ethers.Wallet(k); } catch { throw new Error('That private key does not make a wallet. Copy it again from your wallet.'); }
}

/** How good a password is, in words (null: good enough). */
export function passwordProblem(password, again) {
  const p = String(password ?? '');
  if (p.length < MIN_PASSWORD) return `At least ${MIN_PASSWORD} letters, numbers or signs.`;
  if (/^(.)\1+$/.test(p) || /^(?:0123456789|12345678|password|qwertyui)/i.test(p)) return 'That one is too easy to guess.';
  if (again !== undefined && p !== again) return 'The two passwords are not the same.';
  return null;
}

/** LOCK the wallet with the password and keep it on this device (`progress(0..1)` while it locks). The record. */
export async function keep(account, wallet, password, progress = () => {}) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const keystore = await wallet.encrypt(password, progress);
  localStorage.setItem(STORE(account), JSON.stringify({ address: wallet.address, keystore, made: new Date().toISOString() }));
  return kept(account);
}

/** UNLOCK it for one action: the wallet (with its words) -- or throws, in words. Nothing of it is kept. */
export async function unlock(account, password, progress = () => {}) {
  const r = kept(account);
  if (!r) throw new Error('There is no wallet on this device.');
  const ethers = await ethersLib();
  try { return await ethers.Wallet.fromEncryptedJson(r.keystore, String(password ?? ''), progress); }
  catch (e) { if (/incorrect password|invalid password/i.test(e?.message ?? '')) throw new Error('That password is not right.'); throw e; }
}

/** Take the wallet off this device (its words bring it back anywhere). */
export function forget(account) { try { localStorage.removeItem(STORE(account)); } catch { /* private mode */ } }

/** LINK it to the account: the wallet signs the link, the server checks it (server/gamewallet.js). { ok } or { ok: false, reason }. */
export async function link(accountId, wallet, api) {
  const time = new Date().toISOString();
  const signature = await wallet.signMessage(linkMessage(accountId, wallet.address, time));
  return api('api/wallet/link', { address: wallet.address, time, signature });
}

/** A failure, in the player's words. */
export function sayError(e) {
  const m = String(e?.shortMessage ?? e?.message ?? e ?? '');
  if (e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(m)) return 'Not enough ETH in the wallet for the network fee.';
  if (/whole Shards only/.test(m)) return 'Only whole Shards can be deposited.';
  if (/Too little received|Insufficient WETH9/i.test(m)) return 'The price moved while it was on its way. Nothing was spent: try again.';
  if (/nonce|replacement/i.test(m)) return 'The wallet is still sending the one before. Wait a moment, then try again.';
  if (/timeout|timed out/i.test(m)) return 'The chain is slow just now. If it was sent, it will still arrive.';
  if (/reverted|CALL_EXCEPTION/i.test(m)) return 'The chain refused it. Nothing was spent.';
  return m.replace(/\s*\(action=.*$/s, '').slice(0, 160) || 'That did not work.';
}

/**
 * SEND these transactions from the unlocked wallet, one after another (each waited for before the next): the
 * hashes -- or throws, in words (what was sent before stays sent). `step(text)` is told each step.
 */
export async function sendAll(wallet, chain, txs, step = () => {}) {
  const ethers = await ethersLib();
  // (no answers kept for a moment -- ethers' own cache would hand the second of two sends the first one's nonce: the
  //  nonce is read once, then counted)
  const provider = relayedProvider(ethers, chain);
  const signer = wallet.connect(provider);
  const hashes = [];
  try {
    let nonce = await provider.getTransactionCount(wallet.address, 'pending');
    for (const [k, tx] of txs.entries()) {
      step(txs.length > 1 ? `${k + 1} of ${txs.length}: ${tx.what === 'approval' ? 'allowing the swap' : 'sending'}` : 'Sending');
      const sent = await signer.sendTransaction({ to: tx.to, data: tx.data ?? '0x', value: tx.value ?? 0n, nonce: nonce++ });
      hashes.push(sent.hash);
      step('Waiting for the chain');
      const rc = await sent.wait(1, 180_000);
      if (!rc || rc.status !== 1) throw new Error('That transaction failed on the chain.');
    }
  } catch (e) { const err = new Error(sayError(e)); err.sent = hashes; throw err; }
  finally { provider.destroy?.(); }
  return hashes;
}

/** An ethers provider that asks the chain through the game (walletapp.js relayAsk), straight only when the game cannot
 *  pass a call on: the transaction it sends is the one signed here (2026-10-03, "Failed to fetch"). */
function relayedProvider(ethers, chain) {
  class Relayed extends ethers.JsonRpcProvider {
    async _send(payload) {
      const out = [];
      for (const p of Array.isArray(payload) ? payload : [payload]) {
        let j = await relayAsk(p.method, p.params ?? []);
        if (!j) { try { j = await chainDirect(chain.rpc, p.method, p.params ?? []); } catch (e) { j = { error: { code: -32603, message: e.message } }; } }
        out.push(j.error ? { id: p.id, jsonrpc: '2.0', error: j.error } : { id: p.id, jsonrpc: '2.0', result: j.result });
      }
      return out;
    }
  }
  return new Relayed(chain.rpc, Number(chain.id), { staticNetwork: true, cacheTimeout: -1, batchMaxCount: 1 });
}

/** What it costs, about, in ETH, to send these (the gas each would use at today's price): a bigint in wei, or null. */
export async function feeOf(chain, from, txs) {
  try {
    const price = BigInt(await chainRead(chain.rpc, 'eth_gasPrice', []));
    let gas = 0n;
    for (const tx of txs) {
      // (an approval not yet made: the purchase after it cannot be tried first -- counted at a usual swap's gas)
      if (tx.what === 'purchase' && txs.some((t) => t.what === 'approval')) { gas += 250_000n; continue; }
      gas += BigInt(await chainRead(chain.rpc, 'eth_estimateGas', [{ from, to: tx.to, data: tx.data ?? '0x', ...(tx.value ? { value: `0x${BigInt(tx.value).toString(16)}` } : {}) }]));
    }
    return (gas * price * 12n) / 10n;
  } catch { return null; }
}

/**
 * A send of a coin to an address: the transaction ({ to, data, value }, with `recipient` and `amount` for the words
 * around it) -- or throws, in words. Never to the token itself or to nowhere: those coins would be gone for good.
 */
export async function sendTx(q, coin, to, amount, decimals) {
  const ethers = await ethersLib();
  const text = String(to ?? '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) throw new Error('That is not a wallet address. It starts with 0x and has 40 letters and numbers after it.');
  // (written in capitals and small letters, an address carries its own check: a letter mistyped is caught here)
  if (/[a-f]/.test(text.slice(2)) && /[A-F]/.test(text.slice(2))) {
    try { ethers.getAddress(text); } catch { throw new Error('That address has a mistake in it: its capital letters do not match. Copy it again.'); }
  }
  const recipient = ethers.getAddress(text.toLowerCase());
  const token = coin === 'eth' ? null : coin === 'usdg' ? ROBINHOOD_UNISWAP.usdg : q.contract;
  if (/^0x0{40}$/.test(text) || (token && recipient.toLowerCase() === token.toLowerCase())) throw new Error('Nothing sent there could ever come back. Check the address.');
  let amountIn;
  try { amountIn = ethers.parseUnits(String(amount ?? '').trim(), decimals); } catch { throw new Error('How much?'); }
  if (amountIn <= 0n) throw new Error('How much?');
  if (!token) return { to: recipient, value: amountIn, what: 'send', recipient, amount: amountIn };
  const iface = new ethers.Interface(['function transfer(address to, uint256 value) returns (bool)']);
  return { to: token, data: iface.encodeFunctionData('transfer', [recipient, amountIn]), what: 'send', recipient, amount: amountIn };
}

/** The recent things this wallet sent, kept in this browser (a few, for the wallet's list). */
const HISTORY = (account) => `bloomshire.gameWallet.history.${account}`;
export function history(account) { try { return JSON.parse(localStorage.getItem(HISTORY(account)) ?? '[]'); } catch { return []; } }
export function remember(account, entry) {
  try { localStorage.setItem(HISTORY(account), JSON.stringify([{ ...entry, at: Date.now() }, ...history(account)].slice(0, 20))); } catch { /* private mode */ }
}
