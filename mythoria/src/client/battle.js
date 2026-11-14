// MYTHORIA — écran de combat : simulation + IA (plus tard : réseau) + vue 3D + toucher + interface.
import { createBattle, step, check, timeLeft, sanctOf, DT, MANA_MAX, DOUBLE_AT, SUMMON_COST, deployOk } from '../shared/sim.js';
import { HERO, SPELL } from '../shared/content.js';
import { createBot, botThink, AI_LEVELS } from '../shared/ai.js';
import { BattleView } from './three/battleview.js';
import { h, toast, confirmBox } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { sfx } from './audio.js';

// ?speed=4 dans l'adresse accélère le combat (sert aux tests automatiques).
const SPEED = Math.min(8, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));

export class Battle {
  // opts : { deck, spell, oppDeck, oppSpell, botLevel, world, myName, mode, onEnd(result) }
  constructor(root, opts) {
    this.o = opts; this.root = root;
    const seed = (Math.random() * 1e9) | 0;
    this.s = createBattle({ seed, decks: [opts.deck, opts.oppDeck], spells: [opts.spell, opts.oppSpell], levels: [opts.levels || {}, opts.oppLevels || {}], names: [opts.myName, 'IA ' + AI_LEVELS[opts.botLevel].name], mode: opts.simMode || 'duel', boss: opts.boss, waves: opts.waves, mods: opts.mods, bonus: opts.bonus, botMana: opts.simMode === 'survival' ? 0 : AI_LEVELS[opts.botLevel].mana });
    this.bot = opts.simMode === 'survival' ? null : createBot(1, opts.botLevel, seed ^ 0x5bd1e995);
    this.me = 0; this.pending = []; this.drag = null; this.aiming = false;
    this.acc = 0; this.started = false; this.ended = false;
    this.build();
    this.view = new BattleView(this.cv, this.ovc, opts.world.key, this.me);
    this.view.skins = opts.skins || {};
    window.__battle = this;
    this.start();
  }

  async start() {
    const ids = [...new Set([...this.o.deck, ...this.o.oppDeck])];
    try {
      await this.view.init(ids, k => { this.elLoadBar.style.width = Math.round(k * 100) + '%'; });
    } catch (e) {
      console.error(e); this.elLoad.querySelector('b').textContent = 'Erreur de chargement 3D'; return;
    }
    this.elLoad.classList.add('off');
    setTimeout(() => this.elLoad.remove(), 500);
    this.onResize = () => this.view.resize(); addEventListener('resize', this.onResize);
    this.raf = requestAnimationFrame(t => this.loop(t));
    this.countdown();
    setTimeout(() => this.elHint && this.elHint.classList.add('off'), 9000);
  }

  build() {
    const w = this.o.world;
    this.el = h('div', { class: 'battle w-' + w.key },
      h('div', { class: 'b-field' },
        this.cv = h('canvas', { class: 'b-3d' }),
        this.ovc = h('canvas', { class: 'b-ov' }),
        this.elBanner = h('div', { class: 'b-banner' })),
      h('div', { class: 'b-top' },
        h('div', { class: 'b-who red' },
          this.o.simMode === 'survival' ? h('div', { class: 'b-name' }, h('span', { class: 'ai-tag' }, 'SURVIE'), this.elWave = h('b', {}, 'Vague 0')) : h('div', { class: 'b-name' }, h('span', { class: 'ai-tag' }, '🤖 IA'), h('b', {}, this.o.title || AI_LEVELS[this.o.botLevel].name)),
          h('div', { class: 'b-hp red' }, this.elOppHp = h('i'), this.elOppHpN = h('span', {}, '')),
          h('div', { class: 'b-name me' }, h('span', { class: 'me-tag' }, 'TOI'), h('b', {}, this.o.myName)),
          h('div', { class: 'b-hp blue' }, this.elMyHp = h('i'), this.elMyHpN = h('span', {}, ''))),
        h('div', { class: 'b-clock' }, this.elTimer = h('b', {}, '3:00'), this.elHeart = h('small', {}, 'Cœur : libre')),
        this.elBoss = h('div', { class: 'b-boss' }, h('b', {}, ''), h('div', { class: 'b-hp red' }, h('i'), h('span', {}, ''))),
        h('button', { class: 'b-quit', onclick: () => this.quit(), 'aria-label': 'Quitter' }, icon('close'))),
      h('div', { class: 'b-bottom' },
        h('div', { class: 'b-controls' },
          this.elSpell = h('button', { class: 'b-spell', onclick: () => this.toggleAim() },
            h('svg', { class: 'ring', viewBox: '0 0 100 100', html: '<circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg"/>' }),
            h('span', { class: 'sp-ic' }, icon(spellIcon(this.o.spell))), h('small', {}, SPELL[this.o.spell].name.split(' ')[0])),
          h('div', { class: 'b-ether' },
            h('div', { class: 'eth-gems' }, ...Array.from({ length: MANA_MAX }, () => h('i'))),
            h('div', { class: 'eth-txt' }, icon('ether'), this.elManaN = h('b', {}, '4'), h('small', {}, '/ 10 éther'))),
          this.elSummon = h('button', { class: 'b-summon', onclick: () => this.summon() },
            h('span', { class: 'sm-ic' }, icon('summon')), h('b', {}, 'Invoquer'), h('small', {}, icon('ether'), SUMMON_COST)))),
      this.elLoad = h('div', { class: 'b-load' }, h('div', { class: 'logo' }, 'MYTHORIA'), h('b', {}, 'Ouverture de la Faille…'),
        h('small', {}, w.name), h('div', { class: 'lbar' }, this.elLoadBar = h('i'))),
      this.elHint = h('div', { class: 'b-hint' }, 'Fais glisser un héros du Cercle vers ta moitié de l’île'));
    this.gems = [...this.el.querySelectorAll('.eth-gems i')];
    this.root.innerHTML = ''; this.root.append(this.el);
    this.cv.addEventListener('pointerdown', e => this.down(e));
    this.mv = e => this.move(e); this.up = e => this.release(e);
    addEventListener('pointermove', this.mv); addEventListener('pointerup', this.up); addEventListener('pointercancel', this.up);
  }

  countdown() {
    let n = 3;
    const tick = () => {
      if (this.ended) return;
      if (n > 0) { this.banner(String(n), 'count'); sfx('tick'); n--; setTimeout(tick, 700); }
      else { this.banner('Combat !', 'go'); sfx('go'); this.started = true; setTimeout(() => this.banner(''), 900); }
    };
    setTimeout(tick, 200);
  }
  banner(txt, cls = '') { this.elBanner.textContent = txt; this.elBanner.className = 'b-banner ' + (txt ? 'on ' + cls : ''); }

  // ---------- Commandes ----------
  send(cm) {
    const err = check(this.s, cm);
    if (err) { toast(err, 'bad'); sfx('reject'); return false; }
    this.pending.push(cm); return true;
  }
  summon() { if (this.send({ p: this.me, t: 'summon' })) sfx('summon'); }
  toggleAim() {
    if (this.s.players[this.me].eveil < 100) { toast('La jauge d’Éveil se remplit avec le temps (2× plus vite si tu tiens le Cœur)'); return; }
    this.aiming = !this.aiming; this.elSpell.classList.toggle('aim', this.aiming);
    if (this.aiming) toast('Touche l’île pour lancer ' + SPELL[this.o.spell].name);
  }

  // ---------- Toucher ----------
  down(e) {
    if (!this.started || this.ended) return;
    e.preventDefault();
    if (this.aiming) { this.drag = { spell: true }; this.move(e); return; }
    const slot = this.view.pickBench(e.clientX, e.clientY);
    const P = this.s.players[this.me];
    if (slot >= 0 && P.bench[slot]) {
      this.drag = { slot, h: P.bench[slot], sx: e.clientX, sy: e.clientY, moved: false };
      sfx('click');
      this.elHint.classList.add('off');
    }
  }
  move(e) {
    const d = this.drag; if (!d) return;
    if (d.spell) {
      const g = this.view.pickGround(e.clientX, e.clientY); if (!g) return;
      d.x = g.x; d.y = g.y;
      this.view.setGhost({ spell: this.o.spell, x: g.x, y: g.y, ok: !check(this.s, { p: this.me, t: 'spell', x: g.x, y: g.y }) });
      return;
    }
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) d.moved = true;
    if (!d.moved) return;
    const over = this.view.pickBench(e.clientX, e.clientY);
    if (over >= 0 && over !== d.slot) {
      d.target = over; d.ground = null; this.view.setGhost(null); this.view.highlightSlot(over); return;
    }
    d.target = -1; this.view.highlightSlot(-1);
    const g = this.view.pickGround(e.clientX, e.clientY - 30); // un peu au-dessus du doigt pour rester visible
    if (!g) return;
    g.x = Math.round(g.x * 2) / 2; g.y = Math.round(g.y * 2) / 2;
    d.ground = g;
    this.view.setGhost({ id: d.h.id, star: d.h.star, x: g.x, y: g.y, ok: deployOk(this.me, g.x, g.y) });
  }
  release() {
    const d = this.drag; if (!d) return;
    this.drag = null;
    this.view.setGhost(null); this.view.highlightSlot(-1);
    if (d.spell) {
      if (d.x !== undefined && this.send({ p: this.me, t: 'spell', x: d.x, y: d.y })) { this.aiming = false; this.elSpell.classList.remove('aim'); sfx('spell'); }
      return;
    }
    if (!d.moved) { const c = HERO[d.h.id]; toast(c.name + ' — ' + c.title + ' ' + '★'.repeat(d.h.star)); return; }
    if (d.target >= 0) { if (this.send({ p: this.me, t: 'merge', a: d.slot, b: d.target })) sfx('fuse'); return; }
    if (d.ground && this.send({ p: this.me, t: 'deploy', slot: d.slot, x: d.ground.x, y: d.ground.y })) sfx('deploy');
  }

  // ---------- Boucle ----------
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.started && !this.s.over) {
      this.acc += dt * SPEED;
      while (this.acc >= DT) {
        const cmds = this.pending.splice(0);
        const bc = this.bot && botThink(this.bot, this.s, DT); if (bc) cmds.push(bc);
        step(this.s, cmds);
        this.view.ingest(this.s.ev, this.s);
        this.sounds(this.s.ev);
        this.acc -= DT;
        if (this.s.over) { this.finish(); break; }
      }
    }
    this.view.sync(this.s, this.started ? this.acc / DT : 1, dt);
    this.hud();
  }

  sounds(ev) {
    for (const e of ev) {
      if (e.type === 'deploy' && e.p !== this.me) sfx('deploy', 150);
      else if (e.type === 'hit') sfx('hit', 80);
      else if (e.type === 'boom') sfx('boom', 120);
      else if (e.type === 'spell') sfx(e.fx === 'freeze' ? 'freeze' : e.fx === 'heal' ? 'heal' : e.fx === 'storm' ? 'zap' : 'boom');
      else if (e.type === 'zap') sfx('zap', 100);
      else if (e.type === 'fuse' || e.type === 'benchFuse') sfx('fuse');
      else if (e.type === 'heart') { sfx('spell'); if (e.owner === this.me) { this.banner('Cœur de Mythe capturé !', 'good'); setTimeout(() => !this.ended && this.banner(''), 1300); } else if (e.owner >= 0) { this.banner('L’ennemi tient le Cœur !', 'bad'); setTimeout(() => !this.ended && this.banner(''), 1300); } }
      else if (e.type === 'attack') { const a = this.s.ents.find(o => o.id === e.id); if (a && a.proj === 'arrow') sfx('arrow', 90); }
      else if (e.type === 'wave') { this.banner('Vague ' + e.n + ' !', e.n % 5 === 0 ? 'bad' : 'go'); sfx('tick'); setTimeout(() => !this.ended && this.banner(''), 1400); }
      else if (e.type === 'boss') { this.banner('☠ ' + e.name, 'bad'); sfx('tower'); setTimeout(() => !this.ended && this.banner(''), 1800); }
      else if (e.type === 'bossSkill') sfx(e.k === 'freeze' ? 'freeze' : e.k === 'heal' ? 'heal' : 'boom', 200);
      else if (e.type === 'bossDown') { this.banner('Boss vaincu !', 'good'); sfx('win'); setTimeout(() => !this.ended && this.banner(''), 1600); }
      else if (e.type === 'overtime') { this.banner('Prolongation !', 'go'); setTimeout(() => !this.ended && this.banner(''), 1800); }
    }
    if (!this.dbl && this.s.t >= DOUBLE_AT) { this.dbl = true; this.banner('Éther ×2 !', 'go'); setTimeout(() => !this.ended && this.banner(''), 1500); }
  }

  hud() {
    const s = this.s, P = s.players[this.me];
    const boss = s.ents.find(e => e.boss && !e.dead);
    this.elBoss.classList.toggle('on', !!boss);
    if (boss) { this.elBoss.querySelector('b').textContent = '☠ ' + boss.boss.name; this.elBoss.querySelector('i').style.width = (boss.hp / boss.maxHp * 100) + '%'; this.elBoss.querySelector('span').textContent = Math.ceil(boss.hp); }
    if (this.elWave) this.elWave.textContent = 'Vague ' + s.wave;
    const tl = s.mode === 'survival' ? Math.floor(s.t) : Math.max(0, Math.ceil(timeLeft(s)));
    const txt = Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0');
    if (this.elTimer.textContent !== txt) { this.elTimer.textContent = txt; this.elTimer.classList.toggle('hot', s.overtime || tl <= 30); }
    const me = sanctOf(s, this.me), op = sanctOf(s, 1 - this.me);
    this.elMyHp.style.width = (Math.max(0, me.hp) / me.maxHp * 100) + '%'; this.elMyHpN.textContent = Math.max(0, Math.ceil(me.hp));
    this.elOppHp.style.width = (Math.max(0, op.hp) / op.maxHp * 100) + '%'; this.elOppHpN.textContent = Math.max(0, Math.ceil(op.hp));
    const full = Math.floor(P.mana), frac = P.mana - full;
    this.gems.forEach((g, i) => { g.className = i < full ? 'on' : i === full ? 'part' : ''; if (i === full) g.style.setProperty('--f', frac); });
    if (this.elManaN.textContent !== String(full)) this.elManaN.textContent = full;
    this.elSummon.classList.toggle('off', P.mana < SUMMON_COST || !P.bench.includes(null));
    const nb = P.bench.filter(Boolean).length;
    this.elSummon.classList.toggle('hint', P.mana >= 4 && nb < 2);
    if (!P.deployed && s.t > 12 && nb && this.elHint.classList.contains('off') && !this.hintAgain) { this.hintAgain = true; this.elHint.textContent = 'Astuce : appuie sur un héros du Cercle (en bas) et fais-le glisser vers l’île'; this.elHint.classList.remove('off'); setTimeout(() => this.elHint.classList.add('off'), 6000); }
    this.elSpell.style.setProperty('--p', P.eveil / 100);
    this.elSpell.classList.toggle('ready', P.eveil >= 100);
    const hs = s.heart.owner < 0 ? 'Cœur : libre' : s.heart.owner === this.me ? 'Cœur : à toi ✦' : 'Cœur : ennemi';
    if (this.elHeart.textContent !== hs) { this.elHeart.textContent = hs; this.elHeart.className = s.heart.owner < 0 ? '' : s.heart.owner === this.me ? 'blue' : 'red'; }
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    const s = this.s;
    const result = s.mode === 'survival' ? 'survival' : s.winner === this.me ? 'win' : s.winner < 0 ? 'draw' : 'loss';
    this.banner(result === 'survival' ? 'Vague ' + s.wave + ' atteinte !' : result === 'win' ? 'VICTOIRE !' : result === 'loss' ? 'DÉFAITE' : 'ÉGALITÉ', result === 'win' ? 'good big' : result === 'loss' ? 'bad big' : 'big');
    sfx(result === 'win' ? 'win' : result === 'loss' ? 'lose' : 'click');
    const me = sanctOf(s, this.me), op = sanctOf(s, 1 - this.me);
    setTimeout(() => {
      this.destroy();
      this.o.onEnd({ result, myHp: Math.max(0, me.hp) / me.maxHp, oppHp: Math.max(0, op.hp) / op.maxHp, reason: s.reason, time: Math.round(s.t),
        opp: 'IA ' + AI_LEVELS[this.o.botLevel].name, deck: this.o.deck, mode: this.o.mode, world: this.o.world.id, heart: s.heart.owner === this.me, stats: this.stats(), wave: s.wave || 0, extra: this.o.extra });
    }, 2800);
  }

  async quit() {
    if (this.ended) return;
    const ok = await confirmBox(this.o.mode === 'arena' ? 'Abandonner ? Cela compte comme une défaite.' : 'Quitter l’entraînement ?', 'Abandonner');
    if (!ok || this.ended) return;
    this.ended = true;
    const me = sanctOf(this.s, this.me), op = sanctOf(this.s, 1 - this.me);
    this.destroy();
    this.o.onEnd({ result: 'loss', myHp: Math.max(0, me.hp) / me.maxHp, oppHp: op.hp / op.maxHp, reason: 'forfeit', time: Math.round(this.s.t), opp: 'IA ' + AI_LEVELS[this.o.botLevel].name, deck: this.o.deck, mode: this.o.mode, world: this.o.world.id, stats: this.stats(), wave: this.s.wave || 0, extra: this.o.extra });
  }

  stats() { const P = this.s.players[this.me]; return { deployed: P.deployed, fuses: P.fuses, spells: P.spells, hearts: P.hearts }; }

  destroy() {
    this.dead = true; cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    removeEventListener('pointermove', this.mv); removeEventListener('pointerup', this.up); removeEventListener('pointercancel', this.up);
    try { this.view.dispose(); } catch (e) {}
  }
}

export function spellIcon(id) { return { meteore: 'meteor', givre: 'frost', benediction: 'sun', foudre: 'bolt' }[id] || 'bolt'; }
