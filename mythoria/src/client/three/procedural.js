// MYTHORIA — créatures et objets 3D construits par le code (vraie 3D, animée par le code) :
// dragons, golem, feux-follets, bélier, pousse, obélisque, cristal du Sanctuaire, Cœur de Mythe.
// Style « low-poly » à facettes, assorti aux personnages KayKit.

import * as THREE from 'three';

const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0, ...o });
const glowMat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, flatShading: true, roughness: 0.4, ...o });
const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

let GLOWTEX = null;
export function glowTexture() {
  if (GLOWTEX) return GLOWTEX;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOWTEX = new THREE.CanvasTexture(c); GLOWTEX.colorSpace = THREE.SRGBColorSpace;
  return GLOWTEX;
}
export function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.set(size, size, size);
  return s;
}

class ProcActor {
  constructor(root, height) {
    this.root = root; this.height = height; this.t = Math.random() * 10; this.state = 'idle'; this.st = 0; this.flashT = 0; this.frozen = false;
    this.mats = [];
    root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); this.mats.push(o.material); o.material.userData.e = o.material.emissive.clone(); o.material.userData.ei = o.material.emissiveIntensity; } });
  }
  play(state, { force } = {}) { if (this.state === 'death') return; if (force || state !== this.state || ['attack', 'cast', 'hit', 'spawn'].includes(state)) { this.state = state; this.st = 0; } }
  flash(col = 0xffffff) { this.flashT = 0.12; this.flashCol = col; }
  setFrozen(on) { this.frozen = on; this.tintE(on ? 0x7fd8ff : null, 0.6); }
  tintE(col, k) { for (const m of this.mats) { if (col == null) { m.emissive.copy(m.userData.e); m.emissiveIntensity = m.userData.ei; } else { m.emissive.set(col); m.emissiveIntensity = k; } } }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a >= 1; } }
  update(dt) {
    if (!this.frozen) { this.t += dt; this.st += dt; this.anim(this.t, this.st, this.state); }
    if (this.flashT > 0) { this.flashT -= dt; this.tintE(this.flashT > 0 ? this.flashCol : (this.frozen ? 0x7fd8ff : null), this.flashT > 0 ? 0.9 : 0.6); }
    if (['attack', 'cast', 'hit'].includes(this.state) && this.st > 0.6) this.state = this.back || 'idle';
  }
  dispose() { for (const m of this.mats) m.dispose(); }
}

// ---------------- Dragon ----------------
function dragon({ color = '#ff7a3d', belly = '#ffd27a', horns = false }) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const base = new THREE.Color(color);
  const M = flat(color), B = flat(belly), D = flat(base.clone().multiplyScalar(0.5)), Hn = flat('#f1e6c8'), Cl = flat('#2a2030');
  const W = flat(base.clone().lerp(new THREE.Color('#2a0a10'), 0.35), { side: THREE.DoubleSide });
  body.position.y = 1.25;
  // torse
  const torso = add(body, new THREE.SphereGeometry(0.5, 14, 10), M); torso.scale.set(0.82, 0.74, 1.3);
  const chest = add(body, new THREE.SphereGeometry(0.42, 12, 8), M, 0, 0.08, 0.38); chest.scale.set(0.85, 0.85, 0.9);
  const bel = add(body, new THREE.SphereGeometry(0.4, 12, 8), B, 0, -0.16, 0.12); bel.scale.set(0.72, 0.6, 1.25);
  // cou articulé (3 segments)
  const neck = []; let par = body;
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Group(); n.position.set(0, i ? 0.2 : 0.22, i ? 0.12 : 0.55); par.add(n);
    const seg = add(n, new THREE.CylinderGeometry(0.14 - i * 0.015, 0.2 - i * 0.02, 0.32, 8), M, 0, 0.1, 0.05); seg.rotation.x = 0.55;
    add(n, new THREE.SphereGeometry(0.12 - i * 0.012, 8, 6), B, 0, 0.06, 0.13).scale.set(0.9, 0.7, 0.6);
    add(n, new THREE.ConeGeometry(0.05, 0.14, 4), horns ? flat('#ffd166') : D, 0, 0.22, -0.03).rotation.x = -0.5;
    neck.push(n); par = n;
  }
  // tête
  const head = new THREE.Group(); head.position.set(0, 0.28, 0.12); par.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.2, 10, 8), M); skull.scale.set(1, 0.85, 1.15);
  const snout = add(head, new THREE.CylinderGeometry(0.09, 0.17, 0.42, 8), M, 0, -0.02, 0.3); snout.rotation.x = Math.PI / 2; snout.scale.x = 1.15;
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.045, 6, 5), glowMat('#ffe066', { emissiveIntensity: 2 }), sx * 0.12, 0.07, 0.14);
    const brow = add(head, new THREE.BoxGeometry(0.12, 0.04, 0.12), D, sx * 0.11, 0.13, 0.13); brow.rotation.z = -sx * 0.4;
    const h1 = add(head, new THREE.ConeGeometry(0.055, horns ? 0.62 : 0.34, 6), Hn, sx * 0.12, 0.16, -0.12); h1.rotation.x = -1.15; h1.rotation.z = -sx * 0.35;
    if (horns) { const h2 = add(head, new THREE.ConeGeometry(0.035, 0.3, 5), Hn, sx * 0.19, 0.04, -0.06); h2.rotation.x = -1.3; h2.rotation.z = -sx * 0.9; }
    add(head, new THREE.ConeGeometry(0.02, 0.07, 4), flat('#fff'), sx * 0.06, -0.11, 0.42).rotation.x = Math.PI;
    add(head, new THREE.SphereGeometry(0.02, 4, 3), Cl, sx * 0.05, 0.02, 0.51);
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.1, 0.06); head.add(jaw);
  const jm = add(jaw, new THREE.CylinderGeometry(0.06, 0.13, 0.4, 8), B, 0, 0, 0.22); jm.rotation.x = Math.PI / 2; jm.scale.y = 1;
  const fireGlow = glowSprite(new THREE.Color(belly), 0.01); head.add(fireGlow); fireGlow.position.set(0, -0.05, 0.7);
  // crête dorsale
  for (let i = 0; i < 6; i++) { const sp = add(body, new THREE.ConeGeometry(0.06, 0.24 - i * 0.02, 4), horns ? flat('#ffd166') : D, 0, 0.38 - i * 0.025, 0.35 - i * 0.2); sp.rotation.x = -0.5; }
  // ailes (bras + 3 doigts + membrane), en 2 parties pour un battement souple
  const wings = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.3, 0.25, 0.15); body.add(sh);
    const arm = add(sh, new THREE.CylinderGeometry(0.045, 0.06, 0.75, 6), D, sx * 0.36, 0.1, 0); arm.rotation.z = sx * 1.25;
    const tip = new THREE.Group(); tip.position.set(sx * 0.7, 0.2, 0); sh.add(tip);
    const fingers = [[1.1, 0.25, 0.05], [1.0, -0.05, -0.45], [0.7, -0.15, -0.8]];
    for (const [len, dy, dz] of fingers) {
      const f = add(tip, new THREE.CylinderGeometry(0.02, 0.035, Math.hypot(len, dy, dz), 5), D, sx * len / 2, dy / 2, dz / 2);
      f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(sx * len, dy, dz).normalize());
    }
    const mk = (pts, idx) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, W); m.castShadow = true; return m; };
    sh.add(mk([0, 0, 0.15, sx * 0.7, 0.2, 0, sx * 0.55, -0.05, -0.75, 0, -0.05, -0.55], sx > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]));
    tip.add(mk([0, 0, 0, sx * 1.1, 0.25, 0.05, sx * 0.85, 0.02, -0.3, sx * 1.0, -0.05, -0.45, sx * 0.55, -0.12, -0.62, sx * 0.7, -0.15, -0.8, sx * -0.15, -0.25, -0.75],
      sx > 0 ? [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6] : [0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4, 0, 6, 5]));
    wings.push([sh, tip, sx]);
  }
  // queue (7 segments) + pointe
  const tail = []; par = body;
  for (let i = 0; i < 7; i++) {
    const sg = new THREE.Group(); sg.position.set(0, i ? 0 : -0.05, i ? -0.24 : -0.6); par.add(sg);
    add(sg, new THREE.CylinderGeometry(Math.max(0.03, 0.15 - i * 0.02), Math.max(0.04, 0.17 - i * 0.02), 0.28, 7), M, 0, 0, -0.12).rotation.x = Math.PI / 2;
    if (i % 2 === 0) add(sg, new THREE.ConeGeometry(0.035, 0.12, 4), D, 0, 0.12 - i * 0.012, -0.1).rotation.x = -0.4;
    tail.push(sg); par = sg;
  }
  const spade = add(par, new THREE.OctahedronGeometry(0.14, 0), D, 0, 0, -0.32); spade.scale.set(1.3, 0.3, 1.4);
  // pattes (cuisse + jambe + griffes)
  const legs = [];
  for (const [x, z, fr] of [[-0.24, 0.32, 1], [0.24, 0.32, 1], [-0.27, -0.28, 0], [0.27, -0.28, 0]]) {
    const th = new THREE.Group(); th.position.set(x, -0.25, z); body.add(th);
    add(th, new THREE.SphereGeometry(fr ? 0.11 : 0.15, 7, 6), M, 0, 0, 0).scale.y = 1.3;
    const shin = new THREE.Group(); shin.position.y = -0.2; th.add(shin);
    add(shin, new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6), D, 0, -0.12, 0);
    for (const c of [-1, 0, 1]) { const cl = add(shin, new THREE.ConeGeometry(0.025, 0.1, 4), Cl, c * 0.04, -0.28, 0.06); cl.rotation.x = 1.4; }
    legs.push([th, shin, fr]);
  }

  const a = new ProcActor(root, 2.1);
  a.anim = (t, st, state) => {
    const fast = state === 'run' ? 1.35 : 1, ph = t * 6.5 * fast;
    body.position.y = 1.25 + Math.sin(ph) * 0.09;
    body.rotation.x = state === 'run' ? 0.12 : 0;
    for (const [sh, tip, sx] of wings) { sh.rotation.z = sx * (Math.sin(ph) * 0.6 + 0.1); tip.rotation.z = sx * (Math.sin(ph - 0.9) * 0.45); sh.rotation.y = -sx * 0.15; }
    tail.forEach((sg, i) => { sg.rotation.y = Math.sin(t * 2.4 - i * 0.55) * 0.22; sg.rotation.x = Math.sin(t * 1.8 - i * 0.5) * 0.08 + (i === 0 ? 0.15 : 0); });
    for (const [th, shin, fr] of legs) { th.rotation.x = (fr ? 0.6 : 0.9) + Math.sin(ph) * 0.08; shin.rotation.x = -0.9; }
    let lunge = 0, mouth = 0.08;
    if (state === 'attack' || state === 'cast') { const k = Math.sin(Math.min(1, st / 0.5) * Math.PI); lunge = k; mouth = 0.08 + k * 0.7; fireGlow.scale.setScalar(k * 1.2); } else fireGlow.scale.setScalar(0.001);
    neck.forEach((n, i) => { n.rotation.x = -lunge * 0.25 + Math.sin(t * 1.5 + i) * 0.04; n.rotation.y = Math.sin(t * 0.9) * 0.08; });
    head.rotation.x = lunge * 0.35; jaw.rotation.x = mouth;
    if (state === 'death') { body.rotation.z = Math.min(1.4, st * 2); body.position.y = Math.max(0.35, 1.25 - st * 1.5); }
  };
  return a;
}

// ---------------- Golem ----------------
function golem() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = flat('#8f8678'), R2 = flat('#a9a091'), Mo = flat('#5fbf6e'), Mo2 = flat('#4ba95c'), E = glowMat('#8cffaa');
  const torso = add(body, new THREE.DodecahedronGeometry(0.62, 0), R, 0, 1.25, 0); torso.scale.set(1.15, 1, 0.9);
  add(body, new THREE.SphereGeometry(0.55, 7, 5, 0, Math.PI * 2, 0, 1.2), Mo, 0, 1.45, 0).scale.set(1.2, 0.6, 1);
  const head = new THREE.Group(); head.position.set(0, 1.85, 0.12); body.add(head);
  add(head, new THREE.DodecahedronGeometry(0.28, 0), R2);
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(0.06, 5, 4), E, s * 0.1, 0.02, 0.24);
  add(body, new THREE.OctahedronGeometry(0.16, 0), E, 0, 1.25, 0.55);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.72, 1.5, 0); body.add(sh);
    add(sh, new THREE.DodecahedronGeometry(0.26, 0), R2);
    const fore = new THREE.Group(); fore.position.y = -0.35; sh.add(fore);
    add(fore, new THREE.DodecahedronGeometry(0.22, 0), R, 0, -0.1, 0).scale.set(0.9, 1.4, 0.9);
    add(fore, new THREE.DodecahedronGeometry(0.3, 0), R2, 0, -0.55, 0.05);
    add(sh, new THREE.SphereGeometry(0.18, 5, 4), Mo2, 0, 0.18, 0).scale.set(1, 0.5, 1);
    arms.push([sh, s]);
  }
  const legs = [];
  for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.3, 0.7, 0); body.add(l); add(l, new THREE.DodecahedronGeometry(0.27, 0), R, 0, -0.35, 0).scale.set(1, 1.3, 1); legs.push([l, s]); }
  for (let i = 0; i < 5; i++) add(body, new THREE.ConeGeometry(0.05, 0.25, 4), Mo2, (Math.random() - 0.5) * 0.9, 1.65 + Math.random() * 0.1, (Math.random() - 0.5) * 0.5);
  const a = new ProcActor(root, 2.1);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk';
    body.position.y = mv ? Math.abs(Math.sin(t * 5)) * 0.06 : Math.sin(t * 1.5) * 0.02;
    for (const [l, s] of legs) l.rotation.x = mv ? Math.sin(t * 5 + (s > 0 ? 0 : Math.PI)) * 0.5 : 0;
    for (const [sh, s] of arms) sh.rotation.x = mv ? -Math.sin(t * 5 + (s > 0 ? 0 : Math.PI)) * 0.4 : Math.sin(t * 1.5) * 0.05;
    if (state === 'attack') { const k = Math.sin(Math.min(1, st / 0.55) * Math.PI); arms[0][0].rotation.x = -2.4 * k; arms[1][0].rotation.x = -2.4 * k; body.rotation.x = k * 0.25; } else body.rotation.x = 0;
    if (state === 'death') { body.rotation.x = -Math.min(1.5, st * 1.8); body.position.y = -Math.min(0.6, st); }
  };
  return a;
}

// ---------------- Feu-follet ----------------
function wisp() {
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g); g.position.y = 1.1;
  const core = add(g, new THREE.IcosahedronGeometry(0.2, 1), glowMat('#ffcf5a', { emissiveIntensity: 2.2 }));
  const flames = [];
  for (let i = 0; i < 3; i++) { const f = add(g, new THREE.ConeGeometry(0.16 - i * 0.03, 0.5 - i * 0.08, 6), glowMat(i ? '#ff7a2a' : '#ffa53d', { transparent: true, opacity: 0.85 }), 0, 0.2, 0); flames.push(f); }
  for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.04, 5, 4), flat('#3a1405'), s * 0.07, 0.03, 0.17);
  const halo = glowSprite(0xff9a3d, 1.4); g.add(halo);
  const a = new ProcActor(root, 1.4);
  a.anim = (t, st, state) => {
    g.position.y = 1.1 + Math.sin(t * 6) * 0.08;
    flames.forEach((f, i) => { f.scale.set(1, 1 + Math.sin(t * 14 + i) * 0.2, 1); f.rotation.y = t * 3 * (i % 2 ? 1 : -1); });
    halo.scale.setScalar(1.3 + Math.sin(t * 10) * 0.15);
    core.rotation.y = t * 2;
  };
  return a;
}

// ---------------- Bélier ----------------
function ram() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const Wd = flat('#9a6a3c'), Wd2 = flat('#6e4826'), Fe = flat('#aab4c4', { metalness: 0.4, roughness: 0.5 }), Rf = flat('#c8394a');
  add(body, new THREE.BoxGeometry(1.0, 0.18, 1.6), Wd, 0, 0.45, 0);
  for (const x of [-0.42, 0.42]) for (const z of [-0.6, 0.6]) add(body, new THREE.BoxGeometry(0.1, 0.9, 0.1), Wd2, x, 0.9, z);
  const roof = add(body, new THREE.CylinderGeometry(0.01, 0.75, 0.6, 4, 1), Rf, 0, 1.6, 0); roof.rotation.y = Math.PI / 4; roof.scale.z = 1.55;
  const log = new THREE.Group(); log.position.set(0, 0.9, 0); body.add(log);
  add(log, new THREE.CylinderGeometry(0.16, 0.16, 1.9, 8), Wd, 0, 0, 0.2).rotation.x = Math.PI / 2;
  add(log, new THREE.ConeGeometry(0.24, 0.4, 8), Fe, 0, 0, 1.3).rotation.x = Math.PI / 2;
  const wheels = [];
  for (const x of [-0.56, 0.56]) for (const z of [-0.55, 0.55]) { const w = add(body, new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), Wd2, x, 0.3, z); w.rotation.z = Math.PI / 2; wheels.push(w); }
  const a = new ProcActor(root, 1.9);
  a.anim = (t, st, state) => {
    if (state === 'run' || state === 'walk') for (const w of wheels) w.rotation.x += 0.15;
    log.position.z = state === 'attack' ? Math.sin(Math.min(1, st / 0.4) * Math.PI) * 0.5 : 0;
    body.position.y = state === 'run' ? Math.abs(Math.sin(t * 9)) * 0.03 : 0;
    if (state === 'death') { body.rotation.z = Math.min(0.9, st); body.position.y = -st * 0.4; }
  };
  return a;
}

// ---------------- Pousse Ronceuse ----------------
function treant() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const Bk = flat('#7a4a22'), Lf = flat('#5fd38d'), Lf2 = flat('#3f9a52');
  add(body, new THREE.CylinderGeometry(0.17, 0.22, 0.6, 6), Bk, 0, 0.55, 0);
  add(body, new THREE.IcosahedronGeometry(0.38, 0), Lf, 0, 1.05, 0);
  add(body, new THREE.IcosahedronGeometry(0.24, 0), Lf2, 0.22, 1.2, 0.05);
  for (const s of [-1, 1]) add(body, new THREE.SphereGeometry(0.05, 5, 4), glowMat('#fff6a0'), s * 0.09, 0.66, 0.18);
  const legs = []; for (const s of [-1, 1]) { const l = add(body, new THREE.CylinderGeometry(0.06, 0.08, 0.3, 5), Bk, s * 0.11, 0.15, 0); legs.push([l, s]); }
  const a = new ProcActor(root, 1.4);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk';
    for (const [l, s] of legs) l.rotation.x = mv ? Math.sin(t * 12 + (s > 0 ? 0 : 3)) * 0.6 : 0;
    body.rotation.z = mv ? Math.sin(t * 12) * 0.08 : Math.sin(t * 2) * 0.03;
    if (state === 'attack') body.rotation.x = Math.sin(Math.min(1, st / 0.4) * Math.PI) * 0.5; else body.rotation.x = 0;
    if (state === 'death') { body.scale.setScalar(Math.max(0.01, 1 - st)); }
  };
  return a;
}

// ---------------- Obélisque arcanique ----------------
function crystalTower() {
  const root = new THREE.Group();
  const St = flat('#8d86a8'), St2 = flat('#6a6488'), Cr = glowMat('#7ff3ff', { emissiveIntensity: 1.2, transparent: true, opacity: 0.92 });
  add(root, new THREE.CylinderGeometry(0.75, 0.9, 0.35, 8), St2, 0, 0.17, 0);
  add(root, new THREE.CylinderGeometry(0.42, 0.62, 1.4, 6), St, 0, 1.0, 0);
  add(root, new THREE.CylinderGeometry(0.6, 0.45, 0.2, 6), St2, 0, 1.75, 0);
  const cr = add(root, new THREE.OctahedronGeometry(0.42, 0), Cr, 0, 2.45, 0); cr.scale.y = 1.6;
  const rings = [];
  for (let i = 0; i < 2; i++) { const r = add(root, new THREE.TorusGeometry(0.62 + i * 0.12, 0.03, 4, 24), glowMat('#b6a8ff'), 0, 2.45, 0); rings.push(r); }
  const halo = glowSprite(0x7ff3ff, 1.8); halo.position.y = 2.45; root.add(halo);
  const a = new ProcActor(root, 3.0);
  a.anim = (t, st, state) => {
    cr.rotation.y = t * 1.5; cr.position.y = 2.45 + Math.sin(t * 2) * 0.08;
    rings[0].rotation.set(t * 1.3, t * 0.7, 0); rings[1].rotation.set(-t * 0.9, 0, t * 1.1);
    halo.scale.setScalar(state === 'attack' ? 2.6 - st * 2 : 1.8 + Math.sin(t * 4) * 0.15);
    if (state === 'death') root.scale.setScalar(Math.max(0.01, 1 - st));
  };
  return a;
}

export function buildProc(kind, opts = {}) {
  const f = { dragon, golem, wisp, ram, treant, crystalTower }[kind];
  return f ? f(opts) : golem();
}

// ---------------- Cristal de Sanctuaire ----------------
export function sanctuaryCrystal(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.95 });
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), mat); c.scale.y = 1.7; g.add(c);
  const shards = [];
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat); s.scale.y = 1.8; g.add(s); shards.push(s); }
  const halo = glowSprite(color, 3.2); g.add(halo);
  return { group: g, mat, update(t, hp) {
    c.rotation.y = t * 0.8; c.position.y = Math.sin(t * 1.6) * 0.12;
    shards.forEach((s, i) => { const a = t * 1.2 + i * Math.PI / 2; s.position.set(Math.cos(a) * 1.1, Math.sin(t * 2 + i) * 0.2, Math.sin(a) * 1.1); s.rotation.y = -a; });
    mat.emissiveIntensity = 0.5 + hp * 0.9 + Math.sin(t * 3) * 0.1;
    halo.scale.setScalar(2.2 + hp * 1.4);
  } };
}

// ---------------- Cœur de Mythe ----------------
export function heartOfMyth() {
  const g = new THREE.Group();
  const stone = flat('#cfc6b4'), stone2 = flat('#a99f8c');
  const base1 = add(g, new THREE.CylinderGeometry(2.1, 2.3, 0.18, 24), stone2, 0, 0.09, 0); base1.receiveShadow = true;
  const base2 = add(g, new THREE.CylinderGeometry(1.4, 1.6, 0.22, 20), stone, 0, 0.28, 0); base2.receiveShadow = true;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const p = add(g, new THREE.BoxGeometry(0.22, 0.9, 0.22), stone, Math.cos(a) * 1.85, 0.6, Math.sin(a) * 1.85); p.rotation.y = -a; }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, flatShading: true, roughness: 0.2, transparent: true, opacity: 0.93 });
  const gem = add(g, new THREE.IcosahedronGeometry(0.55, 0), mat, 0, 1.9, 0);
  const orb = [];
  for (let i = 0; i < 6; i++) { const m = add(g, new THREE.TetrahedronGeometry(0.13, 0), mat, 0, 1.9, 0); orb.push(m); }
  const ringGeo = new THREE.RingGeometry(2.15, 2.4, 64, 1, 0, Math.PI * 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.21; g.add(ring);
  const halo = glowSprite(0xffffff, 2.2); halo.material.opacity = 0.55; halo.position.y = 1.9; g.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 8, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 5.5; g.add(beam);
  const col = new THREE.Color(); let lastK = -1;
  return { group: g, update(t, ctl, owner, teamCols) {
    gem.rotation.set(t * 0.6, t * 0.9, 0); gem.position.y = 1.9 + Math.sin(t * 1.8) * 0.15;
    orb.forEach((m, i) => { const a = t * 1.6 + i * Math.PI / 3; m.position.set(Math.cos(a) * 0.95, 1.9 + Math.sin(t * 3 + i) * 0.25, Math.sin(a) * 0.95); m.rotation.set(t * 2, t, 0); });
    col.set(0xffffff);
    if (ctl > 0.01) col.lerp(new THREE.Color(teamCols[0]), Math.min(1, ctl));
    else if (ctl < -0.01) col.lerp(new THREE.Color(teamCols[1]), Math.min(1, -ctl));
    mat.color.copy(col); mat.emissive.copy(col); halo.material.color.copy(col); ringMat.color.copy(col); beam.material.color.copy(col);
    // anneau = progression du contrôle
    const k = Math.max(0.02, Math.abs(ctl));
    if (Math.abs(k - lastK) > 0.01) { lastK = k; ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(2.15, 2.4, 64, 1, Math.PI / 2, Math.PI * 2 * k); }
    beam.material.opacity = owner >= 0 ? 0.07 + Math.sin(t * 3) * 0.02 : 0.02;
    halo.scale.setScalar(2 + Math.sin(t * 2.5) * 0.2 + (owner >= 0 ? 0.6 : 0));
  } };
}
