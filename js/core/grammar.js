/* =====================================================================
   grammar.js — context-free grammar engine
   Pure, dependency-free. No DOM access except that renderTree() returns
   an SVG *string* (the caller decides where to put it).

   Notation follows Stroetmann's lecture notes exactly:
     · the empty word is  λ   (First(λ) = {} — First sets never contain λ;
       λ-generating variables are tracked by the separate predicate
       nullable(), see lr-parser.tex §"The Functions First and Follow")
     · a marked rule / item is written  a -> β • γ
     · the augmented grammar adds  ŝ -> s $   with an explicit Eof token $
     · Earley objects are written  ⟨a -> β • γ, k⟩  and live in sets Q_0..Q_n
   ===================================================================== */

export const EPS  = 'λ';          // the empty word, as in the lecture
export const EOF  = '$';          // Eof token of the augmented grammar
export const AUG  = 'ŝ';          // the new start symbol of the augmented grammar
export const DOT  = '•';

/* ---------------------------------------------------------------- utils */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const uniq = a => [...new Set(a)];
const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

/* =====================================================================
   1. PARSING THE GRAMMAR TEXT
   ---------------------------------------------------------------------
   Accepted syntax (forgiving on purpose):

       expr -> expr '+' prod | prod        # arrow may be ->  →  ::=  :
       prod : prod '*' fact
            | fact                         # continuation lines start with |
            ;                              # a trailing ; is ignored
       fact -> '(' expr ')' | NUMBER
       a    -> ε                           # ε | eps | epsilon | λ | lambda
       b    ->                             # …or just an empty right-hand side

   Symbol classification: a symbol is a VARIABLE iff it occurs on the
   left-hand side of some rule; everything else is a TERMINAL.  That rule
   works for both of the lecture's conventions at once — Stroetmann writes
   variables in lowercase italics (expr, prod, fact) and token names in
   uppercase small-caps (NUMBER) — and quoted symbols are always terminals.
   ===================================================================== */

const ARROW = /^(->|→|::=|:=|:)/;
const EMPTY_WORDS = new Set(['ε', 'eps', 'epsilon', 'λ', 'lambda', 'EPS', 'Epsilon']);

/** Split one right-hand side line into raw tokens, keeping quoting info. */
function lexRhs(src, line, errors) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#' || (c === '/' && src[i + 1] === '/')) break;      // comment
    if (c === ';') { i++; continue; }
    if (c === "'" || c === '"') {
      const j = src.indexOf(c, i + 1);
      if (j < 0) {
        errors.push({ line, msg: `unterminated ${c === "'" ? 'single' : 'double'} quote — every quoted terminal needs a closing ${c}` });
        out.push({ text: src.slice(i + 1), quoted: true });
        break;
      }
      const text = src.slice(i + 1, j);
      if (text === '') errors.push({ line, msg: 'empty quotes `\'\'` — write ε (or leave the right-hand side blank) for the empty word' });
      else out.push({ text, quoted: true });
      i = j + 1;
      continue;
    }
    const m = /^[^\s'"|;#]+/.exec(src.slice(i));
    out.push({ text: m[0], quoted: false });
    i += m[0].length;
  }
  return out;
}

/**
 * parseGrammar(text) -> grammar object (never throws).
 * grammar.errors is non-empty when the text could not be fully understood.
 */
export function parseGrammar(text) {
  const errors = [], warnings = [];
  const raw = [];                              // {lhs, alts:[[tok]], line}
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  let current = null;

  lines.forEach((lineTextRaw, k) => {
    const ln = k + 1;
    const lineText = lineTextRaw.replace(/(^|\s)(#|\/\/).*$/, '');
    if (!lineText.trim()) return;
    let body = lineText.trim();

    if (body.startsWith('|')) {                         // continuation
      if (!current) { errors.push({ line: ln, msg: 'this line starts with `|` but no rule has been opened yet' }); return; }
      body.slice(1).split('|').forEach(alt => current.alts.push({ toks: lexRhs(alt, ln, errors), line: ln }));
      return;
    }

    const arrowAt = findArrow(body);
    if (arrowAt < 0) {
      if (/^[;]+$/.test(body)) return;
      errors.push({ line: ln, msg: `no arrow on this line — a rule looks like \`a -> α\` (\`->\`, \`→\`, \`::=\` or \`:\` all work)` });
      return;
    }
    const lhsSrc = body.slice(0, arrowAt).trim();
    const rhsSrc = body.slice(arrowAt).replace(ARROW, '');
    if (!lhsSrc) { errors.push({ line: ln, msg: 'the left-hand side is missing — a rule needs a variable before the arrow' }); return; }
    if (/\s/.test(lhsSrc) || /['"]/.test(lhsSrc)) {
      errors.push({ line: ln, msg: `\`${lhsSrc}\` is not a legal left-hand side — exactly one unquoted variable may stand left of the arrow (that is what "context-free" means)` });
      return;
    }
    current = { lhs: lhsSrc, alts: [], line: ln };
    raw.push(current);
    rhsSrc.split('|').forEach(alt => current.alts.push({ toks: lexRhs(alt, ln, errors), line: ln }));
  });

  /* --- classify symbols ------------------------------------------- */
  const vars = [];
  for (const r of raw) if (!vars.includes(r.lhs)) vars.push(r.lhs);
  const varSet = new Set(vars);

  const rules = [];
  const terms = [];
  for (const r of raw) {
    for (const alt of r.alts) {
      let rhs = [];
      let sawEmptyWord = false;
      for (const t of alt.toks) {
        if (!t.quoted && EMPTY_WORDS.has(t.text)) { sawEmptyWord = true; continue; }
        const sym = t.quoted ? t.text : t.text;
        if (t.quoted) { if (!terms.includes(sym) && !varSet.has(sym)) terms.push(sym); }
        rhs.push({ sym, quoted: t.quoted });
      }
      if (sawEmptyWord && rhs.length) {
        warnings.push({ line: alt.line, msg: `rule \`${r.lhs} -> …\` mixes ε with other symbols — ε was dropped, since ε·α = α` });
      }
      rules.push({ idx: rules.length, lhs: r.lhs, rhs: rhs.map(x => x.sym), line: alt.line, _q: rhs.map(x => x.quoted) });
    }
  }
  for (const rule of rules) {
    for (let i = 0; i < rule.rhs.length; i++) {
      const s = rule.rhs[i];
      if (!varSet.has(s) && !terms.includes(s)) terms.push(s);
    }
  }

  if (!rules.length && !errors.length) errors.push({ line: 1, msg: 'the grammar is empty — write at least one rule, e.g. `S -> \'a\' S \'b\' | ε`' });

  const start = vars[0] || null;
  const g = makeGrammar(rules, vars, terms, start);
  g.errors = errors;
  g.warnings = warnings;
  g.source = String(text == null ? '' : text);

  /* --- semantic warnings (never fatal) ----------------------------- */
  if (start) {
    const reach = reachable(g);
    for (const v of g.vars) if (!reach.has(v)) g.warnings.push({ line: lineOf(g, v), msg: `the variable \`${v}\` cannot be reached from the start symbol \`${start}\` — it contributes nothing to L(G)` });
    const prod = productive(g);
    for (const v of g.vars) if (!prod.has(v)) g.warnings.push({ line: lineOf(g, v), msg: `\`${v}\` is not productive — no string of terminals can be derived from it, so every rule using \`${v}\` is dead` });
  }
  return g;
}

function findArrow(body) {
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "'" || body[i] === '"') { const j = body.indexOf(body[i], i + 1); if (j < 0) return -1; i = j; continue; }
    if (ARROW.test(body.slice(i))) return i;
  }
  return -1;
}
const lineOf = (g, v) => (g.rules.find(r => r.lhs === v) || {}).line || 1;

/** Build a grammar object from parts (also used for the augmented grammar). */
export function makeGrammar(rules, vars, terms, start) {
  const varSet = new Set(vars), termSet = new Set(terms);
  const byLhs = new Map();
  rules.forEach(r => { if (!byLhs.has(r.lhs)) byLhs.set(r.lhs, []); byLhs.get(r.lhs).push(r); });
  return {
    rules, vars, terms, start, varSet, termSet,
    errors: [], warnings: [], source: '',
    isVar: s => varSet.has(s),
    isTerm: s => termSet.has(s),
    rulesFor: v => byLhs.get(v) || [],
    ok() { return this.errors.length === 0 && this.rules.length > 0; },
  };
}

function reachable(g) {
  const seen = new Set([g.start]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of g.rules) if (seen.has(r.lhs))
      for (const s of r.rhs) if (g.isVar(s) && !seen.has(s)) { seen.add(s); changed = true; }
  }
  return seen;
}
function productive(g) {
  const seen = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of g.rules)
      if (!seen.has(r.lhs) && r.rhs.every(s => !g.isVar(s) || seen.has(s))) { seen.add(r.lhs); changed = true; }
  }
  return seen;
}

/* --- pretty printing ------------------------------------------------ */
export function ruleText(g, r) {
  return `${r.lhs} -> ${rhsText(g, r.rhs)}`;
}
export function rhsText(g, rhs) {
  if (!rhs.length) return EPS;
  return rhs.map(s => symText(g, s)).join(' ');
}
export function symText(g, s) {
  if (s === EOF || s === EPS) return s;
  return g.isVar(s) ? s : (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : `'${s}'`);
}
export function itemText(g, item) {
  const r = g.rules[item.rule];
  const l = r.rhs.slice(0, item.dot), rr = r.rhs.slice(item.dot);
  const body = [l.length ? rhsText(g, l) : '', DOT, rr.length ? rhsText(g, rr) : ''].filter(Boolean).join(' ');
  return `${r.lhs} -> ${body}`;
}

/* =====================================================================
   2. TOKENISING AN INPUT WORD AGAINST THE GRAMMAR'S TERMINALS
   ===================================================================== */
/** tokenize('1+2*3', g) -> {tokens, error}.  Longest-match over the
    terminal alphabet; whitespace separates but is never a token. */
export function tokenize(word, g) {
  const src = String(word == null ? '' : word);
  const terms = [...g.terms].sort((a, b) => b.length - a.length);
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { i++; continue; }
    const hit = terms.find(t => t.length && src.startsWith(t, i));
    if (hit) { tokens.push(hit); i += hit.length; continue; }
    const m = /^[A-Za-z0-9_]+/.exec(src.slice(i));
    const bad = m ? m[0] : src[i];
    return { tokens, error: `\`${bad}\` (at position ${i + 1}) is not a terminal of this grammar. Its terminals are: ${terms.map(t => `'${t}'`).join(' ') || '(none)'}` };
  }
  return { tokens, error: null };
}

/* =====================================================================
   3. nullable / First / Follow — fixed points that record every round
   ---------------------------------------------------------------------
   Each function returns { …result, log } where log is an array of rounds:
     { round, added: [{v, item, why}], stable }
   so the UI can replay the computation one iteration at a time and can
   diagnose a learner's wrong entry against the exact rule that produced it.
   ===================================================================== */

export function nullable(g) {
  const set = new Set();
  const log = [];
  let round = 0, changed = true;
  while (changed) {
    changed = false; round++;
    const added = [];
    for (const r of g.rules) {
      if (set.has(r.lhs)) continue;
      if (r.rhs.every(s => g.isVar(s) && set.has(s))) {
        set.add(r.lhs); changed = true;
        added.push({
          v: r.lhs, item: r.lhs, rule: r.idx,
          why: r.rhs.length
            ? `every variable on the right of \`${ruleText(g, r)}\` is already λ-generating`
            : `the rule \`${r.lhs} -> ${EPS}\` derives the empty word directly`,
        });
      }
    }
    log.push({ round, added, stable: !changed });
  }
  return { set, log, isNullable: s => g.isVar(s) && set.has(s) };
}

/** First(α) for a string α, given the current First map (lecture def.:
    First(λ) = {}, First(tβ) = {t}, First(aβ) = First(a) ∪ First(β) if
    nullable(a) else First(a)). */
export function firstOfString(g, alpha, firstMap, nul) {
  const out = new Set();
  for (const s of alpha) {
    if (g.isVar(s)) {
      (firstMap[s] || new Set()).forEach(t => out.add(t));
      if (!nul.has(s)) return out;
    } else { out.add(s); return out; }
  }
  return out;
}

export function first(g, nul = nullable(g).set) {
  const map = Object.fromEntries(g.vars.map(v => [v, new Set()]));
  const log = [];
  let round = 0, changed = true;
  while (changed) {
    changed = false; round++;
    const added = [];
    for (const r of g.rules) {
      /* First(a) = ⋃ First(α_i) over all rules a -> α_i */
      let i = 0;
      for (; i < r.rhs.length; i++) {
        const s = r.rhs[i];
        const contrib = g.isVar(s) ? map[s] : new Set([s]);
        for (const t of contrib) if (!map[r.lhs].has(t)) {
          map[r.lhs].add(t); changed = true;
          added.push({
            v: r.lhs, item: t, rule: r.idx,
            why: g.isVar(s)
              ? `\`${t}\` ∈ First(${s}) and \`${s}\` stands at position ${i + 1} of \`${ruleText(g, r)}\`${i ? ` (everything before it is λ-generating)` : ''}`
              : `the rule \`${ruleText(g, r)}\` starts${i ? ' — after λ-generating variables —' : ''} with the terminal \`${t}\``,
          });
        }
        if (!(g.isVar(s) && nul.has(s))) break;
      }
    }
    log.push({ round, added, stable: !changed });
  }
  return { map, log, of: v => map[v] || new Set() };
}

export function follow(g, nul = nullable(g).set, firstMap = first(g, nul).map) {
  const map = Object.fromEntries(g.vars.map(v => [v, new Set()]));
  const log = [];
  const seed = [];
  if (g.start) {
    map[g.start].add(EOF);
    seed.push({ v: g.start, item: EOF, why: `\`${g.start}\` is the start symbol, so Eof \`$\` may follow it (the augmented rule is \`${AUG} -> ${g.start} $\`)` });
  }
  log.push({ round: 0, added: seed, stable: false, seedRound: true });

  let round = 0, changed = true;
  while (changed) {
    changed = false; round++;
    const added = [];
    const put = (v, t, why, rule) => {
      if (!g.isVar(v) || map[v].has(t)) return;
      map[v].add(t); changed = true; added.push({ v, item: t, why, rule });
    };
    for (const r of g.rules) {
      for (let i = 0; i < r.rhs.length; i++) {
        const Y = r.rhs[i];
        if (!g.isVar(Y)) continue;
        const rest = r.rhs.slice(i + 1);
        const fr = firstOfString(g, rest, firstMap, nul);
        for (const t of fr) put(Y, t,
          rest.length === 1 && !g.isVar(rest[0])
            ? `rule \`${ruleText(g, r)}\`: the terminal \`${t}\` stands directly behind \`${Y}\``
            : `rule \`${ruleText(g, r)}\`: \`${t}\` ∈ First(${rhsText(g, rest)}), the part of the right-hand side behind \`${Y}\``,
          r.idx);
        if (rest.every(s => g.isVar(s) && nul.has(s)))
          for (const t of map[r.lhs]) put(Y, t,
            rest.length
              ? `rule \`${ruleText(g, r)}\`: everything behind \`${Y}\` is λ-generating, so Follow(${r.lhs}) ⊆ Follow(${Y}); \`${t}\` ∈ Follow(${r.lhs})`
              : `rule \`${ruleText(g, r)}\`: \`${Y}\` stands at the very end, so Follow(${r.lhs}) ⊆ Follow(${Y}); \`${t}\` ∈ Follow(${r.lhs})`,
            r.idx);
      }
    }
    log.push({ round, added, stable: !changed });
  }
  return { map, log, of: v => map[v] || new Set() };
}

/** Everything a First/Follow trainer needs, in one call. */
export function analyse(g) {
  const nul = nullable(g);
  const fi = first(g, nul.set);
  const fo = follow(g, nul.set, fi.map);
  return { nullable: nul, first: fi, follow: fo };
}

/* =====================================================================
   4. DERIVATIONS AND PARSE TREES
   ---------------------------------------------------------------------
   A derivation and its parse tree are the *same object* seen twice: the
   sentential form is the frontier of the tree.  That is the point the
   Grammar Lab has to make visible, so we keep one structure for both.
   ===================================================================== */

let NODE_ID = 0;
export function makeNode(sym, isVar) {
  return { id: 'n' + (++NODE_ID), sym, isVar: !!isVar, children: null, rule: null, parent: null };
}

/** A fresh derivation sitting at the start symbol. */
export function newDerivation(g) {
  const root = makeNode(g.start, true);
  return { g, root, steps: [] };
}

/** Frontier = current sentential form, left to right. */
export function frontier(d) {
  const out = [];
  (function walk(n) { if (!n.children) out.push(n); else n.children.forEach(walk); })(d.root);
  return out;
}
export function sententialForm(d) { return frontier(d).map(n => n.sym); }
export function isComplete(d) { return frontier(d).every(n => !n.isVar); }

/** The node a leftmost / rightmost derivation must expand next. */
export function nextNode(d, mode = 'left') {
  const f = frontier(d).filter(n => n.isVar);
  if (!f.length) return null;
  return mode === 'right' ? f[f.length - 1] : f[0];
}

/** Apply `rule` to `node`. Returns {ok, msg}. Records the step. */
export function expand(d, node, rule, mode = null) {
  const g = d.g;
  if (!node || node.children) return { ok: false, msg: 'that node has already been expanded' };
  if (!node.isVar) return { ok: false, msg: `\`${node.sym}\` is a terminal — only variables can be rewritten (that is the whole content of ⇒)` };
  if (rule.lhs !== node.sym) return { ok: false, msg: `the rule \`${ruleText(g, rule)}\` rewrites \`${rule.lhs}\`, not \`${node.sym}\`` };
  if (mode) {
    const want = nextNode(d, mode);
    if (want && want !== node)
      return { ok: false, msg: `in a ${mode}most derivation the next variable to rewrite is the ${mode}most one — that is \`${want.sym}\`, not this \`${node.sym}\``, wrongPosition: true };
  }
  const before = frontier(d).indexOf(node);
  node.children = rule.rhs.length
    ? rule.rhs.map(s => { const c = makeNode(s, g.isVar(s)); c.parent = node; return c; })
    : [Object.assign(makeNode(EPS, false), { parent: node, eps: true })];
  node.rule = rule.idx;
  d.steps.push({ node, rule: rule.idx, index: before, form: sententialForm(d) });
  return { ok: true };
}

export function undo(d) {
  const st = d.steps.pop();
  if (!st) return false;
  st.node.children = null; st.node.rule = null;
  return true;
}

/** Every (node, rule) pair the learner could legally pick right now. */
export function choices(d, mode = null) {
  const nodes = mode ? [nextNode(d, mode)].filter(Boolean) : frontier(d).filter(n => n.isVar);
  const out = [];
  for (const n of nodes) for (const r of d.g.rulesFor(n.sym)) out.push({ node: n, rule: r });
  return out;
}

/** Replay a list of {nodeIndexInFrontier, rule} steps onto a fresh derivation. */
export function derive(g, steps) {
  const d = newDerivation(g);
  for (const s of steps) {
    const f = frontier(d);
    const node = typeof s.index === 'number' ? f[s.index] : nextNode(d, s.mode || 'left');
    const rule = g.rules[typeof s.rule === 'number' ? s.rule : s.rule.idx];
    const res = expand(d, node, rule);
    if (!res.ok) return { d, error: res.msg };
  }
  return { d, error: null };
}

/** A random derivation, biased away from blowing up: after `maxDepth`
    levels only rules that shorten the sentential form are considered. */
export function randomDerivation(g, maxDepth = 6, rng = Math.random) {
  const d = newDerivation(g);
  const depth = new Map([[d.root.id, 0]]);
  let guard = 0;
  while (guard++ < 400) {
    const node = frontier(d).find(n => n.isVar);
    if (!node) break;
    const dep = depth.get(node.id) || 0;
    let opts = g.rulesFor(node.sym);
    if (!opts.length) break;
    if (dep >= maxDepth) {
      const light = opts.filter(r => r.rhs.every(s => !g.isVar(s)));
      const lighter = light.length ? light : opts.filter(r => !r.rhs.includes(node.sym));
      if (lighter.length) opts = lighter;
    }
    const rule = opts[Math.floor(rng() * opts.length)];
    if (!expand(d, node, rule).ok) break;
    (node.children || []).forEach(c => depth.set(c.id, dep + 1));
  }
  return d;
}

/** The terminal fringe of a tree, as a token array. */
export function yieldOf(node) {
  const out = [];
  (function walk(n) {
    if (!n.children) { if (!n.eps && !n.isVar) out.push(n.sym); return; }
    n.children.forEach(walk);
  })(node);
  return out;
}

/** The leftmost derivation that corresponds to a finished parse tree. */
export function derivationOf(tree, g, mode = 'left') {
  const steps = [];
  const d = { g, root: cloneSkeleton(tree), steps: [] };
  const map = new Map();
  pair(tree, d.root, map);
  let guard = 0;
  while (guard++ < 2000) {
    const node = nextNode(d, mode);
    if (!node) break;
    const orig = map.get(node);
    if (!orig || orig.rule == null || !g.rules[orig.rule]) break;
    if (!expand(d, node, g.rules[orig.rule]).ok) break;
    (node.children || []).forEach((c, i) => map.set(c, (orig.children || [])[i]));
    steps.push({ rule: orig.rule, form: sententialForm(d) });
  }
  return { steps, d };
}
function cloneSkeleton(t) { return makeNode(t.sym, t.isVar); }
function pair(orig, copy, map) { map.set(copy, orig); }

/* =====================================================================
   5. TREE RENDERING — a tidy layout computed here, emitted as SVG text
   ---------------------------------------------------------------------
   Layout: post-order x assignment (leaves get consecutive slots, an inner
   node sits over the centre of its children), y = depth.  No libraries.
   ===================================================================== */
export function layoutTree(root, opt = {}) {
  const gapX = opt.gapX || 54, gapY = opt.gapY || 62;
  let cursor = 0, maxDepth = 0;
  const nodes = [];
  (function walk(n, depth) {
    maxDepth = Math.max(maxDepth, depth);
    n._d = depth;
    if (!n.children || !n.children.length) { n._x = cursor; cursor += 1; }
    else {
      n.children.forEach(c => walk(c, depth + 1));
      n._x = (n.children[0]._x + n.children[n.children.length - 1]._x) / 2;
    }
    nodes.push(n);
  })(root, 0);
  /* widen slots for long labels so text never collides */
  const w = n => Math.max(gapX, 11 + String(n.sym).length * 8.4);
  const leaves = nodes.filter(n => !n.children || !n.children.length);
  let px = 0; const pos = new Map();
  for (const l of leaves) { pos.set(l, px + w(l) / 2); px += w(l) + 12; }
  (function assign(n) {
    if (!n.children || !n.children.length) { n.X = pos.get(n); return; }
    n.children.forEach(assign);
    n.X = (n.children[0].X + n.children[n.children.length - 1].X) / 2;
  })(root);
  nodes.forEach(n => { n.Y = n._d * gapY + 24; });
  return { nodes, width: Math.max(px, 120), height: (maxDepth + 1) * gapY + 20, boxW: w };
}

/**
 * renderTree(root, {highlight:Set|Array of node ids, label(n)->string})
 * -> SVG source string.  Every node carries data-node="<id>" so the UI can
 * hover-link derivation steps to tree nodes.
 */
export function renderTree(root, opt = {}) {
  if (!root) return '';
  const hi = new Set(opt.highlight ? [...opt.highlight] : []);
  const sub = opt.subtree ? new Set(collectIds(opt.subtree)) : null;
  const L = layoutTree(root, opt);
  const pad = 14;
  const parts = [];
  const edge = [];
  for (const n of L.nodes) {
    if (!n.children) continue;
    for (const c of n.children) {
      const on = sub ? (sub.has(n.id) && sub.has(c.id)) : (hi.has(n.id) && hi.has(c.id));
      edge.push(`<line x1="${(n.X + pad).toFixed(1)}" y1="${n.Y + 9}" x2="${(c.X + pad).toFixed(1)}" y2="${c.Y - 13}" class="tree-edge${on ? ' on' : ''}"/>`);
    }
  }
  for (const n of L.nodes) {
    const w = L.boxW(n), x = n.X + pad - w / 2, y = n.Y - 14;
    const cls = ['tree-node'];
    cls.push(n.isVar ? 'v' : (n.eps ? 'eps' : 't'));
    if (hi.has(n.id)) cls.push('hi');
    if (sub && sub.has(n.id)) cls.push('sub');
    const label = opt.label ? opt.label(n) : n.sym;
    parts.push(
      `<g class="${cls.join(' ')}" data-node="${esc(n.id)}">` +
      `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="26" rx="7"/>` +
      `<text x="${(n.X + pad).toFixed(1)}" y="${y + 18}" text-anchor="middle">${esc(label)}</text></g>`);
  }
  const W = L.width + pad * 2, H = L.height;
  return `<svg class="tree-svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" role="img">` +
    edge.join('') + parts.join('') + '</svg>';
}
function collectIds(n, out = []) { out.push(n.id); (n.children || []).forEach(c => collectIds(c, out)); return out; }

/** The chain of node ids from the root down to `node` (for hover highlighting). */
export function pathToRoot(node) { const out = []; for (let n = node; n; n = n.parent) out.push(n.id); return out; }

/* =====================================================================
   6. EARLEY  (earley-parser.tex)
   ---------------------------------------------------------------------
   Sets Q_0 … Q_n of Earley objects ⟨a -> β • γ, k⟩.  Every object keeps
   its provenance: which operation produced it and from which object(s),
   so the chart explorer can say *why* an item is there.
   ===================================================================== */

/** Augment with ŝ -> s  (Earley's augmentation — no $ in the rhs here,
    unlike the SLR augmentation which uses ŝ -> s $). */
export function augmentEarley(g) {
  const start = AUG;
  const rules = [{ idx: 0, lhs: start, rhs: [g.start], line: 0 }]
    .concat(g.rules.map(r => ({ ...r, idx: r.idx + 1 })));
  return makeGrammar(rules, [start, ...g.vars], g.terms, start);
}

export function earley(g0, tokens) {
  const g = augmentEarley(g0);
  const n = tokens.length;
  const sets = Array.from({ length: n + 1 }, () => []);
  const keys = Array.from({ length: n + 1 }, () => new Set());

  const add = (j, item) => {
    const k = `${item.rule}|${item.dot}|${item.origin}`;
    if (keys[j].has(k)) return false;
    keys[j].add(k);
    item.i = sets[j].length; item.set = j;
    sets[j].push(item);
    return true;
  };

  add(0, { rule: 0, dot: 0, origin: 0, reason: 'init', cause: null });

  for (let j = 0; j <= n; j++) {
    for (let p = 0; p < sets[j].length; p++) {          // grows while iterated
      const it = sets[j][p];
      const r = g.rules[it.rule];
      const next = r.rhs[it.dot];
      if (next === undefined) {
        /* ---- completion ---- */
        for (const src of sets[it.origin]) {
          const sr = g.rules[src.rule];
          if (sr.rhs[src.dot] !== r.lhs) continue;
          add(j, {
            rule: src.rule, dot: src.dot + 1, origin: src.origin,
            reason: 'complete',
            cause: { done: { set: j, i: it.i }, waiting: { set: it.origin, i: src.i }, variable: r.lhs },
          });
        }
      } else if (g.isVar(next)) {
        /* ---- prediction ---- */
        for (const pr of g.rulesFor(next))
          add(j, { rule: pr.idx, dot: 0, origin: j, reason: 'predict', cause: { by: { set: j, i: it.i }, variable: next } });
      } else if (j < n && tokens[j] === next) {
        /* ---- scan (fills Q_{j+1}) ---- */
        add(j + 1, {
          rule: it.rule, dot: it.dot + 1, origin: it.origin,
          reason: 'scan', cause: { from: { set: j, i: it.i }, token: tokens[j], at: j },
        });
      }
    }
  }
  const accepted = sets[n].some(it => it.rule === 0 && it.dot === 1 && it.origin === 0);
  return { grammar: g, base: g0, tokens, sets, accepted, n };
}

/** Human-readable provenance for one Earley object. */
export function earleyWhy(chart, j, i) {
  const g = chart.grammar, it = chart.sets[j][i];
  const item = itemText(g, it);
  switch (it.reason) {
    case 'init': return `start object: the parser must recognise the start symbol at the beginning of the input, so Q₀ = { ⟨${item}, 0⟩ }.`;
    case 'predict': return `predicted in Q${sub(j)} from ⟨${itemText(g, chart.sets[it.cause.by.set][it.cause.by.i])}, ${chart.sets[it.cause.by.set][it.cause.by.i].origin}⟩ — the • there stands in front of the variable \`${it.cause.variable}\`, so every rule for \`${it.cause.variable}\` is tried, with origin ${j}.`;
    case 'scan': return `scanned: ⟨${itemText(g, chart.sets[it.cause.from.set][it.cause.from.i])}, ${chart.sets[it.cause.from.set][it.cause.from.i].origin}⟩ in Q${sub(it.cause.from.set)} had the terminal \`${it.cause.token}\` after the •, and x${sub(it.cause.at + 1)} = \`${it.cause.token}\`, so the object moves to Q${sub(j)} with the • one step further.`;
    case 'complete': {
      const done = chart.sets[it.cause.done.set][it.cause.done.i];
      const wait = chart.sets[it.cause.waiting.set][it.cause.waiting.i];
      return `completed: ⟨${itemText(g, done)}, ${done.origin}⟩ in Q${sub(it.cause.done.set)} finished the variable \`${it.cause.variable}\` over x${sub(done.origin + 1)}…x${sub(it.cause.done.set)}. Back in Q${sub(wait.set)} the object ⟨${itemText(g, wait)}, ${wait.origin}⟩ was waiting for exactly that \`${it.cause.variable}\`, so its • moves past it.`;
    }
    default: return item;
  }
}
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
export const sub = n => String(n).split('').map(c => SUBS[+c] ?? c).join('');

/* ---- parse-tree reconstruction from the chart ---------------------- */
/**
 * earleyTrees(chart, limit) -> array of parse trees (of the ORIGINAL
 * grammar) for the whole input.  Enumeration is capped and guards against
 * cyclic derivations (a -> a), so it is a *witness generator*, not a
 * complete enumerator for cyclic grammars.
 */
export function earleyTrees(chart, limit = 2) {
  const g = chart.grammar, base = chart.base, sets = chart.sets, n = chart.n;
  const out = [];
  const done = sets[n].filter(it => it.rule === 0 && it.dot === 1 && it.origin === 0);
  if (!done.length) return out;
  for (const children of itemParses(g, chart, 0, 1, 0, n, limit, new Set())) {
    out.push(children[0]);
    if (out.length >= limit) break;
  }
  /* rule indices inside the trees refer to the *augmented* grammar
     (ŝ -> s is rule 0), so shift them back onto the original grammar. */
  out.forEach(t => rebase(t));
  return out;
}
function rebase(n) {
  if (n && n.rule != null) n.rule = n.rule - 1;
  (n && n.children || []).forEach(rebase);
}

function itemParses(g, chart, rIdx, dot, origin, end, limit, seen) {
  if (dot === 0) return origin === end ? [[]] : [];
  const key = `${rIdx}|${dot}|${origin}|${end}`;
  if (seen.has(key)) return [];                  // cycle guard (see comment above)
  seen.add(key);
  const r = g.rules[rIdx];
  const X = r.rhs[dot - 1];
  const res = [];
  if (!g.isVar(X)) {
    if (end > origin && chart.tokens[end - 1] === X)
      for (const pre of itemParses(g, chart, rIdx, dot - 1, origin, end - 1, limit, seen)) {
        res.push([...pre, mkLeaf(X)]);
        if (res.length >= limit) break;
      }
  } else {
    for (const cand of chart.sets[end]) {
      if (cand.dot !== g.rules[cand.rule].rhs.length) continue;
      if (g.rules[cand.rule].lhs !== X) continue;
      const k = cand.origin;
      if (k < origin || k > end) continue;
      const rights = varTrees(g, chart, cand, k, end, limit, seen);
      if (!rights.length) continue;
      for (const pre of itemParses(g, chart, rIdx, dot - 1, origin, k, limit, seen)) {
        for (const rt of rights) {
          res.push([...pre, rt]);
          if (res.length >= limit) break;
        }
        if (res.length >= limit) break;
      }
    }
  }
  seen.delete(key);
  return res;
}
function varTrees(g, chart, cand, k, end, limit, seen) {
  const r = g.rules[cand.rule];
  const out = [];
  for (const kids of itemParses(g, chart, cand.rule, r.rhs.length, k, end, limit, seen)) {
    const node = makeNode(r.lhs, true);
    node.rule = r.idx;
    node.children = kids.length ? kids : [Object.assign(makeNode(EPS, false), { eps: true })];
    node.children.forEach(c => { c.parent = node; });
    out.push(node);
    if (out.length >= limit) break;
  }
  return out;
}
function mkLeaf(sym) { return makeNode(sym, false); }

/** Structural equality of two parse trees (same shape, same labels). */
export function sameTree(a, b) {
  if (!a || !b) return a === b;
  if (a.sym !== b.sym) return false;
  const ac = a.children || [], bc = b.children || [];
  if (ac.length !== bc.length) return false;
  return ac.every((c, i) => sameTree(c, bc[i]));
}

/**
 * isAmbiguous(g, word) — *demonstrates* ambiguity by finding two distinct
 * parse trees for one word via the Earley chart.
 *
 * NOTE: ambiguity of a context-free grammar is undecidable in general, so
 * this can only ever be a witness finder: `{ambiguous:true}` is a proof
 * (two trees are returned), `{ambiguous:false}` says nothing about the
 * grammar as a whole — only that *this* word has at most one parse here.
 */
export function isAmbiguous(g, word) {
  const tk = typeof word === 'string' ? tokenize(word, g) : { tokens: word, error: null };
  if (tk.error) return { ambiguous: false, error: tk.error, trees: [] };
  const chart = earley(g, tk.tokens);
  if (!chart.accepted) return { ambiguous: false, inLanguage: false, trees: [], chart };
  const trees = earleyTrees(chart, 4).filter(Boolean);
  const distinct = [];
  for (const t of trees) if (!distinct.some(d => sameTree(d, t))) distinct.push(t);
  return { ambiguous: distinct.length >= 2, inLanguage: true, trees: distinct.slice(0, 2), all: distinct, chart };
}

/**
 * derivesString(g, alpha, tokens) — can the sentential form α still derive
 * the target word?  Implemented by parsing the target with the grammar
 * G extended by a fresh start rule  §  ->  α,  i.e. exactly Earley.
 * This is what tells the derivation builder that a learner's choice has
 * made the target unreachable — *after* they have tried it, never before.
 */
export function derivesString(g, alpha, tokens) {
  const S = '§';
  const rules = [{ idx: 0, lhs: S, rhs: [...alpha], line: 0 }]
    .concat(g.rules.map(r => ({ ...r, idx: r.idx + 1 })));
  const g2 = makeGrammar(rules, [S, ...g.vars], g.terms, S);
  return earley(g2, tokens).accepted;
}

/* =====================================================================
   7. LR(0) ITEMS, SLR TABLE, LR(1) AND LALR   (lr-parser.tex)
   ===================================================================== */

/** Augment for LR:  ŝ -> s $   (the Eof token really is part of the rhs). */
export function augmentLR(g) {
  const rules = [{ idx: 0, lhs: AUG, rhs: [g.start, EOF], line: 0 }]
    .concat(g.rules.map(r => ({ ...r, idx: r.idx + 1 })));
  return makeGrammar(rules, [AUG, ...g.vars], uniq([...g.terms, EOF]), AUG);
}

const ikey = it => `${it.rule}:${it.dot}`;
const skey = items => items.map(ikey).sort().join(',');

/** closure(M) for LR(0) marked rules, with a log of which item spawned which. */
export function closure0(g, kernel) {
  const items = kernel.map(i => ({ ...i }));
  const have = new Set(items.map(ikey));
  const log = [];
  let round = 0, changed = true;
  while (changed) {
    changed = false; round++;
    const added = [];
    for (const it of [...items]) {
      const r = g.rules[it.rule];
      const c = r.rhs[it.dot];
      if (!c || !g.isVar(c)) continue;
      for (const pr of g.rulesFor(c)) {
        const nit = { rule: pr.idx, dot: 0 };
        if (have.has(ikey(nit))) continue;
        have.add(ikey(nit)); items.push(nit); changed = true;
        added.push({ item: nit, from: { ...it }, variable: c });
      }
    }
    if (added.length) log.push({ round, added });
  }
  return { items, log };
}

/** The LR(0) item-set automaton of the augmented grammar. */
export function lr0Items(g0) {
  const g = augmentLR(g0);
  const states = [];
  const index = new Map();
  const edges = [];

  const intern = (kernel) => {
    const { items, log } = closure0(g, kernel);
    const k = skey(items);
    if (index.has(k)) return index.get(k);
    const id = states.length;
    states.push({ id, items, kernel: kernel.map(i => ({ ...i })), closureLog: log, key: k });
    index.set(k, id);
    return id;
  };

  intern([{ rule: 0, dot: 0 }]);
  for (let i = 0; i < states.length; i++) {
    const st = states[i];
    const bySym = new Map();
    for (const it of st.items) {
      const r = g.rules[it.rule];
      const X = r.rhs[it.dot];
      if (X === undefined) continue;
      if (!bySym.has(X)) bySym.set(X, []);
      bySym.get(X).push({ rule: it.rule, dot: it.dot + 1 });
    }
    st.trans = {};
    for (const [X, kernel] of bySym) {
      const to = intern(kernel);
      st.trans[X] = to;
      edges.push({ from: st.id, sym: X, to });
    }
  }
  return { grammar: g, states, edges, gotoOf: (s, X) => states[s].trans[X] };
}

/**
 * slrTable(g) -> {action, goto, conflicts, …}
 *   action[state][terminal] = {type:'shift', to} | {type:'reduce', rule}
 *                           | {type:'accept'}
 * Following the lecture exactly: shift if • stands before t (t ≠ $);
 * reduce by a -> β if a -> β • ∈ M, a ≠ ŝ and t ∈ Follow(a);
 * accept if ŝ -> s • $ ∈ M and t = $.
 */
export function slrTable(g0) {
  const A = lr0Items(g0);
  const g = A.grammar;
  const nul = nullable(g0).set;
  const fi = first(g0, nul).map;
  const fo = follow(g0, nul, fi).map;

  const action = A.states.map(() => ({}));
  const gotoT = A.states.map(() => ({}));
  const conflicts = [];

  const place = (s, t, act, item) => {
    const old = action[s][t];
    if (old && !sameAction(old, act)) {
      const kind = (old.type === 'reduce' && act.type === 'reduce') ? 'reduce-reduce' : 'shift-reduce';
      conflicts.push({
        state: s, lookahead: t, kind,
        a: old, b: act,
        aItem: old.item, bItem: item,
        text: describeConflict(g, s, t, kind, old, act),
      });
      /* keep a *runnable* table: shift beats reduce, lower rule number wins
         a reduce-reduce race — exactly what yacc/bison do.  The conflict is
         still reported; nothing is silently swallowed. */
      if (old.type === 'reduce' && act.type === 'shift') action[s][t] = { ...act, item, resolved: true };
      else if (old.type === 'reduce' && act.type === 'reduce' && act.rule < old.rule) action[s][t] = { ...act, item, resolved: true };
      return;
    }
    if (!old) action[s][t] = { ...act, item };
  };

  for (const st of A.states) {
    for (const it of st.items) {
      const r = g.rules[it.rule];
      const X = r.rhs[it.dot];
      if (X === undefined) {
        if (r.lhs === AUG) continue;
        for (const t of fo[r.lhs] || [])
          place(st.id, t, { type: 'reduce', rule: it.rule }, { ...it });
      } else if (g.isVar(X)) {
        gotoT[st.id][X] = st.trans[X];
      } else if (X === EOF) {
        if (r.lhs === AUG && it.dot === 1) place(st.id, EOF, { type: 'accept' }, { ...it });
      } else {
        place(st.id, X, { type: 'shift', to: st.trans[X] }, { ...it });
      }
    }
  }
  return {
    kind: 'SLR', grammar: g, base: g0, automaton: A, states: A.states,
    action, goto: gotoT, conflicts,
    terminals: uniq([...g0.terms, EOF]), variables: g0.vars,
    first: fi, follow: fo, nullable: nul,
  };
}
function sameAction(a, b) {
  return a.type === b.type && a.to === b.to && a.rule === b.rule;
}
function describeConflict(g, s, t, kind, a, b) {
  const sh = a.type === 'shift' ? a : b, rd = a.type === 'reduce' ? a : b;
  if (kind === 'shift-reduce')
    return `shift-reduce conflict in state ${s} on \`${t}\`: the state contains a marked rule with the • in front of \`${t}\` (so the parser could shift into state ${sh.to}), and at the same time the completed rule \`${ruleText(g, g.rules[rd.rule])}\` with \`${t}\` ∈ Follow(${g.rules[rd.rule].lhs}) (so it could reduce). SLR cannot tell these apart.`;
  return `reduce-reduce conflict in state ${s} on \`${t}\`: both \`${ruleText(g, g.rules[a.rule])}\` and \`${ruleText(g, g.rules[b.rule])}\` are complete here and \`${t}\` lies in the Follow set of both left-hand sides.`;
}

/* ---- LR(1) items and the LALR merge -------------------------------- */
const ikey1 = it => `${it.rule}:${it.dot}:${it.la}`;

export function closure1(g, kernel, fi, nul) {
  const items = kernel.map(i => ({ ...i }));
  const have = new Set(items.map(ikey1));
  let changed = true;
  while (changed) {
    changed = false;
    for (const it of [...items]) {
      const r = g.rules[it.rule];
      const c = r.rhs[it.dot];
      if (!c || !g.isVar(c)) continue;
      const rest = r.rhs.slice(it.dot + 1);
      const las = firstOfString(g, [...rest, it.la], fi, nul);
      for (const pr of g.rulesFor(c)) for (const la of las) {
        const nit = { rule: pr.idx, dot: 0, la };
        if (have.has(ikey1(nit))) continue;
        have.add(ikey1(nit)); items.push(nit); changed = true;
      }
    }
  }
  return items;
}

/** The canonical LR(1) automaton. */
export function lr1Items(g0) {
  const g = augmentLR(g0);
  const nul = nullable(g0).set;
  const fi0 = first(g0, nul).map;
  const fi = { ...fi0 };
  fi[AUG] = new Set(fi0[g0.start] || []);
  const states = [], index = new Map();
  const key = its => its.map(ikey1).sort().join(',');
  const intern = kernel => {
    const items = closure1(g, kernel, fi, nul);
    const k = key(items);
    if (index.has(k)) return index.get(k);
    const id = states.length;
    states.push({ id, items, kernel: kernel.map(i => ({ ...i })), key: k });
    index.set(k, id);
    return id;
  };
  intern([{ rule: 0, dot: 0, la: EOF }]);
  for (let i = 0; i < states.length; i++) {
    const st = states[i];
    const bySym = new Map();
    for (const it of st.items) {
      const X = g.rules[it.rule].rhs[it.dot];
      if (X === undefined) continue;
      if (!bySym.has(X)) bySym.set(X, []);
      bySym.get(X).push({ rule: it.rule, dot: it.dot + 1, la: it.la });
    }
    st.trans = {};
    for (const [X, kernel] of bySym) st.trans[X] = intern(kernel);
  }
  return { grammar: g, states, first: fi, nullable: nul };
}

/** LALR: merge canonical LR(1) states that share an LR(0) core. */
export function lalrMerge(A1) {
  const g = A1.grammar;
  const coreOf = st => uniq(st.items.map(ikey)).sort().join(',');
  const groups = new Map();
  A1.states.forEach(st => {
    const c = coreOf(st);
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(st);
  });
  const cores = [...groups.keys()];
  const idOf = new Map();
  cores.forEach((c, i) => groups.get(c).forEach(st => idOf.set(st.id, i)));
  const states = cores.map((c, i) => {
    const members = groups.get(c);
    const seen = new Map();
    for (const st of members) for (const it of st.items) {
      const k = ikey(it);
      if (!seen.has(k)) seen.set(k, { rule: it.rule, dot: it.dot, las: new Set() });
      seen.get(k).las.add(it.la);
    }
    const trans = {};
    for (const st of members) for (const [X, to] of Object.entries(st.trans)) trans[X] = idOf.get(to);
    return { id: i, items: [...seen.values()], trans, merged: members.map(m => m.id) };
  });
  return { grammar: g, states, fromLR1: A1 };
}

/** Action/goto table from an LR(1) or LALR automaton (items carry lookahead). */
export function lrTable(A, kind = 'LR(1)') {
  const g = A.grammar;
  const action = A.states.map(() => ({}));
  const gotoT = A.states.map(() => ({}));
  const conflicts = [];
  const place = (s, t, act, item) => {
    const old = action[s][t];
    if (old && !sameAction(old, act)) {
      const k = (old.type === 'reduce' && act.type === 'reduce') ? 'reduce-reduce' : 'shift-reduce';
      conflicts.push({ state: s, lookahead: t, kind: k, a: old, b: act, text: describeConflict(g, s, t, k, old, act) });
      if (old.type === 'reduce' && act.type === 'shift') action[s][t] = { ...act, item, resolved: true };
      return;
    }
    if (!old) action[s][t] = { ...act, item };
  };
  for (const st of A.states) {
    for (const it of st.items) {
      const r = g.rules[it.rule];
      const X = r.rhs[it.dot];
      const las = it.las ? [...it.las] : [it.la];
      if (X === undefined) {
        if (r.lhs === AUG) continue;
        for (const t of las) place(st.id, t, { type: 'reduce', rule: it.rule }, { ...it });
      } else if (g.isVar(X)) {
        gotoT[st.id][X] = st.trans[X];
      } else if (X === EOF) {
        if (r.lhs === AUG && it.dot === 1) place(st.id, EOF, { type: 'accept' }, { ...it });
      } else {
        place(st.id, X, { type: 'shift', to: st.trans[X] }, { ...it });
      }
    }
  }
  return { kind, grammar: g, states: A.states, action, goto: gotoT, conflicts, automaton: A };
}

/** One-line comparison of the three table constructions for a grammar. */
export function compareTables(g0) {
  const slr = slrTable(g0);
  let lr1 = null, lalr = null, err = null;
  try {
    const A1 = lr1Items(g0);
    if (A1.states.length <= 400) {
      lr1 = lrTable(A1, 'LR(1)');
      lalr = lrTable(lalrMerge(A1), 'LALR(1)');
    } else err = 'the canonical LR(1) automaton has more than 400 states — skipped for speed';
  } catch (e) { err = String(e && e.message || e); }
  return {
    slr: { states: slr.states.length, conflicts: slr.conflicts.length, table: slr },
    lr1: lr1 && { states: lr1.states.length, conflicts: lr1.conflicts.length, table: lr1 },
    lalr: lalr && { states: lalr.states.length, conflicts: lalr.conflicts.length, table: lalr },
    note: err,
  };
}

/* =====================================================================
   8. DRIVING THE SHIFT-REDUCE PARSER   (shift-reduce-parser.tex)
   ---------------------------------------------------------------------
   Configuration:  q_0 … q_m | X_1 … X_m | t_{k+1} … t_n $
   ===================================================================== */
export function shiftReduceRun(g0, table, tokens, maxSteps = 500) {
  const g = table.grammar;
  const input = [...tokens, EOF];
  const stateStack = [0], symStack = [];
  const steps = [];
  let pos = 0, guard = 0;
  while (guard++ < maxSteps) {
    const q = stateStack[stateStack.length - 1];
    const t = input[pos];
    const act = (table.action[q] || {})[t];
    const snap = {
      states: [...stateStack], symbols: [...symStack],
      input: input.slice(pos), pos, state: q, look: t,
    };
    if (!act) {
      const expect = Object.keys(table.action[q] || {});
      steps.push({ ...snap, action: { type: 'error' },
        note: `error: in state ${q} there is no action for \`${t}\`. The prefix on the stack (${symStack.join(' ') || 'λ'}) followed by \`${t}\` is not a viable prefix. Legal lookaheads here: ${expect.map(x => '`' + x + '`').join(', ') || 'none'}.` });
      return { steps, accepted: false, error: true };
    }
    if (act.type === 'accept') {
      steps.push({ ...snap, action: act, note: `accept: the marked rule \`${AUG} -> ${g0.start} ${DOT} $\` is in state ${q} and the input is exhausted, so the word is in L(G).` });
      return { steps, accepted: true, error: false };
    }
    if (act.type === 'shift') {
      steps.push({ ...snap, action: act, note: `shift \`${t}\` and go to state ${act.to}.` });
      symStack.push(t); stateStack.push(act.to); pos++;
      continue;
    }
    /* reduce */
    const r = g.rules[act.rule];
    const l = r.rhs.length;
    steps.push({ ...snap, action: act,
      note: `reduce by \`${ruleText(g, r)}\`: pop ${l} symbol${l === 1 ? '' : 's'} (the handle ${l ? symStack.slice(-l).join(' ') : EPS}), then push \`${r.lhs}\` and go to goto(${stateStack[stateStack.length - 1 - l]}, ${r.lhs}).` });
    for (let i = 0; i < l; i++) { symStack.pop(); stateStack.pop(); }
    const back = stateStack[stateStack.length - 1];
    const to = (table.goto[back] || {})[r.lhs];
    if (to === undefined) {
      steps.push({ states: [...stateStack], symbols: [...symStack], input: input.slice(pos), pos, state: back, look: t,
        action: { type: 'error' }, note: `error: goto(${back}, ${r.lhs}) is undefined.` });
      return { steps, accepted: false, error: true };
    }
    symStack.push(r.lhs); stateStack.push(to);
  }
  return { steps, accepted: false, error: true, note: 'step limit reached' };
}

/** All actions that are *legal* in a given configuration (for grading the
    learner's choice in the playground). */
export function legalActions(table, state) {
  const row = table.action[state] || {};
  return Object.entries(row).map(([t, a]) => ({ lookahead: t, ...a }));
}

/* =====================================================================
   9. THE LECTURE'S EXAMPLE GRAMMARS
   ===================================================================== */
export const GALLERY = [
  {
    id: 'expr',
    name: 'Arithmetic expressions (layered)',
    note: 'The grammar of context-free-languages.tex Fig. “Expr”. Precedence and left associativity are built into the *shape* of the grammar: expr → product → factor.',
    words: ['NUMBER+NUMBER*NUMBER', '(NUMBER+NUMBER)*NUMBER', 'NUMBER-NUMBER-NUMBER'],
    text: `expr    -> expr '+' product
        |  expr '-' product
        |  product
product -> product '*' factor
        |  product '/' factor
        |  factor
factor  -> '(' expr ')'
        |  NUMBER`,
  },
  {
    id: 'expr-small',
    name: 'Simplified expressions (Earley chapter)',
    note: 'Figure “A simplified grammar for arithmetic expressions” from earley-parser.tex — the one Stroetmann parses “1+2*3” with, by hand.',
    words: ['1+2*3', '1*2+3', '3'],
    text: `e -> e '+' p | p
p -> p '*' f | f
f -> '1' | '2' | '3'`,
  },
  {
    id: 'ambig',
    name: 'Ambiguous expressions',
    note: 'lr-parser.tex Fig. “A grammar with shift/reduce conflicts”. It says nothing about precedence, so 1+2*3 has two parse trees — and the SLR table has shift-reduce conflicts.',
    words: ['N+N*N', 'N+N+N'],
    ambiguousWords: ['N+N*N'],
    text: `e -> e '+' e
   |  e '*' e
   |  N`,
  },
  {
    id: 'ambig-num',
    name: 'Ambiguous expressions, with digits',
    note: 'The same ambiguous grammar with concrete numbers, so the two parse trees can be *evaluated*: 2+3*4 is 20 under one tree and 14 under the other.',
    words: ['2+3*4', '2*3+4'],
    ambiguousWords: ['2+3*4', '2*3+4'],
    evaluable: true,
    text: `e -> e '+' e
   |  e '*' e
   |  n
n -> '2' | '3' | '4'`,
  },
  {
    id: 'rr',
    name: 'Reduce-reduce conflict',
    note: 'lr-parser.tex Fig. “A grammar with reduce/reduce conflicts”: unambiguous, L(s) = {xy, yx}, yet not SLR — Follow(a) = Follow(b) = {x, y}.',
    words: ['xy', 'yx'],
    text: `s -> a 'x' a 'y'
   |  b 'y' b 'x'
a -> ε
b -> ε`,
  },
  {
    id: 'dangling',
    name: 'Dangling else',
    note: 'The C-statement fragment of lalr-bison.tex. The classic shift-reduce conflict on `else`: bind it to the inner or the outer `if`?',
    words: ["if C S else S", "if C if C S else S"],
    ambiguousWords: ['if C if C S else S'],
    text: `stmnt -> 'if' 'C' stmnt
      |  'if' 'C' stmnt 'else' stmnt
      |  'S'`,
  },
  {
    id: 'parens',
    name: 'Balanced parentheses',
    note: 'context-free-languages.tex: s → \'(\' s \')\' | λ. The standard witness that context-free beats regular.',
    words: ['()', '(())', '(()'],
    text: `s -> '(' s ')' | ε`,
  },
  {
    id: 'anbn',
    name: 'aⁿbⁿ',
    note: 'The language the pumping lemma kills for regular expressions — trivial for a context-free grammar.',
    words: ['ab', 'aabb', 'aab'],
    text: `s -> 'a' s 'b' | ε`,
  },
  {
    id: 'palindrome',
    name: 'Palindromes over {a,b}',
    note: 'context-free-languages.tex §“palindromes”. Note the λ and the single-letter rules for the odd-length case.',
    words: ['abba', 'aba', 'ab'],
    text: `p -> 'a' p 'a'
   |  'b' p 'b'
   |  'a' | 'b' | ε`,
  },
  {
    id: 'exprRest',
    name: 'Expressions without left recursion',
    note: 'lr-parser.tex Fig. “Grammar for arithmetic expressions” (the version used to demonstrate nullable/First/Follow). exprRest and productRest are λ-generating — the interesting case.',
    words: ['NUMBER+NUMBER*NUMBER'],
    text: `expr        -> product exprRest
exprRest    -> '+' product exprRest
            |  '-' product exprRest
            |  ε
product     -> factor productRest
productRest -> '*' factor productRest
            |  '/' factor productRest
            |  ε
factor      -> '(' expr ')'
            |  NUMBER`,
  },
];

export const galleryById = id => GALLERY.find(x => x.id === id) || GALLERY[0];

export default {
  parseGrammar, makeGrammar, tokenize, ruleText, rhsText, symText, itemText,
  nullable, first, follow, firstOfString, analyse,
  newDerivation, frontier, sententialForm, isComplete, nextNode, expand, undo,
  choices, derive, randomDerivation, yieldOf, derivationOf,
  layoutTree, renderTree, pathToRoot,
  earley, earleyWhy, earleyTrees, isAmbiguous, sameTree,
  lr0Items, closure0, slrTable, lr1Items, closure1, lalrMerge, lrTable, compareTables,
  shiftReduceRun, legalActions, augmentLR, augmentEarley, derivesString,
  GALLERY, galleryById, EPS, EOF, AUG, DOT, sub,
};
