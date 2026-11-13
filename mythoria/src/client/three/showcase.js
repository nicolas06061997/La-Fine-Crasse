// MYTHORIA — 3D des menus : vitrine d'un héros (tourne, joue ses animations) et portraits
// fabriqués à partir des vrais modèles 3D (pour la collection).
import * as THREE from 'three';
import { createRenderer } from './stage.js';
import { makeHero, preload, prop } from './assets.js';
import { THEMES } from './world.js';
import { glowSprite } from './procedural.js';
import { HERO, RARITIES } from '../../shared/content.js';

// ---------- Vitrine ----------
export class Showcase {
  constructor(canvas, { world = 'aurore', heroId = 'ecuyer', star = 1, mode = 'hero' } = {}) {
    this.cv = canvas; this.mode = mode;
    this.r = createRenderer(canvas, { alpha: true });
    this.r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.t = 0; this.rotY = 0.5; this.spin = 0.25; this.dead = false;
    const T = THEMES[world] || THEMES.aurore;
    this.scene.add(new THREE.HemisphereLight(T.hemiSky, T.hemiGround, 1.3));
    const sun = new THREE.DirectionalLight(T.sun, 2.4); sun.position.set(-3, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: 0.5, far: 20 }); this.scene.add(sun);
    const rim = new THREE.DirectionalLight(new THREE.Color(T.skyBot), 1.8); rim.position.set(3, 3, -4); this.scene.add(rim);
    // socle
    this.base = new THREE.Group(); this.scene.add(this.base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 32), new THREE.MeshStandardMaterial({ color: T.ground, flatShading: true })); top.position.y = -0.15; top.receiveShadow = true; this.base.add(top);
    const rimR = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.5, 0.5, 32), new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true })); rimR.position.y = -0.5; this.base.add(rimR);
    const under = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 9), new THREE.MeshStandardMaterial({ color: T.rock2, flatShading: true })); under.rotation.x = Math.PI; under.position.y = -1.8; this.base.add(under);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 48), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.02; this.base.add(this.ring);
    if (mode === 'home') {
      const add = async (n, x, z, s) => { try { const o = await prop(n, { scale: s }); o.position.set(x, 0, z); this.base.add(o); } catch (e) {} };
      add(T.props[0][0], -1.1, -0.9, 0.55); add(T.props[Math.min(2, T.props.length - 1)][0], 1.15, -0.7, 0.6);
    }
    this.glow = glowSprite(0xffffff, 3); this.glow.position.y = 0.9; this.glow.material.opacity = 0.25; this.scene.add(this.glow);
    this.resize();
    this.setHero(heroId, star);
    this.bindDrag();
    this.loop = this.loop.bind(this); this.last = 0; this.raf = requestAnimationFrame(this.loop);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
  }
  async setHero(id, star = 1) {
    const my = (this.req = (this.req || 0) + 1);
    await preload([id]);
    const a = await makeHero(id, { star });
    if (my !== this.req || this.dead) { a.dispose(); return; }
    if (this.actor) { this.base.remove(this.actor.holder); this.actor.dispose(); }
    this.actor = a; a.play('idle'); a.back = 'idle'; this.base.add(a.holder);
    const c = HERO[id];
    this.ring.material.color.set(RARITIES[c.rar].color);
    this.glow.material.color.set(c.model.glow || RARITIES[c.rar].color);
    this.frame();
  }
  play(state) { if (this.actor) { this.actor.back = 'idle'; this.actor.play(state, { force: true }); } }
  frame() {
    const h = this.actor ? Math.min(3.4, this.actor.height + (HERO[this.heroId]?.fly ? 1 : 0)) : 1.8;
    const fly = this.actor && this.actor.height > 1.85 ? 1.15 : 1;
    const d = (this.mode === 'home' ? 6.4 : 5.4) * Math.max(1, h * fly / 1.8);
    this.cam.position.set(0, h * 0.62 + 0.9, d);
    this.cam.lookAt(0, h * 0.48, 0);
  }
  resize() {
    const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  }
  bindDrag() {
    let x0 = null;
    this.cv.addEventListener('pointerdown', e => { x0 = e.clientX; this.spin = 0; });
    this.onMove = e => { if (x0 === null) return; this.rotY += (e.clientX - x0) * 0.012; x0 = e.clientX; };
    this.onUp = () => { if (x0 !== null) { x0 = null; this.spin = 0.25; } };
    addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
  }
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now; this.t += dt;
    this.rotY += this.spin * dt;
    this.base.rotation.y = this.rotY;
    this.base.position.y = Math.sin(this.t * 1.2) * 0.05;
    this.ring.rotation.z += dt * 0.5;
    if (this.actor) this.actor.update(dt);
    this.r.render(this.scene, this.cam);
  }
  dispose() {
    this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect();
    removeEventListener('pointermove', this.onMove); removeEventListener('pointerup', this.onUp);
    if (this.actor) this.actor.dispose();
    this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss();
  }
}

// ---------- Portraits (rendus une fois, puis gardés en mémoire) ----------
const PORTRAITS = new Map(), waiting = new Map();
let pr = null, queue = Promise.resolve();
function portraitRig() {
  if (pr) return pr;
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 300;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(240, 300, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#5a4a6a', 1.4));
  const d = new THREE.DirectionalLight('#fff4e0', 2.6); d.position.set(-2, 4, 5); scene.add(d);
  const rim = new THREE.DirectionalLight('#b8c8ff', 2.2); rim.position.set(3, 2, -4); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 240 / 300, 0.1, 50);
  pr = { cv, r, scene, cam };
  return pr;
}
export function portrait(id) {
  if (PORTRAITS.has(id)) return Promise.resolve(PORTRAITS.get(id));
  if (waiting.has(id)) return waiting.get(id);
  const p = (queue = queue.then(async () => {
    const { cv, r, scene, cam } = portraitRig();
    await preload([id]);
    const a = await makeHero(id, { star: 1 });
    scene.add(a.holder);
    a.holder.rotation.y = 0.45;
    a.play('idle'); a.update(0.6);
    const c = HERO[id], h = a.height, wide = ['wolf', 'Stag'].includes(c.model.beast) || c.model.proc === 'dragon' || c.model.proc === 'ram';
    const fly = c.fly ? 1.0 : 0;
    cam.position.set(0, h * 0.6 + fly * 0.3, (wide ? 3.6 : 3.1) * Math.max(0.8, h / 1.75));
    cam.lookAt(0, h * 0.52 + fly * 0.2, 0);
    if (c.model.proc === 'dragon') { cam.position.y = h * 0.75; cam.lookAt(0, h * 0.6, 0); }
    r.render(scene, cam);
    const url = cv.toDataURL('image/png');
    scene.remove(a.holder); a.dispose();
    PORTRAITS.set(id, url);
    return url;
  }).catch(() => ''));
  waiting.set(id, p);
  return p;
}
