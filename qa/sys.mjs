import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--hide-scrollbars'] });
for (const [w,h] of [[1440,900],[390,844]]) {
  const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage(); const errs=[];
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('response',r=>{if(r.status()>=400&&!r.url().includes('/x/y/'))errs.push(r.status()+' '+r.url())});
  await p.goto('https://nyrokume.github.io/rakurs-docs/x/y/nope',{waitUntil:'networkidle'});
  await p.screenshot({path:`/workspace/design-research/monitoring-docs/404-${w}.png`});
  await p.goto('https://nyrokume.github.io/rakurs-docs/error.html',{waitUntil:'networkidle'});
  await p.screenshot({path:`/workspace/design-research/monitoring-docs/error-${w}.png`});
  console.log(w, 'errs', errs, 'hscroll', await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
}
await b.close();
