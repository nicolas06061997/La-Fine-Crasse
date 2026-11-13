// Petits outils pour fabriquer l'interface (HTML) sans framework.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

let toastT = 0;
export function toast(msg, kind = '') {
  let el = $('#toast');
  if (!el) { el = h('div', { id: 'toast' }); document.body.append(el); }
  el.textContent = msg; el.className = 'show ' + kind;
  clearTimeout(toastT); toastT = setTimeout(() => { el.className = ''; }, 1800);
}

// Feuille qui monte du bas de l'écran (détails d'une carte, choix du mode…)
export function sheet(content, { onClose } = {}) {
  const back = h('div', { class: 'sheet-back' });
  const box = h('div', { class: 'sheet' }, h('div', { class: 'sheet-grip' }), content);
  const close = () => { back.classList.remove('on'); setTimeout(() => back.remove(), 220); onClose && onClose(); };
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  back.append(box); document.body.append(back);
  requestAnimationFrame(() => back.classList.add('on'));
  return { close, box };
}

export function confirmBox(text, yes, no = 'Annuler') {
  return new Promise(res => {
    const s = sheet(h('div', { class: 'confirm' }, h('p', {}, text),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => { s.close(); res(false); } }, no),
        h('button', { class: 'btn red', onclick: () => { s.close(); res(true); } }, yes))));
  });
}
