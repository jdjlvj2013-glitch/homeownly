import { chromium } from 'playwright';
const B=process.argv[2];const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
await p.goto(B);await p.evaluate(()=>localStorage.clear());
for(const s of ['home','plus']){await p.goto(B+'#/'+s);await p.waitForTimeout(500);await p.screenshot({path:`screenshots/brand/${s}.png`});}
await p.goto(B+'#/?fresh=1');await p.reload();await p.waitForTimeout(600);await p.screenshot({path:'screenshots/brand/signup.png'});await b.close();
