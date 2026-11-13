// MYTHORIA — IA d'entraînement. Elle joue avec les mêmes règles qu'un humain :
// elle ne fait qu'envoyer des commandes « poser telle carte ici », vérifiées par la simulation.
// Elle est toujours affichée comme « IA » dans le jeu : jamais présentée comme un vrai joueur.

import { CARD } from './content.js';
import { RIVER, BRIDGES, canPlay } from './sim.js';
import { makeRng } from './rng.js';

export const AI_LEVELS = [
  { name: 'Recrue',     think: 1.6, attackAt: 10, defend: 0.6, smart: 0.3 },
  { name: 'Soldat',     think: 1.1, attackAt: 9,  defend: 0.8, smart: 0.6 },
  { name: 'Capitaine',  think: 0.8, attackAt: 8,  defend: 0.95, smart: 0.85 },
  { name: 'Champion',   think: 0.55, attackAt: 7, defend: 1, smart: 1 },
  { name: 'Seigneur',   think: 0.4, attackAt: 7,  defend: 1, smart: 1 },
];

export function createBot(p, level = 1, seed = 7) {
  return { p, L: AI_LEVELS[Math.max(0, Math.min(AI_LEVELS.length - 1, level))], rng: makeRng(seed), wait: 2 };
}

const mySide = (p, y) => (p === 0 ? y > RIVER : y < RIVER);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Renvoie une commande { p, card, x, y } ou null. À appeler à chaque tick avec dt.
export function botThink(bot, s, dt) {
  bot.wait -= dt;
  if (bot.wait > 0 || s.over) return null;
  bot.wait = bot.L.think * (0.7 + bot.rng() * 0.6);
  const p = bot.p, P = s.players[p], dirY = p === 0 ? 1 : -1; // vers mon camp
  const hand = P.hand.map(id => CARD[id]);
  const afford = hand.filter(c => c.cost <= P.mana);
  if (!afford.length) return null;

  const enemies = s.ents.filter(e => !e.dead && e.p !== p && e.kind === 'unit');
  const threats = enemies.filter(e => mySide(p, e.y) || Math.abs(e.y - RIVER) < 3);
  const myTowers = s.ents.filter(e => e.kind === 'tower' && e.p === p && !e.dead);

  // ---- Défense ----
  if (threats.length && bot.rng() < bot.L.defend) {
    threats.sort((a, b) => nearestDist(a, myTowers) - nearestDist(b, myTowers));
    const th = threats[0];
    const cluster = threats.filter(e => d2(e, th) < 6.5);
    const air = cluster.some(e => e.fly);
    const hpSum = cluster.reduce((n, e) => n + e.hp, 0);
    const smart = bot.rng() < bot.L.smart;
    let pick = null;
    if (smart && cluster.length >= 3) pick = afford.find(c => c.type === 'spell' && c.dmg && c.dmg >= 150 && c.radius >= 2) || afford.find(c => c.splash);
    if (!pick && smart && air) pick = afford.find(c => c.tgt === 'any' && c.type !== 'spell');
    if (!pick && smart && hpSum > 1500) pick = afford.find(c => c.type === 'building') || afford.filter(c => c.type === 'unit' && c.tgt !== 'buildings').sort((a, b) => b.dmg * (a.count || 1) - a.dmg * (b.count || 1))[0];
    if (!pick) pick = afford.filter(c => c.type === 'unit' && c.tgt !== 'buildings' && (!air || c.tgt === 'any')).sort((a, b) => a.cost - b.cost)[0];
    if (pick) {
      let x, y;
      if (pick.type === 'spell') { x = cx(cluster); y = cy(cluster); }
      else {
        x = th.x + (bot.rng() - 0.5) * 1.5;
        y = th.y + dirY * (pick.range > 2 ? 4 : 2.2);
        if (!mySide(p, y)) y = RIVER + dirY * 2;
      }
      const cmd = { p, card: pick.id, x: clamp(x, 1, 17), y: clamp(y, 1, 31) };
      if (!canPlay(s, p, cmd.card, cmd.x, cmd.y)) return cmd;
    }
  }

  // ---- Attaque ----
  if (P.mana >= bot.L.attackAt - 0.01 || (P.mana >= 9.5)) {
    const units = afford.filter(c => c.type === 'unit');
    if (!units.length) {
      // Pas de troupe : un sort de dégâts sur une tour si l'éther déborde.
      const sp = afford.find(c => c.type === 'spell' && c.dmg >= 300);
      if (sp && P.mana >= 9.8) {
        const tw = weakestTower(s, 1 - p);
        if (tw) return { p, card: sp.id, x: tw.x, y: tw.y };
      }
      return null;
    }
    const tw = weakestTower(s, 1 - p);
    const lane = tw && tw.lane >= 0 ? tw.lane : (bot.rng() < 0.5 ? 0 : 1);
    const bx = BRIDGES[lane];
    const tank = units.filter(c => c.hp >= 1000).sort((a, b) => b.hp - a.hp)[0];
    const pick = tank || units[Math.floor(bot.rng() * units.length)];
    let x = bx + (bot.rng() - 0.5), y;
    if (pick.tgt === 'buildings' || pick.spd >= 1.5) y = RIVER + dirY * 1.8; // directement au pont
    else if (pick === tank) y = RIVER + dirY * 9;                          // derrière, pour préparer une poussée
    else y = RIVER + dirY * 4;
    const cmd = { p, card: pick.id, x: clamp(x, 1, 17), y: clamp(y, 1, 31) };
    if (!canPlay(s, p, cmd.card, cmd.x, cmd.y)) return cmd;
  }

  // ---- Soutien : placer une troupe derrière une poussée en cours ----
  const mine = s.ents.filter(e => !e.dead && e.p === p && e.kind === 'unit' && e.maxHp >= 1000);
  if (mine.length && P.mana >= 5) {
    const lead = mine[0];
    const sup = afford.find(c => c.type === 'unit' && c.range >= 3);
    if (sup) {
      const y = mySide(p, lead.y) ? lead.y + dirY * 1.5 : RIVER + dirY * 1.5;
      const cmd = { p, card: sup.id, x: clamp(lead.x, 1, 17), y: clamp(y, 1, 31) };
      if (!canPlay(s, p, cmd.card, cmd.x, cmd.y)) return cmd;
    }
  }
  return null;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cx = L => L.reduce((n, e) => n + e.x, 0) / L.length;
const cy = L => L.reduce((n, e) => n + e.y, 0) / L.length;
function nearestDist(e, towers) { let m = Infinity; for (const t of towers) m = Math.min(m, d2(e, t)); return m; }
function weakestTower(s, p) {
  const L = s.ents.filter(e => e.kind === 'tower' && e.p === p && !e.dead && e.sub === 'side');
  if (!L.length) return s.ents.find(e => e.kind === 'tower' && e.p === p && !e.dead) || null;
  return L.sort((a, b) => a.hp - b.hp)[0];
}
