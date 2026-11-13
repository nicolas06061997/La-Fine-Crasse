// MYTHORIA — contenu du jeu (cartes, factions, raretés, arènes).
// Ce fichier est PARTAGÉ entre le jeu (navigateur) et le futur serveur (Node.js) :
// aucune dépendance au navigateur ici. Pour ajouter une carte, ajouter un objet dans CARDS.

export const RARITIES = {
  commun:     { name: 'Commun',     color: '#9aa7b8', order: 0 },
  rare:       { name: 'Rare',       color: '#3d9bff', order: 1 },
  epique:     { name: 'Épique',     color: '#b45cff', order: 2 },
  legendaire: { name: 'Légendaire', color: '#ffb02e', order: 3 },
  mythique:   { name: 'Mythique',   color: '#ff4d6d', order: 4 },
};

// Factions : 3 cartes d'une même faction dans le deck = bonus niveau 1, 5 cartes = niveau 2.
export const FACTIONS = {
  aube:   { name: "Ordre de l'Aube",   icon: '☀️', color: '#ffd166', bonus: ['+12 % de vie', '+25 % de vie'] },
  arcane: { name: 'Cercle Arcanique',  icon: '🔮', color: '#9b8cff', bonus: ['+15 % de dégâts', '+30 % de dégâts'] },
  sylve:  { name: 'Peuple de Sylve',   icon: '🌿', color: '#5fd38d', bonus: ['Régénère 2 % de vie/s', 'Régénère 4 % de vie/s'] },
  braise: { name: 'Clan de la Braise', icon: '🔥', color: '#ff7a3d', bonus: ['+12 % de vitesse d’attaque', '+25 % de vitesse d’attaque'] },
  neutre: { name: 'Neutre',            icon: '⚙️', color: '#b8c0cc', bonus: null },
};

// type : unit | spell | building
// tgt  : ground (au sol seulement) | any (sol + air) | buildings (bâtiments seulement)
// hit  : secondes entre deux attaques ; spd : cases/seconde ; range : cases
export const CARDS = [
  { id: 'ecuyer', name: "Écuyer de l'Aube", fac: 'aube', rar: 'commun', cost: 2, type: 'unit',
    hp: 520, dmg: 80, hit: 1.1, spd: 1.2, range: 0.8, tgt: 'ground', count: 1, r: 0.45, look: 'squire',
    desc: 'Jeune chevalier courageux. Pas cher, parfait pour défendre.' },
  { id: 'archeres', name: 'Archères de Sylve', fac: 'sylve', rar: 'commun', cost: 3, type: 'unit',
    hp: 230, dmg: 60, hit: 1.0, spd: 1.2, range: 5, tgt: 'any', count: 2, r: 0.4, proj: 'arrow', look: 'archer',
    desc: 'Deux archères elfes qui tirent de loin, même sur les créatures volantes.' },
  { id: 'loups', name: 'Meute des Ronces', fac: 'sylve', rar: 'commun', cost: 3, type: 'unit',
    hp: 200, dmg: 55, hit: 0.8, spd: 2.0, range: 0.7, tgt: 'ground', count: 3, r: 0.4, look: 'wolf',
    desc: 'Trois loups de la forêt, très rapides. Fragiles face aux dégâts de zone.' },
  { id: 'follets', name: 'Feux-Follets', fac: 'braise', rar: 'commun', cost: 1, type: 'unit',
    hp: 70, dmg: 130, hit: 0.5, spd: 2.4, range: 0.5, tgt: 'any', count: 3, r: 0.3, fly: true, kamikaze: true, look: 'wisp',
    desc: 'Trois petites flammes volantes qui explosent au contact.' },
  { id: 'etincelles', name: "Pluie d'Étincelles", fac: 'arcane', rar: 'commun', cost: 2, type: 'spell',
    dmg: 200, radius: 2.5, towerPct: 0.35, fx: 'sparks', look: 'sparks',
    desc: 'Dégâts rapides sur une petite zone. Idéal contre les groupes.' },
  { id: 'frere', name: 'Frère-Bouclier', fac: 'aube', rar: 'rare', cost: 4, type: 'unit',
    hp: 1500, dmg: 115, hit: 1.3, spd: 0.9, range: 0.9, tgt: 'ground', count: 1, r: 0.55, shield: 350, look: 'shieldbro',
    desc: 'Chevalier lourd. Son bouclier absorbe les premiers 350 dégâts.' },
  { id: 'apprenti', name: 'Apprenti Runique', fac: 'arcane', rar: 'rare', cost: 4, type: 'unit',
    hp: 400, dmg: 125, hit: 1.4, spd: 1.1, range: 5, tgt: 'any', count: 1, r: 0.45, splash: 1.2, proj: 'orb', look: 'mage',
    desc: 'Lance des orbes magiques qui touchent tous les ennemis autour de la cible.' },
  { id: 'dragonnet', name: 'Dragonnet de Braise', fac: 'braise', rar: 'rare', cost: 4, type: 'unit',
    hp: 680, dmg: 95, hit: 1.4, spd: 1.5, range: 3, tgt: 'any', count: 1, r: 0.5, fly: true, splash: 1.0, proj: 'fire', look: 'drake',
    desc: 'Jeune dragon volant qui crache des boules de feu de zone.' },
  { id: 'sentinelle', name: 'Tour-Sentinelle', fac: 'neutre', rar: 'rare', cost: 4, type: 'building',
    hp: 1150, dmg: 85, hit: 0.9, range: 6, tgt: 'any', r: 0.8, life: 35, proj: 'bolt', look: 'sentinel',
    desc: 'Tour de défense qui attire les ennemis. Disparaît après 35 s.' },
  { id: 'belier', name: 'Bélier de Siège', fac: 'neutre', rar: 'rare', cost: 4, type: 'unit',
    hp: 1050, dmg: 270, hit: 1.8, spd: 1.6, range: 0.9, tgt: 'buildings', count: 1, r: 0.6, look: 'ram',
    desc: 'Fonce droit sur les tours et ignore les troupes.' },
  { id: 'benediction', name: "Bénédiction de l'Aube", fac: 'aube', rar: 'rare', cost: 3, type: 'spell',
    heal: 420, shieldAdd: 200, radius: 3, fx: 'heal', look: 'blessing',
    desc: 'Soigne tes troupes dans la zone et leur donne un bouclier.' },
  { id: 'golem', name: 'Golem de Mousse', fac: 'sylve', rar: 'epique', cost: 6, type: 'unit',
    hp: 3600, dmg: 210, hit: 1.6, spd: 0.7, range: 0.9, tgt: 'buildings', count: 1, r: 0.8, death: { id: 'golemet', n: 2 }, look: 'golem',
    desc: 'Énorme colosse végétal qui attaque les tours. Se divise en 2 en mourant.' },
  { id: 'meteore', name: 'Météore Arcanique', fac: 'arcane', rar: 'epique', cost: 4, type: 'spell',
    dmg: 580, radius: 2.2, towerPct: 0.35, delay: 1.0, fx: 'meteor', look: 'meteor',
    desc: 'Un météore tombe après 1 seconde et inflige de gros dégâts.' },
  { id: 'givre', name: 'Gel de Givre-Lune', fac: 'arcane', rar: 'epique', cost: 3, type: 'spell',
    dmg: 90, freeze: 3.5, radius: 3, towerPct: 0.35, fx: 'freeze', look: 'frost',
    desc: 'Gèle tous les ennemis de la zone pendant 3,5 secondes.' },
  { id: 'myra', name: 'Myra, Sorcière des Ronces', fac: 'sylve', rar: 'epique', cost: 5, type: 'unit',
    hp: 820, dmg: 110, hit: 1.2, spd: 1.0, range: 4.5, tgt: 'any', count: 1, r: 0.5, proj: 'thorn',
    summon: { id: 'pousse', every: 7, n: 2 }, look: 'witch',
    desc: 'Fait pousser 2 Pousses Ronceuses toutes les 7 secondes.' },
  { id: 'solenne', name: 'Solenne, Paladine Solaire', fac: 'aube', rar: 'legendaire', cost: 5, type: 'unit',
    hp: 1750, dmg: 170, hit: 1.2, spd: 1.0, range: 0.9, tgt: 'ground', count: 1, r: 0.55, aura: { heal: 45, radius: 3 }, look: 'paladin',
    desc: 'Héroïne légendaire. Soigne en permanence les alliés autour d’elle.' },
  { id: 'vael', name: "Vael, l'Archimage", fac: 'arcane', rar: 'legendaire', cost: 6, type: 'unit',
    hp: 900, dmg: 185, hit: 1.6, spd: 1.0, range: 5.5, tgt: 'any', count: 1, r: 0.5, chain: 3, proj: 'zap', look: 'archmage',
    desc: 'Héros légendaire. Son éclair rebondit sur 3 ennemis.' },
  { id: 'kaelis', name: 'Kaëlis, Lame du Crépuscule', fac: 'braise', rar: 'legendaire', cost: 4, type: 'unit',
    hp: 950, dmg: 230, hit: 1.0, spd: 1.8, range: 0.8, tgt: 'ground', count: 1, r: 0.45, dash: 4, look: 'assassin',
    desc: 'Héroïne légendaire. Bondit sur sa cible et frappe deux fois plus fort.' },
  { id: 'ignar', name: 'Ignar, Wyrm Ancestral', fac: 'braise', rar: 'mythique', cost: 8, type: 'unit',
    hp: 3100, dmg: 240, hit: 1.8, spd: 0.9, range: 3.5, tgt: 'any', count: 1, r: 0.9, fly: true, splash: 1.8, proj: 'fire',
    roar: { dmg: 160, radius: 2.8 }, look: 'wyrm',
    desc: 'Dragon mythique. Son rugissement brûle tout autour de lui à l’arrivée.' },

  // Unités invoquées (pas jouables directement)
  { id: 'golemet', token: true, name: 'Golemet', fac: 'sylve', rar: 'commun', cost: 0, type: 'unit',
    hp: 900, dmg: 70, hit: 1.4, spd: 0.9, range: 0.8, tgt: 'buildings', count: 1, r: 0.5, look: 'golemlet', desc: '' },
  { id: 'pousse', token: true, name: 'Pousse Ronceuse', fac: 'sylve', rar: 'commun', cost: 0, type: 'unit',
    hp: 160, dmg: 45, hit: 1.0, spd: 1.3, range: 0.7, tgt: 'ground', count: 1, r: 0.35, look: 'sapling', desc: '' },
];

export const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
export const PLAYABLE = CARDS.filter(c => !c.token);

export const STARTER_DECK = ['ecuyer', 'archeres', 'loups', 'belier', 'etincelles', 'frere', 'apprenti', 'dragonnet'];
export const DECK_SIZE = 8;

// Arènes : débloquées avec les trophées. Chaque arène débloque des cartes.
export const ARENAS = [
  { id: 0, name: "Prairie de l'Aube",   trophies: 0,   theme: 'meadow', unlock: ['ecuyer', 'archeres', 'loups', 'follets', 'etincelles', 'frere', 'apprenti', 'dragonnet', 'benediction', 'belier'] },
  { id: 1, name: 'Forêt des Ronces',    trophies: 100, theme: 'forest', unlock: ['sentinelle', 'golem', 'myra'] },
  { id: 2, name: 'Forges de Braise',    trophies: 250, theme: 'forge',  unlock: ['kaelis', 'meteore'] },
  { id: 3, name: 'Tour Arcanique',      trophies: 450, theme: 'arcane', unlock: ['givre', 'vael', 'solenne'] },
  { id: 4, name: 'Pic du Wyrm',         trophies: 700, theme: 'peak',   unlock: ['ignar'] },
];

export function arenaFor(trophies) {
  let a = ARENAS[0];
  for (const x of ARENAS) if (trophies >= x.trophies) a = x;
  return a;
}

export function unlockedCards(trophies) {
  return ARENAS.filter(a => trophies >= a.trophies).flatMap(a => a.unlock);
}

// Bonus de niveau de carte (prévu pour la phase 5) et d'étoile (fusion en combat).
export const levelMult = lvl => Math.pow(1.1, (lvl || 1) - 1);
export const STAR_MULT = [1, 1, 1.7, 2.8];
export const STAR_SIZE = [1, 1, 1.2, 1.4];
export const MAX_STAR = 3;

export function deckSynergies(deck) {
  const n = {};
  for (const id of deck) { const f = CARD[id]?.fac; if (f && f !== 'neutre') n[f] = (n[f] || 0) + 1; }
  const out = {};
  for (const f in n) out[f] = n[f] >= 5 ? 2 : n[f] >= 3 ? 1 : 0;
  return { counts: n, tiers: out };
}

export function validateDeck(deck, owned) {
  if (!Array.isArray(deck) || deck.length !== DECK_SIZE) return 'Le deck doit contenir 8 cartes.';
  if (new Set(deck).size !== DECK_SIZE) return 'Chaque carte ne peut être qu’une fois dans le deck.';
  for (const id of deck) {
    const c = CARD[id];
    if (!c || c.token) return 'Carte inconnue : ' + id;
    if (owned && !owned.includes(id)) return 'Carte pas encore débloquée : ' + c.name;
  }
  return null;
}
