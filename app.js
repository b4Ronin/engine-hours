let mode="entry";
let editingDate=null;

const assets=["#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator","Air Comp #1","Air Comp #2","BT #1 Fwd","BT #2 Aft","Azipull #2 Port","Azipull #1 Stbd","Drybulk #1","Drybulk #2","SCBA #1","Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"];

function todayKey(){
 let d=new Date();
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function load(){return JSON.parse(localStorage.getItem("data")||"{}")}
function save(d){localStorage.setItem("data",JSON.stringify(d))}

function format(d){
 let p=d.split("-");
 return p[1]+"/"+p[2]+"/"+p[0];
}

function handleMain(){showEntry()}

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
 editingDate=date;
 let d=load()[date];
 let app=document.getElementById("app");
 app.innerHTML=`<h3>${format(date)}</h3>
 <button class="editBtn" onclick="editDay()">EDIT DAY</button>`;
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card">${a} - ${d[a]?.today||""}</div>`;
 });
}

function editDay(){
 mode="edit";
 let d=load()[editingDate];
 let app=document.getElementById("app");
 app.innerHTML=`<h3>Edit ${format(editingDate)}</h3>`;
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card"><input value="${d[a].today||""}" onchange="update('${a}',this.value)"></div>`;
 });
 app.innerHTML+=`<button class="editBtn" onclick="saveEdit()">SAVE</button>`;
}

function update(a,v){
 let all=load();
 all[editingDate][a].today=Number(v)||0;
 save(all);
}

function saveEdit(){
 showSummary(editingDate);
}

function showEntry(){
 mode="entry";
 let d=load();
 let t=todayKey();
 if(!d[t]){
  d[t]={};
  assets.forEach(a=>d[t][a]={today:0});
  save(d);
 }
 let app=document.getElementById("app");
 app.innerHTML="";
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card">${a} - ${d[t][a].today}</div>`;
 });
}

showEntry();
