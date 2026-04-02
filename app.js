let mode="entry";
let activeIndex=0;
let currentDate=null;

const assets=[
"#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator",
"Air Comp #1","Air Comp #2","BT #1 Fwd","BT #2 Aft",
"Azipull #2 Port","Azipull #1 Stbd","Drybulk #1","Drybulk #2",
"SCBA #1","Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"
];

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function(){});
  });
}

function todayKey(){
 let d=new Date();
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function format(d){
 let p=d.split("-");
 return p[1]+"/"+p[2]+"/"+p[0];
}

function load(){return JSON.parse(localStorage.getItem("data")||"{}")}
function save(d){localStorage.setItem("data",JSON.stringify(d))}

function init(){
 let d=load(),t=todayKey();
 if(!d[t]){
  d[t]={};
  assets.forEach(a=>d[t][a]={prev:0,today:""});
  save(d);
 }
 currentDate=t;
}

function handleMain(){
 if(mode==="entry"||mode==="edit"){
   finalize();
 } else {
   showEntry();
 }
}

function handleSetup(){
 if(mode==="summary"){
   enterEdit();
 } else if(mode==="edit"){
   finalize();
 } else {
   if(confirm("Reset all data?")){localStorage.clear();location.reload();}
 }
}

function showLogs(){
 mode="logs";
 document.getElementById("mainBtn").innerText="Back to Today";
 document.getElementById("setupBtn").innerText="Setup";
 document.getElementById("modeLabel").innerText="Logs";
 document.getElementById("keypad").style.display="none";
 let d=load();
 let app=document.getElementById("app");
 app.innerHTML="";
 Object.keys(d).sort().reverse().forEach(date=>{
  app.innerHTML+=`<button class="card" onclick="openDate('${date}')" style="width:calc(100% - 16px);color:#fff;border:none;text-align:left;">${format(date)}</button>`;
 });
}

function openDate(date){
 currentDate=date;
 showSummary();
}

function showSummary(){
 mode="summary";
 let d=load()[currentDate];
 document.getElementById("dateTitle").innerText=format(currentDate);
 document.getElementById("setupBtn").innerText="Edit This Day";
 document.getElementById("mainBtn").innerText="Back to Today";
 document.getElementById("modeLabel").innerText="Summary";
 document.getElementById("keypad").style.display="none";
 let app=document.getElementById("app");
 app.innerHTML="";
 assets.forEach(a=>{
  app.innerHTML+=`<div class="card">${a} — ${d[a].today||""}</div>`;
 });
}

function enterEdit(){
 mode="edit";
 document.getElementById("setupBtn").innerText="Finalize This Day";
 document.getElementById("mainBtn").innerText="Back to Today";
 document.getElementById("modeLabel").innerText="Edit";
 renderEntry(true);
}

function showEntry(){
 currentDate=todayKey();
 mode="entry";
 document.getElementById("mainBtn").innerText="Finalize Day";
 document.getElementById("setupBtn").innerText="Setup";
 document.getElementById("modeLabel").innerText="Entry";
 renderEntry(false);
}

function renderEntry(isEdit){
 let d=load()[currentDate];
 document.getElementById("dateTitle").innerText=format(currentDate);
 document.getElementById("keypad").style.display="block";
 let app=document.getElementById("app");
 app.innerHTML="";
 assets.forEach((a,i)=>{
  app.innerHTML+=`<div class="card ${i===activeIndex?"active":""}">${a} — ${d[a].today||""}</div>`;
 });
}

function press(v){
 let d=load();
 let cur=(d[currentDate][assets[activeIndex]].today||"").toString();
 if(cur==="0") cur="";
 if(v==="." && cur.includes(".")) return;
 cur+=v;
 d[currentDate][assets[activeIndex]].today = cur==="" ? "" : Number(cur);
 save(d);
 renderEntry(mode==="edit");
}

function back(){
 let d=load();
 let cur=(d[currentDate][assets[activeIndex]].today||"").toString();
 cur=cur.slice(0,-1);
 d[currentDate][assets[activeIndex]].today = cur==="" ? "" : Number(cur);
 save(d);
 renderEntry(mode==="edit");
}

function nextField(){
 activeIndex=(activeIndex+1)%assets.length;
 renderEntry(mode==="edit");
}

function finalize(){
 let d=load();
 recalc(d);
 save(d);
 localStorage.setItem("locked_"+currentDate,"1");
 showSummary();
}

function recalc(d){
 let keys=Object.keys(d).sort();
 for(let i=0;i<keys.length;i++){
  let cur=d[keys[i]];
  let prev=i>0?d[keys[i-1]]:null;
  assets.forEach(a=>{
   cur[a].prev = prev ? (prev[a].today || 0) : 0;
  });
  let diff=(cur["BT #2 Aft"].today||0)-(cur["BT #2 Aft"].prev||0);
  cur["BT #1 Fwd"].today=(cur["BT #1 Fwd"].prev||0)+diff;
  let diff2=(cur["Azipull #2 Port"].today||0)-(cur["Azipull #2 Port"].prev||0);
  cur["Azipull #1 Stbd"].today=(cur["Azipull #1 Stbd"].prev||0)+diff2;
 }
}

init();
showEntry();
