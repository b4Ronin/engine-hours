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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function(){});
  });
}

function todayKey(){return new Date().toISOString().split('T')[0];}
function loadAll(){return JSON.parse(localStorage.getItem("engineDataAll")||"{}");}
function saveAll(d){localStorage.setItem("engineDataAll",JSON.stringify(d));}
function isLocked(){return localStorage.getItem("locked_"+todayKey())==="1";}

function formatDate(dateStr){
  if(!dateStr) return "";
  if(dateStr.includes("-")){
    const parts=dateStr.split("-");
    if(parts.length===3){
      return parts[1].padStart(2,"0")+"/"+parts[2].padStart(2,"0")+"/"+parts[0];
    }
  }
  if(dateStr.includes("/")){
    const parts=dateStr.split("/");
    if(parts.length===3){
      if(parts[0].length===4){
        return parts[1].padStart(2,"0")+"/"+parts[2].padStart(2,"0")+"/"+parts[0];
      }
      return parts[0].padStart(2,"0")+"/"+parts[1].padStart(2,"0")+"/"+parts[2];
    }
  }
  return dateStr;
}

function confirmSetup(){
  if(confirm("Reset setup and hours?")){
    localStorage.clear();
    location.reload();
  }
}

function handleTopLeftButton(){
  if(mode!=="entry"){
    showEntry();
    return;
  }
  finalizeOrSummary();
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

function updateTopLeftButton(){
  const btn=document.getElementById("finalizeBtn");
  if(mode!=="entry"){
    btn.innerText="Back to Today";
    return;
  }
  btn.innerText=isLocked()?"Summary":"Finalize Day";
}

function showLogs(){
  mode="logs";
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Logs";
  updateTopLeftButton();
  renderLogs();
}

function showEntry(){
  mode="entry";
  render();
  updateTopLeftButton();
  setTimeout(scrollToActive, 60);
}

function showSummary(date){
  mode="summary";
  const app=document.getElementById("app");
  const all=loadAll();
  const d=all[date]||{};
  document.getElementById("dateTitle").innerText=formatDate(date);
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Summary";
  updateTopLeftButton();
  app.innerHTML='<div class="summaryHeader">'+formatDate(date)+'</div>';
  assets.forEach(function(name){
    const val=(d[name]&&d[name].today!==""&&d[name].today!==null&&d[name].today!==undefined)?d[name].today:"";
    app.innerHTML+='<div class="card"><div class="rowline"><div class="asset-title">'+name+'</div><div class="asset-title">'+val+'</div></div></div>';
  });
}

function renderLogs(){
  const app=document.getElementById("app");
  const all=loadAll();
  const dates=Object.keys(all).sort().reverse();
  document.getElementById("dateTitle").innerText=formatDate(todayKey());
  app.innerHTML="";
  if(!dates.length){
    app.innerHTML='<div class="card"><div class="asset-title">No saved logs yet</div></div>';
    return;
  }
  dates.forEach(function(date){
    app.innerHTML+='<button class="logButton" onclick="showSummary(\''+date+'\')">'+formatDate(date)+'</button>';
  });
}

function findLastCompletedDay(all,currentDate){
  const priorDates=Object.keys(all).filter(function(k){return k!==currentDate;}).sort();
  if(!priorDates.length) return null;
  for(let i=priorDates.length-1;i>=0;i--){
    const day=all[priorDates[i]];
    if(!day) continue;
    const hasAnyValue=assets.some(function(name){
      return day[name] && day[name].today!=="" && day[name].today!==null && day[name].today!==undefined;
    });
    if(hasAnyValue) return day;
  }
  return null;
}

function initDay(){
  const all=loadAll(), t=todayKey();
  if(!all[t]){
    all[t]={};
    const prevDay=findLastCompletedDay(all,t);
    assets.forEach(function(n){
      const prev=(prevDay && prevDay[n] && prevDay[n].today!=="" && prevDay[n].today!==null && prevDay[n].today!==undefined)?prevDay[n].today:0;
      all[t][n]={prev:prev,today:""};
    });
    saveAll(all);
  }
}

function getNextIndex(i){
  let n=(i+1)%assets.length;
  while(assets[n]==="BT #1 Fwd"||assets[n]==="Azipull #1 Stbd"){
    n=(n+1)%assets.length;
  }
  return n;
}

function scrollToActive(){
  const active=document.querySelector(".card.active");
  if(!active) return;
  active.scrollIntoView({behavior:"smooth", block:"center"});
}

function render(){
  if(mode!=="entry") return;
  const app=document.getElementById("app");
  const all=loadAll(), t=todayKey(), d=all[t];
  document.getElementById("dateTitle").innerText=formatDate(t);
  document.getElementById("modeLabel").innerText=isLocked()?"Locked":"Entry";
  document.getElementById("keypad").classList.toggle("hidden",isLocked());
  updateTopLeftButton();
  app.innerHTML="";

  assets.forEach(function(name,i){
    const val=d[name].today;
    const prev=d[name].prev;
    const isAuto=(name==="BT #1 Fwd"||name==="Azipull #1 Stbd");
    const disabled=isLocked()||isAuto;
    const div=document.createElement("div");
    div.className="card"+(i===activeIndex&&!isLocked()&&!isAuto?" active":"")+(isAuto?" auto":"");
    div.innerHTML='<div class="rowline"><div class="labelWrap"><div class="asset-title">'+name+'</div><div class="asset-sub">'+(isAuto?"AUTO from paired unit difference":"Prev: "+prev)+'</div></div><input readonly value="'+(val!==""?val:"")+'" onclick="focusField('+i+')" '+(disabled?"disabled":"")+"></div>";
    app.appendChild(div);
  });

  setTimeout(scrollToActive, 60);
}

function focusField(i){
  if(isLocked()) return;
  if(assets[i]==="BT #1 Fwd"||assets[i]==="Azipull #1 Stbd") return;
  activeIndex=i;
  render();
  setTimeout(scrollToActive, 60);
}

function press(v){
  if(isLocked()) return;
  const name=assets[activeIndex];
  if(name==="BT #1 Fwd"||name==="Azipull #1 Stbd") return;
  const all=loadAll(), t=todayKey();
  let cur=(all[t][name].today ?? "").toString();
  if(cur==="0") cur="";
  if(v==="."&&cur.includes(".")) return;
  cur+=v;
  update(name,cur);
}

function back(){
  if(isLocked()) return;
  const name=assets[activeIndex];
  if(name==="BT #1 Fwd"||name==="Azipull #1 Stbd") return;
  const all=loadAll(), t=todayKey();
  let cur=(all[t][name].today ?? "").toString();
  cur=cur.slice(0,-1);
  update(name,cur||"");
}

function nextField(){
  if(isLocked()) return;
  activeIndex=getNextIndex(activeIndex);
  render();
  setTimeout(scrollToActive, 60);
}

function update(name,value){
  const all=loadAll(), t=todayKey(), d=all[t];
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

initDay();
document.getElementById("dateTitle").innerText=formatDate(todayKey());
if(isLocked()){
  document.getElementById("modeLabel").innerText="Locked";
}
updateTopLeftButton();
render();
