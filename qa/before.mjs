import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const tag = process.argv[2] || 'before';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--hide-scrollbars'] });
for (const [w,h] of [[1440,900],[390,844]]) for (const scheme of ['light','dark']) {
  const p = await (await b.newContext({viewport:{width:w,height:h},colorScheme:scheme})).newPage();
  for (const [n,u] of [['home',''],['tz-architecture','architecture.html']]) {
    await p.goto('http://127.0.0.1:4190/'+u,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
    await p.screenshot({path:`/workspace/design-research/monitoring-docs/v2/${tag}-${n}-${w}-${scheme}.png`});
  }
}
await b.close();
