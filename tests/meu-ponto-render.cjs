"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const app=fs.readFileSync("docs/meu-ponto/app.js","utf8");
const generator=fs.readFileSync("docs/meu-ponto/pdf-export.js","utf8");
const marker="init();\n})();";
assert(app.includes(marker),"App init marker missing");
const fixture={
 "2026-11-17":{work_day:"2026-11-17",entry_at:"2026-11-17T14:31",break_out_at:"",break_in_at:"",exit_at:"",shift:2,note:"",holiday:false,holiday_override:null},
 "2026-11-16":{work_day:"2026-11-16",entry_at:"2026-11-16T14:36",break_out_at:"2026-11-16T19:55",break_in_at:"2026-11-16T20:49",exit_at:"2026-11-17T00:40",shift:2,note:"",holiday:false,holiday_override:null},
 "2026-11-14":{work_day:"2026-11-14",entry_at:"2026-11-14T19:00",break_out_at:"2026-11-15T00:27",break_in_at:"2026-11-15T00:42",exit_at:"2026-11-15T01:21",shift:2,note:"",holiday:false,holiday_override:null},
 "2026-11-02":{work_day:"2026-11-02",entry_at:"2026-11-02T14:32",break_out_at:"2026-11-02T19:51",break_in_at:"2026-11-02T20:50",exit_at:"2026-11-02T23:04",shift:2,note:"",holiday:false,holiday_override:null}
};
const injection='session={user:{id:"test-account",email:"test@example.com"},access_token:"test-token",expires_at:4070908800};month="2026-11";rows='+JSON.stringify(fixture)+';window.testRender=()=>render();window.testMonth=p=>buildMonthPdfData(p);window.testNov14=()=>({summary:summarize(rows["2026-11-14"]),payroll:payrollForDay(rows["2026-11-14"]),planned:shiftEnd(rows["2026-11-14"])});\n})();';
const patched=app.replace(marker,injection);
function element(){
 const children=[];
 return {textContent:"—",value:"",style:{},dataset:{},innerHTML:"",disabled:false,children,
 classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(){},
 append(...x){children.push(...x)},appendChild(x){children.push(x)},replaceChildren(...x){children.splice(0,children.length,...x)},
 scrollIntoView(){},focus(){},querySelector(){return null}};
}
const elements=new Map();
const document={
 getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},
 createElement:()=>element(),querySelectorAll:()=>[],activeElement:null,body:element()
};
const window={addEventListener(){},confirm:()=>true};
vm.runInNewContext(patched,{window,document,navigator:{onLine:false},localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>1,clearTimeout(){}},{filename:"app.js"});
window.testRender();
const txt=id=>elements.get(id)?.textContent;
for(const id of ["workedTotal","extra60Total","extra100Total","incompleteTotal"])
 assert(txt(id)!==undefined && txt(id)!=="—",id+" must render a result");
assert.equal(elements.get("monthRows").children.length,4,"Show the four monthly records");
assert.equal(elements.get("recentWorkdays").children.length,4,"Show recent history");
const november=window.testMonth("2026-11");
const october=window.testMonth("2026-10");
assert.equal(november.rows.length,30);
assert.equal(october.rows.length,31);
const nov14=november.rows.find(r=>r.date==="14/11/2026");
assert.equal(nov14.entry,"19:00");
assert.equal(nov14.breakOut,"00:27 (+1)");
assert.equal(nov14.breakIn,"00:42 (+1)");
assert.equal(nov14.exit,"01:21 (+1)");
assert.equal(nov14.worked,"6h06","15 minutos de intervalo descontados");
assert.equal(nov14.he60,"—","Nenhuma hora extra antes de 00h");
assert.equal(nov14.he100,"1h15","66 minutos efetivos com hora noturna reduzida");
assert(nov14.note.includes("Turno excepcional por falta de energia"),"Justificativa deve constar no espelho");
const nov14Detail=window.testNov14();
assert.equal(nov14Detail.summary.afterEnd,66,"Apenas 66 min trabalhados após 00h, sem intervalo");
assert.equal(nov14Detail.summary.he60,0,"19h-00h são horas normais deste turno excepcional");
assert.equal(nov14Detail.summary.he100,75,"HE 100% em horas reduzidas, com arredondamento");
assert(Math.abs(nov14Detail.payroll.nightClock-(3+6/60))<1e-8,"Adicional noturno: 22h até 01h21, menos intervalo");
assert(Math.abs(nov14Detail.payroll.nightPaid-(3+6/60)*60/52.5)<1e-8,"Hora noturna reduzida de 52min30s");
assert(Math.abs((nov14Detail.payroll.he100Night*60)-66*60/52.5)<1e-8,"Extra 100% também noturna");
const pdfWindow={};
vm.runInNewContext(generator,{window:pdfWindow},{filename:"pdf-export.js"});
const result=pdfWindow.MeuPontoPDF.makePDF({months:[november,october]});
assert.equal(result.rows,61);
assert.equal(result.months,2);
const pdf=Buffer.from(result.bytes).toString("latin1");
assert(pdf.startsWith("%PDF-1.4\n"));
for(const mark of ["14/11/2026","19:00","00:27","00:42","01:21","16/11/2026","00:40"])
 assert(pdf.includes(mark),"PDF missing "+mark);
console.log("Meu Ponto: render de indicadores e exportacao PDF mensal OK.");
