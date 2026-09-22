/* Automata engine for the regular-language chapters.

   Pure, dependency-free, no DOM except the SVG *string* the renderer returns.
   Notation follows the lecture notes:
     NFA/DFA  F = <Q, Sigma, delta, q0, A>,  dead transitions go to Omega,
     ec(q)    epsilon-closure,   Delta(M,c) = union of ec(delta(q,c)) for q in M,
     det(F)   subset construction,  Min(F)  quotient by the separability relation.

   Everything that an algorithm *does* is also recorded in a `log`, because the
   point of this app is to show the machine working, not just its answer. */

export const EPS = 'ε';
export const OMEGA = 'Ω';

/* ========================================================================
   1. Regular expressions — parser
   ======================================================================== */

export class RegexError extends Error {
  constructor(message, pos, expected = null) {
    super(message);
    this.name = 'RegexError';
    this.pos = pos;
    this.expected = expected;
  }
}

const RESERVED = new Set(['+', '|', '*', '?', '(', ')', '[', ']', '·', '.', '\\']);

/** Can the character at position i begin an atom? */
function startsAtom(s, i) {
  const c = s[i];
  if (c === undefined) return false;
  if (/\s/.test(c)) return false;
  if (c === '(' || c === '[' || c === '\\') return true;
  return !RESERVED.has(c) && c !== ']';
}

/**
 * Parse the lecture's regex syntax into an AST.
 *   atom     ::= char | 'ε' | '∅' | '(' union ')' | '[' class ']' | '\' char
 *   factor   ::= atom ('*' | '?' | '+')*
 *   concat   ::= factor (('·' | '.')? factor)*
 *   union    ::= concat (('+' | '|') concat)*
 * `+` is the lecture's union operator; it is only read as a postfix plus when
 * nothing that could start an expression follows it (e.g. `(ab)+`).
 * Throws {@link RegexError} with a position and what was expected.
 */
export function parseRegex(src) {
  const s = String(src == null ? '' : src);
  let i = 0;

  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const err = (msg, expected, at = i) => { throw new RegexError(msg, at, expected); };

  function union() {
    let node = concat();
    for (;;) {
      ws();
      const c = s[i];
      if (c === '|' || (c === '+' && startsAtomAfter(i + 1))) {
        const opPos = i; i++; ws();
        if (!startsAtom(s, i) && s[i] !== '(') err(`nothing follows the union operator “${c}”`, 'a character, ε, ∅ or “(”', opPos);
        node = { type: 'union', left: node, right: concat() };
      } else break;
    }
    return node;
  }

  function startsAtomAfter(j) {
    while (j < s.length && /\s/.test(s[j])) j++;
    return startsAtom(s, j);
  }

  function concat() {
    let node = factor();
    for (;;) {
      ws();
      if (s[i] === '·' || s[i] === '.') {
        const opPos = i; i++; ws();
        if (!startsAtom(s, i)) err('nothing follows the concatenation operator “·”', 'a character, ε, ∅ or “(”', opPos);
        node = { type: 'concat', left: node, right: factor() };
      } else if (startsAtom(s, i)) {
        node = { type: 'concat', left: node, right: factor() };
      } else break;
    }
    return node;
  }

  function factor() {
    let node = atom();
    for (;;) {
      ws();
      const c = s[i];
      if (c === '*') { i++; node = { type: 'star', arg: node }; }
      else if (c === '?') { i++; node = { type: 'opt', arg: node }; }
      else if (c === '+' && !startsAtomAfter(i + 1)) { i++; node = { type: 'plus', arg: node }; }
      else break;
    }
    return node;
  }

  function atom() {
    ws();
    const c = s[i];
    if (c === undefined) err('the expression ends too early', 'a character, ε, ∅ or “(”', s.length);
    if (c === '(') {
      const open = i; i++;
      const inner = union();
      ws();
      if (s[i] !== ')') err(`the “(” at position ${open + 1} is never closed`, '“)”', i);
      i++;
      return { type: 'group', arg: inner };
    }
    if (c === '[') return charClass();
    if (c === ')') err('unmatched “)” — there is no “(” to close', 'an expression before “)”');
    if (c === '*' || c === '?') err(`“${c}” has nothing to repeat — it must follow an expression`, 'a character, ε, ∅ or “(”');
    if (c === '+' || c === '|') err(`“${c}” needs an expression on its left`, 'a character, ε, ∅ or “(”');
    if (c === '\\') {
      if (i + 1 >= s.length) err('a backslash must be followed by the character it escapes', 'any character');
      const lit = s[i + 1]; i += 2;
      if (lit === 'e') return { type: 'eps' };
      if (lit === 'n') return { type: 'char', ch: '\n' };
      return { type: 'char', ch: lit };
    }
    if (c === 'ε' || c === 'λ') { i++; return { type: 'eps' }; }
    if (c === '∅') { i++; return { type: 'empty' }; }
    i++;
    return { type: 'char', ch: c };
  }

  function charClass() {
    const open = i; i++;                       // consume '['
    if (s[i] === '^') err('negated character classes [^…] are not supported — list the characters instead', 'a character or a range like a-z');
    const chars = [];
    while (i < s.length && s[i] !== ']') {
      let lo = s[i];
      if (lo === '\\') { lo = s[i + 1]; i++; if (lo === undefined) err('a backslash must be followed by the character it escapes', 'any character'); }
      i++;
      if (s[i] === '-' && s[i + 1] !== undefined && s[i + 1] !== ']') {
        i++;
        let hi = s[i];
        if (hi === '\\') { hi = s[i + 1]; i++; }
        i++;
        const a = lo.codePointAt(0), b = hi.codePointAt(0);
        if (b < a) err(`the range ${lo}-${hi} runs backwards`, 'a range whose first character comes first', i - 1);
        if (b - a > 512) err('that character range is far too large for a lab exercise', 'a range of at most 512 characters', i - 1);
        for (let k = a; k <= b; k++) chars.push(String.fromCodePoint(k));
      } else chars.push(lo);
    }
    if (s[i] !== ']') err(`the “[” at position ${open + 1} is never closed`, '“]”', i);
    i++;
    if (!chars.length) err('an empty character class [] matches nothing — write ∅ if that is what you mean', 'at least one character', open);
    const uniq = [...new Set(chars)];
    return { type: 'class', chars: uniq, src: s.slice(open, i) };
  }

  ws();
  if (i >= s.length) err('the expression is empty', 'a character, ε, ∅ or “(”', 0);
  const ast = union();
  ws();
  if (i < s.length) err(`unexpected “${s[i]}”`, 'the end of the expression', i);
  return ast;
}

/** Non-throwing wrapper: `{ok:true, ast}` or `{ok:false, error:{message,pos,expected}}`. */
export function tryParseRegex(src) {
  try { return { ok: true, ast: parseRegex(src) }; }
  catch (e) {
    if (e instanceof RegexError) return { ok: false, error: { message: e.message, pos: e.pos, expected: e.expected } };
    return { ok: false, error: { message: String(e && e.message || e), pos: 0, expected: null } };
  }
}

const PREC = { union: 1, concat: 2, star: 3, plus: 3, opt: 3, char: 4, eps: 4, empty: 4, class: 4, group: 4 };

/** Pretty-print an AST with the minimum number of parentheses. */
export function astToString(ast) {
  if (!ast) return '';
  const go = (n, need) => {
    let out, p = PREC[n.type] || 4;
    switch (n.type) {
      case 'empty': out = '∅'; break;
      case 'eps':   out = 'ε'; break;
      case 'char':  out = n.ch; break;
      case 'class': out = n.src || '[' + n.chars.join('') + ']'; break;
      case 'group': return go(n.arg, need);
      case 'union': out = go(n.left, 1) + '+' + go(n.right, 1); break;
      case 'concat':out = go(n.left, 2) + go(n.right, 2); break;
      case 'star':  out = go(n.arg, 4) + '*'; break;
      case 'plus':  out = go(n.arg, 4) + '⁺'; break;
      case 'opt':   out = go(n.arg, 4) + '?'; break;
      default:      out = '?';
    }
    return p < need ? '(' + out + ')' : out;
  };
  return go(ast, 0);
}

/** Characters occurring in an AST, sorted — the alphabet Σ of the expression. */
export function alphabetOf(ast) {
  const set = new Set();
  const walk = n => {
    if (!n) return;
    if (n.type === 'char') set.add(n.ch);
    else if (n.type === 'class') n.chars.forEach(c => set.add(c));
    if (n.left) walk(n.left);
    if (n.right) walk(n.right);
    if (n.arg) walk(n.arg);
  };
  walk(ast);
  return [...set].sort();
}

/** Structural size of an AST — used to keep drills small. */
export function astSize(ast) {
  if (!ast) return 0;
  return 1 + astSize(ast.left) + astSize(ast.right) + astSize(ast.arg);
}

/* ========================================================================
   2. Thompson construction
   ======================================================================== */

/**
 * Build A(r) from an AST, compositionally. Returns the finished NFA plus a
 * `steps` array in construction order: every sub-expression contributes one
 * snapshot `{label, kind, nfa, parts}` so the UI can replay the build.
 */
export function thompson(ast) {
  let counter = 0;
  const steps = [];
  const fresh = () => 'q' + (counter++);
  const alphabet = alphabetOf(ast);

  const snapshot = (node, frag, kind, parts) => {
    steps.push({
      label: astToString(node),
      kind,
      parts: parts || [],
      nfa: {
        kind: 'nfa', states: [...frag.states], start: frag.start,
        accept: frag.accept, accepting: [frag.accept],
        trans: frag.trans.map(t => ({ ...t })), alphabet,
      },
    });
    return frag;
  };

  function build(node) {
    switch (node.type) {
      case 'group': return build(node.arg);
      case 'empty': {
        const s = fresh(), a = fresh();
        return snapshot(node, { states: [s, a], start: s, accept: a, trans: [] }, 'empty');
      }
      case 'eps': {
        const s = fresh(), a = fresh();
        return snapshot(node, { states: [s, a], start: s, accept: a, trans: [{ from: s, sym: EPS, to: a }] }, 'eps');
      }
      case 'char': {
        const s = fresh(), a = fresh();
        return snapshot(node, { states: [s, a], start: s, accept: a, trans: [{ from: s, sym: node.ch, to: a }] }, 'char');
      }
      case 'class': {
        const s = fresh(), a = fresh();
        const trans = node.chars.map(c => ({ from: s, sym: c, to: a }));
        return snapshot(node, { states: [s, a], start: s, accept: a, trans }, 'class');
      }
      case 'concat': {
        const f1 = build(node.left), f2 = build(node.right);
        const frag = {
          states: [...f1.states, ...f2.states], start: f1.start, accept: f2.accept,
          trans: [...f1.trans, ...f2.trans, { from: f1.accept, sym: EPS, to: f2.start }],
        };
        return snapshot(node, frag, 'concat', [f1.start, f2.start]);
      }
      case 'union': {
        const f1 = build(node.left), f2 = build(node.right);
        const s = fresh(), a = fresh();
        const frag = {
          states: [...f1.states, ...f2.states, s, a], start: s, accept: a,
          trans: [...f1.trans, ...f2.trans,
            { from: s, sym: EPS, to: f1.start }, { from: s, sym: EPS, to: f2.start },
            { from: f1.accept, sym: EPS, to: a }, { from: f2.accept, sym: EPS, to: a }],
        };
        return snapshot(node, frag, 'union', [f1.start, f2.start]);
      }
      case 'star': case 'plus': case 'opt': {
        const f = build(node.arg);
        const s = fresh(), a = fresh();
        const trans = [...f.trans, { from: s, sym: EPS, to: f.start }, { from: f.accept, sym: EPS, to: a }];
        if (node.type !== 'opt') trans.push({ from: f.accept, sym: EPS, to: f.start });
        if (node.type !== 'plus') trans.push({ from: s, sym: EPS, to: a });
        const frag = { states: [...f.states, s, a], start: s, accept: a, trans };
        return snapshot(node, frag, node.type, [f.start]);
      }
      default: throw new Error('unknown AST node: ' + node.type);
    }
  }

  const root = build(ast);
  const nfa = {
    kind: 'nfa', states: root.states, start: root.start, accept: root.accept,
    accepting: [root.accept], trans: root.trans, alphabet,
    labels: Object.fromEntries(root.states.map(q => [q, q])),
  };
  return Object.assign(nfa, { steps });
}

/** Convenience: source string → NFA (throws RegexError on a bad regex). */
export function regexToNfa(src) { return thompson(parseRegex(src)); }

/* ========================================================================
   3. Running an NFA
   ======================================================================== */

function outMap(a) {
  const m = new Map();
  for (const q of a.states) m.set(q, []);
  for (const t of a.trans) {
    if (!m.has(t.from)) m.set(t.from, []);
    m.get(t.from).push(t);
  }
  return m;
}

const sortStates = (a, arr) => {
  const order = new Map(a.states.map((q, i) => [q, i]));
  return [...new Set(arr)].sort((x, y) => (order.get(x) ?? 1e9) - (order.get(y) ?? 1e9));
};

/** ec(M): every state reachable from M by ε-transitions alone. */
export function epsilonClosure(nfa, set) {
  const out = outMap(nfa);
  const seen = new Set(Array.isArray(set) ? set : [set]);
  const stack = [...seen];
  while (stack.length) {
    const q = stack.pop();
    for (const t of out.get(q) || []) {
      if (t.sym === EPS && !seen.has(t.to)) { seen.add(t.to); stack.push(t.to); }
    }
  }
  return sortStates(nfa, [...seen]);
}

/** delta(M, c): read c, no ε-moves yet. */
export function nfaMove(nfa, set, sym) {
  const res = [];
  for (const t of nfa.trans) if (t.sym === sym && set.includes(t.from)) res.push(t.to);
  return sortStates(nfa, res);
}

/** Delta(M, c) = ec(delta(M, c)) — one step of the subset machine. */
export function nfaStep(nfa, set, sym) {
  return epsilonClosure(nfa, nfaMove(nfa, set, sym));
}

/** The frontier of active states after every character of w. */
export function nfaRun(nfa, w) {
  const word = [...String(w == null ? '' : w)];
  const acc = new Set(nfa.accepting || [nfa.accept]);
  const steps = [];
  let cur = epsilonClosure(nfa, [nfa.start]);
  steps.push({ i: 0, sym: null, before: null, move: null, set: cur, live: cur.length > 0 });
  for (let k = 0; k < word.length; k++) {
    const move = nfaMove(nfa, cur, word[k]);
    const next = epsilonClosure(nfa, move);
    steps.push({ i: k + 1, sym: word[k], before: cur, move, set: next, live: next.length > 0 });
    cur = next;
  }
  return { word, steps, accepted: cur.some(q => acc.has(q)), frontier: cur };
}

/**
 * Does the NFA accept w? Returns the frontier trace *and* explicit accepting
 * paths (up to `maxPaths`) as arrays of {from, sym, to, pos} edges.
 */
export function nfaAccepts(nfa, w, maxPaths = 6) {
  const word = [...String(w == null ? '' : w)];
  const out = outMap(nfa);
  const acc = new Set(nfa.accepting || [nfa.accept]);
  const paths = [];
  let truncated = false, budget = 40000;

  function dfs(state, pos, trail, epsSeen) {
    if (paths.length >= maxPaths) { truncated = true; return; }
    if (budget-- <= 0) { truncated = true; return; }
    if (pos === word.length && acc.has(state)) { paths.push(trail.slice()); if (paths.length >= maxPaths) truncated = true; }
    for (const t of out.get(state) || []) {
      if (t.sym === EPS) {
        const key = t.to + '@' + pos;
        if (epsSeen.has(key)) continue;
        const next = new Set(epsSeen); next.add(key);
        trail.push({ from: state, sym: EPS, to: t.to, pos });
        dfs(t.to, pos, trail, next);
        trail.pop();
      } else if (pos < word.length && t.sym === word[pos]) {
        trail.push({ from: state, sym: t.sym, to: t.to, pos });
        dfs(t.to, pos + 1, trail, new Set([t.to + '@' + (pos + 1)]));
        trail.pop();
      }
      if (paths.length >= maxPaths) return;
    }
  }
  dfs(nfa.start, 0, [], new Set([nfa.start + '@0']));
  const run = nfaRun(nfa, w);
  return { accepted: paths.length > 0, paths, truncated, run, frontier: run.frontier };
}

/* ========================================================================
   4. Subset construction:  det(F)
   ======================================================================== */

const setKey = arr => arr.join(',');
export const setLabel = arr => '{' + arr.join(',') + '}';

/**
 * det(F). Returns `{dfa, log}`; the log is the worklist trace, one entry per
 * (state, character) pair, recording the move-set, its ε-closure and whether a
 * new DFA state was born.
 */
export function subsetConstruction(nfa) {
  const alphabet = [...new Set(nfa.alphabet || [])].sort();
  const accNfa = new Set(nfa.accepting || [nfa.accept]);
  const log = [];
  const byKey = new Map();
  const sets = {}, labels = {};
  const states = [], trans = [], accepting = [];

  const add = set => {
    const key = setKey(set);
    if (byKey.has(key)) return byKey.get(key);
    const id = 'S' + states.length;
    byKey.set(key, id);
    states.push(id);
    sets[id] = set;
    labels[id] = setLabel(set);
    if (set.some(q => accNfa.has(q))) accepting.push(id);
    return id;
  };

  const startSet = epsilonClosure(nfa, [nfa.start]);
  const startId = add(startSet);
  log.push({ kind: 'start', state: startId, seed: [nfa.start], closure: startSet, label: labels[startId] });

  const queue = [startId];
  let guard = 0;
  while (queue.length && guard++ < 4000) {
    const id = queue.shift();
    for (const c of alphabet) {
      const move = nfaMove(nfa, sets[id], c);
      const closure = epsilonClosure(nfa, move);
      if (!closure.length) {
        log.push({ kind: 'step', state: id, fromSet: sets[id], sym: c, move, closure, target: null, isNew: false, dead: true });
        continue;
      }
      const known = byKey.has(setKey(closure));
      const target = add(closure);
      if (!known) queue.push(target);
      trans.push({ from: id, sym: c, to: target });
      log.push({ kind: 'step', state: id, fromSet: sets[id], sym: c, move, closure, target, isNew: !known, dead: false });
    }
  }

  const dfa = { kind: 'dfa', states, start: startId, accepting, trans, alphabet, labels, sets };
  return { dfa, log };
}

/* ========================================================================
   5. Running a DFA
   ======================================================================== */

export function dfaStep(dfa, q, c) {
  const t = dfa.trans.find(t => t.from === q && t.sym === c);
  return t ? t.to : null;
}

/** delta*(q0, w) as a step list; `died` marks a transition into Ω. */
export function dfaRun(dfa, w) {
  const word = [...String(w == null ? '' : w)];
  const acc = new Set(dfa.accepting);
  const steps = [{ i: 0, sym: null, state: dfa.start, from: null }];
  let cur = dfa.start, died = false;
  for (let k = 0; k < word.length; k++) {
    const next = cur == null ? null : dfaStep(dfa, cur, word[k]);
    steps.push({ i: k + 1, sym: word[k], from: cur, state: next });
    if (next == null) { died = true; cur = null; break; }
    cur = next;
  }
  return { word, steps, died, state: cur, accepted: cur != null && acc.has(cur) && steps.length === word.length + 1 };
}

export function dfaAccepts(dfa, w) { return dfaRun(dfa, w).accepted; }

/** States reachable from the start state. */
export function reachable(a) {
  const out = outMap(a);
  const seen = new Set([a.start]), stack = [a.start];
  while (stack.length) {
    const q = stack.pop();
    for (const t of out.get(q) || []) if (!seen.has(t.to)) { seen.add(t.to); stack.push(t.to); }
  }
  return seen;
}

/** L(F) = {} ? — pure reachability, exactly as in the notes. */
export function isEmpty(dfa) {
  const r = reachable(dfa);
  return !dfa.accepting.some(q => r.has(q));
}

/** Add the dead state Ω wherever δ is undefined, so δ becomes total. */
export function complete(dfa, alphabet = dfa.alphabet) {
  const alpha = [...new Set([...(alphabet || []), ...(dfa.alphabet || [])])].sort();
  const trans = dfa.trans.map(t => ({ ...t }));
  const states = [...dfa.states];
  const labels = { ...(dfa.labels || {}) };
  let needSink = false;
  for (const q of dfa.states) {
    for (const c of alpha) {
      if (!trans.some(t => t.from === q && t.sym === c)) {
        needSink = true;
        trans.push({ from: q, sym: c, to: OMEGA });
      }
    }
  }
  if (needSink) {
    states.push(OMEGA);
    labels[OMEGA] = OMEGA;
    for (const c of alpha) trans.push({ from: OMEGA, sym: c, to: OMEGA });
  }
  return { ...dfa, states, trans, alphabet: alpha, labels, sink: needSink ? OMEGA : null };
}

/* ========================================================================
   6. Minimisation — partition refinement
   ======================================================================== */

/**
 * Min(F) by refining the partition {Q\A, A} until no block is split.
 * `log` records the setup, every split (with the distinguishing symbol and the
 * resulting blocks) and the final quotient.
 */
export function minimize(dfa0) {
  const log = [];
  // (a) drop unreachable states — they can never matter.
  const r = reachable(dfa0);
  const dropped = dfa0.states.filter(q => !r.has(q));
  let dfa = dropped.length
    ? { ...dfa0, states: dfa0.states.filter(q => r.has(q)),
        trans: dfa0.trans.filter(t => r.has(t.from) && r.has(t.to)),
        accepting: dfa0.accepting.filter(q => r.has(q)) }
    : dfa0;
  if (dropped.length) log.push({ kind: 'unreachable', states: dropped });

  // (b) make delta total, otherwise "same behaviour" is not well defined.
  const before = dfa.states.length;
  dfa = complete(dfa);
  if (dfa.states.length !== before) log.push({ kind: 'complete', sink: OMEGA });

  const acc = new Set(dfa.accepting);
  const alphabet = dfa.alphabet;
  let blocks = [dfa.states.filter(q => !acc.has(q)), dfa.states.filter(q => acc.has(q))].filter(b => b.length);
  log.push({ kind: 'init', blocks: blocks.map(b => [...b]),
    note: 'accepting and non-accepting states are separable by ε (the empty string already tells them apart)' });

  const indexOf = () => {
    const m = new Map();
    blocks.forEach((b, i) => b.forEach(q => m.set(q, i)));
    return m;
  };

  let round = 0, changed = true;
  while (changed && round < 200) {
    changed = false; round++;
    const idx = indexOf();
    outer:
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (block.length < 2) continue;
      for (const c of alphabet) {
        const groups = new Map();
        for (const q of block) {
          const t = dfaStep(dfa, q, c);
          const key = t == null ? 'Ω' : String(idx.get(t));
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(q);
        }
        if (groups.size > 1) {
          const parts = [...groups.entries()].map(([key, members]) => ({
            members,
            targetBlock: key === 'Ω' ? null : Number(key),
            targets: members.map(q => dfaStep(dfa, q, c)),
          }));
          log.push({ kind: 'split', round, block: [...block], blockIndex: bi, sym: c, parts });
          blocks.splice(bi, 1, ...parts.map(p => p.members));
          changed = true;
          break outer;
        }
      }
    }
  }
  log.push({ kind: 'stable', round, blocks: blocks.map(b => [...b]) });

  // (c) build the quotient automaton.
  const idx = indexOf();
  const srcLabel = q => (dfa.labels && dfa.labels[q]) || q;
  const ids = blocks.map((_, i) => 'M' + i);
  const labels = {}, classes = {}, classLabels = {};
  blocks.forEach((b, i) => {
    const full = b.map(srcLabel).join(',');
    classLabels[ids[i]] = '[' + full + ']';
    labels[ids[i]] = full.length <= 12 ? full : ids[i];   // keep the drawing readable
    classes[ids[i]] = [...b];
  });
  const mTrans = [];
  blocks.forEach((b, i) => {
    for (const c of alphabet) {
      const t = dfaStep(dfa, b[0], c);
      if (t == null) continue;
      mTrans.push({ from: ids[i], sym: c, to: ids[idx.get(t)] });
    }
  });
  let mStates = [...ids];
  let mAcc = blocks.map((b, i) => (b.some(q => acc.has(q)) ? ids[i] : null)).filter(Boolean);

  // (d) hide a trap block (non-accepting, every transition loops) — the notes
  //     do not draw transitions into Ω either.
  const trap = mStates.find(id =>
    !mAcc.includes(id) && alphabet.every(c => mTrans.some(t => t.from === id && t.sym === c && t.to === id)));
  let result = { kind: 'dfa', states: mStates, start: ids[idx.get(dfa.start)], accepting: mAcc,
    trans: mTrans, alphabet, labels, classes, classLabels };
  if (trap && mStates.length > 1 && trap !== result.start) {
    result = { ...result,
      states: mStates.filter(q => q !== trap),
      trans: mTrans.filter(t => t.from !== trap && t.to !== trap) };
    delete result.labels[trap];
    log.push({ kind: 'drop-trap', state: trap, label: labels[trap] });
  }
  return { dfa: result, log };
}

/* ========================================================================
   7. Products, emptiness, equivalence
   ======================================================================== */

const OPS = {
  '∩': (a, b) => a && b, 'and': (a, b) => a && b, 'intersect': (a, b) => a && b,
  '∪': (a, b) => a || b, 'or': (a, b) => a || b, 'union': (a, b) => a || b,
  '\\': (a, b) => a && !b, 'diff': (a, b) => a && !b, 'minus': (a, b) => a && !b,
  '⊕': (a, b) => a !== b, 'xor': (a, b) => a !== b, 'sym': (a, b) => a !== b,
};

/** Run two DFAs in lockstep on Q₁×Q₂. `op` ∈ ∩ ∪ \ ⊕ (or their names). */
export function product(dfa1, dfa2, op = '∩') {
  const f = OPS[op];
  if (!f) throw new Error('unknown product operation: ' + op);
  const alpha = [...new Set([...(dfa1.alphabet || []), ...(dfa2.alphabet || [])])].sort();
  const a = complete(dfa1, alpha), b = complete(dfa2, alpha);
  const acc1 = new Set(a.accepting), acc2 = new Set(b.accepting);
  const states = [], trans = [], accepting = [], labels = {}, pairs = {};
  const byKey = new Map();
  const add = (p, q) => {
    const key = p + '|' + q;
    if (byKey.has(key)) return byKey.get(key);
    const id = 'P' + states.length;
    byKey.set(key, id); states.push(id); pairs[id] = [p, q];
    labels[id] = '(' + ((a.labels && a.labels[p]) || p) + ',' + ((b.labels && b.labels[q]) || q) + ')';
    if (f(acc1.has(p), acc2.has(q))) accepting.push(id);
    return id;
  };
  const startId = add(a.start, b.start);
  const queue = [startId];
  let guard = 0;
  while (queue.length && guard++ < 6000) {
    const id = queue.shift();
    const [p, q] = pairs[id];
    for (const c of alpha) {
      const np = dfaStep(a, p, c), nq = dfaStep(b, q, c);
      if (np == null || nq == null) continue;
      const known = byKey.has(np + '|' + nq);
      const target = add(np, nq);
      if (!known) queue.push(target);
      trans.push({ from: id, sym: c, to: target });
    }
  }
  return { kind: 'dfa', states, start: startId, accepting, trans, alphabet: alpha, labels, pairs, op };
}

/** Shortest accepted word, or null if L(F) = {}. */
export function shortestAccepted(dfa) {
  const acc = new Set(dfa.accepting);
  if (acc.has(dfa.start)) return '';
  const seen = new Set([dfa.start]);
  const queue = [[dfa.start, '']];
  const alpha = [...dfa.alphabet].sort();
  while (queue.length) {
    const [q, w] = queue.shift();
    for (const c of alpha) {
      const n = dfaStep(dfa, q, c);
      if (n == null || seen.has(n)) continue;
      const word = w + c;
      if (acc.has(n)) return word;
      seen.add(n); queue.push([n, word]);
    }
  }
  return null;
}

/** All accepted words up to `maxLen`, shortest first, capped at `limit`. */
export function acceptedWords(dfa, maxLen = 6, limit = 20) {
  const acc = new Set(dfa.accepting);
  const out = [];
  const alpha = [...dfa.alphabet].sort();
  let level = [[dfa.start, '']];
  if (acc.has(dfa.start)) out.push('');
  for (let d = 0; d < maxLen && out.length < limit; d++) {
    const next = [];
    for (const [q, w] of level) {
      for (const c of alpha) {
        const n = dfaStep(dfa, q, c);
        if (n == null) continue;
        next.push([n, w + c]);
        if (acc.has(n) && out.length < limit) out.push(w + c);
      }
    }
    level = next.slice(0, 4000);
  }
  return out;
}

/** A mixed bag of words for drills: some accepted, some near-misses. */
export function randomWords(dfa, n = 8, maxLen = 5) {
  const alpha = (dfa.alphabet && dfa.alphabet.length) ? dfa.alphabet : ['a', 'b'];
  const words = new Set(acceptedWords(dfa, maxLen, Math.ceil(n / 2)));
  let guard = 0;
  while (words.size < n && guard++ < 400) {
    const len = Math.floor(Math.random() * (maxLen + 1));
    let w = '';
    for (let i = 0; i < len; i++) w += alpha[Math.floor(Math.random() * alpha.length)];
    words.add(w);
  }
  return [...words].slice(0, n);
}

/** DFA equality: true, or the shortest word in the symmetric difference. */
export function dfaDistinguish(d1, d2) {
  const p = product(d1, d2, '⊕');
  return shortestAccepted(p);
}

/** Regex (source, AST or DFA) → minimal DFA. */
export function toDfa(r) {
  if (r && r.kind === 'dfa') return r;
  const ast = typeof r === 'string' ? parseRegex(r) : (r && r.type ? r : null);
  if (!ast) throw new Error('cannot turn that into a DFA');
  const nfa = thompson(ast);
  return minimize(subsetConstruction(nfa).dfa).dfa;
}

/**
 * L(r₁) = L(r₂)? Returns `true`, or `{witness, inL1, inL2}` with the *shortest*
 * distinguishing string — the part that actually teaches something.
 */
export function equivalent(r1, r2) {
  const d1 = toDfa(r1), d2 = toDfa(r2);
  const w = dfaDistinguish(d1, d2);
  if (w == null) return true;
  return { witness: w, inL1: dfaAccepts(d1, w), inL2: dfaAccepts(d2, w), dfa1: d1, dfa2: d2 };
}

/* ========================================================================
   8. A forgiving text format for automata
       > q0            start state
       * q3            accepting state
       q0 -a,b-> q1    transition(s);  ε / eps / _ mean an ε-transition
   ======================================================================== */

export function parseAutomatonText(text) {
  const errors = [], warnings = [];
  const states = [], trans = [];
  const accepting = new Set();
  const alphabet = new Set();
  let start = null;
  const see = q => { if (q && !states.includes(q)) states.push(q); return q; };

  const strip = tok => {
    let q = tok.trim();
    let isStart = false, isAcc = false;
    while (q && (q[0] === '>' || q[0] === '*')) { if (q[0] === '>') isStart = true; else isAcc = true; q = q.slice(1).trim(); }
    return { q, isStart, isAcc };
  };

  const lines = String(text == null ? '' : text).split(/\r?\n/);
  lines.forEach((raw, n) => {
    const line = raw.replace(/(^|\s)(#|\/\/).*$/, '').trim();
    if (!line) return;
    const m = line.match(/^(.*?)\s*-+\s*([^->]*?)\s*-+>\s*(.*)$/);
    if (m) {
      const a = strip(m[1]), b = strip(m[3]);
      if (!a.q || !b.q) { errors.push({ line: n + 1, message: 'a transition needs a state on both sides of the arrow' }); return; }
      see(a.q); see(b.q);
      if (a.isStart) start = start || a.q;
      if (b.isStart) start = start || b.q;
      if (a.isAcc) accepting.add(a.q);
      if (b.isAcc) accepting.add(b.q);
      const symsRaw = m[2].trim();
      const syms = symsRaw === '' ? [EPS] : symsRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      if (!syms.length) { errors.push({ line: n + 1, message: 'no symbol on this arrow — write `-a->`, or `-ε->` for an ε-transition' }); return; }
      for (const s0 of syms) {
        const s = (s0 === 'eps' || s0 === 'epsilon' || s0 === '_' || s0 === 'λ' || s0 === EPS) ? EPS : s0;
        if (s !== EPS && [...s].length > 1) {
          errors.push({ line: n + 1, message: `“${s0}” is not a single symbol — separate several symbols with commas` });
          continue;
        }
        if (s !== EPS) alphabet.add(s);
        if (!trans.some(t => t.from === a.q && t.sym === s && t.to === b.q)) trans.push({ from: a.q, sym: s, to: b.q });
      }
      return;
    }
    const d = strip(line);
    if (d.q && /\s/.test(d.q)) {
      errors.push({ line: n + 1, message: `could not read “${raw.trim()}” — expected e.g. \`q0 -a-> q1\`, \`> q0\` or \`* q1\`` });
      return;
    }
    if (!d.isStart && !d.isAcc) {
      see(d.q);
      warnings.push({ line: n + 1, message: `“${d.q}” is only declared, with no transitions — add \`>\` or \`*\` if you meant start/accepting` });
      return;
    }
    see(d.q);
    if (d.isStart) { if (start && start !== d.q) errors.push({ line: n + 1, message: `there is already a start state (${start}) — a DFA/NFA has exactly one` }); else start = d.q; }
    if (d.isAcc) accepting.add(d.q);
  });

  if (!states.length) errors.push({ line: 0, message: 'no states at all — try `> q0 -a-> *q1`' });
  if (!start && states.length) { start = states[0]; warnings.push({ line: 0, message: `no start state marked — assuming ${start}. Prefix it with “>”.` }); }

  const alpha = [...alphabet].sort();
  const hasEps = trans.some(t => t.sym === EPS);
  const nondet = trans.some((t, i) => trans.some((u, j) => i !== j && u.from === t.from && u.sym === t.sym));
  const automaton = {
    kind: (hasEps || nondet) ? 'nfa' : 'dfa',
    states, start, accepting: [...accepting], trans, alphabet: alpha,
    labels: Object.fromEntries(states.map(q => [q, q])),
  };
  if (automaton.kind === 'nfa') automaton.accept = automaton.accepting[0] || null;
  return { automaton, errors, warnings };
}

/** Round-trip an automaton back into the editable text format. */
export function automatonToText(a) {
  const acc = new Set(a.accepting || []);
  const lines = [];
  if (a.start) lines.push('> ' + a.start);
  for (const q of a.states) if (acc.has(q)) lines.push('* ' + q);
  const nm = q => q;
  const groups = new Map();
  for (const t of a.trans) {
    const k = t.from + '\u0000' + t.to;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t.sym);
  }
  for (const [k, syms] of groups) {
    const [from, to] = k.split('\u0000');
    lines.push(`${nm(from)} -${[...new Set(syms)].join(',')}-> ${nm(to)}`);
  }
  for (const q of a.states) if (!a.trans.some(t => t.from === q || t.to === q)) lines.push(nm(q));
  return lines.join('\n');
}

/** Is this automaton deterministic and total over its own alphabet? */
export function classify(a) {
  const eps = a.trans.some(t => t.sym === EPS);
  let branching = false, total = true;
  for (const q of a.states) for (const c of a.alphabet) {
    const n = a.trans.filter(t => t.from === q && t.sym === c).length;
    if (n > 1) branching = true;
    if (n === 0) total = false;
  }
  return { eps, branching, deterministic: !eps && !branching, total };
}

/* ========================================================================
   9. Layout + SVG rendering
   ======================================================================== */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** BFS layers from the start state; unreachable states get their own column. */
export function layout(a, opt = {}) {
  const dx = opt.dx || 120, dy = opt.dy || 78;
  const out = outMap(a);
  const layer = new Map([[a.start, 0]]);
  const order = [a.start];
  const queue = [a.start];
  while (queue.length) {
    const q = queue.shift();
    for (const t of out.get(q) || []) {
      if (!layer.has(t.to)) { layer.set(t.to, layer.get(q) + 1); order.push(t.to); queue.push(t.to); }
    }
  }
  let maxLayer = 0;
  layer.forEach(v => { if (v > maxLayer) maxLayer = v; });
  for (const q of a.states) if (!layer.has(q)) { layer.set(q, maxLayer + 1); order.push(q); }

  const cols = new Map();
  for (const q of order) {
    const l = layer.get(q);
    if (!cols.has(l)) cols.set(l, []);
    cols.get(l).push(q);
  }
  const label = q => String((a.labels && a.labels[q]) != null ? a.labels[q] : q);
  const rx = q => Math.max(20, 9 + 4.3 * label(q).length);
  const colWidth = [];
  [...cols.keys()].sort((x, y) => x - y).forEach(l => {
    colWidth[l] = Math.max(...cols.get(l).map(q => 2 * rx(q)));
  });
  const nCols = colWidth.length;
  const pad = opt.pad || 34;
  const xs = []; let x = pad + 26;
  for (let l = 0; l < nCols; l++) { xs[l] = x + (colWidth[l] || 40) / 2; x += (colWidth[l] || 40) + dx * 0.45 + 40; }

  const tallest = Math.max(1, ...[...cols.values()].map(c => c.length));
  const height = pad * 2 + (tallest - 1) * dy + 76;
  const nodes = {};
  for (const [l, qs] of cols) {
    qs.forEach((q, k) => {
      const yMid = height / 2;
      nodes[q] = {
        id: q, label: label(q), layer: l,
        x: xs[l], y: yMid + (k - (qs.length - 1) / 2) * dy,
        rx: rx(q), ry: 21,
      };
    });
  }
  return { nodes, width: Math.max(160, x - dx * 0.45), height, layers: cols };
}

function boundaryPoint(node, towardX, towardY) {
  const dx = towardX - node.x, dy = towardY - node.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const t = 1 / Math.sqrt((ux / node.rx) ** 2 + (uy / node.ry) ** 2);
  return [node.x + ux * t, node.y + uy * t, ux, uy];
}

function arrowHead(x, y, ux, uy, color) {
  const size = 7;
  const bx = x - ux * size, by = y - uy * size;
  const px = -uy * size * 0.45, py = ux * size * 0.45;
  return `<polygon points="${x.toFixed(1)},${y.toFixed(1)} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}" fill="${color}"/>`;
}

/**
 * Render an automaton as an SVG string. Colours come from CSS custom
 * properties so both themes work.
 * opts: {highlight:[ids], dim:[ids], highlightEdge:{from,to,sym}|[..],
 *        title, dx, dy, compact}
 */
export function renderAutomaton(a, opts = {}) {
  if (!a || !a.states || !a.states.length) {
    return `<svg class="aut" viewBox="0 0 200 60" width="200" height="60"><text x="100" y="34" text-anchor="middle" fill="var(--text-faint)" font-size="12">(no states)</text></svg>`;
  }
  const L = layout(a, opts);
  const hi = new Set([].concat(opts.highlight || []));
  const dim = new Set([].concat(opts.dim || []));
  const hiEdges = [].concat(opts.highlightEdge || []).filter(Boolean);
  const acc = new Set(a.accepting || (a.accept ? [a.accept] : []));
  const edgeMatch = (from, to, syms) => hiEdges.some(e =>
    e.from === from && e.to === to && (e.sym == null || syms.includes(e.sym)));

  const C = {
    node: 'var(--border-strong)', nodeFill: 'var(--bg-raised)', text: 'var(--text)',
    hi: 'var(--accent)', hiFill: 'var(--accent-soft)', dim: 'var(--text-faint)',
    edge: 'var(--border-strong)', edgeText: 'var(--text-dim)', good: 'var(--good)',
  };

  const groups = new Map();
  for (const t of a.trans) {
    const k = t.from + '\u0000' + t.to;
    if (!groups.has(k)) groups.set(k, []);
    if (!groups.get(k).includes(t.sym)) groups.get(k).push(t.sym);
  }

  const edgeSvg = [], labelSvg = [];
  for (const [key, syms] of groups) {
    const [from, to] = key.split('\u0000');
    const A = L.nodes[from], B = L.nodes[to];
    if (!A || !B) continue;
    const on = edgeMatch(from, to, syms);
    const faded = dim.has(from) || dim.has(to);
    const color = on ? C.hi : faded ? C.dim : C.edge;
    const tcolor = on ? C.hi : faded ? C.dim : C.edgeText;
    const w = on ? 2.1 : 1.3;
    const text = syms.map(s => (s === EPS ? 'ε' : s)).join(',');

    if (from === to) {                                   // self loop, arc above
      const x = A.x, y = A.y - A.ry;
      const d = `M ${(x - 9).toFixed(1)} ${y.toFixed(1)} C ${(x - 30).toFixed(1)} ${(y - 44).toFixed(1)}, ${(x + 30).toFixed(1)} ${(y - 44).toFixed(1)}, ${(x + 9).toFixed(1)} ${y.toFixed(1)}`;
      edgeSvg.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`);
      edgeSvg.push(arrowHead(x + 9, y, 0.55, 0.83, color));
      labelSvg.push(`<text x="${x}" y="${(y - 36).toFixed(1)}" text-anchor="middle" font-size="11.5" fill="${tcolor}" font-family="var(--mono)">${esc(text)}</text>`);
      continue;
    }
    const back = B.x < A.x || (B.x === A.x && B.y < A.y);
    const both = groups.has(to + '\u0000' + from);
    let bend = back ? 46 : (both ? 30 : 16);
    if (Math.abs(A.y - B.y) > 4 && !back && !both) bend = 10;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const vx = B.x - A.x, vy = B.y - A.y;
    const len = Math.hypot(vx, vy) || 1;
    const sign = back ? 1 : -1;
    const cx = mx + (-vy / len) * bend * sign, cy = my + (vx / len) * bend * sign;
    const [sx, sy] = boundaryPoint(A, cx, cy);
    const [ex, ey, ux, uy] = boundaryPoint(B, cx, cy);
    const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    edgeSvg.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`);
    edgeSvg.push(arrowHead(ex, ey, -ux, -uy, color));
    const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex, ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
    labelSvg.push(`<text x="${lx.toFixed(1)}" y="${(ly - 4).toFixed(1)}" text-anchor="middle" font-size="11.5" fill="${tcolor}" font-family="var(--mono)" class="aut-edge-label">${esc(text)}</text>`);
  }

  const nodeSvg = [];
  for (const q of a.states) {
    const n = L.nodes[q];
    if (!n) continue;
    const on = hi.has(q), faded = dim.has(q);
    const stroke = on ? C.hi : faded ? 'var(--border)' : C.node;
    const fill = on ? C.hiFill : C.nodeFill;
    const tcol = on ? C.hi : faded ? C.dim : C.text;
    const fs = n.label.length > 9 ? 10 : n.label.length > 6 ? 11 : 12.5;
    const inner = acc.has(q)
      ? `<ellipse cx="${n.x}" cy="${n.y.toFixed(1)}" rx="${n.rx - 4.5}" ry="${n.ry - 4.5}" fill="none" stroke="${stroke}" stroke-width="${on ? 2 : 1.4}"/>` : '';
    nodeSvg.push(
      `<g class="aut-node${on ? ' on' : ''}" data-state="${esc(q)}">` +
      `<ellipse cx="${n.x}" cy="${n.y.toFixed(1)}" rx="${n.rx}" ry="${n.ry}" fill="${fill}" stroke="${stroke}" stroke-width="${on ? 2.2 : 1.4}"/>` +
      inner +
      `<text x="${n.x}" y="${(n.y + fs * 0.36).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${tcol}" font-family="var(--mono)">${esc(n.label)}</text></g>`);
  }

  const s = L.nodes[a.start];
  let startArrow = '';
  if (s) {
    const x0 = s.x - s.rx - 24, y0 = s.y;
    startArrow = `<path d="M ${x0} ${y0} L ${(s.x - s.rx - 3).toFixed(1)} ${y0}" stroke="${hi.has(a.start) ? C.hi : C.edge}" stroke-width="1.5" fill="none"/>` +
      arrowHead(s.x - s.rx - 3, y0, 1, 0, hi.has(a.start) ? C.hi : C.edge);
  }

  const W = Math.ceil(L.width), H = Math.ceil(L.height);
  const title = opts.title ? `<text x="12" y="18" font-size="11" fill="var(--text-faint)">${esc(opts.title)}</text>` : '';
  return `<svg class="aut" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;overflow:visible">${title}${edgeSvg.join('')}${startArrow}${labelSvg.join('')}${nodeSvg.join('')}</svg>`;
}

/* ========================================================================
   10. Small conveniences used by the labs
   ======================================================================== */

/** Full pipeline for a regex source: {ast, nfa, dfa, subsetLog, min, minLog}. */
export function pipeline(src) {
  const ast = parseRegex(src);
  const nfa = thompson(ast);
  const { dfa, log: subsetLog } = subsetConstruction(nfa);
  const { dfa: min, log: minLog } = minimize(dfa);
  return { ast, nfa, dfa, subsetLog, min, minLog };
}

/** Human-readable δ table of a DFA: rows [state, {sym: target}]. */
export function transitionTable(a) {
  const rows = a.states.map(q => {
    const row = {};
    for (const c of a.alphabet) {
      const ts = a.trans.filter(t => t.from === q && t.sym === c).map(t => t.to);
      row[c] = ts;
    }
    const eps = a.trans.filter(t => t.from === q && t.sym === EPS).map(t => t.to);
    if (eps.length) row[EPS] = eps;
    return { state: q, label: (a.labels && a.labels[q]) || q, row };
  });
  const cols = [...a.alphabet];
  if (a.trans.some(t => t.sym === EPS)) cols.push(EPS);
  return { cols, rows };
}
