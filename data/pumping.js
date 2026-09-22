/* ==========================================================================
   Language bank for the Pumping Duel.

   Notation follows Stroetmann, Chapter "The Theory of Regular Languages":
   the empty string is $\lambda$, the split is $s = uvw$ with $v \neq \lambda$
   and $|uv| \leq n$, and the pump exponent is $h$ (many textbooks write
   $w = xyz$ and $xy^k z$ — same thing).

   Every entry is a *decidable* language: member(w) is total, pure and cheap,
   so the duel engine can search the split space for real.

   Three kinds of entry:
     regular: false, pumpable: false  -> the pumping lemma refutes it (classics)
     regular: false, pumpable: true   -> NOT regular, yet it satisfies the
                                         lemma. The lemma is necessary, not
                                         sufficient. The most important entry.
     regular: true                    -> a decoy. Pumping can never break it.
   ========================================================================== */

/* ---------- small numeric / string helpers ---------- */
const count = (w, c) => { let k = 0; for (let i = 0; i < w.length; i++) if (w[i] === c) k++; return k; };
const rep = (c, k) => (k > 0 ? c.repeat(k) : '');
const rev = w => w.split('').reverse().join('');

const isPrime = m => {
  if (!Number.isInteger(m) || m < 2) return false;
  if (m % 2 === 0) return m === 2;
  for (let d = 3; d * d <= m; d += 2) if (m % d === 0) return false;
  return true;
};
const nextPrime = m => { let p = Math.max(2, Math.ceil(m)); while (!isPrime(p)) p++; return p; };
const isSquare = m => { if (m < 0) return false; const r = Math.round(Math.sqrt(m)); return r * r === m; };
const isPow2 = m => m >= 1 && (m & (m - 1)) === 0;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcmTo = n => { let l = 1; for (let i = 2; i <= n; i++) l = (l / gcd(l, i)) * i; return l; };
const nextPow2 = m => { let p = 1; while (p < m) p *= 2; return p; };

/** Split a string of the shape a*b*c* — returns null if it has the wrong shape. */
const abc = w => { const m = /^(a*)(b*)(c*)$/.exec(w); return m ? { i: m[1].length, j: m[2].length, k: m[3].length } : null; };
const ab = w => { const m = /^(a*)(b*)$/.exec(w); return m ? { i: m[1].length, j: m[2].length } : null; };

/* ==========================================================================
   The bank
   ========================================================================== */
export const languages = [

  /* ---------- 1 ---------------------------------------------------------- */
  {
    id: 'anbn',
    title: 'Equal blocks',
    tex: 'L = \\{ a^n b^n \\mid n \\in \\N \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'easy',
    note: 'The example the lecture proves in full (Chapter 5). Everything else is a variation on it.',
    member(w) { const p = ab(w); return !!p && p.i === p.j; },
    winningWord(n) { return rep('a', n) + rep('b', n); },
    hint: 'Choose $s = a^n b^n$. Because $|uv| \\leq n$, the block $uv$ sits entirely inside the $a$-block, so $v = a^y$ with $y > 0$. Now $h = 0$ deletes $a$s and leaves the $b$s untouched.',
    proof: {
      s: 'a^n b^n',
      why: '|s| = 2n \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '0',
      result: 'uv^0w = a^{n-y} b^n',
      reason: 'count(uw,a) = n - y < n = count(uw,b)',
    },
  },

  /* ---------- 2 ---------------------------------------------------------- */
  {
    id: 'equalab',
    title: 'Equal counts',
    tex: 'L = \\{ w \\in \\{a,b\\}^* \\mid count(w,a) = count(w,b) \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'easy',
    note: 'The "Check your Understanding" exercise of Chapter 5. Same weapon as $a^nb^n$, but the language is much bigger — which is exactly why picking a *convenient* $s$ matters.',
    member(w) { return /^[ab]*$/.test(w) && count(w, 'a') === count(w, 'b'); },
    winningWord(n) { return rep('a', n) + rep('b', n); },
    hint: 'You may choose *any* $s \\in L$ with $|s| \\geq n$ — so choose the most convenient one: $s = a^n b^n$. Do not choose something like $(ab)^n$: there $v$ may be $ab$, which pumps happily.',
    proof: {
      s: 'a^n b^n',
      why: '|s| = 2n \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '2',
      result: 'uv^2w = a^{n+y} b^n',
      reason: 'count(uv^2w,a) = n + y > n = count(uv^2w,b)',
    },
  },

  /* ---------- 3 ---------------------------------------------------------- */
  {
    id: 'palindrome',
    title: 'Palindromes',
    tex: 'L = \\{ w \\in \\{a,b\\}^* \\mid w = w^R \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'medium',
    note: 'Reading a palindrome needs unbounded memory of what came first — a DFA has none.',
    member(w) { return /^[ab]*$/.test(w) && w === rev(w); },
    winningWord(n) { return rep('a', n) + 'b' + rep('a', n); },
    hint: 'Choose $s = a^n b a^n$. Then $v = a^y$ lives in the left $a$-block only, so pumping makes the two $a$-blocks different lengths and the single $b$ is no longer in the middle.',
    proof: {
      s: 'a^n b a^n',
      why: '|s| = 2n+1 \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '2',
      result: 'uv^2w = a^{n+y} b a^n',
      reason: 'the b is no longer in the centre, so uv^2w \\neq (uv^2w)^R',
    },
  },

  /* ---------- 4 ---------------------------------------------------------- */
  {
    id: 'square',
    title: 'Square lengths',
    tex: 'L_{square} = \\{ a^m \\mid \\exists k \\in \\N: m = k^2 \\}',
    alphabet: ['a'],
    regular: false, pumpable: false, difficulty: 'medium',
    note: 'Worked as an exercise in Chapter 5. The point: consecutive squares grow apart, so a bounded pump lands in the gap.',
    member(w) { return /^a*$/.test(w) && isSquare(w.length); },
    winningWord(n) { return rep('a', n * n); },
    hint: 'Choose $s = a^{n·n}$. Pumping once more adds $y \\leq n$ letters, so $n·n < |uv^2w| \\leq n·n + n < (n+1)·(n+1)$ — strictly between two consecutive squares.',
    proof: {
      s: 'a^{n·n}',
      why: '|s| = n·n \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '2',
      result: 'uv^2w = a^{n·n + y}',
      reason: 'n·n < n·n + y \\leq n·n + n < (n+1)·(n+1), so the length is between two consecutive squares',
    },
  },

  /* ---------- 5 ---------------------------------------------------------- */
  {
    id: 'prime',
    title: 'Prime lengths',
    tex: 'L = \\{ a^p \\mid p \;\\mbox{is prime} \\}',
    alphabet: ['a'],
    regular: false, pumpable: false, difficulty: 'hard',
    note: 'Chapter 5 exercise with a beautiful trick: choose $h := x + z$, so the pumped length factors as $(x+z)(1+y)$.',
    member(w) { return /^a*$/.test(w) && isPrime(w.length); },
    winningWord(n) { return rep('a', nextPrime(n + 2)); },
    /* the killer h is p - y  (for |u|=x, |v|=y, |w|=z: h := x+z gives (x+z)(1+y)) */
    hHints(sp) {
      const x = sp.u.length, y = sp.v.length, z = sp.w.length;
      const out = [x + z];
      if (y > 0) out.push(x + z + y);
      return out;
    },
    hint: 'Pick a prime $p \\geq n+2$ and set $s = a^p$. With $u = a^x$, $v = a^y$, $w = a^z$ choose $h := x + z$: the length becomes $x + (x+z)·y + z = (x+z)·(1+y)$, a product of two factors that are both $\\geq 2$.',
    proof: {
      s: 'a^p \;\\mbox{for a prime}\; p \\geq n+2',
      why: '|s| = p \\geq n',
      vform: 'u = a^x, v = a^y, w = a^z \;\\mbox{with}\; y > 0, x+y \\leq n',
      h: 'x + z',
      result: 'uv^h w = a^{(x+z)·(1+y)}',
      reason: '1+y \\geq 2 and x+z \\geq 2, so the length is a product of two factors \\geq 2 and cannot be prime',
    },
  },

  /* ---------- 6 ---------------------------------------------------------- */
  {
    id: 'power2',
    title: 'Powers of two',
    tex: 'L_{power} = \\{ a^{2^k} \\mid k \\in \\N \\}',
    alphabet: ['a'],
    regular: false, pumpable: false, difficulty: 'medium',
    note: 'Chapter 5 exercise. Same gap argument as the squares, but the gaps double.',
    member(w) { return /^a*$/.test(w) && isPow2(w.length); },
    winningWord(n) { return rep('a', nextPow2(Math.max(n, 2))); },
    hint: 'Choose $s = a^m$ where $m$ is the smallest power of two with $m \\geq n$. Then $m < m + y \\leq m + n \\leq 2m$ — strictly between two consecutive powers of two.',
    proof: {
      s: 'a^m \;\\mbox{where}\; m = 2^k \;\\mbox{and}\; m \\geq n',
      why: '|s| = m \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n \\leq m',
      h: '2',
      result: 'uv^2w = a^{m+y}',
      reason: 'm < m+y \\leq 2·m, so the length lies strictly between 2^k and 2^{k+1}',
    },
  },

  /* ---------- 7 ---------------------------------------------------------- */
  {
    id: 'dyck',
    title: 'Balanced parentheses',
    tex: 'L = \\{ w \\in \\{(,)\\}^* \\mid w \;\\mbox{is balanced} \\}',
    alphabet: ['(', ')'],
    regular: false, pumpable: false, difficulty: 'easy',
    note: 'Chapter 5 remark: this is why regular expressions cannot describe the syntax of a programming language. Enter context-free grammars.',
    member(w) {
      if (!/^[()]*$/.test(w)) return false;
      let d = 0;
      for (let i = 0; i < w.length; i++) { d += w[i] === '(' ? 1 : -1; if (d < 0) return false; }
      return d === 0;
    },
    winningWord(n) { return rep('(', n) + rep(')', n); },
    hint: 'Choose $s = ($ repeated $n$ times, then $)$ repeated $n$ times. $|uv| \\leq n$ traps $v$ inside the opening brackets, so $h=0$ leaves unmatched closers.',
    proof: {
      s: '(^n )^n',
      why: '|s| = 2n \\geq n',
      vform: 'v = (^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '0',
      result: 'uv^0w = (^{n-y} )^n',
      reason: 'there are more closing than opening brackets, so the string is unbalanced',
    },
  },

  /* ---------- 8 ---------------------------------------------------------- */
  {
    id: 'ww',
    title: 'Doubled words',
    tex: 'L = \\{ ww \\mid w \\in \\{a,b\\}^* \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'hard',
    note: 'Not even context-free. A naive $s = a^n a^n$ is a trap: it *is* pumpable inside L — you must break the symmetry with a marker.',
    member(w) {
      if (!/^[ab]*$/.test(w) || w.length % 2 !== 0) return false;
      const half = w.length / 2;
      return w.slice(0, half) === w.slice(half);
    },
    winningWord(n) { return rep('a', n) + 'b' + rep('a', n) + 'b'; },
    hint: 'Do **not** choose $s = a^{2n}$ — that one survives every pump. Choose $s = a^n b a^n b$: now $v$ is inside the first $a$-block and pumping shifts the two $b$ markers out of alignment.',
    proof: {
      s: 'a^n b a^n b',
      why: '|s| = 2n+2 \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '2',
      result: 'uv^2w = a^{n+y} b a^n b',
      reason: 'the two halves of the result are no longer equal, since the b markers sit at different offsets',
    },
  },

  /* ---------- 9 ---------------------------------------------------------- */
  {
    id: 'iltj',
    title: 'More b than a',
    tex: 'L = \\{ a^i b^j c^k \\mid i < j \\}',
    alphabet: ['a', 'b', 'c'],
    regular: false, pumpable: false, difficulty: 'medium',
    note: 'The $c$-block is pure decoration — a distractor. $k$ is unconstrained, so never touch it.',
    member(w) { const p = abc(w); return !!p && p.i < p.j; },
    winningWord(n) { return rep('a', n) + rep('b', n + 1); },
    hint: 'Choose $s = a^n b^{n+1}$ (the $c$-block may stay empty). $v = a^y$, and $h = 2$ pushes $i$ up to $n+y \\geq n+1 = j$.',
    proof: {
      s: 'a^n b^{n+1}',
      why: '|s| = 2n+1 \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '2',
      result: 'uv^2w = a^{n+y} b^{n+1}',
      reason: 'i = n+y \\geq n+1 = j, so the condition i < j fails',
    },
  },

  /* ---------- 10 --------------------------------------------------------- */
  {
    id: 'anbncn',
    title: 'Three equal blocks',
    tex: 'L = \\{ a^n b^n c^n \\mid n \\in \\N \\}',
    alphabet: ['a', 'b', 'c'],
    regular: false, pumpable: false, difficulty: 'easy',
    note: 'Not context-free either — you will meet it again as the pumping lemma for context-free languages.',
    member(w) { const p = abc(w); return !!p && p.i === p.j && p.j === p.k; },
    winningWord(n) { return rep('a', n) + rep('b', n) + rep('c', n); },
    hint: 'Choose $s = a^n b^n c^n$. $|uv| \\leq n$ again traps $v$ in the $a$-block; any $h \\neq 1$ unbalances $a$ against $b$ and $c$.',
    proof: {
      s: 'a^n b^n c^n',
      why: '|s| = 3n \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '0',
      result: 'uv^0w = a^{n-y} b^n c^n',
      reason: 'the number of a’s differs from the number of b’s',
    },
  },

  /* ---------- 11 --------------------------------------------------------- */
  {
    id: 'moreathanb',
    title: 'Strictly more a than b',
    tex: 'L = \\{ a^n b^m \\mid n > m \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'medium',
    note: 'Note the direction: here you must *shrink* the a-block, so $h = 0$ is the move. Students who only ever pump up get stuck.',
    member(w) { const p = ab(w); return !!p && p.i > p.j; },
    winningWord(n) { return rep('a', n + 1) + rep('b', n); },
    hint: 'Choose $s = a^{n+1} b^n$ — only *just* in $L$. Then $v = a^y$ and $h = 0$ gives $n+1-y \\leq n$ many $a$s against $n$ many $b$s.',
    proof: {
      s: 'a^{n+1} b^n',
      why: '|s| = 2n+1 \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '0',
      result: 'uv^0w = a^{n+1-y} b^n',
      reason: 'n+1-y \\leq n, so the condition n > m fails',
    },
  },

  /* ---------- 12 --------------------------------------------------------- */
  {
    id: 'anbmneq',
    title: 'Unequal blocks',
    tex: 'L = \\{ a^n b^m \\mid n \\neq m \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'brutal', maxN: 8,
    note: 'The complement trick is the humane proof: if L were regular, so would be its complement intersected with $a^*b^*$, which is $\\{a^nb^n\\}$. The direct pumping proof needs a huge h.',
    member(w) { const p = ab(w); return !!p && p.i !== p.j; },
    winningWord(n) { const L = lcmTo(Math.max(1, Math.min(n, 8))); return rep('a', n) + rep('b', n + L); },
    /* to reach equality we need n + (h-1)*y = m, i.e. h = 1 + (m-n)/y */
    hHints(sp) {
      const s = sp.u + sp.v + sp.w;
      const p = ab(s);
      if (!p) return [];
      const y = sp.v.length;
      if (!y) return [];
      const inA = /^a*$/.test(sp.v);
      const d = inA ? p.j - p.i : p.i - p.j;
      const out = [];
      if (d > 0 && d % y === 0) out.push(1 + d / y);
      return out;
    },
    hint: 'Choose $s = a^n b^{n+L}$ where $L = lcm(1,...,n)$. Whatever $y = |v| \\leq n$ the Adversary picks, $y$ divides $L$, so $h := 1 + L/y$ makes the two blocks equal — and equality is exactly what $L$ forbids.',
    proof: {
      s: 'a^n b^{n+L} \;\\mbox{with}\; L = lcm(1,...,n)',
      why: '|s| = 2n+L \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n, \;\\mbox{so}\; y \;\\mbox{divides}\; L',
      h: '1 + L/y',
      result: 'uv^h w = a^{n+L} b^{n+L}',
      reason: 'both blocks now have the same length, and L excludes exactly that',
    },
  },

  /* ---------- 13 --------------------------------------------------------- */
  {
    id: 'diffone',
    title: 'Almost equal counts',
    tex: 'L = \\{ w \\in \\{a,b\\}^* \\mid |count(w,a) - count(w,b)| \\leq 1 \\}',
    alphabet: ['a', 'b'],
    regular: false, pumpable: false, difficulty: 'hard',
    note: 'A bounded *final* difference does not mean bounded memory: on the way the difference may grow without limit, and a DFA would have to remember it.',
    member(w) { return /^[ab]*$/.test(w) && Math.abs(count(w, 'a') - count(w, 'b')) <= 1; },
    winningWord(n) { return rep('a', n) + rep('b', n); },
    hint: 'Choose $s = a^n b^n$. One extra copy of $v = a^y$ may still be tolerated when $y = 1$, so pump harder: $h = 3$ gives a difference of $2y \\geq 2$.',
    proof: {
      s: 'a^n b^n',
      why: '|s| = 2n \\geq n',
      vform: 'v = a^y \;\\mbox{with}\; 0 < y \\leq n',
      h: '3',
      result: 'uv^3w = a^{n+2y} b^n',
      reason: 'the difference is 2y \\geq 2 > 1',
    },
  },

  /* ---------- 14 : NOT regular, but it *does* satisfy the lemma ----------- */
  {
    id: 'ifthen',
    title: 'The lemma is not enough',
    tex: 'L = \\{ a^i b^j c^k \\mid i \\geq 1 \\rightarrow j = k \\}',
    alphabet: ['a', 'b', 'c'],
    regular: false, pumpable: true, difficulty: 'brutal',
    member(w) { const p = abc(w); return !!p && (p.i === 0 || p.j === p.k); },
    pumpLength: 1,
    trap: 'This language is **not** regular — and yet the pumping lemma cannot show it. With $n = 1$ every $s \\in L$ can be split as $u = \\lambda$, $v = $ the first character, $w = $ the rest, and every pump stays inside $L$. The lemma is a **necessary** condition for regularity, never a sufficient one: passing it proves nothing.',
    defence: 'Take $n = 1$, $u = \\lambda$, $v = s_0$, $w$ = the rest. If $s$ starts with $a$ then $j = k$ holds and stays true under pumping; if $s$ starts with $b$ or $c$ then $i = 0$ and the implication is vacuously true — forever.',
    note: 'Prove non-regularity with closure properties instead: $L \\cap a b^* c^* = \\{a b^j c^j\\}$, and intersection with a regular language preserves regularity.',
    samples(n) {
      const out = [];
      for (let t = 0; t < 8; t++) {
        const i = t % 3, j = Math.max(1, n + t);
        out.push(rep('a', i) + rep('b', j) + rep('c', i === 0 ? j + t : j));
        out.push(rep('b', n + t) + rep('c', t));
      }
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ======================= REGULAR DECOYS ================================= */

  /* ---------- 15 --------------------------------------------------------- */
  {
    id: 'astarbstar',
    title: 'Any a-block, any b-block',
    tex: 'L = \\{ a^n b^m \\mid n,m \\in \\N \\}',
    alphabet: ['a', 'b'],
    regular: true, pumpable: true, difficulty: 'easy',
    member(w) { return /^a*b*$/.test(w); },
    pumpLength: 1,
    trap: 'This one **is** regular: $L = L(a^* b^*)$, a two-state DFA. Nothing you choose can break it — the two blocks are not linked by any count.',
    defence: 'Take $n = 1$ and always let $v$ be a single character from the first block of $s$. Repeating one $a$ inside the $a$-block (or one $b$ inside the $b$-block) never disturbs the shape $a^*b^*$.',
    note: 'Compare with $\\{a^nb^n\\}$: the *shape* is identical, only the coupling of the two exponents is gone — and the coupling is what needs memory.',
    samples(n) {
      const out = [];
      for (let t = 0; t <= 6; t++) out.push(rep('a', n + t) + rep('b', t), rep('a', t) + rep('b', n + t), rep('a', n + t));
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ---------- 16 --------------------------------------------------------- */
  {
    id: 'mod3',
    title: 'Counts agree mod 3',
    tex: 'L = \\{ w \\in \\{a,b\\}^* \\mid count(w,a) \\equiv count(w,b) \;(mod\; 3) \\}',
    alphabet: ['a', 'b'],
    regular: true, pumpable: true, difficulty: 'medium',
    member(w) { return /^[ab]*$/.test(w) && (((count(w, 'a') - count(w, 'b')) % 3) + 3) % 3 === 0; },
    pumpLength: 3,
    trap: 'It counts — but only **modulo 3**, and a DFA with three states can do that. Counting is not the enemy; *unbounded* counting is.',
    defence: 'Take $n = 3$. Among the four prefixes of $s$ of length $0,1,2,3$ two must leave the automaton in the same residue class (pigeonhole) — the piece between them is your $v$, and it changes the difference by a multiple of 3.',
    note: 'The very same pigeonhole argument is the *proof* of the pumping lemma: $n$ = number of states of the DFA.',
    samples(n) {
      const out = [];
      for (let t = 0; t <= 6; t++) {
        out.push(rep('a', n + t) + rep('b', n + t));
        out.push(rep('a', 3 * (t + 1)) + rep('b', 3 * (t + 1)));
        out.push(('ab'.repeat(n + t)));
        out.push(rep('a', n + t + 3) + rep('b', n + t));
      }
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ---------- 17 --------------------------------------------------------- */
  {
    id: 'anbnle5',
    title: 'Equal blocks, but bounded',
    tex: 'L = \\{ a^n b^n \\mid n \\leq 5 \\}',
    alphabet: ['a', 'b'],
    regular: true, pumpable: true, difficulty: 'hard',
    member(w) { const p = ab(w); return !!p && p.i === p.j && p.i <= 5; },
    pumpLength: 11,
    trap: 'Every **finite** language is regular — just list its words as $r_1 + r_2 + ... + r_m$. Take $n = 11$: no word of $L$ is that long, so the condition "for all $s \\in L$ with $|s| \\geq n$" is **vacuously true**. Nothing to pump, nothing to break.',
    defence: 'Take $n = 11$. The longest word of $L$ is $a^5b^5$ with $|s| = 10 < 11$, so the Adversary can never even hand you a legal $s$.',
    note: 'This is the single most common exam trap: "it looks like $a^nb^n$, so it must be non-regular". Length matters.',
    samples(n) {
      const out = [];
      for (let k = 0; k <= 5; k++) out.push(rep('a', k) + rep('b', k));
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ---------- 18 --------------------------------------------------------- */
  {
    id: 'evenlen',
    title: 'Two blocks of even total length',
    tex: 'L = \\{ a^n b^m \\mid n + m \;\\mbox{is even} \\}',
    alphabet: ['a', 'b'],
    regular: true, pumpable: true, difficulty: 'medium',
    member(w) { const p = ab(w); return !!p && (p.i + p.j) % 2 === 0; },
    pumpLength: 4,
    trap: 'Parity is one bit of memory. $L = L\\bigl((aa)^*(bb)^* + (aa)^*a(bb)^*b\\bigr)$ — regular, and pumping in pairs is always safe.',
    defence: 'Take $n = 4$ and choose $v$ to be **two equal characters** inside one block: $v = aa$ when $|s|_a \\geq 2$, otherwise $v = bb$. Adding or deleting two characters preserves both the shape and the parity.',
    note: 'The decoy works because "even" *sounds* like counting. It is counting — modulo 2.',
    samples(n) {
      const out = [];
      for (let t = 0; t <= 6; t++) {
        out.push(rep('a', n + t) + rep('b', n + t));
        out.push('a' + rep('b', n + 2 * t + 1));
        out.push(rep('a', 2 * (n + t)));
      }
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ---------- 19 --------------------------------------------------------- */
  {
    id: 'div3',
    title: 'Binary multiples of three',
    tex: 'L = \\{ w \\in \\{0,1\\}^+ \\mid w \;\\mbox{read as a binary number is divisible by}\; 3 \\}',
    alphabet: ['0', '1'],
    regular: true, pumpable: true, difficulty: 'hard',
    member(w) {
      if (!/^[01]+$/.test(w)) return false;
      let r = 0;
      for (let i = 0; i < w.length; i++) r = (r * 2 + (w[i] === '1' ? 1 : 0)) % 3;
      return r === 0;
    },
    pumpLength: 3,
    trap: 'Arithmetic on arbitrarily large numbers — and still regular: the DFA only tracks the remainder, three states $\\{0,1,2\\}$ with $\\delta(r,c) = (2r+c) \;mod\; 3$.',
    defence: 'Take $n = 3$. Among the prefixes of length $0,1,2,3$ two give the same remainder (pigeonhole); the piece between them multiplies the value by a factor that is $\\equiv 1$, so it can be repeated freely.',
    note: 'The classic answer to "surely regular languages cannot do maths". They can do any *finite-state* maths.',
    samples(n) {
      const out = [];
      for (let t = 0; t <= 20; t++) {
        const v = 3 * (t + 1);
        const bits = v.toString(2);
        out.push(bits, '0'.repeat(Math.max(0, n - bits.length)) + bits);
      }
      out.push('0'.repeat(Math.max(1, n)));
      return out.filter(w => w.length >= n && this.member(w));
    },
  },

  /* ---------- 20 --------------------------------------------------------- */
  {
    id: 'abba',
    title: 'As many ab as ba',
    tex: 'L = \\{ w \\in \\{a,b\\}^* \\mid count(w,ab) = count(w,ba) \\}',
    alphabet: ['a', 'b'],
    regular: true, pumpable: true, difficulty: 'brutal',
    member(w) {
      if (!/^[ab]*$/.test(w)) return false;
      let x = 0, y = 0;
      for (let i = 0; i + 1 < w.length; i++) { if (w[i] === 'a' && w[i + 1] === 'b') x++; if (w[i] === 'b' && w[i + 1] === 'a') y++; }
      return x === y;
    },
    pumpLength: 3,
    trap: 'It looks like a counting language, but the two counts can differ by at most one: $L = \\{\\lambda\\} \\cup \\{w \\mid w \;\\mbox{starts and ends with the same character}\\}$ — a handful of states.',
    defence: 'Take $n = 3$ and split $s = s_0 \\cdot s_1 \\cdot rest$ as $u = s_0$, $v = s_1$, $w = rest$. Pumping the *second* character never changes the first or the last character of the word, so membership is untouched.',
    note: 'Whenever a "count" can only ever differ by a bounded amount, it is finite-state. Find the bound before you reach for the lemma.',
    samples(n) {
      const out = [];
      for (let t = 0; t <= 6; t++) {
        out.push('a' + 'ab'.repeat(n + t) + 'a');
        out.push('b' + 'ba'.repeat(n + t) + 'b');
        out.push(rep('a', n + t + 1));
        out.push('a' + rep('b', n + t) + 'a');
      }
      return out.filter(w => w.length >= n && this.member(w));
    },
  },
];

export const byId = Object.fromEntries(languages.map(l => [l.id, l]));

/** The three families, for grouping in the UI. */
export const FAMILIES = {
  breakable: { label: 'Pumping breaks it', hint: 'Non-regular, and the lemma proves it.', test: l => !l.regular && !l.pumpable },
  pumpable:  { label: 'Not regular — yet pumpable', hint: 'The lemma is necessary, not sufficient.', test: l => !l.regular && l.pumpable },
  decoy:     { label: 'Regular decoys', hint: 'They look non-regular. They are not.', test: l => l.regular },
};

export const family = l => (l.regular ? 'decoy' : l.pumpable ? 'pumpable' : 'breakable');

export default languages;
