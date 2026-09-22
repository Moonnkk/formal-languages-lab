/* Shell: hash router + lazy module loader.
   A module is a file in js/modules/ with a default export:
     { id, title, icon, blurb, mount(rootEl, ctx) -> optional cleanup fn }
   ctx = { store, srs, ui, go, curriculum } */
import { store } from './core/store.js';
import { srs } from './core/srs.js';
import * as ui from './core/ui.js';
import { curriculum } from '../data/curriculum.js';

const { h, clear, $ } = ui;

export const ROUTES = [
  { group: 'Start',      id: 'dashboard',  file: 'dashboard.js',   title: 'Dashboard',        icon: '◎' },
  { group: 'Start',      id: 'path',       file: 'path.js',        title: 'Learning Path',    icon: '⛰' },
  { group: 'Practice',   id: 'review',     file: 'flashcards.js',  title: 'Daily Review',     icon: '↻' },
  { group: 'Practice',   id: 'quiz',       file: 'quiz.js',        title: 'Quiz Arena',       icon: '✓' },
  { group: 'Practice',   id: 'feynman',    file: 'feynman.js',     title: 'Explain It Back',  icon: '✎' },
  { group: 'Labs',       id: 'regex',      file: 'regexlab.js',    title: 'Regex Lab',        icon: '∗' },
  { group: 'Labs',       id: 'automata',   file: 'automatonlab.js',title: 'Automaton Lab',    icon: '⟳' },
  { group: 'Labs',       id: 'grammar',    file: 'grammarlab.js',  title: 'Grammar Lab',      icon: '⊢' },
  { group: 'Labs',       id: 'parser',     file: 'parserlab.js',   title: 'Parser Lab',       icon: '⇄' },
  { group: 'Games',      id: 'pumping',    file: 'pumping.js',     title: 'Pumping Duel',     icon: '⚔' },
  { group: 'Games',      id: 'subset',     file: 'subsetgame.js',  title: 'Subset Race',      icon: '◆' },
  { group: 'Reference',  id: 'atlas',      file: 'atlas.js',       title: 'Concept Atlas',    icon: '☰' },
  { group: 'Reference',  id: 'settings',   file: 'settings.js',    title: 'Settings',         icon: '⚙' },
];

const ctx = { store, srs, ui, curriculum, go };
let cleanup = null;

export function go(id, params = '') {
  location.hash = '#/' + id + (params ? '?' + params : '');
}

async function render() {
  const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [id, qs] = raw.split('?');
  const route = ROUTES.find(r => r.id === id) || ROUTES[0];
  ctx.params = new URLSearchParams(qs || '');

  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.route === route.id));
  /* the mobile nav is a horizontal strip, so the current room can be off-screen */
  if (matchMedia('(max-width: 860px)').matches) {
    $('.nav-item.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  const main = $('#main');
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  clear(main);
  main.appendChild(h('div.center.faint', { style: { padding: '60px' } }, 'loading…'));

  try {
    const mod = (await import(`./modules/${route.file}`)).default;
    clear(main);
    const wrap = h('div.fade-in');
    main.appendChild(wrap);
    cleanup = mod.mount(wrap, ctx) || null;
    document.title = `${mod.title || route.title} · Formal Languages Lab`;
  } catch (err) {
    console.error(err);
    clear(main);
    main.appendChild(h('div.card',
      h('h2', 'This room is still under construction'),
      h('p.muted', `The “${route.title}” module could not be loaded.`),
      h('pre.small.faint', { style: { whiteSpace: 'pre-wrap' } }, String(err && err.message || err))));
  }
  main.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

function buildNav() {
  const bar = $('#sidebar');
  bar.appendChild(h('div.brand',
    h('div.brand-mark', 'FL'),
    h('div', h('div.brand-name', 'Formal Languages Lab'),
           h('div.brand-sub', 'Ströetmann · interactive'))));
  let group = null;
  for (const r of ROUTES) {
    if (r.group !== group) { group = r.group; bar.appendChild(h('div.nav-group', group)); }
    bar.appendChild(h('a.nav-item', {
      href: '#/' + r.id, 'data-route': r.id,
      /* Clicking the room you are already in should take you back to its start
         screen — otherwise there is no way out of a quiz or a duel mid-session,
         because setting an unchanged hash fires no hashchange event. */
      onclick: e => {
        const [cur] = location.hash.replace(/^#\/?/, '').split('?');
        if ((cur || 'dashboard') === r.id) { e.preventDefault(); render(); }
      },
    },
      h('span.ico', r.icon), h('span', r.title),
      r.id === 'review' ? h('span.badge', { id: 'due-badge', style: { display: 'none' } }, '0') : null));
  }
}

function updateDueBadge() {
  const badge = $('#due-badge');
  if (!badge) return;
  const n = Object.values(store.state.cards).filter(c => c.reps && c.due <= Date.now()).length;
  badge.textContent = n;
  badge.style.display = n ? '' : 'none';
}

function initTheme() {
  /* An explicit choice in Settings always wins. Otherwise respect whatever the
     host stamped on <html>, and fall back to the OS preference — a dark-default
     app that overrides a light-mode reader is just a bug with an opinion. */
  if (store.state.theme) { document.documentElement.dataset.theme = store.state.theme; return; }
  if (document.documentElement.dataset.theme) return;
  document.documentElement.dataset.theme =
    matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/* Global keyboard: 1-9 jump to nav items, ? shows help */
function keys(e) {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
  if (e.key === 'g') { go('dashboard'); }
}

buildNav();
initTheme();
store.onChange(updateDueBadge);
updateDueBadge();
addEventListener('hashchange', render);
addEventListener('keydown', keys);
render();
