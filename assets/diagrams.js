/* Mermaid: рендер схем с темой сайта. Если CDN недоступен, остаётся исходник схемы и короткая пометка. */
const nodes=[...document.querySelectorAll('pre.mermaid')];
if(nodes.length){
  const vars=()=>{const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
    return {fontFamily:'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',fontSize:'14px',
      primaryColor:g('--accent-bg'),primaryBorderColor:g('--accent'),primaryTextColor:g('--ink'),
      lineColor:g('--ink-3'),textColor:g('--ink'),secondaryColor:g('--bg-2'),tertiaryColor:g('--surface'),
      clusterBkg:g('--bg-2'),clusterBorder:g('--line-2'),noteBkgColor:g('--warn-bg'),noteTextColor:g('--ink'),noteBorderColor:g('--line-2'),
      actorBkg:g('--accent-bg'),actorBorder:g('--accent'),actorTextColor:g('--ink'),signalColor:g('--ink-2'),signalTextColor:g('--ink'),
      labelBoxBkgColor:g('--bg-2'),labelBoxBorderColor:g('--line-2'),edgeLabelBackground:g('--surface'),mainBkg:g('--accent-bg'),nodeBorder:g('--accent')}};
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
