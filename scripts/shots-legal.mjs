import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4174/homeownly/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const D = '/workspace/hvac-app/screenshots/legal/';
// 1. direct public visit, no state
await p.goto(BASE + '#/disclosure'); await p.waitForTimeout(800);
await p.screenshot({ path: D + '30-disclosure.png' });
await p.screenshot({ path: D + '30b-disclosure-full.png', fullPage: true });
console.log('disclosure h2:', await p.locator('.legal h2').textContent(), '| draft:', await p.locator('.legaldraft').count());
for (const s of ['privacy', 'terms']) { await p.goto(BASE + '#/' + s); await p.reload(); await p.waitForTimeout(500); await p.screenshot({ path: D + `31-${s}-full.png`, fullPage: true }); console.log(s, await p.locator('.legal h2').textContent(), await p.locator('.legaldraft').count()); }
// 2. demo state: settings footer, filter, reorder
await p.evaluate(() => localStorage.clear()); await p.goto(BASE + '#/home'); await p.reload(); await p.waitForTimeout(600);
await p.goto(BASE + '#/settings'); await p.waitForTimeout(400); await p.addStyleTag({ content: '.tabs{position:static!important}' }); await p.screenshot({ path: D + '32-account-footer.png', fullPage: true });
console.log('account legal links:', await p.locator('.legallinks a').count());
await p.locator('.legallinks a', { hasText: 'Privacy Policy' }).click(); await p.waitForTimeout(300); console.log('nav from account ->', await p.locator('h1').textContent(), '| tabs:', await p.locator('nav.tabs').count());
await p.goto(BASE + '#/filter'); await p.waitForTimeout(400); await p.screenshot({ path: D + '33-filter-commission.png' }); console.log('filter commission:', await p.locator('.commission').count());
await p.goto(BASE + '#/reorder'); await p.waitForTimeout(400); await p.screenshot({ path: D + '34-reorder-commission.png' }); console.log('reorder commission:', await p.locator('.commission').count());
// 3. signup screen (fresh)
await p.goto(BASE + '#/?fresh=1'); await p.reload(); await p.waitForTimeout(600); await p.screenshot({ path: D + '35-signup-agree.png', fullPage: true });
console.log('signup agree links:', await p.locator('.agree a').count());
await p.locator('.agree a', { hasText: 'Terms of Use' }).click(); await p.waitForTimeout(300); console.log('signup -> terms h1:', await p.locator('h1').textContent(), '| tabs:', await p.locator('nav.tabs').count());
await p.goBack(); await p.waitForTimeout(300); console.log('back ->', await p.locator('h1').textContent());
await p.goto(BASE + '#/auth'); await p.waitForTimeout(300); console.log('auth agree:', await p.locator('.agree a').count());
console.log('errors:', errs); await b.close();
