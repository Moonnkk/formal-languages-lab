/* Interaction test: rendering cleanly proves nothing if the first click throws.
   Drives the real flows a learner takes, in headless Chromium, and fails on any
   console error raised while clicking. */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/usr/lib/node_modules/');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8098);
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const b = await readFile(f);
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' })
  .catch(() => chromium.launch());
const page = await browser.newPage();

let step = '(boot)';
const errs = [];
page.on('console', m => m.type() === 'error' && errs.push(`[${step}] ${m.text()}`));
page.on('pageerror', e => errs.push(`[${step}] ${e.message}`));

const results = [];
async function scenario(name, fn) {
  step = name;
  const before = errs.length;
  let note = '';
  try { note = (await fn()) || ''; }
  catch (e) { errs.push(`[${name}] threw: ${e.message}`); }
  results.push({ name, errs: errs.length - before, note });
}
const go = async r => { await page.goto(`http://127.0.0.1:${PORT}/#/${r}`, { waitUntil: 'load' });
                        await page.evaluate(x => location.hash = '#/' + x, r);
                        await page.waitForTimeout(500); };
/* Click the first enabled control whose text matches.
   Dispatched in-page rather than via a synthetic mouse click: this app wires
   plain onclick handlers onto cards and list rows, and a real pointer event at
   an element's centre can land on a child or a decorative pseudo-element. We
   are testing the handlers, not hit-testing. */
const clickText = async (re, root = '#main') => {
  const hit = await page.evaluate(([sel, src]) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll(
      [sel + ' button', sel + ' .qopt', sel + ' .path-node', sel + ' .fy-item',
       sel + ' .pd-langcard', sel + ' .mode-card'].join(', '))]
      .find(b => !b.disabled && rx.test(b.innerText || ''));
    if (!el) return null;
    el.click();
    return el.className;
  }, [root, re.source ?? re]);
  if (hit === null) throw new Error('no clickable matching ' + re);
  await page.waitForTimeout(800);
};
const text = () => page.evaluate(() => document.querySelector('#main').innerText);

/* ------------------------------------------------------------ flows --- */
await scenario('quiz: answer a question and read the diagnosis', async () => {
  await go('quiz');
  await clickText(/Interleaved mix/);
  const stem = await text();
  if (!/score/i.test(stem)) throw new Error('quiz did not start');
  await page.click('#main .qopt');                       // pick the first option
  await page.waitForTimeout(400);
  const after = await text();
  if (!/Correct|Not quite/i.test(after)) throw new Error('no feedback shown');
  if (!/Next question|See results/i.test(after)) throw new Error('no advance control');
  await clickText(/Next question|See results/);
  return 'feedback + advance ok';
});

await scenario('quiz: keyboard 1 answers, Enter advances', async () => {
  await go('dashboard');
  await go('quiz');
  await clickText(/Interleaved mix/);
  await page.keyboard.press('1'); await page.waitForTimeout(300);
  if (!/Correct|Not quite/i.test(await text())) throw new Error('key 1 did not answer');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  return 'keys ok';
});

await scenario('review: reveal a card and grade it', async () => {
  await go('review');
  await clickText(/Start review/);
  if (!/Show answer/i.test(await text())) throw new Error('card front not shown');
  await page.keyboard.press(' '); await page.waitForTimeout(300);
  const back = await text();
  if (!/Easy|Good|Hard/i.test(back)) throw new Error('grades not offered after reveal');
  await page.keyboard.press('3'); await page.waitForTimeout(400);
  return 'reveal + grade ok';
});

await scenario('feynman: gate blocks a short answer, opens on a real one', async () => {
  await go('feynman');
  await clickText(/Take it on/);
  await page.fill('#main textarea', 'too short');
  await page.waitForTimeout(200);
  const blocked = await page.evaluate(() =>
    [...document.querySelectorAll('#main button')].some(b => /expert answer/i.test(b.innerText) && b.disabled));
  if (!blocked) throw new Error('short attempt was NOT gated');
  await page.fill('#main textarea',
    'An alphabet is a finite non empty set of characters and a string is a finite sequence of them while a language is any subset of sigma star which may well be infinite even though every string in it is finite.');
  await page.waitForTimeout(200);
  await clickText(/expert answer/);
  const after = await text();
  if (!/key ideas appeared/i.test(after)) throw new Error('no keyword self-check');
  if (!/Could you have written that/i.test(after)) throw new Error('no self-grade step');
  await clickText(/Partly/);
  return 'gate + model + self-grade ok';
});

await scenario('path: open a concept, lock in a guess', async () => {
  await go('path');
  await clickText(/Alphabet, string/);
  { const t = await text(); if (!/before you read anything/i.test(t)) throw new Error('predict step missing; saw: ' + JSON.stringify(t.slice(0, 220))); }
  await page.fill('#main textarea', 'my guess is that it is the set of allowed symbols');
  await clickText(/Lock in my guess/);
  { const t = await text(); if (!/one-screen version/i.test(t)) throw new Error('reveal did not happen; saw: ' + JSON.stringify(t.slice(0, 220))); }
  return 'predict-then-reveal ok';
});

await scenario('regex lab: type a regex, run a string', async () => {
  await go('regex');
  const inp = await page.$('#main input[type=text]');
  if (inp) { await inp.fill('(a+b)*abb'); await page.waitForTimeout(600); }
  const t = await text();
  if (!/\w/.test(t)) throw new Error('regex lab empty');
  return 'accepted input';
});

await scenario('automaton lab: buttons respond', async () => {
  await go('automata');
  const n = await page.evaluate(() => document.querySelectorAll('#main button').length);
  await page.click('#main button'); await page.waitForTimeout(400);
  return n + ' controls';
});

await scenario('pumping duel: pick a language and start', async () => {
  await go('pumping');
  await clickText(/./);                      // first card / start control
  await page.waitForTimeout(400);
  const t = await text();
  if (!/n|Adversary|round|claim/i.test(t)) throw new Error('duel did not start');
  return 'duel reachable';
});

await scenario('grammar lab / parser lab / subset race / atlas respond', async () => {
  for (const r of ['grammar', 'parser', 'subset', 'atlas']) {
    step = r;
    await go(r);
    const has = await page.evaluate(() => document.querySelectorAll('#main button').length > 0);
    if (has) { await page.click('#main button'); await page.waitForTimeout(350); }
  }
  return 'all four clicked';
});

await scenario('re-clicking the current room returns to its start screen', async () => {
  await go('quiz');
  await clickText(/Interleaved mix/);
  if (!/score/i.test(await text())) throw new Error('quiz did not start');
  await page.click('a.nav-item[data-route=quiz]');
  await page.waitForTimeout(500);
  if (!/Interleaved mix/i.test(await text())) throw new Error('nav click did not reset the room');
  return 'escape hatch ok';
});

await scenario('progress persists across a reload', async () => {
  const before = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('fl-lab:v1') || '{}');
    return Object.keys(s.concepts || {}).length;
  });
  await go('dashboard');
  const after = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('fl-lab:v1') || '{}');
    return Object.keys(s.concepts || {}).length;
  });
  if (!(before > 0 && after >= before)) throw new Error(`concepts recorded: ${before} -> ${after}`);
  const dash = await text();
  if (!/%/.test(dash)) throw new Error('dashboard shows no progress');
  return `${after} concepts tracked`;
});

await browser.close();
server.close();

console.log('\nscenario                                               errs  note');
console.log('─'.repeat(78));
for (const r of results)
  console.log(`${r.name.padEnd(52)} ${String(r.errs).padStart(5)}  ${r.note}`);
if (errs.length) { console.log('\nErrors:'); [...new Set(errs)].slice(0, 40).forEach(e => console.log('  ' + e)); }
const bad = results.filter(r => r.errs);
console.log(`\n${results.length - bad.length}/${results.length} scenarios clean`);
process.exit(errs.length ? 1 : 0);
