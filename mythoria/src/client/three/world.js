// MYTHORIA — les 6 mondes : île flottante, ciel, lumières, décor, particules d'ambiance.
import * as THREE from 'three';
import { prop } from './assets.js';
import { glowTexture } from './procedural.js';
import { RX, RY } from '../../shared/sim.js';

export const THEMES = {
  aurore: { skyTop: '#4f9cf0', skyBot: '#ffe0b0', fog: '#f5dcb8', ground: '#7cc65a', ground2: '#68b54a', path: '#e6cf9e', rock: '#9a8f80', rock2: '#6f655a',
    sun: '#fff0d0', sunI: 2.7, hemiSky: '#d5e8ff', hemiGround: '#6a6a3a', hemiI: 1.1, exposure: 1.0, parts: 'pollen', partCol: '#fff7c0',
    props: [['CommonTree_1', 0.9], ['CommonTree_3', 0.9], ['Bush_1', 0.8], ['Flowers', 1], ['Rock_Moss_2', 0.9], ['Grass_2', 1]], back: 'WatchTower_SecondAge_Level3' },
  sylve: { skyTop: '#1f5550', skyBot: '#c4f2c0', fog: '#a4d8b0', ground: '#4a9644', ground2: '#3c8638', path: '#b8a070', rock: '#7d8a6a', rock2: '#55604a',
    sun: '#eaffd8', sunI: 2.1, hemiSky: '#bff0d0', hemiGround: '#2a4a2a', hemiI: 1.2, exposure: 1.0, parts: 'fireflies', partCol: '#c8ff7a',
    props: [['BirchTree_Autumn_1', 0.9], ['CommonTree_1', 1.1], ['Plant_3', 1.1], ['TreeStump_Moss', 1], ['Rock_Moss_5', 1], ['Bush_1', 1], ['Flowers', 1.2]], back: 'CommonTree_3', mush: true },
  arcane: { skyTop: '#130c3a', skyBot: '#9a7ae8', fog: '#7864c8', ground: '#7d76b4', ground2: '#6e67a6', path: '#c9c0f0', rock: '#8079a6', rock2: '#57507e',
    sun: '#e4dcff', sunI: 2.2, hemiSky: '#c8b8ff', hemiGround: '#2a2050', hemiI: 1.25, exposure: 1.05, parts: 'sparkles', partCol: '#b8a8ff', runes: '#8ff6ff',
    props: [['Rock_3', 1.3], ['Rock_Moss_2', 1], ['Grass_2', 1]], crystals: '#8ff6ff', back: 'Wonder_SecondAge_Level1' },
  braise: { skyTop: '#1e0a0a', skyBot: '#ff8a3d', fog: '#7a3018', ground: '#5e4c44', ground2: '#524139', path: '#8a7262', rock: '#4a3e38', rock2: '#2c2420',
    sun: '#ffd0a0', sunI: 2.3, hemiSky: '#ffb080', hemiGround: '#301010', hemiI: 1.0, exposure: 1.05, parts: 'embers', partCol: '#ff9a3d', lava: '#ff6a1a',
    props: [['Rock_3', 1.4], ['CommonTree_Dead_2', 0.8], ['Rock_3', 0.9], ['Mountain_Single', 0.35]], back: 'Mountain_Single', tintProps: '#6a5a52' },
  givre: { skyTop: '#6aa2dd', skyBot: '#f4f9ff', fog: '#dce9f6', ground: '#eef4fb', ground2: '#dfe9f5', path: '#c4d4e6', rock: '#a8b8cc', rock2: '#7a8ca4',
    sun: '#ffffff', sunI: 2.4, hemiSky: '#e8f2ff', hemiGround: '#8090a8', hemiI: 1.2, exposure: 0.95, parts: 'snow', partCol: '#ffffff',
    props: [['PineTree_Snow_1', 0.9], ['PineTree_Snow_3', 0.9], ['Rock_Snow_2', 1.1], ['Bush_Snow_1', 1]], ice: '#a8e6ff', back: 'PineTree_Snow_3' },
  ombre: { skyTop: '#07050f', skyBot: '#4a2868', fog: '#2a1840', ground: '#423a52', ground2: '#383046', path: '#5e5470', rock: '#3a3448', rock2: '#221e2c',
    sun: '#d8c0ff', sunI: 2.5, hemiSky: '#a890d8', hemiGround: '#201030', hemiI: 1.5, exposure: 1.2, parts: 'wisps', partCol: '#c08aff', runes: '#b46bff',
    props: [['CommonTree_Dead_2', 0.9], ['Willow_Dead_1', 0.9], ['Rock_3', 1], ['TreeStump_Moss', 1]], graves: true, back: 'Willow_Dead_1', tintProps: '#8a80a0' },
};

const EX = RX + 2.2, EZ = RY + 2.2;

function groundTexture(T) {
  const w = 512, h = Math.round(512 * EZ / EX);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = w; e.height = h;
  const ge = e.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  const P = (X, Z) => [(X + EX) / (2 * EX) * w, (Z + EZ) / (2 * EZ) * h];
  g.fillStyle = T.ground; g.fillRect(0, 0, w, h);
  let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? T.ground2 : shade(T.ground, 14); g.globalAlpha = 0.35; g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 28, 6 + r() * 18, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // chemins : des Sanctuaires vers le Cœur
  g.lineCap = 'round'; g.strokeStyle = T.path;
  const s = w / (2 * EX);
  for (const [lw, a] of [[2.6, 0.35], [1.9, 0.9]]) {
    g.globalAlpha = a; g.lineWidth = lw * s;
    g.beginPath(); g.moveTo(...P(0, -RY + 1)); g.bezierCurveTo(...P(-1.5, -5), ...P(1.5, -3), ...P(0, 0)); g.stroke();
    g.beginPath(); g.moveTo(...P(0, RY - 1)); g.bezierCurveTo(...P(1.5, 5), ...P(-1.5, 3), ...P(0, 0)); g.stroke();
  }
  g.globalAlpha = 1;
  // dalles autour des Sanctuaires et du Cœur
  for (const [x, z, rr] of [[0, -9.8, 2.6], [0, 9.8, 2.6], [0, 0, 3.0]]) {
    const [px, pz] = P(x, z);
    g.fillStyle = T.path; g.beginPath(); g.ellipse(px, pz, rr * s, rr * s, 0, 0, 7); g.fill();
    g.strokeStyle = shade(T.path, -30); g.lineWidth = 2;
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; g.beginPath(); g.moveTo(px + Math.cos(a) * rr * s * 0.45, pz + Math.sin(a) * rr * s * 0.45); g.lineTo(px + Math.cos(a) * rr * s, pz + Math.sin(a) * rr * s); g.stroke(); }
    g.beginPath(); g.ellipse(px, pz, rr * s * 0.45, rr * s * 0.45, 0, 0, 7); g.stroke();
  }
  // runes lumineuses autour du Cœur
  const runeCol = T.runes || T.lava || '#fff3c0';
  const [hx, hz] = P(0, 0);
  ge.strokeStyle = runeCol; g.strokeStyle = shade(T.path, -45); ge.lineWidth = 2.2; g.lineWidth = 2.2;
  for (const gg of [g, ge]) { gg.beginPath(); gg.ellipse(hx, hz, 3.35 * s, 3.35 * s, 0, 0, 7); gg.stroke(); }
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, rx = hx + Math.cos(a) * 3.65 * s, rz = hz + Math.sin(a) * 3.65 * s;
    for (const gg of [g, ge]) { gg.save(); gg.translate(rx, rz); gg.rotate(a); gg.beginPath(); gg.moveTo(-5, -6); gg.lineTo(0, 6); gg.lineTo(5, -6); gg.moveTo(-4, 0); gg.lineTo(4, 0); gg.stroke(); gg.restore(); }
  }
  // spécial par monde
  if (T.lava) {
    ge.strokeStyle = T.lava; g.strokeStyle = '#3a1a10'; ge.lineWidth = 3; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      let x = (r() - 0.5) * 2 * EX * 0.9, z = (r() - 0.5) * 2 * EZ * 0.9; if (Math.abs(z) < 4 && Math.abs(x) < 4) continue;
      const pts = [P(x, z)]; for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 2.2; z += (r() - 0.5) * 2.2; pts.push(P(x, z)); }
      for (const gg of [g, ge]) { gg.beginPath(); pts.forEach((p, i2) => i2 ? gg.lineTo(...p) : gg.moveTo(...p)); gg.stroke(); }
    }
  }
  if (T.runes && !T.lava) {
    ge.fillStyle = T.runes; for (let i = 0; i < 40; i++) { ge.globalAlpha = 0.5; ge.beginPath(); ge.arc(r() * w, r() * h, 1.5, 0, 7); ge.fill(); }
    ge.globalAlpha = 1;
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const em = new THREE.CanvasTexture(e); em.colorSpace = THREE.SRGBColorSpace;
  return { map, em };
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), c = k => Math.max(0, Math.min(255, ((n >> k) & 255) + amt));
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}

function islandBody(T) {
  // dessous rocheux de l'île : anneaux d'ellipses de plus en plus petits
  const rings = 7, seg = 48, pos = [], col = [], idx = [];
  const c1 = new THREE.Color(T.rock), c2 = new THREE.Color(T.rock2), cg = new THREE.Color(T.ground2);
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i <= rings; i++) {
    const k = i / rings, sc = i === 0 ? 1 : (1 - Math.pow(k, 1.35)) * 0.95 + 0.02, y = i === 0 ? 0 : -0.25 - k * k * 9;
    for (let j = 0; j < seg; j++) {
      const a = j / seg * Math.PI * 2, n = i === 0 ? 1 : 0.88 + r() * 0.24;
      pos.push(Math.cos(a) * EX * sc * n, y, Math.sin(a) * EZ * sc * n);
      const cc = i === 0 ? cg : i === 1 ? cg.clone().lerp(c1, 0.6) : c1.clone().lerp(c2, k);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  pos.push(0, -10.5, 0); col.push(c2.r, c2.g, c2.b);
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg;
    idx.push(a, c, b, b, c, d);
  }
  const tip = (rings + 1) * seg;
  for (let j = 0; j < seg; j++) idx.push(rings * seg + j, tip, rings * seg + (j + 1) % seg);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
}

export function skyDome(T) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(T.skyTop) }, bot: { value: new THREE.Color(T.skyBot) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float h = clamp(vp.y*1.4+0.35,0.0,1.0); gl_FragColor = vec4(mix(bot, top, h*h), 1.0);\n#include <colorspace_fragment>\n}',
  });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), m);
}

function ambient(T, count = 160) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3), v = [];
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * EX * 2.4; p[i * 3 + 1] = Math.random() * 8; p[i * 3 + 2] = (Math.random() - 0.5) * EZ * 2.2;
    v.push(Math.random() * Math.PI * 2);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const big = { snow: 0.22, embers: 0.2, fireflies: 0.3, sparkles: 0.25, wisps: 0.5, pollen: 0.15 }[T.parts] || 0.2;
  const m = new THREE.PointsMaterial({ size: big, map: glowTexture(), color: T.partCol, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const pts = new THREE.Points(g, m);
  pts.userData.update = (dt, t) => {
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      if (T.parts === 'snow') { p[k + 1] -= dt * 1.2; p[k] += Math.sin(t + v[i]) * dt * 0.4; if (p[k + 1] < 0) p[k + 1] = 8; }
      else if (T.parts === 'embers' || T.parts === 'sparkles') { p[k + 1] += dt * (T.parts === 'embers' ? 1.4 : 0.6); p[k] += Math.sin(t * 2 + v[i]) * dt * 0.3; if (p[k + 1] > 8) p[k + 1] = 0; }
      else { p[k] += Math.sin(t * 0.5 + v[i]) * dt * 0.3; p[k + 1] += Math.cos(t * 0.7 + v[i]) * dt * 0.2; p[k + 2] += Math.sin(t * 0.3 + v[i] * 2) * dt * 0.2; }
    }
    g.attributes.position.needsUpdate = true;
    if (T.parts === 'fireflies' || T.parts === 'sparkles') m.opacity = 0.6 + Math.sin(t * 3) * 0.3;
  };
  return pts;
}

function procProp(kind, T) {
  const gr = new THREE.Group();
  if (kind === 'crystal') {
    const mat = new THREE.MeshStandardMaterial({ color: T.crystals || T.ice, emissive: T.crystals || T.ice, emissiveIntensity: T.ice ? 0.25 : 0.9, flatShading: true, roughness: 0.2, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + Math.random() * 0.25, 0), mat); m.scale.y = 2.2 + Math.random(); m.position.set((Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6); m.rotation.z = (Math.random() - 0.5) * 0.5; m.castShadow = true; gr.add(m); }
  } else if (kind === 'mush') {
    for (let i = 0; i < 3; i++) {
      const s = 0.5 + Math.random() * 0.6, x = (Math.random() - 0.5) * 0.7, z = (Math.random() - 0.5) * 0.7;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.5 * s, 6), new THREE.MeshStandardMaterial({ color: '#efe6d0', flatShading: true })); st.position.set(x, 0.25 * s, z); gr.add(st);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 8, 5, 0, Math.PI * 2, 0, 1.4), new THREE.MeshStandardMaterial({ color: '#7fe0ff', emissive: '#3fc0ff', emissiveIntensity: 0.9, flatShading: true })); cap.position.set(x, 0.5 * s, z); cap.castShadow = true; gr.add(cap);
    }
  } else if (kind === 'grave') {
    const m = new THREE.MeshStandardMaterial({ color: '#6a6478', flatShading: true });
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.14), m); st.position.y = 0.37; st.rotation.z = (Math.random() - 0.5) * 0.3; st.castShadow = true; gr.add(st);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 10, 1, false, 0, Math.PI), m); top.rotation.x = Math.PI / 2; top.rotation.z = Math.PI / 2; top.position.y = 0.75; gr.add(top);
  } else if (kind === 'banner') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#6b4a2a' })); pole.position.y = 1.3; pole.castShadow = true; gr.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1, 4, 4), new THREE.MeshStandardMaterial({ color: '#ffd166', side: THREE.DoubleSide, flatShading: true })); fl.position.set(0.37, 2.0, 0); fl.castShadow = true; gr.add(fl);
    gr.userData.update = (dt, t) => { const p = fl.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.35; p.setZ(i, Math.sin(t * 3 + x * 5) * 0.08 * x); } p.needsUpdate = true; };
  }
  return gr;
}

// Construit tout le décor d'un monde dans la scène. Renvoie { update(dt,t), dispose(), theme }.
export async function buildWorld(scene, key, { light = 'high' } = {}) {
  const T = THEMES[key] || THEMES.aurore;
  const group = new THREE.Group(); scene.add(group);
  const updaters = [];
  scene.fog = new THREE.Fog(T.fog, 40, 120);
  group.add(skyDome(T));
  const hemi = new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiI); group.add(hemi);
  const sun = new THREE.DirectionalLight(T.sun, T.sunI);
  sun.position.set(-9, 20, 10);
  sun.castShadow = true;
  const sm = light === 'low' ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 18, bottom: -18, near: 1, far: 60 });
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  group.add(sun); group.add(sun.target);
  const fill = new THREE.DirectionalLight(T.skyBot, 1.3); fill.position.set(6, 9, -16); group.add(fill);

  // sol de l'île
  const { map, em } = groundTexture(T);
  const shape = new THREE.Shape(); shape.absellipse(0, 0, EX, EZ, 0, Math.PI * 2, false, 0);
  const gg = new THREE.ShapeGeometry(shape, 64);
  const uv = gg.attributes.uv, ps = gg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + EX) / (2 * EX), (ps.getY(i) + EZ) / (2 * EZ));
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: T.lava ? 1.3 : 0.9, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground';
  group.add(ground);
  const body = islandBody(T); group.add(body);

  // décor sur le pourtour
  let seed = 21; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spots = [];
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + r() * 0.08, k = 1.03 + r() * 0.17;
    const x = Math.cos(a) * RX * k, z = Math.sin(a) * RY * k;
    if (Math.abs(z) > RY * 0.82 && Math.abs(x) < 3.2) continue; // dégager les Sanctuaires
    spots.push([x, z, a]);
  }
  const jobs = spots.map(async ([x, z, a], i) => {
    let o;
    const roll = r();
    if (T.crystals && roll < 0.3) o = procProp('crystal', T);
    else if (T.ice && roll < 0.25) o = procProp('crystal', T);
    else if (T.mush && roll < 0.25) o = procProp('mush', T);
    else if (T.graves && roll < 0.3) o = procProp('grave', T);
    else if (key === 'aurore' && roll < 0.1) o = procProp('banner', T);
    else { const [n, sc] = T.props[Math.floor(r() * T.props.length)]; o = await prop(n, { scale: sc * (0.8 + r() * 0.4), tint: T.tintProps }); }
    o.position.set(x, 0, z); o.rotation.y = r() * Math.PI * 2;
    if (o.userData.update) updaters.push(o.userData.update);
    group.add(o);
  });
  // îlots flottants en arrière-plan
  const islets = [];
  for (const [x, y, z, s] of [[-17, -3, -22, 1.4], [18, 1, -26, 1.8], [-21, 3, 4, 1.0], [20, -4, 8, 1.1], [-6, 6, -40, 2.4]]) {
    const isl = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * s, 2.5 * s, 0.4, 9), new THREE.MeshStandardMaterial({ color: T.ground2, flatShading: true })); isl.add(top);
    const bot = new THREE.Mesh(new THREE.ConeGeometry(2.4 * s, 4 * s, 9), new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true })); bot.rotation.x = Math.PI; bot.position.y = -2.2 * s; isl.add(bot);
    isl.position.set(x, y, z); group.add(isl); islets.push(isl);
    jobs.push((async () => { const o = s > 2 && T.back ? await prop(T.back, { scale: T.back.includes('Mountain') ? 1.0 : T.back.includes('Tower') || T.back.includes('Wonder') ? 0.9 : 1.6, tint: T.tintProps }) : await prop(T.props[0][0], { scale: 1.2 * s, tint: T.tintProps }); o.position.y = 0.2; isl.add(o); })());
  }
  // nuages sous l'île
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: T.fog, transparent: true, opacity: 0.55, depthWrite: false }));
    s.scale.set(18 + r() * 14, 7 + r() * 4, 1); s.position.set((r() - 0.5) * 70, -9 - r() * 6, (r() - 0.5) * 70);
    group.add(s); clouds.push(s);
  }
  const amb = ambient(T, light === 'low' ? 90 : 170); group.add(amb);
  await Promise.all(jobs.map(j => j.catch(() => {})));
  return {
    theme: T, group, sun, ground,
    update(dt, t) {
      amb.userData.update(dt, t);
      for (const u of updaters) u(dt, t);
      islets.forEach((o, i) => { o.position.y += Math.sin(t * 0.5 + i) * 0.002; });
      clouds.forEach((c, i) => { c.position.x += dt * 0.4; if (c.position.x > 40) c.position.x = -40; });
    },
    dispose() {
      scene.remove(group);
      group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
      map.dispose(); em.dispose();
    },
  };
}
