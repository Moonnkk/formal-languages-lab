/* Daily Review — the spaced-repetition loop.
   Deliberately minimal: a prompt, a pause, a self-graded reveal. The pause is
   the whole mechanism. Recognising an answer feels like knowing it; producing
   one is the only thing that proves it, so the back stays hidden until asked. */
import { cards as ALL } from '../../data/cards.js';
import { GRADES } from '../core/srs.js';

const byConcept = id => ALL.filter(c => c.concept === id);

export default {
  id: 'review',
  title: 'Daily Review',

  mount(root, { store, srs, ui, curriculum, go, params }) {
    const { h, clear, tex, toast, ring, shuffle } = ui;
    ui.loadCss('css/modules/core.css');

    const only = params?.get('concept');
    const pool = only ? byConcept(only) : ALL;
    const ids = pool.map(c => c.id);
    const byId = Object.fromEntries(ALL.map(c => [c.id, c]));

    let queue = [], cur = null, revealed = false;
    let done = 0, right = 0, started = false;

    const view = h('div');
    root.appendChild(view);

    /* ---------------- start screen ---------------- */
    function intro() {
      const s = srs.stats(ids);
      clear(view);
      view.appendChild(ui.pageHead(
        only ? curriculum.byId[only]?.title || only : 'Spaced repetition',
        'Daily Review',
        'Your memory decays exponentially. The cheapest fix known is to test yourself just before you would have forgotten — so these cards come back on a schedule that stretches every time you get one right.'));

      view.appendChild(h('div.grid.c3',
        stat('Due now', s.due, 'var(--bad)'),
        stat('New', s.neu, 'var(--accent)'),
        stat('Learning', s.learning, 'var(--warn)'),
        stat('Mature', s.mature, 'var(--good)')));

      const q = srs.queue(ids);
      view.appendChild(h('div.card', { style: { marginTop: '16px' } },
        h('div.row',
          h('div',
            h('h2', q.length ? `${q.length} cards queued` : 'Nothing due — you are ahead'),
            h('p.muted.small', { style:{margin:0} }, q.length
              ? 'Grade yourself honestly. "Hard" is not a failure; it is the signal that keeps the card close.'
              : 'Come back tomorrow, or drill a specific concept below. Studying a card that is not due yet buys you very little.')),
          h('span.spacer'),
          h('button.btn-primary', { onclick: () => start(q), disabled: !q.length },
            q.length ? 'Start review' : 'All clear')),
      ));

      if (!q.length && ids.length) {
        view.appendChild(h('div.row', { style: { marginTop: '12px' } },
          h('button.btn-ghost.btn-sm', { onclick: () => start(shuffle(ids).slice(0, 15)) },
            'Free practice anyway (15 random, unscheduled)')));
      }

      /* per-concept breakdown */
      const rows = curriculum.concepts
        .map(c => ({ c, n: byConcept(c.id).length, s: srs.stats(byConcept(c.id).map(x => x.id)) }))
        .filter(r => r.n);
      view.appendChild(h('h3', { style: { marginTop: '28px' } }, 'By concept'));
      view.appendChild(h('div.deck-grid', rows.map(({ c, n, s }) =>
        h('div.deck-chip', { onclick: () => go('review', 'concept=' + c.id) },
          h('div.row', h('strong.small', c.title), h('span.spacer'),
            h('span.tag' + (s.due ? '.bad' : s.neu === n ? '' : '.good'), s.due ? `${s.due} due` : s.neu === n ? `${n} new` : 'ok')),
          h('div.bar', { style: { marginTop: '6px' } },
            h('i', { style: { width: Math.round(store.mastery(c.id) * 100) + '%' } }))))));
    }

    function stat(label, n, color) {
      return h('div.card.stat',
        h('div.stat-n', { style: { color } }, String(n)),
        h('div.faint.small', label));
    }

    /* ---------------- review loop ---------------- */
    function start(q) {
      queue = [...q]; done = 0; right = 0; started = true;
      next();
    }

    function next() {
      if (!queue.length) return summary();
      cur = byId[queue[0]];
      revealed = false;
      draw();
    }

    function draw() {
      clear(view);
      const total = done + queue.length;
      view.appendChild(h('div.review-top',
        h('div.bar', { style: { flex: '1' } },
          h('i', { style: { width: (done / Math.max(1, total) * 100) + '%' } })),
        h('span.faint.small', `${done}/${total}`),
        h('button.btn-ghost.btn-sm', { onclick: summary }, 'End')));

      const c = cur;
      const concept = curriculum.byId[c.concept];
      const card = h('div.card.flashcard',
        h('div.row',
          h('span.tag.accent', concept?.title || c.concept),
          h('span.tag', c.kind === 'why' ? 'understanding' : c.kind === 'apply' ? 'apply it' : 'recall'),
          h('span.spacer'),
          h('span.faint.small', srs.humanDue(c.id))),
        h('div.fc-front', { html: tex(c.front) }));

      if (!revealed) {
        card.appendChild(h('div.fc-actions',
          c.hint ? h('button.btn-ghost.btn-sm', {
            onclick: e => { e.target.replaceWith(h('div.callout.warn.small', { html: tex(c.hint) })); }
          }, 'I am stuck — nudge me') : null,
          h('span.spacer'),
          h('button.btn-primary', { onclick: () => { revealed = true; draw(); } },
            'Show answer  ', h('span.kbd', 'space'))));
        card.appendChild(h('p.faint.small.center', { style: { marginTop: '14px' } },
          'Say the answer out loud first. Reading it and recognising it is not the same as knowing it.'));
      } else {
        card.appendChild(h('div.fc-back', { html: tex(c.back) }));
        card.appendChild(h('div.fc-grades',
          GRADES.map((g, i) => h('button' + (g.cls ? '.' + g.cls : ''), {
            onclick: () => grade(g.g),
          }, h('span.kbd', String(i + 1)), ' ', g.label,
             h('span.faint.small.gh', g.hint)))));
      }
      view.appendChild(card);
    }

    function grade(g) {
      const c = cur;
      srs.review(c.id, g);
      store.record(c.concept, g >= 3, g >= 4 ? 2 : 1);
      done++; if (g >= 3) right++;
      queue.shift();
      if (g < 3) queue.splice(Math.min(queue.length, 3), 0, c.id);  // bring it back soon
      next();
    }

    function summary() {
      started = false;
      if (done) store.logSession('review', right, done);
      clear(view);
      const pct = done ? Math.round(right / done * 100) : 0;
      view.appendChild(h('div.card.center', { style: { padding: '40px' } },
        h('div', { html: ring(done ? right / done : 0, 96, 9, 'var(--good)') }),
        h('h2', { style: { marginTop: '12px' } }, done ? `${right} / ${done} recalled` : 'Session ended'),
        h('p.muted', done
          ? (pct >= 85
             ? 'Comfortable. The intervals just stretched — you will see these again much later.'
             : pct >= 60
             ? 'This is roughly the right difficulty. Struggling a little is what makes the memory stick.'
             : 'Rough round. That is information, not failure — these cards are now scheduled tight.')
          : 'Nothing graded.'),
        h('div.row', { style: { justifyContent: 'center', marginTop: '16px' } },
          h('button.btn-primary', { onclick: intro }, 'Back to deck'),
          h('button.btn-ghost', { onclick: () => go('quiz') }, 'Switch to Quiz Arena'))));
    }

    /* ---------------- keyboard ---------------- */
    function onKey(e) {
      if (!started || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); revealed = true; draw(); }
      else if (revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); grade(GRADES[+e.key - 1].g); }
    }
    addEventListener('keydown', onKey);

    intro();
    return () => removeEventListener('keydown', onKey);
  },
};
