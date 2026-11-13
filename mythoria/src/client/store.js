// MYTHORIA — profil du joueur.
// PHASES 1-2 : sauvegardé sur ce téléphone (localStorage).
// PHASE 3 : remplacé par des appels au serveur (même interface : load / save / applyResult).

import { STARTER_DECK, STARTER_SPELL, unlockedHeroes, unlockedSpells, worldFor, WORLDS, HERO, PLAYABLE, validateDeck } from '../shared/content.js';
import { makeRng, shuffle } from '../shared/rng.js';

const KEY = 'myt_profile_v2';
export const xpNeed = lvl => 60 + (lvl - 1) * 40;

function defaults() {
  return {
    v: 2, name: 'Héros' + Math.floor(1000 + Math.random() * 9000), avatar: 'ecuyer',
    trophies: 0, best: 0, gold: 100, gems: 0, xp: 0, lvl: 1,
    deck: STARTER_DECK.slice(), spell: STARTER_SPELL, stats: { w: 0, l: 0, d: 0, played: 0, hearts: 0 },
    hist: [], sound: true, created: Date.now(), seenWorld: 0,
  };
}

export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
  const d = defaults();
  if (!p || typeof p !== 'object') {
    // reprise de l'ancienne sauvegarde (v1) : on garde le pseudo, l'or, les gemmes, le niveau
    try { const o = JSON.parse(localStorage.getItem('myt_profile_v1') || 'null'); if (o) Object.assign(d, { name: o.name || d.name, gold: o.gold || d.gold, gems: o.gems || 0, xp: o.xp || 0, lvl: o.lvl || 1 }); } catch (e) {}
    return d;
  }
  p = { ...d, ...p, stats: { ...d.stats, ...(p.stats || {}) } };
  if (validateDeck(p.deck, owned(p))) p.deck = STARTER_DECK.slice();
  if (!ownedSpells(p).includes(p.spell)) p.spell = STARTER_SPELL;
  if (!HERO[p.avatar]) p.avatar = 'ecuyer';
  return p;
}

export function saveProfile(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
export function resetProfile() { try { localStorage.removeItem(KEY); localStorage.removeItem('myt_profile_v1'); } catch (e) {} }

export const owned = p => unlockedHeroes(p.trophies);
export const ownedSpells = p => unlockedSpells(p.trophies);
export const worldOf = p => worldFor(p.trophies);

export function botLevelFor(p) {
  const w = worldOf(p), next = WORLDS[w.id + 1];
  const prog = next ? (p.trophies - w.trophies) / (next.trophies - w.trophies) : 1;
  return Math.min(4, Math.floor(w.id * 0.8) + (prog > 0.5 ? 1 : 0));
}

// Deck de l'IA : héros débloqués à ce niveau, avec une préférence pour la faction du monde.
export function botDeck(trophies, seed, fac) {
  const rng = makeRng(seed);
  const pool = shuffle(unlockedHeroes(trophies).slice(), rng);
  const deck = pool.filter(id => HERO[id].fac === fac).slice(0, 4);
  const C = Object.fromEntries(PLAYABLE.map(c => [c.id, c]));
  const take = f => { const id = pool.find(i => !deck.includes(i) && f(C[i])); if (id && deck.length < 8) deck.push(id); };
  take(c => c.tgt === 'buildings');
  take(c => c.tgt === 'any' && c.range > 2);
  take(c => c.hp >= 1200);
  for (const id of pool) if (deck.length < 8 && !deck.includes(id)) deck.push(id);
  return deck;
}
export function botSpell(trophies, seed) { const s = unlockedSpells(trophies); return s[seed % s.length]; }

export function applyResult(p, r) {
  const before = worldOf(p).id, beforeOwned = owned(p), beforeSp = ownedSpells(p);
  const rew = { trophies: 0, gold: 0, xp: 0, lvlUp: false, newWorld: null, newHeroes: [], newSpells: [] };
  const ranked = r.mode === 'arena';
  const margin = Math.round(((r.myHp || 0) - (r.oppHp || 0)) * 10);
  if (r.result === 'win') { rew.trophies = ranked ? 26 + Math.max(0, Math.min(8, margin)) : 0; rew.gold = ranked ? 25 + (r.heart ? 10 : 0) : 5; rew.xp = ranked ? 24 : 6; }
  else if (r.result === 'loss') { rew.trophies = ranked ? -Math.min(p.trophies, 15) : 0; rew.gold = ranked ? 8 : 0; rew.xp = ranked ? 10 : 3; }
  else { rew.gold = ranked ? 12 : 2; rew.xp = ranked ? 14 : 4; }
  p.trophies += rew.trophies; p.best = Math.max(p.best, p.trophies);
  p.gold += rew.gold; p.xp += rew.xp;
  while (p.xp >= xpNeed(p.lvl)) { p.xp -= xpNeed(p.lvl); p.lvl++; rew.lvlUp = true; p.gems += 10; }
  if (ranked) {
    p.stats.played++; if (r.heart) p.stats.hearts++;
    if (r.result === 'win') p.stats.w++; else if (r.result === 'loss') p.stats.l++; else p.stats.d++;
  }
  p.hist.unshift({ at: Date.now(), mode: r.mode, opp: r.opp, result: r.result, myHp: Math.round((r.myHp || 0) * 100), oppHp: Math.round((r.oppHp || 0) * 100), trophies: rew.trophies, world: r.world });
  p.hist = p.hist.slice(0, 30);
  const after = worldOf(p).id;
  if (after > before) rew.newWorld = WORLDS[after];
  rew.newHeroes = owned(p).filter(id => !beforeOwned.includes(id));
  rew.newSpells = ownedSpells(p).filter(id => !beforeSp.includes(id));
  saveProfile(p);
  return rew;
}
