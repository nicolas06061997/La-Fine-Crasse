// MYTHORIA — menus : accueil 3D, héros & deck, fiche de héros 3D, mondes, modes, résultats, profil.
import { HERO, PLAYABLE, SPELL, SPELLS, RARITIES, FACTIONS, WORLDS, UNLOCKS, SPELL_UNLOCKS, DECK_SIZE, STAR_MULT, deckSynergies } from '../../shared/content.js';
import { AI_LEVELS } from '../../shared/ai.js';
import { loadProfile, saveProfile, resetProfile, owned, ownedSpells, worldOf, botLevelFor, botDeck, botSpell, botLevels, applyResult, xpNeed, heroLevel, canUpgrade, CHESTS } from '../store.js';
import { initProgress, chestRow, missionsButton, loginPopup, shopScreen, heroProgress, chestIcon } from './progress.js';
import { initKingdom, kingdomScreen, leaveKingdom } from './kingdom.js';
import { initModes, openCampaign, playSurvival, playEvent, playTourney, currentEvent, eventWinsLeft } from './modes.js';
import { Battle, spellIcon } from '../battle.js';
import { HeroMode } from '../heromode.js';
import { Showcase, portrait } from '../three/showcase.js';
import { webglOk } from '../three/stage.js';
import { THEMES } from '../three/world.js';
import { h, toast, sheet, confirmBox } from './dom.js';
import { icon } from './icons.js';
import { sfx, setSound, unlockAudio } from '../audio.js';

let P, root, tab = 'battle', swapIn = null, filter = 'all', stage = null;
export const APP = { version: '' };

export function startApp(el, version) {
  root = el; APP.version = version; P = loadProfile(); saveProfile(P); setSound(P.sound);
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  if (!webglOk()) { root.innerHTML = '<div class="nogl"><div class="logo">MYTHORIA</div><p>Ton navigateur ne permet pas l’affichage 3D (WebGL). Ouvre le jeu dans Chrome à jour.</p></div>'; return; }
  initProgress({ P: () => P, render: () => render(), portraitImg });
  initKingdom({ P: () => P, render: () => render() });
  initModes({ P: () => P, render: () => render(), play: (m, l, w, x) => play(m, l, w, x) });
  render();
  setTimeout(loginPopup, 900);
  // prépare les portraits en arrière-plan
  setTimeout(() => P.deck.forEach(id => portrait(id)), 600);
}

// ---------- Cadre ----------
function render() {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  root.innerHTML = '';
  root.append(topBar(), h('main', { class: 'screen s-' + tab }, screen()), navBar());
}

function portraitImg(id, cls = 'pt') {
  const img = h('img', { class: cls + ' loading', alt: HERO[id].name });
  portrait(id).then(u => { if (u) { img.src = u; img.classList.remove('loading'); } });
  return img;
}

function topBar() {
  const need = xpNeed(P.lvl);
  return h('header', { class: 'topbar' },
    h('button', { class: 'me', onclick: openProfile },
      h('div', { class: 'avatar' }, portraitImg(P.avatar, 'av-img')),
      h('div', { class: 'me-txt' }, h('b', {}, P.name),
        h('div', { class: 'xp' }, h('span', { class: 'lvl' }, P.lvl), h('div', { class: 'xpbar' }, h('i', { style: { width: (P.xp / need * 100) + '%' } }))))),
    h('div', { class: 'res' },
      h('span', { class: 'pill' }, icon('trophy'), P.trophies),
      h('span', { class: 'pill' }, icon('coin'), P.gold),
      h('span', { class: 'pill' }, icon('gem'), P.gems)),
    h('button', { class: 'gear', onclick: openSettings, 'aria-label': 'Réglages' }, icon('gear')));
}

const TABS = [['shop', 'shop', 'Boutique'], ['heroes', 'heroes', 'Héros'], ['battle', 'sword', 'Combat'], ['kingdom', 'castle', 'Royaume'], ['clan', 'clan', 'Clan']];
function navBar() {
  return h('nav', { class: 'nav' }, TABS.map(([id, ic, nm]) =>
    h('button', { class: 'nav-b' + (tab === id ? ' on' : '') + (id === 'battle' ? ' mid' : ''), onclick: () => { sfx('click'); tab = id; swapIn = null; render(); } },
      icon(ic), h('small', {}, nm))));
}

function screen() {
  if (tab === 'battle') return homeScreen();
  if (tab === 'heroes') return heroesScreen();
  if (tab === 'shop') return shopScreen();
  if (tab === 'kingdom') return kingdomScreen();
  if (tab === 'clan') return soon('clan', 'Clans & Amis', 6, ['Créer ou rejoindre un clan', 'Chat du clan', 'Dons de héros', 'Guerres de clans', 'Combats amicaux', 'Classements mondial, par pays et des clans']);
}

function soon(ic, title, phase, items) {
  return h('section', { class: 'soon' },
    h('div', { class: 'soon-ic' }, icon(ic)), h('h2', {}, title),
    h('p', { class: 'soon-tag' }, 'En construction — phase ' + phase + ' du plan'),
    h('ul', {}, items.map(i => h('li', {}, i))),
    h('p', { class: 'muted' }, 'Rien n’est simulé : cette partie s’ouvrira quand elle fonctionnera pour de vrai.'));
}

// ---------- Accueil ----------
function homeScreen() {
  const w = worldOf(P), next = WORLDS[w.id + 1];
  const prog = next ? (P.trophies - w.trophies) / (next.trophies - w.trophies) : 1;
  const fav = HERO[P.avatar] || HERO.ecuyer;
  const cv = h('canvas', { class: 'home-3d' });
  const T = THEMES[w.key];
  const el = h('section', { class: 'home' },
    h('div', { class: 'home-stage', style: { '--sky1': T.skyTop, '--sky2': T.skyBot } },
      cv,
      h('div', { class: 'home-world' }, h('small', {}, 'Monde ' + (w.id + 1) + ' / ' + WORLDS.length), h('b', {}, w.name)),
      h('button', { class: 'home-hero', onclick: () => openHero(fav.id) },
        h('span', { class: 'rar', style: { '--rc': RARITIES[fav.rar].color } }, RARITIES[fav.rar].name),
        h('b', {}, fav.name), h('small', {}, fav.title)),
      h('div', { class: 'home-prog' },
        next ? [h('div', { class: 'tbar' }, h('i', { style: { width: prog * 100 + '%' } })), h('small', {}, icon('trophy'), P.trophies + ' / ' + next.trophies + ' → ' + next.name)]
          : h('small', {}, 'Tu as atteint le dernier monde !'))),
    h('button', { class: 'btn-battle', onclick: openModes }, h('span', { class: 'seal' }, icon('sword')), h('b', {}, 'COMBATTRE'), h('small', {}, 'Mode Arène · ' + AI_LEVELS[botLevelFor(P)].name)),
    chestRow(),
    h('div', { class: 'home-row' },
      tile('map', 'Mondes', WORLDS.filter(x => P.trophies >= x.trophies).length + ' / 6', openWorlds),
      tile('heroes', 'Héros', owned(P).length + ' / ' + PLAYABLE.length, () => { tab = 'heroes'; render(); }),
      missionsButton(),
      tile('book', 'Règles', 'Comment jouer', openHowTo)),
    h('p', { class: 'muted center small' }, 'Progression sauvegardée sur ce téléphone · vrais adversaires en ligne : phase 3'));
  requestAnimationFrame(() => { if (cv.isConnected) stage = new Showcase(cv, { world: w.key, heroId: fav.id, mode: 'home', skin: P.skins.eq[fav.id] }); });
  return el;
}
function tile(ic, title, sub, fn) { return h('button', { class: 'tile', onclick: () => { sfx('click'); fn(); } }, icon(ic), h('b', {}, title), h('small', {}, sub)); }

// ---------- Modes ----------
function openModes() {
  sfx('click');
  const lvl = botLevelFor(P), w = worldOf(P), ev = currentEvent();
  const T = P.tourney || { round: 0 };
  const s = sheet(h('div', { class: 'modes' },
    h('h3', {}, 'Choisis ton combat'),
    mode('sword', 'Arène', 'Contre l’IA ' + AI_LEVELS[lvl].name + ' dans « ' + w.name + ' » · trophées, or et coffres', () => { s.close(); play('arena', lvl, w); }),
    mode('map', 'Campagne', 'L’histoire de Mythoria, 30 étapes et 6 boss · étape ' + Math.min(30, P.campaign.done + 1) + '/30', () => { s.close(); openCampaign(); }),
    mode('shield', 'Survie · Défense du Royaume', 'Résiste aux vagues de monstres et de boss · record : vague ' + (P.records.survival || 0), () => { s.close(); playSurvival(); }),
    mode('star', 'Événement : ' + ev.name, ev.desc + ' · ' + eventWinsLeft(P) + ' récompenses restantes aujourd’hui', () => { s.close(); playEvent(); }),
    mode('heroes', 'Mode Héros', 'Dirige toi-même un héros (joystick) contre des vagues de monstres · record : vague ' + (P.records.hero || 0), () => { s.close(); pickHero(); }),
    mode('trophy', 'Tournoi (contre l’IA)', '3 manches de plus en plus dures · manche ' + (T.round + 1) + '/3 · tournois gagnés : ' + (P.records.tournament || 0), () => { s.close(); playTourney(); }),
    h('div', { class: 'mode' },
      h('div', { class: 'mode-ic' }, icon('summon')),
      h('div', { class: 'mode-txt' }, h('b', {}, 'Entraînement'), h('small', {}, 'Choisis le niveau de l’IA. Sans trophées.'),
        h('div', { class: 'lvls' }, AI_LEVELS.map((L, i) => h('button', { class: 'btn small', onclick: () => { s.close(); play('training', i, w); } }, (i + 1) + '. ' + L.name))))),
    h('h4', {}, 'Avec le serveur (phase 3)'),
    mode('heroes', 'Duel en ligne · 2 contre 2', 'Contre de vrais joueurs. Jamais de faux joueurs.', null),
    mode('clan', 'Amis, clans, chat, guerre de clans, classements', 'Ils ont besoin du serveur pour relier les joueurs.', null)));
}
function mode(ic, title, desc, onPlay) {
  return h('div', { class: 'mode' + (onPlay ? '' : ' locked') },
    h('div', { class: 'mode-ic' }, icon(ic)),
    h('div', { class: 'mode-txt' }, h('b', {}, title), h('small', {}, desc)),
    onPlay ? h('button', { class: 'btn gold', onclick: onPlay }, 'Jouer') : h('span', { class: 'lock' }, icon('lock')));
}

function play(modeId, level, world, extra = {}) {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  const tro = modeId === 'arena' ? P.trophies : Math.max(P.trophies, world.trophies);
  const seed = (Math.random() * 1e9) | 0;
  const oppDeck = extra.oppDeck || botDeck(tro, seed, world.fac);
  const holder = h('div', { class: 'battle-holder' });
  document.body.append(holder); document.body.classList.add('in-battle');
  new Battle(holder, {
    deck: P.deck.slice(), spell: P.spell, oppDeck, oppSpell: botSpell(tro, seed), botLevel: level, world, myName: P.name, mode: modeId,
    levels: { ...P.levels }, oppLevels: extra.oppLevels || botLevels(oppDeck, tro), skins: { ...P.skins.eq },
    simMode: extra.simMode, boss: extra.boss, waves: extra.waves, mods: extra.mods, bonus: extra.bonus, title: extra.title,
    onEnd: r => { holder.remove(); document.body.classList.remove('in-battle'); if (extra.onResult) r = extra.onResult(r) || r; showResult(r); },
  });
}

// ---------- Mode Héros ----------
function pickHero() {
  const list = owned(P);
  const s = sheet(h('div', { class: 'modes' }, h('h3', {}, 'Choisis ton héros'), h('p', { class: 'muted' }, 'Glisse à gauche pour bouger, bouton Attaque à droite, Super quand le cercle est plein. Les niveaux de tes héros comptent.'),
    h('div', { class: 'coll-grid' }, list.map(id => heroCard(HERO[id], { onclick: () => { s.close(); playHero(id); } })))));
}
function playHero(id) {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  const holder = h('div', { class: 'battle-holder' });
  document.body.append(holder); document.body.classList.add('in-battle');
  new HeroMode(holder, { heroId: id, level: heroLevel(P, id), world: worldOf(P), skin: P.skins.eq[id], onEnd: r => {
    holder.remove(); document.body.classList.remove('in-battle');
    const rec = r.wave > (P.records.hero || 0);
    if (rec) P.records.hero = r.wave;
    showResult({ mode: 'hero', result: 'hero', wave: r.wave, opp: '', myHp: 0, oppHp: 0, note: r.kills + ' monstres vaincus' + (rec ? ' · nouveau record !' : ''), reward: { gold: r.kills * 2 + r.wave * 10, crystals: r.wave >= 5 ? r.wave * 2 : 0 } });
  } });
}

// ---------- Résultat ----------
function showResult(r) {
  const rew = applyResult(P, r);
  const title = r.result === 'survival' || r.result === 'hero' ? 'Vague ' + (r.wave || 0) : r.result === 'win' ? 'Victoire !' : r.result === 'loss' ? 'Défaite' : 'Égalité';
  const bar = (v, cls) => h('div', { class: 'rbar ' + cls }, h('i', { style: { width: Math.round(v * 100) + '%' } }), h('span', {}, Math.round(v * 100) + ' %'));
  const page = h('div', { class: 'result ' + r.result },
    h('h1', {}, title),
    h('div', { class: 'rvs' },
      r.result === 'hero' ? h('div', {}, h('b', {}, P.name), h('small', {}, 'Vagues'), h('b', {}, r.wave)) : h('div', {}, h('b', {}, P.name), h('small', {}, 'Ton Sanctuaire'), bar(r.myHp, 'blue')),
      r.result === 'survival' || r.result === 'hero' ? h('div', {}, h('b', {}, r.result === 'hero' ? 'Mode Héros' : 'Survie'), h('small', {}, 'Record'), h('b', {}, 'Vague ' + (r.result === 'hero' ? P.records.hero : P.records.survival || 0))) : h('div', {}, h('b', {}, '🤖 ' + r.opp), h('small', {}, 'Sanctuaire ennemi'), bar(r.oppHp, 'red'))),
    r.note ? h('div', { class: 'banner-good' }, r.note) : null,
    rew.extra ? h('div', { class: 'rchips' }, Object.entries(rew.extra).filter(([k, v]) => v).map(([k, v]) => h('span', { class: 'rchip' }, k === 'gold' ? icon('coin') : k === 'gems' ? icon('gem') : k === 'crystals' ? icon('crystal') : k === 'chest' ? chestIcon(v, 'xs') : '', k === 'chest' ? CHESTS[v].name : '+' + v))) : null,
    r.reason === 'forfeit' ? h('p', { class: 'muted' }, 'Abandon') : r.heart ? h('p', { class: 'muted' }, '✦ Tu tenais le Cœur de Mythe à la fin : +10 or') : null,
    h('div', { class: 'rewards' },
      r.mode === 'arena' ? h('div', { class: 'rw' }, icon('trophy'), h('b', {}, (rew.trophies >= 0 ? '+' : '') + rew.trophies), h('small', {}, 'trophées')) : h('div', { class: 'rw' }, icon('summon'), h('b', {}, { training: 'Entraînement', campaign: 'Campagne', survival: 'Survie', event: 'Événement', tourney: 'Tournoi', hero: 'Mode Héros' }[r.mode] || 'Mode'), h('small', {}, 'sans trophées')),
      h('div', { class: 'rw' }, icon('coin'), h('b', {}, '+' + rew.gold), h('small', {}, 'or')),
      h('div', { class: 'rw' }, icon('star'), h('b', {}, '+' + rew.xp), h('small', {}, 'expérience'))),
    rew.chest ? h('div', { class: 'banner-good row gap' }, chestIcon(rew.chest, 'xs'), CHESTS[rew.chest].name + ' gagné !') : (r.mode === 'arena' && r.result === 'win' ? h('p', { class: 'muted' }, 'Emplacements de coffres pleins : ouvre-en un pour en gagner d’autres.') : null),
    rew.lvlUp ? h('div', { class: 'banner-good' }, 'Niveau ' + P.lvl + ' ! +10 gemmes') : null,
    rew.newWorld ? h('div', { class: 'banner-good' }, 'Nouveau monde : ' + rew.newWorld.name + ' !') : null,
    rew.newHeroes.length ? h('div', { class: 'newcards' }, h('b', {}, 'Nouveaux héros débloqués !'), h('div', { class: 'mini-row' }, rew.newHeroes.map(id => h('div', { class: 'mini', style: { '--rc': RARITIES[HERO[id].rar].color } }, portraitImg(id), h('small', {}, HERO[id].name))))) : null,
    rew.newSpells.length ? h('div', { class: 'banner-good' }, 'Nouveau sortilège : ' + rew.newSpells.map(id => SPELL[id].name).join(', ')) : null,
    h('button', { class: 'btn big gold', onclick: () => { page.remove(); render(); } }, 'Continuer'));
  document.body.append(page);
  if (rew.gold) setTimeout(() => sfx('coin'), 300);
}

// ---------- Héros & deck ----------
function heroesScreen() {
  const own = owned(P), ownS = ownedSpells(P);
  const facs = ['all', 'aube', 'arcane', 'sylve', 'braise', 'givre', 'ombre', 'neutre'];
  const list = PLAYABLE.filter(c => filter === 'all' || c.fac === filter).sort((a, b) => (own.includes(b.id) - own.includes(a.id)) || RARITIES[b.rar].order - RARITIES[a.rar].order);
  const worldOfHero = id => WORLDS.find(w => (UNLOCKS[w.id] || []).includes(id));
  return h('section', { class: 'heroes' },
    h('div', { class: 'panel deck-panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Ton deck'), h('small', { class: 'muted' }, '8 héros + 1 sortilège')),
      swapIn ? h('div', { class: 'swap-hint' }, 'Touche le héros à remplacer par ', h('b', {}, HERO[swapIn].name), h('button', { class: 'btn small ghost', onclick: () => { swapIn = null; render(); } }, 'Annuler')) : null,
      h('div', { class: 'deck-grid' + (swapIn ? ' swapping' : '') }, P.deck.map((id, i) => heroCard(HERO[id], {
        onclick: () => { if (swapIn) { P.deck[i] = swapIn; swapIn = null; saveProfile(P); sfx('click'); toast('Deck mis à jour ✓'); render(); } else openHero(id); },
      }))),
      h('button', { class: 'spell-slot', onclick: () => openSpells(ownS) },
        h('span', { class: 'sp-ic' }, icon(spellIcon(P.spell))),
        h('div', {}, h('small', {}, 'Sortilège (jauge d’Éveil)'), h('b', {}, SPELL[P.spell].name), h('em', {}, SPELL[P.spell].desc)),
        h('span', { class: 'chev' }, '›')),
      synergyChips(P.deck)),
    h('div', { class: 'panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Collection'), h('small', { class: 'muted' }, own.length + ' / ' + PLAYABLE.length)),
      h('div', { class: 'filters' }, facs.map(f => h('button', { class: 'fchip' + (filter === f ? ' on' : ''), style: { '--fc': f === 'all' ? '#ffd166' : FACTIONS[f].color }, onclick: () => { filter = f; render(); } }, f === 'all' ? 'Tous' : FACTIONS[f].short))),
      h('div', { class: 'coll-grid' }, list.map(c => {
        const lock = !own.includes(c.id);
        return heroCard(c, { lock, inDeck: P.deck.includes(c.id), sub: lock ? worldOfHero(c.id).name : null, onclick: () => openHero(c.id) });
      }))));
}

function heroCard(c, { lock, inDeck, sub, onclick } = {}) {
  return h('button', { class: 'hcard r-' + c.rar + (lock ? ' lock' : '') + (inDeck ? ' indeck' : ''), style: { '--rc': RARITIES[c.rar].color, '--fc': FACTIONS[c.fac].color }, onclick },
    h('div', { class: 'hc-bg' }), portraitImg(c.id),
    h('span', { class: 'hc-fac' }),
    h('div', { class: 'hc-name' }, h('b', {}, c.name), h('small', {}, c.title)),
    lock ? h('span', { class: 'hc-lock' }, icon('lock'), h('small', {}, sub)) : null);
}

function synergyChips(deck) {
  const s = deckSynergies(deck);
  return h('div', { class: 'chips' }, Object.keys(s.counts).sort((a, b) => s.counts[b] - s.counts[a]).map(f => {
    const F = FACTIONS[f], t = s.tiers[f];
    return h('span', { class: 'chip' + (t ? ' on' : ''), style: { '--fc': F.color } }, F.short + ' ' + s.counts[f] + (t ? ' · ' + F.bonus[t - 1] : ' · 3 = bonus'));
  }));
}

function openSpells(ownS) {
  const s = sheet(h('div', { class: 'spells' }, h('h3', {}, 'Choisis ton sortilège'),
    h('p', { class: 'muted' }, 'La jauge d’Éveil se remplit pendant le combat (2× plus vite si tu tiens le Cœur de Mythe). Pleine : touche le bouton puis l’île.'),
    SPELLS.map(sp => {
      const has = ownS.includes(sp.id), w = WORLDS.find(x => (SPELL_UNLOCKS[x.id] || []).includes(sp.id));
      return h('button', { class: 'sp-row' + (P.spell === sp.id ? ' on' : '') + (has ? '' : ' locked'), onclick: () => { if (!has) return toast('Se débloque dans « ' + w.name + ' »'); P.spell = sp.id; saveProfile(P); s.close(); render(); } },
        h('span', { class: 'sp-ic' }, icon(spellIcon(sp.id))), h('div', {}, h('b', {}, sp.name), h('small', {}, has ? sp.desc : 'Débloqué dans « ' + w.name + ' »')));
    })));
}

// ---------- Fiche de héros (3D) ----------
const TGT = { ground: 'Au sol', any: 'Sol et air', buildings: 'Bâtiments' };
function openHero(id) {
  sfx('click');
  const c = HERO[id], own = owned(P).includes(id), inDeck = P.deck.includes(id), F = FACTIONS[c.fac], R = RARITIES[c.rar];
  const max = { hp: 3600, dps: 260, spd: 2.4, range: 6 };
  const LV = Math.pow(1.1, heroLevel(P, id) - 1);
  const dps = Math.round(c.dmg * LV / c.hit * (c.count || 1));
  const statBar = (k, v, m, txt) => h('div', { class: 'sbar' }, h('small', {}, k), h('div', { class: 'sb' }, h('i', { style: { width: Math.min(100, v / m * 100) + '%' } })), h('b', {}, txt));
  const cv = h('canvas', { class: 'hd-3d' });
  let sc = null;
  const close = () => { if (sc) sc.dispose(); page.remove(); };
  const page = h('div', { class: 'hero-detail', style: { '--rc': R.color, '--fc': F.color } },
    h('div', { class: 'hd-stage' }, cv,
      h('button', { class: 'hd-close', onclick: close }, icon('close')),
      h('div', { class: 'hd-anims' },
        h('button', { onclick: () => sc && sc.play('attack') }, 'Attaque'),
        h('button', { onclick: () => sc && sc.play('cast') }, 'Pouvoir'),
        h('button', { onclick: () => sc && sc.play('cheer') }, 'Victoire')),
      h('small', { class: 'hd-drag' }, 'Glisse pour tourner')),
    h('div', { class: 'hd-body' },
      h('div', { class: 'hd-title' }, h('h2', {}, c.name), h('small', {}, c.title)),
      h('div', { class: 'chips' }, h('span', { class: 'chip on', style: { '--fc': R.color } }, R.name), h('span', { class: 'chip on', style: { '--fc': F.color } }, F.name),
        c.fly ? h('span', { class: 'chip on', style: { '--fc': '#9fd8ff' } }, 'Volant') : null, (c.count || 1) > 1 ? h('span', { class: 'chip on', style: { '--fc': '#c0c8d8' } }, '×' + c.count) : null),
      h('p', { class: 'lore' }, '« ' + c.lore + ' »'),
      h('div', { class: 'ability' }, h('span', { class: 'ab-ic' }, icon('star')), h('div', {}, h('b', {}, c.ability[0]), h('small', {}, c.ability[1]))),
      h('div', { class: 'sbars' },
        statBar('Vie', c.hp * LV * (c.count || 1), max.hp, Math.round(c.hp * LV) + ((c.count || 1) > 1 ? ' ×' + c.count : '')),
        statBar('Dégâts / s', dps, max.dps, dps + (c.splash ? ' (zone)' : '')),
        c.type === 'unit' ? statBar('Vitesse', c.spd, max.spd, c.spd >= 1.8 ? 'Très rapide' : c.spd >= 1.4 ? 'Rapide' : c.spd >= 1 ? 'Moyenne' : 'Lente') : statBar('Durée', c.life, 60, c.life + ' s'),
        statBar('Portée', c.range, max.range, c.range <= 1.2 ? 'Mêlée' : c.range + ' cases'),
        h('div', { class: 'sbar' }, h('small', {}, 'Cible'), h('b', { class: 'wide' }, TGT[c.tgt]))),
      heroProgress(id, () => { close(); openHero(id); render(); }),
      h('div', { class: 'evo' }, h('h4', {}, 'Évolution en combat'),
        h('div', { class: 'evo-row' }, [1, 2, 3].map(st => h('div', { class: 'evo-st' }, h('b', {}, '★'.repeat(st)), h('small', {}, '×' + STAR_MULT[st] + ' puissance')))),
        h('p', { class: 'muted' }, 'Sur le Cercle d’Invocation, glisse un héros sur un héros identique de même rang pour le faire évoluer.')),
      !own ? h('p', { class: 'tip lock' }, 'Se débloque dans le monde « ' + WORLDS.find(w => (UNLOCKS[w.id] || []).includes(id)).name + ' »')
        : inDeck ? h('div', { class: 'row gap' }, h('button', { class: 'btn ghost grow', onclick: () => { P.avatar = id; saveProfile(P); toast('Héros favori ✓'); close(); render(); } }, 'Mettre en vedette'), h('span', { class: 'tip grow' }, '✓ Dans ton deck'))
          : h('div', { class: 'row gap' }, h('button', { class: 'btn ghost', onclick: () => { P.avatar = id; saveProfile(P); toast('Héros favori ✓'); close(); render(); } }, 'Vedette'), h('button', { class: 'btn big gold grow', onclick: () => { swapIn = id; tab = 'heroes'; close(); render(); } }, 'Mettre dans le deck'))));
  document.body.append(page);
  requestAnimationFrame(() => { if (stage) stage.spin = 0; sc = new Showcase(cv, { world: worldOf(P).key, heroId: id, mode: 'hero', skin: P.skins.eq[id] }); });
}

// ---------- Mondes ----------
function openWorlds() {
  const page = h('div', { class: 'worlds' },
    h('div', { class: 'w-head' }, h('h2', {}, 'Les Mondes de Mythoria'), h('button', { class: 'hd-close', onclick: () => page.remove() }, icon('close'))),
    WORLDS.map(w => {
      const T = THEMES[w.key], open = P.trophies >= w.trophies;
      return h('div', { class: 'wcard' + (open ? '' : ' locked'), style: { '--s1': T.skyTop, '--s2': T.skyBot, '--g': T.ground, '--fc': FACTIONS[w.fac].color } },
        h('div', { class: 'w-art' }, h('div', { class: 'w-isle' }), h('span', { class: 'w-n' }, w.id + 1)),
        h('div', { class: 'w-txt' }, h('b', {}, w.name), h('small', {}, w.tag),
          h('div', { class: 'w-meta' }, h('span', { class: 'chip on', style: { '--fc': FACTIONS[w.fac].color } }, FACTIONS[w.fac].name), open ? h('span', { class: 'chip on', style: { '--fc': '#7dff9a' } }, 'Ouvert') : h('span', { class: 'chip' }, icon('trophy'), w.trophies)),
          h('div', { class: 'mini-row' }, (UNLOCKS[w.id] || []).slice(0, 5).map(id => h('div', { class: 'mini sm', style: { '--rc': RARITIES[HERO[id].rar].color } }, portraitImg(id)))),
          open ? h('button', { class: 'btn small gold', onclick: () => { page.remove(); trainingIn(w); } }, 'S’entraîner ici') : null));
    }));
  document.body.append(page);
}
function trainingIn(w) {
  const s = sheet(h('div', { class: 'modes' }, h('h3', {}, w.name), h('p', { class: 'muted' }, 'Entraînement (sans trophées). Choisis le niveau de l’IA :'),
    h('div', { class: 'lvls' }, AI_LEVELS.map((L, i) => h('button', { class: 'btn', onclick: () => { s.close(); play('training', i, w); } }, (i + 1) + '. ' + L.name)))));
}

// ---------- Profil, réglages, aide ----------
function openProfile() {
  sfx('click');
  const input = h('input', { class: 'inp', maxlength: 16, value: P.name });
  const st = P.stats, rate = st.played ? Math.round(st.w / st.played * 100) : 0;
  const s = sheet(h('div', { class: 'profile' },
    h('h3', {}, 'Ton profil'),
    h('label', {}, 'Pseudo'), h('div', { class: 'row gap' }, input, h('button', { class: 'btn gold', onclick: () => {
      const v = input.value.replace(/[<>]/g, '').trim().slice(0, 16);
      if (v.length < 3) return toast('3 caractères minimum', 'bad');
      P.name = v; saveProfile(P); toast('Pseudo enregistré ✓'); s.close(); render();
    } }, 'OK')),
    h('label', {}, 'Héros favori (avatar)'),
    h('div', { class: 'avatars' }, owned(P).map(id => h('button', { class: 'av' + (P.avatar === id ? ' on' : ''), onclick: () => { P.avatar = id; saveProfile(P); s.close(); render(); } }, portraitImg(id)))),
    h('div', { class: 'stats' }, [['Niveau', P.lvl], ['Trophées', P.trophies], ['Record', P.best], ['Combats (arène)', st.played], ['Victoires', st.w + ' (' + rate + ' %)'], ['Cœurs tenus', st.hearts]]
      .map(([k, v]) => h('div', { class: 'st' }, h('small', {}, k), h('b', {}, v)))),
    h('h4', {}, 'Historique'),
    P.hist.length ? h('div', { class: 'hist' }, P.hist.slice(0, 15).map(x => h('div', { class: 'hrow ' + x.result },
      h('span', {}, x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '➖'),
      h('span', { class: 'grow' }, (x.mode === 'arena' ? 'Arène' : 'Entraînement') + ' · 🤖 ' + x.opp),
      h('span', { class: 'muted' }, x.myHp + '% / ' + x.oppHp + '%'),
      h('span', {}, x.mode === 'arena' ? (x.trophies >= 0 ? '+' : '') + x.trophies : '')))) : h('p', { class: 'muted' }, 'Aucun combat pour l’instant.'),
    h('p', { class: 'muted' }, 'Compte en ligne (changer de téléphone sans rien perdre) : phase 3.')));
}

let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
function openSettings() {
  sfx('click');
  const s = sheet(h('div', { class: 'settings' },
    h('h3', {}, 'Réglages'),
    h('button', { class: 'btn ghost wide', onclick: () => { P.sound = !P.sound; setSound(P.sound); saveProfile(P); s.close(); openSettings(); } }, icon('sound'), P.sound ? ' Son : activé' : ' Son : coupé'),
    h('button', { class: 'btn ghost wide', onclick: install }, icon('install'), ' Installer le jeu sur l’écran d’accueil'),
    h('button', { class: 'btn ghost wide', onclick: share }, icon('share'), ' Partager le jeu'),
    h('button', { class: 'btn ghost wide', onclick: openRoadmap }, icon('map'), ' Le plan du jeu'),
    h('button', { class: 'btn ghost wide', onclick: () => window.__checkUpdate && window.__checkUpdate(true) }, icon('summon'), ' Chercher une mise à jour'),
    h('button', { class: 'btn red wide', onclick: async () => { if (await confirmBox('Effacer toute ta progression sur ce téléphone ?', 'Tout effacer')) { resetProfile(); P = loadProfile(); s.close(); render(); toast('Progression effacée'); } } }, 'Recommencer à zéro'),
    h('p', { class: 'muted center' }, 'MYTHORIA · version ' + APP.version),
    h('p', { class: 'muted center small' }, 'Modèles 3D : KayKit (Kay Lousberg) et Quaternius, licence CC0. Moteur 3D : three.js.')));
}
async function install() {
  if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; return; }
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  sheet(h('div', { class: 'settings' }, h('h3', {}, 'Installer MYTHORIA'),
    h('p', {}, ios ? 'Dans Safari : touche Partager (carré avec une flèche), puis « Sur l’écran d’accueil ».' : 'Dans Chrome : menu ⋮ en haut à droite, puis « Ajouter à l’écran d’accueil » ou « Installer l’application ».')));
}
async function share() {
  const url = location.href.split('#')[0].split('?')[0];
  if (navigator.share) { try { await navigator.share({ title: 'MYTHORIA', text: 'Viens jouer à MYTHORIA avec moi !', url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast('Lien copié ✓'); } catch (e) { toast(url); } }
}
function openHowTo() {
  sheet(h('div', { class: 'howto' },
    h('h3', {}, 'Comment jouer'),
    h('ol', {},
      h('li', {}, h('b', {}, 'But : '), 'détruire le Sanctuaire ennemi (au fond de l’île). Sinon, au bout de 3 minutes, gagne celui dont le Sanctuaire a le plus de vie.'),
      h('li', {}, h('b', {}, 'Invoquer : '), 'le bouton « Invoquer » (2 éther) fait apparaître un héros au hasard de ton deck sur ton Cercle d’Invocation (5 places, devant l’île). Les héros rares sortent moins souvent.'),
      h('li', {}, h('b', {}, 'Fusionner : '), 'glisse un héros sur un héros identique de même rang : il évolue en ★2, puis ★3 (beaucoup plus fort).'),
      h('li', {}, h('b', {}, 'Envoyer au combat : '), 'glisse un héros du Cercle vers ta moitié de l’île (zone bleue). Il se bat tout seul.'),
      h('li', {}, h('b', {}, 'Cœur de Mythe : '), 'le cristal au centre. Si tes héros au sol sont seuls à côté, tu le captures : +35 % d’éther et jauge d’Éveil plus rapide. Les volants ne capturent pas.'),
      h('li', {}, h('b', {}, 'Volants : '), 'les tirs à distance (archers, mages, tours) leur font +35 % de dégâts.'),
      h('li', {}, h('b', {}, 'Sortilège : '), 'quand la jauge d’Éveil est pleine, touche le bouton rond à gauche puis l’île.'),
      h('li', {}, h('b', {}, 'Synergies : '), '3 héros d’une même faction dans ton deck = bonus, 5 = gros bonus.')),
    h('p', { class: 'muted' }, 'Astuce : garde deux places libres sur ton Cercle pour pouvoir fusionner.')));
}
function openRoadmap() {
  const ph = [
    ['1', 'Fondation', 'Architecture, menus, interface mobile', 'ok'],
    ['2', 'Premier vrai jeu', 'Héros 3D animés, invocation, fusion, Cœur de Mythe, 6 mondes, IA', 'ok'],
    ['3', 'Multijoueur', 'Comptes, serveur, matchmaking, vrais adversaires, sauvegarde en ligne', 'next'],
    ['4', 'Royaume', 'Ton île : construction, ressources, défense', ''],
    ['5', 'Progression', 'Niveaux de héros, apparences, coffres, boutique équitable', ''],
    ['6', 'Communauté', 'Amis, clans, chat, tournois, classements', ''],
    ['7', 'Extension', 'Campagne, boss, survie, événements', ''],
  ];
  sheet(h('div', { class: 'roadmap' }, h('h3', {}, 'Le plan de MYTHORIA'),
    ph.map(([n, t, d, st]) => h('div', { class: 'ph ' + st }, h('span', { class: 'phn' }, st === 'ok' ? '✓' : n), h('div', {}, h('b', {}, 'Phase ' + n + ' — ' + t), h('small', {}, d))))));
}
