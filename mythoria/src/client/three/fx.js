// MYTHORIA — effets visuels 3D : particules (feu, glace, étincelles, fumée), ondes de choc,
// éclairs, piliers de lumière, météores, projectiles.
import * as THREE from 'three';
import { glowTexture } from './procedural.js';

const MAX = 1800;

export class FX {
  constructor(scene) {
    this.scene = scene;
    // ---- particules (un seul objet pour toutes : rapide sur téléphone) ----
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 3); this.size = new Float32Array(MAX); this.alpha = new Float32Array(MAX);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTexture() }, scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
        uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.p = []; for (let i = 0; i < MAX; i++) this.p.push({ life: 0 });
    this.free = 0;
    this.items = []; // effets maillés (anneaux, éclairs, piliers…)
    this.proj = new Map();
    this.c = new THREE.Color();
  }
  setScale(h) { this.mat.uniforms.scale.value = h * 0.9; }

  emit(x, y, z, o) {
    const n = o.n || 1;
    for (let k = 0; k < n; k++) {
      let i = this.free; this.free = (this.free + 1) % MAX;
      const p = this.p[i];
      const a = Math.random() * Math.PI * 2, el = (o.up ?? 0.5) + (Math.random() - 0.5) * (o.spread ?? 1), sp = (o.speed || 2) * (0.5 + Math.random());
      p.x = x + (Math.random() - 0.5) * (o.jitter || 0); p.y = y + (Math.random() - 0.5) * (o.jitter || 0) * 0.5; p.z = z + (Math.random() - 0.5) * (o.jitter || 0);
      p.vx = Math.cos(a) * sp * (1 - Math.abs(el) * 0.5); p.vz = Math.sin(a) * sp * (1 - Math.abs(el) * 0.5); p.vy = el * sp;
      p.life = p.max = (o.life || 0.8) * (0.7 + Math.random() * 0.6);
      p.g = o.gravity ?? -4; p.drag = o.drag ?? 1.5; p.s0 = (o.size || 0.4) * (0.7 + Math.random() * 0.6); p.grow = o.grow ?? 0;
      this.c.set(Array.isArray(o.color) ? o.color[Math.floor(Math.random() * o.color.length)] : o.color || '#fff');
      p.r = this.c.r; p.gg = this.c.g; p.b = this.c.b; p.a0 = o.alpha ?? 1;
    }
  }

  // ---- maillages éphémères ----
  ring(x, z, r, color, dur = 0.5, y = 0.06) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); this.scene.add(m);
    this.items.push({ m, t: 0, dur, up: (k) => { m.scale.setScalar(0.2 * r + k * r); m.material.opacity = 1 - k; } });
  }
  disc(x, z, r, color, dur = 1, op = 0.4) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.scale.setScalar(r); this.scene.add(m);
    this.items.push({ m, t: 0, dur, up: k => { m.material.opacity = op * (1 - k); } });
  }
  flash(x, y, z, r, color, dur = 0.3) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.set(x, y, z); this.scene.add(s);
    this.items.push({ m: s, t: 0, dur, up: k => { s.scale.setScalar(r * (0.6 + k)); s.material.opacity = 1 - k; } });
  }
  pillar(x, z, r, color, dur = 1, h = 6) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, h / 2, z); this.scene.add(m);
    this.items.push({ m, t: 0, dur, up: k => { m.material.opacity = Math.sin(k * Math.PI) * 0.45; m.scale.set(1 - k * 0.5, 1, 1 - k * 0.5); } });
  }
  bolt(pts, color = '#bff8ff', dur = 0.28, width = 0.08) {
    // éclair : segments brisés en petits cylindres lumineux
    const grp = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], seg = [a];
      for (let k = 1; k < 4; k++) seg.push(new THREE.Vector3().lerpVectors(a, b, k / 4).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)));
      seg.push(b);
      for (let k = 1; k < seg.length; k++) {
        const p = seg[k - 1], q = seg[k], len = p.distanceTo(q);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 4, 1, true), mat);
        c.position.copy(p).add(q).multiplyScalar(0.5);
        c.quaternion.setFromUnitVectors(up, v.subVectors(q, p).normalize());
        grp.add(c);
      }
      this.flash(b.x, b.y, b.z, 1.6, color, 0.25);
    }
    this.scene.add(grp);
    this.items.push({ m: grp, t: 0, dur, up: k => { mat.opacity = 1 - k; } });
  }
  shards(x, z, r, color = '#bfefff', dur = 1.4) {
    const grp = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, flatShading: true, transparent: true, roughness: 0.2 });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat); s.scale.y = 2.5 + Math.random() * 2;
      const a = Math.random() * Math.PI * 2, d = Math.random() * r * 0.8;
      s.position.set(x + Math.cos(a) * d, 0, z + Math.sin(a) * d); s.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
      grp.add(s);
    }
    this.scene.add(grp);
    this.items.push({ m: grp, t: 0, dur, up: k => { grp.children.forEach(s => { s.position.y = k < 0.15 ? -0.6 + k / 0.15 * 0.8 : 0.2 - Math.max(0, k - 0.75) * 3; }); mat.opacity = k > 0.75 ? 1 - (k - 0.75) * 4 : 1; } });
  }
  meteor(x, z, delay) {
    const grp = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: '#5a2a1a', emissive: '#ff5a1a', emissiveIntensity: 1.2, flatShading: true }));
    grp.add(rock); const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a3d', blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(3.5); grp.add(glow);
    this.scene.add(grp);
    const mark = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 48), new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.08, z); this.scene.add(mark);
    this.items.push({ m: mark, t: 0, dur: delay, up: k => { mark.material.opacity = 0.5 + Math.sin(k * 30) * 0.3; } });
    this.items.push({ m: grp, t: 0, dur: delay, up: k => {
      grp.position.set(x + (1 - k) * 8, 0.6 + (1 - k) * 16, z - (1 - k) * 6); rock.rotation.set(k * 9, k * 7, 0);
      this.emit(grp.position.x, grp.position.y, grp.position.z, { n: 2, color: ['#ffb02e', '#ff5a1a', '#ffe0a0'], size: 0.9, life: 0.5, speed: 0.5, gravity: 0, jitter: 0.4 });
    } });
  }

  // ---- projectiles (suivent les projectiles de la simulation) ----
  syncProjectiles(list, toWorld) {
    const seen = new Set();
    for (const pr of list) {
      seen.add(pr.id);
      let o = this.proj.get(pr.id);
      if (!o) { o = this.makeProj(pr.kind); this.scene.add(o); this.proj.set(pr.id, o); }
      const w = toWorld(pr.x, pr.y), t = toWorld(pr.tx, pr.ty);
      const h = pr.fly ? 1.6 : 1.0;
      o.position.set(w.x, h, w.z);
      o.lookAt(t.x, 0.8, t.z);
      const col = { fire: ['#ffb02e', '#ff5a1a'], orb: ['#d0b8ff', '#9b6bff'], ice: ['#dff6ff', '#7fdcff'], shadow: ['#d0a0ff', '#6a2aa0'], thorn: ['#a0ffb0', '#3f9a52'], bolt: ['#ffffff', '#7ff3ff'] }[pr.kind];
      if (col) this.emit(w.x, h, w.z, { n: 1, color: col, size: pr.kind === 'fire' ? 0.7 : 0.45, life: 0.35, speed: 0.3, gravity: 0 });
    }
    for (const [id, o] of this.proj) if (!seen.has(id)) { this.scene.remove(o); this.proj.delete(id); }
  }
  makeProj(kind) {
    const g = new THREE.Group();
    if (kind === 'arrow') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 4), new THREE.MeshBasicMaterial({ color: '#6b4a2a' })); shaft.rotation.x = Math.PI / 2; g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), new THREE.MeshBasicMaterial({ color: '#dfe6ef' })); tip.rotation.x = Math.PI / 2; tip.position.z = 0.4; g.add(tip);
    } else {
      const col = { fire: '#ff8a3d', orb: '#b48cff', ice: '#9fe8ff', shadow: '#a060e0', thorn: '#7fe08a', bolt: '#9ff6ff' }[kind] || '#fff';
      const core = new THREE.Mesh(kind === 'ice' ? new THREE.OctahedronGeometry(0.14, 0) : new THREE.IcosahedronGeometry(kind === 'fire' ? 0.2 : 0.14, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      if (kind === 'ice') core.scale.z = 2.5;
      g.add(core);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(kind === 'fire' ? 1.3 : 0.9); g.add(s);
    }
    return g;
  }

  // ---- presets ----
  explosion(x, z, r, kind = 'fire') {
    const C = {
      fire: ['#fff3c0', '#ffb02e', '#ff5a1a'], roar: ['#fff3c0', '#ff9a3d', '#ff3a1a'], orb: ['#ffffff', '#c8a8ff', '#8a5aff'], ice: ['#ffffff', '#bff0ff', '#6fd0ff'],
      shadow: ['#e0c0ff', '#a060ff', '#4a1a80'], thorn: ['#e0ffe0', '#7fe08a', '#3f9a52'], bolt: ['#ffffff', '#bff8ff', '#5fd8ff'],
    }[kind] || ['#fff', '#ffd27a', '#ff8a3d'];
    this.flash(x, 0.8, z, r * 3, C[1], 0.3);
    this.ring(x, z, r * 1.2, C[1], 0.45);
    this.emit(x, 0.6, z, { n: Math.round(18 + r * 14), color: C, size: 0.55, life: 0.6, speed: 2.5 + r * 2, up: 0.6, spread: 1.2, gravity: -3, drag: 2.5 });
    if (kind === 'fire' || kind === 'roar') this.emit(x, 0.5, z, { n: 10, color: ['#5a5050', '#3a3434'], size: 1.1, life: 1.2, speed: 0.8, up: 0.9, spread: 0.6, gravity: 1, alpha: 0.35 });
  }
  dust(x, z, n = 10) { this.emit(x, 0.15, z, { n, color: ['#d8ccb8', '#bfb39e'], size: 0.7, life: 0.7, speed: 1.4, up: 0.15, spread: 0.3, gravity: 0, drag: 3, alpha: 0.5 }); }

  update(dt) {
    let i = 0;
    for (const p of this.p) {
      if (p.life > 0) {
        p.life -= dt;
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d; p.vz *= d; p.vy = p.vy * d + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.02) { p.y = 0.02; p.vy = 0; }
        const k = Math.max(0, p.life / p.max);
        this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
        this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.gg; this.col[i * 3 + 2] = p.b;
        this.size[i] = p.s0 * (1 + p.grow * (1 - k)); this.alpha[i] = p.a0 * Math.min(1, k * 2);
      } else this.alpha[i] = 0;
      i++;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
    for (const it of this.items) { it.t += dt; it.up(Math.min(1, it.t / it.dur)); }
    for (const it of this.items) if (it.t >= it.dur) { this.scene.remove(it.m); it.m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.items = this.items.filter(it => it.t < it.dur);
  }
  dispose() { this.scene.remove(this.points); for (const it of this.items) this.scene.remove(it.m); for (const [, o] of this.proj) this.scene.remove(o); }
}
