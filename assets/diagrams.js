/* Mermaid: рендер схем темой сайта + крупнее, контрастнее, с лайтбоксом (zoom). Нет CDN — остаётся исходник и пометка. */
const nodes=[...document.querySelectorAll('pre.mermaid')];
if(nodes.length){
  const vars=()=>{const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
    const toHex=c=>{const x=document.createElement('canvas').getContext('2d');x.fillStyle=c;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('')};
    const c=n=>toHex(g(n));
    return {fontFamily:'"Onest Variable","Onest",system-ui,sans-serif',fontSize:'16px',
      primaryColor:c('--primary-soft'),primaryBorderColor:c('--primary'),primaryTextColor:c('--foreground'),
      lineColor:c('--dg-line'),textColor:c('--foreground'),secondaryColor:c('--muted'),tertiaryColor:c('--card'),
      clusterBkg:c('--dg-cluster'),clusterBorder:c('--border-strong'),noteBkgColor:c('--warn-bg'),noteTextColor:c('--foreground'),noteBorderColor:c('--border-strong'),
      actorBkg:c('--primary-soft'),actorBorder:c('--primary'),actorTextColor:c('--foreground'),actorLineColor:c('--dg-line'),signalColor:c('--dg-line'),signalTextColor:c('--foreground'),
      labelBoxBkgColor:c('--muted'),labelBoxBorderColor:c('--border-strong'),labelTextColor:c('--foreground'),loopTextColor:c('--foreground'),
      edgeLabelBackground:c('--card'),mainBkg:c('--primary-soft'),nodeBorder:c('--primary'),
      sectionBkgColor:c('--primary-soft'),altSectionBkgColor:c('--muted'),taskBkgColor:c('--primary'),taskBorderColor:c('--primary'),taskTextColor:c('--primary-foreground'),taskTextOutsideColor:c('--foreground'),gridColor:c('--border'),todayLineColor:c('--danger'),
      attributeBackgroundColorOdd:c('--card'),attributeBackgroundColorEven:c('--muted')}};
  let mermaid;
  const enhance=()=>{for(const n of nodes){const fig=n.closest('.diagram');const svg=fig&&fig.querySelector('svg');if(!fig||!svg)continue;
    svg.removeAttribute('width');svg.removeAttribute('height');
    if(!fig.querySelector('.dg-zoom')){const b=document.createElement('button');b.type='button';b.className='dg-zoom';b.setAttribute('aria-label','Открыть схему крупно');b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Крупнее</span>';fig.appendChild(b);
      const open=()=>lightbox(svg,fig);b.addEventListener('click',open);
      const sc=fig.querySelector('.diagram-scroll')||n.parentElement;if(sc){sc.style.cursor='zoom-in';sc.addEventListener('click',e=>{if(e.target.closest('.dg-zoom'))return;open();});}}
  }};
  const render=async()=>{
    mermaid.initialize({startOnLoad:false,theme:'base',themeVariables:vars(),securityLevel:'strict',flowchart:{htmlLabels:true,curve:'basis',nodeSpacing:48,rankSpacing:56,padding:14,useMaxWidth:true},sequence:{useMaxWidth:true,actorMargin:70,width:150,messageFontSize:15,actorFontSize:15,noteFontSize:14}});
    for(const n of nodes){n.removeAttribute('data-processed');n.textContent=n.dataset.src}
    try{await mermaid.run({nodes});enhance();}catch(e){console.warn('[mermaid]',e)}
  };
  function lightbox(svg,fig){
    const cap=fig.querySelector('figcaption');
    const ov=document.createElement('div');ov.className='dg-lightbox';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',cap?cap.textContent:'Схема');
    ov.innerHTML='<div class="dg-lb-bar"><span class="dg-lb-cap"></span><span class="dg-lb-tools"><button type="button" data-z="out" aria-label="Уменьшить">\u2212</button><button type="button" data-z="reset" aria-label="Сбросить масштаб">100%</button><button type="button" data-z="in" aria-label="Увеличить">+</button><button type="button" data-z="close" aria-label="Закрыть">\u2715</button></span></div><div class="dg-lb-stage"><div class="dg-lb-fig"></div></div>';
    ov.querySelector('.dg-lb-cap').textContent=cap?cap.textContent:'';
    const figw=ov.querySelector('.dg-lb-fig');const clone=svg.cloneNode(true);clone.removeAttribute('style');figw.appendChild(clone);
    document.body.appendChild(ov);document.body.style.overflow='hidden';
    let scale=1;const stage=ov.querySelector('.dg-lb-stage');
    const apply=()=>{figw.style.transform='scale('+scale+')';ov.querySelector('[data-z=reset]').textContent=Math.round(scale*100)+'%';};
    const zoom=d=>{scale=Math.min(5,Math.max(.4,+(scale+d).toFixed(2)));apply();};
    ov.addEventListener('click',e=>{const z=e.target.closest('[data-z]');if(z){const a=z.dataset.z;if(a==='in')zoom(.25);else if(a==='out')zoom(-.25);else if(a==='reset'){scale=1;apply();}else close();return;}if(e.target===ov||e.target===stage)close();});
    stage.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.2:-.2);},{passive:false});
    let drag=null;stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,l:stage.scrollLeft,t:stage.scrollTop};stage.setPointerCapture(e.pointerId);stage.style.cursor='grabbing';});
    stage.addEventListener('pointermove',e=>{if(!drag)return;stage.scrollLeft=drag.l-(e.clientX-drag.x);stage.scrollTop=drag.t-(e.clientY-drag.y);});
    stage.addEventListener('pointerup',()=>{drag=null;stage.style.cursor='grab';});
    const key=e=>{if(e.key==='Escape')close();else if(e.key==='+'||e.key==='=')zoom(.25);else if(e.key==='-')zoom(-.25);};
    function close(){document.removeEventListener('keydown',key);document.body.style.overflow='';ov.remove();}
    document.addEventListener('keydown',key);apply();stage.style.cursor='grab';
    ov.querySelector('[data-z=close]').focus();
  }
  try{
    ({default:mermaid}=await import('https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs'));
    await render();
    addEventListener('themechange',render);
  }catch(e){
    for(const n of nodes){const p=document.createElement('p');p.className='dg-err';p.textContent='Схема не отрисовалась: не загрузилась библиотека Mermaid. Ниже её исходник.';n.before(p)}
  }
}
