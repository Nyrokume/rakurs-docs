import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--hide-scrollbars'] });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
for (const n of ['architecture','pitch']) {
await p.goto(`http://127.0.0.1:4190/${n}.html`,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
await p.screenshot({path:`/workspace/design-research/monitoring-docs/${n}-1440-full.png`, fullPage:true});
}
await b.close();
