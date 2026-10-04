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
  ["act-lang","yt-lang","show-lang","movie-lang","filter-lang"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = state.languages.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
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
      <div class="entry-main"><span class="entry-title">${esc(lang)}</span></div>
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
let editingSessionId = null;

const RECENT_ACTS_KEY = "immersion-recent-acts";
const PINNED_ACTS_KEY = "immersion-pinned-acts";
const LAST_ACTIVITY_KEY = "immersion-last-activity";
const TIMER_KEY = "immersion-timer";
const TIMER_MAX_SECONDS = 8 * 3600;
const SESSION_MAX_SECONDS = 12 * 3600;

function getRecentActs() { try { return JSON.parse(localStorage.getItem(RECENT_ACTS_KEY) || "[]"); } catch (e) { return []; } }
function pushRecentAct(id) {
  if (!id) return;
  try {
    const r = getRecentActs().filter(x => x !== id);
    r.unshift(id);
    localStorage.setItem(RECENT_ACTS_KEY, JSON.stringify(r.slice(0, 5)));
  } catch (e) {}
}
function getPinnedActs() { try { return JSON.parse(localStorage.getItem(PINNED_ACTS_KEY) || "[]"); } catch (e) { return []; } }
function togglePinAct(id) {
  try {
    const p = getPinnedActs();
    const i = p.indexOf(id);
    if (i >= 0) p.splice(i, 1); else p.push(id);
    localStorage.setItem(PINNED_ACTS_KEY, JSON.stringify(p));
  } catch (e) {}
}
function getLastActivity() { try { return JSON.parse(localStorage.getItem(LAST_ACTIVITY_KEY) || "null"); } catch (e) { return null; } }
function rememberLastActivity(id, seconds) {
  if (!id) return;
  try { localStorage.setItem(LAST_ACTIVITY_KEY, JSON.stringify({ id, seconds: seconds || 0, ts: Date.now() })); } catch (e) {}
  pushRecentAct(id);
}

function activityCardEl(act) {
  const pinned = getPinnedActs().includes(act.id);
  const card = document.createElement("div");
  card.className = "activity-card" + (selectedActivity === act.id ? " selected" : "");
  card.dataset.id = act.id;
  card.innerHTML = `<button class="pin-btn${pinned ? " pinned" : ""}" data-pin="${esc(act.id)}" title="${pinned ? "Quitar de fijadas" : "Fijar actividad"}"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="${pinned ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button><div class="activity-card-name">${esc(act.name)}</div><div class="activity-card-desc">${esc(act.desc)}</div>`;
  card.onclick = () => selectActivity(act.id);
  card.querySelector(".pin-btn").onclick = (e) => { e.stopPropagation(); togglePinAct(act.id); buildActivitySelector(); };
  return card;
}

function activitySectionEl(title, acts) {
  const wrap = document.createElement("div");
  const label = document.createElement("div");
  label.className = "activity-cat-label";
  label.textContent = title;
  wrap.appendChild(label);
  const grid = document.createElement("div");
  grid.className = "activity-grid";
  acts.forEach(a => grid.appendChild(activityCardEl(a)));
  wrap.appendChild(grid);
  return wrap;
}

function buildActivitySelector() {
  const container = document.getElementById("activity-selector");
  if (!container) return;
  const searchEl = document.getElementById("activity-search");
  const q = ((searchEl && searchEl.value) || "").trim().toLowerCase();
  container.innerHTML = "";
  const pinned = getPinnedActs().map(getActivityById).filter(Boolean);
  const recent = getRecentActs().map(getActivityById).filter(Boolean).filter(a => !pinned.some(p => p.id === a.id)).slice(0, 5);
  const matches = a => !q || a.name.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
  let any = false;
  if (!q) {
    if (pinned.length) { container.appendChild(activitySectionEl("Fijadas", pinned)); any = true; }
    if (recent.length) { container.appendChild(activitySectionEl("Recientes", recent)); any = true; }
  }
  const cats = [...new Set(ACTIVITIES.map(a => a.cat))];
  cats.forEach(cat => {
    const acts = ACTIVITIES.filter(a => a.cat === cat && matches(a));
    if (!acts.length) return;
    any = true;
    container.appendChild(activitySectionEl(cat, acts));
  });
  if (!any) container.innerHTML = '<div class="empty-state">Sin resultados para esa búsqueda.</div>';
}

function highlightSelectedActivity() {
  document.querySelectorAll(".activity-card").forEach(c => c.classList.toggle("selected", c.dataset.id === selectedActivity));
}

function selectActivity(id) {
  if (editingSessionId) cancelSessionEdit();
  selectedActivity = id;
  highlightSelectedActivity();
  const act = getActivityById(id);
  const panel = document.getElementById("session-panel");
  panel.classList.add("visible");
  document.getElementById("timer-activity-label").textContent = act ? act.name : id;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeMode("manual");
}

let lastTimeMode = "manual";

function setTimeMode(mode) {
  lastTimeMode = mode;
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

function persistTimer() {
  try {
    if (!timerRunning && timerSeconds === 0) { localStorage.removeItem(TIMER_KEY); return; }
    localStorage.setItem(TIMER_KEY, JSON.stringify({ base: timerSeconds, startedAt: timerRunning ? Date.now() : 0, activityId: selectedActivity }));
  } catch (e) {}
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerPaused = false;
  persistTimer();
  timerInterval = setInterval(() => {
    timerSeconds++;
    if (timerSeconds >= TIMER_MAX_SECONDS) {
      stopTimer(true);
      setStatus(document.getElementById("act-status"), "Cronómetro detenido automáticamente a las 8 h.", "err");
      return;
    }
    updateTimerDisplay();
    persistTimer();
  }, 1000);
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
  persistTimer();
  document.getElementById("timer-start-btn").innerHTML = `<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> Reanudar`;
  document.getElementById("timer-start-btn").disabled = false;
  document.getElementById("timer-pause-btn").disabled = true;
}

function stopTimer(save = true) {
  clearInterval(timerInterval);
  timerRunning = false;
  timerPaused = false;
  if (save) {
    if (timerSeconds > 0 && selectedActivity) saveActivitySession(timerSeconds);
    try { localStorage.removeItem(TIMER_KEY); } catch (e) {}
  } else {
    persistTimer();
  }
  timerSeconds = 0;
  updateTimerDisplay();
  document.getElementById("timer-start-btn").innerHTML = `<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> Iniciar`;
  document.getElementById("timer-start-btn").disabled = false;
  document.getElementById("timer-pause-btn").disabled = true;
  document.getElementById("timer-stop-btn").disabled = true;
}

function validateSession(seconds, activityId, excludeId) {
  if (!(seconds > 0)) return "Introduce al menos un segundo.";
  if (seconds > SESSION_MAX_SECONDS && !confirm("Son más de 12 horas en una sesión. ¿Guardar igualmente?")) return "cancel";
  const now = Date.now();
  const dup = state.sessions.find(s => s.id !== excludeId && s.activityId === activityId && Math.abs((s.seconds || 0) - seconds) <= 120 && (now - (s.ts || 0)) < 3600000);
  if (dup && !confirm(`Ya registraste "${dup.activityName}" (${formatHMS(dup.seconds)}) hace poco. ¿Guardar igualmente?`)) return "cancel";
  return null;
}

function pushValidatedSession(opts) {
  const o = opts || {};
  const statusEl = document.getElementById("act-status");
  const err = validateSession(o.seconds, o.activityId, o.excludeId || null);
  if (err) { if (err !== "cancel" && statusEl) setStatus(statusEl, err, "err"); return false; }
  state.sessions.push(makeSession({
    id: o.keepId || undefined,
    activityId: o.activityId, cat: o.cat, lang: o.lang || currentLang,
    note: o.note || "", url: o.url || "", seconds: o.seconds,
    ts: o.keepTs || Date.now(), source: o.source || "manual",
  }));
  rememberLastActivity(o.activityId, o.seconds);
  try { localStorage.removeItem(TIMER_KEY); } catch (e) {}
  saveState();
  renderAll();
  return true;
}

function saveActivitySession(seconds) {
  const lang = document.getElementById("act-lang").value || currentLang;
  const note = document.getElementById("act-note").value.trim();
  const act = getActivityById(selectedActivity);
  const ok = pushValidatedSession({
    activityId: selectedActivity,
    cat: act ? act.cat : "Otro",
    lang, note, seconds,
    source: lastTimeMode === "timer" ? "timer" : "manual",
  });
  if (!ok) return;
  setStatus(document.getElementById("act-status"), `✓ Sesión guardada: ${formatHMS(seconds)} de "${act ? act.name : selectedActivity}"`, "ok");
  document.getElementById("act-note").value = "";
}

function cancelSessionEdit() {
  editingSessionId = null;
  const btn = document.getElementById("manual-save-btn");
  if (btn) btn.textContent = "Guardar sesión";
  ["manual-h", "manual-m", "manual-s", "act-note"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
}

window.editSession = function(idx) {
  const s = state.sessions[idx];
  if (!s) return;
  document.querySelector('.nav-tab[data-page="registro"]').click();
  editingSessionId = s.id;
  selectedActivity = s.activityId;
  buildActivitySelector();
  const panel = document.getElementById("session-panel");
  panel.classList.add("visible");
  const act = getActivityById(s.activityId);
  document.getElementById("timer-activity-label").textContent = (act ? act.name : s.activityName) + " · editando";
  setTimeMode("manual");
  const langSel = document.getElementById("act-lang");
  if (langSel && state.languages.includes(s.lang)) langSel.value = s.lang;
  document.getElementById("act-note").value = s.note || "";
  document.getElementById("manual-h").value = Math.floor(s.seconds / 3600);
  document.getElementById("manual-m").value = Math.floor((s.seconds % 3600) / 60);
  document.getElementById("manual-s").value = s.seconds % 60;
  document.getElementById("manual-save-btn").textContent = "Guardar cambios";
  setStatus(document.getElementById("act-status"), "Editando sesión: se conserva la fecha original. Elige otra actividad para cancelar.", "");
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
};

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
  const statusEl = document.getElementById("act-status");
  if (editingSessionId) {
    const ses = state.sessions.find(x => x.id === editingSessionId);
    if (!ses) { cancelSessionEdit(); return; }
    const lang = document.getElementById("act-lang").value || currentLang;
    const note = document.getElementById("act-note").value.trim();
    const act = getActivityById(selectedActivity);
    const err = validateSession(totalSec, selectedActivity, editingSessionId);
    if (err) { if (err !== "cancel") setStatus(statusEl, err, "err"); return; }
    const updated = makeSession({
      id: ses.id, activityId: selectedActivity, cat: act ? act.cat : ses.cat,
      lang, note, url: ses.url || "", seconds: totalSec, ts: ses.ts, source: ses.source || "manual",
    });
    Object.assign(ses, updated);
    rememberLastActivity(selectedActivity, totalSec);
    saveState();
    renderAll();
    setStatus(statusEl, `✓ Sesión actualizada: ${formatHMS(totalSec)} de "${act ? act.name : selectedActivity}"`, "ok");
    cancelSessionEdit();
    return;
  }
  if (totalSec <= 0) {
    setStatus(statusEl, "Introduce al menos un segundo.", "err");
    return;
  }
  saveActivitySession(totalSec);
  document.getElementById("manual-h").value = "";
  document.getElementById("manual-m").value = "";
  document.getElementById("manual-s").value = "";
});

document.getElementById("activity-search").addEventListener("input", buildActivitySelector);

document.getElementById("quick-register-btn").addEventListener("click", () => {
  const statusEl = document.getElementById("act-status");
  const last = getLastActivity();
  const act = last && getActivityById(last.id);
  if (!act) { setStatus(statusEl, "Aún no hay actividad reciente. Elige una abajo.", "err"); return; }
  const seconds = last.seconds > 0 ? last.seconds : 1500;
  const ok = pushValidatedSession({ activityId: act.id, cat: act.cat, lang: currentLang, note: "", seconds, source: "manual" });
  if (ok) setStatus(statusEl, `✓ Registro rápido: ${formatHMS(seconds)} de "${act.name}"`, "ok");
});

/* ---------- TIMER RECOVERY ---------- */

(function recoverTimer() {
  let t = null;
  try { t = JSON.parse(localStorage.getItem(TIMER_KEY) || "null"); } catch (e) {}
  if (!t || !(t.base > 0 || t.startedAt > 0)) return;
  let secs = t.base || 0;
  if (t.startedAt) secs += Math.floor((Date.now() - t.startedAt) / 1000);
  if (secs <= 0) return;
  if (secs > TIMER_MAX_SECONDS) secs = TIMER_MAX_SECONDS;
  timerSeconds = secs;
  updateTimerDisplay();
  if (t.activityId && getActivityById(t.activityId)) {
    selectedActivity = t.activityId;
    buildActivitySelector();
    const panel = document.getElementById("session-panel");
    if (panel) panel.classList.add("visible");
    document.getElementById("timer-activity-label").textContent = getActivityById(t.activityId).name;
  }
  setStatus(document.getElementById("act-status"), `Timer recuperado (${formatHMS(secs)}). Pulsa Iniciar para continuar.`, "");
})();

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
