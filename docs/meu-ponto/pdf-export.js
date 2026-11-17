"use strict";
(function(){
 const PAGE_W=842,PAGE_H=595,MARGIN=28;
 const COLS=[
  {name:"Data",w:54},{name:"Dia",w:27},{name:"Entrada",w:55},
  {name:"Saida int.",w:60},{name:"Retorno",w:60},{name:"Saida",w:60},
  {name:"Trabalhadas",w:68},{name:"HE 60%",w:51},{name:"HE 100%",w:51},
  {name:"Situacao / observacoes",w:300}
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
  const reports=Array.isArray(input?.months)?input.months:[input];
  if(!reports.length||reports.length>60)throw Error("Selecione de 1 a 60 meses por arquivo.");
  const names=new Set();
  for(const report of reports){
   if(!report||!Array.isArray(report.rows)||!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(report.month||"")){
    throw Error("Competencia ou jornadas invalidas para o espelho.");
   }
   if(names.has(report.month))throw Error("Competencia repetida: "+report.month);
   names.add(report.month);
   const [yy,mm]=report.month.split("-").map(Number);
   if(report.rows.length!==new Date(yy,mm,0).getDate()){
    throw Error("O espelho de "+report.month+" deve conter todos os dias do mes.");
   }
  }
  reports.sort((a,b)=>a.month.localeCompare(b.month));
  const pages=[];
  let activeMonth=reports[0].month;
  let commands=[],top=0;
  const startPage=function(){
   commands=[];pages.push(commands);
   top=115;
   commands.push(color(C.navy)+" rg 0 0 "+num(PAGE_W)+" "+num(PAGE_H)+" re f");
   commands.push("1 1 1 rg "+num(MARGIN-9)+" 25 "+num(PAGE_W-2*(MARGIN-9))+" "+num(PAGE_H-44)+" re f");
   line(MARGIN,71,PAGE_W-MARGIN,71,C.gold,2);
   txt("MEU PONTO  |  ESPELHO MENSAL",MARGIN,24,15,C.navy,true);
   txt("Competencia: "+activeMonth.split("-").reverse().join("/"),MARGIN,48,10,C.muted,false);
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
  let totalRows=0;
  for(let sectionIndex=0;sectionIndex<reports.length;sectionIndex++){
   const section=reports[sectionIndex];
   activeMonth=section.month;
   startPage(); // cada mes comeca em pagina propria
   const count=section.rows.length;
   totalRows+=count;
   let written=0,full=0;
   for(const row of section.rows){
    const noteText=(row.status||"")+(row.note?" | "+row.note:"");
    const cells=[
     row.date||"",row.weekday||"",row.entry||"",row.breakOut||"",row.breakIn||"",row.exit||"",
     row.worked||"",row.he60||"",row.he100||"",noteText
    ];
    const fontSize=7.45;
    const wrapped=cells.map((v,i)=>rowWrap(v,COLS[i].w,fontSize));
    let height=Math.max(18,Math.max(...wrapped.map(v=>v.length))*9+7);
    // Uma observacao excepcionalmente longa vai para uma pagina suplementar de notas,
    // sem esconder as quatro marcacoes da linha principal.
    let extraNoteLines=[];
    if(height>375){
     extraNoteLines=wrapped[9].slice(25);
     wrapped[9]=wrapped[9].slice(0,24).concat(["(continua em nota complementar)"]);
     height=Math.max(18,Math.max(...wrapped.map(v=>v.length))*9+7);
    }
    if(top+height>519)startPage();
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
    if(extraNoteLines.length){
     // Registra os trechos restantes em pagina dedicada, mantendo o texto pesquisavel.
     startPage();
     txt("NOTAS COMPLEMENTARES - "+(row.date||""),MARGIN,126,10,C.navy,true);
     let noteY=145;
     for(const ln of extraNoteLines){
      if(noteY>515){startPage();noteY=126;}
      txt(ln,MARGIN+6,noteY,8,C.ink,false);
      noteY+=11;
     }
     top=Math.max(top,noteY+15);
    }
   }
   // Garante que o resumo e a assinatura nao ultrapassem o limite da pagina.
   if(top>346)startPage();else top+=14;
   txt("RESUMO DO MES",MARGIN,top,11,C.navy,true);
   top+=22;
   const stats=section.summary||{};
   const values=[
    ["Dias do calendario",String(count)],
    ["Jornadas registradas",String(stats.registered??0)],
    ["Jornadas completas",String(stats.complete??full)],
    ["Horas confirmadas",stats.worked||"0h00"],
    ["Horas extras 60%",stats.he60||"0h00"],
    ["Horas extras 100%",stats.he100||"0h00"],
    ["Horas noturnas (reais)",stats.nightClock||"0h00"]
   ];
   const gridW=(PAGE_W-2*MARGIN-12)/3,gridH=33;
   for(let i=0;i<values.length;i++){
    const x=MARGIN+(i%3)*(gridW+6),y=top+Math.floor(i/3)*(gridH+6);
    rect(x,y,gridW,gridH,"#eaf0f6");
    txt(values[i][0],x+8,y+5,7.5,C.muted,false);
    txt(values[i][1],x+8,y+17,11.5,C.navy,true);
   }
   top+=3*(gridH+6)+7;
   const note="Todas as datas do calendario constam neste espelho, mesmo sem registros. Ausencia de batidas nao implica hora trabalhada zero. Extras e adicional noturno sao estimativas de conferencia, sujeitas a folgas, compensacao e norma coletiva.";
   const noteLines=rowWrap(note,PAGE_W-2*MARGIN,8.3);
   for(const ln of noteLines){txt(ln,MARGIN,top,8.3,C.muted,false);top+=12;}
   txt("Conferencia do colaborador: _________________________________________________",MARGIN,top+10,8.5,C.ink,false);
  }
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
  const name=reports.length===1?
   "MeuPonto_Espelho_"+reports[0].month+".pdf":
   "MeuPonto_Espelhos_"+reports[0].month+"_a_"+reports[reports.length-1].month+"_"+reports.length+"meses.pdf";
  return {bytes,pages:pages.length,rows:totalRows,months:reports.length,name};
 }

 const latestUrls={download:null,preview:null};
 function prepare(data,mode){
  const result=makePDF(data);
  const url=URL.createObjectURL(new Blob([result.bytes],{type:"application/pdf"}));
  if(latestUrls[mode])URL.revokeObjectURL(latestUrls[mode]);
  latestUrls[mode]=url;
  return {result,url};
 }
 function download(data){
  const file=prepare(data,"download");
  const holder=document.getElementById("pdfDownloadResult");
  const link=document.createElement("a");
  link.href=file.url;link.download=file.result.name;
  link.textContent="Baixar novamente: "+file.result.name;
  link.className="btn secondary";link.style.display="inline-block";link.style.marginTop="8px";
  if(holder)holder.replaceChildren(link);
  // Disparado diretamente pelo clique do usuário; sem nova aba ou diálogo de impressão.
  const trigger=document.createElement("a");
  trigger.href=file.url;trigger.download=file.result.name;
  document.body.appendChild(trigger);trigger.click();trigger.remove();
  return file.result;
 }
 function preview(data){
  const file=prepare(data,"preview");
  const box=document.getElementById("pdfPreviewBox");
  const frame=document.getElementById("pdfPreviewFrame");
  const link=document.getElementById("pdfPreviewOpenLink");
  if(!box||!frame||!link)throw Error("Visualizador de PDF não encontrado");
  box.classList.remove("hidden");
  frame.src=file.url;
  link.href=file.url;
  link.target="_blank";
  link.rel="noopener noreferrer";
  box.scrollIntoView({behavior:"smooth",block:"start"});
  return file.result;
 }
 window.MeuPontoPDF={makePDF,download,preview};
})();