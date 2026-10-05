(()=>{
  const frame=document.getElementById('adminFrame'); if(!frame)return;
  function enhance(){
    try{
      const d=frame.contentDocument; if(!d)return;
      const panel=d.getElementById('products'),tbody=d.getElementById('productRows'),catSelect=d.getElementById('fCat');
      if(!panel||!tbody)return;
      if(catSelect&&!Array.from(catSelect.options).some(o=>o.value==='Trufado')){const o=d.createElement('option');o.value='Trufado';o.textContent='Trufado';catSelect.appendChild(o)}
      let style=d.getElementById('gdsProdToolsStyle');
      if(!style){style=d.createElement('style');style.id='gdsProdToolsStyle';style.textContent='.productTools{padding:14px 16px;border-bottom:1px solid #f1e4e9;background:#fffafd}.prodSearch{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;align-items:center}.prodSearch input{width:100%;border:1px solid #efdde4;border-radius:13px;padding:11px 13px;outline:0;background:#fff}.prodSearch input:focus{border-color:#ff86b0;box-shadow:0 0 0 3px #ffedf3}.prodCount{font-size:12px;color:#78616a;font-weight:800;white-space:nowrap}.prodFilters{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.prodFilter{border:1px solid #efdde4;background:#fff;color:#4a101e;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}.prodFilter.on{background:#ff0f68;color:#fff;border-color:#ff0f68}.prodFilter[data-cat="Trufado"]{border-color:#d8b38d}.prodFilter[data-cat="Trufado"].on{background:#7a3c1f;border-color:#7a3c1f}.cat.trufado{background:#f7eadc;color:#7a3c1f}.prodNoResult{text-align:center;padding:24px;color:#78616a;font-size:13px}@media(max-width:650px){.prodSearch{grid-template-columns:1fr}.prodCount{white-space:normal}.prodFilters{display:grid;grid-template-columns:repeat(2,1fr)}.prodFilter{width:100%}}';d.head.appendChild(style)}
      let tools=d.getElementById('gdsProductTools');
      if(!tools){
        tools=d.createElement('div');tools.id='gdsProductTools';tools.className='productTools';
        tools.innerHTML='<div class="prodSearch"><input id="gdsProdSearch" type="search" placeholder="Buscar produto por nome ou tipo..."><div id="gdsProdCount" class="prodCount"></div></div><div class="prodFilters"><button class="prodFilter on" data-cat="Todos">Todos</button><button class="prodFilter" data-cat="Tradicional">🍓 Tradicional</button><button class="prodFilter" data-cat="Cremoso">🥛 Cremoso</button><button class="prodFilter" data-cat="Gourmet">♕ Gourmet</button><button class="prodFilter" data-cat="Trufado">🍫 Trufado</button></div><div id="gdsProdNoResult" class="prodNoResult" style="display:none">Nenhum produto encontrado com esse filtro.</div>';
        const tw=panel.querySelector('.tableWrap');tw.parentNode.insertBefore(tools,tw);
      }
      let activeCat=tools.dataset.activeCat||'Todos';
      const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      function apply(){
        const q=norm(d.getElementById('gdsProdSearch')?.value||''),rows=[...tbody.querySelectorAll('tr')];let shown=0;
        const totals={Todos:rows.length,Tradicional:0,Cremoso:0,Gourmet:0,Trufado:0};
        rows.forEach(r=>{const cells=r.cells;if(!cells.length)return;const name=cells[0]?.innerText||'',cat=cells[1]?.innerText.trim()||'';if(totals[cat]!=null)totals[cat]++;const hitCat=activeCat==='Todos'||cat===activeCat;const hitQ=!q||norm(name+' '+cat).includes(q);const show=hitCat&&hitQ;r.style.display=show?'':'none';if(show)shown++;const badge=cells[1]?.querySelector('.cat');if(badge)badge.classList.toggle('trufado',cat==='Trufado')});
        tools.querySelectorAll('.prodFilter').forEach(b=>{const c=b.dataset.cat;b.classList.toggle('on',c===activeCat);const base=b.textContent.replace(/\s*\(\d+\)$/,'');b.textContent=base+' ('+(totals[c]??0)+')'});
        const c=d.getElementById('gdsProdCount');if(c)c.textContent=`Exibindo ${shown} de ${rows.length} produto${rows.length===1?'':'s'}`;
        const e=d.getElementById('gdsProdNoResult');if(e)e.style.display=rows.length&&shown===0?'block':'none';
      }
      if(!tools.dataset.wired){tools.dataset.wired='1';tools.querySelectorAll('.prodFilter').forEach(b=>b.addEventListener('click',()=>{activeCat=b.dataset.cat;tools.dataset.activeCat=activeCat;apply()}));d.getElementById('gdsProdSearch').addEventListener('input',apply);new MutationObserver(()=>setTimeout(apply,20)).observe(tbody,{childList:true});}
      apply();
    }catch(e){console.error('Falha ao organizar produtos v32',e)}
  }
  frame.addEventListener('load',enhance);setTimeout(enhance,250);setTimeout(enhance,1000);setInterval(enhance,4000);
})();