/* Multiple-choice bank. Every distractor encodes ONE named misconception and
   every `why` entry names it and gives the counter-example.
   level 1 = vocabulary, 2 = procedure, 3 = proof / transfer.
   Notation follows Stroetmann: empty string lambda, regex epsilon, dead
   transition Omega, extended transition delta*, pumping split s = uvw. */

export const questions = [

  /* ================= u1 ================================================= */
  { id: 'q-alpha-1', concept: 'alphabet', level: 1,
    stem: 'Which statement matches the definition of an **alphabet** $\\Sigma$ in the lecture notes?',
    choices: [
      'Any set of characters, finite or infinite.',
      'A finite, non-empty set of characters.',
      'A finite set of strings.',
      'A non-empty set of strings of length one, possibly infinite.' ],
    answer: 1,
    why: {
      0: 'Dropping finiteness. The whole theory needs $\\Sigma$ finite — a DFA has finitely many states and must have a transition for each character; an infinite $\\Sigma$ breaks the transition **table**.',
      2: 'Confusing $\\Sigma$ with a language. A language is a set of **strings** ($L \\subseteq \\Sigma^*$); the alphabet is the set of **characters** the strings are built from.',
      3: 'Half right: characters are identified with strings of length one, but the definition still demands finiteness.' },
    explain: 'Definition: $\\Sigma$ = {c_1, \\ldots, c_n} is a **finite, non-empty** set of characters. Both adjectives are load-bearing.' },

  { id: 'q-alpha-2', concept: 'alphabet', level: 1,
    stem: 'Which of these is **not** a formal language over $\\Sigma$ = {a, b}?',
    choices: [
      'The empty set {}.',
      'The set {$\\lambda$}.',
      'The set of grammatically correct English sentences written with a and b.',
      '$\\Sigma^*$ itself.' ],
    answer: 2,
    why: {
      0: '{} is a perfectly good language — the one with no words. "Precisely defined" is satisfied trivially.',
      1: '{$\\lambda$} contains exactly one word, the empty string. It is a language and is different from {}.',
      3: '$\\Sigma^*$ is the largest language over $\\Sigma$; every language is a subset of it.' },
    explain: 'A language must be **precisely defined**: for every $w \\in \\Sigma^*$ it must be unambiguous whether $w \\in L$. English has no such rule set — that is the example the notes give.' },

  { id: 'q-concat-1', concept: 'concat', level: 2,
    stem: 'Let $L$ = {}. What is $L^*$?',
    choices: [ '{}', '{$\\lambda$}', '$\\Sigma^*$', 'Undefined' ],
    answer: 1,
    why: {
      0: 'Thinking the star of nothing is nothing. But $L^* = \\bigcup L^{n}$ and $L^{0}$ = {$\\lambda$} **by definition**, independently of $L$. $L^*$ is never empty.',
      2: 'Confusing $L^*$ with $\\Sigma^*$. The star closes $L$ under concatenation; it cannot invent characters that $L$ never contained.',
      3: 'The definition is total: $L^*$ is defined for every language, including the empty one.' },
    explain: '$L^{0}$ := {$\\lambda$} for **every** $L$, so $\\lambda \\in L^*$ always. With $L$ = {} no other power contributes anything, leaving exactly {$\\lambda$}.' },

  { id: 'q-concat-2', concept: 'concat', level: 2,
    stem: '$L_1$ = {ab, b} and $L_2$ = {$\\lambda$, c}. How many elements does $L_1 \\cdot L_2$ have?',
    choices: [ '2', '3', '4', '6' ],
    answer: 2,
    why: {
      0: 'Treating $\\lambda$ as if it contributed nothing, i.e. reading $L_2$ as {c}. But concatenating $\\lambda$ **keeps** the word: ab$\\cdot\\lambda$ = ab is a member.',
      1: 'Off by one — probably counting ab, b, abc but forgetting bc.',
      3: 'Multiplying sizes without checking for collisions is right here (2 $\\cdot$ 2 = 4), so 6 cannot arise at all.' },
    explain: '{ab, b} $\\cdot$ {$\\lambda$, c} = {ab, abc, b, bc} — four distinct strings. $|L_1 \\cdot L_2| \\leq |L_1| \\cdot |L_2|$, with equality when no two products coincide.' },

  { id: 'q-rexsyn-1', concept: 'regex-syntax', level: 1,
    stem: 'What is the difference between the regular expressions $\\emptyset$ and $\\epsilon$?',
    choices: [
      'None — both denote the empty language.',
      '$L(\\emptyset)$ = {} while $L(\\epsilon)$ = {$\\lambda$}.',
      '$L(\\emptyset)$ = {$\\lambda$} while $L(\\epsilon)$ = {}.',
      '$\\emptyset$ is a language, $\\epsilon$ is a string.' ],
    answer: 1,
    why: {
      0: 'The classic collapse of "no words" and "one empty word". {} has cardinality 0; {$\\lambda$} has cardinality 1. Compare: an empty box versus a box containing an empty bag.',
      2: 'The two are swapped. The mnemonic: $\\epsilon$ **is** the empty string as a piece of syntax, so its language contains it.',
      3: 'Both are regular **expressions**, i.e. syntax. $\\lambda$ is the string; $\\epsilon$ is the expression denoting {$\\lambda$}.' },
    explain: '$L(\\emptyset)$ = {} and $L(\\epsilon)$ = {$\\lambda$}. This is exactly why $\\emptyset \\cdot r \\doteq \\emptyset$ but $\\epsilon \\cdot r \\doteq r$.' },

  { id: 'q-rexsyn-2', concept: 'regex-syntax', level: 2,
    stem: 'How is $a + b \\cdot c^*$ parsed, given the lecture`s precedences?',
    choices: [
      '$(a+b) \\cdot (c^*)$',
      '$a + (b \\cdot (c^*))$',
      '$((a+b) \\cdot c)^*$',
      '$(a + (b \\cdot c))^*$' ],
    answer: 1,
    why: {
      0: 'Giving $+$ higher precedence than $\\cdot$. The notes fix the opposite order: star, then concatenation, then plus (mirroring power, times, plus in arithmetic).',
      2: 'Letting the postfix star scope over the whole expression. $^*$ has the **highest** precedence, so it binds only to the symbol immediately before it.',
      3: 'Same star error combined with the wrong precedence of $+$.' },
    explain: '$^*$ binds tightest, then $\\cdot$, then $+$ — so the expression is $a + (b \\cdot (c^*))$.' },

  { id: 'q-rexsem-1', concept: 'regex-sem', level: 2,
    stem: 'Over $\\Sigma$ = {a,b,c}, which language does $(b+c)^* \\cdot a \\cdot (b+c)^*$ denote?',
    choices: [
      'All strings containing at least one a.',
      'All strings containing exactly one a.',
      'All strings that begin or end with a.',
      'All strings over {b,c}, plus the string a.' ],
    answer: 1,
    why: {
      0: 'Reading the starred blocks as "anything". They range over {b,c} only, so no further a can be produced — the count is exactly one, not at least one.',
      2: 'Forgetting that the starred blocks may be empty **or** long. The a can sit anywhere, not only at the ends.',
      3: 'Forgetting that the two stars may generate non-empty strings around the a; e.g. `bab` is in the language.' },
    explain: 'The a in the middle is mandatory and the surrounding stars cannot produce another a, so the language is exactly the strings with **one** occurrence of a.' },

  { id: 'q-rexsem-2', concept: 'regex-sem', level: 2,
    stem: 'Over $\\Sigma$ = {a,b,c}: which regular expression denotes all strings of length **exactly** 2?',
    choices: [
      '$(a+b+c)^*$',
      '$(a+b+c) \\cdot (a+b+c)$',
      '$(a+b+c) \\cdot (a+b+c)^*$',
      '$(a \\cdot a) + (b \\cdot b) + (c \\cdot c)$' ],
    answer: 1,
    why: {
      0: 'The star gives **every** length including 0 — no length constraint at all.',
      2: 'This is the standard "at least one character" idiom, i.e. length $\\geq$ 1, not exactly 2.',
      3: 'Only the three doubled strings aa, bb, cc. A length-2 string need not repeat its character; ab is missing.' },
    explain: 'Concatenating two "any single character" choices forces exactly two characters, each freely chosen: 9 strings in total.' },

  { id: 'q-alg-1', concept: 'regex-algebra', level: 2,
    stem: 'Which simplification is **wrong**?',
    choices: [
      '$\\emptyset^* \\doteq \\epsilon$',
      '$\\epsilon^* \\doteq \\epsilon$',
      '$\\emptyset + r \\doteq \\emptyset$',
      '$(r^*)^* \\doteq r^*$' ],
    answer: 2,
    why: {
      0: 'This one is correct: {}$^*$ = {$\\lambda$} = $L(\\epsilon)$.',
      1: 'Correct: concatenating empty strings only ever gives the empty string.',
      3: 'Correct: a concatenation of concatenations of $r$-words is still a concatenation of $r$-words.' },
    explain: '$\\emptyset$ is the **neutral** element of $+$, not an absorbing one: $\\emptyset + r \\doteq r$. It absorbs under concatenation ($\\emptyset \\cdot r \\doteq \\emptyset$), which is where the confusion comes from.',
    hint: 'Compare with 0 in arithmetic: neutral for +, absorbing for $\\cdot$.' },

  { id: 'q-alg-2', concept: 'regex-algebra', level: 3,
    stem: 'What does $r_1 \\doteq r_2$ mean?',
    choices: [
      '$r_1$ and $r_2$ are the same string of symbols.',
      '$r_1$ can be rewritten into $r_2$ by the listed algebraic laws.',
      '$L(r_1)$ = $L(r_2)$.',
      '$r_1$ and $r_2$ have equally many operators.' ],
    answer: 2,
    why: {
      0: 'Syntactic identity. But $a+b$ and $b+a$ are different texts denoting the same language, and equivalence is about the language.',
      1: 'Provability by the laws is a **sufficient** criterion, not the definition. The definition is semantic; the notes decide it via emptiness of the symmetric difference, not by rewriting.',
      3: 'Size is irrelevant: $r$ and $r + r$ have different operator counts and are equivalent.' },
    explain: 'By definition $r_1 \\doteq r_2$ iff $L(r_1) = L(r_2)$ — equality of the **denoted languages**.' },

  { id: 'q-alg-3', concept: 'regex-algebra', level: 3,
    stem: 'Which expression is **not** equivalent to $r^*$?',
    choices: [
      '$(\\epsilon + r)^*$',
      '$\\epsilon + r^* \\cdot r$',
      '$r^* \\cdot r^*$',
      '$r \\cdot r^*$' ],
    answer: 3,
    why: {
      0: 'Equivalent — one of the listed laws. Adding the option of "nothing" under a star is free.',
      1: 'Equivalent — the unrolling law: zero repetitions, or some repetitions followed by one more.',
      2: 'Equivalent: splitting a repetition sequence into two halves loses nothing.' },
    explain: '$r \\cdot r^*$ forces **at least one** occurrence of $r$, so $\\lambda$ is missing unless $\\lambda \\in L(r)$. That is the standard "plus" operator $r^{+}$, not $r^*$.' },

  /* ================= u2 ================================================= */
  { id: 'q-scan-1', concept: 'scanner', level: 2,
    stem: 'In a scanner built with Python`s `re` module, why must keyword patterns be listed before the identifier pattern?',
    choices: [
      'Because `re` picks the longest match, and keywords are shorter.',
      'Because `re` picks the first alternative (left to right) that matches at the position.',
      'Because keywords are reserved words and cannot be matched by `[a-z]+`.',
      'Because the master pattern is alphabetically sorted.' ],
    answer: 1,
    why: {
      0: 'Assuming **maximal munch**. Some scanner generators do choose the longest alternative; Python`s `re` explicitly does not — it takes the first alternative that matches.',
      2: '`[a-z]+` matches `while` perfectly well. Nothing in the regex engine knows about reserved words; the ordering is the only defence.',
      3: 'The master pattern is a `|`-join in the order **you** wrote the pairs. Nothing sorts it.' },
    explain: 'The remark in the scanner chapter: `re` chooses the **first** matching alternative, so specific patterns must precede general ones. `re.findall(r"[0-9]|[1-9][0-9]*", "42")` returns two single digits for exactly this reason.' },

  { id: 'q-scan-2', concept: 'scanner', level: 1,
    stem: 'What is the role of the pseudo-token `MISMATCH` in the scanner?',
    choices: [
      'It matches any single character not already matched, so illegal input is reported.',
      'It matches whitespace so it can be discarded.',
      'It marks the end of the input.',
      'It matches tokens whose regular expressions overlap.' ],
    answer: 0,
    why: {
      1: 'That is `SKIP`. `MISMATCH` is the last-resort alternative that fires only when nothing else did.',
      2: 'End of input is handled by the loop, and in the parser by the EOF token `$`.',
      3: 'Overlap is resolved by rule **order**, not by a token class.' },
    explain: '`NEWLINE` counts lines, `SKIP` discards blanks and tabs, `MISMATCH` sits last and catches any character that no real token pattern accepted, turning silent skipping into a reported error.' },

  { id: 'q-dfa-1', concept: 'dfa', level: 1,
    stem: 'What is the signature of $\\delta$ in the lecture`s DFA definition?',
    choices: [
      '$\\delta: Q \\times \\Sigma \\to Q$',
      '$\\delta: Q \\times \\Sigma \\to Q \\cup$ {$\\Omega$}',
      '$\\delta: Q \\times (\\Sigma \\cup$ {$\\epsilon$}$) \\to Q$',
      '$\\delta: Q \\times \\Sigma \\to 2^{Q}$' ],
    answer: 1,
    why: {
      0: 'The totally-defined version found in many textbooks. Stroetmann allows the automaton to **die**, which is why the codomain has the extra element $\\Omega$; a total $\\delta$ is the special case called a *complete* DFA.',
      2: '$\\epsilon$-moves belong to the **NFA**. A deterministic automaton may not change state without reading a character.',
      3: 'Returning a set of states is the NFA signature. A DFA has at most one successor.' },
    explain: '$\\delta: Q \\times \\Sigma \\to Q \\cup$ {$\\Omega$}. $\\delta(q,c) = \\Omega$ means the DFA dies in $q$ on $c$; such transitions are simply omitted from the drawings.' },

  { id: 'q-dfa-2', concept: 'dfa', level: 2,
    stem: 'How do you turn a DFA into an equivalent **complete** DFA?',
    choices: [
      'Make every state accepting.',
      'Add a dead state, route all $\\Omega$-transitions to it, and loop it to itself on every character.',
      'Add an $\\epsilon$-transition from each state to the start state.',
      'Remove the states from which no accepting state is reachable.' ],
    answer: 1,
    why: {
      0: 'That changes the language to $\\Sigma^*$. Completeness is about **defined transitions**, not about acceptance.',
      2: 'A DFA has no $\\epsilon$-transitions at all, and this would also change the language.',
      3: 'That is trimming, a different (and optional) clean-up. It removes states; completion **adds** one.' },
    explain: 'Add the dead state (the skull), set $\\hat\\delta(q,c)$ = dead wherever $\\delta(q,c) = \\Omega$, and $\\hat\\delta$(dead, c) = dead — "there is no escape from death". The dead state is not accepting, so $L$ is unchanged.' },

  { id: 'q-dfa-3', concept: 'dfa', level: 3,
    stem: 'Why does a DFA for "the antepenultimate character is b" over {a,b} need 8 states?',
    choices: [
      'Because the regular expression has 8 operators.',
      'Because it must remember the last three characters, and $2^{3}$ = 8.',
      'Because it must count the characters read so far, up to 8.',
      'Because the subset construction always squares the state count.' ],
    answer: 1,
    why: {
      0: 'The size of the expression has no direct bearing on the DFA size; Thompson gives an NFA linear in the expression, but determinisation is what costs.',
      2: 'Counting **all** characters would need unboundedly many states, which a DFA does not have. It only needs a sliding window of width 3.',
      3: 'The subset construction gives at most $2^{|Q|}$ states, and only for an NFA input. Nothing is "always squared".' },
    explain: 'The decision needs the last three characters; there are $2^{3}$ = 8 such windows, and each must be distinguished — which is also why the NFA that merely *guesses* the right b gets away with 4 states.' },

  { id: 'q-dfarun-1', concept: 'dfa-run', level: 2,
    stem: 'DFA over {a,b}: $q_0$=0, $A$={1}, $\\delta(0,a)$=0, $\\delta(0,b)$=1, $\\delta(1,a)$=1, $\\delta(1,b)$=$\\Omega$. Which string is accepted?',
    choices: [ '`abab`', '`aabaa`', '`bb`', '`aaa`' ],
    answer: 1,
    why: {
      0: '`abab` dies: after 0-a->0-b->1-a->1 the final b has $\\delta(1,b) = \\Omega$. A second b is fatal.',
      2: 'Same death, immediately: 0-b->1 then b kills it. The language allows exactly one b.',
      3: 'No b at all, so the run ends in state 0, which is not accepting. $L$ = $a^* \\cdot b \\cdot a^*$ requires one b.' },
    explain: '$L(F)$ = $L(a^* \\cdot b \\cdot a^*)$: exactly one b, any number of a`s around it. `aabaa` fits.' },

  { id: 'q-dfarun-2', concept: 'dfa-run', level: 2,
    stem: 'When is $\\lambda \\in L(F)$ for a DFA $F$?',
    choices: [
      'Never — a DFA must read at least one character.',
      'Exactly when $q_0 \\in A$.',
      'Exactly when some accepting state is reachable.',
      'Exactly when $\\delta(q_0, c) \\in A$ for some character c.' ],
    answer: 1,
    why: {
      0: 'A wrong instinct. $\\delta^*(q, \\lambda)$ := $q$ is a legal (indeed the base) case of the definition.',
      2: 'That is the test for $L(F) \\neq$ {} (non-emptiness), not for membership of the empty string.',
      3: 'That is the condition for accepting some string of length **one**.' },
    explain: '$\\delta^*(q_0,\\lambda)$ = $q_0$, so $\\lambda$ is accepted iff the start state is itself accepting.' },

  { id: 'q-nfa-1', concept: 'nfa', level: 1,
    stem: 'An NFA has a computation on $w$ that dies. What follows?',
    choices: [
      '$w \\notin L(F)$.',
      'Nothing — $w \\in L(F)$ if **some** other computation accepts.',
      'The NFA is malformed.',
      '$w \\in L(F)$, because NFAs accept unless all paths are blocked before reading anything.' ],
    answer: 1,
    why: {
      0: 'Reading NFA acceptance universally instead of existentially. The notes` example: on `bbbbb` the NFA dies if it leaves state 0 too early, yet the string is accepted via a later choice.',
      2: 'Dying is normal and expected; $\\delta$ may legitimately return the empty set.',
      3: 'The condition is about **some** complete accepting run, not about the first step.' },
    explain: '$L(F)$ = {s | $\\exists p \\in A$: $\\langle q_0,s\\rangle \\leadsto^* \\langle p,\\lambda\\rangle$} — acceptance is existential over computations, so one failed guess proves nothing.' },

  { id: 'q-nfa-2', concept: 'nfa', level: 3,
    stem: 'Which statement about the power of NFAs is correct?',
    choices: [
      'NFAs recognise strictly more languages than DFAs, because of the $\\epsilon$-moves.',
      'NFAs and DFAs recognise exactly the same class of languages.',
      'NFAs are weaker, since they can die.',
      'NFAs recognise exactly the context-free languages.' ],
    answer: 1,
    why: {
      0: 'Confusing **conciseness** with **expressiveness**. The subset construction converts any NFA (with $\\epsilon$-moves) into an equivalent DFA; only the state count changes, possibly exponentially.',
      2: 'DFAs die too, via $\\Omega$. And dying is not a weakness — it is just rejection along one path.',
      3: 'Context-free languages need a **stack** (a pushdown automaton). $a^{k}b^{k}$ is context-free but not regular, so no NFA recognises it.' },
    explain: 'They are equivalent in power: `det(F)` accepts $L(F)$. NFAs buy smaller descriptions, not larger language classes — that is Kleene`s 1956 result in one direction.' },

  { id: 'q-ec-1', concept: 'eclosure', level: 2,
    stem: 'NFA with $\\epsilon$-edges $q_0 \\to q_1$, $q_1 \\to q_2$, and an `a`-edge $q_2 \\to q_3$. What is `ec(q_0)`?',
    choices: [
      '{q_1, q_2}',
      '{q_0, q_1, q_2}',
      '{q_0, q_1, q_2, q_3}',
      '{q_0}' ],
    answer: 1,
    why: {
      0: 'Forgetting the base case $q \\in$ `ec(q)`. The closure is reflexive: zero $\\epsilon$-moves count.',
      2: 'Confusing $\\epsilon$-closure with plain **reachability**. $q_3$ is reachable, but only by reading an `a` — the closure follows $\\epsilon$-edges only.',
      3: 'Forgetting the transitive step; the closure is a fixed point, so it keeps following $\\epsilon$-edges until nothing new appears.' },
    explain: '`ec(q_0)` = {q_0, q_1, q_2}: itself, plus everything reachable by $\\epsilon$-moves **alone**.' },

  { id: 'q-ec-2', concept: 'eclosure', level: 3,
    stem: 'How is $\\hat\\delta(q,c)$ defined in the subset construction?',
    choices: [
      '$\\hat\\delta(q,c)$ = $\\bigcup$ {`ec(p)` | $p \\in \\delta(q,c)$}',
      '$\\hat\\delta(q,c)$ = $\\delta($`ec(q)`$, c)$',
      '$\\hat\\delta(q,c)$ = `ec(q)` $\\cup\; \\delta(q,c)$',
      '$\\hat\\delta(q,c)$ = $\\delta(q,c)$' ],
    answer: 0,
    why: {
      1: 'Closing **before** reading. The notes are explicit: "the $\\epsilon$-transitions are done only after the character has been read". In the construction the argument set is already closed anyway.',
      2: 'Mixing the two: this keeps states that were never left, so it would accept strings that skip the character entirely.',
      3: 'Dropping the $\\epsilon$-closure altogether — then any $\\epsilon$-move after reading $c$ would be lost and the DFA would reject words the NFA accepts.' },
    explain: 'Read the character first, then take the $\\epsilon$-closure of every state you land in and union the results.' },

  { id: 'q-th-1', concept: 'thompson', level: 2,
    stem: 'Which invariant does **every** fragment $A(r)$ of the Thompson construction satisfy?',
    choices: [
      'It is deterministic.',
      'It has exactly one accepting state, with no transitions leaving it, and no transitions entering the start state.',
      'It has no $\\epsilon$-transitions.',
      'It has exactly two states.' ],
    answer: 1,
    why: {
      0: 'The construction produces an **NFA**; determinism is the job of the subsequent subset construction.',
      2: '$\\epsilon$-transitions are the glue of the whole construction — $A(\\epsilon)$, the `+` case and the `*` case all add them.',
      3: 'Only the three base fragments have two states; composites grow.' },
    explain: 'One entry, one exit, and both are "sealed" — no edge into the start, none out of the accepting state. That is what makes the composition rules safe to apply blindly.' },

  { id: 'q-th-2', concept: 'thompson', level: 3,
    stem: 'In $A(r^*)$, why may you not identify the new start $q_0$ with $q_1$ and the new accept $q_3$ with $q_2$?',
    choices: [
      'Because the automaton would then have an even number of states.',
      'Because the resulting NFA would accept strings outside $L(r^*)$.',
      'Because $\\epsilon$-closures could no longer be computed.',
      'You may — the notes recommend it to save states.' ],
    answer: 1,
    why: {
      0: 'State parity is meaningless here.',
      2: '$\\epsilon$-closure is defined for any NFA whatsoever; computability is not the issue.',
      3: 'The notes recommend merging for **concatenation** (identifying $q_2$ with $q_3$ there), and flag the star case in red as **incorrect**. Do not transfer the shortcut.' },
    explain: 'Merging entry and exit in the star case lets the automaton re-enter the body from the exit point, producing interleavings that are not concatenations of $r$-words.' },

  { id: 'q-sub-1', concept: 'subset', level: 2,
    stem: 'What is the start state of `det(F)`?',
    choices: [ '{q_0}', '`ec(q_0)`', '$Q$', '{}' ],
    answer: 1,
    why: {
      0: 'Forgetting that the NFA may take $\\epsilon$-moves **before** reading anything, so all of `ec(q_0)` is live from the start.',
      2: 'The full state set is the codomain of the construction, not the start. Most subsets are unreachable.',
      3: 'The empty set is the dead state of `det(F)` — reached when the NFA has no live states left.' },
    explain: '`det(F)` = $\\langle 2^{Q}, \\Sigma, \\Delta,$ `ec(q_0)`$, \\hat{A}\\rangle$: the start state is the $\\epsilon$-closure of the NFA start state.' },

  { id: 'q-sub-2', concept: 'subset', level: 2,
    stem: 'A set $M$ of NFA states is an accepting state of `det(F)` exactly when:',
    choices: [
      '$M \\subseteq A$',
      '$M \\cap A \\neq$ {}',
      '$M$ = $A$',
      '$M$ contains the start state and an accepting state.' ],
    answer: 1,
    why: {
      0: 'Reading NFA acceptance universally. Requiring **all** members to be accepting would reject words for which only one guess succeeds — but one succeeding guess is exactly what acceptance means.',
      2: 'Far too strong; it would make almost no state accepting.',
      3: 'The start state is irrelevant to acceptance. It happens to be in every reachable subset in some examples, which is a coincidence of those automata.' },
    explain: '$\\hat{A}$ := {M | M $\\cap$ A $\\neq$ {}} — one accepting member is enough, because the NFA accepts if **some** path ends accepting.' },

  { id: 'q-sub-3', concept: 'subset', level: 3,
    stem: 'Why does the subset construction terminate?',
    choices: [
      'Because $\\epsilon$-closures are always finite.',
      'Because there are only finitely many subsets of the finite set $Q$, so no new state can be produced forever.',
      'Because the NFA has no cycles.',
      'Because each step strictly decreases the number of live states.' ],
    answer: 1,
    why: {
      0: 'True but insufficient: finitely many closures do not by themselves bound the number of **distinct subsets** the search enumerates. The bound on $2^{Q}$ is what matters.',
      2: 'NFAs routinely have cycles — that is how they recognise starred languages. The construction handles them fine.',
      3: 'Sets grow and shrink freely as characters are read; no such monotonicity exists.' },
    explain: 'The reachable states of `det(F)` live in $2^{Q}$, which has $2^{|Q|}$ elements. The worklist can add each at most once, so the search halts.' },

  { id: 'q-sub-4', concept: 'subset', level: 3,
    stem: 'The 4-state NFA for $(a+b)^* b(a+b)(a+b)$ determinises to 8 states rather than $2^{4}$ = 16. Why?',
    choices: [
      'Because the unreachable states were minimised away afterwards.',
      'Because state 0 has a transition to itself on every character, so every reachable set contains 0.',
      'Because the NFA has no $\\epsilon$-transitions.',
      'Because the subset construction only ever produces $2^{n-1}$ states.' ],
    answer: 1,
    why: {
      0: 'Minimisation is a separate, later step. These 8 states are simply the only ones **reachable**; the notes compute them one by one.',
      2: 'Absence of $\\epsilon$-moves simplifies `ec` to the identity but says nothing about how many subsets are reachable.',
      3: 'No such formula exists. The $2^{n}$ bound is tight for other automata.' },
    explain: 'No matter what is read, the NFA may stay in state 0, so 0 is in every reachable subset — exactly half of $2^{Q}$ survives.' },

  { id: 'q-min-1', concept: 'minimize', level: 2,
    stem: 'Two states $p_1, p_2$ of a DFA are **separable** iff:',
    choices: [
      'They have different outgoing transitions.',
      'There is a string $s$ with $\\delta^*(p_1,s) \\in A$ and $\\delta^*(p_2,s) \\notin A$ (or vice versa).',
      'Exactly one of them is accepting.',
      'They are not reachable from each other.' ],
    answer: 1,
    why: {
      0: 'Different transition **targets** do not imply separability: the targets may themselves be equivalent. That is the whole reason the algorithm must iterate instead of comparing locally.',
      2: 'That is the **first round** of the algorithm (separation by $s = \\lambda$), not the definition. Two non-accepting states can still be separable via a longer string.',
      3: 'Mutual reachability is irrelevant to which language a state recognises.' },
    explain: 'Separable = some string distinguishes them by acceptance. States that are **not** separable are equivalent and get merged into one class $[q]_\\sim$.' },

  { id: 'q-min-2', concept: 'minimize', level: 2,
    stem: 'Which preconditions does the minimisation algorithm assume?',
    choices: [
      'The automaton is an NFA without $\\epsilon$-transitions.',
      'The DFA is complete and all its states are reachable.',
      'The DFA has exactly one accepting state.',
      'The alphabet has at most two characters.' ],
    answer: 1,
    why: {
      0: 'Minimisation as presented is defined for **DFAs**. An NFA must be determinised first.',
      2: 'Nothing restricts $|A|$; a minimal DFA often has several accepting states.',
      3: 'The alphabet size is irrelevant; it only affects how many transitions each round inspects.' },
    explain: 'Completeness makes $\\delta^*$ total (no $\\Omega$ cases to reason about), and unreachable states are deleted beforehand because they can never affect $L(F)$.' },

  { id: 'q-min-3', concept: 'minimize', level: 3,
    stem: 'A 5-state complete DFA has $A$ = {q_3, q_4}. Which pairs go into $V$ in the **first** round?',
    choices: [
      'All pairs of distinct states.',
      'Exactly the pairs with one state in $A$ and one outside: (q_0,q_3), (q_0,q_4), (q_1,q_3), (q_1,q_4), (q_2,q_3), (q_2,q_4).',
      'Exactly (q_3,q_4).',
      'Only pairs whose transitions on some character differ.' ],
    answer: 1,
    why: {
      0: 'Then everything would be separable and no merging could ever happen — the algorithm starts pessimistically only about acceptance.',
      2: 'The two accepting states are **not** separated by $\\lambda$; they may well turn out equivalent, as $q_3 \\sim q_4$ does in the lecture example.',
      3: 'That is the **iteration** step, applied in later rounds once some pairs are already known separable.' },
    explain: 'Round one separates accepting from non-accepting states — the string $s = \\lambda$ already distinguishes them. Later rounds push separability backwards through $\\delta$.' },

  /* ================= u3 ================================================= */
  { id: 'q-cl-1', concept: 'closure-props', level: 2,
    stem: 'To build an automaton for the complement of $L$, you swap accepting and non-accepting states. What must hold first?',
    choices: [
      'The automaton must be minimal.',
      'The automaton must be a **complete DFA**.',
      'The automaton must have exactly one accepting state.',
      'Nothing — swapping works for any finite automaton.' ],
    answer: 1,
    why: {
      0: 'Minimality is nice but irrelevant. Swapping works on any complete DFA, minimal or not.',
      2: 'That is the Thompson invariant, about NFAs built from regular expressions, and has nothing to do with complementation.',
      3: 'The classic trap. For an **NFA** swapping is simply wrong: a word may have both an accepting and a rejecting path, so it would end up in both a language and its complement. And without completeness, a word that kills the automaton would be in neither.' },
    explain: '$\\overline{\\mathtt{det}(F)}$ = $\\langle Q, \\Sigma, \\delta, q_0, Q \\setminus A\\rangle$ — the proof determinises **and** completes first, then swaps.' },

  { id: 'q-cl-2', concept: 'closure-props', level: 1,
    stem: 'Which operation are regular languages **not** shown to be closed under in this lecture?',
    choices: [ 'Reversal', 'Intersection', 'Complement', 'None — they are closed under all three' ],
    answer: 3,
    why: {
      0: 'Reversal is an exercise in the notes, provable via $(L_1 L_2)^{R}$ = $L_2^{R} L_1^{R}$ and $(L_1^*)^{R}$ = $(L_1^{R})^*$.',
      1: 'Intersection is proved via the product automaton running both DFAs in lockstep.',
      2: 'Complement is proved by completing, determinising and swapping the accepting states.' },
    explain: 'Regular languages are closed under union, intersection, complement, difference, concatenation, star and reversal — the full Boolean algebra plus the regex operations.' },

  { id: 'q-prod-1', concept: 'product', level: 2,
    stem: 'In the product automaton for $L_1 \\cap L_2$, what is the set of accepting states?',
    choices: [ '$A_1 \\times A_2$', '$(A_1 \\times Q_2) \\cup (Q_1 \\times A_2)$', '$A_1 \\cup A_2$', '$Q_1 \\times Q_2 \\setminus (A_1 \\times A_2)$' ],
    answer: 0,
    why: {
      1: 'That is the accepting set for the **union**, not the intersection. Both constructions share everything else; only $A$ differs.',
      2: 'A type error: states of the product are **pairs**, so $A$ must be a set of pairs.',
      3: 'That is the complement of the intersection.' },
    explain: '$F$ = $\\langle Q_1 \\times Q_2, \\Sigma, \\delta, \\langle q_1,q_2\\rangle, A_1 \\times A_2\\rangle$: accept when **both** components accept.' },

  { id: 'q-prod-2', concept: 'product', level: 2,
    stem: 'DFAs $F_1$ (3 states) and $F_2$ (5 states). How many states does the product automaton have at most?',
    choices: [ '8', '15', '125', '32' ],
    answer: 1,
    why: {
      0: 'Adding instead of multiplying. The product state is a **pair**, so the counts multiply.',
      2: 'Cubing has no basis here.',
      3: 'Confusing the product construction with the exponential blow-up of the **subset** construction.' },
    explain: '$|Q_1 \\times Q_2|$ = 3 $\\cdot$ 5 = 15, usually with far fewer reachable. Determinisation is exponential; the product is only quadratic.' },

  { id: 'q-empty-1', concept: 'emptiness', level: 2,
    stem: 'How does the lecture decide $L(F)$ = {} for a DFA $F$?',
    choices: [
      'By simulating $F$ on all strings up to length $|Q|$.',
      'By computing the states reachable from $q_0$ and testing $R \\cap A$ = {}.',
      'By minimising $F$ and checking whether one state remains.',
      'By checking whether $F$ has a cycle.' ],
    answer: 1,
    why: {
      0: 'Exponentially many strings. Reachability answers the same question in linear time; the pumping-style length bound is unnecessary here.',
      2: 'A minimal DFA for {} does have one state, but minimisation is a far more expensive route, and a one-state DFA may also accept $\\Sigma^*$.',
      3: 'Cycles indicate an infinite language, not a non-empty one. `a` has no cycle and is non-empty.' },
    explain: 'Read the DFA as a directed graph: $L(F) = $ {} iff no accepting state is reachable from $q_0$.' },

  { id: 'q-empty-2', concept: 'emptiness', level: 3,
    stem: 'How is $r_1 \\doteq r_2$ decided?',
    choices: [
      'By checking that $L(r_1) \\setminus L(r_2)$ is empty.',
      'By checking that **both** $L(r_1)\\setminus L(r_2)$ and $L(r_2)\\setminus L(r_1)$ are empty.',
      'By rewriting $r_1$ into $r_2$ with the algebraic laws.',
      'It is undecidable.' ],
    answer: 1,
    why: {
      0: 'One inclusion only. $L(a) \\setminus L(a+b)$ is empty although $a \\not\\doteq a+b$; set equality needs both directions.',
      2: 'Rewriting is a **sound** but not obviously complete procedure and gives no decision algorithm; the notes give a genuine decision procedure instead.',
      3: 'Very much decidable — that is the theorem of the section. Ambiguity of a CFG is the undecidable problem; do not transfer it.' },
    explain: '$L_1 = L_2$ iff both set differences are empty. Both differences are regular (complement + intersection), so each reduces to a reachability test.' },

  { id: 'q-pump-1', concept: 'pumping', level: 1,
    stem: 'Which conditions does the Pumping Lemma place on the split $s = uvw$?',
    choices: [
      '$u \\neq \\lambda$, $|vw| \\leq n$, and $uv^{h}w \\in L$ for all $h \\geq 1$.',
      '$v \\neq \\lambda$, $|uv| \\leq n$, and $uv^{h}w \\in L$ for all $h \\in$ N.',
      '$v \\neq \\lambda$, $|v| \\geq n$, and $uv^{h}w \\in L$ for all $h \\in$ N.',
      '$w \\neq \\lambda$, $|uv| \\leq n$, and $uvw^{h} \\in L$ for all $h \\in$ N.' ],
    answer: 1,
    why: {
      0: 'Two errors: it is $v$ (the pumped part) that must be non-empty, and the bound is on the **prefix** $|uv|$. Also $h$ ranges over all of N, so $h = 0$ is allowed — and pumping *down* is usually the easiest contradiction.',
      2: 'The bound goes the wrong way. $|uv| \\leq n$ is what forces the pumped block to lie inside the first $n$ characters — the key lever in the $a^{k}b^{k}$ proof.',
      3: 'The pumped block is $v$, the **middle**, not the suffix. The middle is where the repeated state occurs.' },
    explain: 'Exactly: $s = uvw$ with $v \\neq \\lambda$, $|uv| \\leq n$, and $\\forall h \\in$ N: $uv^{h}w \\in L$.' },

  { id: 'q-pump-2', concept: 'pumping', level: 3,
    stem: 'What can you conclude if a language $L$ satisfies the pumping property?',
    choices: [
      '$L$ is regular.',
      'Nothing about regularity — the implication only runs the other way.',
      '$L$ is context-free but perhaps not regular.',
      '$L$ is finite.' ],
    answer: 1,
    why: {
      0: 'Affirming the consequent. The lemma says regular $\\Rightarrow$ pumpable; non-regular languages satisfying the pumping property exist, so it is not a characterisation.',
      2: 'A different lemma (the pumping lemma for context-free languages) governs that class; this one says nothing about it.',
      3: 'Every infinite regular language is pumpable, so pumpability certainly does not imply finiteness.' },
    explain: 'The lemma is used only in its **contrapositive**: if the pumping property fails, the language is not regular. It can never certify regularity.' },

  { id: 'q-pump-3', concept: 'pumping', level: 3,
    stem: 'In the proof, where does the number $n$ come from?',
    choices: [
      'The length of the shortest word of $L$.',
      'The number of states of a DFA accepting $L$.',
      'The number of characters of $\\Sigma$.',
      'The size of the regular expression describing $L$.' ],
    answer: 1,
    why: {
      0: 'Unrelated. The pumping constant bounds how long a word must be before a **state repeats**, not the shortest accepted word.',
      2: 'The alphabet size bounds the branching, not the length after which a state must recur.',
      3: 'Expression size bounds the NFA size (Thompson), but the argument needs the **DFA** state count directly.' },
    explain: '$n$ := `card(Q)`. Reading $n$ characters visits $n+1$ states, so by the pigeonhole principle some state $q_k = q_l$ with $k<l$ repeats — and that cycle is the pumped block $v$.' },

  { id: 'q-nonreg-1', concept: 'nonregular', level: 3,
    stem: 'In a non-regularity proof, who chooses what?',
    choices: [
      'You choose $n$ and the split; the adversary chooses $s$ and $h$.',
      'The adversary chooses $n$ and the split; you choose $s$ and $h$.',
      'You choose everything.',
      'The adversary chooses everything.' ],
    answer: 1,
    why: {
      0: 'Exactly backwards. $n$ is existentially quantified in the lemma, so it is handed to you; the split is existential **inside** the lemma, so you must beat **every** legal split.',
      2: 'If you could pick the split, you could always pick a convenient one and "disprove" regularity of regular languages.',
      3: 'Then no proof could ever succeed. The word $s$ and the exponent $h$ are yours.' },
    explain: 'The quantifier structure is $\\exists n \\forall s \\exists u,v,w \\forall h$. Negating it: the adversary supplies $n$ and the split; you supply $s$ and $h$.' },

  { id: 'q-nonreg-2', concept: 'nonregular', level: 3,
    stem: 'Proving {$a^{k}b^{k}$} non-regular with $s = a^{n}b^{n}$: why must $v$ consist of `a`s only?',
    choices: [
      'Because $v \\neq \\lambda$.',
      'Because $|uv| \\leq n$, so $uv$ is a prefix of $a^{n}$.',
      'Because $v$ is the middle of $s$ and the middle of $a^{n}b^{n}$ is the boundary.',
      'Because you may choose the split yourself.' ],
    answer: 1,
    why: {
      0: 'Non-emptiness says $v$ contains **something**, not what. It is needed, but it is not the reason $v$ avoids the b block.',
      2: '"Middle" is not a constraint of the lemma; $v$ may sit anywhere inside the first $n$ characters.',
      3: 'You may not choose the split — that is the adversary`s move, which is why the $|uv| \\leq n$ clause matters so much.' },
    explain: '$|uv| \\leq n$ confines $uv$ to the first $n$ characters, all of which are `a`. So $v = a^{k}$ with $k > 0$; taking $h = 0$ then removes `a`s without removing `b`s and breaks the balance.' },

  { id: 'q-nonreg-3', concept: 'nonregular', level: 2,
    stem: 'Which language **is** regular?',
    choices: [
      '{$a^{k}b^{k}$ | k $\\in$ N}',
      '{w $\\in$ {a,b}$^*$ | count(w,a) = count(w,b)}',
      '{w $\\in$ {a,b}$^*$ | count(w,a) is even}',
      '{$(^{n})^{n}$ | n $\\in$ N}' ],
    answer: 2,
    why: {
      0: 'The textbook non-regular language: pumping $a^{n}b^{n}$ with $h=0$ unbalances it.',
      1: 'Same proof works verbatim on $a^{n}b^{n}$ — equal counts need unbounded memory.',
      3: 'Balanced parentheses: the same argument again. This is why regular expressions cannot describe programming-language syntax.' },
    explain: 'Counting **modulo 2** needs only two states, so it is regular. Counting **without a bound** needs unbounded memory and is not.' },

  /* ================= u4 ================================================= */
  { id: 'q-cfg-1', concept: 'cfg', level: 1,
    stem: 'A context-free grammar is a quadruple $\\langle V,T,R,S\\rangle$. What is $R$?',
    choices: [
      'A subset of $(V \\cup T)^* \\times (V \\cup T)^*$.',
      'A subset of $V \\times (V \\cup T)^*$.',
      'A subset of $V \\times T^*$.',
      'A subset of $V \\times V$.' ],
    answer: 1,
    why: {
      0: 'That is the general (unrestricted / context-**sensitive**) rule shape. "Context-free" means precisely that the left-hand side is a single variable, replaceable regardless of context.',
      2: 'Right-hand sides may certainly contain variables — otherwise no recursion and only finite languages.',
      3: 'That would forbid terminals on the right entirely; no string could ever be derived.' },
    explain: '$R \\subseteq V \\times (V \\cup T)^*$: one variable on the left, any mix of variables and terminals on the right.' },

  { id: 'q-cfg-2', concept: 'cfg', level: 2,
    stem: 'Grammar: $s \\to$ `(` $s$ `)` | $\\lambda$. Which string is **not** in $L(G)$?',
    choices: [ '$\\lambda$', '`()`', '`(())`', '`()()`' ],
    answer: 3,
    why: {
      0: '$\\lambda$ comes from the second alternative in one step.',
      1: '`()` = one application of the first rule, then $\\lambda$.',
      2: '`(())` = two nestings, then $\\lambda$.' },
    explain: 'The grammar generates only **nested** pairs $($^{n}$)$^{n}$. Concatenating two groups needs a rule like $s \\to s\\,s$, which is not there.' },

  { id: 'q-der-1', concept: 'derivation', level: 1,
    stem: 'What is a **rightmost** derivation, and which parser produces one?',
    choices: [
      'Always rewrite the rightmost variable; a top-down parser produces it.',
      'Always rewrite the rightmost variable; an LR parser produces it **in reverse**.',
      'Always rewrite the rightmost terminal; an LR parser produces it.',
      'Rewrite variables right to left; an Earley parser produces it.' ],
    answer: 1,
    why: {
      0: 'Top-down / recursive-descent parsers produce **leftmost** derivations, forwards from the start symbol.',
      2: 'Terminals are never rewritten — only variables are. A derivation step replaces a variable.',
      3: 'Earley maintains chart sets and is not committed to either order; the direction is not what defines it.' },
    explain: 'The R in "LR" stands for **reverse rightmost derivation**: the bottom-up reductions, read backwards, are a rightmost derivation.' },

  { id: 'q-der-2', concept: 'derivation', level: 2,
    stem: 'A string has two different leftmost derivations under $G$. What follows?',
    choices: [
      'Nothing — leftmost derivations are never unique.',
      '$G$ is ambiguous.',
      '$G$ is left-recursive.',
      '$G$ is not LL(1) but may still be unambiguous.' ],
    answer: 1,
    why: {
      0: 'The leftmost derivation is in bijection with the parse tree, so two of them mean two trees.',
      2: 'Left recursion is about a rule $a \\to a\\beta$; it is orthogonal — plenty of left-recursive grammars are unambiguous (the layered expression grammar, for instance).',
      3: 'Failing LL(1) is weaker than being ambiguous, but two *distinct leftmost* derivations already force two distinct trees.' },
    explain: 'Each parse tree corresponds to exactly one leftmost derivation, so two leftmost derivations = two trees = ambiguity. Two derivations *in general* (mixing orders) would prove nothing.' },

  { id: 'q-pt-1', concept: 'parse-tree', level: 1,
    stem: 'When may a **leaf** of a parse tree be labelled with a variable $a$?',
    choices: [
      'Never — leaves carry terminals.',
      'Only if the grammar contains a rule $a \\to \\lambda$.',
      'Only if $a$ is the start symbol.',
      'Always, whenever the parse is incomplete.' ],
    answer: 1,
    why: {
      0: 'The usual simplification, but the notes allow it precisely for $\\lambda$-rules: the node has no children because the right-hand side is empty.',
      2: 'The start symbol has nothing to do with it; any $\\lambda$-generating variable can appear as a leaf.',
      3: 'A parse tree is a completed object; "incomplete" trees are not parse trees.' },
    explain: 'The definition: a leaf labelled with variable $a$ is legal iff $a \\to \\lambda$ is a rule — the node is a rule application with an empty right-hand side.' },

  { id: 'q-amb-1', concept: 'ambiguity', level: 2,
    stem: 'A grammar is **ambiguous** when:',
    choices: [
      'Some string has two different derivations.',
      'Some string has two structurally different parse trees.',
      'Some variable has two alternatives.',
      'The parser generator reports a conflict.' ],
    answer: 1,
    why: {
      0: 'Too weak. `2*3+4` has many derivations differing only in the **order** of independent rewrites, all yielding one tree. Trees are the invariant.',
      2: 'Alternatives are entirely normal — every interesting grammar has them.',
      3: 'Conflicts and ambiguity are different notions. An unambiguous grammar can have conflicts (look-ahead and mysterious conflicts), which is exactly why LR(1) and LALR are distinguished.' },
    explain: 'Ambiguity = two distinct parse trees for one string. And since ambiguity is equivalent to Post`s correspondence problem, it is **undecidable** in general.' },

  { id: 'q-amb-2', concept: 'ambiguity', level: 3,
    stem: 'Which statement is correct?',
    choices: [
      'Every ambiguous grammar has at least one conflict in its SLR table.',
      'Every grammar with an SLR conflict is ambiguous.',
      'Ambiguity of a context-free grammar is decidable.',
      'An ambiguous grammar can still be LALR(1) if the conflicts are resolved by shifting.' ],
    answer: 0,
    why: {
      1: 'The converse fails. An unambiguous grammar can still be non-SLR — the notes` grammar $s \\to a$`x`$a$`y` | $b$`y`$b$`x` with $a,b \\to \\lambda$ is unambiguous but has a reduce-reduce conflict.',
      2: 'Undecidable: equivalent to Post`s correspondence problem.',
      3: 'Lark will happily **build** a parser by shifting, but the grammar is still not LALR(1) — the generated parser simply accepts one reading and silently drops the other.' },
    explain: 'Every SLR (and LALR) grammar is unambiguous, so an ambiguous grammar must produce a conflict. The implication runs only that way.' },

  { id: 'q-prec-1', concept: 'precedence', level: 2,
    stem: 'How does Lark resolve a shift-reduce conflict?',
    choices: [
      'By the declared operator precedence.',
      'Always in favour of **shifting**.',
      'Always in favour of **reducing**.',
      'By preferring the rule listed first in the grammar.' ],
    answer: 1,
    why: {
      0: 'The notes state it in a box: there is **no way** to declare operator precedence in Lark, and no way to influence an individual conflict.',
      2: 'That is what some other tools do for dangling-else-like cases; Lark does the opposite.',
      3: 'Rule order decides **reduce-reduce** conflicts in many tools, not shift-reduce ones.' },
    explain: 'Every shift-reduce conflict is resolved by shifting. The consequence is that all operators behave as if they had equal precedence and were right associative.' },

  { id: 'q-prec-2', concept: 'precedence', level: 2,
    stem: 'Why does an un-layered Lark grammar parse `1*2+3` as `1*(2+3)`?',
    choices: [
      'Because `+` has higher precedence than `*` by default.',
      'Because shift always wins, so every operator behaves as right associative with equal precedence.',
      'Because Lark parses expressions right to left.',
      'Because `NUMBER` is matched greedily.' ],
    answer: 1,
    why: {
      0: 'Lark has **no** default precedences at all. The behaviour comes from the conflict-resolution policy, not from a precedence table.',
      2: 'The input is scanned strictly left to right (the L in LALR).',
      3: 'Token greediness concerns the scanner and cannot change the shape of the parse tree.' },
    explain: 'Preferring shift means "keep collecting" — the behaviour of a right-associative operator, so `*` waits and `+` is absorbed into its right operand.' },

  { id: 'q-prec-3', concept: 'precedence', level: 2,
    stem: 'Which rule shape encodes a **right-associative** operator at precedence level $n$?',
    choices: [
      '$v_n \\to v_n\; o\; v_{n+1}$',
      '$v_n \\to v_{n+1}\; o\; v_n$',
      '$v_n \\to v_{n+1}\; o\; v_{n+1}$',
      '$v_n \\to v_n\; o\; v_n$' ],
    answer: 1,
    why: {
      0: 'Left recursion = **left** associativity (the shape used for `+`, `-`, `*`, `/`).',
      2: 'No recursion at all = **non**-associative: `a o b o c` is then simply a syntax error.',
      3: 'Recursion on both sides is exactly the ambiguous shape that caused the conflict in the first place.' },
    explain: 'Right associativity = right recursion: `?fact : atom "^" fact | atom` makes `2^3^4` parse as `2^(3^4)`.' },

  { id: 'q-td-1', concept: 'topdown', level: 2,
    stem: 'Why can a recursive-descent parser not handle a rule $a \\to a\\,\\beta$?',
    choices: [
      'Because $\\beta$ might be empty.',
      'Because the function for $a$ calls itself without consuming input — infinite recursion.',
      'Because the grammar becomes ambiguous.',
      'Because First($a$) would then be empty.' ],
    answer: 1,
    why: {
      0: 'Emptiness of $\\beta$ is a separate nuisance; the loop happens even with a non-empty $\\beta$, because the recursive call is the **first** thing attempted.',
      2: 'Left recursion does not imply ambiguity: the layered expression grammar is left-recursive **and** unambiguous.',
      3: 'First($a$) is computed by a fixed-point iteration that copes with left recursion perfectly well; it is the *parsing strategy* that breaks.' },
    explain: 'To parse an $a$ the parser would first parse an $a$, at the same input position, forever. Bottom-up parsers have no such problem — they love left recursion.' },

  { id: 'q-td-2', concept: 'topdown', level: 2,
    stem: 'How does EBNF help a top-down parser?',
    choices: [
      'It makes the grammar unambiguous.',
      'It replaces left recursion by iteration (`*`, `+`), which a loop can implement directly.',
      'It increases the expressive power beyond context-free.',
      'It removes the need for a scanner.' ],
    answer: 1,
    why: {
      0: 'EBNF changes the notation, not the ambiguity. An ambiguous grammar stays ambiguous.',
      2: 'EBNF grammars have exactly the same expressive power as context-free grammars; the notes say so explicitly.',
      3: 'Scanning is an orthogonal phase.' },
    explain: '$v \\to \\lambda$ | $w\\,v$ becomes $v \\to w^*$: a `while` loop instead of a recursive call, and a flat list of children instead of a right-leaning chain.' },

  /* ================= u5 ================================================= */
  { id: 'q-ear-1', concept: 'earley', level: 1,
    stem: 'In the Earley object $\\langle a \\to \\beta \\bullet \\gamma, k\\rangle \\in Q_j$, what does $k$ record?',
    choices: [
      'The number of the grammar rule used.',
      'The input position at which the attempt to parse this $a$ began.',
      'The number of tokens still to read.',
      'The length of $\\beta$.' ],
    answer: 1,
    why: {
      0: 'The rule is already written out in the item itself; $k$ is a **position**, an index into the input.',
      2: 'That would be $n - j$, and it is not stored.',
      3: 'The dot already shows how much of the right-hand side is matched; $k$ says *where in the input* the match started, which is what completion needs.' },
    explain: '$k$ is the origin position: $\\beta \\Rightarrow^* x_{k+1} \\cdots x_j$. Completion uses it to find the waiting items in $Q_k$.' },

  { id: 'q-ear-2', concept: 'earley', level: 2,
    stem: 'Which Earley operation adds items to a **different** set than the one being processed?',
    choices: [ 'Prediction', 'Completion', 'Reading', 'All three' ],
    answer: 2,
    why: {
      0: 'Prediction adds $\\langle c \\to \\bullet\\gamma, j\\rangle$ to $Q_j$ — the same set.',
      1: 'Completion adds to $Q_i$, the set being processed; it only **reads** from $Q_j$.',
      3: 'Only reading moves forward, which is precisely why prediction and completion must be iterated to a fixed point within $Q_i$ first.' },
    explain: 'Reading consumes the token $x_{j+1}$ and puts the advanced item into $Q_{j+1}$. Prediction and completion stay inside $Q_j$ — hence the inner fixed-point loop.' },

  { id: 'q-ear-3', concept: 'earley', level: 3,
    stem: 'Which is the correct complexity picture for Earley`s algorithm?',
    choices: [
      'Always $O(n^{3})$, like CYK.',
      '$O(n^{3})$ in general, $O(n^{2})$ if unambiguous, linear for LR(1) and LL(k) grammars.',
      'Always linear.',
      '$O(2^{n})$ in the worst case.' ],
    answer: 1,
    why: {
      0: 'That is **CYK**, which also requires Chomsky normal form. Earley adapts to the grammar and does better on the grammars people actually write.',
      2: 'Linear only for the well-behaved classes; a genuinely ambiguous grammar costs cubic time.',
      3: 'The chart has $O(n^{2})$ items, so no exponential blow-up is possible.' },
    explain: 'Earley is cubic in general, quadratic for unambiguous grammars, and linear for LL(k) and LR(1) — and it needs no normal form, which is why it is usable in practice.' },

  { id: 'q-ear-4', concept: 'earley', level: 3,
    stem: 'Which LR notion is Earley **prediction** the exact analogue of?',
    choices: [ '`goto`', '`closure`', '`Follow`', 'The `action` table' ],
    answer: 1,
    why: {
      0: '`goto` shifts the dot over a symbol — that is Earley **reading** (for terminals) or completion (for variables).',
      2: '`Follow` is a global fixed-point over the grammar, not an operation on a state.',
      3: 'The action table is the compiled decision; Earley makes its decisions at run time and never builds one.' },
    explain: 'The notes remark on it explicitly: computing `closure` of a set of marked rules **is** the prediction operation, with the input position dropped.' },

  { id: 'q-sr-1', concept: 'shiftreduce', level: 1,
    stem: 'Which invariant links the two stacks of a shift-reduce parser?',
    choices: [
      '`length(States)` = `length(Symbols)`',
      '`length(States)` = `length(Symbols)` + 1',
      '`length(Symbols)` = `length(Tokens)`',
      'No relation; they are independent.' ],
    answer: 1,
    why: {
      0: 'Off by one: the start state $q_0$ sits on the state stack from the beginning, before any symbol exists.',
      2: '`Tokens` is the **unread** input; it shrinks as `Symbols` grows, but there is no equality.',
      3: 'They move in lockstep — each shift pushes onto both, each reduce pops the same number from both.' },
    explain: '`States` = [q_0, q_1, ..., q_m] and `Symbols` = [X_1, ..., X_m]: exactly one more state than symbols.' },

  { id: 'q-sr-2', concept: 'shiftreduce', level: 2,
    stem: 'Configuration $q_0 \\ldots q_m$ | $X_1 \\ldots X_m$ | $t_{k+1} \\ldots$ and `action`$(q_m, t_{k+1})$ = $\\langle$reduce, $a \\to X_{m-l}\\cdots X_m\\rangle$. What happens to the input?',
    choices: [
      'The token $t_{k+1}$ is consumed.',
      'The input is unchanged.',
      'The input is pushed back by $l$ tokens.',
      '$l+1$ tokens are consumed.' ],
    answer: 1,
    why: {
      0: 'That is a **shift**. On a reduce, $t_{k+1}$ is only the lookahead used to choose the action; it stays put.',
      2: 'Nothing is ever pushed back — an LR parser never backtracks. That is its whole selling point.',
      3: 'The $l+1$ symbols come off the **stacks**, not off the input.' },
    explain: 'A reduce pops $l+1$ symbols and states, pushes $a$ and `goto`$(q_{m-l-1}, a)$, and leaves the token stream untouched.' },

  { id: 'q-item-1', concept: 'lr-items', level: 1,
    stem: 'What does the marked rule $a \\to \\beta \\bullet \\gamma$ mean?',
    choices: [
      'The parser has read $\\gamma$ and expects $\\beta$.',
      'The parser is parsing an $a$ with the rule $a \\to \\beta\\gamma$, has seen $\\beta$, and still expects $\\gamma$.',
      '$\\beta$ and $\\gamma$ are alternatives of $a$.',
      'The rule $a \\to \\beta\\gamma$ has a conflict at position $|\\beta|$.' ],
    answer: 1,
    why: {
      0: 'The dot marks what is **behind** you on the left and what is ahead on the right, like a reading head.',
      2: 'The right-hand side $\\beta\\gamma$ is one single alternative; the dot splits it, it does not separate alternatives.',
      3: 'Conflicts are properties of a whole **state** plus a lookahead token, not of a single item.' },
    explain: '$\\beta$ = already recognised, $\\gamma$ = still to come. The lecture calls it a *marked rule* and notes that the usual English term "item" is rather meaningless.' },

  { id: 'q-item-2', concept: 'lr-items', level: 2,
    stem: 'Grammar $e \\to e$`+`$e$ | `N`. What is `closure`({$e \\to e$`+`$\\bullet\\, e$})?',
    choices: [
      '{$e \\to e$`+`$\\bullet\\, e$}',
      '{$e \\to e$`+`$\\bullet\\, e$, $e \\to \\bullet\\, e$`+`$e$, $e \\to \\bullet\\,$`N`}',
      '{$e \\to e$`+`$\\bullet\\, e$, $e \\to e$`+`$e\\, \\bullet$}',
      '{$e \\to \\bullet\\, e$`+`$e$, $e \\to \\bullet\\,$`N`}' ],
    answer: 1,
    why: {
      0: 'Forgetting to close. The dot sits before the **variable** $e$, so every rule for $e$ must be added with the dot at the front.',
      2: 'Advancing the dot is `goto`, not `closure`. Closure never moves a dot in an existing item.',
      3: 'Dropping the original item. The closure rule says $M \\subseteq K$ — the seed is always kept.' },
    explain: 'Closure adds $c \\to \\bullet\\gamma$ for every rule of every variable $c$ sitting just after a dot, keeping the original items — and iterates.' },

  { id: 'q-item-3', concept: 'lr-items', level: 3,
    stem: 'What does the LR(0) automaton recognise?',
    choices: [
      'The language $L(G)$ itself.',
      'The viable prefixes — stack contents extendable to a right sentential form.',
      'The set of Follow sets.',
      'The leftmost derivations of $G$.' ],
    answer: 1,
    why: {
      0: 'A finite automaton cannot recognise a general context-free language. The automaton drives the parser; it is not the parser.',
      2: 'Follow sets are computed separately by a fixed-point iteration and are consulted when filling the `action` table.',
      3: 'LR parsers reconstruct **rightmost** derivations, in reverse.' },
    explain: 'The states are closed item sets and the automaton recognises viable prefixes; landing in a state with a completed item means a handle is on top of the stack.' },

  { id: 'q-fol-1', concept: 'follow', level: 1,
    stem: 'Can $\\lambda$ be an element of a `First` set in these notes?',
    choices: [
      'Yes, whenever the variable is nullable.',
      'No — `First`$(\\lambda)$ = {} and First sets contain only tokens; nullability is a separate predicate.',
      'Yes, but only for the start symbol.',
      'Only in `Follow` sets.' ],
    answer: 1,
    why: {
      0: 'The convention of many textbooks (and the Dragon Book), but **not** this lecture`s. Here `nullable(a)` carries that information, and `First` stays a set of tokens.',
      2: 'No special case for the start symbol exists.',
      3: '`Follow` sets contain tokens plus the EOF marker `$`. $\\lambda$ is not a token and appears in neither.' },
    explain: '`First`$(\\lambda)$ = {} (empty set) and `First`$(a\\beta)$ = `First(a)` $\\cup$ `First`$(\\beta)$ **if** $a \\Rightarrow^* \\lambda$. Nullability is tracked by the separate `nullable` predicate.' },

  { id: 'q-fol-2', concept: 'follow', level: 2,
    stem: 'Which token is guaranteed to be in `Follow(s)` for the start symbol $s$?',
    choices: [ '$\\lambda$', 'The EOF marker `$`', 'Every token of $T$', 'None' ],
    answer: 1,
    why: {
      0: '$\\lambda$ is not a token and never belongs to a Follow set.',
      2: 'Only those tokens that can genuinely follow $s$ in some derivation; usually a small set.',
      3: 'The augmented rule $\\hat{s} \\to s\\,$`$` puts `$` there by construction.' },
    explain: 'The augmented grammar adds $\\hat{s} \\to s\\,$`$`, so `$` $\\in$ `Follow(s)`. That is exactly what allows `action(M,$)` = accept.' },

  { id: 'q-fol-3', concept: 'follow', level: 2,
    stem: 'Grammar: $e \\to p\\,r$; $r \\to$ `+`$\\,p\\,r$ | $\\lambda$; $p \\to$ `N`. What is `Follow(p)`?',
    choices: [ '{`N`}', '{`+`}', '{`+`, `$`}', '{`$`}' ],
    answer: 2,
    why: {
      0: '`N` is in `First(p)`, not in `Follow(p)`. Mixing the two is the single commonest First/Follow error.',
      1: 'Right start, but incomplete: since $r$ is nullable, everything in `Follow(e)` — including `$` — also follows $p$.',
      3: 'Forgetting the `+` contributed by `First(r)` through the rule $e \\to p\\,r$.' },
    explain: 'From $e \\to p\\,r$: `First(r)` = {`+`} $\\subseteq$ `Follow(p)`; and because $r$ is nullable, `Follow(e)` = {`$`} $\\subseteq$ `Follow(p)`. Together {`+`, `$`}.' },

  { id: 'q-fol-4', concept: 'follow', level: 3,
    stem: 'Why are `nullable`, `First` and `Follow` computed by a fixed-point iteration?',
    choices: [
      'Because the grammar may be ambiguous.',
      'Because their defining equations are mutually recursive, so you iterate from empty sets until nothing changes.',
      'Because the sets could otherwise be infinite.',
      'Because the parse table is built bottom-up.' ],
    answer: 1,
    why: {
      0: 'Ambiguity is irrelevant — the sets are computed the same way for unambiguous grammars.',
      2: 'They are always finite, being subsets of $T \\cup$ {`$`}. Finiteness is what makes the iteration **terminate**, not what forces it.',
      3: 'Table construction is a separate, later phase that consumes these sets.' },
    explain: '`First(a)` depends on `First` of other variables (and on `nullable`), possibly cyclically. Start with everything empty/false, apply the rules until stable — the sets only grow and are bounded, so it halts.' },

  { id: 'q-slr-1', concept: 'slr', level: 2,
    stem: 'In an SLR table, when do you put $\\langle$reduce, $a \\to \\beta\\rangle$ into `action`$(M,t)$?',
    choices: [
      'Whenever $M$ contains $a \\to \\beta \\bullet$.',
      'When $M$ contains $a \\to \\beta \\bullet$ and $t \\in$ `Follow(a)`.',
      'When $M$ contains $a \\to \\beta \\bullet$ and $t \\in$ `First(a)`.',
      'When $M$ contains $a \\to \\bullet\\,\\beta$ and $t \\in$ `Follow(a)`.' ],
    answer: 1,
    why: {
      0: 'That is the **LR(0)** rule: reduce on every token. It creates conflicts wherever any shift is possible, which is why the Follow test exists.',
      2: '`First(a)` says what can **start** an $a$ — but the reduce has already finished the $a$, so the question is what may **follow** it.',
      3: 'The dot must be at the **end**: only a completely recognised right-hand side can be reduced.' },
    explain: 'The Follow test is precisely the "S" (simple) in SLR. LR(1) sharpens it by carrying a context-specific lookahead set instead.' },

  { id: 'q-slr-2', concept: 'slr', level: 3,
    stem: 'Why is an LR(1) parser more powerful than an SLR parser?',
    choices: [
      'It reads two tokens of lookahead instead of one.',
      'It carries, per item, the lookahead of the context in which the item was predicted, instead of the global `Follow` set.',
      'It uses a stack, while the SLR parser does not.',
      'It merges states with the same core.' ],
    answer: 1,
    why: {
      0: 'Both use exactly **one** token of lookahead. The difference is how precisely that one token is interpreted.',
      2: 'Both are shift-reduce parsers with two stacks; the machinery is identical.',
      3: 'Merging by core is the step from LR(1) to **LALR**, and it can only lose power, never gain it.' },
    explain: 'The extended marked rule $a \\to \\beta\\bullet\\gamma : L$ carries $L$, computed from the context as $\\bigcup${`First`$(\\delta t)$ | $t \\in L$}. $L$ is typically a **subset** of `Follow(a)`, so fewer reduce entries and fewer conflicts.' },

  { id: 'q-slr-3', concept: 'slr', level: 3,
    stem: 'In the closure for extended marked rules, from $a \\to \\beta\\bullet c\\,\\delta : L$ and $c \\to \\gamma$, which follow set does $c \\to \\bullet\\,\\gamma$ get?',
    choices: [
      '`Follow(c)`',
      '`First`$(\\delta)\; \\cup\; L$ if $\\delta \\Rightarrow^* \\lambda$, otherwise `First`$(\\delta)$.',
      '$L$',
      '`First`$(\\delta)$ always.' ],
    answer: 1,
    why: {
      0: 'Using the global Follow set is exactly the SLR approximation the LR(1) construction is designed to avoid.',
      2: 'Inheriting $L$ unconditionally ignores $\\delta$, which usually determines what comes next.',
      3: 'Correct only when $\\delta$ is not nullable. If $\\delta \\Rightarrow^* \\lambda$ then a token of $L$ can indeed follow $c$, so $L$ must be added.' },
    explain: 'The rule is $\\bigcup${`First`$(\\delta\\,t)$ | $t \\in L$}, which the notes simplify exactly into this nullable case distinction.' },

  { id: 'q-slr-4', concept: 'slr', level: 2,
    stem: 'How are LALR states obtained from LR(1) states?',
    choices: [
      'By deleting the follow-token sets.',
      'By merging all states with the same **core**, taking the union of the follow-token sets rule by rule.',
      'By merging states with the same follow-token sets.',
      'By re-running the SLR construction on the LR(1) automaton.' ],
    answer: 1,
    why: {
      0: 'Deleting the lookaheads gives the **SLR/LR(0)** automaton, which is strictly weaker than LALR.',
      2: 'Backwards: states are grouped by identical cores, and their differing lookaheads are then merged.',
      3: 'No such re-run exists; LALR is defined directly as the core-merge of LR(1).' },
    explain: '`core(M)` drops the follow tokens; states sharing a core are combined with the extended union $\\uplus$, which unions the $L$ sets of matching items. The C grammar shrinks from 1572 LR states to 350 LALR states this way.' },

  { id: 'q-slr-5', concept: 'slr', level: 1,
    stem: 'Which inclusion chain is correct?',
    choices: [
      'LR $\\subsetneq$ LALR $\\subsetneq$ SLR',
      'SLR $\\subsetneq$ LALR $\\subsetneq$ canonical LR',
      'SLR = LALR $\\subsetneq$ canonical LR',
      'SLR $\\subsetneq$ canonical LR $\\subsetneq$ LALR' ],
    answer: 1,
    why: {
      0: 'Exactly reversed. Adding lookahead information can only increase power.',
      2: 'The inclusion is **proper**: $s \\to a$`x`$a$`y` | $b$`y`$b$`x` with $a,b \\to \\lambda$ is LALR but not SLR.',
      3: 'LALR is obtained by merging LR states, so it cannot exceed canonical LR.' },
    explain: 'SLR language $\\subsetneq$ LALR language $\\subsetneq$ canonical LR language, all inclusions proper. The notes give a separating grammar for each step.' },

  { id: 'q-con-1', concept: 'conflicts', level: 3,
    stem: 'Merging LR(1) states into LALR states can introduce which kind of conflict?',
    choices: [
      'Shift-reduce conflicts only.',
      'Reduce-reduce conflicts only.',
      'Both kinds.',
      'Neither kind.' ],
    answer: 1,
    why: {
      0: 'Impossible. Shift entries depend only on the **core**, which merging preserves exactly; and a merged reduce lookahead was already present in one of the merged states, where the same shift already existed — so it would have been a conflict there too.',
      2: 'Half right, but the shift-reduce half is provably impossible — this is a standing exercise in the notes.',
      3: 'Then LALR would equal canonical LR, contradicting the proper inclusion LALR $\\subsetneq$ LR.' },
    explain: 'Only reduce-reduce conflicts can be created, because two completed items with disjoint lookaheads in separate LR states can end up with overlapping lookaheads once the states are unioned. The notes call these **mysterious** conflicts.' },

  { id: 'q-con-2', concept: 'conflicts', level: 2,
    stem: 'Which situation is a **reduce-reduce** conflict?',
    choices: [
      '$M$ contains $a \\to \\beta\\bullet t\\,\\gamma$ and $c \\to \\delta\\bullet$ with $t \\in$ `Follow(c)`.',
      '$M$ contains $c_1 \\to \\gamma_1 \\bullet$ and $c_2 \\to \\gamma_2 \\bullet$ with $t \\in$ `Follow`$(c_1) \\cap$ `Follow`$(c_2)$.',
      '$M$ contains two items with the dot at the front.',
      'Two states of the automaton have the same core.' ],
    answer: 1,
    why: {
      0: 'That is the **shift**-reduce conflict: one item wants to shift $t$, another wants to reduce on it.',
      2: 'Items with the dot at the front are ordinary closure items and cause no conflict at all — nothing can be reduced yet.',
      3: 'Same-core states are exactly what LALR **merges**; that is a construction step, not a conflict.' },
    explain: 'Two completed items in one state whose Follow sets share the lookahead $t$: the parser cannot tell which rule to reduce by.' },

  { id: 'q-con-3', concept: 'conflicts', level: 3,
    stem: 'Which three kinds of conflict does the lecture distinguish by **origin**?',
    choices: [
      'Shift-shift, shift-reduce, reduce-reduce.',
      'Ambiguity conflicts, look-ahead conflicts, mysterious conflicts.',
      'Scanner conflicts, parser conflicts, semantic conflicts.',
      'LR(0), SLR and LALR conflicts.' ],
    answer: 1,
    why: {
      0: 'Those are kinds by **shape**, and "shift-shift" does not exist — two shifts on the same token go to the same state by construction.',
      2: 'Scanner and semantic issues are not parse-table conflicts.',
      3: 'That names the construction that reported the conflict, not where it came from.' },
    explain: '**Ambiguity** conflicts = a genuinely ambiguous grammar; **look-ahead** conflicts = unambiguous but one token of lookahead is not enough (not even LR(1)); **mysterious** conflicts = created purely by the LR-to-LALR core merge.' },

  { id: 'q-con-4', concept: 'conflicts', level: 2,
    stem: 'How do you get Lark to report its conflicts?',
    choices: [
      'They are printed by default.',
      'Raise the level of `lark.logger` and construct the parser with `debug=True` (or use `strict=True` to get an exception).',
      'Call `parser.conflicts()` after parsing.',
      'Add `%conflicts` to the grammar.' ],
    answer: 1,
    why: {
      0: 'Lark is deliberately tight-lipped: `lark.logger` is set to `CRITICAL` on import and conflict messages are issued at `debug` level unless `debug=True`.',
      2: 'No such method; the conflicts are resolved at table-construction time.',
      3: 'No such grammar directive exists.' },
    explain: 'Two separate silencers must be lifted: the logger level **and** the `debug=True` keyword. `strict=True` turns a conflict into a raised exception instead.' },

  /* ================= u6 ================================================= */
  { id: 'q-ast-1', concept: 'ast', level: 2,
    stem: 'Which rule is **not** one of the three parse-tree simplifications that yield the AST?',
    choices: [
      'An inner node with exactly one terminal child takes over that terminal as its label.',
      'An inner node with only one child is replaced by that child.',
      'Leaves labelled `(` or `)` are dropped.',
      'Nodes labelled with nullable variables are dropped.' ],
    answer: 3,
    why: {
      0: 'This is rule 1 — it is how `expr + prod` becomes a node labelled `+`.',
      1: 'This is rule 2 — it collapses the precedence chains expr $\\to$ prod $\\to$ fact $\\to$ atom.',
      2: 'This is rule 3 — parentheses have done their job once the tree exists.' },
    explain: 'Only three rules are given. Nullability plays no role in the AST transformation — a $\\lambda$-leaf may well be significant.' },

  { id: 'q-ast-2', concept: 'ast', level: 2,
    stem: 'In Lark, can `?rule` and `-> alias` introduce or remove a parser conflict?',
    choices: [
      'Yes, `?` can remove conflicts by inlining.',
      'No — both affect only the shape of the parse tree, never the parse table.',
      'Yes, an alias creates a new grammar rule.',
      'Only `->` can, by changing rule priorities.' ],
    answer: 1,
    why: {
      0: 'Inlining happens **after** parsing, when the tree is built. The table was already fixed.',
      2: 'An alias only names the resulting tree node; the underlying alternative is unchanged.',
      3: 'Lark has no rule priorities that an alias could touch, and no way to declare precedence at all.' },
    explain: 'The notes state it explicitly: both features concern the shape of the parse tree only and therefore cannot introduce or remove a conflict. (Note the corollary: an aliased alternative is never inlined, even with one child.)' },

  { id: 'q-jvm-1', concept: 'jasmin', level: 2,
    stem: 'Stack from the bottom: $\\ldots$, a, b (b on top). What does `isub` leave on the stack?',
    choices: [ '$b - a$', '$a - b$', '$a$ and $b$ unchanged, plus $a-b$', '$|a-b|$' ],
    answer: 1,
    why: {
      0: 'The top value is subtracted **from** the one below it, not the other way round. The order matters for every non-commutative instruction: `isub`, `idiv`, `irem`, the shifts.',
      2: 'Both operands are popped; only the result remains.',
      3: 'The JVM has no absolute-value instruction hiding in `isub`.' },
    explain: '`isub` pops two and pushes $a - b$, where $a$ was below $b$. `iadd` is commutative so the trap does not show there.' },

  { id: 'q-jvm-2', concept: 'jasmin', level: 1,
    stem: 'What is the difference between `ifeq l` and `if_icmpeq l`?',
    choices: [
      '`ifeq` compares two values, `if_icmpeq` compares against zero.',
      '`ifeq` pops one value and jumps if it is zero; `if_icmpeq` pops two and jumps if they are equal.',
      '`ifeq` is for integers, `if_icmpeq` for floats.',
      '`ifeq` leaves its operand on the stack.' ],
    answer: 1,
    why: {
      0: 'Exactly swapped. The `icmp` in the name means "integer **compare** (two values)".',
      2: 'Both are integer instructions; the `i` prefix says so. Floats have `fcmpl` and friends.',
      3: 'All conditional branches **remove** the values they test — which is why the compiled code must be written with that in mind.' },
    explain: '`ifeq` is the one-operand test against zero, used to branch on a compiled Boolean expression (`1` or `0` on the stack). `if_icmpeq` is the two-operand comparison used when compiling `==`.' },

  { id: 'q-jvm-3', concept: 'jasmin', level: 2,
    stem: 'Read `invokestatic Sum/sum(I)I`. What must be on the stack before it, and what is there after?',
    choices: [
      'Nothing before; the result after.',
      'One int argument before; it is replaced by the int result.',
      'An object reference and an int before; nothing after.',
      'Two ints before; one int after.' ],
    answer: 1,
    why: {
      0: 'Arguments are always passed on the stack; `(I)` says there is one.',
      2: 'That would be `invokevirtual`, which needs a receiver object. `invokestatic` calls a **static** method, so no receiver.',
      3: 'The signature `(I)I` declares exactly one parameter, not two.' },
    explain: 'In `sum(I)I` the first `I` is the parameter type, the second the return type. The $n$ arguments on the stack are replaced by the single result.' },

  { id: 'q-jvm-4', concept: 'jasmin', level: 1,
    stem: 'What does `.limit stack 3` declare?',
    choices: [
      'The method has three local variables.',
      'The maximum height the operand stack may reach in this method.',
      'The method may be called at most three levels deep.',
      'Three values are returned.' ],
    answer: 1,
    why: {
      0: 'That is `.limit locals`. The two directives are easy to swap, and the verifier will reject the class if either is too small.',
      2: 'Call depth is the JVM`s business, not the method`s declaration.',
      3: 'A JVM method returns at most one value.' },
    explain: 'The JVM demands the maximum stack height in advance — a security feature against stack-overflow exploits. It is exactly the second component returned by `compile_expr`.' },

  { id: 'q-cg-1', concept: 'codegen', level: 3,
    stem: 'For $lhs + rhs$ with sub-results $\\langle L_1,s_1\\rangle$ and $\\langle L_2,s_2\\rangle$, what is the stack estimate?',
    choices: [ '$s_1 + s_2$', '$\\max(s_1, 1 + s_2)$', '$\\max(s_1, s_2)$', '$1 + s_1 + s_2$' ],
    answer: 1,
    why: {
      0: 'Adding assumes both sub-expressions occupy the stack simultaneously. They do not — they are evaluated one after the other.',
      2: 'Forgetting the `+1`: while $rhs$ is being evaluated, the finished value of $lhs$ is still sitting on the stack underneath.',
      3: 'Over-counting in the same way as choice 0, plus an extra slot.' },
    explain: '$\\max(s_1, 1+s_2)$: the peak is either during $lhs$ (nothing below it) or during $rhs$ (exactly one value below it).' },

  { id: 'q-cg-2', concept: 'codegen', level: 2,
    stem: 'Which code skeleton compiles `while (cond) stmnt`?',
    choices: [
      '$L_1$; `ifeq next`; $L_2$; `goto loop`; `next:`',
      '`loop:`; $L_1$; `ifeq next`; $L_2$; `goto loop`; `next:`',
      '`loop:`; $L_1$; `ifeq loop`; $L_2$; `next:`',
      '$L_1$; $L_2$; `goto loop`' ],
    answer: 1,
    why: {
      0: 'The `loop:` label is missing, so `goto loop` has no target — the condition would never be re-evaluated.',
      2: 'Branching back to `loop` when the condition is **false** inverts the test and spins forever.',
      3: 'No exit at all: an unconditional infinite loop.' },
    explain: '`loop:` $L_1$ `ifeq next` $L_2$ `goto loop` `next:` — test at the top, jump out when the condition evaluates to 0, jump back after the body. Stack size $\\max(s_1,s_2)$.' },

  { id: 'q-cg-3', concept: 'codegen', level: 2,
    stem: 'How is $x$ `=` $expr$ compiled?',
    choices: [
      '[`istore st[x]`] + $L$',
      '$L$ + [`istore st[x]`]',
      '$L$ + [`iload st[x]`]',
      '$L$ + [`istore st[x]`, `iload st[x]`]' ],
    answer: 1,
    why: {
      0: 'Storing before the value exists. The stack would underflow.',
      2: '`iload` **pushes** the variable; it does not store into it. The two are exact opposites.',
      3: 'Leaves the value on the stack, violating the rule that a statement must not change the stack height.' },
    explain: 'Evaluate, then store: $\\langle L +$ [`istore st[x]`]$, s\\rangle$. Net stack effect zero, as required of every statement.' },

  { id: 'q-cg-4', concept: 'codegen', level: 3,
    stem: 'Which invariant must the code generated for a **statement** satisfy?',
    choices: [
      'It must leave exactly one value on the stack.',
      'The stack height afterwards equals the height beforehand.',
      'It must not use any label.',
      'It must not call any method.' ],
    answer: 1,
    why: {
      0: 'That is the contract for an **expression** (and for a Boolean expression, where the value is 1 or 0).',
      2: '`if` and `while` necessarily generate labels.',
      3: 'An expression statement may well be a call, e.g. `println(sum(n));`.' },
    explain: 'Statements are stack-neutral: they may grow the stack in between, but everything pushed must be consumed or stored. That is why the assignment ends with `istore` and not with a leftover value.' },

  { id: 'q-cg-5', concept: 'codegen', level: 2,
    stem: 'What must the code for a **Boolean** expression leave on the stack?',
    choices: [
      'Nothing — it only branches.',
      'The integer 1 (true) or 0 (false).',
      'A reference to a `Boolean` object.',
      'The two compared values.' ],
    answer: 1,
    why: {
      0: 'The `compile_bool` contract produces a **value**, which the enclosing `ifeq` then tests. Branching is done by the statement, not the expression.',
      2: 'At this level the JVM works with `int`s; there is no boxing in the generated code.',
      3: 'The comparison instructions pop both operands.' },
    explain: 'True and false are the integers 1 and 0. That is why `if` and `while` can simply emit `ifeq label` after the Boolean code.' },

  { id: 'q-cg-6', concept: 'codegen', level: 3,
    stem: 'Why must `new_label()` generate a fresh label every time?',
    choices: [
      'Because Jasmin labels must be alphabetically ordered.',
      'Because labels are method-global, so nested constructs reusing a name would cross-jump.',
      'Because the JVM limits labels to one per method.',
      'Because the verifier rejects duplicate label text in the class file.' ],
    answer: 1,
    why: {
      0: 'No ordering requirement exists.',
      2: 'A method may have as many labels as it likes.',
      3: 'The real failure is semantic, not a name-collision diagnostic: a nested `if` reusing `next` silently jumps to the wrong place.' },
    explain: 'Labels are scoped per method. Two nested `if`s both emitting `next:` would make the inner `goto next` land in the outer construct — a wrong program, not a compile error.' },

  { id: 'q-cg-7', concept: 'codegen', level: 2,
    stem: 'What is the symbol table `st` used for in `compile_expr`?',
    choices: [
      'It maps variable names to their types.',
      'It maps variable names to their index in the local variable frame.',
      'It maps rule names to Jasmin labels.',
      'It stores the values of the variables during compilation.' ],
    answer: 1,
    why: {
      0: 'In Integer-C every variable is an `int`, so there is nothing to record.',
      2: 'Labels come from `new_label()`, not from the symbol table.',
      3: 'Values exist only at **run time**. The compiler never evaluates the program.' },
    explain: '`st["x"] = 2` means `x` sits in slot 2, so the generated instructions are `iload 2` and `istore 2`. Slot numbering starts at 0.' },

  { id: 'q-cg-8', concept: 'codegen', level: 3,
    stem: 'Sketching the code for $lhs$ `==` $rhs$: which instruction sequence is right?',
    choices: [
      '$L_1$; $L_2$; `if_icmpeq true`; `bipush 0`; `goto next`; `true:`; `bipush 1`; `next:`',
      '$L_1$; $L_2$; `if_icmpeq true`; `bipush 1`; `goto next`; `true:`; `bipush 0`; `next:`',
      '$L_1$; $L_2$; `ifeq true`; `bipush 0`; `true:`; `bipush 1`',
      '$L_1$; `if_icmpeq` $L_2$; `bipush 1`' ],
    answer: 0,
    why: {
      1: 'The two branches are swapped: falling through means "not equal", so the fall-through branch must push 0.',
      2: '`ifeq` tests a **single** value against zero — the wrong instruction for comparing two — and without the `goto` both pushes would execute.',
      3: 'Syntactic nonsense: `if_icmpeq` takes a **label**, not a code list.' },
    explain: 'Compare, jump to `true:` on equality, otherwise fall through pushing 0 and skip over the `true:` branch with `goto next`. For `!=`, `<`, `<=` etc. only the comparison instruction changes.' },
];

export default questions;
