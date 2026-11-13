// MYTHORIA — point d'entrée du jeu dans le navigateur.
import { startApp } from './ui/app.js';

const APPV = document.documentElement.dataset.version || 'dev';
startApp(document.getElementById('app'), APPV);
const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); setTimeout(() => sp.remove(), 500); }

// Mises à jour : on compare la version affichée à version.json (jamais en cache).
let swReg = null;
async function checkUpdate(manual) {
  try {
    const r = await fetch('version.json?' + Date.now(), { cache: 'no-store' });
    const j = r.ok ? await r.json() : null;
    if (!j || !j.v || j.v === APPV) { if (manual) toast('Le jeu est à jour ✓'); return; }
    const bar = document.getElementById('upd');
    bar.querySelector('small').textContent = j.notes || '';
    bar.classList.add('on');
  } catch (e) { if (manual) toast('Pas de connexion'); }
}
function toast(m) { import('./ui/dom.js').then(d => d.toast(m)); }
window.__checkUpdate = checkUpdate;
document.getElementById('updBtn').addEventListener('click', async () => {
  try { if (swReg) await swReg.update(); } catch (e) {}
  location.reload();
});
setTimeout(checkUpdate, 4000);
setInterval(checkUpdate, 5 * 60 * 1000);
if ('serviceWorker' in navigator) addEventListener('load', () => {
  navigator.serviceWorker.register('sw.js?v=' + APPV).then(r => { swReg = r; }).catch(() => {});
});
