/* The concept map for Karl Stroetmann's "Formal Languages & Compilers".
   Chapter order follows Lecture-Notes/formal-languages.tex.
   Every other module tags its content with these concept ids — this file is
   the shared vocabulary of the whole app. */

export const units = [
  { id: 'u1', ch: '1-2', title: 'Languages & Regular Expressions',
    blurb: 'The alphabet-string-language trio, then the first way to describe an infinite language with a finite text.' },
  { id: 'u2', ch: '3-4', title: 'Scanners & Finite Automata',
    blurb: 'Machines with no memory beyond a state — and why that is exactly enough for regular expressions.' },
  { id: 'u3', ch: '5',   title: 'The Theory of Regular Languages',
    blurb: 'Closure properties, equivalence, and the sharp edge where regularity stops.' },
  { id: 'u4', ch: '6-7', title: 'Context-Free Grammars',
    blurb: 'Derivations, parse trees, ambiguity, and top-down parsing with Lark.' },
  { id: 'u5', ch: '8-11', title: 'Parsing Algorithms',
    blurb: 'Earley, shift-reduce, SLR/LR/LALR: how a stack plus a table becomes a parser.' },
  { id: 'u6', ch: '12-14', title: 'Compilation',
    blurb: 'From an abstract syntax tree to Jasmin assembler for the JVM.' },
];

/* level: 1 = vocabulary/recall, 2 = procedure, 3 = proof/transfer */
export const concepts = [
  // ---- Unit 1 -------------------------------------------------------------
  { id: 'alphabet',    unit: 'u1', level: 1, title: 'Alphabet, string, language',
    one: 'Σ is a finite set of symbols; Σ* all finite strings over it; a language is any subset of Σ*.',
    prereq: [] },
  { id: 'concat',      unit: 'u1', level: 1, title: 'Concatenation & Kleene star',
    one: 'L₁·L₂ glues strings pairwise; L* is the union of all Lⁿ, and always contains the empty string λ.',
    prereq: ['alphabet'] },
  { id: 'regex-syntax',unit: 'u1', level: 1, title: 'Regular expression syntax',
    one: 'Inductively: ∅, ε, single characters, then r₁r₂, r₁+r₂ and r*.',
    prereq: ['concat'] },
  { id: 'regex-sem',   unit: 'u1', level: 2, title: 'Semantics L(r)',
    one: 'Every regex denotes a language via a structural-recursive function L(·).',
    prereq: ['regex-syntax'] },
  { id: 'regex-algebra', unit: 'u1', level: 3, title: 'Algebraic simplification',
    one: 'Regexes form a Kleene algebra: idempotent +, distributivity, r** = r*, ε+rr* = r*.',
    prereq: ['regex-sem'] },

  // ---- Unit 2 -------------------------------------------------------------
  { id: 'scanner',     unit: 'u2', level: 2, title: 'Scanners & maximal munch',
    one: 'A scanner splits input into tokens, preferring the longest match and, on ties, the earlier rule.',
    prereq: ['regex-sem'] },
  { id: 'dfa',         unit: 'u2', level: 1, title: 'Deterministic finite automaton',
    one: 'A 5-tuple (Q, Σ, δ, q₀, A) with a total transition function — one path per input.',
    prereq: ['alphabet'] },
  { id: 'dfa-run',     unit: 'u2', level: 2, title: 'Running a DFA / δ̂',
    one: 'Extend δ to strings; accept iff δ̂(q₀, w) ∈ A.',
    prereq: ['dfa'] },
  { id: 'nfa',         unit: 'u2', level: 1, title: 'Non-deterministic FA',
    one: 'δ returns a *set* of states and may use ε-moves; accept iff *some* path accepts.',
    prereq: ['dfa'] },
  { id: 'eclosure',    unit: 'u2', level: 2, title: 'ε-closure',
    one: 'All states reachable by ε-moves alone — the fixed point of the ε-step operator.',
    prereq: ['nfa'] },
  { id: 'thompson',    unit: 'u2', level: 2, title: 'Thompson construction',
    one: 'Regex → NFA compositionally; each fragment keeps exactly one start and one accepting state.',
    prereq: ['nfa', 'regex-sem'] },
  { id: 'subset',      unit: 'u2', level: 2, title: 'Subset (powerset) construction',
    one: 'NFA → DFA: a DFA state is a *set* of NFA states, closed under ε.',
    prereq: ['eclosure'] },
  { id: 'minimize',    unit: 'u2', level: 2, title: 'DFA minimisation',
    one: 'Repeatedly split state classes that some input distinguishes; the fixed point is minimal.',
    prereq: ['subset', 'dfa-run'] },

  // ---- Unit 3 -------------------------------------------------------------
  { id: 'closure-props', unit: 'u3', level: 2, title: 'Closure properties',
    one: 'Regular languages are closed under ∪, ∩, complement, concatenation, * and reversal.',
    prereq: ['subset'] },
  { id: 'product',     unit: 'u3', level: 2, title: 'Product automaton',
    one: 'Run two DFAs in lockstep on Q₁×Q₂ to get ∩ or ∪ directly.',
    prereq: ['closure-props'] },
  { id: 'emptiness',   unit: 'u3', level: 2, title: 'Emptiness & equivalence tests',
    one: 'L(A)=∅ is reachability; L(r₁)=L(r₂) reduces to emptiness of the symmetric difference.',
    prereq: ['product'] },
  { id: 'pumping',     unit: 'u3', level: 3, title: 'Pumping lemma',
    one: 'Every regular L has n such that every long s splits as s = uvw with |uv| ≤ n, v ≠ λ and uvʰw ∈ L for all h.',
    prereq: ['emptiness', 'dfa-run'] },
  { id: 'nonregular',  unit: 'u3', level: 3, title: 'Proving non-regularity',
    one: 'An adversary game: they pick n, you pick w; they split, you pick k to break membership.',
    prereq: ['pumping'] },

  // ---- Unit 4 -------------------------------------------------------------
  { id: 'cfg',         unit: 'u4', level: 1, title: 'Context-free grammar',
    one: 'A 4-tuple (V, T, R, S); rules rewrite a single variable into a string of symbols.',
    prereq: ['regex-sem'] },
  { id: 'derivation',  unit: 'u4', level: 2, title: 'Derivations',
    one: '⇒ rewrites one variable; ⇒* is its reflexive-transitive closure. Left- vs rightmost matters.',
    prereq: ['cfg'] },
  { id: 'parse-tree',  unit: 'u4', level: 2, title: 'Parse trees',
    one: 'A tree whose internal nodes are rule applications and whose fringe is the derived string.',
    prereq: ['derivation'] },
  { id: 'ambiguity',   unit: 'u4', level: 3, title: 'Ambiguity',
    one: 'Two distinct parse trees for one string — the dangling-else and bare expression grammars.',
    prereq: ['parse-tree'] },
  { id: 'precedence',  unit: 'u4', level: 3, title: 'Encoding precedence & associativity',
    one: 'Layer the grammar (expr/product/factor) so the shape of the tree forces the right meaning.',
    prereq: ['ambiguity'] },
  { id: 'topdown',     unit: 'u4', level: 2, title: 'Top-down / recursive descent',
    one: 'One function per variable; left recursion loops forever, so eliminate it first.',
    prereq: ['precedence'] },

  // ---- Unit 5 -------------------------------------------------------------
  { id: 'earley',      unit: 'u5', level: 3, title: 'Earley parser',
    one: 'A chart of dotted items per input position, closed under predict, scan and complete.',
    prereq: ['topdown'] },
  { id: 'shiftreduce', unit: 'u5', level: 2, title: 'Shift-reduce parsing',
    one: 'A stack plus the remaining input; shift a token, or reduce a complete right-hand side to its variable (the textbooks call that a *handle*; these notes do not).',
    prereq: ['parse-tree'] },
  { id: 'lr-items',    unit: 'u5', level: 3, title: 'Marked rules & the LR(0) automaton',
    one: 'A state is a closed set of **marked rules** — exactly the rules applicable in the situation it describes. (Textbooks say the automaton recognises *viable prefixes*; the notes do not use the term.)',
    prereq: ['shiftreduce', 'eclosure'] },
  { id: 'follow',      unit: 'u5', level: 2, title: 'First & Follow sets',
    one: 'Fixed-point computations that say which tokens may start, or may follow, a variable.',
    prereq: ['cfg'] },
  { id: 'slr',         unit: 'u5', level: 3, title: 'SLR / LR(1) / LALR tables',
    one: 'Action+goto tables; SLR reduces on Follow, LR(1) on carried lookahead, LALR merges cores.',
    prereq: ['lr-items', 'follow'] },
  { id: 'conflicts',   unit: 'u5', level: 3, title: 'Shift-reduce & reduce-reduce conflicts',
    one: 'A cell with two entries. Fix by restructuring the grammar or declaring precedence.',
    prereq: ['slr', 'precedence'] },

  // ---- Unit 6 -------------------------------------------------------------
  { id: 'ast',         unit: 'u6', level: 2, title: 'Abstract syntax trees',
    one: 'The parse tree with the noise removed — what the rest of the compiler actually walks.',
    prereq: ['parse-tree'] },
  { id: 'jasmin',      unit: 'u6', level: 1, title: 'JVM stack machine / Jasmin',
    one: 'Operands live on a stack; iload/istore touch locals, iadd pops two and pushes one.',
    prereq: ['ast'] },
  { id: 'codegen',     unit: 'u6', level: 3, title: 'Code generation',
    one: 'A structural recursion over the AST emitting postfix code; control flow becomes labels + jumps.',
    prereq: ['jasmin'] },
];

export const byId = Object.fromEntries(concepts.map(c => [c.id, c]));
export const conceptsOfUnit = u => concepts.filter(c => c.unit === u);

/** Topological-ish ordering used by the learning path. */
export function orderedConcepts() {
  const out = [], done = new Set();
  const visit = c => {
    if (done.has(c.id)) return;
    done.add(c.id);
    (c.prereq || []).forEach(p => byId[p] && visit(byId[p]));
    out.push(c);
  };
  concepts.forEach(visit);
  return out;
}

/** Concepts whose prerequisites are mastered but which are not yet mastered. */
export function frontier(masteryFn, threshold = 0.6) {
  return concepts.filter(c =>
    masteryFn(c.id) < threshold &&
    (c.prereq || []).every(p => masteryFn(p) >= threshold));
}

export const curriculum = { units, concepts, byId, conceptsOfUnit, orderedConcepts, frontier };
export default curriculum;
