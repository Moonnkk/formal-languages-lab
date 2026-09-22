# Formal Languages Lab — build contract

Static ES-module web app. **No build step, no npm, no CDN, no network at runtime.**
Serve with `python3 -m http.server` from the repository root. Must work offline in a
modern browser. Everything is plain `.js`, `.css`, `.html`.

## Layout

```
index.html            # shell (core owns — DO NOT EDIT)
css/app.css           # design tokens + shell (core owns — DO NOT EDIT)
css/modules/*.css     # one file per feature area (you own yours)
js/app.js             # router + nav (core owns — DO NOT EDIT)
js/core/store.js      # learner state (core owns)
js/core/srs.js        # SM-2 scheduler (core owns)
js/core/ui.js         # DOM helpers (core owns)
js/core/<engine>.js   # shared algorithm engines (feature owner writes)
js/modules/<route>.js # one file per route (feature owner writes)
data/*.js             # content banks (content owner writes)
```

## Module contract

Each file in `js/modules/` default-exports:

```js
export default {
  id: 'regex',                 // matches the route id in js/app.js ROUTES
  title: 'Regex Lab',
  mount(root, ctx) {           // root is an empty <div> inside #main
     // build DOM into root
     return () => { /* optional cleanup: timers, listeners */ };
  }
};
```

`ctx = { store, srs, ui, curriculum, go, params }`
- `go('dashboard')` navigates. `ctx.params` is a `URLSearchParams`.

## ui helpers (`js/core/ui.js`)

- `h('div.card#id', {onclick, html, text, style, ...attrs}, ...children)` → element
- `$`, `$$`, `clear(el)`, `esc(s)`
- `tex(s)` → HTML. Renders `$..$`, `^{}`, `_{}`, backtick-code, `**bold**` and
  LaTeX symbol macros (`\epsilon \Sigma \delta \to \in \cup \subseteq \emptyset` …).
  **Use it for every piece of prose/notation you display.** It escapes HTML for you.
- `toast(msg, 'good'|'bad')`, `shuffle(a, seed?)`, `pick(a)`, `sleep(ms)`
- `ring(0..1, size, stroke, color)` → svg string
- `loadCss('css/modules/yours.css')` — call once at the top of `mount()`
- `pageHead(eyebrow, title, lede)` → `<header>` element

## store (`js/core/store.js`)

- `store.record(conceptId, correct: boolean, xp = 1)` — **call this on every
  graded interaction.** It drives the whole progress system.
- `store.mastery(conceptId)` → 0..1 (time-decayed)
- `store.logSession(kind, correct, total)`
- `store.flag(key, value?)` — per-module persisted scratch state (get with one arg)
- `store.state.notes`, `.quiz`, `.cards` — don't write these directly outside core.

## srs (`js/core/srs.js`)

`srs.queue(ids)`, `srs.review(id, grade0to5)`, `srs.stats(ids)`, `srs.humanDue(id)`,
`srs.isDue(id)`, `GRADES`.

## Concept ids (`data/curriculum.js`)

Tag everything with an id from `concepts`. The full list:

alphabet, concat, regex-syntax, regex-sem, regex-algebra, scanner, dfa, dfa-run,
nfa, eclosure, thompson, subset, minimize, closure-props, product, emptiness,
pumping, nonregular, cfg, derivation, parse-tree, ambiguity, precedence, topdown,
earley, shiftreduce, lr-items, follow, slr, conflicts, ast, jasmin, codegen

## CSS rules

Use the tokens: `--bg --bg-raised --bg-sunken --panel --border --border-strong
--text --text-dim --text-faint --accent --good --warn --bad --magic` (+ `-soft`
variants), `--mono --sans`, `--r-sm --r-md --r-lg`, `--shadow`.
Existing classes: `.card .grid.c2 .grid.c3 .row .spacer .btn-primary .btn-good
.btn-bad .btn-ghost .btn-sm .tag(.accent/.good/.warn/.bad/.magic) .bar>i .kbd
.muted .faint .small .center .callout(.good/.bad/.warn) .fade-in`.
**Never hard-code a colour** — light theme must work (`html[data-theme=light]`).

## Pedagogy rules (non-negotiable)

The user is a human preparing for an exam, not a machine reading a spec.

1. **Retrieval before exposition.** Ask first, reveal after. Never a wall of text.
2. **Every wrong answer gets a diagnosis**, not just "wrong" — name the specific
   misconception and show the counter-example.
3. **Show the machine running**, step by step, with a control the learner drives
   (step / back / play / speed). Animation without control is a video, not a lab.
4. **Worked-example fading**: first instance fully worked, then partially, then blank.
5. **Desirable difficulty**: no hint until the learner has actually tried.
6. Keep each interaction under ~90 seconds. Humans have a working-memory budget.
7. German-language lecture, English notes → keep UI text English, but use the
   lecture's exact notation and symbol conventions.

## Quality bar

- `node --check <file>` must pass for every JS file you write.
- No `innerHTML` with unescaped user input (use `tex()`/`esc()`).
- Handle malformed learner input gracefully — never throw into a blank page.
- Self-contained: your module must work if every other module is missing.
