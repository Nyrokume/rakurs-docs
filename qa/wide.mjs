import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto('http://127.0.0.1:4190/glossary.html',{waitUntil:'networkidle'});
console.log(await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))));
await b.close();
