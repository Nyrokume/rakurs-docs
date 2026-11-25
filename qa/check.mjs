import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:4190/';
const OUT = '/workspace/design-research/monitoring-docs/';
const pages = ['','pitch.html','market.html','risks.html','roadmap.html','stack.html','capture.html','telemetry.html','adr.html','tz.html','architecture.html','agent.html','policy.html','data-model.html','protocol.html','console.html','security.html','performance.html','deployment.html','acceptance.html','milestones.html','legal.html','privacy.html','glossary.html','questions.html','sources.html'];
const shots = new Set(['','pitch.html','stack.html','architecture.html','policy.html','legal.html','market.html']);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--hide-scrollbars'] });
const report = [];
for (const [w,h,tag] of [[1440,900,'1440'],[390,844,'390']]) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h}, locale:'ru-RU', colorScheme:'light' });
  for (const p of pages) {
    const page = await ctx.newPage(); const errs=[];
    page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()) });
    page.on('pageerror', e=>errs.push('pageerror: '+e.message));
    page.on('response', r=>{ if(r.status()>=400) errs.push(r.status()+' '+r.url()) });
    await page.goto(BASE+p, { waitUntil:'networkidle' });
    const nd = await page.locator('pre.mermaid').count();
    if (nd) await page.waitForFunction(n=>document.querySelectorAll('pre.mermaid svg').length>=n, nd, {timeout:15000}).catch(()=>{});
    await page.waitForTimeout(700);
    const r = await page.evaluate(()=>{
      const out={};
      out.hscroll = document.documentElement.scrollWidth - innerWidth;
      out.svg = document.querySelectorAll('pre.mermaid svg').length;
      out.mermaidErr = [...document.querySelectorAll('pre.mermaid')].filter(n=>/Syntax error|error in text/i.test(n.textContent)).length + document.querySelectorAll('.dg-err').length;
      const doc=document.querySelector('.doc').getBoundingClientRect();
      const bad=[];
      for(const el of document.querySelectorAll('.doc *')){
        if(el.closest('.table,.code,.diagram,svg')) continue;
        const b=el.getBoundingClientRect(); if(!b.width) continue;
        if(b.right>doc.right+2||b.left<doc.left-2) bad.push(el.tagName+'.'+el.className+':'+(el.textContent||'').slice(0,30));
      }
      out.overflow=bad.slice(0,5);
      const toc=document.querySelector('.toc'); if(toc&&getComputedStyle(toc).display!=='none'){const t=toc.getBoundingClientRect(); out.tocOverlap = t.left < doc.right-1;}
      const side=document.querySelector('.side').getBoundingClientRect(); const main=document.querySelector('.main').getBoundingClientRect();
      out.sideOverlap = getComputedStyle(document.querySelector('.side')).position==='sticky' && side.right>main.left+1;
      out.pl = document.documentElement.classList.contains('is-loading');
      return out;
    });
    report.push({w:tag,p:p||'index',errs,...r});
    if (shots.has(p)) await page.screenshot({ path: `${OUT}${(p||'index').replace('.html','')}-${tag}.png`, fullPage: false });
    await page.close();
  }
  // extra states
  const page = await ctx.newPage(); await page.goto(BASE+'stack.html',{waitUntil:'networkidle'}); await page.waitForTimeout(600);
  await page.keyboard.press('Control+k'); await page.keyboard.type('реестр'); await page.waitForTimeout(500);
  const n = await page.locator('.search-r li').count(); report.push({w:tag,p:'search:реестр',results:n});
  await page.screenshot({path:`${OUT}search-${tag}.png`}); await page.keyboard.press('Escape');
  if (tag==='390'){ await page.click('.menu-btn'); await page.waitForTimeout(400); await page.screenshot({path:`${OUT}menu-390.png`}); }
  await page.close();
  await ctx.close();
}
const dctx = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme:'dark' });
const dp = await dctx.newPage(); await dp.goto(BASE+'architecture.html',{waitUntil:'networkidle'}); await dp.waitForTimeout(1500);
await dp.screenshot({path:`${OUT}architecture-dark-1440.png`});
await dp.goto(BASE+'policy.html',{waitUntil:'networkidle'}); await dp.waitForTimeout(800); await dp.screenshot({path:`${OUT}policy-dark-1440.png`});
await browser.close();
const problems = report.filter(r=>(r.errs&&r.errs.length)||r.hscroll>0||(r.overflow&&r.overflow.length)||r.mermaidErr||r.tocOverlap||r.sideOverlap||r.pl);
console.log(JSON.stringify(problems,null,1));
console.log('checked', report.length, 'problems', problems.length);
console.log(report.filter(r=>r.p.startsWith('search')||r.svg).map(r=>`${r.w} ${r.p} svg=${r.svg??''} res=${r.results??''}`).join('\n'));
