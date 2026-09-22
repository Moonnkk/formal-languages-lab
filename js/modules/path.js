/* Learning Path — the climb.
   Concepts are gated by their prerequisites, not by chapter order, because the
   dependency graph is the real structure of this subject. Each stop is a short
   loop: predict -> read one screen -> retrieve -> go practise it somewhere real. */

async function tryImport(path, key, fallback) {
  try { return (await import(path))[key] ?? fallback; } catch { return fallback; }
}

/* Which lab actually practises which concept. */
const LABS = {
  'regex-syntax': ['regex', 'Regex Lab'], 'regex-sem': ['regex', 'Regex Lab'],
  'regex-algebra': ['regex', 'Regex Lab'], 'concat': ['regex', 'Regex Lab'],
  'thompson': ['regex', 'Regex Lab'], 'scanner': ['regex', 'Regex Lab'],
  'dfa': ['automata', 'Automaton Lab'], 'dfa-run': ['automata', 'Automaton Lab'],
  'nfa': ['automata', 'Automaton Lab'], 'eclosure': ['subset', 'Subset Race'],
  'subset': ['automata', 'Automaton Lab'], 'minimize': ['automata', 'Automaton Lab'],
  'closure-props': ['automata', 'Automaton Lab'], 'product': ['automata', 'Automaton Lab'],
  'emptiness': ['regex', 'Regex Lab'],
  'pumping': ['pumping', 'Pumping Duel'], 'nonregular': ['pumping', 'Pumping Duel'],
  'cfg': ['grammar', 'Grammar Lab'], 'derivation': ['grammar', 'Grammar Lab'],
  'parse-tree': ['grammar', 'Grammar Lab'], 'ambiguity': ['grammar', 'Grammar Lab'],
  'precedence': ['grammar', 'Grammar Lab'], 'topdown': ['grammar', 'Grammar Lab'],
  'follow': ['grammar', 'Grammar Lab'],
  'earley': ['parser', 'Parser Lab'], 'shiftreduce': ['parser', 'Parser Lab'],
  'lr-items': ['parser', 'Parser Lab'], 'slr': ['parser', 'Parser Lab'],
  'conflicts': ['parser', 'Parser Lab'],
};

export default {
  id: 'path',
  title: 'Learning Path',

  mount(root, { store, srs, ui, curriculum, go, params }) {
    const { h, clear, tex, shuffle, toast } = ui;
    ui.loadCss('css/modules/core.css');

    const M = id => store.mastery(id);
    const GATE = 0.45;
    const view = h('div');
    root.appendChild(view);

    const focus = params?.get('concept');
    focus && curriculum.byId[focus] ? detail(curriculum.byId[focus]) : overview(params?.get('unit'));

    /* ------------------------------------------------ overview */
    function overview(unitFilter) {
      clear(view);
      view.appendChild(ui.pageHead('Prerequisite order', 'Learning Path',
        'Ordered by what depends on what, not by page number. A stop unlocks when its prerequisites are at least half-solid — and you are allowed to walk ahead anyway, it will just be harder.'));

      const units = unitFilter ? curriculum.units.filter(u => u.id === unitFilter) : curriculum.units;
      if (unitFilter) view.appendChild(h('div.row', { style: { marginBottom: '12px' } },
        h('button.btn-ghost.btn-sm', { onclick: () => go('path') }, '← all units')));

      for (const u of units) {
        const cs = curriculum.conceptsOfUnit(u.id);
        view.appendChild(h('div.unit-head',
          h('span.tag.accent', 'Ch ' + u.ch),
          h('h2', { style: { margin: 0 } }, u.title)));
        view.appendChild(h('p.muted.small', u.blurb));
        view.appendChild(h('div.path-track', cs.map(c => node(c))));
      }
    }

    function node(c) {
      const m = M(c.id);
      const locked = (c.prereq || []).some(p => M(p) < GATE);
      const state = m >= 0.6 ? 'solid' : m > 0 ? 'started' : locked ? 'locked' : 'open';
      return h('div.path-node.' + state, { onclick: () => detail(c) },
        h('div.pn-dot', h('span', m >= 0.6 ? '✓' : locked ? '🔒' : String(c.level))),
        h('div.pn-body',
          h('div.row', h('strong', c.title), h('span.spacer'),
            h('span.tag' + (m >= .6 ? '.good' : m > 0 ? '.warn' : ''), Math.round(m * 100) + '%')),
          h('div.small.muted', { html: tex(c.one) }),
          locked ? h('div.faint.small', { style: { marginTop: '4px' } },
            'needs ' + c.prereq.filter(p => M(p) < GATE).map(p => curriculum.byId[p]?.title).join(', ')) : null));
    }

    /* ------------------------------------------------ one concept */
    async function detail(c) {
      clear(view);
      const cards = await tryImport('../../data/cards.js', 'cards', []);
      const qs = await tryImport('../../data/quiz.js', 'questions', []);
      const mine = cards.filter(x => x.concept === c.id);
      const myQ = qs.filter(x => x.concept === c.id);
      const lab = LABS[c.id];
      const deps = curriculum.concepts.filter(x => (x.prereq || []).includes(c.id));

      view.appendChild(h('div.row', { style: { marginBottom: '12px' } },
        h('button.btn-ghost.btn-sm', { onclick: () => overview() }, '← path')));
      view.appendChild(ui.pageHead(
        curriculum.units.find(u => u.id === c.unit)?.title,
        c.title,
        c.one));

      /* 1. PREDICT — before any exposition. The generation effect: guessing wrong
            and then being corrected beats reading the right answer cold. */
      const predictBox = h('div.card.predict',
        h('div.eyebrow', 'Step 1 — before you read anything'),
        h('h3', 'What do you already think this means?'),
        h('p.small.muted', 'One sentence, from memory, even if it is wrong. Especially if it is wrong — a corrected guess sticks far better than a fact you simply read.'),
        h('textarea', { rows: 3, placeholder: 'My current guess…', id: 'guess' }),
        h('div.row', { style: { marginTop: '8px' } },
          h('button.btn-primary', {
            onclick: e => {
              const t = view.querySelector('#guess').value.trim();
              store.flag('guess:' + c.id, t);
              e.target.closest('.predict').classList.add('answered');
              revealBox.style.display = '';
              revealBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 'Lock in my guess and reveal'),
          h('button.btn-ghost.btn-sm', { onclick: () => { revealBox.style.display = ''; } },
            'Skip (I have seen this before)')));
      const prev = store.flag('guess:' + c.id);
      if (prev) predictBox.querySelector('textarea').value = prev;
      view.appendChild(predictBox);

      /* 2. The one-screen version. Deliberately short — the lecture notes are the
            long version and they already exist. */
      const revealBox = h('div', { style: { display: prev ? '' : 'none' } });
      view.appendChild(revealBox);

      revealBox.appendChild(h('div.card',
        h('div.eyebrow', 'Step 2 — the one-screen version'),
        h('h3', 'In short'),
        h('p', { html: tex(c.one) }),
        c.prereq?.length ? h('p.small.muted', { html:
          'Rests on: ' + c.prereq.map(p => `<a href="#/path?concept=${p}">${ui.esc(curriculum.byId[p]?.title || p)}</a>`).join(', ') }) : null,
        deps.length ? h('p.small.muted', { html:
          'Everything downstream: ' + deps.map(p => `<a href="#/path?concept=${p.id}">${ui.esc(p.title)}</a>`).join(', ') }) : null,
        h('p.small.faint', 'The full treatment is in the lecture notes — this app deliberately does not reproduce them. Reading is not the bottleneck; recall is.')));

      /* 3. Retrieve. */
      revealBox.appendChild(h('div.card',
        h('div.eyebrow', 'Step 3 — now be tested on it'),
        h('div.row',
          h('div', h('h3', { style: { margin: 0 } }, 'Practice this concept'),
            h('span.faint.small', `${mine.length} cards · ${myQ.length} questions`)),
          h('span.spacer')),
        h('div.row', { style: { marginTop: '10px' } },
          mine.length ? h('button.btn-primary', { onclick: () => go('review', 'concept=' + c.id) }, 'Drill the cards') : null,
          myQ.length ? h('button', { onclick: () => go('quiz', 'concept=' + c.id) }, 'Quiz me') : null,
          lab ? h('button', { onclick: () => go(lab[0]) }, 'Run it in the ' + lab[1]) : null,
          h('button.btn-ghost', { onclick: () => go('feynman', 'concept=' + c.id) }, 'Explain it back'))));

      /* 4. Their own words, over time. */
      const note = store.state.notes[c.id] || '';
      const ta = h('textarea', { rows: 4, placeholder: 'After practising: how would you explain this to a classmate?' });
      ta.value = note;
      revealBox.appendChild(h('div.card',
        h('div.eyebrow', 'Step 4 — keep'),
        h('h3', 'Your own words'),
        h('p.small.muted', 'This is the note you will re-read the night before the exam. Write it after you have practised, not before.'),
        ta,
        h('div.row', { style: { marginTop: '8px' } },
          h('button', { onclick: () => { store.state.notes[c.id] = ta.value; store.save(); toast('Saved', 'good'); } }, 'Save note'),
          prev ? h('span.faint.small', 'Your first guess was: “' + prev + '”') : null)));
    }
  },
};
