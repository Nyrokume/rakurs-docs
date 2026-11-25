import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--hide-scrollbars'] });
const urls = {claude:'https://docs.claude.com/en/docs/intro', claude2:'https://docs.claude.com/en/docs/build-with-claude/prompt-caching', stripe:'https://docs.stripe.com/payments/accept-a-payment', linear:'https://linear.app/docs/conceptual-model', vercel:'https://vercel.com/docs/functions'};
for (const [w,h] of [[1440,900],[390,844]]) {
  const ctx = await b.newContext({viewport:{width:w,height:h}, userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0 Safari/537.36'});
  for (const [k,u] of Object.entries(urls)) {
    const p = await ctx.newPage();
    try { await p.goto(u,{waitUntil:'domcontentloaded',timeout:40000}); await p.waitForTimeout(4000);
      await p.screenshot({path:`/workspace/design-research/monitoring-docs/v2/refs/${k}-${w}.png`});
      if (w===1440) { const m = await p.evaluate(()=>{const g=e=>e&&getComputedStyle(e);const h1=document.querySelector('h1'),pp=document.querySelector('main p, article p');return {h1:h1&&[g(h1).fontFamily,g(h1).fontSize,g(h1).fontWeight,g(h1).lineHeight],p:pp&&[g(pp).fontFamily,g(pp).fontSize,g(pp).lineHeight,g(pp).color,pp.getBoundingClientRect().width],bg:g(document.body).backgroundColor}}); console.log(k, JSON.stringify(m)); }
    } catch(e){ console.log(k,'ERR',e.message.slice(0,100)) }
    await p.close();
  }
}
await b.close();
