// ============================================================
// Estado global
// ============================================================
let selectedActivityId = null;
let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let charts = {}; // referencias a instancias de Chart.js

// ============================================================
// Utilidades de almacenamiento
// ============================================================
function getSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getKnownLangs() {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addKnownLang(lang) {
  const langs = getKnownLangs();
  const normalized = lang.trim();
  if (normalized && !langs.some(l => l.toLowerCase() === normalized.toLowerCase())) {
    langs.push(normalized);
    localStorage.setItem(LANG_KEY, JSON.stringify(langs));
  }
}

function addSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
  addKnownLang(session.lang);
}

function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  saveSessions(sessions);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function minutesToHM(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ============================================================
// Navegación
// ============================================================
function goTo(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("page-" + pageId).classList.add("active");
  document.querySelector(`.nav-item[data-page="${pageId}"]`).classList.add("active");

  if (pageId === "dashboard") renderDashboard();
  if (pageId === "stats") renderStats();
  if (pageId === "history") renderHistory();
  if (pageId === "log") renderLogPage();
  if (pageId === "activities") renderActivitiesGuide();
  if (pageId === "settings") renderSettings();
}

document.getElementById("nav").addEventListener("click", e => {
  const btn = e.target.closest(".nav-item");
  if (btn) goTo(btn.dataset.page);
});

// ============================================================
// Página: Registrar sesión
// ============================================================
function renderLogPage() {
  const picker = document.getElementById("activity-picker");
  picker.innerHTML = "";

  ACTIVITY_CATEGORIES.forEach(cat => {
    const label = document.createElement("div");
    label.className = "category-label";
    label.textContent = cat.label;
    picker.appendChild(label);

    cat.activities.forEach(act => {
      const card = document.createElement("button");
      card.className = "activity-card";
      card.type = "button";
      card.dataset.id = act.id;
      if (act.id === selectedActivityId) card.classList.add("selected");

      const tagText = act.timeMode === "content" ? "Duración del contenido" : "Tiempo manual";
      const tagClass = act.timeMode === "content" ? "" : "manual";

      card.innerHTML = `
        <span class="a-name">${act.name}</span>
        <span class="a-desc">${act.desc}</span>
        <span class="a-tag ${tagClass}">${tagText}</span>
      `;
      card.addEventListener("click", () => selectActivity(act.id));
      picker.appendChild(card);
    });
  });

  // fecha por defecto = hoy
  const dateInput = document.getElementById("f-date");
  if (!dateInput.value) dateInput.value = todayStr();

  // sugerencias de idioma
  const datalist = document.getElementById("lang-suggestions");
  datalist.innerHTML = "";
  getKnownLangs().forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    datalist.appendChild(opt);
  });

  renderTimeCard();
  updateSelectionSummary();
}

function selectActivity(id) {
  selectedActivityId = id;
  document.querySelectorAll(".activity-card").forEach(c => {
    c.classList.toggle("selected", c.dataset.id === id);
  });
  resetTimer();
  renderTimeCard();
  updateSelectionSummary();
}

function updateSelectionSummary() {
  const el = document.getElementById("selection-summary");
  if (!selectedActivityId) {
    el.textContent = "Selecciona una actividad para empezar.";
  } else {
    const act = ACTIVITY_MAP[selectedActivityId];
    el.textContent = `Actividad seleccionada: ${act.name}`;
  }
}

function renderTimeCard() {
  const content = document.getElementById("time-mode-content");
  const titleEl = document.querySelector("#time-card h3");

  if (!selectedActivityId) {
    titleEl.textContent = "3 · Tiempo";
    content.innerHTML = `<p class="muted">Elige primero una actividad para ver cómo registrar el tiempo.</p>`;
    return;
  }

  const act = ACTIVITY_MAP[selectedActivityId];

  if (act.timeMode === "content") {
    titleEl.textContent = "3 · Duración del contenido";
    content.innerHTML = `
      <p class="muted" style="margin-bottom:14px;">Esta actividad es de consumo continuo: tu tiempo de inmersión es la duración del audio/vídeo. Introdúcelo a mano o calcúlalo automáticamente desde YouTube o TMDB.</p>
      <div class="content-tabs">
        <button class="content-tab active" data-tab="manual">Manual</button>
        <button class="content-tab" data-tab="youtube">YouTube</button>
        <button class="content-tab" data-tab="show">Serie / anime</button>
        <button class="content-tab" data-tab="movie">Película</button>
      </div>
      <div id="content-tab-body"></div>
      <div class="field" style="margin-top:14px; margin-bottom:0;">
        <label for="f-content-minutes">Minutos totales</label>
        <input id="f-content-minutes" type="number" min="0" step="1" placeholder="ej. 25">
      </div>
    `;
    document.querySelectorAll(".content-tab").forEach(tab => {
      tab.addEventListener("click", () => switchContentTab(tab.dataset.tab));
    });
    switchContentTab("manual");
  } else {
    titleEl.textContent = "3 · Cronómetro / tiempo manual";
    content.innerHTML = `
      <p class="muted" style="margin-bottom:6px;">Esta actividad implica pausas o interacción, así que tu tiempo total será mayor que la duración del contenido. Usa el cronómetro o introduce el tiempo a mano.</p>
      <div class="timer-display" id="timer-display">00:00:00</div>
      <div class="timer-controls">
        <button class="btn btn-primary" id="timer-toggle">Iniciar</button>
        <button class="btn" id="timer-reset">Reiniciar</button>
      </div>
      <div class="field" style="margin-top:18px; margin-bottom:0;">
        <label for="f-manual-minutes">Minutos (manual)</label>
        <input id="f-manual-minutes" type="number" min="0" step="1" placeholder="Se rellena con el cronómetro, o edítalo a mano">
      </div>
    `;
    document.getElementById("timer-toggle").addEventListener("click", toggleTimer);
    document.getElementById("timer-reset").addEventListener("click", resetTimer);
    updateTimerDisplay();
  }
}

// ----- Pestañas de cálculo de duración para actividades "content" -----
function switchContentTab(tab) {
  document.querySelectorAll(".content-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  const body = document.getElementById("content-tab-body");

  if (tab === "manual") {
    body.innerHTML = `<p class="muted">Escribe directamente los minutos totales abajo.</p>`;
    return;
  }

  if (tab === "youtube") {
    if (!getYtKey()) {
      body.innerHTML = apiWarningHTML("yt");
      return;
    }
    body.innerHTML = `
      <div class="field">
        <label for="yt-input">Enlace de YouTube</label>
        <input type="text" id="yt-input" placeholder="https://www.youtube.com/watch?v=...">
      </div>
      <button class="btn btn-sm" id="yt-fetch-btn">Calcular duración</button>
      <p class="status-line" id="yt-fetch-status"></p>
      <div id="yt-fetch-result"></div>
    `;
    document.getElementById("yt-fetch-btn").addEventListener("click", handleYtFetch);
    document.getElementById("yt-input").addEventListener("keydown", e => {
      if (e.key === "Enter") handleYtFetch();
    });
    return;
  }

  if (tab === "show") {
    if (!getTmdbKey()) {
      body.innerHTML = apiWarningHTML("tmdb");
      return;
    }
    body.innerHTML = `
      <div class="field">
        <label for="show-search-input">Buscar serie o anime</label>
        <input type="text" id="show-search-input" placeholder="ej. Attack on Titan">
      </div>
      <button class="btn btn-sm" id="show-search-btn-tab">Buscar en TMDB</button>
      <p class="status-line" id="show-search-status"></p>
      <div id="show-search-results"></div>
      <div id="show-episode-picker"></div>
    `;
    document.getElementById("show-search-btn-tab").addEventListener("click", handleShowSearch);
    document.getElementById("show-search-input").addEventListener("keydown", e => {
      if (e.key === "Enter") handleShowSearch();
    });
    return;
  }

  if (tab === "movie") {
    if (!getTmdbKey()) {
      body.innerHTML = apiWarningHTML("tmdb");
      return;
    }
    body.innerHTML = `
      <div class="field">
        <label for="movie-search-input">Buscar película</label>
        <input type="text" id="movie-search-input" placeholder="ej. Your Name">
      </div>
      <button class="btn btn-sm" id="movie-search-btn-tab">Buscar en TMDB</button>
      <p class="status-line" id="movie-search-status"></p>
      <div id="movie-search-results"></div>
    `;
    document.getElementById("movie-search-btn-tab").addEventListener("click", handleMovieSearch);
    document.getElementById("movie-search-input").addEventListener("keydown", e => {
      if (e.key === "Enter") handleMovieSearch();
    });
    return;
  }
}

function apiWarningHTML(kind) {
  if (kind === "yt") {
    return `<div class="api-warning">No tienes una API key de YouTube configurada. Ve a <strong>Ajustes</strong> para añadirla, o introduce los minutos manualmente.</div>`;
  }
  return `<div class="api-warning">No tienes una API key de TMDB configurada. Ve a <strong>Ajustes</strong> para añadirla, o introduce los minutos manualmente.</div>`;
}

function setContentMinutes(minutes) {
  const input = document.getElementById("f-content-minutes");
  if (input) input.value = Math.round(minutes * 100) / 100;
}

// ----- YouTube -----
async function handleYtFetch() {
  const input = document.getElementById("yt-input");
  const statusEl = document.getElementById("yt-fetch-status");
  const resultEl = document.getElementById("yt-fetch-result");
  const url = input.value.trim();
  if (!url) return;

  const id = extractVideoId(url);
  if (!id) {
    statusEl.textContent = "No se reconoció un enlace válido de YouTube.";
    statusEl.className = "status-line err";
    return;
  }

  statusEl.textContent = "Calculando duración...";
  statusEl.className = "status-line pending";

  try {
    const details = await fetchVideoDetails([id]);
    if (details.length === 0) {
      statusEl.textContent = "La API no devolvió resultados. Revisa el enlace.";
      statusEl.className = "status-line err";
      return;
    }
    const video = details[0];
    const minutes = video.seconds / 60;
    setContentMinutes(minutes);
    statusEl.textContent = "";
    resultEl.innerHTML = `
      <div class="fetched-item">
        <span class="f-title">${escapeHTML(video.title)}</span>
        <span class="f-time">${minutesToHM(minutes)}</span>
      </div>
    `;
  } catch (err) {
    if (err.message === "NO_API_KEY") {
      statusEl.textContent = "Falta la API key de YouTube.";
    } else if (err.message === "keyInvalid" || err.message === "badRequest") {
      statusEl.textContent = "La API key no es válida. Revísala en Ajustes.";
    } else if (err.message === "quotaExceeded") {
      statusEl.textContent = "Se agotó la cuota diaria de la API de YouTube.";
    } else {
      statusEl.textContent = `Error: ${err.message}`;
    }
    statusEl.className = "status-line err";
  }
}

// ----- Series / animes (TMDB) -----
async function handleShowSearch() {
  const input = document.getElementById("show-search-input");
  const statusEl = document.getElementById("show-search-status");
  const resultsEl = document.getElementById("show-search-results");
  const pickerEl = document.getElementById("show-episode-picker");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  pickerEl.innerHTML = "";
  if (!query) return;

  statusEl.textContent = `Buscando "${query}" en TMDB...`;
  statusEl.className = "status-line pending";

  try {
    const results = await searchTmdbShows(query);
    if (results.length === 0) {
      statusEl.textContent = "No se encontraron resultados.";
      statusEl.className = "status-line err";
      return;
    }
    statusEl.textContent = `${results.length} resultado(s):`;
    statusEl.className = "status-line ok";
    resultsEl.innerHTML = results.map(r => `
      <div class="search-result">
        <div class="r-main">
          <span class="r-title">${escapeHTML(r.name)}${r.original_name && r.original_name !== r.name ? ` (${escapeHTML(r.original_name)})` : ""}</span>
          <span class="r-sub">${r.first_air_date ? r.first_air_date.slice(0, 4) : "sin fecha"}</span>
        </div>
        <button class="btn btn-sm" data-show-id="${r.id}" data-show-name="${escapeHTML(r.name)}">Elegir</button>
      </div>
    `).join("");
    resultsEl.querySelectorAll("[data-show-id]").forEach(btn => {
      btn.addEventListener("click", () => handleShowSelect(btn.dataset.showId, btn.dataset.showName));
    });
  } catch (err) {
    handleTmdbError(err, statusEl);
  }
}

async function handleShowSelect(tvId, name) {
  const statusEl = document.getElementById("show-search-status");
  const pickerEl = document.getElementById("show-episode-picker");
  statusEl.textContent = `Obteniendo duración de episodios de "${name}"...`;
  statusEl.className = "status-line pending";

  try {
    const details = await getTmdbShowDetails(tvId);
    const runtimes = details.episode_run_time || [];
    let epDuration = runtimes.length > 0
      ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
      : 24;

    statusEl.textContent = `"${details.name}" · ${epDuration} min/episodio`;
    statusEl.className = "status-line ok";

    pickerEl.innerHTML = `
      <div class="episode-row">
        <span>Episodios vistos en esta sesión</span>
        <input type="number" id="ep-count-input" min="0" step="1" value="1">
        <span class="e-total" id="ep-total-display">${minutesToHM(epDuration)}</span>
      </div>
      <button class="btn btn-sm section-gap" id="ep-use-btn" style="margin-top:10px;">Usar este tiempo</button>
    `;

    const epInput = document.getElementById("ep-count-input");
    const totalDisplay = document.getElementById("ep-total-display");
    const updateTotal = () => {
      const n = Math.max(0, parseInt(epInput.value, 10) || 0);
      totalDisplay.textContent = minutesToHM(epDuration * n);
    };
    epInput.addEventListener("input", updateTotal);

    document.getElementById("ep-use-btn").addEventListener("click", () => {
      const n = Math.max(0, parseInt(epInput.value, 10) || 0);
      setContentMinutes(epDuration * n);
      showToast(`Tiempo establecido: ${minutesToHM(epDuration * n)}`);
    });
  } catch (err) {
    handleTmdbError(err, statusEl);
  }
}

// ----- Películas (TMDB) -----
async function handleMovieSearch() {
  const input = document.getElementById("movie-search-input");
  const statusEl = document.getElementById("movie-search-status");
  const resultsEl = document.getElementById("movie-search-results");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  if (!query) return;

  statusEl.textContent = `Buscando "${query}" en TMDB...`;
  statusEl.className = "status-line pending";

  try {
    const results = await searchTmdbMovies(query);
    if (results.length === 0) {
      statusEl.textContent = "No se encontraron resultados.";
      statusEl.className = "status-line err";
      return;
    }
    statusEl.textContent = `${results.length} resultado(s):`;
    statusEl.className = "status-line ok";
    resultsEl.innerHTML = results.map(r => `
      <div class="search-result">
        <div class="r-main">
          <span class="r-title">${escapeHTML(r.title)}${r.original_title && r.original_title !== r.title ? ` (${escapeHTML(r.original_title)})` : ""}</span>
          <span class="r-sub">${r.release_date ? r.release_date.slice(0, 4) : "sin fecha"}</span>
        </div>
        <button class="btn btn-sm" data-movie-id="${r.id}">Elegir</button>
      </div>
    `).join("");
    resultsEl.querySelectorAll("[data-movie-id]").forEach(btn => {
      btn.addEventListener("click", () => handleMovieSelect(btn.dataset.movieId));
    });
  } catch (err) {
    handleTmdbError(err, statusEl);
  }
}

async function handleMovieSelect(movieId) {
  const statusEl = document.getElementById("movie-search-status");
  const resultsEl = document.getElementById("movie-search-results");
  statusEl.textContent = "Obteniendo duración...";
  statusEl.className = "status-line pending";

  try {
    const details = await getTmdbMovieDetails(movieId);
    const runtime = details.runtime || 0;
    if (runtime <= 0) {
      statusEl.textContent = `TMDB no tiene la duración de "${details.title}".`;
      statusEl.className = "status-line err";
      return;
    }
    setContentMinutes(runtime);
    statusEl.textContent = "";
    resultsEl.innerHTML = `
      <div class="fetched-item">
        <span class="f-title">${escapeHTML(details.title)}</span>
        <span class="f-time">${minutesToHM(runtime)}</span>
      </div>
    `;
    showToast(`Tiempo establecido: ${minutesToHM(runtime)}`);
  } catch (err) {
    handleTmdbError(err, statusEl);
  }
}

function handleTmdbError(err, statusEl) {
  if (err.message === "NO_TMDB_KEY") {
    statusEl.textContent = "Falta la API key de TMDB. Configúrala en Ajustes.";
  } else {
    statusEl.textContent = `Error al consultar TMDB: ${err.message}`;
  }
  statusEl.className = "status-line err";
}

// ----- Cronómetro -----
function toggleTimer() {
  const btn = document.getElementById("timer-toggle");
  if (!timerRunning) {
    timerRunning = true;
    btn.textContent = "Pausar";
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
      const manualInput = document.getElementById("f-manual-minutes");
      if (manualInput) manualInput.value = Math.round(timerSeconds / 60 * 100) / 100;
    }, 1000);
  } else {
    timerRunning = false;
    btn.textContent = "Reanudar";
    clearInterval(timerInterval);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 0;
  updateTimerDisplay();
  const btn = document.getElementById("timer-toggle");
  if (btn) btn.textContent = "Iniciar";
  const manualInput = document.getElementById("f-manual-minutes");
  if (manualInput) manualInput.value = "";
}

function updateTimerDisplay() {
  const display = document.getElementById("timer-display");
  if (!display) return;
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;
  display.textContent = [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

// ----- Guardar sesión -----
document.getElementById("save-session-btn").addEventListener("click", () => {
  if (!selectedActivityId) {
    showToast("Elige una actividad primero");
    return;
  }
  const lang = document.getElementById("f-lang").value.trim();
  if (!lang) {
    showToast("Introduce el idioma");
    return;
  }
  const date = document.getElementById("f-date").value || todayStr();
  const notes = document.getElementById("f-notes").value.trim();
  const act = ACTIVITY_MAP[selectedActivityId];

  let minutes = 0;
  if (act.timeMode === "content") {
    minutes = parseFloat(document.getElementById("f-content-minutes").value);
  } else {
    minutes = parseFloat(document.getElementById("f-manual-minutes").value);
  }

  if (!minutes || minutes <= 0) {
    showToast("Introduce un tiempo válido");
    return;
  }

  const session = {
    id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    activityId: act.id,
    activityName: act.name,
    category: act.category,
    categoryLabel: act.categoryLabel,
    timeMode: act.timeMode,
    lang,
    date,
    minutes: Math.round(minutes * 100) / 100,
    notes
  };

  addSession(session);
  showToast(`Sesión guardada · ${minutesToHM(session.minutes)} de ${act.name}`);

  // reset form
  selectedActivityId = null;
  document.getElementById("f-notes").value = "";
  resetTimer();
  renderLogPage();
});

// ============================================================
// Dashboard
// ============================================================
function renderDashboard() {
  const sessions = getSessions();
  const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const langs = new Set(sessions.map(s => s.lang.toLowerCase()));

  // racha de días (días consecutivos hasta hoy con al menos una sesión)
  const daysSet = new Set(sessions.map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (daysSet.has(ds)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // esta semana
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  const weekMinutes = sessions
    .filter(s => new Date(s.date + "T00:00:00") >= new Date(weekAgo.toISOString().slice(0,10) + "T00:00:00"))
    .reduce((sum, s) => sum + s.minutes, 0);

  const statsEl = document.getElementById("dashboard-stats");
  statsEl.innerHTML = `
    <div class="card stat-card accent">
      <span class="stat-value">${minutesToHM(total)}</span>
      <span class="stat-label">Tiempo total de inmersión</span>
    </div>
    <div class="card stat-card teal">
      <span class="stat-value">${minutesToHM(weekMinutes)}</span>
      <span class="stat-label">Últimos 7 días</span>
    </div>
    <div class="card stat-card gold">
      <span class="stat-value">${streak} ${streak === 1 ? "día" : "días"}</span>
      <span class="stat-label">Racha actual</span>
    </div>
    <div class="card stat-card">
      <span class="stat-value">${langs.size}</span>
      <span class="stat-label">Idiomas en seguimiento</span>
    </div>
  `;

  renderHeatmap(sessions);
  renderSkillDonut(sessions);
  renderRecentSessions(sessions);
}

function renderRecentSessions(sessions) {
  const el = document.getElementById("recent-sessions");
  if (sessions.length === 0) {
    el.innerHTML = emptyState("📓", "Aún no hay sesiones", "Registra tu primera sesión de inmersión para empezar a ver tus estadísticas aquí.");
    return;
  }
  const sorted = [...sessions].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 6);
  el.innerHTML = sorted.map(sessionRowHTML).join("");
  attachDeleteHandlers(el, () => { renderDashboard(); });
}

function emptyState(icon, title, text) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon}</div>
      <h4>${title}</h4>
      <p>${text}</p>
    </div>
  `;
}

function sessionRowHTML(s) {
  return `
    <div class="session-row" data-id="${s.id}">
      <span class="s-date">${formatDate(s.date)}</span>
      <span class="s-activity">${s.activityName}${s.notes ? `<small>${escapeHTML(s.notes)}</small>` : ""}</span>
      <span class="s-lang">${escapeHTML(s.lang)}</span>
      <span class="s-time">${minutesToHM(s.minutes)}</span>
      <button class="btn-ghost s-del" data-del="${s.id}" title="Eliminar" style="font-size:16px; line-height:1;">×</button>
    </div>
  `;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function attachDeleteHandlers(container, onDelete) {
  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteSession(btn.dataset.del);
      showToast("Sesión eliminada");
      onDelete();
    });
  });
}

// ----- Heatmap -----
function renderHeatmap(sessions) {
  const heatmap = document.getElementById("heatmap");
  heatmap.innerHTML = "";

  const minutesByDay = {};
  sessions.forEach(s => {
    minutesByDay[s.date] = (minutesByDay[s.date] || 0) + s.minutes;
  });

  const days = 53 * 7; // ~8 semanas mostradas pero generamos grid completo de 53 columnas x 7 filas
  // Para simplificar: generamos columnas de semanas, cada una con 7 celdas (días)
  const today = new Date();
  today.setHours(0,0,0,0);

  // Empezamos en domingo de la semana de (hoy - 7*8 semanas)
  const totalWeeks = 16; // ~4 meses, recortamos visualmente vía CSS si hace falta
  const start = new Date(today);
  start.setDate(start.getDate() - (totalWeeks * 7 - 1));
  // ajustar al domingo
  start.setDate(start.getDate() - start.getDay());

  heatmap.style.gridTemplateColumns = `repeat(${totalWeeks}, 1fr)`;

  // Para que el grid se rellene columna a columna (semana a semana), generamos celdas en orden fila por fila
  // pero con grid-auto-flow column es más simple
  heatmap.style.gridAutoFlow = "column";
  heatmap.style.gridTemplateRows = "repeat(7, 1fr)";

  let max = 1;
  Object.values(minutesByDay).forEach(v => { if (v > max) max = v; });

  for (let i = 0; i < totalWeeks * 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const mins = minutesByDay[ds] || 0;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.title = `${formatDate(ds)} · ${minutesToHM(mins)}`;
    if (d > today) {
      cell.style.opacity = "0.25";
    } else if (mins > 0) {
      const ratio = Math.min(mins / max, 1);
      cell.style.background = heatColor(ratio);
      cell.style.borderColor = "transparent";
    }
    heatmap.appendChild(cell);
  }
}

function heatColor(ratio) {
  // interpola entre surface (apagado) y teal
  if (ratio < 0.25) return "#2c4a47";
  if (ratio < 0.5) return "#3a6a63";
  if (ratio < 0.75) return "#48948a";
  return "#5eead4";
}

// ----- Donut por habilidad -----
function renderSkillDonut(sessions) {
  const byCategory = {};
  sessions.forEach(s => {
    byCategory[s.categoryLabel] = (byCategory[s.categoryLabel] || 0) + s.minutes;
  });

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = ["#ff6b4a", "#5eead4", "#f5c451", "#9b8cf2", "#6fbf73", "#e8a4d0"];

  renderChart("chart-skill-donut", "doughnut", {
    labels: labels.length ? labels : ["Sin datos"],
    datasets: [{
      data: data.length ? data : [1],
      backgroundColor: data.length ? colors.slice(0, labels.length) : ["#343a47"],
      borderColor: "var(--surface)",
      borderWidth: 2
    }]
  }, {
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#9aa0ab", font: { family: "Space Grotesk", size: 11 }, boxWidth: 12 }
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.label}: ${minutesToHM(ctx.parsed)}`
        }
      }
    }
  });
}

// ============================================================
// Estadísticas
// ============================================================
function renderStats() {
  const sessions = getSessions();

  // poblar selector de idiomas
  const langSelect = document.getElementById("stats-lang-filter");
  const currentLangVal = langSelect.value;
  const langs = [...new Set(sessions.map(s => s.lang))].sort();
  langSelect.innerHTML = `<option value="all">Todos los idiomas</option>` +
    langs.map(l => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`).join("");
  if (langs.includes(currentLangVal)) langSelect.value = currentLangVal;

  langSelect.onchange = renderStats;
  document.getElementById("stats-range-filter").onchange = renderStats;

  const selectedLang = langSelect.value;
  const range = document.getElementById("stats-range-filter").value;

  let filtered = sessions;
  if (selectedLang !== "all") {
    filtered = filtered.filter(s => s.lang === selectedLang);
  }
  if (range !== "all") {
    const days = parseInt(range, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0,0,0,0);
    filtered = filtered.filter(s => new Date(s.date + "T00:00:00") >= cutoff);
  }

  // summary cards
  const total = filtered.reduce((sum, s) => sum + s.minutes, 0);
  const sessionsCount = filtered.length;
  const avgPerSession = sessionsCount ? total / sessionsCount : 0;
  const activeDays = new Set(filtered.map(s => s.date)).size;

  document.getElementById("stats-summary").innerHTML = `
    <div class="card stat-card accent">
      <span class="stat-value">${minutesToHM(total)}</span>
      <span class="stat-label">Tiempo total (filtro actual)</span>
    </div>
    <div class="card stat-card teal">
      <span class="stat-value">${sessionsCount}</span>
      <span class="stat-label">Sesiones registradas</span>
    </div>
    <div class="card stat-card gold">
      <span class="stat-value">${minutesToHM(avgPerSession)}</span>
      <span class="stat-label">Media por sesión</span>
    </div>
    <div class="card stat-card">
      <span class="stat-value">${activeDays}</span>
      <span class="stat-label">Días con actividad</span>
    </div>
  `;

  renderLangBar(filtered);
  renderActivityBar(filtered);
  renderTimeline(filtered, range);
}

function renderLangBar(sessions) {
  const byLang = {};
  sessions.forEach(s => { byLang[s.lang] = (byLang[s.lang] || 0) + s.minutes; });
  const entries = Object.entries(byLang).sort((a, b) => b[1] - a[1]);

  renderChart("chart-lang-bar", "bar", {
    labels: entries.length ? entries.map(e => e[0]) : ["Sin datos"],
    datasets: [{
      label: "Minutos",
      data: entries.length ? entries.map(e => Math.round(e[1])) : [0],
      backgroundColor: "#ff6b4a",
      borderRadius: 4
    }]
  }, {
    indexAxis: "y",
    scales: {
      x: { ticks: { color: "#9aa0ab", font: { family: "JetBrains Mono", size: 11 } }, grid: { color: "#343a47" } },
      y: { ticks: { color: "#e9e7e2", font: { family: "Space Grotesk", size: 12 } }, grid: { display: false } }
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => minutesToHM(ctx.parsed.x) } } }
  });
}

function renderActivityBar(sessions) {
  const byActivity = {};
  sessions.forEach(s => { byActivity[s.activityName] = (byActivity[s.activityName] || 0) + s.minutes; });
  const entries = Object.entries(byActivity).sort((a, b) => b[1] - a[1]).slice(0, 10);

  renderChart("chart-activity-bar", "bar", {
    labels: entries.length ? entries.map(e => e[0]) : ["Sin datos"],
    datasets: [{
      label: "Minutos",
      data: entries.length ? entries.map(e => Math.round(e[1])) : [0],
      backgroundColor: "#5eead4",
      borderRadius: 4
    }]
  }, {
    indexAxis: "y",
    scales: {
      x: { ticks: { color: "#9aa0ab", font: { family: "JetBrains Mono", size: 11 } }, grid: { color: "#343a47" } },
      y: { ticks: { color: "#e9e7e2", font: { family: "Space Grotesk", size: 11 } }, grid: { display: false } }
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => minutesToHM(ctx.parsed.x) } } }
  });
}

function renderTimeline(sessions, range) {
  const byDay = {};
  sessions.forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + s.minutes; });

  let days = [];
  if (range === "all") {
    const allDates = Object.keys(byDay).sort();
    if (allDates.length === 0) {
      const today = todayStr();
      days = [today];
    } else {
      let cursor = new Date(allDates[0] + "T00:00:00");
      const end = new Date();
      while (cursor <= end) {
        days.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  } else {
    const n = parseInt(range, 10);
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
  }

  renderChart("chart-timeline", "line", {
    labels: days.map(d => {
      const dd = new Date(d + "T00:00:00");
      return dd.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    }),
    datasets: [{
      label: "Minutos",
      data: days.map(d => Math.round(byDay[d] || 0)),
      borderColor: "#ff6b4a",
      backgroundColor: "#ff6b4a22",
      tension: 0.3,
      fill: true,
      pointRadius: days.length > 40 ? 0 : 3
    }]
  }, {
    scales: {
      x: { ticks: { color: "#9aa0ab", font: { family: "JetBrains Mono", size: 10 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
      y: { ticks: { color: "#9aa0ab", font: { family: "JetBrains Mono", size: 11 } }, grid: { color: "#343a47" }, beginAtZero: true }
    },
    plugins: { legend: { display: false } }
  });
}

// ----- Helper genérico Chart.js -----
function renderChart(canvasId, type, data, extraOptions = {}) {
  const ctx = document.getElementById(canvasId);
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...extraOptions
    }
  });
}

// ============================================================
// Historial
// ============================================================
function renderHistory() {
  const sessions = getSessions();
  const langSelect = document.getElementById("history-lang-filter");
  const currentVal = langSelect.value;
  const langs = [...new Set(sessions.map(s => s.lang))].sort();
  langSelect.innerHTML = `<option value="all">Todos los idiomas</option>` +
    langs.map(l => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`).join("");
  if (langs.includes(currentVal)) langSelect.value = currentVal;
  langSelect.onchange = renderHistory;

  const selectedLang = langSelect.value;
  let filtered = selectedLang === "all" ? sessions : sessions.filter(s => s.lang === selectedLang);
  filtered = [...filtered].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));

  const el = document.getElementById("history-list");
  if (filtered.length === 0) {
    el.innerHTML = emptyState("🗂️", "No hay sesiones para mostrar", "Cambia el filtro o registra una nueva sesión de inmersión.");
    return;
  }
  el.innerHTML = filtered.map(sessionRowHTML).join("");
  attachDeleteHandlers(el, () => renderHistory());
}

function exportData() {
  const sessions = getSessions();
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inmersion_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function confirmClearAll() {
  openModal(`
    <h2>¿Borrar todos los datos?</h2>
    <p class="muted">Esta acción eliminará permanentemente todas las sesiones registradas. No se puede deshacer.</p>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="clearAllData()">Borrar todo</button>
    </div>
  `);
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  closeModal();
  showToast("Todos los datos han sido eliminados");
  renderHistory();
}

// ============================================================
// Modal
// ============================================================
function openModal(html) {
  document.getElementById("modal-content").innerHTML = html;
  document.getElementById("modal-overlay").classList.add("show");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.remove("show");
}
document.getElementById("modal-overlay").addEventListener("click", e => {
  if (e.target.id === "modal-overlay") closeModal();
});

// ============================================================
// Guía de actividades
// ============================================================
function renderActivitiesGuide() {
  const el = document.getElementById("activities-guide");
  el.innerHTML = ACTIVITY_CATEGORIES.map(cat => `
    <div class="card section-gap" style="margin-top:18px;">
      <h3>${cat.label}</h3>
      <div class="grid cols-2">
        ${cat.activities.map(act => `
          <div style="padding:12px; border:1px solid var(--line); border-radius:8px; background:var(--surface-2);">
            <div class="flex-between" style="margin-bottom:4px;">
              <strong style="font-size:13.5px;">${act.name}</strong>
            </div>
            <p class="muted" style="font-size:12.5px; margin-bottom:8px;">${act.desc}</p>
            <span class="tag-pill ${act.timeMode === 'content' ? 'active' : ''}" style="${act.timeMode === 'manual' ? 'border-color:var(--gold); color:var(--gold);' : ''}">
              ${act.timeMode === 'content' ? 'Duración del contenido' : 'Tiempo manual'}
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// ============================================================
// Ajustes (API keys)
// ============================================================
function renderSettings() {
  const ytInput = document.getElementById("yt-key-input");
  const tmdbInput = document.getElementById("tmdb-key-input");
  const ytStatus = document.getElementById("yt-key-status");
  const tmdbStatus = document.getElementById("tmdb-key-status");

  ytInput.value = getYtKey();
  tmdbInput.value = getTmdbKey();
  ytStatus.textContent = getYtKey() ? "Clave guardada en este navegador." : "";
  tmdbStatus.textContent = getTmdbKey() ? "Clave guardada en este navegador." : "";

  document.getElementById("yt-key-save").onclick = () => {
    const key = ytInput.value.trim();
    if (!key) { ytStatus.textContent = "Pega una clave antes de guardar."; return; }
    setYtKey(key);
    ytStatus.textContent = "Clave guardada en este navegador.";
    showToast("API key de YouTube guardada");
  };
  document.getElementById("yt-key-clear").onclick = () => {
    setYtKey("");
    ytInput.value = "";
    ytStatus.textContent = "Clave eliminada.";
    showToast("API key de YouTube eliminada");
  };
  document.getElementById("tmdb-key-save").onclick = () => {
    const key = tmdbInput.value.trim();
    if (!key) { tmdbStatus.textContent = "Pega una clave antes de guardar."; return; }
    setTmdbKey(key);
    tmdbStatus.textContent = "Clave guardada en este navegador.";
    showToast("API key de TMDB guardada");
  };
  document.getElementById("tmdb-key-clear").onclick = () => {
    setTmdbKey("");
    tmdbInput.value = "";
    tmdbStatus.textContent = "Clave eliminada.";
    showToast("API key de TMDB eliminada");
  };
}

// ============================================================
// Inicio
// ============================================================
renderDashboard();
