/* =====================================================================
   Grammar Lab  (route id: grammar)
   Derivations, parse trees, ambiguity, precedence layering, First/Follow.
   Notation follows Stroetmann: λ is the empty word, First sets never
   contain λ (nullable() is a separate predicate), Follow(s) ∋ $.
   ===================================================================== */
import * as GR from '../core/grammar.js';

const {
  parseGrammar, tokenize, ruleText, rhsText, symText, analyse, GALLERY, galleryById,
  newDerivation, frontier, sententialForm, nextNode, expand, undo, isComplete,
  yieldOf, renderTree, isAmbiguous, derivesString, slrTable, EPS, EOF,
} = GR;

const TABS = [
  { id: 'edit',  label: 'Grammar',        concept: 'cfg' },
  { id: 'deriv', label: 'Derivation',     concept: 'derivation' },
  { id: 'ambig', label: 'Ambiguity',      concept: 'ambiguity' },
  { id: 'ff',    label: 'First & Follow', concept: 'follow' },
];

export default {
  id: 'grammar',
  title: 'Grammar Lab',

  mount(root, ctx) {
    const { ui, store } = ctx;
    const { h, clear, tex, toast } = ui;
    ui.loadCss('css/modules/parsing.css');

    const S = {
      src: store.flag('grammar:src') || galleryById('expr-small').text,
      galleryId: store.flag('grammar:gallery') || 'expr-small',
      g: null,
      tab: 'edit',
      deriv: null,
      target: '',
      mode: 'left',
      hotNode: null,
      deadEnd: null,
      treeQuiz: null,
      ffState: null,
    };
    S.g = parseGrammar(S.src);

    root.appendChild(ui.pageHead('Unit 4 · context-free grammars', 'Grammar Lab',
      'Write a grammar, derive a word by hand and watch the parse tree grow with it. ' +
      'Then break the tie: the same word, two trees, two meanings.'));

    const tabBar = h('div.pz-tabs');
    TABS.forEach(t => tabBar.appendChild(h('button', {
      class: S.tab === t.id ? 'on' : '', 'data-tab': t.id,
      onclick: () => { S.tab = t.id; draw(); },
    }, t.label)));
    root.appendChild(tabBar);

    const panel = h('div');
    root.appendChild(panel);

    /* ---------------------------------------------------------------- */
    function draw() {
      [...tabBar.children].forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
      clear(panel);
      try {
        if (S.tab === 'edit')  panel.appendChild(tabEdit());
        if (S.tab === 'deriv') panel.appendChild(tabDeriv());
        if (S.tab === 'ambig') panel.appendChild(tabAmbig());
        if (S.tab === 'ff')    panel.appendChild(tabFF());
      } catch (err) {
        console.error(err);
        panel.appendChild(h('div.card', h('h3', 'Something in this grammar broke the lab'),
          h('p.muted.small', String(err && err.message || err)),
          h('button.btn-ghost', { onclick: () => { loadGallery('expr-small'); } }, 'Load a known-good grammar')));
      }
    }

    function reparse() {
      S.g = parseGrammar(S.src);
      store.flag('grammar:src', S.src);
      S.deriv = null; S.deadEnd = null; S.treeQuiz = null; S.ffState = null;
    }
    function loadGallery(id) {
      const ex = galleryById(id);
      S.galleryId = id; S.src = ex.text; store.flag('grammar:gallery', id);
      S.target = (ex.words || [])[0] || '';
      reparse(); draw();
    }

    /* ================================================================
       TAB 1 — the grammar itself
       ================================================================ */
    function tabEdit() {
      const wrap = h('div');
      const box = h('div.card.pz-editor');
      box.appendChild(h('div.pz-sub', 'Grammar'));

      const ta = h('textarea', { spellcheck: 'false', rows: 10 });
      ta.value = S.src;
      const diag = h('div.pz-diag');
      const sum = h('div', { style: { marginTop: '10px' } });

      const revalidate = () => {
        S.src = ta.value;
        S.g = parseGrammar(S.src);
        store.flag('grammar:src', S.src);
        S.deriv = null; S.ffState = null; S.treeQuiz = null;
        renderDiag(); renderSum();
      };
      ta.addEventListener('input', revalidate);
      box.appendChild(ta);
      box.appendChild(diag);
      box.appendChild(sum);

      function renderDiag() {
        clear(diag);
        const g = S.g;
        for (const e of g.errors)
          diag.appendChild(h('div.d', h('span.ln', 'line ' + e.line), h('span', { html: tex(e.msg) })));
        for (const w of g.warnings)
          diag.appendChild(h('div.d.warn', h('span.ln', 'line ' + w.line), h('span', { html: tex(w.msg) })));
        if (!g.errors.length)
          diag.appendChild(h('div.d.good', h('span.ln', 'ok'),
            h('span', { html: tex(`${g.rules.length} rules · ${g.vars.length} variables · ${g.terms.length} terminals · start symbol \`${g.start}\``) })));
      }

      function renderSum() {
        clear(sum);
        const g = S.g;
        if (!g.ok()) return;
        const a = analyse(g);
        sum.appendChild(h('div.pz-kv',
          h('span', h('b', 'Variables: '), ...g.vars.map(v => h('span.pz-sym.v', { style: { marginRight: '4px' } }, v))),
          h('span', h('b', 'Terminals: '), ...g.terms.map(t => h('span.pz-sym.t', { style: { marginRight: '4px' } }, symText(g, t)))),
        ));
        const nul = [...a.nullable.set];
        sum.appendChild(h('p.small.muted', { style: { margin: '8px 0 0' }, html: tex(
          nul.length
            ? `λ-generating variables: ${nul.map(v => '`' + v + '`').join(', ')} — these are the ones that make First/Follow interesting.`
            : 'No variable is λ-generating, so no rule has an empty right-hand side (directly or indirectly).') }));
        let T = null;
        try { T = slrTable(g); } catch {}
        if (T) sum.appendChild(h('p.small', { style: { margin: '6px 0 0' }, html: tex(
          T.conflicts.length
            ? `**Not an SLR grammar**: the LR(0) automaton has ${T.states.length} states and the action table has ${T.conflicts.length} conflict${T.conflicts.length === 1 ? '' : 's'}. Take it to the Parser Lab.`
            : `SLR-clean: ${T.states.length} states, no conflicts.`) }));
      }

      renderDiag(); renderSum();
      wrap.appendChild(box);

      /* rules, numbered as the parser will number them */
      if (S.g.ok()) {
        const rc = h('div.card');
        rc.appendChild(h('div.pz-sub', 'Rules (the numbering the parser uses)'));
        const list = h('div.pz-rules');
        S.g.rules.forEach(r => list.appendChild(h('div.r',
          h('span.n', 'r' + r.idx), h('span', ruleText(S.g, r)))));
        rc.appendChild(list);
        wrap.appendChild(rc);
        rc.appendChild(membershipQuiz());
      }

      /* gallery */
      const gc = h('div.card');
      gc.appendChild(h('div.pz-sub', 'The lecture’s grammars'));
      const gal = h('div.pz-gallery');
      GALLERY.forEach(ex => gal.appendChild(h('button.btn-sm', {
        class: S.galleryId === ex.id ? 'on' : '',
        onclick: () => loadGallery(ex.id),
      }, ex.name)));
      gc.appendChild(gal);
      const ex = galleryById(S.galleryId);
      gc.appendChild(h('p.small.muted', { style: { margin: '10px 0 0' }, html: tex(ex.note) }));
      wrap.appendChild(gc);
      return wrap;
    }

    /* Retrieval first: is this word in L(G)? Then the machine answers. */
    function membershipQuiz() {
      const g = S.g;
      const ex = galleryById(S.galleryId);
      const pool = [...(ex.words || [])];
      if (!pool.length) return h('div');
      const word = pool[Math.floor(Math.random() * pool.length)];
      const box = h('div', { style: { marginTop: '14px' } });
      box.appendChild(h('div.callout', { html: tex(`**Before you scroll on:** is \`${word}\` in $L(G)$?`) }));
      const row = h('div.pz-q');
      const answer = (said) => {
        const tk = tokenize(word, g);
        const truth = !tk.error && GR.earley(g, tk.tokens).accepted;
        const ok = said === truth;
        store.record('cfg', ok);
        clear(row);
        row.appendChild(h('div.callout' + (ok ? '.good' : '.bad'), { html: tex(
          (ok ? '**Right.** ' : '**No.** ') +
          `\`${word}\` ${truth ? 'is' : 'is not'} in $L(G)$` +
          (tk.error ? ` — in fact it does not even tokenise: ${tk.error}`
                    : truth ? `, and a leftmost derivation exists — build it in the Derivation tab.`
                            : `. Earley's algorithm finds no object ⟨ŝ → s •, 0⟩ in the last set Q${GR.sub(tk.tokens.length)}.`)) }));
      };
      row.appendChild(h('button.btn-good', { onclick: () => answer(true) }, 'Yes, it is'));
      row.appendChild(h('button.btn-bad', { onclick: () => answer(false) }, 'No, it is not'));
      box.appendChild(row);
      return box;
    }

    /* ================================================================
       TAB 2 — derivation builder + live parse tree
       ================================================================ */
    function ensureDeriv() {
      if (!S.deriv) { S.deriv = newDerivation(S.g); S.deadEnd = null; S.treeQuiz = null; }
      return S.deriv;
    }

    function tabDeriv() {
      const g = S.g;
      const wrap = h('div');
      if (!g.ok()) return notReady(wrap, 'Fix the grammar first — the Grammar tab lists what went wrong.');

      const ex = galleryById(S.galleryId);
      if (!S.target) S.target = (ex.words || [])[0] || '';
      const tk = tokenize(S.target, g);

      /* --- controls --- */
      const ctrl = h('div.card');
      ctrl.appendChild(h('div.pz-sub', 'Target word'));
      const inp = h('input.mono', { type: 'text', value: S.target, style: { minWidth: '220px' } });
      inp.addEventListener('change', () => { S.target = inp.value.trim(); S.deriv = null; draw(); });
      const modeBtn = (m, lab) => h('button.btn-sm', {
        class: S.mode === m ? 'on' : '',
        style: S.mode === m ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {},
        onclick: () => { S.mode = m; draw(); },
      }, lab);
      ctrl.appendChild(h('div.row', inp,
        ...(ex.words || []).map(w => h('button.btn-sm.btn-ghost', { onclick: () => { S.target = w; S.deriv = null; draw(); } }, w)),
        h('span.spacer'),
        modeBtn('left', 'leftmost'), modeBtn('right', 'rightmost'), modeBtn('free', 'free'),
        h('button.btn-sm.btn-ghost', { onclick: () => { S.deriv = null; draw(); } }, 'restart')));
      ctrl.appendChild(h('p.small.faint', { style: { margin: '8px 0 0' }, html: tex(
        S.mode === 'free'
          ? 'Free mode: rewrite any variable you like. Every order gives the *same* parse tree — that is the point.'
          : `A **${S.mode}most** derivation always rewrites the ${S.mode}most variable. ⇒ is one step, ⇒<sup>*</sup> is any number of them.`) }));
      if (tk.error) {
        ctrl.appendChild(h('div.callout.bad', { style: { marginTop: '10px' }, html: tex(tk.error) }));
        wrap.appendChild(ctrl);
        return wrap;
      }
      wrap.appendChild(ctrl);

      const d = ensureDeriv();
      const split = h('div.pz-split');

      /* --- left: sentential form, choices, steps --- */
      const left = h('div.card');
      left.appendChild(h('div.pz-sub', 'Sentential form'));
      const formBox = h('div.pz-form');
      left.appendChild(formBox);
      const choiceBox = h('div.pz-choices');
      left.appendChild(choiceBox);
      const feedback = h('div', { style: { marginTop: '10px' } });
      left.appendChild(feedback);
      left.appendChild(h('div.pz-sub', { style: { marginTop: '14px' } }, 'Derivation'));
      const stepBox = h('div.pz-steps');
      left.appendChild(stepBox);
      left.appendChild(h('div.row', { style: { marginTop: '10px' } },
        h('button.btn-sm.btn-ghost', { onclick: () => { undo(d); S.deadEnd = null; S.treeQuiz = null; redraw(); } }, '← undo'),
        h('button.btn-sm.btn-ghost', { onclick: () => { S.deriv = newDerivation(g); S.deadEnd = null; S.treeQuiz = null; redraw(); } }, 'restart')));

      /* --- right: the tree --- */
      const right = h('div.card');
      right.appendChild(h('div.pz-sub', 'Parse tree — the same derivation, seen from above'));
      const treeBox = h('div.pz-tree');
      right.appendChild(treeBox);
      const quizBox = h('div', { style: { marginTop: '10px' } });
      right.appendChild(quizBox);

      split.appendChild(left); split.appendChild(right);
      wrap.appendChild(split);

      let selected = null;

      function redraw() {
        /* sentential form */
        clear(formBox);
        const f = frontier(d);
        const want = S.mode === 'free' ? null : nextNode(d, S.mode);
        f.forEach(n => {
          const cls = 'div.s.' + (n.eps ? 'eps' : n.isVar ? 'var' : 'term') +
            (n === want ? '.next' : '') + (n === selected ? '.picked' : '');
          const el = h(cls, { 'data-node': n.id }, n.sym);
          if (n.isVar) el.addEventListener('click', () => { selected = (selected === n ? null : n); redraw(); });
          el.addEventListener('mouseenter', () => { S.hotNode = n.id; paintTree(); });
          el.addEventListener('mouseleave', () => { S.hotNode = null; paintTree(); });
          formBox.appendChild(el);
        });
        if (!f.length) formBox.appendChild(h('div.s.eps', EPS));

        /* rule choices for the selected variable */
        clear(choiceBox);
        const pickNode = selected || want;
        if (pickNode && pickNode.isVar) {
          choiceBox.appendChild(h('span.small.faint', { style: { alignSelf: 'center', marginRight: '4px' },
            html: tex(`rewrite \`${pickNode.sym}\` with:`) }));
          for (const r of g.rulesFor(pickNode.sym))
            choiceBox.appendChild(h('button.btn-sm', { onclick: () => apply(pickNode, r) }, ruleText(g, r)));
          if (!g.rulesFor(pickNode.sym).length)
            choiceBox.appendChild(h('span.small.muted', { html: tex(`\`${pickNode.sym}\` has no rules — it is a dead variable.`) }));
        } else if (!isComplete(d)) {
          choiceBox.appendChild(h('span.small.faint', 'click a variable in the sentential form'));
        }

        /* steps */
        clear(stepBox);
        stepBox.appendChild(h('div.st', h('span.ar', ' '), h('span', g.start)));
        d.steps.forEach((st, i) => {
          const row = h('div.st', { 'data-step': i },
            h('span.ar', '⇒'), h('span', st.form.length ? st.form.join(' ') : EPS),
            h('span.why', 'r' + st.rule));
          row.addEventListener('mouseenter', () => { S.hotNode = st.node.id; paintTree(); row.classList.add('hot'); });
          row.addEventListener('mouseleave', () => { S.hotNode = null; paintTree(); row.classList.remove('hot'); });
          stepBox.appendChild(row);
        });

        /* feedback */
        clear(feedback);
        if (S.deadEnd) feedback.appendChild(h('div.callout.warn', { html: tex(S.deadEnd) }));
        if (isComplete(d)) finish();
        paintTree();
      }

      function apply(node, rule) {
        const res = expand(d, node, rule, S.mode === 'free' ? null : S.mode);
        if (!res.ok) {
          clear(feedback);
          feedback.appendChild(h('div.callout.bad', { html: tex(res.msg) }));
          return;
        }
        selected = null;
        /* desirable difficulty: we let the move happen, then say what it cost */
        const form = sententialForm(d).filter(s => s !== EPS);
        S.deadEnd = derivesString(g, form, tk.tokens) ? null
          : `That step was legal, but the target is now out of reach: \`${form.join(' ') || EPS}\` cannot derive \`${S.target}\` any more. ` +
            `Look at what you committed to — \`${ruleText(g, rule)}\` fixed a shape the target does not have. Undo and compare the alternatives for \`${rule.lhs}\`.`;
        redraw();
      }

      function finish() {
        const got = yieldOf(d.root).join('');
        const want = tk.tokens.join('');
        const ok = got === want;
        if (!d._graded) {
          d._graded = true;
          store.record('derivation', ok && !S.deadEnd, ok ? 2 : 1);
          store.record('parse-tree', ok, 1);
          if (ok) toast('Derived — and the tree grew with it.', 'good');
        }
        feedback.appendChild(h('div.callout' + (ok ? '.good' : '.bad'), { html: tex(
          ok ? `**Done.** ${d.steps.length} steps, and $${g.start} ⇒^{${d.steps.length}} ${S.target}$. The fringe of the tree on the right *is* the word — read the leaves left to right.`
             : `The derivation is finished but yields \`${got || EPS}\`, not \`${want}\`. Every variable is gone, so no step can repair it: undo back to the first place where the two strings differ.`) }));
        if (ok) askTreeQuiz();
      }

      /* "which node did step k create?" — the derivation↔tree link, tested */
      function askTreeQuiz() {
        clear(quizBox);
        if (!d.steps.length) return;
        if (!S.treeQuiz) S.treeQuiz = { step: Math.floor(Math.random() * d.steps.length), done: false };
        const q = S.treeQuiz;
        const st = d.steps[q.step];
        if (q.done) {
          quizBox.appendChild(h('div.callout' + (q.ok ? '.good' : '.bad'), { html: tex(q.msg) }));
          return;
        }
        quizBox.appendChild(h('div.callout', { html: tex(
          `**Link them:** click the node in the tree that step ${q.step + 1} (\`${ruleText(g, g.rules[st.rule])}\`) rewrote.`) }));
        treeBox.addEventListener('click', onPick);
        function onPick(e) {
          const t = e.target.closest('[data-node]');
          if (!t || q.done) return;
          const id = t.getAttribute('data-node');
          q.done = true;
          q.ok = id === st.node.id;
          q.msg = q.ok
            ? `**Yes.** That node carries the rule \`${ruleText(g, g.rules[st.rule])}\`; its children are exactly the right-hand side, in order. Every derivation step is one internal node.`
            : `Not that one. Step ${q.step + 1} rewrote the \`${st.node.sym}\` whose children are \`${rhsText(g, g.rules[st.rule].rhs)}\` — it is highlighted now. A derivation step and an internal node of the tree are the same thing.`;
          store.record('parse-tree', q.ok, 2);
          treeBox.removeEventListener('click', onPick);
          S.hotNode = st.node.id;
          paintTree(); askTreeQuiz();
        }
      }

      function paintTree() {
        const hot = S.hotNode ? subtreeIds(findNode(d.root, S.hotNode)) : [];
        treeBox.innerHTML = renderTree(d.root, { highlight: hot });
        [...treeBox.querySelectorAll('[data-node]')].forEach(el => {
          el.addEventListener('mouseenter', () => { S.hotNode = el.getAttribute('data-node'); paintTree(); });
        });
      }

      redraw();
      return wrap;
    }

    /* ================================================================
       TAB 3 — ambiguity showdown + precedence layering
       ================================================================ */
    function tabAmbig() {
      const wrap = h('div');
      const g = S.g;
      if (!g.ok()) return notReady(wrap, 'Fix the grammar first.');

      const ex = galleryById(S.galleryId);
      const cand = (ex.ambiguousWords || ex.words || []);
      const st = (S.ambig ||= { word: cand[0] || '', asked: false, fixSrc: null });

      const ctrl = h('div.card');
      ctrl.appendChild(h('div.pz-sub', 'Two trees, one word'));
      const inp = h('input.mono', { type: 'text', value: st.word, style: { minWidth: '200px' } });
      inp.addEventListener('change', () => { st.word = inp.value.trim(); st.asked = false; draw(); });
      ctrl.appendChild(h('div.row', inp,
        ...cand.map(w => h('button.btn-sm.btn-ghost', { onclick: () => { st.word = w; st.asked = false; draw(); } }, w)),
        h('span.spacer'),
        h('button.btn-sm', { onclick: () => loadGallery('ambig-num') }, 'load the ambiguous grammar')));
      wrap.appendChild(ctrl);

      if (!st.word) return wrap;
      const res = isAmbiguous(g, st.word);
      if (res.error) { ctrl.appendChild(h('div.callout.bad', { html: tex(res.error) })); return wrap; }

      if (!res.inLanguage) {
        ctrl.appendChild(h('div.callout.bad', { style: { marginTop: '10px' },
          html: tex(`\`${st.word}\` is not in $L(G)$, so it has no parse tree at all — ambiguity is a question about words the grammar *does* generate.`) }));
        return wrap;
      }
      if (!res.ambiguous) {
        const card = h('div.card');
        card.appendChild(h('div.callout.good', { html: tex(
          `Only one parse tree for \`${st.word}\`. That does **not** prove the grammar unambiguous — ambiguity of a CFG is undecidable in general, so all any tool can do is *hunt for a witness word*. Try another word, or load the ambiguous grammar above.`) }));
        card.appendChild(h('div.pz-tree', { html: renderTree(res.trees[0]) }));
        wrap.appendChild(card);
        return wrap;
      }

      /* two trees side by side */
      const card = h('div.card');
      card.appendChild(h('div.pz-sub', `Two structurally different parse trees for “${st.word}”`));
      const trees = h('div.pz-trees2');
      const vals = res.trees.map(t => evalTree(t));
      res.trees.forEach((t, i) => {
        const col = h('div');
        col.appendChild(h('div.small.muted', { style: { marginBottom: '4px' } }, i ? 'Tree B' : 'Tree A'));
        col.appendChild(h('div.pz-tree', { html: renderTree(t) }));
        trees.appendChild(col);
      });
      card.appendChild(trees);

      /* what does each one MEAN? */
      const qbox = h('div', { style: { marginTop: '12px' } });
      if (vals.every(v => v != null) && vals[0] !== vals[1]) {
        if (!st.asked) {
          qbox.appendChild(h('div.callout', { html: tex(
            `**Read the trees, do not compute the string:** evaluate tree **A** — the operator nearest the root is applied *last*. What is \`${st.word}\` worth under tree A?`) }));
          const row = h('div.pz-q');
          const opts = ui.shuffle([vals[0], vals[1]]);
          opts.forEach(v => row.appendChild(h('button', { onclick: () => {
            st.asked = true; st.ok = (v === vals[0]); store.record('ambiguity', st.ok, 2); draw();
          } }, String(v))));
          qbox.appendChild(row);
        } else {
          qbox.appendChild(h('div.callout' + (st.ok ? '.good' : '.bad'), { html: tex(
            `${st.ok ? '**Right.**' : '**No.**'} Tree A means **${vals[0]}**, tree B means **${vals[1]}**. ` +
            `Same string, same grammar, two meanings — this is exactly why an ambiguous grammar is useless for a compiler: ` +
            `the parse tree *is* the meaning, so the compiler would have no way to know which number to emit.`) }));
        }
      } else {
        qbox.appendChild(h('div.callout', { html: tex(
          `These two trees group the same tokens differently. In \`${st.word}\` ask yourself which construct the root splits the word into — that grouping is the meaning the rest of the compiler will act on.`) }));
        if (!st.asked) { st.asked = true; store.record('ambiguity', true, 1); }
      }
      card.appendChild(qbox);
      wrap.appendChild(card);

      /* --- precedence layering exercise --- */
      const fix = h('div.card');
      fix.appendChild(h('div.pz-sub', 'Now kill the ambiguity'));
      fix.appendChild(h('p.small.muted', { html: tex(
        'Ambiguity is not repaired by a rule that says “* binds stronger”. It is repaired by **layering the grammar**: ' +
        'one variable per precedence level, each level built from the next tighter one — expr → product → factor. ' +
        'Left recursion (`e -> e \'+\' p`) makes the operator left-associative; right recursion makes it right-associative. ' +
        'Rewrite the grammar below so that the word above has exactly one tree — and the conventional meaning.') }));
      const fta = h('textarea', { spellcheck: 'false', rows: 7 });
      fta.value = st.fixSrc != null ? st.fixSrc : S.src;
      fta.addEventListener('input', () => { st.fixSrc = fta.value; });
      fix.appendChild(fta);
      const out = h('div', { style: { marginTop: '10px' } });
      fix.appendChild(h('div.row', h('button.btn-primary', { onclick: () => check() }, 'Check my fix'),
        h('button.btn-sm.btn-ghost', { onclick: () => { st.fixSrc = S.src; fta.value = S.src; clear(out); } }, 'reset')));
      fix.appendChild(out);
      wrap.appendChild(fix);

      function check() {
        clear(out);
        const g2 = parseGrammar(fta.value);
        const say = (kind, msg) => out.appendChild(h('div.callout.' + kind, { html: tex(msg) }));
        if (!g2.ok()) { say('bad', 'The grammar does not parse yet: ' + g2.errors.map(e => `line ${e.line}: ${e.msg}`).join('; ')); store.record('precedence', false); return; }
        const words = (ex.ambiguousWords || ex.words || [st.word]);
        const bad = [];
        for (const w of words) {
          const r2 = isAmbiguous(g2, w);
          if (r2.error) { say('bad', `\`${w}\`: ${r2.error}`); store.record('precedence', false); return; }
          if (!r2.inLanguage) { say('bad', `Your grammar no longer generates \`${w}\`. Killing ambiguity must not shrink the language — you removed a rule that was carrying its weight.`); store.record('precedence', false); return; }
          if (r2.ambiguous) bad.push(w);
        }
        if (bad.length) {
          const r2 = isAmbiguous(g2, bad[0]);
          say('bad', `Still ambiguous: \`${bad[0]}\` has two trees. A rule of the form \`a -> a op a\` is *always* ambiguous — the two \`a\`s can absorb the operators in either order. Give each precedence level its own variable and let the level refer to the next one down.`);
          out.appendChild(h('div.pz-trees2',
            ...r2.trees.map(t => h('div.pz-tree', { html: renderTree(t) }))));
          store.record('precedence', false);
          return;
        }
        const t1 = isAmbiguous(g2, st.word).trees[0];
        const v = evalTree(t1);
        const conventional = vals.length === 2 ? Math.max(...vals.filter(x => x != null)) : null;
        const want = conventionalValue(st.word);
        if (v != null && want != null && v !== want) {
          say('warn', `Unambiguous now — but the surviving tree means **${v}**, and \`${st.word}\` conventionally means **${want}**. You layered the grammar the wrong way round: the *looser* operator must sit at the *top* level, so that the tighter one ends up deeper in the tree.`);
          out.appendChild(h('div.pz-tree', { html: renderTree(t1) }));
          store.record('precedence', false);
          return;
        }
        say('good', `**That is the fix.** One tree for every test word${v != null ? `, and \`${st.word}\` now means **${v}**` : ''}. ` +
          `The precedence is in the *shape* of the grammar, not in a side table: \`*\` sits below \`+\`, so it is reduced first and lands deeper in the tree.`);
        out.appendChild(h('div.pz-tree', { html: renderTree(t1) }));
        store.record('precedence', true, 3);
        store.record('ambiguity', true, 1);
        store.logSession('grammar-precedence', 1, 1);
      }
      return wrap;
    }

    /* ================================================================
       TAB 4 — First / Follow trainer
       ================================================================ */
    function tabFF() {
      const wrap = h('div');
      const g = S.g;
      if (!g.ok()) return notReady(wrap, 'Fix the grammar first.');
      const A = analyse(g);
      const st = (S.ffState ||= { checked: false, cells: {}, revealed: false });

      const card = h('div.card');
      card.appendChild(h('div.pz-sub', 'Fill the sets yourself, then let the fixed point argue with you'));
      card.appendChild(h('p.small.muted', { html: tex(
        'Write the tokens separated by spaces or commas; quotes optional. ' +
        '**In this lecture First sets never contain λ** — whether a variable is λ-generating is recorded by the separate predicate `nullable`. ' +
        '`$` is the Eof token and lives only in Follow sets.') }));

      const tbl = h('table.pz-table');
      tbl.appendChild(h('thead', h('tr', h('th', 'variable'), h('th', 'nullable?'), h('th', 'First'), h('th', 'Follow'))));
      const tb = h('tbody');
      const inputs = {};
      g.vars.forEach(v => {
        const nulSel = h('select', h('option', { value: '' }, '—'), h('option', { value: 'y' }, 'yes'), h('option', { value: 'n' }, 'no'));
        nulSel.value = (st.cells[v + ':n'] || '');
        const fiI = h('input', { type: 'text', value: st.cells[v + ':f'] || '', placeholder: "e.g. '(' NUMBER" });
        const foI = h('input', { type: 'text', value: st.cells[v + ':o'] || '', placeholder: "e.g. '+' ')' $" });
        inputs[v] = { nulSel, fiI, foI };
        tb.appendChild(h('tr', h('td', h('span.pz-sym.v', v)), h('td', nulSel), h('td', fiI), h('td', foI)));
      });
      tbl.appendChild(tb);
      card.appendChild(h('div.pz-scroll', tbl));
      const diag = h('div', { style: { marginTop: '12px' } });
      const revealBtn = h('button.btn-ghost', { disabled: !st.checked,
        onclick: () => { st.revealed = true; drawReplay(); } }, 'Show the fixed point round by round');
      card.appendChild(h('div.row', { style: { marginTop: '12px' } },
        h('button.btn-primary', { onclick: () => check() }, 'Check my sets'),
        revealBtn,
        h('button.btn-sm.btn-ghost', { onclick: () => { S.ffState = null; draw(); } }, 'clear')));
      card.appendChild(diag);
      wrap.appendChild(card);

      const replay = h('div');
      wrap.appendChild(replay);
      if (st.revealed) drawReplay();

      function check() {
        clear(diag);
        st.checked = true;
        revealBtn.disabled = false;
        let right = 0, total = 0;
        const msgs = [];
        for (const v of g.vars) {
          const { nulSel, fiI, foI } = inputs[v];
          st.cells[v + ':n'] = nulSel.value; st.cells[v + ':f'] = fiI.value; st.cells[v + ':o'] = foI.value;

          /* nullable */
          total++;
          const wantNul = A.nullable.set.has(v);
          const gotNul = nulSel.value === 'y';
          const nulOk = nulSel.value !== '' && gotNul === wantNul;
          if (nulOk) right++;
          nulSel.parentElement.className = nulSel.value === '' ? '' : (nulOk ? 'ok' : 'err');
          if (!nulOk && nulSel.value !== '') {
            const entry = A.nullable.log.flatMap(r => r.added).find(a => a.v === v);
            msgs.push(wantNul
              ? `\`nullable(${v})\` is **true**: ${entry ? entry.why : 'the empty word can be derived from it'}.`
              : `\`nullable(${v})\` is **false** — no sequence of rules turns \`${v}\` into λ, so \`${v}\` must always produce at least one token.`);
          }

          /* First / Follow */
          for (const [kind, inp, wantSet, log] of [
            ['First', fiI, A.first.map[v], A.first.log],
            ['Follow', foI, A.follow.map[v], A.follow.log],
          ]) {
            total++;
            const got = parseSet(inp.value);
            const want = new Set(wantSet);
            const missing = [...want].filter(x => !got.has(x));
            const extra = [...got].filter(x => !want.has(x));
            const ok = !missing.length && !extra.length && inp.value.trim() !== '';
            if (ok) right++;
            inp.parentElement.className = inp.value.trim() === '' ? '' : (ok ? 'ok' : 'err');
            if (ok || inp.value.trim() === '') continue;

            for (const x of extra) {
              if (['ε', 'λ', 'eps', 'epsilon', 'lambda'].includes(x))
                msgs.push(`You put λ into ${kind}(${v}). **${kind} sets never contain λ in this lecture** — First(λ) = {} by definition, and a set of *tokens that may follow* cannot contain a non-token. What you mean is \`nullable(${v}) = ${A.nullable.set.has(v) ? 'true' : 'false'}\`, which is the column to its left.`);
              else if (g.isVar(x))
                msgs.push(`\`${x}\` is a **variable**, and ${kind} sets contain only tokens. If you meant “whatever \`${x}\` can start with”, that is \`First(${x}) = {${[...A.first.map[x] || []].join(', ')}}\` — substitute it.`);
              else if (kind === 'First' && x === EOF)
                msgs.push(`\`$\` never lies in a First set: Eof follows the start symbol, it does not start anything. It belongs in Follow(${g.start}).`);
              else
                msgs.push(`\`${x}\` ∉ ${kind}(${v}): no rule of the grammar puts \`${x}\` ${kind === 'First' ? `at the beginning of a string derived from \`${v}\`` : `directly behind a \`${v}\``}. Trace it: which rule did you have in mind?`);
            }
            for (const x of missing) {
              const entry = log.flatMap(r => r.added).find(a => a.v === v && a.item === x);
              msgs.push(`You missed \`${x}\` ∈ ${kind}(${v})${entry ? ' — ' + entry.why : ''}.`);
            }
          }
        }
        const pct = total ? right / total : 0;
        diag.appendChild(h('div.callout' + (pct === 1 ? '.good' : pct >= 0.6 ? '.warn' : '.bad'), { html: tex(
          `${right} of ${total} cells correct.` + (pct === 1 ? ' Every set is exactly the fixed point.' : '')) }));
        msgs.slice(0, 12).forEach(m => diag.appendChild(h('p.small', { style: { margin: '6px 0' }, html: tex('· ' + m) })));
        store.record('follow', pct === 1, 3);
        store.logSession('first-follow', right, total);
      }

      function drawReplay() {
        clear(replay);
        const card2 = h('div.card');
        card2.appendChild(h('div.pz-sub', 'The fixed-point computation, one round at a time'));
        card2.appendChild(h('p.small.muted', { html: tex(
          'Each round scans every rule once and adds whatever the equations force. When a round adds nothing, the fixed point is reached — that is the whole termination argument.') }));
        const rounds = h('div.pz-rounds');
        const block = (name, log) => {
          rounds.appendChild(h('h3', { style: { margin: '10px 0 0', fontSize: '.92rem' } }, name));
          log.forEach(r => {
            if (!r.added.length && r.round > 0) {
              rounds.appendChild(h('div.pz-round', h('h4', `round ${r.round}`),
                h('div.add', { html: tex('nothing new — **fixed point reached**') })));
              return;
            }
            const box = h('div.pz-round', h('h4', r.seedRound ? 'initialisation' : `round ${r.round}`));
            r.added.forEach(a => box.appendChild(h('div.add', { html: tex(
              `${name.split('(')[0].trim()}(${a.v}) ∪= **{${a.item}}** — ${a.why}`) })));
            rounds.appendChild(box);
          });
        };
        block('nullable', A.nullable.log);
        block('First', A.first.log);
        block('Follow', A.follow.log);
        card2.appendChild(rounds);
        replay.appendChild(card2);
      }
      return wrap;
    }

    /* ---------------- small helpers ---------------- */
    function notReady(wrap, msg) {
      wrap.appendChild(h('div.card', h('div.callout.warn', { html: tex(msg) }),
        h('div.row', { style: { marginTop: '10px' } },
          h('button.btn-sm', { onclick: () => { S.tab = 'edit'; draw(); } }, 'back to the grammar'))));
      return wrap;
    }

    draw();
    return () => {};
  },
};

/* ===================================================================== */
function parseSet(text) {
  const out = new Set();
  String(text || '').replace(/[{}]/g, ' ').split(/[\s,]+/).forEach(x => {
    let t = x.trim();
    if (!t) return;
    if ((t.startsWith("'") && t.endsWith("'") && t.length > 1) ||
        (t.startsWith('"') && t.endsWith('"') && t.length > 1)) t = t.slice(1, -1);
    out.add(t);
  });
  return out;
}

function subtreeIds(n, out = []) { if (!n) return out; out.push(n.id); (n.children || []).forEach(c => subtreeIds(c, out)); return out; }
function findNode(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children || []) { const r = findNode(c, id); if (r) return r; }
  return null;
}

/** Evaluate an arithmetic parse tree, so the learner can *see* that two
    trees mean two numbers. Returns null if the tree is not arithmetic. */
function evalTree(n) {
  if (!n) return null;
  if (!n.children) return /^\d+$/.test(n.sym) ? Number(n.sym) : null;
  const kids = n.children.filter(c => !c.eps);
  if (kids.length === 1) return evalTree(kids[0]);
  if (kids.length === 3) {
    const op = kids[1].sym;
    if (op === '(' || kids[0].sym === '(') return evalTree(kids[1]);
    const a = evalTree(kids[0]), b = evalTree(kids[2]);
    if (a == null || b == null) return null;
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b ? a / b : null;
  }
  return null;
}

/** What the string means under the usual precedence rules — used to tell a
    learner whose fix is unambiguous but layered upside down.  A three-line
    recursive-descent evaluator; no eval(), this is a parsing lab. */
function conventionalValue(word) {
  const src = String(word || '');
  if (!/^[\d+\-*/() ]+$/.test(src) || !src.trim()) return null;
  const tk = src.match(/\d+|[+\-*/()]/g) || [];
  let i = 0;
  const peek = () => tk[i];
  const expr = () => {
    let v = product();
    while (v != null && (peek() === '+' || peek() === '-')) { const op = tk[i++]; const r = product(); if (r == null) return null; v = op === '+' ? v + r : v - r; }
    return v;
  };
  const product = () => {
    let v = factor();
    while (v != null && (peek() === '*' || peek() === '/')) { const op = tk[i++]; const r = factor(); if (r == null) return null; v = op === '*' ? v * r : (r ? v / r : null); }
    return v;
  };
  const factor = () => {
    if (peek() === '(') { i++; const v = expr(); if (tk[i] !== ')') return null; i++; return v; }
    if (/^\d+$/.test(peek() || '')) return Number(tk[i++]);
    return null;
  };
  const v = expr();
  return (i === tk.length && typeof v === 'number' && isFinite(v)) ? v : null;
}
