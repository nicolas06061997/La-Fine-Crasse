import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, check, hashState, TICK_RATE, MATCH_TIME, OVERTIME, SUMMON_COST, sanctOf, HEART } from '../src/shared/sim.js';
import { STARTER_DECK, HERO } from '../src/shared/content.js';
import { createBot, botThink } from '../src/shared/ai.js';

export const DECK2 = ['golem', 'myra', 'archeres', 'cerf', 'kaelis', 'solenne', 'follets', 'nevra'];
const mk = (seed = 42) => createBattle({ seed, decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });

export function botMatch(seed, l0 = 2, l1 = 2, d0 = STARTER_DECK, d1 = DECK2) {
  const s = createBattle({ seed, decks: [d0, d1], spells: ['meteore', 'givre'] });
  const b0 = createBot(0, l0, seed + 1), b1 = createBot(1, l1, seed + 2);
  const log = [];
  while (!s.over) {
    const cmds = [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean);
    for (const c of cmds) log.push({ ...c, tick: s.tick });
    step(s, cmds);
  }
  return { s, log };
}

test('le combat commence avec 2 Sanctuaires et 2 héros sur chaque cercle', () => {
  const s = mk();
  assert.equal(s.ents.filter(e => e.kind === 'sanct').length, 2);
  for (const P of s.players) assert.equal(P.bench.filter(Boolean).length, 2);
});

test('invoquer coûte de l’éther et remplit le cercle', () => {
  const s = mk();
  const m = s.players[0].mana;
  step(s, [{ p: 0, t: 'summon' }]);
  assert.equal(s.players[0].bench.filter(Boolean).length, 3);
  assert.ok(s.players[0].mana < m - SUMMON_COST + 0.1);
});

test('commandes interdites refusées (anti-triche)', () => {
  const s = mk();
  assert.ok(check(s, { p: 0, t: 'deploy', slot: 0, x: 8, y: 4 }), 'déploiement chez l’adversaire');
  assert.ok(check(s, { p: 0, t: 'deploy', slot: 4, x: 8, y: 18 }), 'place vide');
  assert.ok(check(s, { p: 0, t: 'spell', x: 8, y: 12 }), 'jauge vide');
  assert.ok(check(s, { p: 0, t: 'hack' }));
  s.players[0].mana = 0;
  assert.ok(check(s, { p: 0, t: 'summon' }), 'sans éther');
  step(s, [{ p: 0, t: 'summon' }]);
  assert.equal(s.ev[0].type, 'reject');
});

test('fusion sur le cercle : deux héros identiques = un héros ★2', () => {
  const s = mk();
  s.players[0].bench = [{ id: 'frere', star: 1 }, { id: 'frere', star: 1 }, null, null, null];
  step(s, [{ p: 0, t: 'merge', a: 0, b: 1 }]);
  assert.deepEqual(s.players[0].bench[1], { id: 'frere', star: 2 });
  assert.equal(s.players[0].bench[0], null);
  step(s, [{ p: 0, t: 'deploy', slot: 1, x: 8, y: 18 }]);
  const fr = s.ents.find(e => e.card === 'frere');
  assert.equal(fr.star, 2);
  assert.ok(fr.maxHp > HERO.frere.hp * 1.7);
});

test('le Cœur de Mythe est capturé par le camp seul à côté', () => {
  const s = mk();
  s.players[0].bench[0] = { id: 'frere', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  for (let i = 0; i < TICK_RATE * 6; i++) step(s);
  assert.equal(s.heart.owner, 0);
});

test('détruire le Sanctuaire adverse = victoire', () => {
  const s = mk();
  sanctOf(s, 1).hp = 1;
  s.players[0].bench[0] = { id: 'archeres', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  for (let i = 0; i < TICK_RATE * 30 && !s.over; i++) step(s);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'sanct');
});

test('déterminisme : même graine + mêmes commandes = même combat', () => {
  const a = botMatch(123);
  const s2 = createBattle({ seed: 123, decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });
  let i = 0;
  while (!s2.over) {
    const cmds = [];
    while (i < a.log.length && a.log[i].tick === s2.tick) { const { tick, ...c } = a.log[i++]; cmds.push(c); }
    step(s2, cmds);
  }
  assert.equal(hashState(s2), hashState(a.s));
  assert.equal(s2.winner, a.s.winner);
});

test('IA contre IA : chaque combat se termine', () => {
  const out = [];
  for (let seed = 1; seed <= 10; seed++) {
    const { s } = botMatch(seed * 97);
    assert.ok(s.over && s.t <= MATCH_TIME + OVERTIME + 0.1);
    out.push(s.winner + ':' + s.reason + '@' + Math.round(s.t));
  }
  console.log('  résultats :', out.join('  '));
});

test('une IA forte bat souvent une IA faible', () => {
  let wins = 0;
  for (let seed = 1; seed <= 10; seed++) if (botMatch(seed * 31, 0, 4, STARTER_DECK, STARTER_DECK).s.winner === 1) wins++;
  console.log('  victoires IA forte :', wins, '/ 10');
  assert.ok(wins >= 6);
});
