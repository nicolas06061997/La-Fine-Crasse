// MYTHORIA — campagne (phase 7) : 6 chapitres (un par monde), 5 étapes chacun, un boss à la fin.
// Plus : événements de la semaine, tournoi contre l'IA, survie.
import { WORLDS, HERO, unlockedHeroes } from './content.js';
import { makeRng, shuffle } from './rng.js';

export const BOSSES = [
  { base: 'frere', name: 'Le Chevalier Noir', title: 'Gardien déchu de l’Aube', hp: 2200, dmg: 46, r: 1.15, scale: 2.0, skin: 'nuit',
    skills: [{ k: 'slam', every: 9, dmg: 53, r: 2.8 }, { k: 'summon', every: 13, id: 'ecuyer', n: 2 }],
    intro: 'Le Chevalier Noir a trahi l’Ordre de l’Aube. Il garde le pont du Royaume d’Aurore.' },
  { base: 'golem', name: 'Gorgoroth', title: 'Golem ancien de la Sylve', hp: 3400, dmg: 57, r: 1.4, scale: 1.9,
    skills: [{ k: 'slam', every: 8, dmg: 66, r: 3.2 }, { k: 'summon', every: 11, id: 'pousse', n: 3 }, { k: 'heal', every: 15, pct: 0.06 }],
    intro: 'Réveillé par une malédiction, Gorgoroth écrase tout ce qui pousse… sauf ses ronces.' },
  { base: 'vael', name: 'L’Archimage Déchu', title: 'Ancien rival de Vael', hp: 3900, dmg: 51, r: 1.1, scale: 2.0, skin: 'spectre', range: 5, proj: 'orb', splash: 1.6, spd: 0.8,
    skills: [{ k: 'fire', every: 7, dmg: 92 }, { k: 'freeze', every: 12, r: 3.4, t: 2 }],
    intro: 'Chassé de l’Académie, il revient avec des sorts interdits. Méfie-toi de ses météores.' },
  { base: 'ignar', name: 'Ignar l’Ancestral', title: 'Le Père de tous les dragons', hp: 5000, dmg: 57, r: 1.3, scale: 1.25, fly: true, range: 3.5, proj: 'fire', splash: 2, spd: 0.8,
    skills: [{ k: 'fire', every: 6, dmg: 106 }, { k: 'slam', every: 10, dmg: 70, r: 3.4 }],
    intro: 'Le vieux dragon s’est réveillé de mauvaise humeur. Des archers, vite !' },
  { base: 'jarl', name: 'Le Roi des Glaces', title: 'Seigneur de l’hiver éternel', hp: 5800, dmg: 66, r: 1.3, scale: 2.3, skin: 'givre',
    skills: [{ k: 'freeze', every: 9, r: 3.8, t: 2.5 }, { k: 'slam', every: 8, dmg: 75, r: 3.2 }, { k: 'summon', every: 14, id: 'jarl', n: 2 }],
    intro: 'Il a gelé la mer entière pour atteindre les Terres de Givre.' },
  { base: 'malakar', name: 'Malakar', title: 'Roi des Ombres (forme ultime)', hp: 7400, dmg: 73, r: 1.4, scale: 1.25,
    skills: [{ k: 'summon', every: 9, id: 'squelette', n: 3 }, { k: 'slam', every: 8, dmg: 79, r: 3.4 }, { k: 'heal', every: 14, pct: 0.06 }, { k: 'fire', every: 11, dmg: 99 }],
    intro: 'Le premier roi de Mythoria veut son trône. C’est le combat final.' },
];

const STAGE_NAMES = [
  ['Le pont des Écuyers', 'Les champs dorés', 'La garnison', 'Les remparts', 'Le Chevalier Noir'],
  ['L’orée du bois', 'Le lac aux lucioles', 'Le cercle de pierres', 'Le cœur de la forêt', 'Gorgoroth'],
  ['Les portes de l’Académie', 'La bibliothèque', 'La tour des runes', 'L’observatoire', 'L’Archimage Déchu'],
  ['La coulée de lave', 'Les forges', 'Le nid des dragonnets', 'Le cratère', 'Ignar l’Ancestral'],
  ['Le glacier bleu', 'Le village gelé', 'La forteresse de glace', 'Le trône d’hiver', 'Le Roi des Glaces'],
  ['Les ruines maudites', 'Le cimetière', 'La crypte', 'La salle du trône', 'Malakar'],
];

export const CHAPTERS = WORLDS.map((w, c) => ({
  world: w, boss: BOSSES[c],
  stages: STAGE_NAMES[c].map((name, i) => ({
    n: c * 5 + i, name, boss: i === 4,
    ai: Math.max(0, Math.min(3, Math.floor(c * 0.6 + i * 0.3)) - (i === 4 ? 1 : 0)),
    lvl: 1 + Math.round(c * 1.0 + i * 0.15),
    reward: i === 4 ? { gold: 200 + c * 150, gems: 15 + c * 5, chest: c >= 3 ? 'legendaire' : 'magique' } : { gold: 60 + c * 40 + i * 10, crystals: c >= 2 ? 10 + c * 5 : 0 },
  })),
}));
export const stageOf = n => CHAPTERS[Math.floor(n / 5)]?.stages[n % 5];

// Deck d'un adversaire : héros du monde (faction) + héros débloqués à ce stade.
export function enemyDeck(worldId, seed) {
  const w = WORLDS[worldId], rng = makeRng(seed);
  const pool = shuffle(unlockedHeroes(w.trophies).slice(), rng);
  const deck = pool.filter(id => HERO[id].fac === w.fac).slice(0, 4);
  for (const id of pool) if (deck.length < 8 && !deck.includes(id)) deck.push(id);
  return deck;
}

// ---------- Événements de la semaine ----------
export const EVENTS = [
  { key: 'ether', name: 'Tempête d’éther', desc: 'L’éther coule à flots : +60 % d’éther pour tout le monde.', mods: { mana: 1.6 } },
  { key: 'fusion', name: 'Fusion céleste', desc: 'Tous les héros invoqués arrivent directement en ★2.', mods: { startStar: 2 } },
  { key: 'eveil', name: 'Éveil ardent', desc: 'Les jauges d’Éveil se remplissent 2,5× plus vite : pluie de sortilèges !', mods: { eveil: 2.5 } },
  { key: 'chaos', name: 'Chaos des Failles', desc: 'Éther +30 % et héros ★2 dès l’invocation.', mods: { mana: 1.3, startStar: 2 } },
];
export const eventOf = week => EVENTS[((week % EVENTS.length) + EVENTS.length) % EVENTS.length];
export const EVENT_REWARD = { gold: 90, crystals: 15 };
export const EVENT_WINS_PER_DAY = 5;

// ---------- Tournoi contre l'IA (3 manches) ----------
export const TOURNEY = { rounds: 3, reward: [{ gold: 80 }, { gold: 160, gems: 5 }, { gold: 300, gems: 15, chest: 'magique' }] };

// ---------- Survie : vagues selon le monde ----------
export function survivalWaves(worldId) {
  const w = WORLDS[worldId];
  const pools = { aube: ['ecuyer', 'squelette', 'pousse'], sylve: ['loups', 'pousse', 'archeres'], arcane: ['apprenti', 'squelette', 'pousse'], braise: ['follets', 'brann', 'squelette'], givre: ['jarl', 'frimas', 'squelette'], ombre: ['squelettes', 'osseuse', 'squelette'] };
  return { pool: pools[w.fac] || ['squelette'], lvl: 1 + worldId, bosses: BOSSES.slice(0, worldId + 1).map(b => ({ ...b, hp: Math.round(b.hp * 0.5) })) };
}
