/* Regex Lab — the pipeline r → syntax tree → A(r) → det(A(r)) → Min(det(A(r))),
   a side-by-side NFA/DFA tracer, and two drills (membership, algebraic identity).

   The point of the chapter is that an NFA explores a *set* of states while the
   DFA walks a single path. So the tracer always shows both, driven by the
   learner, never as an unstoppable animation. */
import {
  tryParseRegex, astToString, thompson, subsetConstruction, minimize,
  nfaRun, dfaRun, dfaAccepts, toDfa, equivalent, renderAutomaton,
  acceptedWords, setLabel, EPS,
} from '../core/automata.js';

const EXAMPLES = [
  { r: '(a+b)*abb', note: 'ends with abb — the classic dragon-book example' },
  { r: '(b+c)*a(b+c)*', note: 'exactly one a' },
  { r: '(a+b)(a+b)', note: 'all strings of length 2' },
  { r: 'a*b*', note: 'a block of a’s then a block of b’s' },
  { r: '(0+10)*1*', note: 'no substring 110' },
  { r: '(1+ε)(00*1)*0*', note: 'no substring 11' },
  { r: '[a-c]*ab', note: 'character class, ends with ab' },
];

/* Algebraic pairs. The engine decides who is right — nothing is hard-coded. */
const ALGEBRA = [
  { l: '(a*)*',        r: 'a*',            law: 'r** ≐ r*' },
  { l: '∅*',           r: 'ε',             law: '∅* ≐ ε' },
  { l: 'ε*',           r: 'ε',             law: 'ε* ≐ ε' },
  { l: 'ε+a*a',        r: 'a*',            law: 'ε + r*·r ≐ r*' },
  { l: '(ε+a)*',       r: 'a*',            law: '(ε+r)* ≐ r*' },
  { l: '(a+b)c',       r: 'ac+bc',         law: 'distributivity' },
  { l: 'a(b+c)',       r: 'ab+ac',         law: 'distributivity' },
  { l: 'a+a',          r: 'a',             law: 'r + r ≐ r' },
  { l: 'εa',           r: 'a',             law: 'ε·r ≐ r' },
  { l: '∅+ab',         r: 'ab',            law: '∅ + r ≐ r' },
  { l: '∅ab',          r: '∅',             law: '∅·r ≐ ∅' },
  { l: 'a*a*',         r: 'a*',            law: 'idempotent under concatenation' },
  { l: '(ab)*a',       r: 'a(ba)*',        law: 'the sliding identity' },
  { l: '(a*b*)*',      r: '(a+b)*',        law: 'both generate everything' },
  { l: '(a+b)*',       r: 'a*b*',          law: 'a tempting non-law' },
  { l: 'a*+b*',        r: '(a+b)*',        law: 'a tempting non-law' },
  { l: '(ab)*',        r: 'a*b*',          law: 'a tempting non-law' },
  { l: 'a(ab)*b',      r: '(aab)*',        law: 'a tempting non-law' },
  { l: '(a+b)*abb',    r: 'a*b*abb',       law: 'a tempting non-law' },
  { l: 'a?a*',         r: 'a*',            law: 'r? · r* ≐ r*' },
  { l: '(a+ε)b',       r: 'ab+b',          law: 'distributing over ε' },
  { l: 'a**b',         r: 'a*b',           law: 'star is idempotent' },
  { l: '(aa)*',        r: 'a*a*',          law: 'even-length a’s?' },
];

const rnd = a => a[Math.floor(Math.random() * a.length)];

export default {
  id: 'regex',
  title: 'Regex Lab',

  mount(root, ctx) {
    const { ui, store } = ctx;
    const { h, tex, esc, toast } = ui;
    ui.loadCss('css/modules/automata.css');

    const S = {
      src: store.flag('regexlab:src') || '(a+b)*abb',
      stage: 0,            // 0 tree · 1 NFA · 2 DFA · 3 min
      frag: -1,            // Thompson fragment index (-1 = whole automaton)
      word: 'aabb',
      pos: 0,
      timer: null,
      pipe: null,
      err: null,
    };

    root.appendChild(ui.pageHead('Chapter 1–4 · lab',
      'Regex Lab',
      'One expression, four representations. Type a regular expression and walk it through ' +
      '$r \\to$ syntax tree $\\to A(r) \\to \\textsl{det}(A(r)) \\to \\texttt{Min}$ — then run a word ' +
      'through the NFA and the DFA at the same time and watch the difference.'));

    /* ---------- input card ---------- */
    const input = h('input.mono', {
      type: 'text', value: S.src, spellcheck: 'false',
      style: { flex: '1 1 260px', fontSize: '1rem' },
      oninput: e => { S.src = e.target.value; store.flag('regexlab:src', S.src); recompute(); },
    });
    const errBox = h('div.rx-err');
    const chips = h('div.row.small', { style: { marginTop: '10px' } },
      h('span.faint', 'try:'),
      ...EXAMPLES.map(ex => h('button.btn-ghost.btn-sm.mono', {
        title: ex.note,
        onclick: () => { input.value = S.src = ex.r; store.flag('regexlab:src', S.src); recompute(); },
      }, ex.r)));

    const insert = s => {
      const p = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, p) + s + input.value.slice(input.selectionEnd ?? p);
      input.focus(); input.setSelectionRange(p + s.length, p + s.length);
      S.src = input.value; store.flag('regexlab:src', S.src); recompute();
    };

    root.appendChild(h('div.card',
      h('div.row',
        h('label.small.faint', { style: { minWidth: '18px' } }, 'r ='),
        input,
        h('button.btn-sm', { onclick: () => insert('ε'), title: 'the empty string' }, 'ε'),
        h('button.btn-sm', { onclick: () => insert('∅'), title: 'the empty language' }, '∅'),
        h('button.btn-sm', { onclick: () => insert('*') }, '*'),
        h('button.btn-sm', { onclick: () => insert('+') }, '+')),
      errBox, chips,
      h('p.small.faint', { style: { margin: '10px 0 0' }, html: tex(
        'Syntax as in the notes: `+` is union, juxtaposition (or `·`) is concatenation, `*` is the Kleene star. ' +
        'Extras: `?`, a postfix `+` when nothing follows it (`(ab)+`), classes like `[a-z]`, and `\\` to escape.') })));

    /* ---------- pipeline card ---------- */
    const stageBar = h('div.rx-stages');
    const stageBody = h('div');
    root.appendChild(h('div.card', h('h2', 'The pipeline'), stageBar, stageBody));

    /* ---------- tracer card ---------- */
    const traceBody = h('div');
    root.appendChild(h('div.card', h('h2', 'Run a word: NFA set vs. DFA path'), traceBody));

    /* ---------- drills ---------- */
    const drillA = h('div.card');
    const drillB = h('div.card');
    root.appendChild(drillA);
    root.appendChild(drillB);

    /* =====================================================================
       pipeline
       ===================================================================== */
    function recompute() {
      const p = tryParseRegex(S.src);
      errBox.textContent = '';
      errBox.className = 'rx-err';
      if (!p.ok) {
        S.err = p.error; S.pipe = null;
        errBox.className = 'rx-err show';
        const caret = ' '.repeat(Math.max(0, p.error.pos)) + '▲';
        errBox.appendChild(h('div.mono.small', S.src || '(empty)'));
        errBox.appendChild(h('div.mono.small.rx-caret', caret));
        errBox.appendChild(h('div.small', { html: tex('**' + p.error.message + '**' +
          (p.error.expected ? ' — expected ' + p.error.expected : '')) }));
        drawStages(); drawTrace();
        return;
      }
      S.err = null;
      try {
        const ast = p.ast;
        const nfa = thompson(ast);
        const sub = subsetConstruction(nfa);
        const min = minimize(sub.dfa);
        S.pipe = { ast, nfa, dfa: sub.dfa, subsetLog: sub.log, min: min.dfa, minLog: min.log };
        S.frag = -1;
      } catch (e) {
        S.pipe = null;
        errBox.className = 'rx-err show';
        errBox.appendChild(h('div.small', 'Could not build the automaton: ' + String(e.message || e)));
      }
      drawStages(); drawTrace();
    }

    const STAGES = [
      { t: '1 · Syntax tree', k: 'regex-syntax' },
      { t: '2 · Thompson NFA', k: 'thompson' },
      { t: '3 · Subset DFA', k: 'subset' },
      { t: '4 · Minimal DFA', k: 'minimize' },
    ];

    function drawStages() {
      stageBar.replaceChildren(...STAGES.map((s, i) =>
        h('button.rx-stage' + (i === S.stage ? '.on' : ''), {
          onclick: () => { S.stage = i; drawStages(); },
        }, s.t)));
      stageBody.replaceChildren();
      if (!S.pipe) { stageBody.appendChild(h('p.faint.small', 'Fix the expression above to see the pipeline.')); return; }
      const P = S.pipe;
      if (S.stage === 0) {
        stageBody.appendChild(h('p.small.muted', { html: tex(
          'Parsed as $' + astToString(P.ast) + '$ — `*` binds tightest, then concatenation, then `+`.') }));
        stageBody.appendChild(h('div.rx-tree', { html: treeHtml(P.ast) }));
      } else if (S.stage === 1) {
        stageBody.appendChild(thompsonView(P));
      } else if (S.stage === 2) {
        stageBody.appendChild(subsetView(P));
      } else {
        stageBody.appendChild(minView(P));
      }
    }

    function treeHtml(ast) {
      const node = n => {
        const kids = [];
        if (n.type === 'group') return node(n.arg);
        if (n.left) kids.push(n.left, n.right);
        if (n.arg) kids.push(n.arg);
        const op = { union: '+', concat: '·', star: '*', plus: '⁺', opt: '?',
          char: n.ch, eps: 'ε', empty: '∅', class: n.src || '[…]' }[n.type] || n.type;
        const leaf = !kids.length;
        return `<div class="tn"><div class="tn-label${leaf ? ' leaf' : ''}">${esc(op)}</div>` +
          (kids.length ? `<div class="tn-kids">${kids.map(node).join('')}</div>` : '') + '</div>';
      };
      return node(ast);
    }

    /* --- stage 2: fragment-by-fragment Thompson replay --- */
    function thompsonView(P) {
      const steps = P.nfa.steps;
      const idx = S.frag < 0 ? steps.length - 1 : Math.min(S.frag, steps.length - 1);
      const st = steps[idx];
      const KIND = {
        char: 'A single character c gets two fresh states and one c-edge.',
        eps: 'A(ε): one ε-edge from the start to the accepting state.',
        empty: 'A(∅): two states, no transition at all — nothing can ever be accepted.',
        class: 'A character class becomes one edge per character, in parallel.',
        concat: 'Concatenation: an ε-edge glues the accepting state of the left fragment to the start of the right one.',
        union: 'Union: a fresh start ε-branches into both fragments, and both accepting states ε-join a fresh accepting state.',
        star: 'Star: ε in, ε out, an ε back-edge for repetition and an ε bypass for zero repetitions.',
        plus: 'Plus: like the star, but without the bypass — at least one pass is forced.',
        opt: 'Optional: like the star, but without the back-edge — at most one pass.',
      };
      const box = h('div');
      box.appendChild(h('p.small.muted', { html: tex(
        'Every fragment keeps **exactly one** start state (no edge enters it) and **one** accepting state ' +
        '(no edge leaves it) — that invariant is what makes the gluing steps legal.') }));
      box.appendChild(h('div.row',
        h('button.btn-sm', { disabled: idx <= 0, onclick: () => { S.frag = idx - 1; drawStages(); } }, '◀'),
        h('span.small.mono', `fragment ${idx + 1}/${steps.length}`),
        h('button.btn-sm', { disabled: idx >= steps.length - 1, onclick: () => { S.frag = idx + 1; drawStages(); } }, '▶'),
        h('button.btn-sm.btn-ghost', { onclick: () => { S.frag = -1; drawStages(); } }, 'whole A(r)'),
        h('span.spacer'),
        h('span.tag.accent.mono', 'A(' + st.label + ')')));
      box.appendChild(h('p.small.faint', KIND[st.kind] || ''));
      box.appendChild(h('div.aut-wrap', { html: renderAutomaton(st.nfa, {
        highlight: [st.nfa.start], dim: [], title: null }) }));
      box.appendChild(h('p.small.faint', { html: tex(
        `$A(r)$ has ${P.nfa.states.length} states and ${P.nfa.trans.length} transitions, ` +
        `${P.nfa.trans.filter(t => t.sym === EPS).length} of them ε-transitions.`) }));
      return box;
    }

    /* --- stage 3: subset construction --- */
    function subsetView(P) {
      const box = h('div');
      box.appendChild(h('p.small.muted', { html: tex(
        'A state of $\\textsl{det}(F)$ is a **set** of NFA states. Start from $ec(q_0)$, then repeatedly ' +
        'compute $\\Delta(M,c) = ec(\\delta(M,c))$ until no new set appears.') }));
      box.appendChild(h('div.aut-wrap', { html: renderAutomaton(P.dfa, { highlight: [P.dfa.start] }) }));
      const rows = P.subsetLog.filter(l => l.kind === 'step');
      const tbl = h('table.aut-table',
        h('thead', h('tr', h('th', 'M'), h('th', 'c'), h('th', { html: tex('δ(M,c)') }),
          h('th', { html: tex('ec(δ(M,c)) = Δ(M,c)') }), h('th', ''))),
        h('tbody', ...rows.map(l => h('tr',
          h('td.mono', setLabel(l.fromSet)),
          h('td.mono', l.sym),
          h('td.mono', l.move.length ? setLabel(l.move) : '{}'),
          h('td.mono', l.dead ? '{}' : setLabel(l.closure)),
          h('td', l.dead ? h('span.tag.bad', 'Ω') : l.isNew ? h('span.tag.good', 'new: ' + l.target) : h('span.tag', l.target))))));
      box.appendChild(h('div.aut-scroll', tbl));
      box.appendChild(h('p.small.faint',
        `${P.dfa.states.length} of the 2^${P.nfa.states.length} possible subsets are actually reachable.`));
      return box;
    }

    /* --- stage 4: minimisation --- */
    function minView(P) {
      const box = h('div');
      box.appendChild(h('p.small.muted', { html: tex(
        'Two states are **separable** if some string sends one into $A$ and the other not. ' +
        'Start with $\\{Q \\backslash A, A\\}$ (ε already separates those) and split any block whose members ' +
        'leave it in different directions.') }));
      box.appendChild(h('div.aut-wrap', { html: renderAutomaton(P.min, { highlight: [P.min.start] }) }));
      const ul = h('ol.aut-log');
      for (const l of P.minLog) {
        if (l.kind === 'init') ul.appendChild(h('li', { html: tex('start: ' + l.blocks.map(b => setLabel(b)).join('  |  ')) }));
        else if (l.kind === 'unreachable') ul.appendChild(h('li', { html: tex('dropped unreachable ' + setLabel(l.states)) }));
        else if (l.kind === 'complete') ul.appendChild(h('li', 'added the dead state Ω to make δ total'));
        else if (l.kind === 'split') ul.appendChild(h('li', { html: tex(
          'split ' + setLabel(l.block) + ' on `' + l.sym + '` → ' + l.parts.map(p => setLabel(p.members)).join(' · ')) }));
        else if (l.kind === 'drop-trap') ul.appendChild(h('li', 'removed the trap class (its edges are the Ω-edges the notes leave out)'));
        else if (l.kind === 'stable') ul.appendChild(h('li', { html: tex('**stable** after ' + l.round + ' rounds: ' +
          l.blocks.map(b => setLabel(b)).join('  |  ')) }));
      }
      box.appendChild(ul);
      box.appendChild(h('p.small.faint',
        `${P.dfa.states.length} states → ${P.min.states.length} states. ` +
        'Every state of a minimal DFA is a distinct residual language.'));
      if (P.min.classLabels) {
        box.appendChild(h('div.small.faint.mono', { style: { marginTop: '6px' } },
          P.min.states.map(q => `${P.min.labels[q]} = ${P.min.classLabels[q]}`).join('   ')));
      }
      return box;
    }

    /* =====================================================================
       tracer
       ===================================================================== */
    function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

    function drawTrace() {
      traceBody.replaceChildren();
      if (!S.pipe) { traceBody.appendChild(h('p.faint.small', 'Needs a valid expression.')); return; }
      const P = S.pipe;
      const word = S.word;
      const nrun = nfaRun(P.nfa, word);
      const drun = dfaRun(P.min, word);
      S.pos = Math.max(0, Math.min(S.pos, word.length));
      const nstep = nrun.steps[Math.min(S.pos, nrun.steps.length - 1)];
      const dstep = drun.steps[Math.min(S.pos, drun.steps.length - 1)];

      const wInput = h('input.mono', {
        type: 'text', value: word, spellcheck: 'false', style: { width: '180px' },
        oninput: e => { S.word = e.target.value; S.pos = 0; stopTimer(); drawTrace(); },
      });
      traceBody.appendChild(h('div.row',
        h('label.small.faint', 'w ='), wInput,
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = 0; drawTrace(); } }, '⏮'),
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = Math.max(0, S.pos - 1); drawTrace(); } }, '◀'),
        h('button.btn-sm', { onclick: () => { stopTimer(); S.pos = Math.min(word.length, S.pos + 1); drawTrace(); } }, '▶'),
        h('button.btn-sm.btn-primary', { onclick: play }, S.timer ? '❚❚ pause' : '▶ play'),
        h('span.spacer'),
        h('span.tag' + (nrun.accepted ? '.good' : '.bad'), 'NFA: ' + (nrun.accepted ? 'accepts' : 'rejects')),
        h('span.tag' + (drun.accepted ? '.good' : '.bad'), 'DFA: ' + (drun.accepted ? 'accepts' : 'rejects'))));

      traceBody.appendChild(tape(word, S.pos));

      const left = h('div.rx-pane',
        h('h3', { html: tex('$A(r)$ — the set of active states') }),
        h('div.small.mono.rx-set', { html: tex(
          S.pos === 0
            ? 'ec({' + P.nfa.start + '}) = ' + setLabel(nstep.set)
            : 'δ(' + setLabel(nstep.before) + ',' + nstep.sym + ') = ' + (nstep.move.length ? setLabel(nstep.move) : '{}') +
              '<br>ec(…) = ' + (nstep.set.length ? setLabel(nstep.set) : '{}  — the NFA died')) }),
        h('div.aut-wrap', { html: renderAutomaton(P.nfa, {
          highlight: nstep.set,
          dim: P.nfa.states.filter(q => !nstep.set.includes(q)),
        }) }));

      const dstates = drun.steps.slice(0, S.pos + 1).map(s => s.state).filter(Boolean);
      const cur = dstep && dstep.state;
      const right = h('div.rx-pane',
        h('h3', { html: tex('$\\texttt{Min}(\\textsl{det}(A(r)))$ — one path') }),
        h('div.small.mono.rx-set', { html: tex(
          S.pos === 0 ? 'δ*(' + P.min.labels[P.min.start] + ', λ) = ' + P.min.labels[P.min.start]
            : cur == null ? 'δ(' + (P.min.labels[dstep.from] || dstep.from) + ',' + dstep.sym + ') = Ω — the DFA dies here'
            : 'δ(' + (P.min.labels[dstep.from] || dstep.from) + ',' + dstep.sym + ') = ' + P.min.labels[cur]) }),
        h('div.aut-wrap', { html: renderAutomaton(P.min, {
          highlight: cur ? [cur] : [],
          dim: P.min.states.filter(q => !dstates.includes(q)),
          highlightEdge: (cur && dstep.from) ? [{ from: dstep.from, to: cur, sym: dstep.sym }] : [],
        }) }));

      traceBody.appendChild(h('div.grid.c2', left, right));
      traceBody.appendChild(h('p.small.faint', { html: tex(
        'The NFA keeps a whole frontier alive; the subset construction is nothing more than *naming* those frontiers.') }));

      function play() {
        if (S.timer) { stopTimer(); drawTrace(); return; }
        if (S.pos >= word.length) S.pos = 0;
        S.timer = setInterval(() => {
          if (S.pos >= word.length) { stopTimer(); drawTrace(); return; }
          S.pos++; drawTrace();
        }, 750);
        drawTrace();
      }
    }

    function tape(word, pos) {
      const cells = [...word].map((c, i) => h('span.tape-cell' + (i < pos ? '.done' : i === pos ? '.here' : ''), c));
      if (!cells.length) cells.push(h('span.tape-cell.faint', 'λ'));
      return h('div.tape', ...cells, h('span.tape-head', { style: { left: (pos * 26) + 'px' } }));
    }

    /* =====================================================================
       Drill A — which words match?
       ===================================================================== */
    const A = { regex: null, dfa: null, items: [], graded: false };

    function newMembershipDrill(useCurrent) {
      let src = useCurrent && S.pipe ? S.src : rnd(EXAMPLES).r;
      let dfa;
      try { dfa = toDfa(src); } catch { src = EXAMPLES[0].r; dfa = toDfa(src); }
      const alpha = dfa.alphabet.length ? dfa.alphabet : ['a', 'b'];
      const yes = acceptedWords(dfa, 6, 12).slice(0, 12);
      const items = [];
      const seen = new Set();
      const push = w => { if (!seen.has(w) && items.length < 7) { seen.add(w); items.push({ w, truth: dfaAccepts(dfa, w), mark: null }); } };
      // three accepted words, spread over lengths
      const sorted = [...new Set(yes)].sort((a, b) => a.length - b.length);
      [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]].forEach(w => { if (w != null) push(w); });
      // near misses: mutate an accepted word until it is rejected
      let guard = 0;
      while (items.filter(i => !i.truth).length < 3 && guard++ < 200) {
        const base = sorted.length ? rnd(sorted) : '';
        const cs = [...base];
        const k = Math.floor(Math.random() * (cs.length + 1));
        const op = Math.random();
        if (op < 0.4 && cs.length) cs.splice(k, 1);
        else if (op < 0.8) cs.splice(k, 0, rnd(alpha));
        else if (cs.length) cs[Math.min(k, cs.length - 1)] = rnd(alpha);
        else cs.push(rnd(alpha));
        const w = cs.join('');
        if (!dfaAccepts(dfa, w)) push(w);
      }
      while (items.length < 6 && guard++ < 400) {
        let w = '';
        const n = Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) w += rnd(alpha);
        push(w);
      }
      A.regex = src; A.dfa = dfa; A.graded = false;
      A.items = ui.shuffle(items);
      drawDrillA();
    }

    function drawDrillA() {
      drillA.replaceChildren(h('h2', 'Drill · which words match?'));
      drillA.appendChild(h('p.small.muted', { html: tex(
        'Decide for each candidate whether it is in $L(r)$. Answer **all** of them, then grade — ' +
        'guessing one at a time is how you learn to guess, not to decide.') }));
      drillA.appendChild(h('div.row', h('span.tag.accent.mono', 'r = ' + A.regex),
        h('span.spacer'),
        h('button.btn-sm.btn-ghost', { onclick: () => newMembershipDrill(false) }, 'other regex'),
        h('button.btn-sm.btn-ghost', { onclick: () => newMembershipDrill(true), disabled: !S.pipe }, 'use mine')));

      const rows = h('div.drill-rows');
      A.items.forEach((it, i) => {
        const mk = (v, label, cls) => h('button.btn-sm' + cls + (it.mark === v ? '.on' : ''), {
          disabled: A.graded,
          onclick: () => { it.mark = v; drawDrillA(); },
        }, label);
        const verdict = A.graded
          ? (it.mark === it.truth
            ? h('span.tag.good', '✓')
            : h('span.tag.bad', it.truth ? '✗ it does match' : '✗ it does not match'))
          : null;
        rows.appendChild(h('div.drill-row',
          h('code.drill-word', it.w === '' ? 'λ' : it.w),
          mk(true, '∈ L(r)', '.btn-good'), mk(false, '∉ L(r)', '.btn-bad'),
          verdict,
          A.graded && it.mark !== it.truth
            ? h('button.btn-sm.btn-ghost', {
              onclick: () => {
                input.value = S.src = A.regex; store.flag('regexlab:src', S.src);
                S.word = it.w; S.pos = 0; recompute();
                traceBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
              },
            }, 'show me the run')
            : null));
      });
      drillA.appendChild(rows);

      if (!A.graded) {
        const ready = A.items.every(i => i.mark !== null);
        drillA.appendChild(h('div.row', { style: { marginTop: '10px' } },
          h('button.btn-primary', { disabled: !ready, onclick: grade }, 'Grade'),
          ready ? null : h('span.small.faint', 'mark every candidate first')));
      } else {
        const right = A.items.filter(i => i.mark === i.truth).length;
        drillA.appendChild(h('div.callout' + (right === A.items.length ? '.good' : '.warn'), { style: { marginTop: '10px' },
          html: tex(`${right} / ${A.items.length} correct. ` + (right === A.items.length
            ? 'That is the semantics $L(r)$ in your head, not on paper.'
            : 'For each miss, press “show me the run” — the automaton will tell you exactly where your reading of $r$ and the machine part ways.')) }));
        drillA.appendChild(h('button.btn-primary', { style: { marginTop: '10px' }, onclick: () => newMembershipDrill(false) }, 'Next set'));
      }
    }

    function grade() {
      A.graded = true;
      let right = 0;
      for (const it of A.items) {
        const ok = it.mark === it.truth;
        if (ok) right++;
        store.record('regex-sem', ok);
      }
      store.logSession('regex-membership', right, A.items.length);
      toast(`${right}/${A.items.length} correct`, right === A.items.length ? 'good' : 'bad');
      drawDrillA();
    }

    /* =====================================================================
       Drill B — algebraic identity, with the distinguishing witness
       ===================================================================== */
    const B = { pair: null, answer: null, result: null, tried: false };

    function newAlgebraDrill() {
      let pair = rnd(ALGEBRA), guard = 0;
      while (B.pair && pair.l === B.pair.l && guard++ < 20) pair = rnd(ALGEBRA);
      B.pair = pair; B.answer = null; B.result = null; B.tried = false;
      drawDrillB();
    }

    function drawDrillB() {
      drillB.replaceChildren(h('h2', 'Drill · is it an identity?'));
      drillB.appendChild(h('p.small.muted', { html: tex(
        'Recall the notation of the notes: $r_1 \\doteq r_2$ iff $L(r_1) = L(r_2)$. ' +
        'Decide **before** you look — then the counter-example will actually stick.') }));
      const P = B.pair;
      drillB.appendChild(h('div.algebra',
        h('code.algebra-side', P.l),
        h('span.algebra-op', '≐'),
        h('code.algebra-side', P.r),
        h('span.algebra-q', '?')));

      if (!B.result) {
        drillB.appendChild(h('div.row',
          h('button.btn-good', { onclick: () => answer(true) }, 'Yes, equivalent'),
          h('button.btn-bad', { onclick: () => answer(false) }, 'No, different')));
        return;
      }

      const { correct, eq, res } = B.result;
      drillB.appendChild(h('div.callout' + (correct ? '.good' : '.bad'),
        { html: tex(correct ? '**Correct.**' : '**Not quite.**') + ' ' +
          tex(eq ? `The two expressions denote the same language — this is ${P.law}.`
                 : 'The two languages differ.') }));

      if (!eq && res && res.witness != null) {
        const w = res.witness;
        drillB.appendChild(h('div.witness',
          h('div.small.faint', 'shortest distinguishing witness'),
          h('code.witness-w', w === '' ? 'λ  (the empty string)' : w),
          h('div.small', { html: tex(
            `$w ${res.inL1 ? '\\in' : '\\notin'} L(${P.l})$ but $w ${res.inL2 ? '\\in' : '\\notin'} L(${P.r})$ — ` +
            'one string is all it takes to kill an identity.') }),
          h('div.row', { style: { marginTop: '8px' } },
            h('button.btn-sm', { onclick: () => loadAndRun(P.l, w) }, 'run it on ' + P.l),
            h('button.btn-sm', { onclick: () => loadAndRun(P.r, w) }, 'run it on ' + P.r))));
      } else if (eq) {
        let witnessNote = 'Nothing in Σ* tells them apart: the product of the two minimal DFAs has no reachable accepting state.';
        drillB.appendChild(h('div.small.faint', { style: { marginTop: '8px' }, html: tex(witnessNote) }));
        drillB.appendChild(h('div.row', { style: { marginTop: '8px' } },
          h('button.btn-sm', { onclick: () => loadAndRun(P.l, '') }, 'open ' + P.l + ' in the pipeline'),
          h('button.btn-sm', { onclick: () => loadAndRun(P.r, '') }, 'open ' + P.r)));
      }
      drillB.appendChild(h('button.btn-primary', { style: { marginTop: '12px' }, onclick: newAlgebraDrill }, 'Next pair'));
    }

    function loadAndRun(src, w) {
      input.value = S.src = src;
      store.flag('regexlab:src', src);
      S.word = w; S.pos = 0;
      recompute();
      traceBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function answer(said) {
      const P = B.pair;
      let res;
      try { res = equivalent(P.l, P.r); }
      catch (e) { toast('could not decide this pair: ' + (e.message || e), 'bad'); return; }
      const eq = res === true;
      const correct = said === eq;
      B.answer = said;
      B.result = { correct, eq, res: eq ? null : res };
      store.record('regex-algebra', correct);
      store.logSession('regex-algebra', correct ? 1 : 0, 1);
      toast(correct ? 'Correct' : 'Wrong — look at the witness', correct ? 'good' : 'bad');
      drawDrillB();
    }

    /* ---------- go ---------- */
    recompute();
    newMembershipDrill(false);
    newAlgebraDrill();

    return () => stopTimer();
  },
};
