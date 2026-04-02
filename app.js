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

const AUTO_SOURCE = {
  "BT #1 Fwd": "BT #2 Aft",
  "Azipull #1 Stbd": "Azipull #2 Port"
};
const AUTO_ASSETS = new Set(Object.keys(AUTO_SOURCE));
const STORAGE_KEY = "engineDataAll";
const SETUP_KEY = "engineSetupDone";

let activeIndex = 0;
let mode = "entry"; // setup | entry | summary | logs | edit
let lastTouch = 0;
let selectedDate = todayKey();

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

function numeric(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(value) {
  const num = numeric(value);
  if (num === null) return "";
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

function getPreviousDateKey(all, currentDate) {
  const current = parseDateKey(currentDate);
  const prior = Object.keys(all).filter(d => parseDateKey(d) < current);
  if (!prior.length) return null;
  return sortDateKeys(prior)[prior.length - 1];
}

function previousDateData(all, currentDate) {
  const prevKey = getPreviousDateKey(all, currentDate);
  return prevKey ? all[prevKey] : null;
}

function blankDayFromPrevious(prevDay) {
  const day = {};
  assets.forEach(name => {
    const prev = prevDay ? numeric(prevDay[name] && prevDay[name].current) : null;
    day[name] = {
      prev: prev === null ? 0 : prev,
      current: "",
      manual: !AUTO_ASSETS.has(name)
    };
  });
  return day;
}

function ensureRecord(date) {
  const all = loadAll();
  if (!all[date]) {
    const prevDay = previousDateData(all, date);
    all[date] = blankDayFromPrevious(prevDay);
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
  selectedDate = t;
  mode = "setup";
  activeIndex = 0;
  render();
  setTimeout(scrollActiveIntoView, 60);
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

function currentEditingDate() {
  return selectedDate || todayKey();
}

function currentDayData() {
  const date = currentEditingDate();
  const all = ensureRecord(date);
  return all[date];
}

function setHeader(dateText, labelText) {
  const title = document.getElementById("dateTitle");
  const label = document.getElementById("modeLabel");
  if (title) title.innerText = dateText;
  if (label) label.innerText = labelText;
}

function isAutoAsset(name) {
  return isSetupDone() && AUTO_ASSETS.has(name);
}

function canEditCurrentMode(name) {
  if (mode === "setup") return true;
  if (mode === "entry" || mode === "edit") return !isAutoAsset(name);
  return false;
}

function focusField(i) {
  if (!(mode === "entry" || mode === "setup" || mode === "edit")) return;
  const name = assets[i];
  if (!canEditCurrentMode(name)) return;
  activeIndex = i;
  render();
  setTimeout(scrollActiveIntoView, 60);
}

function getNextIndex(i) {
  let n = (i + 1) % assets.length;
  while ((mode === "entry" || mode === "edit") && isAutoAsset(assets[n])) {
    n = (n + 1) % assets.length;
  }
  return n;
}

function updateAutoPairs(day) {
  Object.keys(AUTO_SOURCE).forEach(targetName => {
    const sourceName = AUTO_SOURCE[targetName];
    const sourceCurrent = numeric(day[sourceName].current);
    const sourcePrev = numeric(day[sourceName].prev) ?? 0;
    const targetPrev = numeric(day[targetName].prev) ?? 0;

    if (sourceCurrent === null) {
      day[targetName].current = "";
    } else {
      const diff = sourceCurrent - sourcePrev;
      day[targetName].current = targetPrev + diff;
    }
  });
}

function updateValue(name, nextString) {
  const all = ensureRecord(currentEditingDate());
  const day = all[currentEditingDate()];

  if (nextString === "") {
    day[name].current = "";
  } else {
    day[name].current = Number(nextString);
  }

  if (mode === "entry" || mode === "edit") {
    updateAutoPairs(day);
  }

  saveAll(all);
  render();
  setTimeout(scrollActiveIntoView, 60);
}

function press(value) {
  if (!(mode === "entry" || mode === "setup" || mode === "edit")) return;
  const name = assets[activeIndex];
  if (!canEditCurrentMode(name)) return;

  const day = currentDayData();
  let current = day[name].current === "" ? "" : String(day[name].current);
  if (current === "0") current = "";
  if (value === "." && current.includes(".")) return;
  current += String(value);
  updateValue(name, current);
}

function back() {
  if (!(mode === "entry" || mode === "setup" || mode === "edit")) return;
  const name = assets[activeIndex];
  if (!canEditCurrentMode(name)) return;

  const day = currentDayData();
  let current = day[name].current === "" ? "" : String(day[name].current);
  current = current.slice(0, -1);
  updateValue(name, current);
}

function nextField() {
  if (!(mode === "entry" || mode === "setup" || mode === "edit")) return;
  activeIndex = getNextIndex(activeIndex);
  render();
  setTimeout(scrollActiveIntoView, 60);
}

function renderEntryOrSetup() {
  const app = document.getElementById("app");
  const day = currentDayData();
  const date = currentEditingDate();
  const keypad = document.getElementById("keypad");
  const finalizeBtn = document.getElementById("finalizeBtn");
  const setupBtn = document.getElementById("setupBtn");

  const label = mode === "setup" ? "Setup" : (mode === "edit" ? "Edit" : (isLocked(date) ? "Locked" : "Entry"));
  setHeader(date, label);

  if (finalizeBtn) {
    if (mode === "edit") {
      finalizeBtn.innerText = "View Summary";
    } else {
      finalizeBtn.innerText = isLocked(date) ? "View Summary" : "Finalize Day";
    }
  }
  if (setupBtn) {
    if (mode === "edit") setupBtn.innerText = "Finalize This Day";
    else setupBtn.innerText = "Setup";
  }
  if (keypad) keypad.classList.remove("hidden");

  app.innerHTML = "";

  assets.forEach((name, i) => {
    const isAuto = (mode === "entry" || mode === "edit") && isAutoAsset(name);
    const editable = canEditCurrentMode(name);
    const current = day[name].current;
    const prev = numeric(day[name].prev) ?? 0;
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
  selectedDate = date;
  mode = "summary";
  const app = document.getElementById("app");
  const all = loadAll();
  const day = all[date] || {};
  const keypad = document.getElementById("keypad");
  const finalizeBtn = document.getElementById("finalizeBtn");
  const setupBtn = document.getElementById("setupBtn");

  if (keypad) keypad.classList.add("hidden");
  if (finalizeBtn) finalizeBtn.innerText = isLocked(date) ? "View Summary" : "Finalize Day";
  if (setupBtn) setupBtn.innerText = "Edit This Day";
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
  const keypad = document.getElementById("keypad");
  const finalizeBtn = document.getElementById("finalizeBtn");
  const setupBtn = document.getElementById("setupBtn");

  if (keypad) keypad.classList.add("hidden");
  if (finalizeBtn) finalizeBtn.innerText = isLocked(todayKey()) ? "View Summary" : "Finalize Day";
  if (setupBtn) setupBtn.innerText = "Setup";
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

function shiftFutureDaysFrom(date) {
  const all = loadAll();
  const dates = sortDateKeys(Object.keys(all));
  const startIndex = dates.indexOf(date);
  if (startIndex === -1) return;

  for (let i = startIndex + 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currentDate = dates[i];
    const prevDay = all[prevDate];
    const day = all[currentDate];

    assets.forEach(name => {
      const newPrev = numeric(prevDay[name].current) ?? numeric(prevDay[name].prev) ?? 0;
      const oldPrev = numeric(day[name].prev) ?? 0;
      const oldCurrent = numeric(day[name].current);

      day[name].prev = newPrev;

      if (!isAutoAsset(name)) {
        if (oldCurrent === null) {
          day[name].current = "";
        } else {
          const delta = oldCurrent - oldPrev;
          day[name].current = newPrev + delta;
        }
      }
    });

    updateAutoPairs(day);
  }

  saveAll(all);
}

function finalizeCurrentDay() {
  const t = todayKey();
  const all = ensureRecord(t);
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

    saveAll(all);
    setSetupDone();
    setLocked(t, true);
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
  showSummary(t);
}

function startEditSelectedDate() {
  if (!selectedDate) return;
  ensureRecord(selectedDate);
  mode = "edit";
  activeIndex = 0;
  while (isAutoAsset(assets[activeIndex])) {
    activeIndex = getNextIndex(activeIndex);
  }
  render();
  setTimeout(scrollActiveIntoView, 60);
}

function finalizeEditedDate() {
  if (!selectedDate) return;
  const all = ensureRecord(selectedDate);
  const day = all[selectedDate];
  const missingManual = assets.filter(name => !isAutoAsset(name) && day[name].current === "");
  if (missingManual.length) {
    const ok = confirm("Some systems are blank. Finalize anyway?");
    if (!ok) return;
  }

  saveAll(all);
  setLocked(selectedDate, true);
  shiftFutureDaysFrom(selectedDate);
  showSummary(selectedDate);
}

function handleFinalizeButton() {
  if (mode === "edit") {
    showSummary(selectedDate);
    return;
  }

  if (mode === "summary") {
    showSummary(selectedDate);
    return;
  }

  if (mode === "logs") {
    const today = todayKey();
    if (isLocked(today)) showSummary(today);
    else {
      selectedDate = today;
      mode = "entry";
      render();
      setTimeout(scrollActiveIntoView, 60);
    }
    return;
  }

  if (isLocked(todayKey())) {
    showSummary(todayKey());
    return;
  }

  finalizeCurrentDay();
}

function handleSetupButton() {
  if (mode === "summary") {
    startEditSelectedDate();
    return;
  }
  if (mode === "edit") {
    finalizeEditedDate();
    return;
  }
  confirmSetup();
}

function render() {
  if (mode === "summary") return;
  if (mode === "logs") return renderLogs();
  renderEntryOrSetup();
}

function scrollActiveIntoView() {
  const active = document.querySelector(".card.active");
  if (!active) return;
  const keypad = document.getElementById("keypad");
  const keypadHeight = keypad && !keypad.classList.contains("hidden") ? keypad.offsetHeight : 0;
  const rect = active.getBoundingClientRect();
  const currentTop = window.scrollY || document.documentElement.scrollTop || 0;
  const visibleHeight = window.innerHeight - keypadHeight - 18;
  const target = currentTop + rect.top - Math.max(12, (visibleHeight / 2) - (rect.height / 2));

  window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  setTimeout(() => {
    const retryRect = active.getBoundingClientRect();
    const retryTop = (window.scrollY || document.documentElement.scrollTop || 0) + retryRect.top - Math.max(12, (visibleHeight / 2) - (retryRect.height / 2));
    window.scrollTo({ top: Math.max(0, retryTop), behavior: "smooth" });
  }, 180);
}

function registerSW() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function boot() {
  document.getElementById("finalizeBtn").addEventListener("click", handleFinalizeButton);
  document.getElementById("setupBtn").addEventListener("click", handleSetupButton);
  document.getElementById("logsBtn").addEventListener("click", renderLogs);

  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouch <= 300) {
      e.preventDefault();
    }
    lastTouch = now;
  }, { passive: false });

  registerSW();

  if (!isSetupDone()) {
    initializeSetupDay(false);
    return;
  }

  ensureRecord(todayKey());
  selectedDate = todayKey();

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
  setTimeout(scrollActiveIntoView, 60);
}

const TEST_API = {
  assets,
  AUTO_SOURCE,
  sortDateKeys,
  blankDayFromPrevious,
  updateAutoPairs,
  shiftFutureDaysFrom,
  todayKey,
  parseDateKey,
  numeric,
  formatNumber,
  loadAll,
  saveAll,
  ensureRecord,
  setLocked,
  isLocked,
  lockKey,
  setSetupDone,
  isSetupDone,
  getPreviousDateKey,
  previousDateData
};

if (typeof window !== "undefined") {
  window.press = press;
  window.back = back;
  window.nextField = nextField;
  window.__APP_TEST__ = TEST_API;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TEST_API;
}

if (typeof document !== "undefined" && document.getElementById) {
  boot();
}
