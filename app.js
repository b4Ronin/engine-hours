(function () {
  const STORAGE_KEY = "engine-hours-v2";
  const ENGINE_NAMES = [
    "Gen 1",
    "Gen 2",
    "Gen 3",
    "Gen 4",
    "FWD BT",
    "AFT BT",
    "Port Azipull",
    "Stbd Azipull"
  ];

  const VIEW = {
    TODAY: "today",
    LOGS: "logs",
    PAST: "past",
    SUMMARY: "summary"
  };

  let appState = null;
  let uiState = {
    view: VIEW.TODAY,
    selectedDate: isoToday(),
    editMode: true,
    activeInputIndex: 0,
    previousView: VIEW.TODAY
  };

  function isoToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function createEmptyState() {
    return { logs: {} };
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatHours(value) {
    const num = safeNumber(value);
    if (num === null) return "0";
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    return String(Number(num.toFixed(2)));
  }

  function formatDelta(prev, end) {
    const delta = (safeNumber(end) ?? 0) - (safeNumber(prev) ?? 0);
    return formatHours(delta);
  }

  function loadState(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.logs) return createEmptyState();
      return parsed;
    } catch (error) {
      return createEmptyState();
    }
  }

  function saveState(storage, state) {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSortedDates(state) {
    return Object.keys(state.logs).sort();
  }

  function getPriorDates(state, date) {
    return getSortedDates(state).filter((d) => d < date);
  }

  function getFutureDates(state, date) {
    return getSortedDates(state).filter((d) => d > date);
  }

  function getPreviousEnd(state, date, engineName) {
    const priorDates = getPriorDates(state, date).reverse();
    for (const priorDate of priorDates) {
      const entry = state.logs[priorDate]?.entries?.[engineName];
      const end = safeNumber(entry?.end);
      if (end !== null) return end;
    }
    return 0;
  }

  function getDayEntriesForDisplay(state, date) {
    const existing = state.logs[date]?.entries || {};
    return ENGINE_NAMES.map((engineName) => {
      const prev = getPreviousEnd(state, date, engineName);
      const savedEnd = safeNumber(existing[engineName]?.end);
      const end = savedEnd === null ? prev : savedEnd;
      return { engineName, prev, end, delta: (end - prev) };
    });
  }

  function finalizeDayData(state, date, enteredEnds) {
    const nextState = deepClone(state);
    const previousEntries = nextState.logs[date]?.entries || {};
    const newEntries = {};
    const diffMap = {};

    ENGINE_NAMES.forEach((engineName) => {
      const prev = getPreviousEnd(nextState, date, engineName);
      const oldEnd = safeNumber(previousEntries[engineName]?.end);
      const normalized = safeNumber(enteredEnds[engineName]);
      const end = normalized === null ? prev : normalized;
      newEntries[engineName] = { end };
      diffMap[engineName] = (oldEnd === null ? end : end - oldEnd);
    });

    nextState.logs[date] = {
      finalized: true,
      updatedAt: new Date().toISOString(),
      entries: newEntries
    };

    const futureDates = getFutureDates(nextState, date);
    futureDates.forEach((futureDate) => {
      const log = nextState.logs[futureDate];
      if (!log || !log.entries) return;
      ENGINE_NAMES.forEach((engineName) => {
        const diff = diffMap[engineName];
        if (!diff) return;
        const oldFutureEnd = safeNumber(log.entries[engineName]?.end);
        if (oldFutureEnd === null) return;
        log.entries[engineName] = { end: oldFutureEnd + diff };
      });
    });

    return nextState;
  }

  function buildSummaryModel(state, date) {
    return {
      date,
      entries: getDayEntriesForDisplay(state, date).map((item) => ({
        engineName: item.engineName,
        prev: formatHours(item.prev),
        end: formatHours(item.end),
        delta: formatHours(item.delta)
      }))
    };
  }

  function getInputValuesFromDom() {
    const values = {};
    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    inputs.forEach((input) => {
      values[input.dataset.engine] = input.value.trim();
    });
    return values;
  }

  function focusInput(index) {
    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    if (!inputs.length) return;
    const bounded = Math.max(0, Math.min(index, inputs.length - 1));
    uiState.activeInputIndex = bounded;
    const input = inputs[bounded];
    input.focus();
    centerInput(input);
  }

  function centerInput(input) {
    const container = document.getElementById("mainContent");
    if (!container || !input) return;
    const keypad = document.getElementById("keypad");
    const keypadHeight = keypad ? keypad.offsetHeight : 0;
    const visibleHeight = Math.max(100, window.innerHeight - keypadHeight - 72);
    const targetTop = Math.max(0, input.offsetTop - ((visibleHeight - input.offsetHeight) / 2) - 24);
    container.scrollTo({ top: targetTop, behavior: "smooth" });
  }

  function renderTodayOrPast() {
    const date = uiState.selectedDate;
    const entries = getDayEntriesForDisplay(appState, date);
    const readonly = !uiState.editMode;
    const main = document.getElementById("mainContent");
    const subtitle = uiState.view === VIEW.PAST
      ? (readonly ? "Saved log" : "Editing saved log")
      : "Current day";

    main.innerHTML = `
      <div class="screen-title">${date}</div>
      <div class="screen-subtitle">${subtitle}</div>
      ${entries.map((item, index) => `
        <section class="engine-card">
          <div class="engine-name">${item.engineName}</div>
          <div class="meta-row">
            <span>Previous: ${formatHours(item.prev)}</span>
            <span class="delta">Δ ${formatHours(item.delta)}</span>
          </div>
          <input
            class="engine-input"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            spellcheck="false"
            data-engine="${item.engineName}"
            data-index="${index}"
            value="${formatHours(item.end)}"
            ${readonly ? "readonly" : ""}
          />
        </section>
      `).join("")}
    `;

    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    inputs.forEach((input) => {
      input.addEventListener("focus", () => {
        uiState.activeInputIndex = Number(input.dataset.index || 0);
        centerInput(input);
      });
      input.addEventListener("click", () => centerInput(input));
    });
  }

  function renderLogs() {
    const dates = getSortedDates(appState).sort().reverse();
    const main = document.getElementById("mainContent");
    if (!dates.length) {
      main.innerHTML = `
        <div class="screen-title">Logs</div>
        <div class="message-card">No saved days yet.</div>
      `;
      return;
    }

    main.innerHTML = `
      <div class="screen-title">Logs</div>
      ${dates.map((date) => {
        const model = buildSummaryModel(appState, date);
        const totalDelta = model.entries.reduce((sum, item) => sum + Number(item.delta), 0);
        return `
          <section class="log-card">
            <button class="log-button" type="button" data-log-date="${date}">${date}</button>
            <div class="log-meta">Total added across all systems: ${formatHours(totalDelta)}</div>
          </section>
        `;
      }).join("")}
    `;

    Array.from(document.querySelectorAll("[data-log-date]")).forEach((button) => {
      button.addEventListener("click", () => {
        uiState.view = VIEW.PAST;
        uiState.previousView = VIEW.LOGS;
        uiState.selectedDate = button.dataset.logDate;
        uiState.editMode = false;
        render();
      });
    });
  }

  function renderSummary() {
    const model = buildSummaryModel(appState, uiState.selectedDate);
    const main = document.getElementById("mainContent");
    main.innerHTML = `
      <div class="screen-title">Summary</div>
      <div class="screen-subtitle">${model.date}</div>
      <section class="summary-card">
        <div class="summary-date">${model.date}</div>
        ${model.entries.map((item) => `
          <div class="summary-line">
            <div>${item.engineName}<br><span class="screen-subtitle">Prev ${item.prev} → End ${item.end}</span></div>
            <div class="summary-value">+${item.delta}</div>
          </div>
        `).join("")}
      </section>
    `;
  }

  function updateButtons() {
    const finalizeBtn = document.getElementById("finalizeBtn");
    const setupBtn = document.getElementById("setupBtn");
    const logsBtn = document.getElementById("logsBtn");

    logsBtn.textContent = "Logs";
    logsBtn.disabled = false;

    if (uiState.view === VIEW.LOGS) {
      finalizeBtn.textContent = "Today";
      setupBtn.textContent = "Summary";
      return;
    }

    if (uiState.view === VIEW.SUMMARY) {
      finalizeBtn.textContent = uiState.previousView === VIEW.PAST ? "Back to Day" : "Back";
      setupBtn.textContent = "Logs";
      return;
    }

    if (uiState.view === VIEW.PAST) {
      finalizeBtn.textContent = uiState.editMode ? "Finalize This Day" : "Today";
      setupBtn.textContent = uiState.editMode ? "Summary" : "Edit This Day";
      return;
    }

    finalizeBtn.textContent = "Finalize Day";
    setupBtn.textContent = "Summary";
  }

  function render() {
    updateButtons();
    if (uiState.view === VIEW.LOGS) {
      renderLogs();
      return;
    }
    if (uiState.view === VIEW.SUMMARY) {
      renderSummary();
      return;
    }
    renderTodayOrPast();
  }

  function goToToday() {
    uiState.view = VIEW.TODAY;
    uiState.selectedDate = isoToday();
    uiState.editMode = true;
    uiState.previousView = VIEW.TODAY;
    render();
  }

  function saveDisplayedDay() {
    const entered = getInputValuesFromDom();
    appState = finalizeDayData(appState, uiState.selectedDate, entered);
    saveState(window.localStorage, appState);
    uiState.editMode = false;
    uiState.previousView = uiState.view;
    uiState.view = VIEW.SUMMARY;
    render();
  }

  function onFinalizePressed() {
    if (uiState.view === VIEW.LOGS) {
      goToToday();
      return;
    }
    if (uiState.view === VIEW.SUMMARY) {
      uiState.view = uiState.previousView;
      uiState.editMode = uiState.view === VIEW.TODAY;
      render();
      return;
    }
    if (uiState.view === VIEW.PAST && !uiState.editMode) {
      goToToday();
      return;
    }
    saveDisplayedDay();
  }

  function onSetupPressed() {
    if (uiState.view === VIEW.LOGS) {
      uiState.previousView = VIEW.LOGS;
      uiState.view = VIEW.SUMMARY;
      render();
      return;
    }
    if (uiState.view === VIEW.SUMMARY) {
      uiState.view = VIEW.LOGS;
      render();
      return;
    }
    if (uiState.view === VIEW.PAST && !uiState.editMode) {
      uiState.editMode = true;
      render();
      return;
    }
    uiState.previousView = uiState.view;
    uiState.view = VIEW.SUMMARY;
    render();
  }

  function onLogsPressed() {
    uiState.previousView = uiState.view;
    uiState.view = VIEW.LOGS;
    render();
  }

  function insertIntoActiveInput(value) {
    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    const input = inputs[uiState.activeInputIndex];
    if (!input || input.readOnly) return;
    if (value === "." && input.value.includes(".")) return;
    input.value = `${input.value}${value}`;
  }

  function backspaceActiveInput() {
    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    const input = inputs[uiState.activeInputIndex];
    if (!input || input.readOnly) return;
    input.value = input.value.slice(0, -1);
  }

  function moveToNextInput() {
    const inputs = Array.from(document.querySelectorAll(".engine-input"));
    if (!inputs.length) return;
    const nextIndex = Math.min(uiState.activeInputIndex + 1, inputs.length - 1);
    focusInput(nextIndex);
  }

  function attachEventHandlers() {
    document.getElementById("finalizeBtn").addEventListener("click", onFinalizePressed);
    document.getElementById("setupBtn").addEventListener("click", onSetupPressed);
    document.getElementById("logsBtn").addEventListener("click", onLogsPressed);
    document.getElementById("enterBtn").addEventListener("click", moveToNextInput);

    Array.from(document.querySelectorAll("#keypad [data-key]"))
      .forEach((button) => button.addEventListener("click", () => insertIntoActiveInput(button.dataset.key)));

    const backButton = document.querySelector("#keypad [data-action='backspace']");
    backButton.addEventListener("click", backspaceActiveInput);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  function initApp() {
    appState = loadState(window.localStorage);
    uiState.selectedDate = isoToday();
    uiState.view = VIEW.TODAY;
    uiState.editMode = true;
    attachEventHandlers();
    render();
    registerServiceWorker();
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.addEventListener("DOMContentLoaded", initApp);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ENGINE_NAMES,
      STORAGE_KEY,
      createEmptyState,
      loadState,
      saveState,
      getSortedDates,
      getPreviousEnd,
      getDayEntriesForDisplay,
      finalizeDayData,
      buildSummaryModel,
      formatHours,
      formatDelta
    };
  }
})();
