// MYTHORIA — création du moteur de rendu WebGL avec des réglages adaptés aux téléphones.
import * as THREE from 'three';

export function quality() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  return { mobile, low: mobile && cores <= 4, dpr: Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2) };
}

export function createRenderer(canvas, { alpha = false } = {}) {
  const q = quality();
  const r = new THREE.WebGLRenderer({ canvas, antialias: !q.low, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(q.low ? Math.min(q.dpr, 1.25) : q.dpr);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
