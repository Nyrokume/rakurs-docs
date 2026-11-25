/* Mermaid: рендер схем с темой сайта. Если CDN недоступен, остаётся исходник схемы и короткая пометка. */
const nodes=[...document.querySelectorAll('pre.mermaid')];
if(nodes.length){
  const vars=()=>{const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
    const toHex=c=>{const x=document.createElement('canvas').getContext('2d');x.fillStyle=c;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('')};
    const c=n=>toHex(g(n));
    return {fontFamily:'"Golos Text",system-ui,sans-serif',fontSize:'14px',
      primaryColor:c('--primary-soft'),primaryBorderColor:c('--primary'),primaryTextColor:c('--foreground'),
      lineColor:c('--muted-foreground'),textColor:c('--foreground'),secondaryColor:c('--muted'),tertiaryColor:c('--card'),
      clusterBkg:c('--muted'),clusterBorder:c('--border-strong'),noteBkgColor:c('--warn-bg'),noteTextColor:c('--foreground'),noteBorderColor:c('--border-strong'),
      actorBkg:c('--primary-soft'),actorBorder:c('--primary'),actorTextColor:c('--foreground'),actorLineColor:c('--border-strong'),signalColor:c('--prose'),signalTextColor:c('--foreground'),
      labelBoxBkgColor:c('--muted'),labelBoxBorderColor:c('--border-strong'),labelTextColor:c('--foreground'),loopTextColor:c('--foreground'),
      edgeLabelBackground:c('--card'),mainBkg:c('--primary-soft'),nodeBorder:c('--primary'),
      sectionBkgColor:c('--primary-soft'),altSectionBkgColor:c('--muted'),taskBkgColor:c('--primary'),taskBorderColor:c('--primary'),taskTextColor:c('--primary-foreground'),taskTextOutsideColor:c('--foreground'),gridColor:c('--border'),todayLineColor:c('--danger'),
      attributeBackgroundColorOdd:c('--card'),attributeBackgroundColorEven:c('--muted')}};
  let mermaid;
  const render=async()=>{
    mermaid.initialize({startOnLoad:false,theme:'base',themeVariables:vars(),securityLevel:'strict',flowchart:{htmlLabels:true,curve:'basis'}});
    for(const n of nodes){n.removeAttribute('data-processed');n.textContent=n.dataset.src}
    try{await mermaid.run({nodes})}catch(e){console.warn('[mermaid]',e)}
  };
  try{
    ({default:mermaid}=await import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs'));
    await render();
    addEventListener('themechange',render);
  }catch(e){
    for(const n of nodes){const p=document.createElement('p');p.className='dg-err';p.textContent='Схема не отрисовалась: не загрузилась библиотека Mermaid. Ниже её исходник.';n.before(p)}
  }
}
