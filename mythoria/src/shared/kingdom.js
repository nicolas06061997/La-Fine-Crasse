// MYTHORIA — le Royaume (phase 4) : ton île à toi, ses bâtiments, ses ressources, sa défense.
// Les bonus du Royaume s'appliquent en Campagne, en Survie et en Défense du Royaume,
// mais PAS en Arène : l'Arène reste équitable entre tous les joueurs.

export const BUILDINGS = {
  chateau:  { name: 'Château',            max: 10, desc: 'Le cœur de ton Royaume. Son niveau limite celui des autres bâtiments.', base: [0, 0, 0] },
  mine:     { name: 'Mine d’or',          max: 10, desc: 'Produit de l’or en continu, même quand tu ne joues pas.', prod: 'gold', rate: 40, store: 8, needs: 1 },
  carriere: { name: 'Carrière',           max: 10, desc: 'Produit la pierre qui sert à construire.', prod: 'stone', rate: 30, store: 8, needs: 1 },
  cristal:  { name: 'Mine de cristal',    max: 10, desc: 'Produit des cristaux pour les héros de haut niveau.', prod: 'crystals', rate: 5, store: 8, needs: 3 },
  academie: { name: 'Académie',           max: 7,  desc: 'Chaque niveau permet d’améliorer tes héros d’un niveau de plus.', needs: 2 },
  caserne:  { name: 'Caserne',            max: 10, desc: '+4 % de vie pour tes héros par niveau (Campagne, Survie, Défense).', needs: 2 },
  tour:     { name: 'Tours de défense',   max: 10, desc: 'Ton Sanctuaire frappe +8 % plus fort par niveau (Campagne, Survie, Défense).', needs: 2 },
  temple:   { name: 'Temple des Sorts',   max: 10, desc: 'Ta jauge d’Éveil se remplit +5 % plus vite par niveau (Campagne, Survie, Défense).', needs: 4 },
  marche:   { name: 'Marché',             max: 10, desc: '+5 % d’or gagné en combat par niveau.', needs: 3 },
};
export const BUILD_ORDER = ['chateau', 'mine', 'carriere', 'academie', 'caserne', 'tour', 'cristal', 'temple', 'marche'];

export const DECOS = {
  moulin:  { name: 'Moulin',          price: 600, model: 'Windmill_FirstAge' },
  maison:  { name: 'Maison fleurie',  price: 300, model: 'Houses_FirstAge_2_Level2' },
  chaumiere: { name: 'Chaumière',     price: 200, model: 'Houses_FirstAge_1_Level1' },
  caisses: { name: 'Caisses',         price: 80,  model: 'Crate_Stack2' },
  tonneaux:{ name: 'Tonneaux',        price: 60,  model: 'Barrel' },
  bois:    { name: 'Tas de bois',     price: 60,  model: 'Logs' },
};
export const DECO_SLOTS = 6;

// Coût et durée pour passer au niveau `to`.
export function buildCost(id, to) {
  const k = id === 'chateau' ? 2.2 : 1;
  return { gold: Math.round((80 * Math.pow(2.05, to - 1)) * k), stone: Math.round((60 * Math.pow(2.0, to - 1)) * k) };
}
const TIMES = [10, 60, 180, 600, 1800, 3600, 7200, 14400, 28800, 43200];
export const buildTime = (id, to) => Math.round(TIMES[Math.min(TIMES.length - 1, to - 1)] * (id === 'chateau' ? 1.5 : 1));
export const speedupGems = sec => Math.max(1, Math.ceil(sec / 300)); // 1 gemme / 5 min

export function newKingdom(t) {
  return { b: { chateau: 1, mine: 1, carriere: 1 }, last: { mine: t, carriere: t, cristal: t }, job: null, deco: Array(DECO_SLOTS).fill(null) };
}

export function canBuild(K, id) {
  const b = BUILDINGS[id], lvl = K.b[id] || 0, to = lvl + 1;
  if (lvl >= b.max) return 'Niveau maximum.';
  if (K.job) return 'Un bâtiment est déjà en construction.';
  if (id !== 'chateau') {
    if ((K.b.chateau || 0) < (b.needs || 1)) return 'Il faut un Château niveau ' + b.needs + '.';
    if (to > K.b.chateau) return 'Améliore d’abord le Château (niveau ' + to + ').';
  }
  return null;
}

// Production disponible (plafonnée par le stockage : `store` heures de production).
export function produced(K, id, t) {
  const b = BUILDINGS[id], lvl = K.b[id] || 0;
  if (!b.prod || !lvl) return 0;
  const perH = b.rate * lvl * (1 + (lvl - 1) * 0.15);
  const h = Math.min(b.store, Math.max(0, (t - (K.last[id] || t)) / 3600000));
  return Math.floor(perH * h);
}
export const perHour = (K, id) => { const b = BUILDINGS[id], l = K.b[id] || 0; return l ? Math.round(b.rate * l * (1 + (l - 1) * 0.15)) : 0; };

// Bonus du Royaume pour les modes hors Arène.
export function kingdomBonus(K) {
  if (!K) return { hp: 1, sanctDmg: 1, eveil: 1, gold: 1 };
  return { hp: 1 + 0.04 * (K.b.caserne || 0), sanctDmg: 1 + 0.08 * (K.b.tour || 0), eveil: 1 + 0.05 * (K.b.temple || 0), gold: 1 + 0.05 * (K.b.marche || 0) };
}
