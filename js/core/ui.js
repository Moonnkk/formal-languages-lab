/* Tiny DOM helpers. No framework: modules render strings or build nodes. */

/** h('div.card', {onclick}, ...children) */
export function h(spec, props = null, ...kids) {
  const [tagAndId, ...classes] = String(spec).split('.');
  const [tag, id] = tagAndId.split('#');
  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  if (props && (props.nodeType || Array.isArray(props) || typeof props !== 'object')) { kids.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className += ' ' + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const k of kids.flat(9)) {
    if (k == null || k === false) continue;
    el.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export function toast(msg, kind = '') {
  const box = $('#toasts') || document.body.appendChild(h('div#toasts'));
  const t = h('div.toast' + (kind ? '.' + kind : ''), { text: msg });
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 2600);
}

/** Renders a subset of LaTeX-ish notation to HTML without pulling in KaTeX.
    Supports: $...$ inline, ^{..} _{..} ^x _x, \epsilon \Sigma \delta \to \in
    \cup \cap \subseteq \emptyset \Rightarrow \vdash \alpha \beta \gamma \ldots */
const SYM = {
  '\\epsilon':'ε','\\varepsilon':'ε','\\Sigma':'Σ','\\sigma':'σ','\\delta':'δ','\\Delta':'Δ',
  '\\to':'→','\\rightarrow':'→','\\Rightarrow':'⇒','\\Leftarrow':'⇐','\\leftarrow':'←',
  '\\in':'∈','\\notin':'∉','\\cup':'∪','\\cap':'∩','\\subseteq':'⊆','\\subset':'⊂',
  '\\emptyset':'∅','\\varnothing':'∅','\\vdash':'⊢','\\models':'⊨','\\equiv':'≡',
  '\\alpha':'α','\\beta':'β','\\gamma':'γ','\\lambda':'λ','\\mu':'μ','\\pi':'π','\\rho':'ρ',
  '\\tau':'τ','\\phi':'φ','\\omega':'ω','\\Omega':'Ω','\\ldots':'…','\\cdots':'⋯','\\cdot':'·',
  '\\times':'×','\\le':'≤','\\ge':'≥','\\neq':'≠','\\mid':'∣','\\forall':'∀','\\exists':'∃',
  '\\land':'∧','\\lor':'∨','\\lnot':'¬','\\star':'⋆','\\circ':'∘','\\mapsto':'↦','\\N':'ℕ',
  '\\varnothing':'∅','\\backslash':'\\','\\{':'{','\\}':'}','\\,':' ','\;':' ','\\ ':' ',
  /* added after auditing every macro the content banks actually use */
  '\\langle':'⟨','\\rangle':'⟩','\\bullet':'•','\\leq':'≤','\\geq':'≥','\\ne':'≠',
  '\\doteq':'≐','\\setminus':'\\','\\subsetneq':'⊊','\\supseteq':'⊇','\\supset':'⊃',
  '\\bigcup':'⋃','\\bigcap':'⋂','\\uplus':'⊎','\\leadsto':'⇝','\\sim':'∼',
  '\\leftrightarrow':'↔','\\Leftrightarrow':'⇔','\\longrightarrow':'⟶','\\Gamma':'Γ',
  '\\square':'□','\\Box':'□','\\not':'¬','\\max':'max','\\min':'min','\\log':'log',
  '\\infty':'∞','\\sum':'∑','\\prod':'∏','\\ast':'∗','\\prime':'′','\\dots':'…',
  '\\vdots':'⋮','\\nmid':'∤','\\ni':'∋','\\perp':'⊥','\\top':'⊤',
  '\\quad':'  ','\\qquad':'    ','\\:':' ','\\%':'%','\\&':'&','\\#':'#',
};
export function tex(src) {
  if (src == null) return '';
  let s = esc(String(src));
  /* `texttt` must precede `text` in this alternation, or \texttt{x} matches
     the shorter name and then fails on the following `tt{`. */
  s = s.replace(/\\(?:mathcal|mathbb|mathrm|texttt|textsl|textsf|textbf|textit|text|mathtt|mathsf|mathbf|mathit|mbox|operatorname)\{([^}]*)\}/g, '$1');
  /* accents become combining characters, so they sit on the glyph itself */
  s = s.replace(/\\(?:wide)?hat\{([^}]*)\}/g, '$1\u0302')
       .replace(/\\(?:wide)?hat\s*(\\[a-zA-Z]+|\w)/g, '$1\u0302');
  s = s.replace(/\\overline\{([^}]*)\}/g, '$1\u0304');
  s = s.replace(/\\(?:bigl|bigr|Bigl|Bigr|left|right)\b\s*/g, '');
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  s = s.replace(/\\[a-zA-Z]+|\\[{},; ]/g, m => SYM[m] ?? m);
  s = s.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>').replace(/\^(\w|\*|\+)/g, '<sup>$1</sup>');
  s = s.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/_(\w)/g, '<sub>$1</sub>');
  s = s.replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(\[])\*([^*\n]+)\*(?=[\s.,;:)\]!?]|$)/g, '$1<em>$2</em>');
  return s;
}

/** Shuffle (Fisher-Yates), optionally seeded for reproducible practice sets. */
export function shuffle(arr, seed = null) {
  const a = [...arr];
  let rnd = seed == null ? Math.random : mulberry(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function mulberry(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Progress ring svg, 0..1 */
export function ring(v, size = 46, stroke = 5, color = 'var(--accent)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-sunken)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}"
      style="transition:stroke-dashoffset .5s"/></svg>`;
}

/** Inject a module stylesheet once. Call at the top of mount(). */
const loaded = new Set();
export function loadCss(href) {
  if (loaded.has(href)) return;
  loaded.add(href);
  document.head.appendChild(h('link', { rel: 'stylesheet', href }));
}

/** Standard page header for a module. */
export function pageHead(eyebrow, title, lede) {
  return h('header.page-head',
    eyebrow ? h('div.eyebrow', eyebrow) : null,
    h('h1', title),
    lede ? h('p.lede', { html: tex(lede) }) : null);
}
