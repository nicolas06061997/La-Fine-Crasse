// MYTHORIA — personnalité visuelle des héros : accessoires magiques en 3D et auras animées
// (ailes de lumière, auréole, runes, couronne de glace, braises, ombres, feuilles, armes lumineuses).
import * as THREE from 'three';
import { glowTexture, glowSprite } from './procedural.js';

// Effets de chaque héros (ajouter un héros = ajouter une ligne).
export const HERO_FX = {
  ecuyer: ['weapon:#fff3c0:0.5'],
  frere: ['weapon:#ffe39a:0.6'],
  solenne: ['wings', 'halo', 'motes:#ffe39a', 'weapon:#fff0b0:1.3', 'sigil:#ffd166'],
  apprenti: ['motes:#c8a8ff', 'weapon:#c8a8ff:0.9'],
  vael: ['runes:#8ff6ff', 'motes:#8ff6ff', 'weapon:#9ff6ff:1.4', 'sigil:#7ff3ff'],
  archeres: ['leaves'],
  loups: [],
  cerf: ['leaves', 'motes:#a0ffb0', 'sigil:#5fd38d'],
  myra: ['leaves', 'weapon:#8fff9a:1.2', 'runes:#8fff9a'],
  elwyn: ['leaves', 'weapon:#c8ffb0:0.6'],
  golem: ['leaves'],
  follets: [],
  brann: ['embers', 'weapon:#ff9a3d:1.1'],
  dragonnet: ['embers'],
  kaelis: ['embers', 'weapon:#ff7a3d:1.2', 'weaponL:#ff7a3d:1.2', 'sigil:#ff7a3d'],
  ignar: ['embers', 'sigil:#ff4f2a'],
  jarl: ['snow', 'weapon:#bff0ff:0.8'],
  frimas: ['snow', 'weapon:#bff0ff:0.8'],
  nevra: ['icecrown', 'snow', 'weapon:#cff6ff:1.4', 'sigil:#9fe8ff'],
  squelettes: [],
  damne: ['shadow', 'weapon:#c08aff:0.8'],
  osseuse: ['weapon:#c08aff:0.6'],
  morvak: ['shadow', 'runes:#c08aff', 'weapon:#c08aff:1.3'],
  malakar: ['shadow', 'runes:#c08aff', 'weapon:#d0a0ff:1.5', 'sigil:#b46bff', 'crownS'],
  tourelle: [], belier: [],
};

function bone(root, name) { return root.getObjectByName(name); }
function localScale(obj) { const v = new THREE.Vector3(); obj.getWorldScale(v); return 1 / Math.max(1e-4, v.x); }

// petit nuage de particules local (attaché au héros)
function emitter(parent, { n = 18, color = '#ffffff', size = 0.12, area = 0.6, h = 1.8, mode = 'rise', additive = true, opacity = 0.9 }) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * area * 2; p[i * 3 + 1] = Math.random() * h; p[i * 3 + 2] = (Math.random() - 0.5) * area * 2; seed.push(Math.random() * 6.28); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size, map: glowTexture(), color, transparent: true, depthWrite: false, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.userData.noOutline = true; pts.frustumCulled = false; parent.add(pts);
  return (dt, t) => {
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      if (mode === 'fall') { p[k + 1] -= dt * 0.6; p[k] += Math.sin(t + seed[i]) * dt * 0.2; if (p[k + 1] < 0) p[k + 1] = h; }
      else if (mode === 'leaf') { p[k + 1] -= dt * 0.35; p[k] += Math.sin(t * 1.5 + seed[i]) * dt * 0.5; p[k + 2] += Math.cos(t + seed[i]) * dt * 0.3; if (p[k + 1] < 0) { p[k + 1] = h; p[k] = (Math.random() - 0.5) * area * 2; } }
      else if (mode === 'smoke') { p[k + 1] += dt * 0.5; p[k] += Math.sin(t + seed[i]) * dt * 0.15; if (p[k + 1] > h) { p[k + 1] = 0; p[k] = (Math.random() - 0.5) * area * 2; p[k + 2] = (Math.random() - 0.5) * area * 2; } }
      else { p[k + 1] += dt * (0.4 + (i % 3) * 0.2); p[k] += Math.sin(t * 2 + seed[i]) * dt * 0.15; if (p[k + 1] > h) { p[k + 1] = 0; } }
    }
    g.attributes.position.needsUpdate = true;
  };
}

function wingTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = 10 + i * 15, len = 230 - i * 22;
    const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.6, 'rgba(255,230,150,.6)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x + 8, len / 2, 9, len / 2, -0.12 + i * 0.03, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let WING = null;

function runeTexture(col) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 8;
  g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(32, 14); g.lineTo(20, 46); g.lineTo(44, 46); g.closePath(); g.moveTo(32, 14); g.lineTo(32, 50); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Ajoute les effets d'un héros. actor : objet renvoyé par makeHero. Renvoie update(dt, t, state).
export function attachHeroFx(actor, id, { lite = false } = {}) {
  const list = HERO_FX[id] || [];
  const root = actor.root, holder = actor.holder, H = actor.height;
  const ups = [];
  const head = bone(root, 'head'), chest = bone(root, 'chest'), hr = bone(root, 'handslotr'), hl = bone(root, 'handslotl');
  for (const spec of list) {
    const [kind, col, k] = spec.split(':');
    if (kind === 'wings' && chest) {
      WING = WING || wingTexture();
      const s = localScale(chest), grp = new THREE.Group(); grp.position.set(0, 0.15 * s, -0.25 * s); chest.add(grp);
      const ws = [];
      for (const sx of [-1, 1]) {
        const piv = new THREE.Group(); grp.add(piv);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * s, 1.6 * s), new THREE.MeshBasicMaterial({ map: WING, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: '#ffe8a8' }));
        m.position.set(sx * 0.5 * s, 0.45 * s, 0); m.rotation.z = -sx * 0.5; m.userData.noOutline = true; piv.add(m); ws.push([piv, sx]);
      }
      ups.push((dt, t) => { for (const [p, sx] of ws) p.rotation.y = sx * (0.5 + Math.sin(t * 2.2) * 0.25); });
    } else if (kind === 'halo' && head) {
      const s = localScale(head);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22 * s, 0.025 * s, 6, 28), new THREE.MeshBasicMaterial({ color: '#fff0a0' }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.72 * s; ring.userData.noOutline = true; head.add(ring);
      const gl = glowSprite(0xffe08a, 0.8 * s); gl.position.y = 0.72 * s; head.add(gl);
      ups.push((dt, t) => { ring.position.y = (0.72 + Math.sin(t * 2) * 0.03) * s; });
    } else if (kind === 'icecrown' && head) {
      const s = localScale(head), grp = new THREE.Group(); grp.position.y = 0.45 * s; head.add(grp);
      const mat = new THREE.MeshStandardMaterial({ color: '#dff8ff', emissive: '#7fdcff', emissiveIntensity: 0.9, flatShading: true, roughness: 0.2 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 * s, 0), mat); sp.scale.y = i % 2 ? 2.2 : 3.4; sp.position.set(Math.cos(a) * 0.2 * s, 0.05 * s, Math.sin(a) * 0.2 * s); grp.add(sp); }
      ups.push((dt, t) => { grp.rotation.y = t * 0.4; });
    } else if (kind === 'crownS' && head) {
      const s = localScale(head) * 1.35, grp = new THREE.Group(); grp.position.y = 0.5 * s; head.add(grp);
      const mat = new THREE.MeshStandardMaterial({ color: '#3a2a50', emissive: '#b46bff', emissiveIntensity: 0.7, flatShading: true, metalness: 0.4 });
      grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.24 * s, 0.07 * s, 10, 1, true), mat));
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.2 * s, 4), mat); sp.position.set(Math.cos(a) * 0.22 * s, 0.12 * s, Math.sin(a) * 0.22 * s); grp.add(sp); }
    } else if (kind === 'runes') {
      const tex = runeTexture(col), grp = new THREE.Group(); grp.position.y = H * 0.55; holder.add(grp);
      const rs = [];
      for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(0.38); grp.add(sp); rs.push(sp); }
      ups.push((dt, t) => rs.forEach((sp, i) => { const a = t * 1.3 + i * 2.09; sp.position.set(Math.cos(a) * 0.75, Math.sin(t * 2 + i) * 0.15, Math.sin(a) * 0.75); sp.material.opacity = 0.65 + Math.sin(t * 4 + i) * 0.3; }));
    } else if (kind === 'motes' && !lite) ups.push(emitter(holder, { n: 14, color: col, size: 0.14, area: 0.55, h: H * 1.1 }));
    else if (kind === 'embers' && !lite) ups.push(emitter(holder, { n: 16, color: '#ff9a3d', size: 0.13, area: 0.5, h: H * 1.1 }));
    else if (kind === 'snow' && !lite) ups.push(emitter(holder, { n: 14, color: '#ffffff', size: 0.12, area: 0.6, h: H * 1.2, mode: 'fall' }));
    else if (kind === 'leaves' && !lite) ups.push(emitter(holder, { n: 10, color: '#8fe08a', size: 0.14, area: 0.6, h: H * 1.1, mode: 'leaf', additive: false, opacity: 0.85 }));
    else if (kind === 'shadow') {
      ups.push(emitter(holder, { n: lite ? 6 : 10, color: '#3a1458', size: 0.32, area: 0.55, h: H * 0.4, mode: 'smoke', additive: false, opacity: 0.35 }));
      ups.push(emitter(holder, { n: 6, color: '#c08aff', size: 0.12, area: 0.5, h: H * 0.9 }));
    } else if ((kind === 'weapon' && hr) || (kind === 'weaponL' && hl)) {
      const b = kind === 'weapon' ? hr : hl, s = localScale(b), size = Number(k || 1);
      const gl = glowSprite(new THREE.Color(col), 0.55 * size * s); gl.position.y = 0.35 * s; gl.material.opacity = 0.7; b.add(gl);
      ups.push((dt, t, st) => { gl.material.opacity = st === 'attack' || st === 'cast' ? 0.85 : 0.35 + Math.sin(t * 3) * 0.1; gl.scale.setScalar((st === 'attack' ? 0.8 : 0.45) * size * s); });
    } else if (kind === 'sigil') {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.userData.noOutline = true; holder.add(m);
      const m2 = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.9, 40), m.material); m2.rotation.x = -Math.PI / 2; m2.position.y = 0.05; holder.add(m2);
      ups.push((dt, t) => { m.rotation.z = t * 0.8; m.material.opacity = 0.45 + Math.sin(t * 2.5) * 0.15; });
    }
  }
  return (dt, t, state) => { for (const u of ups) u(dt, t, state); };
}
