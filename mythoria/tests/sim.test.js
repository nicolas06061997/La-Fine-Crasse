import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, canPlay, hashState, TICK_RATE, MATCH_TIME, OVERTIME } from '../src/shared/sim.js';
import { STARTER_DECK, CARD } from '../src/shared/content.js';
import { createBot, botThink } from '../src/shared/ai.js';

const DECK2 = ['golem', 'myra', 'archeres', 'meteore', 'givre', 'kaelis', 'solenne', 'follets'];
const mk = (seed = 42) => createBattle({ seed, decks: [STARTER_DECK, DECK2] });

function botMatch(seed, l0 = 2, l1 = 2) {
  const s = createBattle({ seed, decks: [STARTER_DECK, DECK2] });
  const b0 = createBot(0, l0, seed + 1), b1 = createBot(1, l1, seed + 2);
  const log = [];
  while (!s.over) {
    const cmds = [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean);
    for (const c of cmds) log.push({ ...c, tick: s.tick });
    step(s, cmds);
  }
  return { s, log };
}

test('le combat commence avec 6 tours et 5 d’éther', () => {
  const s = mk();
  assert.equal(s.ents.filter(e => e.kind === 'tower').length, 6);
  assert.equal(s.players[0].mana, 5);
  assert.equal(s.players[0].hand.length, 4);
});

test('l’éther remonte jusqu’à 10 maximum', () => {
  const s = mk();
  for (let i = 0; i < TICK_RATE * 60; i++) step(s);
  assert.equal(s.players[0].mana, 10);
});

test('commandes interdites refusées (triche)', () => {
  const s = mk();
  const notInHand = s.players[0].queue[0];
  assert.ok(canPlay(s, 0, notInHand, 9, 25));
  const c = s.players[0].hand[0];
  assert.ok(canPlay(s, 0, 'carte-inventee', 9, 25));
  if (CARD[c].type !== 'spell') assert.ok(canPlay(s, 0, c, 9, 5), 'troupe dans le camp adverse');
  s.players[0].mana = 0;
  assert.ok(canPlay(s, 0, c, 9, 25), 'sans éther');
  step(s, [{ p: 0, card: c, x: 9, y: 25 }]);
  assert.equal(s.ev[0].type, 'reject');
});

test('poser une carte coûte de l’éther et fait tourner la main', () => {
  const s = mk();
  const c = s.players[0].hand.find(id => CARD[id].cost <= 5);
  const next = s.players[0].queue[0];
  step(s, [{ p: 0, card: c, x: 9, y: 24 }]);
  assert.ok(s.players[0].mana < 5 - CARD[c].cost + 0.1);
  assert.ok(s.players[0].hand.includes(next));
  assert.equal(s.players[0].queue.at(-1), c);
});

test('fusion : deux troupes identiques = une troupe 2 étoiles', () => {
  const s = mk();
  s.players[0].hand = ['frere', 'ecuyer', 'loups', 'follets']; s.players[0].mana = 10;
  step(s, [{ p: 0, card: 'frere', x: 9, y: 24 }]);
  s.players[0].hand[s.players[0].hand.indexOf(s.players[0].hand[0])] = 'frere';
  s.players[0].hand[0] = 'frere';
  step(s, [{ p: 0, card: 'frere', x: 9.3, y: 24 }]);
  const fr = s.ents.filter(e => e.card === 'frere');
  assert.equal(fr.length, 1);
  assert.equal(fr[0].star, 2);
  assert.ok(fr[0].maxHp > CARD.frere.hp * 1.5);
});

test('déterminisme : même graine + mêmes commandes = même combat', () => {
  const a = botMatch(123);
  const s2 = createBattle({ seed: 123, decks: [STARTER_DECK, DECK2] });
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
  const results = [];
  for (let seed = 1; seed <= 12; seed++) {
    const { s } = botMatch(seed * 97);
    assert.ok(s.over);
    assert.ok(s.t <= MATCH_TIME + OVERTIME + 0.1);
    results.push(s.winner + ':' + s.reason + ':' + s.players.map(p => p.crowns).join('-') + '@' + Math.round(s.t));
  }
  console.log('  résultats :', results.join('  '));
});

test('une IA forte bat souvent une IA faible', () => {
  let wins = 0;
  for (let seed = 1; seed <= 10; seed++) if (botMatch(seed * 31, 0, 4).s.winner === 1) wins++;
  console.log('  victoires IA forte :', wins, '/ 10');
  assert.ok(wins >= 6);
});
