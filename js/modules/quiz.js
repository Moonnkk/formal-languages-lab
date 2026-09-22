/* Quiz Arena — multiple choice where the distractors do the teaching.
   Every wrong option in data/quiz.js encodes a specific, nameable misconception
   and carries its own diagnosis. So the feedback screen is the point of the
   module, not a formality: it never auto-advances, because the two seconds
   after being wrong are the only moment the correction actually lands. */
import { questions as ALL } from '../../data/quiz.js';

const MODES = [
  { id: 'mixed', label: 'Interleaved mix', icon: '⁂',
    blurb: 'Topics shuffled together. Harder than studying one chapter at a time, and that is exactly why it works — you have to pick the method, not just apply the obvious one.' },
  { id: 'weak', label: 'Weak spots', icon: '⚠',
    blurb: 'Drawn from the concepts where your mastery estimate is lowest. Uncomfortable by design.' },
  { id: 'unit', label: 'By unit', icon: '▤',
    blurb: 'One block of the syllabus. Good when a chapter is genuinely new; bad as your only mode.' },
  { id: 'new', label: 'Never seen', icon: '✦',
    blurb: 'Questions you have not been asked before.' },
];

export default {
  id: 'quiz',
  title: 'Quiz Arena',

  mount(root, { store, ui, curriculum, go, params }) {
    const { h, clear, tex, toast, shuffle, ring } = ui;
    ui.loadCss('css/modules/practice.css');

    const view = h('div');
    root.appendChild(view);

    let set = [], i = 0, chosen = null, correctCount = 0;
    const answered = [];
    let running = false;

    const seenBefore = q => (store.state.quiz[q.id]?.attempts || 0) > 0;

    const focusConcept = params?.get('concept');
    const focusUnit = params?.get('unit');
    if (focusConcept) startSet(ALL.filter(q => q.concept === focusConcept), 'concept:' + focusConcept);
    else if (focusUnit) startSet(pickUnit(focusUnit), 'unit:' + focusUnit);
    else picker();

    function pickUnit(u) {
      const ids = new Set(curriculum.conceptsOfUnit(u).map(c => c.id));
      return ALL.filter(q => ids.has(q.concept));
    }

    /* ------------------------------------------------------- picker ---- */
    function picker() {
      running = false;
      clear(view);
      view.appendChild(ui.pageHead('Retrieval practice', 'Quiz Arena',
        'Every wrong answer here has a name. The options are not padding — each one is a mistake people actually make, and picking it tells you which one you are making.'));

      const grid = h('div.grid.c2');
      for (const m of MODES) {
        grid.appendChild(h('div.card.mode-card', { onclick: () => choose(m) },
          h('div.row', h('span.mode-ico', m.icon), h('strong', m.label),
            m.id === 'mixed' ? h('span.tag.accent', 'recommended') : null),
          h('p.small.muted', { style: { margin: '8px 0 0' } }, m.blurb)));
      }
      view.appendChild(grid);

      /* per-concept accuracy so far */
      const rows = curriculum.concepts
        .map(c => ({ c, qs: ALL.filter(q => q.concept === c.id) }))
        .filter(r => r.qs.length);
      view.appendChild(h('h3', { style: { marginTop: '28px' } }, 'Jump to a concept'));
      view.appendChild(h('div.qconcepts', rows.map(({ c, qs }) => {
        const m = store.mastery(c.id);
        return h('button.qchip' + (m >= .6 ? '.good' : m > 0 ? '.warn' : ''),
          { onclick: () => startSet(qs, 'concept:' + c.id) },
          c.title, h('span.qchip-n', String(qs.length)));
      })));

      view.appendChild(h('p.faint.small', { style: { marginTop: '20px' } },
        `${ALL.length} questions in the bank, covering ${new Set(ALL.map(q => q.concept)).size} concepts.`));
    }

    function choose(mode) {
      if (mode.id === 'mixed') return startSet(shuffle(ALL).slice(0, 15), 'mixed');
      if (mode.id === 'new') {
        const fresh = ALL.filter(q => !seenBefore(q));
        if (!fresh.length) { toast('You have seen every question at least once', 'good'); return; }
        return startSet(shuffle(fresh).slice(0, 15), 'new');
      }
      if (mode.id === 'weak') {
        const ranked = [...curriculum.concepts].sort((a, b) => store.mastery(a.id) - store.mastery(b.id));
        const weakIds = new Set(ranked.slice(0, 6).map(c => c.id));
        return startSet(shuffle(ALL.filter(q => weakIds.has(q.concept))).slice(0, 15), 'weak');
      }
      /* unit: show a second step */
      clear(view);
      view.appendChild(h('div.row', { style: { marginBottom: '12px' } },
        h('button.btn-ghost.btn-sm', { onclick: picker }, '← modes')));
      view.appendChild(ui.pageHead('By unit', 'Pick a block', null));
      view.appendChild(h('div.grid.c2', curriculum.units.map(u => {
        const qs = pickUnit(u.id);
        return h('div.card.mode-card', { onclick: () => qs.length && startSet(shuffle(qs).slice(0, 15), 'unit:' + u.id) },
          h('div.row', h('span.tag.accent', 'Ch ' + u.ch), h('strong', u.title), h('span.spacer'),
            h('span.faint.small', qs.length + ' q')),
          h('p.small.muted', { style: { margin: '8px 0 0' } }, u.blurb));
      })));
    }

    /* -------------------------------------------------------- session -- */
    function startSet(qs, kind) {
      if (!qs || !qs.length) { toast('No questions for that selection', 'bad'); return picker(); }
      set = shuffle(qs).slice(0, 15).map(q => {
        /* shuffle the options but remember where each one came from, so the
           per-distractor diagnoses still line up after the shuffle */
        const order = shuffle(q.choices.map((_, k) => k));
        return { q, order, answerPos: order.indexOf(q.answer) };
      });
      i = 0; chosen = null; correctCount = 0; answered.length = 0;
      running = true;
      setKind = kind;
      draw();
    }
    let setKind = 'mixed';

    function draw() {
      clear(view);
      const item = set[i];
      const { q, order, answerPos } = item;
      const concept = curriculum.byId[q.concept];

      view.appendChild(h('div.review-top',
        h('div.bar', { style: { flex: '1' } },
          h('i', { style: { width: (i / set.length * 100) + '%' } })),
        h('span.faint.small', `${i + 1}/${set.length}`),
        h('button.btn-ghost.btn-sm', { onclick: summary }, 'End')));

      const card = h('div.card.qcard',
        h('div.row',
          h('span.tag.accent', concept?.title || q.concept),
          h('span.tag', ['', 'recall', 'apply', 'reason'][q.level] || 'recall'),
          h('span.spacer'),
          h('span.faint.small', 'score ' + correctCount + '/' + i)),
        h('div.qstem', { html: tex(q.stem) }));

      const opts = h('div.qopts');
      order.forEach((origIdx, pos) => {
        const isAnswer = pos === answerPos;
        const isChosen = chosen === pos;
        let cls = '.qopt';
        if (chosen !== null) {
          if (isAnswer) cls += '.right';
          else if (isChosen) cls += '.wrong';
          else cls += '.faded';
        }
        opts.appendChild(h('button' + cls, {
          onclick: () => answer(pos),
          disabled: chosen !== null,
        },
          h('span.qkey', String(pos + 1)),
          h('span.qtext', { html: tex(q.choices[origIdx]) }),
          chosen !== null && isAnswer ? h('span.qmark.ok', '✓') : null,
          chosen !== null && isChosen && !isAnswer ? h('span.qmark.no', '✗') : null));
      });
      card.appendChild(opts);

      if (chosen === null) {
        card.appendChild(h('p.faint.small', { style: { marginTop: '14px' } },
          'Commit to an answer before you look for hints. Guessing and being corrected beats reading the right answer cold.'));
      } else {
        const gotIt = chosen === answerPos;
        const origChosen = order[chosen];
        const diagnosis = q.why?.[origChosen] ?? q.why?.[String(origChosen)];

        const fb = h('div.qfeedback');
        if (gotIt) {
          fb.appendChild(h('div.callout.good',
            h('strong', 'Correct. '), h('span', { html: tex(q.explain || '') })));
        } else {
          fb.appendChild(h('div.callout.bad',
            h('strong', 'Not quite — and here is the specific mistake: '),
            h('span', { html: tex(diagnosis || 'That option does not match the definition.') })));
          fb.appendChild(h('div.callout.good', { style: { marginTop: '10px' } },
            h('strong', 'The answer: '), h('span', { html: tex(q.explain || q.choices[q.answer]) })));
        }
        card.appendChild(fb);
        card.appendChild(h('div.row', { style: { marginTop: '16px' } },
          h('button.btn-primary', { onclick: next },
            i + 1 < set.length ? 'Next question' : 'See results', ' ', h('span.kbd', '↵')),
          concept ? h('button.btn-ghost.btn-sm', { onclick: () => go('path', 'concept=' + concept.id) },
            'Read up on ' + concept.title) : null));
      }
      view.appendChild(card);

      if (chosen === null) {
        view.appendChild(h('p.faint.small.center', { style: { marginTop: '10px' } },
          'Keys ', h('span.kbd', '1'), '–', h('span.kbd', '4'), ' to answer, ',
          h('span.kbd', '↵'), ' to continue'));
      }
    }

    function answer(pos) {
      if (chosen !== null) return;
      chosen = pos;
      const item = set[i];
      const ok = pos === item.answerPos;
      if (ok) correctCount++;
      answered.push({ q: item.q, ok });

      const rec = (store.state.quiz[item.q.id] ||= { attempts: 0, correct: 0 });
      rec.attempts++; if (ok) rec.correct++;
      store.record(item.q.concept, ok, item.q.level || 1);
      draw();
    }

    function next() {
      if (i + 1 >= set.length) return summary();
      i++; chosen = null; draw();
    }

    function summary() {
      running = false;
      const n = answered.length;
      if (n) store.logSession('quiz', correctCount, n);
      clear(view);

      const pct = n ? Math.round(correctCount / n * 100) : 0;
      /* which concepts actually went badly in this session */
      const perConcept = {};
      for (const a of answered) {
        const c = (perConcept[a.q.concept] ||= { ok: 0, n: 0 });
        c.n++; if (a.ok) c.ok++;
      }
      const shaky = Object.entries(perConcept)
        .filter(([, v]) => v.ok / v.n < 0.7)
        .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
        .slice(0, 3);

      view.appendChild(h('div.card.center', { style: { padding: '36px' } },
        h('div', { html: ring(n ? correctCount / n : 0, 96, 9,
          pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)') }),
        h('h2', { style: { marginTop: '12px' } }, n ? `${correctCount} / ${n}` : 'Session ended'),
        h('p.muted', n
          ? (pct >= 85 ? 'Strong. Push into a harder mode or take a Pumping Duel.'
           : pct >= 60 ? 'A normal score for material you are still consolidating. The misses are the useful part — did you read the diagnoses?'
           : 'Low, which usually means the underlying definitions are not solid yet. Cards before quiz for these concepts.')
          : 'Nothing answered.')));

      if (shaky.length) {
        view.appendChild(h('h3', { style: { marginTop: '24px' } }, 'Still shaky'));
        view.appendChild(h('div.grid.c3', shaky.map(([cid, v]) => {
          const c = curriculum.byId[cid];
          return h('div.card',
            h('div.row', h('strong.small', c?.title || cid), h('span.spacer'),
              h('span.tag.bad', `${v.ok}/${v.n}`)),
            h('div.row', { style: { marginTop: '10px' } },
              h('button.btn-sm', { onclick: () => startSet(ALL.filter(q => q.concept === cid), 'concept:' + cid) }, 'Retry'),
              h('button.btn-sm.btn-ghost', { onclick: () => go('review', 'concept=' + cid) }, 'Cards')));
        })));
      }

      view.appendChild(h('div.row', { style: { justifyContent: 'center', marginTop: '20px' } },
        h('button.btn-primary', { onclick: picker }, 'New session'),
        h('button.btn-ghost', { onclick: () => go('feynman') }, 'Explain one in your own words')));
    }

    /* ------------------------------------------------------ keyboard --- */
    function onKey(e) {
      if (!running || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const item = set[i];
      if (!item) return;
      if (chosen === null && /^[1-9]$/.test(e.key)) {
        const pos = +e.key - 1;
        if (pos < item.order.length) { e.preventDefault(); answer(pos); }
      } else if (chosen !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); next();
      }
    }
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  },
};
