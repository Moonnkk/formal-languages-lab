/* Headless smoke test: loads every route in a real browser and fails on any
   console error, page error, failed request or empty render.
   Run: node test/smoke.mjs        (needs the app served on PORT, default 8099)
   The lead runs this before every commit — `node --check` does not catch
   runtime import errors, and a blank page is the failure mode that matters. */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/usr/lib/node_modules/');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 8099);
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
                '.json':'application/json', '.svg':'image/svg+xml' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(PORT, r));

const ROUTES = ['dashboard','path','review','quiz','feynman','regex','automata',
                'grammar','parser','pumping','subset','atlas','settings'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium/chrome-linux/chrome' })
  .catch(() => chromium.launch());
const page = await browser.newPage();

const problems = [];
let route = '(boot)';
page.on('console', m => {
  if (m.type() === 'error') problems.push(`[${route}] console: ${m.text()}`);
});
page.on('pageerror', e => problems.push(`[${route}] pageerror: ${e.message}`));
page.on('requestfailed', r => problems.push(`[${route}] request failed: ${r.url()}`));
page.on('response', r => {
  if (r.status() >= 400) problems.push(`[${route}] HTTP ${r.status()}: ${r.url()}`);
});

const results = [];
for (route of ROUTES) {
  const before = problems.length;
  await page.goto(`http://127.0.0.1:${PORT}/#/${route}`, { waitUntil: 'load' });
  await page.evaluate(r => { location.hash = '#/' + r; }, route);
  await page.waitForTimeout(700);

  const info = await page.evaluate(() => {
    const m = document.querySelector('#main');
    return { chars: (m?.innerText || '').trim().length,
             construction: /under construction/i.test(m?.innerText || ''),
             buttons: m?.querySelectorAll('button').length || 0 };
  });
  const errs = problems.length - before;
  const ok = info.chars > 80 && !info.construction && !errs;
  results.push({ route, ...info, errs, ok });
}

await browser.close();
server.close();

const pad = s => String(s).padEnd(12);
console.log('\nroute        chars  btns  errs  status');
console.log('─'.repeat(46));
for (const r of results) {
  console.log(`${pad(r.route)} ${String(r.chars).padStart(5)} ${String(r.buttons).padStart(5)} ` +
              `${String(r.errs).padStart(5)}  ${r.ok ? 'ok' : r.construction ? 'MISSING' : 'FAIL'}`);
}
if (problems.length) {
  console.log('\nProblems:');
  for (const p of [...new Set(problems)].slice(0, 60)) console.log('  ' + p);
}
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} routes healthy`);
process.exit(bad.length ? 1 : 0);
