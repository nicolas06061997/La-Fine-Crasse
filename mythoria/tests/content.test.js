import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HERO, SPELLS, RARITIES, FACTIONS, WORLDS, STARTER_DECK, UNLOCKS, validateDeck, deckSynergies, unlockedHeroes } from '../src/shared/content.js';

test('chaque héros est complet', () => {
  const ids = new Set();
  for (const c of HEROES) {
    assert.ok(!ids.has(c.id), 'id en double ' + c.id); ids.add(c.id);
    assert.ok(c.name && RARITIES[c.rar] && FACTIONS[c.fac], c.id);
    assert.ok(['unit', 'building'].includes(c.type), c.id);
    assert.ok(c.hp > 0 && c.hit > 0 && c.range > 0 && c.model, c.id);
    assert.ok(c.model.glb || c.model.proc || c.model.beast, c.id);
    if (!c.token) assert.ok(c.lore && c.ability && c.title, c.id);
    if (c.death) assert.ok(HERO[c.death.id], c.id);
    if (c.summon) assert.ok(HERO[c.summon.id], c.id);
  }
});

test('toutes les raretés et les 6 factions sont représentées', () => {
  for (const r in RARITIES) assert.ok(HEROES.some(c => c.rar === r && !c.token), r);
  for (const f of ['aube', 'arcane', 'sylve', 'braise', 'givre', 'ombre']) assert.ok(HEROES.filter(c => c.fac === f && !c.token).length >= 2, f);
});

test('6 mondes et chaque héros jouable est débloquable', () => {
  assert.equal(WORLDS.length, 6);
  const all = Object.values(UNLOCKS).flat();
  for (const c of HEROES.filter(c => !c.token)) assert.ok(all.includes(c.id), c.id);
});

test('le deck de départ est valide et débloqué', () => {
  assert.equal(validateDeck(STARTER_DECK, unlockedHeroes(0)), null);
  assert.ok(validateDeck(['ecuyer'], null));
});

test('sortilèges complets', () => { for (const s of SPELLS) assert.ok(s.name && s.radius && s.desc && s.fx, s.id); });

test('synergies de faction', () => {
  const s = deckSynergies(['ecuyer', 'frere', 'solenne', 'archeres', 'loups', 'golem', 'belier', 'jarl']);
  assert.equal(s.tiers.aube, 1); assert.equal(s.tiers.sylve, 1);
});
