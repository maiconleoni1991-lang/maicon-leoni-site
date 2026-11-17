"use strict";
(() => {
const BASE="https://qpqruhcspbdxjcnbhdhn.supabase.co";
const KEY="sb_publishable_JVYvfl7nrRmlm17qF_KI8A_1H8mtvLk";
const SESSION_KEY="meu_ponto_web_session_v1";
const SLOTS=["entry_at","break_out_at","break_in_at","exit_at"];
const LABELS=["Entrada","Saída para intervalo","Retorno","Saída final"];
const $=id=>document.getElementById(id);
let session=null,rows={},dirty={},month=new Date().toISOString().slice(0,7),deferredInstall=null;
let syncing=false,timer=null;
const idOf=()=>session?.user?.id||null;
const cacheKey=()=>idOf()?"mp_web_cache_"+idOf():null;
const pad=n=>String(n).padStart(2,"0");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
const nowLocal=()=>{const d=new Date();return today()+"T"+pad(d.getHours())+":"+pad(d.getMinutes());};
const cleanTime=v=>v?String(v).slice(0,16):"";
const blank=day=>({work_day:day,shift:day<"2026-11-02"?1:2,entry_at:"",break_out_at:"",break_in_at:"",exit_at:"",note:"",holiday:false,_serverUpdatedAt:null});
const ms=v=>v?new Date(v).getTime():NaN;
const minutes=(a,b)=>a&&b&&ms(b)>=ms(a)?Math.round((ms(b)-ms(a))/60000):0;
const formatMin=n=>Math.floor(n/60)+"h"+pad(n%60);
const fmtDate=day=>{const [y,m,d]=day.split("-");return d+"/"+m+"/"+y;};
const isSun=day=>new Date(day+"T12:00:00").getDay()===0;
const isSat=day=>new Date(day+"T12:00:00").getDay()===6;
const shiftEnd=r=>{
 const [y,m,d]=r.work_day.split("-").map(Number);
 const hour=r.shift===1?(isSat(r.work_day)?11:16):(isSat(r.work_day)?18:23);
 const minute=r.shift===2&&isSat(r.work_day)?30:r.shift===2?4:0;
 return new Date(y,m-1,d,hour,minute).getTime();
};
function summarize(r){
 const times=SLOTS.map(k=>r[k]);
 const valid=times.every(Boolean)&&SLOTS.every((k,i)=>i===0||ms(times[i])>ms(times[i-1]));
 const partial=minutes(r.entry_at,r.break_out_at)+minutes(r.break_in_at,r.exit_at);
 const gross=minutes(r.entry_at,r.exit_at);
 const worked=valid?partial:partial;
 let he60=0,he100=0;
 if(valid){
   if(isSun(r.work_day)||r.holiday)he100=worked;
   else{
     const after=Math.max(0,Math.round((ms(r.exit_at)-shiftEnd(r))/60000));
     he60=Math.min(worked,after);
   }
 }
 return {valid,partial:worked,gross,he60,he100};
}
function putStatus(text,kind=""){
 const el=$("syncStatus");
 el.textContent=text;el.className="status"+(kind?" "+kind:"");
}
function toast(message){
 const el=$("toast");
 el.textContent=message;el.classList.remove("hidden");
 clearTimeout(timer);timer=setTimeout(()=>el.classList.add("hidden"),6000);
}
function showApp(){
 $("authPanel").classList.add("hidden");
 $("appPanel").classList.remove("hidden");
 $("logoutBtn").classList.remove("hidden");
 $("accountLabel").textContent=(session?.user?.email||"Conta pessoal")+" · histórico privado";
 render();
}
function showAuth(){
 $("authPanel").classList.remove("hidden");
 $("appPanel").classList.add("hidden");
 $("logoutBtn").classList.add("hidden");
}
function store(){
 if(!cacheKey())return;
 try{localStorage.setItem(cacheKey(),JSON.stringify({rows,dirty}));}catch(e){putStatus("Armazenamento local indisponível","warn");}
}
function restoreCache(){
 try{const saved=JSON.parse(localStorage.getItem(cacheKey())||"{}");rows=saved.rows||{};dirty=saved.dirty||{};}
 catch(e){rows={};dirty={};}
}
function endpoint(path,method="GET",data,token){
 const headers={"apikey":KEY,"Content-Type":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 if(method==="POST"||method==="PATCH")headers.Prefer="return=representation";
 return fetch(BASE+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),cache:"no-store"})
  .then(async response=>{
   let result=null;
   const raw=await response.text();
   try{result=raw?JSON.parse(raw):null;}catch(e){result=raw;}
   if(!response.ok){
    const message=result?.msg||result?.message||result?.error_description||result?.error||"Erro de comunicação";
    throw new Error(message+" ("+response.status+")");
   }
   return result;
  });
}
async function refreshSession(){
 if(!session)throw Error("Faça login");
 if(session.expires_at && session.expires_at>Date.now()/1000+100)return session;
 if(!session.refresh_token)throw Error("Sessão expirada; entre novamente");
 const result=await endpoint("/auth/v1/token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
 if(!result.access_token)throw Error("Não foi possível renovar o login");
 session={...result,expires_at:Math.floor(Date.now()/1000)+(result.expires_in||3600)};
 localStorage.setItem(SESSION_KEY,JSON.stringify(session));
 return session;
}
async function doAuth(method){
 const email=$("email").value.trim().toLowerCase(),password=$("password").value;
 if(!email||password.length<8){$("authInfo").textContent="Preencha o e-mail e uma senha de pelo menos 8 caracteres.";return;}
 $("authInfo").textContent="Conectando com segurança...";
 try{
  let result=await endpoint(method==="login"?"/auth/v1/token?grant_type=password":"/auth/v1/signup","POST",{email,password});
  if(!result.access_token){
   $("authInfo").textContent="Conta criada. Confirme seu e-mail pela mensagem recebida e depois clique em Entrar.";
   return;
  }
  session={...result,expires_at:Math.floor(Date.now()/1000)+(result.expires_in||3600)};
  if(!session.user?.id)throw Error("Identidade da conta não encontrada");
  localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  restoreCache();showApp();
  await sync(true);
 }catch(e){$("authInfo").textContent="Não foi possível acessar: "+e.message;}
}
async function logout(){
 const token=session?.access_token;
 session=null;rows={};dirty={};localStorage.removeItem(SESSION_KEY);showAuth();
 if(token)try{await endpoint("/auth/v1/logout","POST",{},token);}catch(e){}
}
function saveRow(r){
 const day=r.work_day;
 rows[day]=r;
 dirty[day]=true;
 store();render();putStatus("Alterações para sincronizar","warn");
 if(navigator.onLine)sync();
 else toast("Salvo neste aparelho. Será enviado à nuvem quando a conexão voltar.");
}
function makePayload(r){
 const out={user_id:idOf(),work_day:r.work_day,shift:Number(r.shift)||2,
    note:String(r.note||"").slice(0,2000),holiday:!!r.holiday,updated_at:new Date().toISOString()};
 SLOTS.forEach(k=>out[k]=r[k]?r[k]+":00":null);
 return out;
}
function fromDb(r){
 const out=blank(r.work_day);
 out.shift=Number(r.shift)||2;
 out.note=r.note||"";out.holiday=!!r.holiday;
 SLOTS.forEach(k=>out[k]=cleanTime(r[k]));
 out._serverUpdatedAt=r.updated_at||null;
 return out;
}
async function sync(silent=false){
 if(syncing||!session)return;
 syncing=true;
 try{
  if(!navigator.onLine)throw Error("Sem internet: registros mantidos neste aparelho");
  putStatus("Sincronizando…");
  await refreshSession();
  const remote=await endpoint("/rest/v1/mp_workdays?select=*&order=work_day.asc","GET",undefined,session.access_token);
  const byDay=Object.fromEntries((remote||[]).map(r=>[r.work_day,r]));
  // Dados de outro aparelho entram somente quando não há edição local pendente.
  (remote||[]).forEach(r=>{if(!dirty[r.work_day])rows[r.work_day]=fromDb(r);});
  let conflicts=0;
  for(const day of Object.keys(dirty).sort()){
   const local=rows[day];if(!local){delete dirty[day];continue;}
   const cloud=byDay[day];
   if(cloud && (!local._serverUpdatedAt||local._serverUpdatedAt!==cloud.updated_at)){conflicts++;continue;}
   let result;
   const payload=makePayload(local);
   if(cloud){
    const query="/rest/v1/mp_workdays?user_id=eq."+encodeURIComponent(idOf())+
      "&work_day=eq."+day+"&updated_at=eq."+encodeURIComponent(cloud.updated_at);
    result=await endpoint(query,"PATCH",payload,session.access_token);
    if(!result?.length){conflicts++;continue;}
   }else{
    result=await endpoint("/rest/v1/mp_workdays","POST",payload,session.access_token);
   }
   rows[day]=fromDb(result[0]);delete dirty[day];
  }
  store();render();
  if(conflicts){
    putStatus(conflicts+" conflito(s) — conferir","warn");
    if(!silent)toast("Existe alteração mais recente na nuvem em "+conflicts+" dia(s). As suas edições locais foram preservadas; faça uma cópia e confira antes de sobrescrever.");
  }else putStatus("Salvo na nuvem","good");
 }catch(e){
   store();render();putStatus("Sem sincronização","warn");
   if(!silent)toast("Não foi possível sincronizar: "+e.message);
 }finally{syncing=false;}
}
function activeDay(){
 const current=today(),previous=new Date(new Date(current+"T12:00:00").getTime()-86400000);
 const prev=previous.getFullYear()+"-"+pad(previous.getMonth()+1)+"-"+pad(previous.getDate());
 if(!rows[current]&&rows[prev]?.entry_at&&!rows[prev]?.exit_at &&
    minutes(rows[prev].entry_at,nowLocal())<=18*60 &&
    minutes(rows[prev].entry_at,nowLocal())>=0)return prev;
 return current;
}
function currentRecord(){
 const day=activeDay();return rows[day]||blank(day);
}
function displayTime(t,day){
 if(!t)return "—";
 return t.slice(11,16)+(t.slice(0,10)>day?" (+1 dia)":"");
}
function renderQuick(){
 const r=currentRecord();
 $("quickDay").textContent="Data desta jornada: "+fmtDate(r.work_day)+(r.work_day!==today()?" · atravessou a meia-noite":"");
 $("quickMarks").innerHTML="";
 SLOTS.forEach((k,i)=>{
  const box=document.createElement("div"),small=document.createElement("small"),strong=document.createElement("strong");
  small.textContent=LABELS[i];strong.textContent=displayTime(r[k],r.work_day);
  box.append(small,strong);$("quickMarks").append(box);
 });
 const next=SLOTS.findIndex(k=>!r[k]);
 $("punchBtn").textContent=next===-1?"Jornada concluída":"Registrar "+LABELS[next].toLowerCase();
 $("punchBtn").disabled=next===-1;
}
function render(){
 if(!session)return;
 renderQuick();
 const monthRows=Object.values(rows).filter(r=>r.work_day?.startsWith(month))
  .sort((a,b)=>a.work_day.localeCompare(b.work_day));
 const [year,mo]=month.split("-").map(Number);
 $("monthTitle").textContent=new Date(year,mo-1,1).toLocaleString("pt-BR",{month:"long",year:"numeric"});
 let work=0,e60=0,e100=0,incomplete=0;
 const body=$("monthRows");body.innerHTML="";
 monthRows.forEach(r=>{
  const sum=summarize(r);
  if(sum.valid){work+=sum.partial;e60+=sum.he60;e100+=sum.he100;}
  else incomplete++;
  const tr=document.createElement("tr"),cell=t=>{const td=document.createElement("td");td.textContent=t;tr.append(td);};
  const date=new Date(r.work_day+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short"});
  cell(fmtDate(r.work_day)+" "+date);
  SLOTS.forEach(k=>cell(displayTime(r[k],r.work_day)));
  cell(sum.valid?formatMin(sum.partial):sum.partial?formatMin(sum.partial)+" parcial":sum.gross?formatMin(sum.gross)+" bruto":"—");
  cell(sum.valid?formatMin(sum.he60):"—");
  cell(sum.valid?formatMin(sum.he100):"—");
  const td=document.createElement("td"),tag=document.createElement("span");
  tag.className="tag"+(sum.valid?" ok":"");
  tag.textContent=sum.valid?"Completo":"Em aberto";
  td.append(tag);tr.append(td);
  tr.title=r.note||"Abrir jornada";
  tr.addEventListener("click",()=>editDay(r.work_day));
  body.append(tr);
 });
 if(!monthRows.length){
  const tr=document.createElement("tr"),td=document.createElement("td");
  td.colSpan=9;td.textContent="Nenhuma jornada neste mês. Use Editar jornada para lançar uma data.";
  tr.append(td);body.append(tr);
 }
 $("workedTotal").textContent=formatMin(work);
 $("extra60Total").textContent=formatMin(e60);
 $("extra100Total").textContent=formatMin(e100);
 $("incompleteTotal").textContent=incomplete;
 $("monthNote").textContent=monthRows.length+" jornada(s) listada(s) · totais consideram apenas jornadas com quatro batidas válidas. Horas extras estimadas pela saída prevista, sem aplicar a tolerância.";
}
function editDay(day){
 const r=rows[day]||blank(day);
 $("dialogTitle").textContent="Jornada de "+fmtDate(day);
 $("workDay").value=day;$("shift").value=r.shift;
 $("entryAt").value=r.entry_at;$("breakOut").value=r.break_out_at;
 $("breakIn").value=r.break_in_at;$("exitAt").value=r.exit_at;
 $("note").value=r.note||"";$("holiday").checked=!!r.holiday;
 $("editDialog").showModal();
}
function submitDay(ev){
 ev.preventDefault();
 const day=$("workDay").value;
 if(!/^\d{4}-\d\d-\d\d$/.test(day)){toast("Informe uma data válida");return;}
 const old=rows[day]||blank(day);
 const r={...old,work_day:day,shift:Number($("shift").value),
   entry_at:$("entryAt").value,break_out_at:$("breakOut").value,
   break_in_at:$("breakIn").value,exit_at:$("exitAt").value,
   note:$("note").value,holiday:$("holiday").checked};
 let last=0;
 for(const k of SLOTS){
  if(!r[k])continue;
  const t=ms(r[k]);
  if(Number.isNaN(t) || (last&&t<=last)){toast("Confira a ordem cronológica das marcações.");return;}
  if(k==="entry_at"&&r[k].slice(0,10)!==day){toast("A entrada precisa ter a data da jornada.");return;}
  if(t>ms(day+"T00:00")+48*3600000){toast("Os horários devem pertencer à jornada e, no máximo, ao dia seguinte.");return;}
  last=t;
 }
 $("editDialog").close();saveRow(r);
}
function punch(){
 const r=currentRecord(),slot=SLOTS.findIndex(k=>!r[k]);
 if(slot<0)return;
 if(!window.confirm("Registrar "+LABELS[slot].toLowerCase()+" às "+nowLocal().slice(11,16)+" na jornada de "+fmtDate(r.work_day)+"?"))return;
 r[SLOTS[slot]]=nowLocal();
 saveRow(r);
}
function shiftMonth(delta){
 const [y,m]=month.split("-").map(Number),d=new Date(y,m-1+delta,1);
 month=d.getFullYear()+"-"+pad(d.getMonth()+1);render();
}
function download(){
 const days=Object.values(rows).filter(r=>SLOTS.some(k=>!!r[k])).sort((a,b)=>a.work_day.localeCompare(b.work_day));
 const lines=["Meu Ponto – Backup simples"];
 for(const r of days){
  lines.push([r.work_day,...SLOTS.map(k=>r[k]||""),(r.note||"").replace(/[\r\n|]/g," ")].join(" | "));
 }
 const blob=new Blob([lines.join("\n")+"\n"],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="MeuPonto-Backup-"+today()+".txt";
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function parseBackup(content){
 const result=[],invalid=[];
 for(const original of String(content).split(/\r?\n/)){
  const line=original.trim();
  if(!/^\d{4}-\d{2}-\d{2}\s*\|/.test(line))continue;
  const fields=line.split("|").map(x=>x.trim()),day=fields[0];
  if(fields.length<5||Number.isNaN(ms(day+"T12:00"))){invalid.push(day);continue;}
  const r=blank(day);
  SLOTS.forEach((k,i)=>r[k]=cleanTime(fields[i+1]||""));
  r.note=fields.slice(5).join("|").trim();
  if(SLOTS.some(k=>r[k]&&Number.isNaN(ms(r[k])))){invalid.push(day);continue;}
  result.push(r);
 }
 // Se o backup antigo separou a saída após meia-noite em outro dia,
 // confirme a associação antes de alterar os dados importados.
 for(let i=0;i<result.length-1;i++){
  const a=result[i],b=result[i+1];
  if(!a.entry_at||a.exit_at||!b.entry_at||b.break_out_at||b.break_in_at||b.exit_at)continue;
  const next=new Date(a.work_day+"T12:00:00");
  next.setDate(next.getDate()+1);
  const adjacent=next.getFullYear()+"-"+pad(next.getMonth()+1)+"-"+pad(next.getDate());
  const plausible=b.work_day===adjacent&&Number(b.entry_at.slice(11,13))<6&&
    minutes(a.entry_at,b.entry_at)>0&&minutes(a.entry_at,b.entry_at)<=18*60;
  if(!plausible)continue;
  if(window.confirm("Encontrei uma batida isolada em "+fmtDate(b.work_day)+" às "+b.entry_at.slice(11,16)+
      ". Ela é a saída final da jornada iniciada em "+fmtDate(a.work_day)+"?")){
    a.exit_at=b.entry_at;result.splice(i+1,1);i--;
  }
 }
 return {result,invalid};
}
async function importFile(file){
 try{
  const content=await file.text();
  if(content.length>500000)throw Error("O arquivo é grande demais");
  const {result,invalid}=parseBackup(content);
  if(!result.length)throw Error("Nenhuma jornada reconhecida no arquivo");
  let newDays=0,newMarks=0,existing=0;
  for(const incoming of result){
   const old=rows[incoming.work_day];
   if(!old){rows[incoming.work_day]=incoming;dirty[incoming.work_day]=true;newDays++;newMarks+=SLOTS.filter(k=>incoming[k]).length;continue;}
   for(const k of SLOTS)if(incoming[k]&&!old[k]){old[k]=incoming[k];newMarks++;dirty[incoming.work_day]=true;}
   else if(incoming[k]&&old[k])existing++;
   if(incoming.note&&!old.note){old.note=incoming.note;dirty[incoming.work_day]=true;}
  }
  store();render();
  toast("Backup lido: "+result.length+" jornadas, "+newDays+" dias novos, "+newMarks+" marcações incluídas. "+existing+" marcações existentes preservadas."+ (invalid.length?" "+invalid.length+" linhas inválidas.":""));
  if(navigator.onLine)await sync();
 }catch(e){toast("Não foi possível importar: "+e.message);}
 $("backupFile").value="";
}
function init(){
 $("authForm").addEventListener("submit",e=>{e.preventDefault();doAuth("login");});
 $("signupBtn").addEventListener("click",()=>doAuth("signup"));
 $("logoutBtn").addEventListener("click",logout);
 $("prevMonth").addEventListener("click",()=>shiftMonth(-1));
 $("nextMonth").addEventListener("click",()=>shiftMonth(1));
 $("punchBtn").addEventListener("click",punch);
 $("editTodayBtn").addEventListener("click",()=>editDay(activeDay()));
 $("editDate").value=today();
 $("editDateBtn").addEventListener("click",()=>{
  const day=$("editDate").value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)){toast("Escolha a data da jornada.");return;}
  editDay(day);
 });
 $("dayForm").addEventListener("submit",submitDay);
 $("closeDialog").addEventListener("click",()=>$("editDialog").close());
 $("cancelEdit").addEventListener("click",()=>$("editDialog").close());
 $("importBtn").addEventListener("click",()=>$("backupFile").click());
 $("backupFile").addEventListener("change",e=>{if(e.target.files?.[0])importFile(e.target.files[0]);});
 $("exportBtn").addEventListener("click",download);
 $("syncBtn").addEventListener("click",()=>sync());
 window.addEventListener("online",()=>sync());
 window.addEventListener("offline",()=>putStatus("Offline — salvo neste aparelho","warn"));
 window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false;});
 $("installBtn").addEventListener("click",async()=>{
  if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true;}
  else toast("Abra o menu do navegador e escolha 'Adicionar à tela inicial' ou 'Instalar aplicativo'.");
 });
 window.addEventListener("appinstalled",()=>$("installBtn").hidden=true);
 if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
 try{
  const old=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
  if(old?.user?.id&&old?.refresh_token){
   session=old;restoreCache();showApp();sync(true);
  }else showAuth();
 }catch(e){showAuth();}
}
init();
})();
