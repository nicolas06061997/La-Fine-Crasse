// MYTHORIA — écrans de progression : boutique, coffres, missions, connexion, amélioration, apparences.
import { HERO, RARITIES, FACTIONS, SPELL } from '../../shared/content.js';
import { SKINS, CHESTS, MAX_LEVEL } from '../../shared/economy.js';
import { saveProfile, owned, heroLevel, canUpgrade, upgradeHero, chestState, startChest, chestGemCost, openChest, shopOffers, buy, skinsFor, missionsReady, claimMission, claimLogin, maxHeroLevel } from '../store.js';
import { h, toast, sheet } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

let C; // contexte : { P(), render(), portraitImg(id) }
export function initProgress(ctx) { C = ctx; }

export function chestIcon(type, cls = '') {
  const s = h('span', { class: 'chest-ic ' + cls, style: { '--cc': CHESTS[type].color } });
  s.innerHTML = '<svg viewBox="0 0 48 40"><path d="M4 16h40v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="var(--cc)" stroke="#2a1a10" stroke-width="2"/><path d="M4 16c0-8 6-13 20-13s20 5 20 13z" fill="var(--cc)" stroke="#2a1a10" stroke-width="2" style="filter:brightness(1.15)"/><path d="M4 16h40v5H4z" fill="#3a2a1a" opacity=".55"/><rect x="20" y="14" width="8" height="10" rx="2" fill="#ffd166" stroke="#2a1a10" stroke-width="1.5"/><path d="M10 6v30M38 6v30" stroke="#2a1a10" stroke-width="2" opacity=".35"/></svg>';
  return s;
}
const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return hh ? hh + ' h ' + String(mm).padStart(2, '0') : mm ? mm + ' min ' + String(ss).padStart(2, '0') : ss + ' s'; };

function rewardChips(r) {
  const out = [];
  if (r.gold) out.push(h('span', { class: 'rchip' }, icon('coin'), '+' + r.gold));
  if (r.gems) out.push(h('span', { class: 'rchip' }, icon('gem'), '+' + r.gems));
  if (r.crystals) out.push(h('span', { class: 'rchip' }, icon('crystal'), '+' + r.crystals));
  if (r.stone) out.push(h('span', { class: 'rchip' }, '🪨 +' + r.stone));
  if (r.chest) out.push(h('span', { class: 'rchip' }, chestIcon(r.chest, 'xs'), CHESTS[r.chest].name));
  return out;
}

// ---------- Coffres (sur l'accueil) ----------
export function chestRow() {
  const P = C.P();
  const row = h('div', { class: 'chests' }, P.chests.map((c, i) => {
    const st = chestState(c);
    if (st === 'empty') return h('div', { class: 'cslot empty' }, h('small', {}, 'Emplacement libre'));
    const b = h('button', { class: 'cslot ' + st, onclick: () => chestTap(i) }, chestIcon(c.type), h('small', { class: 'cname' }, CHESTS[c.type].name.replace('Coffre ', '').replace('d’', '').replace('de ', '')));
    const lab = h('b', { class: 'ctime' });
    const upd = () => { const s2 = chestState(P.chests[i]); lab.textContent = s2 === 'ready' ? 'OUVRIR !' : s2 === 'opening' ? fmt((P.chests[i].end - Date.now()) / 1000) : fmt(CHESTS[c.type].time); };
    upd(); b.append(lab);
    if (st === 'opening') { const t = setInterval(() => { if (!b.isConnected) return clearInterval(t); upd(); if (chestState(P.chests[i]) === 'ready') { clearInterval(t); C.render(); } }, 1000); }
    return b;
  }));
  return row;
}
function chestTap(i) {
  const P = C.P(), c = P.chests[i], st = chestState(c), T = CHESTS[c.type];
  if (st === 'ready') return reveal(openChest(P, i, false));
  const cost = chestGemCost(c);
  const s = sheet(h('div', { class: 'chest-sheet' }, chestIcon(c.type, 'big'), h('h3', {}, T.name),
    h('p', { class: 'muted' }, 'Contient de l’or, des cristaux et environ ' + T.shards + ' fragments de héros' + (T.legend ? ', dont un héros légendaire ou mythique.' : '.')),
    st === 'locked' ? h('button', { class: 'btn big gold', onclick: () => { const e = startChest(P, i); if (e) return toast(e, 'bad'); s.close(); C.render(); sfx('click'); } }, 'Lancer l’ouverture (' + fmt(T.time) + ')') : h('p', {}, 'Ouverture en cours…'),
    h('button', { class: 'btn big ghost', onclick: () => { const r = openChest(P, i, true); if (r && r.err) return toast(r.err, 'bad'); s.close(); reveal(r); } }, 'Ouvrir maintenant : ', icon('gem'), cost)));
}
function reveal(r) {
  if (!r) return;
  sfx('fuse');
  const P = C.P();
  const s = sheet(h('div', { class: 'chest-open' },
    chestIcon(r.type, 'big pop'), h('h3', {}, CHESTS[r.type].name),
    h('div', { class: 'rchips' }, rewardChips(r)),
    h('div', { class: 'shard-grid' }, Object.entries(r.shards).map(([id, n]) => h('div', { class: 'shard', style: { '--rc': RARITIES[HERO[id].rar].color } }, C.portraitImg(id), h('b', {}, '×' + n), h('small', {}, HERO[id].name)))),
    h('button', { class: 'btn big gold', onclick: () => { s.close(); C.render(); } }, 'Super !')));
}

// ---------- Missions ----------
export function missionsButton() {
  const n = missionsReady(C.P());
  return h('button', { class: 'tile', onclick: openMissions }, icon('star'), h('b', {}, 'Missions'), h('small', {}, n ? n + ' à récupérer' : 'du jour'), n ? h('span', { class: 'badge' }, n) : null);
}
function openMissions() {
  sfx('click');
  const P = C.P();
  const row = m => h('div', { class: 'mis' + (m.claimed ? ' done' : '') },
    h('div', { class: 'mis-t' }, h('b', {}, m.txt), h('div', { class: 'tbar' }, h('i', { style: { width: (m.prog / m.n * 100) + '%' } })), h('small', {}, m.prog + ' / ' + m.n)),
    m.claimed ? h('span', { class: 'ok' }, '✓') : h('button', { class: 'btn small ' + (m.prog >= m.n ? 'gold' : 'ghost'), onclick: () => { if (m.prog < m.n) return toast('Pas encore terminé'); claimMission(P, m); sfx('coin'); s.close(); openMissions(); } }, rewardChips(m.reward)));
  const s = sheet(h('div', { class: 'missions' }, h('h3', {}, 'Missions du jour'), P.missions.list.map(row),
    h('h4', {}, 'Missions de la semaine'), P.missions.wlist.map(row),
    h('p', { class: 'muted' }, 'Nouvelles missions chaque jour à minuit, et chaque lundi pour la semaine.')), { onClose: () => C.render() });
}

// ---------- Connexion ----------
export function loginPopup() {
  const P = C.P(); if (!P.login.pending) return;
  const day = P.login.streak;
  const s = sheet(h('div', { class: 'login' }, h('h3', {}, 'Récompense de connexion'),
    h('div', { class: 'days' }, [0, 1, 2, 3, 4, 5, 6].map(k => h('div', { class: 'day' + (k + 1 < day ? ' past' : k + 1 === day ? ' today' : '') }, h('small', {}, 'Jour ' + (k + 1)), rewardChips(LOGIN_[k])))),
    h('button', { class: 'btn big gold', onclick: () => { claimLogin(P); sfx('coin'); s.close(); C.render(); } }, 'Récupérer')));
}
import { LOGIN as LOGIN_ } from '../../shared/economy.js';

// ---------- Boutique ----------
export function shopScreen() {
  const P = C.P(), offers = shopOffers(P);
  const card = o => {
    const bought = P.shop.bought.includes(o.id);
    let art, title, sub;
    if (o.kind === 'gift') { art = h('div', { class: 'of-art gift' }, icon('star')); title = o.name; sub = 'Gratuit, une fois par jour'; }
    else if (o.kind === 'shards') { const c = HERO[o.hero]; art = h('div', { class: 'of-art', style: { '--rc': RARITIES[c.rar].color } }, C.portraitImg(o.hero)); title = '×' + o.n + ' fragments'; sub = c.name + ' · ' + RARITIES[c.rar].name; }
    else if (o.kind === 'chest') { art = h('div', { class: 'of-art' }, chestIcon(o.chest, 'big')); title = CHESTS[o.chest].name; sub = 'S’ouvre tout de suite'; }
    else if (o.kind === 'crystals') { art = h('div', { class: 'of-art' }, icon('crystal')); title = '×' + o.n + ' cristaux'; sub = 'Pour les niveaux 6 à 10'; }
    else if (o.kind === 'skin') { const c = HERO[o.hero]; art = h('div', { class: 'of-art', style: { '--rc': SKINS[o.skin].glow } }, C.portraitImg(o.hero)); title = 'Apparence ' + SKINS[o.skin].name; sub = c.name + ' (sans effet sur la puissance)'; }
    const price = o.price ? (o.price.gold ? [icon('coin'), o.price.gold] : [icon('gem'), o.price.gems]) : ['Gratuit'];
    return h('div', { class: 'offer' + (bought ? ' sold' : '') }, art, h('b', {}, title), h('small', {}, sub),
      h('button', { class: 'btn small ' + (bought ? 'ghost' : 'gold'), onclick: () => {
        if (bought) return;
        const e = buy(P, o); if (e) return toast(e, 'bad');
        sfx('coin'); toast('Acheté ✓');
        if (o.kind === 'chest') { const i = P.chests.findIndex(c => c && c.type === o.chest && !c.start); if (i >= 0) { P.chests[i].start = 1; P.chests[i].end = 1; const r = openChest(P, i, false); C.render(); return reveal(r); } }
        C.render();
      } }, bought ? 'Acheté' : price));
  };
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  return h('section', { class: 'shop' },
    h('div', { class: 'panel' }, h('div', { class: 'row between' }, h('h3', {}, 'Boutique du jour'), h('small', { class: 'muted' }, 'Renouvelée dans ' + fmt((tomorrow - Date.now()) / 1000))),
      h('div', { class: 'offers' }, offers.map(card))),
    h('div', { class: 'panel' }, h('h3', {}, 'Tes ressources'),
      h('div', { class: 'res-grid' },
        h('div', {}, icon('coin'), h('b', {}, P.gold), h('small', {}, 'Or : améliorer les héros, construire')),
        h('div', {}, icon('gem'), h('b', {}, P.gems), h('small', {}, 'Gemmes : coffres, apparences, accélérer')),
        h('div', {}, icon('crystal'), h('b', {}, P.crystals), h('small', {}, 'Cristaux : héros niveaux 6 à 10')),
        h('div', {}, h('span', { class: 'ic' }, '🪨'), h('b', {}, P.stone), h('small', {}, 'Pierre : bâtiments du Royaume')))),
    h('p', { class: 'muted center' }, 'MYTHORIA est équitable : aucun achat en argent réel, tout se gagne en jouant. Les gemmes ne donnent jamais de puissance en combat.'));
}

// ---------- Fiche de héros : niveau, amélioration, apparences ----------
export function heroProgress(id, onChange) {
  const P = C.P(), c = HERO[id], lvl = heroLevel(P, id), own = owned(P).includes(id);
  if (!own) return null;
  const st = canUpgrade(P, id), cost = st.c, have = P.shards[id] || 0;
  const box = h('div', { class: 'hprog' },
    h('div', { class: 'row between' }, h('h4', {}, 'Niveau ' + lvl + ' / ' + MAX_LEVEL), h('small', { class: 'muted' }, 'Puissance ×' + Math.pow(1.1, lvl - 1).toFixed(2))),
    cost ? h('div', { class: 'shardbar' }, h('i', { style: { width: Math.min(100, have / cost.shards * 100) + '%' } }), h('span', {}, have + ' / ' + cost.shards + ' fragments')) : h('p', { class: 'tip' }, 'Niveau maximum atteint !'),
    cost ? h('button', { class: 'btn big ' + (st.ok ? 'gold' : 'ghost'), onclick: () => {
      const r = upgradeHero(P, id); if (!r.ok) return toast(r.why, 'bad');
      sfx('fuse'); toast(c.name + ' passe niveau ' + r.lvl + ' !'); onChange();
    } }, 'Améliorer : ', icon('coin'), cost.gold, cost.crystals ? [' ', icon('crystal'), cost.crystals] : null) : null,
    st.ok || !cost ? null : h('small', { class: 'muted' }, st.why),
    h('small', { class: 'muted' }, 'Fragments : dans les coffres et la boutique. Niveau maximum actuel : ' + maxHeroLevel(P) + ' (monte avec l’Académie du Royaume).'));
  const sk = skinsFor(P, id);
  const skins = (c.model.glb || c.model.beast) ? h('div', { class: 'hskins' }, h('h4', {}, 'Apparences'),
    h('div', { class: 'skin-row' },
      h('button', { class: 'skin' + (!P.skins.eq[id] ? ' on' : ''), onclick: () => { delete P.skins.eq[id]; saveProfile(P); onChange(); } }, 'Classique'),
      sk.map(k => h('button', { class: 'skin' + (P.skins.eq[id] === k ? ' on' : ''), style: { '--sc': SKINS[k].glow }, onclick: () => { P.skins.eq[id] = k; saveProfile(P); onChange(); } }, SKINS[k].name))),
    sk.length ? null : h('small', { class: 'muted' }, 'Une apparence différente est proposée chaque jour dans la boutique.')) : null;
  return h('div', {}, box, skins);
}
