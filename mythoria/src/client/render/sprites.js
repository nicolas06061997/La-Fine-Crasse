// MYTHORIA — dessin des personnages, tours et illustrations de cartes (Canvas 2D, vectoriel).
// Tout est dessiné par le code : aucune image à télécharger, chargement instantané.
// Chaque « look » (voir content.js) a sa fonction de dessin. Taille de référence : s = 1 case.

export const TEAM = [
  { main: '#3d9bff', dark: '#1f5fb8', light: '#9fd0ff' },
  { main: '#ff4d5e', dark: '#b3263a', light: '#ffb0b8' },
];

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circ(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw || 1; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ell(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function rgrad(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
const OUT = 'rgba(20,14,30,.85)';

// ---------- Humanoïde générique ----------
// o : { body, trim, skin, hair, head: 'helmet'|'hood'|'hat'|'crown'|'hair'|'horns'|'mask', weapon, cape, big }
function humanoid(ctx, s, o, team, t, anim) {
  const T = TEAM[team];
  const walk = anim.moving ? Math.sin(t * 12) : 0;
  const bob = anim.moving ? Math.abs(Math.sin(t * 12)) * 0.03 * s : Math.sin(t * 2.5) * 0.01 * s;
  const atk = anim.atk > 0 ? Math.sin((anim.atk / 0.25) * Math.PI) : 0;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.translate(0, -bob);
  // cape
  if (o.cape !== false) {
    ctx.fillStyle = grad(ctx, 0, -0.75 * s, 0, -0.1 * s, [T.main, T.dark]);
    ctx.beginPath();
    ctx.moveTo(-0.2 * s, -0.72 * s); ctx.lineTo(0.2 * s, -0.72 * s);
    ctx.lineTo(0.3 * s + walk * 0.03 * s, -0.12 * s); ctx.lineTo(-0.3 * s + walk * 0.03 * s, -0.12 * s); ctx.closePath();
    ctx.fill(); ctx.lineWidth = 0.035 * s; ctx.strokeStyle = OUT; ctx.stroke();
  }
  // jambes
  ctx.fillStyle = o.legs || '#3b3350';
  rr(ctx, -0.17 * s, -0.3 * s + walk * 0.05 * s, 0.13 * s, 0.3 * s, 0.05 * s); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.03 * s; ctx.stroke();
  rr(ctx, 0.04 * s, -0.3 * s - walk * 0.05 * s, 0.13 * s, 0.3 * s, 0.05 * s); ctx.fill(); ctx.stroke();
  // corps
  ctx.fillStyle = grad(ctx, 0, -0.75 * s, 0, -0.25 * s, [o.body, shade(o.body, -30)]);
  ctx.beginPath();
  ctx.moveTo(-0.26 * s, -0.7 * s); ctx.quadraticCurveTo(0, -0.8 * s, 0.26 * s, -0.7 * s);
  ctx.lineTo(0.3 * s, -0.25 * s); ctx.quadraticCurveTo(0, -0.18 * s, -0.3 * s, -0.25 * s); ctx.closePath();
  ctx.fill(); ctx.lineWidth = 0.04 * s; ctx.strokeStyle = OUT; ctx.stroke();
  if (o.trim) { ctx.fillStyle = o.trim; ctx.fillRect(-0.28 * s, -0.38 * s, 0.56 * s, 0.07 * s); }
  if (o.emblem) { circ(ctx, 0, -0.55 * s, 0.07 * s, o.emblem, OUT, 0.02 * s); }
  // arme (derrière/devant selon le type)
  weapon(ctx, s, o.weapon, atk, t, T);
  // bras avant
  ctx.fillStyle = o.skin || '#f2c9a0';
  circ(ctx, 0.27 * s, -0.48 * s + atk * -0.08 * s, 0.075 * s, o.glove || o.skin || '#f2c9a0', OUT, 0.025 * s);
  // tête
  const hy = -0.92 * s;
  circ(ctx, 0, hy, 0.24 * s, o.skin || '#f2c9a0', OUT, 0.04 * s);
  if (o.hair) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, hy - 0.02 * s, 0.25 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
  // yeux
  if (o.head !== 'helmet') {
    ctx.fillStyle = o.eyes || '#1c1530';
    ctx.beginPath(); ctx.ellipse(-0.08 * s, hy + 0.02 * s, 0.032 * s, 0.045 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.08 * s, hy + 0.02 * s, 0.032 * s, 0.045 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, -0.07 * s, hy + 0.005 * s, 0.012 * s, '#fff'); circ(ctx, 0.09 * s, hy + 0.005 * s, 0.012 * s, '#fff');
  }
  headgear(ctx, s, o, hy, T, t);
  ctx.translate(0, bob);
}

function headgear(ctx, s, o, hy, T, t) {
  ctx.lineWidth = 0.04 * s; ctx.strokeStyle = OUT;
  switch (o.head) {
    case 'helmet': {
      ctx.fillStyle = grad(ctx, -0.25 * s, hy - 0.25 * s, 0.25 * s, hy + 0.2 * s, ['#f4f7fb', '#a9b4c4', '#6c778a']);
      ctx.beginPath(); ctx.arc(0, hy, 0.26 * s, Math.PI, 0); ctx.lineTo(0.26 * s, hy + 0.14 * s); ctx.lineTo(-0.26 * s, hy + 0.14 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c1530'; rr(ctx, -0.17 * s, hy - 0.01 * s, 0.34 * s, 0.06 * s, 0.03 * s); ctx.fill();
      // plumet couleur d'équipe
      ctx.fillStyle = T.main; ctx.beginPath(); ctx.moveTo(0, hy - 0.26 * s);
      ctx.quadraticCurveTo(-0.05 * s, hy - 0.55 * s, -0.28 * s, hy - 0.45 * s); ctx.quadraticCurveTo(-0.08 * s, hy - 0.35 * s, 0, hy - 0.22 * s); ctx.fill(); ctx.stroke();
      if (o.crest) { ctx.fillStyle = o.crest; circ(ctx, 0, hy - 0.12 * s, 0.05 * s, o.crest); }
      break;
    }
    case 'hood': {
      ctx.fillStyle = grad(ctx, 0, hy - 0.35 * s, 0, hy + 0.2 * s, [o.hood || '#3f8f5a', shade(o.hood || '#3f8f5a', -40)]);
      ctx.beginPath(); ctx.moveTo(-0.29 * s, hy + 0.16 * s); ctx.quadraticCurveTo(-0.32 * s, hy - 0.3 * s, 0.05 * s, hy - 0.42 * s);
      ctx.quadraticCurveTo(0.32 * s, hy - 0.3 * s, 0.29 * s, hy + 0.16 * s); ctx.quadraticCurveTo(0.2 * s, hy - 0.12 * s, 0, hy - 0.16 * s);
      ctx.quadraticCurveTo(-0.2 * s, hy - 0.12 * s, -0.29 * s, hy + 0.16 * s); ctx.fill(); ctx.stroke();
      break;
    }
    case 'hat': {
      const c = o.hatColor || '#5b3fd1';
      ell(ctx, 0, hy - 0.12 * s, 0.36 * s, 0.09 * s, shade(c, -25));
      ctx.fillStyle = grad(ctx, -0.2 * s, 0, 0.2 * s, 0, [shade(c, 20), c, shade(c, -30)]);
      ctx.beginPath(); ctx.moveTo(-0.22 * s, hy - 0.14 * s); ctx.quadraticCurveTo(-0.05 * s, hy - 0.5 * s, 0.12 * s, hy - 0.72 * s);
      ctx.quadraticCurveTo(0.08 * s, hy - 0.45 * s, 0.22 * s, hy - 0.14 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.hatBand || '#ffd166'; ctx.fillRect(-0.21 * s, hy - 0.22 * s, 0.42 * s, 0.06 * s);
      star(ctx, 0.02 * s, hy - 0.38 * s, 0.05 * s, '#ffe9a3');
      break;
    }
    case 'crown': {
      ctx.fillStyle = grad(ctx, 0, hy - 0.45 * s, 0, hy - 0.15 * s, ['#fff1a8', '#ffb02e', '#c97a12']);
      ctx.beginPath(); ctx.moveTo(-0.2 * s, hy - 0.16 * s);
      for (let i = 0; i <= 4; i++) { ctx.lineTo(-0.2 * s + i * 0.1 * s, hy - (i % 2 ? 0.3 : 0.42) * s); }
      ctx.lineTo(0.2 * s, hy - 0.16 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      circ(ctx, 0, hy - 0.24 * s, 0.035 * s, '#ff4d6d');
      break;
    }
    case 'horns': {
      ctx.fillStyle = '#efe4c8';
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 0.15 * s, hy - 0.18 * s); ctx.quadraticCurveTo(k * 0.4 * s, hy - 0.3 * s, k * 0.32 * s, hy - 0.55 * s); ctx.quadraticCurveTo(k * 0.28 * s, hy - 0.32 * s, k * 0.06 * s, hy - 0.22 * s); ctx.fill(); ctx.stroke(); }
      break;
    }
    case 'mask': {
      ctx.fillStyle = '#2a1f3d'; ctx.beginPath(); ctx.arc(0, hy, 0.25 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      ctx.fillStyle = T.main; ctx.fillRect(-0.25 * s, hy - 0.03 * s, 0.5 * s, 0.07 * s);
      ctx.fillStyle = '#ff9a3d'; circ(ctx, -0.08 * s, hy + 0.0 * s, 0.03 * s, '#ffcf70'); circ(ctx, 0.08 * s, hy, 0.03 * s, '#ffcf70');
      ctx.fillStyle = T.main; ctx.beginPath(); ctx.moveTo(0.2 * s, hy - 0.02 * s); ctx.quadraticCurveTo(0.45 * s, hy + Math.sin(t * 6) * 0.06 * s, 0.5 * s, hy + 0.1 * s); ctx.lineTo(0.22 * s, hy + 0.05 * s); ctx.fill();
      break;
    }
  }
}

function weapon(ctx, s, w, atk, t, T) {
  ctx.save();
  ctx.lineWidth = 0.035 * s; ctx.strokeStyle = OUT;
  switch (w) {
    case 'sword': case 'bigsword': {
      const L = w === 'bigsword' ? 0.75 : 0.55;
      ctx.translate(0.28 * s, -0.48 * s); ctx.rotate(-0.6 + atk * 1.8);
      ctx.fillStyle = grad(ctx, 0, 0, 0.06 * s, 0, ['#ffffff', '#b8c3d6']);
      ctx.beginPath(); ctx.moveTo(-0.04 * s, -0.05 * s); ctx.lineTo(-0.04 * s, -L * s); ctx.lineTo(0, -(L + 0.08) * s); ctx.lineTo(0.04 * s, -L * s); ctx.lineTo(0.04 * s, -0.05 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.12 * s, -0.08 * s, 0.24 * s, 0.05 * s);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(-0.03 * s, -0.04 * s, 0.06 * s, 0.12 * s);
      if (w === 'bigsword') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff3b0'; ctx.fillRect(-0.02 * s, -L * s, 0.04 * s, (L - 0.1) * s); }
      break;
    }
    case 'shield': {
      ctx.translate(-0.3 * s, -0.48 * s);
      ctx.fillStyle = grad(ctx, -0.2 * s, -0.3 * s, 0.2 * s, 0.3 * s, ['#e6ecf5', '#8d99ad']);
      ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.25 * s); ctx.lineTo(0.2 * s, -0.25 * s); ctx.lineTo(0.2 * s, 0.05 * s); ctx.quadraticCurveTo(0.18 * s, 0.25 * s, 0, 0.33 * s); ctx.quadraticCurveTo(-0.18 * s, 0.25 * s, -0.2 * s, 0.05 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = T.main; ctx.beginPath(); ctx.moveTo(-0.13 * s, -0.18 * s); ctx.lineTo(0.13 * s, -0.18 * s); ctx.lineTo(0.13 * s, 0.03 * s); ctx.quadraticCurveTo(0.11 * s, 0.17 * s, 0, 0.23 * s); ctx.quadraticCurveTo(-0.11 * s, 0.17 * s, -0.13 * s, 0.03 * s); ctx.closePath(); ctx.fill();
      star(ctx, 0, -0.02 * s, 0.07 * s, '#ffd166');
      ctx.restore(); ctx.save();
      ctx.lineWidth = 0.035 * s; ctx.strokeStyle = OUT;
      ctx.translate(0.28 * s, -0.48 * s); ctx.rotate(-0.4 + atk * 1.6);
      ctx.fillStyle = '#cfd6e2'; ctx.fillRect(-0.035 * s, -0.5 * s, 0.07 * s, 0.45 * s); ctx.strokeRect(-0.035 * s, -0.5 * s, 0.07 * s, 0.45 * s);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.1 * s, -0.07 * s, 0.2 * s, 0.05 * s);
      break;
    }
    case 'bow': {
      ctx.translate(0.3 * s, -0.5 * s);
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 0.06 * s;
      ctx.beginPath(); ctx.arc(0, 0, 0.3 * s, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#f5f0e0'; ctx.lineWidth = 0.015 * s;
      const pull = atk * 0.12 * s;
      ctx.beginPath(); ctx.moveTo(0.3 * s * Math.cos(-1.2), 0.3 * s * Math.sin(-1.2)); ctx.lineTo(0.03 * s - pull, 0); ctx.lineTo(0.3 * s * Math.cos(1.2), 0.3 * s * Math.sin(1.2)); ctx.stroke();
      break;
    }
    case 'staff': case 'orbstaff': case 'thornstaff': {
      ctx.translate(0.3 * s, -0.45 * s); ctx.rotate(0.15 - atk * 0.5);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(-0.03 * s, -0.6 * s, 0.06 * s, 0.85 * s);
      const col = w === 'thornstaff' ? '#5fd38d' : w === 'orbstaff' ? '#7ff3ff' : '#c49bff';
      const pulse = 1 + Math.sin(t * 5) * 0.15 + atk * 0.4;
      circ(ctx, 0, -0.66 * s, 0.17 * s * pulse, rgrad(ctx, 0, -0.66 * s, 0.17 * s * pulse, ['rgba(255,255,255,.95)', col, 'rgba(0,0,0,0)']));
      circ(ctx, 0, -0.66 * s, 0.07 * s, '#fff');
      break;
    }
    case 'daggers': {
      for (const k of [1, -1]) {
        ctx.save(); ctx.translate(k * 0.28 * s, -0.46 * s); ctx.rotate(k * (-0.8 + atk * 1.4));
        ctx.fillStyle = '#ffcf70'; ctx.beginPath(); ctx.moveTo(-0.03 * s, 0); ctx.lineTo(0, -0.38 * s); ctx.lineTo(0.03 * s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a1f3d'; ctx.fillRect(-0.03 * s, 0, 0.06 * s, 0.1 * s);
        ctx.restore();
      }
      break;
    }
    case 'mace': {
      ctx.translate(0.28 * s, -0.48 * s); ctx.rotate(-0.5 + atk * 1.7);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(-0.03 * s, -0.4 * s, 0.06 * s, 0.45 * s);
      circ(ctx, 0, -0.45 * s, 0.12 * s, grad(ctx, 0, -0.57 * s, 0, -0.33 * s, ['#fff7c2', '#ffb02e']), OUT, 0.03 * s);
      break;
    }
  }
  ctx.restore();
}

function star(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
export { star };

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = k => Math.max(0, Math.min(255, ((n >> k) & 255) + amt));
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}

// ---------- Créatures ----------
function wolf(ctx, s, team, t, anim) {
  const T = TEAM[team], run = anim.moving ? Math.sin(t * 16) : 0, atk = anim.atk > 0 ? Math.sin(anim.atk / 0.25 * Math.PI) : 0;
  ctx.lineWidth = 0.04 * s; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // pattes
  ctx.fillStyle = '#4d5a52';
  for (const [x, ph] of [[-0.25, 1], [-0.12, -1], [0.15, -1], [0.28, 1]]) { rr(ctx, x * s - 0.04 * s, -0.25 * s + run * ph * 0.04 * s, 0.08 * s, 0.25 * s, 0.03 * s); ctx.fill(); ctx.stroke(); }
  // queue
  ctx.fillStyle = '#6b7d70'; ctx.beginPath(); ctx.moveTo(-0.33 * s, -0.4 * s); ctx.quadraticCurveTo(-0.6 * s, -0.55 * s + run * 0.05 * s, -0.55 * s, -0.75 * s); ctx.quadraticCurveTo(-0.45 * s, -0.5 * s, -0.3 * s, -0.3 * s); ctx.fill(); ctx.stroke();
  // corps
  ctx.fillStyle = grad(ctx, 0, -0.6 * s, 0, -0.2 * s, ['#93a89a', '#56665b']);
  ctx.beginPath(); ctx.ellipse(0, -0.38 * s, 0.38 * s, 0.2 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // collier de ronces couleur d'équipe
  ctx.strokeStyle = T.main; ctx.lineWidth = 0.06 * s; ctx.beginPath(); ctx.arc(0.25 * s, -0.42 * s, 0.13 * s, 0.5, 2.6); ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.04 * s;
  // tête
  ctx.save(); ctx.translate(0.38 * s, -0.55 * s - atk * 0.08 * s); ctx.rotate(atk * 0.3);
  ctx.fillStyle = '#93a89a'; ctx.beginPath(); ctx.ellipse(0, 0, 0.19 * s, 0.16 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.1 * s, -0.02 * s); ctx.lineTo(0.32 * s, 0.04 * s); ctx.lineTo(0.12 * s, 0.12 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(k * 0.08 * s - 0.03 * s, -0.12 * s); ctx.lineTo(k * 0.08 * s, -0.3 * s); ctx.lineTo(k * 0.08 * s + 0.06 * s, -0.12 * s); ctx.fill(); ctx.stroke(); }
  circ(ctx, 0.08 * s, -0.02 * s, 0.035 * s, '#ffe066'); circ(ctx, 0.32 * s, 0.04 * s, 0.03 * s, '#1c1530');
  ctx.restore();
}

function wisp(ctx, s, team, t) {
  const T = TEAM[team], f = Math.sin(t * 9) * 0.05 * s;
  const y = -0.7 * s;
  circ(ctx, 0, y, 0.45 * s, rgrad(ctx, 0, y, 0.45 * s, ['rgba(255,220,120,.6)', 'rgba(255,120,40,.25)', 'rgba(255,80,0,0)']));
  ctx.fillStyle = grad(ctx, 0, y - 0.35 * s, 0, y + 0.2 * s, ['#fff6c8', '#ffb02e', '#ff5a1f']);
  ctx.beginPath(); ctx.moveTo(0, y - 0.38 * s + f);
  ctx.quadraticCurveTo(0.24 * s, y - 0.05 * s, 0.17 * s, y + 0.13 * s); ctx.quadraticCurveTo(0, y + 0.25 * s, -0.17 * s, y + 0.13 * s);
  ctx.quadraticCurveTo(-0.24 * s, y - 0.05 * s, 0, y - 0.38 * s + f); ctx.fill();
  circ(ctx, -0.06 * s, y, 0.035 * s, '#3a1405'); circ(ctx, 0.06 * s, y, 0.035 * s, '#3a1405');
  circ(ctx, 0, y + 0.17 * s, 0.05 * s, T.main);
}

function golem(ctx, s, team, t, anim, small) {
  const T = TEAM[team], k = small ? 0.65 : 1, S = s * k, step = anim.moving ? Math.sin(t * 6) : 0, atk = anim.atk > 0 ? Math.sin(anim.atk / 0.25 * Math.PI) : 0;
  ctx.lineWidth = 0.05 * S; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  ctx.fillStyle = '#6f6a62';
  rr(ctx, -0.35 * S, -0.35 * S + step * 0.04 * S, 0.25 * S, 0.35 * S, 0.08 * S); ctx.fill(); ctx.stroke();
  rr(ctx, 0.1 * S, -0.35 * S - step * 0.04 * S, 0.25 * S, 0.35 * S, 0.08 * S); ctx.fill(); ctx.stroke();
  ctx.fillStyle = grad(ctx, 0, -1.3 * S, 0, -0.3 * S, ['#a49c8e', '#6d665c']);
  ctx.beginPath(); ctx.moveTo(-0.55 * S, -0.4 * S); ctx.quadraticCurveTo(-0.65 * S, -1.15 * S, 0, -1.25 * S); ctx.quadraticCurveTo(0.65 * S, -1.15 * S, 0.55 * S, -0.4 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  // mousse
  ctx.fillStyle = '#5fbf6e';
  ctx.beginPath(); ctx.moveTo(-0.5 * S, -0.95 * S); ctx.quadraticCurveTo(0, -1.45 * S, 0.5 * S, -0.95 * S); ctx.quadraticCurveTo(0.3 * S, -1.05 * S, 0.15 * S, -0.92 * S); ctx.quadraticCurveTo(0, -1.05 * S, -0.2 * S, -0.9 * S); ctx.closePath(); ctx.fill();
  for (const [x, y] of [[-0.3, -0.6], [0.32, -0.7], [0.05, -0.5]]) circ(ctx, x * S, y * S, 0.07 * S, '#4caa5c');
  // bras
  for (const sgn of [-1, 1]) {
    ctx.save(); ctx.translate(sgn * 0.55 * S, -0.85 * S); ctx.rotate(sgn * 0.2 + (sgn > 0 ? -atk * 1.2 : 0));
    ctx.fillStyle = '#857d71'; rr(ctx, -0.13 * S, 0, 0.26 * S, 0.55 * S, 0.1 * S); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // yeux
  const g = 0.6 + Math.sin(t * 3) * 0.2;
  circ(ctx, -0.16 * S, -0.9 * S, 0.08 * S, `rgba(140,255,170,${g})`); circ(ctx, 0.16 * S, -0.9 * S, 0.08 * S, `rgba(140,255,170,${g})`);
  circ(ctx, -0.16 * S, -0.9 * S, 0.035 * S, '#fff'); circ(ctx, 0.16 * S, -0.9 * S, 0.035 * S, '#fff');
  // rune d'équipe
  circ(ctx, 0, -0.62 * S, 0.1 * S, T.main, OUT, 0.03 * S);
}

function dragon(ctx, s, team, t, anim, big) {
  const T = TEAM[team], k = big ? 1.5 : 0.9, S = s * k, flap = Math.sin(t * (big ? 5 : 8)), atk = anim.atk > 0 ? Math.sin(anim.atk / 0.25 * Math.PI) : 0;
  const body = big ? '#c2263a' : '#ff7a3d', belly = big ? '#ffcf70' : '#ffe0a3', wingC = big ? '#7a1424' : '#d9531f';
  const y = -0.9 * S;
  ctx.lineWidth = 0.04 * S; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // ailes
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = grad(ctx, 0, y - 0.6 * S, 0, y + 0.1 * S, [shade(wingC, 30), wingC]);
    ctx.beginPath(); ctx.moveTo(sgn * 0.1 * S, y - 0.1 * S);
    const wy = y - 0.55 * S + flap * 0.25 * S * sgn * sgn;
    ctx.lineTo(sgn * 0.75 * S, wy); ctx.lineTo(sgn * 0.62 * S, wy + 0.25 * S); ctx.lineTo(sgn * 0.48 * S, wy + 0.18 * S); ctx.lineTo(sgn * 0.35 * S, wy + 0.4 * S); ctx.lineTo(sgn * 0.1 * S, y + 0.1 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // queue
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-0.15 * S, y + 0.1 * S); ctx.quadraticCurveTo(-0.5 * S, y + 0.35 * S + flap * 0.05 * S, -0.7 * S, y + 0.15 * S); ctx.lineTo(-0.62 * S, y + 0.3 * S); ctx.quadraticCurveTo(-0.4 * S, y + 0.45 * S, -0.05 * S, y + 0.25 * S); ctx.fill(); ctx.stroke();
  // corps
  ctx.fillStyle = grad(ctx, 0, y - 0.3 * S, 0, y + 0.3 * S, [shade(body, 30), body, shade(body, -40)]);
  ctx.beginPath(); ctx.ellipse(0, y, 0.3 * S, 0.27 * S, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0.05 * S, y + 0.08 * S, 0.17 * S, 0.15 * S, 0, 0, TAU); ctx.fill();
  // tête
  ctx.save(); ctx.translate(0.3 * S, y - 0.25 * S); ctx.rotate(-0.2 + atk * 0.3);
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 0.2 * S, 0.16 * S, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.1 * S, -0.06 * S); ctx.lineTo(0.34 * S, 0.02 * S); ctx.lineTo(0.1 * S, 0.12 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#efe4c8';
  for (const hx of [-0.08, 0.02]) { ctx.beginPath(); ctx.moveTo(hx * S, -0.12 * S); ctx.lineTo(hx * S - 0.12 * S, -0.32 * S); ctx.lineTo(hx * S + 0.06 * S, -0.13 * S); ctx.fill(); ctx.stroke(); }
  circ(ctx, 0.05 * S, -0.03 * S, 0.04 * S, '#ffe066'); circ(ctx, 0.06 * S, -0.03 * S, 0.018 * S, '#1c1530');
  if (atk > 0.1) circ(ctx, 0.4 * S, 0.03 * S, 0.12 * S * atk, rgrad(ctx, 0.4 * S, 0.03 * S, 0.12 * S, ['#fff6c8', '#ff9a3d', 'rgba(255,60,0,0)']));
  ctx.restore();
  // marque d'équipe
  circ(ctx, -0.05 * S, y - 0.12 * S, 0.06 * S, T.main, OUT, 0.02 * S);
  if (big) { ctx.fillStyle = '#ffd166'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.2 * S + i * 0.12 * S, y - 0.25 * S); ctx.lineTo(-0.16 * S + i * 0.12 * S, y - 0.38 * S); ctx.lineTo(-0.12 * S + i * 0.12 * S, y - 0.25 * S); ctx.fill(); } }
}

function ram(ctx, s, team, t, anim) {
  const T = TEAM[team], atk = anim.atk > 0 ? Math.sin(anim.atk / 0.25 * Math.PI) : 0, rot = anim.moving ? t * 8 : 0;
  ctx.lineWidth = 0.04 * s; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // toit
  ctx.fillStyle = grad(ctx, 0, -1.0 * s, 0, -0.4 * s, [T.main, T.dark]);
  ctx.beginPath(); ctx.moveTo(-0.55 * s, -0.45 * s); ctx.lineTo(0, -1.0 * s); ctx.lineTo(0.55 * s, -0.45 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  // châssis
  ctx.fillStyle = '#8a5a32'; rr(ctx, -0.6 * s, -0.5 * s, 1.2 * s, 0.25 * s, 0.05 * s); ctx.fill(); ctx.stroke();
  // bélier
  const ox = atk * 0.25 * s;
  ctx.fillStyle = grad(ctx, 0, -0.75 * s, 0, -0.55 * s, ['#c08a55', '#7a4a22']); rr(ctx, -0.5 * s + ox, -0.75 * s, 1.1 * s, 0.17 * s, 0.08 * s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8c3d6'; ctx.beginPath(); ctx.moveTo(0.6 * s + ox, -0.8 * s); ctx.lineTo(0.8 * s + ox, -0.67 * s); ctx.lineTo(0.6 * s + ox, -0.54 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  // roues
  for (const x of [-0.38, 0.38]) {
    circ(ctx, x * s, -0.2 * s, 0.2 * s, '#5a3a1e', OUT, 0.04 * s);
    ctx.strokeStyle = '#c08a55'; ctx.lineWidth = 0.03 * s;
    for (let i = 0; i < 3; i++) { const a = rot + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x * s - Math.cos(a) * 0.17 * s, -0.2 * s - Math.sin(a) * 0.17 * s); ctx.lineTo(x * s + Math.cos(a) * 0.17 * s, -0.2 * s + Math.sin(a) * 0.17 * s); ctx.stroke(); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.04 * s;
  }
}

function sapling(ctx, s, team, t, anim) {
  const T = TEAM[team], w = anim.moving ? Math.sin(t * 14) : 0;
  ctx.lineWidth = 0.035 * s; ctx.strokeStyle = OUT;
  ctx.fillStyle = '#7a4a22'; rr(ctx, -0.12 * s, -0.5 * s, 0.24 * s, 0.4 * s, 0.08 * s); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 0.06 * s;
  ctx.beginPath(); ctx.moveTo(-0.08 * s, -0.12 * s); ctx.lineTo(-0.15 * s, w * 0.05 * s); ctx.moveTo(0.08 * s, -0.12 * s); ctx.lineTo(0.15 * s, -w * 0.05 * s); ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.035 * s;
  circ(ctx, 0, -0.62 * s, 0.25 * s, grad(ctx, 0, -0.85 * s, 0, -0.4 * s, ['#8ff0a4', '#3f9a52']), OUT, 0.035 * s);
  circ(ctx, -0.07 * s, -0.58 * s, 0.03 * s, '#1c1530'); circ(ctx, 0.07 * s, -0.58 * s, 0.03 * s, '#1c1530');
  circ(ctx, 0, -0.86 * s, 0.06 * s, T.main);
}

function sentinel(ctx, s, team, t, anim) {
  const T = TEAM[team];
  ctx.lineWidth = 0.05 * s; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  ell(ctx, 0, 0, 0.75 * s, 0.3 * s, '#6d665c');
  ctx.fillStyle = grad(ctx, -0.5 * s, 0, 0.5 * s, 0, ['#b9b2a5', '#8a8378', '#5f594f']);
  ctx.beginPath(); ctx.moveTo(-0.5 * s, 0); ctx.lineTo(-0.38 * s, -1.2 * s); ctx.lineTo(0.38 * s, -1.2 * s); ctx.lineTo(0.5 * s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.02 * s;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-0.5 * s + i * 0.03 * s, -i * 0.3 * s); ctx.lineTo(0.5 * s - i * 0.03 * s, -i * 0.3 * s); ctx.stroke(); }
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.05 * s;
  ctx.fillStyle = T.main; rr(ctx, -0.45 * s, -1.35 * s, 0.9 * s, 0.2 * s, 0.04 * s); ctx.fill(); ctx.stroke();
  const p = 1 + Math.sin(t * 4) * 0.1 + (anim.atk > 0 ? 0.4 : 0);
  circ(ctx, 0, -1.6 * s, 0.32 * s * p, rgrad(ctx, 0, -1.6 * s, 0.32 * s * p, ['#ffffff', '#7ff3ff', 'rgba(60,180,255,0)']));
  ctx.fillStyle = '#bff8ff'; ctx.beginPath(); ctx.moveTo(0, -1.85 * s); ctx.lineTo(0.12 * s, -1.6 * s); ctx.lineTo(0, -1.38 * s); ctx.lineTo(-0.12 * s, -1.6 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
}

// Tours du château
export function drawTower(ctx, s, sub, team, t, hpRatio, dead, anim) {
  const T = TEAM[team], big = sub === 'citadel', k = big ? 1.35 : 1, S = s * k;
  ctx.lineWidth = 0.05 * s; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  if (dead) {
    ell(ctx, 0, 0, 0.95 * S, 0.45 * S, 'rgba(0,0,0,.3)');
    ctx.fillStyle = '#7d766b';
    for (const [x, y, r] of [[-0.4, -0.1, 0.25], [0.3, -0.05, 0.3], [0, -0.3, 0.28], [-0.1, 0.1, 0.2], [0.5, 0.15, 0.18]]) { ctx.beginPath(); ctx.arc(x * S, y * S, r * S, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = T.dark; ctx.fillRect(0.1 * S, -0.75 * S, 0.04 * S, 0.5 * S);
    ctx.fillStyle = 'rgba(80,80,80,.5)'; circ(ctx, 0, -0.9 * S + Math.sin(t) * 0.1 * S, 0.25 * S, 'rgba(90,90,90,.35)');
    return;
  }
  ell(ctx, 0.15 * S, 0.12 * S, 1.05 * S, 0.45 * S, 'rgba(0,0,0,.28)');
  // socle
  ctx.fillStyle = grad(ctx, -S, 0, S, 0, ['#8d8577', '#b9b1a3', '#6f685c']);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.95 * S, 0.42 * S, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // corps
  ctx.fillStyle = grad(ctx, -0.7 * S, 0, 0.7 * S, 0, ['#c9c1b2', '#e8e1d2', '#a39b8c', '#7c7569']);
  ctx.beginPath(); ctx.moveTo(-0.72 * S, -0.05 * S); ctx.lineTo(-0.66 * S, -1.45 * S); ctx.lineTo(0.66 * S, -1.45 * S); ctx.lineTo(0.72 * S, -0.05 * S);
  ctx.quadraticCurveTo(0, 0.25 * S, -0.72 * S, -0.05 * S); ctx.fill(); ctx.stroke();
  // briques
  ctx.strokeStyle = 'rgba(70,60,50,.35)'; ctx.lineWidth = 0.025 * s;
  for (let r = 1; r < 6; r++) {
    const y = -r * 0.25 * S; ctx.beginPath(); ctx.moveTo(-0.7 * S, y); ctx.lineTo(0.7 * S, y); ctx.stroke();
    for (let c = 0; c < 4; c++) { const x = -0.6 * S + c * 0.4 * S + (r % 2) * 0.2 * S; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 0.25 * S); ctx.stroke(); }
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.05 * s;
  // porte / fenêtre
  ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.moveTo(-0.2 * S, 0.05 * S); ctx.lineTo(-0.2 * S, -0.35 * S); ctx.arc(0, -0.35 * S, 0.2 * S, Math.PI, 0); ctx.lineTo(0.2 * S, 0.05 * S); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffcf70'; rr(ctx, -0.08 * S, -1.05 * S, 0.16 * S, 0.25 * S, 0.06 * S); ctx.fill();
  // créneaux
  ctx.fillStyle = '#d8d0c1';
  rr(ctx, -0.82 * S, -1.62 * S, 1.64 * S, 0.22 * S, 0.04 * S); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) { rr(ctx, -0.8 * S + i * 0.34 * S, -1.82 * S, 0.24 * S, 0.22 * S, 0.03 * S); ctx.fill(); ctx.stroke(); }
  // bannière d'équipe
  ctx.fillStyle = grad(ctx, 0, -1.4 * S, 0, -0.6 * S, [T.main, T.dark]);
  ctx.beginPath(); ctx.moveTo(-0.5 * S, -1.4 * S); ctx.lineTo(-0.28 * S, -1.4 * S); ctx.lineTo(-0.28 * S, -0.75 * S); ctx.lineTo(-0.39 * S, -0.85 * S); ctx.lineTo(-0.5 * S, -0.75 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.28 * S, -1.4 * S); ctx.lineTo(0.5 * S, -1.4 * S); ctx.lineTo(0.5 * S, -0.75 * S); ctx.lineTo(0.39 * S, -0.85 * S); ctx.lineTo(0.28 * S, -0.75 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (big) {
    // donjon : toit pointu + drapeau
    ctx.fillStyle = grad(ctx, -0.5 * S, 0, 0.5 * S, 0, [T.light, T.main, T.dark]);
    ctx.beginPath(); ctx.moveTo(-0.55 * S, -1.85 * S); ctx.lineTo(0, -2.75 * S); ctx.lineTo(0.55 * S, -1.85 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-0.02 * S, -3.15 * S, 0.04 * S, 0.45 * S);
    const wv = Math.sin(t * 4) * 0.05 * S;
    ctx.fillStyle = T.main; ctx.beginPath(); ctx.moveTo(0.02 * S, -3.15 * S); ctx.quadraticCurveTo(0.25 * S, -3.1 * S + wv, 0.45 * S, -3.05 * S); ctx.lineTo(0.02 * S, -2.92 * S); ctx.fill(); ctx.stroke();
    // couronne
    ctx.save(); ctx.translate(0, -2.05 * S); headgear(ctx, S * 0.9, { head: 'crown' }, 0, T, t); ctx.restore();
  } else {
    // archer sur la tour
    ctx.save(); ctx.translate(0, -1.62 * S); ctx.scale(0.55, 0.55);
    humanoid(ctx, S, { body: '#7a5a3a', skin: '#f2c9a0', head: 'helmet', weapon: 'bow', cape: true }, team, t, anim || { moving: false, atk: 0 });
    ctx.restore();
  }
}

// ---------- Table des looks ----------
const LOOKS = {
  squire:   (c, s, tm, t, a) => humanoid(c, s, { body: '#c9d3e3', trim: '#ffd166', head: 'helmet', weapon: 'sword', emblem: '#ffd166' }, tm, t, a),
  archer:   (c, s, tm, t, a) => humanoid(c, s, { body: '#4f9a5f', trim: '#8a5a32', head: 'hood', hood: '#3f8f5a', weapon: 'bow', hair: '#f3d27a', skin: '#f6d2b0' }, tm, t, a),
  shieldbro:(c, s, tm, t, a) => humanoid(c, s, { body: '#9aa6b8', trim: '#ffd166', head: 'helmet', weapon: 'shield', crest: '#ffd166', legs: '#5d6475' }, tm, t, a),
  mage:     (c, s, tm, t, a) => humanoid(c, s, { body: '#6a4fe0', trim: '#ffd166', head: 'hat', hatColor: '#4b35b8', weapon: 'staff', hair: '#7a4a22' }, tm, t, a),
  witch:    (c, s, tm, t, a) => humanoid(c, s, { body: '#2f6b46', trim: '#b45cff', head: 'hat', hatColor: '#24543a', hatBand: '#b45cff', weapon: 'thornstaff', hair: '#b45cff', skin: '#d9f0c8' }, tm, t, a),
  paladin:  (c, s, tm, t, a) => humanoid(c, s, { body: '#f2e3b3', trim: '#ffb02e', head: 'crown', weapon: 'bigsword', hair: '#ffcf70', emblem: '#ffb02e', legs: '#c9a24a' }, tm, t, a),
  archmage: (c, s, tm, t, a) => humanoid(c, s, { body: '#2e2a6b', trim: '#7ff3ff', head: 'hat', hatColor: '#1f1c52', hatBand: '#7ff3ff', weapon: 'orbstaff', hair: '#e8e8f0', emblem: '#7ff3ff' }, tm, t, a),
  assassin: (c, s, tm, t, a) => humanoid(c, s, { body: '#3a2a52', trim: '#ff7a3d', head: 'mask', weapon: 'daggers', skin: '#e9c2a0', legs: '#22182f', cape: false }, tm, t, a),
  wolf: wolf, wisp: wisp, ram: ram, sapling: sapling, sentinel: sentinel,
  golem: (c, s, tm, t, a) => golem(c, s, tm, t, a, false),
  golemlet: (c, s, tm, t, a) => golem(c, s, tm, t, a, true),
  drake: (c, s, tm, t, a) => dragon(c, s, tm, t, a, false),
  wyrm: (c, s, tm, t, a) => dragon(c, s, tm, t, a, true),
};

export function drawLook(ctx, look, s, team, t, anim = { moving: false, atk: 0 }) {
  const f = LOOKS[look];
  if (f) { ctx.save(); f(ctx, s, team, t, anim); ctx.restore(); }
}

// ---------- Icônes des sorts ----------
export function drawSpellIcon(ctx, look, s, t) {
  ctx.save();
  ctx.lineWidth = 0.04 * s; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  if (look === 'meteor') {
    for (let i = 0; i < 6; i++) circ(ctx, -0.3 * s * i * 0.25 - 0.1 * s, -0.3 * s * i * 0.25 - 0.1 * s, (0.3 - i * 0.04) * s, `rgba(255,${120 + i * 20},40,${0.5 - i * 0.07})`);
    circ(ctx, 0.15 * s, 0.15 * s, 0.38 * s, rgrad(ctx, 0.05 * s, 0.05 * s, 0.4 * s, ['#fff6c8', '#ff9a3d', '#b3263a']), OUT, 0.04 * s);
    circ(ctx, 0.25 * s, 0.1 * s, 0.07 * s, 'rgba(90,20,10,.6)'); circ(ctx, 0.05 * s, 0.25 * s, 0.05 * s, 'rgba(90,20,10,.6)');
  } else if (look === 'sparks') {
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + t, r = 0.35 * s; star(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, 0.13 * s, i % 2 ? '#ffe066' : '#fff'); }
    star(ctx, 0, 0, 0.32 * s, '#ffcf3d');
  } else if (look === 'frost') {
    ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 0.07 * s;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.5 * s, Math.sin(a) * 0.5 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s); ctx.lineTo(Math.cos(a + 0.5) * 0.4 * s, Math.sin(a + 0.5) * 0.4 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s); ctx.lineTo(Math.cos(a - 0.5) * 0.4 * s, Math.sin(a - 0.5) * 0.4 * s); ctx.stroke();
    }
    circ(ctx, 0, 0, 0.12 * s, '#7fd8ff', '#fff', 0.03 * s);
  } else if (look === 'blessing') {
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.5; ctx.strokeStyle = 'rgba(255,220,120,.8)'; ctx.lineWidth = 0.05 * s; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.3 * s, Math.sin(a) * 0.3 * s); ctx.lineTo(Math.cos(a) * 0.5 * s, Math.sin(a) * 0.5 * s); ctx.stroke(); }
    circ(ctx, 0, 0, 0.28 * s, rgrad(ctx, 0, 0, 0.28 * s, ['#fffbe6', '#ffd166', '#ffb02e']), OUT, 0.04 * s);
    ctx.fillStyle = '#fff'; ctx.fillRect(-0.04 * s, -0.17 * s, 0.08 * s, 0.34 * s); ctx.fillRect(-0.14 * s, -0.06 * s, 0.28 * s, 0.08 * s);
  }
  ctx.restore();
}

// ---------- Illustration de carte (mise en cache) ----------
const ART = new Map();
const FAC_BG = {
  aube: ['#fff3c4', '#f0b54a', '#8a5a1a'], arcane: ['#d9d2ff', '#6a4fe0', '#1f1650'], sylve: ['#d6ffd9', '#3f9a52', '#123d22'],
  braise: ['#ffe0c2', '#ff6a2d', '#5a1408'], neutre: ['#eef1f6', '#8d99ad', '#2f3747'],
};
export function cardArt(card, w, h, dpr = 1) {
  const key = card.id + ':' + w + 'x' + h + '@' + dpr;
  if (ART.has(key)) return ART.get(key);
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const bg = FAC_BG[card.fac] || FAC_BG.neutre;
  ctx.fillStyle = rgrad(ctx, w / 2, h * 0.45, Math.max(w, h) * 0.75, bg); ctx.fillRect(0, 0, w, h);
  // rayons
  ctx.save(); ctx.translate(w / 2, h * 0.5); ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-w * 0.08, -h); ctx.lineTo(w * 0.08, -h); ctx.fill(); }
  ctx.restore();
  // sol
  ell(ctx, w / 2, h * 0.86, w * 0.36, h * 0.07, 'rgba(0,0,0,.25)');
  ctx.save();
  if (card.type === 'spell') { ctx.translate(w / 2, h * 0.52); drawSpellIcon(ctx, card.look, Math.min(w, h) * 0.75, 0.3); }
  else {
    const big = { golem: 0.48, wyrm: 0.36, drake: 0.5, ram: 0.62, sentinel: 0.4, wolf: 0.85, wisp: 0.95 }[card.look] || 0.62;
    const s = Math.min(w, h * 0.75) * big;
    ctx.translate(w / 2, h * 0.88);
    if (card.look === 'wyrm' || card.look === 'drake') ctx.translate(0, h * 0.1);
    drawLook(ctx, card.look, s, 0, 0.35, { moving: false, atk: 0 });
    if (card.count > 1) { ctx.globalAlpha = 0.55; ctx.translate(-s * 0.55, -s * 0.05); ctx.scale(0.7, 0.7); drawLook(ctx, card.look, s, 0, 1.2, { moving: false, atk: 0 }); }
  }
  ctx.restore();
  // vignette
  ctx.fillStyle = rgrad(ctx, w / 2, h / 2, Math.max(w, h) * 0.75, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.45)']); ctx.fillRect(0, 0, w, h);
  ART.set(key, cv);
  return cv;
}
