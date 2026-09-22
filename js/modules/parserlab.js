/* =====================================================================
   Parser Lab  (route id: parser)
   Shift-reduce playground · LR(0) item-set automaton · SLR table builder
   · Earley chart explorer.  All tables come from js/core/grammar.js, which
   follows Stroetmann's definitions exactly (augmented rule ŝ -> s $,
   reduce on Follow, accept on ŝ -> s • $ with lookahead $).
   ===================================================================== */
import * as GR from '../core/grammar.js';

const {
  parseGrammar, tokenize, ruleText, symText, itemText, galleryById, GALLERY,
  slrTable, lr0Items, compareTables, shiftReduceRun, earley, earleyWhy,
  EPS, EOF, DOT, AUG, sub,
} = GR;

const TABS = [
  { id: 'sr',     label: 'Shift-Reduce' },
  { id: 'items',  label: 'LR(0) automaton' },
  { id: 'table',  label: 'Table builder' },
  { id: 'earley', label: 'Earley chart' },
];

export default {
  id: 'parser',
  title: 'Parser Lab',

  mount(root, ctx) {
    const { ui, store } = ctx;
    const { h, clear, tex, toast } = ui;
    ui.loadCss('css/modules/parsing.css');

    const S = {
      src: store.flag('grammar:src') || galleryById('expr-small').text,
      galleryId: store.flag('grammar:gallery') || 'expr-small',
      tab: 'sr',
      word: '',
      g: null, table: null, tableErr: null,
      sr: null, items: null, drill: null, ea: null,
    };
    rebuild();

    function rebuild() {
      S.g = parseGrammar(S.src);
      S.table = null; S.tableErr = null;
      S.sr = null; S.items = null; S.drill = null; S.ea = null;
      if (S.g.ok()) {
        try { S.table = slrTable(S.g); }
        catch (e) { S.tableErr = String(e && e.message || e); }
      }
      const ex = galleryById(S.galleryId);
      if (!S.word) S.word = (ex.words || [])[0] || '';
    }

    root.appendChild(ui.pageHead('Unit 5 · parsing algorithms', 'Parser Lab',
      'A stack, a table and one token of lookahead. Drive the parser yourself, ' +
      'build the table that drives it, and watch Earley do it without any table at all.'));

    /* grammar strip — shared with the Grammar Lab through store.flag */
    const strip = h('div.card');
    root.appendChild(strip);
    const tabBar = h('div.pz-tabs', { style: { marginTop: '14px' } });
    TABS.forEach(t => tabBar.appendChild(h('button', {
      'data-tab': t.id, class: S.tab === t.id ? 'on' : '',
      onclick: () => { S.tab = t.id; draw(); },
    }, t.label)));
    root.appendChild(tabBar);
    const panel = h('div');
    root.appendChild(panel);

    function drawStrip() {
      clear(strip);
      strip.appendChild(h('div.pz-sub', 'Grammar'));
      const gal = h('div.pz-gallery');
      GALLERY.forEach(ex => gal.appendChild(h('button.btn-sm', {
        class: S.galleryId === ex.id ? 'on' : '',
        onclick: () => {
          S.galleryId = ex.id; S.src = ex.text; S.word = (ex.words || [])[0] || '';
          store.flag('grammar:src', S.src); store.flag('grammar:gallery', ex.id);
          rebuild(); draw();
        },
      }, ex.name)));
      strip.appendChild(gal);
      const pre = h('div.pz-rules', { style: { marginTop: '10px' } });
      if (S.g.ok()) S.g.rules.forEach(r => pre.appendChild(h('div.r', h('span.n', 'r' + r.idx), h('span', ruleText(S.g, r)))));
      else S.g.errors.forEach(e => pre.appendChild(h('div.r', h('span.n', 'line ' + e.line), h('span', e.msg))));
      strip.appendChild(pre);
      if (S.g.ok()) {
        const aug = S.table && S.table.grammar.rules[0];
        strip.appendChild(h('p.small.faint', { style: { margin: '8px 0 0' }, html: tex(
          `Augmented with \`${AUG} -> ${S.g.start} $\` (rule 0 of the parser's own numbering; the parser's rule r<sub>i+1</sub> is your rule r<sub>i</sub>).` +
          (S.table ? ` LR(0) automaton: ${S.table.states.length} states, ${S.table.conflicts.length} conflict${S.table.conflicts.length === 1 ? '' : 's'}.` : '')) }));
        strip.appendChild(h('p.small.muted', { style: { margin: '4px 0 0' },
          html: tex('Edit it in the **Grammar Lab** — both labs share the same grammar.') }));
      }
    }

    function draw() {
      [...tabBar.children].forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
      drawStrip();
      clear(panel);
      if (!S.g.ok()) { panel.appendChild(h('div.card', h('div.callout.bad', { html: tex('The grammar does not parse — fix it in the Grammar Lab.') }))); return; }
      if (S.tableErr) { panel.appendChild(h('div.card', h('div.callout.bad', { html: tex('The table could not be built: ' + S.tableErr) }))); return; }
      try {
        if (S.tab === 'sr')     panel.appendChild(tabSR());
        if (S.tab === 'items')  panel.appendChild(tabItems());
        if (S.tab === 'table')  panel.appendChild(tabTable());
        if (S.tab === 'earley') panel.appendChild(tabEarley());
      } catch (err) {
        console.error(err);
        panel.appendChild(h('div.card', h('h3', 'This grammar broke the view'),
          h('p.small.muted', String(err && err.message || err))));
      }
    }

    /* ---------- a word picker shared by three tabs ---------- */
    function wordPicker(onChange) {
      const ex = galleryById(S.galleryId);
      const inp = h('input.mono', { type: 'text', value: S.word, style: { minWidth: '200px' } });
      inp.addEventListener('change', () => { S.word = inp.value.trim(); onChange(); });
      return h('div.row', h('span.small.faint', 'input:'), inp,
        ...(ex.words || []).map(w => h('button.btn-sm.btn-ghost', { onclick: () => { S.word = w; onChange(); } }, w)));
    }

    /* ================================================================
       TAB 1 — the shift-reduce playground
       ================================================================ */
    function tabSR() {
      const wrap = h('div');
      const g = S.g, T = S.table;
      const tk = tokenize(S.word, g);

      const head = h('div.card');
      head.appendChild(h('div.pz-sub', 'Configuration'));
      head.appendChild(wordPicker(() => { S.sr = null; draw(); }));
      wrap.appendChild(head);
      if (tk.error) { head.appendChild(h('div.callout.bad', { style: { marginTop: '10px' }, html: tex(tk.error) })); return wrap; }

      const run = shiftReduceRun(g, T, tk.tokens);
      const runs = store.flag('parser:sr-runs') || 0;
      const st = (S.sr ||= {
        k: 0,                                  // how many steps the learner has confirmed
        mode: runs === 0 ? 'worked' : runs === 1 ? 'hinted' : 'blank',
        playing: false, timer: null, msg: null, wrong: 0, graded: false,
      });

      /* fading banner */
      const fade = h('div.pz-fade', { html: tex(
        st.mode === 'worked'
          ? '**Worked example.** Step through it once; every move is narrated. The next word you parse yourself.'
          : st.mode === 'hinted'
            ? '**Your turn, with a safety net.** Choose the move; a hint is one click away — but only after you have tried.'
            : '**No help now.** Choose shift or the reduction rule at every step.') });
      head.appendChild(h('div', { style: { marginTop: '10px' } }, fade));
      head.appendChild(h('div.row', { style: { marginTop: '8px' } },
        h('button.btn-sm.btn-ghost', { onclick: () => { st.mode = 'worked'; st.k = 0; st.msg = null; render(); } }, 'narrate it for me'),
        h('button.btn-sm.btn-ghost', { onclick: () => { st.mode = st.mode === 'blank' ? 'hinted' : 'blank'; render(); } },
          st.mode === 'blank' ? 'allow hints' : 'hide hints'),
        h('button.btn-sm.btn-ghost', { onclick: () => { st.k = 0; st.wrong = 0; st.msg = null; st.graded = false; render(); } }, 'restart')));

      if (T.conflicts.length)
        wrap.appendChild(h('div.card', h('div.callout.warn', { html: tex(
          `This grammar is **not SLR**: ${T.conflicts.length} conflict${T.conflicts.length === 1 ? '' : 's'}. ` +
          'The playground still runs, resolving shift/reduce in favour of shift and reduce/reduce in favour of the lower rule number — exactly what yacc does, and exactly why yacc\'s silence is dangerous. The Table builder tab lists every conflict.') })));

      const stage = h('div.card');
      wrap.appendChild(stage);

      function render() {
        clear(stage);
        const cur = run.steps[Math.min(st.k, run.steps.length - 1)];
        /* the configuration, in the lecture's layout */
        stage.appendChild(h('div.pz-sub', { html: tex(`configuration  q_0 … q_m | X_1 … X_m | t_{k+1} … t_n $`) }));
        const cfg = h('div.pz-config');
        const stack = h('div.pz-stack');
        cur.states.forEach((q, i) => {
          stack.appendChild(h('span.pz-cell.state', 'q' + q));
          if (i < cur.symbols.length) stack.appendChild(h('span.pz-cell.sym', cur.symbols[i]));
        });
        const inputBox = h('div.pz-input');
        cur.input.forEach((t, i) => inputBox.appendChild(h('span.pz-cell.tok' + (i === 0 ? '.look' : ''), t)));
        cfg.appendChild(stack);
        cfg.appendChild(h('div.pz-bar', '▸'));
        cfg.appendChild(inputBox);
        stage.appendChild(cfg);
        stage.appendChild(h('p.small.faint', { style: { margin: '8px 0 0' }, html: tex(
          `state on top: **${cur.state}** · lookahead: \`${cur.look}\` · action(${cur.state}, ${cur.look}) is what you have to predict.`) }));

        /* controls */
        stage.appendChild(h('div.row', { style: { marginTop: '12px' } }, ...controls()));

        if (st.msg) stage.appendChild(h('div', { style: { marginTop: '10px' } },
          h('div.callout.' + st.msg.kind, { html: tex(st.msg.text) })));

        /* the log of confirmed steps */
        stage.appendChild(h('div.pz-sub', { style: { marginTop: '14px' } }, 'Moves so far'));
        const log = h('div.pz-log');
        run.steps.slice(0, st.k).forEach((s, i) => log.appendChild(
          h('div.e.' + s.action.type, { html: tex(`**${i + 1}.** ${s.note}`) })));
        if (!st.k) log.appendChild(h('div.small.faint', 'nothing yet'));
        stage.appendChild(log);

        /* the rightmost derivation, read backwards — the payoff */
        if (st.k >= run.steps.length) finish(log);
      }

      function controls() {
        const cur = run.steps[Math.min(st.k, run.steps.length - 1)];
        const done = st.k >= run.steps.length;
        if (done) return [h('span.small.good', 'run complete')];
        if (st.mode === 'worked') {
          return [
            h('button.btn-sm', { onclick: () => { st.k = Math.max(0, st.k - 1); render(); } }, '← back'),
            h('button.btn-primary.btn-sm', { onclick: () => { advance(true); } }, 'step ▶'),
            h('button.btn-sm', { onclick: () => play() }, st.playing ? '❚❚ pause' : '▶ play'),
            h('span.small.faint', { html: tex(`what happens here: ${cur.note}`) }),
          ];
        }
        const btns = [h('button', { onclick: () => guess({ type: 'shift' }) }, 'shift')];
        g.rules.forEach(r => btns.push(h('button.btn-sm', { onclick: () => guess({ type: 'reduce', rule: r.idx + 1 }) }, 'reduce r' + r.idx)));
        btns.push(h('button.btn-good.btn-sm', { onclick: () => guess({ type: 'accept' }) }, 'accept'));
        btns.push(h('button.btn-bad.btn-sm', { onclick: () => guess({ type: 'error' }) }, 'error'));
        if (st.mode === 'hinted' && st.wrong > 0)
          btns.push(h('button.btn-ghost.btn-sm', { onclick: () => {
            st.msg = { kind: 'warn', text: hint(cur) }; render();
          } }, 'hint'));
        return btns;
      }

      function hint(cur) {
        const state = T.states[cur.state];
        const its = state.items.map(i => '`' + itemText(T.grammar, i) + '`').join(', ');
        return `State ${cur.state} is the item set { ${its} }. Ask the two questions in order: ` +
          `(1) does some marked rule have the • directly in front of \`${cur.look}\`? then shift. ` +
          `(2) is some marked rule complete, \`a -> β •\`, with \`${cur.look}\` ∈ Follow(a)? then reduce by it.`;
      }

      function guess(choice) {
        const cur = run.steps[st.k];
        const want = cur.action;
        const ok = choice.type === want.type && (choice.type !== 'reduce' || choice.rule === want.rule);
        if (ok) {
          st.msg = { kind: 'good', text: '**Right.** ' + cur.note };
          store.record('shiftreduce', true, 1);
          st.k++;
          render();
          return;
        }
        st.wrong++;
        store.record('shiftreduce', false);
        st.msg = { kind: 'bad', text: diagnose(choice, cur) };
        render();
      }

      function diagnose(choice, cur) {
        const q = cur.state, t = cur.look, want = cur.action;
        const state = T.states[q];
        const wantTxt = want.type === 'shift' ? `**shift** \`${t}\` and go to state ${want.to}`
          : want.type === 'reduce' ? `**reduce by \`${ruleText(T.grammar, T.grammar.rules[want.rule])}\`**`
          : want.type === 'accept' ? '**accept**' : '**report an error**';
        let why = '';
        if (choice.type === 'reduce' && want.type === 'shift') {
          const r = T.grammar.rules[choice.rule];
          const top = cur.symbols.slice(-r.rhs.length).join(' ');
          const handleOk = r.rhs.length <= cur.symbols.length && r.rhs.join(' ') === top;
          why = handleOk
            ? `The top of the stack really is \`${top}\`, so \`${ruleText(T.grammar, r)}\` *looks* applicable — but a handle is more than a matching suffix. State ${q} does not contain the completed marked rule \`${r.lhs} -> ${r.rhs.join(' ') || EPS} ${DOT}\`, ` +
              `and \`${t}\` ∉ Follow(${r.lhs}) = {${[...(T.follow[r.lhs] || [])].join(', ')}}. Reducing here would leave a string that is no longer a viable prefix.`
            : `The stack top is \`${cur.symbols.slice(-3).join(' ') || EPS}\`, which does not end with \`${r.rhs.join(' ') || EPS}\` — you cannot reduce with a rule whose right-hand side is not on the stack.`;
        } else if (choice.type === 'shift' && want.type === 'reduce') {
          const r = T.grammar.rules[want.rule];
          why = `No marked rule in state ${q} has the • in front of \`${t}\`, so there is nothing to shift into. What state ${q} does contain is the completed rule \`${ruleText(T.grammar, r)}\` with the • at the end, and \`${t}\` ∈ Follow(${r.lhs}) = {${[...(T.follow[r.lhs] || [])].join(', ')}} — so the handle \`${r.rhs.join(' ') || EPS}\` on top of the stack must be popped and replaced by \`${r.lhs}\`.`;
        } else if (choice.type === 'reduce' && want.type === 'reduce') {
          const mine = T.grammar.rules[choice.rule], his = T.grammar.rules[want.rule];
          why = `\`${ruleText(T.grammar, mine)}\` is the wrong rule: the parser reduces by \`${ruleText(T.grammar, his)}\`, because that is the rule whose right-hand side sits on the stack *and* which is complete in state ${q}.`;
        } else if (want.type === 'accept') {
          why = `The input is exhausted and state ${q} contains \`${AUG} -> ${g.start} ${DOT} $\`. That is precisely the accept case of the lecture's definition of action().`;
        } else if (want.type === 'error') {
          why = `There is no action for \`${t}\` in state ${q}: what is on the stack, followed by \`${t}\`, is not a viable prefix of any rightmost derivation.`;
        } else {
          why = cur.note;
        }
        const its = T.states[q].items.slice(0, 6).map(i => '`' + itemText(T.grammar, i) + '`').join(', ');
        return `Not what the parser does. It would ${wantTxt}. ${why}\n\nState ${q} = { ${its}${T.states[q].items.length > 6 ? ', …' : ''} }.`;
      }

      function advance(narrate) {
        if (st.k >= run.steps.length) return;
        const cur = run.steps[st.k];
        st.k++;
        st.msg = narrate ? { kind: '', text: cur.note } : null;
        render();
      }
      function play() {
        if (st.playing) { clearInterval(st.timer); st.playing = false; render(); return; }
        st.playing = true;
        st.timer = setInterval(() => {
          if (st.k >= run.steps.length) { clearInterval(st.timer); st.playing = false; render(); return; }
          advance(true);
        }, 1100);
        render();
      }

      function finish(log) {
        if (!st.graded) {
          st.graded = true;
          store.flag('parser:sr-runs', (store.flag('parser:sr-runs') || 0) + 1);
          if (st.mode !== 'worked') {
            store.record('shiftreduce', st.wrong === 0, 3);
            store.logSession('shift-reduce', Math.max(0, run.steps.length - st.wrong), run.steps.length);
          }
          if (st.playing) { clearInterval(st.timer); st.playing = false; }
        }
        const reductions = run.steps.filter(s => s.action.type === 'reduce').reverse();
        const box = h('div', { style: { marginTop: '12px' } });
        box.appendChild(h('div.callout' + (run.accepted ? '.good' : '.bad'), { html: tex(
          run.accepted
            ? `**Accepted.** Now read the reductions *backwards*: that is a rightmost derivation of \`${S.word}\`. The **R** in LR stands for exactly this — a reverse rightmost derivation.`
            : `The parser stopped in an error configuration, so \`${S.word}\` ∉ $L(G)$ — and it stopped at the earliest possible moment, as soon as the prefix read so far could not be extended to any word of the language.`) }));
        if (run.accepted && reductions.length) {
          const der = h('div.pz-steps');
          der.appendChild(h('div.st', h('span.ar', ' '), h('span', g.start)));
          reductions.forEach(s => der.appendChild(h('div.st', h('span.ar', '⇒'),
            h('span', ruleText(T.grammar, T.grammar.rules[s.action.rule])), h('span.why', 'rightmost'))));
          box.appendChild(h('div.pz-sub', { style: { marginTop: '10px' } }, 'the rules, in reverse order of reduction'));
          box.appendChild(der);
        }
        log.parentElement.appendChild(box);
      }

      render();
      return wrap;
    }

    /* ================================================================
       TAB 2 — the LR(0) item-set automaton
       ================================================================ */
    function tabItems() {
      const wrap = h('div');
      const g = S.g, T = S.table;
      const A = T.automaton;
      const st = (S.items ||= { sel: 0, quiz: null });

      const card = h('div.card');
      card.appendChild(h('div.pz-sub', 'The goto graph — a DFA that recognises viable prefixes'));
      card.appendChild(h('p.small.muted', { html: tex(
        'Each state is a set of marked rules closed under `closure()`. A transition on a symbol X moves the • past X in every rule that has it there. ' +
        'Click a state to see how its closure was derived.') }));
      const graph = h('div.pz-graph', { html: renderAutomaton(A, T, st.sel) });
      graph.addEventListener('click', e => {
        const n = e.target.closest('[data-state]');
        if (!n) return;
        st.sel = +n.getAttribute('data-state'); st.quiz = null; draw();
      });
      card.appendChild(graph);
      wrap.appendChild(card);

      /* state detail */
      const sel = A.states[st.sel];
      const det = h('div.card');
      det.appendChild(h('div.pz-sub', `State ${st.sel}`));
      const kernelKeys = new Set(sel.kernel.map(i => i.rule + ':' + i.dot));
      const list = h('div.pz-items');
      sel.items.forEach(i => {
        const isK = kernelKeys.has(i.rule + ':' + i.dot);
        list.appendChild(h('div.it.' + (isK ? 'kernel' : 'closed'), itemText(A.grammar, i)));
      });
      det.appendChild(list);
      det.appendChild(h('p.small.faint', { style: { marginTop: '8px' }, html: tex(
        st.sel === 0
          ? `The start state is $closure(\\{ ${AUG} → ${DOT}\; ${g.start}\; \\$ \\})$ — the highlighted rules are the kernel, everything else was forced by the closure.`
          : 'Highlighted rules are the **kernel** (the • moved past the incoming symbol); the rest were added by `closure()`.') }));

      if (sel.closureLog.length) {
        det.appendChild(h('div.pz-sub', { style: { marginTop: '12px' } }, 'how the closure grew'));
        const rounds = h('div.pz-rounds');
        sel.closureLog.forEach(r => {
          const box = h('div.pz-round', h('h4', `round ${r.round}`));
          r.added.forEach(a => box.appendChild(h('div.add', { html: tex(
            `**${itemText(A.grammar, a.item)}** — because \`${itemText(A.grammar, a.from)}\` has the • in front of the variable \`${a.variable}\`, and closure adds \`${a.variable} -> ${DOT} γ\` for every rule of \`${a.variable}\`.`) })));
          rounds.appendChild(box);
        });
        det.appendChild(rounds);
      } else {
        det.appendChild(h('p.small.faint', { html: tex('The kernel is already closed — no • stands in front of a variable.') }));
      }

      /* transitions + a prediction question */
      const trans = Object.entries(sel.trans || {});
      if (trans.length) {
        det.appendChild(h('div.pz-sub', { style: { marginTop: '12px' } }, 'transitions'));
        const tr = h('div.row');
        trans.forEach(([X, to]) => tr.appendChild(h('button.btn-sm', { onclick: () => { st.sel = to; st.quiz = null; draw(); } },
          `goto(${st.sel}, ${symText(g, X)}) = ${to}`)));
        det.appendChild(tr);

        /* retrieval before exposition: predict one goto */
        const q = (st.quiz ||= { pick: trans[Math.floor(Math.random() * trans.length)], done: false });
        const qb = h('div', { style: { marginTop: '12px' } });
        if (!q.done) {
          qb.appendChild(h('div.callout', { html: tex(
            `**Before you click:** which item set is $goto(${st.sel}, ${symText(g, q.pick[0])})$? ` +
            `Move the • past \`${q.pick[0]}\` in every rule of state ${st.sel} that has it there, then close. How many marked rules does the result contain?`) }));
          const inp = h('input', { type: 'number', min: '1', style: { width: '90px' } });
          qb.appendChild(h('div.pz-q', inp, h('button.btn-primary.btn-sm', { onclick: () => {
            const want = A.states[q.pick[1]].items.length;
            q.done = true; q.ok = (+inp.value === want); q.want = want;
            store.record('lr-items', q.ok, 2);
            draw();
          } }, 'check')));
        } else {
          const target = A.states[q.pick[1]];
          qb.appendChild(h('div.callout' + (q.ok ? '.good' : '.bad'), { html: tex(
            `$goto(${st.sel}, ${symText(g, q.pick[0])})$ = state ${q.pick[1]}, with **${q.want}** marked rules` +
            (q.ok ? '.' : ` — you said something else. The kernel is { ${target.kernel.map(i => '`' + itemText(A.grammar, i) + '`').join(', ')} }; closure then adds ${target.items.length - target.kernel.length} more.`)) }));
          qb.appendChild(h('div.pz-items', ...target.items.map(i => h('div.it', itemText(A.grammar, i)))));
        }
        det.appendChild(qb);
      }
      wrap.appendChild(det);
      return wrap;
    }

    /* ================================================================
       TAB 3 — build the action table yourself
       ================================================================ */
    function tabTable() {
      const wrap = h('div');
      const g = S.g, T = S.table;
      const terms = T.terminals;
      const st = (S.drill ||= { cells: null, checked: false, show: false });

      if (!st.cells) {
        /* pick a handful of interesting cells: some shifts, some reduces,
           at least one conflict and one error cell */
        const all = [];
        T.states.forEach(s => terms.forEach(t => all.push({ s: s.id, t })));
        const isConf = (s, t) => T.conflicts.some(c => c.state === s && c.lookahead === t);
        const filled = all.filter(c => T.action[c.s][c.t]);
        const empty = all.filter(c => !T.action[c.s][c.t]);
        const conf = all.filter(c => isConf(c.s, c.t));
        const pickN = (arr, n) => ui.shuffle(arr).slice(0, n);
        st.cells = [...pickN(conf, 2), ...pickN(filled, 6), ...pickN(empty, 2)]
          .filter((c, i, a) => a.findIndex(x => x.s === c.s && x.t === c.t) === i)
          .slice(0, 8)
          .sort((a, b) => a.s - b.s || terms.indexOf(a.t) - terms.indexOf(b.t));
      }

      const card = h('div.card');
      card.appendChild(h('div.pz-sub', 'Fill the action cells'));
      card.appendChild(h('p.small.muted', { html: tex(
        'Write `s7` for ⟨shift, s<sub>7</sub>⟩, `r3` for ⟨reduce, r<sub>3</sub>⟩ **using your own rule numbers from the grammar above**, `acc` for accept, ' +
        'and leave the field empty for error. The definition, one more time: shift if the • stands in front of the token; reduce by `a -> β` if `a -> β •` is in the state *and* the token lies in Follow(a); accept on `' + AUG + ' -> ' + g.start + ' ' + DOT + ' $`.') }));

      const tbl = h('table.pz-table');
      tbl.appendChild(h('thead', h('tr', h('th', 'state'), h('th', 'token'), h('th', 'action(q, t)'), h('th', 'the item set, for reference'))));
      const tb = h('tbody');
      const inputs = [];
      st.cells.forEach(c => {
        const inp = h('input', { type: 'text', placeholder: 'sN / rN / acc / —' });
        inputs.push({ c, inp });
        const items = T.states[c.s].items.map(i => itemText(T.grammar, i)).join('   ·   ');
        tb.appendChild(h('tr',
          h('td.num', 'q' + c.s), h('td', h('span.pz-sym.t', c.t === EOF ? '$' : symText(g, c.t))),
          h('td', inp), h('td.small', { style: { whiteSpace: 'normal', maxWidth: '380px' } }, items)));
      });
      tbl.appendChild(tb);
      card.appendChild(h('div.pz-scroll', tbl));
      const out = h('div', { style: { marginTop: '12px' } });
      card.appendChild(h('div.row', { style: { marginTop: '12px' } },
        h('button.btn-primary', { onclick: () => check() }, 'Check'),
        h('button.btn-ghost', { disabled: !st.checked, onclick: () => { st.show = true; draw(); } }, 'Show the whole table'),
        h('button.btn-sm.btn-ghost', { onclick: () => { S.drill = null; draw(); } }, 'new cells')));
      card.appendChild(out);
      wrap.appendChild(card);

      function check() {
        clear(out);
        st.checked = true;
        let right = 0;
        for (const { c, inp } of inputs) {
          const want = T.action[c.s][c.t];
          const conf = T.conflicts.filter(x => x.state === c.s && x.lookahead === c.t);
          const got = parseCell(inp.value);
          const ok = cellEq(got, want);
          right += ok ? 1 : 0;
          inp.parentElement.className = ok ? 'ok' : 'err';
          if (conf.length) inp.parentElement.classList.add('conflict');
          out.appendChild(h('div.callout' + (ok ? '.good' : '.bad'), { style: { marginTop: '6px' }, html: tex(
            `action(${c.s}, ${c.t}) = ${fmtAction(T, want)} — ` + explainCell(T, g, c, want, got, ok)) }));
          conf.forEach(x => out.appendChild(h('div.callout.warn', { style: { marginTop: '4px' }, html: tex(
            x.text + (x.kind === 'shift-reduce'
              ? ' This is the classic expression-grammar conflict: resolve it by **layering** the grammar into precedence levels, or by declaring precedence in the parser generator.'
              : ' Reduce-reduce conflicts are never fixable by precedence declarations — the grammar itself has to change.')) })));
          if (conf.length) store.record('conflicts', ok, 2);
        }
        store.record('slr', right === inputs.length, 3);
        store.logSession('slr-table', right, inputs.length);
        out.insertBefore(h('div.callout' + (right === inputs.length ? '.good' : '.warn'), { html: tex(
          `${right} of ${inputs.length} cells right.`) }), out.firstChild);
      }

      if (st.show) wrap.appendChild(fullTable());
      if (T.conflicts.length) wrap.appendChild(conflictCard());
      wrap.appendChild(comparisonCard());
      return wrap;

      function fullTable() {
        const c2 = h('div.card');
        c2.appendChild(h('div.pz-sub', 'action and goto, in full'));
        const t2 = h('table.pz-table');
        t2.appendChild(h('thead', h('tr', h('th', ''), ...terms.map(t => h('th.num', t === EOF ? '$' : t)),
          ...g.vars.map(v => h('th.num', { style: { color: 'var(--accent)' } }, v)))));
        const body = h('tbody');
        T.states.forEach(s => {
          const row = h('tr', h('td.num', 'q' + s.id));
          terms.forEach(t => {
            const a = T.action[s.id][t];
            const conf = T.conflicts.some(x => x.state === s.id && x.lookahead === t);
            row.appendChild(h('td.num' + (conf ? '.conflict' : ''), { html: a ? `<span class="${a.type}">${shortAction(a)}</span>` : '' }));
          });
          g.vars.forEach(v => row.appendChild(h('td.num', (T.goto[s.id] || {})[v] ?? '')));
          body.appendChild(row);
        });
        t2.appendChild(body);
        c2.appendChild(h('div.pz-scroll', t2));
        c2.appendChild(h('p.small.faint', { style: { marginTop: '8px' }, html: tex(
          'Blank = error. `sN` = shift and go to N, `rN` = reduce by the parser\'s rule N (your rule N−1), `acc` = accept.') }));
        return c2;
      }

      function conflictCard() {
        const c3 = h('div.card');
        c3.appendChild(h('div.pz-sub', `${T.conflicts.length} conflict${T.conflicts.length === 1 ? '' : 's'} — this grammar is not SLR`));
        T.conflicts.forEach(x => c3.appendChild(h('div.callout.bad', { style: { marginTop: '6px' }, html: tex(x.text) })));
        return c3;
      }

      function comparisonCard() {
        const c4 = h('div.card');
        c4.appendChild(h('div.pz-sub', 'SLR vs. canonical LR(1) vs. LALR(1)'));
        let cmp;
        try { cmp = compareTables(g); } catch (e) { cmp = null; }
        if (!cmp) { c4.appendChild(h('p.small.muted', 'comparison unavailable for this grammar')); return c4; }
        const row = (name, d) => h('tr', h('td', name),
          h('td.num', d ? d.states : '—'), h('td.num', d ? d.conflicts : '—'));
        const t = h('table.pz-table', h('thead', h('tr', h('th', 'construction'), h('th.num', 'states'), h('th.num', 'conflicts'))),
          h('tbody', row('SLR', cmp.slr), row('canonical LR(1)', cmp.lr1), row('LALR(1)', cmp.lalr)));
        c4.appendChild(t);
        c4.appendChild(h('p.small.muted', { style: { marginTop: '8px' }, html: tex(
          'SLR reduces whenever the token is in Follow(a) — the crudest possible lookahead. Canonical LR(1) carries the lookahead *inside* the item, ' +
          'so it distinguishes contexts SLR cannot, at the price of many more states. LALR(1) merges the LR(1) states that share an LR(0) core: ' +
          'the state count falls back to the SLR one, and only reduce-reduce conflicts can reappear. ' +
          (cmp.lr1 && cmp.slr.conflicts > cmp.lr1.conflicts
            ? `**For this grammar it matters:** SLR has ${cmp.slr.conflicts} conflicts, LR(1) has ${cmp.lr1.conflicts}.`
            : cmp.lr1 ? 'For this grammar all three agree on the conflicts.' : (cmp.note || ''))) }));
        c4.appendChild(h('p.small.faint', { html: tex('The LR(1) and LALR(1) numbers are computed for comparison; the drills above are SLR, as in the lecture.') }));
        return c4;
      }
    }

    /* ================================================================
       TAB 4 — the Earley chart
       ================================================================ */
    function tabEarley() {
      const wrap = h('div');
      const g = S.g;
      const tk = tokenize(S.word, g);
      const head = h('div.card');
      head.appendChild(h('div.pz-sub', 'Earley chart'));
      head.appendChild(wordPicker(() => { S.ea = null; draw(); }));
      wrap.appendChild(head);
      if (tk.error) { head.appendChild(h('div.callout.bad', { style: { marginTop: '10px' }, html: tex(tk.error) })); return wrap; }

      const chart = earley(g, tk.tokens);
      const st = (S.ea ||= { j: 0, seen: 0, guess: null, open: null });
      st.j = Math.min(st.j, chart.n);

      head.appendChild(h('p.small.muted', { style: { marginTop: '10px' }, html: tex(
        `Earley keeps ${chart.n + 1} sets $Q_0 … Q_{${chart.n}}$ of objects $⟨a → β • γ,\; k⟩$. ` +
        `The object says: the parser is using the rule $a → βγ$, it has already matched β against $x_{k+1} … x_j$, and it still needs γ. ` +
        `No table, no states — just three operations: **prediction**, **reading** (scan) and **completion**.`) }));

      /* the word, with the cut at position j */
      const word = h('div.pz-word', { style: { marginTop: '10px' } });
      tk.tokens.forEach((t, i) => word.appendChild(h('span.tk' + (i < st.j ? '.past' : i === st.j ? '.now' : ''), t)));
      word.appendChild(h('span.small.faint', { html: tex(` — Q_{${st.j}} describes the parser after reading ${st.j} token${st.j === 1 ? '' : 's'}`) }));
      head.appendChild(word);

      const bar = h('div.pz-qsets', { style: { marginTop: '10px' } });
      for (let j = 0; j <= chart.n; j++) bar.appendChild(h('button', {
        class: (j === st.j ? 'on' : '') + (j <= st.seen ? ' done' : ''),
        onclick: () => { st.j = j; st.seen = Math.max(st.seen, j); st.guess = null; st.open = null; draw(); },
      }, 'Q' + sub(j)));
      head.appendChild(bar);

      /* prediction challenge before revealing the next set */
      const body = h('div.card');
      if (st.j > st.seen) {
        body.appendChild(h('div.callout', { html: tex(
          `**Predict first.** You have just seen $Q_{${st.j - 1}}$. The next token is \`${tk.tokens[st.j - 1]}\`. ` +
          `Scanning moves every object whose • stands in front of \`${tk.tokens[st.j - 1]}\` into $Q_{${st.j}}$; then completion and prediction run to a fixed point. ` +
          `How many objects will $Q_{${st.j}}$ contain?`) }));
        const inp = h('input', { type: 'number', min: '0', style: { width: '90px' } });
        body.appendChild(h('div.pz-q', inp,
          h('button.btn-primary.btn-sm', { onclick: () => {
            const want = chart.sets[st.j].length;
            st.guess = { said: +inp.value, want, ok: +inp.value === want };
            store.record('earley', st.guess.ok, 2);
            st.seen = st.j; draw();
          } }, 'reveal'),
          h('button.btn-ghost.btn-sm', { onclick: () => { st.seen = st.j; store.record('earley', false, 0); draw(); } }, 'just show me')));
        wrap.appendChild(body);
        return wrap;
      }

      if (st.guess) body.appendChild(h('div.callout' + (st.guess.ok ? '.good' : '.bad'), { html: tex(
        st.guess.ok
          ? `**${st.guess.want} objects** — exactly right.`
          : `You said ${st.guess.said}; $Q_{${st.j}}$ has **${st.guess.want}** objects. Count the scans first, then chase every completion they trigger — a single completion often unblocks a whole chain.`) }));

      body.appendChild(h('div.pz-sub', `Q${sub(st.j)} — ${chart.sets[st.j].length} objects`));
      const objs = h('div.pz-objs');
      chart.sets[st.j].forEach((it, i) => {
        const line = h('div.pz-obj.' + it.reason + (st.open === i ? '.open' : ''),
          h('span', `⟨ ${itemText(chart.grammar, it)}, ${it.origin} ⟩`),
          h('span.tagop', it.reason === 'scan' ? 'reading' : it.reason));
        line.addEventListener('click', () => { st.open = st.open === i ? null : i; draw(); });
        objs.appendChild(line);
        if (st.open === i) objs.appendChild(h('div.pz-why', { html: tex(earleyWhy(chart, st.j, i)) }));
      });
      body.appendChild(objs);
      body.appendChild(h('p.small.faint', { style: { marginTop: '8px' },
        html: tex('Click any object to see **why** it is there. Colour: blue = predicted, green = read, violet = completed.') }));

      if (st.j === chart.n) {
        body.appendChild(h('div.callout' + (chart.accepted ? '.good' : '.bad'), { style: { marginTop: '10px' }, html: tex(
          chart.accepted
            ? `$Q_{${chart.n}}$ contains $⟨ ${AUG} → ${g.start} •,\; 0 ⟩$, so \`${S.word}\` ∈ $L(G)$ — that single object is the whole acceptance test.`
            : `$Q_{${chart.n}}$ does **not** contain $⟨ ${AUG} → ${g.start} •,\; 0 ⟩$, so \`${S.word}\` ∉ $L(G)$.`) }));
        const trees = chart.accepted ? GR.earleyTrees(chart, 2) : [];
        if (trees.length) {
          body.appendChild(h('div.pz-sub', { style: { marginTop: '10px' } },
            trees.length > 1 ? 'two parse trees read back out of the chart — the word is ambiguous here' : 'the parse tree, read back out of the chart'));
          body.appendChild(h('div.pz-trees2', ...trees.map(t => h('div.pz-tree', { html: GR.renderTree(t) }))));
        }
      }
      wrap.appendChild(body);
      return wrap;
    }

    draw();
    return () => { if (S.sr && S.sr.timer) clearInterval(S.sr.timer); };
  },
};

/* ===================================================================== */
/* ---- action-cell helpers ---- */
function parseCell(text) {
  const t = String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!t || t === '-' || t === '—' || t === 'error' || t === 'err') return { type: 'error' };
  if (t === 'acc' || t === 'accept') return { type: 'accept' };
  let m = /^s(?:hift)?[,:]?(\d+)$/.exec(t);
  if (m) return { type: 'shift', to: +m[1] };
  m = /^r(?:educe)?[,:]?(\d+)$/.exec(t);
  if (m) return { type: 'reduce', rule: +m[1] + 1 };   // learner uses the grammar's own numbering
  return { type: 'junk', raw: text };
}
function cellEq(got, want) {
  if (!want) return got.type === 'error';
  if (got.type !== want.type) return false;
  if (want.type === 'shift') return got.to === want.to;
  if (want.type === 'reduce') return got.rule === want.rule;
  return true;
}
function fmtAction(T, a) {
  if (!a) return '**error** (the cell stays empty)';
  if (a.type === 'shift') return `⟨shift, s${a.to}⟩`;
  if (a.type === 'accept') return '**accept**';
  return `⟨reduce, \`${ruleText(T.grammar, T.grammar.rules[a.rule])}\`⟩ — that is your rule r${a.rule - 1}`;
}
function shortAction(a) {
  return a.type === 'shift' ? 's' + a.to : a.type === 'accept' ? 'acc' : 'r' + (a.rule - 1);
}
function explainCell(T, g, c, want, got, ok) {
  const items = T.states[c.s].items;
  if (ok) {
    if (!want) return `nothing in state ${c.s} has the • in front of \`${c.t}\`, and no completed rule there has \`${c.t}\` in its Follow set — so the cell is empty and the parser reports a syntax error.`;
    if (want.type === 'shift') return `state ${c.s} contains a marked rule with the • directly in front of \`${c.t}\`, so the parser shifts and moves to $goto(${c.s}, ${c.t}) = ${want.to}$.`;
    if (want.type === 'accept') return `state ${c.s} contains \`${AUG} -> ${g.start} ${DOT} $\` and the lookahead is Eof.`;
    const r = T.grammar.rules[want.rule];
    return `\`${r.lhs} -> ${r.rhs.join(' ') || EPS} ${DOT}\` is complete in state ${c.s} and \`${c.t}\` ∈ Follow(${r.lhs}) = {${[...(T.follow[r.lhs] || [])].join(', ')}}.`;
  }
  if (got.type === 'junk') return `\`${got.raw}\` is not a legal entry — write \`sN\`, \`rN\`, \`acc\`, or nothing at all.`;
  if (got.type === 'shift' && (!want || want.type !== 'shift')) {
    const has = items.some(i => T.grammar.rules[i.rule].rhs[i.dot] === c.t);
    return has ? `you shifted to the wrong state — moving the • past \`${c.t}\` and closing gives state ${want.to}.`
      : `you cannot shift \`${c.t}\` here: **no** marked rule in state ${c.s} has the • in front of \`${c.t}\`. Shift is only defined where some rule is actually expecting that token next.`;
  }
  if (got.type === 'reduce') {
    const r = T.grammar.rules[got.rule];
    if (!r) return 'that rule number does not exist.';
    const complete = items.some(i => i.rule === got.rule && i.dot === r.rhs.length);
    if (!complete) return `\`${ruleText(T.grammar, r)}\` is not complete in state ${c.s} — you may only reduce by a rule whose • has reached the end. Reducing early would throw away symbols the parser has not read yet.`;
    return `\`${ruleText(T.grammar, r)}\` *is* complete here, but \`${c.t}\` ∉ Follow(${r.lhs}) = {${[...(T.follow[r.lhs] || [])].join(', ')}} — and SLR reduces only on tokens that can actually follow the left-hand side.`;
  }
  if (got.type === 'error' && want) return `you left it empty, but the state does justify an action here.`;
  if (got.type === 'accept') return `accept is only for the single marked rule \`${AUG} -> ${g.start} ${DOT} $\` with lookahead \`$\`.`;
  return 'compare the cell with the item set printed beside it.';
}

/* ---- the goto graph, laid out by BFS level ---- */
function renderAutomaton(A, T, selected) {
  const n = A.states.length;
  const level = new Array(n).fill(-1);
  level[0] = 0;
  const q = [0];
  while (q.length) {
    const s = q.shift();
    for (const to of Object.values(A.states[s].trans || {}))
      if (level[to] < 0) { level[to] = level[s] + 1; q.push(to); }
  }
  for (let i = 0; i < n; i++) if (level[i] < 0) level[i] = 0;
  const cols = {};
  const pos = [];
  for (let i = 0; i < n; i++) {
    const L = level[i];
    cols[L] = (cols[L] || 0);
    pos[i] = { x: 40 + L * 150, y: 34 + cols[L] * 56, L };
    cols[L]++;
  }
  const W = 40 + (Math.max(...level) + 1) * 150 + 40;
  const H = 34 + Math.max(...Object.values(cols)) * 56 + 30;
  const conflictStates = new Set(T.conflicts.map(c => c.state));

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const edges = [], nodes = [];
  for (let i = 0; i < n; i++) {
    for (const [X, to] of Object.entries(A.states[i].trans || {})) {
      const a = pos[i], b = pos[to];
      const on = (i === selected || to === selected);
      if (i === to) {
        edges.push(`<path class="lr-edge${on ? ' on' : ''}" d="M${a.x + 20} ${a.y - 12} c 18 -22 42 -22 54 0"/>` +
          `<text class="lr-lab${on ? ' on' : ''}" x="${a.x + 47}" y="${a.y - 20}" text-anchor="middle">${esc(X)}</text>`);
        continue;
      }
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - (b.L === a.L ? 22 : 0);
      edges.push(`<path class="lr-edge${on ? ' on' : ''}" d="M${a.x + 44} ${a.y} Q ${mx} ${my} ${b.x - 6} ${b.y}"/>` +
        `<text class="lr-lab${on ? ' on' : ''}" x="${mx}" y="${my - 3}" text-anchor="middle">${esc(X)}</text>`);
    }
  }
  for (let i = 0; i < n; i++) {
    const p = pos[i];
    const cls = 'lr-state' + (i === selected ? ' on' : '') + (conflictStates.has(i) ? ' conf' : '');
    nodes.push(`<g class="${cls}" data-state="${i}">` +
      `<rect x="${p.x - 6}" y="${p.y - 14}" width="50" height="28" rx="8"/>` +
      `<text x="${p.x + 19}" y="${p.y + 4}" text-anchor="middle">q${i}</text></g>`);
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><marker id="pz-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
    `<path d="M0 0 L10 5 L0 10 z" fill="var(--border-strong)"/></marker></defs>` +
    edges.join('') + nodes.join('') + '</svg>';
}
