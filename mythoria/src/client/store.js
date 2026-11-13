// MYTHORIA — profil du joueur.
// PHASE 1-2 : sauvegardé sur ce téléphone (localStorage).
// PHASE 3 : ce module sera remplacé par des appels au serveur (même interface : load / save / applyResult),
// le reste du jeu n'aura pas à changer.

import { STARTER_DECK, unlockedCards, arenaFor, ARENAS, PLAYABLE, validateDeck } from '../shared/content.js';
import { makeRng, shuffle } from '../shared/rng.js';

const KEY = 'myt_profile_v1';

export const xpNeed = lvl => 60 + (lvl - 1) * 40;

function defaults() {
  return {
    v: 1, name: 'Héros' + Math.floor(1000 + Math.random() * 9000), avatar: 'ecuyer',
    trophies: 0, best: 0, gold: 100, gems: 0, xp: 0, lvl: 1,
    deck: STARTER_DECK.slice(), stats: { w: 0, l: 0, d: 0, played: 0, crowns: 0, towers: 0 },
    hist: [], sound: true, created: Date.now(), seenArena: 0,
  };
}

export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
  const d = defaults();
  if (!p || typeof p !== 'object') return d;
  p = { ...d, ...p, stats: { ...d.stats, ...(p.stats || {}) } };
  if (validateDeck(p.deck, owned(p))) p.deck = STARTER_DECK.slice();
  return p;
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* stockage plein ou bloqué */ }
}

export function resetProfile() { try { localStorage.removeItem(KEY); } catch (e) {} }

export const owned = p => unlockedCards(p.trophies);
export const arenaOf = p => arenaFor(p.trophies);

// Niveau de l'IA selon l'arène (mode Arène = difficulté croissante).
export function botLevelFor(p) {
  const a = arenaOf(p), next = ARENAS[a.id + 1];
  const prog = next ? (p.trophies - a.trophies) / (next.trophies - a.trophies) : 1;
  return Math.min(4, a.id + (prog > 0.6 ? 1 : 0));
}

// Deck de l'IA : cartes de son arène, avec au moins une condition de victoire, un sort et un anti-aérien.
export function botDeck(trophies, seed) {
  const rng = makeRng(seed);
  const pool = shuffle(unlockedCards(trophies).slice(), rng);
  const C = Object.fromEntries(PLAYABLE.map(c => [c.id, c]));
  const deck = [];
  const take = f => { const id = pool.find(i => !deck.includes(i) && f(C[i])); if (id) deck.push(id); };
  take(c => c.tgt === 'buildings' || c.hp >= 1400);
  take(c => c.type === 'spell' && c.dmg);
  take(c => c.type !== 'spell' && c.tgt === 'any');
  take(c => c.type !== 'spell' && c.tgt === 'any' && c.splash);
  for (const id of pool) if (deck.length < 8 && !deck.includes(id)) deck.push(id);
  return deck;
}

// Applique le résultat d'un combat. Renvoie les récompenses pour l'écran de fin.
export function applyResult(p, r) {
  const before = arenaOf(p).id, beforeOwned = owned(p);
  const rew = { trophies: 0, gold: 0, xp: 0, lvlUp: false, newArena: null, newCards: [] };
  const ranked = r.mode === 'arena';
  if (r.result === 'win') { rew.trophies = ranked ? 28 + r.crowns * 2 : 0; rew.gold = ranked ? 20 + r.crowns * 6 : 5; rew.xp = ranked ? 24 : 6; }
  else if (r.result === 'loss') { rew.trophies = ranked ? -Math.min(p.trophies, 16 - Math.min(6, r.crowns * 2)) : 0; rew.gold = ranked ? 6 + r.crowns * 2 : 0; rew.xp = ranked ? 10 : 3; }
  else { rew.gold = ranked ? 10 : 2; rew.xp = ranked ? 14 : 4; }
  p.trophies += rew.trophies; p.best = Math.max(p.best, p.trophies);
  p.gold += rew.gold; p.xp += rew.xp;
  while (p.xp >= xpNeed(p.lvl)) { p.xp -= xpNeed(p.lvl); p.lvl++; rew.lvlUp = true; p.gems += 10; }
  if (ranked) {
    p.stats.played++; p.stats.crowns += r.crowns;
    if (r.result === 'win') p.stats.w++; else if (r.result === 'loss') p.stats.l++; else p.stats.d++;
  }
  p.hist.unshift({ at: Date.now(), mode: r.mode, opp: r.opp, result: r.result, crowns: r.crowns, oppCrowns: r.oppCrowns, trophies: rew.trophies, deck: r.deck });
  p.hist = p.hist.slice(0, 30);
  const after = arenaOf(p).id;
  if (after > before) rew.newArena = ARENAS[after];
  rew.newCards = owned(p).filter(id => !beforeOwned.includes(id));
  saveProfile(p);
  return rew;
}
