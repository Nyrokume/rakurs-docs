import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const B='http://127.0.0.1:4190/', O='/workspace/design-research/monitoring-docs/v2/';
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--hide-scrollbars']});
for (const [w,h] of [[1440,900],[390,844]]) for (const sc of ['light','dark']) {
  const c=await br.newContext({viewport:{width:w,height:h},colorScheme:sc}); const p=await c.newPage();
  await p.goto(B+'404.html'); await p.waitForTimeout(1200); await p.screenshot({path:`${O}after-404-${w}-${sc}.png`});
  await c.close();
}
// script failure banner
{ const c=await br.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage();
  await p.route('**/assets/site.js', r=>r.abort()); await p.goto(B+'tz.html'); await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{const e=document.querySelector('.ef');const t=document.querySelector('.top').getBoundingClientRect();const b=e&&e.getBoundingClientRect();return {ef:!!e,banner:b&&[b.top,b.bottom],top:[t.top,t.bottom],h1:document.querySelector('h1').getBoundingClientRect().top}});
  console.log('banner',JSON.stringify(r)); await p.screenshot({path:`${O}after-script-fail-1440.png`}); await c.close(); }
for (const w of [1440,390]) { const c=await br.newContext({viewport:{width:w,height:844}}); const p=await c.newPage();
  await p.route('**/assets/site.js', async r=>{await new Promise(z=>setTimeout(z,1700)); r.continue()});
  p.goto(B+'pitch.html').catch(()=>{}); await p.waitForTimeout(1300);
  await p.screenshot({path:`${O}after-preloader-slow-${w}.png`}); await p.waitForTimeout(2500); await c.close(); }
{ const c=await br.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage(); await p.goto(B+'protocol.html'); await p.waitForTimeout(1500);
  await p.hover('.theme-btn'); await p.waitForTimeout(300); await p.screenshot({path:`${O}after-tooltip-theme.png`,clip:{x:1100,y:0,width:340,height:120}});
  const cb=p.locator('.code .copy').first(); await cb.scrollIntoViewIfNeeded(); await cb.hover(); await p.waitForTimeout(300); await p.screenshot({path:`${O}after-tooltip-copy.png`});
  await p.goto(B+'sources.html'); await p.waitForTimeout(800); await p.locator('.pager').scrollIntoViewIfNeeded(); await p.screenshot({path:`${O}after-pager-last.png`}); await c.close(); }
{ const c=await br.newContext({viewport:{width:1440,height:900},userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'}); const p=await c.newPage();
  await p.addInitScript(()=>Object.defineProperty(navigator,'platform',{get:()=>'MacIntel'})); await p.goto(B); await p.waitForTimeout(900);
  console.log('mac kbd', await p.textContent('.kbd-k')); await c.close(); }
await br.close();
