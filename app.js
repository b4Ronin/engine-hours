let activeIndex = 0;
let viewMode = false;

const assets = [
"#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator",
"Air Comp 1","Air Comp 2",
"BT1","BT2",
"Azipull #2 Port","Azipull #1 Stbd",
"Dry Bulk #1","Dry Bulk #2",
"SCBA1",
"Liquid Mud #1","Liquid Mud #3","Liquid Mud #2","Liquid Mud #4"
];

function todayKey(){return new Date().toISOString().split('T')[0];}
function yesterdayKey(){let d=new Date();d.setDate(d.getDate()-1);return d.toISOString().split('T')[0];}

function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}

function confirmSetup(){
if(confirm("WARNING: Setup Mode will reset today’s counters. Continue?")){
enableSetup();
}}

function enableSetup(){
localStorage.setItem("setup_"+todayKey(),"1");
viewMode=false;
render();
}

function isSetup(){return localStorage.getItem("setup_"+todayKey())==="1";}
function isLocked(){return localStorage.getItem("locked_"+todayKey())==="1";}

function lockDay(){
localStorage.setItem("locked_"+todayKey(),"1");
localStorage.removeItem("setup_"+todayKey());
viewMode=true;
render();
}

function toggleView(){
viewMode = !viewMode;
render();
}

function initDay(){
let all=loadAll(),t=todayKey(),y=yesterdayKey();
if(!all[t]){
all[t]={};
let prev=all[y]||{};
assets.forEach(n=>{all[t][n]={prev:prev[n]?.today||0,today:""}});
saveAll(all);
}}

function getNextIndex(i){
let n=(i+1)%assets.length;
if(!isSetup()){
while(assets[n]==="Azipull #1 Stbd"||assets[n]==="BT1"){n=(n+1)%assets.length;}
}
return n;
}

function render(){
let app=document.getElementById("app");
let all=loadAll(),t=todayKey(),d=all[t];

document.getElementById("dateTitle").innerText=t;
app.innerHTML="";

if(viewMode){
document.getElementById("keypad").style.display="none";
assets.forEach(name=>{
let div=document.createElement("div");
div.className="card";
div.innerHTML=`<h3>${name} — ${d[name].today}</h3>`;
app.appendChild(div);
});
return;
}else{
document.getElementById("keypad").style.display="block";
}

assets.forEach((name,i)=>{
let prev=d[name].prev;
let val=d[name].today;

let disabled=isLocked();
if(!isSetup()&&(name==="Azipull #1 Stbd"||name==="BT1"))disabled=true;

let active=i===activeIndex?"active":"";

let div=document.createElement("div");
div.className="card "+active;

div.innerHTML=`
<h3>${name}</h3>
<div class="rowline">
<span>Prev: ${prev}</span>
<input readonly value="${val}" onclick="focusField(${i})" ${disabled?"disabled":""}/>
</div>`;

app.appendChild(div);
});
}

function focusField(i){if(isLocked())return;activeIndex=i;render();}

function press(v){
if(isLocked())return;
let all=loadAll(),t=todayKey();
let cur=all[t][assets[activeIndex]].today.toString();
if(cur==="0")cur="";
cur+=v;
update(assets[activeIndex],cur);
}

function back(){
if(isLocked())return;
let all=loadAll(),t=todayKey();
let cur=all[t][assets[activeIndex]].today.toString();
cur=cur.slice(0,-1);
update(assets[activeIndex],cur||"");
}

function nextField(){if(isLocked())return;activeIndex=getNextIndex(activeIndex);render();}

function update(name,value){
let all=loadAll(),t=todayKey(),d=all[t];
value=value===""?"":Number(value);
d[name].today=value;

if(!isSetup()){
if(name==="Azipull #2 Port"){
let diff=value-d["Azipull #2 Port"].prev;
d["Azipull #1 Stbd"].today=d["Azipull #1 Stbd"].prev+diff;
}
if(name==="BT2"){
let diff=value-d["BT2"].prev;
d["BT1"].today=d["BT1"].prev+diff;
}}

saveAll(all);render();
}

initDay();render();
