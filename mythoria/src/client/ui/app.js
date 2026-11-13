// MYTHORIA — menus : accueil, cartes & deck, modes de jeu, profil, résultats.

import { CARD, PLAYABLE, RARITIES, FACTIONS, ARENAS, DECK_SIZE, deckSynergies } from '../../shared/content.js';
import { AI_LEVELS } from '../../shared/ai.js';
import { loadProfile, saveProfile, resetProfile, owned, arenaOf, botLevelFor, botDeck, applyResult, xpNeed } from '../store.js';
import { Battle, cardImg } from '../battle.js';
import { drawTower, drawLook } from '../render/sprites.js';
import { h, $, toast, sheet, confirmBox } from './dom.js';
import { sfx, setSound, unlockAudio } from '../audio.js';

let P, root, tab = 'battle', swapIn = null;

export function startApp(el, version) {
  root = el; P = loadProfile(); setSound(P.sound);
  document.addEventListener('pointerdown', unlockAudio, { once: false, passive: true });
  APP.version = version;
  render();
}
export const APP = { version: '' };

// ---------- Cadre général ----------
function render() {
  root.innerHTML = '';
  root.append(topBar(), h('main', { class: 'screen' }, screen()), navBar());
}

function topBar() {
  const need = xpNeed(P.lvl);
  return h('header', { class: 'topbar' },
    h('button', { class: 'me', onclick: openProfile },
      h('img', { class: 'avatar', src: cardImg(CARD[P.avatar] || CARD.ecuyer, 64, 64), alt: '' }),
      h('div', { class: 'me-txt' }, h('b', {}, P.name),
        h('div', { class: 'xp' }, h('span', { class: 'lvl' }, P.lvl), h('div', { class: 'xpbar' }, h('i', { style: { width: (P.xp / need * 100) + '%' } }))))),
    h('div', { class: 'res' },
      h('span', { class: 'pill trophy', title: 'Trophées' }, '🏆 ', P.trophies),
      h('span', { class: 'pill gold', title: 'Or' }, h('i', { class: 'coin' }), P.gold),
      h('span', { class: 'pill gem', title: 'Gemmes' }, '💎 ', P.gems)),
    h('button', { class: 'gear', onclick: openSettings, 'aria-label': 'Réglages' }, '⚙️'));
}

const TABS = [
  ['shop', '🛒', 'Boutique'], ['cards', '🃏', 'Cartes'], ['battle', '⚔️', 'Combat'], ['kingdom', '🏰', 'Royaume'], ['clan', '🛡️', 'Clan'],
];
function navBar() {
  return h('nav', { class: 'nav' }, TABS.map(([id, ic, nm]) =>
    h('button', { class: 'nav-b' + (tab === id ? ' on' : '') + (id === 'battle' ? ' mid' : ''), onclick: () => { sfx('click'); tab = id; swapIn = null; render(); } },
      h('span', { class: 'ic' }, ic), h('small', {}, nm))));
}

function screen() {
  if (tab === 'battle') return homeScreen();
  if (tab === 'cards') return cardsScreen();
  if (tab === 'shop') return soon('🛒', 'Boutique & Récompenses', 5, ['Boutique quotidienne', 'Coffres', 'Récompenses de connexion', 'Missions quotidiennes et hebdomadaires', 'Skins et objets cosmétiques', 'Pass saisonnier (équitable : pas de puissance à acheter)']);
  if (tab === 'kingdom') return soon('🏰', 'Ton Royaume', 4, ['Château à améliorer', 'Mines d’or et carrières', 'Casernes et camp d’entraînement', 'Tours de défense', 'Bâtiments spéciaux et décorations', 'Défendre ton territoire']);
  if (tab === 'clan') return soon('🛡️', 'Clans & Amis', 6, ['Créer ou rejoindre un clan', 'Chat du clan', 'Dons de cartes', 'Guerres de clans', 'Combats amicaux', 'Classements mondial, par pays et des clans']);
}

function soon(icon, title, phase, items) {
  return h('section', { class: 'soon' },
    h('div', { class: 'soon-ic' }, icon), h('h2', {}, title),
    h('p', { class: 'soon-tag' }, '🔨 En construction — phase ' + phase + ' du plan'),
    h('ul', {}, items.map(i => h('li', {}, i))),
    h('p', { class: 'muted' }, 'Rien n’est simulé : cette partie s’ouvrira quand elle fonctionnera pour de vrai.'));
}

// ---------- Accueil ----------
function arenaArt(a, w, hh) {
  const cv = h('canvas', { class: 'arena-art' });
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = hh * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const sky = { meadow: ['#8fd3ff', '#d9f4ff', '#79c457'], forest: ['#4a7f6a', '#9fd6b0', '#3f7a3a'], forge: ['#3a1f1a', '#c2552a', '#5a4a40'], arcane: ['#1e1a40', '#7a6ad8', '#5f5799'], peak: ['#7fa6d6', '#eaf4ff', '#dbe6f2'] }[a.theme];
  const g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, sky[0]); g.addColorStop(0.65, sky[1]); g.addColorStop(0.66, sky[2]); g.addColorStop(1, sky[2]);
  c.fillStyle = g; c.fillRect(0, 0, w, hh);
  c.fillStyle = 'rgba(0,0,0,.15)';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(i * w / 5 - 40, hh * 0.66); c.lineTo(i * w / 5 + 10, hh * (0.3 + (i % 3) * 0.07)); c.lineTo(i * w / 5 + 60, hh * 0.66); c.fill(); }
  c.save(); c.translate(w / 2, hh * 0.9); drawTower(c, hh * 0.2, 'citadel', 0, 1.3, 1, false); c.restore();
  c.save(); c.translate(w * 0.18, hh * 0.92); drawTower(c, hh * 0.15, 'side', 0, 2, 1, false); c.restore();
  c.save(); c.translate(w * 0.82, hh * 0.92); drawTower(c, hh * 0.15, 'side', 0, 3, 1, false); c.restore();
  if (a.theme === 'peak' || a.theme === 'forge') { c.save(); c.translate(w * 0.78, hh * 0.38); c.scale(-1, 1); drawLook(c, 'wyrm', hh * 0.17, 1, 0.6); c.restore(); }
  else { c.save(); c.translate(w * 0.3, hh * 0.92); drawLook(c, a.theme === 'arcane' ? 'archmage' : a.theme === 'forest' ? 'witch' : 'squire', hh * 0.22, 0, 0.4); c.restore(); }
  return cv;
}

function homeScreen() {
  const a = arenaOf(P), next = ARENAS[a.id + 1];
  const prog = next ? (P.trophies - a.trophies) / (next.trophies - a.trophies) : 1;
  return h('section', { class: 'home' },
    h('div', { class: 'arena-card' },
      arenaArt(a, 360, 170),
      h('div', { class: 'arena-info' },
        h('small', {}, 'Arène ' + (a.id + 1) + ' / ' + ARENAS.length), h('h2', {}, a.name),
        next ? h('div', { class: 'tprog' }, h('div', { class: 'tbar' }, h('i', { style: { width: prog * 100 + '%' } })),
          h('small', {}, '🏆 ' + P.trophies + ' / ' + next.trophies + ' → ' + next.name))
          : h('small', {}, '🏆 Arène la plus haute atteinte !'))),
    h('button', { class: 'btn big gold battle-btn', onclick: openModes }, '⚔️ COMBATTRE'),
    h('div', { class: 'deck-mini' },
      h('div', { class: 'row between' }, h('b', {}, 'Ton deck'), h('button', { class: 'btn small ghost', onclick: () => { tab = 'cards'; render(); } }, 'Modifier')),
      h('div', { class: 'mini-grid' }, P.deck.map(id => miniCard(CARD[id]))),
      synergyChips(P.deck)),
    h('div', { class: 'row gap' },
      h('button', { class: 'btn ghost grow', onclick: openHowTo }, '📖 Comment jouer'),
      h('button', { class: 'btn ghost grow', onclick: openRoadmap }, '🗺️ Le plan du jeu')),
    h('p', { class: 'muted center' }, '💾 Progression sauvegardée sur ce téléphone. Sauvegarde en ligne et vrais adversaires : phase 3.'));
}

function miniCard(c) {
  return h('div', { class: 'mcard', style: { '--rar': RARITIES[c.rar].color } }, h('img', { src: cardImg(c), alt: c.name }), h('span', {}, c.cost));
}

function synergyChips(deck) {
  const s = deckSynergies(deck);
  const chips = Object.keys(s.counts).sort((a, b) => s.counts[b] - s.counts[a]).map(f => {
    const F = FACTIONS[f], tier = s.tiers[f];
    return h('span', { class: 'chip' + (tier ? ' on' : ''), style: { '--fc': F.color }, title: F.name },
      F.icon + ' ' + s.counts[f] + (tier ? ' · ' + F.bonus[tier - 1] : ' · 3 pour un bonus'));
  });
  const avg = (deck.reduce((n, id) => n + CARD[id].cost, 0) / deck.length).toFixed(1);
  return h('div', { class: 'chips' }, h('span', { class: 'chip on', style: { '--fc': '#c49bff' } }, '💧 Coût moyen ' + avg), chips);
}

// ---------- Modes de jeu ----------
function openModes() {
  sfx('click');
  const lvl = botLevelFor(P), a = arenaOf(P);
  const s = sheet(h('div', { class: 'modes' },
    h('h3', {}, 'Choisis ton mode'),
    mode('🏟️', 'Mode Arène', 'Contre l’IA ' + AI_LEVELS[lvl].name + ' · difficulté croissante · gagne des trophées et de l’or', () => { s.close(); play('arena', lvl); }),
    h('div', { class: 'mode' },
      h('div', { class: 'mode-ic' }, '🎯'),
      h('div', { class: 'mode-txt' }, h('b', {}, 'Entraînement'), h('small', {}, 'Choisis le niveau de l’IA. Ne change pas tes trophées.'),
        h('div', { class: 'lvls' }, AI_LEVELS.map((L, i) => h('button', { class: 'btn small', onclick: () => { s.close(); play('training', i); } }, (i + 1) + '. ' + L.name))))),
    h('h4', {}, 'Bientôt'),
    mode('👥', 'Duel en ligne (1 contre 1)', 'Phase 3 — contre de vrais joueurs, via le serveur. Jamais de faux joueurs.', null),
    mode('🤝', 'Équipe (2 contre 2)', 'Phase 3 — avec un ami', null),
    mode('🧟', 'Survie', 'Phase 7 — résister aux vagues de monstres', null),
    mode('📜', 'Campagne', 'Phase 7 — histoire et boss', null),
    mode('🏆', 'Tournoi', 'Phase 6 — plusieurs joueurs', null),
    mode('⚔️', 'Guerre de clans', 'Phase 6 — batailles collectives', null),
    h('p', { class: 'muted center' }, 'Arène actuelle : ' + a.name)));
}
function mode(icon, title, desc, onPlay) {
  return h('div', { class: 'mode' + (onPlay ? '' : ' locked') },
    h('div', { class: 'mode-ic' }, icon),
    h('div', { class: 'mode-txt' }, h('b', {}, title), h('small', {}, desc)),
    onPlay ? h('button', { class: 'btn gold', onclick: onPlay }, 'Jouer') : h('span', { class: 'lock' }, '🔒'));
}

function play(modeId, level) {
  const theme = modeId === 'arena' ? arenaOf(P).theme : ARENAS[Math.min(level, ARENAS.length - 1)].theme;
  const oppTrophies = modeId === 'arena' ? P.trophies : ARENAS[Math.min(level, ARENAS.length - 1)].trophies;
  const holder = h('div', { class: 'battle-holder' });
  document.body.append(holder);
  document.body.classList.add('in-battle');
  new Battle(holder, {
    deck: P.deck.slice(), oppDeck: botDeck(oppTrophies, (Math.random() * 1e9) | 0), botLevel: level, theme, myName: P.name, mode: modeId,
    onEnd: r => { holder.remove(); document.body.classList.remove('in-battle'); showResult(r); },
  });
}

// ---------- Résultat ----------
function showResult(r) {
  const rew = applyResult(P, r);
  const title = r.result === 'win' ? 'Victoire !' : r.result === 'loss' ? 'Défaite' : 'Égalité';
  const crowns = n => h('div', { class: 'crowns' }, [0, 1, 2].map(i => h('span', { class: i < n ? 'on' : '' }, '♛')));
  const page = h('div', { class: 'result ' + r.result },
    h('h1', {}, title),
    h('div', { class: 'vs' },
      h('div', {}, h('b', {}, P.name), crowns(r.crowns)),
      h('div', { class: 'vs-x' }, 'VS'),
      h('div', {}, h('b', {}, '🤖 ' + r.opp), crowns(r.oppCrowns))),
    r.reason === 'forfeit' ? h('p', { class: 'muted' }, 'Abandon') : null,
    h('div', { class: 'rewards' },
      r.mode === 'arena' ? h('div', { class: 'rw' }, '🏆', h('b', {}, (rew.trophies >= 0 ? '+' : '') + rew.trophies), h('small', {}, 'trophées')) : h('div', { class: 'rw' }, '🎯', h('b', {}, 'Entraînement'), h('small', {}, 'sans trophées')),
      h('div', { class: 'rw' }, h('i', { class: 'coin big' }), h('b', {}, '+' + rew.gold), h('small', {}, 'or')),
      h('div', { class: 'rw' }, '⭐', h('b', {}, '+' + rew.xp), h('small', {}, 'expérience'))),
    rew.lvlUp ? h('div', { class: 'banner-good' }, '🎉 Niveau ' + P.lvl + ' ! +10 💎') : null,
    rew.newArena ? h('div', { class: 'banner-good' }, '🏟️ Nouvelle arène : ' + rew.newArena.name + ' !') : null,
    rew.newCards.length ? h('div', { class: 'newcards' }, h('b', {}, 'Nouvelles cartes débloquées !'), h('div', { class: 'mini-grid' }, rew.newCards.map(id => miniCard(CARD[id])))) : null,
    h('button', { class: 'btn big gold', onclick: () => { page.remove(); render(); } }, 'Continuer'));
  document.body.append(page);
  if (rew.gold) setTimeout(() => sfx('coin'), 300);
}

// ---------- Cartes & deck ----------
function cardsScreen() {
  const own = owned(P);
  const sorted = PLAYABLE.slice().sort((a, b) => RARITIES[a.rar].order - RARITIES[b.rar].order || a.cost - b.cost);
  const arenaOfCard = id => ARENAS.find(a => a.unlock.includes(id));
  return h('section', { class: 'cards' },
    h('div', { class: 'panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Deck de combat'), h('small', { class: 'muted' }, DECK_SIZE + ' cartes')),
      swapIn ? h('div', { class: 'swap-hint' }, 'Touche la carte du deck à remplacer par ', h('b', {}, CARD[swapIn].name), h('button', { class: 'btn small ghost', onclick: () => { swapIn = null; render(); } }, 'Annuler')) : null,
      h('div', { class: 'deck-grid' + (swapIn ? ' swapping' : '') }, P.deck.map((id, i) => bigCard(CARD[id], {
        onclick: () => {
          if (swapIn) { P.deck[i] = swapIn; swapIn = null; saveProfile(P); sfx('click'); toast('Deck mis à jour ✓'); render(); }
          else openCard(CARD[id]);
        },
      }))),
      synergyChips(P.deck)),
    h('div', { class: 'panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Collection'), h('small', { class: 'muted' }, own.length + ' / ' + PLAYABLE.length)),
      h('div', { class: 'coll-grid' }, sorted.map(c => {
        const lock = !own.includes(c.id);
        return bigCard(c, { lock, inDeck: P.deck.includes(c.id), sub: lock ? '🔒 ' + arenaOfCard(c.id).name : null, onclick: () => openCard(c) });
      }))));
}

function bigCard(c, { lock, inDeck, sub, onclick } = {}) {
  return h('button', { class: 'bcard' + (lock ? ' lock' : '') + (inDeck ? ' indeck' : ''), style: { '--rar': RARITIES[c.rar].color }, onclick },
    h('img', { src: cardImg(c), alt: '' }),
    h('span', { class: 'bcost' }, c.cost),
    h('span', { class: 'bname' }, c.name.split(',')[0]),
    sub ? h('span', { class: 'bsub' }, sub) : null);
}

const TGT = { ground: 'Au sol', any: 'Sol et air', buildings: 'Bâtiments' };
function openCard(c) {
  sfx('click');
  const own = owned(P).includes(c.id), inDeck = P.deck.includes(c.id);
  const stats = [];
  if (c.type !== 'spell') {
    stats.push(['❤️ Points de vie', c.hp], ['⚔️ Dégâts', c.dmg + (c.splash ? ' (zone)' : '')], ['⏱️ Attaque toutes les', c.hit + ' s']);
    if (c.type === 'unit') stats.push(['👟 Vitesse', c.spd >= 1.8 ? 'Très rapide' : c.spd >= 1.4 ? 'Rapide' : c.spd >= 1.0 ? 'Moyenne' : 'Lente']);
    stats.push(['🎯 Portée', c.range <= 1 ? 'Corps à corps' : c.range + ' cases'], ['🪽 Cible', TGT[c.tgt]]);
    if (c.count > 1) stats.push(['👥 Nombre', '×' + c.count]);
    if (c.fly) stats.push(['🕊️ Vole', 'Oui']);
    if (c.life) stats.push(['⌛ Durée', c.life + ' s']);
  } else {
    if (c.dmg) stats.push(['💥 Dégâts', c.dmg], ['🏰 Sur les tours', Math.round(c.dmg * (c.towerPct || 0.35))]);
    if (c.heal) stats.push(['💚 Soin', c.heal], ['🛡️ Bouclier', c.shieldAdd]);
    if (c.freeze) stats.push(['❄️ Gel', c.freeze + ' s']);
    stats.push(['⭕ Rayon', c.radius + ' cases']);
    if (c.delay) stats.push(['⏳ Délai', c.delay + ' s']);
  }
  const F = FACTIONS[c.fac];
  const big = cardArt2(c);
  const s = sheet(h('div', { class: 'cdetail' },
    h('div', { class: 'cd-top' }, big,
      h('div', {},
        h('h3', {}, c.name),
        h('div', { class: 'chips' },
          h('span', { class: 'chip on', style: { '--fc': RARITIES[c.rar].color } }, RARITIES[c.rar].name),
          h('span', { class: 'chip on', style: { '--fc': F.color } }, F.icon + ' ' + F.name)),
        h('p', { class: 'cost-line' }, '💧 Coût : ', h('b', {}, c.cost + ' éther')),
        h('p', {}, c.desc))),
    h('div', { class: 'stats' }, stats.map(([k, v]) => h('div', { class: 'st' }, h('small', {}, k), h('b', {}, v)))),
    c.type === 'unit' && c.count === 1 ? h('p', { class: 'tip' }, '✨ Fusion : pose cette carte sur une copie déjà en jeu pour la faire passer ★2 puis ★3 (beaucoup plus forte).') : null,
    F.bonus ? h('p', { class: 'tip' }, F.icon + ' Synergie ' + F.name + ' : 3 cartes = ' + F.bonus[0] + ', 5 cartes = ' + F.bonus[1] + '.') : null,
    h('p', { class: 'muted' }, 'Niveau 1 · les améliorations et évolutions arrivent en phase 5.'),
    !own ? h('p', { class: 'tip lock' }, '🔒 Se débloque dans l’arène « ' + ARENAS.find(a => a.unlock.includes(c.id)).name + ' » (' + ARENAS.find(a => a.unlock.includes(c.id)).trophies + ' 🏆)')
      : inDeck ? h('p', { class: 'tip' }, '✅ Dans ton deck. Pour la retirer, choisis une autre carte et remplace celle-ci.')
        : h('button', { class: 'btn big gold', onclick: () => { swapIn = c.id; tab = 'cards'; s.close(); render(); } }, 'Mettre dans le deck')));
}

function cardArt2(c) {
  const img = h('img', { class: 'cd-art', src: cardImg(c, 150, 180), alt: '' });
  img.style.setProperty('--rar', RARITIES[c.rar].color);
  return img;
}

// ---------- Profil ----------
function openProfile() {
  sfx('click');
  const input = h('input', { class: 'inp', maxlength: 16, value: P.name });
  const st = P.stats, rate = st.played ? Math.round(st.w / st.played * 100) : 0;
  const avatars = owned(P).filter(id => CARD[id].type !== 'spell');
  const s = sheet(h('div', { class: 'profile' },
    h('h3', {}, 'Ton profil'),
    h('label', {}, 'Pseudo'), h('div', { class: 'row gap' }, input, h('button', { class: 'btn gold', onclick: () => {
      const v = input.value.replace(/[<>]/g, '').trim().slice(0, 16);
      if (v.length < 3) return toast('3 caractères minimum', 'bad');
      P.name = v; saveProfile(P); toast('Pseudo enregistré ✓'); s.close(); render();
    } }, 'OK')),
    h('label', {}, 'Avatar'),
    h('div', { class: 'avatars' }, avatars.map(id => h('button', { class: 'av' + (P.avatar === id ? ' on' : ''), onclick: () => { P.avatar = id; saveProfile(P); s.close(); render(); } }, h('img', { src: cardImg(CARD[id], 64, 64), alt: CARD[id].name })))),
    h('div', { class: 'stats' },
      [['Niveau', P.lvl], ['Trophées', P.trophies], ['Record', P.best], ['Combats (arène)', st.played], ['Victoires', st.w + ' (' + rate + ' %)'], ['Défaites', st.l], ['Couronnes', st.crowns]]
        .map(([k, v]) => h('div', { class: 'st' }, h('small', {}, k), h('b', {}, v)))),
    h('h4', {}, 'Historique des combats'),
    P.hist.length ? h('div', { class: 'hist' }, P.hist.slice(0, 15).map(x => h('div', { class: 'hrow ' + x.result },
      h('span', {}, x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '➖'),
      h('span', { class: 'grow' }, (x.mode === 'arena' ? 'Arène' : 'Entraînement') + ' · 🤖 ' + x.opp),
      h('span', {}, x.crowns + '-' + x.oppCrowns),
      h('span', { class: 'muted' }, x.mode === 'arena' ? (x.trophies >= 0 ? '+' : '') + x.trophies + '🏆' : '')))) : h('p', { class: 'muted' }, 'Aucun combat pour l’instant.'),
    h('p', { class: 'muted' }, 'Compte en ligne (changer de téléphone sans rien perdre) : phase 3.')));
}

// ---------- Réglages, aide, plan ----------
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

function openSettings() {
  sfx('click');
  const s = sheet(h('div', { class: 'settings' },
    h('h3', {}, 'Réglages'),
    h('button', { class: 'btn ghost wide', onclick: () => { P.sound = !P.sound; setSound(P.sound); saveProfile(P); s.close(); openSettings(); } }, P.sound ? '🔊 Son : activé' : '🔇 Son : coupé'),
    h('button', { class: 'btn ghost wide', onclick: install }, '📲 Installer le jeu sur l’écran d’accueil'),
    h('button', { class: 'btn ghost wide', onclick: share }, '🔗 Partager le jeu avec mes amis'),
    h('button', { class: 'btn ghost wide', onclick: () => window.__checkUpdate && window.__checkUpdate(true) }, '🔄 Chercher une mise à jour'),
    h('button', { class: 'btn red wide', onclick: async () => { if (await confirmBox('Effacer toute ta progression sur ce téléphone ?', 'Tout effacer')) { resetProfile(); P = loadProfile(); s.close(); render(); toast('Progression effacée'); } } }, '🗑️ Recommencer à zéro'),
    h('p', { class: 'muted center' }, 'MYTHORIA · version ' + APP.version)));
}

async function install() {
  if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  sheet(h('div', { class: 'settings' }, h('h3', {}, 'Installer MYTHORIA'),
    h('p', {}, ios ? 'Dans Safari : touche le bouton Partager (carré avec une flèche), puis « Sur l’écran d’accueil ».'
      : 'Dans Chrome : touche le menu ⋮ en haut à droite, puis « Ajouter à l’écran d’accueil » ou « Installer l’application ».')));
}
async function share() {
  const url = location.href.split('#')[0].split('?')[0];
  if (navigator.share) { try { await navigator.share({ title: 'MYTHORIA', text: 'Viens jouer à MYTHORIA avec moi !', url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast('Lien copié ✓'); } catch (e) { toast(url); } }
}

function openHowTo() {
  sfx('click');
  sheet(h('div', { class: 'howto' },
    h('h3', {}, 'Comment jouer'),
    h('ol', {},
      h('li', {}, h('b', {}, 'But : '), 'détruire les tours adverses. Chaque tour = 1 couronne ♛. La Citadelle (au fond) = victoire immédiate.'),
      h('li', {}, h('b', {}, 'Éther 💧 : '), 'il se recharge tout seul (max 10). Chaque carte coûte de l’éther. Dans la dernière minute, il se recharge 2× plus vite.'),
      h('li', {}, h('b', {}, 'Poser une carte : '), 'fais glisser une carte de ta main vers ton côté de l’arène (ou touche la carte, puis touche l’arène). Les sorts se posent partout.'),
      h('li', {}, h('b', {}, 'Fusion ✨ : '), 'pose une troupe sur la même troupe déjà en jeu : elle devient ★2 puis ★3.'),
      h('li', {}, h('b', {}, 'Synergies : '), '3 cartes d’une même faction dans ton deck donnent un bonus, 5 cartes un plus gros bonus.'),
      h('li', {}, h('b', {}, 'Tour détruite : '), 'tu peux poser tes troupes plus loin de ce côté.'),
      h('li', {}, h('b', {}, 'Temps : '), '3 minutes. Égalité de couronnes : prolongation, la première tour détruite gagne.')),
    h('p', { class: 'muted' }, 'Astuce : laisse l’adversaire attaquer, défends-toi à bas prix, puis contre-attaque avec ce qui reste de tes troupes.')));
}

function openRoadmap() {
  sfx('click');
  const ph = [
    ['1', 'Fondation', 'Architecture, identité visuelle, menus, interface mobile, première arène', 'ok'],
    ['2', 'Premier vrai jeu', 'Héros, cartes, deck, unités, combat, victoire/défaite, fusion, synergies, IA', 'ok'],
    ['3', 'Multijoueur', 'Comptes, serveur, matchmaking, vrais adversaires, sauvegarde en ligne, anti-triche', 'next'],
    ['4', 'Royaume', 'Construction, ressources, améliorations, défense', ''],
    ['5', 'Progression', 'Collection, niveaux de cartes, évolutions, coffres, boutique équitable', ''],
    ['6', 'Communauté', 'Amis, clans, chat, tournois, classements', ''],
    ['7', 'Extension', 'Campagne, boss, survie, événements, nouvelles cartes', ''],
  ];
  sheet(h('div', { class: 'roadmap' }, h('h3', {}, 'Le plan de MYTHORIA'),
    ph.map(([n, t, d, st]) => h('div', { class: 'ph ' + st }, h('span', { class: 'phn' }, st === 'ok' ? '✓' : n), h('div', {}, h('b', {}, 'Phase ' + n + ' — ' + t), h('small', {}, d)), st === 'next' ? h('span', { class: 'chip on', style: { '--fc': '#ffd166' } }, 'Prochaine') : null))));
}
