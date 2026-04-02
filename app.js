let activeIndex=0;
let mode="entry";
let editingDate=null;

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

function isoTodayKey(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const da=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+da;
}

function normalizeDateKey(dateStr){
  if(!dateStr) return "";
  if(dateStr.includes("-")){
    const p=dateStr.split("-");
    if(p.length===3){
      if(p[0].length===4){
        return p[0]+"-"+p[1].padStart(2,"0")+"-"+p[2].padStart(2,"0");
      }
      return p[2]+"-"+p[0].padStart(2,"0")+"-"+p[1].padStart(2,"0");
    }
  }
  if(dateStr.includes("/")){
    const p=dateStr.split("/");
    if(p.length===3){
      if(p[0].length===4){
        return p[0]+"-"+p[1].padStart(2,"0")+"-"+p[2].padStart(2,"0");
      }
      return p[2]+"-"+p[0].padStart(2,"0")+"-"+p[1].padStart(2,"0");
    }
  }
  return dateStr;
}

function formatDate(dateStr){
  const k=normalizeDateKey(dateStr);
  if(!k.includes("-")) return dateStr||"";
  const p=k.split("-");
  return p[1].padStart(2,"0")+"/"+p[2].padStart(2,"0")+"/"+p[0];
}

function loadAll(){
  try{
    const raw=JSON.parse(localStorage.getItem("engineDataAll")||"{}");
    return dedupeAndNormalize(raw);
  }catch(e){
    return {};
  }
}

function saveAll(d){
  localStorage.setItem("engineDataAll", JSON.stringify(dedupeAndNormalize(d)));
}

function dedupeAndNormalize(all){
  const out={};
  Object.keys(all||{}).forEach(function(key){
    const nk=normalizeDateKey(key);
    const incoming=all[key]||{};
    if(!out[nk]){
      out[nk]=incoming;
    }else{
      // merge duplicates, preferring records with more filled values
      const a=countFilled(out[nk]);
      const b=countFilled(incoming);
      out[nk]=(b>=a)?incoming:out[nk];
    }
  });
  return out;
}

function countFilled(day){
  if(!day) return 0;
  let c=0;
  assets.forEach(function(name){
    if(day[name] && day[name].today!=="" && day[name].today!==null && day[name].today!==undefined) c++;
  });
  return c;
}

function todayKey(){ return isoTodayKey(); }
function isLocked(){ return localStorage.getItem("locked_"+todayKey())==="1"; }

function confirmSetup(){
  if(confirm("Reset setup and hours?")){
    localStorage.clear();
    location.reload();
  }
}

function handleTopLeftButton(){
  if(mode==="logs" || mode==="summary" || mode==="edit"){
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
  document.getElementById("modeLabel").innerText="Locked";
  showSummary(todayKey());
}

function updateTopLeftButton(){
  const btn=document.getElementById("finalizeBtn");
  if(mode==="logs" || mode==="summary" || mode==="edit"){
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
  editingDate=normalizeDateKey(date);
  mode="summary";
  const app=document.getElementById("app");
  const all=loadAll();
  const d=all[editingDate]||{};
  document.getElementById("dateTitle").innerText=formatDate(editingDate);
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Summary";
  updateTopLeftButton();
  app.innerHTML='<div class="summaryHeader">'+formatDate(editingDate)+'</div>'
    +'<button class="editDayBtn" onclick="editDay()">Edit Day</button>';
  assets.forEach(function(name){
    const val=(d[name]&&d[name].today!==""&&d[name].today!==null&&d[name].today!==undefined)?d[name].today:"";
    app.innerHTML+='<div class="card"><div class="rowline"><div class="asset-title">'+name+'</div><div class="asset-title">'+val+'</div></div></div>';
  });
}

function editDay(){
  mode="edit";
  renderEdit();
}

function renderEdit(){
  const app=document.getElementById("app");
  const all=loadAll();
  const d=all[editingDate]||{};
  document.getElementById("dateTitle").innerText=formatDate(editingDate);
  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("modeLabel").innerText="Edit";
  updateTopLeftButton();
  app.innerHTML='<div class="summaryHeader">Edit '+formatDate(editingDate)+'</div>'
    +'<button class="editDayBtn" onclick="saveEdit()">Save Changes</button>';
  assets.forEach(function(name){
    const isAuto=(name==="BT #1 Fwd"||name==="Azipull #1 Stbd");
    const val=(d[name]&&d[name].today!==""&&d[name].today!==null&&d[name].today!==undefined)?d[name].today:"";
    app.innerHTML+='<div class="card"><div class="editRow"><div class="labelWrap"><div class="asset-title">'+name+'</div><div class="asset-sub">'+(isAuto?"AUTO recalculated":"Edit value")+'</div></div><input class="editField" '+(isAuto?'disabled':'')+' value="'+val+'" oninput="editValue(\''+escapeName(name)+'\', this.value)"></div></div>';
  });
}

function escapeName(name){
  return name.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
}

function editValue(name,val){
  const realName=unescapeName(name);
  const all=loadAll();
  if(!all[editingDate]) return;
  all[editingDate][realName].today = val==="" ? "" : Number(val);
  saveAll(all);
}

function unescapeName(name){
  return name.replace(/\\\\/g,"\\").replace(/\\'/g,"'");
}

function saveEdit(){
  recalcFrom(editingDate);
  showSummary(editingDate);
}

function renderLogs(){
  const app=document.getElementById("app");
  const all=loadAll();
  const keys=Object.keys(all).sort().reverse();
  const seen={};
  const dates=keys.filter(function(k){
    const nk=normalizeDateKey(k);
    if(seen[nk]) return false;
    seen[nk]=true;
    return true;
  });
  document.getElementById("dateTitle").innerText=formatDate(todayKey());
  app.innerHTML="";
  if(!dates.length){
    app.innerHTML='<div class="card"><div class="asset-title">No saved logs yet</div></div>';
    return;
  }
  dates.forEach(function(date){
    const nk=normalizeDateKey(date);
    app.innerHTML+='<button class="logButton" onclick="showSummary(\''+nk+'\')">'+formatDate(nk)+'</button>';
  });
}

function findLastCompletedDay(all,currentDate){
  const priorDates=Object.keys(all).map(normalizeDateKey).filter(function(k){return k!==currentDate;}).sort();
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
  let all=loadAll();
  all=dedupeAndNormalize(all);
  const t=todayKey();
  if(!all[t]){
    all[t]={};
    const prevDay=findLastCompletedDay(all,t);
    assets.forEach(function(n){
      const prev=(prevDay && prevDay[n] && prevDay[n].today!=="" && prevDay[n].today!==null && prevDay[n].today!==undefined)?prevDay[n].today:0;
      all[t][n]={prev:prev,today:""};
    });
    saveAll(all);
  }else{
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

  setTimeout(scrollToActive,60);
}

function focusField(i){
  if(isLocked()) return;
  if(assets[i]==="BT #1 Fwd"||assets[i]==="Azipull #1 Stbd") return;
  activeIndex=i;
  render();
  setTimeout(scrollToActive,60);
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
  setTimeout(scrollToActive,60);
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

function recalcFrom(date){
  const target=normalizeDateKey(date);
  const all=loadAll();
  const dates=Object.keys(all).map(normalizeDateKey).sort();
  const startIndex=dates.indexOf(target);
  if(startIndex<0){ saveAll(all); return; }

  for(let i=startIndex;i<dates.length;i++){
    const curDate=dates[i];
    const cur=all[curDate];
    const prevDate=i>0?dates[i-1]:null;
    const prev=prevDate?all[prevDate]:null;

    assets.forEach(function(name){
      cur[name]=cur[name]||{prev:0,today:""};
      const prevVal=prev ? (Number(prev[name] && prev[name].today)||0) : 0;
      cur[name].prev=prevVal;
    });

    // preserve manual entries, recompute autos only
    const bt2Today=Number(cur["BT #2 Aft"].today)||0;
    const bt2Prev=Number(cur["BT #2 Aft"].prev)||0;
    const bt1Prev=Number(cur["BT #1 Fwd"].prev)||0;
    cur["BT #1 Fwd"].today = bt1Prev + (bt2Today - bt2Prev);

    const portToday=Number(cur["Azipull #2 Port"].today)||0;
    const portPrev=Number(cur["Azipull #2 Port"].prev)||0;
    const stbdPrev=Number(cur["Azipull #1 Stbd"].prev)||0;
    cur["Azipull #1 Stbd"].today = stbdPrev + (portToday - portPrev);
  }

  saveAll(all);
}

initDay();
document.getElementById("dateTitle").innerText=formatDate(todayKey());
if(isLocked()){
  document.getElementById("modeLabel").innerText="Locked";
}
updateTopLeftButton();
render();
