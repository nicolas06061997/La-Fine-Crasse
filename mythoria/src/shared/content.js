// MYTHORIA — contenu du jeu : héros, sortilèges, factions, mondes.
// PARTAGÉ entre le jeu (navigateur) et le futur serveur (Node.js) : aucune dépendance au navigateur.
// Ajouter un héros = ajouter un objet dans HEROES (+ son apparence 3D dans `model`).

export const RARITIES = {
  commun:     { name: 'Commun',     color: '#a9b6c8', order: 0, weight: 10 },
  rare:       { name: 'Rare',       color: '#3da9ff', order: 1, weight: 7 },
  epique:     { name: 'Épique',     color: '#c06bff', order: 2, weight: 5 },
  legendaire: { name: 'Légendaire', color: '#ffb92e', order: 3, weight: 2.5 },
  mythique:   { name: 'Mythique',   color: '#ff4f7b', order: 4, weight: 1.5 },
};

// 6 factions = 6 mondes. 3 héros d'une faction dans le deck = bonus, 5 = gros bonus.
export const FACTIONS = {
  aube:   { name: "Ordre de l'Aube",   short: 'Aube',   color: '#ffd166', bonus: ['+12 % de vie', '+25 % de vie'] },
  arcane: { name: 'Cercle Arcanique',  short: 'Arcane', color: '#9b8cff', bonus: ['+15 % de dégâts', '+30 % de dégâts'] },
  sylve:  { name: 'Peuple de Sylve',   short: 'Sylve',  color: '#5fd38d', bonus: ['Régénère 2 %/s', 'Régénère 4 %/s'] },
  braise: { name: 'Clan de la Braise', short: 'Braise', color: '#ff7a3d', bonus: ['+12 % vitesse d’attaque', '+25 % vitesse d’attaque'] },
  givre:  { name: 'Serment du Givre',  short: 'Givre',  color: '#7fdcff', bonus: ['Attaques ralentissent', 'Attaques ralentissent fort'] },
  ombre:  { name: 'Légion des Ombres', short: 'Ombre',  color: '#b46bff', bonus: ['Vol de vie 10 %', 'Vol de vie 20 %'] },
  neutre: { name: 'Neutre',            short: 'Neutre', color: '#b8c0cc', bonus: null },
};

// Mondes : débloqués avec les trophées. Chacun a son décor, son ambiance et ses adversaires.
export const WORLDS = [
  { id: 0, key: 'aurore', name: "Royaume d'Aurore",     trophies: 0,    fac: 'aube',
    tag: 'Châteaux blancs, bannières d’or et prairies au lever du soleil.' },
  { id: 1, key: 'sylve',  name: 'Sylve Enchantée',      trophies: 120,  fac: 'sylve',
    tag: 'Une forêt millénaire où les arbres murmurent et les lucioles guident.' },
  { id: 2, key: 'arcane', name: 'Académie Arcane',      trophies: 300,  fac: 'arcane',
    tag: 'Tours de cristal flottantes, runes vivantes et sorciers rivaux.' },
  { id: 3, key: 'braise', name: 'Pics des Dragons',     trophies: 550,  fac: 'braise',
    tag: 'Volcans, rivières de lave et nids de dragons anciens.' },
  { id: 4, key: 'givre',  name: 'Terres de Givre',      trophies: 850,  fac: 'givre',
    tag: 'Un hiver éternel, des glaciers bleus et la Reine qui ne fond jamais.' },
  { id: 5, key: 'ombre',  name: 'Royaume des Ombres',   trophies: 1200, fac: 'ombre',
    tag: 'Ruines maudites, brume violette et une armée qui ne dort jamais.' },
];

// type : unit | building ; tgt : ground | any | buildings
// hit : secondes entre attaques ; spd : cases/s ; range : cases
// model : apparence 3D (voir client/three/assets.js)
//   glb    : personnage animé (KayKit), show : objets visibles, tint : teinte, add : arme ajoutée
//   proc   : créature construite par le code (dragon, golem…)
export const HEROES = [
  // ----- Ordre de l'Aube -----
  { id: 'ecuyer', name: 'Aldric', title: "Écuyer de l'Aube", fac: 'aube', rar: 'commun', type: 'unit',
    hp: 560, dmg: 85, hit: 1.1, spd: 1.2, range: 0.8, tgt: 'ground', count: 1, r: 0.45,
    model: { glb: 'Knight', show: ['1H_Sword', 'Round_Shield'], scale: 0.92, atk: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop'] },
    lore: 'Fils de forgeron, Aldric a juré de protéger le Royaume d’Aurore avant même de savoir tenir une épée.',
    ability: ['Courage', 'Rien de spécial : solide, fiable et pas cher à fusionner.'] },
  { id: 'frere', name: 'Godric', title: 'Frère-Bouclier', fac: 'aube', rar: 'rare', type: 'unit',
    hp: 1550, dmg: 115, hit: 1.3, spd: 0.9, range: 0.9, tgt: 'ground', count: 1, r: 0.6, shield: 400,
    model: { glb: 'Knight', show: ['1H_Sword', 'Rectangle_Shield', 'Knight_Helmet', 'Knight_Cape'], scale: 1.12, tint: '#c8d2e6', atk: ['1H_Melee_Attack_Chop'] },
    lore: 'Le mur vivant de la Garde Blanche. On raconte qu’aucune flèche n’a jamais traversé son bouclier.',
    ability: ['Rempart', 'Son bouclier absorbe les 400 premiers dégâts.'] },
  { id: 'solenne', name: 'Solenne', title: 'Paladine Solaire', fac: 'aube', rar: 'legendaire', type: 'unit',
    hp: 1800, dmg: 175, hit: 1.25, spd: 1.0, range: 1.0, tgt: 'ground', count: 1, r: 0.6, aura: { heal: 45, radius: 3 },
    model: { glb: 'Knight', show: ['2H_Sword', 'Knight_Helmet', 'Knight_Cape'], scale: 1.15, tint: '#ffe39a', glow: '#ffd166', atk: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop'], idle: '2H_Melee_Idle' },
    lore: 'Bénie par le premier rayon de l’aube, Solenne n’a jamais perdu un compagnon tant qu’elle restait debout.',
    ability: ['Lumière bénie', 'Soigne en permanence les alliés autour d’elle.'] },

  // ----- Cercle Arcanique -----
  { id: 'apprenti', name: 'Pip', title: 'Apprenti Runique', fac: 'arcane', rar: 'rare', type: 'unit',
    hp: 440, dmg: 145, hit: 1.4, spd: 1.1, range: 5, tgt: 'any', count: 1, r: 0.45, splash: 1.2, proj: 'orb',
    model: { glb: 'Mage', show: ['1H_Wand', 'Spellbook_open', 'Mage_Hat'], scale: 0.9, atk: ['Spellcast_Shoot'] },
    lore: 'Recalé trois fois à l’examen de l’Académie, Pip a appris seul… en faisant exploser la bibliothèque.',
    ability: ['Orbe instable', 'Ses orbes explosent et touchent tous les ennemis autour de la cible.'] },
  { id: 'vael', name: 'Vael', title: "l'Archimage", fac: 'arcane', rar: 'legendaire', type: 'unit',
    hp: 920, dmg: 185, hit: 1.6, spd: 1.0, range: 5.5, tgt: 'any', count: 1, r: 0.55, chain: 3, proj: 'zap',
    model: { glb: 'Mage', show: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], scale: 1.1, tint: '#9aa8ff', glow: '#7ff3ff', atk: ['Spellcast_Long', 'Spellcast_Shoot'] },
    lore: 'Doyen de l’Académie Arcane, Vael a capturé un orage dans son bâton il y a trois cents ans.',
    ability: ['Foudre en chaîne', 'Son éclair rebondit sur 3 ennemis.'] },
  { id: 'tourelle', name: 'Obélisque', title: 'Tourelle Arcanique', fac: 'arcane', rar: 'rare', type: 'building',
    hp: 1200, dmg: 90, hit: 0.9, range: 6, tgt: 'any', r: 0.8, life: 40, proj: 'bolt',
    model: { proc: 'crystalTower', scale: 1 },
    lore: 'Un obélisque de cristal qui foudroie tout intrus. Les élèves l’appellent « le surveillant ».',
    ability: ['Gardien', 'Tour de défense qui attire les ennemis. Disparaît après 40 s.'] },

  // ----- Peuple de Sylve -----
  { id: 'archeres', name: 'Lys & Faye', title: 'Arbalétrières de Sylve', fac: 'sylve', rar: 'commun', type: 'unit',
    hp: 240, dmg: 62, hit: 1.0, spd: 1.2, range: 5, tgt: 'any', count: 2, r: 0.4, proj: 'arrow',
    model: { glb: 'Rogue_Hooded', show: ['1H_Crossbow', 'Rogue_Cape'], scale: 0.88, tint: '#bfe8b0', atk: ['1H_Ranged_Shoot'] },
    lore: 'Deux sœurs jumelles qui ne ratent jamais leur cible… sauf quand elles se disputent.',
    ability: ['Tir jumelé', 'Deux tireuses à distance, même contre les créatures volantes.'] },
  { id: 'loups', name: 'Meute des Ronces', title: 'Loups de la forêt', fac: 'sylve', rar: 'commun', type: 'unit',
    hp: 210, dmg: 55, hit: 0.8, spd: 2.1, range: 0.7, tgt: 'ground', count: 3, r: 0.42,
    model: { beast: 'Wolf', scale: 0.55, tint: '#c9d8c2' },
    lore: 'Les gardiens sauvages de la Sylve. Ils chassent toujours à trois.',
    ability: ['Meute', 'Trois loups très rapides. Fragiles face aux dégâts de zone.'] },
  { id: 'cerf', name: 'Émeraude', title: 'Grand Cerf de Sylve', fac: 'sylve', rar: 'epique', type: 'unit',
    hp: 2100, dmg: 190, hit: 1.5, spd: 1.4, range: 1.0, tgt: 'buildings', count: 1, r: 0.75, charge: true,
    model: { beast: 'Stag', scale: 0.75, tint: '#d9ffe0', glow: '#5fd38d' },
    lore: 'L’esprit de la forêt en personne. Là où il passe, les fleurs repoussent.',
    ability: ['Charge sylvestre', 'Fonce vers le Sanctuaire ennemi ; son premier coup fait double dégâts.'] },
  { id: 'elwyn', name: 'Elwyn', title: 'Rôdeur des Cimes', fac: 'sylve', rar: 'epique', type: 'unit',
    hp: 620, dmg: 78, hit: 1.15, spd: 1.25, range: 6, tgt: 'any', count: 1, r: 0.45, proj: 'arrow', multi: 3,
    model: { glb: 'Ranger', add: [['Bow', 'handslot.l']], scale: 1.0, glow: '#5fd38d', atk: ['2H_Ranged_Shoot', '1H_Ranged_Shoot'] },
    lore: 'Gardien des plus hauts arbres de la Sylve. On dit qu’il peut toucher une feuille qui tombe à cent pas.',
    ability: ['Volée de flèches', 'Tire sur 3 ennemis à la fois, de très loin.'] },
  { id: 'myra', name: 'Myra', title: 'Sorcière des Ronces', fac: 'sylve', rar: 'epique', type: 'unit',
    hp: 840, dmg: 110, hit: 1.2, spd: 1.0, range: 4.5, tgt: 'any', count: 1, r: 0.5, proj: 'thorn',
    summon: { id: 'pousse', every: 7, n: 2 },
    model: { glb: 'Mage', show: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], scale: 1.0, tint: '#9fe39a', glow: '#5fd38d', atk: ['Spellcast_Shoot'], cast: 'Spellcast_Summon' },
    lore: 'Bannie de l’Académie pour avoir fait pousser une forêt dans le réfectoire.',
    ability: ['Semeuse', 'Fait pousser 2 Pousses Ronceuses toutes les 7 secondes.'] },
  { id: 'golem', name: 'Moussu', title: 'Golem de Mousse', fac: 'sylve', rar: 'epique', type: 'unit',
    hp: 3600, dmg: 210, hit: 1.6, spd: 0.7, range: 1.0, tgt: 'buildings', count: 1, r: 0.9, death: { id: 'golemet', n: 2 },
    model: { proc: 'golem', scale: 1.15 },
    lore: 'Un rocher qui a dormi mille ans sous la mousse. Il s’est réveillé de très mauvaise humeur.',
    ability: ['Éboulement', 'Attaque les bâtiments. Se divise en 2 Golemets en mourant.'] },

  // ----- Clan de la Braise -----
  { id: 'follets', name: 'Feux-Follets', title: 'Étincelles vivantes', fac: 'braise', rar: 'commun', type: 'unit',
    hp: 75, dmg: 130, hit: 0.5, spd: 2.4, range: 0.5, tgt: 'any', count: 3, r: 0.3, fly: true, kamikaze: true,
    model: { proc: 'wisp', scale: 1 },
    lore: 'Des braises échappées du nid d’Ignar. Elles adorent exploser sur les gens.',
    ability: ['Kamikaze', 'Trois flammes volantes qui explosent au contact.'] },
  { id: 'brann', name: 'Brann', title: 'Barbare des Cendres', fac: 'braise', rar: 'rare', type: 'unit',
    hp: 980, dmg: 135, hit: 1.4, spd: 1.2, range: 1.0, tgt: 'ground', count: 1, r: 0.55, splash: 1.1,
    model: { glb: 'Barbarian', show: ['2H_Axe', 'Barbarian_Hat', 'Barbarian_Cape'], scale: 1.05, tint: '#ffc0a0', glow: '#ff7a3d', atk: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Chop'], idle: '2H_Melee_Idle' },
    lore: 'Il a forgé sa hache dans la lave d’un volcan. Il dit que c’était « un peu chaud ».',
    ability: ['Tourbillon', 'Ses coups de hache touchent tous les ennemis autour de lui.'] },
  { id: 'dragonnet', name: 'Pyrrhus', title: 'Dragonnet de Braise', fac: 'braise', rar: 'rare', type: 'unit',
    hp: 560, dmg: 78, hit: 1.4, spd: 1.5, range: 3, tgt: 'any', count: 1, r: 0.55, fly: true, splash: 1.0, proj: 'fire',
    model: { proc: 'dragon', scale: 0.8, color: '#ff7a3d', belly: '#ffd27a' },
    lore: 'Le plus jeune des dragons des Pics. Il crache déjà le feu, mais pas encore très droit.',
    ability: ['Souffle ardent', 'Vole et crache des boules de feu de zone.'] },
  { id: 'kaelis', name: 'Kaëlis', title: 'Lame du Crépuscule', fac: 'braise', rar: 'legendaire', type: 'unit',
    hp: 960, dmg: 230, hit: 1.0, spd: 1.8, range: 0.8, tgt: 'ground', count: 1, r: 0.45, dash: 4,
    model: { glb: 'Rogue', show: ['Knife', 'Knife_Offhand', 'Rogue_Cape'], scale: 1.0, tint: '#ffb48a', glow: '#ff7a3d', atk: ['Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Stab'] },
    lore: 'Assassin du Clan de la Braise. On ne la voit qu’une fois : la dernière.',
    ability: ['Bond fatal', 'Bondit sur sa cible et frappe deux fois plus fort.'] },
  { id: 'ignar', name: 'Ignar', title: 'Wyrm Ancestral', fac: 'braise', rar: 'mythique', type: 'unit',
    hp: 2500, dmg: 195, hit: 1.8, spd: 0.9, range: 3.5, tgt: 'any', count: 1, r: 1.0, fly: true, splash: 1.8, proj: 'fire',
    roar: { dmg: 160, radius: 2.8 },
    model: { proc: 'dragon', scale: 1.7, color: '#c4263c', belly: '#ffcf70', horns: true },
    lore: 'Le plus vieux dragon de Mythoria. Les volcans des Pics sont, dit-on, ses anciens nids.',
    ability: ['Rugissement', 'À son arrivée, son rugissement brûle tous les ennemis autour de lui.'] },

  // ----- Serment du Givre -----
  { id: 'jarl', name: 'Jarl', title: 'Garde du Givre', fac: 'givre', rar: 'commun', type: 'unit',
    hp: 700, dmg: 80, hit: 1.2, spd: 1.1, range: 0.9, tgt: 'ground', count: 1, r: 0.5, slow: 0.35,
    model: { glb: 'Barbarian', show: ['1H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Hat'], scale: 0.95, tint: '#bfe6ff', glow: '#7fdcff', atk: ['1H_Melee_Attack_Chop'] },
    lore: 'Les guerriers du Nord frappent avec des haches taillées dans la glace éternelle.',
    ability: ['Hache gelée', 'Chaque coup ralentit l’ennemi pendant 2 secondes.'] },
  { id: 'frimas', name: 'Frimas', title: 'Arbalétrier des Glaces', fac: 'givre', rar: 'rare', type: 'unit',
    hp: 460, dmg: 128, hit: 1.5, spd: 1.1, range: 5.5, tgt: 'any', count: 1, r: 0.45, proj: 'ice', slow: 0.35,
    model: { glb: 'Rogue', show: ['2H_Crossbow', 'Rogue_Cape'], scale: 0.95, tint: '#cfeeff', glow: '#7fdcff', atk: ['2H_Ranged_Shoot'] },
    lore: 'Chasseur solitaire des glaciers. Ses carreaux de glace ne fondent jamais.',
    ability: ['Carreau de glace', 'Ses tirs ralentissent la cible.'] },
  { id: 'nevra', name: 'Nevra', title: 'Reine du Givre', fac: 'givre', rar: 'legendaire', type: 'unit',
    hp: 1050, dmg: 140, hit: 1.4, spd: 1.0, range: 5, tgt: 'any', count: 1, r: 0.55, proj: 'ice', splash: 1.4, slow: 0.5, nova: { every: 9, radius: 2.8, freeze: 2 },
    model: { glb: 'Mage', show: ['2H_Staff', 'Mage_Cape'], scale: 1.1, tint: '#d8f4ff', glow: '#9fe8ff', atk: ['Spellcast_Shoot'], cast: 'Spellcast_Raise' },
    lore: 'Elle a figé une armée entière d’un seul regard. Son cœur, dit-on, est un flocon.',
    ability: ['Nova glaciale', 'Toutes les 9 s, gèle les ennemis autour d’elle pendant 2 s.'] },

  // ----- Légion des Ombres -----
  { id: 'squelettes', name: 'Os-Errants', title: 'Squelettes', fac: 'ombre', rar: 'commun', type: 'unit',
    hp: 230, dmg: 65, hit: 1.0, spd: 1.3, range: 0.7, tgt: 'ground', count: 3, r: 0.4,
    model: { glb: 'Skeleton_Minion', add: [['Skeleton_Blade', 'handslot.r']], scale: 0.85, atk: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Stab'], spawn: 'Spawn_Ground_Skeletons' },
    lore: 'Ils ont oublié leur nom, leur royaume et leur visage. Pas leur épée.',
    ability: ['Horde', 'Trois squelettes : parfaits pour encercler.'] },
  { id: 'damne', name: 'Sire Morn', title: 'Chevalier Damné', fac: 'ombre', rar: 'rare', type: 'unit',
    hp: 1300, dmg: 140, hit: 1.3, spd: 1.0, range: 0.9, tgt: 'ground', count: 1, r: 0.6,
    model: { glb: 'Skeleton_Warrior', add: [['Skeleton_Axe', 'handslot.r'], ['Skeleton_Shield_Small_A', 'handslot.l']], scale: 1.08, glow: '#b46bff', atk: ['1H_Melee_Attack_Jump_Chop', '1H_Melee_Attack_Chop'], spawn: 'Spawn_Ground_Skeletons' },
    lore: 'Ancien champion de l’Aube, trahi et revenu d’entre les morts pour se venger.',
    ability: ['Vengeance', 'Robuste ; vole la vie comme toute la Légion des Ombres en synergie.'] },
  { id: 'osseuse', name: 'Vesper', title: 'Archère d’Os', fac: 'ombre', rar: 'commun', type: 'unit',
    hp: 370, dmg: 86, hit: 1.1, spd: 1.2, range: 5, tgt: 'any', count: 1, r: 0.42, proj: 'arrow',
    model: { glb: 'Skeleton_Rogue', add: [['Skeleton_Crossbow', 'handslot.r']], scale: 0.95, atk: ['1H_Ranged_Shoot'], spawn: 'Spawn_Ground_Skeletons' },
    lore: 'Elle tire avec un arc taillé dans ses propres côtes. Ne lui demandez pas comment.',
    ability: ['Tir funèbre', 'Tireuse à distance qui touche aussi les volants.'] },
  { id: 'morvak', name: 'Morvak', title: 'Nécromancien', fac: 'ombre', rar: 'epique', type: 'unit',
    hp: 800, dmg: 115, hit: 1.3, spd: 1.0, range: 4.5, tgt: 'any', count: 1, r: 0.5, proj: 'shadow',
    summon: { id: 'squelette', every: 8, n: 2 },
    model: { glb: 'Skeleton_Mage', add: [['Skeleton_Staff', 'handslot.r']], scale: 1.05, glow: '#b46bff', atk: ['Spellcast_Shoot'], cast: 'Spellcast_Summon', spawn: 'Spawn_Ground_Skeletons' },
    lore: 'Il parle aux morts. Le problème, c’est qu’ils lui répondent.',
    ability: ['Réveil des morts', 'Relève 2 squelettes toutes les 8 secondes.'] },
  { id: 'malakar', name: 'Malakar', title: 'Roi des Ombres', fac: 'ombre', rar: 'mythique', type: 'unit',
    hp: 2500, dmg: 200, hit: 1.4, spd: 0.9, range: 1.2, tgt: 'ground', count: 1, r: 0.95, splash: 1.5, lifesteal: 0.2,
    model: { glb: 'Skeleton_Warrior', add: [['Skeleton_Blade', 'handslot.r']], scale: 1.75, tint: '#8f7fb8', glow: '#b46bff', atk: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin'], spawn: 'Spawn_Ground_Skeletons' },
    lore: 'Le premier roi de Mythoria, devenu ombre pour ne jamais mourir. Il veut récupérer son trône.',
    ability: ['Moisson', 'Frappe de zone qui le soigne de 20 % des dégâts infligés.'] },

  // ----- Neutre -----
  { id: 'belier', name: 'Fracas', title: 'Bélier de Siège', fac: 'neutre', rar: 'rare', type: 'unit',
    hp: 1400, dmg: 290, hit: 1.8, spd: 1.6, range: 0.9, tgt: 'buildings', count: 1, r: 0.65,
    model: { proc: 'ram', scale: 1 },
    lore: 'Construit par les nains des Forges pour ouvrir n’importe quelle porte. Surtout celles des autres.',
    ability: ['Siège', 'Fonce droit sur le Sanctuaire ennemi et ignore les troupes.'] },

  // ----- Invocations (pas dans le deck) -----
  { id: 'golemet', token: true, name: 'Golemet', title: '', fac: 'sylve', rar: 'commun', type: 'unit',
    hp: 900, dmg: 70, hit: 1.4, spd: 0.9, range: 0.9, tgt: 'buildings', count: 1, r: 0.55, model: { proc: 'golem', scale: 0.6 } },
  { id: 'pousse', token: true, name: 'Pousse Ronceuse', title: '', fac: 'sylve', rar: 'commun', type: 'unit',
    hp: 170, dmg: 45, hit: 1.0, spd: 1.3, range: 0.7, tgt: 'ground', count: 1, r: 0.35, model: { proc: 'treant', scale: 0.7 } },
  { id: 'squelette', token: true, name: 'Squelette', title: '', fac: 'ombre', rar: 'commun', type: 'unit',
    hp: 160, dmg: 50, hit: 1.0, spd: 1.3, range: 0.7, tgt: 'ground', count: 1, r: 0.38,
    model: { glb: 'Skeleton_Minion', add: [['Skeleton_Blade', 'handslot.r']], scale: 0.75, atk: ['1H_Melee_Attack_Chop'], spawn: 'Spawn_Ground_Skeletons' } },
];

// Sortilèges : un seul par deck, lancé quand la jauge d'Éveil est pleine.
export const SPELLS = [
  { id: 'meteore', name: 'Météore Arcanique', fac: 'arcane', rar: 'epique', dmg: 620, radius: 2.4, sanctPct: 0.3, delay: 1.0, fx: 'meteor',
    desc: 'Un météore s’écrase après 1 seconde : énormes dégâts de zone.' },
  { id: 'givre', name: 'Tempête de Givre', fac: 'givre', rar: 'epique', dmg: 120, freeze: 4, radius: 3.2, sanctPct: 0.3, fx: 'freeze',
    desc: 'Gèle tous les ennemis de la zone pendant 4 secondes.' },
  { id: 'benediction', name: "Bénédiction de l'Aube", fac: 'aube', rar: 'rare', heal: 600, shieldAdd: 300, radius: 3.4, fx: 'heal',
    desc: 'Soigne tes héros dans la zone et leur donne un bouclier.' },
  { id: 'foudre', name: 'Colère du Ciel', fac: 'arcane', rar: 'rare', dmg: 300, radius: 3.0, sanctPct: 0.3, strikes: 3, fx: 'storm',
    desc: 'Trois éclairs frappent la zone coup sur coup.' },
];

export const HERO = Object.fromEntries(HEROES.map(c => [c.id, c]));
export const SPELL = Object.fromEntries(SPELLS.map(c => [c.id, c]));
export const PLAYABLE = HEROES.filter(c => !c.token);
// Compatibilité avec l'ancien nom.
export const CARD = HERO;

export const STARTER_DECK = ['ecuyer', 'archeres', 'loups', 'frere', 'apprenti', 'brann', 'jarl', 'squelettes'];
export const STARTER_SPELL = 'meteore';
export const DECK_SIZE = 8;

// Déblocage : chaque monde débloque les héros de sa faction (et le neutre au départ).
export const UNLOCKS = {
  0: ['ecuyer', 'frere', 'archeres', 'loups', 'apprenti', 'brann', 'jarl', 'squelettes', 'belier', 'osseuse', 'follets', 'solenne'],
  1: ['myra', 'cerf', 'golem', 'elwyn'],
  2: ['tourelle', 'vael'],
  3: ['dragonnet', 'kaelis', 'ignar'],
  4: ['frimas', 'nevra'],
  5: ['damne', 'morvak', 'malakar'],
};
export const SPELL_UNLOCKS = { 0: ['meteore', 'benediction'], 2: ['foudre'], 4: ['givre'] };

export function worldFor(trophies) {
  let w = WORLDS[0];
  for (const x of WORLDS) if (trophies >= x.trophies) w = x;
  return w;
}
export function unlockedHeroes(trophies) { return WORLDS.filter(w => trophies >= w.trophies).flatMap(w => UNLOCKS[w.id] || []); }
export function unlockedSpells(trophies) { return WORLDS.filter(w => trophies >= w.trophies).flatMap(w => SPELL_UNLOCKS[w.id] || []); }
export const unlockedCards = unlockedHeroes;

export const levelMult = lvl => Math.pow(1.1, (lvl || 1) - 1);
export const STAR_MULT = [1, 1, 1.8, 3.0];
export const STAR_SIZE = [1, 1, 1.18, 1.36];
export const MAX_STAR = 3;

export function deckSynergies(deck) {
  const n = {};
  for (const id of deck) { const f = HERO[id]?.fac; if (f && f !== 'neutre') n[f] = (n[f] || 0) + 1; }
  const out = {};
  for (const f in n) out[f] = n[f] >= 5 ? 2 : n[f] >= 3 ? 1 : 0;
  return { counts: n, tiers: out };
}

export function validateDeck(deck, owned) {
  if (!Array.isArray(deck) || deck.length !== DECK_SIZE) return 'Le deck doit contenir 8 héros.';
  if (new Set(deck).size !== DECK_SIZE) return 'Chaque héros ne peut être qu’une fois dans le deck.';
  for (const id of deck) {
    const c = HERO[id];
    if (!c || c.token) return 'Héros inconnu : ' + id;
    if (owned && !owned.includes(id)) return 'Héros pas encore débloqué : ' + c.name;
  }
  return null;
}
