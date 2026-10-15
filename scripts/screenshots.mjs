import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:5173/';
const shots = ['home','equipment','nameplate','log','addlog','filter','agreement','plus','bills','reorder','warranty','homes','report','replace','settings'];
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.goto(BASE + '#/home'); await p.waitForTimeout(400);
let i = 1;
for (const s of shots) { await p.goto(BASE + '#/' + s); await p.waitForTimeout(350);
  await p.screenshot({ path: `screenshots/${String(i++).padStart(2,'0')}-${s}.png` }); }
// --- New Plus features (numbered 20+) ---
const snap = async (n, full) => { await p.waitForTimeout(350); if (full) await p.addStyleTag({ content: '.tabs{position:static!important}' }); await p.screenshot({ path: `screenshots/${n}.png`, fullPage: !!full }); };
await p.goto(BASE + '#/company/' + encodeURIComponent('Example HVAC Co.')); await snap('20-company-costs');
await p.goto(BASE + '#/log'); await snap('20c-log-typical');
await p.goto(BASE + '#/callhelper'); await snap('21a-call-symptoms');
await p.locator('button.sym', { hasText: 'No cooling' }).first().click(); await p.evaluate(()=>scrollTo(0,0)); await snap('21-call-helper');
await p.goto(BASE + '#/callhelper'); await p.reload(); await p.locator('button.sym', { hasText: 'Burning or electrical smell' }).click(); await snap('22c-call-helper-burning');
await p.goto(BASE + '#/home'); await p.goto(BASE + '#/callhelper'); await p.locator('button.sym', { hasText: 'Gas smell (rotten eggs)' }).click(); await snap('22b-call-helper-gas');
await p.goto(BASE + '#/home'); await p.goto(BASE + '#/callhelper'); await p.locator('button.sym', { hasText: 'Water leak' }).click(); await p.locator('.seg button', { hasText: 'Not sure' }).first().click(); await p.waitForTimeout(100); await p.locator('.panelsafety').scrollIntoViewIfNeeded(); await snap('21d-panel-safety'); await p.locator('.panelsafety button').click(); await p.waitForTimeout(100); await p.locator('.seg').nth(1).locator('button', { hasText: 'Yes' }).click(); await p.locator('.banner.warn').scrollIntoViewIfNeeded(); await snap('21b-drain-switch-ice');
await p.goto(BASE + '#/insights/nocool'); await snap('23-history-insights', true);
await p.evaluate(() => { const k='homekeep-state-v1'; const s=JSON.parse(localStorage.getItem(k)); s.activeEquipmentId='sys2'; localStorage.setItem(k,JSON.stringify(s)); });
await p.goto(BASE + '#/insights'); await p.reload(); await snap('24-insights-locked');
await p.evaluate(() => { const k='homekeep-state-v1'; const s=JSON.parse(localStorage.getItem(k)); s.activeEquipmentId='sys1'; localStorage.setItem(k,JSON.stringify(s)); });
await p.goto(BASE + '#/home'); await p.goto(BASE + '#/callhelper/airflow'); await p.reload(); await p.locator('details.checks summary').click(); await p.locator('details.checks').scrollIntoViewIfNeeded(); await snap('25-call-manual-checks');
await p.evaluate(() => { const k='homekeep-state-v1'; const s=JSON.parse(localStorage.getItem(k)); s.plan.trialStart=new Date(Date.now()-61*864e5).toISOString(); localStorage.setItem(k,JSON.stringify(s)); });
await p.goto(BASE + '#/bills'); await p.reload(); await p.waitForTimeout(400); await p.screenshot({ path: `screenshots/${String(i++).padStart(2,'0')}-paywall.png` });
await p.evaluate(() => { const k='homekeep-state-v1'; const s=JSON.parse(localStorage.getItem(k)); s.user.signedUp=false; localStorage.setItem(k,JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(400); await p.screenshot({ path: `screenshots/${String(i++).padStart(2,'0')}-signup.png` });
await b.close(); console.log('done', i - 1);
