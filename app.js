const assets = [
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

const AUTO_ASSETS = new Set(["BT #1 Fwd", "Azipull #1 Stbd"]);
const STORAGE_KEY = "engineDataAll";
const SETUP_KEY = "engineSetupDone";

let activeIndex = 0;
let mode = "entry";
let lastTouch = 0;

function todayKey() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function parseDateKey(key) {
  const parts = key.split("/");
  return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
}

function sortDateKeys(keys) {
  return [...keys].sort((a, b) => parseDateKey(a) - parseDateKey(b));
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined || Number.isNaN(Number(value))) return "";
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : String(num);
}

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (err) {
    return {};
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isSetupDone() {
  return localStorage.getItem(SETUP_KEY) === "1";
}

function setSetupDone() {
  localStorage.setItem(SETUP_KEY, "1");
}

function lockKey(date) {
  return `locked_${date}`;
}

function isLocked(date = todayKey()) {
  return localStorage.getItem(lockKey(date)) === "1";
}

function setLocked(date, value) {
  localStorage.setItem(lockKey(date), value ? "1" : "0");
}

function previousDateData(data, currentDate) {
  const dates = sortDateKeys(Object.keys(data).filter(d => d !== currentDate));
  if (!dates.length) return null;
  return data[dates[dates.length - 1]];
}

function blankDayFromPrevious(prevDay) {
  const day = {};
  assets.forEach(name => {
    const prev = prevDay && prevDay[name] ? Number(prevDay[name].current || 0) : 0;
    day[name] = {
      prev,
      current: "",
      manual: !AUTO_ASSETS.has(name)
    };
  });
  return day;
}

function ensureTodayRecord() {
  const all = loadAll();
  const t = todayKey();

  if (!all[t]) {
    const prevDay = previousDateData(all, t);
    all[t] = blankDayFromPrevious(prevDay);
    all[t]["BT #1 Fwd"].manual = false;
    all[t]["Azipull #1 Stbd"].manual = false;
    saveAll(all);
  }

  return all;
}

function initializeSetupDay(forceReset = false) {
  const t = todayKey();
  const all = forceReset ? {} : loadAll();
  const day = {};
  assets.forEach(name => {
    day[name] = {
      prev: 0,
      current: "",
      manual: true
    };
  });
  all[t] = day;
  saveAll(all);
  setLocked(t, false);
  mode = "setup";
  activeIndex = 0;
  render();
}

function confirmSetup() {
  const hasData = Object.keys(loadAll()).length > 0 || isSetupDone();
  if (hasData) {
    const ok = confirm("Reset all saved data and setup from today's totals?");
    if (!ok) return;
    localStorage.clear();
  }
  initializeSetupDay(true);
}

function currentDayData() {
  const all = ensureTodayRecord();
  return all[todayKey()];
}

function setHeader(dateText, labelText) {
  document.getElementById("dateTitle").innerText = dateText;
  document.getElementById("modeLabel").innerText = labelText;
}

function isAutoAsset(name) {
  return isSetupDone() && AUTO_ASSETS.has(name);
}

function setupCompleteForToday() {
  return mode !== "setup" && isSetupDone();
}

function focusField(i) {
  if (mode !== "entry" && mode !== "setup") return;
  if (isLocked()) return;
  const name = assets[i];
  if (mode === "entry" && isAutoAsset(name)) return;
  activeIndex = i;
  render();
}

function getNextIndex(i) {
  let n = (i + 1) % assets.length;
  while (mode === "entry" && isAutoAsset(assets[n])) {
    n = (n + 1) % assets.length;
  }
  return n;
}

function getEditableForMode(name) {
  if (isLocked()) return false;
  if (mode === "setup") return true;
  if (mode === "entry" && isAutoAsset(name)) return false;
  return mode === "entry";
}

function updateAutoPairs(day) {
  const bt2Current = Number(day["BT #2 Aft"].current);
  const bt2Prev = Number(day["BT #2 Aft"].prev || 0);
  const bt1Prev = Number(day["BT #1 Fwd"].prev || 0);

  if (Number.isFinite(bt2Current)) {
    const btDiff = bt2Current - bt2Prev;
    day["BT #1 Fwd"].current = bt1Prev + btDiff;
  } else {
    day["BT #1 Fwd"].current = "";
  }

  const az2Current = Number(day["Azipull #2 Port"].current);
  const az2Prev = Number(day["Azipull #2 Port"].prev || 0);
  const az1Prev = Number(day["Azipull #1 Stbd"].prev || 0);

  if (Number.isFinite(az2Current)) {
    const azDiff = az2Current - az2Prev;
    day["Azipull #1 Stbd"].current = az1Prev + azDiff;
  } else {
    day["Azipull #1 Stbd"].current = "";
  }
}

function updateValue(name, nextString) {
  const all = ensureTodayRecord();
  const t = todayKey();
  const day = all[t];

  if (nextString === "") {
    day[name].current = "";
  } else {
    day[name].current = Number(nextString);
  }

  if (mode === "entry") {
    updateAutoPairs(day);
  }

  saveAll(all);
  render();
}

function press(value) {
  if (mode !== "entry" && mode !== "setup") return;
  const name = assets[activeIndex];
  if (!getEditableForMode(name)) return;

  const day = currentDayData();
  let current = day[name].current === "" ? "" : String(day[name].current);
  if (current === "0") current = "";
  if (value === "." && current.includes(".")) return;
  current += String(value);
  updateValue(name, current);
}

function back() {
  if (mode !== "entry" && mode !== "setup") return;
  const name = assets[activeIndex];
  if (!getEditableForMode(name)) return;

  const day = currentDayData();
  let current = day[name].current === "" ? "" : String(day[name].current);
  current = current.slice(0, -1);
  updateValue(name, current);
}

function nextField() {
  if (mode !== "entry" && mode !== "setup") return;
  if (isLocked()) return;
  activeIndex = getNextIndex(activeIndex);
  render();
}

function renderEntryOrSetup() {
  const app = document.getElementById("app");
  const day = currentDayData();
  const locked = isLocked();

  setHeader(todayKey(), mode === "setup" ? "Setup" : (locked ? "Locked" : "Entry"));
  document.getElementById("finalizeBtn").innerText = locked ? "View Summary" : "Finalize Day";
  document.getElementById("keypad").classList.toggle("hidden", locked);

  app.innerHTML = "";

  assets.forEach((name, i) => {
    const isAuto = mode === "entry" && isAutoAsset(name);
    const editable = getEditableForMode(name);
    const current = day[name].current;
    const prev = Number(day[name].prev || 0);
    const subtitle = mode === "setup"
      ? "Enter current total hours"
      : (isAuto ? "AUTO from paired unit difference" : `Prev: ${formatNumber(prev)}`);

    const div = document.createElement("div");
    div.className = "card" +
      ((i === activeIndex && editable) ? " active" : "") +
      (isAuto ? " auto" : "");

    div.innerHTML = `
      <div class="rowline">
        <div class="labelWrap">
          <div class="asset-title">${name}</div>
          <div class="asset-sub">${subtitle}</div>
        </div>
        <input
          class="reading"
          readonly
          value="${formatNumber(current)}"
          ${editable ? "" : "disabled"}
        >
      </div>
    `;

    div.querySelector("input").addEventListener("click", () => focusField(i));
    div.addEventListener("click", () => focusField(i));
    app.appendChild(div);
  });
}

function summaryValueForAsset(day, name) {
  if (!day || !day[name]) return "";
  if (day[name].current === "" || day[name].current === null || day[name].current === undefined) {
    return formatNumber(day[name].prev || 0);
  }
  return formatNumber(day[name].current);
}

function showSummary(date) {
  mode = "summary";
  const app = document.getElementById("app");
  const all = loadAll();
  const day = all[date] || {};

  document.getElementById("keypad").classList.add("hidden");
  document.getElementById("finalizeBtn").innerText = isLocked(date) ? "View Summary" : "Finalize Day";
  setHeader(date, "Summary");

  app.innerHTML = `<div class="summaryHeader">Summary — ${date}</div>`;
  assets.forEach(name => {
    app.innerHTML += `
      <div class="card">
        <div class="rowline">
          <div class="asset-title">${name}</div>
          <div class="summaryValue">${summaryValueForAsset(day, name)}</div>
        </div>
      </div>
    `;
  });
}

function renderLogs() {
  mode = "logs";
  const app = document.getElementById("app");
  const all = loadAll();
  const dates = sortDateKeys(Object.keys(all)).reverse();

  document.getElementById("keypad").classList.add("hidden");
  setHeader(todayKey(), "Logs");

  app.innerHTML = "";
  if (!dates.length) {
    app.innerHTML = '<div class="card"><div class="asset-title">No saved logs yet</div></div>';
    return;
  }

  dates.forEach(date => {
    const button = document.createElement("button");
    button.className = "logButton";
    button.type = "button";
    button.textContent = date;
    button.addEventListener("click", () => showSummary(date));
    app.appendChild(button);
  });
}

function finalizeOrSummary() {
  const t = todayKey();

  if (isLocked(t)) {
    showSummary(t);
    return;
  }

  const all = ensureTodayRecord();
  const day = all[t];

  if (mode === "setup") {
    const missing = assets.filter(name => day[name].current === "");
    if (missing.length) {
      alert("Enter current total hours for every system before finishing setup.");
      return;
    }

    assets.forEach(name => {
      day[name].prev = Number(day[name].current || 0);
      day[name].manual = !AUTO_ASSETS.has(name);
    });

    day["BT #1 Fwd"].manual = false;
    day["Azipull #1 Stbd"].manual = false;

    saveAll(all);
    setSetupDone();
    mode = "entry";
    setLocked(t, true);
    document.getElementById("finalizeBtn").innerText = "View Summary";
    showSummary(t);
    return;
  }

  const missingManual = assets.filter(name => !isAutoAsset(name) && day[name].current === "");
  if (missingManual.length) {
    const ok = confirm("Some systems are blank. Finalize anyway?");
    if (!ok) return;
  }

  saveAll(all);
  setLocked(t, true);
  document.getElementById("finalizeBtn").innerText = "View Summary";
  showSummary(t);
}

function render() {
  if (mode === "summary") return;
  if (mode === "logs") return renderLogs();
  renderEntryOrSetup();
}

function boot() {
  document.getElementById("finalizeBtn").addEventListener("click", finalizeOrSummary);
  document.getElementById("setupBtn").addEventListener("click", confirmSetup);
  document.getElementById("logsBtn").addEventListener("click", renderLogs);

  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouch <= 300) {
      e.preventDefault();
    }
    lastTouch = now;
  }, { passive: false });

  if (!isSetupDone()) {
    initializeSetupDay(false);
    return;
  }

  ensureTodayRecord();

  if (isLocked(todayKey())) {
    showSummary(todayKey());
    return;
  }

  mode = "entry";
  activeIndex = 0;
  while (isAutoAsset(assets[activeIndex])) {
    activeIndex = getNextIndex(activeIndex);
  }
  render();
}

window.press = press;
window.back = back;
window.nextField = nextField;

boot();
