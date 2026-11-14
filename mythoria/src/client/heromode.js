// MYTHORIA — Mode Héros : tu diriges toi-même un héros (joystick + attaque + super-pouvoir)
// contre des vagues de monstres, avec un boss toutes les 5 vagues.
import * as THREE from 'three';
import { HERO } from '../shared/content.js';
import { BOSSES } from '../shared/campaign.js';
import { levelMult } from '../shared/content.js';
import { createRenderer, quality } from './three/stage.js';
import { buildWorld } from './three/world.js';
import { makeHero, preload } from './three/assets.js';
import { FX } from './three/fx.js';
import { createComposer, blobShadow } from './three/look.js';
import { glowSprite } from './three/procedural.js';
import { h, confirmBox } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { sfx } from './audio.js';

const R = 10.5; // rayon de l'arène
const SUPERS = {
  melee: { name: 'Tourbillon', desc: 'Frappe tout autour de toi' },
  ranged: { name: 'Pluie de traits', desc: 'Tire dans toutes les directions' },
  magic: { name: 'Nova', desc: 'Explosion magique autour de toi' },
  beast: { name: 'Charge', desc: 'Fonce et renverse tout' },
};

export class HeroMode {
  // opts : { heroId, level, world, skin, onEnd({ wave, kills, time }) }
  constructor(root, opts) {
    this.o = opts; this.root = root;
    const c = HERO[opts.heroId]; this.c = c;
    const L = levelMult(opts.level || 1);
    this.kind = c.model.beast || c.model.proc ? 'beast' : c.range > 2 ? (c.proj === 'arrow' ? 'ranged' : 'magic') : 'melee';
    this.p = { x: 0, z: 4, hp: Math.round(c.hp * L * 3.2), max: 0, dmg: Math.round(c.dmg * L * 1.6), range: Math.min(6, c.range > 2 ? c.range + 0.5 : 1.6), cd: 0, hit: Math.max(0.35, c.hit * 0.7), spd: 4.2, face: 0, sup: 0, inv: 0 };
    this.p.max = this.p.hp;
    this.enemies = []; this.shots = []; this.orbs = []; this.wave = 0; this.waveT = 2; this.kills = 0; this.t = 0; this.ended = false;
    this.joy = null; this.attackHeld = false;
    this.build();
    this.start();
  }

  build() {
    this.el = h('div', { class: 'battle hero-mode' },
      h('div', { class: 'b-field' }, this.cv = h('canvas', { class: 'b-3d' }), this.ov = h('canvas', { class: 'b-ov' }), this.elBanner = h('div', { class: 'b-banner' })),
      h('div', { class: 'b-top' },
        h('div', { class: 'b-who' }, h('div', { class: 'b-name' }, h('span', { class: 'me-tag' }, 'TOI'), h('b', {}, this.c.name)), h('div', { class: 'b-hp blue' }, this.elHp = h('i'), this.elHpN = h('span'))),
        h('div', { class: 'b-clock' }, this.elWave = h('b', {}, 'Vague 1'), this.elKills = h('small', {}, '0 monstre')),
        h('button', { class: 'b-quit', onclick: () => this.quit() }, icon('close'))),
      this.elBoss = h('div', { class: 'b-boss' }, h('b', {}, ''), h('div', { class: 'b-hp red' }, h('i'), h('span', {}, ''))),
      this.joyEl = h('div', { class: 'joy' }, this.knob = h('i')),
      h('div', { class: 'hm-btns' },
        this.supBtn = h('button', { class: 'hm-sup' }, h('svg', { class: 'ring', viewBox: '0 0 100 100', html: '<circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg"/>' }), h('b', {}, SUPERS[this.kind].name)),
        this.atkBtn = h('button', { class: 'hm-atk' }, icon('sword'), h('small', {}, 'Attaque'))),
      this.elLoad = h('div', { class: 'b-load' }, h('div', { class: 'logo' }, 'MYTHORIA'), h('b', {}, 'Mode Héros'), h('small', {}, this.c.name + ' · ' + this.o.world.name), h('div', { class: 'lbar' }, this.elLoadBar = h('i'))),
      h('div', { class: 'b-hint' }, 'Glisse à gauche pour bouger · Attaque à droite · Super quand le cercle est plein'));
    this.root.innerHTML = ''; this.root.append(this.el);
    // commandes tactiles
    const field = this.el.querySelector('.b-field');
    field.addEventListener('pointerdown', e => { if (e.clientX < innerWidth * 0.6 && !this.joy) { this.joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; this.joyEl.style.left = e.clientX + 'px'; this.joyEl.style.top = e.clientY + 'px'; this.joyEl.classList.add('on'); } });
    this.mv = e => { if (!this.joy || e.pointerId !== this.joy.id) return; let dx = e.clientX - this.joy.x, dy = e.clientY - this.joy.y; const d = Math.hypot(dx, dy), m = 55; if (d > m) { dx *= m / d; dy *= m / d; } this.joy.dx = dx / m; this.joy.dy = dy / m; this.knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    this.up = e => { if (this.joy && e.pointerId === this.joy.id) { this.joy = null; this.joyEl.classList.remove('on'); this.knob.style.transform = ''; } };
    addEventListener('pointermove', this.mv); addEventListener('pointerup', this.up); addEventListener('pointercancel', this.up);
    this.atkBtn.addEventListener('pointerdown', e => { e.stopPropagation(); this.attackHeld = true; });
    this.atkBtn.addEventListener('pointerup', () => { this.attackHeld = false; }); this.atkBtn.addEventListener('pointerleave', () => { this.attackHeld = false; });
    this.supBtn.addEventListener('pointerdown', e => { e.stopPropagation(); this.useSuper(); });
  }

  async start() {
    const q = quality();
    this.r = createRenderer(this.cv); this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.5, 400);
    this.fx = new FX(this.scene);
    const ids = [this.o.heroId, 'squelette', 'pousse', 'loups', 'golemet', 'osseuse', 'follets', ...BOSSES.map(b => b.base)];
    await Promise.all([buildWorld(this.scene, this.o.world.key, { light: q.low ? 'low' : 'high' }).then(w => { this.world = w; }), preload(ids, k => { this.elLoadBar.style.width = Math.round(k * 100) + '%'; })]);
    this.r.toneMappingExposure = this.world.theme.exposure;
    this.post = createComposer(this.r, this.scene, this.cam, { bloom: !q.low, strength: 0.45, threshold: 1.15 });
    this.hero = await makeHero(this.o.heroId, { skin: this.o.skin, lite: q.low });
    this.hero.holder.add(blobShadow(1.3));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.78, 32), new THREE.MeshBasicMaterial({ color: '#3da9ff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; this.hero.holder.add(ring);
    this.aim = new THREE.Mesh(new THREE.RingGeometry(this.p.range - 0.06, this.p.range, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); this.aim.rotation.x = -Math.PI / 2; this.aim.position.y = 0.06; this.scene.add(this.aim);
    this.scene.add(this.hero.holder); this.hero.play('idle');
    this.resize(); this.onResize = () => this.resize(); addEventListener('resize', this.onResize);
    this.elLoad.classList.add('off'); setTimeout(() => this.elLoad.remove(), 500);
    window.__hero = this;
    setTimeout(() => { const hn = this.el.querySelector('.b-hint'); if (hn) hn.classList.add('off'); }, 6000);
    this.raf = requestAnimationFrame(t => this.loop(t));
  }
  resize() {
    const w = this.cv.clientWidth || 1, hh = this.cv.clientHeight || 1;
    this.r.setSize(w, hh, false); this.cam.aspect = w / hh; this.cam.updateProjectionMatrix(); if (this.post) this.post.setSize(w, hh); this.fx.setScale(hh);
    const d = Math.min(2, devicePixelRatio || 1); this.ov.width = w * d; this.ov.height = hh * d; this.ow = w; this.oh = hh; this.od = d;
  }
  banner(t, cls = '') { this.elBanner.textContent = t; this.elBanner.className = 'b-banner ' + (t ? 'on ' + cls : ''); if (t) setTimeout(() => { if (this.elBanner.textContent === t) this.banner(''); }, 1500); }

  // ---------- Monstres ----------
  async spawnWave() {
    this.wave++;
    const boss = this.wave % 5 === 0;
    this.banner(boss ? '☠ Vague ' + this.wave + ' : BOSS !' : 'Vague ' + this.wave, boss ? 'bad' : 'go'); sfx(boss ? 'tower' : 'tick');
    const pool = this.wave < 3 ? ['squelette', 'pousse'] : this.wave < 6 ? ['squelette', 'pousse', 'loups', 'osseuse'] : ['squelette', 'loups', 'osseuse', 'golemet', 'follets'];
    const n = Math.min(16, 3 + Math.floor(this.wave * 1.4)), lv = levelMult(1 + Math.floor(this.wave / 2));
    for (let k = 0; k < n; k++) {
      const id = pool[Math.floor(Math.random() * pool.length)], c = HERO[id], a = Math.random() * Math.PI * 2;
      this.addEnemy(id, Math.cos(a) * (R - 0.8), Math.sin(a) * (R - 0.8), { hp: c.hp * lv * 1.1, dmg: c.dmg * lv * 0.7, spd: Math.min(3.2, c.spd * 1.5), range: c.range > 2 ? 4.5 : 1.1, ranged: c.range > 2, r: c.r * 1.2 });
    }
    if (boss) {
      const B = BOSSES[(this.wave / 5 - 1) % BOSSES.length], k = 0.8 + this.wave * 0.12;
      this.addEnemy(B.base, 0, -R + 2, { hp: B.hp * k, dmg: B.dmg * 0.8, spd: 1.6, range: (B.range || 1.3) + 0.4, ranged: !!B.proj, r: 1.3, boss: B });
    }
  }
  async addEnemy(id, x, z, s) {
    const e = { id, x, z, hp: Math.round(s.hp), max: Math.round(s.hp), dmg: Math.round(s.dmg), spd: s.spd, range: s.range, ranged: s.ranged, r: s.r, boss: s.boss, cd: 1 + Math.random(), a: null, skill: 6, dead: false };
    this.enemies.push(e);
    const a = await makeHero(id, { lite: true, skin: s.boss ? s.boss.skin : null, fx: !!s.boss });
    if (this.dead) { a.dispose(); return; }
    if (s.boss) { a.holder.scale.multiplyScalar(s.boss.scale * 0.8); a.height *= s.boss.scale * 0.8; this.banner('☠ ' + s.boss.name, 'bad'); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(e.r * 0.8, e.r, 24), new THREE.MeshBasicMaterial({ color: '#ff4f5e', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; a.holder.add(ring);
    a.holder.position.set(x, 0, z); a.play(s.boss ? 'spawn' : 'run'); this.scene.add(a.holder); e.a = a;
    if (e.dead) this.removeEnemy(e);
  }
  removeEnemy(e) { if (e.a) { const a = e.a; a.play('death', { force: true }); setTimeout(() => { this.scene.remove(a.holder); a.dispose(); }, 1400); } }

  // ---------- Combat ----------
  nearest(maxD) { let b = null, bd = maxD; for (const e of this.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - this.p.x, e.z - this.p.z) - e.r; if (d < bd) { bd = d; b = e; } } return b; }
  hurt(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg; this.p.sup = Math.min(100, this.p.sup + dmg / this.p.dmg * 7);
    if (e.a) e.a.flash();
    this.nums.push({ x: e.x, z: e.z, h: (e.a ? e.a.height : 2) + 0.3, txt: Math.round(dmg), t: 0, col: '#ffffff' });
    if (e.hp <= 0) {
      e.dead = true; this.kills++; this.removeEnemy(e); sfx('hit', 60);
      this.fx.emit(e.x, 0.6, e.z, { n: 12, color: ['#e8e4f0', '#c8c0d8'], size: 0.6, life: 0.7, speed: 1.5, up: 0.7, gravity: 0.5, alpha: 0.5 });
      if (Math.random() < (e.boss ? 1 : 0.12)) this.orbs.push(this.makeOrb(e.x, e.z));
      if (e.boss) { this.fx.explosion(e.x, e.z, 3, 'fire'); this.banner('Boss vaincu !', 'good'); sfx('win'); }
    }
  }
  makeOrb(x, z) { const s = glowSprite(0x7dff9a, 0.9); s.position.set(x, 0.6, z); this.scene.add(s); return { x, z, s, t: 0 }; }
  attack() {
    const P = this.p, c = this.c, t = this.nearest(P.range + 0.3);
    this.hero.play('attack', { force: true }); P.cd = P.hit;
    if (t) P.face = Math.atan2(t.x - P.x, t.z - P.z);
    if (this.kind === 'melee' || this.kind === 'beast') {
      const ax = P.x + Math.sin(P.face) * 1.0, az = P.z + Math.cos(P.face) * 1.0;
      let hit = false;
      for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - ax, e.z - az) < 1.4 + e.r) { this.hurt(e, P.dmg * (c.splash ? 1 : 1.2)); hit = true; if (!c.splash) break; }
      this.fx.emit(ax, 0.9, az, { n: 8, color: ['#ffffff', '#ffe9b0'], size: 0.35, life: 0.25, speed: 3 });
      sfx(hit ? 'hit' : 'click', 60);
    } else {
      const dir = t ? Math.atan2(t.x - P.x, t.z - P.z) : P.face;
      this.shots.push({ x: P.x, z: P.z, vx: Math.sin(dir) * 16, vz: Math.cos(dir) * 16, dmg: P.dmg, mine: true, life: 0.6, kind: c.proj || 'orb', splash: c.splash || 0 });
      sfx('arrow', 60);
    }
  }
  useSuper() {
    const P = this.p; if (P.sup < 100 || this.ended || !this.hero) return;
    P.sup = 0; this.hero.play(this.kind === 'melee' ? 'attack' : 'cast', { force: true }); sfx('fuse');
    if (this.kind === 'ranged') { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; this.shots.push({ x: P.x, z: P.z, vx: Math.sin(a) * 15, vz: Math.cos(a) * 15, dmg: P.dmg * 1.5, mine: true, life: 0.7, kind: 'arrow', splash: 0 }); } }
    else if (this.kind === 'beast') { P.dash = 0.45; P.inv = 0.6; }
    else { const r = this.kind === 'magic' ? 4.2 : 3.2; for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.z - P.z) < r + e.r) this.hurt(e, P.dmg * 3); this.fx.explosion(P.x, P.z, r, this.kind === 'magic' ? 'orb' : 'roar'); this.fx.ring(P.x, P.z, r * 1.2, '#ffd166', 0.6); this.shake = 0.4; }
  }

  step(dt) {
    const P = this.p;
    this.t += dt;
    // déplacement
    let mx = 0, mz = 0;
    if (this.joy) { mx = this.joy.dx; mz = this.joy.dy; }
    const m = Math.hypot(mx, mz);
    if (P.dash > 0) { P.dash -= dt; mx = Math.sin(P.face); mz = Math.cos(P.face); P.x += mx * 14 * dt; P.z += mz * 14 * dt; for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - P.x, e.z - P.z) < 1.3 + e.r && !e.dashHit) { e.dashHit = true; this.hurt(e, P.dmg * 2.5); setTimeout(() => { e.dashHit = false; }, 500); } }
    else if (m > 0.15) { P.x += mx * P.spd * dt; P.z += mz * P.spd * dt; P.face = Math.atan2(mx, mz); this.hero.play('run'); }
    else this.hero.play('idle');
    const d = Math.hypot(P.x, P.z); if (d > R - 0.6) { P.x *= (R - 0.6) / d; P.z *= (R - 0.6) / d; }
    // attaque
    P.cd -= dt; if (P.inv > 0) P.inv -= dt;
    if (P.cd <= 0 && (this.attackHeld || this.nearest(P.range * 0.9))) this.attack();
    P.hp = Math.min(P.max, P.hp + P.max * 0.006 * dt);
    // monstres
    for (const e of this.enemies) {
      if (e.dead || !e.a) continue;
      const dx = P.x - e.x, dz = P.z - e.z, dd = Math.hypot(dx, dz) || 1;
      if (dd - e.r > e.range) { e.x += dx / dd * e.spd * dt; e.z += dz / dd * e.spd * dt; e.a.play('run'); }
      else { e.cd -= dt; if (e.cd <= 0) { e.cd = e.boss ? 1.4 : 1.2; e.a.play('attack', { force: true });
        if (e.ranged) this.shots.push({ x: e.x, z: e.z, vx: dx / dd * 11, vz: dz / dd * 11, dmg: e.dmg, mine: false, life: 0.8, kind: e.boss ? 'fire' : 'arrow', splash: 0 });
        else if (P.inv <= 0) { P.hp -= e.dmg; this.hero.flash(0xff4f5e); sfx('hit', 80); } } }
      if (e.boss) { e.skill -= dt; if (e.skill <= 0) { e.skill = 6; this.fx.explosion(e.x, e.z, 3, 'roar'); this.shake = 0.35; if (Math.hypot(P.x - e.x, P.z - e.z) < 3.3 && P.inv <= 0) { P.hp -= e.dmg * 1.5; this.hero.flash(0xff4f5e); } } }
      e.a.holder.position.set(e.x, 0, e.z); e.a.holder.rotation.y = Math.atan2(dx, dz);
    }
    // séparation
    const L = this.enemies.filter(e => !e.dead);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.x - a.x, dz = b.z - a.z, dd = Math.hypot(dx, dz), mn = a.r + b.r; if (dd < mn && dd > 0.001) { const k = (mn - dd) / 2 / dd; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } }
    // projectiles
    for (const s of this.shots) {
      s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
      this.fx.emit(s.x, 1, s.z, { n: 1, color: s.mine ? (s.kind === 'arrow' ? ['#ffffff'] : ['#c8a8ff', '#ffffff']) : ['#ff9a3d', '#ff5a1a'], size: s.kind === 'arrow' ? 0.3 : 0.5, life: 0.2, speed: 0.2, gravity: 0 });
      if (s.mine) { for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - s.x, e.z - s.z) < e.r + 0.3) { if (s.splash) { for (const o of this.enemies) if (!o.dead && Math.hypot(o.x - s.x, o.z - s.z) < s.splash + o.r) this.hurt(o, s.dmg); this.fx.explosion(s.x, s.z, s.splash, s.kind); } else this.hurt(e, s.dmg); s.life = 0; break; } }
      else if (Math.hypot(P.x - s.x, P.z - s.z) < 0.7) { if (P.inv <= 0) { P.hp -= s.dmg; this.hero.flash(0xff4f5e); } s.life = 0; }
    }
    this.shots = this.shots.filter(s => s.life > 0);
    // orbes de soin
    for (const o of this.orbs) { o.t += dt; o.s.position.y = 0.6 + Math.sin(o.t * 4) * 0.15; if (Math.hypot(P.x - o.x, P.z - o.z) < 1) { P.hp = Math.min(P.max, P.hp + P.max * 0.25); o.done = true; this.scene.remove(o.s); sfx('heal'); this.fx.pillar(P.x, P.z, 0.6, '#7dff9a', 0.8, 4); } }
    this.orbs = this.orbs.filter(o => !o.done && o.t < 20);
    // vagues
    const alive = this.enemies.some(e => !e.dead);
    this.waveT -= dt;
    if (!alive && this.waveT > 2.5) this.waveT = 2.5;
    if (this.waveT <= 0) { this.waveT = 30; this.spawnWave(); }
    this.enemies = this.enemies.filter(e => !e.dead);
    if (P.hp <= 0) this.finish();
  }

  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now;
    this.nums = this.nums || [];
    if (!this.ended) this.step(dt);
    const P = this.p;
    this.hero.holder.position.set(P.x, 0, P.z);
    let dr = P.face - this.hero.holder.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); this.hero.holder.rotation.y += dr * Math.min(1, dt * 12);
    this.hero.update(dt);
    for (const e of this.enemies) if (e.a) e.a.update(dt);
    this.aim.position.set(P.x, 0.06, P.z);
    // caméra qui suit le héros
    const tx = P.x * 0.7, tz = P.z * 0.7 + 12.5;
    this.cam.position.lerp(new THREE.Vector3(tx, 14.5, tz), Math.min(1, dt * 4));
    if (this.shake > 0) { this.shake -= dt; this.cam.position.x += (Math.random() - 0.5) * this.shake; }
    this.cam.lookAt(P.x * 0.7, 0, P.z * 0.7 - 1.5);
    this.fx.update(dt); this.world.update(dt, this.t);
    this.post.render();
    this.hud(dt);
  }
  hud(dt) {
    const P = this.p;
    this.elHp.style.width = Math.max(0, P.hp / P.max * 100) + '%'; this.elHpN.textContent = Math.max(0, Math.ceil(P.hp));
    this.elWave.textContent = 'Vague ' + Math.max(1, this.wave); this.elKills.textContent = this.kills + (this.kills > 1 ? ' monstres' : ' monstre');
    this.supBtn.style.setProperty('--p', P.sup / 100); this.supBtn.classList.toggle('ready', P.sup >= 100);
    const boss = this.enemies.find(e => e.boss && !e.dead);
    this.elBoss.classList.toggle('on', !!boss);
    if (boss) { this.elBoss.querySelector('b').textContent = '☠ ' + boss.boss.name; this.elBoss.querySelector('i').style.width = (boss.hp / boss.max * 100) + '%'; this.elBoss.querySelector('span').textContent = Math.max(0, Math.ceil(boss.hp)); }
    // barres de vie des monstres + chiffres
    const c = this.ov.getContext('2d'), d = this.od; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.ow, this.oh);
    const v = new THREE.Vector3();
    for (const e of this.enemies) { if (!e.a || e.dead || e.boss || e.hp >= e.max) continue; v.set(e.x, (e.a.height || 2) + 0.2, e.z).project(this.cam); const x = (v.x + 1) / 2 * this.ow, y = (1 - v.y) / 2 * this.oh; c.fillStyle = 'rgba(10,6,20,.8)'; c.fillRect(x - 15, y - 1, 30, 6); c.fillStyle = '#ff4f5e'; c.fillRect(x - 14, y, 28 * e.hp / e.max, 4); }
    c.textAlign = 'center'; c.font = '900 13px Nunito, sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(15,8,30,.9)';
    for (const n of this.nums) { n.t += dt; v.set(n.x, n.h + n.t, n.z).project(this.cam); const x = (v.x + 1) / 2 * this.ow, y = (1 - v.y) / 2 * this.oh; c.globalAlpha = Math.max(0, 1 - n.t / 0.8); c.strokeText(n.txt, x, y); c.fillStyle = n.col; c.fillText(n.txt, x, y); }
    c.globalAlpha = 1; this.nums = this.nums.filter(n => n.t < 0.8);
  }
  finish() {
    if (this.ended) return; this.ended = true;
    this.hero.play('death', { force: true }); sfx('lose');
    this.banner('Vague ' + this.wave + ' · ' + this.kills + ' monstres', 'big');
    setTimeout(() => { this.destroy(); this.o.onEnd({ wave: this.wave, kills: this.kills, time: Math.round(this.t) }); }, 2600);
  }
  async quit() {
    if (this.ended) return;
    if (!(await confirmBox('Quitter le Mode Héros ?', 'Quitter'))) return;
    this.ended = true; this.destroy(); this.o.onEnd({ wave: this.wave, kills: this.kills, time: Math.round(this.t) });
  }
  destroy() {
    this.dead = true; cancelAnimationFrame(this.raf);
    removeEventListener('pointermove', this.mv); removeEventListener('pointerup', this.up); removeEventListener('pointercancel', this.up); removeEventListener('resize', this.onResize);
    try { this.fx.dispose(); this.world && this.world.dispose(); this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss(); } catch (e) {}
  }
}
