// MYTHORIA — IA d'entraînement. Elle utilise exactement les mêmes commandes qu'un joueur
// (invoquer, fusionner, déployer, sortilège), vérifiées par la simulation.
// Toujours affichée comme « IA » : jamais présentée comme un vrai joueur.

import { HERO, SPELL, MAX_STAR } from './content.js';
import { CY, HEART, SUMMON_COST, check, sanctOf, inIsland } from './sim.js';
import { makeRng } from './rng.js';

export const AI_LEVELS = [
  { name: 'Recrue',    think: 1.5,  merge: 0.4, defend: 0.6, heart: 0.3, spellSmart: 0.3, reserve: 0 },
  { name: 'Soldat',    think: 1.05, merge: 0.7, defend: 0.8, heart: 0.6, spellSmart: 0.6, reserve: 0 },
  { name: 'Capitaine', think: 0.75, merge: 0.9, defend: 0.95, heart: 0.85, spellSmart: 0.85, reserve: 2 },
  { name: 'Champion',  think: 0.55, merge: 1, defend: 1, heart: 1, spellSmart: 1, reserve: 2 },
  { name: 'Seigneur',  think: 0.4,  merge: 1, defend: 1, heart: 1, spellSmart: 1, reserve: 3 },
];

export function createBot(p, level = 1, seed = 7) {
  return { p, L: AI_LEVELS[Math.max(0, Math.min(AI_LEVELS.length - 1, level))], rng: makeRng(seed), wait: 1.5 };
}

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const power = h => { const c = HERO[h.id]; return (c.hp + c.dmg * 6) * (c.count || 1) * [1, 1, 1.8, 3][h.star]; };

export function botThink(bot, s, dt) {
  bot.wait -= dt;
  if (bot.wait > 0 || s.over) return null;
  bot.wait = bot.L.think * (0.7 + bot.rng() * 0.6);
  const p = bot.p, P = s.players[p], L = bot.L, home = p === 0 ? 1 : -1;
  const ok = cm => (check(s, cm) ? null : cm);
  const mySide = y => (p === 0 ? y > CY + 0.9 : y < CY - 0.9);
  const enemies = s.ents.filter(e => !e.dead && e.p !== p && e.kind === 'unit');
  const mine = s.ents.filter(e => !e.dead && e.p === p && e.kind === 'unit');
  const sanct = sanctOf(s, p);

  // 1) Sortilège
  if (P.eveil >= 100) {
    const sp = SPELL[P.spell];
    if (sp.heal) {
      if (mine.length >= 2) { const c = best(mine, 3); if (c.n >= 2) return ok({ p, t: 'spell', x: c.x, y: c.y }); }
    } else if (enemies.length) {
      const c = best(enemies, sp.radius);
      const danger = enemies.some(e => d2(e, sanct) < 49);
      if (c.n >= 3 || danger || bot.rng() > L.spellSmart) return ok({ p, t: 'spell', x: c.x, y: c.y });
    }
  }
  // 2) Fusion sur le cercle
  if (bot.rng() < L.merge) {
    for (let a = 0; a < P.bench.length; a++) for (let b = 0; b < P.bench.length; b++) {
      const A = P.bench[a], B = P.bench[b];
      if (a !== b && A && B && A.id === B.id && A.star === B.star && B.star < MAX_STAR) return ok({ p, t: 'merge', a, b });
    }
  }
  const bench = P.bench.map((h, i) => (h ? { ...h, slot: i } : null)).filter(Boolean);
  const place = (h, x, y) => {
    x = clamp(x, 1.5, 14.5);
    y = p === 0 ? clamp(y, CY + 1.2, 22) : clamp(y, 2, CY - 1.2);
    if (!inIsland(x, y, 0.6)) x = 8 + (x - 8) * 0.6;
    return ok({ p, t: 'deploy', slot: h.slot, x, y });
  };

  // 3) Défense : ennemis dans ma moitié
  const threats = enemies.filter(e => mySide(e.y)).sort((a, b) => d2(a, sanct) - d2(b, sanct));
  if (threats.length && bench.length && bot.rng() < L.defend) {
    const th = threats[0], air = threats.some(e => e.fly);
    const cands = bench.filter(h => HERO[h.id].tgt !== 'buildings' && (!air || HERO[h.id].tgt === 'any'));
    const pick = (cands.length ? cands : bench).sort((a, b) => power(b) - power(a))[0];
    const c = HERO[pick.id];
    const back = c.range > 2 ? 3.5 : 1.8;
    const cmd = place(pick, th.x + (bot.rng() - 0.5), th.y + home * back);
    if (cmd) return cmd;
  }
  // 4) Cœur de Mythe : y envoyer quelqu'un si personne n'y est
  const atHeart = mine.some(e => d2(e, HEART) < 9);
  if (!atHeart && s.heart.owner !== p && bench.length && bot.rng() < L.heart) {
    const pick = bench.filter(h => HERO[h.id].tgt !== 'buildings').sort((a, b) => power(b) - power(a))[0];
    if (pick) { const cmd = place(pick, 8 + (bot.rng() - 0.5) * 3, CY + home * 1.4); if (cmd) return cmd; }
  }
  // 5) Invoquer
  if (P.bench.includes(null) && P.mana >= SUMMON_COST + (bench.length >= 3 ? L.reserve : 0)) return ok({ p, t: 'summon' });
  // 6) Attaque : cercle plein ou héros puissant prêt
  if (bench.length >= 4 || bench.some(h => h.star >= 2)) {
    const pick = bench.sort((a, b) => power(b) - power(a))[0];
    const tank = HERO[pick.id].hp >= 1300;
    return place(pick, 8 + (bot.rng() - 0.5) * 5, CY + home * (tank ? 3 : 1.5));
  }
  return null;
}

function best(list, r) {
  let bx = list[0].x, by = list[0].y, bn = 0;
  for (const a of list) {
    let n = 0, sx = 0, sy = 0;
    for (const b of list) if (d2(a, b) <= r * r) { n++; sx += b.x; sy += b.y; }
    if (n > bn) { bn = n; bx = sx / n; by = sy / n; }
  }
  return { x: bx, y: by, n: bn };
}
