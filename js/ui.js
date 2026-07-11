/* ---------- LANG PILLS ---------- */

function renderLangPills() {
  const container = document.getElementById("lang-pills");
  container.innerHTML = "";
  state.languages.forEach(lang => {
    const pill = document.createElement("button");
    pill.className = "lang-pill" + (lang === currentLang ? " active" : "");
    pill.textContent = lang;
    pill.onclick = () => { currentLang = lang; renderAll(); };
    container.appendChild(pill);
  });
  ["act-lang","yt-lang","show-lang","movie-lang","filter-lang","tmdb-add-lang"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = state.languages.map(l => `<option value="${l}">${l}</option>`).join("");
    if (prev && state.languages.includes(prev)) el.value = prev;
    else el.value = currentLang;
  });
  renderLangManageList();
}

function renderLangManageList() {
  const el = document.getElementById("lang-manage-list");
  if (!el) return;
  el.innerHTML = state.languages.map((lang, i) => `
    <div class="entry">
      <div class="entry-main"><span class="entry-title">${lang}</span></div>
      <div class="entry-right">
        <button class="danger-link" onclick="removeLang(${i})">eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="empty-state">No hay idiomas añadidos.</div>';
}

window.removeLang = function(i) {
  if (!confirm(`¿Eliminar "${state.languages[i]}"? Esto no borra las sesiones registradas.`)) return;
  const removed = state.languages.splice(i, 1)[0];
  if (currentLang === removed) currentLang = state.languages[0] || "";
  saveState();
  renderAll();
};

/* ---------- ACTIVITY SELECTOR ---------- */

let selectedActivity = null;

function buildActivitySelector() {
  const container = document.getElementById("activity-selector");
  container.innerHTML = "";
  const cats = [...new Set(ACTIVITIES.map(a => a.cat))];
  cats.forEach(cat => {
    const label = document.createElement("div");
    label.className = "activity-cat-label";
    label.textContent = cat;
    container.appendChild(label);
    const grid = document.createElement("div");
    grid.className = "activity-grid";
    ACTIVITIES.filter(a => a.cat === cat).forEach(act => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.dataset.id = act.id;
      card.innerHTML = `<div class="activity-card-name">${act.name}</div><div class="activity-card-desc">${act.desc}</div>`;
      card.onclick = () => selectActivity(act.id);
      grid.appendChild(card);
    });
    container.appendChild(grid);
  });
}

function selectActivity(id) {
  document.querySelectorAll(".activity-card").forEach(c => c.classList.remove("selected"));
  const card = document.querySelector(`.activity-card[data-id="${id}"]`);
  if (card) card.classList.add("selected");
  selectedActivity = id;
  const act = getActivityById(id);
  const panel = document.getElementById("session-panel");
  panel.classList.add("visible");
  document.getElementById("timer-activity-label").textContent = act.name;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeMode("manual");
}

function setTimeMode(mode) {
  const timerTab = document.getElementById("mode-tab-timer");
  const manualTab = document.getElementById("mode-tab-manual");
  const timerWrap = document.getElementById("timer-box-wrap");
  const manualWrap = document.getElementById("manual-box-wrap");
  if (mode === "timer") {
    timerTab.classList.add("active");
    manualTab.classList.remove("active");
    timerWrap.style.display = "block";
    manualWrap.style.display = "none";
  } else {
    manualTab.classList.add("active");
    timerTab.classList.remove("active");
    manualWrap.style.display = "block";
    timerWrap.style.display = "none";
    stopTimer(false);
  }
}

/* ---------- TIMER ---------- */

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let timerPaused = false;

function updateTimerDisplay() {
  document.getElementById("timer-display").textContent = formatTimerDisplay(timerSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerPaused = false;
  timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(); }, 1000);
  document.getElementById("timer-start-btn").innerHTML = `<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> En curso`;
  document.getElementById("timer-start-btn").disabled = true;
  document.getElementById("timer-pause-btn").disabled = false;
  document.getElementById("timer-stop-btn").disabled = false;
}

function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerPaused = true;
  document.getElementById("timer-start-btn").innerHTML = `<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> Reanudar`;
  document.getElementById("timer-start-btn").disabled = false;
  document.getElementById("timer-pause-btn").disabled = true;
}

function stopTimer(save = true) {
  clearInterval(timerInterval);
  timerRunning = false;
  timerPaused = false;
  if (save && timerSeconds > 0 && selectedActivity) {
    saveActivitySession(timerSeconds);
  }
  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById("timer-start-btn").innerHTML = `<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> Iniciar`;
  document.getElementById("timer-start-btn").disabled = false;
  document.getElementById("timer-pause-btn").disabled = true;
  document.getElementById("timer-stop-btn").disabled = true;
}

function saveActivitySession(seconds) {
  const lang = document.getElementById("act-lang").value || currentLang;
  const note = document.getElementById("act-note").value.trim();
  const act = getActivityById(selectedActivity);
  state.sessions.push({
    id: Date.now(),
    activityId: selectedActivity,
    activityName: act ? act.name : selectedActivity,
    cat: act ? act.cat : "Otro",
    lang, note, seconds, ts: Date.now(),
  });
  saveState();
  renderAll();
  setStatus(document.getElementById("act-status"), `✓ Sesión guardada: ${formatHMS(seconds)} de "${act.name}"`, "ok");
  document.getElementById("act-note").value = "";
}

document.getElementById("timer-start-btn").addEventListener("click", startTimer);
document.getElementById("timer-pause-btn").addEventListener("click", pauseTimer);
document.getElementById("timer-stop-btn").addEventListener("click", () => stopTimer(true));
document.getElementById("mode-tab-manual").addEventListener("click", () => setTimeMode("manual"));
document.getElementById("mode-tab-timer").addEventListener("click", () => setTimeMode("timer"));
document.getElementById("manual-save-btn").addEventListener("click", () => {
  const h = parseInt(document.getElementById("manual-h").value) || 0;
  const m = parseInt(document.getElementById("manual-m").value) || 0;
  const s = parseInt(document.getElementById("manual-s").value) || 0;
  const totalSec = h*3600 + m*60 + s;
  if (totalSec <= 0) {
    setStatus(document.getElementById("act-status"), "Introduce al menos un segundo.", "err");
    return;
  }
  saveActivitySession(totalSec);
  document.getElementById("manual-h").value = "";
  document.getElementById("manual-m").value = "";
  document.getElementById("manual-s").value = "";
});

/* ---------- DISPLAY PREFERENCE TOGGLES ---------- */

function getPref(name) {
  return localStorage.getItem(DISPLAY_PREFS[name].key) !== "false";
}
function setPref(name, val) {
  localStorage.setItem(DISPLAY_PREFS[name].key, val);
}

function applyDisplayPrefs() {
  const streakCard = document.getElementById("streak-card");
  if (streakCard) streakCard.style.display = getPref("streak") ? "" : "none";
  const heatmapInner = document.getElementById("heatmap-wrap");
  if (heatmapInner) {
    const heatmapCard = heatmapInner.closest(".stats-card");
    if (heatmapCard) heatmapCard.style.display = getPref("heatmap") ? "" : "none";
  }
  const weeklyChart = document.getElementById("weekly-chart");
  if (weeklyChart) {
    const weeklyCard = weeklyChart.closest(".stats-card");
    if (weeklyCard) weeklyCard.style.display = getPref("weeklyChart") ? "" : "none";
  }
  if (streakCard) {
    const streakGrid = streakCard.parentElement;
    if (streakGrid) {
      [...streakGrid.querySelectorAll(".stats-card.streak-card")].forEach(card => {
        if (card !== streakCard) card.style.display = getPref("bestAvg") ? "" : "none";
      });
    }
  }
  const statsGrids = document.querySelectorAll("#page-stats .stats-grid");
  if (statsGrids[0]) statsGrids[0].style.display = getPref("chartsGrid") ? "" : "none";
  const goalBar = document.getElementById("goal-bar-wrap");
  if (goalBar) goalBar.style.display = getPref("goalBar") ? "" : "none";
  const totals = document.querySelector(".totals");
  if (totals) totals.style.display = getPref("totals") ? "" : "none";
}

function syncToggleStates() {
  Object.entries(TOGGLE_PREF_MAP).forEach(([id, pref]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = getPref(pref);
    if (!el.dataset.prefListenerAttached) {
      el.dataset.prefListenerAttached = "1";
      el.addEventListener("change", e => {
        setPref(pref, e.target.checked);
        applyDisplayPrefs();
      });
    }
  });
}

applyDisplayPrefs();
syncToggleStates();

const origRefreshGoalConfig = refreshGoalConfigUI;
refreshGoalConfigUI = function() {
  origRefreshGoalConfig();
  syncToggleStates();
};

/* ---------- DARK MODE ---------- */

function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  const moon = document.getElementById("theme-icon-moon");
  const sun = document.getElementById("theme-icon-sun");
  if (moon) moon.style.display = dark ? "none" : "block";
  if (sun) sun.style.display = dark ? "block" : "none";
}

const savedDark = localStorage.getItem(DARK_KEY);
const prefersDark = savedDark !== null
  ? savedDark === "true"
  : window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(prefersDark);

document.getElementById("theme-toggle").addEventListener("click", () => {
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem(DARK_KEY, !isDark);
  applyTheme(!isDark);
});
