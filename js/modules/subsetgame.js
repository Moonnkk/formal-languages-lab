/* Subset Race — 90 seconds of ec(·) and Δ(M,c) under time pressure.

   Speed is the point: in the exam you compute these sets dozens of times, and
   fluency is what makes the subset construction feel small. But the game stays
   honest — every miss stops the clock and shows the closure being computed. */
import {
  epsilonClosure, nfaMove, nfaRun, renderAutomaton, setLabel, EPS,
} from '../core/automata.js';

const ROUND_MS = 90000;
const COMBO_MAX = 5;

const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];

/* Difficulty ramps with the score: more states, more ε-edges, more branching. */
function levelOf(answered) {
  return Math.min(5, 1 + Math.floor(answered / 4));
}

function randomNfa(level) {
  const n = Math.min(8, 3 + level);
  const alphabet = level >= 4 ? ['a', 'b', 'c'] : ['a', 'b'];
  const states = Array.from({ length: n }, (_, i) => 'q' + i);
  const trans = [];
  const add = (from, sym, to) => {
    if (!trans.some(t => t.from === from && t.sym === sym && t.to === to)) trans.push({ from, sym, to });
  };
  for (let i = 0; i < n; i++) {
    for (const c of alphabet) {
      const k = Math.random() < 0.25 ? 0 : (Math.random() < 0.2 + level * 0.1 ? 2 : 1);
      for (let j = 0; j < k; j++) add(states[i], c, states[rnd(n)]);
    }
  }
  const epsCount = Math.max(1, Math.round(level * 0.9));
  for (let i = 0; i < epsCount; i++) {
    const a = rnd(n), b = rnd(n);
    if (a !== b) add(states[a], EPS, states[b]);
  }
  const accepting = [states[n - 1]];
  return { kind: 'nfa', states, start: states[0], accepting, accept: accepting[0], trans, alphabet,
    labels: Object.fromEntries(states.map(q => [q, q])) };
}

/* Build one question. Three flavours, unlocked as the level rises. */
function makeQuestion(level) {
  const nfa = randomNfa(level);
  const modes = level <= 1 ? ['ec'] : level <= 3 ? ['ec', 'delta'] : ['ec', 'delta', 'word'];
  const mode = pick(modes);

  if (mode === 'ec') {
    const q = pick(nfa.states);
    const answer = epsilonClosure(nfa, [q]);
    return { nfa, mode, q, answer, prompt: `ec({${q}}) = ?`,
      hint: 'Start with the state itself, then keep following ε-edges until nothing new turns up.' };
  }
  if (mode === 'delta') {
    const seed = pick(nfa.states);
    const M = epsilonClosure(nfa, [seed]);
    const c = pick(nfa.alphabet);
    const move = nfaMove(nfa, M, c);
    const answer = epsilonClosure(nfa, move);
    return { nfa, mode, M, c, move, answer, prompt: `Δ(${setLabel(M)}, ${c}) = ?`,
      hint: 'First read the character from every state of M, *then* take the ε-closure of what you land on.' };
  }
  const len = 2 + rnd(2);
  let w = '';
  for (let i = 0; i < len; i++) w += pick(nfa.alphabet);
  const run = nfaRun(nfa, w);
  return { nfa, mode, w, run, answer: run.frontier,
    prompt: `Which DFA state does det(F) reach on “${w}”?`,
    hint: 'One Δ-step per character, starting from ec({' + nfa.start + '}).' };
}

/* Distractors that encode the actual misconceptions, not random noise. */
function choicesFor(q) {
  const out = [q.answer];
  const push = s => {
    if (!s) return;
    const norm = [...new Set(s)].sort();
    if (!out.some(o => [...o].sort().join(',') === norm.join(','))) out.push(norm);
  };
  if (q.mode === 'delta') {
    push(q.move);                                          // forgot the closure
    push(epsilonClosure(q.nfa, q.M.concat(q.move)));       // dragged M along
    push(nfaMove(q.nfa, q.M, pick(q.nfa.alphabet)));       // read the wrong character
  } else if (q.mode === 'ec') {
    push(q.answer.filter(x => x !== q.q).length ? q.answer.filter(x => x !== q.q) : null); // forgot q itself
    push(q.answer.slice(0, Math.max(1, q.answer.length - 1)));                             // stopped too early
    push(epsilonClosure(q.nfa, [pick(q.nfa.states)]));
  } else {
    const steps = q.run.steps;
    if (steps.length > 1) push(steps[steps.length - 2].set);            // one step short
    push(steps[steps.length - 1].move);                                  // forgot the last closure
    push(epsilonClosure(q.nfa, [q.nfa.start]));
  }
  let guard = 0;
  while (out.length < 4 && guard++ < 40) {
    const s = [...new Set([...q.answer, pick(q.nfa.states)])];
    if (s.length && Math.random() < 0.5) s.pop();
    push(s);
  }
  return out.slice(0, 4);
}

export default {
  id: 'subset',
  title: 'Subset Race',

  mount(root, ctx) {
    const { ui, store } = ctx;
    const { h, tex, toast } = ui;
    ui.loadCss('css/modules/automata.css');

    const G = {
      phase: 'idle',        // idle | play | frozen | over
      score: 0, combo: 1, answered: 0, correct: 0,
      endsAt: 0, remaining: ROUND_MS, frozenAt: 0,
      q: null, choices: [], typed: '', feedback: null,
      timer: null,
    };

    root.appendChild(ui.pageHead('Chapter 4 · game', 'Subset Race',
      'A fresh non-deterministic machine every few seconds. Name the set — $ec(q)$, $\\Delta(M,c)$, ' +
      'or the state $\\textsl{det}(F)$ reaches — before the 90 seconds run out.'));

    const hud = h('div.card.sr-hud');
    const stage = h('div.card');
    root.appendChild(hud);
    root.appendChild(stage);

    function best() { return Number(store.flag('subsetgame:best') || 0); }

    function drawHud() {
      const frac = Math.max(0, G.remaining) / ROUND_MS;
      hud.replaceChildren(
        h('div.sr-stat', h('div.sr-k', 'score'), h('div.sr-v', String(G.score))),
        h('div.sr-stat', h('div.sr-k', 'combo'), h('div.sr-v' + (G.combo > 1 ? '.hot' : ''), '×' + G.combo)),
        h('div.sr-stat', h('div.sr-k', 'level'), h('div.sr-v', String(levelOf(G.answered)))),
        h('div.sr-stat', h('div.sr-k', 'best'), h('div.sr-v', String(best()))),
        h('div.sr-timer',
          h('div.bar', h('i', { style: { width: (frac * 100).toFixed(1) + '%',
            background: frac < 0.2 ? 'var(--bad)' : frac < 0.5 ? 'var(--warn)' : 'var(--good)' } })),
          h('div.small.faint.center', G.phase === 'frozen' ? 'clock paused — read the explanation'
            : Math.ceil(Math.max(0, G.remaining) / 1000) + 's')));
    }

    function tick() {
      if (G.phase !== 'play') return;
      G.remaining = G.endsAt - Date.now();
      if (G.remaining <= 0) { G.remaining = 0; end(); return; }
      drawHud();
    }

    function start() {
      Object.assign(G, { phase: 'play', score: 0, combo: 1, answered: 0, correct: 0,
        remaining: ROUND_MS, endsAt: Date.now() + ROUND_MS, feedback: null });
      if (G.timer) clearInterval(G.timer);
      G.timer = setInterval(tick, 120);
      nextQuestion();
    }

    function nextQuestion() {
      G.q = makeQuestion(levelOf(G.answered));
      G.choices = ui.shuffle(choicesFor(G.q));
      G.typed = '';
      G.feedback = null;
      G.phase = 'play';
      G.endsAt = Date.now() + G.remaining;
      draw();
    }

    function freeze() {
      G.phase = 'frozen';
      G.remaining = Math.max(0, G.endsAt - Date.now());
    }

    function answer(set) {
      if (G.phase !== 'play') return;
      const norm = a => [...new Set(a)].sort().join(',');
      const ok = norm(set) === norm(G.q.answer);
      G.answered++;
      store.record(G.q.mode === 'ec' ? 'eclosure' : 'subset', ok);
      if (ok) {
        G.correct++;
        const gain = 100 * G.combo + Math.max(0, Math.round(G.remaining / 1000));
        G.score += gain;
        G.combo = Math.min(COMBO_MAX, G.combo + 1);
        toast('+' + gain, 'good');
        nextQuestion();
      } else {
        G.combo = 1;
        freeze();
        G.feedback = { given: [...new Set(set)].sort() };
        draw();
      }
    }

    function end() {
      G.phase = 'over';
      if (G.timer) { clearInterval(G.timer); G.timer = null; }
      const b = best();
      if (G.score > b) { store.flag('subsetgame:best', G.score); toast('New personal best!', 'good'); }
      store.logSession('subset-race', G.correct, G.answered);
      draw();
    }

    /* ---------- rendering ---------- */
    function draw() {
      drawHud();
      stage.replaceChildren();
      if (G.phase === 'idle') return drawIdle();
      if (G.phase === 'over') return drawOver();
      drawPlay();
    }

    function drawIdle() {
      stage.appendChild(h('h2', 'Rules'));
      stage.appendChild(h('ul.small.muted',
        h('li', { html: tex('90 seconds. Every correct set scores 100 × your combo, plus a second-per-second bonus.') }),
        h('li', { html: tex('The combo climbs to ×5 and resets the moment you miss.') }),
        h('li', { html: tex('A miss **pauses the clock** and shows the computation — the ε-closure is the part people get wrong.') }),
        h('li', { html: tex('The machines grow: more states, more ε-edges, more branching, and eventually a third letter.') })));
      stage.appendChild(h('div.row',
        h('button.btn-primary', { onclick: start }, 'Start the round'),
        best() ? h('span.small.faint', 'personal best: ' + best()) : null));
      stage.appendChild(h('p.small.faint', { html: tex(
        'Reminder: $\\Delta(M,c) = ec(\\delta(M,c))$ — read the character **first**, follow ε-edges **after**.') }));
    }

    function drawPlay() {
      const q = G.q;
      stage.appendChild(h('div.row',
        h('span.tag.accent', q.mode === 'ec' ? 'ε-closure' : q.mode === 'delta' ? 'Δ-step' : 'det(F) on a word'),
        h('span.spacer'),
        h('span.small.faint', `${G.correct}/${G.answered} correct`)));
      stage.appendChild(h('div.sr-prompt.mono', q.prompt));
      stage.appendChild(h('div.aut-wrap', { html: renderAutomaton(q.nfa, {
        highlight: q.mode === 'ec' ? [q.q] : q.mode === 'delta' ? q.M : [q.nfa.start],
      }) }));

      const level = levelOf(G.answered);
      if (level <= 3 && G.phase === 'play') {
        stage.appendChild(h('div.sr-choices', ...G.choices.map(c =>
          h('button.sr-choice.mono', { onclick: () => answer(c) }, setLabel(c)))));
      } else if (G.phase === 'play') {
        const inp = h('input.mono', { type: 'text', placeholder: 'q0,q2,q5', style: { width: '220px' },
          onkeydown: e => { if (e.key === 'Enter') answer(parse(inp.value)); } });
        stage.appendChild(h('div.row', inp,
          h('button.btn-primary', { onclick: () => answer(parse(inp.value)) }, 'Submit'),
          h('span.small.faint', 'type the set — braces and spaces optional')));
        setTimeout(() => inp.focus(), 0);
      }

      if (G.phase === 'frozen') stage.appendChild(explain(q, G.feedback.given));
    }

    const parse = s => [...new Set(String(s).replace(/[{}]/g, ' ').split(/[\s,]+/).filter(Boolean))];

    function explain(q, given) {
      const box = h('div.callout.bad', { style: { marginTop: '12px' } });
      box.appendChild(h('div', { html: tex('**' + setLabel(given) + '** is not it — the answer is **' + setLabel(q.answer) + '**.') }));
      if (q.mode === 'ec') {
        let cur = [q.q];
        const steps = [cur];
        for (let k = 0; k < 12; k++) {                       // one ε-layer at a time
          const next = [...new Set([...cur, ...q.nfa.trans
            .filter(t => t.sym === EPS && cur.includes(t.from)).map(t => t.to)])].sort();
          if (next.length === cur.length) break;
          steps.push(next); cur = next;
        }
        box.appendChild(h('div.small', { html: tex(
          'ec grows one ε-layer at a time: ' + steps.map(setLabel).join(' → ') +
          '. The state itself is always in its own closure, and you stop at the fixed point.') }));
        const eps = q.nfa.trans.filter(t => t.sym === EPS && q.answer.includes(t.from));
        if (eps.length) box.appendChild(h('div.small.mono', eps.map(t => `${t.from} —ε→ ${t.to}`).join('   ')));
      } else if (q.mode === 'delta') {
        box.appendChild(h('div.small', { html: tex(
          '1. read `' + q.c + '` from every state of ' + setLabel(q.M) + ':  δ = ' + (q.move.length ? setLabel(q.move) : '{}')) }));
        box.appendChild(h('div.small', { html: tex(
          '2. ε-close it:  ec(' + (q.move.length ? setLabel(q.move) : '{}') + ') = ' + setLabel(q.answer)) }));
        if (given.join() === q.move.join()) box.appendChild(h('div.small',
          { html: tex('You stopped after step 1 — that is *the* classic slip in this construction.') }));
      } else {
        const rows = q.run.steps.map(s => s.sym == null
          ? `ec({${q.nfa.start}}) = ${setLabel(s.set)}`
          : `Δ(${setLabel(s.before)}, ${s.sym}) = ec(${s.move.length ? setLabel(s.move) : '{}'}) = ${setLabel(s.set)}`);
        box.appendChild(h('div.small.mono', ...rows.map(r => h('div', r))));
      }
      box.appendChild(h('div.row', { style: { marginTop: '10px' } },
        h('button.btn-primary', { onclick: nextQuestion }, 'Got it — next'),
        h('span.small.faint', q.hint)));
      return box;
    }

    function drawOver() {
      const acc = G.answered ? Math.round(100 * G.correct / G.answered) : 0;
      stage.appendChild(h('h2', 'Time.'));
      stage.appendChild(h('div.grid.c3',
        h('div.card.center', h('div.sr-k', 'score'), h('div.sr-big', String(G.score))),
        h('div.card.center', h('div.sr-k', 'sets computed'), h('div.sr-big', String(G.answered))),
        h('div.card.center', h('div.sr-k', 'accuracy'), h('div.sr-big', acc + '%'))));
      stage.appendChild(h('p.small.muted', { html: tex(acc >= 80
        ? 'That is fluency: you are no longer *deriving* $\\Delta$, you are seeing it.'
        : 'Most misses in this game are a forgotten ε-closure. Slow down by one second per question and the score goes **up**.') }));
      stage.appendChild(h('div.row',
        h('button.btn-primary', { onclick: start }, 'Again'),
        h('button.btn-ghost', { onclick: () => ctx.go('automata') }, 'Back to the Automaton Lab')));
    }

    draw();
    return () => { if (G.timer) clearInterval(G.timer); };
  },
};
