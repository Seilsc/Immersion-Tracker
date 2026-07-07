/* ===========================================================
   Rastreador de inmersión lingüística — lógica de la app
   Todo se guarda en localStorage (solo en este navegador).
   =========================================================== */

const STORAGE_KEY = "lang-immersion-tracker-v1";
const API_KEY_STORAGE = "lang-immersion-yt-api-key";
const TMDB_KEY_STORAGE = "lang-immersion-tmdb-api-key";

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { youtube: [], shows: [], movies: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}

function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

function getTmdbKey() {
  return localStorage.getItem(TMDB_KEY_STORAGE) || "";
}

function setTmdbKey(key) {
  if (key) localStorage.setItem(TMDB_KEY_STORAGE, key);
  else localStorage.removeItem(TMDB_KEY_STORAGE);
}

/* ---------- helpers ---------- */

function formatHM(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// Exact format including seconds, e.g. "1h 23m 45s" or "12m 5s" or "47s"
function formatHMS(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Parses ISO 8601 durations like PT1H2M10S into seconds
function parseISODuration(iso) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Parses simple "hh:mm" / "mm:ss" / "mm" duration text into seconds
function parseSimpleDuration(str) {
  if (!str) return 0;
  str = str.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map((s) => parseInt(s, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 60);
}

// Extracts a YouTube video ID from many URL formats
function extractVideoId(url) {
  url = url.trim();
  if (!url) return null;

  // youtu.be/<id>
  let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // youtube.com/watch?v=<id>
  m = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // youtube.com/shorts/<id> or /embed/<id> or /live/<id>
  m = url.match(/youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  // Bare video ID pasted directly
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

  return null;
}

function splitMultipleLinks(raw) {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ---------- YouTube API ---------- */

async function fetchVideoDetails(videoIds) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const results = [];
  // Batch in groups of 50 (API limit)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${batch.join(
      ","
    )}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || "ERROR";
      throw new Error(reason);
    }

    for (const item of data.items || []) {
      results.push({
        id: item.id,
        title: item.snippet?.title || item.id,
        seconds: parseISODuration(item.contentDetails.duration),
      });
    }
  }
  return results;
}

/* ---------- TMDB API ---------- */

// TMDB issues two kinds of credentials:
// - "API Key" (v3 auth): short alphanumeric string, used as ?api_key=...
// - "API Read Access Token" (v4 auth): long JWT-like string starting with "eyJ",
//   used as an Authorization: Bearer header.
// We detect which one was pasted and use it correctly.
function tmdbFetch(path) {
  const key = getTmdbKey();
  if (!key) return Promise.reject(new Error("NO_TMDB_KEY"));

  const isBearerToken = key.length > 100 || key.startsWith("eyJ");

  if (isBearerToken) {
    const url = `https://api.themoviedb.org/3${path}`;
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });
  } else {
    const separator = path.includes("?") ? "&" : "?";
    const url = `https://api.themoviedb.org/3${path}${separator}api_key=${key}`;
    return fetch(url);
  }
}

async function searchTmdbShows(query) {
  const res = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&include_adult=false`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.status_message || `HTTP ${res.status}`);
  }

  return (data.results || []).slice(0, 6);
}

async function getTmdbShowDetails(tvId) {
  const res = await tmdbFetch(`/tv/${tvId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.status_message || `HTTP ${res.status}`);
  }

  return data;
}

async function searchTmdbMovies(query) {
  const res = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.status_message || `HTTP ${res.status}`);
  }

  return (data.results || []).slice(0, 6);
}

async function getTmdbMovieDetails(movieId) {
  const res = await tmdbFetch(`/movie/${movieId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.status_message || `HTTP ${res.status}`);
  }

  return data;
}



function render() {
  renderTotals();
  renderYoutube();
  renderShows();
  renderMovies();
}

function renderTotals() {
  const ytSeconds = state.youtube.reduce((sum, v) => sum + v.seconds, 0);
  const showsSeconds = state.shows.reduce(
    (sum, s) => sum + s.epDuration * 60 * s.episodesWatched,
    0
  );
  const moviesSeconds = state.movies.reduce((sum, m) => sum + m.seconds, 0);
  const grand = ytSeconds + showsSeconds + moviesSeconds;

  document.getElementById("total-grand").textContent = formatHMS(grand);
  document.getElementById("total-youtube").textContent = formatHMS(ytSeconds);
  document.getElementById("total-shows").textContent = formatHMS(showsSeconds);
  document.getElementById("total-movies").textContent = formatHMS(moviesSeconds);
}

function renderYoutube() {
  const list = document.getElementById("yt-list");
  list.innerHTML = "";

  if (state.youtube.length === 0) {
    list.innerHTML = '<div class="empty-state">Todavía no has añadido ningún vídeo.</div>';
    return;
  }

  state.youtube.forEach((video, i) => {
    const entry = document.createElement("div");
    entry.className = "entry";

    const main = document.createElement("div");
    main.className = "entry-main";

    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = video.title;

    const sub = document.createElement("span");
    sub.className = "entry-sub";
    sub.textContent = video.id;

    main.appendChild(title);
    main.appendChild(sub);

    const right = document.createElement("div");
    right.className = "entry-right";

    const duration = document.createElement("span");
    duration.className = "entry-duration";
    duration.textContent = formatHMS(video.seconds);

    const del = document.createElement("button");
    del.className = "danger-link";
    del.textContent = "eliminar";
    del.setAttribute("aria-label", "Eliminar vídeo");
    del.onclick = () => {
      state.youtube.splice(i, 1);
      saveState();
      render();
    };

    right.appendChild(duration);
    right.appendChild(del);

    entry.appendChild(main);
    entry.appendChild(right);
    list.appendChild(entry);
  });
}

function renderShows() {
  const list = document.getElementById("show-list");
  list.innerHTML = "";

  if (state.shows.length === 0) {
    list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna serie.</div>';
    return;
  }

  state.shows.forEach((show, i) => {
    const card = document.createElement("div");
    card.className = "show-card";

    const head = document.createElement("div");
    head.className = "show-card-head";

    const nameWrap = document.createElement("div");
    const name = document.createElement("div");
    name.className = "show-name";
    name.textContent = show.name;
    const meta = document.createElement("div");
    meta.className = "show-meta";
    meta.textContent = `${show.epDuration} min / episodio (TMDB)`;
    nameWrap.appendChild(name);
    nameWrap.appendChild(meta);

    const del = document.createElement("button");
    del.className = "danger-link";
    del.textContent = "eliminar";
    del.setAttribute("aria-label", `Eliminar ${show.name}`);
    del.onclick = () => {
      state.shows.splice(i, 1);
      saveState();
      render();
    };

    head.appendChild(nameWrap);
    head.appendChild(del);

    const controls = document.createElement("div");
    controls.className = "show-controls";

    const label = document.createElement("label");
    label.style.fontFamily = "var(--mono)";
    label.style.fontSize = "12px";
    label.style.color = "var(--ink-soft)";
    label.textContent = "Episodios vistos";
    label.setAttribute("for", `ep-${i}`);

    const input = document.createElement("input");
    input.type = "number";
    input.id = `ep-${i}`;
    input.className = "ep-input";
    input.min = "0";
    input.step = "1";
    input.value = show.episodesWatched;
    input.oninput = (e) => {
      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
      state.shows[i].episodesWatched = val;
      saveState();
      renderTotals();
      total.textContent = formatHMS(show.epDuration * 60 * val);
    };

    const total = document.createElement("span");
    total.className = "show-total";
    total.textContent = formatHMS(show.epDuration * 60 * show.episodesWatched);

    controls.appendChild(label);
    controls.appendChild(input);
    controls.appendChild(total);

    card.appendChild(head);
    card.appendChild(controls);
    list.appendChild(card);
  });
}

function renderMovies() {
  const list = document.getElementById("movie-list");
  list.innerHTML = "";

  if (state.movies.length === 0) {
    list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna película.</div>';
    return;
  }

  state.movies.forEach((movie, i) => {
    const entry = document.createElement("div");
    entry.className = "entry";

    const main = document.createElement("div");
    main.className = "entry-main";

    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = movie.title || "Película sin título";

    const sub = document.createElement("span");
    sub.className = "entry-sub";
    sub.textContent = movie.year || "";

    main.appendChild(title);
    if (movie.year) main.appendChild(sub);

    const right = document.createElement("div");
    right.className = "entry-right";

    const duration = document.createElement("span");
    duration.className = "entry-duration";
    duration.textContent = formatHMS(movie.seconds);

    const del = document.createElement("button");
    del.className = "danger-link";
    del.textContent = "eliminar";
    del.setAttribute("aria-label", "Eliminar película");
    del.onclick = () => {
      state.movies.splice(i, 1);
      saveState();
      render();
    };

    right.appendChild(duration);
    right.appendChild(del);

    entry.appendChild(main);
    entry.appendChild(right);
    list.appendChild(entry);
  });
}

/* ---------- event handlers ---------- */

function setStatus(el, text, type) {
  el.textContent = text;
  el.className = "status-msg" + (type ? " " + type : "");
}

document.getElementById("yt-add").addEventListener("click", async () => {
  const input = document.getElementById("yt-input");
  const statusEl = document.getElementById("yt-status");
  const raw = input.value.trim();

  if (!raw) return;

  if (!getApiKey()) {
    setStatus(statusEl, "Falta la API key de YouTube. Pégala arriba y guárdala primero.", "err");
    return;
  }

  const links = splitMultipleLinks(raw);
  const videoIds = [];
  let invalidCount = 0;

  for (const link of links) {
    const id = extractVideoId(link);
    if (id) videoIds.push(id);
    else invalidCount++;
  }

  if (videoIds.length === 0) {
    setStatus(statusEl, "No se reconoció ningún enlace válido de YouTube.", "err");
    return;
  }

  setStatus(statusEl, `Calculando duración de ${videoIds.length} vídeo(s)...`, "pending");

  try {
    const details = await fetchVideoDetails(videoIds);
    if (details.length === 0) {
      setStatus(statusEl, "La API no devolvió resultados. Comprueba los enlaces.", "err");
      return;
    }
    state.youtube.push(...details);
    saveState();
    render();

    let msg = `Añadido${details.length > 1 ? "s" : ""} ${details.length} vídeo(s).`;
    if (invalidCount > 0) msg += ` (${invalidCount} enlace(s) no reconocidos se ignoraron)`;
    setStatus(statusEl, msg, "ok");
    input.value = "";
  } catch (err) {
    if (err.message === "NO_API_KEY") {
      setStatus(statusEl, "Falta la API key de YouTube.", "err");
    } else if (err.message === "keyInvalid" || err.message === "badRequest") {
      setStatus(statusEl, "La API key no es válida. Revísala arriba.", "err");
    } else if (err.message === "quotaExceeded") {
      setStatus(statusEl, "Se agotó la cuota diaria de la API de YouTube. Intenta más tarde.", "err");
    } else {
      setStatus(statusEl, `Error al consultar la API: ${err.message}`, "err");
    }
  }
});

document.getElementById("yt-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("yt-add").click();
});

document.getElementById("show-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("show-search");
  const statusEl = document.getElementById("show-status");
  const resultsEl = document.getElementById("show-results");
  const query = input.value.trim();

  resultsEl.innerHTML = "";

  if (!query) return;

  if (!getTmdbKey()) {
    setStatus(statusEl, "Falta la API key de TMDB. Pégala arriba y guárdala primero.", "err");
    return;
  }

  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");

  try {
    const results = await searchTmdbShows(query);
    if (results.length === 0) {
      setStatus(statusEl, "No se encontraron resultados.", "err");
      return;
    }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderShowResults(results);
  } catch (err) {
    if (err.message === "NO_TMDB_KEY") {
      setStatus(statusEl, "Falta la API key de TMDB.", "err");
    } else {
      setStatus(statusEl, `Error al consultar TMDB: ${err.message}`, "err");
      console.error("TMDB search error:", err);
    }
  }
});

document.getElementById("show-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("show-search-btn").click();
});

function renderShowResults(results) {
  const resultsEl = document.getElementById("show-results");
  resultsEl.innerHTML = "";

  results.forEach((r) => {
    const entry = document.createElement("div");
    entry.className = "result-entry";

    const main = document.createElement("div");
    main.className = "result-main";

    const title = document.createElement("span");
    title.className = "result-title";
    title.textContent = r.name + (r.original_name && r.original_name !== r.name ? ` (${r.original_name})` : "");

    const sub = document.createElement("span");
    sub.className = "result-sub";
    sub.textContent = r.first_air_date ? r.first_air_date.slice(0, 4) : "sin fecha";

    main.appendChild(title);
    main.appendChild(sub);

    const addBtn = document.createElement("button");
    addBtn.textContent = "Añadir";
    addBtn.onclick = () => addShowFromTmdb(r);

    entry.appendChild(main);
    entry.appendChild(addBtn);
    resultsEl.appendChild(entry);
  });
}

async function addShowFromTmdb(result) {
  const statusEl = document.getElementById("show-status");
  setStatus(statusEl, `Obteniendo duración de episodios de "${result.name}"...`, "pending");

  try {
    const details = await getTmdbShowDetails(result.id);
    const runtimes = details.episode_run_time || [];
    let epDuration = runtimes.length > 0
      ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
      : 0;

    if (epDuration <= 0) {
      setStatus(
        statusEl,
        `TMDB no tiene la duración de episodios de "${result.name}". Puedes añadirla y editarla más tarde.`,
        "err"
      );
      epDuration = 24; // sensible default, user can be informed
    }

    state.shows.push({
      name: details.name,
      epDuration,
      episodesWatched: 0,
      tmdbId: details.id,
    });
    saveState();
    render();

    document.getElementById("show-search").value = "";
    document.getElementById("show-results").innerHTML = "";
    setStatus(statusEl, `"${details.name}" añadido (${epDuration} min/episodio).`, "ok");
  } catch (err) {
    setStatus(statusEl, `Error al obtener detalles: ${err.message}`, "err");
  }
}

document.getElementById("movie-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("movie-search");
  const statusEl = document.getElementById("movie-status");
  const resultsEl = document.getElementById("movie-results");
  const query = input.value.trim();

  resultsEl.innerHTML = "";

  if (!query) return;

  if (!getTmdbKey()) {
    setStatus(statusEl, "Falta la API key de TMDB. Pégala arriba y guárdala primero.", "err");
    return;
  }

  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");

  try {
    const results = await searchTmdbMovies(query);
    if (results.length === 0) {
      setStatus(statusEl, "No se encontraron resultados.", "err");
      return;
    }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderMovieResults(results);
  } catch (err) {
    if (err.message === "NO_TMDB_KEY") {
      setStatus(statusEl, "Falta la API key de TMDB.", "err");
    } else {
      setStatus(statusEl, `Error al consultar TMDB: ${err.message}`, "err");
      console.error("TMDB search error:", err);
    }
  }
});

document.getElementById("movie-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("movie-search-btn").click();
});

function renderMovieResults(results) {
  const resultsEl = document.getElementById("movie-results");
  resultsEl.innerHTML = "";

  results.forEach((r) => {
    const entry = document.createElement("div");
    entry.className = "result-entry";

    const main = document.createElement("div");
    main.className = "result-main";

    const title = document.createElement("span");
    title.className = "result-title";
    title.textContent = r.title + (r.original_title && r.original_title !== r.title ? ` (${r.original_title})` : "");

    const sub = document.createElement("span");
    sub.className = "result-sub";
    sub.textContent = r.release_date ? r.release_date.slice(0, 4) : "sin fecha";

    main.appendChild(title);
    main.appendChild(sub);

    const addBtn = document.createElement("button");
    addBtn.textContent = "Añadir";
    addBtn.onclick = () => addMovieFromTmdb(r);

    entry.appendChild(main);
    entry.appendChild(addBtn);
    resultsEl.appendChild(entry);
  });
}

async function addMovieFromTmdb(result) {
  const statusEl = document.getElementById("movie-status");
  setStatus(statusEl, `Obteniendo duración de "${result.title}"...`, "pending");

  try {
    const details = await getTmdbMovieDetails(result.id);
    const runtime = details.runtime || 0;

    if (runtime <= 0) {
      setStatus(statusEl, `TMDB no tiene la duración de "${result.title}".`, "err");
      return;
    }

    const year = details.release_date ? details.release_date.slice(0, 4) : "";

    state.movies.push({
      title: details.title,
      year,
      seconds: runtime * 60,
      tmdbId: details.id,
    });
    saveState();
    render();

    document.getElementById("movie-search").value = "";
    document.getElementById("movie-results").innerHTML = "";
    setStatus(statusEl, `"${details.title}" añadida (${formatHMS(runtime * 60)}).`, "ok");
  } catch (err) {
    setStatus(statusEl, `Error al obtener detalles: ${err.message}`, "err");
  }
}

document.getElementById("reset-all").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar todos los datos guardados?")) return;
  state = { youtube: [], shows: [], movies: [] };
  saveState();
  render();
});

/* ---------- API key UI ---------- */

const apiKeyInput = document.getElementById("api-key-input");
const apiStatus = document.getElementById("api-status");

function refreshApiKeyUI() {
  const key = getApiKey();
  if (key) {
    apiKeyInput.value = key;
    apiStatus.textContent = "Clave guardada en este navegador.";
    apiStatus.className = "api-status show ok";
  } else {
    apiStatus.textContent = "";
    apiStatus.className = "api-status";
  }
}

document.getElementById("api-key-save").addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiStatus.textContent = "Pega una clave antes de guardar.";
    apiStatus.className = "api-status show err";
    return;
  }
  setApiKey(key);
  apiStatus.textContent = "Clave guardada en este navegador.";
  apiStatus.className = "api-status show ok";
});

document.getElementById("api-key-clear").addEventListener("click", () => {
  setApiKey("");
  apiKeyInput.value = "";
  apiStatus.textContent = "Clave eliminada.";
  apiStatus.className = "api-status show ok";
});

const tmdbKeyInput = document.getElementById("tmdb-key-input");
const tmdbStatus = document.getElementById("tmdb-status");

function refreshTmdbKeyUI() {
  const key = getTmdbKey();
  if (key) {
    tmdbKeyInput.value = key;
    tmdbStatus.textContent = "Clave guardada en este navegador.";
    tmdbStatus.className = "api-status show ok";
  } else {
    tmdbStatus.textContent = "";
    tmdbStatus.className = "api-status";
  }
}

document.getElementById("tmdb-key-save").addEventListener("click", () => {
  const key = tmdbKeyInput.value.trim();
  if (!key) {
    tmdbStatus.textContent = "Pega una clave antes de guardar.";
    tmdbStatus.className = "api-status show err";
    return;
  }
  setTmdbKey(key);
  tmdbStatus.textContent = "Clave guardada en este navegador.";
  tmdbStatus.className = "api-status show ok";
});

document.getElementById("tmdb-key-clear").addEventListener("click", () => {
  setTmdbKey("");
  tmdbKeyInput.value = "";
  tmdbStatus.textContent = "Clave eliminada.";
  tmdbStatus.className = "api-status show ok";
});

/* ---------- init ---------- */

refreshApiKeyUI();
refreshTmdbKeyUI();
render();
