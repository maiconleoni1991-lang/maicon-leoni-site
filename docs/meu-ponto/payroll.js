"use strict";
(() => {
 const C=window.MeuPontoContext;
 if(!C)return;
 const $=id=>document.getElementById(id);
 const round=n=>Math.round(((Number(n)||0)+Number.EPSILON)*100)/100;
 const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const pct=n=>Number(n||0).toLocaleString("pt-BR",{maximumFractionDigits:2})+"%";
 const blank=()=>({base_salary_override:null,dependents:0,transport_enabled:false,transport_cost:0,advance_amount:0,other_authorized_deductions:0});
 let adjustments={};
 const current=()=>({...blank(),...(adjustments[C.month()]||{})});
 const sDate=()=>new Date(Number(C.month().slice(0,4)),Number(C.month().slice(5))-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
 function salary(){
  const p=C.settings(),start=String(p.employment_start||"2026-10-22"),period=C.month();
  if(period<start.slice(0,7))return {value:0,ref:"Sem vínculo"};
  if(period===start.slice(0,7)){
   const last=new Date(Number(period.slice(0,4)),Number(period.slice(5)),0).getDate();
   const qty=last-Number(start.slice(8))+1;
   return {value:round(p.monthly_salary*qty/30),ref:qty+"/30 dias"};
  }
  return {value:round(p.monthly_salary),ref:"30/30 dias"};
 }
 function inss2026(amount){
  const bands=[[1621,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]];
  let last=0,sum=0;
  for(const [lim,rate] of bands){
   sum+=Math.max(0,Math.min(amount,lim)-last)*rate;
   last=lim;if(amount<=lim)break;
  }
  return round(sum);
 }
 function irrf2026(gross,inss,dependents){
  const legal=round(inss+189.59*dependents);
  const deduction=Math.max(607.20,legal);
  const base=round(Math.max(0,gross-deduction));
  const b=[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]].find(x=>base<=x[0]);
  const original=round(Math.max(0,base*b[1]-b[2]));
  let reduction=0;
  if(gross<=5000)reduction=original;
  else if(gross<=7350)reduction=Math.min(original,Math.max(0,round(978.62-.133145*gross)));
  return {base,original,reduction:round(reduction),value:round(Math.max(0,original-reduction)),deduction,chosen:legal>607.20?"Legal":"Simplificada"};
 }
 function compute(){
  const period=C.month(),p=C.settings(),cfg=current(),finance=C.finance();
  const regular=salary(),salaryValue=cfg.base_salary_override===null?regular.value:Number(cfg.base_salary_override);
  const earn=[
   ["001","Salário-base",cfg.base_salary_override===null?regular.ref:"Valor informado",round(salaryValue)],
   ["101","Hora extra "+pct(p.he60_pct),finance.he60Hours.toFixed(2)+" h",round(finance.extra60)],
   ["102","Hora extra "+pct(p.he100_pct),finance.he100Hours.toFixed(2)+" h",round(finance.extra100)],
   ["103","Adicional noturno "+pct(p.night_rate_pct),finance.nightPaid.toFixed(2)+" h reduzidas",round(finance.nightValue)],
   ["104","DSR sobre extras","Estimativa",round(finance.dsrHE)],
   ["105","DSR sobre adicional noturno","Estimativa",round(finance.dsrNight)]
  ];
  const gross=round(earn.reduce((s,r)=>s+r[3],0));
  const supports=period.slice(0,4)==="2026";
  const inss=supports?inss2026(gross):null;
  const irrf=supports?irrf2026(gross,inss,Number(cfg.dependents)||0):null;
  const vt=cfg.transport_enabled?round(Math.min(Math.max(0,Number(cfg.transport_cost)||0),Math.max(0,salaryValue*.06))):0;
  const deduct=[
   ["201","INSS do empregado",supports?"Tabela 2026":"Tabela indisponível",inss||0],
   ["202","IRRF",supports?irrf.chosen+" / 2026":"Tabela indisponível",irrf?.value||0],
   ["203","Vale-transporte",cfg.transport_enabled?"Limite 6% salário-base":"Não ativado",vt],
   ["204","Adiantamento salarial","Informado",round(cfg.advance_amount)],
   ["205","Outros descontos autorizados","Informado",round(cfg.other_authorized_deductions)]
  ];
  const deductions=round(deduct.reduce((s,r)=>s+r[3],0));
  return {earn,deduct,gross,deductions,net:round(gross-deductions),inss,irrf,fgts:round(gross*.08),supports,cfg,finance,regular};
 }
 function render(){
  if(!$("payslipEntries"))return;
  const p=compute(),tb=$("payslipEntries");
  tb.replaceChildren();
  const add=(entry,discount)=>{
   const tr=document.createElement("tr");
   tr.className=discount?"pay-debit":"pay-credit";
   const values=[entry[0],entry[1],entry[2],discount?"—":money(entry[3]),discount?money(entry[3]):"—"];
   for(const v of values){const td=document.createElement("td");td.textContent=v;tr.append(td);}
   tb.append(tr);
  };
  p.earn.forEach(r=>add(r,false));p.deduct.forEach(r=>add(r,true));
  $("payPeriod").textContent=sDate();
  $("payGross").textContent=money(p.gross);
  $("payDiscounts").textContent=money(p.deductions);
  $("payNet").textContent=p.supports?money(p.net):"IRRF/INSS pendentes";
  $("payBaseINSS").textContent=money(p.gross);
  $("payBaseIRRF").textContent=p.supports?money(p.irrf.base):"—";
  $("payFGTS").textContent=money(p.fgts)+" · depósito do empregador";
  $("payWarning").textContent="Estimativa independente. Salário-base "+money(C.settings().monthly_salary)+". "+
   (p.supports?"Tabela INSS e IRRF 2026, incluindo redutor por faixa e dedução mais favorável.":"Tabelas oficiais não configuradas para essa competência.")+
   " DSR e horas extras dependem das batidas completas, folgas compensatórias e convenção coletiva; podem faltar pagamentos, descontos e eventos da folha real. FGTS não é descontado do salário.";
  $("adjustPeriod").textContent="Parâmetros de "+sDate();
  const a=current();
  const controls={
   payBaseOverride:a.base_salary_override??"",payDependents:a.dependents,payTransportCost:a.transport_cost,
   payAdvance:a.advance_amount,payOtherDeductions:a.other_authorized_deductions
  };
  for(const [id,value] of Object.entries(controls))if($(id)&&document.activeElement!==$(id))$(id).value=value;
  if($("payTransportEnabled")&&document.activeElement!==$("payTransportEnabled"))$("payTransportEnabled").checked=a.transport_enabled;
  $("payBaseOverride").placeholder="Automático: "+money(salary().value);
 }
 async function reload(){
  if(!C.user())return;
  try{
   await C.refreshSession();
   const result=await C.endpoint("/rest/v1/mp_month_finance?select=*&order=month_start.asc","GET",undefined,C.token());
   adjustments={};
   for(const item of result||[])adjustments[String(item.month_start).slice(0,7)]=item;
   render();
  }catch(e){C.toast("Ajustes do holerite não sincronizados: "+e.message);}
 }
 function reset(){adjustments={};render();}
 async function save(e){
  e.preventDefault();
  const baseText=$("payBaseOverride").value;
  const values={
   base_salary_override:baseText===""?null:round(Number(baseText)),
   dependents:Number($("payDependents").value),
   transport_enabled:$("payTransportEnabled").checked,
   transport_cost:round(Number($("payTransportCost").value)),
   advance_amount:round(Number($("payAdvance").value)),
   other_authorized_deductions:round(Number($("payOtherDeductions").value))
  };
  if(values.dependents<0||values.dependents>20||
     [values.transport_cost,values.advance_amount,values.other_authorized_deductions,values.base_salary_override??0].some(x=>x<0||!Number.isFinite(x))){
   C.toast("Confira os ajustes: valores negativos ou dependentes inválidos.");return;
  }
  const btn=$("paySave"),period=C.month();btn.disabled=true;
  try{
   await C.refreshSession();
   const result=await C.endpoint("/rest/v1/mp_month_finance?on_conflict=user_id,month_start","POST",{user_id:C.user(),month_start:period+"-01",...values,updated_at:new Date().toISOString()},C.token());
   if(!result?.length)throw Error("O servidor não confirmou o salvamento");
   adjustments[period]=result[0];
   render();C.toast("Parâmetros de "+sDate()+" salvos na nuvem.");
  }catch(err){C.toast("Não foi possível salvar: "+err.message);}finally{btn.disabled=false;}
 }
 const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function print(){
  const p=compute(),period=sDate();
  const list=(rows,debit)=>rows.map(r=>"<tr><td>"+safe(r[0])+"</td><td>"+safe(r[1])+"</td><td>"+safe(r[2])+"</td><td>"+(debit?"":money(r[3]))+"</td><td>"+(debit?money(r[3]):"")+"</td></tr>").join("");
  const html="<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Holerite para conferência — "+safe(period)+"</title>"+
  "<style>@page{size:A4 portrait;margin:14mm}body{font:12px Arial,sans-serif;color:#192d48;margin:20px}header{border-bottom:3px solid #c8a35c;padding-bottom:13px}h1{font-size:23px;margin:5px 0}.sub{color:#566881}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:14px}th{background:#142b49;color:white}td,th{padding:8px 5px;border:1px solid #bec9d5;text-align:left}.sum{display:flex;gap:10px;margin-top:15px}.sum>div{flex:1;padding:11px;border:1px solid #cad1d8}.sum b{display:block;font-size:16px;margin-top:5px}.note{margin-top:18px;font-size:10px;color:#44556e;line-height:1.5}.sign{border-top:1px solid #7b8797;width:45%;margin-top:40px;padding-top:7px}.toolbar button{padding:8px 12px}@media print{body{margin:0}.toolbar{display:none}}</style></head><body>"+
  "<div class='toolbar'><button onclick='window.print()'>Imprimir / Salvar como PDF</button></div><header><strong>MEU PONTO · PRÉVIA DE FOLHA</strong><h1>Demonstrativo de pagamento — "+safe(period)+"</h1><div class='sub'>Documento pessoal para conferência, sem validade como holerite emitido pelo empregador</div></header>"+
  "<table><thead><tr><th>Código</th><th>Descrição</th><th>Referência</th><th>Vencimentos</th><th>Descontos</th></tr></thead><tbody>"+list(p.earn,false)+list(p.deduct,true)+"</tbody></table>"+
  "<div class='sum'><div>Total bruto<b>"+money(p.gross)+"</b></div><div>Descontos<b>"+money(p.deductions)+"</b></div><div>Líquido estimado<b>"+(p.supports?money(p.net):"Indisponível")+"</b></div></div>"+
  "<div class='note'>Base INSS: "+money(p.gross)+". Base IRRF: "+(p.supports?money(p.irrf.base):"indisponível")+". FGTS estimado (depósito do empregador, não desconto): "+money(p.fgts)+". "+
  "Cálculo demonstrativo sujeito a conferência de batidas, proventos e descontos reais, acordos, compensações, convenção coletiva, benefícios, condições de incidência e fechamento da folha.</div>"+
  "<div class='sign'>Conferência do empregado</div></body></html>";
  const w=window.open("","_blank");if(!w){C.toast("Autorize pop-ups para abrir o holerite.");return;}
  w.document.open();w.document.write(html);w.document.close();w.focus();
 }
 window.MeuPontoPayroll={render,reload,reset,print,calculate:compute};
 $("payAdjustForm")?.addEventListener("submit",save);
 $("payPdfBtn")?.addEventListener("click",print);
 if(C.user())reload();else render();
})();