// MYTHORIA — vue 3D d'un combat. N'applique AUCUNE règle : elle montre l'état de la simulation.
import * as THREE from 'three';
import { CX, CY, RX, RY, HEART, SANCT, BENCH } from '../../shared/sim.js';
import { HERO, SPELL, RARITIES } from '../../shared/content.js';
import { createRenderer, quality } from './stage.js';
import { buildWorld } from './world.js';
import { makeHero, preload, prop } from './assets.js';
import { sanctuaryCrystal, heartOfMyth, glowSprite } from './procedural.js';
import { FX } from './fx.js';
import { createComposer, blobShadow } from './look.js';

export const TEAM = ['#3da9ff', '#ff4f5e'];
const BENCH_Z = RY + 3.1, BENCH_X = [-4.6, -2.3, 0, 2.3, 4.6];

export class BattleView {
  constructor(canvas, overlay, worldKey, me = 0) {
    this.cv = canvas; this.ov = overlay; this.octx = overlay.getContext('2d');
    this.key = worldKey; this.me = me;
    this.q = quality();
    this.r = createRenderer(canvas);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2(); this.v3 = new THREE.Vector3();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.views = new Map(); this.bench = []; this.shake = 0; this.time = 0;
    this.fx = new FX(this.scene);
    this.nums = [];
  }

  toWorld(x, y) { return { x: x - CX, z: y - CY }; }
  toSim(X, Z) { return { x: X + CX, y: Z + CY }; }

  async init(heroIds, onProgress) {
    const [world] = await Promise.all([
      buildWorld(this.scene, this.key, { light: this.q.low ? 'low' : 'high' }),
      preload(heroIds, onProgress),
    ]);
    this.world = world;
    this.r.toneMappingExposure = world.theme.exposure;
    // Sanctuaires
    this.sanct = [];
    for (const p of [0, 1]) {
      const g = new THREE.Group(), w = this.toWorld(CX, SANCT.y[p]);
      g.position.set(w.x, 0, w.z); g.rotation.y = p === this.me ? Math.PI : 0;
      try { const t = await prop('Temple_SecondAge_Level3', { scale: 1 }); const b = new THREE.Box3().setFromObject(t); const k = 3.3 / Math.max(b.max.x - b.min.x, b.max.z - b.min.z); t.scale.multiplyScalar(k); t.scale.y *= p === this.me ? 0.55 : 0.8; g.add(t); } catch (e) {}
      const col = TEAM[p === this.me ? 0 : 1];
      const cr = sanctuaryCrystal(col); cr.group.position.y = p === this.me ? 3.0 : 4.0; if (p === this.me) cr.group.scale.setScalar(0.8); g.add(cr.group);
      const base = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.2, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      base.rotation.x = -Math.PI / 2; base.position.y = 0.04; g.add(base);
      this.scene.add(g);
      this.sanct.push({ g, cr, smokeT: 0 });
    }
    // Cœur de Mythe
    this.heart = heartOfMyth(); this.scene.add(this.heart.group);
    // Cercle d'invocation (le banc du joueur, en 3D devant l'île)
    const ledge = new THREE.Group(); ledge.position.set(0, -0.35, BENCH_Z);
    const rockMat = new THREE.MeshStandardMaterial({ color: world.theme.rock, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.5, 2.6), new THREE.MeshStandardMaterial({ color: world.theme.ground2, flatShading: true })); top.receiveShadow = true; ledge.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3, 6), rockMat); under.scale.set(3.3, 1, 0.8); under.rotation.x = Math.PI; under.position.y = -1.7; ledge.add(under);
    this.scene.add(ledge);
    this.slotHits = [];
    for (let i = 0; i < BENCH; i++) {
      const g = new THREE.Group(); g.position.set(BENCH_X[i], 0, BENCH_Z);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 8), new THREE.MeshStandardMaterial({ color: '#d8d0c0', flatShading: true })); ped.position.y = 0.05; ped.receiveShadow = true; ped.castShadow = true; g.add(ped);
      const rune = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 6), new THREE.MeshBasicMaterial({ color: '#8fd8ff', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      rune.rotation.x = -Math.PI / 2; rune.position.y = 0.24; g.add(rune);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.2; hit.userData.slot = i; g.add(hit);
      this.slotHits.push(hit);
      this.scene.add(g);
      this.bench.push({ g, rune, key: '', actor: null, loading: null });
    }
    // Zone de déploiement (moitié de l'île du joueur)
    const sh = new THREE.Shape(); sh.absellipse(0, 0, RX - 0.3, RY - 0.3, Math.PI, 2 * Math.PI, false, 0);
    this.zone = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40), new THREE.MeshBasicMaterial({ color: TEAM[0], transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    this.zone.rotation.x = -Math.PI / 2; this.zone.scale.y = (RY - 1.1) / (RY - 0.3); this.zone.position.set(0, 0.07, 0.8); this.zone.visible = false;
    this.scene.add(this.zone);
    this.aim = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    this.aim.rotation.x = -Math.PI / 2; this.aim.position.y = 0.09; this.aim.visible = false; this.scene.add(this.aim);
    this.post = createComposer(this.r, this.scene, this.cam, { bloom: !this.q.low, strength: 0.45, threshold: 1.15, radius: 0.45 });
    this.resize();
  }

  resize() {
    const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.r.setSize(w, h, false);
    if (this.post) this.post.setSize(w, h);
    const d = Math.min(2, devicePixelRatio || 1);
    this.ov.width = w * d; this.ov.height = h * d; this.ow = w; this.oh = h; this.od = d;
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 0.6 ? 46 : 40;
    this.cam.updateProjectionMatrix();
    this.fitCamera();
    this.fx.setScale(h);
  }
  // Recule la caméra jusqu'à voir toute l'île et le cercle d'invocation.
  fitCamera() {
    const target = new THREE.Vector3(0, 0, 3.0), dir = new THREE.Vector3(0, 0.95, 1.0).normalize();
    const pts = [[-RX + 0.9, 0, 2], [RX - 0.9, 0, 2], [0, 5.5, -RY + 2.7], [-5.6, 0, BENCH_Z + 1], [5.6, 0, BENCH_Z + 1], [0, 0, BENCH_Z + 1.2]].map(p => new THREE.Vector3(...p));
    let lo = 10, hi = 120;
    for (let it = 0; it < 22; it++) {
      const mid = (lo + hi) / 2;
      this.cam.position.copy(target).addScaledVector(dir, mid); this.cam.lookAt(target); this.cam.updateMatrixWorld();
      const ok = pts.every(p => { const v = p.clone().project(this.cam); return Math.abs(v.x) < 0.98 && v.y < 0.84 && v.y > -0.74; });
      if (ok) hi = mid; else lo = mid;
    }
    this.cam.position.copy(target).addScaledVector(dir, hi); this.cam.lookAt(target);
    this.camBase = this.cam.position.clone(); this.camTarget = target;
  }

  // ---------- Toucher ----------
  ndc(cx, cy) { const rc = this.cv.getBoundingClientRect(); this.v2.set((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); return this.v2; }
  pickBench(cx, cy) {
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    const h = this.ray.intersectObjects(this.slotHits, false)[0];
    return h ? h.object.userData.slot : -1;
  }
  pickGround(cx, cy) {
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    const p = this.ray.ray.intersectPlane(this.plane, this.v3);
    return p ? this.toSim(p.x, p.z) : null;
  }
  screenOf(x, y, h = 0) { const w = this.toWorld(x, y); const v = new THREE.Vector3(w.x, h, w.z).project(this.cam); return { x: (v.x + 1) / 2 * this.ow, y: (1 - v.y) / 2 * this.oh }; }
  benchScreen(i) { const v = new THREE.Vector3(BENCH_X[i], 0, BENCH_Z).project(this.cam); return { x: (v.x + 1) / 2 * this.ow, y: (1 - v.y) / 2 * this.oh }; }

  async setGhost(g) {
    if (!g) { if (this.ghost) { this.scene.remove(this.ghost.a.holder); this.ghost.a.dispose(); this.ghost = null; } this.zone.visible = false; this.aim.visible = false; return; }
    if (g.spell) {
      this.zone.visible = false; this.aim.visible = true;
      const w = this.toWorld(g.x, g.y); this.aim.position.set(w.x, 0.09, w.z); this.aim.scale.setScalar(SPELL[g.spell].radius);
      this.aim.material.color.set(g.ok ? '#ffffff' : '#ff4f5e');
      return;
    }
    this.zone.visible = true;
    const key = g.id + g.star;
    if (!this.ghost || this.ghost.key !== key) {
      if (this.ghost) { this.scene.remove(this.ghost.a.holder); this.ghost.a.dispose(); }
      const a = await makeHero(g.id, { star: g.star, outline: false, fx: false }); a.setOpacity(0.6); a.play('idle');
      this.ghost = { a, key }; this.scene.add(a.holder);
    }
    const w = this.toWorld(g.x, g.y);
    this.ghost.a.holder.position.set(w.x, 0, w.z);
    this.ghost.a.holder.rotation.y = Math.PI;
    this.ghost.ok = g.ok;
    this.aim.visible = true; this.aim.position.set(w.x, 0.09, w.z);
    const c = HERO[g.id]; this.aim.scale.setScalar(c.range > 2 ? c.range : 1.1);
    this.aim.material.color.set(g.ok ? '#ffffff' : '#ff4f5e');
  }
  highlightSlot(i) { this.bench.forEach((b, k) => { b.rune.material.color.set(k === i ? '#ffd166' : '#8fd8ff'); b.rune.material.opacity = k === i ? 0.95 : 0.5; }); }

  // ---------- Effets à partir des événements ----------
  ingest(ev, s) {
    for (const e of ev) {
      const w = e.x !== undefined ? this.toWorld(e.x, e.y) : null;
      const team = e.p === this.me ? 0 : 1;
      switch (e.type) {
        case 'deploy': this.fx.ring(w.x, w.z, 1.4, TEAM[team], 0.6); this.fx.pillar(w.x, w.z, 0.6, TEAM[team], 0.7, 7); break;
        case 'land': { const v = this.views.get(e.id); if (v) { this.fx.dust(w.x, w.z, 12); this.fx.ring(w.x, w.z, 1.0, '#ffffff', 0.35); } break; }
        case 'attack': { const v = this.views.get(e.id); if (v && v.actor) { v.actor.play('attack', { force: true }); const c = HERO[s.ents.find(o => o.id === e.id)?.card]; if (c && !c.proj && !c.chain) { const t = this.toWorld(e.tx, e.ty); this.fx.emit(t.x, 0.9, t.z, { n: 6, color: ['#ffffff', '#ffe9b0'], size: 0.3, life: 0.25, speed: 3 }); } } break; }
        case 'hit': { const v = this.views.get(e.id); if (v && v.actor) v.actor.flash(); const ent = s.ents.find(o => o.id === e.id); if (ent && ent.kind === 'sanct') { this.num(e.x, e.y, '-' + e.amount, 3.4); this.sanctFlash = 0.1; } break; }
        case 'die': this.onDie(e, s); break;
        case 'boom': this.fx.explosion(w.x, w.z, e.r, e.kind); if (e.kind === 'roar') this.shake = 0.4; break;
        case 'cleave': this.fx.ring(w.x, w.z, e.r * 1.2, '#ffe0b0', 0.3); this.fx.emit(w.x, 0.8, w.z, { n: 10, color: ['#ffffff', '#ffd27a'], size: 0.35, life: 0.3, speed: 4, up: 0.2 }); break;
        case 'impact': if (e.kind === 'arrow') this.fx.emit(w.x, 0.9, w.z, { n: 4, color: '#ffffff', size: 0.25, life: 0.2, speed: 2 }); else if (e.kind === 'ice') this.fx.emit(w.x, 0.9, w.z, { n: 8, color: ['#ffffff', '#9fe8ff'], size: 0.35, life: 0.4, speed: 2.5 }); else this.fx.emit(w.x, 0.9, w.z, { n: 8, color: ['#ffffff', '#ffd27a'], size: 0.4, life: 0.3, speed: 2.5 }); break;
        case 'zap': this.fx.bolt(e.pts.map(p => { const q = this.toWorld(p.x, p.y); return new THREE.Vector3(q.x, 1.1, q.z); })); break;
        case 'dash': { const a = this.toWorld(e.x0, e.y0), b = this.toWorld(e.x1, e.y1); for (let k = 0; k <= 8; k++) this.fx.emit(a.x + (b.x - a.x) * k / 8, 0.8, a.z + (b.z - a.z) * k / 8, { n: 3, color: ['#ffb48a', '#ff7a3d'], size: 0.5, life: 0.4, speed: 0.6, gravity: 0 }); break; }
        case 'fuse': this.fx.pillar(w.x, w.z, 1.0, '#ffd166', 1.0, 9); this.fx.ring(w.x, w.z, 2.2, '#ffd166', 0.7); this.fx.emit(w.x, 1, w.z, { n: 40, color: ['#fff3c0', '#ffd166'], size: 0.45, life: 1, speed: 3, up: 0.9 }); this.num(e.x, e.y, '★'.repeat(e.star) + ' FUSION', 3.0, '#ffd166', true); break;
        case 'conjure': { const v = this.views.get(e.id); if (v && v.actor) v.actor.play('cast', { force: true }); this.fx.ring(w.x, w.z, 2, FAC_COL[e.fac] || '#a0ffb0', 0.7); this.fx.emit(w.x, 0.3, w.z, { n: 20, color: [FAC_COL[e.fac] || '#a0ffb0', '#ffffff'], size: 0.4, life: 0.8, speed: 1.5, up: 1 }); break; }
        case 'nova': { const v = this.views.get(e.id); if (v && v.actor) v.actor.play('cast', { force: true }); this.fx.ring(w.x, w.z, e.r, '#bff0ff', 0.6); this.fx.shards(w.x, w.z, e.r); this.fx.emit(w.x, 0.6, w.z, { n: 30, color: ['#ffffff', '#bff0ff'], size: 0.4, life: 0.8, speed: 4, up: 0.3 }); break; }
        case 'cast': if (SPELL[e.spell].fx === 'meteor') { const w2 = this.toWorld(e.x, e.y); this.fx.meteor(w2.x, w2.z, e.delay); } break;
        case 'spell': this.spellFx(e, w); break;
        case 'heart': this.fx.flash(0, 2, 0, 6, e.owner < 0 ? '#ffffff' : TEAM[e.owner === this.me ? 0 : 1], 0.6); this.fx.ring(0, 0, 3.4, e.owner < 0 ? '#ffffff' : TEAM[e.owner === this.me ? 0 : 1], 0.8); break;
        case 'shieldBreak': { const ent = s.ents.find(o => o.id === e.id); if (ent) { const q = this.toWorld(ent.x, ent.y); this.fx.emit(q.x, 1, q.z, { n: 14, color: ['#cfe8ff', '#ffffff'], size: 0.35, life: 0.5, speed: 3 }); } break; }
        case 'boss': this.shake = 0.6; break;
        case 'bossSkill': {
          const v = this.views.get(e.id); if (v && v.actor) v.actor.play(e.k === 'slam' ? 'attack' : 'cast', { force: true });
          if (e.k === 'slam') { this.fx.explosion(w.x, w.z, e.r, 'roar'); this.fx.ring(w.x, w.z, e.r * 1.3, '#ff5a3a', 0.6); this.shake = 0.45; }
          else if (e.k === 'freeze') { this.fx.shards(w.x, w.z, e.r, '#bff0ff', 2.2); this.fx.ring(w.x, w.z, e.r, '#bff0ff', 0.7); }
          else if (e.k === 'heal') { this.fx.pillar(w.x, w.z, 1.2, '#7dff9a', 1.2, 7); this.fx.emit(w.x, 0.5, w.z, { n: 30, color: ['#b0ffb8', '#ffffff'], size: 0.45, life: 1, speed: 2, up: 1 }); }
          else if (e.k === 'summon') { this.fx.ring(w.x, w.z, 2.4, '#c08aff', 0.8); this.fx.emit(w.x, 0.3, w.z, { n: 26, color: ['#c08aff', '#2a0a40'], size: 0.5, life: 0.9, speed: 1.6, up: 1 }); }
          else if (e.k === 'rage') { this.fx.flash(w.x, 2, w.z, 6, '#ff2a2a', 0.6); this.shake = 0.3; }
          break; }
        case 'bossDown': this.fx.explosion(w.x, w.z, 3, 'fire'); this.fx.pillar(w.x, w.z, 1.4, '#ffd166', 1.4, 10); this.shake = 0.8; break;
        case 'wave': this.fx.flash(0, 3, -8, 10, '#ff5a3a', 0.6); break;
        case 'summon': if (e.p === this.me) { const b = BENCH_X[e.slot]; const col = RARITIES[HERO[e.id].rar].color; this.fx.pillar(b, BENCH_Z, 0.8, col, 0.8, 5); this.fx.emit(b, 0.4, BENCH_Z, { n: 24, color: [col, '#ffffff'], size: 0.45, life: 0.8, speed: 2, up: 1 }); } break;
        case 'benchFuse': if (e.p === this.me) { const b = BENCH_X[e.slot]; this.fx.pillar(b, BENCH_Z, 1, '#ffd166', 0.9, 6); this.fx.emit(b, 0.6, BENCH_Z, { n: 36, color: ['#fff3c0', '#ffd166'], size: 0.45, life: 0.9, speed: 2.5, up: 1 }); } break;
      }
    }
  }
  spellFx(e, w) {
    if (e.fx === 'meteor') { this.fx.explosion(w.x, w.z, e.r, 'fire'); this.fx.explosion(w.x, w.z, e.r * 0.6, 'roar'); this.fx.disc(w.x, w.z, e.r, '#ff5a1a', 2.5, 0.5); this.shake = 0.6; }
    else if (e.fx === 'freeze') { this.fx.shards(w.x, w.z, e.r, '#bff0ff', 3.5); this.fx.disc(w.x, w.z, e.r, '#9fe8ff', 3.5, 0.35); this.fx.emit(w.x, 2, w.z, { n: 60, color: ['#ffffff', '#cfefff'], size: 0.35, life: 1.6, speed: 2, up: -0.2, spread: 1.5, gravity: -1, jitter: e.r }); }
    else if (e.fx === 'heal') { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.fx.pillar(w.x + Math.cos(a) * e.r * 0.55, w.z + Math.sin(a) * e.r * 0.55, 0.3, '#ffe39a', 1.2, 5); } this.fx.disc(w.x, w.z, e.r, '#ffd166', 1.2, 0.35); this.fx.emit(w.x, 0.3, w.z, { n: 50, color: ['#fff6c8', '#ffd166', '#b0ffb0'], size: 0.45, life: 1.2, speed: 1.5, up: 1.2, jitter: e.r }); }
    else if (e.fx === 'storm') { this.fx.bolt([new THREE.Vector3(w.x + 1, 16, w.z - 3), new THREE.Vector3(w.x, 0.2, w.z)], '#dff8ff', 0.35, 0.14); this.fx.explosion(w.x, w.z, e.r, 'bolt'); this.shake = 0.25; }
  }
  onDie(e, s) {
    const w = this.toWorld(e.x, e.y);
    if (e.kind === 'sanct') {
      const S = this.sanct[e.p === this.me ? 0 : 1];
      for (let k = 0; k < 4; k++) setTimeout(() => this.fx.explosion(w.x + (Math.random() - 0.5) * 2, w.z + (Math.random() - 0.5) * 2, 2.5, 'fire'), k * 180);
      this.shake = 1.0; S.dead = true;
      return;
    }
    const v = this.views.get(e.id);
    if (v && v.actor) { v.dying = 0.01; v.actor.play('death', { force: true }); if (v.ring) v.ring.visible = false; }
    this.fx.emit(w.x, 0.6, w.z, { n: 10, color: ['#e8e4f0', '#c8c0d8'], size: 0.7, life: 0.8, speed: 1.2, up: 0.7, gravity: 0.5, alpha: 0.5 });
  }
  num(x, y, txt, h = 2.2, col = '#ffffff', big = false) { this.nums.push({ x, y, h, txt, col, big, t: 0 }); if (this.nums.length > 30) this.nums.shift(); }

  // ---------- Image ----------
  async ensureView(e) {
    const v = { pending: true, ring: null, actor: null };
    this.views.set(e.id, v);
    const a = await makeHero(e.card, { star: e.star, lite: this.q.low, skin: e.boss ? e.boss.skin : e.p === this.me ? (this.skins || {})[e.card] : null });
    if (e.boss) { a.holder.scale.multiplyScalar(e.boss.scale); a.height *= e.boss.scale; const gl = glowSprite(0xff2a3a, e.r * 4); gl.material.opacity = 0.3; gl.position.y = 0.3; a.holder.add(gl); }
    if (!this.views.has(e.id)) { a.dispose(); return; }
    a.holder.add(blobShadow(e.r * 3));
    v.actor = a; v.pending = false; v.star = e.star;
    const team = e.p === this.me ? 0 : 1;
    const ring = new THREE.Mesh(new THREE.RingGeometry(e.r * 0.95, e.r * 1.2, 32), new THREE.MeshBasicMaterial({ color: e.star > 1 ? '#ffd166' : TEAM[team], transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; a.holder.add(ring); v.ring = ring;
    const c = HERO[e.card];
    if (c.model.glow && c.rar !== 'commun') { const gl = glowSprite(new THREE.Color(c.model.glow), e.r * 3.2); gl.position.y = 0.3; gl.material.opacity = 0.35; a.holder.add(gl); }
    const w = this.toWorld(e.x, e.y);
    a.holder.position.set(w.x, 0, w.z);
    a.holder.rotation.y = e.p === this.me ? Math.PI : 0;
    this.scene.add(a.holder);
    if (e.deploy > 0.2) { a.holder.position.y = c.model.spawn ? 0 : 6; v.drop = c.model.spawn ? 0 : 1; a.play('spawn', { force: true }); }
    else a.play('idle');
  }

  sync(s, alpha, dt) {
    this.time += dt;
    const seen = new Set();
    for (const e of s.ents) {
      if (e.kind === 'sanct') continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) { this.ensureView(e); continue; }
      if (v.pending || !v.actor) continue;
      const a = v.actor, x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha, w = this.toWorld(x, y);
      a.holder.position.x = w.x; a.holder.position.z = w.z;
      if (v.drop) { a.holder.position.y = Math.max(0, a.holder.position.y - dt * 14); if (a.holder.position.y <= 0) v.drop = 0; }
      if (e.star !== v.star) { v.star = e.star; const k = [1, 1, 1.18, 1.36][e.star] / [1, 1, 1.18, 1.36][e.star - 1]; a.holder.scale.multiplyScalar(k); if (v.ring) v.ring.material.color.set('#ffd166'); }
      if (e.kind === 'unit' && (e.faceX || e.faceY)) {
        const want = Math.atan2(e.faceX, e.faceY);
        let d = want - a.holder.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        a.holder.rotation.y += d * Math.min(1, dt * 10);
      }
      a.setFrozen(e.frozen > 0);
      if (e.deploy <= 0 && !v.dying) {
        a.back = e.moving ? (e.spd < 1 ? 'walk' : 'run') : 'idle';
        if (e.moving) a.play(e.spd < 1 ? 'walk' : 'run'); else if (!['attack', 'cast'].includes(a.state) || !a.lock) a.play('idle');
      }
    }
    for (const [id, v] of this.views) {
      if (v.pending || !v.actor) { if (!seen.has(id) && !v.pending) this.views.delete(id); continue; }
      if (!seen.has(id) && !v.dying) v.dying = 0.01;
      if (v.dying) {
        v.dying += dt;
        if (v.dying > 1.4) v.actor.holder.position.y -= dt * 1.2;
        if (v.dying > 2.2) { this.scene.remove(v.actor.holder); v.actor.dispose(); this.views.delete(id); continue; }
      }
      v.actor.update(dt);
    }
    // Cercle d'invocation du joueur
    const B = s.players[this.me].bench;
    for (let i = 0; i < BENCH; i++) {
      const b = this.bench[i], h = B[i], key = h ? h.id + h.star : '';
      if (key !== b.key) {
        b.key = key;
        if (b.actor) { b.g.remove(b.actor.holder); b.actor.dispose(); b.actor = null; }
        if (h) {
          const k = key;
          makeHero(h.id, { star: h.star, lite: this.q.low, skin: (this.skins || {})[h.id] }).then(a => {
            if (b.key !== k) { a.dispose(); return; }
            a.holder.position.y = 0.23; a.holder.scale.multiplyScalar(1.05); a.play('idle'); b.actor = a; b.g.add(a.holder);
          });
        }
      }
      if (b.actor) { b.actor.update(dt); b.actor.holder.rotation.y = Math.sin(this.time * 0.6 + i) * 0.35; }
      b.rune.rotation.z += dt * 0.6;
    }
    // Sanctuaires, Cœur
    for (const p of [0, 1]) {
      const e = s.ents.find(o => o.kind === 'sanct' && o.p === p), S = this.sanct[p === this.me ? 0 : 1], k = Math.max(0, e.hp / e.maxHp);
      if (!S.dead) S.cr.update(this.time, k); else { S.cr.group.position.y = Math.max(0.6, S.cr.group.position.y - dt * 3); }
      if (k < 0.5 && !S.dead) { S.smokeT -= dt; if (S.smokeT <= 0) { S.smokeT = 0.15 + k * 0.4; this.fx.emit(S.g.position.x + (Math.random() - 0.5) * 2, 2.5, S.g.position.z, { n: 1, color: k < 0.25 ? ['#ff8a3d', '#5a5050'] : ['#6a6464'], size: 1.2, life: 1.6, speed: 0.4, up: 1, gravity: 1, alpha: 0.4 }); } }
    }
    this.heart.update(this.time, this.me === 0 ? s.heart.ctl : -s.heart.ctl, s.heart.owner < 0 ? -1 : s.heart.owner === this.me ? 0 : 1, TEAM);
    this.fx.syncProjectiles(s.proj, (x, y) => this.toWorld(x, y));
    this.fx.update(dt);
    this.world.update(dt, this.time);
    if (this.ghost) { this.ghost.a.update(dt); }
    // caméra (tremblement)
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * 0.5; this.cam.position.set(this.camBase.x + (Math.random() - 0.5) * k, this.camBase.y + (Math.random() - 0.5) * k, this.camBase.z + (Math.random() - 0.5) * k); }
    else this.cam.position.copy(this.camBase);
    this.post.render();
    this.drawOverlay(s, alpha, dt);
  }

  drawOverlay(s, alpha, dt) {
    const c = this.octx, d = this.od;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.ow, this.oh);
    for (const e of s.ents) {
      if (e.kind === 'sanct' || e.deploy > 0) continue;
      const v = this.views.get(e.id); if (!v || !v.actor) continue;
      const show = e.hp < e.maxHp || e.star > 1 || e.kind === 'building' || e.shield > 0;
      if (!show) continue;
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
      const h = v.actor.height + (e.fly ? 1.2 : 0.25);
      const p = this.screenOf(x, y, h);
      const w = Math.max(26, e.r * 44), hh = 5;
      const team = e.p === this.me ? 0 : 1;
      c.fillStyle = 'rgba(10,6,20,.8)'; rr(c, p.x - w / 2 - 1.5, p.y - 1.5, w + 3, hh + 3, 3); c.fill();
      c.fillStyle = TEAM[team]; rr(c, p.x - w / 2, p.y, w * Math.max(0, e.hp / e.maxHp), hh, 2); c.fill();
      if (e.shield > 0) { c.fillStyle = '#d8ecff'; c.fillRect(p.x - w / 2, p.y - 3, Math.min(w, w * e.shield / e.maxHp * 2), 2); }
      if (e.star > 1) { c.font = '900 12px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(20,10,30,.9)'; c.lineWidth = 3; const st = '★'.repeat(e.star); c.strokeText(st, p.x, p.y - 4); c.fillText(st, p.x, p.y - 4); }
    }
    // étoiles du cercle d'invocation
    const B = s.players[this.me].bench;
    c.textAlign = 'center';
    for (let i = 0; i < BENCH; i++) {
      const h = B[i]; if (!h) continue;
      const p = this.benchScreen(i);
      const col = RARITIES[HERO[h.id].rar].color;
      c.font = '900 13px Nunito, sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(15,8,30,.95)';
      for (let k = 0; k < 3; k++) { const sx = p.x + (k - 1) * 13; c.strokeText('★', sx, p.y + 22); c.fillStyle = k < h.star ? '#ffd166' : 'rgba(255,255,255,.25)'; c.fillText('★', sx, p.y + 22); }
      c.fillStyle = col; c.font = '800 10px Nunito, sans-serif'; c.strokeText(HERO[h.id].name, p.x, p.y + 34); c.fillText(HERO[h.id].name, p.x, p.y + 34);
      const twin = B.some((o, k) => k !== i && o && o.id === h.id && o.star === h.star && h.star < 3);
      if (twin) { c.font = '900 11px Nunito, sans-serif'; c.fillStyle = '#7dff9a'; const yy = p.y - 62 - Math.abs(Math.sin(this.time * 4)) * 5; c.strokeText('FUSION ✦', p.x, yy); c.fillText('FUSION ✦', p.x, yy); }
    }
    for (const n of this.nums) {
      n.t += dt; const k = n.t / 1.1;
      const p = this.screenOf(n.x, n.y, n.h + k * 1.2);
      c.globalAlpha = k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3);
      c.font = `900 ${n.big ? 20 : 14}px Nunito, sans-serif`; c.lineWidth = 3.5; c.strokeStyle = 'rgba(15,8,30,.9)';
      c.strokeText(n.txt, p.x, p.y); c.fillStyle = n.col; c.fillText(n.txt, p.x, p.y);
    }
    c.globalAlpha = 1;
    this.nums = this.nums.filter(n => n.t < 1.1);
  }

  dispose() {
    this.fx.dispose(); this.world && this.world.dispose();
    for (const [, v] of this.views) if (v.actor) v.actor.dispose();
    this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss();
  }
}

const FAC_COL = { sylve: '#8fff9a', ombre: '#c08aff', givre: '#bff0ff', braise: '#ffb02e', arcane: '#b8a8ff', aube: '#ffe39a' };
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
