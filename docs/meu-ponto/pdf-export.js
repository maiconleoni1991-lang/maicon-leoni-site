"use strict";
(function(){
 const PAGE_W=842,PAGE_H=595,MARGIN=28;
 const COLS=[
  {name:"Data",w:57},{name:"Dia",w:30},{name:"Entrada",w:58},
  {name:"Saida int.",w:66},{name:"Retorno",w:66},{name:"Saida",w:66},
  {name:"Trabalhadas",w:73},{name:"HE 60%",w:55},{name:"HE 100%",w:55},
  {name:"Situacao / observacoes",w:288}
 ];
 const C={navy:"#132b49",gold:"#caab6c",light:"#e9eff6",ink:"#162f4d",muted:"#56667b",line:"#d2dce7"};
 function safe(value){
  return String(value===undefined||value===null?"":value)
    .replace(/[\u2010-\u2015\u2212]/g,"-").replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201c\u201d]/g,'"').replace(/[\u2022\u00b7]/g," - ")
    .replace(/\u00a0/g," ").replace(/\r?\n/g," | ")
    .split("").map(function(ch){
      const code=ch.charCodeAt(0);
      if(code>=32&&code<=255&&code!==127)return ch;
      const plain=ch.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      return /^[\x20-\x7e]$/.test(plain)?plain:"?";
    }).join("");
 }
 function escapePDF(text){return safe(text).replace(/[\\()]/g,"\\$&");}
 function num(v){return Number(v).toFixed(2);}
 function color(hex){
  const n=parseInt(hex.slice(1),16);
  return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255].map(num).join(" ");
 }
 function rowWrap(input,width,fontSize){
  const text=safe(input);
  const limit=Math.max(5,Math.floor((width-7)/(fontSize*.53)));
  if(!text)return [""];
  const out=[];let line="";
  for(const word of text.split(/\s+/)){
   if(!word)continue;
   if((line.length+(line?1:0)+word.length)<=limit){line+=(line?" ":"")+word;continue;}
   if(line){out.push(line);line="";}
   if(word.length<=limit){line=word;continue;}
   for(let p=0;p<word.length;p+=limit){
    const segment=word.slice(p,p+limit);
    if(segment.length===limit)out.push(segment);else line=segment;
   }
  }
  if(line)out.push(line);
  return out.length?out:[""];
 }
 function makePDF(input){
  if(!input||!Array.isArray(input.rows)||!/^\d{4}-\d\d$/.test(input.month||""))throw Error("Competencia ou jornadas invalidas para o espelho.");
  const doc=[],pages=[];
  let commands=[],top=0;
  const startPage=function(){
   commands=[];pages.push(commands);
   top=115;
   commands.push(color(C.navy)+" rg 0 0 "+num(PAGE_W)+" "+num(PAGE_H)+" re f");
   commands.push("1 1 1 rg "+num(MARGIN-9)+" 25 "+num(PAGE_W-2*(MARGIN-9))+" "+num(PAGE_H-44)+" re f");
   line(MARGIN,71,PAGE_W-MARGIN,71,C.gold,2);
   txt("MEU PONTO  |  ESPELHO MENSAL",MARGIN,24,15,C.navy,true);
   txt("Competencia: "+input.month.split("-").reverse().join("/"),MARGIN,48,10,C.muted,false);
   txt("Relatorio pessoal para conferencia  •  Batidas reais, sem preenchimento automatico",245,49,8,C.muted,false);
   drawTableHeader();
   txt("Registros mantidos em suas datas originais  |  Horarios apos 00h indicados com +1 dia",MARGIN,554,8,C.muted,false);
   txt("Pagina "+pages.length,PAGE_W-88,554,8,C.muted,false);
  };
  const line=function(x,y,x2,y2,hex,thick){
   commands.push(color(hex)+" RG "+num(thick||.5)+" w "+num(x)+" "+num(PAGE_H-y)+" m "+num(x2)+" "+num(PAGE_H-y2)+" l S");
  };
  const rect=function(x,y,w,h,hex){
   commands.push(color(hex)+" rg "+num(x)+" "+num(PAGE_H-y-h)+" "+num(w)+" "+num(h)+" re f");
  };
  const txt=function(str,x,y,size,hex,bold){
   commands.push(color(hex||C.ink)+" rg BT /"+(bold?"F2":"F1")+" "+num(size)+" Tf 1 0 0 1 "+num(x)+" "+num(PAGE_H-y-size)+" Tm ("+escapePDF(str)+") Tj ET");
  };
  const drawTableHeader=function(){
   rect(MARGIN,83,PAGE_W-2*MARGIN,27,C.navy);
   let x=MARGIN;
   for(const col of COLS){txt(col.name,x+3,90,8,"#ffffff",true);x+=col.w;}
  };
  startPage();
  const count=input.rows.length;let written=0,full=0,partials=0;
  for(const row of input.rows){
   const cells=[
    row.date||"",row.weekday||"",row.entry||"",row.breakOut||"",row.breakIn||"",row.exit||"",
    row.worked||"",row.he60||"",row.he100||"",row.note||row.status||""
   ];
   const fontSize=7.45;
   const wrapped=cells.map((v,i)=>rowWrap(v,COLS[i].w,fontSize));
   const height=Math.max(18,Math.max(...wrapped.map(v=>v.length))*9+7);
   if(top+height>519){startPage();}
   rect(MARGIN,top,PAGE_W-2*MARGIN,height,written%2===0?"#f0f4f8":"#ffffff");
   let x=MARGIN;
   for(let i=0;i<COLS.length;i++){
    for(let l=0;l<wrapped[i].length;l++)txt(wrapped[i][l],x+3,top+3+l*9,fontSize,C.ink,false);
    x+=COLS[i].w;
    line(x,top,x,top+height,C.line,.28);
   }
   line(MARGIN,top+height,PAGE_W-MARGIN,top+height,C.line,.36);
   top+=height;written++;
   if(row.status==="Completo")full++;
   else if(row.status==="Incompleto")partials++;
  }
  if(top>434)startPage();else top+=15;
  txt("RESUMO DO MES",MARGIN,top,11,C.navy,true);top+=22;
  const stats=input.summary||{};
  const values=[
   ["Jornadas registradas",String(stats.registered??0)],
   ["Jornadas completas",String(stats.complete??full)],
   ["Horas confirmadas",stats.worked||"0h00"],
   ["Horas extras 60%",stats.he60||"0h00"],
   ["Horas extras 100%",stats.he100||"0h00"],
   ["Horas noturnas (reais)",stats.nightClock||"0h00"]
  ];
  const gridW=(PAGE_W-2*MARGIN-12)/3,gridH=36;
  for(let i=0;i<values.length;i++){
   const x=MARGIN+(i%3)*(gridW+6),y=top+Math.floor(i/3)*(gridH+6);
   rect(x,y,gridW,gridH,"#eaf0f6");
   txt(values[i][0],x+8,y+5,7.5,C.muted,false);
   txt(values[i][1],x+8,y+17,12,C.navy,true);
  }
  top+=2*(gridH+6)+8;
  const note="As horas e adicionais sao estimativas para conferencia. Jornadas com batidas ausentes nao entram nos totais confirmados. Domingos e feriados podem depender de compensacao e norma coletiva. Nao e documento oficial do empregador.";
  const noteLines=rowWrap(note,PAGE_W-2*MARGIN,8.4);
  for(const ln of noteLines){txt(ln,MARGIN,top,8.4,C.muted,false);top+=12;}
  txt("Conferencia do colaborador: _________________________________________________",MARGIN,top+9,8.5,C.ink,false);
  // Base14 Helvetica/WinAnsi: pagina vetorial com texto selecionavel, sem dependencia externa.
  const objects=[null];
  const add=obj=>{objects.push(obj);return objects.length-1;};
  const f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pagesId=add("");
  const catId=add("<< /Type /Catalog /Pages "+pagesId+" 0 R >>");
  const pageRefs=[];
  for(const cmds of pages){
   const body=cmds.join("\n")+"\n";
   const contents=add("<< /Length "+body.length+" >>\nstream\n"+body+"endstream");
   const p=add("<< /Type /Page /Parent "+pagesId+" 0 R /MediaBox [0 0 "+PAGE_W+" "+PAGE_H+"] /Resources << /Font << /F1 "+f1+" 0 R /F2 "+f2+" 0 R >> >> /Contents "+contents+" 0 R >>");
   pageRefs.push(p);
  }
  objects[pagesId]="<< /Type /Pages /Count "+pageRefs.length+" /Kids ["+pageRefs.map(id=>id+" 0 R").join(" ")+"] >>";
  let out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets=[0];
  for(let i=1;i<objects.length;i++){
   offsets.push(out.length);
   out+=i+" 0 obj\n"+objects[i]+"\nendobj\n";
  }
  const xrefOffset=out.length;
  out+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
  for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  out+="trailer\n<< /Size "+objects.length+" /Root "+catId+" 0 R >>\nstartxref\n"+xrefOffset+"\n%%EOF\n";
  const bytes=new Uint8Array(out.length);
  for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;
  return {bytes,pages:pages.length,rows:count,name:"MeuPonto_Espelho_"+input.month+".pdf"};
 }
 function download(data){
  const result=makePDF(data);
  const blob=new Blob([result.bytes],{type:"application/pdf"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download=result.name;link.textContent="Seu PDF esta pronto: "+result.name+" (toque para abrir ou baixar)";
  link.className="btn secondary";link.style.display="inline-block";
  link.style.marginTop="8px";
  const holder=document.getElementById("pdfDownloadResult");
  if(holder){
   const old=holder.querySelector("a[data-pdf-link]");
   if(old&&old.href.startsWith("blob:"))URL.revokeObjectURL(old.href);
   link.setAttribute("data-pdf-link","1");
   holder.replaceChildren(link);
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return result;
 }
 window.MeuPontoPDF={makePDF,download};
})();