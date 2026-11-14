// MYTHORIA — modes de jeu (phase 7) : campagne et boss, survie (défense du Royaume), événement, tournoi contre l'IA.
import { HERO, WORLDS, RARITIES } from '../../shared/content.js';
import { CHAPTERS, stageOf, enemyDeck, eventOf, EVENT_REWARD, EVENT_WINS_PER_DAY, TOURNEY, survivalWaves } from '../../shared/campaign.js';
import { weekKey, dayKey } from '../../shared/economy.js';
import { AI_LEVELS } from '../../shared/ai.js';
import { saveProfile, worldOf, bonusOf, botDeck, botLevels } from '../store.js';
import { h, toast, sheet } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

let C;
export function initModes(ctx) { C = ctx; } // { P(), render(), play(mode, level, world, extra) }

const rew = r => [r.gold ? r.gold + ' or' : '', r.gems ? r.gems + ' gemmes' : '', r.crystals ? r.crystals + ' cristaux' : '', r.chest ? 'un coffre' : ''].filter(Boolean).join(' · ');

// ---------- Campagne ----------
export function openCampaign() {
  sfx('click');
  const P = C.P(), done = P.campaign.done;
  const page = h('div', { class: 'worlds campaign' },
    h('div', { class: 'w-head' }, h('h2', {}, 'Campagne'), h('button', { class: 'hd-close', onclick: () => page.remove() }, icon('close'))),
    h('p', { class: 'muted' }, 'L’histoire de Mythoria : traverse les 6 mondes et affronte leurs boss. Les bonus de ton Royaume comptent ici.'),
    CHAPTERS.map((ch, c) => h('div', { class: 'chap' + (done >= c * 5 ? '' : ' locked'), style: { '--fc': '#ffd166' } },
      h('div', { class: 'chap-h' }, h('b', {}, 'Chapitre ' + (c + 1) + ' · ' + ch.world.name), h('small', {}, ch.boss.name + ' — ' + ch.boss.title)),
      h('div', { class: 'stages' }, ch.stages.map(st => {
        const state = st.n < done ? 'done' : st.n === done ? 'next' : 'locked';
        return h('button', { class: 'stage ' + state + (st.boss ? ' boss' : ''), onclick: () => { if (state === 'locked') return toast('Termine d’abord l’étape précédente'); page.remove(); openStage(st.n); } },
          h('span', {}, st.boss ? '☠' : st.n % 5 + 1), h('small', {}, st.name));
      })))));
  document.body.append(page);
}

function openStage(n) {
  const P = C.P(), st = stageOf(n), ch = CHAPTERS[Math.floor(n / 5)], first = n === P.campaign.done;
  const s = sheet(h('div', { class: 'stage-sheet' },
    h('small', { class: 'muted' }, 'Chapitre ' + (Math.floor(n / 5) + 1) + ' · étape ' + (n % 5 + 1)),
    h('h3', {}, st.name),
    st.boss ? h('p', { class: 'lore' }, '« ' + ch.boss.intro + ' »') : h('p', { class: 'lore' }, '« Les troupes de ' + ch.world.name + ' te barrent la route. »'),
    h('div', { class: 'stats' },
      h('div', { class: 'st' }, h('small', {}, 'Adversaire'), h('b', {}, '🤖 IA ' + AI_LEVELS[st.ai].name)),
      h('div', { class: 'st' }, h('small', {}, 'Héros ennemis'), h('b', {}, 'Niveau ' + st.lvl)),
      st.boss ? h('div', { class: 'st' }, h('small', {}, 'Boss'), h('b', {}, ch.boss.name + ' (' + ch.boss.hp + ' PV)')) : null,
      h('div', { class: 'st' }, h('small', {}, first ? 'Récompense (1re fois)' : 'Récompense'), h('b', {}, first ? rew(st.reward) : '30 or'))),
    h('button', { class: 'btn big gold', onclick: () => {
      s.close();
      const seed = (Math.random() * 1e9) | 0, deck = enemyDeck(ch.world.id, seed);
      C.play('campaign', st.ai, ch.world, {
        simMode: 'campaign', boss: st.boss ? ch.boss : null, bonus: bonusOf(P), oppDeck: deck, oppLevels: Object.fromEntries(deck.map(id => [id, st.lvl])), title: st.boss ? ch.boss.name : st.name,
        onResult: r => {
          if (r.result === 'win') { if (n === P.campaign.done) { P.campaign.done++; r.reward = st.reward; r.note = 'Étape terminée ! ' + (st.boss ? 'Boss vaincu !' : ''); } else r.reward = { gold: 30 }; }
          return r;
        },
      });
    } }, st.boss ? 'Affronter le boss' : 'Combattre')));
}

// ---------- Survie / Défense du Royaume ----------
export function playSurvival() {
  const P = C.P(), w = worldOf(P);
  C.play('survival', 0, w, {
    simMode: 'survival', waves: survivalWaves(w.id), bonus: bonusOf(P), title: 'Survie',
    onResult: r => {
      const wv = r.wave || 0, best = P.records.survival || 0;
      if (wv > best) { P.records.survival = wv; r.note = 'Nouveau record : vague ' + wv + ' !'; }
      r.reward = { gold: wv * 15, crystals: wv >= 5 ? wv * 2 : 0, gems: wv >= 10 ? 5 : 0 };
      return r;
    },
  });
}

// ---------- Événement de la semaine ----------
export function currentEvent() { return eventOf(weekKey()); }
export function eventWinsLeft(P) { const d = dayKey(); if (!P.eventWins || P.eventWins.day !== d) P.eventWins = { day: d, n: 0 }; return EVENT_WINS_PER_DAY - P.eventWins.n; }
export function playEvent() {
  const P = C.P(), ev = currentEvent(), w = worldOf(P);
  C.play('event', Math.min(3, 1 + Math.floor(w.id / 2)), w, {
    mods: ev.mods, title: ev.name,
    onResult: r => { if (r.result === 'win' && eventWinsLeft(P) > 0) { P.eventWins.n++; r.reward = EVENT_REWARD; r.note = 'Récompense d’événement (' + eventWinsLeft(P) + ' restantes aujourd’hui)'; } return r; },
  });
}

// ---------- Tournoi contre l'IA ----------
export function playTourney() {
  const P = C.P(), w = worldOf(P);
  P.tourney = P.tourney || { round: 0 };
  const round = P.tourney.round, lvl = Math.min(4, Math.floor(w.id * 0.8) + round);
  C.play('tourney', lvl, w, {
    title: 'Tournoi · manche ' + (round + 1) + '/3',
    onResult: r => {
      if (r.result === 'win') {
        r.reward = TOURNEY.reward[round]; P.tourney.round++;
        if (P.tourney.round >= TOURNEY.rounds) { P.records.tournament = (P.records.tournament || 0) + 1; P.tourney.round = 0; r.note = 'Tournoi gagné ! (' + P.records.tournament + ' au total)'; }
        else r.note = 'Manche gagnée ! Prochaine : manche ' + (P.tourney.round + 1) + '/3';
      } else { P.tourney.round = 0; r.note = 'Éliminé du tournoi. Retente ta chance !'; }
      saveProfile(P); return r;
    },
  });
}
