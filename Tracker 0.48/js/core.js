let state = loadState();
let currentLang = state.languages[0] || "Japonés";
let statsLangFilter = "all";

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
