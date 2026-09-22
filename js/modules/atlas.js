/* ==========================================================================
   Concept Atlas  —  route id: 'atlas'

   The reference you reach for mid-panic: every concept of the course with its
   definition in the lecture's own notation, its prerequisites and dependents
   in both directions, your current mastery, and a door into the lab that
   drills it.  Plus the dependency map, the notation cheat-sheet and the
   theorems you are expected to be able to state.

   Notation follows Stroetmann: the empty string is  λ , the regular
   expression denoting  {λ}  is  ε , and the extended transition function is
   δ* (many books write δ̂ — both appear below so neither surprises you).
   ========================================================================== */
import { concepts, units, byId } from '../../data/curriculum.js';

/* --------------------------------------------------------------------------
   Extended definitions.  curriculum.js owns the one-liners; the Atlas owns
   the precise statement, the trap and the exam-relevant remark.
   -------------------------------------------------------------------------- */
const DEF = {
  alphabet: {
    def: 'An **alphabet** $\\Sigma$ is a finite, non-empty set of characters. $\\Sigma^*$ is the set of all finite strings over $\\Sigma$, including the empty string $\\lambda$. A **formal language** is any subset $L \\subseteq \\Sigma^*$.',
    trap: 'A language may be infinite, but every single string in it is finite. $\\Sigma^*$ itself is countably infinite.',
    ch: '1',
  },
  concat: {
    def: 'For languages: $L_1 \\cdot L_2 := \\{ u \\cdot v \\mid u \\in L_1 \\land v \\in L_2 \\}$, $L^0 := \\{\\lambda\\}$, $L^{n+1} := L^n \\cdot L$, and the **Kleene closure** $L^* := \\bigcup_{n \\in \\N} L^n$.',
    trap: '$\\lambda \\in L^*$ always — even for $L = \\emptyset$, since $\\emptyset^0 = \\{\\lambda\\}$. And $\\{\\lambda\\} \\neq \\emptyset$: one contains a string, the other does not.',
    ch: '2',
  },
  'regex-syntax': {
    def: 'The set $RegExp_{\\Sigma}$ is defined inductively: $\\emptyset$ and $\\varepsilon$ are regular expressions, every $c \\in \\Sigma$ is one, and if $r_1, r_2, r$ are, then so are $r_1 + r_2$, $r_1 \\cdot r_2$, $r^*$ and $(r)$.',
    trap: 'The symbols $\\emptyset, \\varepsilon, +, \\cdot, *, (, )$ must **not** be members of $\\Sigma$, otherwise the syntax is ambiguous. Precedence: $*$ binds tighter than $\\cdot$, which binds tighter than $+$.',
    ch: '2',
  },
  'regex-sem': {
    def: 'The semantics is the structural recursion $L: RegExp_{\\Sigma} \\to 2^{\\Sigma^*}$ with $L(\\emptyset) = \\{\\}$, $L(\\varepsilon) = \\{\\lambda\\}$, $L(c) = \\{c\\}$, $L(r_1+r_2) = L(r_1) \\cup L(r_2)$, $L(r_1 \\cdot r_2) = L(r_1) \\cdot L(r_2)$ and $L(r^*) = (L(r))^*$.',
    trap: '$\\varepsilon$ is a regular *expression*; $\\lambda$ is a *string*. $L(\\varepsilon) = \\{\\lambda\\}$ — three different objects on one line.',
    ch: '2',
  },
  'regex-algebra': {
    def: 'Regular expressions form a Kleene algebra: $+$ is associative, commutative and idempotent ($r + r \\doteq r$), $\\cdot$ distributes over $+$, $\\emptyset$ is neutral for $+$ and absorbing for $\\cdot$, $\\varepsilon$ is neutral for $\\cdot$, and $r^{**} \\doteq r^*$, $\\varepsilon + r \\cdot r^* \\doteq r^*$.',
    trap: '$r_1 \\doteq r_2$ means $L(r_1) = L(r_2)$ — equality of *languages*, not of expressions. Deciding it goes through automata (see emptiness).',
    ch: '2',
  },
  scanner: {
    def: 'A scanner is a list of rules $r_i \\to token_i$. At each position it takes the **longest** match (maximal munch); on a tie in length the rule listed **first** wins.',
    trap: 'Maximal munch is what makes `ifx` an identifier rather than the keyword `if` followed by `x`, and `1..2` a hazard in languages with both `.` and `..`.',
    ch: '3',
  },
  dfa: {
    def: 'A **DFA** is a 5-tuple $F = \\langle Q, \\Sigma, \\delta, q_0, A \\rangle$: finite state set $Q$, alphabet $\\Sigma$, transition function $\\delta: Q \\times \\Sigma \\to Q$, start state $q_0 \\in Q$, accepting states $A \\subseteq Q$.',
    trap: 'A **complete** DFA has $\\delta$ total. If $\\delta$ is partial, $\\delta^*(q,w)$ may be undefined ($\\Omega$) — complete it with a sink state before complementing, or the complement will be wrong.',
    ch: '4',
  },
  'dfa-run': {
    def: 'Extend $\\delta$ to strings: $\\delta^*(q, \\lambda) := q$ and $\\delta^*(q, c v) := \\delta^*(\\delta(q,c), v)$. Then $L(F) := \\{ s \\in \\Sigma^* \\mid \\delta^*(q_0, s) \\in A \\}$.',
    trap: 'The recursion peels characters off the **front**. Written $\\hat{\\delta}$ in many textbooks; the lecture writes $\\delta^*$.',
    ch: '4',
  },
  nfa: {
    def: 'An **NFA** is $\\langle Q, \\Sigma, \\delta, q_0, A \\rangle$ with $\\delta: Q \\times (\\Sigma \\cup \\{\\lambda\\}) \\to 2^Q$: a *set* of successor states, and $\\lambda$-transitions that consume nothing. It accepts $s$ iff **some** path ends in $A$.',
    trap: 'Non-determinism adds no power, only brevity: every NFA has an equivalent DFA (subset construction), sometimes with exponentially many states.',
    ch: '4',
  },
  eclosure: {
    def: '$\\lambda closure(M)$ is the smallest set $K$ with $M \\subseteq K$ and $\\delta(q,\\lambda) \\subseteq K$ for every $q \\in K$ — the least fixed point of one $\\lambda$-step.',
    trap: 'A state is always in its own closure. Forgetting that is the classic subset-construction bug.',
    ch: '4',
  },
  thompson: {
    def: 'Thompson: build an NFA fragment per regex constructor, each with exactly one start and one accepting state, glued with $\\lambda$-transitions — $r_1 + r_2$ branches, $r_1 \\cdot r_2$ chains, $r^*$ adds a loop and a bypass.',
    trap: 'The fragment for $r^*$ needs **both** the bypass edge (for $\\lambda$) and the back edge; keeping one start / one accept is what makes the induction go through.',
    ch: '4',
  },
  subset: {
    def: 'Powerset construction: states of $det(F)$ are sets $M \\subseteq Q$, $q_0\' := \\lambda closure(\\{q_0\\})$, $\\delta\'(M,c) := \\lambda closure(\\{p \\mid \\exists q \\in M: p \\in \\delta(q,c)\\})$, and $M$ accepts iff $M \\cap A \\neq \\emptyset$.',
    trap: 'Only reachable subsets matter — never draw all $2^{|Q|}$ of them. The empty set is the sink state.',
    ch: '4',
  },
  minimize: {
    def: 'Two states $p_1, p_2$ are **separable** if some $s$ with $\\delta^*(p_1,s) \\in A$ and $\\delta^*(p_2,s) \\notin A$ (or vice versa). Repeatedly mark separable pairs until nothing changes; merge the rest.',
    trap: 'Minimisation presupposes a *complete* DFA with all states reachable. The minimal DFA is unique up to renaming — which is why it decides equivalence.',
    ch: '4',
  },
  'closure-props': {
    def: 'Regular languages are closed under $\\cup$ (join the regexes with $+$), $\\cdot$, $*$, $\\cap$ (product automaton), complement $\\Sigma^* \\backslash L$ (swap $A$ and $Q \\backslash A$ in a **complete** DFA) and reversal.',
    trap: 'Closure runs the other way too, and that is how you prove non-regularity cheaply: if $L \\cap R$ is non-regular for a regular $R$, then $L$ cannot be regular.',
    ch: '5',
  },
  product: {
    def: 'For complete DFAs $F_1, F_2$: $F := \\langle Q_1 \\times Q_2, \\Sigma, \\delta, \\langle q_1,q_2 \\rangle, A_1 \\times A_2 \\rangle$ with $\\delta(\\langle p_1,p_2 \\rangle, c) := \\langle \\delta_1(p_1,c), \\delta_2(p_2,c) \\rangle$ — both machines run in lockstep.',
    trap: 'Change only the accepting set to change the operation: $A_1 \\times A_2$ gives $\\cap$; $(A_1 \\times Q_2) \\cup (Q_1 \\times A_2)$ gives $\\cup$.',
    ch: '5',
  },
  emptiness: {
    def: '$L(F) = \\emptyset$ iff no accepting state is reachable from $q_0$ — a graph search. Equivalence: $r_1 \\doteq r_2$ iff $(L(r_1) \\backslash L(r_2)) \\cup (L(r_2) \\backslash L(r_1)) = \\emptyset$, and the symmetric difference is regular by the closure properties.',
    trap: 'This is *the* application of the closure properties: they turn a question about infinitely many strings into a reachability check on a finite graph.',
    ch: '5',
  },
  pumping: {
    def: 'If $L$ is regular then $\\exists n \\in \\N: \\forall s \\in L: |s| \\geq n \\rightarrow \\exists u,v,w \\in \\Sigma^*: s = uvw \\land v \\neq \\lambda \\land |uv| \\leq n \\land \\forall h \\in \\N: uv^h w \\in L$.',
    trap: 'The proof takes $n := card(Q)$ of a DFA for $L$: reading $n$ characters visits $n+1$ states, so by the pigeonhole principle some state repeats inside the first $n$ characters — that loop is $v$.',
    ch: '5',
  },
  nonregular: {
    def: 'Negating the lemma gives the game: for **every** $n$ you must produce **one** $s \\in L$, $|s| \\geq n$, such that **every** legal split $s = uvw$ has **some** $h$ with $uv^h w \\notin L$.',
    trap: 'The lemma is **necessary, not sufficient**: languages exist that satisfy it and are still not regular. Passing the pumping test proves nothing; only failing it proves something.',
    ch: '5',
  },
  cfg: {
    def: 'A **context-free grammar** is $G = \\langle V, T, R, S \\rangle$ with variables $V$, terminals $T$ ($V \\cap T = \\emptyset$), rules $R \\subseteq V \\times (V \\cup T)^*$ written $A \\to \\alpha$, and start symbol $S \\in V$.',
    trap: 'Context-free means the left-hand side is a *single* variable — the context around it never matters.',
    ch: '6',
  },
  derivation: {
    def: '$\\alpha A \\gamma \\Rightarrow \\alpha \\beta \\gamma$ whenever $(A \\to \\beta) \\in R$; $\\Rightarrow^*$ is its reflexive-transitive closure. $L(G) := \\{ w \\in T^* \\mid S \\Rightarrow^* w \\}$.',
    trap: 'Leftmost and rightmost derivations always exist for a derivable word; different *derivations* are harmless, different *parse trees* are ambiguity.',
    ch: '6',
  },
  'parse-tree': {
    def: 'A tree whose root is $S$, whose internal nodes are variables with children spelling out the right-hand side of a rule, and whose fringe (left to right) is the derived string.',
    trap: 'One parse tree corresponds to exactly one leftmost derivation — that is the bridge between the two definitions of ambiguity.',
    ch: '6',
  },
  ambiguity: {
    def: 'A grammar is **ambiguous** if some $w \\in L(G)$ has two distinct parse trees (equivalently: two distinct leftmost derivations).',
    trap: 'Ambiguity is a property of the *grammar*, not of the language. Some languages are inherently ambiguous — no unambiguous grammar exists for them.',
    ch: '6',
  },
  precedence: {
    def: 'Layer the grammar so the tree shape forces the meaning: $expr \\to expr + product \\mid product$, $product \\to product * factor \\mid factor$, $factor \\to (expr) \\mid Number$.',
    trap: 'Left recursion in the rule gives left associativity; right recursion gives right associativity. The deeper the layer, the tighter the binding.',
    ch: '6',
  },
  topdown: {
    def: 'Recursive descent: one parsing function per variable; each chooses a rule by looking at the next token and then calls the functions for the right-hand side.',
    trap: 'Left recursion loops forever — eliminate it first ($A \\to A\\alpha \\mid \\beta$ becomes $A \\to \\beta A\'$, $A\' \\to \\alpha A\' \\mid \\lambda$). And the rule choice must be unambiguous: that is what $LL(1)$ means.',
    ch: '7',
  },
  earley: {
    def: 'A chart $Q_0, ..., Q_n$ of Earley items $\\langle A \\to \\alpha \\bullet \\beta, j \\rangle$, closed under **predict** (dot before a variable), **scan** (dot before the next token) and **complete** (dot at the end: advance every item that spawned it).',
    trap: 'Earley handles *every* context-free grammar, ambiguity and left recursion included, in $O(n^3)$ — and in $O(n)$ for the usual unambiguous ones.',
    ch: '8',
  },
  shiftreduce: {
    def: 'A stack plus the remaining input. **Shift** moves the next token onto the stack; **reduce** replaces a handle $\\beta$ on top of the stack by $A$ when $(A \\to \\beta) \\in R$. Accept when the stack is $S$ and the input is empty.',
    trap: 'The only hard question is *when* to reduce; everything from SLR to LALR is machinery for answering it.',
    ch: '9',
  },
  'lr-items': {
    def: 'A **marked rule** (item) is $A \\to \\beta \\bullet \\gamma$ for a rule $A \\to \\beta\\gamma$. States are $closure$-saturated sets: if $A \\to \\beta \\bullet C \\delta \\in M$ and $(C \\to \\gamma) \\in R$ then $C \\to \\bullet \\gamma \\in M$. $goto(M,X)$ moves the dot over $X$.',
    trap: 'The resulting DFA recognises **viable prefixes** — the stack contents that can still lead to an accepting parse. Start by augmenting the grammar with $\\hat{S} \\to S \\$$.',
    ch: '10',
  },
  follow: {
    def: '$First(A) := \\{ t \\in T \\mid \\exists \\gamma: A \\Rightarrow^* t\\gamma \\}$; $Follow(A) := \\{ t \\mid \\exists \\beta,\\gamma: \\hat{S} \\Rightarrow^* \\beta A t \\gamma \\}$ in the augmented grammar. Both are least fixed points: iterate the rules until nothing changes.',
    trap: '$First(\\lambda) = \\{\\}$, and $First(A\\beta)$ only includes $First(\\beta)$ when $A \\Rightarrow^* \\lambda$. $\\$$ lives in $Follow(S)$ from the start.',
    ch: '10',
  },
  slr: {
    def: 'SLR: $action(M,t) = \\langle shift, goto(M,t) \\rangle$ if some item has the dot before $t$; $\\langle reduce, A \\to \\beta \\rangle$ if $A \\to \\beta \\bullet \\in M$ and $t \\in Follow(A)$; $accept$ for $\\hat{S} \\to S \\bullet$ on $\\$$. $goto$ handles variables.',
    trap: 'LR(1) carries a lookahead inside each item instead of consulting $Follow$; LALR merges LR(1) states with equal cores — smaller tables, possibly new reduce-reduce conflicts.',
    ch: '10',
  },
  conflicts: {
    def: 'A table cell with two entries. **Shift-reduce**: the state allows both shifting $t$ and reducing some $A \\to \\beta$ with $t \\in Follow(A)$. **Reduce-reduce**: two completed items compete.',
    trap: 'The dangling else is the canonical shift-reduce conflict; the standard fix is to shift (bind `else` to the nearest `if`), or to restructure the grammar with precedence declarations.',
    ch: '10',
  },
  ast: {
    def: 'The parse tree with the syntactic noise (parentheses, chain rules, separators) removed — nodes are operators, children are operands.',
    trap: 'The AST, not the parse tree, is what the type checker and the code generator walk.',
    ch: '12',
  },
  jasmin: {
    def: 'The JVM is a stack machine: `iload_i` / `istore_i` move between local variables and the operand stack; `iadd`, `isub`, `imul` pop two operands and push one result; `if_icmpge`, `goto` implement control flow with labels.',
    trap: 'Declare `.limit stack` and `.limit locals` large enough — the verifier rejects the class otherwise.',
    ch: '13',
  },
  codegen: {
    def: 'A structural recursion over the AST emitting postfix code: $code(e_1 + e_2) = code(e_1) \\cdot code(e_2) \\cdot$ `iadd`. Control flow becomes fresh labels plus conditional jumps.',
    trap: 'The stack height after an expression must always be exactly one more than before — check it per rule and the whole program is correct by induction.',
    ch: '14',
  },
};

/* Which lab drills which concept. */
const PRACTICE = {
  alphabet: [['regex', 'Regex Lab']], concat: [['regex', 'Regex Lab']],
  'regex-syntax': [['regex', 'Regex Lab']], 'regex-sem': [['regex', 'Regex Lab']],
  'regex-algebra': [['regex', 'Regex Lab'], ['quiz', 'Quiz Arena']],
  scanner: [['regex', 'Regex Lab']],
  dfa: [['automata', 'Automaton Lab']], 'dfa-run': [['automata', 'Automaton Lab']],
  nfa: [['automata', 'Automaton Lab']], eclosure: [['automata', 'Automaton Lab'], ['subset', 'Subset Race']],
  thompson: [['automata', 'Automaton Lab'], ['regex', 'Regex Lab']],
  subset: [['subset', 'Subset Race'], ['automata', 'Automaton Lab']],
  minimize: [['automata', 'Automaton Lab']],
  'closure-props': [['automata', 'Automaton Lab'], ['quiz', 'Quiz Arena']],
  product: [['automata', 'Automaton Lab']], emptiness: [['automata', 'Automaton Lab']],
  pumping: [['pumping', 'Pumping Duel']], nonregular: [['pumping', 'Pumping Duel']],
  cfg: [['grammar', 'Grammar Lab']], derivation: [['grammar', 'Grammar Lab']],
  'parse-tree': [['grammar', 'Grammar Lab']], ambiguity: [['grammar', 'Grammar Lab']],
  precedence: [['grammar', 'Grammar Lab']], topdown: [['parser', 'Parser Lab']],
  earley: [['parser', 'Parser Lab']], shiftreduce: [['parser', 'Parser Lab']],
  'lr-items': [['parser', 'Parser Lab']], follow: [['parser', 'Parser Lab']],
  slr: [['parser', 'Parser Lab']], conflicts: [['parser', 'Parser Lab']],
  ast: [['grammar', 'Grammar Lab']], jasmin: [['quiz', 'Quiz Arena']], codegen: [['quiz', 'Quiz Arena']],
};

/* --------------------------------------------------------------------------
   Notation cheat-sheet — students lose marks to notation, not to ideas.
   -------------------------------------------------------------------------- */
const NOTATION = [
  ['$\\Sigma$', 'Alphabet: a finite, non-empty set of characters.', '1'],
  ['$\\Sigma^*$', 'All finite strings over $\\Sigma$, the empty string included.', '1'],
  ['$\\lambda$', '**The empty string.** The lecture writes $\\lambda$, not $\\varepsilon$.', '1'],
  ['$\\varepsilon$', 'The regular **expression** with $L(\\varepsilon) = \\{\\lambda\\}$. Not a string.', '2'],
  ['$\\emptyset$', 'As a regex: $L(\\emptyset) = \\{\\}$. Note $\\{\\} \\neq \\{\\lambda\\}$.', '2'],
  ['$|s|$', 'Length of the string $s$; $|\\lambda| = 0$.', '1'],
  ['$u \\cdot v$', 'Concatenation of strings or languages; the dot is often dropped.', '1'],
  ['$L^*$', 'Kleene closure $\\bigcup_{n \\in \\N} L^n$; always contains $\\lambda$.', '2'],
  ['$L(r)$', 'The language denoted by the regular expression $r$.', '2'],
  ['$r_1 \\doteq r_2$', 'Equivalence of regular expressions: $L(r_1) = L(r_2)$.', '5'],
  ['$Q$', 'The finite set of states of an automaton.', '4'],
  ['$q_0$', 'The start state.', '4'],
  ['$A$', 'The set of accepting states. Other books write $F$ — same thing.', '4'],
  ['$\\delta$', 'Transition function: $Q \\times \\Sigma \\to Q$ (DFA) or $Q \\times (\\Sigma \\cup \\{\\lambda\\}) \\to 2^Q$ (NFA).', '4'],
  ['$\\delta^*$', 'Its extension to strings, $\\delta^*(q,\\lambda) = q$. Written $\\hat{\\delta}$ elsewhere.', '4'],
  ['$\\Omega$', 'Undefined: the value of $\\delta(q,c)$ in an incomplete DFA.', '4'],
  ['$L(F)$', 'The language accepted by the automaton $F$: $\\{s \\mid \\delta^*(q_0,s) \\in A\\}$.', '4'],
  ['$det(F)$', 'The DFA obtained from the NFA $F$ by the subset construction.', '4'],
  ['$card(Q)$', 'The number of elements of $Q$ — the $n$ of the pumping lemma.', '5'],
  ['$s = uvw$', 'The pumping split; $v \\neq \\lambda$, $|uv| \\leq n$, pump exponent $h$.', '5'],
  ['$V, T, R, S$', 'Grammar: variables, terminals, rules, start symbol.', '6'],
  ['$\\Rightarrow$', 'One derivation step: rewrite one variable with one rule.', '6'],
  ['$\\Rightarrow^*$', 'Reflexive-transitive closure: zero or more derivation steps.', '6'],
  ['$\\bullet$', 'The dot of a marked rule $A \\to \\beta \\bullet \\gamma$: what has been read.', '10'],
  ['$\\hat{S} \\to S \\$$', 'The augmentation of a grammar; $\\$$ is the end-of-input token.', '10'],
  ['$First(A)$', 'Tokens that can begin a string derived from $A$.', '10'],
  ['$Follow(A)$', 'Tokens that can directly follow $A$ in a derivation.', '10'],
  ['$\\vdash$', 'One configuration step of a shift-reduce parser (stack, input).', '9'],
  ['$closure(M)$', 'Saturation of a set of marked rules under the prediction rule.', '10'],
  ['$goto(M,X)$', 'The state reached from $M$ by moving the dot over $X$.', '10'],
];

/* --------------------------------------------------------------------------
   Statements you must be able to reproduce.
   -------------------------------------------------------------------------- */
const THEOREMS = [
  {
    id: 'kleene', title: 'Kleene’s theorem', ch: '4', concept: 'thompson',
    body: [
      'The following three classes of languages coincide:',
      '  (a) languages denoted by a regular expression,',
      '  (b) languages accepted by an NFA,',
      '  (c) languages accepted by a DFA.',
      'The proof is a cycle of constructions: regex $\\to$ NFA (Thompson), NFA $\\to$ DFA (subset construction), DFA $\\to$ regex (state elimination). Every DFA can additionally be minimised, and the minimal DFA is unique up to renaming of states.',
    ],
  },
  {
    id: 'pumping', title: 'Pumping lemma for regular languages', ch: '5', concept: 'pumping',
    body: [
      'Let $L$ be a regular language. Then there is an $n \\in \\N$ such that every $s \\in L$ with $|s| \\geq n$ can be split into $s = uvw$ with',
      '  (1) $v \\neq \\lambda$,',
      '  (2) $|uv| \\leq n$,',
      '  (3) $\\forall h \\in \\N: uv^h w \\in L$.',
      'As one formula: $\\exists n \\in \\N: \\forall s \\in L: (|s| \\geq n \\rightarrow \\exists u,v,w: s = uvw \\land v \\neq \\lambda \\land |uv| \\leq n \\land \\forall h \\in \\N: uv^hw \\in L)$.',
      '**Proof sketch.** Take a DFA $F$ with $L = L(F)$ and put $n := card(Q)$. Reading the first $n$ characters of $s$ visits $n+1$ states, so two of them coincide; the loop between them is $v$, and running it $h$ times keeps the machine on an accepting path.',
      '**Use.** Only the contrapositive is useful: to show $L$ is not regular, beat every $n$, every split, with one $h$. The converse is false — see the concept "Proving non-regularity".',
    ],
  },
  {
    id: 'closure', title: 'Closure properties of regular languages', ch: '5', concept: 'closure-props',
    table: [
      ['$L_1 \\cup L_2$', 'yes', 'regex $r_1 + r_2$'],
      ['$L_1 \\cdot L_2$', 'yes', 'regex $r_1 \\cdot r_2$'],
      ['$L^*$', 'yes', 'regex $r^*$'],
      ['$L_1 \\cap L_2$', 'yes', 'product automaton, $A = A_1 \\times A_2$'],
      ['$\\Sigma^* \\backslash L$', 'yes', 'complete the DFA, then swap $A$ and $Q \\backslash A$'],
      ['$L_1 \\backslash L_2$', 'yes', '$L_1 \\cap (\\Sigma^* \\backslash L_2)$'],
      ['$L^R$ (reversal)', 'yes', 'reverse every edge, swap start and accepting states'],
      ['homomorphic image', 'yes', 'replace each character by its image in the regex'],
    ],
    body: ['Read the table backwards to prove non-regularity: if $L \\cap R$ is not regular for some regular $R$, then $L$ is not regular either. That is usually far cheaper than the pumping lemma.'],
  },
  {
    id: 'equiv', title: 'Deciding equivalence of regular expressions', ch: '5', concept: 'emptiness',
    body: [
      'Given $r_1, r_2$, the question $r_1 \\doteq r_2$ is decidable:',
      '  1. build complete DFAs $F_1, F_2$ (Thompson, then subset construction),',
      '  2. build the product automaton for the symmetric difference $(L_1 \\backslash L_2) \\cup (L_2 \\backslash L_1)$,',
      '  3. test that automaton for emptiness by reachability of an accepting state.',
      '$r_1 \\doteq r_2$ holds exactly if the symmetric difference is empty.',
    ],
  },
  {
    id: 'firstfollow', title: 'First and Follow as fixed points', ch: '10', concept: 'follow',
    body: [
      '$First(\\lambda) = \\{\\}$; $First(t\\beta) = \\{t\\}$ for $t \\in T$;',
      '$First(A\\beta) = First(A) \\cup First(\\beta)$ if $A \\Rightarrow^* \\lambda$, otherwise $First(A)$;',
      'for $A \\to \\alpha_1 \\mid \\cdots \\mid \\alpha_n$: $First(A) = \\bigcup_{i} First(\\alpha_i)$.',
      'Follow, in the augmented grammar $\\hat{G}$ with $\\hat{S} \\to S \\$$:',
      '  $\\$ \\in Follow(S)$;',
      '  for every rule $A \\to \\alpha B \\beta$: $First(\\beta) \\subseteq Follow(B)$;',
      '  and if $\\beta \\Rightarrow^* \\lambda$ (in particular if $\\beta = \\lambda$): $Follow(A) \\subseteq Follow(B)$.',
      'Both are computed as **least fixed points**: start with empty sets and iterate the rules until nothing changes.',
    ],
  },
  {
    id: 'slrtable', title: 'The SLR table construction', ch: '10', concept: 'slr',
    body: [
      'Augment $G$ with $\\hat{S} \\to S \\$$. States are $closure$-saturated sets of marked rules; the start state is $closure(\\{\\hat{S} \\to \\bullet S \\$\\})$, and $goto(M,X) = closure(\\{A \\to \\beta X \\bullet \\gamma \\mid A \\to \\beta \\bullet X \\gamma \\in M\\})$.',
      'For a state $M$ and a token $t$:',
      '  1. if $A \\to \\beta \\bullet t \\gamma \\in M$: $action(M,t) = \\langle shift, goto(M,t) \\rangle$;',
      '  2. if $A \\to \\beta \\bullet \\in M$ and $t \\in Follow(A)$: $action(M,t) = \\langle reduce, A \\to \\beta \\rangle$;',
      '  3. if $\\hat{S} \\to S \\bullet \\$ \\in M$: $action(M,\\$) = accept$;',
      '  4. otherwise the cell stays empty and signals a syntax error.',
      'If cases 1 and 2 both apply the cell holds a **shift-reduce conflict**; if case 2 applies twice, a **reduce-reduce conflict**. LR(1) replaces $Follow(A)$ by a lookahead carried inside each item, LALR merges LR(1) states with identical cores.',
    ],
  },
];

/* ========================================================================== */
export default {
  id: 'atlas',
  title: 'Concept Atlas',

  mount(root, ctx) {
    const { store, ui, go, params } = ctx;
    const { h, tex, clear, toast } = ui;
    ui.loadCss('css/modules/games.css');

    /* ---- derived structure ------------------------------------------- */
    const dependents = {};
    concepts.forEach(c => (dependents[c.id] = []));
    concepts.forEach(c => (c.prereq || []).forEach(p => dependents[p] && dependents[p].push(c.id)));

    const depthMemo = {};
    function depth(id, seen = new Set()) {
      if (depthMemo[id] != null) return depthMemo[id];
      if (seen.has(id)) return 0;
      seen.add(id);
      const c = byId[id];
      const d = !c || !(c.prereq || []).length ? 0
        : 1 + Math.max(...c.prereq.map(p => depth(p, seen)));
      depthMemo[id] = d;
      return d;
    }
    concepts.forEach(c => depth(c.id));

    const m = id => store.mastery(id);
    const masteryTag = v => v >= 0.75 ? ['good', 'solid'] : v >= 0.45 ? ['warn', 'shaky'] : v > 0 ? ['bad', 'weak'] : ['', 'untouched'];

    /* ---- view state --------------------------------------------------- */
    const S = {
      tab: 'concepts',
      q: '',
      unit: '',
      level: '',
      weakOnly: false,
      sel: params && params.get('c') && byId[params.get('c')] ? params.get('c') : null,
    };

    const search = h('input.at-search', { type: 'text', placeholder: 'search concepts, notation, theorems…   ( / )', spellcheck: 'false', value: S.q });
    const body = h('div.at-body');

    /* ---- chrome ------------------------------------------------------- */
    root.appendChild(ui.pageHead('Reference',
      'Concept Atlas',
      'Every definition, its place in the dependency graph, and the notation the lecture actually uses. Press $/$ to search.'));

    const tabs = [
      ['concepts', 'Concepts'], ['map', 'Dependency map'],
      ['notation', 'Notation'], ['theorems', 'Theorems & formulas'],
    ];
    const tabBar = h('div.at-tabs', tabs.map(([k, label]) =>
      h('button.at-tab' + (S.tab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { S.tab = k; draw(); } }, label)));

    const unitSel = h('select.at-sel', h('option', { value: '' }, 'all units'),
      units.map(u => h('option', { value: u.id }, `${u.id.toUpperCase()} · ch ${u.ch} — ${u.title}`)));
    const levelSel = h('select.at-sel', h('option', { value: '' }, 'all levels'),
      h('option', { value: '1' }, '1 · vocabulary'), h('option', { value: '2' }, '2 · procedure'), h('option', { value: '3' }, '3 · proof / transfer'));
    const weakBtn = h('button.btn-ghost.btn-sm', { onclick: () => { S.weakOnly = !S.weakOnly; draw(); } }, 'weak first');

    search.addEventListener('input', () => { S.q = search.value; draw(); });
    unitSel.addEventListener('change', () => { S.unit = unitSel.value; draw(); });
    levelSel.addEventListener('change', () => { S.level = levelSel.value; draw(); });

    root.appendChild(h('div.card.at-toolbar', h('div.row', search, unitSel, levelSel, weakBtn)));
    root.appendChild(tabBar);
    root.appendChild(body);

    const onKey = e => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        e.preventDefault(); S.tab = 'concepts'; draw(); search.focus(); search.select();
      }
    };
    addEventListener('keydown', onKey);

    /* ---- filtering ---------------------------------------------------- */
    function matches(c) {
      if (S.unit && c.unit !== S.unit) return false;
      if (S.level && String(c.level) !== S.level) return false;
      if (S.weakOnly && m(c.id) >= 0.6) return false;
      const q = S.q.trim().toLowerCase();
      if (!q) return true;
      const d = DEF[c.id] || {};
      return [c.id, c.title, c.one, d.def, d.trap].filter(Boolean).join(' ').toLowerCase().includes(q);
    }

    /* ---- draw --------------------------------------------------------- */
    function draw() {
      [...tabBar.children].forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
      weakBtn.classList.toggle('btn-primary', S.weakOnly);
      clear(body);
      if (S.tab === 'concepts') drawConcepts();
      else if (S.tab === 'map') drawMap();
      else if (S.tab === 'notation') drawNotation();
      else drawTheorems();
    }

    /* ---------------- concepts ---------------- */
    function drawConcepts() {
      if (S.sel && byId[S.sel]) body.appendChild(detailCard(byId[S.sel]));
      const list = concepts.filter(matches);
      if (S.weakOnly) list.sort((a, b) => m(a.id) - m(b.id));
      if (!list.length) { body.appendChild(h('div.card.center.muted', 'Nothing matches that filter.')); return; }

      let unit = null;
      for (const c of list) {
        if (!S.weakOnly && c.unit !== unit) {
          unit = c.unit;
          const u = units.find(x => x.id === unit);
          body.appendChild(h('h2.at-unithead', `${u ? u.title : unit}`,
            h('span.muted.small', { style: { marginLeft: '10px', fontWeight: '400' } }, u ? `Chapter ${u.ch}` : '')));
        }
        body.appendChild(rowCard(c));
      }
    }

    function rowCard(c) {
      const v = m(c.id), [cls, word] = masteryTag(v);
      return h('div.card.at-row' + (S.sel === c.id ? '.sel' : ''), { onclick: () => { S.sel = S.sel === c.id ? null : c.id; draw(); scrollToDetail(); } },
        h('div.row',
          h('span.tag' + (cls ? '.' + cls : ''), word),
          h('strong.at-rowtitle', c.title),
          h('span.spacer'),
          h('span.small.faint', `L${c.level}`),
          h('code.small.faint', c.id)),
        h('div.small.muted', { html: tex(c.one) }),
        h('div.bar', h('i', { style: { width: Math.round(v * 100) + '%' } })));
    }

    function scrollToDetail() {
      setTimeout(() => { const el = body.querySelector('.at-detail'); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
    }

    function chip(id) {
      const c = byId[id];
      if (!c) return null;
      const v = m(id), [cls] = masteryTag(v);
      return h('button.at-chip' + (cls ? '.' + cls : ''), {
        onclick: e => { e.stopPropagation(); S.sel = id; S.tab = 'concepts'; draw(); scrollToDetail(); },
      }, c.title);
    }

    function detailCard(c) {
      const d = DEF[c.id] || {};
      const v = m(c.id), [cls, word] = masteryTag(v);
      const prereq = (c.prereq || []).map(chip).filter(Boolean);
      const deps = (dependents[c.id] || []).map(chip).filter(Boolean);
      const u = units.find(x => x.id === c.unit);
      return h('div.card.at-detail',
        h('div.row',
          h('span.tag.accent', u ? `Chapter ${d.ch || u.ch}` : (d.ch || '')),
          h('span.tag' + (cls ? '.' + cls : ''), `${word} · ${Math.round(v * 100)}%`),
          h('span.spacer'),
          h('button.btn-ghost.btn-sm', { onclick: () => { S.sel = null; draw(); } }, 'close')),
        h('h2', c.title),
        h('p.lede', { html: tex(c.one) }),
        d.def ? h('div.at-def', { html: tex(d.def) }) : null,
        d.trap ? h('div.callout.warn', { html: tex('**Watch out.** ' + d.trap) }) : null,
        h('div.grid.c2',
          h('div', h('h3.at-h3', 'Needs first'), prereq.length ? h('div.at-chips', prereq) : h('div.faint.small', 'nothing — this is a root of the course')),
          h('div', h('h3.at-h3', 'Unlocks'), deps.length ? h('div.at-chips', deps) : h('div.faint.small', 'nothing further depends on it'))),
        (PRACTICE[c.id] || []).length ? h('div.row.at-practice',
          h('span.small.muted', 'Practise it:'),
          (PRACTICE[c.id] || []).map(([route, label]) => h('button.btn-sm', { onclick: e => { e.stopPropagation(); go(route); } }, label + ' →'))) : null);
    }

    /* ---------------- dependency map ---------------- */
    function drawMap() {
      const maxD = Math.max(...concepts.map(c => depth(c.id)));
      const layers = [];
      for (let i = 0; i <= maxD; i++) layers.push(concepts.filter(c => depth(c.id) === i).map(c => c.id));

      /* barycentre sweeps: pull each node towards the average x of its neighbours */
      const posOf = {};
      layers.forEach(l => l.forEach((id, i) => (posOf[id] = i)));
      for (let pass = 0; pass < 6; pass++) {
        const down = pass % 2 === 0;
        const order = down ? [...layers.keys()] : [...layers.keys()].reverse();
        for (const li of order) {
          if ((down && li === 0) || (!down && li === layers.length - 1)) continue;
          const layer = layers[li];
          const bary = id => {
            const nb = down ? (byId[id].prereq || []) : (dependents[id] || []);
            const xs = nb.map(x => posOf[x]).filter(x => x != null);
            return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : posOf[id];
          };
          layer.sort((a, b) => bary(a) - bary(b) || a.localeCompare(b));
          layer.forEach((id, i) => (posOf[id] = i));
        }
      }

      const NW = 128, NH = 34, GX = 16, GY = 74;
      const cols = Math.max(...layers.map(l => l.length));
      const W = cols * (NW + GX) + GX;
      const H = layers.length * GY + 30;
      const xy = {};
      layers.forEach((layer, li) => {
        const rowW = layer.length * (NW + GX) - GX;
        const x0 = (W - rowW) / 2;
        layer.forEach((id, i) => (xy[id] = { x: x0 + i * (NW + GX), y: 20 + li * GY }));
      });

      const NS = 'http://www.w3.org/2000/svg';
      const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const [k, val] of Object.entries(a)) e.setAttribute(k, val); return e; };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'at-graph', width: '100%', height: String(Math.min(H, 900)), preserveAspectRatio: 'xMidYMin meet' });

      /* edges first, so nodes sit on top */
      const edges = el('g');
      for (const c of concepts) {
        for (const p of c.prereq || []) {
          const a = xy[p], b = xy[c.id];
          if (!a || !b) continue;
          const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
          const my = (y1 + y2) / 2;
          const hot = S.sel && (S.sel === c.id || S.sel === p);
          edges.appendChild(el('path', {
            d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
            class: 'at-edge' + (hot ? ' hot' : ''),
          }));
        }
      }
      svg.appendChild(edges);

      for (const c of concepts) {
        const p = xy[c.id]; if (!p) continue;
        const v = m(c.id);
        const g = el('g', { class: 'at-node' + (S.sel === c.id ? ' sel' : '') + (matches(c) ? '' : ' dim'), transform: `translate(${p.x},${p.y})`, tabindex: '0', role: 'button' });
        g.appendChild(el('rect', { width: NW, height: NH, rx: 8, class: 'at-nbg' }));
        g.appendChild(el('rect', { width: NW, height: NH, rx: 8, class: 'at-nfill', 'fill-opacity': String(0.1 + 0.75 * v) }));
        const t = el('text', { x: NW / 2, y: NH / 2 + 4, class: 'at-nlabel' });
        t.textContent = c.title.length > 21 ? c.title.slice(0, 20) + '…' : c.title;
        g.appendChild(t);
        const open = () => { S.sel = c.id; S.tab = 'concepts'; draw(); scrollToDetail(); };
        g.addEventListener('click', open);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        const title = el('title');
        title.textContent = `${c.title} — ${Math.round(v * 100)}% · needs: ${(c.prereq || []).join(', ') || '—'}`;
        g.appendChild(title);
        svg.appendChild(g);
      }

      const wrap = h('div.card.at-mapcard',
        h('div.row',
          h('h2', 'Where am I'),
          h('span.spacer'),
          h('span.small.muted', 'layer = prerequisite depth · fill = mastery · click a node')),
        h('div.at-scroll'),
        h('div.row.at-legend',
          h('span.at-key.k0'), h('span.small.muted', 'untouched'),
          h('span.at-key.k1'), h('span.small.muted', 'weak'),
          h('span.at-key.k2'), h('span.small.muted', 'solid')));
      wrap.querySelector('.at-scroll').appendChild(svg);
      body.appendChild(wrap);

      const front = concepts.filter(c => m(c.id) < 0.6 && (c.prereq || []).every(p => m(p) >= 0.6));
      if (front.length) body.appendChild(h('div.card',
        h('h3.at-h3', 'Ready to learn next'),
        h('div.at-chips', front.map(c => chip(c.id)).filter(Boolean)),
        h('p.small.muted', 'Every prerequisite of these is already solid — they are the cheapest wins available.')));
    }

    /* ---------------- notation ---------------- */
    function drawNotation() {
      const q = S.q.trim().toLowerCase();
      const rows = NOTATION.filter(r => !q || (r[0] + ' ' + r[1]).toLowerCase().includes(q));
      body.appendChild(h('div.card',
        h('h2', 'Notation cheat-sheet'),
        h('p.muted.small', { html: tex('The lecture is German, the notes are English, and the symbols are the only thing that is neither. Marks are lost here, not on the ideas.') }),
        h('table.at-table',
          h('thead', h('tr', h('th', 'Symbol'), h('th', 'Meaning'), h('th', 'Ch.'))),
          h('tbody', rows.map(([sym, mean, ch]) =>
            h('tr', h('td.at-sym', { html: tex(sym) }), h('td', { html: tex(mean) }), h('td.faint.small', ch)))))));
      body.appendChild(h('div.card.callout.warn', {
        html: tex('The three most expensive confusions: $\\lambda$ (empty **string**) vs $\\varepsilon$ (regular **expression**) vs $\\emptyset$ (empty **language**); $\\delta$ vs $\\delta^*$; and $\\Rightarrow$ (one derivation step) vs $\\Rightarrow^*$ (any number, zero included).'),
      }));
    }

    /* ---------------- theorems ---------------- */
    function drawTheorems() {
      const q = S.q.trim().toLowerCase();
      const list = THEOREMS.filter(t => !q || (t.title + ' ' + (t.body || []).join(' ')).toLowerCase().includes(q));
      if (!list.length) { body.appendChild(h('div.card.center.muted', 'Nothing matches that filter.')); return; }
      for (const t of list) {
        const d = h('details.card.at-thm', { open: !!q || t.id === 'pumping' },
          h('summary',
            h('span.tag.accent', 'Ch. ' + t.ch),
            h('strong', { style: { marginLeft: '8px' } }, t.title)),
          h('div.at-thmbody',
            (t.body || []).map(line => h('p', { html: tex(line) })),
            t.table ? h('table.at-table',
              h('thead', h('tr', h('th', 'Operation'), h('th', 'Closed?'), h('th', 'Construction'))),
              h('tbody', t.table.map(r => h('tr',
                h('td', { html: tex(r[0]) }),
                h('td', h('span.tag.good', r[1])),
                h('td', { html: tex(r[2]) }))))) : null,
            t.concept && byId[t.concept] ? h('div.row.at-practice',
              h('span.small.muted', 'Concept:'), chip(t.concept),
              (PRACTICE[t.concept] || []).map(([route, label]) =>
                h('button.btn-sm', { onclick: () => go(route) }, label + ' →'))) : null));
        body.appendChild(d);
      }
    }

    if (S.sel) setTimeout(scrollToDetail, 60);
    draw();
    if (params && params.get('c') && !byId[params.get('c')]) toast('Unknown concept id in the link.', 'bad');

    return () => removeEventListener('keydown', onKey);
  },
};
