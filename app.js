let mode="entry";
let editDate=null;
let activeIndex=0;

const assets=["#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator","Air Comp #1","Air Comp #2","BT #1 Fwd","BT #2 Aft","Azipull #2 Port","Azipull #1 Stbd","Drybulk #1","Drybulk #2","SCBA #1","Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"];

function today(){
 let d=new Date();
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function load(){return JSON.parse(localStorage.getItem("data")||"{}")}
function save(d){localStorage.setItem("data",JSON.stringify(d))}

function format(d){
 let p=d.split("-");
 return p[1]+"/"+p[2]+"/"+p[0];
}

function dedupe(d){
 let out={};
 Object.keys(d).forEach(k=>{
  let key=k;
  if(!out[key]) out[key]=d[k];
 });
 return out;
}

function init(){
 let d=load();
 d=dedupe(d);
 let t=today();
 if(!d[t]){
  d[t]={};
  assets.forEach(a=>d[t][a]={prev:0,today:0});
 }
 save(d);
}

function showEntry(){
 mode="entry";
 let d=load(),t=today();
 document.getElementById("date").innerText=format(t);
 let app=document.getElementById("app");
 app.innerHTML="";
 assets.forEach((a,i)=>{
  app.innerHTML+=`<div class="card ${i===activeIndex?"active":""}">${a} — ${d[t][a].today}</div>`;
 });
}

function showLogs(){
 mode="logs";
 let d=load();
 let app=document.getElementById("app");
 app.innerHTML="";
 Object.keys(d).sort().reverse().forEach(x=>{
  app.innerHTML+=`<button onclick="showSummary('${x}')">${format(x)}</button>`;
 });
}

function showSummary(date){
 mode="summary";
 editDate=date;
 let d=load()[date];
 document.getElementById("date").innerText=format(date);
 let app=document.getElementById("app");
 app.innerHTML=`<button class="editBtn" onclick="edit()">EDIT DAY</button>`;
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card">${a} — ${d[a].today}</div>`;
 });
}

function edit(){
 mode="edit";
 let d=load()[editDate];
 let app=document.getElementById("app");
 app.innerHTML=`<button class="editBtn" onclick="saveEdit()">SAVE</button>`;
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card"><input value="${d[a].today}" onchange="update('${a}',this.value)"></div>`;
 });
}

function update(a,v){
 let d=load();
 d[editDate][a].today=Number(v)||0;
 save(d);
}

function recalc(){
 let d=load();
 let keys=Object.keys(d).sort();
 for(let i=1;i<keys.length;i++){
  let prev=d[keys[i-1]];
  let cur=d[keys[i]];
  assets.forEach(a=>{
   cur[a].prev=prev[a].today;
  });
 }
 save(d);
}

function saveEdit(){
 recalc();
 showSummary(editDate);
}

function handleTop(){showEntry()}
function reset(){localStorage.clear();location.reload()}

init();
showEntry();
