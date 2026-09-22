/* Automaton Lab — load or type a finite automaton, run it with a tape,
   then do the two constructions of chapter 4 by hand with the engine as
   examiner: det(F) (subset construction) and Min(F) (partition refinement).

   Worked-example fading: the first DFA states of the subset construction are
   computed for the learner, the next ones are filled in with guidance, the
   rest are blank. Every wrong entry gets a specific diagnosis, never "wrong". */
import {
  parseAutomatonText, automatonToText, classify, renderAutomaton,
  nfaRun, subsetConstruction, dfaStep, complete,
  setLabel, transitionTable, thompson, parseRegex, astToString, minimize, EPS, OMEGA,
} from '../core/automata.js';

/* --- the built-in gallery, written in the lab's own text format ---------- */
const GALLERY = [
  { id: 'even-a', title: 'Even number of a’s', concept: 'dfa',
    blurb: 'Two states are enough: the parity of the a’s read so far.',
    text: '> q0\n* q0\nq0 -a-> q1\nq0 -b-> q0\nq1 -a-> q0\nq1 -b-> q1' },
  { id: 'abb', title: 'Contains abb (DFA)', concept: 'dfa',
    blurb: 'The determinised version of (a+b)*abb — every state remembers how much of abb is pending.',
    text: '> q0\n* q3\nq0 -a-> q1\nq0 -b-> q0\nq1 -a-> q1\nq1 -b-> q2\nq2 -a-> q1\nq2 -b-> q3\nq3 -a,b-> q3' },
  { id: 'abb-nfa', title: 'Ends with abb (NFA)', concept: 'nfa',
    blurb: 'The lazy way: guess where the abb starts. δ(q0,a) = {q0,q1} — that is the whole trick.',
    text: '> q0\n* q3\nq0 -a,b-> q0\nq0 -a-> q1\nq1 -b-> q2\nq2 -b-> q3' },
  { id: 'div3', title: 'Binary numbers divisible by 3', concept: 'dfa',
    blurb: 'State = the remainder so far. Reading a bit b turns r into (2r+b) mod 3.',
    text: '> r0\n* r0\nr0 -0-> r0\nr0 -1-> r1\nr1 -0-> r2\nr1 -1-> r0\nr2 -0-> r1\nr2 -1-> r2' },
  { id: 'aba', title: 'Contains aba', concept: 'dfa',
    blurb: 'Watch the back-edges: after a failed match the machine must not throw away a partial one.',
    text: '> q0\n* q3\nq0 -a-> q1\nq0 -b-> q0\nq1 -a-> q1\nq1 -b-> q2\nq2 -a-> q3\nq2 -b-> q0\nq3 -a,b-> q3' },
  { id: 'no110', title: 'No substring 110', concept: 'dfa',
    blurb: 'From the exercise in chapter 2: L((0+10)*1*).',
    text: '> q0\n* q0\n* q1\n* q2\nq0 -0-> q0\nq0 -1-> q1\nq1 -0-> q0\nq1 -1-> q2\nq2 -1-> q2' },
  { id: 'abba-eps', title: '(ab+ba)* with ε-moves', concept: 'eclosure',
    blurb: 'The ε-NFA from the notes: ec(q5) = {q5,q7,q0,q1,q2}. Good practice for closures.',
    text: '> q0\n* q0\nq0 -ε-> q1\nq0 -ε-> q2\nq1 -a-> q3\nq2 -b-> q4\nq3 -b-> q5\nq4 -a-> q6\nq5 -ε-> q7\nq6 -ε-> q7\nq7 -ε-> q0' },
  { id: 'odd-ones', title: 'Odd #1 and even #0', concept: 'dfa',
    blurb: 'A product construction in disguise — the state is a pair of parities.',
    text: '> ee\n* oe\nee -1-> oe\nee -0-> eo\noe -1-> ee\noe -0-> oo\neo -1-> oo\neo -0-> ee\noo -1-> eo\noo -0-> oe' },
];

const parseSet = s => [...new Set(String(s).replace(/[{}]/g, ' ').split(/[\s,]+/).filter(Boolean))];
const sameSet = (a, b) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');

export default {
  id: 'automata',
  title: 'Automaton Lab',

  mount(root, ctx) {
    const { ui, store } = ctx;
    const { h, tex, toast } = ui;
    ui.loadCss('css/modules/automata.css');

    const S = {
      text: store.flag('autlab:text') || GALLERY[0].text,
      aut: null, errors: [], warnings: [],
      word: 'abba', pos: 0, timer: null,
      predicted: null,               // accept/reject prediction for the current word
      kindGuess: null,               // DFA/NFA retrieval question
      kindAsked: null,
    };

    root.appendChild(ui.pageHead('Chapter 4 · lab', 'Automaton Lab',
      'Load a machine or type your own, run it character by character, then carry out ' +
      '$\\textsl{det}(F)$ and $\\texttt{Min}(F)$ yourself with the engine checking every set you write.'));

    /* ---------- cards ---------- */
    const galleryCard = h('div.card');
    const editorCard = h('div.card');
    const runCard = h('div.card');
    const subsetCard = h('div.card');
    const minCard = h('div.card');
    [galleryCard, editorCard, runCard, subsetCard, minCard].forEach(c => root.appendChild(c));

    /* =====================================================================
       gallery + editor
       ===================================================================== */
    function drawGallery() {
      galleryCard.replaceChildren(
        h('h2', 'Gallery'),
        h('p.small.muted', 'Machines from the lecture. Loading one drops its source into the editor — change it, break it, see what happens.'),
        h('div.gallery', ...GALLERY.map(g => h('button.gal', {
          onclick: () => load(g.text, g.title),
        }, h('div.gal-t', g.title), h('div.gal-b.small.faint', g.blurb)))),
        h('div.row', { style: { marginTop: '12px' } },
          h('span.small.faint', 'or build A(r) from a regex:'),
          regexInput,
          h('span.small.faint', { html: tex('|A(r)| = ?') }),
          guessInput,
          h('button.btn-sm', { onclick: buildFromRegex }, 'Thompson →')),
        h('p.small.faint', { style: { margin: '6px 0 0' },
          html: tex('Guess the number of states first — Thompson is completely mechanical, so the count is predictable.') }));
    }

    const regexInput = h('input.mono', { type: 'text', value: '(a+b)*abb', spellcheck: 'false', style: { width: '170px' } });
    const guessInput = h('input.mono', { type: 'text', value: '', placeholder: '14', style: { width: '60px' } });

    function buildFromRegex() {
      let ast;
      try { ast = parseRegex(regexInput.value); }
      catch (e) { toast(e.message || String(e), 'bad'); return; }
      const nfa = thompson(ast);
      // retrieval first: A(r) has a predictable size, so ask before showing.
      const expect = nfa.states.length;
      const guess = guessInput.value.trim();
      if (guess !== '') {
        const ok = Number(guess) === expect;
        store.record('thompson', ok);
        toast(ok ? `Correct — ${expect} states.`
          : `${expect}, not ${guess}. Two fresh states per character, ε and ∅, and two more for every +, *, ? and postfix ⁺.`,
          ok ? 'good' : 'bad');
        guessInput.value = '';
      }
      load(automatonToText(nfa), 'A(' + astToString(ast) + ')');
    }

    function load(text, name) {
      S.text = text;
      store.flag('autlab:text', text);
      S.pos = 0; S.predicted = null; S.kindGuess = null; S.kindAsked = null;
      reset();
      parse();
      if (name) toast('loaded ' + name);
      drawAll();
    }

    const editor = h('textarea', { rows: 9, spellcheck: 'false' });
    const editorMsgs = h('div');
    const autView = h('div.aut-wrap');
    const kindBox = h('div');

    function drawEditor() {
      editorCard.replaceChildren(
        h('h2', 'The machine'),
        h('div.grid.c2',
          h('div',
            h('p.small.faint', { html: tex(
              'One transition per line: `q0 -a-> q1`. Several symbols: `q0 -a,b-> q1`. ' +
              'ε-transition: `q0 -ε-> q1` (or `eps`). Mark the start state with `>` and accepting states with `*`. ' +
              '`#` starts a comment.') }),
            editor, editorMsgs),
          h('div', autView, kindBox)));
      editor.value = S.text;
      editor.oninput = () => {
        S.text = editor.value; store.flag('autlab:text', S.text);
        S.pos = 0; S.predicted = null;
        parse(); reset();
        drawMachineView(); drawRun(); drawSubset(); drawMin();
      };
      drawMachineView();
    }

    function drawMachineView() {
      editorMsgs.replaceChildren();
      for (const e of S.errors) editorMsgs.appendChild(h('div.callout.bad.small.msg',
        (e.line ? 'line ' + e.line + ': ' : '') + e.message));
      for (const w of S.warnings) editorMsgs.appendChild(h('div.callout.warn.small.msg',
        (w.line ? 'line ' + w.line + ': ' : '') + w.message));
      autView.replaceChildren();
      kindBox.replaceChildren();
      if (!S.aut || !S.aut.states.length) {
        autView.appendChild(h('p.faint.small', 'Nothing to draw yet.'));
        return;
      }
      autView.innerHTML = renderAutomaton(S.aut, { highlight: [S.aut.start] });
      const c = classify(S.aut);

      // retrieval before exposition: ask, then tell.
      if (S.kindAsked !== S.text) {
        kindBox.appendChild(h('div.row.small', { style: { marginTop: '8px' } },
          h('span.faint', 'Before you look — is this a DFA or an NFA?'),
          h('button.btn-sm', { onclick: () => answerKind('dfa', c) }, 'DFA'),
          h('button.btn-sm', { onclick: () => answerKind('nfa', c) }, 'NFA')));
        return;
      }
      kindBox.appendChild(h('div.row.small', { style: { marginTop: '8px' } },
        h('span.tag' + (c.deterministic ? '.accent' : '.magic'), c.deterministic ? 'DFA' : 'NFA'),
        c.eps ? h('span.tag.magic', 'has ε-moves') : null,
        c.branching ? h('span.tag.magic', 'branching δ') : null,
        h('span.tag' + (c.total ? '.good' : ''), c.total ? 'complete' : 'partial (δ may hit Ω)'),
        h('span.tag', 'Σ = {' + S.aut.alphabet.join(',') + '}'),
        h('span.tag', S.aut.states.length + ' states')));
      const t = transitionTable(S.aut);
      kindBox.appendChild(h('div.aut-scroll', h('table.aut-table',
        h('thead', h('tr', h('th', 'δ'), ...t.cols.map(c2 => h('th.mono', c2)))),
        h('tbody', ...t.rows.map(r => h('tr',
          h('td.mono', (S.aut.start === r.state ? '→ ' : '') + r.label + (S.aut.accepting.includes(r.state) ? ' *' : '')),
          ...t.cols.map(c2 => h('td.mono', r.row[c2] && r.row[c2].length
            ? (c.deterministic ? r.row[c2][0] : setLabel(r.row[c2])) : OMEGA))))))));
    }

    function answerKind(said, c) {
      const truth = c.deterministic ? 'dfa' : 'nfa';
      const ok = said === truth;
      S.kindAsked = S.text;
      store.record(truth, ok);
      if (!ok) {
        const why = c.eps ? 'it has ε-transitions, and δ of a DFA never reads ε'
          : c.branching ? 'some state has two edges with the same symbol, so δ returns a *set*'
          : 'δ is single-valued everywhere and there are no ε-moves';
        toast('No — ' + why, 'bad');
      } else toast('Correct', 'good');
      drawMachineView();
    }

    function parse() {
      const res = parseAutomatonText(S.text);
      S.aut = res.automaton && res.automaton.states.length ? res.automaton : null;
      S.errors = res.errors; S.warnings = res.warnings;
    }

    /* =====================================================================
       simulation
       ===================================================================== */
    function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

    function drawRun() {
      runCard.replaceChildren(h('h2', 'Run it'));
      if (!S.aut) { runCard.appendChild(h('p.faint.small', 'Fix the machine above first.')); return; }
      const c = classify(S.aut);
      const run = nfaRun(S.aut, S.word);
      S.pos = Math.max(0, Math.min(S.pos, S.word.length));
      const st = run.steps[S.pos];

      const wInput = h('input.mono', {
        type: 'text', value: S.word, spellcheck: 'false', style: { width: '160px' },
        oninput: e => { S.word = e.target.value; S.pos = 0; S.predicted = null; stopTimer(); drawRun(); },
      });
      runCard.appendChild(h('div.row',
        h('label.small.faint', 'w ='), wInput,
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = 0; drawRun(); } }, '⏮'),
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = Math.max(0, S.pos - 1); drawRun(); } }, '◀'),
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = Math.min(S.word.length, S.pos + 1); drawRun(); } }, '▶'),
        h('button.btn-sm.btn-primary', { onclick: play }, S.timer ? '❚❚' : '▶ play')));

      /* predict before you run — otherwise stepping is just watching */
      if (S.predicted == null) {
        runCard.appendChild(h('div.row.small', { style: { marginTop: '8px' } },
          h('span.faint', { html: tex('Predict first: is $w \\in L(F)$?') }),
          h('button.btn-sm.btn-good', { onclick: () => predict(true, run, c) }, 'accept'),
          h('button.btn-sm.btn-bad', { onclick: () => predict(false, run, c) }, 'reject')));
      } else {
        runCard.appendChild(h('div.callout' + (S.predicted === run.accepted ? '.good' : '.bad') + '.small',
          { style: { margin: '8px 0' }, html: tex(
            S.predicted === run.accepted
              ? '**Right.** ' + (run.accepted ? 'Some path ends in an accepting state.' : 'No path survives into an accepting state.')
              : '**No.** The machine ' + (run.accepted ? 'does accept' : 'does not accept') +
                ' — step through below and watch where your reading differs.') }));
      }

      runCard.appendChild(tape(S.word, S.pos));
      runCard.appendChild(h('div.small.mono.rx-set', { html: tex(S.pos === 0
        ? 'ec({' + S.aut.start + '}) = ' + setLabel(st.set)
        : 'δ(' + setLabel(st.before) + ',' + st.sym + ') = ' + (st.move.length ? setLabel(st.move) : '{}') +
          (c.eps ? '<br>ec(…) = ' + (st.set.length ? setLabel(st.set) : '{}') : '')) }));
      if (!st.set.length) runCard.appendChild(h('div.callout.bad.small',
        { html: tex('The machine is dead: δ hit $\\Omega$. Everything after this point is irrelevant.') }));
      runCard.appendChild(h('div.aut-wrap', { html: renderAutomaton(S.aut, {
        highlight: st.set,
        dim: S.aut.states.filter(q => !st.set.includes(q)),
      }) }));
      runCard.appendChild(h('div.row.small',
        h('span.tag' + (run.accepted ? '.good' : '.bad'),
          run.accepted ? 'w ∈ L(F)' : 'w ∉ L(F)'),
        h('span.faint', `step ${S.pos} of ${S.word.length}`)));

      function play() {
        if (S.timer) { stopTimer(); drawRun(); return; }
        if (S.pos >= S.word.length) S.pos = 0;
        S.timer = setInterval(() => {
          if (S.pos >= S.word.length) { stopTimer(); drawRun(); return; }
          S.pos++; drawRun();
        }, 700);
        drawRun();
      }
    }

    function predict(said, run, c) {
      S.predicted = said;
      const ok = said === run.accepted;
      store.record(c.deterministic ? 'dfa-run' : 'nfa', ok);
      toast(ok ? 'Correct' : 'Wrong — now step through it', ok ? 'good' : 'bad');
      drawRun();
    }

    function tape(word, pos) {
      const cells = [...word].map((ch, i) =>
        h('span.tape-cell' + (i < pos ? '.done' : i === pos ? '.here' : ''), ch));
      if (!cells.length) cells.push(h('span.tape-cell.faint', 'λ'));
      return h('div.tape', ...cells, h('span.tape-head', { style: { left: (pos * 26) + 'px' } }));
    }

    /* =====================================================================
       subset construction walkthrough (worked → guided → blank)
       ===================================================================== */
    const W = { steps: [], i: 0, phaseDone: 0, moveVal: '', closVal: '', feedback: null, done: false, correctCount: 0, tries: 0 };

    function reset() {
      Object.assign(W, { steps: [], i: 0, moveVal: '', closVal: '', feedback: null, done: false, correctCount: 0, tries: 0 });
      Object.assign(M, { blocks: null, dfa: null, pick: null, msg: null, finished: false });
    }

    function buildSubset() {
      if (!S.aut) return null;
      const { dfa, log } = subsetConstruction(S.aut);
      W.steps = log.filter(l => l.kind === 'step');
      W.start = log.find(l => l.kind === 'start');
      W.dfa = dfa;
      return dfa;
    }

    function phaseOf(step) {
      const k = Number(String(step.state).slice(1));
      if (k <= 1) return 'worked';
      if (k <= 3) return 'guided';
      return 'blank';
    }

    function drawSubset() {
      subsetCard.replaceChildren(h('h2', { html: tex('$\\textsl{det}(F)$ — do it yourself') }));
      if (!S.aut) { subsetCard.appendChild(h('p.faint.small', 'Needs a machine.')); return; }
      if (!W.steps.length) buildSubset();
      if (!W.steps.length) { subsetCard.appendChild(h('p.faint.small', 'This machine has no transitions to determinise.')); return; }

      subsetCard.appendChild(h('p.small.muted', { html: tex(
        'The worklist: take a set $M$, read a character $c$, compute $\\delta(M,c)$, close it under ε. ' +
        'If $\\Delta(M,c)$ is a set you have not seen, it is a new state of $\\textsl{det}(F)$.') }));
      subsetCard.appendChild(h('div.small.mono.rx-set', { html: tex(
        'start state: $ec(\\{' + S.aut.start + '\\}) = ' + setLabel(W.start.closure) + ' =: S_0$') }));

      /* what is already established */
      const known = h('div.aut-scroll', h('table.aut-table',
        h('thead', h('tr', h('th', 'M'), h('th', 'c'), h('th', { html: tex('δ(M,c)') }), h('th', { html: tex('Δ(M,c)') }), h('th', ''))),
        h('tbody', ...W.steps.slice(0, W.i).map(l => h('tr',
          h('td.mono', setLabel(l.fromSet)), h('td.mono', l.sym),
          h('td.mono', l.move.length ? setLabel(l.move) : '{}'),
          h('td.mono', l.dead ? '{} → Ω' : setLabel(l.closure)),
          h('td', l.dead ? h('span.tag.bad', 'dead') : l.isNew ? h('span.tag.good', 'new ' + l.target) : h('span.tag', l.target)))))));
      if (W.i) subsetCard.appendChild(known);

      if (W.i >= W.steps.length) {
        subsetCard.appendChild(h('div.callout.good', { html: tex(
          `**Done.** $\\textsl{det}(F)$ has ${W.dfa.states.length} states — out of $2^{${S.aut.states.length}}$ possible subsets.`) }));
        subsetCard.appendChild(h('div.aut-wrap', { html: renderAutomaton(W.dfa, { highlight: [W.dfa.start] }) }));
        subsetCard.appendChild(h('div.row',
          h('button.btn-sm', { onclick: () => { W.i = 0; W.feedback = null; drawSubset(); } }, 'again'),
          h('button.btn-sm.btn-primary', { onclick: () => { load(automatonToText(W.dfa), 'det(F)'); } }, 'load det(F) into the editor')));
        return;
      }

      const step = W.steps[W.i];
      const phase = phaseOf(step);
      subsetCard.appendChild(h('div.wt-task',
        h('span.small.faint', 'step ' + (W.i + 1) + ' of ' + W.steps.length),
        h('span.mono', { html: tex('Δ(' + setLabel(step.fromSet) + ', ' + step.sym + ') = ?') }),
        h('span.tag' + (phase === 'worked' ? '.good' : phase === 'guided' ? '.warn' : '.magic'),
          phase === 'worked' ? 'worked for you' : phase === 'guided' ? 'guided' : 'on your own')));

      if (phase === 'worked') {
        subsetCard.appendChild(h('div.wt-worked',
          h('div', { html: tex('$\\delta(' + setLabel(step.fromSet) + ',' + step.sym + ') = ' +
            (step.move.length ? setLabel(step.move) : '\\{\\}') + '$ — read ' + step.sym + ' from every state of M, ε-moves not yet.') }),
          h('div', { html: tex('$ec(' + (step.move.length ? setLabel(step.move) : '\\{\\}') + ') = ' +
            (step.closure.length ? setLabel(step.closure) : '\\{\\}') + '$ — now follow ε-edges to the fixed point.') }),
          h('div', { html: tex(step.dead ? 'Empty: this transition goes to $\\Omega$ and is simply left out.'
            : (step.isNew ? '**New state** ' + step.target + '.' : 'Already known: ' + step.target + '.')) })));
        subsetCard.appendChild(h('button.btn-primary', { onclick: () => { W.i++; W.feedback = null; drawSubset(); } }, 'Next'));
        return;
      }

      const moveIn = h('input.mono', { type: 'text', value: W.moveVal, placeholder: 'q1,q4', style: { width: '190px' },
        oninput: e => { W.moveVal = e.target.value; } });
      const closIn = h('input.mono', { type: 'text', value: W.closVal, placeholder: 'q1,q2,q4', style: { width: '190px' },
        oninput: e => { W.closVal = e.target.value; } });

      if (phase === 'guided') {
        subsetCard.appendChild(h('div.wt-fields',
          h('label.small', { html: tex('δ(M,' + step.sym + ') =') }), moveIn,
          h('label.small', { html: tex('ec(…) = Δ(M,' + step.sym + ') =') }), closIn));
      } else {
        subsetCard.appendChild(h('div.wt-fields',
          h('label.small', { html: tex('Δ(M,' + step.sym + ') =') }), closIn,
          h('span.small.faint', 'write {} if the machine dies here')));
      }
      subsetCard.appendChild(h('div.row',
        h('button.btn-primary', { onclick: () => checkStep(phase, step) }, 'Check'),
        h('button.btn-ghost.btn-sm', { onclick: () => { W.feedback = { hint: true }; drawSubset(); } }, 'I am stuck'),
        h('button.btn-ghost.btn-sm', { onclick: () => { W.i++; W.moveVal = W.closVal = ''; W.feedback = null; drawSubset(); } }, 'skip')));

      if (W.feedback) {
        if (W.feedback.hint) {
          subsetCard.appendChild(h('div.callout.warn.small', { html: tex(
            'Take every state of $M$, follow only the `' + step.sym + '`-edges — that is $\\delta(M,' + step.sym + ')$. ' +
            'Then add everything reachable from *those* states by ε-edges alone, repeatedly, until nothing new appears.') }));
        } else {
          subsetCard.appendChild(h('div.callout' + (W.feedback.ok ? '.good' : '.bad'),
            h('div', { html: tex(W.feedback.head) }),
            ...(W.feedback.notes || []).map(n => h('div.small', { html: tex('· ' + n) }))));
          if (W.feedback.ok) subsetCard.appendChild(h('button.btn-primary', { style: { marginTop: '10px' },
            onclick: () => { W.i++; W.moveVal = W.closVal = ''; W.feedback = null; drawSubset(); } }, 'Next'));
        }
      }
    }

    function checkStep(phase, step) {
      if (!step || !S.aut) return;
      const notes = [];
      let ok = true;
      if (phase === 'guided') {
        const given = parseSet(W.moveVal);
        if (!sameSet(given, step.move)) {
          ok = false;
          notes.push(...diagnoseMove(given, step));
        }
      }
      const givenC = parseSet(W.closVal);
      if (!sameSet(givenC, step.closure)) {
        ok = false;
        notes.push(...diagnoseClosure(givenC, step));
      }
      W.tries++;
      if (ok) W.correctCount++;
      store.record(phase === 'guided' ? 'eclosure' : 'subset', ok);
      if (ok && step.isNew) store.record('subset', true);
      W.feedback = {
        ok,
        head: ok
          ? '**Correct.** ' + (step.dead ? 'Empty — that transition goes to Ω.'
            : step.isNew ? 'And it is a set you have not met, so ' + step.target + ' is a new DFA state.'
            : 'You have met this set before: it is ' + step.target + '.')
          : '**Not yet.** $\\Delta(' + setLabel(step.fromSet) + ',' + step.sym + ') = ' +
            (step.closure.length ? setLabel(step.closure) : '\\{\\}') + '$',
        notes,
      };
      drawSubset();
    }

    function diagnoseMove(given, step) {
      const out = [];
      const missing = step.move.filter(q => !given.includes(q));
      const extra = given.filter(q => !step.move.includes(q));
      for (const q of missing) {
        const from = step.fromSet.find(p => S.aut.trans.some(t => t.from === p && t.sym === step.sym && t.to === q));
        out.push(from ? `${q} is missing: ${from} —${step.sym}→ ${q} is in δ.` : `${q} belongs to δ(M,${step.sym}).`);
      }
      for (const q of extra) {
        const other = S.aut.trans.find(t => step.fromSet.includes(t.from) && t.to === q && t.sym !== step.sym);
        if (other && other.sym === EPS) out.push(`${q} is only reachable by an ε-edge — ε-moves come *after* the character, in ec(), not in δ(M,${step.sym}).`);
        else if (other) out.push(`${q} is reachable on “${other.sym}”, not on “${step.sym}”.`);
        else if (step.fromSet.includes(q)) out.push(`${q} is in M itself; δ(M,${step.sym}) only collects the *targets* of ${step.sym}-edges.`);
        else out.push(`nothing in M reaches ${q} by reading ${step.sym}.`);
      }
      return out;
    }

    function diagnoseClosure(given, step) {
      const out = [];
      const missing = step.closure.filter(q => !given.includes(q));
      const extra = given.filter(q => !step.closure.includes(q));
      for (const q of missing) {
        const via = given.concat(step.move).find(p => S.aut.trans.some(t => t.from === p && t.sym === EPS && t.to === q));
        if (via) out.push(`you forgot the ε-closure of ${via}: ${via} —ε→ ${q}, so ${q} is in the set too (and then ec(${q}) as well).`);
        else if (step.move.includes(q)) out.push(`${q} is already in δ(M,${step.sym}) — every state of the move-set stays in its own closure.`);
        else out.push(`${q} is reachable by ε-moves from the move-set.`);
      }
      for (const q of extra) {
        const other = S.aut.trans.find(t => step.fromSet.includes(t.from) && t.to === q && t.sym !== step.sym && t.sym !== EPS);
        if (other) out.push(`${q} is reachable on “${other.sym}”, not on “${step.sym}”.`);
        else if (step.fromSet.includes(q)) out.push(`${q} is in M, but M is not carried along — after reading ${step.sym} you keep only what you can reach.`);
        else out.push(`${q} cannot be reached: neither a ${step.sym}-edge nor a chain of ε-edges leads there.`);
      }
      if (!out.length) out.push('the two sets differ — compare them element by element.');
      return out;
    }

    /* =====================================================================
       minimisation walkthrough
       ===================================================================== */
    const M = { blocks: null, dfa: null, pick: null, msg: null, finished: false };

    function startMin() {
      const c = classify(S.aut);
      let base = S.aut;
      if (!c.deterministic) base = subsetConstruction(S.aut).dfa;
      const dfa = complete(base);
      const acc = new Set(dfa.accepting);
      M.dfa = dfa;
      M.blocks = [dfa.states.filter(q => !acc.has(q)), dfa.states.filter(q => acc.has(q))].filter(b => b.length);
      M.pick = null; M.msg = null; M.finished = false;
      drawMin();
    }

    function drawMin() {
      minCard.replaceChildren(h('h2', { html: tex('$\\texttt{Min}(F)$ — refine the partition') }));
      if (!S.aut) { minCard.appendChild(h('p.faint.small', 'Needs a machine.')); return; }
      if (!M.blocks) {
        minCard.appendChild(h('p.small.muted', { html: tex(
          'Two states may be identified unless some string **separates** them. Start from ' +
          '$\\{Q \\backslash A,\\; A\\}$ and keep splitting: pick a block and a character `c`, and if the ' +
          'members of that block leave for *different* blocks, they are separable.') }));
        minCard.appendChild(h('button.btn-primary', { onclick: startMin }, 'Start the refinement'));
        return;
      }
      const dfa = M.dfa;
      const label = q => (dfa.labels && dfa.labels[q]) || q;
      const idx = new Map();
      M.blocks.forEach((b, i) => b.forEach(q => idx.set(q, i)));

      minCard.appendChild(h('p.small.muted', { html: tex(
        'Pick the block you want to split and the character that separates it. ' +
        'δ is made total with the dead state $\\Omega$ first — otherwise "same behaviour" is not well defined.') }));

      const tbl = h('table.aut-table',
        h('thead', h('tr', h('th', 'block'), h('th', 'states'), ...dfa.alphabet.map(c => h('th.mono', c)))),
        h('tbody', ...M.blocks.map((b, i) => h('tr' + (M.pick && M.pick.block === i ? '.sel' : ''),
          h('td', h('button.btn-sm' + (M.pick && M.pick.block === i ? '.btn-primary' : ''), {
            onclick: () => { M.pick = { block: i, sym: M.pick && M.pick.sym }; M.msg = null; drawMin(); },
          }, 'B' + i + (b.some(q => dfa.accepting.includes(q)) ? ' *' : ''))),
          h('td.mono', b.map(label).join(', ')),
          ...dfa.alphabet.map(c => h('td.mono.small',
            b.map(q => { const t = dfaStep(dfa, q, c); return t == null ? OMEGA : 'B' + idx.get(t); }).join(' ')))))));
      minCard.appendChild(h('div.aut-scroll', tbl));

      minCard.appendChild(h('div.row',
        h('span.small.faint', 'split on:'),
        ...dfa.alphabet.map(c => h('button.btn-sm' + (M.pick && M.pick.sym === c ? '.btn-primary' : ''), {
          onclick: () => { M.pick = { block: M.pick ? M.pick.block : null, sym: c }; M.msg = null; drawMin(); },
        }, c)),
        h('span.spacer'),
        h('button.btn-primary', { disabled: !M.pick || M.pick.block == null || !M.pick.sym, onclick: doSplit }, 'Split'),
        h('button.btn-good', { onclick: claimStable }, 'No more splits')));

      if (M.msg) minCard.appendChild(h('div.callout' + (M.msg.ok ? '.good' : '.bad'), { html: tex(M.msg.text) }));

      if (M.finished) {
        const res = minimize(M.dfa);
        minCard.appendChild(h('div.aut-wrap', { html: renderAutomaton(res.dfa, { highlight: [res.dfa.start] }) }));
        minCard.appendChild(h('div.row',
          h('button.btn-sm', { onclick: startMin }, 'again'),
          h('button.btn-sm.btn-primary', { onclick: () => load(automatonToText(res.dfa), 'Min(F)') }, 'load Min(F) into the editor')));
      }
    }

    function groupsOf(blockIdx, sym) {
      const dfa = M.dfa;
      const idx = new Map();
      M.blocks.forEach((b, i) => b.forEach(q => idx.set(q, i)));
      const groups = new Map();
      for (const q of M.blocks[blockIdx]) {
        const t = dfaStep(dfa, q, sym);
        const key = t == null ? 'Ω' : String(idx.get(t));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(q);
      }
      return groups;
    }

    function doSplit() {
      if (!M.blocks || !M.pick || M.pick.block == null || !M.pick.sym) return;
      const { block, sym } = M.pick;
      const b = M.blocks[block];
      if (b.length < 2) {
        store.record('minimize', false);
        M.msg = { ok: false, text: '**B' + block + ' has a single state** — there is nothing left to split. Look for a block with at least two members.' };
        drawMin(); return;
      }
      const groups = groupsOf(block, sym);
      if (groups.size === 1) {
        store.record('minimize', false);
        const tgt = [...groups.keys()][0];
        M.msg = { ok: false, text: `**No.** On \`${sym}\` every state of B${block} goes into ${tgt === 'Ω' ? 'Ω' : 'B' + tgt} — ` +
          'the same block, so `' + sym + '` does not separate them. A character only splits a block if it sends its members to *different* blocks.' };
        drawMin(); return;
      }
      const parts = [...groups.values()];
      M.blocks.splice(block, 1, ...parts);
      store.record('minimize', true);
      M.msg = { ok: true, text: '**Correct.** `' + sym + '` separates them: ' +
        parts.map(p => setLabel(p.map(q => (M.dfa.labels && M.dfa.labels[q]) || q))).join(' vs ') +
        ' — so no string can confuse those two groups any more.' };
      M.pick = null;
      drawMin();
    }

    function claimStable() {
      if (!M.blocks) return;
      for (let i = 0; i < M.blocks.length; i++) {
        for (const c of M.dfa.alphabet) {
          if (M.blocks[i].length > 1 && groupsOf(i, c).size > 1) {
            store.record('minimize', false);
            M.msg = { ok: false, text: `**Not stable yet.** B${i} still splits on \`${c}\` — its members leave for different blocks.` };
            drawMin(); return;
          }
        }
      }
      store.record('minimize', true);
      store.logSession('minimize', 1, 1);
      M.finished = true;
      M.msg = { ok: true, text: `**Stable.** ${M.blocks.length} equivalence classes, and the quotient automaton below is the minimal DFA for this language.` };
      drawMin();
    }

    /* ---------- boot ---------- */
    function drawAll() { drawGallery(); drawEditor(); drawRun(); drawSubset(); drawMin(); }
    parse();
    drawAll();

    return () => stopTimer();
  },
};
