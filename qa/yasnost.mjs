import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const BASE='http://127.0.0.1:4190';
const PAGES=['index','pitch','market','architecture','agent','security','policy','data-model','protocol','capture','telemetry','acceptance','roadmap','deployment','console','stack','legal','privacy','glossary','questions','sources','risks','adr','milestones','tz','performance'];
const WIDTHS=[360,390,768,1440];
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--hide-scrollbars']});
let fails=[];
async function checkPage(page,name,w){
  await page.goto(`${BASE}/${name}.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(600);
  const r=await page.evaluate(()=>{
    const de=document.documentElement;
    const overflowX=de.scrollWidth-de.clientWidth;
    // overlap probe: check for elements overflowing viewport horizontally
    let clip=0; const vw=de.clientWidth;
    const inScroller=el=>{let p=el.parentElement;while(p){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll')return true;p=p.parentElement;}return false;};
    for(const el of document.querySelectorAll('main *')){const rc=el.getBoundingClientRect(); if(rc.width>0 && rc.width<=vw+2 && (rc.right>vw+1.5||rc.left<-1.5) && !inScroller(el)) clip++;}
    // footer gap
    const foot=document.querySelector('.foot'); let footBottom=foot?foot.getBoundingClientRect().bottom:0;
    const docH=document.body.scrollHeight;
    return {overflowX, clip, docH, footBottom};
  });
  if(r.overflowX>1) fails.push(`${name}@${w}: overflowX=${r.overflowX}`);
  if(r.clip>0) fails.push(`${name}@${w}: ${r.clip} clipped els`);
  return r;
}
for(const w of WIDTHS){
  const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:1});
  const page=await ctx.newPage();
  for(const name of PAGES){ await checkPage(page,name,w); }
  await ctx.close();
}
// mermaid render check (1440)
{
  const ctx=await b.newContext({viewport:{width:1440,height:1000}});
  const page=await ctx.newPage();
  for(const name of ['architecture','security','policy','data-model','telemetry','acceptance','capture','console','deployment','roadmap','agent']){
    await page.goto(`${BASE}/${name}.html`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(2200);
    const svgs=await page.$$eval('.diagram svg',els=>els.length);
    const pres=await page.$$eval('pre.mermaid',els=>els.length);
    if(svgs<pres) fails.push(`${name}: mermaid rendered ${svgs}/${pres}`);
  }
  await ctx.close();
}
// theme + contrast sample + preloader + screenshots
{
  const ctx=await b.newContext({viewport:{width:1440,height:950}});
  const page=await ctx.newPage();
  // light shots
  await page.goto(`${BASE}/index.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1800);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/home-light-1440.png',fullPage:true});
  await page.goto(`${BASE}/architecture.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2400);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/architecture-light-1440.png',fullPage:true});
  await page.goto(`${BASE}/security.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2400);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/security-rbac-light-1440.png',fullPage:true});
  // dark theme
  await page.evaluate(()=>{localStorage.setItem('theme','dark')});
  await page.goto(`${BASE}/architecture.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2400);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/architecture-dark-1440.png',fullPage:true});
  await page.goto(`${BASE}/security.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2400);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/security-rbac-dark-1440.png',fullPage:true});
  await page.evaluate(()=>{localStorage.setItem('theme','light')});
  // preloader (fresh session: clear sessionStorage)
  await ctx.clearCookies();
  const p2=await ctx.newPage();
  await p2.addInitScript(()=>{try{sessionStorage.clear()}catch{}});
  await p2.goto(`${BASE}/pitch.html`);
  await p2.waitForTimeout(120);
  await p2.screenshot({path:'/workspace/design-research/yasnost-docs/preloader.png'});
  await p2.close();
  await ctx.close();
}
// 404
{
  const ctx=await b.newContext({viewport:{width:1440,height:950}});
  const page=await ctx.newPage();
  await page.goto(`${BASE}/404.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(800);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/404.png'});
  await ctx.close();
}
// mobile 390 home
{
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.waitForTimeout(1800);
  await page.screenshot({path:'/workspace/design-research/yasnost-docs/home-mobile-390.png',fullPage:true});
  await ctx.close();
}
await b.close();
console.log(fails.length? 'FAILS:\n'+fails.join('\n') : 'ALL CHECKS PASS');
