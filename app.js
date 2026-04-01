let activeIndex=0;
let mode="entry";

const sections=[
  {title:"GENS",items:["#1 Generator","#2 Generator","#3 Generator","#4 Generator","E-Generator"]},
  {title:"AIR",items:["Air Comp #1","Air Comp #2"]},
  {title:"B/T'S",items:["BT #1 Fwd","BT #2 Aft"]},
  {title:"AZIPULLS",items:["Azipull #2 Port","Azipull #1 Stbd"]},
  {title:"DRYBULK",items:["Drybulk #1","Drybulk #2"]},
  {title:"SCBA",items:["SCBA #1"]},
  {title:"LIQUID MUD",items:["Liquid Mud #1","Liquid Mud #2","Liquid Mud #3","Liquid Mud #4"]}
];

const assets=sections.flatMap(s=>s.items);

function todayKey(){return new Date().toISOString().split('T')[0];}
function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}
function isLocked(){return localStorage.getItem("locked_"+todayKey())==="1";}
function isSetup(){return localStorage.getItem("setup_"+todayKey())==="1";}

function confirmSetup(){
  if(confirm("Reset setup and hours?")){
    localStorage.clear();
    location.reload();
  }
}

function finalizeOrSummary(){
  if(isLocked()){
    showSummary(todayKey());
    return;
  }
  localStorage.setItem("locked_"+todayKey(),"1");
  document.getElementById("finalizeBtn").innerText="Summary";
  document.getElementById("modeLabel").innerText="Locked";
  showSummary(todayKey());
}

function showLogs(){
  mode="logs";
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Logs";
  renderLogs();
}

function showEntry(){
  mode="entry";
  document.getElementById("app").innerHTML="";
  document.getElementById("keypad").classList.toggle("hidden",isLocked());
  document.getElementById("modeLabel").innerText=isLocked()?"Locked":"Entry";
  render();
}

function showSummary(date){
  mode="summary";
  let app=document.getElementById("app");
  let all=loadAll();
  let d=all[date]||{};
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Summary";
  app.innerHTML=`<div class="summaryHeader">${date}</div>`;
  sections.forEach(section=>{
    app.innerHTML+=`<div class="section-title">${section.title}</div>`;
    section.items.forEach(name=>{
      const val=(d[name]&&d[name].today!=="")?d[name].today:"";
      app.innerHTML+=`<div class="card"><div class="rowline"><div class="asset-title">${name}</div><div class="asset-title">${val}</div></div></div>`;
    });
  });
}

function renderLogs(){
  let app=document.getElementById("app");
  let all=loadAll();
  let dates=Object.keys(all).sort().reverse();
  app.innerHTML="";
  if(!dates.length){app.innerHTML='<div class="card"><div class="asset-title">No saved logs yet</div></div>';return;}
  dates.forEach(date=>{
    app.innerHTML+=`<button class="logButton" onclick="showSummary('${date}')">${date}</button>`;
  });
}

function initDay(){
  let all=loadAll(),t=todayKey();
  if(!all[t]){
    all[t]={};
    let previousDates=Object.keys(all).filter(k=>k!==t).sort();
    let prevDay=previousDates.length?all[previousDates[previousDates.length-1]]:{};
    assets.forEach(n=>{
      const prev=(prevDay[n]&&prevDay[n].today!=="")?prevDay[n].today:0;
      all[t][n]={prev:prev,today:""};
    });
    saveAll(all);
  }
}

function getNextIndex(i){
  let n=(i+1)%assets.length;
  while(assets[n]==="BT #1 Fwd"||assets[n]==="Azipull #1 Stbd"){n=(n+1)%assets.length;}
  return n;
}

function render(){
  if(mode!=="entry") return;
  let app=document.getElementById("app");
  let all=loadAll(),t=todayKey(),d=all[t];
  document.getElementById("dateTitle").innerText=t;
  document.getElementById("finalizeBtn").innerText=isLocked()?"Summary":"Finalize Day";
  app.innerHTML="";
  sections.forEach(section=>{
    let block=document.createElement("div");
    block.className="section";
    block.innerHTML=`<div class="section-title">${section.title}</div>`;
    section.items.forEach(name=>{
      let i=assets.indexOf(name);
      let val=d[name].today;
      let prev=d[name].prev;
      let isAuto=(name==="BT #1 Fwd"||name==="Azipull #1 Stbd");
      let div=document.createElement("div");
      div.className="card "+(i===activeIndex&&!isLocked()?"active":"")+(isAuto?" auto":"");
      div.innerHTML=`<div class="rowline">
        <div class="labelWrap">
          <div class="asset-title">${name}</div>
          <div class="asset-sub">${isAuto?"AUTO from paired unit difference":"Prev: "+prev}</div>
        </div>
        <input readonly value="${val!==''?val:''}" onclick="focusField(${i})" ${isLocked()||isAuto?"disabled":""}>
      </div>`;
      block.appendChild(div);
    });
    app.appendChild(block);
  });
}

function focusField(i){
  if(isLocked()) return;
  if(assets[i]==="BT #1 Fwd"||assets[i]==="Azipull #1 Stbd") return;
  activeIndex=i;
  render();
}

function press(v){
  if(isLocked()) return;
  let name=assets[activeIndex];
  if(name==="BT #1 Fwd"||name==="Azipull #1 Stbd") return;
  let all=loadAll(),t=todayKey();
  let cur=(all[t][name].today ?? "").toString();
  if(cur==="0") cur="";
  if(v==="."&&cur.includes(".")) return;
  cur+=v;
  update(name,cur);
}

function back(){
  if(isLocked()) return;
  let name=assets[activeIndex];
  if(name==="BT #1 Fwd"||name==="Azipull #1 Stbd") return;
  let all=loadAll(),t=todayKey();
  let cur=(all[t][name].today ?? "").toString();
  cur=cur.slice(0,-1);
  update(name,cur||"");
}

function nextField(){
  if(isLocked()) return;
  activeIndex=getNextIndex(activeIndex);
  render();
}

function update(name,value){
  let all=loadAll(),t=todayKey(),d=all[t];
  d[name].today=value===""?"":Number(value);
  if(name==="BT #2 Aft"){
    let diff=(Number(d["BT #2 Aft"].today)||0)-(Number(d["BT #2 Aft"].prev)||0);
    d["BT #1 Fwd"].today=(Number(d["BT #1 Fwd"].prev)||0)+diff;
  }
  if(name==="Azipull #2 Port"){
    let diff=(Number(d["Azipull #2 Port"].today)||0)-(Number(d["Azipull #2 Port"].prev)||0);
    d["Azipull #1 Stbd"].today=(Number(d["Azipull #1 Stbd"].prev)||0)+diff;
  }
  saveAll(all);
  render();
}

initDay();
document.getElementById("dateTitle").innerText=todayKey();
if(isLocked()){
  document.getElementById("finalizeBtn").innerText="Summary";
  document.getElementById("modeLabel").innerText="Locked";
}
render();
