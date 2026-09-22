/* ==========================================================================
   Pumping Duel  —  route id: 'pumping'

   The pumping lemma is a quantifier alternation:

       L regular  ->  EXISTS n  FORALL s in L, |s| >= n
                      EXISTS u,v,w (s=uvw, v != lambda, |uv| <= n)
                      FORALL h in N : u v^h w in L

   Every EXISTS belongs to whoever *claims* regularity — the Adversary.
   Every FORALL belongs to whoever attacks it — you.
   So the turn order IS the quantifier order. That is the whole game.

   Notation follows Stroetmann Ch.5: s = uvw, v != lambda, |uv| <= n, pump
   exponent h. (Elsewhere written w = xyz and xy^k z.)
   ========================================================================== */
import { languages, FAMILIES, family } from '../../data/pumping.js';

/* ==========================================================================
   1. The engine.  The Adversary is only as good as this search.
   ========================================================================== */

/** Pump exponents the engine always tries. h = 1 is excluded: it is trivial. */
const HBASE = [0, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 32, 48, 64];
const MAX_PUMP_LEN = 200000;   // never build a string longer than this
const MAX_WORD_LEN = 4000;     // the learner cannot propose longer words

/** Every legal split of s for pumping length n: s = uvw, v != lambda, |uv| <= n. */
export function legalSplits(s, n) {
  const lim = Math.min(n, s.length), out = [];
  for (let i = 0; i < lim; i++)
    for (let j = i + 1; j <= lim; j++)
      out.push({ u: s.slice(0, i), v: s.slice(i, j), w: s.slice(j) });
  return out;
}

const pump = (sp, h) => sp.u + (h > 0 ? sp.v.repeat(h) : '') + sp.w;
const fits = (sp, h) => sp.u.length + h * sp.v.length + sp.w.length <= MAX_PUMP_LEN;

/** Candidate exponents for this split: the base ladder plus language-specific
    hints (the prime language needs h = x+z, the "n != m" language needs
    h = 1 + (m-n)/y — no fixed ladder could ever find those). */
function hCandidates(lang, sp) {
  let extra = [];
  try { extra = lang.hHints ? (lang.hHints(sp) || []) : []; } catch { extra = []; }
  const all = [...HBASE, ...extra].filter(x => Number.isInteger(x) && x >= 0);
  return [...new Set(all)].sort((a, b) => a - b).filter(h => fits(sp, h));
}

/** All tested exponents that push the word OUT of L. Empty => the split survives. */
function breakers(lang, sp) {
  const out = [];
  for (const h of hCandidates(lang, sp)) {
    let inL;
    try { inL = !!lang.member(pump(sp, h)); } catch { inL = true; }
    if (!inL) out.push(h);
  }
  return out;
}

/** Does *this* exponent break the split? (used to grade the learner's claim) */
function breaksWith(lang, sp, h) {
  if (!fits(sp, h)) return null;
  try { return !lang.member(pump(sp, h)); } catch { return false; }
}

/**
 * The Adversary's move: it looks at EVERY legal split and ranks them.
 *   1. a split the learner can never break (all tested h stay in L) wins outright;
 *   2. otherwise the split that leaves the learner the fewest and the weirdest
 *      exponents — fewest breakers, then the largest *smallest* breaker, then
 *      the shortest v (a subtle change is harder to see), then v pushed as far
 *      right inside the window as the rule |uv| <= n allows.
 * Returns the full analysis so the app can explain itself afterwards.
 */
export function adversarySplit(lang, s, n) {
  const all = legalSplits(s, n).map(sp => ({ sp, brk: breakers(lang, sp) }));
  if (!all.length) return { best: null, survives: true, all, survivors: [] };
  const survivors = all.filter(e => e.brk.length === 0);
  const rank = (a, b) => {
    if (a.brk.length !== b.brk.length) return a.brk.length - b.brk.length;
    const am = Math.min(...a.brk), bm = Math.min(...b.brk);
    if (am !== bm) return bm - am;
    if (a.sp.v.length !== b.sp.v.length) return a.sp.v.length - b.sp.v.length;
    return b.sp.u.length - a.sp.u.length;
  };
  if (survivors.length) {
    const best = [...survivors].sort((a, b) => (b.sp.v.length - a.sp.v.length) || (a.sp.u.length - b.sp.u.length))[0];
    return { best, survives: true, all, survivors };
  }
  return { best: [...all].sort(rank)[0], survives: false, all, survivors };
}

/** The Adversary's pumping length: small and friendly at first, then awkward. */
function adversaryN(lang, rec) {
  const ladder = [2, 3, 4, 5, 6, 7, 9, 11, 13];
  const wins = Math.max(0, (rec && rec.wins) || 0);
  let n = ladder[Math.min(wins, ladder.length - 1)];
  if (wins > 0 && Math.random() < 0.45) n += 1;
  return Math.max(1, Math.min(n, lang.maxN || 99));
}

/** In reverse mode: the challenger hunts for a word that refutes the chosen n. */
function challengeWords(lang, n) {
  let pool = [];
  try { pool = (lang.samples ? lang.samples(n) : []) || []; } catch { pool = []; }
  pool = [...new Set(pool)].filter(w => typeof w === 'string' && w.length >= n && w.length <= MAX_WORD_LEN && safeMember(lang, w));
  const scored = pool.map(w => {
    const a = adversarySplit(lang, w, n);
    return { w, survivors: a.survivors.length, a };
  }).sort((x, y) => x.survivors - y.survivors || y.w.length - x.w.length);
  return scored;
}
const safeMember = (lang, w) => { try { return !!lang.member(w); } catch { return false; } };

/* ==========================================================================
   2. The module
   ========================================================================== */
export default {
  id: 'pumping',
  title: 'Pumping Duel',

  mount(root, ctx) {
    const { store, ui, go } = ctx;
    const { h, tex, clear, toast, shuffle } = ui;
    ui.loadCss('css/modules/games.css');

    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    /* ---- per-language record ------------------------------------------- */
    const recOf = id => Object.assign({ wins: 0, losses: 0, rwins: 0, rlosses: 0 }, store.flag('pumping:' + id) || {});
    const bump = (id, key) => { const r = recOf(id); r[key] = (r[key] || 0) + 1; store.flag('pumping:' + id, r); return r; };

    /* ---- game state ------------------------------------------------------ */
    let G = null;
    const stage = h('div.pd-stage');
    const shell = h('div');
    root.appendChild(shell);

    /* ====================================================================
       Rendering helpers
       ==================================================================== */

    const P = s => h('p', { html: tex(s) });
    const say = (txt, cls = '') => h('div.pd-say' + (cls ? '.' + cls : ''),
      h('div.pd-avatar', '⟁'),
      h('div.pd-bubble', { html: tex(txt) }));

    /** the 4-step quantifier ribbon; `at` highlights the active step */
    function ribbon(at, mode) {
      const fwd = [
        { k: 'n', q: '∃n', who: 'Adversary', txt: 'picks the pumping length n' },
        { k: 'word', q: '∀s', who: 'You', txt: 'choose s ∈ L with |s| ≥ n' },
        { k: 'split', q: '∃u,v,w', who: 'Adversary', txt: 'splits s = uvw, |uv| ≤ n, v ≠ λ' },
        { k: 'pump', q: '∀h', who: 'You', txt: 'choose h with uvʰw ∉ L' },
      ];
      const rev = [
        { k: 'rn', q: '∃n', who: 'You', txt: 'pick the pumping length n' },
        { k: 'rword', q: '∀s', who: 'Challenger', txt: 'throws a word s ∈ L at you' },
        { k: 'rsplit', q: '∃u,v,w', who: 'You', txt: 'split s = uvw so that it survives' },
        { k: 'rpump', q: '∀h', who: 'Challenger', txt: 'tries every h to break you' },
      ];
      const steps = mode === 'reverse' ? rev : fwd;
      const idx = steps.findIndex(s => s.k === at);
      return h('div.pd-ribbon', steps.map((s, i) => h('div.pd-step' +
        (i === idx ? '.on' : '') + (idx >= 0 && i < idx ? '.done' : '') +
        (s.who === 'You' ? '.mine' : '.theirs'),
        h('div.pd-q', s.q),
        h('div.pd-who', s.who),
        h('div.pd-what', s.txt))));
    }

    /** a string as coloured cells, eliding very long runs */
    function cells(str, cls, keyPrefix = '') {
      const out = [];
      const MAX = 90;
      if (str.length <= MAX) {
        for (let i = 0; i < str.length; i++) out.push(h('span.pd-cell.' + cls, str[i]));
        return out;
      }
      for (let i = 0; i < 40; i++) out.push(h('span.pd-cell.' + cls, str[i]));
      out.push(h('span.pd-cell.pd-elide', '…' + (str.length - 70) + '…'));
      for (let i = str.length - 30; i < str.length; i++) out.push(h('span.pd-cell.' + cls, str[i]));
      return out;
    }

    const runLabel = str => {
      if (!str.length) return 'λ';
      const c = str[0];
      return str.split('').every(x => x === c) ? `${c}${sup(str.length)}` : `${str.length} chars`;
    };
    const sup = n => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');

    function splitView(sp, label = true) {
      const grp = (s, cls, name) => h('div.pd-grp.' + cls,
        h('div.pd-cells', cells(s, cls)),
        label ? h('div.pd-grp-label', `${name} = ${runLabel(s)}`) : null);
      return h('div.pd-splitview',
        grp(sp.u, 'u', 'u'), grp(sp.v, 'v', 'v'), grp(sp.w, 'w', 'w'));
    }

    function pumpedView(sp, hh) {
      const kids = [h('div.pd-grp.u', h('div.pd-cells', cells(sp.u, 'u')), h('div.pd-grp-label', 'u'))];
      const copies = Math.min(hh, 8);
      for (let i = 0; i < copies; i++)
        kids.push(h('div.pd-grp.v' + (i % 2 ? '.alt' : ''), h('div.pd-cells', cells(sp.v, 'v')),
          h('div.pd-grp-label', 'v' + (hh > 1 ? ' #' + (i + 1) : ''))));
      if (hh > copies) kids.push(h('div.pd-grp.v.alt', h('div.pd-cells', h('span.pd-cell.pd-elide', '× ' + hh + ' copies')), h('div.pd-grp-label', '…')));
      if (hh === 0) kids.push(h('div.pd-grp.v.gone', h('div.pd-cells', h('span.pd-cell.pd-elide', 'v deleted')), h('div.pd-grp-label', 'h = 0')));
      kids.push(h('div.pd-grp.w', h('div.pd-cells', cells(sp.w, 'w')), h('div.pd-grp-label', 'w')));
      return h('div.pd-splitview.pd-pumped', kids);
    }

    const shortStr = s => (s.length <= 64 ? s : s.slice(0, 40) + ' … ' + s.slice(-16) + ` (${s.length} chars)`);

    /* ====================================================================
       Screens
       ==================================================================== */

    function render() {
      clear(shell);
      shell.appendChild(ui.pageHead('Game · Chapter 5',
        'Pumping Duel',
        'The lemma is a game of alternating quantifiers. Play it as one: whoever owns the $\\exists$ moves second and gets to be nasty.'));
      if (!store.flag('pumping:rules-seen')) { shell.appendChild(rulesCard()); return; }
      if (!G) { shell.appendChild(picker()); return; }
      shell.appendChild(stage);
      drawStage();
    }

    function rulesCard() {
      return h('div.card.pd-rules',
        h('h2', 'How the duel works'),
        P('A language $L$ is regular $\\rightarrow$ **there is** an $n$ such that **for every** $s \\in L$ with $|s| \\geq n$ **there is** a split $s = uvw$ with $v \\neq \\lambda$ and $|uv| \\leq n$ such that **for every** $h$: $uv^h w \\in L$.'),
        P('Four quantifiers, four turns. The Adversary owns both $\\exists$: it picks $n$, then it picks the split — and it always picks the worst one for you. You own both $\\forall$: you pick $s$, then you pick $h$. Break one single $h$ and the claim collapses.'),
        h('div.callout.warn', { html: tex('The Adversary does **not** guess. It enumerates every legal split and, if one of them can survive all your exponents, it plays exactly that one. If you lose, your $s$ was the mistake — not your luck.') }),
        P('**Reverse mode** flips the sides: for a language that really *is* regular you play the Adversary and must defend it forever.'),
        h('div.row',
          h('button.btn-primary', { onclick: () => { store.flag('pumping:rules-seen', 1); render(); } }, 'Understood — let me fight')));
    }

    function picker() {
      const wrap = h('div');
      wrap.appendChild(h('div.row.pd-toolbar',
        h('span.muted.small', { html: tex('Pick a language. You claim it is **not** regular; the Adversary claims it is.') }),
        h('span.spacer'),
        h('button.btn-ghost.btn-sm', { onclick: () => { store.flag('pumping:rules-seen', 0); render(); } }, 'Rules'),
        h('button.btn-ghost.btn-sm', { onclick: () => go('atlas', 'c=pumping') }, 'Atlas → pumping')));

      for (const key of ['breakable', 'pumpable', 'decoy']) {
        const fam = FAMILIES[key];
        const list = languages.filter(fam.test);
        wrap.appendChild(h('h2.pd-famhead', fam.label,
          h('span.muted.small', { style: { marginLeft: '10px', fontWeight: '400' } }, fam.hint)));
        wrap.appendChild(h('div.grid.c2.pd-langgrid', list.map(langCard)));
      }
      return wrap;
    }

    function langCard(lang) {
      const r = recOf(lang.id);
      const fam = family(lang);
      const canReverse = lang.regular || lang.pumpable;
      const badge = fam === 'decoy' ? h('span.tag.good', 'regular')
        : fam === 'pumpable' ? h('span.tag.magic', 'pumpable · not regular')
          : h('span.tag.bad', 'not regular');
      return h('div.card.pd-langcard',
        h('div.row', badge, h('span.tag', lang.difficulty), h('span.spacer'),
          (r.wins || r.losses || r.rwins || r.rlosses)
            ? h('span.small.faint', `${r.wins + r.rwins}W · ${r.losses + r.rlosses}L`) : null),
        h('div.pd-langtex', { html: tex('$' + lang.tex + '$') }),
        h('div.small.muted', lang.title),
        h('div.row',
          h('button.btn-primary.btn-sm', {
            onclick: () => startForward(lang),
          }, 'Attack it'),
          canReverse ? h('button.btn-sm', { onclick: () => startReverse(lang) }, 'Defend it (reverse)') : null));
    }

    /* ---- forward duel ---------------------------------------------------- */
    function startForward(lang) {
      const rec = recOf(lang.id);
      G = {
        mode: 'forward', lang, phase: 'n', n: adversaryN(lang, rec),
        s: '', analysis: null, sp: null, h: 2, tried: [], graded: false, msg: null,
      };
      render();
    }

    function startReverse(lang) {
      G = {
        mode: 'reverse', lang, phase: 'rn', n: lang.pumpLength ? Math.max(1, lang.pumpLength - 1) : 2,
        pool: null, s: '', i: 0, j: 1, round: 0, retries: 2, graded: false, msg: null, lastBreak: null,
      };
      render();
    }

    function backToPicker() { G = null; render(); }

    function drawStage() {
      clear(stage);
      const { lang, mode } = G;
      stage.appendChild(h('div.row.pd-head',
        h('button.btn-ghost.btn-sm', { onclick: backToPicker }, '← languages'),
        h('div.pd-target', { html: tex('$' + lang.tex + '$') }),
        h('span.spacer'),
        h('span.tag' + (mode === 'reverse' ? '.magic' : '.accent'), mode === 'reverse' ? 'reverse duel' : 'you attack')));
      stage.appendChild(ribbon(G.phase, mode));
      stage.appendChild(mode === 'reverse' ? reverseBody() : forwardBody());
    }

    /* ================= forward ================= */
    function forwardBody() {
      const box = h('div');
      const { lang } = G;

      /* turn 1 — the Adversary announces n */
      box.appendChild(h('div.card.pd-turn',
        h('div.pd-turnhead', h('span.pd-tno', '1'), h('span', 'The Adversary commits to n'), h('span.spacer'),
          h('span.tag.bad', 'their ∃')),
        say(`"Fine. I claim $L$ is regular, and my pumping length is $n = ${G.n}$. Now show me a word."`),
        G.phase === 'n' ? h('div.row',
          h('button.btn-primary', { onclick: () => { G.phase = 'word'; drawStage(); } }, 'Accept the challenge'),
          h('button.btn-ghost.btn-sm', { onclick: () => { G.n = adversaryN(lang, { wins: (recOf(lang.id).wins || 0) + 1 }); drawStage(); } }, 'Make it harder')) : null));
      if (G.phase === 'n') return box;

      /* turn 2 — the learner chooses s */
      box.appendChild(wordTurn());
      if (G.phase === 'word') return box;

      /* turn 3 — the Adversary splits */
      box.appendChild(splitTurn());
      if (G.phase === 'split') return box;

      /* turn 4 — the learner pumps */
      box.appendChild(pumpTurn());
      if (G.msg) box.appendChild(G.msg);
      return box;
    }

    function wordTurn() {
      const { lang, n } = G;
      const input = h('input.pd-input', { type: 'text', value: G.s || '', placeholder: 'type a word of L, e.g. ' + (lang.alphabet[0] || 'a').repeat(2), spellcheck: 'false' });
      const fb = h('div.pd-fb');

      const builder = h('div.row.pd-builder',
        lang.alphabet.map(c => h('button.btn-sm.btn-ghost', { onclick: () => { input.value += c; } }, c)),
        lang.alphabet.map(c => h('button.btn-sm.btn-ghost', { onclick: () => { input.value += c.repeat(n); } }, `${c}${sup(n)}`)),
        lang.alphabet.map(c => h('button.btn-sm.btn-ghost', { onclick: () => { input.value += c.repeat(n + 1); } }, `${c}${sup(n)}⁺¹`)),
        h('button.btn-sm.btn-ghost', { onclick: () => { input.value = ''; fb.textContent = ''; } }, 'clear'));

      const commit = () => {
        const s = input.value.trim();
        const bad = diagnoseWord(lang, s, n);
        if (bad) { clear(fb); fb.appendChild(bad); return; }
        G.s = s;
        G.analysis = adversarySplit(lang, s, n);
        G.sp = G.analysis.best ? G.analysis.best.sp : null;
        G.h = 2; G.tried = []; G.msg = null;
        G.phase = 'split';
        drawStage();
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') commit(); });

      const card = h('div.card.pd-turn' + (G.phase === 'word' ? '.active' : ''),
        h('div.pd-turnhead', h('span.pd-tno', '2'), h('span', 'You choose s ∈ L with |s| ≥ n'), h('span.spacer'), h('span.tag.accent', 'your ∀')),
        G.phase === 'word' ? h('div',
          h('p.muted.small', { html: tex('Any word of $L$ that is long enough is legal — but only a *convenient* one wins. Ask yourself: where will $|uv| \\leq n$ force the block $v$ to sit?') }),
          builder, h('div.row', input, h('button.btn-primary', { onclick: commit }, 'Play this word')), fb)
          : h('div.pd-chosen', h('span.muted.small', 's = '), h('code', shortStr(G.s)), h('span.muted.small', ` · |s| = ${G.s.length} ≥ ${n}`)));
      return card;
    }

    function diagnoseWord(lang, s, n) {
      if (!s) return h('div.callout.bad', { html: tex('Empty input. The lemma speaks about a word $s \\in L$ — you have to name one.') });
      if (s.length > MAX_WORD_LEN) return h('div.callout.bad', { html: tex(`That word has ${s.length} characters; keep it under ${MAX_WORD_LEN} so the search stays honest.`) });
      const alien = [...s].find(c => !lang.alphabet.includes(c));
      if (alien) return h('div.callout.bad', { html: tex(`The character \`${alien}\` is not in $\\Sigma = \\{${lang.alphabet.join(', ')}\\}$. A word outside $\\Sigma^*$ is not in $L$ either.`) });
      if (s.length < n) return h('div.callout.bad', { html: tex(`$|s| = ${s.length} < ${n} = n$. The lemma only makes a promise about words of length **at least** $n$ — a shorter word proves nothing, and the Adversary will simply shrug.`) });
      if (!safeMember(lang, s)) return h('div.callout.bad', { html: tex('That word is **not in $L$**. The quantifier is $\\forall s \\in L$: attacking with a non-member is the single most common mistake in the exam. Pumping something that was never in $L$ says nothing at all.') });
      return null;
    }

    function splitTurn() {
      const { lang, analysis, sp } = G;
      const body = h('div');
      if (!sp) {
        body.appendChild(h('div.callout.warn', { html: tex('There is no legal split at all — that can only happen if $|s| = 0$. Go back and pick a longer word.') }));
      } else {
        const total = analysis.all.length;
        body.appendChild(say(`"I examined all ${total} legal splits of your word. ` +
          (analysis.survives
            ? `One of them survives every exponent you could possibly try. I play it."`
            : `None of them is safe, so I play the one that leaves you the least room. Find it if you can."`)));
        body.appendChild(splitView(sp));
        body.appendChild(h('div.small.muted', { html: tex(`Check the rules yourself: $|uv| = ${sp.u.length + sp.v.length} \\leq ${G.n} = n$ and $v \\neq \\lambda$.`) }));
      }
      return h('div.card.pd-turn' + (G.phase === 'split' ? '.active' : ''),
        h('div.pd-turnhead', h('span.pd-tno', '3'), h('span', 'The Adversary splits s = uvw'), h('span.spacer'), h('span.tag.bad', 'their ∃')),
        body,
        G.phase === 'split' ? h('div.row', h('button.btn-primary', { onclick: () => { G.phase = 'pump'; drawStage(); } }, 'Take the last turn')) : null);
    }

    function pumpTurn() {
      const { lang, sp } = G;
      const slider = h('input.pd-slider', { type: 'range', min: '0', max: '12', value: String(G.h) });
      const num = h('input.pd-num', { type: 'number', min: '0', max: '100000', value: String(G.h) });
      const preview = h('div.pd-preview');
      const strline = h('div.pd-strline');
      const fb = h('div.pd-fb');

      const paint = () => {
        clear(preview); clear(strline);
        const hh = G.h;
        if (!fits(sp, hh)) {
          preview.appendChild(h('div.callout.warn', 'That exponent makes the string too long to build here. Try a smaller one — or argue it on paper.'));
          return;
        }
        preview.appendChild(pumpedView(sp, hh));
        const res = pump(sp, hh);
        strline.appendChild(h('span.muted.small', { html: tex(`uv^{${hh}}w = `) }));
        strline.appendChild(h('code', shortStr(res)));
        strline.appendChild(h('span.muted.small', ` · length ${res.length}`));
      };
      const setH = v => {
        const x = Math.max(0, Math.min(100000, Math.floor(Number(v) || 0)));
        G.h = x; slider.value = String(Math.min(12, x)); num.value = String(x); paint();
      };
      slider.addEventListener('input', () => setH(slider.value));
      num.addEventListener('input', () => setH(num.value));

      const claim = () => {
        const hh = G.h;
        const broke = breaksWith(lang, sp, hh);
        if (broke === null) { clear(fb); fb.appendChild(h('div.callout.warn', 'Too long to verify here.')); return; }
        if (broke) return win(hh);
        if (!G.tried.includes(hh)) G.tried.push(hh);
        clear(fb);
        fb.appendChild(h('div.callout.bad',
          h('div', { html: tex(`$uv^{${hh}}w = $ \`${shortStr(pump(sp, hh))}\` — and that word **is** in $L$. No contradiction yet.`) }),
          h('div.small.muted', { html: tex(whyStillIn(lang, pump(sp, hh))) })));
        if (G.tried.length >= 3 && G.analysis.survives) {
          fb.appendChild(h('div.callout.warn',
            h('div', { html: tex('Stop pumping. **No** exponent will work against this split — the mistake happened one turn earlier, when you chose $s$.') }),
            h('div.row', h('button.btn-bad.btn-sm', { onclick: lose }, 'Show me why'))));
        }
      };

      const card = h('div.card.pd-turn' + (G.phase === 'pump' ? '.active' : ''),
        h('div.pd-turnhead', h('span.pd-tno', '4'), h('span', 'You choose h'), h('span.spacer'), h('span.tag.accent', 'your ∀')),
        h('p.muted.small', { html: tex('Drag $h$ and watch the $v$ block duplicate. You win the moment **one single** $h$ drops the word out of $L$ — the lemma promised *all* of them stay in.') }),
        h('div.row.pd-hrow', h('span.pd-hlabel', { html: tex('h =') }), slider, num,
          h('span.spacer'),
          h('button.btn-primary', { onclick: claim }, 'Claim uvʰw ∉ L'),
          h('button.btn-ghost.btn-sm', { onclick: lose }, 'Concede')),
        preview, strline, fb);
      later(paint, 0);
      return card;
    }

    /** A short, specific reason why the pumped word is still a member. */
    function whyStillIn(lang, str) {
      const a = (str.match(/a/g) || []).length, b = (str.match(/b/g) || []).length, c = (str.match(/c/g) || []).length;
      if (lang.alphabet.includes('c')) return `It still has the shape $a^i b^j c^k$ with $i = ${a}$, $j = ${b}$, $k = ${c}$ — and that combination satisfies the defining condition.`;
      if (lang.alphabet.includes('b')) return `Counts: $count(s,a) = ${a}$, $count(s,b) = ${b}$, $|s| = ${str.length}$. Check the defining condition against those numbers before choosing the next $h$.`;
      return `Its length is ${str.length}, which still satisfies the condition defining $L$.`;
    }

    /* ---- outcomes -------------------------------------------------------- */
    function grade(ok) {
      if (G.graded) return;
      G.graded = true;
      store.record('pumping', ok, 2);
      store.record('nonregular', ok, 2);
      store.logSession('pumping-duel', ok ? 1 : 0, 1);
      bump(G.lang.id, G.mode === 'reverse' ? (ok ? 'rwins' : 'rlosses') : (ok ? 'wins' : 'losses'));
    }

    function win(hh) {
      grade(true);
      toast('Contradiction found — L is not regular.', 'good');
      const { lang, sp } = G;
      G.msg = h('div.card.pd-result.win',
        h('h2', '⚔  You broke the lemma'),
        say(`"...${['Annoying.', 'Noted.', 'That word was well chosen.', 'I withdraw the claim.'][Math.floor(Math.random() * 4)]}"`, 'beaten'),
        h('p', { html: tex(`With $n = ${G.n}$, $s = $ \`${shortStr(G.s)}\`, the split $u = ${runLabel(sp.u)}$, $v = ${runLabel(sp.v)}$, $w = ${runLabel(sp.w)}$ and $h = ${hh}$ you produced $uv^{${hh}}w \\notin L$. Since the lemma promised $\\forall h: uv^hw \\in L$, the assumption that $L$ is regular is refuted.`) }),
        lang.hint ? h('details.pd-det', h('summary', 'The intended strategy'), h('div', { html: tex(lang.hint) })) : null,
        lang.note ? h('div.callout', { html: tex(lang.note) }) : null,
        h('div.row',
          h('button.btn-good', { onclick: () => openProof(hh) }, 'Write the proof →'),
          h('button.btn-sm', { onclick: () => startForward(lang) }, 'Again, harder'),
          h('button.btn-ghost.btn-sm', { onclick: backToPicker }, 'Pick another')));
      drawStage();
      later(() => { const el = stage.querySelector('.pd-result'); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    }

    function lose() {
      grade(false);
      const { lang, n, s, analysis, sp } = G;
      const box = h('div.card.pd-result.loss', h('h2', 'The Adversary holds'));

      if (lang.pumpable && !lang.regular) {
        box.appendChild(say('"You will never break me here — and yet I am lying. Read on."', 'smug'));
        box.appendChild(h('div.callout.warn', { html: tex(lang.trap) }));
        if (lang.note) box.appendChild(h('div.callout', { html: tex(lang.note) }));
      } else if (lang.regular) {
        box.appendChild(say('"Of course I hold. I am regular."', 'smug'));
        box.appendChild(h('div.callout.warn', { html: tex(lang.trap) }));
      } else if (analysis && analysis.survives) {
        box.appendChild(say('"Your word was the mistake, not your arithmetic."', 'smug'));
        box.appendChild(h('p', { html: tex(`The split I played, $u = ${runLabel(sp.u)}$, $v = ${runLabel(sp.v)}$, $w = ${runLabel(sp.w)}$, survives every exponent — because pumping $v$ there never disturbs the property that defines $L$.`) }));
        const good = lang.winningWord(n);
        const ga = adversarySplit(lang, good, n);
        box.appendChild(h('div.pd-fix',
          h('h3', { html: tex('A word that *would* have worked') }),
          h('div.row', h('code', shortStr(good)), h('span.small.muted', `|s| = ${good.length} ≥ ${n}`)),
          h('div.small.muted', { html: tex(`Against this word all ${ga.all.length} legal splits fail: my best defence is ${ga.best ? `$u = ${runLabel(ga.best.sp.u)}$, $v = ${runLabel(ga.best.sp.v)}$, $w = ${runLabel(ga.best.sp.w)}$, and even then $h = ${ga.best.brk[0]}$ kills me.` : 'nothing.'}`) }),
          h('div.callout', { html: tex(lang.hint || '') }),
          h('div.row', h('button.btn-primary.btn-sm', {
            onclick: () => { G.s = good; G.analysis = ga; G.sp = ga.best.sp; G.h = ga.best.brk[0]; G.tried = []; G.graded = true; G.msg = null; G.phase = 'pump'; drawStage(); }
          }, 'Replay the turn with this word'))));
      } else {
        box.appendChild(say('"Conceded already? The split I gave you was breakable."', 'smug'));
        const b = analysis && analysis.best ? analysis.best.brk : [];
        if (b.length) box.appendChild(h('div.callout.good', { html: tex(`$h = ${b[0]}$ would have won: $uv^{${b[0]}}w \\notin L$.`) }));
        if (lang.hint) box.appendChild(h('div.callout', { html: tex(lang.hint) }));
      }
      box.appendChild(h('div.row',
        h('button.btn-primary.btn-sm', { onclick: () => startForward(lang) }, 'Rematch'),
        (lang.regular || lang.pumpable) ? h('button.btn-sm', { onclick: () => startReverse(lang) }, 'Play the Adversary’s side') : null,
        h('button.btn-ghost.btn-sm', { onclick: backToPicker }, 'Pick another')));
      G.msg = box;
      drawStage();
      later(() => { const el = stage.querySelector('.pd-result'); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    }

    /* ====================================================================
       The proof writer: the same moves, turned into exam prose.
       ==================================================================== */
    function openProof(hh) {
      const { lang, n, s, sp } = G;
      const pr = lang.proof;
      if (!pr) { toast('No proof skeleton for this language.', 'bad'); return; }

      const others = languages.filter(l => l.proof && l.id !== lang.id).map(l => l.proof);
      const opts = (field, correct) => {
        const pool = [...new Set(others.map(o => o[field]).filter(x => x && x !== correct))];
        return shuffle([correct, ...pool.slice(0, 3)]);
      };
      const blanks = [
        { key: 's', label: 'the word you attack with', correct: pr.s, mine: s === lang.winningWord(n) ? pr.s : null },
        { key: 'why', label: 'why the lemma applies to it', correct: pr.why, mine: null },
        { key: 'vform', label: 'what |uv| ≤ n forces v to look like', correct: pr.vform, mine: null },
        { key: 'h', label: 'the exponent you pick', correct: pr.h, mine: String(hh) === String(pr.h) ? pr.h : null },
        { key: 'result', label: 'the string that results', correct: pr.result, mine: null },
        { key: 'reason', label: 'why it is not in L', correct: pr.reason, mine: null },
      ];
      const sels = {};
      const plain = t => String(t)
        .replace(/\\mbox\{([^}]*)\}/g, '$1')
        .replace(/\\geq/g, '≥').replace(/\\leq/g, '≤').replace(/\\neq/g, '≠')
        .replace(/\\lambda/g, 'λ').replace(/\\N/g, 'ℕ').replace(/\\;|\\,/g, ' ')
        .replace(/[{}$]/g, '').replace(/\s+/g, ' ').trim();
      const mkSel = b => {
        const sel = h('select.pd-blank', { 'data-key': b.key },
          h('option', { value: '' }, '— ' + b.label + ' —'),
          opts(b.key, b.correct).map(o => h('option', { value: o }, plain(o))));
        sels[b.key] = sel;
        return sel;
      };

      const fb = h('div.pd-fb');
      const t = txt => h('span.pd-ptext', { html: tex(txt) });
      const para = (...kids) => h('p.pd-proofline', kids);

      const body = h('div.card.pd-proof',
        h('h2', 'Now write it down'),
        h('div.callout', { html: tex('A duel you cannot write out is a duel you cannot hand in. Fill the six blanks in the lecture’s own notation — your moves are in the strip below.') }),
        h('div.pd-moves',
          h('span', { html: tex(`n = ${n}`) }),
          h('span', { html: tex(`s = `) }), h('code', shortStr(s)),
          h('span', { html: tex(`u = ${runLabel(sp.u)},\; v = ${runLabel(sp.v)},\; w = ${runLabel(sp.w)}`) }),
          h('span', { html: tex(`h = ${hh}`) })),
        h('div.pd-proofbody',
          para(t(`**Proposition.** The language $${lang.tex}$ is not regular.`)),
          para(t('**Proof.** By contradiction. Assume $L$ is regular. By the Pumping Lemma there is an $n \\in \\N$ such that every $s \\in L$ with $|s| \\geq n$ can be written as $s = uvw$ where (1) $v \\neq \\lambda$, (2) $|uv| \\leq n$ and (3) $\\forall h \\in \\N: uv^h w \\in L$.')),
          para(t('Choose $s :=$ '), mkSel(blanks[0]), t(' . Then '), mkSel(blanks[1]),
               t(' , so $s \\in L$ and the lemma applies to it.')),
          para(t('Because of (1) and (2) we know '), mkSel(blanks[2]), t(' .')),
          para(t('Now set $h :=$ '), mkSel(blanks[3]), t(' , which gives '), mkSel(blanks[4]), t(' .')),
          para(t('But '), mkSel(blanks[5]), t(' , hence $uv^h w \\notin L$ — contradicting (3). Therefore $L$ is not regular. $\\square$'))),
        h('div.row',
          h('button.btn-sm', {
            onclick: () => { blanks.forEach(b => { if (b.mine) sels[b.key].value = b.mine; }); toast('Filled the blanks your own moves already answer.', 'good'); }
          }, 'Fill in from my moves'),
          h('button.btn-primary', {
            onclick: () => {
              let ok = 0;
              blanks.forEach(b => {
                const good = sels[b.key].value === b.correct;
                sels[b.key].classList.toggle('bad', !good);
                sels[b.key].classList.toggle('good', good);
                if (good) ok++;
              });
              clear(fb);
              const all = ok === blanks.length;
              fb.appendChild(h('div.callout.' + (all ? 'good' : 'bad'),
                { html: tex(all ? 'That is the proof, in the lecture’s own words. Write it exactly like this in the exam — the marks are in steps (2) and (3), not in the arithmetic.' : `${ok} of ${blanks.length} blanks correct. The red ones are wrong — reread the Adversary’s split: it is $|uv| \\leq n$ that forces the shape of $v$.`) }));
              store.record('nonregular', all, 3);
            }
          }, 'Check my proof'),
          h('button.btn-ghost.btn-sm', {
            onclick: () => { blanks.forEach(b => { sels[b.key].value = b.correct; sels[b.key].classList.add('good'); }); }
          }, 'Show the model answer')),
        fb);

      G.msg = body;
      drawStage();
      later(() => { const el = stage.querySelector('.pd-proof'); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    }

    /* ====================================================================
       Reverse duel — you are the Adversary, defending a language
       ==================================================================== */
    function reverseBody() {
      const box = h('div');
      const { lang } = G;
      box.appendChild(h('div.card.pd-turn',
        h('div.pd-turnhead', h('span.pd-tno', '0'), h('span', 'The claim'), h('span.spacer'), h('span.tag.magic', 'you defend')),
        say('"This language is not regular. It counts, it pairs, it remembers — no finite automaton could ever manage it. Prove me wrong: name your pumping length and then survive every word I throw."'),
        h('p.muted.small', { html: tex('Your job is the $\\exists$ side: a single $n$, and then for **every** word I produce a split that survives **all** exponents. One broken split and you lose the language.') })));

      /* step 1 — choose n */
      const numn = h('input.pd-num', { type: 'number', min: '1', max: '40', value: String(G.n) });
      box.appendChild(h('div.card.pd-turn' + (G.phase === 'rn' ? '.active' : ''),
        h('div.pd-turnhead', h('span.pd-tno', '1'), h('span', 'You commit to n'), h('span.spacer'), h('span.tag.magic', 'your ∃')),
        G.phase === 'rn'
          ? h('div', h('div.row', h('span.pd-hlabel', { html: tex('n =') }), numn,
            h('button.btn-primary', {
              onclick: () => {
                const n = Math.max(1, Math.min(40, Math.floor(Number(numn.value) || 1)));
                G.n = n; G.pool = challengeWords(lang, n);
                G.round = 0; G.retries = 2; G.lastBreak = null;
                if (!G.pool.length) return reverseVacuous();
                G.s = G.pool[0].w; G.i = 0; G.j = 1; G.phase = 'rsplit'; G.msg = null;
                if (G.pool[0].survivors === 0) return reverseRefuted(G.pool[0]);
                drawStage();
              }
            }, 'Commit')),
            h('p.muted.small', { html: tex('Too small an $n$ and I will find a word you cannot defend. Too large is never wrong — the lemma only claims that *some* $n$ works.') }))
          : h('div.pd-chosen', h('span.muted.small', 'n = '), h('code', String(G.n)))));
      if (G.phase === 'rn') { if (G.msg) box.appendChild(G.msg); return box; }

      /* step 2/3 — the word and your split */
      box.appendChild(reverseSplitTurn());
      if (G.msg) box.appendChild(G.msg);
      return box;
    }

    function reverseVacuous() {
      const { lang, n } = G;
      grade(true);
      G.msg = h('div.card.pd-result.win',
        h('h2', 'Vacuously safe'),
        say('"...there is no word of that length in the language."', 'beaten'),
        h('p', { html: tex(`With $n = ${n}$ there is **no** $s \\in L$ with $|s| \\geq n$ at all, so the condition "for all $s \\in L$ with $|s| \\geq n$ ..." is vacuously true. The lemma is satisfied and can never refute $L$.`) }),
        lang.trap ? h('div.callout.warn', { html: tex(lang.trap) }) : null,
        h('div.row', h('button.btn-ghost.btn-sm', { onclick: backToPicker }, 'Pick another')));
      drawStage();
    }

    function reverseRefuted(entry) {
      const { lang, n } = G;
      const worst = entry.a.best;
      G.msg = h('div.card.pd-result.loss',
        h('h2', 'Your n is too small'),
        say(`"Here: $s = $ ${shortStr(entry.w)}. Every one of the ${entry.a.all.length} legal splits dies. Your $n$ is refuted."`, 'smug'),
        splitView(worst.sp),
        h('p', { html: tex(`Even your best split there falls to $h = ${worst.brk[0]}$. That does **not** make $L$ non-regular — it makes *this* $n$ wrong. Raise it${lang.pumpLength ? ` (the number of states of the minimal DFA is a safe bet — here $n = ${lang.pumpLength}$ works)` : ''} and try again.`) }),
        h('div.row', h('button.btn-primary.btn-sm', { onclick: () => { G.phase = 'rn'; G.msg = null; drawStage(); } }, 'Choose a bigger n')));
      G.phase = 'rn';
      drawStage();
    }

    function reverseSplitTurn() {
      const { lang, n, s } = G;
      const gaps = h('div.pd-gaps');
      const fb = h('div.pd-fb');
      const info = h('div.pd-fb');

      const clampIdx = () => {
        const lim = Math.min(n, s.length);
        G.i = Math.max(0, Math.min(G.i, lim - 1));
        G.j = Math.max(G.i + 1, Math.min(G.j, lim));
      };
      clampIdx();

      const paint = () => {
        clear(gaps); clear(info);
        const sp = { u: s.slice(0, G.i), v: s.slice(G.i, G.j), w: s.slice(G.j) };
        gaps.appendChild(splitView(sp));
        info.appendChild(h('div.small.muted', { html: tex(`$|uv| = ${G.i + (G.j - G.i)} \\leq ${n}$ ✓ · $|v| = ${G.j - G.i} > 0$ ✓`) }));
      };

      const lim = Math.min(n, s.length);
      const si = h('input.pd-slider', { type: 'range', min: '0', max: String(Math.max(0, lim - 1)), value: String(G.i) });
      const sj = h('input.pd-slider', { type: 'range', min: '1', max: String(lim), value: String(G.j) });
      si.addEventListener('input', () => { G.i = +si.value; if (G.j <= G.i) { G.j = G.i + 1; sj.value = String(G.j); } clampIdx(); paint(); });
      sj.addEventListener('input', () => { G.j = +sj.value; if (G.j <= G.i) { G.i = G.j - 1; si.value = String(G.i); } clampIdx(); paint(); });

      const commit = () => {
        const sp = { u: s.slice(0, G.i), v: s.slice(G.i, G.j), w: s.slice(G.j) };
        const brk = breakers(lang, sp);
        clear(fb);
        if (!brk.length) {
          G.round++;
          if (G.round >= 3) return reverseWin();
          const next = G.pool[Math.min(G.round, G.pool.length - 1)];
          G.s = next.w; G.i = 0; G.j = 1; G.retries = 2;
          fb.appendChild(h('div.callout.good', 'Survived. Next word.'));
          later(drawStage, 350);
          return;
        }
        G.retries--;
        fb.appendChild(h('div.callout.bad',
          h('div', { html: tex(`Broken by $h = ${brk[0]}$: $uv^{${brk[0]}}w = $ \`${shortStr(pump(sp, brk[0]))}\` $\\notin L$.`) }),
          h('div.small.muted', { html: tex('A surviving split must leave the *defining property* untouched. Ask what property this $v$ destroys when it is repeated.') })));
        if (G.retries <= 0) {
          const ok = adversarySplit(lang, s, n);
          if (ok.survivors.length) {
            fb.appendChild(h('div.callout.warn',
              h('div', { html: tex(`A split that does survive: $u = ${runLabel(ok.survivors[0].sp.u)}$, $v = ${runLabel(ok.survivors[0].sp.v)}$, $w = ${runLabel(ok.survivors[0].sp.w)}$.`) }),
              lang.defence ? h('div', { html: tex('**The general recipe:** ' + lang.defence) }) : null));
          }
          fb.appendChild(h('div.row', h('button.btn-primary.btn-sm', { onclick: () => { G.retries = 2; drawStage(); } }, 'Try this word again')));
        }
      };

      later(paint, 0);
      return h('div.card.pd-turn.active',
        h('div.pd-turnhead', h('span.pd-tno', String(2 + G.round)), h('span', `Word ${G.round + 1} of 3`), h('span.spacer'), h('span.tag.magic', 'your ∃u,v,w')),
        say(`"$s = $ ${shortStr(s)} — it is in $L$ and $|s| = ${s.length} \\geq ${n}$. Split it."`),
        gaps, info,
        h('div.row', h('span.pd-hlabel', '|u|'), si, h('span.pd-hlabel', '|uv|'), sj,
          h('span.spacer'), h('button.btn-primary', { onclick: commit }, 'Commit this split'),
          h('span.small.faint', `${G.retries} retries left`)),
        fb);
    }

    function reverseWin() {
      const { lang } = G;
      grade(true);
      toast('Defended — the lemma cannot touch it.', 'good');
      G.msg = h('div.card.pd-result.win',
        h('h2', 'You held the line'),
        say('"Three words, three surviving splits. I withdraw."', 'beaten'),
        h('div.callout.warn', { html: tex(lang.trap || '') }),
        lang.defence ? h('details.pd-det', h('summary', 'The general defence'), h('div', { html: tex(lang.defence) })) : null,
        lang.note ? h('div.callout', { html: tex(lang.note) }) : null,
        h('div.row',
          h('button.btn-sm', { onclick: () => startReverse(lang) }, 'Again'),
          h('button.btn-ghost.btn-sm', { onclick: backToPicker }, 'Pick another')));
      drawStage();
    }

    render();
    return () => { timers.forEach(clearTimeout); };
  },
};
