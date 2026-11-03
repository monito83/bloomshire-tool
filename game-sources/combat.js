// combat.js -- WHAT THE WEAPONS DO, AND THE ENEMIES THAT FIGHT BACK.
//
// The bow looses an arrow and the healing staff a bolt, each toward where you
// aim (the cursor, else the way you face); they fly until they hit something
// solid, an enemy, or their range runs out, and burst with the pack's own impact
// frames. The sword strikes what is in reach in front of you. A weapon hits by
// its rarity (rules.js WEAPON_RARITY), and never wears.
//
// THE ENEMIES (the designer's Final Rules, 2026-09-24; rules.js ENEMIES):
//   * NEUTRAL ones mind their business until hit -- then they fight, and back
//     off when badly hurt
//   * HOSTILE and ELITE ones NOTICE you within their range, COME at you, ATTACK
//     within reach every so often (a lunge or a blow, or a shot -- an arrow, a
//     spit, a thrown bomb), FLINCH when hit, and DIE -- or RETREAT below their
//     retreat line -- and lose interest when you get well away
//   * PASSIVE creatures are the living world (ambient.js), not enemies
//   * THE TOWN IS SAFE: nothing is ever set down on a safe place (rules.js
//     isSafePlace); a wilderness map's zone tagged `spawn:<enemy>` (or
//     `spawn:<enemy>:<how many>`) sets its enemies down there
// A blow that reaches you is Play's to settle (health, grace, a collapse):
// env.hurtHero(damage, from).
//
// THE UNDEAD (2026-10-02, the Barrowmire): what they bring, each switched on by its own definition (rules.js ENEMIES),
// so every enemy before them is as it was --
//   * steady: a blow does not knock it back nor break its tell (the death knight, the golem); armor: a share of every
//     blow turned aside
//   * shot 'curse': a green bolt (the pack's Magic.png green row), larger, glowing; volley: several in a fan; homing:
//     it turns after you; castFrom: where on the body it leaves (the staff's head), by facing
//   * summon: every so many attacks it raises its own (the lich's thralls) -- they crumble when it dies and pay nothing
//   * slam.leap false: a stomp where it stands (the golem), not a leap
//   * ambush: it lies in the ground until you come near, then rises (the skeletons)
//   * art.anim.windup / rise: their own frames for the tell and the rising; art.eyes: its eyes in the dark; mid: how
//     high its body is (where blows and arrows meet it); cues: its own sounds; art.deathS: its remains linger
//   * ground: water stops it (it walks the land only)

import { ARROW, BOLT, SWORD, ENEMIES, isSafePlace } from './rules.js';

const ARROWS = 'Character/Character/Others/Arrow/Arrow.png';    // rows: down, up, right; cols 0-7 the materials, 8-11 the impact
const MAGIC = 'Character/Character/Others/Arrow/Magic.png';     // the blue bolt: rows 0-2 (down, up, right), cols 0-1 flight, 2-5 burst
const SPIT = 'Enemy/Spike/projectile/Green.png';                // a lobbed spit: 10 cells of 32 x 48, the last four its splash
const ROWS = ['down', 'up', 'right', 'left'];
const RISE_S = 0.8;                                              // the rising out of the ground (an ambusher, a thrall)
const PRACTICE = ['slime', 'blue_slime', 'pink_slime', 'golden_slime', 'purple_slime', 'black_slime'];
// the enemies' shots: speed (px/s) and how far they go at most
const HOSTILE_SHOT = { arrow: { speed: 150, range: 140 }, spit: { speed: 110, range: 120 }, bomb: { speed: 95, range: 110 }, curse: { speed: 105, range: 175 } };
const CURSE_ROW = 6;                                             // Magic.png: the green bolt, facing right (cols 0-1 flight, 2-5 burst)
// where a cave spider's eyes are in its 64 px cell, by facing (measured on the sheets; from behind none show)
const EYES = { down: [[29, 33], [34, 33]], left: [[20, 28], [21, 31]], right: [[42, 27], [42, 31]] };

export class Combat {
  /** @param env { image(path), solid(x,y), cue(name, opts), hurtHero(damage, from) (optional), doc (the map, for spawn zones),
   *               killed(enemy) (optional: what a kill pays is the server's), shake(seconds) (optional: the screen) } */
  constructor(env) { this.env = env; this.shots = []; this.bursts = []; this.enemies = []; this.practice = 0; }

  /** Loose a shot from (x, y) toward (tx, ty). kind: 'arrow' | 'bolt'; tier 1-10 picks the arrow's material;
   *  mult: the weapon's rarity. onHit(enemy): asked when the shot reaches an enemy -- the energy is spent then
   *  (the designer, 2026-09-28: a weapon costs energy only when it hits); false, and the shot does no harm. */
  shoot(kind, x, y, tx, ty, tier = 3, { mult = 1, onHit = null } = {}) {
    const a = Math.atan2(ty - y, tx - x), spec = kind === 'arrow' ? ARROW : BOLT;
    this.shots.push({ kind, x, y, a, vx: Math.cos(a) * spec.speed, vy: Math.sin(a) * spec.speed, left: spec.range, damage: spec.damage * mult,
      col: Math.min(7, Math.floor((tier - 1) * 0.8)), t: 0, onHit });
  }

  /** The enemies a sword stroke from (x, y) the way you face would reach -- nobody is hurt. */
  inReach(x, y, facing) {
    const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[facing];
    const cx = x + v[0] * 12, cy = y + v[1] * 10 - 4;
    return this.enemies.filter((e) => !e.dead && !e.buried && !(e.rise > 0) && Math.hypot(e.x - cx, e.y - (e.def.mid ?? 6) - cy) < SWORD.reach + (e.def.radius ?? 9) - 9);
  }

  /** A sword stroke from (x, y) the way you face: the nearest enemy within reach in front takes the blow -- ONE
   *  (the designer, 2026-10-04: "a sword hit is a single hit ... it is not an area of effect hit"; the rules count it
   *  so, commands.js swing). */
  strike(x, y, facing, mult = 1) {
    const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[facing];
    const hit = this.inReach(x, y, facing).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, 1);
    for (const e of hit) this.hurt(e, SWORD.damage * mult, v[0], v[1]);
    return hit.length;
  }

  /** Set an enemy down: spawn(type, x, y) -- or spawn(x, y), the editor's practice slime (G), a colour each time. */
  spawn(a, b, c) {
    const [type, x, y] = typeof a === 'string' ? [a, b, c] : [PRACTICE[this.practice++ % PRACTICE.length], a, b];
    const def = ENEMIES[type];
    if (!def) return null;
    const e = { type, def, x, y, homeX: x, homeY: y, hp: def.hp, facing: 'down', t: 0, state: 'idle', next: Math.random(), vx: 0, vy: 0,
      hitT: 9, kx: 0, ky: 0, cool: 0.6, angry: 0, chasing: false, fleeing: 0, attackT: -1, dead: false, attacks: 0, z: 0,
      buried: !!def.ambush, rise: 0 };
    this.enemies.push(e);
    return e;
  }

  /** A map's spawn zones -- never on a safe place (the town and its buildings). Returns how many were set down. */
  spawnZones(doc) {
    if (!doc || isSafePlace(doc)) return 0;
    let n = 0;
    for (const z of doc.zones ?? []) for (const tag of z.tags ?? []) {
      const m = /^spawn:([a-z_]+)(?::(\d+))?$/.exec(tag);
      if (!m || !ENEMIES[m[1]]) continue;
      for (let k = 0; k < Math.min(12, +(m[2] ?? 1)); k++) {
        for (let tries = 0; tries < 12; tries++) {
          const x = z.x + 8 + Math.random() * Math.max(1, z.w - 16), y = z.y + 8 + Math.random() * Math.max(1, z.h - 16);
          if (!this.blocks(ENEMIES[m[1]], x, y)) { this.spawn(m[1], x, y); n++; break; }
        }
      }
    }
    return n;
  }

  hurt(e, dmg, kx, ky) {
    if (e.dead || e.buried) return;
    e.hp -= dmg * (1 - (e.def.armor ?? 0)); e.hitT = 0;
    // (a blow lands: it breaks the enemy's tell or its lunge -- hit first and it never strikes -- and knocks it back;
    //  the golden slime's leap is not stopped, nor anything steady)
    if (!e.slam && !e.def.steady) { e.attackT = -1; e.struck = false; if (!e.def.stationary) { e.kx = kx * 55; e.ky = ky * 55; } }
    e.angry = 12;                                                    // a neutral one fights back for a while
    e.chasing = true;
    this.env.cue?.('hit', { at: { x: e.x, y: e.y } });
    this.rally(e);
    if (e.hp <= 0) {
      e.dead = true; e.t = 0; e.z = 0; this.env.cue?.(e.def.cues?.death ?? 'slimeSplat', { at: { x: e.x, y: e.y } });
      // (its thralls crumble with it, and pay nothing: they were never the map's)
      for (const o of this.enemies) if (o.master === e && !o.dead) { o.dead = true; o.t = 0; o.z = 0; }
      if (!e.master) this.env.killed?.(e);
      return;
    }
    if (e.def.retreatAt && e.hp <= e.def.hp * e.def.retreatAt) e.fleeing = 3;       // badly hurt: it backs off
  }

  /** ONE FIGHTS, ITS KIND JOIN IN (2026-09-30, the tougher enemies): the others within its `pack` reach are roused --
   *  a neutral one of the same kind grows angry, a hostile one comes for you. */
  rally(e) {
    const r = e.def.pack ?? 0;
    if (!r) return;
    for (const o of this.enemies) {
      if (o === e || o.dead || o.def.stationary || Math.hypot(o.x - e.x, o.y - e.y) > r) continue;
      if (o.def.behavior !== 'neutral' || o.def === e.def) { o.angry = Math.max(o.angry, 12); o.chasing = true; }
    }
  }

  /** The tell's length: the golden slime's leap has its own. */
  windupOf(e) { return e.slam ? e.def.slam.windup : e.def.windup ?? 0.35; }

  endAttack(e) {
    e.attackT = -1; e.struck = false; e.slam = false; e.from = null; e.z = 0; e.attacks++;
    e.cool = e.def.cooldown * (0.8 + Math.random() * 0.4);
  }

  /** Does this one mean to fight you now? */
  hostileNow(e) { return e.def.behavior === 'hostile' || e.def.behavior === 'elite' || (e.def.behavior === 'neutral' && e.angry > 0); }

  update(dt, hero) {
    this.updateShots(dt, hero);
    // (a big map: one far off and not after you only keeps time -- 2026-10-02, the Barrowmire's crowds)
    for (const e of this.enemies) {
      if (hero && !e.chasing && !e.dead && e.attackT < 0 && (Math.abs(e.x - hero.x) > 420 || Math.abs(e.y - hero.y) > 300)) { e.t += dt; e.cool -= dt; continue; }
      this.think(e, dt, hero);
    }
    this.enemies = this.enemies.filter((e) => !(e.dead && e.t > (e.def.art?.deathS ?? 0.9)));
  }

  updateShots(dt, hero) {
    for (const s of this.shots) {
      s.t += dt;
      const step = Math.hypot(s.vx, s.vy) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.left -= step;
      if (s.hostile) {
        // (a homing one turns after you, a little at a time)
        if (s.homing && hero) {
          const want = Math.atan2(hero.y - 8 - s.y, hero.x - s.x);
          let da = ((want - s.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          da = Math.max(-s.homing * dt, Math.min(s.homing * dt, da));
          s.a += da; const sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(s.a) * sp; s.vy = Math.sin(s.a) * sp;
        }
        // an enemy's shot: it hits you, or a wall, or lands (a bomb bursts where it lands)
        const hitYou = hero && Math.hypot(hero.x - s.x, hero.y - 8 - s.y) < 8;
        if (s.kind === 'bomb') {
          if (s.left <= 0 || hitYou || this.env.solid(s.x, s.y + 6)) {
            s.done = true;
            if (hero && Math.hypot(hero.x - s.x, hero.y - 8 - s.y) < (s.blast ?? 20)) this.env.hurtHero?.(s.damage, s.from);
            this.bursts.push({ kind: 'bomb', x: s.x, y: s.y, a: 0, t: 0 }); this.env.cue?.('rockBreak', { at: { x: s.x, y: s.y } });
          }
        } else if (hitYou) { s.done = true; this.env.hurtHero?.(s.damage, s.from); this.bursts.push({ kind: s.kind, x: s.x, y: s.y, a: s.a, col: 0, t: 0 }); }
        else if (this.env.solid(s.x, s.y + 6) || s.left <= 0) { s.done = true; this.bursts.push({ kind: s.kind, x: s.x, y: s.y, a: s.a, col: 0, t: 0 }); }
        continue;
      }
      const hitE = this.enemies.find((e) => !e.dead && !e.buried && !(e.rise > 0) && Math.hypot(e.x - s.x, e.y - (e.def.mid ?? 7) - s.y) < (e.def.radius ?? 9));
      if (hitE) { if (!s.onHit || s.onHit(hitE)) this.hurt(hitE, s.damage, Math.cos(s.a), Math.sin(s.a)); s.done = true; }
      else if (this.env.solid(s.x, s.y + 6) || s.left <= 0) s.done = true;
      if (s.done) { this.bursts.push({ kind: s.kind, x: s.x, y: s.y, a: s.a, col: s.col, t: 0 }); if (!hitE) this.env.cue?.('arrowHit', { at: { x: s.x, y: s.y } }); }
    }
    this.shots = this.shots.filter((s) => !s.done);
    for (const b of this.bursts) b.t += dt;
    this.bursts = this.bursts.filter((b) => b.t < 0.36);
  }

  /** One enemy's moment: flinch, flee, fight or wander. */
  think(e, dt, hero) {
    const def = e.def;
    e.t += dt; e.hitT += dt; e.cool -= dt; e.angry = Math.max(0, e.angry - dt); e.fleeing = Math.max(0, e.fleeing - dt);
    if (e.dead) return;
    // AN AMBUSH: in the ground until you come near -- then it rises (and only then can it be struck)
    if (e.buried) {
      if (hero && Math.hypot(hero.x - e.x, hero.y - e.y) < def.notice * 0.7) {
        e.buried = false; e.rise = RISE_S; this.env.cue?.(def.cues?.rise ?? 'rockBreak', { at: { x: e.x, y: e.y } });
      }
      return;
    }
    if (e.rise > 0) { if ((e.rise -= dt) <= 0) { e.rise = 0; e.chasing = true; e.cool = Math.min(e.cool, 0.3); this.rally(e); } return; }
    if (e.hitT < 0.25 && !def.steady) {                   // knocked back, flinching
      const nx = e.x + e.kx * dt, ny = e.y + e.ky * dt;
      if (!def.stationary && !this.env.solid(nx, ny)) { e.x = nx; e.y = ny; }
      return;
    }
    const dx = hero ? hero.x - e.x : 0, dy = hero ? hero.y - e.y : 0, d = hero ? Math.hypot(dx, dy) : Infinity;
    // AN ATTACK (2026-09-30, the tougher enemies): the TELL -- it stops and flashes for its `windup` -- then the
    // blow: a lunge at where you stood when the tell ended (step aside and it misses), a shot, or the golden slime's
    // leap onto that spot; then a moment to recover
    if (e.attackT >= 0) {
      e.attackT += dt; e.state = 'attack';
      const W = this.windupOf(e);
      if (e.attackT < W) { if (hero) e.aim = { x: hero.x, y: hero.y }; return; }
      if (e.slam) { this.slamStep(e, hero, W); return; }
      const t = e.attackT - W, lunge = !def.stationary && !def.shot;
      if (lunge && t < 0.2 && e.aim) {
        const ax = e.aim.x - e.x, ay = e.aim.y - e.y, ad = Math.hypot(ax, ay) || 1;
        if (ad > 3) { const nx = e.x + (ax / ad) * def.speed * 3.4 * dt, ny = e.y + (ay / ad) * def.speed * 3.4 * dt; if (!this.env.solid(nx, ny)) { e.x = nx; e.y = ny; } }
      }
      if (t >= (lunge ? 0.2 : 0) && !e.struck) {
        e.struck = true;
        // (a summoner raises its own every so many attacks, instead of the blow)
        if (def.summon && e.attacks % def.summon.every === def.summon.every - 1) this.summon(e, def.summon);
        else if (def.shot) this.enemyShot(e, hero);
        else if (hero && Math.hypot(hero.x - e.x, hero.y - e.y) <= def.reach + 6) this.env.hurtHero?.(def.damage, e);
      }
      if (t >= 0.5) this.endAttack(e);
      return;
    }
    // badly hurt: it backs away from you
    if (e.fleeing > 0 && !def.stationary && hero) {
      this.move(e, -dx / (d || 1), -dy / (d || 1), def.speed * 1.2, dt); e.state = 'walk'; e.chasing = false;
      return;
    }
    const fights = hero && this.hostileNow(e);
    if (fights && (d < def.notice || (e.chasing && d < def.notice * 1.8))) {
      if (!e.chasing) { this.env.cue?.(def.cues?.notice ?? 'slime', { at: { x: e.x, y: e.y } }); e.chasing = true; this.rally(e); }       // it has noticed you
      e.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      // (the golden slime: every so many attacks, a leap from further off)
      const slamDue = !!def.slam && e.attacks % def.slam.every === def.slam.every - 1;
      const slamReach = def.slam ? def.slam.radius * (def.slam.leap === false ? 0.9 : 2.6) : 0;
      if (e.cool <= 0 && (slamDue ? d < slamReach : d <= def.reach)) { e.attackT = 0; e.struck = false; e.slam = slamDue; e.aim = { x: hero.x, y: hero.y }; return; }
      if (def.stationary) { e.state = 'idle'; return; }
      // a shooter keeps its distance; the rest close in -- at a run while you are far
      const want = def.shot ? def.reach * 0.7 : def.reach * 0.8;
      if (d > want) { this.move(e, dx / d, dy / d, def.speed * (d > def.reach * 3 ? 1.15 : 1), dt); e.state = 'walk'; }
      else if (def.shot && d < want * 0.6) { this.move(e, -dx / d, -dy / d, def.speed * 0.7, dt); e.state = 'walk'; }
      else e.state = 'idle';
      return;
    }
    e.chasing = false;
    if (def.stationary) { e.state = 'idle'; return; }
    // wandering about its home
    if ((e.next -= dt) <= 0) {
      e.next = 0.9 + Math.random() * 1.2;
      const home = Math.hypot(e.homeX - e.x, e.homeY - e.y);
      const a = home > 48 ? Math.atan2(e.homeY - e.y, e.homeX - e.x) : Math.random() * Math.PI * 2;
      e.vx = Math.cos(a) * def.speed * 0.45; e.vy = Math.sin(a) * def.speed * 0.45; e.state = Math.random() < 0.55 ? 'walk' : 'idle';
    }
    if (e.state === 'walk') this.move(e, e.vx, e.vy, 1, dt);
  }

  /** THE GOLDEN SLIME'S LEAP (`slam`): up and onto the spot it marked in its tell, then down -- everything within its
   *  radius is hurt, the ground shakes -- and a moment before it moves again. */
  slamStep(e, hero, W) {
    const s = e.def.slam, stomp = s.leap === false, t = e.attackT - W, LEAP = stomp ? 0.12 : 0.42;
    e.from ??= { x: e.x, y: e.y };
    const a = stomp ? e.from : e.aim ?? e.from, p = Math.min(1, t / LEAP);
    if (p < 1) {
      const nx = e.from.x + (a.x - e.from.x) * p, ny = e.from.y + (a.y - e.from.y) * p;
      if (!this.blocks(e.def, nx, ny)) { e.x = nx; e.y = ny; }
      e.z = stomp ? 0 : Math.sin(Math.PI * p) * 20;
      return;
    }
    if (!e.struck) {
      e.struck = true; e.z = 0;
      if (hero && Math.hypot(hero.x - e.x, hero.y - 4 - e.y) <= s.radius) this.env.hurtHero?.(s.damage, e);
      this.bursts.push({ kind: 'slam', x: e.x, y: e.y, r: s.radius, a: 0, t: 0 });
      this.env.cue?.('rockBreak', { at: { x: e.x, y: e.y } });
      this.env.shake?.(0.35);
    }
    if (t >= LEAP + 0.45) this.endAttack(e);
  }

  /** Is (x, y) closed to this kind? Walls for all; water too for the land-bound (`ground`). */
  blocks(def, x, y) { return def?.ground && this.env.walk ? this.env.walk(x, y) : this.env.solid(x, y); }

  move(e, ux, uy, speed, dt) {
    const nx = e.x + ux * speed * dt, ny = e.y + uy * speed * dt;
    if (!this.blocks(e.def, nx, ny)) { e.x = nx; e.y = ny; }
    else if (!this.blocks(e.def, nx, e.y)) e.x = nx;
    else if (!this.blocks(e.def, e.x, ny)) e.y = ny;
    if (Math.abs(ux) + Math.abs(uy) > 0.01) e.facing = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? 'right' : 'left') : (uy > 0 ? 'down' : 'up');
  }

  /** An enemy's shot at you: an arrow, a spit, or a bomb that bursts where it lands. */
  enemyShot(e, hero) {
    if (!hero) return;
    const def = e.def, spec = HOSTILE_SHOT[def.shot] ?? HOSTILE_SHOT.arrow;
    const off = def.castFrom?.[e.facing] ?? [0, -(def.mid ?? 10)];
    const sx = e.x + off[0], sy = e.y + off[1], tx = hero.x, ty = hero.y - 8;
    const a0 = Math.atan2(ty - sy, tx - sx), dist = Math.hypot(tx - sx, ty - sy);
    const n = def.volley?.n ?? 1, spread = def.volley?.spread ?? 0;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * spread;
      this.shots.push({ kind: def.shot, hostile: true, from: e, x: sx, y: sy, a, vx: Math.cos(a) * spec.speed, vy: Math.sin(a) * spec.speed,
        left: def.shot === 'bomb' ? Math.min(spec.range, dist) : spec.range, damage: def.damage, blast: def.blast, col: def.shotCol ?? 0, t: 0,
        homing: def.homing ?? 0 });
    }
    this.env.cue?.(def.cues?.shot ?? (def.shot === 'arrow' ? 'bowShot' : def.shot === 'curse' ? 'magicCast' : 'throw'), { at: { x: e.x, y: e.y } });
  }

  /** A SUMMONER'S THRALLS: up to `most` of its own at once, rising round it; they crumble when it dies. */
  summon(e, S) {
    const mine = this.enemies.filter((o) => o.master === e && !o.dead).length;
    for (let k = 0; k < Math.min(S.n, S.most - mine); k++) {
      for (let t = 0; t < 10; t++) {
        const a = Math.random() * Math.PI * 2, x = e.x + Math.cos(a) * 26, y = e.y + Math.sin(a) * 18;
        if (this.blocks(ENEMIES[S.kind], x, y)) continue;
        const m = this.spawn(S.kind, x, y);
        if (m) { m.master = e; m.buried = false; m.rise = RISE_S; m.angry = 12; m.chasing = true; }
        break;
      }
    }
    this.env.cue?.(e.def.cues?.summon ?? 'magicCast', { at: { x: e.x, y: e.y } });
    this.bursts.push({ kind: 'summon', x: e.x, y: e.y, r: 30, a: 0, t: 0 });
  }

  /** The enemies, to be drawn among the objects by where they stand: each in its own animation. */
  movers(rect = null) {
    const near = (e) => !rect || (e.x > rect.x0 - 96 && e.x < rect.x1 + 96 && e.y > rect.y0 - 64 && e.y < rect.y1 + 128);
    return this.enemies.filter((e) => !e.buried && near(e)).map((e) => ({ y: e.y, draw: (g) => {
      const art = e.def.art;
      const W = this.windupOf(e), telling = !e.dead && e.attackT >= 0 && e.attackT < W;
      const rising = !e.dead && e.rise > 0 && art.anim.rise;
      const what = e.dead ? 'dead' : rising ? 'rise' : e.hitT < 0.3 && !e.def.steady ? 'hurt' : telling ? (art.anim.windup ? 'windup' : 'idle')
        : e.state === 'attack' ? 'attack' : e.state === 'walk' ? 'walk' : e.hitT < 0.3 ? 'hurt' : 'idle';
      // (the caves' own art, 2026-09-30: a sheet's frames may start at a column, and a death have a row of its own)
      const [file, frames, col0 = 0, fixedRow = null] = art.anim[what] ?? art.anim.idle;
      const rec = this.env.image(`${art.dir}/${file}.png`); if (rec.state !== 'ok') return;
      const col = e.dead ? Math.min(frames - 1, Math.floor(e.t * 6))
        : what === 'rise' ? Math.min(frames - 1, Math.floor((1 - e.rise / RISE_S) * frames))
        : what === 'windup' ? Math.min(frames - 1, Math.floor((e.attackT / W) * frames))
        : what === 'hurt' ? Math.min(frames - 1, Math.floor(e.hitT * 10))
        : what === 'attack' ? Math.min(frames - 1, Math.floor(Math.max(0, e.attackT - W) / 0.5 * frames))
        : Math.floor(e.t * (telling ? 16 : 7)) % frames;
      const c = art.cell, sc = art.scale ?? 1, dw = Math.round(c * sc), z = Math.round(e.z ?? 0);
      const row = fixedRow ?? (art.rows === 4 ? Math.max(0, (art.order ?? ROWS).indexOf(e.facing)) : 0), sx = (col0 + col) * c;
      if (z > 0) { g.fillStyle = 'rgba(0, 0, 0, 0.28)'; g.beginPath(); g.ellipse(Math.round(e.x), Math.round(e.y) + 2, 7 - z * 0.12, 2.5, 0, 0, Math.PI * 2); g.fill(); }
      const dx = Math.round(e.x - dw / 2) + (telling && Math.floor(e.attackT * 30) % 2 ? 1 : 0), dy = Math.round(e.y - (art.foot ?? c - 6) * sc) - z;
      g.drawImage(rec.img, sx, row * c, c, c, dx, dy, dw, dw);
      // (the tell: it flashes, quicker as the blow nears; a blow that lands on it: a white flash)
      const flash = e.hitT < 0.12 ? (e.def.steady ? 0.5 : 0.85) : telling && !art.anim.windup && Math.floor(e.attackT * (e.attackT > W * 0.6 ? 20 : 10)) % 2 ? 0.5 : 0;
      if (flash) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = flash; g.drawImage(rec.img, sx, row * c, c, c, dx, dy, dw, dw); g.restore(); }
      // its health, once it has been hurt (an elite's whenever it fights)
      if (!e.dead && (e.hp < e.def.hp || (e.def.behavior === 'elite' && e.chasing))) {
        const bw = e.def.behavior === 'elite' ? 24 : 14, bx = Math.round(e.x - bw / 2), by = Math.round(e.y - (art.tall ?? c * 0.72) * sc) - z;
        g.fillStyle = 'rgba(20, 10, 16, 0.75)'; g.fillRect(bx - 1, by - 1, bw + 2, 4);
        g.fillStyle = e.def.behavior === 'elite' ? '#ffcf4a' : '#e2483c'; g.fillRect(bx, by, Math.max(1, Math.round(bw * Math.max(0, e.hp) / e.def.hp)), 2);
      }
    } }));
  }

  /**
   * EYES IN THE DARK (2026-09-30, the designer: the caves "much, much darker -- a creepier place"): over a cave's
   * shade, a spider out beyond your lantern shows only its eyes -- two glints where its head is (none from behind),
   * blinking now and then: red, green for a poisoner, orange for one that burns. `from`: the player.
   */
  drawEyes(g, from, t) {
    for (const e of this.enemies) {
      const art = e.def.art;
      const own = art?.eyes?.[e.facing];
      if (e.dead || e.buried || (!own && (art?.dir !== 'spider' || e.facing === 'up'))) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y), a = Math.min(1, Math.max(0, (d - 44) / 56));
      if (!a || (t + e.next * 7) % 4.3 < 0.14) continue;                 // (in the light you see it whole; a blink)
      const sc = art.scale ?? 1, x0 = e.x - (art.cell * sc) / 2, y0 = e.y - (art.foot ?? art.cell - 6) * sc - (e.z ?? 0);
      const pts = own ?? EYES[e.facing] ?? EYES.down, fx = e.def.effect?.kind;
      g.globalAlpha = 0.9 * a;
      g.fillStyle = art?.eyeColor ?? (fx === 'poison' ? '#a6ff5c' : fx === 'burn' ? '#ffb13b' : '#ff3d33');
      const s = sc >= 1 ? 2 : 1;
      for (const [ex, ey] of pts) g.fillRect(Math.round(x0 + ex * sc), Math.round(y0 + ey * sc), s, s);
    }
    g.globalAlpha = 1;
  }

  /** Over everything: shots in the air, and their bursts. */
  drawAir(g) {
    const arrows = this.env.image(ARROWS), magic = this.env.image(MAGIC), spit = this.env.image(SPIT);
    for (const s of this.shots) {
      if (s.kind === 'bomb') {                          // the pack draws no bomb in flight: a small round one, fuse lit
        g.fillStyle = '#1b1b24'; g.beginPath(); g.arc(Math.round(s.x), Math.round(s.y), 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = Math.floor(s.t * 12) % 2 ? '#ffcd59' : '#ff6b3d'; g.fillRect(Math.round(s.x) + 1, Math.round(s.y) - 5, 2, 2);
        continue;
      }
      if (s.kind === 'spit') { if (spit.state === 'ok') g.drawImage(spit.img, 32, 0, 32, 16, Math.round(s.x) - 16, Math.round(s.y) - 8, 32, 16); continue; }
      if (s.kind === 'curse') {                         // a green curse: the pack's green bolt, larger, in its own glow
        const r = 9 + Math.sin(s.t * 18) * 1.5;
        const gl = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        gl.addColorStop(0, 'rgba(170, 255, 190, 0.55)'); gl.addColorStop(1, 'rgba(60, 200, 110, 0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(s.x - r, s.y - r, r * 2, r * 2); g.restore();
        if (magic.state !== 'ok') continue;
        g.save(); g.translate(Math.round(s.x), Math.round(s.y)); g.rotate(s.a);
        g.drawImage(magic.img, (Math.floor(s.t * 12) % 2) * 16, CURSE_ROW * 16, 16, 16, -12, -12, 24, 24);
        g.restore();
        continue;
      }
      const sheet = s.kind === 'arrow' ? arrows : magic; if (sheet.state !== 'ok') continue;
      const col = s.kind === 'arrow' ? s.col : Math.floor(s.t * 12) % 2;
      g.save(); g.translate(Math.round(s.x), Math.round(s.y)); g.rotate(s.a);
      g.drawImage(sheet.img, col * 16, 2 * 16, 16, 16, -8, -8, 16, 16);      // the right-facing row, turned to the flight
      g.restore();
    }
    for (const b of this.bursts) {
      if (b.kind === 'slam') {
        const p = b.t / 0.36;
        g.save(); g.globalAlpha = 0.8 * (1 - p); g.strokeStyle = '#ffe7a3'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(Math.round(b.x), Math.round(b.y), b.r * (0.4 + 0.6 * p), b.r * (0.4 + 0.6 * p) * 0.45, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
        continue;
      }
      if (b.kind === 'summon') {                        // the ground opens round a summoner: a green ring
        const p = b.t / 0.36;
        g.save(); g.globalAlpha = 0.85 * (1 - p); g.strokeStyle = '#7dff9f'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(Math.round(b.x), Math.round(b.y), b.r * (0.3 + 0.7 * p), b.r * (0.3 + 0.7 * p) * 0.45, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
        continue;
      }
      if (b.kind === 'curse') {
        if (magic.state !== 'ok') continue;
        const k = Math.min(3, Math.floor(b.t / 0.08));
        g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.a);
        g.drawImage(magic.img, (2 + k) * 16, CURSE_ROW * 16, 16, 16, -12, -12, 24, 24);
        g.restore();
        continue;
      }
      if (b.kind === 'bomb') {
        const r = 4 + b.t * 50;
        g.fillStyle = `rgba(255, 170, 60, ${Math.max(0, 0.7 - b.t * 2)})`; g.beginPath(); g.arc(Math.round(b.x), Math.round(b.y), r, 0, Math.PI * 2); g.fill();
        continue;
      }
      if (b.kind === 'spit') { if (spit.state === 'ok') g.drawImage(spit.img, (6 + Math.min(3, Math.floor(b.t / 0.09))) * 32, 16, 32, 32, Math.round(b.x) - 16, Math.round(b.y) - 20, 32, 32); continue; }
      const sheet = b.kind === 'arrow' ? arrows : magic; if (sheet.state !== 'ok') continue;
      const k = Math.min(3, Math.floor(b.t / 0.08)), col = (b.kind === 'arrow' ? 8 : 2) + k;
      g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.rotate(b.a);
      g.drawImage(sheet.img, col * 16, 2 * 16, 16, 16, -8, -8, 16, 16);
      g.restore();
    }
  }

  /** Ask for every picture the fights may show (the practice slimes, the shots). */
  preload() {
    const files = new Set([ARROWS, MAGIC, SPIT]);
    // the practice slimes, and every kind set down on this map (and whatever they summon): no picture pops in late
    const kinds = new Set([...PRACTICE, ...this.enemies.map((e) => e.type)]);
    for (const k of [...kinds]) if (ENEMIES[k]?.summon) kinds.add(ENEMIES[k].summon.kind);
    for (const t of kinds) if (ENEMIES[t]) for (const [f] of Object.values(ENEMIES[t].art.anim)) files.add(`${ENEMIES[t].art.dir}/${f}.png`);
    for (const p of files) this.env.image(p);
  }
}
