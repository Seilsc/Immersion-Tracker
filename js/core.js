let state = loadState();
let currentLang = state.languages[0] || "Japonés";
let statsLangFilter = "all";
function statsMatchLang(lang) { return statsLangFilter === "all" || lang === statsLangFilter; }

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
      normalizeStateSessions(s, true);
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

function formatHM(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
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
  return `${String(Math.floor(totalSeconds / 3600)).padStart(2,'0')}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2,'0')}:${String(totalSeconds % 60).padStart(2,'0')}`;
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

/* ---------- SEGURIDAD: escape HTML ---------- */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function escUrl(u) {
  u = String(u || "").trim();
  if (/^https?:\/\//i.test(u)) return u.replace(/"/g, "%22");
  return "";
}

/* ---------- SESIONES CANÓNICAS (Fase 0) ---------- */

function normKey(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

// Mapea cualquier activityId antiguo o sintético ("youtube-X", "show-X",
// "movie-X", "youtube-Freeflow Listening"...) al id canónico de ACTIVITIES.
function canonicalActivityId(raw) {
  if (!raw) return "freeflow-listening";
  var r = String(raw).replace(/^(youtube|show|movie)-/i, "");
  var hit = ACTIVITIES.find(function(a) {
    return normKey(a.id) === normKey(r) || normKey(a.name) === normKey(r) || normKey(a.name) === normKey(raw);
  });
  return hit ? hit.id : "freeflow-listening";
}

function makeSessionId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.floor(Math.random() * 1e9);
}

// Fábrica única de sesiones: sanea tipos, recorta nota, impide ts futuro.
function makeSession(fields) {
  var f = fields || {};
  var now = Date.now();
  var act = getActivityById(f.activityId) || getActivityById(canonicalActivityId(f.activityId));
  if (!act) act = getActivityById("freeflow-listening");
  return {
    id: f.id != null && f.id !== "" ? f.id : makeSessionId(),
    activityId: act.id,
    activityName: act.name,
    cat: f.cat || act.cat,
    lang: f.lang || (typeof currentLang !== "undefined" ? currentLang : "Japonés"),
    note: String(f.note || "").slice(0, 200),
    url: f.url || "",
    seconds: Math.max(0, Math.round(f.seconds || 0)),
    ts: Math.min(f.ts || now, now),
    source: f.source || "manual",
  };
}

// Normaliza sesiones guardadas por versiones antiguas. Si persist=true,
// guarda el resultado (llamada desde loadState, donde `state` aún no existe).
function normalizeStateSessions(s, persist) {
  if (!s || !Array.isArray(s.sessions)) return 0;
  var now = Date.now(), changed = 0;
  s.sessions.forEach(function(ses) {
    var canon = canonicalActivityId(ses.activityId);
    var act = getActivityById(canon);
    if (act && (ses.activityId !== act.id || ses.activityName !== act.name)) {
      ses.activityId = act.id; ses.activityName = act.name; changed++;
    }
    if (!ses.source) {
      ses.source = (/youtu\.?be|youtube|tmdb/i.test(ses.url || "") || /^(YouTube|Series|Pel)/.test(ses.cat || "")) ? "media" : "manual";
      changed++;
    }
    if (ses.ts && ses.ts > now) { ses.ts = now; changed++; }
    if (ses.cat === "Película") { ses.cat = "Películas"; changed++; }
    if (ses.id == null || ses.id === "") { ses.id = makeSessionId(); changed++; }
    if (ses.seconds != null) ses.seconds = Math.max(0, Math.round(ses.seconds));
  });
  if (changed && persist) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    console.info("Sesiones normalizadas:", changed);
  }
  return changed;
}
