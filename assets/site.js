(()=>{
  const d=document.documentElement, $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const toast=(msg)=>{const t=$('.toast');t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),1800)};

  /* тема */
  const tb=$('.theme-btn');const tl=()=>{const t=d.dataset.theme==='dark'?'Включить светлую тему':'Включить тёмную тему';tb.setAttribute('aria-label',t);tb.dataset.tip=t};tl();
  tb.addEventListener('click',()=>{const n=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=n;localStorage.setItem('theme',n);tl();dispatchEvent(new CustomEvent('themechange',{detail:n}))});
  if(/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent))$$('.kbd-k').forEach(k=>k.textContent='⌘ K');

  /* мобильное меню */
  const side=$('#side'), scrim=$('.scrim'), mb=$('.menu-btn');
  const setMenu=o=>{side.classList.toggle('open',o);scrim.hidden=!o;mb.setAttribute('aria-expanded',o);mb.setAttribute('aria-label',o?'Закрыть меню':'Открыть меню');mb.dataset.tip=o?'Закрыть меню':'Открыть меню'};
  mb.addEventListener('click',()=>setMenu(!side.classList.contains('open')));
  scrim.addEventListener('click',()=>setMenu(false));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&side.classList.contains('open'))setMenu(false)});
  const cur=$('.side [aria-current]'); if(cur&&cur.offsetTop>side.clientHeight-80) side.scrollTop=cur.offsetTop-120;

  /* копирование кода и страницы */
  const copy=async(text,msg)=>{try{await navigator.clipboard.writeText(text);toast(msg)}catch{toast('Не удалось скопировать. Выделите текст и нажмите Ctrl C')}};
  $$('.code .copy').forEach(b=>b.addEventListener('click',()=>{copy(b.closest('.code').querySelector('pre').innerText,'Код скопирован');b.classList.add('done');b.setAttribute('aria-label','Скопировано');b.dataset.tip='Скопировано';setTimeout(()=>{b.classList.remove('done');b.setAttribute('aria-label','Скопировать код');b.dataset.tip='Скопировать код'},1400)}));
  $$('[data-copy-md]').forEach(b=>b.addEventListener('click',async()=>{try{const r=await fetch(b.dataset.copyMd);copy(await r.text(),'Markdown скопирован')}catch{toast('Исходник не загрузился. Откройте его ссылкой «Markdown страницы» внизу')}}));

  /* оглавление: подсветка текущего раздела */
  const links=$$('.toc a'); if(links.length){
    const map=new Map(links.map(a=>[decodeURIComponent(a.hash.slice(1)),a]));
    const heads=[...map.keys()].map(id=>document.getElementById(id)).filter(Boolean);
    const on=()=>{let curH=heads[0];for(const h of heads){if(h.getBoundingClientRect().top<120)curH=h;else break}
      links.forEach(a=>a.classList.remove('on'));const a=curH&&map.get(curH.id);if(a)a.classList.add('on')};
    addEventListener('scroll',on,{passive:true});on();
  }

  document.querySelectorAll('.toc-m a').forEach(a=>a.addEventListener('click',()=>a.closest('details').open=false));
  /* поиск */
  const dlg=$('dialog.search'), input=$('input',dlg), list=$('.search-r',dlg), empty=$('.search-empty',dlg);
  let idx=null, sel=-1;
  const load=async()=>{if(idx)return idx;const r=await fetch('assets/search.json');idx=await r.json();return idx};
  const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=s=>s.toLowerCase().replace(/ё/g,'е');
  const hl=(s,terms)=>{let out=esc(s);terms.forEach(t=>{if(t.length<2)return;out=out.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>')});return out};
  const snippet=(t,terms)=>{const n=norm(t);let i=-1;for(const q of terms){i=n.indexOf(q);if(i>=0)break}const s=Math.max(0,i-60);return (s?'…':'')+t.slice(s,s+180)};
  const run=async()=>{
    const q=norm(input.value.trim()); await load();
    if(!q){list.innerHTML='';empty.hidden=true;return}
    const terms=q.split(/\s+/).filter(Boolean);
    const res=[];
    for(const r of idx){const h=norm(r.h),t=norm(r.t),p=norm(r.p);let sc=0,ok=true;
      for(const w of terms){const inH=h.includes(w),inT=t.includes(w),inP=p.includes(w);if(!inH&&!inT&&!inP){ok=false;break}sc+=(inH?8:0)+(inP?3:0)+(inT?1:0)}
      if(ok)res.push([sc,r])}
    res.sort((a,b)=>b[0]-a[0]);
    const top=res.slice(0,12); sel=top.length?0:-1;
    list.innerHTML=top.map(([,r],i)=>`<li><a href="${r.u}" role="option" aria-selected="${i===0}"><span class="sr-h">${hl(r.h,terms)} <span class="sr-p">· ${esc(r.p)}</span></span><span class="sr-t">${hl(snippet(r.t,terms),terms)}</span></a></li>`).join('');
    empty.hidden=top.length>0;
    if(!top.length) window.ab?.track('search_zero_result',{q:q.slice(0,60)});
  };
  const open=()=>{if(dlg.open)return;dlg.showModal();input.value='';list.innerHTML='';empty.hidden=true;input.focus();load();window.ab?.track('search_open')};
  $$('[data-search-open]').forEach(b=>b.addEventListener('click',open));
  addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'||(e.key==='/'&&!/input|textarea/i.test(document.activeElement.tagName))){e.preventDefault();open()}
  });
  let tmr; input.addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(run,90)});
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dlg.close();return}const items=$$('a',list);if(!items.length)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((a,i)=>a.setAttribute('aria-selected',i===sel));items[sel].scrollIntoView({block:'nearest'})}
    if(e.key==='Enter'&&sel>=0){e.preventDefault();window.ab?.track('search_pick');location.href=items[sel].href;dlg.close()}});
  list.addEventListener('click',e=>{if(e.target.closest('a')){window.ab?.track('search_pick');dlg.close()}});
  dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
})();
