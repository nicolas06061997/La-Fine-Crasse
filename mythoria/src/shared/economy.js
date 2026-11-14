// MYTHORIA — économie et progression (partagé avec le futur serveur).
// Ressources : or, gemmes, cristaux, pierre, expérience. Aucun achat en argent réel :
// tout se gagne en jouant, et les gemmes ne servent qu'au confort et aux apparences (jeu équitable).

import { HERO, PLAYABLE, RARITIES } from './content.js';
import { makeRng } from './rng.js';

export const MAX_LEVEL = 10;
// Fragments nécessaires pour passer du niveau n au niveau n+1 (index n-1), selon la rareté.
const SHARDS = [2, 4, 10, 20, 40, 80, 150, 250, 400];
const RAR_K = { commun: 1, rare: 0.5, epique: 0.25, legendaire: 0.12, mythique: 0.08 };
export const GOLD = [50, 120, 300, 700, 1500, 3000, 6000, 12000, 25000];
export const CRYSTALS = [0, 0, 0, 0, 0, 20, 50, 120, 250]; // à partir du niveau 6
export function upgradeCost(id, lvl) {
  if (lvl >= MAX_LEVEL) return null;
  const r = HERO[id].rar;
  return { shards: Math.max(1, Math.ceil(SHARDS[lvl - 1] * RAR_K[r])), gold: GOLD[lvl - 1], crystals: CRYSTALS[lvl - 1] };
}

// ---------- Coffres ----------
export const CHESTS = {
  bois:       { name: 'Coffre de bois',       time: 15 * 60,      gold: [30, 60],     shards: 6,  picks: 2, rare: 0.05, gems: [0, 0],  color: '#b07a45' },
  argent:     { name: 'Coffre d’argent',      time: 60 * 60,      gold: [80, 150],    shards: 14, picks: 3, rare: 0.15, gems: [0, 2],  color: '#c9d3e0' },
  or:         { name: 'Coffre d’or',          time: 3 * 3600,     gold: [200, 350],   shards: 32, picks: 4, rare: 0.35, gems: [2, 5],  color: '#ffcf5c' },
  magique:    { name: 'Coffre magique',       time: 8 * 3600,     gold: [450, 700],   shards: 70, picks: 5, rare: 0.7,  gems: [5, 10], color: '#b46bff' },
  legendaire: { name: 'Coffre légendaire',    time: 12 * 3600,    gold: [900, 1300],  shards: 120, picks: 5, rare: 1,   gems: [10, 20], color: '#ff9f2e', legend: true },
};
// Cycle fixe des coffres gagnés (comme ça, pas de hasard injuste sur le type de coffre).
export const CHEST_CYCLE = ['bois', 'argent', 'bois', 'argent', 'or', 'bois', 'argent', 'argent', 'magique', 'bois', 'argent', 'or', 'bois', 'argent', 'bois', 'or', 'argent', 'magique', 'bois', 'argent', 'or', 'argent', 'bois', 'legendaire'];
export const CHEST_SLOTS = 4;
export const gemsToOpen = secLeft => Math.max(1, Math.ceil(secLeft / 360)); // 1 gemme / 6 min

// Contenu d'un coffre, reproductible à partir d'une graine.
export function rollChest(type, seed, owned) {
  const C = CHESTS[type], rng = makeRng(seed);
  const pool = owned.filter(id => HERO[id]);
  const out = { gold: Math.round(C.gold[0] + rng() * (C.gold[1] - C.gold[0])), gems: Math.round(C.gems[0] + rng() * (C.gems[1] - C.gems[0])), crystals: Math.round(C.shards / 4 + rng() * C.shards / 4), shards: {} };
  let left = C.shards;
  const by = r => pool.filter(id => HERO[id].rar === r);
  for (let k = 0; k < C.picks && left > 0; k++) {
    let rar = 'commun';
    const x = rng();
    if (C.legend && k === 0) rar = rng() < 0.3 && by('mythique').length ? 'mythique' : 'legendaire';
    else if (x < C.rare * 0.25) rar = 'legendaire'; else if (x < C.rare * 0.6) rar = 'epique'; else if (x < C.rare + 0.25) rar = 'rare';
    let list = by(rar); if (!list.length) list = by('rare').length ? by('rare') : pool;
    const id = list[Math.floor(rng() * list.length)];
    const units = k === C.picks - 1 ? left : Math.round(left / (C.picks - k) * (0.8 + rng() * 0.4));
    left -= units;
    const n = Math.max(1, Math.round(units * RAR_K[HERO[id].rar]));
    out.shards[id] = (out.shards[id] || 0) + n;
  }
  return out;
}

// ---------- Boutique du jour ----------
export const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
export const weekKey = (t = Date.now()) => Math.floor((t / 86400000 + 3) / 7); // change chaque lundi

export function dailyShop(day, owned) {
  const rng = makeRng(day * 7 + 13);
  const pool = owned.slice();
  const offers = [{ id: 'gift', kind: 'gift', name: 'Cadeau du jour', reward: { gold: 40, gems: 2 }, price: null }];
  for (let k = 0; k < 3 && pool.length; k++) {
    const i = Math.floor(rng() * pool.length), id = pool.splice(i, 1)[0], r = HERO[id].rar;
    const n = { commun: 20, rare: 10, epique: 4, legendaire: 2, mythique: 1 }[r];
    offers.push({ id: 'h' + k, kind: 'shards', hero: id, n, price: { gold: { commun: 200, rare: 400, epique: 900, legendaire: 2000, mythique: 3000 }[r] } });
  }
  offers.push({ id: 'chest', kind: 'chest', chest: rng() < 0.5 ? 'or' : 'magique', price: { gems: 0 } });
  offers[offers.length - 1].price.gems = offers[offers.length - 1].chest === 'or' ? 40 : 90;
  offers.push({ id: 'cr', kind: 'crystals', n: 60, price: { gold: 800 } });
  // une apparence du jour
  const skinHeroes = PLAYABLE.filter(h => owned.includes(h.id) && (h.model.glb || h.model.beast));
  if (skinHeroes.length) { const h = skinHeroes[Math.floor(rng() * skinHeroes.length)], sk = SKIN_LIST[Math.floor(rng() * SKIN_LIST.length)]; offers.push({ id: 'skin', kind: 'skin', hero: h.id, skin: sk, price: { gems: SKINS[sk].price } }); }
  return offers;
}

// ---------- Apparences (cosmétiques : aucun effet sur la puissance) ----------
export const SKINS = {
  royal:  { name: 'Or royal',      tint: '#ffe2a0', glow: '#ffd166', price: 120 },
  nuit:   { name: 'Nuit d’encre',  tint: '#8a86a8', glow: '#9b8cff', price: 120 },
  givre:  { name: 'Cœur de givre', tint: '#cdefff', glow: '#9fe8ff', price: 120 },
  braise: { name: 'Âme de braise', tint: '#ffb89a', glow: '#ff7a3d', price: 120 },
  sylve:  { name: 'Esprit sylvain', tint: '#c4f0b8', glow: '#5fd38d', price: 120 },
  spectre:{ name: 'Spectre',       tint: '#d8c8ff', glow: '#c08aff', price: 200 },
};
export const SKIN_LIST = Object.keys(SKINS);

// ---------- Missions ----------
export const MISSION_POOL = [
  { k: 'win', txt: n => `Gagne ${n} combats en Arène`, d: [2, 3], w: [12, 15], rew: 'gold' },
  { k: 'play', txt: n => `Joue ${n} combats (tous modes)`, d: [3, 4], w: [20, 25], rew: 'gold' },
  { k: 'deploy', txt: n => `Envoie ${n} héros sur l’île`, d: [20, 30], w: [150, 200], rew: 'gold' },
  { k: 'fuse', txt: n => `Fusionne ${n} fois`, d: [3, 5], w: [25, 35], rew: 'gems' },
  { k: 'heart', txt: n => `Capture ${n} fois le Cœur de Mythe`, d: [3, 4], w: [20, 25], rew: 'crystals' },
  { k: 'spell', txt: n => `Lance ${n} sortilèges`, d: [2, 3], w: [15, 20], rew: 'gold' },
  { k: 'upgrade', txt: n => `Améliore ${n} héros`, d: [1, 2], w: [6, 8], rew: 'gems' },
  { k: 'collect', txt: n => `Récolte ${n} fois ton Royaume`, d: [2, 3], w: [10, 14], rew: 'gold' },
  { k: 'chest', txt: n => `Ouvre ${n} coffres`, d: [2, 3], w: [10, 12], rew: 'gems' },
];
export function makeMissions(seed, weekly) {
  const rng = makeRng(seed), pool = MISSION_POOL.slice(), out = [];
  for (let k = 0; k < 3; k++) {
    const m = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const [a, b] = weekly ? m.w : m.d, n = a + Math.floor(rng() * (b - a + 1));
    const reward = m.rew === 'gold' ? { gold: weekly ? 600 : 80 } : m.rew === 'gems' ? { gems: weekly ? 30 : 5 } : { crystals: weekly ? 120 : 20 };
    if (weekly && k === 0) reward.chest = 'magique';
    out.push({ k: m.k, n, prog: 0, reward, claimed: false, txt: m.txt(n) });
  }
  return out;
}

// ---------- Connexion quotidienne (7 jours) ----------
export const LOGIN = [{ gold: 50 }, { gems: 5 }, { gold: 100 }, { crystals: 30 }, { chest: 'argent' }, { gems: 10 }, { chest: 'or' }];

// Niveau des héros de l'IA selon les trophées (le jeu reste juste : l'IA progresse avec toi).
export const botHeroLevel = trophies => Math.min(MAX_LEVEL, 1 + Math.floor(trophies / 140));
