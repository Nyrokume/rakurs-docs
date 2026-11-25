import { chromium } from '/workspace/nyrokume-design-system/research/learning/lab-2026-11-25/node_modules/playwright-core/index.mjs';
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--hide-scrollbars']});
for (const [w,h] of [[1440,900],[390,844]]){const c=await br.newContext({viewport:{width:w,height:h}});const p=await c.newPage();
await p.goto('http://127.0.0.1:4190/security.html#rbac');await p.waitForTimeout(1200);
await p.screenshot({path:'/workspace/design-research/monitoring-docs/v2/after2-security-rbac-'+w+'-light.png'});await c.close();}
await br.close();
