import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, CARD, RARITIES, FACTIONS, STARTER_DECK, ARENAS, validateDeck, deckSynergies, unlockedCards } from '../src/shared/content.js';

test('chaque carte est complète', () => {
  const ids = new Set();
  for (const c of CARDS) {
    assert.ok(!ids.has(c.id), 'id en double ' + c.id); ids.add(c.id);
    assert.ok(c.name && RARITIES[c.rar] && FACTIONS[c.fac], c.id);
    assert.ok(['unit', 'spell', 'building'].includes(c.type), c.id);
    if (!c.token) { assert.ok(c.cost >= 1 && c.cost <= 10, c.id); assert.ok(c.desc, c.id); }
    if (c.type !== 'spell') { assert.ok(c.hp > 0 && c.hit > 0 && c.range > 0 && c.look, c.id); }
    if (c.death) assert.ok(CARD[c.death.id], c.id);
    if (c.summon) assert.ok(CARD[c.summon.id], c.id);
  }
});

test('toutes les raretés sont représentées', () => {
  for (const r in RARITIES) assert.ok(CARDS.some(c => c.rar === r && !c.token), r);
});

test('le deck de départ est valide et débloqué', () => {
  assert.equal(validateDeck(STARTER_DECK, unlockedCards(0)), null);
  assert.ok(validateDeck(['ecuyer'], null));
  assert.ok(validateDeck([...STARTER_DECK.slice(0, 7), 'ecuyer'], null));
});

test('chaque carte jouable est débloquée par une arène', () => {
  const all = ARENAS.flatMap(a => a.unlock);
  for (const c of CARDS.filter(c => !c.token)) assert.ok(all.includes(c.id), c.id);
});

test('synergies de faction', () => {
  const s = deckSynergies(['ecuyer', 'frere', 'benediction', 'solenne', 'archeres', 'loups', 'golem', 'belier']);
  assert.equal(s.tiers.aube, 1);
  assert.equal(s.tiers.sylve, 1);
});
