"use strict";
(() => {
const BASE="https://qpqruhcspbdxjcnbhdhn.supabase.co";
const KEY="sb_publishable_JVYvfl7nrRmlm17qF_KI8A_1H8mtvLk";
const SESSION_KEY="meu_ponto_web_session_v1";
const SLOTS=["entry_at","break_out_at","break_in_at","exit_at"];
const LABELS=["Entrada","Saída para intervalo","Retorno","Saída final"];
const $=id=>document.getElementById(id);
let session=null,rows={},dirty={},month=new Date().toISOString().slice(0,7),deferredInstall=null;
let syncing=false,timer=null,cloudRows={},lastSyncCount=null,lastPunchAt=0;
const pdfSelectedMonths=new Set();let pdfSelectionInitialized=false;
const idOf=()=>session?.user?.id||null;
const cacheKey=()=>idOf()?"mp_web_cache_"+idOf():null;
const pad=n=>String(n).padStart(2,"0");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
const nowLocal=()=>{const d=new Date();return today()+"T"+pad(d.getHours())+":"+pad(d.getMinutes());};
const cleanTime=v=>v?String(v).slice(0,16):"";
const blank=day=>({work_day:day,shift:day<"2026-11-02"?1:2,entry_at:"",break_out_at:"",break_in_at:"",exit_at:"",note:"",holiday:false,holiday_override:null,_serverUpdatedAt:null});
const ms=v=>v?new Date(v).getTime():NaN;
const minutes=(a,b)=>a&&b&&ms(b)>=ms(a)?Math.round((ms(b)-ms(a))/60000):0;
const formatMin=n=>Math.floor(n/60)+"h"+pad(n%60);
const fmtDate=day=>{const [y,m,d]=day.split("-");return d+"/"+m+"/"+y;};
const isSun=day=>new Date(day+"T12:00:00").getDay()===0;
const isSat=day=>new Date(day+"T12:00:00").getDay()===6;
const expectedBreak=day=>{
 const weekday=new Date(day+"T12:00:00").getDay();
 if(weekday===0)return null;
 if(weekday===6)return 15;
 if(weekday===5)return 30;
 return 60;
};
const shiftEnd=r=>{
 const [y,m,d]=r.work_day.split("-").map(Number);
 const hour=r.shift===1?(isSat(r.work_day)?11:16):(isSat(r.work_day)?18:23);
 const minute=r.shift===2&&isSat(r.work_day)?30:r.shift===2?4:0;
 return new Date(y,m-1,d,hour,minute).getTime();
};

const PAY_DEFAULT={monthly_salary:6160,hour_divisor:220,night_rate_pct:35,he60_pct:60,he100_pct:100,employment_start:"2026-10-22"};
let paySettings={...PAY_DEFAULT};
const HOLIDAY_FIXED={
 "01-01":"Confraternização Universal (nacional)","04-21":"Tiradentes (nacional)",
 "05-01":"Dia do Trabalho (nacional)","07-09":"Revolução Constitucionalista (SP)",
 "09-07":"Independência do Brasil (nacional)","10-12":"Nossa Senhora Aparecida (nacional)",
 "11-02":"Finados (nacional)","11-15":"Proclamação da República (nacional)",
 "11-20":"Consciência Negra (nacional)","12-25":"Natal (nacional)",
 "05-15":"Aniversário de Monte Alto (municipal)","08-06":"Senhor Bom Jesus (municipal)"
};
function holidayName(day){
 if(day==="2026-04-03")return "Paixão de Cristo (2026)";
 return HOLIDAY_FIXED[day.slice(5)]||null;
}
function effectiveHoliday(day,reference){
 const r=reference?.work_day===day?reference:rows[day];
 if(r?.holiday_override===true)return true;
 if(r?.holiday_override===false)return false;
 return !!holidayName(day)||(r?.holiday===true);
}
const premiumDay=(day,reference)=>isSun(day)||effectiveHoliday(day,reference);
function dateAt(timestamp){
 const d=new Date(timestamp);
 return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
function payrollForDay(r){
 const out={valid:false,nightClock:0,nightPaid:0,he60Day:0,he60Night:0,he100Day:0,he100Night:0,workClock:0};
 const times=SLOTS.map(k=>r[k]);
 if(!times.every(Boolean)||times.some((v,i)=>i>0&&ms(v)<=ms(times[i-1])))return out;
 out.valid=true;
 const end=shiftEnd(r);
 for(const [a,b] of [[r.entry_at,r.break_out_at],[r.break_in_at,r.exit_at]]){
  for(let t=ms(a);t<ms(b);t+=60000){
   const d=new Date(t),day=dateAt(t);
   const night=d.getHours()>=22||d.getHours()<5;
   const weighting=(night?60/52.5:1)/60;
   out.workClock+=1/60;
   if(night){out.nightClock+=1/60;out.nightPaid+=weighting;}
   if(premiumDay(day,r)){
    if(night)out.he100Night+=weighting;else out.he100Day+=weighting;
   }else if(t>=end){
    if(night)out.he60Night+=weighting;else out.he60Day+=weighting;
   }
  }
 }
 return out;
}
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function monthFinance(period){
 const [year,mo]=period.split("-").map(Number);
 const countDays=new Date(year,mo,0).getDate();
 let nightClock=0,nightPaid=0,he60Day=0,he60Night=0,he100Day=0,he100Night=0,worked=0,complete=0,incomplete=0;
 for(const r of Object.values(rows).filter(x=>x.work_day?.startsWith(period))){
  const x=payrollForDay(r);
  if(!x.valid){incomplete++;continue;}
  complete++;worked+=x.workClock;
  nightClock+=x.nightClock;nightPaid+=x.nightPaid;
  he60Day+=x.he60Day;he60Night+=x.he60Night;he100Day+=x.he100Day;he100Night+=x.he100Night;
 }
 const rate=Number(paySettings.monthly_salary)/Number(paySettings.hour_divisor);
 const nightPct=Number(paySettings.night_rate_pct)/100;
 const x60=Number(paySettings.he60_pct)/100, x100=Number(paySettings.he100_pct)/100;
 const extra60=rate*(he60Day*(1+x60)+he60Night*(1+x60+nightPct*x60));
 const extra100=rate*(he100Day*(1+x100)+he100Night*(1+x100+nightPct*x100));
 const nightValue=rate*nightPct*nightPaid;
 let rests=0,useful=0;
 for(let d=1;d<=countDays;d++){
  const day=year+"-"+pad(mo)+"-"+pad(d);
  if(day<paySettings.employment_start)continue;
  if(premiumDay(day,rows[day]))rests++;else useful++;
 }
 const dsrHE=useful?((extra60+extra100)/useful)*rests:0;
 const dsrNight=useful?(nightValue/useful)*rests:0;
 return {rate,nightClock,nightPaid,he60Hours:he60Day+he60Night,he100Hours:he100Day+he100Night,worked,complete,incomplete,extra60,extra100,nightValue,dsrHE,dsrNight,additional:extra60+extra100+nightValue+dsrHE+dsrNight,useful,rests};
}
function renderFinance(){
 if(!$("financeTotal"))return;
 const f=monthFinance(month);
 $("financeNightHours").textContent=formatMin(Math.round(f.nightClock*60))+" horas reais / "+formatMin(Math.round(f.nightPaid*60))+" horas reduzidas";
 $("financeNightValue").textContent=money(f.nightValue);
 $("financeExtra60").textContent=money(f.extra60)+" · "+formatMin(Math.round(f.he60Hours*60));
 $("financeExtra100").textContent=money(f.extra100)+" · "+formatMin(Math.round(f.he100Hours*60));
 $("financeDSR").textContent=money(f.dsrHE+f.dsrNight);
 $("financeTotal").textContent=money(f.additional);
 $("financeBase").textContent=money(f.rate)+"/hora · salário-base "+money(paySettings.monthly_salary);
 $("financeNote").textContent="Prévia de acréscimos brutos, não valor líquido. DSR estimado usando "+f.rests+" dia(s) de descanso / "+f.useful+" dia(s) úteis. Inclui hora noturna reduzida e adicional noturno na base da hora extra noturna. Somente jornadas completas. Convenção coletiva, compensações, banco de horas e descontos podem alterar o holerite; outubro é mês de admissão.";
}
function renderPayrollForm(){
 if(!$("financeForm"))return;
 $("monthlySalary").value=paySettings.monthly_salary;
 $("hourDivisor").value=paySettings.hour_divisor;
 $("nightRate").value=paySettings.night_rate_pct;
 $("extra60Rate").value=paySettings.he60_pct;
 $("extra100Rate").value=paySettings.he100_pct;
}
async function loadPayrollSettings(){
 if(!session)return;
 try{
  await refreshSession();
  const r=await endpoint("/rest/v1/mp_user_settings?select=*&user_id=eq."+encodeURIComponent(idOf()),"GET",undefined,session.access_token);
  if(r?.length)paySettings={...PAY_DEFAULT,...r[0]};
  renderPayrollForm();render();
 }catch(e){toast("Prévia financeira com valores padrão. Parâmetros online indisponíveis: "+e.message);}
}
async function savePayrollSettings(e){
 e.preventDefault();
 const p={monthly_salary:Number($("monthlySalary").value),hour_divisor:Number($("hourDivisor").value),
  night_rate_pct:Number($("nightRate").value),he60_pct:Number($("extra60Rate").value),
  he100_pct:Number($("extra100Rate").value),employment_start:"2026-10-22"};
 if(!p.monthly_salary||p.monthly_salary<1||p.hour_divisor<1||p.night_rate_pct<20||p.he60_pct<50||p.he100_pct<100){
  toast("Confira os parâmetros financeiros.");return;
 }
 $("financeSave").disabled=true;
 try{
  await refreshSession();
  const r=await endpoint("/rest/v1/mp_user_settings?on_conflict=user_id","POST",{user_id:idOf(),...p},session.access_token);
  if(!r?.length)throw Error("Sem confirmação da nuvem");
  paySettings={...PAY_DEFAULT,...r[0]};
  renderPayrollForm();render();toast("Parâmetros financeiros salvos na nuvem.");
 }catch(err){toast("Não foi possível salvar: "+err.message);}
 finally{$("financeSave").disabled=false;}
}

function summarize(r){
 const times=SLOTS.map(k=>r[k]);
 const valid=times.every(Boolean)&&SLOTS.every((k,i)=>i===0||ms(times[i])>ms(times[i-1]));
 const confirmed=minutes(r.entry_at,r.break_out_at)+minutes(r.break_in_at,r.exit_at);
 const gross=minutes(r.entry_at,r.exit_at);
 // Se não existem intervalos registrados, a duração é somente uma estimativa.
 const noBreak=r.entry_at&&r.exit_at&&!r.break_out_at&&!r.break_in_at;
 const partial=confirmed|| (noBreak?gross:0);
 const scheduledEnd=shiftEnd(r);
 const observedAfter=r.exit_at?Math.max(0,Math.round((ms(r.exit_at)-scheduledEnd)/60000)):0;
 // "Após o fim previsto" é referência, inclusive em jornada incompleta, não pagamento aprovado.
 const afterEnd=gross?Math.min(gross,observedAfter):observedAfter;
 const x=valid?payrollForDay(r):null;
 const he60=x?Math.round((x.he60Day+x.he60Night)*60):0;
 const he100=x?Math.round((x.he100Day+x.he100Night)*60):0;
 const breakMinutes=minutes(r.break_out_at,r.break_in_at);
 return {valid,partial,gross,he60,he100,afterEnd,breakMinutes,noBreak:!!noBreak};
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
 setArea("ponto");
 render();
}
function showAuth(){
 cloudRows={};lastSyncCount=null;
 $("authPanel").classList.remove("hidden");
 $("appPanel").classList.add("hidden");
 $("logoutBtn").classList.add("hidden");
 window.MeuPontoPayroll?.reset?.();
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
 if(method==="POST"||method==="PATCH")headers.Prefer=(path.includes("on_conflict=")?"resolution=merge-duplicates,":"")+"return=representation";
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
  await loadPayrollSettings();
  await window.MeuPontoPayroll?.reload?.();
 }catch(e){$("authInfo").textContent="Não foi possível acessar: "+e.message;}
}
async function logout(){
 const token=session?.access_token;
 session=null;rows={};dirty={};cloudRows={};lastSyncCount=null;localStorage.removeItem(SESSION_KEY);showAuth();
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
    note:String(r.note||"").slice(0,2000),holiday:!!r.holiday,holiday_override:r.holiday_override??null,updated_at:new Date().toISOString()};
 SLOTS.forEach(k=>out[k]=r[k]?r[k]+":00":null);
 return out;
}
function fromDb(r){
 const out=blank(r.work_day);
 out.shift=Number(r.shift)||2;
 out.note=r.note||"";out.holiday=!!r.holiday;out.holiday_override=r.holiday_override??null;
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
  lastSyncCount=(remote||[]).length;
  cloudRows=Object.fromEntries((remote||[]).map(r=>[r.work_day,fromDb(r)]));
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
  if(window.MeuPontoPayroll)await window.MeuPontoPayroll.reload();
  if(conflicts){
    putStatus(conflicts+" conflito(s) — conferir","warn");
    if(!silent)toast("Existe alteração mais recente na nuvem em "+conflicts+" dia(s). As suas edições locais foram preservadas; faça uma cópia e confira antes de sobrescrever.");
  }else if(lastSyncCount===0){
    putStatus("Esta conta não tem histórico na nuvem","warn");
    toast("A conta conectada não apresentou os horários antigos. Confira se entrou com o mesmo e-mail. Não apague o aplicativo ou o cache.");
  }else putStatus(lastSyncCount+" jornadas recuperadas da nuvem","good");
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
function renderRecentHistory(){
 const summary=$("historySummary"),container=$("recentWorkdays");
 if(!summary||!container)return;
 const cloud=Object.values(cloudRows),local=Object.values(rows);
 // Mostra primeiro os registros locais pendentes e, para os demais dias, os confirmados na nuvem.
 // Nunca descarta uma batida local ainda não sincronizada.
 const merged={...rows};
 for(const [day,remote] of Object.entries(cloudRows)){if(!dirty[day])merged[day]=remote;}
 const dataset=Object.values(merged);
 const countOct=dataset.filter(r=>r.work_day?.startsWith("2026-10")).length;
 const countNov=dataset.filter(r=>r.work_day?.startsWith("2026-11")).length;
 if(lastSyncCount===0){
  summary.textContent="Nenhuma jornada encontrada na conta online atual. Confira o e-mail de login. Horários locais mantidos: "+local.length+".";
 }else if(lastSyncCount!==null){
  summary.textContent=cloud.length+" jornadas confirmadas na nuvem • "+countOct+" em outubro • "+countNov+" em novembro.";
 }else{
  summary.textContent=local.length+" jornada(s) neste aparelho. Consultando a nuvem sem apagar alterações locais…";
 }
 container.replaceChildren();
 const recent=dataset.slice().sort((a,b)=>b.work_day.localeCompare(a.work_day)).slice(0,8);
 if(!recent.length){
  const p=document.createElement("p");p.className="muted";
  p.textContent="Nenhuma jornada disponível nesta sessão. Verifique o status da sincronização e a conta utilizada.";
  container.append(p);
  return;
 }
 for(const r of recent){
  const btn=document.createElement("button");btn.type="button";btn.className="recovered-day";
  const title=document.createElement("span");title.className="date";title.textContent=fmtDate(r.work_day);
  const marks=document.createElement("span");marks.className="marks";
  marks.textContent="Entrada "+displayTime(r.entry_at,r.work_day)+
   " · Intervalo "+displayTime(r.break_out_at,r.work_day)+
   " / "+displayTime(r.break_in_at,r.work_day)+
   " · Saída "+displayTime(r.exit_at,r.work_day);
  const cap=document.createElement("span");cap.className="small";
  cap.textContent=dirty[r.work_day]?"Atenção: alteração local pendente, confira antes de editar":cloud.length?"Registro confirmado na nuvem":"Cópia local, aguardando sincronização";
  btn.append(title,marks,cap);
  btn.addEventListener("click",()=>{
   month=r.work_day.slice(0,7);
   setArea("espelho");render();
   if(!dirty[r.work_day])editDay(r.work_day);
   else toast("Há edição local pendente neste dia. Confira o espelho e o backup antes de qualquer alteração.");
  });
  container.append(btn);
 }
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
 const action=next<0?"Jornada concluída":"Bater ponto · "+LABELS[next].toLowerCase();
 $("punchBtn").textContent=action;
 $("punchNowBtn").textContent=next<0?"◷ Jornada concluída":"◷ "+action;
 $("punchBtn").disabled=next<0;
 $("punchNowBtn").disabled=next<0;
 $("punchGuide").textContent=next<0?
   "As quatro batidas desta jornada estão preenchidas. Para corrigir, use Editar jornada.":
   "Próxima marcação: "+LABELS[next]+". Será utilizado o horário exato do toque, sem horário predefinido." ;
}
function render(){
 if(!session)return;
 renderQuick();
 renderRecentHistory();
 renderPdfMonthChoices();
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
  cell(fmtDate(r.work_day)+" "+date+(effectiveHoliday(r.work_day,r)?" · FERIADO":isSun(r.work_day)?" · DOM":""));
  SLOTS.forEach(k=>cell(displayTime(r[k],r.work_day)));
  cell(sum.valid?formatMin(sum.partial):sum.partial?formatMin(sum.partial)+" a conferir":"—");
  cell(r.exit_at?formatMin(sum.afterEnd):"—");
  cell(sum.valid&&sum.he60?formatMin(sum.he60):"—");
  cell(sum.valid&&sum.he100?formatMin(sum.he100):"—");
  const td=document.createElement("td"),tag=document.createElement("span");
  tag.className="tag"+(sum.valid?" ok":"");
  tag.textContent=sum.valid?"Completo":"Em aberto";
  td.append(tag);tr.append(td);
  tr.title=(holidayName(r.work_day)||"")+(r.note?" · "+r.note:"")+" · Abrir jornada";
  tr.addEventListener("click",()=>editDay(r.work_day));
  body.append(tr);
 });
 if(!monthRows.length){
  const tr=document.createElement("tr"),td=document.createElement("td");
  td.colSpan=10;td.textContent="Nenhuma jornada neste mês. Use Editar jornada para lançar uma data.";
  tr.append(td);body.append(tr);
 }
 $("workedTotal").textContent=formatMin(work);
 $("extra60Total").textContent=formatMin(e60);
 $("extra100Total").textContent=formatMin(e100);
 $("incompleteTotal").textContent=incomplete;
 renderFinance();
 window.MeuPontoPayroll?.render?.();
 $("monthNote").textContent=monthRows.length+" jornada(s) · todas as batidas exibidas são os horários reais. Totais de horas e extras somente para jornadas completas. Após previsto: tempo entre fim programado e saída, sujeito à conferência. 1º turno: seg-sex 16h, sábado 11h; 2º turno: seg-sex 23h04, sábado 18h30. Intervalos de referência: seg–qui 60 min, sexta 30 min, sábado 15 min; retornar antes não é pendência.";
}
function editDay(day){
 const r=rows[day]||blank(day);
 $("dialogTitle").textContent="Jornada de "+fmtDate(day);
 $("workDay").value=day;$("shift").value=r.shift;
 const plannedBreak=expectedBreak(day);
 $("expectedBreakInfo").textContent=plannedBreak===null?"Domingo: registre o intervalo real, se houver.":"Intervalo de referência: "+plannedBreak+" minutos. Se voltar alguns minutos antes, o registro será aceito. O espelho mostrará a hora exata de cada batida.";
 $("entryAt").value=r.entry_at;$("breakOut").value=r.break_out_at;
 $("breakIn").value=r.break_in_at;$("exitAt").value=r.exit_at;
 $("note").value=r.note||"";
 $("holidayMode").value=r.holiday_override===true?"yes":r.holiday_override===false?"no":"auto";
 const label=holidayName(day);
 $("holidaySuggestion").textContent=label?"Data do calendário: "+label+". Você pode alterar para dia normal.":isSun(day)?"Domingo (100%, mesmo sem feriado).":"Sem feriado oficial conhecido; você pode marcar manualmente se houver feriado local ou compensação específica.";
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
   note:$("note").value,holiday:old.holiday||false,holiday_override:$("holidayMode").value==="auto"?null:$("holidayMode").value==="yes"};
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
 if(!session){toast("Entre na sua conta para bater o ponto.");return;}
 const clickTime=Date.now();
 if(clickTime-lastPunchAt<12000){
  toast("A última batida foi registrada há poucos segundos. Confira antes de registrar outra.");return;
 }
 const pressedAt=nowLocal(); // Captura a hora do toque, não a hora após a confirmação.
 const r={...currentRecord()},slot=SLOTS.findIndex(k=>!r[k]);
 if(slot<0){toast("Esta jornada já tem quatro batidas. Abra Editar jornada para conferir.");return;}
 const prev=slot>0?r[SLOTS[slot-1]]:null;
 if(prev&&ms(pressedAt)<=ms(prev)){
  toast("Horário igual ou anterior à batida anterior. Aguarde a mudança de minuto e confira.");return;
 }
 if(!window.confirm("Bater ponto: "+LABELS[slot]+"\nData da jornada: "+fmtDate(r.work_day)+"\nHorário real: "+pressedAt.slice(11,16)+"\n\nConfirmar registro?"))return;
 lastPunchAt=clickTime;
 r[SLOTS[slot]]=pressedAt;
 saveRow(r);
 toast(LABELS[slot]+" registrada às "+pressedAt.slice(11,16)+". Horário guardado no aparelho e enviado à nuvem quando possível.");
}
function shiftMonth(delta){
 const [y,m]=month.split("-").map(Number),d=new Date(y,m-1+delta,1);
 month=d.getFullYear()+"-"+pad(d.getMonth()+1);
 if($("pdfPreviewBox"))$("pdfPreviewBox").classList.add("hidden");
 render();
}

function dateWeek(day){
 return new Date(day+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
}
function escHtml(v){
 return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function missingFields(r){
 return SLOTS.filter(k=>!r[k]).map(k=>LABELS[SLOTS.indexOf(k)].toLowerCase());
}
function monthCalendar(period=month){
 const [year,mo]=period.split("-").map(Number);
 const total=new Date(year,mo,0).getDate(),items=[];
 for(let d=1;d<=total;d++){
  const date=year+"-"+pad(mo)+"-"+pad(d);
  items.push(rows[date]||blank(date));
 }
 return items;
}
function buildMonthPdfData(period=month){
 const daily=monthCalendar(period);
 let registered=0,complete=0,worked=0,extra60=0,extra100=0;
 const reportRows=daily.map(r=>{
  const filled=SLOTS.some(k=>!!r[k]),sum=summarize(r);
  if(filled){
   registered++;
   if(sum.valid){complete++;worked+=sum.partial;extra60+=sum.he60;extra100+=sum.he100;}
  }
  const status=!filled?"Sem registro":sum.valid?"Completo":"Incompleto";
  const parts=[];
  if(effectiveHoliday(r.work_day,r)){
   parts.push("Feriado: "+(holidayName(r.work_day)||"definido manualmente"));
  }else if(isSun(r.work_day)){
   parts.push("Domingo");
  }
  if(r.exit_at&&r.exit_at.slice(0,10)!==r.work_day&&premiumDay(r.exit_at.slice(0,10),r)){
   parts.push("Virada para domingo/feriado: 100% apos meia-noite");
  }
  if(r.note)parts.push(r.note);
  if(filled&&!sum.valid){
   const missing=missingFields(r);
   if(missing.length)parts.push("A conferir: "+missing.join(", "));
  }
  if(!filled)parts.push("Sem marcacoes");
  const mark=k=>{
   const value=displayTime(r[k],r.work_day);
   return value==="—"?"—":value.replace(" (+1 dia)"," (+1)");
  };
  return {
   date:fmtDate(r.work_day),weekday:dateWeek(r.work_day),
   entry:mark("entry_at"),breakOut:mark("break_out_at"),breakIn:mark("break_in_at"),exit:mark("exit_at"),
   worked:filled&&sum.partial?formatMin(sum.partial)+(sum.valid?"":" *"):"—",
   he60:sum.valid&&sum.he60?formatMin(sum.he60):"—",
   he100:sum.valid&&sum.he100?formatMin(sum.he100):"—",
   status:status,note:parts.join(" | ")||status
  };
 });
 const financial=monthFinance(period);
 return {
  month:period,rows:reportRows,
  summary:{
   registered,complete,worked:formatMin(worked),he60:formatMin(extra60),
   he100:formatMin(extra100),nightClock:formatMin(Math.round(financial.nightClock*60))
  }
 };
}

function updatePdfSelectionSummary(){
 const summary=$("pdfSelectionSummary");
 if(!summary)return;
 const periods=[...pdfSelectedMonths].sort();
 const days=periods.reduce((n,period)=>{
  const [year,mo]=period.split("-").map(Number);
  return n+new Date(year,mo,0).getDate();
 },0);
 summary.textContent=periods.length?
  periods.length+" mês(es) escolhido(s), "+days+" dias de calendário no mesmo PDF.":
  "Nenhum mês selecionado. Marque uma ou mais competências acima.";
 $("downloadMultiPdfBtn").disabled=!periods.length;
 $("previewMultiPdfBtn").disabled=!periods.length;
}
function renderPdfMonthChoices(){
 const parent=$("pdfMonthsChoices");
 if(!parent)return;
 if(!pdfSelectionInitialized){
  pdfSelectedMonths.add(month);
  pdfSelectionInitialized=true;
 }
 const first=paySettings.employment_start?.slice(0,7)||"2026-10";
 const last=[month,today().slice(0,7),...Object.keys(rows).map(d=>d.slice(0,7)),...pdfSelectedMonths].sort().at(-1);
 const candidates=new Set([...pdfSelectedMonths,month]);
 let cursor=new Date(Number(first.slice(0,4)),Number(first.slice(5))-1,1);
 const until=new Date(Number(last.slice(0,4)),Number(last.slice(5))-1,1);
 let limiter=0;
 while(cursor<=until&&limiter++<120){
  candidates.add(cursor.getFullYear()+"-"+pad(cursor.getMonth()+1));
  cursor.setMonth(cursor.getMonth()+1);
 }
 const months=[...candidates].filter(p=>/^\d{4}-(0[1-9]|1[0-2])$/.test(p)).sort().reverse();
 parent.replaceChildren();
 for(const period of months){
  const label=document.createElement("label");
  label.className="pdf-month-choice";
  const check=document.createElement("input");
  check.type="checkbox";check.value=period;check.checked=pdfSelectedMonths.has(period);
  const d=new Date(Number(period.slice(0,4)),Number(period.slice(5))-1,1);
  const caption=document.createElement("span");
  caption.textContent=d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  label.append(check,caption);
  check.addEventListener("change",()=>{
   if(check.checked)pdfSelectedMonths.add(period);
   else pdfSelectedMonths.delete(period);
   updatePdfSelectionSummary();
  });
  parent.append(label);
 }
 updatePdfSelectionSummary();
}
function selectedPdfData(){
 const periods=[...pdfSelectedMonths].sort();
 if(!periods.length)throw Error("Selecione pelo menos um mês.");
 if(periods.length>60)throw Error("Selecione no máximo 60 meses por arquivo.");
 return {months:periods.map(period=>buildMonthPdfData(period))};
}
function downloadMultiPdf(){
 if(!session){toast("Entre na sua conta para baixar o espelho.");return;}
 try{
  if(!window.MeuPontoPDF)throw Error("Gerador de PDF não carregado.");
  const result=window.MeuPontoPDF.download(selectedPdfData());
  toast(result.months+" meses, "+result.rows+" dias e "+result.pages+" páginas disponíveis em Downloads.");
 }catch(e){toast("Falha ao gerar PDF conjunto: "+e.message);}
}
function previewMultiPdf(){
 if(!session){toast("Entre na sua conta para visualizar o espelho.");return;}
 try{
  if(!window.MeuPontoPDF)throw Error("Gerador de PDF não carregado.");
  const result=window.MeuPontoPDF.preview(selectedPdfData());
  toast("Visualizando "+result.months+" meses no mesmo PDF, "+result.rows+" dias.");
 }catch(e){toast("Falha na visualização: "+e.message);}
}

function downloadMonthPdf(){
 if(!session){toast("Entre na sua conta para baixar o espelho.");return;}
 if(!window.MeuPontoPDF){toast("Gerador de PDF indisponivel. Atualize o aplicativo.");return;}
 try{
  const report=window.MeuPontoPDF.download(buildMonthPdfData());
  toast("Espelho de "+month+" criado: "+report.rows+" dias, "+report.pages+" pagina(s). Confira na pasta Downloads.");
 }catch(e){toast("Falha ao gerar PDF: "+e.message);}
}
function previewMonthPdf(){
 if(!session){toast("Entre na sua conta para visualizar o espelho.");return;}
 if(!window.MeuPontoPDF){toast("Gerador de PDF indisponivel. Atualize o aplicativo.");return;}
 try{
  const report=window.MeuPontoPDF.preview(buildMonthPdfData());
  $("pdfPreviewBox").dataset.month=month;
  toast("Visualizacao do espelho "+month+" carregada ("+report.pages+" pagina(s)).");
 }catch(e){toast("Nao foi possivel visualizar: "+e.message);}
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
function setArea(area){
 const allowed=["ponto","espelho","holerite","ajustes"];
 const tab=allowed.includes(area)?area:"ponto";
 document.querySelectorAll("[data-area]").forEach(el=>el.classList.toggle("hidden",el.dataset.area!==tab));
 document.querySelectorAll("[data-area-target]").forEach(el=>{const active=el.dataset.areaTarget===tab;el.classList.toggle("active",active);el.setAttribute("aria-selected",String(active));});
}
function init(){
 document.querySelectorAll("[data-area-target]").forEach(el=>el.addEventListener("click",()=>setArea(el.dataset.areaTarget)));
 $("authForm").addEventListener("submit",e=>{e.preventDefault();doAuth("login");});
 $("signupBtn").addEventListener("click",()=>doAuth("signup"));
 $("logoutBtn").addEventListener("click",logout);
 $("prevMonth").addEventListener("click",()=>shiftMonth(-1));
 $("nextMonth").addEventListener("click",()=>shiftMonth(1));
 $("payPrevMonth").addEventListener("click",()=>shiftMonth(-1));
 $("payNextMonth").addEventListener("click",()=>shiftMonth(1));
 $("historySyncBtn").addEventListener("click",()=>sync());
 document.querySelectorAll("[data-open-month]").forEach(el=>el.addEventListener("click",()=>{month=el.dataset.openMonth;setArea("espelho");render();}));
 $("punchBtn").addEventListener("click",punch);
 $("punchNowBtn").addEventListener("click",punch);
 $("editTodayBtn").addEventListener("click",()=>editDay(activeDay()));
 $("editDate").value=today();
 $("editDateBtn").addEventListener("click",()=>{
  const day=$("editDate").value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)){toast("Escolha a data da jornada.");return;}
  editDay(day);
 });
 $("dayForm").addEventListener("submit",submitDay);
 $("financeForm").addEventListener("submit",savePayrollSettings);
 renderPayrollForm();
 $("closeDialog").addEventListener("click",()=>$("editDialog").close());
 $("cancelEdit").addEventListener("click",()=>$("editDialog").close());
 $("importBtn").addEventListener("click",()=>$("backupFile").click());
 $("backupFile").addEventListener("change",e=>{if(e.target.files?.[0])importFile(e.target.files[0]);});
 $("exportBtn").addEventListener("click",download);
 $("downloadMonthPdfBtn").addEventListener("click",downloadMonthPdf);
 $("previewMonthPdfBtn").addEventListener("click",previewMonthPdf);
 $("downloadMultiPdfBtn").addEventListener("click",downloadMultiPdf);
 $("previewMultiPdfBtn").addEventListener("click",previewMultiPdf);
 $("selectAllPdfMonths").addEventListener("click",()=>{
  document.querySelectorAll('#pdfMonthsChoices input[type="checkbox"]').forEach(input=>{
   pdfSelectedMonths.add(input.value);
   input.checked=true;
  });
  updatePdfSelectionSummary();
 });
 $("clearPdfMonths").addEventListener("click",()=>{
  pdfSelectedMonths.clear();
  document.querySelectorAll('#pdfMonthsChoices input[type="checkbox"]').forEach(input=>input.checked=false);
  updatePdfSelectionSummary();
 });
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
   session=old;restoreCache();showApp();sync(true).then(loadPayrollSettings);
  }else showAuth();
 }catch(e){showAuth();}
}
window.MeuPontoContext={
 month:()=>month,rows:()=>rows,user:()=>idOf(),token:()=>session?.access_token,
 settings:()=>paySettings,finance:()=>monthFinance(month),refreshSession,endpoint,toast,showArea:setArea
};
init();
})();
