/* ===========================================================
   Integración con APIs de YouTube y TMDB
   Se usa para calcular automáticamente la duración del contenido
   en actividades cuyo tiempo = duración del contenido consumido
   (p.ej. Freeflow Reading w/ Audio, Freeflow Listening...).
   Las claves se guardan solo en este navegador (localStorage).
   =========================================================== */

const YT_API_KEY_STORAGE = "immersion_yt_api_key";
const TMDB_API_KEY_STORAGE = "immersion_tmdb_api_key";

function getYtKey() {
  return localStorage.getItem(YT_API_KEY_STORAGE) || "";
}
function setYtKey(key) {
  if (key) localStorage.setItem(YT_API_KEY_STORAGE, key);
  else localStorage.removeItem(YT_API_KEY_STORAGE);
}
function getTmdbKey() {
  return localStorage.getItem(TMDB_API_KEY_STORAGE) || "";
}
function setTmdbKey(key) {
  if (key) localStorage.setItem(TMDB_API_KEY_STORAGE, key);
  else localStorage.removeItem(TMDB_API_KEY_STORAGE);
}

// ---------- helpers de formato/parsing ----------

// PT1H2M10S -> segundos
function parseISODuration(iso) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Extrae el ID de vídeo de muchos formatos de URL de YouTube
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

function splitMultipleLinks(raw) {
  return raw
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ---------- YouTube Data API v3 ----------

async function fetchVideoDetails(videoIds) {
  const apiKey = getYtKey();
  if (!apiKey) throw new Error("NO_API_KEY");

  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${batch.join(",")}&key=${apiKey}`;
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
        seconds: parseISODuration(item.contentDetails.duration)
      });
    }
  }
  return results;
}

// ---------- TMDB ----------

// TMDB acepta "API Key" (v3, string corto) o "API Read Access Token" (v4, JWT largo).
function tmdbFetch(path) {
  const key = getTmdbKey();
  if (!key) return Promise.reject(new Error("NO_TMDB_KEY"));

  const isBearerToken = key.length > 100 || key.startsWith("eyJ");

  if (isBearerToken) {
    const url = `https://api.themoviedb.org/3${path}`;
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      }
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
