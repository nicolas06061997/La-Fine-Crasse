// MYTHORIA — simulation des combats (moteur de règles).
// Déterministe : même graine + mêmes commandes = exactement le même combat.
// C'est ce qui permettra au serveur (phase 3) de rejouer et vérifier chaque combat (anti-triche).
// Pas de Math.sin/cos/random ici : seulement + - * / et sqrt, identiques partout.

import { CARD, STAR_MULT, STAR_SIZE, MAX_STAR, levelMult, deckSynergies } from './content.js';
import { makeRng, shuffle } from './rng.js';

export const W = 18, H = 32, RIVER = 16, BRIDGES = [3.5, 14.5];
export const TICK_RATE = 20, DT = 1 / TICK_RATE;
export const MATCH_TIME = 180, DOUBLE_AT = 120, OVERTIME = 60;
export const MANA_MAX = 10, MANA_START = 5, MANA_REGEN = 2.8; // secondes par point
const DEPLOY_TIME = 1.0, SIGHT = 5.5;

export const TOWERS = {
  side:    { hp: 1400, dmg: 52, hit: 0.8, range: 7, r: 1.0 },
  citadel: { hp: 2600, dmg: 64, hit: 1.0, range: 7, r: 1.4 },
};

const sq = x => x * x;
const dist = (a, b) => Math.sqrt(sq(a.x - b.x) + sq(a.y - b.y));
const side = y => (y < RIVER ? 1 : 0); // 0 = moitié du bas (joueur 0), 1 = moitié du haut

export function createBattle({ seed = 1, decks, levels = [{}, {}], names = ['Joueur 1', 'Joueur 2'] }) {
  const rng = makeRng(seed);
  const s = {
    tick: 0, t: 0, seed, rngState: 0, nextId: 1, ents: [], proj: [], pend: [], ev: [],
    over: false, winner: -1, reason: '', overtime: false,
    players: [0, 1].map(p => {
      const deck = shuffle(decks[p].slice(), rng);
      const syn = deckSynergies(decks[p]).tiers;
      return {
        name: names[p], mana: MANA_START, hand: deck.slice(0, 4), queue: deck.slice(4), crowns: 0,
        levels: levels[p] || {}, syn, played: 0, spent: 0,
      };
    }),
  };
  s.rngState = rng.state();
  for (const p of [0, 1]) {
    const y0 = p === 0 ? 25.5 : 6.5, yc = p === 0 ? 29 : 3;
    addTower(s, p, 'side', 3.5, y0, 0);
    addTower(s, p, 'side', 14.5, y0, 1);
    addTower(s, p, 'citadel', 9, yc, -1);
  }
  return s;
}

function addTower(s, p, sub, x, y, lane) {
  const T = TOWERS[sub];
  s.ents.push({ id: s.nextId++, p, kind: 'tower', sub, lane, x, y, px: x, py: y, hp: T.hp, maxHp: T.hp,
    dmg: T.dmg, hit: T.hit, cd: 0, range: T.range, r: T.r, tgt: 'any', proj: 'arrow', star: 1, shield: 0, frozen: 0, dead: false });
}

// ---------- Règles de déploiement ----------

export function towerAlive(s, p, lane) {
  return s.ents.some(e => e.kind === 'tower' && e.p === p && e.lane === lane && !e.dead);
}

// Zones où le joueur p peut poser une troupe : [x0, y0, x1, y1]
export function deployZones(s, p) {
  const z = [];
  if (p === 0) {
    z.push([0.5, 17.2, 17.5, 31.5]);
    if (!towerAlive(s, 1, 0)) z.push([0.5, 10, 9, 17.2]);
    if (!towerAlive(s, 1, 1)) z.push([9, 10, 17.5, 17.2]);
  } else {
    z.push([0.5, 0.5, 17.5, 14.8]);
    if (!towerAlive(s, 0, 0)) z.push([0.5, 14.8, 9, 22]);
    if (!towerAlive(s, 0, 1)) z.push([9, 14.8, 17.5, 22]);
  }
  return z;
}

export function canPlay(s, p, cardId, x, y) {
  if (s.over) return 'Le combat est terminé.';
  const P = s.players[p], c = CARD[cardId];
  if (!c || c.token) return 'Carte inconnue.';
  if (!P.hand.includes(cardId)) return 'Carte pas dans la main.';
  if (P.mana + 1e-9 < c.cost) return 'Pas assez d’éther.';
  if (!(x >= 0.3 && x <= W - 0.3 && y >= 0.3 && y <= H - 0.3)) return 'Hors de l’arène.';
  if (c.type !== 'spell' && !deployZones(s, p).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1))
    return 'Pose tes troupes dans ta zone.';
  return null;
}

// ---------- Création des unités ----------

function mults(s, p, c) {
  const syn = s.players[p].syn, t = syn[c.fac] || 0;
  return {
    hp: c.fac === 'aube' ? [1, 1.12, 1.25][t] : 1,
    dmg: c.fac === 'arcane' ? [1, 1.15, 1.3][t] : 1,
    regen: c.fac === 'sylve' ? [0, 0.02, 0.04][t] : 0,
    atk: c.fac === 'braise' ? [1, 1.12, 1.25][t] : 1,
  };
}

function applyStats(s, e) {
  const c = CARD[e.card], m = mults(s, e.p, c), lv = levelMult(e.lvl), st = STAR_MULT[e.star];
  e.maxHp = Math.round(c.hp * m.hp * lv * st);
  e.dmg = c.dmg ? Math.round(c.dmg * m.dmg * lv * st) : 0;
  e.hit = (c.hit || 1) / m.atk;
  e.regen = m.regen;
  e.r = (c.r || 0.5) * STAR_SIZE[e.star];
}

function spawn(s, p, cardId, x, y, lvl, deploy = DEPLOY_TIME) {
  const c = CARD[cardId];
  const e = {
    id: s.nextId++, p, kind: c.type === 'building' ? 'building' : 'unit', card: cardId, lvl: lvl || 1, star: 1,
    x, y, px: x, py: y, hp: 0, maxHp: 0, cd: 0.3, spd: c.spd || 0, range: c.range || 0, tgt: c.tgt || 'ground',
    fly: !!c.fly, splash: c.splash || 0, proj: c.proj || null, shield: c.shield || 0, frozen: 0,
    deploy, target: 0, retarget: 0, dead: false, life: c.life || 0, sumT: c.summon ? c.summon.every : 0,
    dashReady: !!c.dash, face: p === 0 ? -1 : 1, moving: false, atkAnim: 0,
  };
  applyStats(s, e);
  e.hp = e.maxHp;
  s.ents.push(e);
  return e;
}

function deploy(s, p, cardId, x, y) {
  const P = s.players[p], c = CARD[cardId];
  P.mana -= c.cost; P.spent += c.cost; P.played++;
  const i = P.hand.indexOf(cardId);
  P.queue.push(cardId);
  P.hand[i] = P.queue.shift();
  const lvl = P.levels[cardId] || 1;
  s.ev.push({ type: 'deploy', p, card: cardId, x, y });

  if (c.type === 'spell') {
    const at = s.tick + Math.round((c.delay || 0) * TICK_RATE);
    s.pend.push({ at, p, card: cardId, x, y, lvl });
    if (c.delay) s.ev.push({ type: 'incoming', p, card: cardId, x, y, delay: c.delay });
    return;
  }
  // Fusion : poser une troupe unique sur une troupe identique => elle monte d'une étoile.
  if (c.type === 'unit' && c.count === 1) {
    const twin = s.ents.find(e => !e.dead && e.p === p && e.card === cardId && e.star < MAX_STAR && dist(e, { x, y }) <= 1.6);
    if (twin) {
      twin.star++;
      applyStats(s, twin);
      twin.hp = twin.maxHp;
      s.ev.push({ type: 'fuse', id: twin.id, star: twin.star, x: twin.x, y: twin.y });
      return;
    }
  }
  const n = c.count || 1;
  for (let k = 0; k < n; k++) {
    let ox = 0, oy = 0;
    if (n === 2) ox = k ? 0.5 : -0.5;
    if (n === 3) { ox = [-0.6, 0.6, 0][k]; oy = [0.3, 0.3, -0.5][k]; }
    spawn(s, p, cardId, clampX(x + ox), y + oy, lvl);
  }
}

const clampX = x => Math.max(0.4, Math.min(W - 0.4, x));

// ---------- Dégâts ----------

function damage(s, t, amount, src) {
  if (t.dead || amount <= 0) return;
  amount = Math.round(amount);
  if (t.shield > 0) {
    const a = Math.min(t.shield, amount);
    t.shield -= a; amount -= a;
    if (t.shield <= 0) s.ev.push({ type: 'shieldBreak', id: t.id });
  }
  t.hp -= amount;
  s.ev.push({ type: 'hit', id: t.id, x: t.x, y: t.y, amount, src: src ? src.p : -1 });
  if (t.hp <= 0) kill(s, t);
}

function kill(s, t) {
  if (t.dead) return;
  t.dead = true; t.hp = 0;
  s.ev.push({ type: 'die', id: t.id, kind: t.kind, sub: t.sub, card: t.card, p: t.p, x: t.x, y: t.y });
  if (t.kind === 'tower') {
    const o = s.players[1 - t.p];
    if (t.sub === 'citadel') { o.crowns = 3; finish(s, 1 - t.p, 'citadel'); }
    else {
      o.crowns = Math.min(3, o.crowns + 1);
      if (s.overtime) finish(s, 1 - t.p, 'overtime');
    }
  }
  const c = t.card && CARD[t.card];
  if (c && c.death) for (let k = 0; k < c.death.n; k++) spawn(s, t.p, c.death.id, clampX(t.x + (k ? 0.5 : -0.5)), t.y, t.lvl, 0.3);
}

function areaDamage(s, p, x, y, radius, dmg, towerPct, src) {
  for (const e of s.ents) {
    if (e.dead || e.p === p) continue;
    if (dist(e, { x, y }) <= radius + e.r * 0.5) damage(s, e, e.kind === 'tower' ? dmg * towerPct : dmg, src);
  }
}

function finish(s, winner, reason) {
  if (s.over) return;
  s.over = true; s.winner = winner; s.reason = reason;
  s.ev.push({ type: 'end', winner, reason });
}

// ---------- Ciblage et déplacement ----------

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
    // Pas d'ennemi en vue : marcher vers le bâtiment ennemi le plus proche.
    for (const t of s.ents) {
      if (t.dead || t.p === e.p || t.kind === 'unit') continue;
      const d = dist(e, t);
      if (d < bd) { bd = d; best = t; }
    }
  }
  return best;
}

function waypoint(e, tx, ty) {
  if (e.fly) return { x: tx, y: ty };
  const inBand = Math.abs(e.y - RIVER) <= 1.15;
  if (!inBand && side(e.y) === side(ty)) return { x: tx, y: ty };
  let bx = BRIDGES[0];
  if (Math.abs(e.x - BRIDGES[1]) + Math.abs(tx - BRIDGES[1]) < Math.abs(e.x - BRIDGES[0]) + Math.abs(tx - BRIDGES[0])) bx = BRIDGES[1];
  const dir = ty < RIVER ? -1 : 1;
  if (inBand) {
    if (Math.abs(e.x - bx) > 0.7) bx = Math.abs(e.x - BRIDGES[0]) < Math.abs(e.x - BRIDGES[1]) ? BRIDGES[0] : BRIDGES[1];
    if (side(e.y) === side(ty) && Math.abs(e.y - RIVER) > 1.0) return { x: tx, y: ty };
    return { x: bx, y: RIVER + dir * 1.4 };
  }
  return { x: bx, y: RIVER - dir * 1.1 };
}

function moveToward(e, gx, gy, dt) {
  const dx = gx - e.x, dy = gy - e.y, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1e-6) return;
  const stepLen = Math.min(d, e.spd * dt);
  e.x += dx / d * stepLen; e.y += dy / d * stepLen;
  e.moving = true;
  if (Math.abs(dx) > 0.05) e.faceX = dx > 0 ? 1 : -1;
}

function attack(s, e, t) {
  const c = e.card ? CARD[e.card] : null;
  e.atkAnim = 0.25;
  let dmg = e.dmg;
  if (e.dashBonus) { dmg *= 2; e.dashBonus = false; }
  s.ev.push({ type: 'attack', id: e.id, tid: t.id });
  if (c && c.kamikaze) {
    areaDamage(s, e.p, t.x, t.y, 0.9, dmg, 1, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: 0.9, color: 'fire' });
    kill(s, e);
    return;
  }
  if (c && c.chain) {
    const pts = [{ x: e.x, y: e.y }], hitIds = new Set();
    let cur = t, d = dmg;
    for (let k = 0; k < c.chain && cur; k++) {
      damage(s, cur, d, e); hitIds.add(cur.id); pts.push({ x: cur.x, y: cur.y });
      d *= 0.75;
      let nb = null, nd = 2.6;
      for (const o of s.ents) if (!hitIds.has(o.id) && canTarget(e, o)) { const dd = dist(cur, o); if (dd < nd) { nd = dd; nb = o; } }
      cur = nb;
    }
    s.ev.push({ type: 'zap', pts });
    return;
  }
  if (e.proj) {
    s.proj.push({ x: e.x, y: e.y - (e.fly ? 0.6 : 0.3), tid: t.id, tx: t.x, ty: t.y, spd: e.proj === 'fire' ? 8 : e.proj === 'arrow' ? 13 : 10,
      dmg, splash: e.splash, p: e.p, kind: e.proj, src: e.id, fromTower: e.kind === 'tower' });
    return;
  }
  if (e.splash) areaDamage(s, e.p, t.x, t.y, e.splash, dmg, 1, e);
  else damage(s, t, dmg, e);
}

// ---------- Boucle d'un tick ----------

export function step(s, cmds = []) {
  if (s.over) return s;
  s.ev = [];
  for (const cm of cmds) {
    const err = canPlay(s, cm.p, cm.card, cm.x, cm.y);
    if (err) { s.ev.push({ type: 'reject', p: cm.p, err }); continue; }
    deploy(s, cm.p, cm.card, cm.x, cm.y);
  }

  const dt = DT;
  // Éther
  const rate = (s.t >= DOUBLE_AT ? 2 : 1) / MANA_REGEN;
  for (const P of s.players) P.mana = Math.min(MANA_MAX, P.mana + rate * dt);

  // Sorts en attente
  for (const sp of s.pend) if (sp.at <= s.tick) castSpell(s, sp);
  s.pend = s.pend.filter(sp => sp.at > s.tick);

  for (const e of s.ents) { e.px = e.x; e.py = e.y; e.moving = false; }

  for (const e of s.ents) {
    if (e.dead) continue;
    if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.deploy > 0) {
      e.deploy -= dt;
      if (e.deploy <= 0) onLand(s, e);
      continue;
    }
    const c = e.card ? CARD[e.card] : null;
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.kind === 'building' && e.life) { e.hp -= e.maxHp / e.life * dt; if (e.hp <= 0) { kill(s, e); continue; } }
    if (c && c.aura) for (const o of s.ents) if (!o.dead && o.p === e.p && o.kind === 'unit' && o !== e && dist(o, e) <= c.aura.radius) o.hp = Math.min(o.maxHp, o.hp + c.aura.heal * dt);
    if (c && c.summon) {
      e.sumT -= dt;
      if (e.sumT <= 0) {
        e.sumT = c.summon.every;
        for (let k = 0; k < c.summon.n; k++) spawn(s, e.p, c.summon.id, clampX(e.x + (k ? 0.7 : -0.7)), e.y + (e.p === 0 ? 0.4 : -0.4), e.lvl, 0.5);
        s.ev.push({ type: 'summon', x: e.x, y: e.y });
      }
    }

    // Cible
    let t = e.target ? s.ents.find(o => o.id === e.target) : null;
    e.retarget -= dt;
    if (!t || t.dead || !canTarget(e, t) || e.retarget <= 0 || (e.kind !== 'unit' && gap(e, t) > e.range)) {
      const n = acquire(s, e);
      e.retarget = 0.25;
      t = n; e.target = n ? n.id : 0;
    }
    if (e.cd > 0) e.cd -= dt;
    if (!t) continue;

    const g = gap(e, t);
    if (g <= e.range) {
      if (t.x !== e.x) e.faceX = t.x > e.x ? 1 : -1;
      if (e.cd <= 0) { attack(s, e, t); e.cd = e.hit; }
    } else if (e.kind === 'unit') {
      if (e.dashReady && c && c.dash && g <= c.dash && g > 1.2) {
        const d = dist(e, t), k = (d - e.r - t.r - 0.3) / d;
        s.ev.push({ type: 'dash', x0: e.x, y0: e.y, x1: e.x + (t.x - e.x) * k, y1: e.y + (t.y - e.y) * k });
        e.x += (t.x - e.x) * k; e.y += (t.y - e.y) * k;
        e.dashReady = false; e.dashBonus = true; e.cd = 0;
        continue;
      }
      const w = waypoint(e, t.x, t.y);
      moveToward(e, w.x, w.y, dt);
    }
  }

  updateProjectiles(s, dt);
  separate(s);

  // Retirer les morts
  s.ents = s.ents.filter(e => !e.dead || e.kind === 'tower');

  s.tick++;
  s.t = s.tick * DT;
  checkTime(s);
  return s;
}

function onLand(s, e) {
  const c = CARD[e.card];
  s.ev.push({ type: 'land', id: e.id, x: e.x, y: e.y });
  if (c && c.roar) {
    areaDamage(s, e.p, e.x, e.y, c.roar.radius, c.roar.dmg * STAR_MULT[e.star], 0.3, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: c.roar.radius, color: 'fire' });
  }
}

function castSpell(s, sp) {
  const c = CARD[sp.card], m = mults(s, sp.p, c), lv = levelMult(sp.lvl);
  s.ev.push({ type: 'spell', card: sp.card, fx: c.fx, x: sp.x, y: sp.y, r: c.radius, p: sp.p });
  if (c.dmg) areaDamage(s, sp.p, sp.x, sp.y, c.radius, c.dmg * m.dmg * lv, c.towerPct || 0.35, { p: sp.p });
  if (c.freeze) for (const e of s.ents) if (!e.dead && e.p !== sp.p && dist(e, sp) <= c.radius + e.r * 0.5) e.frozen = Math.max(e.frozen, c.freeze);
  if (c.heal) for (const e of s.ents) if (!e.dead && e.p === sp.p && e.kind !== 'tower' && dist(e, sp) <= c.radius + e.r * 0.5) {
    e.hp = Math.min(e.maxHp, e.hp + c.heal * lv);
    e.shield += Math.round((c.shieldAdd || 0) * lv);
  }
}

function updateProjectiles(s, dt) {
  for (const pr of s.proj) {
    const t = s.ents.find(o => o.id === pr.tid && !o.dead);
    if (t) { pr.tx = t.x; pr.ty = t.y; }
    const dx = pr.tx - pr.x, dy = pr.ty - pr.y, d = Math.sqrt(dx * dx + dy * dy), stp = pr.spd * dt;
    if (d <= stp + 0.15) {
      pr.done = true;
      if (pr.splash) {
        areaDamage(s, pr.p, pr.tx, pr.ty, pr.splash, pr.dmg, 1, pr);
        s.ev.push({ type: 'boom', x: pr.tx, y: pr.ty, r: pr.splash, color: pr.kind });
      } else if (t) damage(s, t, pr.dmg, pr);
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
      if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = (a.id % 2 ? 1 : -1); d = 0; }
      const push = (min - d);
      if (am && bm) { a.x -= nx * push / 2; a.y -= ny * push / 2; b.x += nx * push / 2; b.y += ny * push / 2; }
      else if (am) { a.x -= nx * push; a.y -= ny * push; }
      else { b.x += nx * push; b.y += ny * push; }
    }
  }
  for (const e of L) {
    if (e.kind !== 'unit') continue;
    e.x = clampX(e.x); e.y = Math.max(0.4, Math.min(H - 0.4, e.y));
    if (!e.fly && Math.abs(e.y - RIVER) < 1.0 && BRIDGES.every(b => Math.abs(e.x - b) > 0.75)) {
      // Pas dans la rivière : retour sur la berge.
      e.y = e.py !== undefined && Math.abs(e.py - RIVER) >= 1.0 ? e.py : (e.y < RIVER ? RIVER - 1.0 : RIVER + 1.0);
    }
  }
}

function towerHpRatio(s, p) {
  let hp = 0, mx = 0;
  for (const e of s.ents) if (e.kind === 'tower' && e.p === p) { hp += Math.max(0, e.hp); mx += e.maxHp; }
  return hp / mx;
}

function checkTime(s) {
  if (s.over) return;
  const [a, b] = s.players;
  if (s.t >= MATCH_TIME && !s.overtime) {
    if (a.crowns !== b.crowns) return finish(s, a.crowns > b.crowns ? 0 : 1, 'time');
    s.overtime = true;
    s.ev.push({ type: 'overtime' });
  }
  if (s.t >= MATCH_TIME + OVERTIME) {
    const ra = towerHpRatio(s, 0), rb = towerHpRatio(s, 1);
    if (Math.abs(ra - rb) < 0.001) finish(s, -1, 'draw');
    else finish(s, ra > rb ? 0 : 1, 'towerhp');
  }
}

export function timeLeft(s) {
  return s.overtime ? MATCH_TIME + OVERTIME - s.t : MATCH_TIME - s.t;
}

// Empreinte de l'état : sert aux tests et, plus tard, à vérifier la synchronisation client/serveur.
export function hashState(s) {
  let h = 2166136261;
  const add = n => { h ^= Math.round(n * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
  add(s.tick);
  for (const e of s.ents) { add(e.id); add(e.x); add(e.y); add(e.hp); }
  for (const P of s.players) { add(P.mana); add(P.crowns); }
  return h.toString(16);
}
