// MYTHORIA — rendu de l'arène (Canvas 2D) : terrain, unités, projectiles, effets.
// Ne contient AUCUNE règle de jeu : il affiche simplement l'état de la simulation.

import { W, H, RIVER, BRIDGES, deployZones } from '../../shared/sim.js';
import { CARD } from '../../shared/content.js';
import { drawLook, drawTower, drawSpellIcon, TEAM, star, shade } from './sprites.js';

const TAU = Math.PI * 2;

export const THEMES = {
  meadow: { g1: '#86d063', g2: '#79c457', edge: '#4f8a3a', out: '#2f5a2a', water: ['#7fe0ff', '#2f8fd6'], foam: 'rgba(255,255,255,.55)', path: '#e2c494', bridge: '#a8743f', deco: 'tree', leaf: '#3f9a3f' },
  forest: { g1: '#5aa451', g2: '#4e9646', edge: '#2f6a30', out: '#173a1c', water: ['#6fd0e0', '#1f6f8f'], foam: 'rgba(220,255,240,.5)', path: '#b99a6a', bridge: '#7a5230', deco: 'pine', leaf: '#256b33' },
  forge:  { g1: '#7a6a5e', g2: '#6e5f54', edge: '#4a3d35', out: '#231a16', water: ['#ffd36b', '#e0441f'], foam: 'rgba(255,240,180,.65)', path: '#9a8572', bridge: '#4a4a52', deco: 'rock', leaf: '#5a4a40', lava: true },
  arcane: { g1: '#7a72b8', g2: '#6e66aa', edge: '#4a4280', out: '#1e1a40', water: ['#b6f7ff', '#6a4fe0'], foam: 'rgba(255,255,255,.6)', path: '#c4bcea', bridge: '#5a4f9a', deco: 'crystal', leaf: '#9b8cff' },
  peak:   { g1: '#eaf2fa', g2: '#dbe6f2', edge: '#9fb3c8', out: '#3a4a5e', water: ['#d4f1ff', '#73b9e8'], foam: 'rgba(255,255,255,.8)', path: '#c3cfdd', bridge: '#8a6a4a', deco: 'snowpine', leaf: '#2f6a50' },
};

export class ArenaRenderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.theme = THEMES.meadow; this.flip = false;
    this.fx = []; this.flash = new Map(); this.shake = 0; this.ghost = null; this.showZones = -1;
    this.resize();
  }

  setTheme(name) { this.theme = THEMES[name] || THEMES.meadow; this.bg = null; }

  resize() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.cw = Math.max(1, r.width); this.ch = Math.max(1, r.height);
    this.cv.width = Math.round(this.cw * this.dpr); this.cv.height = Math.round(this.ch * this.dpr);
    this.tile = Math.min(this.cw / (W + 0.6), this.ch / (H + 0.6));
    this.ox = (this.cw - W * this.tile) / 2; this.oy = (this.ch - H * this.tile) / 2;
    this.bg = null;
  }

  // Monde (cases) -> écran (pixels CSS)
  sx(x) { return this.ox + (this.flip ? W - x : x) * this.tile; }
  sy(y) { return this.oy + (this.flip ? H - y : y) * this.tile; }
  toWorld(px, py) {
    let x = (px - this.ox) / this.tile, y = (py - this.oy) / this.tile;
    if (this.flip) { x = W - x; y = H - y; }
    return { x, y };
  }

  // ---------- Terrain fixe (dessiné une seule fois) ----------
  buildBg() {
    const T = this.theme, cv = document.createElement('canvas');
    cv.width = this.cv.width; cv.height = this.cv.height;
    const c = cv.getContext('2d'); c.scale(this.dpr, this.dpr);
    const t = this.tile, X = x => this.ox + x * t, Y = y => this.oy + y * t;
    // fond extérieur
    const g = c.createLinearGradient(0, 0, 0, this.ch); g.addColorStop(0, shade(T.out, 10)); g.addColorStop(1, T.out);
    c.fillStyle = g; c.fillRect(0, 0, this.cw, this.ch);
    // bordure
    c.fillStyle = T.edge; roundRect(c, X(-0.3), Y(-0.3), (W + 0.6) * t, (H + 0.6) * t, t * 0.5); c.fill();
    // damier
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { c.fillStyle = (x + y) % 2 ? T.g1 : T.g2; c.fillRect(X(x), Y(y), t + 0.5, t + 0.5); }
    // touffes / texture
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 380; i++) {
      const x = rnd() * W, y = rnd() * H; if (Math.abs(y - RIVER) < 1.3) continue;
      c.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.06})`; c.beginPath(); c.ellipse(X(x), Y(y), t * (0.1 + rnd() * 0.15), t * 0.05, 0, 0, TAU); c.fill();
      if (rnd() < 0.15) { c.fillStyle = ['#ffe066', '#ff8fa3', '#ffffff', '#9fd0ff'][Math.floor(rnd() * 4)]; c.beginPath(); c.arc(X(x), Y(y), t * 0.06, 0, TAU); c.fill(); }
    }
    // chemins
    c.lineCap = 'round'; c.lineJoin = 'round';
    const path = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w * t; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); };
    for (const pass of [[1.25, 'rgba(0,0,0,.12)'], [1.05, T.path]]) {
      for (const bx of BRIDGES) path([[bx, 4.5], [bx, 27.5]], pass[0], pass[1]);
      path([[3.5, 4.5], [9, 3], [14.5, 4.5]], pass[0], pass[1]);
      path([[3.5, 27.5], [9, 29], [14.5, 27.5]], pass[0], pass[1]);
    }
    // pavés
    c.fillStyle = 'rgba(0,0,0,.08)';
    for (const bx of BRIDGES) for (let y = 5; y < 27; y += 0.7) { if (Math.abs(y - RIVER) < 1.3) continue; c.beginPath(); c.ellipse(X(bx + Math.sin(y * 3) * 0.2), Y(y), t * 0.18, t * 0.1, 0, 0, TAU); c.fill(); }
    // ligne du milieu de chaque camp (repère discret)
    c.setLineDash([t * 0.3, t * 0.3]); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = t * 0.06;
    c.beginPath(); c.moveTo(X(0.3), Y(17.2)); c.lineTo(X(W - 0.3), Y(17.2)); c.moveTo(X(0.3), Y(14.8)); c.lineTo(X(W - 0.3), Y(14.8)); c.stroke(); c.setLineDash([]);
    // berges
    c.fillStyle = shade(T.edge, -10);
    c.fillRect(X(0), Y(RIVER - 1.15), W * t, t * 2.3);
    // décor sur les bords
    seed = 99;
    const deco = (x, y, k) => this.drawDeco(c, X(x), Y(y), t * k, T, rnd);
    for (let y = 0.5; y < H; y += 1.6) { deco(-0.15, y + rnd() * 0.5, 0.7 + rnd() * 0.3); deco(W + 0.15, y + rnd() * 0.5, 0.7 + rnd() * 0.3); }
    for (const [x, y] of [[1, 1], [17, 1.2], [1.2, 31], [16.8, 30.8], [6.3, 31.3], [11.7, 31.2], [6.2, 0.8], [11.8, 0.7]]) deco(x, y, 0.75);
    this.bg = cv;
  }

  drawDeco(c, x, y, s, T, rnd) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(s * 0.1, s * 0.15, s * 0.45, s * 0.18, 0, 0, TAU); c.fill();
    const OUT = 'rgba(20,14,30,.7)'; c.lineWidth = s * 0.06; c.strokeStyle = OUT;
    if (T.deco === 'tree') {
      c.fillStyle = '#7a4a22'; c.fillRect(-s * 0.08, -s * 0.4, s * 0.16, s * 0.5);
      for (const [dx, dy, r] of [[0, -0.75, 0.42], [-0.25, -0.55, 0.3], [0.25, -0.55, 0.3]]) { c.fillStyle = shade(T.leaf, 10 + rnd() * 25); c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, TAU); c.fill(); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(-s * 0.1, -s * 0.88, s * 0.15, 0, TAU); c.fill();
    } else if (T.deco === 'pine' || T.deco === 'snowpine') {
      c.fillStyle = '#5a3a1e'; c.fillRect(-s * 0.07, -s * 0.25, s * 0.14, s * 0.3);
      for (let i = 0; i < 3; i++) {
        c.fillStyle = shade(T.leaf, i * 12); c.beginPath(); c.moveTo(-s * (0.45 - i * 0.1), -s * (0.2 + i * 0.35)); c.lineTo(0, -s * (0.75 + i * 0.35)); c.lineTo(s * (0.45 - i * 0.1), -s * (0.2 + i * 0.35)); c.closePath(); c.fill(); c.stroke();
        if (T.deco === 'snowpine') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-s * 0.15, -s * (0.6 + i * 0.35)); c.lineTo(0, -s * (0.75 + i * 0.35)); c.lineTo(s * 0.15, -s * (0.6 + i * 0.35)); c.fill(); }
      }
    } else if (T.deco === 'crystal') {
      for (const [dx, h, col] of [[-0.2, 0.7, '#b6a8ff'], [0.15, 1.0, '#7ff3ff'], [0.35, 0.5, '#e0d8ff']]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(dx * s - s * 0.12, 0); c.lineTo(dx * s, -h * s); c.lineTo(dx * s + s * 0.12, 0); c.closePath(); c.fill(); c.stroke();
      }
    } else {
      c.fillStyle = '#7d766b'; c.beginPath(); c.moveTo(-s * 0.45, 0); c.lineTo(-s * 0.3, -s * 0.45); c.lineTo(s * 0.1, -s * 0.6); c.lineTo(s * 0.45, -s * 0.2); c.lineTo(s * 0.4, 0); c.closePath(); c.fill(); c.stroke();
      if (T.lava) { c.fillStyle = '#ff7a3d'; c.fillRect(-s * 0.1, -s * 0.3, s * 0.2, s * 0.05); }
    }
    c.restore();
  }

  // ---------- Effets ----------
  ingest(events, s) {
    for (const e of events) {
      switch (e.type) {
        case 'hit': this.flash.set(e.id, 0.12); {
          const ent = s.ents.find(o => o.id === e.id);
          if (ent && ent.kind === 'tower') this.add({ type: 'num', x: e.x + (Math.random() - 0.5) * 0.6, y: e.y - 2.2, txt: '-' + e.amount, dur: 0.8, col: '#fff' });
        } break;
        case 'die':
          if (e.kind === 'tower') { this.boom(e.x, e.y, 2.4, 'tower'); this.shake = 0.5; }
          else { this.puff(e.x, e.y); this.add({ type: 'soul', x: e.x, y: e.y, dur: 0.9 }); }
          break;
        case 'boom': this.boom(e.x, e.y, e.r, e.color); break;
        case 'impact': if (e.kind === 'arrow') this.sparks(e.x, e.y, 3, '#fff3c4', 0.25); break;
        case 'spell': this.spell(e); break;
        case 'incoming': this.add({ type: 'meteorFall', x: e.x, y: e.y, dur: e.delay, p: e.p }); break;
        case 'zap': this.add({ type: 'zap', pts: e.pts, dur: 0.25 }); break;
        case 'dash': this.add({ type: 'dash', ...e, dur: 0.3 }); break;
        case 'fuse': this.add({ type: 'ring', x: e.x, y: e.y, r: 1.6, col: '#ffd166', dur: 0.6 }); this.add({ type: 'num', x: e.x, y: e.y - 1.6, txt: '★'.repeat(e.star) + ' FUSION !', dur: 1.3, col: '#ffd166', big: true }); this.sparks(e.x, e.y, 18, '#ffe066', 1); break;
        case 'land': this.add({ type: 'ring', x: e.x, y: e.y, r: 0.9, col: 'rgba(255,255,255,.8)', dur: 0.35 }); break;
        case 'summon': this.sparks(e.x, e.y, 10, '#8ff0a4', 0.8); break;
        case 'shieldBreak': { const ent = s.ents.find(o => o.id === e.id); if (ent) this.sparks(ent.x, ent.y - 0.5, 10, '#cfe8ff', 0.7); } break;
      }
    }
  }
  add(f) { f.t = 0; this.fx.push(f); if (this.fx.length > 400) this.fx.shift(); }
  sparks(x, y, n, col, spd) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.5 + Math.random()) * spd * 3; this.add({ type: 'pt', x, y: y - 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, col, dur: 0.4 + Math.random() * 0.4, sz: 0.06 + Math.random() * 0.06 }); }
  }
  puff(x, y) { for (let i = 0; i < 7; i++) { const a = Math.random() * TAU; this.add({ type: 'smoke', x: x + Math.cos(a) * 0.3, y: y - 0.3 + Math.sin(a) * 0.2, vx: Math.cos(a) * 0.6, vy: -0.4, dur: 0.6 + Math.random() * 0.3, sz: 0.25 + Math.random() * 0.15 }); } }
  boom(x, y, r, kind) {
    const col = kind === 'orb' ? '#c49bff' : kind === 'thorn' ? '#8ff0a4' : kind === 'bolt' ? '#7ff3ff' : '#ff9a3d';
    this.add({ type: 'ring', x, y, r, col, dur: 0.4 });
    this.add({ type: 'flashc', x, y, r: r * 0.9, col, dur: 0.25 });
    this.sparks(x, y, Math.round(8 + r * 6), col, r * 0.6);
    if (kind === 'tower') { this.puff(x, y); this.puff(x + 0.6, y - 0.4); for (let i = 0; i < 12; i++) { const a = Math.random() * TAU; this.add({ type: 'debris', x, y: y - 1, vx: Math.cos(a) * 3, vy: -3 - Math.random() * 3, dur: 1, sz: 0.15 + Math.random() * 0.15 }); } }
  }
  spell(e) {
    if (e.fx === 'meteor') { this.boom(e.x, e.y, e.r, 'fire'); this.shake = 0.35; this.add({ type: 'scorch', x: e.x, y: e.y, r: e.r, dur: 3 }); }
    else if (e.fx === 'sparks') { for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, d = Math.random() * e.r; this.add({ type: 'drop', x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, dur: 0.35 + Math.random() * 0.3, col: '#ffe066' }); } this.add({ type: 'ring', x: e.x, y: e.y, r: e.r, col: '#ffe066', dur: 0.35 }); }
    else if (e.fx === 'freeze') { this.add({ type: 'ice', x: e.x, y: e.y, r: e.r, dur: 1.2 }); this.sparks(e.x, e.y, 20, '#dff6ff', e.r * 0.5); }
    else if (e.fx === 'heal') { this.add({ type: 'heal', x: e.x, y: e.y, r: e.r, dur: 1.0 }); this.sparks(e.x, e.y, 16, '#ffe9a3', 0.8); }
  }

  // ---------- Image ----------
  render(s, alpha, time, dt, me = 0) {
    const ctx = this.ctx, t = this.tile;
    if (!this.bg) this.buildBg();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * t * 0.4; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }

    this.drawRiver(ctx, time);
    if (this.showZones >= 0) this.drawZones(ctx, s, this.showZones);

    // sol : brûlures, cercles
    for (const f of this.fx) if (f.type === 'scorch') { ctx.globalAlpha = Math.max(0, 1 - f.t / f.dur) * 0.5; ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(this.sx(f.x), this.sy(f.y), f.r * t * 0.8, f.r * t * 0.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }

    // entités triées par profondeur
    const list = s.ents.slice().sort((a, b) => (a.fly - b.fly) || (this.sy(a.y) - this.sy(b.y)));
    for (const e of list) {
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
      this.drawEntity(ctx, e, this.sx(x), this.sy(y), time, me);
    }
    for (const pr of s.proj) this.drawProj(ctx, pr, time);
    this.drawFx(ctx, dt, time);
    for (const e of list) if (!e.dead) {
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
      this.drawBars(ctx, e, this.sx(x), this.sy(y), me);
    }
    if (this.ghost) this.drawGhost(ctx, time);
    for (const [k, v] of this.flash) { if (v - dt <= 0) this.flash.delete(k); else this.flash.set(k, v - dt); }
  }

  drawRiver(ctx, time) {
    const T = this.theme, t = this.tile, y0 = this.sy(RIVER - 0.95), y1 = this.sy(RIVER + 0.95);
    const top = Math.min(y0, y1), h = Math.abs(y1 - y0), x0 = this.sx(0), w = W * t;
    const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, T.water[1]); g.addColorStop(0.5, T.water[0]); g.addColorStop(1, T.water[1]);
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, this.sx(W)), top, w, h);
    ctx.strokeStyle = T.foam; ctx.lineWidth = t * 0.06; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const px = ((i * 1.37 + time * (T.lava ? 0.3 : 0.6)) % W), py = top + h * (0.2 + (i % 4) * 0.2);
      ctx.beginPath(); ctx.moveTo(this.ox + px * t, py); ctx.quadraticCurveTo(this.ox + (px + 0.4) * t, py - t * 0.08, this.ox + (px + 0.8) * t, py); ctx.stroke();
    }
    if (T.lava) for (let i = 0; i < 6; i++) { const px = (i * 3.1 + Math.sin(time + i) * 0.5) % W, py = top + h * (0.3 + 0.4 * Math.abs(Math.sin(time * 0.7 + i))); ctx.fillStyle = 'rgba(255,240,180,.6)'; ctx.beginPath(); ctx.arc(this.ox + px * t, py, t * 0.08 * (1 + Math.sin(time * 3 + i)), 0, TAU); ctx.fill(); }
    // ponts
    for (const bx of BRIDGES) {
      const bx0 = this.sx(bx) - t * 0.95, bw = t * 1.9, by = Math.min(this.sy(RIVER - 1.4), this.sy(RIVER + 1.4)), bh = t * 2.8;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx0 + t * 0.12, by + t * 0.12, bw, bh);
      ctx.fillStyle = T.bridge; roundRect(ctx, bx0, by, bw, bh, t * 0.15); ctx.fill();
      ctx.strokeStyle = shade(T.bridge, -40); ctx.lineWidth = t * 0.04;
      for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(bx0, by + k * bh / 7); ctx.lineTo(bx0 + bw, by + k * bh / 7); ctx.stroke(); }
      ctx.fillStyle = shade(T.bridge, -30); ctx.fillRect(bx0 - t * 0.08, by, t * 0.16, bh); ctx.fillRect(bx0 + bw - t * 0.08, by, t * 0.16, bh);
    }
  }

  drawZones(ctx, s, p) {
    const zones = deployZones(s, p), t = this.tile;
    ctx.fillStyle = 'rgba(255,40,60,.22)';
    // tout en rouge, puis on « efface » les zones autorisées
    ctx.save(); ctx.beginPath(); ctx.rect(this.sx(0), this.sy(0), (this.flip ? -1 : 1) * W * t, (this.flip ? -1 : 1) * H * t);
    for (const [x0, y0, x1, y1] of zones) { const a = this.sx(x0), b = this.sy(y0), c = this.sx(x1), d = this.sy(y1); ctx.rect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)); }
    ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    for (const [x0, y0, x1, y1] of zones) { const a = this.sx(x0), b = this.sy(y0), c = this.sx(x1), d = this.sy(y1); ctx.strokeRect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)); }
    ctx.setLineDash([]);
  }

  drawEntity(ctx, e, x, y, time, me) {
    const t = this.tile, team = e.p === me ? 0 : 1;
    ctx.save(); ctx.translate(x, y);
    if (e.kind === 'tower') {
      drawTower(ctx, t * 1.05, e.sub, team, time + e.id, e.hp / e.maxHp, e.dead, { moving: false, atk: Math.max(0, e.atkAnim || 0) });
      if (this.flash.has(e.id) && !e.dead) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; drawTower(ctx, t * 1.05, e.sub, team, time, 1, false); }
      ctx.restore(); return;
    }
    const c = CARD[e.card], s = t * e.r * 2.4;
    let lift = 0, alpha = 1;
    if (e.deploy > 0) { const k = Math.min(1, e.deploy / 1.0); lift = k * k * t * 3; alpha = 1 - k * 0.6; }
    const flyH = e.fly ? t * 0.55 + Math.sin(time * 3 + e.id) * t * 0.08 : 0;
    // ombre + anneau d'équipe
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42 * (e.fly ? 0.8 : 1), s * 0.16, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = TEAM[team].main; ctx.globalAlpha = 0.85 * alpha; ctx.lineWidth = Math.max(1.5, t * 0.07);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.17, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.translate(0, -lift - flyH);
    const face = this.flip ? -(e.faceX || (e.p === me ? 1 : -1)) : (e.faceX || (e.p === me ? 1 : -1));
    if (face < 0 && e.kind === 'unit') ctx.scale(-1, 1);
    const anim = { moving: e.moving, atk: Math.max(0, e.atkAnim || 0) };
    drawLook(ctx, c.look, s, team, time + e.id * 0.37, anim);
    if (this.flash.has(e.id)) { ctx.globalCompositeOperation = 'source-atop'; }
    ctx.restore();
    if (this.flash.has(e.id)) {
      ctx.save(); ctx.translate(x, y - lift - flyH); ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.55, s * 0.4, s * 0.55, 0, 0, TAU); ctx.globalCompositeOperation = 'overlay'; ctx.fill(); ctx.restore();
    }
    if (e.frozen > 0) {
      ctx.save(); ctx.translate(x, y - flyH); ctx.fillStyle = 'rgba(170,230,255,.45)'; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.5, s * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (e.shield > 0) {
      ctx.save(); ctx.translate(x, y - flyH); ctx.strokeStyle = 'rgba(160,210,255,.8)'; ctx.lineWidth = Math.max(1.5, t * 0.06);
      ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.62, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore();
    }
  }

  drawBars(ctx, e, x, y, me) {
    const t = this.tile, team = e.p === me ? 0 : 1, col = TEAM[team];
    if (e.kind === 'tower') {
      if (e.dead) return;
      const big = e.sub === 'citadel', w = t * (big ? 2.6 : 2.0), h = t * 0.32, by = y + t * (big ? 0.95 : 0.75);
      ctx.fillStyle = 'rgba(15,10,25,.8)'; roundRect(ctx, x - w / 2 - 2, by - 2, w + 4, h + 4, h * 0.5); ctx.fill();
      ctx.fillStyle = col.dark; roundRect(ctx, x - w / 2, by, w, h, h * 0.4); ctx.fill();
      ctx.fillStyle = col.main; roundRect(ctx, x - w / 2, by, w * Math.max(0, e.hp / e.maxHp), h, h * 0.4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(t * 0.3)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(e.hp), x, by + h / 2 + 0.5);
      return;
    }
    if (e.deploy > 0) return;
    const s = t * e.r * 2.4, flyH = e.fly ? t * 0.55 : 0;
    const top = y - flyH - s * ({ golem: 1.35, golemlet: 1.0, sentinel: 2.0, wyrm: 1.9, drake: 1.3, ram: 1.05, wolf: 0.85, wisp: 1.15, sapling: 0.95 }[CARD[e.card].look] || 1.25) - t * 0.15;
    const show = e.hp < e.maxHp || e.star > 1 || e.kind === 'building';
    if (show) {
      const w = Math.max(t * 0.8, s * 0.7), h = Math.max(3, t * 0.13);
      ctx.fillStyle = 'rgba(15,10,25,.75)'; ctx.fillRect(x - w / 2 - 1, top - 1, w + 2, h + 2);
      ctx.fillStyle = col.main; ctx.fillRect(x - w / 2, top, w * Math.max(0, e.hp / e.maxHp), h);
      if (e.shield > 0) { ctx.fillStyle = '#cfe8ff'; ctx.fillRect(x - w / 2, top - h * 0.8, Math.min(w, w * e.shield / e.maxHp * 2), h * 0.6); }
    }
    if (e.star > 1) for (let i = 0; i < e.star; i++) star(ctx, x + (i - (e.star - 1) / 2) * t * 0.28, top - t * 0.2, t * 0.14, '#ffd166');
  }

  drawProj(ctx, pr, time) {
    const t = this.tile, x = this.sx(pr.x), y = this.sy(pr.y), tx = this.sx(pr.tx), ty = this.sy(pr.ty);
    const a = Math.atan2(ty - y, tx - x);
    ctx.save(); ctx.translate(x, y - t * 0.3);
    if (pr.kind === 'arrow') {
      ctx.rotate(a); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(1.5, t * 0.06); ctx.beginPath(); ctx.moveTo(-t * 0.35, 0); ctx.lineTo(t * 0.2, 0); ctx.stroke();
      ctx.fillStyle = '#e6ecf5'; ctx.beginPath(); ctx.moveTo(t * 0.28, 0); ctx.lineTo(t * 0.16, -t * 0.06); ctx.lineTo(t * 0.16, t * 0.06); ctx.fill();
      ctx.fillStyle = pr.p === 0 ? '#ffffff' : '#ffd0d0'; ctx.fillRect(-t * 0.38, -t * 0.05, t * 0.1, t * 0.1);
    } else {
      const col = { orb: ['#ffffff', '#c49bff', 'rgba(120,60,255,0)'], fire: ['#fff6c8', '#ff9a3d', 'rgba(255,60,0,0)'], bolt: ['#ffffff', '#7ff3ff', 'rgba(60,180,255,0)'], thorn: ['#eaffef', '#5fd38d', 'rgba(40,140,60,0)'] }[pr.kind] || ['#fff', '#fff', 'rgba(255,255,255,0)'];
      const r = t * (pr.kind === 'fire' ? 0.35 : 0.25) * (1 + Math.sin(time * 20) * 0.1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); col.forEach((c, i) => g.addColorStop(i / 2, c));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.rotate(a); ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 2.2, 0); ctx.lineTo(0, r * 0.5); ctx.fill();
    }
    ctx.restore();
  }

  drawFx(ctx, dt, time) {
    const t = this.tile;
    for (const f of this.fx) {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur), x = this.sx(f.x), y = this.sy(f.y);
      ctx.save();
      switch (f.type) {
        case 'pt': f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * dt; ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(x, y, f.sz * t, 0, TAU); ctx.fill(); break;
        case 'debris': f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 9 * dt; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#8d8577'; ctx.translate(x, y); ctx.rotate(f.t * 8); ctx.fillRect(-f.sz * t / 2, -f.sz * t / 2, f.sz * t, f.sz * t); break;
        case 'smoke': f.x += f.vx * dt; f.y += f.vy * dt; ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = '#e8e4f0'; ctx.beginPath(); ctx.arc(x, y, f.sz * t * (1 + k), 0, TAU); ctx.fill(); break;
        case 'ring': ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = t * 0.15 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(x, y, f.r * t * (0.3 + k * 0.7), f.r * t * (0.3 + k * 0.7) * 0.6, 0, 0, TAU); ctx.stroke(); break;
        case 'flashc': { ctx.globalAlpha = (1 - k) * 0.8; const g = ctx.createRadialGradient(x, y, 0, x, y, f.r * t); g.addColorStop(0, '#fff'); g.addColorStop(0.4, f.col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, f.r * t, 0, TAU); ctx.fill(); break; }
        case 'num': ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3; ctx.font = `900 ${Math.round(t * (f.big ? 0.55 : 0.36))}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,.9)'; ctx.strokeText(f.txt, x, y - k * t); ctx.fillStyle = f.col; ctx.fillText(f.txt, x, y - k * t); break;
        case 'soul': ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.ellipse(x, y - t * (0.5 + k * 1.5), t * 0.18, t * 0.25, 0, 0, TAU); ctx.fill(); break;
        case 'zap': ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = t * 0.1; ctx.shadowColor = '#7ff3ff'; ctx.shadowBlur = 12; ctx.beginPath();
          f.pts.forEach((p, i) => { const px = this.sx(p.x), py = this.sy(p.y) - t * 0.5; if (!i) ctx.moveTo(px, py); else { const q = f.pts[i - 1], qx = this.sx(q.x), qy = this.sy(q.y) - t * 0.5; for (let j = 1; j <= 4; j++) ctx.lineTo(qx + (px - qx) * j / 4 + (j < 4 ? (Math.random() - 0.5) * t * 0.5 : 0), qy + (py - qy) * j / 4 + (j < 4 ? (Math.random() - 0.5) * t * 0.5 : 0)); } });
          ctx.stroke(); break;
        case 'dash': ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = t * 0.25 * (1 - k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(this.sx(f.x0), this.sy(f.y0) - t * 0.4); ctx.lineTo(this.sx(f.x1), this.sy(f.y1) - t * 0.4); ctx.stroke(); break;
        case 'drop': ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; star(ctx, x, y - (1 - k) * t * 3, t * 0.15, f.col); break;
        case 'ice': { ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(180,235,255,.35)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, f.r * t, f.r * t * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.translate(x, y - t * 0.5); drawSpellIcon(ctx, 'frost', t * 1.6 * (0.6 + k * 0.4), time); break; }
        case 'heal': { ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(255,220,120,.25)'; ctx.beginPath(); ctx.ellipse(x, y, f.r * t, f.r * t * 0.6, 0, 0, TAU); ctx.fill();
          for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + f.t, px = x + Math.cos(a) * f.r * t * 0.6, py = y + Math.sin(a) * f.r * t * 0.35; const g = ctx.createLinearGradient(0, py - t * 3, 0, py); g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(1, 'rgba(255,220,120,.8)'); ctx.fillStyle = g; ctx.fillRect(px - t * 0.12, py - t * 3 * (1 - k * 0.5), t * 0.24, t * 3 * (1 - k * 0.5)); } break; }
        case 'meteorFall': {
          ctx.strokeStyle = 'rgba(255,90,40,.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(x, y, t * 2.2, t * 1.3, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          const mx = x + (1 - k) * t * 6, my = y - (1 - k) * t * 10;
          ctx.translate(mx, my); ctx.rotate(-0.5); drawSpellIcon(ctx, 'meteor', t * (1.2 + k * 0.6), time); break;
        }
      }
      ctx.restore();
    }
    this.fx = this.fx.filter(f => f.t < f.dur);
  }

  drawGhost(ctx, time) {
    const g = this.ghost, c = CARD[g.card], t = this.tile, x = this.sx(g.x), y = this.sy(g.y);
    ctx.save(); ctx.translate(x, y);
    const r = c.type === 'spell' ? c.radius : c.type === 'building' || (c.range && c.range > 2) ? c.range : 1;
    ctx.fillStyle = g.ok ? 'rgba(255,255,255,.15)' : 'rgba(255,60,80,.2)'; ctx.strokeStyle = g.ok ? 'rgba(255,255,255,.85)' : 'rgba(255,80,100,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * t, r * t * (c.type === 'spell' ? 0.65 : 0.6), 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = g.ok ? 0.75 : 0.4;
    if (c.type === 'spell') { ctx.translate(0, -t * 0.4); drawSpellIcon(ctx, c.look, t * 1.4, time); }
    else {
      const s = t * c.r * 2.4, n = c.count || 1;
      for (let k = 0; k < n; k++) { ctx.save(); if (n === 2) ctx.translate((k ? 0.5 : -0.5) * t, 0); if (n === 3) ctx.translate([-0.6, 0.6, 0][k] * t, [0.3, 0.3, -0.5][k] * t); drawLook(ctx, c.look, s, 0, time, { moving: false, atk: 0 }); ctx.restore(); }
    }
    ctx.restore();
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
