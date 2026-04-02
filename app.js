let activeIndex=0;
let mode="entry";

const assets=[
"#1 Generator",
"#2 Generator",
"#3 Generator",
"#4 Generator",
"E-Generator",
"Air Comp #1",
"Air Comp #2",
"BT #1 Fwd",
"BT #2 Aft",
"Azipull #2 Port",
"Azipull #1 Stbd",
"Drybulk #1",
"Drybulk #2",
"SCBA #1",
"Liquid Mud #1",
"Liquid Mud #2",
"Liquid Mud #3",
"Liquid Mud #4"
];

const AUTO_ASSETS=["BT #1 Fwd","Azipull #1 Stbd"];
const BASELINE_KEY="baseline_set";

function todayKey(){return new Date().toISOString().split('T')[0];}
function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}
function isLocked(date){return localStorage.getItem("locked_"+(date||todayKey()))==="1";}
function hasBaseline(){return localStorage.getItem(BASELINE_KEY)==="1";}
function isAutoAsset(name){return hasBaseline() && AUTO_ASSETS.includes(name);}
function shouldHideKeypad(){return mode!=="entry" || isLocked();}
function updateKeypadVisibility(){
  document.getElementById("keypad").classList.toggle("hidden", shouldHideKeypad());
}

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
  mode="entry";
  document.getElementById("finalizeBtn").innerText="View Summary";
  document.getElementById("modeLabel").innerText="Locked";
  updateKeypadVisibility();
  render();
}

function showLogs(){
  mode="logs";
  document.getElementById("modeLabel").innerText="Logs";
  updateKeypadVisibility();
  renderLogs();
}

function summaryValue(rec, name){
  if(!rec) return "";
  if(isAutoAsset(name)){
    const prev=Number(rec.prev)||0;
    const today=Number(rec.today)||0;
    return rec.today==="" ? prev : today;
  }
  return rec.today!=="" && rec.today!==undefined ? rec.today : "";
}

function showSummary(date){
  mode="summary";
  const app=document.getElementById("app");
  const all=loadAll();
  const d=all[date]||{};
  document.getElementById("dateTitle").innerText=date;
  document.getElementById("modeLabel").innerText="Summary";
  updateKeypadVisibility();
  app.innerHTML=`<div class="summaryHeader">Summary — ${date}</div>`;
  assets.forEach(name=>{
    const val=summaryValue(d[name],name);
    app.innerHTML+=`<div class="card"><div class="rowline"><div class="asset-title">${name}</div><div class="asset-title">${val}</div></div></div>`;
  });
}

function renderLogs(){
  const app=document.getElementById("app");
  const all=loadAll();
  const dates=Object.keys(all).sort().reverse();
  document.getElementById("dateTitle").innerText="Logs";
  app.innerHTML="";
  if(!dates.length){
    app.innerHTML='<div class="card"><div class="asset-title">No saved logs yet</div></div>';
    return;
  }
  dates.forEach(date=>{
    app.innerHTML+=`<button class="logButton" onclick="showSummary('${date}')">${date}</button>`;
  });
}

function promptBaseline(all,t){
  let bt1=prompt("Enter TOTAL hours for BT #1 Fwd (baseline):","0");
  let azi1=prompt("Enter TOTAL hours for Azipull #1 Stbd (baseline):","0");
  if(bt1===null) bt1="0";
  if(azi1===null) azi1="0";
  if(!all[t]) all[t]={};
  all[t]["BT #1 Fwd"]={prev:Number(bt1)||0,today:""};
  all[t]["Azipull #1 Stbd"]={prev:Number(azi1)||0,today:""};
  localStorage.setItem(BASELINE_KEY,"1");
}

function initDay(){
  const all=loadAll();
  const t=todayKey();
  if(!all[t]){
    all[t]={};
    const previousDates=Object.keys(all).filter(k=>k!==t).sort();
    const prevDay=previousDates.length?all[previousDates[previousDates.length-1]]:{};
    assets.forEach(n=>{
      let prev=(prevDay[n]&&prevDay[n].today!=="")?prevDay[n].today:0;
      if(isAutoAsset(n) && prevDay[n] && prevDay[n].today==="") prev=Number(prevDay[n].prev)||0;
      all[t][n]={prev:prev,today:""};
    });
    if(!hasBaseline()) promptBaseline(all,t);
    saveAll(all);
  }
}

function getNextIndex(i){
  let n=(i+1)%assets.length;
  while(isAutoAsset(assets[n])) n=(n+1)%assets.length;
  return n;
}

function render(){
  if(mode!=="entry") return;
  const app=document.getElementById("app");
  const all=loadAll();
  const t=todayKey();
  const d=all[t];
  document.getElementById("dateTitle").innerText=t;
  document.getElementById("finalizeBtn").innerText=isLocked()?"View Summary":"Finalize Day";
  document.getElementById("modeLabel").innerText=isLocked()?"Locked":"Entry";
  updateKeypadVisibility();
  app.innerHTML="";

  assets.forEach((name,i)=>{
    const val=d[name].today;
    const prev=d[name].prev;
    const auto=isAutoAsset(name);
    const disabled=isLocked()||auto;
    const div=document.createElement("div");
    div.className="card"+(i===activeIndex&&!isLocked()&&!auto?" active":"")+(auto?" auto":"");
    div.innerHTML=`<div class="rowline">
      <div class="labelWrap">
        <div class="asset-title">${name}</div>
        <div class="asset-sub">${auto?"AUTO from paired unit difference":"Prev: "+prev}</div>
      </div>
      <input readonly value="${val!==''?val:''}" onclick="focusField(${i})" ${disabled?"disabled":""}>
    </div>`;
    app.appendChild(div);
  });
}

function focusField(i){
  if(isLocked()) return;
  if(isAutoAsset(assets[i])) return;
  activeIndex=i;
  render();
}

function press(v){
  if(isLocked()) return;
  const name=assets[activeIndex];
  if(isAutoAsset(name)) return;
  const all=loadAll();
  const t=todayKey();
  let cur=(all[t][name].today ?? "").toString();
  if(cur==="0") cur="";
  if(v==="."&&cur.includes(".")) return;
  cur+=v;
  update(name,cur);
}

function back(){
  if(isLocked()) return;
  const name=assets[activeIndex];
  if(isAutoAsset(name)) return;
  const all=loadAll();
  const t=todayKey();
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
  const all=loadAll();
  const t=todayKey();
  const d=all[t];
  d[name].today=value===""?"":Number(value);

  if(name==="BT #2 Aft"){
    const diff=(Number(d["BT #2 Aft"].today)||0)-(Number(d["BT #2 Aft"].prev)||0);
    d["BT #1 Fwd"].today=(Number(d["BT #1 Fwd"].prev)||0)+diff;
  }

  if(name==="Azipull #2 Port"){
    const diff=(Number(d["Azipull #2 Port"].today)||0)-(Number(d["Azipull #2 Port"].prev)||0);
    d["Azipull #1 Stbd"].today=(Number(d["Azipull #1 Stbd"].prev)||0)+diff;
  }

  saveAll(all);
  render();
}

let lastTouchEnd=0;
document.addEventListener("touchend",function(e){
  const now=Date.now();
  if(now-lastTouchEnd<=300) e.preventDefault();
  lastTouchEnd=now;
},{passive:false});

document.getElementById("dateTitle").innerText=todayKey();
initDay();
if(isLocked()){
  document.getElementById("finalizeBtn").innerText="View Summary";
  document.getElementById("modeLabel").innerText="Locked";
}
render();
