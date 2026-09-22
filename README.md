# Formal Languages Lab

An interactive trainer for **Karl Stroetmann's *Formal Languages & Compilers*** lecture
([karlstroetmann/Formal-Languages](https://github.com/karlstroetmann/Formal-Languages)).

It is not a second set of lecture notes. The notes already exist and they are good.
This is the thing the notes cannot be: something that **asks you questions**,
**runs the algorithms in front of you**, and **remembers what you have forgotten**.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no `npm install`, no CDN, no network at runtime. Plain ES modules.
Your progress lives in this browser's `localStorage` — export a backup from Settings.

## What is in it

| Room | What it does |
|---|---|
| **Dashboard** | One recommendation for the next 20 minutes, based on what is due and what is weak |
| **Learning Path** | The concept graph in prerequisite order: guess → one screen → get tested → write it in your own words |
| **Daily Review** | SM-2 spaced repetition over the whole syllabus |
| **Quiz Arena** | Multiple choice where every wrong option is a *named misconception* with a counter-example |
| **Explain It Back** | Write the idea in your own words before seeing the expert version, then grade yourself |
| **Regex Lab** | regex → syntax tree → Thompson NFA → subset-construction DFA → minimal DFA, stage by stage, with a string you can run through all of them |
| **Automaton Lab** | Build and step automata; work the subset construction and minimisation by hand with the engine checking you |
| **Grammar Lab** | Derive strings by clicking rules, watch the parse tree grow, fight ambiguity, drill First/Follow |
| **Parser Lab** | Shift-reduce by hand against a real SLR table, the LR(0) item automaton, conflicts explained, the Earley chart |
| **Pumping Duel** | The pumping lemma as a two-player game against an Adversary — because the lemma *is* a quantifier alternation, and turn order is the only way that ever becomes intuitive |
| **Subset Race** | Timed drill on ε-closures and the powerset construction |
| **Concept Atlas** | Searchable index, dependency graph, notation cheat-sheet, theorem statements |

## Why it is built this way

Humans do not learn by reading, however strongly it feels like they do. Re-reading
produces *fluency with the text*, which the brain mistakes for *knowledge of the idea*.
Four interventions beat it consistently in the literature, and each one is a room here:

- **Retrieval practice** — being asked and struggling before being told. Every module asks first.
- **Spacing** — meeting a fact again just as it fades. That is the Daily Review scheduler.
- **Interleaving** — mixing topics so you must *choose* the method, not just apply the obvious one. Quiz Arena defaults to mixed.
- **Generation** — producing an explanation in your own words. That is Explain It Back.

On top of that, the labs exist because automata, parse tables and code generation are
**procedures**. You cannot memorise a procedure. You have to run it, be wrong, and see
where it broke — which is why every lab is steppable and every error gets a diagnosis
rather than a red cross.

Two smaller principles run through the whole thing: **worked-example fading** (the first
instance is done for you, the second gives hints, the third is blank) and **desirable
difficulty** (no hint arrives until you have actually tried).

## Layout

```
index.html          shell
css/app.css         design tokens; css/modules/*.css per feature
js/app.js           hash router + lazy module loader
js/core/store.js    learner state, mastery estimates
js/core/srs.js      SM-2 scheduler
js/core/ui.js       DOM helpers + a tiny LaTeX-subset renderer
js/core/automata.js regex/NFA/DFA engine
js/core/grammar.js  CFG, Earley, LR engine
js/modules/*.js     one file per room
data/*.js           curriculum graph, cards, quiz bank, prompts, languages
test/smoke.mjs      headless check: every route renders, no console errors
test/engines.mjs    algorithm + content correctness (no browser needed)
test/interact.mjs   drives the real learner flows in headless Chromium
CONTRACT.md         the build contract the modules are written against
```

## Test

```bash
node test/engines.mjs     # 83 assertions, no browser
node test/smoke.mjs       # every route renders cleanly
node test/interact.mjs    # the real click-paths work
```

`engines.mjs` checks results that are true independently of the implementation:
that `(a+b)*a(a+b)(a+b)` minimises to exactly 8 states, that minimisation
preserves the language, that `a*` and `aa*` differ and the witness is `ε`, that
First/Follow on the layered expression grammar match the lecture, that the
layered grammar is SLR-conflict-free while the naive one is not, and that
`2+3*4` is ambiguous in one and not the other. It also validates the content
banks — every concept id real, every answer index in range, and **every
distractor carrying a diagnosis**, since that is the part of a quiz that
actually teaches.

`smoke.mjs` and `interact.mjs` need headless Chromium. They caught four real
bugs during the build that `node --check` passed straight over, including a
`tex()` renderer silently leaking raw `\langle` and `\leq` into the page.

## Credit & caveat

Course material © Prof. Dr. Karl Stroetmann. This trainer is an independent study
aid built on top of that syllabus. Where this app and the lecture notes disagree,
**the notes are right** — that is the material the exam is set from.
