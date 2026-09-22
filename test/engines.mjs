/* Correctness tests for the two algorithm engines.
   These check results that are known independently of the implementation —
   language membership, state counts with proven minimal values, table entries
   from the lecture's worked examples. A lab that renders beautifully while
   computing the wrong DFA is worse than no lab at all. */
import * as A from '../js/core/automata.js';
import * as G from '../js/core/grammar.js';

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail = '') {
  cond ? pass++ : (fail++, fails.push(name + (detail ? ' — ' + detail : '')));
}
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  ok(name, g === w, `got ${g}, want ${w}`);
}

/* ---------------------------------------------------- regex + automata -- */
const matches = (re, w) => A.dfaAccepts(A.toDfa(re), w);

// basic semantics
ok('a* accepts ""',        matches('a*', ''));
ok('a* accepts aaa',       matches('a*', 'aaa'));
ok('a* rejects b',        !matches('a*', 'b'));
ok('(a+b)* accepts abba',  matches('(a+b)*', 'abba'));
ok('ab rejects ba',       !matches('ab', 'ba'));
ok('a(b+c)*d accepts abcbcd', matches('a(b+c)*d', 'abcbcd'));
ok('a(b+c)*d rejects abcb',  !matches('a(b+c)*d', 'abcb'));
ok('(ab)* accepts abab',   matches('(ab)*', 'abab'));
ok('(ab)* rejects aba',   !matches('(ab)*', 'aba'));
ok('a? accepts ""',        matches('a?', ''));
ok('a? accepts a',         matches('a?', 'a'));
ok('a? rejects aa',       !matches('a?', 'aa'));

// the classic exponential-blowup family: (a+b)*a(a+b)^2 needs 2^3 = 8 DFA states
{
  const dfa = A.toDfa('(a+b)*a(a+b)(a+b)');   // toDfa already minimises
  const n = (dfa.states || []).length;
  ok('3rd-from-last-is-a minimises to 8 states', n === 8, `got ${n}`);
  ok('  accepts abb (a is 3rd from last)', A.dfaAccepts(dfa, 'abb'));
  ok('  rejects bbb', !A.dfaAccepts(dfa, 'bbb'));
  ok('  accepts baaa', A.dfaAccepts(dfa, 'baaa'));
}

// minimisation must not change the language
for (const re of ['(a+b)*abb', 'a*b*', '(ab+ba)*', 'a(a+b)*b']) {
  const dfa = A.subsetConstruction(A.thompson(A.parseRegex(re))).dfa;
  const min = A.minimize(dfa).dfa;
  let same = true;
  for (const w of ['', 'a', 'b', 'ab', 'ba', 'abb', 'abab', 'aabb', 'bbba', 'ababb']) {
    if (A.dfaAccepts(dfa, w) !== A.dfaAccepts(min, w)) { same = false; break; }
  }
  ok(`minimize preserves L(${re})`, same);
}

// equivalence + witnesses
ok('(a+b)* = (a*b*)*', A.equivalent('(a+b)*', '(a*b*)*') === true);
ok('r** = r*',         A.equivalent('(ab)**', '(ab)*') === true);
ok('a* != a+',         A.equivalent('a*', 'aa*') !== true);
{
  const r = A.equivalent('a*', 'aa*');
  const w = r && r.witness;
  ok('witness for a* vs aa* is the empty string', w === '', `got ${JSON.stringify(w)}`);
}
ok('(a+b)* != a*',     A.equivalent('(a+b)*', 'a*') !== true);

// epsilon closure sanity on a Thompson NFA
{
  const nfa = A.thompson(A.parseRegex('a*'));
  const cl = A.epsilonClosure(nfa, [nfa.start]);
  const set = cl instanceof Set ? cl : new Set(cl);
  const acc = new Set(nfa.accepting || [nfa.accept]);
  ok('eps-closure of a* start reaches an accepting state', [...set].some(q => acc.has(q)));
}

// emptiness
ok('L((a+b)*) non-empty', A.isEmpty(A.toDfa('(a+b)*')) === false);

/* ------------------------------------------------------------ grammar -- */
const EXPR = `
E -> E '+' P | P
P -> P '*' F | F
F -> '(' E ')' | NUMBER
`;
const g = G.parseGrammar(EXPR);
ok('expression grammar parses', !!g && !g.error, JSON.stringify(g && g.error));

// First / Follow, from the lecture's standard example
{
  const f = G.first(g).map, fo = G.follow(g).map;
  const get = (m, k) => [...(m[k] || [])].sort();
  eq('First(E)', get(f, 'E'), ['(', 'NUMBER']);
  eq('First(P)', get(f, 'P'), ['(', 'NUMBER']);
  eq('First(F)', get(f, 'F'), ['(', 'NUMBER']);
  eq('Follow(E)', get(fo, 'E'), ['$', ')', '+'].sort());
  eq('Follow(P)', get(fo, 'P'), ['$', ')', '*', '+'].sort());
  eq('Follow(F)', get(fo, 'F'), ['$', ')', '*', '+'].sort());
}

// the layered grammar must be SLR-conflict-free; the naive one must not be
{
  const t = G.slrTable(g);
  const conf = t.conflicts || [];
  ok('layered expression grammar has no SLR conflicts', conf.length === 0,
     `${conf.length} conflicts`);

  const amb = G.parseGrammar("E -> E '+' E | E '*' E | NUMBER");
  const t2 = G.slrTable(amb);
  const c2 = t2.conflicts || [];
  ok('ambiguous expression grammar HAS SLR conflicts', c2.length > 0);
  ok('  and they are shift-reduce', c2.some(c => /shift/i.test(JSON.stringify(c)) && /reduce/i.test(JSON.stringify(c))));
}

// Earley must agree with the grammar on membership
{
  const acc = w => {
    const tk = G.tokenize(w, g);
    if (tk.error) return 'TOKENIZE:' + tk.error;
    return G.earley(g, tk.tokens).accepted;
  };
  ok('Earley accepts NUMBER + NUMBER * NUMBER', acc('NUMBER + NUMBER * NUMBER') === true);
  ok('Earley accepts ( NUMBER )', acc('( NUMBER )') === true);
  ok('Earley rejects NUMBER +', acc('NUMBER +') === false);
  ok('Earley rejects ( NUMBER', acc('( NUMBER') === false);
}

// shift-reduce run on the SLR table must accept a valid sentence
{
  const t = G.slrTable(g);
  const tk = G.tokenize('NUMBER + NUMBER * NUMBER', g);
  const run = G.shiftReduceRun(g, t, tk.tokens);
  const steps = run.steps || run;
  const last = JSON.stringify(steps[steps.length - 1] || {});
  ok('shift-reduce run reaches accept', /accept/i.test(last) || run.accepted === true, last.slice(0, 160));
}

// ambiguity detection
{
  const amb = G.parseGrammar("E -> E '+' E | E '*' E | NUMBER");
  const r = G.isAmbiguous(amb, 'NUMBER + NUMBER * NUMBER');
  ok('2+3*4 is ambiguous in the naive grammar', r.ambiguous === true, JSON.stringify(r.trees && r.trees.length));
  const r2 = G.isAmbiguous(g, 'NUMBER + NUMBER * NUMBER');
  ok('  but not in the layered one', r2.ambiguous === false);
}

/* ------------------------------------------------------- pumping data -- */
{
  const { languages } = await import('../data/pumping.js');
  ok('pumping bank has >= 14 languages', languages.length >= 14, String(languages.length));
  ok('  includes regular decoys', languages.some(l => l.regular));
  ok('  includes non-regular classics', languages.some(l => !l.regular));
  // member() must agree with the advertised regularity on obvious cases
  const anbn = languages.find(l => /a\^n\s*b\^n|anbn/.test(l.id + (l.tex || '')));
  if (anbn) {
    ok('a^n b^n: member("aabb")', anbn.member('aabb') === true);
    ok('a^n b^n: rejects "aab"', anbn.member('aab') === false);
    ok('a^n b^n: accepts ""', anbn.member('') === true);
  }
  for (const l of languages) {
    let threw = false;
    try { l.member(''); l.member('ab'); l.member('aaabbb'); } catch { threw = true; }
    ok(`member() total for ${l.id}`, !threw);
  }
}

/* ------------------------------------------------------- content banks -- */
{
  const { cards } = await import('../data/cards.js');
  const { questions } = await import('../data/quiz.js');
  const { prompts } = await import('../data/feynman.js');
  const { concepts } = await import('../data/curriculum.js');
  const valid = new Set(concepts.map(c => c.id));

  ok('>=120 cards', cards.length >= 120, String(cards.length));
  ok('>=90 questions', questions.length >= 90, String(questions.length));
  ok('>=25 prompts', prompts.length >= 25, String(prompts.length));

  const badCard = cards.filter(c => !valid.has(c.concept));
  ok('every card has a real concept id', !badCard.length, badCard.map(c => c.id + ':' + c.concept).join(','));
  const badQ = questions.filter(q => !valid.has(q.concept));
  ok('every question has a real concept id', !badQ.length, badQ.map(q => q.id).join(','));
  const badP = prompts.filter(p => !valid.has(p.concept));
  ok('every prompt has a real concept id', !badP.length, badP.map(p => p.id).join(','));

  const dupC = cards.map(c => c.id).filter((v, i, a) => a.indexOf(v) !== i);
  ok('no duplicate card ids', !dupC.length, dupC.join(','));
  const dupQ = questions.map(q => q.id).filter((v, i, a) => a.indexOf(v) !== i);
  ok('no duplicate question ids', !dupQ.length, dupQ.join(','));

  const badAns = questions.filter(q => !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length);
  ok('every answer index is in range', !badAns.length, badAns.map(q => q.id).join(','));

  // the distractor diagnoses are the pedagogical core — every wrong option needs one
  const missingWhy = questions.filter(q =>
    q.choices.some((_, i) => i !== q.answer && !(q.why && (q.why[i] ?? q.why[String(i)]))));
  ok('every distractor has a diagnosis', !missingWhy.length,
     `${missingWhy.length} questions: ` + missingWhy.slice(0, 5).map(q => q.id).join(','));

  const noExplain = questions.filter(q => !q.explain);
  ok('every question explains its answer', !noExplain.length, noExplain.map(q => q.id).join(','));

  const uncovered = [...valid].filter(id =>
    !cards.some(c => c.concept === id) || !questions.some(q => q.concept === id));
  ok('every concept has both cards and questions', !uncovered.length, uncovered.join(','));
}

/* ------------------------------------------------- notation rendering -- */
/* The tex() renderer supports a fixed subset of LaTeX. Any macro the content
   uses but the renderer does not know leaks to the screen as raw backslash
   source, which is exactly the kind of bug nobody notices in review. */
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const ui = readFileSync(new URL('../js/core/ui.js', import.meta.url), 'utf8');
  const known = new Set([...ui.matchAll(/'\\\\\\\\([a-zA-Z]+)'/g)].map(m => m[1]));
  /* macros consumed by a dedicated rewrite rule rather than the symbol table */
  for (const k of ['mathcal','mathbb','mathrm','texttt','textsl','textsf','textbf','textit',
                   'text','mathtt','mathsf','mathbf','mathit','mbox','operatorname',
                   'frac','hat','overline','bigl','bigr','Bigl','Bigr','left','right'])
    known.add(k);

  const files = ['data/cards.js','data/quiz.js','data/feynman.js','data/pumping.js','data/curriculum.js']
    .concat(readdirSync(new URL('../js/modules', import.meta.url)).map(f => 'js/modules/' + f));
  const unknown = new Map();
  for (const f of files) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/\\\\\\\\([a-zA-Z]+)/g))
      if (!known.has(m[1])) unknown.set(m[1], (unknown.get(m[1]) || 0) + 1);
  }
  ok('every LaTeX macro used in content is renderable', unknown.size === 0,
     [...unknown.entries()].map(([k, n]) => `\\${k}(${n}x)`).join(' '));
}

/* ----------------------------------------------------------- report ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fails.length) { console.log('\nFailures:'); fails.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
