let finalized = false;

const finalizeBtn = document.getElementById("finalizeBtn");
const logsBtn = document.getElementById("logsBtn");
const input = document.getElementById("hoursInput");
const summaryDiv = document.getElementById("summary");
const logsDiv = document.getElementById("logs");

finalizeBtn.onclick = () => {
  if (!finalized) {
    const hours = input.value;
    if (!hours) return;

    const today = new Date().toLocaleDateString();

    let logs = JSON.parse(localStorage.getItem("engineLogs")) || [];
    logs.push({ date: today, hours });
    localStorage.setItem("engineLogs", JSON.stringify(logs));

    finalized = true;
    finalizeBtn.innerText = "View Summary";

    showSummary(today, hours);
  } else {
    toggle(summaryDiv);
  }
};

logsBtn.onclick = () => {
  const logs = JSON.parse(localStorage.getItem("engineLogs")) || [];
  logsDiv.innerHTML = "<h3>Logs</h3>";
  logs.forEach(log => {
    logsDiv.innerHTML += `<div class="card">${log.date} — ${log.hours} hrs</div>`;
  });
  toggle(logsDiv);
};

function showSummary(date, hours) {
  summaryDiv.innerHTML = `<h3>Summary</h3><div class="card">${date} — ${hours} hrs</div>`;
  summaryDiv.classList.remove("hidden");
}

function toggle(el) {
  el.classList.toggle("hidden");
}
