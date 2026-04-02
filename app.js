let activeIndex=0;
let mode="entry";
let editingDate=null;

const assets=[
"#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator",
"Air Comp #1","Air Comp #2","BT #1 Fwd","BT #2 Aft",
"Azipull #2 Port","Azipull #1 Stbd","Drybulk #1","Drybulk #2",
"SCBA #1","Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"
];

function todayKey(){return new Date().toISOString().split('T')[0];}
function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}
function isLocked(){return localStorage.getItem("locked_"+todayKey())==="1";}

function formatDate(d){let [y,m,da]=d.split("-");return m+"/"+da+"/"+y;}

function handleMain(){
 if(mode==="entry"){ finalize(); return;}
 if(mode==="summary"){ showEntry(); return;}
 if(mode==="logs"){ showEntry(); return;}
 if(mode==="edit"){ saveEdit(); return;}
}

function confirmSetup(){
 if(confirm("Reset all data?")){localStorage.clear();location.reload();}
}

function finalize(){
 localStorage.setItem("locked_"+todayKey(),"1");
 showSummary(todayKey());
}

function showLogs(){
 mode="logs";
 renderLogs();
}

function showEntry(){
 mode="entry";
 render();
}

function showSummary(date){
 mode="summary";
 editingDate=date;
 let app=document.getElementById("app");
 let all=loadAll();
 let d=all[date];
 app.innerHTML='<div class="summaryHeader">'+formatDate(date)+'</div><button onclick="editDay()">Edit Day</button>';
 assets.forEach(a=>{
  app.innerHTML+='<div class="card">'+a+' — '+(d[a]?.today||"")+'</div>';
 });
}

function editDay(){
 mode="edit";
 renderEdit();
}

function renderEdit(){
 let app=document.getElementById("app");
 let all=loadAll();
 let d=all[editingDate];
 app.innerHTML='<div class="summaryHeader">Edit '+formatDate(editingDate)+'</div>';
 assets.forEach((a,i)=>{
  app.innerHTML+=`<div class="card"><input value="${d[a].today||""}" onchange="editValue('${a}',this.value)"></div>`;
 });
}

function editValue(name,val){
 let all=loadAll();
 all[editingDate][name].today = val===""?"":Number(val);
 saveAll(all);
}

function saveEdit(){
 recalcFrom(editingDate);
 showSummary(editingDate);
}

function recalcFrom(date){
 let all=loadAll();
 let dates=Object.keys(all).sort();
 let startIndex=dates.indexOf(date);
 for(let i=startIndex;i<dates.length;i++){
   let prevDay=all[dates[i-1]];
   let curDay=all[dates[i]];
   assets.forEach(a=>{
     let prev = i===0 ? 0 : prevDay[a].today||0;
     curDay[a].prev = prev;
     if(curDay[a].today==="") curDay[a].today=prev;
   });
 }
 saveAll(all);
}

function renderLogs(){
 let app=document.getElementById("app");
 let all=loadAll();
 app.innerHTML="";
 Object.keys(all).sort().reverse().forEach(d=>{
  app.innerHTML+=`<button class="logButton" onclick="showSummary('${d}')">${formatDate(d)}</button>`;
 });
}

function init(){
 let all=loadAll(),t=todayKey();
 if(!all[t]){
  all[t]={};
  assets.forEach(a=>all[t][a]={prev:0,today:""});
  saveAll(all);
 }
}

function render(){
 let app=document.getElementById("app");
 let all=loadAll(),t=todayKey(),d=all[t];
 app.innerHTML="";
 assets.forEach((a,i)=>{
  app.innerHTML+=`<div class="card">${a} — ${d[a].today||""}</div>`;
 });
}

init();render();
