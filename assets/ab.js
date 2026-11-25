/* A/B-модуль: один эксперимент на сайт, назначение в localStorage, события в очередь.
   Эксперимент pager_v1: A — «Дальше: Название», B — название + описание страницы.
   Метрика: pagination_click на просмотр страницы; защитная — search_open (люди не теряются). */
(()=>{
  const EXP='pager_v1', KEY='ab:'+EXP, QKEY='ab:events';
  let v=localStorage.getItem(KEY);
  if(v!=='A'&&v!=='B'){v=Math.random()<.5?'A':'B';localStorage.setItem(KEY,v)}
  document.documentElement.dataset.abPager = v==='B'?'desc':'title';
  const track=(name,props={})=>{
    const ev={exp:EXP,v,name,page:document.body?.dataset.slug||location.pathname,ts:Date.now(),...props};
    try{const q=JSON.parse(localStorage.getItem(QKEY)||'[]');q.push(ev);localStorage.setItem(QKEY,JSON.stringify(q.slice(-500)))}catch{}
    (window.abQueue=window.abQueue||[]).push(ev);
  };
  window.ab={variant:v,track,flush:()=>JSON.parse(localStorage.getItem(QKEY)||'[]')};
  addEventListener('DOMContentLoaded',()=>{
    track('page_view');
    document.addEventListener('click',e=>{const a=e.target.closest('[data-ab-ev]');if(a)track(a.dataset.abEv,{to:a.getAttribute('href')})});
  });
})();
