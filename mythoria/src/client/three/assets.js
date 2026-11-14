// MYTHORIA — chargement des modèles 3D et fabrication des héros animés.
// Personnages : KayKit (CC0), tous sur le même squelette => une seule banque d'animations partagée.
// Bêtes : Quaternius (CC0), avec leurs propres animations. Créatures : construites par le code (procedural.js).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HERO } from '../../shared/content.js';
import { buildProc } from './procedural.js';
import { addRim, addOutline, syncOutlines } from './look.js';
import { attachHeroFx } from './herofx.js';
import { SKINS } from '../../shared/economy.js';

const BASE = 'assets/models/';
const loader = new GLTFLoader();
const cache = new Map();
export function loadGLB(path) {
  if (!cache.has(path)) cache.set(path, new Promise((ok, ko) => loader.load(BASE + path, g => {
    g.scene.traverse(o => { if (o.geometry) o.geometry.userData.shared = true; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.userData.shared = true; }); });
    ok(g);
  }, undefined, ko)));
  return cache.get(path);
}

let CLIPS = null;
export async function heroClips() {
  if (CLIPS) return CLIPS;
  const g = await loadGLB('heroes/anims.glb');
  CLIPS = Object.fromEntries(g.animations.map(a => [a.name, a]));
  return CLIPS;
}

// Liste des fichiers nécessaires pour une liste de héros (pour tout précharger avant un combat).
export function filesFor(ids) {
  const f = new Set();
  for (const id of ids) {
    const m = HERO[id]?.model; if (!m) continue;
    if (m.glb) { f.add('heroes/' + m.glb + '.glb'); for (const [w] of m.add || []) f.add('heroes/' + w + '.glb'); }
    if (m.beast) f.add('beasts/' + m.beast + '.glb');
    const c = HERO[id];
    if (c.summon) for (const x of filesFor([c.summon.id])) f.add(x);
    if (c.death) for (const x of filesFor([c.death.id])) f.add(x);
  }
  return [...f];
}
export async function preload(ids, onProgress) {
  const files = filesFor(ids);
  let n = 0;
  await heroClips();
  await Promise.all(files.map(f => loadGLB(f).then(() => onProgress && onProgress(++n / files.length))));
}

const HEIGHT = 2.1;
const FILTERED = new Map(); // taille de référence d'un héros (en cases)
const tmpBox = new THREE.Box3();

// Objet commun renvoyé pour tous les héros : { root, play(state), update(dt), flash(), height }
class Actor {
  constructor(root, height) { this.root = root; this.height = height; this.mats = []; this.flashT = 0; this.state = ''; this.frozen = false; }
  collectMats(tint, glow) {
    this.root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const cl = list.map(m => {
        const c = m.clone();
        if (tint) c.color.multiply(new THREE.Color(tint));
        if (glow) { c.emissive = new THREE.Color(glow); c.emissiveIntensity = 0.05; }
        c.userData.baseEmissive = c.emissive ? c.emissive.clone() : new THREE.Color(0);
        c.userData.baseEI = c.emissiveIntensity || 0;
        this.mats.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    });
  }
  flash(col = 0xffffff) { this.flashT = 0.12; this.flashCol = col; }
  updateMats(dt) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = this.flashT > 0;
      for (const m of this.mats) if (m.emissive) {
        if (on) { m.emissive.set(this.flashCol); m.emissiveIntensity = 0.9; }
        else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseEI; }
      }
    }
  }
  setFrozen(on) {
    if (on === this.frozen) return;
    this.frozen = on;
    for (const m of this.mats) if (m.emissive) {
      if (on) { m.emissive.set(0x7fd8ff); m.emissiveIntensity = 0.6; }
      else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseEI; }
    }
  }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a >= 1; } }
  dispose() { for (const m of this.mats) m.dispose(); }
}

class SkinnedActor extends Actor {
  constructor(root, height, clips, map) {
    super(root, height);
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = clips; this.map = map; this.cur = null; this.lock = 0;
    this.mixer.addEventListener('finished', e => { if (e.action === this.cur && this.onDone) { const f = this.onDone; this.onDone = null; f(); } });
  }
  action(name) { const c = this.clips[name]; return c ? this.mixer.clipAction(c) : null; }
  // state : idle | run | walk | attack | cast | hit | death | spawn | cheer
  play(state, { force = false, speed = 1 } = {}) {
    let name = this.map[state];
    if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
    if (!name) return;
    const once = ['attack', 'cast', 'hit', 'death', 'spawn', 'cheer'].includes(state);
    if (!force && this.state === state && !once) return;
    if (!force && this.lock > 0 && !['death', 'attack', 'cast'].includes(state)) return;
    const a = this.action(name); if (!a) return;
    this.state = state;
    a.reset(); a.enabled = true; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = state === 'death';
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, state === 'death' ? 0.1 : 0.18, false);
    a.play();
    this.cur = a;
    this.lock = once && state !== 'death' ? a.getClip().duration / speed * 0.85 : 0;
    if (once && state !== 'death') this.onDone = () => { this.lock = 0; this.play(this.back || 'idle', { force: true }); };
  }
  update(dt) {
    if (this.lock > 0) this.lock -= dt;
    if (!this.frozen) this.mixer.update(dt);
    this.updateMats(dt);
  }
}

function normalize(root, wanted) {
  root.updateMatrixWorld(true);
  tmpBox.setFromObject(root);
  const h = tmpBox.max.y - tmpBox.min.y || 1;
  const k = wanted / h;
  root.scale.multiplyScalar(k);
  return k;
}

// Fabrique un héros 3D. Le modèle doit avoir été préchargé (preload) pour être instantané.
async function buildHero(id, { star = 1, skin = null } = {}) {
  const c = HERO[id], m = skin && SKINS[skin] ? { ...HERO[id].model, tint: SKINS[skin].tint, glow: SKINS[skin].glow } : HERO[id].model;
  const holder = new THREE.Group();
  const size = (m.scale || 1) * [1, 1, 1.18, 1.36][star];
  if (m.proc) {
    const p = buildProc(m.proc, m);
    p.root.scale.multiplyScalar(size);
    holder.add(p.root);
    p.height = (p.height || 1.6) * size;
    p.holder = holder;
    return p;
  }
  if (m.beast) {
    const g = await loadGLB('beasts/' + m.beast + '.glb');
    const root = SkeletonUtils.clone(g.scene);
    root.rotation.y = 0;
    normalize(root, 1.3 * (m.beast === 'Stag' ? 1.9 : 1));
    root.scale.multiplyScalar(size);
    const clips = Object.fromEntries(g.animations.map(a => [a.name, a]));
    const a = new SkinnedActor(root, 1.3 * (m.beast === 'Stag' ? 1.9 : 1) * size, clips, {
      idle: 'Idle', run: 'Gallop', walk: 'Walk', attack: Object.keys(clips).filter(n => n.startsWith('Attack')), cast: 'Idle_HitReact_Left', hit: 'Idle_HitReact_Left', death: 'Death', spawn: 'Idle', cheer: 'Idle',
    });
    a.collectMats(m.tint, m.glow);
    holder.add(root); a.holder = holder;
    return a;
  }
  const g = await loadGLB('heroes/' + m.glb + '.glb');
  const root = SkeletonUtils.clone(g.scene);
  const show = new Set(m.show || []);
  root.traverse(o => {
    if (o.isMesh && !o.isSkinnedMesh && o.parent && o.parent.isBone) o.visible = show.has(o.name);
  });
  for (const [w, slot] of m.add || []) {
    const wg = await loadGLB('heroes/' + w + '.glb');
    const bone = root.getObjectByName(slot.replace('.', ''));
    if (bone) bone.add(wg.scene.clone(true));
  }
  normalize(root, HEIGHT);
  root.scale.multiplyScalar(size);
  let clips = await heroClips();
  // Squelette simplifié (ex. Ranger 2.0) : on retire les pistes d'animation des os absents.
  if (!FILTERED.has(m.glb)) {
    const names = new Set(); root.traverse(o => names.add(o.name));
    const missing = Object.values(clips).some(c => c.tracks.some(t => !names.has(t.name.split('.')[0])));
    FILTERED.set(m.glb, missing ? Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, new THREE.AnimationClip(c.name, c.duration, c.tracks.filter(t => names.has(t.name.split('.')[0])))])) : null);
  }
  clips = FILTERED.get(m.glb) || clips;
  const skel = m.glb.startsWith('Skeleton');
  const a = new SkinnedActor(root, HEIGHT * size, clips, {
    idle: m.idle || (skel ? 'Idle_Combat' : 'Idle'), run: 'Running_A', walk: skel ? 'Walking_D_Skeletons' : 'Walking_A',
    attack: m.atk || ['1H_Melee_Attack_Chop'], cast: m.cast || 'Spellcast_Long', hit: 'Hit_A', death: skel ? ['Death_C_Skeletons', 'Death_A'] : ['Death_A', 'Death_B'],
    spawn: m.spawn || 'Spawn_Air', cheer: 'Cheer',
  });
  a.collectMats(m.tint, m.glow);
  holder.add(root); a.holder = holder;
  return a;
}

// Fabrique un héros 3D complet : modèle + lumière de contour + contour sombre + effets propres au héros.
// opts : star, outline (true), fx (true), lite (moins de particules)
export async function makeHero(id, opts = {}) {
  const a = await buildHero(id, opts);
  const c = HERO[id], m = opts.skin && SKINS[opts.skin] ? { ...c.model, glow: SKINS[opts.skin].glow } : c.model;
  const rimCol = m.glow || (m.proc ? '#ffe0b0' : '#cfe0ff');
  const rimK = m.glow ? 0.32 : 0.24;
  for (const mat of a.mats) if (mat.isMeshStandardMaterial && !mat.transparent) addRim(mat, rimCol, rimK, 3.2);
  if (opts.outline !== false) addOutline(a.root, m.proc ? 0.035 : 0.03);
  const fx = opts.fx === false ? null : attachHeroFx(a, id, { lite: opts.lite });
  const orig = a.update.bind(a);
  let t = Math.random() * 10;
  const proc = !!m.proc && opts.outline !== false;
  a.update = dt => { orig(dt); t += dt; if (fx) fx(dt, t, a.state); if (proc) syncOutlines(a.root); };
  // Libère vraiment la mémoire de la carte graphique (sauf ce qui est partagé entre héros).
  const baseDispose = a.dispose.bind(a);
  a.dispose = () => { baseDispose(); if (a.holder) freeTree(a.holder); };
  return a;
}

export function freeTree(root) {
  root.traverse(o => {
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map.userData.own) m.map.dispose(); });
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m.userData.shared && !m.userData.isOutlineMat) m.dispose(); });
  });
}

// Décor (arbres, rochers, temples…)
export async function prop(name, { tint, scale = 1, shadow = true } = {}) {
  const g = await loadGLB('world/' + name + '.glb');
  const o = g.scene.clone(true);
  o.traverse(x => {
    if (!x.isMesh) return;
    x.castShadow = shadow; x.receiveShadow = true;
    if (tint) { x.material = x.material.clone(); x.material.color.multiply(new THREE.Color(tint)); }
  });
  o.scale.multiplyScalar(scale);
  return o;
}
