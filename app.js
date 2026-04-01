let activeIndex=0;
let mode="entry";

const assets=[
"#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator",
"Air Comp #1","Air Comp #2",
"BT #1 Fwd","BT #2 Aft",
"Azipull #2 Port","Azipull #1 Stbd",
"Drybulk #1","Drybulk #2",
"SCBA #1",
"Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"
];

function todayKey(){return new Date().toISOString().split('T')[0];}
function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}

function confirmSetup(){
if(confirm("Reset all data?")){
localStorage.clear();location.reload();
}}

function finalizeDay(){
let t=todayKey();
localStorage.setItem("locked_"+t,"1");
document.getElementById("finalizeBtn").innerText="Summary";
showSummary(t);
}

function showLogs(){
mode="logs";
renderLogs();
}

function showSummary(date){
mode="summary";
let app=document.getElementById("app");
let all=loadAll();
let d=all[date];
document.getElementById("keypad").style.display="none";
app.innerHTML=`<h2>${date}</h2>`;
assets.forEach(name=>{
app.innerHTML+=`<div class="card"><h3>${name}</h3><div>${d[name]?.today||""}</div></div>`;
});
}

function renderLogs(){
let app=document.getElementById("app");
let all=loadAll();
app.innerHTML="";
Object.keys(all).sort().reverse().forEach(date=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`<h3>${date}</h3>`;
div.onclick=()=>showSummary(date);
app.appendChild(div);
});
document.getElementById("keypad").style.display="none";
}

function initDay(){
let all=loadAll(),t=todayKey();
if(!all[t]){
all[t]={};
assets.forEach(n=>{all[t][n]={prev:0,today:""}});
saveAll(all);
}}

function render(){
if(mode!=="entry")return;
let app=document.getElementById("app");
let all=loadAll(),t=todayKey(),d=all[t];
document.getElementById("dateTitle").innerText=t;
app.innerHTML="";
assets.forEach((name,i)=>{
let val=d[name].today;
let div=document.createElement("div");
div.className="card "+(i===activeIndex?"active":"");
div.innerHTML=`<h3>${name}</h3><div class="rowline"><input readonly value="${val||""}" onclick="activeIndex=${i};render()"/></div>`;
app.appendChild(div);
});
}

function press(v){
let all=loadAll(),t=todayKey();
let cur=all[t][assets[activeIndex]].today||"";
cur+=v;
update(assets[activeIndex],cur);
}

function back(){
let all=loadAll(),t=todayKey();
let cur=all[t][assets[activeIndex]].today||"";
cur=cur.slice(0,-1);
update(assets[activeIndex],cur);
}

function nextField(){
activeIndex=(activeIndex+1)%assets.length;
render();
}

function update(name,value){
let all=loadAll(),t=todayKey(),d=all[t];
value=value===""?"":Number(value);
d[name].today=value;

if(name==="BT #2 Aft"){
let diff=value-d["BT #2 Aft"].prev;
d["BT #1 Fwd"].today=d["BT #1 Fwd"].prev+diff;
}
if(name==="Azipull #2 Port"){
let diff=value-d["Azipull #2 Port"].prev;
d["Azipull #1 Stbd"].today=d["Azipull #1 Stbd"].prev+diff;
}

saveAll(all);render();
}

initDay();render();
