/* Explain It Back — the generation effect.
   You do not find out that you cannot explain something by reading about it.
   You find out by trying to write it down, which is why the model answer stays
   locked until a real attempt exists. The keyword check is a *prompt for
   self-reflection*, not a grade — the module says so explicitly, because a
   learner who games the keywords has only cheated themselves. */
import { prompts as ALL } from '../../data/feynman.js';

const GRADES = [
  { g: 0, label: 'I could not', hint: 'I was missing the core idea', cls: 'btn-bad' },
  { g: 1, label: 'Partly',      hint: 'Right shape, gaps in the detail', cls: '' },
  { g: 2, label: 'Yes, fully',  hint: 'I could have written the model answer', cls: 'btn-good' },
];

/* Loose stem match: "derivations" counts for "derivation", "chooses" for "choose". */
function mentions(text, phrase) {
  const hay = ' ' + text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const words = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/);
  return words.every(w => {
    const stem = w.length > 4 ? w.slice(0, Math.max(4, w.length - 2)) : w;
    return hay.includes(' ' + w) || hay.includes(' ' + stem);
  });
}

export default {
  id: 'feynman',
  title: 'Explain It Back',

  mount(root, { store, ui, curriculum, go, params }) {
    const { h, clear, tex, toast, shuffle } = ui;
    ui.loadCss('css/modules/practice.css');

    const view = h('div');
    root.appendChild(view);

    const key = id => 'feynman:' + id;
    const saved = id => store.flag(key(id));

    const focus = params?.get('concept');
    if (focus) {
      const ps = ALL.filter(p => p.concept === focus);
      ps.length ? attempt(ps[0]) : picker();
    } else picker();

    /* --------------------------------------------------------- picker -- */
    function picker() {
      clear(view);
      view.appendChild(ui.pageHead('The generation effect', 'Explain It Back',
        'The fastest way to discover you do not understand something is to try to explain it without looking. Write first, read the expert version second, then judge yourself honestly — that last step is the assessment, and it only works if you are hard on yourself.'));

      /* weight toward weak concepts, but keep it varied */
      const scored = ALL.map(p => ({ p, m: store.mastery(p.concept), done: !!saved(p.id) }));
      const suggested = shuffle(scored.filter(s => !s.done))
        .sort((a, b) => a.m - b.m)[0] || shuffle(scored)[0];

      if (suggested) {
        const c = curriculum.byId[suggested.p.concept];
        view.appendChild(h('div.card.hero-prompt',
          h('div.eyebrow', 'Suggested — your weakest concept with an unwritten explanation'),
          h('h2', c?.title || suggested.p.concept),
          h('p', { html: tex(suggested.p.prompt) }),
          h('button.btn-primary', { onclick: () => attempt(suggested.p) }, 'Take it on')));
      }

      const written = scored.filter(s => s.done).length;
      view.appendChild(h('div.row', { style: { margin: '22px 0 10px' } },
        h('h3', { style: { margin: 0 } }, 'All prompts'),
        h('span.spacer'),
        h('span.faint.small', `${written} of ${ALL.length} written`),
        written ? h('button.btn-ghost.btn-sm', { onclick: archive }, 'My explanations') : null));

      view.appendChild(h('div.fy-list', ALL.map(p => {
        const c = curriculum.byId[p.concept];
        const done = !!saved(p.id);
        return h('div.card.fy-item' + (done ? '.done' : ''), { onclick: () => attempt(p) },
          h('div.row',
            h('span.tag' + (done ? '.good' : '.accent'), c?.title || p.concept),
            h('span.spacer'),
            done ? h('span.faint.small', 'written') : null),
          h('p.small', { style: { margin: '8px 0 0' }, html: tex(p.prompt) }));
      })));
    }

    /* -------------------------------------------------------- attempt -- */
    function attempt(p) {
      clear(view);
      const c = curriculum.byId[p.concept];
      const prior = saved(p.id);

      view.appendChild(h('div.row', { style: { marginBottom: '12px' } },
        h('button.btn-ghost.btn-sm', { onclick: picker }, '← all prompts')));
      view.appendChild(ui.pageHead(c?.title || p.concept, 'Explain it back', p.prompt));

      const ta = h('textarea.fy-write', { rows: 10,
        placeholder: 'No looking things up. Write what you actually have in your head right now — including the bits you are unsure about.' });
      if (prior) ta.value = prior.text || '';

      const counter = h('span.faint.small');
      const submitBtn = h('button.btn-primary', { onclick: submit }, 'I am done — show me the expert answer');
      const update = () => {
        const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
        counter.textContent = words + ' words';
        submitBtn.disabled = words < 25;
        submitBtn.title = words < 25 ? 'Write a real attempt first — at least 25 words' : '';
      };
      ta.addEventListener('input', update);

      const box = h('div.card',
        ta,
        h('div.row', { style: { marginTop: '10px' } },
          counter,
          h('span.spacer'),
          h('span.faint.small', 'model answer stays hidden until you commit'),
          submitBtn));
      view.appendChild(box);
      update();

      const after = h('div');
      view.appendChild(after);

      if (prior) {
        view.appendChild(h('p.faint.small', { style: { marginTop: '10px' } },
          'You wrote this before. Rewriting it from scratch is worth more than editing the old version — try covering it up.'));
      }

      function submit() {
        const text = ta.value.trim();
        if (text.split(/\s+/).filter(Boolean).length < 25) {
          toast('Write a real attempt first', 'bad'); return;
        }
        ta.setAttribute('readonly', '');
        submitBtn.disabled = true;
        clear(after);

        /* 1. self-check against the checklist */
        const hits = (p.mustMention || []).map(m => ({ m, hit: mentions(text, m) }));
        const got = hits.filter(x => x.hit).length;
        after.appendChild(h('div.card',
          h('div.eyebrow', 'Step 1 — what your answer touched on'),
          h('h3', `${got} of ${hits.length} key ideas appeared`),
          h('div.fy-chips', hits.map(x =>
            h('span.fy-chip' + (x.hit ? '.hit' : ''), x.hit ? '✓ ' : '○ ', x.m))),
          h('p.small.faint', { style: { marginTop: '10px' } },
            'This is a crude word match, not a mark. A missing item may still be there in different words — and hitting every keyword proves nothing if the sentences around them are wrong. Use it as a prompt to re-read what you wrote.')));

        /* 2. the model answer */
        after.appendChild(h('div.card.fy-model',
          h('div.eyebrow', 'Step 2 — one expert version'),
          h('div', { html: tex(p.model) }),
          h('p.small.faint', { style: { marginTop: '12px' } },
            'Not the only correct answer. Compare structure and emphasis, not wording.')));

        /* 3. honest self-grade */
        after.appendChild(h('div.card',
          h('div.eyebrow', 'Step 3 — the actual assessment'),
          h('h3', 'Could you have written that?'),
          h('p.small.muted', 'Judging your own answer against a model is a well-evidenced way to learn, and it fails completely if you are generous with yourself. Grade the answer you wrote, not the one you now realise you could write.'),
          h('div.fy-grades', GRADES.map(g => h('button' + (g.cls ? '.' + g.cls : ''), {
            onclick: () => finish(g, text),
          }, h('strong', g.label), h('span.faint.small', g.hint))))));

        after.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function finish(g, text) {
        store.flag(key(p.id), { text, grade: g.g, at: Date.now() });
        store.state.notes[p.concept] = text;
        store.record(p.concept, g.g >= 1, g.g === 2 ? 3 : g.g === 1 ? 2 : 0);
        store.logSession('feynman', g.g >= 1 ? 1 : 0, 1);
        toast('Saved to your explanations', 'good');

        clear(after);
        after.appendChild(h('div.card.center', { style: { padding: '30px' } },
          h('h2', g.g === 2 ? 'Solid.' : g.g === 1 ? 'Partly there.' : 'Now you know where the gap is.'),
          h('p.muted', { style: { maxWidth: '58ch', margin: '0 auto 16px' } },
            g.g === 2 ? 'This concept is genuinely yours now. The explanation is saved — re-read it the night before the exam rather than the chapter.'
            : g.g === 1 ? 'The shape was right and the detail was thin, which is the normal state before something clicks. Come back to this prompt in a few days and write it again from scratch.'
            : 'Finding out now is the entire point, and it cost you five minutes. Go and drill the underlying cards, then return to this prompt cold.'),
          h('div.row', { style: { justifyContent: 'center' } },
            h('button.btn-primary', { onclick: picker }, 'Another prompt'),
            h('button.btn-ghost', { onclick: () => go('review', 'concept=' + p.concept) }, 'Drill this concept'),
            h('button.btn-ghost', { onclick: archive }, 'My explanations'))));
        after.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    /* -------------------------------------------------------- archive -- */
    function archive() {
      clear(view);
      view.appendChild(h('div.row', { style: { marginBottom: '12px' } },
        h('button.btn-ghost.btn-sm', { onclick: picker }, '← all prompts')));
      view.appendChild(ui.pageHead('Your words', 'My explanations',
        'Everything you have written, newest first. These are worth more to you than any chapter summary, because you produced them — and watching an old explanation look clumsy is the clearest evidence of progress you will get.'));

      const mine = ALL.map(p => ({ p, rec: saved(p.id) })).filter(x => x.rec)
        .sort((a, b) => (b.rec.at || 0) - (a.rec.at || 0));

      if (!mine.length) {
        view.appendChild(h('div.card.center.muted', { style: { padding: '40px' } },
          'Nothing written yet.'));
        return;
      }

      for (const { p, rec } of mine) {
        const c = curriculum.byId[p.concept];
        const g = GRADES.find(x => x.g === rec.grade);
        view.appendChild(h('div.card',
          h('div.row',
            h('span.tag.accent', c?.title || p.concept),
            h('span.tag' + (rec.grade === 2 ? '.good' : rec.grade === 1 ? '.warn' : '.bad'), g ? g.label : '—'),
            h('span.spacer'),
            h('span.faint.small', new Date(rec.at || 0).toLocaleDateString()),
            h('button.btn-ghost.btn-sm', { onclick: () => attempt(p) }, 'Rewrite')),
          h('p.small.muted', { style: { marginTop: '10px' }, html: tex(p.prompt) }),
          h('blockquote.fy-quote', rec.text)));
      }
    }
  },
};
