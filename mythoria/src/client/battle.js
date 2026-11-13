// MYTHORIA — écran de combat : relie la simulation, l'IA (ou plus tard le réseau), l'affichage et le toucher.

import { createBattle, step, canPlay, timeLeft, DT, MANA_MAX, DOUBLE_AT } from '../shared/sim.js';
import { CARD, RARITIES } from '../shared/content.js';
import { createBot, botThink, AI_LEVELS } from '../shared/ai.js';
import { ArenaRenderer } from './render/arena.js';
import { cardArt } from './render/sprites.js';
import { h, toast, confirmBox } from './ui/dom.js';
import { sfx } from './audio.js';

const artCache = new Map();
// ?speed=4 dans l'adresse accélère le combat (sert aux tests automatiques).
const SPEED = Math.min(8, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));
export function cardImg(card, w = 90, h2 = 108) {
  const k = card.id + w;
  if (!artCache.has(k)) artCache.set(k, cardArt(card, w, h2, 2).toDataURL());
  return artCache.get(k);
}

export class Battle {
  // opts : { deck, oppDeck, botLevel, theme, myName, mode, onEnd(result) }
  constructor(root, opts) {
    this.o = opts; this.root = root;
    const seed = (Math.random() * 1e9) | 0;
    this.s = createBattle({ seed, decks: [opts.deck, opts.oppDeck], names: [opts.myName, 'IA ' + AI_LEVELS[opts.botLevel].name] });
    this.bot = createBot(1, opts.botLevel, seed ^ 0x5bd1e995);
    this.me = 0; this.pending = []; this.sel = -1; this.drag = null;
    this.acc = 0; this.time = 0; this.started = false; this.ended = false; this.paused = false;
    this.build();
    this.r = new ArenaRenderer(this.cv);
    this.r.setTheme(opts.theme);
    this.onResize = () => this.r.resize();
    addEventListener('resize', this.onResize);
    this.onVis = () => { if (document.hidden) this.last = 0; };
    document.addEventListener('visibilitychange', this.onVis);
    this.countdown();
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  build() {
    const s = this.s;
    this.el = h('div', { class: 'battle' },
      h('div', { class: 'b-top' },
        h('div', { class: 'b-opp' },
          h('span', { class: 'ai-tag', title: 'Adversaire contrôlé par l’ordinateur' }, '🤖 IA'),
          h('b', {}, AI_LEVELS[this.o.botLevel].name)),
        this.elOppCrowns = h('div', { class: 'b-crowns red' }, '♛ 0'),
        this.elTimer = h('div', { class: 'b-timer' }, '3:00'),
        h('button', { class: 'b-quit', onclick: () => this.quit() }, '✕')),
      h('div', { class: 'b-field' },
        this.cv = h('canvas', { class: 'arena-cv' }),
        this.elBanner = h('div', { class: 'b-banner' }),
        this.elMyCrowns = h('div', { class: 'b-crowns blue mine' }, '♛ 0')),
      h('div', { class: 'b-bottom' },
        h('div', { class: 'b-handrow' },
          h('div', { class: 'b-next' }, h('small', {}, 'Suivante'), this.elNext = h('img', { alt: '' })),
          this.elHand = h('div', { class: 'b-hand' })),
        h('div', { class: 'b-mana' },
          h('div', { class: 'b-mana-gem' }, this.elManaN = h('span', {}, '5')),
          h('div', { class: 'b-mana-bar' }, this.elManaFill = h('div', { class: 'b-mana-fill' }),
            ...Array.from({ length: 9 }, (_, i) => h('i', { style: { left: ((i + 1) * 10) + '%' } }))))));
    this.cards = [0, 1, 2, 3].map(i => {
      const el = h('div', { class: 'hcard', 'data-i': i },
        h('img', { alt: '' }), h('div', { class: 'hcard-cost' }, ''), h('div', { class: 'hcard-wait' }));
      el.addEventListener('pointerdown', e => this.cardDown(e, i));
      this.elHand.append(el);
      return el;
    });
    this.root.innerHTML = ''; this.root.append(this.el);
    this.cv.addEventListener('pointerdown', e => this.fieldDown(e));
    this.mv = e => this.pMove(e); this.up = e => this.pUp(e);
    addEventListener('pointermove', this.mv); addEventListener('pointerup', this.up); addEventListener('pointercancel', this.up);
    this.handKey = '';
  }

  countdown() {
    let n = 3;
    const tickN = () => {
      if (this.ended) return;
      if (n > 0) { this.banner(String(n), 'count'); sfx('tick'); n--; setTimeout(tickN, 700); }
      else { this.banner('Combat !', 'go'); sfx('go'); this.started = true; setTimeout(() => this.banner(''), 900); }
    };
    setTimeout(tickN, 300);
  }

  banner(txt, cls = '') { this.elBanner.textContent = txt; this.elBanner.className = 'b-banner ' + (txt ? 'on ' + cls : ''); }

  // ---------- Toucher ----------
  cardDown(e, i) {
    e.preventDefault();
    const id = this.s.players[this.me].hand[i];
    this.sel = i; this.drag = { i, id, sx: e.clientX, sy: e.clientY, moved: false };
    this.refreshHand(true);
    sfx('click');
  }
  fieldDown(e) {
    if (this.sel < 0) return;
    const id = this.s.players[this.me].hand[this.sel];
    this.drag = { i: this.sel, id, sx: e.clientX, sy: e.clientY, moved: true, field: true };
    this.pMove(e);
  }
  pMove(e) {
    if (!this.drag) return;
    const d = this.drag;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) d.moved = true;
    const rc = this.cv.getBoundingClientRect();
    const inside = e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom - 4;
    if (!inside || !d.moved) { this.r.ghost = null; this.r.showZones = -1; return; }
    const lift = d.field ? 0 : this.r.tile * 1.0; // la carte est un peu au-dessus du doigt pour rester visible
    const w = this.r.toWorld(e.clientX - rc.left, e.clientY - rc.top - lift);
    w.x = Math.round(w.x * 2) / 2; w.y = Math.round(w.y * 2) / 2;
    const ok = !canPlay(this.s, this.me, d.id, w.x, w.y);
    this.r.ghost = { card: d.id, x: w.x, y: w.y, ok };
    this.r.showZones = CARD[d.id].type === 'spell' ? -1 : this.me;
  }
  pUp() {
    if (!this.drag) return;
    const d = this.drag, g = this.r.ghost;
    this.drag = null; this.r.ghost = null; this.r.showZones = -1;
    if (!g) { this.refreshHand(true); return; } // simple appui : la carte reste sélectionnée
    const err = canPlay(this.s, this.me, d.id, g.x, g.y);
    if (err) { toast(err, 'bad'); sfx('reject'); this.sel = -1; this.refreshHand(true); return; }
    this.pending.push({ p: this.me, card: d.id, x: g.x, y: g.y });
    this.sel = -1;
    sfx('deploy');
    this.refreshHand(true);
  }

  // ---------- Boucle ----------
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    window.__battle = this;
    this.last = now; this.time += dt;
    if (this.started && !this.s.over) {
      this.acc += dt * SPEED;
      while (this.acc >= DT) {
        const cmds = this.pending.splice(0);
        const bc = botThink(this.bot, this.s, DT);
        if (bc) cmds.push(bc);
        step(this.s, cmds);
        this.r.ingest(this.s.ev, this.s);
        this.sounds(this.s.ev);
        this.acc -= DT;
        if (this.s.over) { this.finish(); break; }
      }
    }
    this.r.render(this.s, this.started ? this.acc / DT : 1, this.time, dt, this.me);
    this.hud();
  }

  sounds(ev) {
    for (const e of ev) {
      if (e.type === 'deploy' && e.p !== this.me) sfx('deploy', 100);
      else if (e.type === 'hit') sfx('hit', 70);
      else if (e.type === 'boom') sfx('boom', 120);
      else if (e.type === 'die' && e.kind === 'tower') { sfx('tower'); this.banner(e.p === this.me ? 'Tour perdue !' : 'Tour détruite !', e.p === this.me ? 'bad' : 'good'); setTimeout(() => !this.ended && this.banner(''), 1300); }
      else if (e.type === 'spell') sfx(e.fx === 'freeze' ? 'freeze' : e.fx === 'heal' ? 'heal' : 'spell');
      else if (e.type === 'zap') sfx('zap', 100);
      else if (e.type === 'fuse') sfx('fuse');
      else if (e.type === 'attack') { const a = this.s.ents.find(o => o.id === e.id); if (a && a.proj === 'arrow') sfx('arrow', 90); }
      else if (e.type === 'overtime') { this.banner('Prolongation ! La prochaine tour gagne', 'go'); setTimeout(() => !this.ended && this.banner(''), 2200); }
    }
    if (!this.dbl && this.s.t >= DOUBLE_AT) { this.dbl = true; this.banner('Éther ×2 !', 'go'); setTimeout(() => !this.ended && this.banner(''), 1500); }
  }

  refreshHand(force) {
    const P = this.s.players[this.me];
    const key = P.hand.join() + '|' + this.sel;
    if (force || key !== this.handKey) {
      this.handKey = key;
      P.hand.forEach((id, i) => {
        const c = CARD[id], el = this.cards[i];
        el.querySelector('img').src = cardImg(c);
        el.querySelector('.hcard-cost').textContent = c.cost;
        el.style.setProperty('--rar', RARITIES[c.rar].color);
        el.classList.toggle('sel', i === this.sel);
      });
      this.elNext.src = cardImg(CARD[P.queue[0]]);
    }
    P.hand.forEach((id, i) => {
      const c = CARD[id], el = this.cards[i], poor = P.mana < c.cost;
      el.classList.toggle('poor', poor);
      el.querySelector('.hcard-wait').style.height = poor ? (100 - P.mana / c.cost * 100) + '%' : '0%';
    });
  }

  hud() {
    const s = this.s, P = s.players[this.me], O = s.players[1 - this.me];
    const tl = Math.max(0, Math.ceil(timeLeft(s)));
    const txt = Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
    if (this.elTimer.textContent !== txt) { this.elTimer.textContent = txt; this.elTimer.classList.toggle('hot', s.overtime || tl <= 30); }
    this.elManaFill.style.width = (P.mana / MANA_MAX * 100) + '%';
    this.elManaFill.classList.toggle('dbl', s.t >= DOUBLE_AT);
    const mn = String(Math.floor(P.mana));
    if (this.elManaN.textContent !== mn) this.elManaN.textContent = mn;
    this.elMyCrowns.textContent = '♛ ' + P.crowns; this.elOppCrowns.textContent = '♛ ' + O.crowns;
    this.refreshHand(false);
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const s = this.s, P = s.players[this.me], O = s.players[1 - this.me];
    const result = s.winner === this.me ? 'win' : s.winner < 0 ? 'draw' : 'loss';
    this.banner(result === 'win' ? 'VICTOIRE !' : result === 'loss' ? 'DÉFAITE' : 'ÉGALITÉ', result === 'win' ? 'good big' : result === 'loss' ? 'bad big' : 'big');
    sfx(result === 'win' ? 'win' : result === 'loss' ? 'lose' : 'click');
    setTimeout(() => {
      this.destroy();
      this.o.onEnd({ result, crowns: P.crowns, oppCrowns: O.crowns, reason: s.reason, time: Math.round(s.t), opp: 'IA ' + AI_LEVELS[this.o.botLevel].name, deck: this.o.deck, mode: this.o.mode });
    }, 2600);
  }

  async quit() {
    if (this.ended) return;
    const ok = await confirmBox(this.o.mode === 'arena' ? 'Abandonner ? Cela compte comme une défaite.' : 'Quitter l’entraînement ?', 'Abandonner');
    if (!ok || this.ended) return;
    this.ended = true;
    const P = this.s.players[this.me], O = this.s.players[1 - this.me];
    this.destroy();
    this.o.onEnd({ result: 'loss', crowns: P.crowns, oppCrowns: Math.max(O.crowns, 1), reason: 'forfeit', time: Math.round(this.s.t), opp: 'IA ' + AI_LEVELS[this.o.botLevel].name, deck: this.o.deck, mode: this.o.mode });
  }

  destroy() {
    this.dead = true; cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    removeEventListener('pointermove', this.mv); removeEventListener('pointerup', this.up); removeEventListener('pointercancel', this.up);
    document.removeEventListener('visibilitychange', this.onVis);
  }
}
