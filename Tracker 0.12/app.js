/* ===========================================================
   Rastreador de inmersión lingüística v2
   =========================================================== */

const STORAGE_KEY = "lang-immersion-tracker-v2";
const API_KEY_STORAGE = "lang-immersion-yt-api-key";
const TMDB_KEY_STORAGE = "lang-immersion-tmdb-api-key";

/* ---------- ACTIVITY DEFINITIONS ---------- */

const ACTIVITIES = [
  // READING
  { id: "interactive-reading-audio", name: "Interactive Reading w/ Audio", cat: "Lectura", desc: "Lectura y escucha simultánea con pausas para buscar palabras.", manualTime: false },
  { id: "freeflow-reading-audio", name: "Freeflow Reading w/ Audio", cat: "Lectura", desc: "Lectura y escucha simultánea sin pausas ni herramientas.", manualTime: false },
  { id: "sentence-mining-read-listen", name: "Sentence Mining (Read+Listen)", cat: "Lectura", desc: "Lectura y escucha simultánea guardando frases para estudiar.", manualTime: false },
  { id: "interactive-reading", name: "Interactive Reading", cat: "Lectura", desc: "Lectura con herramientas o diccionario (solo texto, sin audio).", manualTime: false },
  { id: "interlinear-reading", name: "Interlinear reading", cat: "Lectura", desc: "Lectura con traducciones entre líneas.", manualTime: false },
  { id: "freeflow-reading", name: "Freeflow Reading", cat: "Lectura", desc: "Lectura sin pausas ni diccionario (solo texto, sin audio).", manualTime: false },
  { id: "sentence-mining-reading", name: "Sentence Mining (While Reading)", cat: "Lectura", desc: "Lectura guardando frases para estudiar.", manualTime: false },
  { id: "reading-aloud-uncorrected", name: "Uncorrected Reading Aloud", cat: "Lectura", desc: "Leer texto en voz alta.", manualTime: false },
  { id: "reading-aloud-corrected", name: "Corrected Reading Aloud", cat: "Lectura", desc: "Leer en voz alta con un hablante nativo corrigiendo tu pronunciación.", manualTime: true },

  // ESCUCHA
  { id: "interactive-listening", name: "Interactive Listening", cat: "Escucha", desc: "Uso de herramientas para buscar palabras o repetir fragmentos de audio.", manualTime: true },
  { id: "sentence-mining-listening", name: "Sentence Mining (While Listening)", cat: "Escucha", desc: "Escucha guardando frases para estudiar.", manualTime: true },
  { id: "transcription", name: "Transcription", cat: "Escucha", desc: "Escuchar audio y escribir exactamente lo que oyes.", manualTime: false },
  { id: "freeflow-listening", name: "Freeflow Listening", cat: "Escucha", desc: "Escuchar audio sin texto ni diccionario.", manualTime: false },
  { id: "half-attention-listening", name: "Half-attention Listening", cat: "Escucha", desc: "Escuchar sin prestar atención plena o mientras haces otras cosas.", manualTime: false },
  { id: "intensive-listening", name: "Intensive Listening", cat: "Escucha", desc: "Pausa automática y bucle de cada frase hasta 3 veces antes de ver los subtítulos.", manualTime: true },
  { id: "listen-looping", name: "Listen Looping", cat: "Escucha", desc: "Escuchar repetidamente el mismo audio para mejorar tu capacidad de comprensión.", manualTime: false },
  { id: "ear-training", name: "Ear training", cat: "Escucha", desc: "Practicar la escucha de nuevos sonidos del idioma.", manualTime: false },
  { id: "subvocal-shadowing", name: "Subvocal Shadowing", cat: "Escucha", desc: "Escuchar audio mientras repites lo que oyes en tu cabeza.", manualTime: false },

  // ESCRITURA
  { id: "assisted-writing", name: "Assisted writing", cat: "Escritura", desc: "Escribir con ayuda de herramientas o un hablante nativo.", manualTime: false },
  { id: "writing-analysis", name: "Writing Analysis", cat: "Escritura", desc: "Analizar y mejorar tu escritura.", manualTime: false },
  { id: "unassisted-writing", name: "Unassisted writing", cat: "Escritura", desc: "Escribir sin usar ninguna herramienta ni diccionario.", manualTime: false },
  { id: "topic-writing", name: "Topic Writing", cat: "Escritura", desc: "Escribir sobre el mismo tema repetidamente.", manualTime: false },
  { id: "copywork", name: "Copywork", cat: "Escritura", desc: "Copiar contenido escrito (a máquina o a mano) y analizar el idioma.", manualTime: false },
  { id: "typing-practice", name: "Typing practice", cat: "Escritura", desc: "Aprender a escribir el idioma objetivo en un teclado.", manualTime: false },
  { id: "handwriting-practice", name: "Handwriting Practice", cat: "Escritura", desc: "Escribir a mano con foco en mejorar la apariencia y comodidad.", manualTime: false },

  // CONVERSACIÓN
  { id: "crosstalk", name: "Crosstalk", cat: "Conversación", desc: "Conversación bilingüe: cada persona habla su lengua materna.", manualTime: true },
  { id: "speaking-with-partner", name: "Speaking with partner", cat: "Conversación", desc: "Hablar en tu idioma objetivo con un compañero.", manualTime: true },
  { id: "speaking-alone", name: "Speaking alone", cat: "Conversación", desc: "Hablarte a ti mismo en tu idioma objetivo.", manualTime: false },
  { id: "speaking-analysis", name: "Speaking Analysis", cat: "Conversación", desc: "Analizar grabaciones de tu discurso.", manualTime: false },
  { id: "singing", name: "Singing", cat: "Conversación", desc: "Cantar en tu idioma objetivo.", manualTime: false },
  { id: "topic-talk", name: "Topic Talk", cat: "Conversación", desc: "Hablar sobre el mismo tema repetidamente.", manualTime: false },
  { id: "chorusing", name: "Chorusing", cat: "Conversación", desc: "Escuchar frases cortas y repetirlas simultáneamente o de forma alterna.", manualTime: false },
  { id: "shadowing", name: "Shadowing", cat: "Conversación", desc: "Escuchar audio, sin pausas, y repetir después del hablante.", manualTime: false },
  { id: "phrase-memorization", name: "Phrase memorization", cat: "Conversación", desc: "Memorizar y practicar frases y estructuras gramaticales predefinidas.", manualTime: false },
  { id: "pronunciation-practice", name: "Pronunciation Practice", cat: "Conversación", desc: "Todos los ejercicios de pronunciación.", manualTime: false },
  { id: "sound-study", name: "Sound study", cat: "Conversación", desc: "Aprender sobre los sonidos del idioma objetivo.", manualTime: false },

  // ESTUDIO
  { id: "vocab-study", name: "Vocab Study", cat: "Estudio", desc: "Estudiar vocabulario con flashcards o una app.", manualTime: false },
  { id: "grammar-study", name: "Grammar Study", cat: "Estudio", desc: "Leer o estudiar reglas gramaticales del idioma objetivo.", manualTime: false },
  { id: "flashcard-creation", name: "Flashcard creation", cat: "Estudio", desc: "Crear flashcards fuera de las actividades normales de inmersión.", manualTime: false },
  { id: "language-app", name: "Language App", cat: "Estudio", desc: "Estudiar con una app de idiomas que no encaja en otras categorías.", manualTime: false },
  { id: "language-class", name: "Language class", cat: "Estudio", desc: "Estudiar con un profesor usando un libro de texto o materiales tradicionales.", manualTime: true },
  { id: "test-prep", name: "Test Prep", cat: "Estudio", desc: "Prepararse para un examen o prueba de competencia lingüística.", manualTime: false },
  { id: "number-practice", name: "Number Practice", cat: "Estudio", desc: "Practicar números, fechas y horas en el idioma objetivo.", manualTime: false },
  { id: "alphabet-study", name: "Alphabet Study", cat: "Estudio", desc: "Estudiar o aprender el alfabeto.", manualTime: false },
  { id: "character-study", name: "Character Study", cat: "Estudio", desc: "Aprender caracteres escritos como Hanzi o Kanji.", manualTime: false },

  // OCIO
  { id: "video-games", name: "Video Games", cat: "Ocio", desc: "Jugar a videojuegos en tu idioma objetivo.", manualTime: false },
];

const ACTIVITY_COLORS = {
  "Lectura": "#2d4f8a",
  "Escucha": "#2f5d4f",
  "Escritura": "#5c3d8a",
  "Conversación": "#8a3d3d",
  "Estudio": "#8a6d2d",
  "Ocio": "#3d7a8a",
};

/* ---------- STATE ---------- */

let state = loadState();
let currentLang = state.languages[0] || "Japonés";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.languages) s.languages = ["Japonés"];
      if (!s.sessions) s.sessions = [];
      if (!s.youtube) s.youtube = [];
      if (!s.shows) s.shows = [];
      if (!s.movies) s.movies = [];
      if (!s.goals) s.goals = { type: "global", globalMinutes: 0, perLang: {} };
      return s;
    }
  } catch (e) {}
  return { languages: ["Japonés"], sessions: [], youtube: [], shows: [], movies: [], goals: { type: "global", globalMinutes: 0, perLang: {} } };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ""; }
function setApiKey(key) { if (key) localStorage.setItem(API_KEY_STORAGE, key); else localStorage.removeItem(API_KEY_STORAGE); }
function getTmdbKey() { return localStorage.getItem(TMDB_KEY_STORAGE) || ""; }
function setTmdbKey(key) { if (key) localStorage.setItem(TMDB_KEY_STORAGE, key); else localStorage.removeItem(TMDB_KEY_STORAGE); }

/* ---------- HELPERS ---------- */

function formatHM(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatHMS(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimerDisplay(totalSeconds) {
  totalSeconds = Math.floor(totalSeconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function parseISODuration(iso) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return (parseInt(match[1]||0)*3600) + (parseInt(match[2]||0)*60) + parseInt(match[3]||0);
}

function splitMultipleLinks(raw) {
  return raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
}

function extractVideoId(url) {
  url = url.trim();
  if (!url) return null;
  let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function setStatus(el, text, type) {
  el.textContent = text;
  el.className = "status-msg" + (type ? " " + type : "");
}

function getActivityById(id) {
  return ACTIVITIES.find(a => a.id === id);
}

/* ---------- TOTALS ---------- */

function getTotalSeconds() {
  const ytSec = state.youtube.filter(v => !currentLang || v.lang === currentLang).reduce((s,v) => s + getYtEffectiveSeconds(v), 0);
  const showSec = state.shows.filter(s => !currentLang || s.lang === currentLang).reduce((s, sh) => s + sh.epDuration*60*sh.episodesWatched, 0);
  const movieSec = state.movies.filter(m => !currentLang || m.lang === currentLang).reduce((s,m) => s + getMovieEffectiveSeconds(m), 0);
  const actSec = state.sessions.filter(s => !currentLang || s.lang === currentLang).reduce((s,a) => s + a.seconds, 0);
  return { ytSec, showSec, movieSec, actSec, grand: ytSec+showSec+movieSec+actSec };
}

function renderTotals() {
  const { grand } = getTotalSeconds();
  document.getElementById("total-grand").textContent = formatHM(grand);
}

/* ---------- DAILY GOAL ---------- */

function getTodaySeconds(lang) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;

  function inToday(ts) { return ts >= startOfDay && ts < endOfDay; }

  const filter = v => (!lang || v.lang === lang) && inToday(v.ts || 0);

  const ytSec = state.youtube.filter(filter).reduce((s,v) => s + getYtEffectiveSeconds(v), 0);
  const actSec = state.sessions.filter(filter).reduce((s,a) => s + a.seconds, 0);
  const movieSec = state.movies.filter(filter).reduce((s,m) => s + getMovieEffectiveSeconds(m), 0);
  // Shows don't have a reliable timestamp per viewing, skip for daily count
  return ytSec + actSec + movieSec;
}

function getGoalMotivation(pct) {
  if (pct === 0) return "¡Empieza la sesión de hoy!";
  if (pct < 0.25) return "¡Buen comienzo!";
  if (pct < 0.5) return "Vas por buen camino.";
  if (pct < 0.75) return "¡Ya más de la mitad!";
  if (pct < 1) return "¡Casi lo tienes!";
  return "🎉 ¡Objetivo alcanzado!";
}

function renderGoalBar() {
  const wrap = document.getElementById("goal-bar-wrap");
  if (!wrap) return;
  const goals = state.goals;

  if (goals.type === "global") {
    const goalMin = goals.globalMinutes || 0;
    if (!goalMin) {
      wrap.innerHTML = `<div class="goal-no-goal">Sin objetivo diario. <a id="go-to-goal-config">Configura uno →</a></div>`;
      document.getElementById("go-to-goal-config")?.addEventListener("click", () => {
        document.querySelector(".nav-tab[data-page='config']").click();
      });
      return;
    }
    const doneSec = getTodaySeconds(null);
    const goalSec = goalMin * 60;
    const pct = Math.min(doneSec / goalSec, 1);
    const over = doneSec > goalSec;
    const doneStr = formatHM(doneSec);
    const goalStr = formatHM(goalSec);
    const msg = getGoalMotivation(pct);
    wrap.innerHTML = `
      <div class="goal-bar-top">
        <span class="goal-bar-label">🎯 Objetivo diario (global)</span>
        <span class="goal-bar-numbers"><span class="done">${doneStr}</span> / ${goalStr}</span>
      </div>
      <div class="goal-bar-track"><div class="goal-bar-fill${over?' over':''}" style="width:${Math.round(pct*100)}%"></div></div>
      <div class="goal-bar-msg${pct>=1?' complete':''}">${msg}</div>`;
  } else {
    // Per-lang: show bar for currentLang only
    const perLang = goals.perLang || {};
    const goalMin = perLang[currentLang] || 0;
    if (!goalMin) {
      wrap.innerHTML = `<div class="goal-no-goal">Sin objetivo para <strong>${currentLang}</strong>. <a id="go-to-goal-config">Configura uno →</a></div>`;
      document.getElementById("go-to-goal-config")?.addEventListener("click", () => {
        document.querySelector(".nav-tab[data-page='config']").click();
      });
      return;
    }
    const doneSec = getTodaySeconds(currentLang);
    const goalSec = goalMin * 60;
    const pct = Math.min(doneSec / goalSec, 1);
    const over = doneSec > goalSec;
    const doneStr = formatHM(doneSec);
    const goalStr = formatHM(goalSec);
    const msg = getGoalMotivation(pct);
    wrap.innerHTML = `
      <div class="goal-bar-top">
        <span class="goal-bar-label">🎯 Objetivo diario · ${currentLang}</span>
        <span class="goal-bar-numbers"><span class="done">${doneStr}</span> / ${goalStr}</span>
      </div>
      <div class="goal-bar-track"><div class="goal-bar-fill${over?' over':''}" style="width:${Math.round(pct*100)}%"></div></div>
      <div class="goal-bar-msg${pct>=1?' complete':''}">${msg}</div>`;
  }
}

function refreshGoalConfigUI() {
  const goals = state.goals;

  // Type tabs
  document.getElementById("goal-type-global").classList.toggle("active", goals.type === "global");
  document.getElementById("goal-type-per-lang").classList.toggle("active", goals.type !== "global");
  document.getElementById("goal-global-section").style.display = goals.type === "global" ? "block" : "none";
  document.getElementById("goal-per-lang-section").style.display = goals.type !== "global" ? "block" : "none";

  // Global inputs
  const gMin = goals.globalMinutes || 0;
  document.getElementById("goal-global-h").value = Math.floor(gMin / 60) || "";
  document.getElementById("goal-global-m").value = gMin % 60 || "";
  refreshPresetHighlight("goal-global-presets", gMin);

  // Per-lang select
  const langSel = document.getElementById("goal-lang-select");
  const prevLang = langSel.value;
  langSel.innerHTML = state.languages.map(l => `<option value="${l}">${l}</option>`).join("");
  if (prevLang && state.languages.includes(prevLang)) langSel.value = prevLang;
  else langSel.value = currentLang;

  refreshPerLangGoalInputs();
  renderPerLangGoalList();
}

function refreshPerLangGoalInputs() {
  const lang = document.getElementById("goal-lang-select").value;
  const min = (state.goals.perLang || {})[lang] || 0;
  document.getElementById("goal-lang-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-lang-m").value = min % 60 || "";
  refreshPresetHighlight("goal-lang-presets", min);
}

function refreshPresetHighlight(containerId, minutes) {
  document.querySelectorAll(`#${containerId} .goal-preset-btn`).forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.minutes) === minutes);
  });
}

function renderPerLangGoalList() {
  const el = document.getElementById("goal-lang-list");
  if (!el) return;
  const perLang = state.goals.perLang || {};
  const entries = Object.entries(perLang).filter(([,m]) => m > 0);
  if (!entries.length) { el.innerHTML = '<div class="empty-state">Ningún idioma tiene objetivo configurado.</div>'; return; }
  el.innerHTML = entries.map(([lang, min]) => `
    <div class="entry">
      <div class="entry-main"><span class="entry-title">${lang}</span></div>
      <div class="entry-right">
        <span class="entry-duration">${formatHM(min*60)}</span>
        <button class="danger-link" onclick="clearLangGoal('${lang}')">quitar</button>
      </div>
    </div>`).join("");
}

window.clearLangGoal = function(lang) {
  delete state.goals.perLang[lang];
  saveState();
  refreshGoalConfigUI();
  renderGoalBar();
};

// Type toggle
document.getElementById("goal-type-global").addEventListener("click", () => {
  state.goals.type = "global";
  saveState();
  refreshGoalConfigUI();
  renderGoalBar();
});
document.getElementById("goal-type-per-lang").addEventListener("click", () => {
  state.goals.type = "per-lang";
  saveState();
  refreshGoalConfigUI();
  renderGoalBar();
});

// Global preset buttons
document.getElementById("goal-global-presets").addEventListener("click", e => {
  const btn = e.target.closest(".goal-preset-btn");
  if (!btn) return;
  const min = parseInt(btn.dataset.minutes);
  document.getElementById("goal-global-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-global-m").value = min % 60 || "";
  refreshPresetHighlight("goal-global-presets", min);
});

// Per-lang preset buttons
document.getElementById("goal-lang-presets").addEventListener("click", e => {
  const btn = e.target.closest(".goal-preset-btn");
  if (!btn) return;
  const min = parseInt(btn.dataset.minutes);
  document.getElementById("goal-lang-h").value = Math.floor(min / 60) || "";
  document.getElementById("goal-lang-m").value = min % 60 || "";
  refreshPresetHighlight("goal-lang-presets", min);
});

// Save global goal
document.getElementById("goal-global-save").addEventListener("click", () => {
  const h = parseInt(document.getElementById("goal-global-h").value) || 0;
  const m = parseInt(document.getElementById("goal-global-m").value) || 0;
  const total = h * 60 + m;
  if (total <= 0) { setStatus(document.getElementById("goal-global-status"), "Introduce al menos 1 minuto.", "err"); return; }
  state.goals.globalMinutes = total;
  saveState();
  refreshPresetHighlight("goal-global-presets", total);
  setStatus(document.getElementById("goal-global-status"), `✓ Objetivo guardado: ${formatHM(total*60)} diarios.`, "ok");
  renderGoalBar();
});

// Clear global goal
document.getElementById("goal-global-clear").addEventListener("click", () => {
  state.goals.globalMinutes = 0;
  saveState();
  document.getElementById("goal-global-h").value = "";
  document.getElementById("goal-global-m").value = "";
  refreshPresetHighlight("goal-global-presets", 0);
  setStatus(document.getElementById("goal-global-status"), "Objetivo eliminado.", "ok");
  renderGoalBar();
});

// Per-lang select change
document.getElementById("goal-lang-select").addEventListener("change", refreshPerLangGoalInputs);

// Save per-lang goal
document.getElementById("goal-lang-save").addEventListener("click", () => {
  const lang = document.getElementById("goal-lang-select").value;
  if (!lang) return;
  const h = parseInt(document.getElementById("goal-lang-h").value) || 0;
  const m = parseInt(document.getElementById("goal-lang-m").value) || 0;
  const total = h * 60 + m;
  if (total <= 0) { setStatus(document.getElementById("goal-lang-status"), "Introduce al menos 1 minuto.", "err"); return; }
  if (!state.goals.perLang) state.goals.perLang = {};
  state.goals.perLang[lang] = total;
  saveState();
  refreshPresetHighlight("goal-lang-presets", total);
  setStatus(document.getElementById("goal-lang-status"), `✓ Objetivo para ${lang}: ${formatHM(total*60)} diarios.`, "ok");
  renderPerLangGoalList();
  renderGoalBar();
});

// Clear per-lang goal
document.getElementById("goal-lang-clear").addEventListener("click", () => {
  const lang = document.getElementById("goal-lang-select").value;
  if (!lang || !state.goals.perLang) return;
  delete state.goals.perLang[lang];
  saveState();
  document.getElementById("goal-lang-h").value = "";
  document.getElementById("goal-lang-m").value = "";
  refreshPresetHighlight("goal-lang-presets", 0);
  setStatus(document.getElementById("goal-lang-status"), `Objetivo de ${lang} eliminado.`, "ok");
  renderPerLangGoalList();
  renderGoalBar();
});

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

  // Also populate all lang selects
  ["act-lang","yt-lang","show-lang","movie-lang","filter-lang"].forEach(id => {
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
  // Deselect old
  document.querySelectorAll(".activity-card").forEach(c => c.classList.remove("selected"));
  const card = document.querySelector(`.activity-card[data-id="${id}"]`);
  if (card) card.classList.add("selected");

  selectedActivity = id;
  const act = getActivityById(id);

  // Show session panel at top
  const panel = document.getElementById("session-panel");
  panel.classList.add("visible");
  document.getElementById("timer-activity-label").textContent = act.name;

  // Scroll panel into view smoothly (it's above the activity grid)
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  // Always default to manual (it's the first tab); timer is opt-in
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
  document.getElementById("timer-start-btn").textContent = "▶ En curso";
  document.getElementById("timer-start-btn").disabled = true;
  document.getElementById("timer-pause-btn").disabled = false;
  document.getElementById("timer-stop-btn").disabled = false;
}

function pauseTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerPaused = true;
  document.getElementById("timer-start-btn").textContent = "▶ Reanudar";
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
  document.getElementById("timer-start-btn").textContent = "▶ Iniciar";
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
    lang,
    note,
    seconds,
    ts: Date.now(),
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

/* ---------- YOUTUBE ---------- */

async function fetchVideoDetails(videoIds) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${batch.join(",")}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.errors?.[0]?.reason || "ERROR");
    for (const item of data.items || []) {
      results.push({ id: item.id, title: item.snippet?.title || item.id, seconds: parseISODuration(item.contentDetails.duration) });
    }
  }
  return results;
}

document.getElementById("yt-add").addEventListener("click", async () => {
  const input = document.getElementById("yt-input");
  const statusEl = document.getElementById("yt-status");
  const raw = input.value.trim();
  if (!raw) return;
  if (!getApiKey()) { setStatus(statusEl, "Falta la API key de YouTube. Configúrala en ⚙ Config.", "err"); return; }

  const links = splitMultipleLinks(raw);
  const videoIds = [];
  let invalidCount = 0;
  for (const link of links) {
    const id = extractVideoId(link);
    if (id) videoIds.push(id); else invalidCount++;
  }
  if (videoIds.length === 0) { setStatus(statusEl, "No se reconoció ningún enlace válido de YouTube.", "err"); return; }
  setStatus(statusEl, `Calculando duración de ${videoIds.length} vídeo(s)...`, "pending");

  try {
    const details = await fetchVideoDetails(videoIds);
    if (!details.length) { setStatus(statusEl, "La API no devolvió resultados.", "err"); return; }
    const lang = document.getElementById("yt-lang").value || currentLang;
    const activity = document.getElementById("yt-activity").value;
    // Map video IDs back to their original URLs
    const idToUrl = {};
    for (const link of links) {
      const id = extractVideoId(link);
      if (id && !idToUrl[id]) idToUrl[id] = link.trim();
    }
    const enriched = details.map(d => ({ ...d, lang, activity, url: idToUrl[d.id] || `https://www.youtube.com/watch?v=${d.id}`, ts: Date.now() }));
    state.youtube.push(...enriched);
    saveState();
    renderAll();
    let msg = `Añadido${details.length > 1 ? "s" : ""} ${details.length} vídeo(s).`;
    if (invalidCount > 0) msg += ` (${invalidCount} enlace(s) no reconocidos se ignoraron)`;
    setStatus(statusEl, msg, "ok");
    input.value = "";
  } catch (err) {
    if (err.message === "NO_API_KEY") setStatus(statusEl, "Falta la API key de YouTube.", "err");
    else if (err.message === "keyInvalid") setStatus(statusEl, "La API key no es válida.", "err");
    else if (err.message === "quotaExceeded") setStatus(statusEl, "Se agotó la cuota diaria de la API de YouTube.", "err");
    else setStatus(statusEl, `Error: ${err.message}`, "err");
  }
});

document.getElementById("yt-input").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("yt-add").click(); });

/* ---------- SHARED MEDIA TIME CONTROLS (YouTube + Movies) ---------- */

// Active media timers: key = "yt-idx" or "movie-idx"
const mediaTimers = {};

function renderMediaTimeControls(idx, type, currentSec) {
  const key = `${type}-${idx}`;
  return `
    <div class="media-time-tabs" id="mtabs-${key}" style="display:flex;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.6rem;">
      <button class="time-mode-tab active" id="mtab-manual-${key}" onclick="switchMediaTab('${key}','manual')">Manual</button>
      <button class="time-mode-tab" id="mtab-timer-${key}" onclick="switchMediaTab('${key}','timer')">Cronómetro</button>
    </div>
    <div id="mmanual-${key}" style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <input type="number" id="mman-h-${key}" placeholder="h" min="0" style="width:60px;text-align:center;font-family:var(--mono);" />
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">h</span>
      <input type="number" id="mman-m-${key}" placeholder="m" min="0" max="59" style="width:60px;text-align:center;font-family:var(--mono);" />
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">m</span>
      <input type="number" id="mman-s-${key}" placeholder="s" min="0" max="59" style="width:60px;text-align:center;font-family:var(--mono);" />
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">s</span>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" onclick="saveMediaManual('${key}','${type}',${idx})">Guardar</button>
      <span class="show-total" id="mtime-display-${key}">${currentSec > 0 ? formatHMS(currentSec) : '—'}</span>
    </div>
    <div id="mtimer-${key}" style="display:none;align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <span class="timer-display" id="mtimerdisp-${key}" style="font-size:1.5rem;min-width:100px;">00:00:00</span>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" id="mstart-${key}" onclick="startMediaTimer('${key}','${type}',${idx})">▶ Iniciar</button>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" id="mpause-${key}" onclick="pauseMediaTimer('${key}')" disabled>⏸ Pausa</button>
      <button style="padding:0.4rem 0.8rem;font-size:12px;" id="mstop-${key}" onclick="stopMediaTimer('${key}','${type}',${idx})" disabled>⏹ Guardar</button>
      <span class="show-total" id="mtime-display-${key}-t">${currentSec > 0 ? formatHMS(currentSec) : '—'}</span>
    </div>`;
}

function attachMediaTimeControls(container, idx, type) {
  // Controls are wired via inline onclick; no extra setup needed
}

window.switchMediaTab = function(key, mode) {
  document.getElementById(`mtab-manual-${key}`).classList.toggle('active', mode === 'manual');
  document.getElementById(`mtab-timer-${key}`).classList.toggle('active', mode === 'timer');
  document.getElementById(`mmanual-${key}`).style.display = mode === 'manual' ? 'flex' : 'none';
  document.getElementById(`mtimer-${key}`).style.display = mode === 'timer' ? 'flex' : 'none';
  if (mode === 'manual' && mediaTimers[key]) {
    pauseMediaTimer(key);
  }
};

window.saveMediaManual = function(key, type, idx) {
  const h = parseInt(document.getElementById(`mman-h-${key}`).value) || 0;
  const m = parseInt(document.getElementById(`mman-m-${key}`).value) || 0;
  const s = parseInt(document.getElementById(`mman-s-${key}`).value) || 0;
  const totalSec = h*3600 + m*60 + s;
  if (totalSec <= 0) return;
  if (type === 'yt') { state.youtube[idx].manualSeconds = totalSec; state.youtube[idx].ts = Date.now(); }
  else if (type === 'movie') { state.movies[idx].manualSeconds = totalSec; state.movies[idx].ts = Date.now(); }
  saveState();
  const disp = document.getElementById(`mtime-display-${key}`);
  if (disp) disp.textContent = formatHMS(totalSec);
  renderTotals();
  renderGoalBar();
};

window.startMediaTimer = function(key, type, idx) {
  if (mediaTimers[key] && mediaTimers[key].running) return;
  if (!mediaTimers[key]) mediaTimers[key] = { seconds: 0, running: false, interval: null };
  const t = mediaTimers[key];
  t.running = true;
  t.interval = setInterval(() => {
    t.seconds++;
    const d = document.getElementById(`mtimerdisp-${key}`);
    if (d) d.textContent = formatTimerDisplay(t.seconds);
  }, 1000);
  document.getElementById(`mstart-${key}`).disabled = true;
  document.getElementById(`mpause-${key}`).disabled = false;
  document.getElementById(`mstop-${key}`).disabled = false;
};

window.pauseMediaTimer = function(key) {
  const t = mediaTimers[key];
  if (!t || !t.running) return;
  clearInterval(t.interval);
  t.running = false;
  document.getElementById(`mstart-${key}`).disabled = false;
  document.getElementById(`mpause-${key}`).disabled = true;
};

window.stopMediaTimer = function(key, type, idx) {
  const t = mediaTimers[key];
  if (!t) return;
  clearInterval(t.interval);
  t.running = false;
  const secs = t.seconds;
  t.seconds = 0;
  const d = document.getElementById(`mtimerdisp-${key}`);
  if (d) d.textContent = '00:00:00';
  document.getElementById(`mstart-${key}`).disabled = false;
  document.getElementById(`mpause-${key}`).disabled = true;
  document.getElementById(`mstop-${key}`).disabled = true;
  if (secs <= 0) return;
  if (type === 'yt') { state.youtube[idx].manualSeconds = secs; state.youtube[idx].ts = Date.now(); }
  else if (type === 'movie') { state.movies[idx].manualSeconds = secs; state.movies[idx].ts = Date.now(); }
  saveState();
  const disp = document.getElementById(`mtime-display-${key}-t`);
  if (disp) disp.textContent = formatHMS(secs);
  renderTotals();
  renderGoalBar();
};



function getYtEffectiveSeconds(video) {
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === video.activity);
  if (actDef && actDef.manualTime) {
    return video.manualSeconds || 0;
  }
  return video.seconds;
}

function renderYoutube() {
  const list = document.getElementById("yt-list");
  list.innerHTML = "";
  const filtered = state.youtube.filter(v => !currentLang || v.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ningún vídeo.</div>'; return; }
  filtered.forEach((video) => {
    const realIdx = state.youtube.indexOf(video);
    const actDef = MEDIA_ACTIVITIES.find(a => a.value === video.activity);
    const isManual = actDef && actDef.manualTime;
    const effectiveSec = getYtEffectiveSeconds(video);

    const entry = document.createElement("div");
    entry.className = "show-card"; // reuse show-card style for richer layout
    entry.innerHTML = `
      <div class="show-card-head">
        <div>
          <div class="show-name"><a href="${video.url || `https://www.youtube.com/watch?v=${video.id}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${video.title}</a></div>
          <div class="show-meta">${video.lang || ""} · ${video.activity || ""} · ${formatHMS(video.seconds)}</div>
        </div>
        <button class="danger-link" onclick="removeYt(${realIdx})">eliminar</button>
      </div>
      ${isManual ? `
      <div class="show-controls" style="margin-top:0.5rem;">
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);">⏱ Actividad interactiva — registra tu tiempo real:</span>
      </div>
      <div class="yt-time-controls" id="yt-time-ctrl-${realIdx}" style="margin-top:0.5rem;">
        ${renderMediaTimeControls(realIdx, 'yt', video.manualSeconds || 0)}
      </div>
      ` : `
      <div class="show-controls" style="margin-top:0.5rem;">
        <span class="show-total">${formatHMS(effectiveSec)}</span>
      </div>
      `}`;
    list.appendChild(entry);

    if (isManual) {
      attachMediaTimeControls(entry, realIdx, 'yt');
    }
  });
}

window.removeYt = function(i) { state.youtube.splice(i,1); saveState(); renderAll(); };

function getMovieEffectiveSeconds(movie) {
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === movie.activity);
  if (actDef && actDef.manualTime) {
    return movie.manualSeconds || 0;
  }
  return movie.seconds;
}

/* ---------- TMDB ---------- */

function tmdbFetch(path) {
  const key = getTmdbKey();
  if (!key) return Promise.reject(new Error("NO_TMDB_KEY"));
  const isBearerToken = key.length > 100 || key.startsWith("eyJ");
  if (isBearerToken) {
    return fetch(`https://api.themoviedb.org/3${path}`, { headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } });
  } else {
    const sep = path.includes("?") ? "&" : "?";
    return fetch(`https://api.themoviedb.org/3${path}${sep}api_key=${key}`);
  }
}

async function searchTmdbShows(query) {
  const res = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&include_adult=false`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || `HTTP ${res.status}`);
  return (data.results || []).slice(0, 6);
}

async function getTmdbShowDetails(tvId) {
  const res = await tmdbFetch(`/tv/${tvId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || `HTTP ${res.status}`);
  return data;
}

async function searchTmdbMovies(query) {
  const res = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || `HTTP ${res.status}`);
  return (data.results || []).slice(0, 6);
}

async function getTmdbMovieDetails(movieId) {
  const res = await tmdbFetch(`/movie/${movieId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || `HTTP ${res.status}`);
  return data;
}

/* ---------- SHOWS ---------- */

// Activity types for YouTube/movies: interactive (manual time) vs freeflow (use API duration)
const MEDIA_ACTIVITIES = [
  { value: "Freeflow Listening", label: "Freeflow Listening", manualTime: false },
  { value: "Freeflow Reading w/ Audio", label: "Freeflow Reading w/ Audio", manualTime: false },
  { value: "Interactive Listening", label: "Interactive Listening", manualTime: true },
  { value: "Interactive Reading w/ Audio", label: "Interactive Reading w/ Audio", manualTime: true },
  { value: "Sentence Mining (Read+Listen)", label: "Sentence Mining (Read+Listen)", manualTime: true },
  { value: "Half-attention Listening", label: "Half-attention Listening", manualTime: false },
  { value: "Intensive Listening", label: "Intensive Listening", manualTime: true },
  { value: "Listen Looping", label: "Listen Looping", manualTime: false },
  { value: "Subvocal Shadowing", label: "Subvocal Shadowing", manualTime: false },
  { value: "Shadowing", label: "Shadowing", manualTime: false },
  { value: "Chorusing", label: "Chorusing", manualTime: false },
  { value: "Otra", label: "Otra", manualTime: false },
];

// Activity types for shows: interactive (manual time) vs freeflow (use ep duration)
const SHOW_ACTIVITIES = [
  { value: "Freeflow Listening", label: "Freeflow Listening", manualTime: false },
  { value: "Freeflow Reading w/ Audio", label: "Freeflow Reading w/ Audio", manualTime: false },
  { value: "Interactive Listening", label: "Interactive Listening", manualTime: true },
  { value: "Interactive Reading w/ Audio", label: "Interactive Reading w/ Audio", manualTime: true },
  { value: "Sentence Mining (Read+Listen)", label: "Sentence Mining (Read+Listen)", manualTime: true },
  { value: "Half-attention Listening", label: "Half-attention Listening", manualTime: false },
  { value: "Intensive Listening", label: "Intensive Listening", manualTime: true },
  { value: "Subvocal Shadowing", label: "Subvocal Shadowing", manualTime: false },
];

document.getElementById("show-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("show-search");
  const statusEl = document.getElementById("show-status");
  const resultsEl = document.getElementById("show-results");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  if (!query) return;
  if (!getTmdbKey()) { setStatus(statusEl, "Falta la API key de TMDB. Configúrala en ⚙ Config.", "err"); return; }
  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");
  try {
    const results = await searchTmdbShows(query);
    if (!results.length) { setStatus(statusEl, "No se encontraron resultados.", "err"); return; }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderShowResults(results);
  } catch (err) {
    setStatus(statusEl, `Error: ${err.message}`, "err");
  }
});

document.getElementById("show-search").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("show-search-btn").click(); });

function renderShowResults(results) {
  const resultsEl = document.getElementById("show-results");
  resultsEl.innerHTML = "";
  results.forEach(r => {
    const entry = document.createElement("div");
    entry.className = "result-entry";
    entry.innerHTML = `
      <div class="result-main">
        <span class="result-title">${r.name}${r.original_name && r.original_name !== r.name ? ` (${r.original_name})` : ""}</span>
        <span class="result-sub">${r.first_air_date ? r.first_air_date.slice(0,4) : "sin fecha"}</span>
      </div>
      <button>Añadir</button>`;
    entry.querySelector("button").onclick = () => addShowFromTmdb(r);
    resultsEl.appendChild(entry);
  });
}

async function addShowFromTmdb(result) {
  const statusEl = document.getElementById("show-status");
  setStatus(statusEl, `Obteniendo duración de episodios de "${result.name}"...`, "pending");
  try {
    const details = await getTmdbShowDetails(result.id);
    const runtimes = details.episode_run_time || [];
    let epDuration = runtimes.length > 0 ? Math.round(runtimes.reduce((a,b)=>a+b,0)/runtimes.length) : 0;
    if (epDuration <= 0) { epDuration = 24; }
    const lang = document.getElementById("show-lang").value || currentLang;
    state.shows.push({ name: details.name, epDuration, episodesWatched: 0, tmdbId: details.id, url: `https://www.themoviedb.org/tv/${details.id}`, lang, activity: "Freeflow Listening", manualMinutes: {}, ts: Date.now() });
    saveState();
    renderAll();
    document.getElementById("show-search").value = "";
    document.getElementById("show-results").innerHTML = "";
    setStatus(statusEl, `"${details.name}" añadido (${epDuration} min/episodio).`, "ok");
  } catch (err) {
    setStatus(statusEl, `Error: ${err.message}`, "err");
  }
}

function renderShows() {
  const list = document.getElementById("show-list");
  list.innerHTML = "";
  const filtered = state.shows.filter(s => !currentLang || s.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna serie.</div>'; return; }
  filtered.forEach((show) => {
    const i = state.shows.indexOf(show);
    const actDef = SHOW_ACTIVITIES.find(a => a.value === show.activity) || SHOW_ACTIVITIES[0];
    const isManual = actDef.manualTime;

    const card = document.createElement("div");
    card.className = "show-card";

    // Build activity options
    const actOptions = SHOW_ACTIVITIES.map(a =>
      `<option value="${a.value}"${show.activity === a.value ? " selected" : ""}>${a.label}${a.manualTime ? " ⏱" : ""}</option>`
    ).join("");

    card.innerHTML = `
      <div class="show-card-head">
        <div>
          <div class="show-name"><a href="${show.url || `https://www.themoviedb.org/tv/${show.tmdbId}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${show.name}</a></div>
          <div class="show-meta">${show.epDuration} min/ep · ${show.lang} · TMDB</div>
        </div>
        <button class="danger-link" onclick="removeShow(${i})">eliminar</button>
      </div>
      <div class="show-controls">
        <label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Actividad</label>
        <select class="show-activity-select" id="show-act-${i}">${actOptions}</select>
      </div>
      <div class="show-controls" id="show-ep-controls-${i}" style="margin-top:0.5rem;">
        ${isManual ? `
          <label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Tiempo visto (min)</label>
          <input type="number" class="ep-input" id="show-manual-${i}" min="0" value="${show.manualMinutes?.[show.activity]||0}" style="width:90px;" />
          <span class="show-total" id="show-total-${i}">${formatHMS((show.manualMinutes?.[show.activity]||0)*60)}</span>
        ` : `
          <label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Episodios vistos</label>
          <input type="number" class="ep-input" id="ep-${i}" min="0" value="${show.episodesWatched}" />
          <span class="show-total" id="show-total-${i}">${formatHMS(show.epDuration*60*show.episodesWatched)}</span>
        `}
      </div>`;

    list.appendChild(card);

    // Activity change
    card.querySelector(`#show-act-${i}`).addEventListener("change", (e) => {
      state.shows[i].activity = e.target.value;
      saveState();
      renderShows();
      renderTotals();
    });

    if (isManual) {
      card.querySelector(`#show-manual-${i}`).addEventListener("input", (e) => {
        const val = Math.max(0, parseInt(e.target.value)||0);
        if (!state.shows[i].manualMinutes) state.shows[i].manualMinutes = {};
        state.shows[i].manualMinutes[show.activity] = val;
        state.shows[i].ts = Date.now();
        saveState();
        document.getElementById(`show-total-${i}`).textContent = formatHMS(val*60);
        renderTotals();
      });
    } else {
      card.querySelector(`#ep-${i}`).addEventListener("input", (e) => {
        const val = Math.max(0, parseInt(e.target.value)||0);
        state.shows[i].episodesWatched = val;
        state.shows[i].ts = Date.now();
        saveState();
        document.getElementById(`show-total-${i}`).textContent = formatHMS(show.epDuration*60*val);
        renderTotals();
      });
    }
  });
}

window.removeShow = function(i) { state.shows.splice(i,1); saveState(); renderAll(); };

function getShowSeconds(show) {
  const actDef = SHOW_ACTIVITIES.find(a => a.value === show.activity);
  if (actDef && actDef.manualTime) {
    return (show.manualMinutes?.[show.activity] || 0) * 60;
  }
  return show.epDuration * 60 * show.episodesWatched;
}

/* ---------- MOVIES ---------- */

document.getElementById("movie-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("movie-search");
  const statusEl = document.getElementById("movie-status");
  const resultsEl = document.getElementById("movie-results");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  if (!query) return;
  if (!getTmdbKey()) { setStatus(statusEl, "Falta la API key de TMDB. Configúrala en ⚙ Config.", "err"); return; }
  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");
  try {
    const results = await searchTmdbMovies(query);
    if (!results.length) { setStatus(statusEl, "No se encontraron resultados.", "err"); return; }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderMovieResults(results);
  } catch (err) {
    setStatus(statusEl, `Error: ${err.message}`, "err");
  }
});

document.getElementById("movie-search").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("movie-search-btn").click(); });

function renderMovieResults(results) {
  const resultsEl = document.getElementById("movie-results");
  resultsEl.innerHTML = "";
  results.forEach(r => {
    const entry = document.createElement("div");
    entry.className = "result-entry";
    entry.innerHTML = `
      <div class="result-main">
        <span class="result-title">${r.title}${r.original_title && r.original_title !== r.title ? ` (${r.original_title})` : ""}</span>
        <span class="result-sub">${r.release_date ? r.release_date.slice(0,4) : "sin fecha"}</span>
      </div>
      <button>Añadir</button>`;
    entry.querySelector("button").onclick = () => addMovieFromTmdb(r);
    resultsEl.appendChild(entry);
  });
}

async function addMovieFromTmdb(result) {
  const statusEl = document.getElementById("movie-status");
  setStatus(statusEl, `Obteniendo duración de "${result.title}"...`, "pending");
  try {
    const details = await getTmdbMovieDetails(result.id);
    const runtime = details.runtime || 0;
    if (runtime <= 0) { setStatus(statusEl, `TMDB no tiene la duración de "${result.title}".`, "err"); return; }
    const lang = document.getElementById("movie-lang").value || currentLang;
    state.movies.push({ title: details.title, year: details.release_date?.slice(0,4) || "", seconds: runtime*60, tmdbId: details.id, url: `https://www.themoviedb.org/movie/${details.id}`, lang, activity: "Freeflow Listening", ts: Date.now() });
    saveState();
    renderAll();
    document.getElementById("movie-search").value = "";
    document.getElementById("movie-results").innerHTML = "";
    setStatus(statusEl, `"${details.title}" añadida (${formatHMS(runtime*60)}).`, "ok");
  } catch (err) {
    setStatus(statusEl, `Error: ${err.message}`, "err");
  }
}

function renderMovies() {
  const list = document.getElementById("movie-list");
  list.innerHTML = "";
  const filtered = state.movies.filter(m => !currentLang || m.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna película.</div>'; return; }
  filtered.forEach(movie => {
    const realIdx = state.movies.indexOf(movie);
    const actDef = MEDIA_ACTIVITIES.find(a => a.value === movie.activity) || MEDIA_ACTIVITIES[0];
    const isManual = actDef.manualTime;
    const effectiveSec = getMovieEffectiveSeconds(movie);

    const actOptions = MEDIA_ACTIVITIES.map(a =>
      `<option value="${a.value}"${movie.activity === a.value ? " selected" : ""}>${a.label}${a.manualTime ? " ⏱" : ""}</option>`
    ).join("");

    const entry = document.createElement("div");
    entry.className = "show-card";
    entry.innerHTML = `
      <div class="show-card-head">
        <div>
          <div class="show-name"><a href="${movie.url || `https://www.themoviedb.org/movie/${movie.tmdbId}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${movie.title || "Película sin título"}</a></div>
          <div class="show-meta">${movie.lang || ""} · ${movie.year || ""} · duración: ${formatHMS(movie.seconds)}</div>
        </div>
        <button class="danger-link" onclick="removeMovie(${realIdx})">eliminar</button>
      </div>
      <div class="show-controls">
        <label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Actividad</label>
        <select class="show-activity-select" id="movie-act-${realIdx}">${actOptions}</select>
      </div>
      ${isManual ? `
      <div class="show-controls" style="margin-top:0.5rem;">
        <span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);">⏱ Actividad interactiva — registra tu tiempo real:</span>
      </div>
      <div id="yt-time-ctrl-movie-${realIdx}" style="margin-top:0.5rem;">
        ${renderMediaTimeControls(realIdx, 'movie', movie.manualSeconds || 0)}
      </div>
      ` : `
      <div class="show-controls" style="margin-top:0.5rem;">
        <span class="show-total">${formatHMS(effectiveSec)}</span>
      </div>
      `}`;
    list.appendChild(entry);

    entry.querySelector(`#movie-act-${realIdx}`).addEventListener("change", (e) => {
      state.movies[realIdx].activity = e.target.value;
      saveState();
      renderMovies();
      renderTotals();
    });
  });
}

window.removeMovie = function(i) { state.movies.splice(i,1); saveState(); renderAll(); };

/* ---------- STATS ---------- */

function renderStats() {
  renderChartByType();
  renderChartByLang();
  renderChartByCat();
  renderChartByActivity();
  renderStreak();
  renderHeatmap();
}

function getAllSeconds() {
  // Build per-lang per-cat seconds
  const sessions = state.sessions.filter(s => !currentLang || s.lang === currentLang);
  const yt = state.youtube.filter(v => !currentLang || v.lang === currentLang);
  const shows = state.shows.filter(s => !currentLang || s.lang === currentLang);
  const movies = state.movies.filter(m => !currentLang || m.lang === currentLang);
  return { sessions, yt, shows, movies };
}

function renderChartByType() {
  const el = document.getElementById("chart-by-type");
  el.innerHTML = "";

  const { ytSec, showSec, movieSec, actSec } = getTotalSeconds();
  const entries = [
    ["YouTube", ytSec, "#c0392b"],
    ["Series / animes", showSec, "#2f5d4f"],
    ["Películas", movieSec, "#2d4f8a"],
    ["Actividades", actSec, "var(--green)"],
  ];

  const max = Math.max(...entries.map(([,v]) => v), 1);
  if (!entries.some(([,v]) => v > 0)) { el.innerHTML = '<div style="font-size:13px;color:var(--ink-soft)">Todavía no hay datos.</div>'; return; }

  entries.forEach(([label, secs, color]) => {
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(secs/max*100).toFixed(1)}%;background:${color}"></div></div>
        <div class="bar-val">${formatHM(secs)}</div>
      </div>`;
  });
}

function renderChartByLang() {
  const el = document.getElementById("chart-by-lang");
  el.innerHTML = "";

  const langSecs = {};
  state.languages.forEach(l => langSecs[l] = 0);

  state.sessions.forEach(s => { langSecs[s.lang] = (langSecs[s.lang]||0) + s.seconds; });
  state.youtube.filter(v => !currentLang || v.lang === currentLang).forEach(v => { langSecs[v.lang] = (langSecs[v.lang]||0) + getYtEffectiveSeconds(v); });
  state.shows.forEach(s => { langSecs[s.lang] = (langSecs[s.lang]||0) + getShowSeconds(s); });
  state.movies.forEach(m => { langSecs[m.lang] = (langSecs[m.lang]||0) + getMovieEffectiveSeconds(m); });

  const entries = Object.entries(langSecs).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;

  if (!entries.some(([,v]) => v > 0)) { el.innerHTML = '<div style="font-size:13px;color:var(--ink-soft)">Todavía no hay datos.</div>'; return; }

  entries.forEach(([lang, secs]) => {
    if (!secs) return;
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">${lang}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(secs/max*100).toFixed(1)}%"></div></div>
        <div class="bar-val">${formatHM(secs)}</div>
      </div>`;
  });
}

function renderChartByCat() {
  const el = document.getElementById("chart-by-cat");
  el.innerHTML = "";

  const catSecs = {};
  const { sessions, yt, shows, movies } = getAllSeconds();
  sessions.forEach(s => { catSecs[s.cat] = (catSecs[s.cat]||0) + s.seconds; });
  yt.forEach(v => { catSecs["YouTube"] = (catSecs["YouTube"]||0) + getYtEffectiveSeconds(v); });
  shows.forEach(s => { catSecs["Series"] = (catSecs["Series"]||0) + getShowSeconds(s); });
  movies.forEach(m => { catSecs["Películas"] = (catSecs["Películas"]||0) + getMovieEffectiveSeconds(m); });

  const entries = Object.entries(catSecs).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;
  if (!entries.some(([,v])=>v>0)) { el.innerHTML = '<div style="font-size:13px;color:var(--ink-soft)">Todavía no hay datos.</div>'; return; }

  const colors = { ...ACTIVITY_COLORS, YouTube: "#c0392b", Series: "#2f5d4f", Películas: "#2d4f8a" };
  entries.forEach(([cat, secs]) => {
    if (!secs) return;
    const color = colors[cat] || "var(--green)";
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label">${cat}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(secs/max*100).toFixed(1)}%;background:${color}"></div></div>
        <div class="bar-val">${formatHM(secs)}</div>
      </div>`;
  });
}

function renderChartByActivity() {
  const el = document.getElementById("chart-by-activity");
  el.innerHTML = "";
  const { sessions, yt } = getAllSeconds();
  const actSecs = {};
  sessions.forEach(s => { actSecs[s.activityName] = (actSecs[s.activityName]||0) + s.seconds; });
  yt.forEach(v => { const name = v.activity || "YouTube"; actSecs[name] = (actSecs[name]||0) + getYtEffectiveSeconds(v); });

  const entries = Object.entries(actSecs).sort((a,b)=>b[1]-a[1]).slice(0, 8);
  const max = entries[0]?.[1] || 1;
  if (!entries.some(([,v])=>v>0)) { el.innerHTML = '<div style="font-size:13px;color:var(--ink-soft)">Todavía no hay datos.</div>'; return; }
  entries.forEach(([name, secs]) => {
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label" title="${name}">${name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(secs/max*100).toFixed(1)}%"></div></div>
        <div class="bar-val">${formatHM(secs)}</div>
      </div>`;
  });
}

function renderStreak() {
  // Calculate streak: days with at least 1 session (any type)
  const daySet = new Set();
  state.sessions.filter(s => !currentLang || s.lang === currentLang).forEach(s => {
    daySet.add(new Date(s.ts).toDateString());
  });
  state.youtube.filter(v => !currentLang || v.lang === currentLang).forEach(v => {
    if (v.ts) daySet.add(new Date(v.ts).toDateString());
  });
  state.shows.filter(s => !currentLang || s.lang === currentLang).forEach(s => {
    if (s.ts) daySet.add(new Date(s.ts).toDateString());
  });
  state.movies.filter(m => !currentLang || m.lang === currentLang).forEach(m => {
    if (m.ts) daySet.add(new Date(m.ts).toDateString());
  });

  const days = [...daySet].map(d => new Date(d)).sort((a,b) => b-a);
  let streak = 0;
  let today = new Date(); today.setHours(0,0,0,0);
  let check = new Date(today);
  // Allow today or yesterday as start
  if (days.length && days[0].toDateString() !== today.toDateString() && days[0].toDateString() !== new Date(today.getTime()-86400000).toDateString()) {
    streak = 0;
  } else {
    for (const d of days) {
      if (d.toDateString() === check.toDateString()) {
        streak++;
        check = new Date(check.getTime() - 86400000);
      } else {
        break;
      }
    }
  }
  document.getElementById("streak-days").textContent = streak;
  document.getElementById("streak-label").textContent = streak === 1 ? "día consecutivo" : "días consecutivos";
  document.getElementById("streak-extra").textContent = `Total de días con actividad: ${daySet.size}`;
}

function renderHeatmap() {
  const hm = document.getElementById("heatmap");
  hm.innerHTML = "";
  const today = new Date(); today.setHours(0,0,0,0);
  const DAY_COUNT = 84; // 12 weeks

  // Build day->seconds map
  const dayMap = {};
  const addToDay = (ts, secs) => {
    const d = new Date(ts); d.setHours(0,0,0,0);
    const k = d.toDateString();
    dayMap[k] = (dayMap[k]||0) + secs;
  };
  state.sessions.filter(s => !currentLang || s.lang === currentLang).forEach(s => addToDay(s.ts, s.seconds));
  state.youtube.filter(v => !currentLang || v.lang === currentLang).forEach(v => { if (v.ts) addToDay(v.ts, getYtEffectiveSeconds(v)); });

  const vals = Object.values(dayMap).filter(v=>v>0);
  const max = vals.length ? Math.max(...vals) : 1;

  for (let i = DAY_COUNT - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const secs = dayMap[d.toDateString()] || 0;
    const level = secs === 0 ? 0 : secs < max*0.25 ? 1 : secs < max*0.5 ? 2 : secs < max*0.75 ? 3 : 4;
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.dataset.level = level;
    cell.title = `${d.toLocaleDateString('es-ES')}: ${secs ? formatHM(secs) : "sin actividad"}`;
    hm.appendChild(cell);
  }
}

/* ---------- HISTORY ---------- */

function renderHistory() {
  const list = document.getElementById("history-list");
  const filterLang = document.getElementById("filter-lang").value;
  const filterCat = document.getElementById("filter-cat").value;

  // Build full sessions list including youtube/shows/movies
  let allEntries = [];

  state.sessions.forEach(s => allEntries.push({
    title: s.activityName,
    sub: s.note || "",
    cat: s.cat,
    lang: s.lang,
    seconds: s.seconds,
    ts: s.ts,
    type: "session"
  }));
  state.youtube.forEach(v => allEntries.push({
    title: v.title,
    url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
    sub: "",
    cat: "YouTube",
    lang: v.lang || "",
    seconds: getYtEffectiveSeconds(v),
    ts: v.ts || 0,
    type: "youtube"
  }));
  state.shows.forEach(s => {
    const secs = getShowSeconds(s);
    if (secs > 0) allEntries.push({
      title: s.name,
      url: s.url || (s.tmdbId ? `https://www.themoviedb.org/tv/${s.tmdbId}` : ""),
      sub: `${s.episodesWatched} ep · ${s.activity}`,
      cat: "Series",
      lang: s.lang || "",
      seconds: secs,
      ts: s.ts || 0,
      type: "show"
    });
  });
  state.movies.forEach(m => allEntries.push({
    title: m.title,
    url: m.url || (m.tmdbId ? `https://www.themoviedb.org/movie/${m.tmdbId}` : ""),
    sub: m.year || "",
    cat: "Películas",
    lang: m.lang || "",
    seconds: getMovieEffectiveSeconds(m),
    ts: m.ts || 0,
    type: "movie"
  }));

  // Filter
  if (filterLang) allEntries = allEntries.filter(e => e.lang === filterLang);
  if (filterCat) allEntries = allEntries.filter(e => e.cat === filterCat);

  // Sort by ts descending
  allEntries.sort((a,b) => b.ts - a.ts);

  if (!allEntries.length) { list.innerHTML = '<div class="empty-state">No hay entradas que mostrar.</div>'; return; }

  list.innerHTML = allEntries.map(e => `
    <div class="history-entry">
      <div class="history-entry-main">
        <div class="history-entry-title">${e.url ? `<a href="${e.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${e.title}</a>` : e.title}</div>
        ${e.sub ? `<div class="history-entry-sub">${e.sub}</div>` : ""}
        <div style="margin-top:0.25rem;display:flex;gap:0.4rem;flex-wrap:wrap;">
          <span class="history-entry-activity">${e.cat}</span>
          ${e.lang ? `<span class="history-entry-activity" style="background:var(--blue-soft);color:var(--blue)">${e.lang}</span>` : ""}
        </div>
      </div>
      <div class="history-entry-right">
        <span class="entry-duration">${formatHMS(e.seconds)}</span>
        ${e.ts ? `<span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft)">${formatDate(e.ts)}</span>` : ""}
      </div>
    </div>`).join("");
}

// Populate filter-cat options
function populateHistoryFilters() {
  const catEl = document.getElementById("filter-cat");
  const cats = new Set(["YouTube","Series","Películas", ...ACTIVITIES.map(a=>a.cat)]);
  catEl.innerHTML = `<option value="">Todas las categorías</option>` +
    [...cats].map(c => `<option value="${c}">${c}</option>`).join("");
}

document.getElementById("filter-lang").addEventListener("change", renderHistory);
document.getElementById("filter-cat").addEventListener("change", renderHistory);

document.getElementById("export-csv").addEventListener("click", () => {
  const rows = [["Tipo","Título","Categoría","Actividad","Idioma","Duración (seg)","Duración (legible)","Nota","Fecha"]];
  state.sessions.forEach(s => rows.push([
    "Actividad", s.activityName, s.cat, s.activityId||"", s.lang, s.seconds, formatHMS(s.seconds), s.note||"",
    s.ts ? new Date(s.ts).toISOString() : ""
  ]));
  state.youtube.forEach(v => rows.push([
    "YouTube", v.title, "YouTube", v.activity||"", v.lang||"", v.seconds, formatHMS(v.seconds), v.id||"",
    v.ts ? new Date(v.ts).toISOString() : ""
  ]));
  state.shows.forEach(s => {
    const sec = getShowSeconds(s);
    if (sec) rows.push(["Serie", s.name, "Series", s.activity||"", s.lang||"", sec, formatHMS(sec), `${s.episodesWatched} ep`, ""]);
  });
  state.movies.forEach(m => rows.push([
    "Película", m.title, "Películas", "", m.lang||"", m.seconds, formatHMS(m.seconds), "",
    m.ts ? new Date(m.ts).toISOString() : ""
  ]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
  a.download = `inmersion_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
});

/* ---------- EXPORT / IMPORT JSON ---------- */

document.getElementById("export-json").addEventListener("click", () => {
  const exportData = {
    _version: 2,
    _exportedAt: new Date().toISOString(),
    languages: state.languages,
    sessions: state.sessions,
    youtube: state.youtube,
    shows: state.shows,
    movies: state.movies,
    goals: state.goals,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `inmersion_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("import-json-btn").addEventListener("click", () => {
  document.getElementById("import-json-file").click();
});

document.getElementById("import-json-file").addEventListener("change", e => {
  const file = e.target.files[0];
  const statusEl = document.getElementById("import-status");
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      // Basic validation
      if (!data.sessions || !data.languages) {
        setStatus(statusEl, "El archivo no parece un backup válido de esta app.", "err");
        return;
      }
      const mode = confirm(
        `Se van a importar:\n` +
        `• ${data.languages?.length || 0} idiomas\n` +
        `• ${data.sessions?.length || 0} sesiones de actividad\n` +
        `• ${data.youtube?.length || 0} vídeos de YouTube\n` +
        `• ${data.shows?.length || 0} series\n` +
        `• ${data.movies?.length || 0} películas\n\n` +
        `¿Qué quieres hacer?\n` +
        `• Pulsa Aceptar para FUSIONAR con los datos actuales\n` +
        `• Pulsa Cancelar para REEMPLAZAR todos tus datos actuales`
      );

      if (mode) {
        // MERGE
        const existingSessionIds = new Set(state.sessions.map(s => s.id));
        const existingYtIds = new Set(state.youtube.map(v => v.id + (v.ts||"")));
        data.languages?.forEach(l => { if (!state.languages.includes(l)) state.languages.push(l); });
        data.sessions?.forEach(s => { if (!existingSessionIds.has(s.id)) state.sessions.push(s); });
        data.youtube?.forEach(v => { if (!existingYtIds.has(v.id + (v.ts||""))) state.youtube.push(v); });
        data.shows?.forEach(sh => { if (!state.shows.find(s => s.tmdbId === sh.tmdbId && s.lang === sh.lang)) state.shows.push(sh); });
        data.movies?.forEach(m => { if (!state.movies.find(mv => mv.title === m.title && mv.lang === m.lang)) state.movies.push(m); });
        if (data.goals && !state.goals?.globalMinutes && !Object.keys(state.goals?.perLang||{}).length) {
          state.goals = data.goals;
        }
        setStatus(statusEl, `✓ Datos fusionados correctamente.`, "ok");
      } else {
        // REPLACE
        if (!confirm("⚠️ Esto borrará TODOS tus datos actuales y los reemplazará. ¿Seguro?")) {
          setStatus(statusEl, "Importación cancelada.", "");
          return;
        }
        state.languages = data.languages || ["Japonés"];
        state.sessions = data.sessions || [];
        state.youtube = data.youtube || [];
        state.shows = data.shows || [];
        state.movies = data.movies || [];
        state.goals = data.goals || { type: "global", globalMinutes: 0, perLang: {} };
        currentLang = state.languages[0] || "Japonés";
        setStatus(statusEl, `✓ Datos reemplazados correctamente.`, "ok");
      }

      saveState();
      renderAll();
      populateHistoryFilters();
      renderHistory();
    } catch (err) {
      setStatus(statusEl, `Error al leer el archivo: ${err.message}`, "err");
    }
    // Reset input so same file can be re-imported
    e.target.value = "";
  };
  reader.readAsText(file);
});

/* ---------- API KEY UI ---------- */

const apiKeyInput = document.getElementById("api-key-input");
const apiStatus = document.getElementById("api-status");

function refreshApiKeyUI() {
  const key = getApiKey();
  if (key) { apiKeyInput.value = key; apiStatus.textContent = "Clave guardada en este navegador."; apiStatus.className = "api-status show ok"; }
  else { apiStatus.textContent = ""; apiStatus.className = "api-status"; }
}

document.getElementById("api-key-save").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) { apiStatus.textContent = "Pega una clave antes de guardar."; apiStatus.className = "api-status show err"; return; }
  setApiKey(key);
  apiStatus.textContent = "Clave guardada."; apiStatus.className = "api-status show ok";
});

document.getElementById("api-key-clear").addEventListener("click", () => {
  setApiKey(""); apiKeyInput.value = "";
  apiStatus.textContent = "Clave eliminada."; apiStatus.className = "api-status show ok";
});

const tmdbKeyInput = document.getElementById("tmdb-key-input");
const tmdbStatus = document.getElementById("tmdb-status");

function refreshTmdbKeyUI() {
  const key = getTmdbKey();
  if (key) { tmdbKeyInput.value = key; tmdbStatus.textContent = "Clave guardada en este navegador."; tmdbStatus.className = "api-status show ok"; }
  else { tmdbStatus.textContent = ""; tmdbStatus.className = "api-status"; }
}

document.getElementById("tmdb-key-save").addEventListener("click", () => {
  const key = tmdbKeyInput.value.trim();
  if (!key) { tmdbStatus.textContent = "Pega una clave antes de guardar."; tmdbStatus.className = "api-status show err"; return; }
  setTmdbKey(key);
  tmdbStatus.textContent = "Clave guardada."; tmdbStatus.className = "api-status show ok";
});

document.getElementById("tmdb-key-clear").addEventListener("click", () => {
  setTmdbKey(""); tmdbKeyInput.value = "";
  tmdbStatus.textContent = "Clave eliminada."; tmdbStatus.className = "api-status show ok";
});

/* ---------- WORLD LANGUAGES LIST ---------- */

const WORLD_LANGUAGES = [
  "Abkhazo","Afar","Afrikaans","Akan","Albanés","Alemán","Amhárico","Árabe","Aragonés","Armenio",
  "Assamés","Avar","Aymara","Azerbaiyano","Bambara","Bashkir","Bascongado/Euskera","Bielorruso",
  "Bengalí","Birmano","Bislama","Bosnio","Bretón","Búlgaro","Catalán","Chamorro","Checheno",
  "Chichewa","Chino (Mandarín)","Chino (Cantonés)","Chuvash","Cingalés","Córnico","Corso",
  "Croata","Danés","Dzongkha","Eslovaco","Esloveno","Español","Esperanto","Estonio","Feroés",
  "Fiyiano","Filipino/Tagalo","Finlandés","Francés","Frisón del Norte","Fula","Gaélico Escocés",
  "Galés","Gallego","Georgiano","Griego","Guaraní","Gujarati","Hausa","Hawaiano","Hebreo",
  "Hindú/Hindi","Hmong","Húngaro","Igbo","Indonesio","Inglés","Inuktitut","Irlandés","Islandés",
  "Italiano","Japonés","Javanés","Jemer/Camboyano","Kazajo","Kinyarwanda","Kirguís","Komi",
  "Coreano","Kurdo","Laosiano","Latín","Letón","Lingala","Lituano","Luba-Katanga","Luxemburgués",
  "Macedonio","Malabar/Malayalam","Malayo","Malgache","Maltés","Maorí","Maratí","Mari","Moldavo",
  "Mongol","Náhuatl","Nepalés","Noruego Bokmål","Noruego Nynorsk","Occitano","Oriya","Osetio",
  "Pashto","Persa/Farsi","Polaco","Portugués","Punjabi","Quechua","Rumano","Ruso","Samoano",
  "Sango","Serbio","Shona","Sindhi","Somalí","Soto del Sur","Suajili/Swahili","Sueco","Sundanés",
  "Tailandés","Tamil","Tártaro","Tayiko","Telugu","Tibetano","Tigriña","Tongano","Tsuana",
  "Turco","Turcomano","Ucraniano","Uigur","Urdu","Uzbeko","Vietnamita","Volapük","Wolof",
  "Xhosa","Yakuto","Yiddish","Yoruba","Zhuang","Zulú",
  // English names for convenience
  "Afrikaans","Albanian","Amharic","Arabic","Armenian","Azerbaijani","Basque","Belarusian",
  "Bengali","Bosnian","Bulgarian","Burmese","Catalan","Chinese (Mandarin)","Chinese (Cantonese)",
  "Croatian","Czech","Danish","Dutch","English","Estonian","Filipino","Finnish","French",
  "Georgian","German","Greek","Gujarati","Hausa","Hebrew","Hindi","Hungarian","Indonesian",
  "Irish","Italian","Japanese","Javanese","Kannada","Kazakh","Khmer","Korean","Kurdish",
  "Kyrgyz","Lao","Latin","Latvian","Lithuanian","Macedonian","Malay","Malayalam","Maltese",
  "Maori","Marathi","Mongolian","Nepali","Norwegian","Pashto","Persian","Polish","Portuguese",
  "Punjabi","Romanian","Russian","Serbian","Sinhalese","Slovak","Slovenian","Somali","Spanish",
  "Swahili","Swedish","Tajik","Tamil","Telugu","Thai","Tibetan","Turkish","Turkmen","Ukrainian",
  "Urdu","Uzbek","Vietnamese","Welsh","Xhosa","Yiddish","Yoruba","Zulu"
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b, 'es'));

/* ---------- LANG AUTOCOMPLETE ---------- */

(function initLangAutocomplete() {
  const input = document.getElementById("new-lang-input");
  const dropdown = document.getElementById("lang-dropdown");
  let highlightedIndex = -1;
  let currentItems = [];

  function showDropdown(items) {
    currentItems = items;
    highlightedIndex = -1;
    if (!items.length) {
      dropdown.classList.remove("open");
      return;
    }
    dropdown.innerHTML = items.map((item, i) =>
      `<div class="lang-dropdown-item${item.isCustom ? ' custom' : ''}" data-index="${i}">${item.label}</div>`
    ).join("");
    dropdown.classList.add("open");

    dropdown.querySelectorAll(".lang-dropdown-item").forEach(el => {
      el.addEventListener("mousedown", e => {
        e.preventDefault();
        selectItem(parseInt(el.dataset.index));
      });
    });
  }

  function hideDropdown() {
    dropdown.classList.remove("open");
    highlightedIndex = -1;
  }

  function selectItem(index) {
    const item = currentItems[index];
    if (!item) return;
    input.value = item.value;
    hideDropdown();
    document.getElementById("add-lang-confirm").click();
  }

  function setHighlight(index) {
    const items = dropdown.querySelectorAll(".lang-dropdown-item");
    items.forEach(el => el.classList.remove("highlighted"));
    if (index >= 0 && index < items.length) {
      items[index].classList.add("highlighted");
      items[index].scrollIntoView({ block: "nearest" });
    }
    highlightedIndex = index;
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) { hideDropdown(); return; }

    const matches = WORLD_LANGUAGES
      .filter(l => l.toLowerCase().includes(query))
      .slice(0, 10)
      .map(l => ({ label: l, value: l, isCustom: false }));

    const exactMatch = WORLD_LANGUAGES.some(l => l.toLowerCase() === query);
    if (!exactMatch) {
      matches.push({ label: `Añadir "${input.value.trim()}"`, value: input.value.trim(), isCustom: true });
    }

    showDropdown(matches);
  });

  input.addEventListener("keydown", e => {
    if (!dropdown.classList.contains("open")) {
      if (e.key === "Enter") document.getElementById("add-lang-confirm").click();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(Math.min(highlightedIndex + 1, currentItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(Math.max(highlightedIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) selectItem(highlightedIndex);
      else document.getElementById("add-lang-confirm").click();
    } else if (e.key === "Escape") {
      hideDropdown();
    }
  });

  input.addEventListener("blur", () => setTimeout(hideDropdown, 150));
  input.addEventListener("focus", () => {
    if (input.value.trim()) input.dispatchEvent(new Event("input"));
  });
})();

/* ---------- LANG MANAGEMENT ---------- */

document.getElementById("add-lang-btn").addEventListener("click", () => {
  document.querySelector(".nav-tab[data-page='config']").click();
  document.getElementById("new-lang-input").focus();
});

document.getElementById("add-lang-confirm").addEventListener("click", () => {
  const val = document.getElementById("new-lang-input").value.trim();
  if (!val) return;
  if (state.languages.includes(val)) { alert("Ese idioma ya existe."); return; }
  state.languages.push(val);
  currentLang = val;
  saveState();
  renderAll();
  document.getElementById("new-lang-input").value = "";
});

/* removed - handled by autocomplete */

/* ---------- NAV ---------- */

document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    const pageId = "page-" + tab.dataset.page;
    document.getElementById(pageId).classList.add("active");
    if (tab.dataset.page === "stats") renderStats();
    if (tab.dataset.page === "historial") renderHistory();
    if (tab.dataset.page === "config") refreshGoalConfigUI();
  });
});

/* ---------- RESET ---------- */

document.getElementById("reset-all").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar TODOS los datos? Esta acción no se puede deshacer.")) return;
  state = { languages: ["Japonés"], sessions: [], youtube: [], shows: [], movies: [] };
  currentLang = "Japonés";
  saveState();
  renderAll();
});

/* ---------- MAIN RENDER ---------- */

function renderAll() {
  renderLangPills();
  renderTotals();
  renderGoalBar();
  renderYoutube();
  renderShows();
  renderMovies();
  // Rebuild filter-lang
  const filterLang = document.getElementById("filter-lang");
  const prev = filterLang.value;
  filterLang.innerHTML = `<option value="">Todos los idiomas</option>` +
    state.languages.map(l => `<option value="${l}">${l}</option>`).join("");
  if (prev) filterLang.value = prev;
  // Re-render stats/history if visible
  if (document.getElementById("page-stats").classList.contains("active")) renderStats();
  if (document.getElementById("page-historial").classList.contains("active")) renderHistory();
}

/* ---------- INIT ---------- */

buildActivitySelector();
populateHistoryFilters();
refreshApiKeyUI();
refreshTmdbKeyUI();
refreshGoalConfigUI();
renderAll();
