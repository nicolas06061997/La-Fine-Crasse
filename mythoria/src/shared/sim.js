// MYTHORIA — simulation des combats « Les Failles ».
// Une île flottante ovale. Chaque camp a UN Sanctuaire. Au centre, le Cœur de Mythe :
// le camp qui le contrôle gagne de l'éther plus vite et remplit sa jauge d'Éveil (sortilège).
// Les héros sont invoqués au hasard sur un Cercle d'Invocation (5 places), fusionnés (★2, ★3)
// puis envoyés sur l'île. Ils combattent tout seuls.
//
// Déterministe : même graine + mêmes commandes = même combat (base de l'anti-triche en ligne).
// Pas de Math.sin/cos/random ici : seulement + - * / et sqrt.

import { HERO, SPELL, RARITIES, STAR_MULT, STAR_SIZE, MAX_STAR, levelMult, deckSynergies } from './content.js';

export const W = 16, H = 24, CX = 8, CY = 12, RX = 7.6, RY = 11.6;
export const TICK_RATE = 20, DT = 1 / TICK_RATE;
export const MATCH_TIME = 180, DOUBLE_AT = 120, OVERTIME = 60;
export const MANA_MAX = 10, MANA_START = 4, MANA_REGEN = 2.0; // secondes par point
export const SUMMON_COST = 2, BENCH = 5, EVEIL_TIME = 35;
export const HEART = { x: CX, y: CY, r: 2.6, rate: 0.45 };
export const SANCT = { hp: 12000, dmg: 100, hit: 0.85, range: 6.5, r: 1.7, splash: 1.0, y: [21.8, 2.2] };
const DEPLOY_TIME = 1.0, SIGHT = 5.5;

const sq = x => x * x;
const dist = (a, b) => Math.sqrt(sq(a.x - b.x) + sq(a.y - b.y));

// ---- hasard reproductible stocké dans l'état ----
function rnd(s) {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function inIsland(x, y, margin = 0) {
  return sq((x - CX) / (RX - margin)) + sq((y - CY) / (RY - margin)) <= 1;
}
function clampIsland(e) {
  const dx = (e.x - CX) / RX, dy = (e.y - CY) / RY, d = Math.sqrt(dx * dx + dy * dy);
  const lim = 1 - e.r / RX * 0.6;
  if (d > lim) { e.x = CX + dx / d * lim * RX; e.y = CY + dy / d * lim * RY; }
}

export function createBattle({ seed = 1, decks, spells = ['meteore', 'meteore'], levels = [{}, {}], names = ['Joueur 1', 'Joueur 2'], mode = 'duel', boss = null, waves = null, mods = null, bonus = null }) {
  const s = {
    tick: 0, t: 0, seed, rng: (seed >>> 0) || 1, nextId: 1, ents: [], proj: [], pend: [], ev: [],
    over: false, winner: -1, reason: '', overtime: false, mode, mods: mods || {}, wave: 0, waveT: 6, wavesDef: waves,
    heart: { ctl: 0, owner: -1 },
    players: [0, 1].map(p => ({
      name: names[p], mana: MANA_START, eveil: 0, bench: Array(BENCH).fill(null), deck: decks[p].slice(),
      spell: spells[p] || 'meteore', levels: levels[p] || {}, syn: deckSynergies(decks[p]).tiers, summons: 0, deployed: 0, fuses: 0, spells: 0, hearts: 0,
      bonus: (p === 0 && bonus) || { hp: 1, sanctDmg: 1, eveil: 1 },
    })),
  };
  for (const p of [0, 1]) {
    s.ents.push({ id: s.nextId++, p, kind: 'sanct', x: CX, y: SANCT.y[p], px: CX, py: SANCT.y[p], hp: SANCT.hp, maxHp: SANCT.hp, invuln: mode === 'survival' && p === 1,
      dmg: Math.round(SANCT.dmg * s.players[p].bonus.sanctDmg), hit: SANCT.hit, cd: 0, range: SANCT.range, r: SANCT.r, tgt: 'any', proj: 'bolt', splash: SANCT.splash, star: 1, shield: 0, frozen: 0, slowT: 0, dead: false });
  }
  // Chaque camp commence avec 2 héros sur son cercle.
  for (const p of [0, 1]) for (let k = 0; k < 2; k++) summonHero(s, p);
  if (boss) spawnBoss(s, 1, boss, CX, 6.2);
  s.ev = [];
  return s;
}

export const sanctOf = (s, p) => s.ents.find(e => e.kind === 'sanct' && e.p === p);

// ---------- Validation (anti-triche) ----------
export function deployOk(p, x, y) {
  if (!inIsland(x, y, 0.4)) return false;
  return p === 0 ? y >= CY + 0.8 : y <= CY - 0.8;
}

export function check(s, cm) {
  if (s.over) return 'Le combat est terminé.';
  const P = s.players[cm.p];
  if (!P) return 'Joueur inconnu.';
  switch (cm.t) {
    case 'summon':
      if (P.mana + 1e-9 < SUMMON_COST) return 'Pas assez d’éther.';
      if (!P.bench.includes(null)) return 'Cercle d’invocation plein.';
      return null;
    case 'merge': {
      const a = P.bench[cm.a], b = P.bench[cm.b];
      if (cm.a === cm.b || !a || !b) return 'Fusion impossible.';
      if (a.id !== b.id || a.star !== b.star) return 'Il faut deux héros identiques de même rang.';
      if (b.star >= MAX_STAR) return 'Rang maximum atteint.';
      return null;
    }
    case 'deploy': {
      const h = P.bench[cm.slot];
      if (!h) return 'Aucun héros ici.';
      if (!(cm.x >= 0 && cm.x <= W && cm.y >= 0 && cm.y <= H)) return 'Hors de l’île.';
      if (!deployOk(cm.p, cm.x, cm.y)) return 'Pose tes héros sur ta moitié de l’île.';
      return null;
    }
    case 'spell':
      if (P.eveil < 100 - 1e-6) return 'Jauge d’Éveil pas encore pleine.';
      if (!inIsland(cm.x, cm.y)) return 'Vise l’île.';
      return null;
  }
  return 'Commande inconnue.';
}

// ---------- Invocation ----------
function summonHero(s, p) {
  const P = s.players[p];
  const slot = P.bench.indexOf(null);
  if (slot < 0) return;
  let tot = 0;
  for (const id of P.deck) tot += RARITIES[HERO[id].rar].weight;
  let r = rnd(s) * tot, pick = P.deck[0];
  for (const id of P.deck) { r -= RARITIES[HERO[id].rar].weight; if (r <= 0) { pick = id; break; } }
  P.bench[slot] = { id: pick, star: s.mods.startStar || 1 };
  P.summons++;
  s.ev.push({ type: 'summon', p, slot, id: pick });
}

function apply(s, cm) {
  const P = s.players[cm.p];
  if (cm.t === 'summon') { P.mana -= SUMMON_COST; summonHero(s, cm.p); }
  else if (cm.t === 'merge') {
    P.bench[cm.b].star++; P.bench[cm.a] = null; P.fuses++;
    s.ev.push({ type: 'benchFuse', p: cm.p, slot: cm.b, star: P.bench[cm.b].star, id: P.bench[cm.b].id });
  } else if (cm.t === 'deploy') {
    const h = P.bench[cm.slot]; P.bench[cm.slot] = null; P.deployed++;
    deployHero(s, cm.p, h, cm.x, cm.y);
  } else if (cm.t === 'spell') {
    P.eveil = 0; P.spells++;
    const c = SPELL[P.spell];
    s.ev.push({ type: 'cast', p: cm.p, spell: P.spell, x: cm.x, y: cm.y, delay: c.delay || 0 });
    const n = c.strikes || 1;
    for (let k = 0; k < n; k++) s.pend.push({ at: s.tick + Math.round(((c.delay || 0) + k * 0.45) * TICK_RATE), p: cm.p, spell: P.spell, x: cm.x, y: cm.y, k });
  }
}

// ---------- Héros sur l'île ----------
function mults(s, p, c) {
  const t = s.players[p].syn[c.fac] || 0;
  return {
    hp: c.fac === 'aube' ? [1, 1.08, 1.15][t] : 1,
    dmg: c.fac === 'arcane' ? [1, 1.08, 1.16][t] : 1,
    regen: c.fac === 'sylve' ? [0, 0.012, 0.025][t] : 0,
    atk: c.fac === 'braise' ? [1, 1.07, 1.14][t] : 1,
    slow: c.fac === 'givre' ? [0, 0.15, 0.25][t] : 0,
    steal: c.fac === 'ombre' ? [0, 0.08, 0.15][t] : 0,
  };
}

function applyStats(s, e) {
  const c = HERO[e.card], m = mults(s, e.p, c), lv = levelMult(e.lvl), st = STAR_MULT[e.star];
  e.maxHp = Math.round(c.hp * m.hp * lv * st * (e.bossHp ? 1 : s.players[e.p].bonus.hp));
  if (e.bossHp) e.maxHp = e.bossHp;
  e.dmg = e.bossDmg || Math.round(c.dmg * m.dmg * lv * st);
  e.hit = c.hit / m.atk;
  e.regen = m.regen;
  e.slowOn = Math.max(c.slow || 0, m.slow);
  e.steal = (c.lifesteal || 0) + m.steal;
  e.r = e.bossR || c.r * STAR_SIZE[e.star];
}

function spawn(s, p, id, x, y, star = 1, lvl = 1, deploy = DEPLOY_TIME) {
  const c = HERO[id];
  const e = {
    id: s.nextId++, p, kind: c.type === 'building' ? 'building' : 'unit', card: id, lvl, star,
    x, y, px: x, py: y, hp: 0, maxHp: 0, cd: 0.3, spd: c.spd || 0, range: c.range, tgt: c.tgt,
    fly: !!c.fly, splash: c.splash || 0, proj: c.proj || null, shield: c.shield || 0, frozen: 0, slowT: 0,
    deploy, target: 0, retarget: 0, dead: false, life: c.life || 0,
    sumT: c.summon ? c.summon.every : 0, novaT: c.nova ? c.nova.every : 0,
    dashReady: !!c.dash, chargeReady: !!c.charge, moving: false, atkAnim: 0, faceX: 0, faceY: p === 0 ? -1 : 1,
  };
  applyStats(s, e);
  e.hp = e.maxHp;
  s.ents.push(e);
  return e;
}

function deployHero(s, p, h, x, y) {
  const c = HERO[h.id], lvl = s.players[p].levels[h.id] || 1;
  s.ev.push({ type: 'deploy', p, card: h.id, star: h.star, x, y });
  // Fusion sur l'île : poser un héros sur un héros identique de même rang.
  if (c.count === 1) {
    const twin = s.ents.find(e => !e.dead && e.p === p && e.card === h.id && e.star === h.star && e.star < MAX_STAR && dist(e, { x, y }) <= 1.6);
    if (twin) {
      twin.star++; applyStats(s, twin); twin.hp = twin.maxHp; s.players[p].fuses++;
      s.ev.push({ type: 'fuse', id: twin.id, star: twin.star, x: twin.x, y: twin.y });
      return;
    }
  }
  const n = c.count || 1;
  for (let k = 0; k < n; k++) {
    let ox = 0, oy = 0;
    if (n === 2) ox = k ? 0.5 : -0.5;
    if (n === 3) { ox = [-0.6, 0.6, 0][k]; oy = [0.3, 0.3, -0.5][k]; }
    if (n === 4) { ox = [-0.5, 0.5, -0.5, 0.5][k]; oy = [0.4, 0.4, -0.4, -0.4][k]; }
    const e = spawn(s, p, h.id, x + ox, y + oy, h.star, lvl);
    clampIsland(e);
  }
}

// ---------- Dégâts ----------
function damage(s, t, amount, src) {
  if (t.dead || amount <= 0 || t.invuln) return;
  if (t.fly && src && src.proj) amount *= 1.35; // les tirs à distance sont efficaces contre les volants
  amount = Math.round(amount);
  if (t.shield > 0) {
    const a = Math.min(t.shield, amount);
    t.shield -= a; amount -= a;
    if (t.shield <= 0) s.ev.push({ type: 'shieldBreak', id: t.id });
  }
  t.hp -= amount;
  s.ev.push({ type: 'hit', id: t.id, x: t.x, y: t.y, amount });
  if (src && src.steal && src.hp > 0) src.hp = Math.min(src.maxHp, src.hp + amount * src.steal);
  if (src && src.slowOn && t.kind === 'unit') t.slowT = Math.max(t.slowT, 2), t.slowK = Math.max(t.slowK || 0, src.slowOn);
  if (t.hp <= 0) kill(s, t);
}

function kill(s, t) {
  if (t.dead) return;
  t.dead = true; t.hp = 0;
  s.ev.push({ type: 'die', id: t.id, kind: t.kind, card: t.card, p: t.p, x: t.x, y: t.y });
  if (t.kind === 'sanct') return finish(s, 1 - t.p, s.mode === 'survival' ? 'survival' : 'sanct');
  if (t.boss) s.ev.push({ type: 'bossDown', id: t.id, x: t.x, y: t.y });
  const c = t.card && HERO[t.card];
  if (c && c.death) for (let k = 0; k < c.death.n; k++) { const e = spawn(s, t.p, c.death.id, t.x + (k ? 0.55 : -0.55), t.y, 1, t.lvl, 0.3); clampIsland(e); }
}

function areaDamage(s, p, x, y, radius, dmg, sanctPct, src) {
  for (const e of s.ents) {
    if (e.dead || e.p === p) continue;
    if (dist(e, { x, y }) <= radius + e.r * 0.5) damage(s, e, e.kind === 'sanct' ? dmg * sanctPct : dmg, src);
  }
}

function finish(s, winner, reason) {
  if (s.over) return;
  s.over = true; s.winner = winner; s.reason = reason;
  s.ev.push({ type: 'end', winner, reason });
}

// ---------- Ciblage ----------
function canTarget(e, t) {
  if (t.dead || t.p === e.p) return false;
  if (e.tgt === 'buildings') return t.kind !== 'unit';
  if (e.tgt === 'ground' && t.fly) return false;
  return true;
}
const gap = (a, b) => dist(a, b) - a.r - b.r;

function acquire(s, e) {
  let best = null, bd = Infinity;
  const isStatic = e.kind !== 'unit';
  const sight = isStatic ? e.range : Math.max(SIGHT, e.range + 1);
  for (const t of s.ents) {
    if (!canTarget(e, t)) continue;
    const d = gap(e, t);
    if (d <= sight && d < bd) { bd = d; best = t; }
  }
  if (!best && !isStatic) {
    for (const t of s.ents) {
      if (t.dead || t.p === e.p || t.kind === 'unit') continue;
      const d = dist(e, t);
      if (d < bd) { bd = d; best = t; }
    }
  }
  return best;
}

function attack(s, e, t) {
  const c = e.card ? HERO[e.card] : null;
  e.atkAnim = 0.35;
  let dmg = e.dmg;
  if (e.bonus) { dmg *= 2; e.bonus = false; }
  s.ev.push({ type: 'attack', id: e.id, tid: t.id, x: e.x, y: e.y, tx: t.x, ty: t.y });
  if (c && c.kamikaze) {
    areaDamage(s, e.p, t.x, t.y, 0.9, dmg, 1, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: 0.9, kind: 'fire' });
    kill(s, e);
    return;
  }
  if (c && c.chain) {
    const pts = [{ x: e.x, y: e.y }], hit = new Set();
    let cur = t, d = dmg;
    for (let k = 0; k < c.chain && cur; k++) {
      damage(s, cur, d, e); hit.add(cur.id); pts.push({ x: cur.x, y: cur.y });
      d *= 0.75;
      let nb = null, nd = 2.6;
      for (const o of s.ents) if (!hit.has(o.id) && canTarget(e, o)) { const dd = dist(cur, o); if (dd < nd) { nd = dd; nb = o; } }
      cur = nb;
    }
    s.ev.push({ type: 'zap', pts });
    return;
  }
  if (e.proj) {
    if (c && c.multi) {
      // Volée : jusqu'à `multi` cibles différentes à portée
      const others = s.ents.filter(o => o !== t && canTarget(e, o) && gap(e, o) <= e.range).sort((a, b) => dist(e, a) - dist(e, b)).slice(0, c.multi - 1);
      for (const o of others) s.proj.push({ x: e.x, y: e.y, tid: o.id, tx: o.x, ty: o.y, spd: 13, dmg, splash: 0, p: e.p, kind: e.proj, src: e.id, fly: e.fly, id: s.nextId++ });
    }
    s.proj.push({ x: e.x, y: e.y, tid: t.id, tx: t.x, ty: t.y, spd: e.proj === 'fire' ? 8 : e.proj === 'arrow' ? 13 : 10,
      dmg, splash: e.splash, p: e.p, kind: e.proj, src: e.id, fly: e.fly, id: s.nextId++ });
    return;
  }
  if (e.splash) { areaDamage(s, e.p, t.x, t.y, e.splash, dmg, 1, e); s.ev.push({ type: 'cleave', x: t.x, y: t.y, r: e.splash, kind: c ? c.fac : '' }); }
  else damage(s, t, dmg, e);
}

// ---------- Boucle d'un tick ----------
export function step(s, cmds = []) {
  if (s.over) return s;
  s.ev = [];
  for (const cm of cmds) {
    const err = check(s, cm);
    if (err) { s.ev.push({ type: 'reject', p: cm.p, err }); continue; }
    apply(s, cm);
  }
  const dt = DT;
  updateHeart(s, dt);
  if (s.mode === 'survival') waveTick(s, dt);
  for (const [p, P] of s.players.entries()) {
    const bonus = s.heart.owner === p ? 1.35 : 1;
    P.mana = Math.min(MANA_MAX, P.mana + (s.t >= DOUBLE_AT && s.mode !== 'survival' ? 2 : 1) * bonus * (s.mods.mana || 1) / MANA_REGEN * dt);
    P.eveil = Math.min(100, P.eveil + 100 / EVEIL_TIME * (s.heart.owner === p ? 1.6 : 1) * (s.mods.eveil || 1) * P.bonus.eveil * dt);
  }
  for (const sp of s.pend) if (sp.at <= s.tick) castSpell(s, sp);
  s.pend = s.pend.filter(sp => sp.at > s.tick);

  for (const e of s.ents) { e.px = e.x; e.py = e.y; e.moving = false; }

  for (const e of s.ents) {
    if (e.dead) continue;
    if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowK = 0; }
    if (e.deploy > 0) { e.deploy -= dt; if (e.deploy <= 0) onLand(s, e); continue; }
    const c = e.card ? HERO[e.card] : null;
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.kind === 'building' && e.life) { e.hp -= e.maxHp / e.life * dt; if (e.hp <= 0) { kill(s, e); continue; } }
    if (c && c.aura) for (const o of s.ents) if (!o.dead && o.p === e.p && o.kind === 'unit' && o !== e && dist(o, e) <= c.aura.radius) o.hp = Math.min(o.maxHp, o.hp + c.aura.heal * STAR_MULT[e.star] * dt);
    if (c && c.summon) {
      e.sumT -= dt;
      if (e.sumT <= 0) {
        e.sumT = c.summon.every;
        for (let k = 0; k < c.summon.n; k++) { const m = spawn(s, e.p, c.summon.id, e.x + (k ? 0.7 : -0.7), e.y + (e.p === 0 ? 0.5 : -0.5), 1, e.lvl, 0.6); clampIsland(m); }
        s.ev.push({ type: 'conjure', id: e.id, x: e.x, y: e.y, fac: c.fac });
      }
    }
    if (c && c.nova) {
      e.novaT -= dt;
      if (e.novaT <= 0) {
        let any = false;
        for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= c.nova.radius) any = true;
        if (any) {
          e.novaT = c.nova.every;
          for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= c.nova.radius) o.frozen = Math.max(o.frozen, c.nova.freeze);
          s.ev.push({ type: 'nova', id: e.id, x: e.x, y: e.y, r: c.nova.radius });
        } else e.novaT = 0.5;
      }
    }

    if (e.boss) bossTick(s, e, dt);
    let t = e.target ? s.ents.find(o => o.id === e.target) : null;
    e.retarget -= dt;
    if (!t || t.dead || !canTarget(e, t) || e.retarget <= 0 || (e.kind !== 'unit' && gap(e, t) > e.range)) {
      t = acquire(s, e); e.retarget = 0.25; e.target = t ? t.id : 0;
    }
    if (e.cd > 0) e.cd -= dt * (e.slowK ? 1 - e.slowK : 1);
    if (!t) continue;
    const dx = t.x - e.x, dy = t.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    e.faceX = dx / dd; e.faceY = dy / dd;
    const g = gap(e, t);
    if (g <= e.range) {
      if (e.chargeReady) { e.chargeReady = false; e.bonus = true; }
      if (e.cd <= 0) { attack(s, e, t); e.cd = e.hit; }
    } else if (e.kind === 'unit') {
      if (e.dashReady && c.dash && g <= c.dash && g > 1.2) {
        const k = (dd - e.r - t.r - 0.3) / dd;
        s.ev.push({ type: 'dash', id: e.id, x0: e.x, y0: e.y, x1: e.x + dx * k, y1: e.y + dy * k });
        e.x += dx * k; e.y += dy * k; e.dashReady = false; e.bonus = true; e.cd = 0;
        continue;
      }
      const sp = e.spd * (e.slowK ? 1 - e.slowK : 1) * (e.chargeReady && dd < 6 ? 1.8 : 1);
      const stp = Math.min(dd, sp * dt);
      e.x += dx / dd * stp; e.y += dy / dd * stp; e.moving = true;
    }
  }

  updateProjectiles(s, dt);
  separate(s);
  s.ents = s.ents.filter(e => !e.dead || e.kind === 'sanct');
  s.tick++;
  s.t = s.tick * DT;
  checkTime(s);
  return s;
}

function updateHeart(s, dt) {
  let a = 0, b = 0;
  for (const e of s.ents) if (!e.dead && e.kind === 'unit' && !e.fly && e.deploy <= 0 && dist(e, HEART) <= HEART.r) { if (e.p === 0) a++; else b++; }
  const H0 = s.heart, before = H0.owner;
  if (a && !b) H0.ctl = Math.min(1, H0.ctl + HEART.rate * dt);
  else if (b && !a) H0.ctl = Math.max(-1, H0.ctl - HEART.rate * dt);
  if (H0.ctl >= 0.999) H0.owner = 0;
  else if (H0.ctl <= -0.999) H0.owner = 1;
  else if ((H0.owner === 0 && H0.ctl <= 0) || (H0.owner === 1 && H0.ctl >= 0)) H0.owner = -1;
  if (H0.owner !== before) { s.ev.push({ type: 'heart', owner: H0.owner }); if (H0.owner >= 0) s.players[H0.owner].hearts++; }
}

function onLand(s, e) {
  const c = HERO[e.card];
  s.ev.push({ type: 'land', id: e.id, x: e.x, y: e.y });
  if (c && c.roar) {
    areaDamage(s, e.p, e.x, e.y, c.roar.radius, c.roar.dmg * STAR_MULT[e.star], 0.3, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: c.roar.radius, kind: 'roar' });
  }
}

function castSpell(s, sp) {
  const c = SPELL[sp.spell], lv = 1, m = { dmg: 1 };
  let x = sp.x, y = sp.y;
  if (c.strikes) { const o = [[0, 0], [-1, 0.8], [1, -0.7]][sp.k % 3]; x += o[0]; y += o[1]; }
  s.ev.push({ type: 'spell', spell: sp.spell, fx: c.fx, x, y, r: c.strikes ? c.radius * 0.6 : c.radius, p: sp.p });
  const r = c.strikes ? c.radius * 0.6 : c.radius;
  if (c.dmg) areaDamage(s, sp.p, x, y, r, sp.bossDmg || c.dmg * m.dmg * lv, c.sanctPct || 0.3, null);
  if (c.freeze) for (const e of s.ents) if (!e.dead && e.p !== sp.p && dist(e, { x, y }) <= r + e.r * 0.5) e.frozen = Math.max(e.frozen, c.freeze);
  if (c.heal) for (const e of s.ents) if (!e.dead && e.p === sp.p && e.kind !== 'sanct' && dist(e, { x, y }) <= r + e.r * 0.5) {
    e.hp = Math.min(e.maxHp, e.hp + c.heal * lv); e.shield += Math.round(c.shieldAdd * lv);
  }
}

function updateProjectiles(s, dt) {
  for (const pr of s.proj) {
    const t = s.ents.find(o => o.id === pr.tid && !o.dead);
    if (t) { pr.tx = t.x; pr.ty = t.y; }
    const dx = pr.tx - pr.x, dy = pr.ty - pr.y, d = Math.sqrt(dx * dx + dy * dy), stp = pr.spd * dt;
    if (d <= stp + 0.15) {
      pr.done = true;
      const src = s.ents.find(o => o.id === pr.src) || { p: pr.p };
      if (pr.splash) { areaDamage(s, pr.p, pr.tx, pr.ty, pr.splash, pr.dmg, 1, src); s.ev.push({ type: 'boom', x: pr.tx, y: pr.ty, r: pr.splash, kind: pr.kind }); }
      else if (t) damage(s, t, pr.dmg, src);
      s.ev.push({ type: 'impact', x: pr.tx, y: pr.ty, kind: pr.kind });
    } else { pr.x += dx / d * stp; pr.y += dy / d * stp; }
  }
  s.proj = s.proj.filter(p => !p.done);
}

function separate(s) {
  const L = s.ents.filter(e => !e.dead);
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (a.fly !== b.fly) continue;
      const am = a.kind === 'unit' && a.deploy <= 0, bm = b.kind === 'unit' && b.deploy <= 0;
      if (!am && !bm) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = (a.r + b.r) * 0.9;
      if (d2 >= min * min) continue;
      let d = Math.sqrt(d2), nx = 1, ny = 0;
      if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = a.id % 2 ? 1 : -1; d = 0; }
      const push = min - d;
      if (am && bm) { a.x -= nx * push / 2; a.y -= ny * push / 2; b.x += nx * push / 2; b.y += ny * push / 2; }
      else if (am) { a.x -= nx * push; a.y -= ny * push; }
      else { b.x += nx * push; b.y += ny * push; }
    }
  }
  for (const e of L) if (e.kind === 'unit') clampIsland(e);
}

const ratio = (s, p) => { const e = sanctOf(s, p); return Math.max(0, e.hp) / e.maxHp; };
function checkTime(s) {
  if (s.over || s.mode === 'survival') return;
  const a = ratio(s, 0), b = ratio(s, 1);
  if (s.t >= MATCH_TIME && !s.overtime) {
    if (Math.abs(a - b) >= 0.01) return finish(s, a > b ? 0 : 1, 'time');
    s.overtime = true; s.ev.push({ type: 'overtime' });
  }
  if (s.overtime && Math.abs(a - b) >= 0.01) return finish(s, a > b ? 0 : 1, 'overtime');
  if (s.t >= MATCH_TIME + OVERTIME) finish(s, -1, 'draw');
}

export function timeLeft(s) { return s.overtime ? MATCH_TIME + OVERTIME - s.t : MATCH_TIME - s.t; }

export function hashState(s) {
  let h = 2166136261;
  const add = n => { h ^= Math.round(n * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
  add(s.tick);
  for (const e of s.ents) { add(e.id); add(e.x); add(e.y); add(e.hp); }
  for (const P of s.players) { add(P.mana); add(P.eveil); for (const b of P.bench) add(b ? b.star * 7 + b.id.length : 0); }
  return h.toString(16);
}

// ---------- Boss (campagne) ----------
// def : { base (héros servant de modèle), name, hp, dmg, hit, range, spd, r, scale, skills: [{ k, every, ... }] }
export function spawnBoss(s, p, def, x, y) {
  const e = spawn(s, p, def.base, x, y, 1, 1, 2.0);
  e.boss = def; e.bossHp = def.hp; e.bossDmg = def.dmg; e.bossR = def.r || 1.1;
  e.hit = def.hit || 1.6; e.spd = def.spd || 0.7; e.range = def.range || 1.3; e.tgt = def.tgt || 'any'; e.splash = def.splash || 1.4;
  e.fly = !!def.fly; e.proj = def.proj || null;
  applyStats(s, e); e.hp = e.maxHp; e.hit = def.hit || 1.6; e.range = def.range || 1.3;
  e.skillT = (def.skills || []).map(k => k.every * 0.6);
  s.ev.push({ type: 'boss', id: e.id, name: def.name });
  return e;
}
function bossTick(s, e, dt) {
  const def = e.boss;
  (def.skills || []).forEach((k, i) => {
    e.skillT[i] -= dt;
    if (e.skillT[i] > 0) return;
    e.skillT[i] = k.every;
    if (k.k === 'slam') { areaDamage(s, e.p, e.x, e.y, k.r || 3, k.dmg, 0.25, e); s.ev.push({ type: 'bossSkill', k: 'slam', id: e.id, x: e.x, y: e.y, r: k.r || 3 }); }
    else if (k.k === 'summon') { for (let n = 0; n < (k.n || 2); n++) { const m = spawn(s, e.p, k.id, e.x + (n % 2 ? 1 : -1) * (0.8 + n * 0.3), e.y + 0.8, 1, k.lvl || 1, 0.6); clampIsland(m); } s.ev.push({ type: 'bossSkill', k: 'summon', id: e.id, x: e.x, y: e.y }); }
    else if (k.k === 'freeze') { for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= (k.r || 3.5)) o.frozen = Math.max(o.frozen, k.t || 2); s.ev.push({ type: 'bossSkill', k: 'freeze', id: e.id, x: e.x, y: e.y, r: k.r || 3.5 }); }
    else if (k.k === 'heal') { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (k.pct || 0.08)); s.ev.push({ type: 'bossSkill', k: 'heal', id: e.id, x: e.x, y: e.y }); }
    else if (k.k === 'fire') { const tgt = s.ents.filter(o => !o.dead && o.p !== e.p && o.kind !== 'sanct'); const t = tgt.length ? tgt[Math.floor(rnd(s) * tgt.length)] : sanctOf(s, 1 - e.p); s.pend.push({ at: s.tick + 20, p: e.p, spell: 'meteore', x: t.x, y: t.y, k: 0, bossDmg: k.dmg }); s.ev.push({ type: 'cast', p: e.p, spell: 'meteore', x: t.x, y: t.y, delay: 1 }); }
  });
  if (!e.raged && e.hp < e.maxHp * 0.5) { e.raged = true; e.hit *= 0.7; e.spd *= 1.25; s.ev.push({ type: 'bossSkill', k: 'rage', id: e.id, x: e.x, y: e.y }); }
}

// ---------- Survie : vagues de monstres ----------
// wavesDef : { pool: [ids], boss: (n) => def | null, lvl: base }
function waveTick(s, dt) {
  s.waveT -= dt;
  const alive = s.ents.some(e => !e.dead && e.p === 1 && e.kind === 'unit');
  if (!alive && s.waveT > 4) s.waveT = 4; // vague vaincue : la suivante arrive vite
  if (s.waveT > 0) return;
  s.wave++;
  const W = s.wavesDef || { pool: ['squelette', 'pousse'], lvl: 1 };
  const n = Math.min(14, 2 + Math.floor(s.wave * 1.3)), lvl = (W.lvl || 1) + Math.floor(s.wave / 3);
  for (let k = 0; k < n; k++) {
    const id = W.pool[Math.floor(rnd(s) * W.pool.length)];
    const e = spawn(s, 1, id, 3 + rnd(s) * 10, 2.5 + rnd(s) * 3.5, s.wave >= 8 && rnd(s) < 0.25 ? 2 : 1, lvl, 1.0);
    clampIsland(e);
  }
  if (s.wave % 5 === 0 && W.bosses) { const d = W.bosses[(s.wave / 5 - 1) % W.bosses.length]; spawnBoss(s, 1, { ...d, hp: Math.round(d.hp * (0.6 + s.wave * 0.08)) }, CX, 4); }
  s.waveT = 26;
  s.ev.push({ type: 'wave', n: s.wave });
}
