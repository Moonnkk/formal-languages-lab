/* Dashboard — "what should I do in the next 20 minutes?"
   Not a trophy cabinet. Every panel ends in a button. */

async function tryImport(path, key, fallback) {
  try { return (await import(path))[key] ?? fallback; } catch { return fallback; }
}

export default {
  id: 'dashboard',
  title: 'Dashboard',

  mount(root, { store, srs, ui, curriculum, go }) {
    const { h, clear, tex, ring } = ui;
    ui.loadCss('css/modules/core.css');

    const view = h('div');
    root.appendChild(view);
    render();

    async function render() {
      const cards = await tryImport('../../data/cards.js', 'cards', []);
      const ids = cards.map(c => c.id);
      const s = srs.stats(ids);
      const dueQueue = srs.queue(ids);

      const mastered = curriculum.concepts.filter(c => store.mastery(c.id) >= 0.6);
      const overall = curriculum.concepts.length
        ? curriculum.concepts.reduce((a, c) => a + store.mastery(c.id), 0) / curriculum.concepts.length
        : 0;
      const front = curriculum.frontier(id => store.mastery(id));
      const weak = [...curriculum.concepts]
        .filter(c => store.state.concepts[c.id]?.seen)
        .sort((a, b) => store.mastery(a.id) - store.mastery(b.id))
        .slice(0, 3);

      clear(view);

      /* ---- greeting ---- */
      const hour = new Date().getHours();
      const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      view.appendChild(ui.pageHead(greet, 'Formal Languages & Compilers',
        'Fourteen chapters, from $\\Sigma^*$ to JVM bytecode. You do not need to read them again — you need to be asked about them.'));

      /* ---- the one recommendation ---- */
      const rec = recommend({ due: s.due, neu: s.neu, front, weak, overall });
      view.appendChild(h('div.card.hero',
        h('div.hero-ring', { html: ring(overall, 88, 8, 'var(--magic)') },
          h('span.hero-pct', Math.round(overall * 100) + '%')),
        h('div.hero-body',
          h('div.eyebrow', 'Next 20 minutes'),
          h('h2', rec.title),
          h('p.muted', { html: tex(rec.why) }),
          h('div.row',
            h('button.btn-primary', { onclick: rec.action }, rec.cta),
            rec.alt ? h('button.btn-ghost', { onclick: rec.alt.action }, rec.alt.cta) : null))));

      /* ---- numbers ---- */
      view.appendChild(h('div.grid.c3', { style: { marginTop: '16px' } },
        tile('Cards due', s.due, s.due ? 'var(--bad)' : 'var(--good)', s.due ? 'review now' : 'nothing overdue', () => go('review')),
        tile('Day streak', store.state.streak.days || 0, 'var(--warn)', 'consecutive study days'),
        tile('Concepts solid', `${mastered.length}/${curriculum.concepts.length}`, 'var(--good)', 'mastery ≥ 60%', () => go('atlas')),
        tile('XP', store.totalXp(), 'var(--accent)', 'earned from correct answers')));

      /* ---- unit progress ---- */
      view.appendChild(h('h3', { style: { marginTop: '28px' } }, 'The territory'));
      view.appendChild(h('div.unit-list', curriculum.units.map(u => {
        const cs = curriculum.conceptsOfUnit(u.id);
        const m = cs.reduce((a, c) => a + store.mastery(c.id), 0) / (cs.length || 1);
        return h('div.unit-row', { onclick: () => go('path', 'unit=' + u.id) },
          h('div.unit-ch', 'ch ' + u.ch),
          h('div.unit-main',
            h('div.row', h('strong', u.title), h('span.spacer'),
              h('span.faint.small', Math.round(m * 100) + '%')),
            h('div.bar', h('i', { style: { width: Math.round(m * 100) + '%',
              background: m >= .6 ? 'var(--good)' : m >= .3 ? 'var(--warn)' : 'var(--accent)' } })),
            h('div.faint.small', { style: { marginTop: '4px' } }, u.blurb)));
      })));

      /* ---- weak spots ---- */
      if (weak.length) {
        view.appendChild(h('h3', { style: { marginTop: '28px' } }, 'Where you are leaking marks'));
        view.appendChild(h('div.grid.c2', weak.map(c => h('div.card.weak-card',
          h('div.row', h('strong', c.title), h('span.spacer'),
            h('span.tag.bad', Math.round(store.mastery(c.id) * 100) + '%')),
          h('p.small.muted', { html: tex(c.one) }),
          h('div.row',
            h('button.btn-sm', { onclick: () => go('quiz', 'concept=' + c.id) }, 'Quiz it'),
            h('button.btn-sm.btn-ghost', { onclick: () => go('review', 'concept=' + c.id) }, 'Cards'),
            h('button.btn-sm.btn-ghost', { onclick: () => go('feynman', 'concept=' + c.id) }, 'Explain it'))))));
      }

      /* ---- recent activity sparkline ---- */
      const sess = store.state.sessions.slice(-30);
      if (sess.length > 1) {
        view.appendChild(h('h3', { style: { marginTop: '28px' } }, 'Recent sessions'));
        view.appendChild(h('div.card', { html: sparkline(sess) }));
      }

      /* ---- method note: why this app works the way it does ---- */
      view.appendChild(h('details.card.method', { style: { marginTop: '24px' } },
        h('summary', 'Why this trainer nags you instead of explaining things'),
        h('div.small.muted', { html: tex(
          'Re-reading a chapter feels productive and is nearly worthless — the fluency you feel is the *text* being easy, not the *idea* being learned. ' +
          'Four things reliably work instead, and this app is built out of them:<br><br>' +
          '<strong>Retrieval.</strong> Being asked, and struggling, before being told. Every module here asks first.<br>' +
          '<strong>Spacing.</strong> Meeting a fact again just as it fades. That is the Daily Review scheduler.<br>' +
          '<strong>Interleaving.</strong> Mixing topics rather than blocking them, so you have to *choose* the method, not just apply the obvious one. Quiz Arena defaults to mixed.<br>' +
          '<strong>Generation.</strong> Producing an explanation in your own words. That is Explain It Back, and it is the one most students skip.<br><br>' +
          'The labs exist because automata and parse tables are *procedures*. You cannot memorise a procedure; you have to run it, be wrong, and see where it broke.') })));
    }

    function tile(label, n, color, sub, onclick) {
      return h('div.card.tile' + (onclick ? '.clickable' : ''), onclick ? { onclick } : null,
        h('div.tile-n', { style: { color } }, String(n)),
        h('div.small', label),
        h('div.faint.small', sub));
    }

    function recommend({ due, neu, front, weak, overall }) {
      if (due >= 5) return {
        title: `${due} cards have come due`,
        why: 'These are the ones your memory is about to drop. Clearing them is the highest-value thing on this page, and it takes about ten minutes.',
        cta: 'Start review', action: () => go('review'),
        alt: { cta: 'Skip to a lab', action: () => go('regex') } };
      if (overall < 0.05) return {
        title: 'Start with regular expressions',
        why: 'Chapter 2 is the foundation for everything up to the pumping lemma. Build one in the Regex Lab, watch it compile into an automaton, and the first four chapters stop being separate topics.',
        cta: 'Open Regex Lab', action: () => go('regex'),
        alt: { cta: 'See the whole path', action: () => go('path') } };
      if (front.length) {
        const c = front[0];
        return {
          title: 'Next up: ' + c.title,
          why: c.one + ' — its prerequisites are solid, so this is the frontier of what you can actually learn today.',
          cta: 'Learn it', action: () => go('path', 'concept=' + c.id),
          alt: due ? { cta: `Clear ${due} due cards first`, action: () => go('review') } : null };
      }
      if (weak.length) return {
        title: 'Shore up ' + weak[0].title,
        why: 'Your weakest concept by a clear margin. Quiz it cold — the diagnosis on each wrong answer is worth more than re-reading the chapter.',
        cta: 'Quiz it', action: () => go('quiz', 'concept=' + weak[0].id) };
      return {
        title: 'Try a Pumping Duel',
        why: 'Everything is green, which means it is time for the hard transfer task: proving a language is not regular, against an adversary that plays to win.',
        cta: 'Enter the duel', action: () => go('pumping'),
        alt: { cta: 'Mixed quiz', action: () => go('quiz') } };
    }

    function sparkline(sess) {
      const W = 600, H = 70, n = sess.length;
      const pts = sess.map((s, i) => {
        const v = s.total ? s.correct / s.total : 0;
        return [(i / Math.max(1, n - 1)) * W, H - 6 - v * (H - 16)];
      });
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img"
        aria-label="accuracy over your last ${n} sessions">
        <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
        ${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join('')}
      </svg><div class="faint small">accuracy across your last ${n} sessions</div>`;
    }
  },
};
