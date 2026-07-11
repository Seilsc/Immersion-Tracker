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
  if (!getApiKey()) { setStatus(statusEl, "Falta la API key de YouTube. Configúrala en la pestaña Config.", "err"); return; }
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
    const activity = "Freeflow Listening";
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
document.getElementById("yt-playlist-input").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("yt-playlist-add").click(); });

function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const list = u.searchParams.get("list");
      if (list) return list;
    }
  } catch {}
  return null;
}

document.getElementById("yt-playlist-add").addEventListener("click", async () => {
  const input = document.getElementById("yt-playlist-input");
  const statusEl = document.getElementById("yt-status");
  const raw = input.value.trim();
  if (!raw) return;
  const playlistId = extractPlaylistId(raw);
  if (!playlistId) { setStatus(statusEl, "No se reconoció un enlace de playlist válido.", "err"); return; }
  const apiKey = getApiKey();
  if (!apiKey) { setStatus(statusEl, "Falta la API key de YouTube. Configúrala en Config.", "err"); return; }
  setStatus(statusEl, "Obteniendo vídeos de la playlist...", "pending");
  try {
    const allIds = [];
    let nextToken = "";
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}${nextToken ? "&pageToken=" + nextToken : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.errors?.[0]?.reason || "ERROR");
      for (const item of data.items || []) {
        if (item.contentDetails?.videoId) allIds.push(item.contentDetails.videoId);
      }
      nextToken = data.nextPageToken || "";
    } while (nextToken);
    if (!allIds.length) { setStatus(statusEl, "La playlist está vacía o no se encontraron vídeos.", "err"); return; }
    setStatus(statusEl, `Obteniendo duración de ${allIds.length} vídeo(s)...`, "pending");
    const details = await fetchVideoDetails(allIds);
    if (!details.length) { setStatus(statusEl, "La API no devolvió resultados.", "err"); return; }
    const lang = document.getElementById("yt-lang").value || currentLang;
    const activity = "Freeflow Listening";
    const enriched = details.map(d => ({
      ...d,
      lang,
      activity,
      url: `https://www.youtube.com/watch?v=${d.id}`,
      ts: Date.now(),
    }));
    state.youtube.push(...enriched);
    saveState();
    renderAll();
    setStatus(statusEl, `Playlist importada: ${enriched.length} vídeo(s) añadidos.`, "ok");
    input.value = "";
  } catch (err) {
    if (err.message === "NO_API_KEY") setStatus(statusEl, "Falta la API key de YouTube.", "err");
    else if (err.message === "keyInvalid") setStatus(statusEl, "La API key no es válida.", "err");
    else if (err.message === "quotaExceeded") setStatus(statusEl, "Cuota diaria de la API agotada.", "err");
    else setStatus(statusEl, `Error: ${err.message}`, "err");
  }
});

// Shared media time controls
const mediaTimers = {};

function renderMediaTimeControls(idx, type, currentSec, autoSec) {
  const key = `${type}-${idx}`;
  return `<div class="media-time-tabs" id="mtabs-${key}" style="display:flex;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:0.6rem;">
      <button class="time-mode-tab active" id="mtab-manual-${key}" onclick="switchMediaTab('${key}','manual')">Manual</button>
      <button class="time-mode-tab" id="mtab-timer-${key}" onclick="switchMediaTab('${key}','timer')">Cronómetro</button>
      <button class="time-mode-tab" id="mtab-auto-${key}" onclick="switchMediaTab('${key}','auto')">Automático</button>
    </div>
    <div id="mmanual-${key}" style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <div class="num-stepper"><input type="number" id="mman-h-${key}" placeholder="h" min="0" max="23" style="width:44px;" /><div class="num-stepper-btns"><button type="button" class="num-stepper-btn plus" data-target="mman-h-${key}">▴</button><button type="button" class="num-stepper-btn minus" data-target="mman-h-${key}">▾</button></div></div>
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">h</span>
      <div class="num-stepper"><input type="number" id="mman-m-${key}" placeholder="m" min="0" max="59" style="width:44px;" /><div class="num-stepper-btns"><button type="button" class="num-stepper-btn plus" data-target="mman-m-${key}">▴</button><button type="button" class="num-stepper-btn minus" data-target="mman-m-${key}">▾</button></div></div>
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">m</span>
      <div class="num-stepper"><input type="number" id="mman-s-${key}" placeholder="s" min="0" max="59" style="width:44px;" /><div class="num-stepper-btns"><button type="button" class="num-stepper-btn plus" data-target="mman-s-${key}">▴</button><button type="button" class="num-stepper-btn minus" data-target="mman-s-${key}">▾</button></div></div>
      <span style="font-family:var(--mono);font-size:13px;color:var(--ink-soft);">s</span>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" onclick="saveMediaManual('${key}','${type}',${idx})">Guardar</button>
      <span class="show-total" id="mtime-display-${key}">${currentSec > 0 ? formatHMS(currentSec) : '—'}</span>
    </div>
    <div id="mtimer-${key}" style="display:none;align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <span class="timer-display" id="mtimerdisp-${key}" style="font-size:1.5rem;min-width:100px;">00:00:00</span>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" id="mstart-${key}" onclick="startMediaTimer('${key}','${type}',${idx})"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></span> Iniciar</button>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" id="mpause-${key}" onclick="pauseMediaTimer('${key}')" disabled><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></span> Pausa</button>
      <button style="padding:0.4rem 0.8rem;font-size:12px;" id="mstop-${key}" onclick="stopMediaTimer('${key}','${type}',${idx})" disabled><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg></span> Guardar</button>
      <span class="show-total" id="mtime-display-${key}-t">${currentSec > 0 ? formatHMS(currentSec) : '—'}</span>
    </div>
    <div id="mauto-${key}" style="display:none;align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <span class="show-total">${formatHMS(autoSec)}</span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);">${autoSec > 0 ? 'duración automática' : 'indica episodios vistos para calcular la duración'}</span>
      <button class="secondary" style="padding:0.4rem 0.8rem;font-size:12px;" onclick="saveMediaAuto('${key}','${type}',${idx},${autoSec})" ${autoSec <= 0 ? 'disabled' : ''}>Guardar</button>
      <span class="show-total" id="mtime-display-${key}-a"></span>
    </div>`;
}

window.switchMediaTab = function(key, mode) {
  document.getElementById(`mtab-manual-${key}`).classList.toggle('active', mode === 'manual');
  document.getElementById(`mtab-timer-${key}`).classList.toggle('active', mode === 'timer');
  const autoTab = document.getElementById(`mtab-auto-${key}`);
  if (autoTab) autoTab.classList.toggle('active', mode === 'auto');
  document.getElementById(`mmanual-${key}`).style.display = mode === 'manual' ? 'flex' : 'none';
  document.getElementById(`mtimer-${key}`).style.display = mode === 'timer' ? 'flex' : 'none';
  const autoPanel = document.getElementById(`mauto-${key}`);
  if (autoPanel) autoPanel.style.display = mode === 'auto' ? 'flex' : 'none';
  if (mode !== 'timer' && mediaTimers[key]) pauseMediaTimer(key);
};

window.saveMediaAuto = function(key, type, idx, autoSec) {
  if (autoSec <= 0) return;
  if (type === 'yt') { state.youtube[idx].manualSeconds = autoSec; state.youtube[idx].ts = Date.now(); }
  else if (type === 'movie') { state.movies[idx].manualSeconds = autoSec; state.movies[idx].ts = Date.now(); }
  else if (type === 'show') { state.shows[idx].manualSeconds = autoSec; state.shows[idx].ts = Date.now(); }
  saveState();
  const disp = document.getElementById(`mtime-display-${key}-a`);
  if (disp) disp.textContent = '✓ ' + formatHMS(autoSec);
  renderTotals();
  renderGoalBar();
};

window.saveMediaManual = function(key, type, idx) {
  const h = parseInt(document.getElementById(`mman-h-${key}`).value) || 0;
  const m = parseInt(document.getElementById(`mman-m-${key}`).value) || 0;
  const s = parseInt(document.getElementById(`mman-s-${key}`).value) || 0;
  const totalSec = h*3600 + m*60 + s;
  if (totalSec <= 0) return;
  if (type === 'yt') { state.youtube[idx].manualSeconds = totalSec; state.youtube[idx].ts = Date.now(); }
  else if (type === 'movie') { state.movies[idx].manualSeconds = totalSec; state.movies[idx].ts = Date.now(); }
  else if (type === 'show') { state.shows[idx].manualSeconds = totalSec; state.shows[idx].ts = Date.now(); }
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
  else if (type === 'show') { state.shows[idx].manualSeconds = secs; state.shows[idx].ts = Date.now(); }
  saveState();
  const disp = document.getElementById(`mtime-display-${key}-t`);
  if (disp) disp.textContent = formatHMS(secs);
  renderTotals();
  renderGoalBar();
};

function getYtEffectiveSeconds(video) {
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === video.activity);
  if (actDef && actDef.manualTime) return video.manualSeconds || 0;
  return video.seconds;
}

function getMovieEffectiveSeconds(movie) {
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === movie.activity);
  if (actDef && actDef.manualTime) return movie.manualSeconds || 0;
  return movie.seconds;
}

function getShowSeconds(show) {
  const actDef = SHOW_ACTIVITIES.find(a => a.value === show.activity);
  if (actDef && actDef.manualTime) return (show.manualMinutes?.[show.activity] || 0) * 60;
  return show.epDuration * 60 * show.episodesWatched;
}

// YouTube render
function renderYoutube() {
  const list = document.getElementById("yt-list");
  list.innerHTML = "";
  const filtered = state.youtube.filter(v => !currentLang || v.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ningún vídeo.</div>'; return; }
  filtered.forEach((video) => {
    const realIdx = state.youtube.indexOf(video);
    const actOptions = MEDIA_ACTIVITIES.map(a => `<option value="${a.value}"${video.activity === a.value ? " selected" : ""}>${a.label}${a.manualTime ? " ⏱" : ""}</option>`).join("");
    const actDef = MEDIA_ACTIVITIES.find(a => a.value === video.activity);
    const isManual = actDef && actDef.manualTime;
    const effectiveSec = getYtEffectiveSeconds(video);
    const entry = document.createElement("div");
    entry.className = "show-card";
    entry.innerHTML = `
      <div class="show-card-head"><div><div class="show-name"><a href="${video.url || `https://www.youtube.com/watch?v=${video.id}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${video.title}</a></div><div class="show-meta">${video.lang || ""} · duración: ${formatHMS(video.seconds)}</div></div><button class="danger-link" onclick="removeYt(${realIdx})">eliminar</button></div>
      <div class="show-controls"><label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Actividad</label><select class="show-activity-select" id="yt-act-${realIdx}">${actOptions}</select></div>
      ${isManual ? `<div class="show-controls" style="margin-top:0.5rem;"><span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Actividad interactiva — registra tu tiempo real:</span></div><div class="yt-time-controls" id="yt-time-ctrl-${realIdx}" style="margin-top:0.5rem;">${renderMediaTimeControls(realIdx, 'yt', video.manualSeconds || 0, video.seconds)}</div>` : `<div class="show-controls" style="margin-top:0.5rem;"><span class="show-total">${formatHMS(effectiveSec)}</span></div>`}
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--line);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;"><button class="accent" style="font-size:13px;padding:0.45rem 1rem;" onclick="saveYtSession(${realIdx})"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Guardar sesión</button><span class="status-msg" id="yt-save-status-${realIdx}" style="margin:0;"></span></div>`;
    list.appendChild(entry);
    entry.querySelector(`#yt-act-${realIdx}`).addEventListener("change", (e) => {
      state.youtube[realIdx].activity = e.target.value;
      saveState();
      renderYoutube();
    });
  });
}

window.removeYt = function(i) { state.youtube.splice(i,1); saveState(); renderAll(); };

window.saveYtSession = function(i) {
  const video = state.youtube[i];
  if (!video) return;
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === video.activity);
  const isManual = actDef && actDef.manualTime;
  let seconds;
  if (isManual) {
    seconds = video.manualSeconds || 0;
    if (seconds <= 0) {
      const statusEl = document.getElementById(`yt-save-status-${i}`);
      if (statusEl) setStatus(statusEl, "Registra primero el tiempo con el cronómetro o manual.", "err");
      return;
    }
  } else {
    seconds = video.seconds;
  }
  state.sessions.push({
    id: Date.now(), activityId: "youtube-" + (video.activity || "freeflow-listening"),
    activityName: video.activity || "Freeflow Listening", cat: "YouTube",
    lang: video.lang || currentLang, note: video.title,
    url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
    seconds, ts: Date.now(),
  });
  state.youtube.splice(i, 1);
  saveState();
  renderAll();
};

// TMDB
async function searchTmdbShows(query) {
  const key = getTmdbKey();
  if (!key) throw new Error("NO_TMDB_KEY");
  const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&language=es-ES&page=1&api_key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || "ERROR_TMDB");
  return data.results || [];
}

async function searchTmdbMovies(query) {
  const key = getTmdbKey();
  if (!key) throw new Error("NO_TMDB_KEY");
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=es-ES&page=1&api_key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.status_message || "ERROR_TMDB");
  return data.results || [];
}

async function getTmdbShowDetails(id) {
  const key = getTmdbKey();
  const url = `https://api.themoviedb.org/3/tv/${id}?language=es-ES&api_key=${key}`;
  const res = await fetch(url);
  return res.json();
}

async function getTmdbMovieDetails(id) {
  const key = getTmdbKey();
  const url = `https://api.themoviedb.org/3/movie/${id}?language=es-ES&api_key=${key}`;
  const res = await fetch(url);
  return res.json();
}

async function getTmdbSeasonEpisodes(showId, seasonNum) {
  const key = getTmdbKey();
  const url = `https://api.themoviedb.org/3/tv/${showId}/season/${seasonNum}?language=es-ES&api_key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.episodes || []).map(e => e.runtime).filter(Boolean);
}

// TMDB Add Dialog
let _pendingTmdbItem = null;
let _pendingTmdbType = null; // "show" or "movie"

function populateTmdbDialog() {
  var sel = document.getElementById("tmdb-add-lang");
  if (sel && !sel.options.length) {
    var langs = document.getElementById("show-lang");
    if (langs) {
      Array.from(langs.options).forEach(function(o) {
        sel.appendChild(new Option(o.text, o.value));
      });
    }
  }
  var actSel = document.getElementById("tmdb-add-activity");
  if (actSel && !actSel.options.length) {
    (window.MEDIA_ACTIVITIES || window.SHOW_ACTIVITIES || []).forEach(function(a) {
      actSel.appendChild(new Option(a.label + (a.manualTime ? " ⏱" : ""), a.value));
    });
  }
}

document.getElementById("tmdb-add-confirm").addEventListener("click", function() {
  if (!_pendingTmdbItem) return;
  var lang = document.getElementById("tmdb-add-lang").value;
  var activity = document.getElementById("tmdb-add-activity").value;
  var ep = parseInt(document.getElementById("tmdb-add-ep").value) || 0;
  document.getElementById("tmdb-add-overlay").style.display = "none";
  if (_pendingTmdbType === "show") {
    addShowFromTmdb(_pendingTmdbItem, lang, activity, ep);
  } else {
    addMovieFromTmdb(_pendingTmdbItem, lang, activity);
  }
  _pendingTmdbItem = null;
});

document.getElementById("tmdb-add-cancel").addEventListener("click", function() {
  document.getElementById("tmdb-add-overlay").style.display = "none";
  _pendingTmdbItem = null;
});

// Shows
document.getElementById("show-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("show-search");
  const statusEl = document.getElementById("show-status");
  const resultsEl = document.getElementById("show-results");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  if (!query) return;
  if (!getTmdbKey()) { setStatus(statusEl, "Falta la API key de TMDB. Configúrala en la pestaña Config.", "err"); return; }
  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");
  try {
    const results = await searchTmdbShows(query);
    if (!results.length) { setStatus(statusEl, "No se encontraron resultados.", "err"); return; }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderShowResults(results);
  } catch (err) { setStatus(statusEl, `Error: ${err.message}`, "err"); }
});
document.getElementById("show-search").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("show-search-btn").click(); });

function renderShowResults(results) {
  const resultsEl = document.getElementById("show-results");
  resultsEl.innerHTML = "";
  results.forEach(r => {
    const entry = document.createElement("div");
    entry.className = "result-entry";
    entry.innerHTML = `<div class="result-main"><span class="result-title">${r.name}${r.original_name && r.original_name !== r.name ? ` (${r.original_name})` : ""}</span><span class="result-sub">${r.first_air_date ? r.first_air_date.slice(0,4) : "sin fecha"}</span></div><button>Añadir</button>`;
    entry.querySelector("button").onclick = () => {
      _pendingTmdbItem = r;
      _pendingTmdbType = "show";
      populateTmdbDialog();
      document.getElementById("tmdb-add-title").textContent = "Añadir serie: " + r.name;
      document.getElementById("tmdb-add-ep-field").style.display = "block";
      document.getElementById("tmdb-add-ep").value = "0";
      document.getElementById("tmdb-add-overlay").style.display = "flex";
    };
    resultsEl.appendChild(entry);
  });
}

async function addShowFromTmdb(result, lang, activity, ep) {
  const statusEl = document.getElementById("show-status");
  setStatus(statusEl, `Obteniendo duración de episodios de "${result.name}"...`, "pending");
  try {
    const details = await getTmdbShowDetails(result.id);
    let runtimes = details.episode_run_time || [];
    if (runtimes.length === 0) {
      for (let s = 1; s <= (details.number_of_seasons || 1); s++) {
        try { runtimes = await getTmdbSeasonEpisodes(result.id, s); if (runtimes.length > 0) break; } catch (_) {}
      }
    }
    let epDuration = runtimes.length > 0 ? Math.round(runtimes.reduce((a,b)=>a+b,0)/runtimes.length) : 0;
    if (epDuration <= 0) epDuration = 24;
    state.shows.push({ name: details.name, epDuration, episodesWatched: ep, tmdbId: details.id, url: `https://www.themoviedb.org/tv/${details.id}`, lang: lang || document.getElementById("show-lang").value || currentLang, activity: activity || "Freeflow Listening", manualMinutes: {}, ts: Date.now() });
    saveState();
    renderAll();
    document.getElementById("show-search").value = "";
    document.getElementById("show-results").innerHTML = "";
    setStatus(statusEl, `"${details.name}" añadido (${epDuration} min/episodio, ${ep} ep.).`, "ok");
  } catch (err) { setStatus(statusEl, `Error: ${err.message}`, "err"); }
}

function renderShows() {
  const list = document.getElementById("show-list");
  list.innerHTML = "";
  const filtered = state.shows.filter(s => !currentLang || s.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna serie.</div>'; return; }
  filtered.forEach((show) => {
    const i = state.shows.indexOf(show);
    const actDef = SHOW_ACTIVITIES.find(a => a.value === show.activity) || SHOW_ACTIVITIES[0];
    const isManualAct = actDef.manualTime;
    const epSec = show.epDuration * 60 * (show.episodesWatched || 0);
    const actOptions = SHOW_ACTIVITIES.map(a => `<option value="${a.value}"${show.activity === a.value ? " selected" : ""}>${a.label}${a.manualTime ? " ⏱" : ""}</option>`).join("");
    const card = document.createElement("div");
    card.className = "show-card";
    card.innerHTML = `
      <div class="show-card-head"><div><div class="show-name"><a href="${show.url || `https://www.themoviedb.org/tv/${show.tmdbId}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${show.name}</a></div><div class="show-meta">${show.epDuration} min/ep · ${show.lang} · TMDB</div></div><button class="danger-link" onclick="removeShow(${i})">eliminar</button></div>
      <div class="show-controls"><label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Actividad</label><select class="show-activity-select" id="show-act-${i}">${actOptions}</select></div>
      <div class="show-controls" style="margin-top:0.5rem;"><label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Episodios vistos</label>
        <div class="num-stepper"><input type="number" id="ep-${i}" min="0" value="${show.episodesWatched || 0}" /><div class="num-stepper-btns"><button type="button" class="num-stepper-btn plus" data-target="ep-${i}">▴</button><button type="button" class="num-stepper-btn minus" data-target="ep-${i}">▾</button></div></div>
        <span class="show-total" id="show-ep-total-${i}">${formatHMS(epSec)}</span></div>
      ${isManualAct ? `<div style="margin-top:0.6rem;"><span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Actividad interactiva — registra tu tiempo real:</span><div style="margin-top:0.4rem;">${renderMediaTimeControls(i, 'show', show.manualSeconds || 0, epSec)}</div></div>` : ``}
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--line);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;"><button class="accent" style="font-size:13px;padding:0.45rem 1rem;" onclick="saveShowSession(${i})"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Guardar sesión</button><span class="status-msg" id="show-save-status-${i}" style="margin:0;"></span></div>`;
    list.appendChild(card);
    card.querySelector(`#show-act-${i}`).addEventListener("change", (e) => { state.shows[i].activity = e.target.value; saveState(); renderShows(); });
    const epInputEl = card.querySelector(`#ep-${i}`);
    epInputEl.addEventListener("input", (e) => {
      const val = Math.max(0, parseInt(e.target.value)||0);
      state.shows[i].episodesWatched = val;
      saveState();
      document.getElementById(`show-ep-total-${i}`).textContent = formatHMS(show.epDuration*60*val);
    });
    epInputEl.addEventListener("change", () => { renderShows(); });
  });
}

window.removeShow = function(i) { state.shows.splice(i,1); saveState(); renderAll(); };

window.saveShowSession = function(i) {
  const show = state.shows[i];
  if (!show) return;
  const statusEl = document.getElementById(`show-save-status-${i}`);
  const actDef = SHOW_ACTIVITIES.find(a => a.value === show.activity) || SHOW_ACTIVITIES[0];
  const isManualAct = actDef.manualTime;
  let seconds;
  if (isManualAct) {
    seconds = show.manualSeconds || 0;
    if (seconds <= 0) { if (statusEl) setStatus(statusEl, "Registra primero el tiempo con el cronómetro o manual.", "err"); return; }
  } else {
    const eps = show.episodesWatched || 0;
    if (eps <= 0) { if (statusEl) setStatus(statusEl, "Introduce primero los episodios vistos.", "err"); return; }
    seconds = show.epDuration * 60 * eps;
  }
  const epInfo = show.episodesWatched > 0 ? ` · ${show.episodesWatched} ep` : "";
  state.sessions.push({
    id: Date.now(), activityId: "show-" + (show.activity || "freeflow-listening"),
    activityName: show.activity || "Freeflow Listening", cat: "Series",
    lang: show.lang || currentLang, note: show.name + epInfo,
    url: show.url || (show.tmdbId ? `https://www.themoviedb.org/tv/${show.tmdbId}` : ""),
    seconds, ts: Date.now(),
  });
  state.shows.splice(i, 1);
  saveState();
  renderAll();
};

// Movies
document.getElementById("movie-search-btn").addEventListener("click", async () => {
  const input = document.getElementById("movie-search");
  const statusEl = document.getElementById("movie-status");
  const resultsEl = document.getElementById("movie-results");
  const query = input.value.trim();
  resultsEl.innerHTML = "";
  if (!query) return;
  if (!getTmdbKey()) { setStatus(statusEl, "Falta la API key de TMDB. Configúrala en la pestaña Config.", "err"); return; }
  setStatus(statusEl, `Buscando "${query}" en TMDB...`, "pending");
  try {
    const results = await searchTmdbMovies(query);
    if (!results.length) { setStatus(statusEl, "No se encontraron resultados.", "err"); return; }
    setStatus(statusEl, `${results.length} resultado(s) encontrados:`, "ok");
    renderMovieResults(results);
  } catch (err) { setStatus(statusEl, `Error: ${err.message}`, "err"); }
});
document.getElementById("movie-search").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("movie-search-btn").click(); });

function renderMovieResults(results) {
  const resultsEl = document.getElementById("movie-results");
  resultsEl.innerHTML = "";
  results.forEach(r => {
    const entry = document.createElement("div");
    entry.className = "result-entry";
    entry.innerHTML = `<div class="result-main"><span class="result-title">${r.title}${r.original_title && r.original_title !== r.title ? ` (${r.original_title})` : ""}</span><span class="result-sub">${r.release_date ? r.release_date.slice(0,4) : "sin fecha"}</span></div><button>Añadir</button>`;
    entry.querySelector("button").onclick = () => {
      _pendingTmdbItem = r;
      _pendingTmdbType = "movie";
      populateTmdbDialog();
      document.getElementById("tmdb-add-title").textContent = "Añadir película: " + r.title;
      document.getElementById("tmdb-add-ep-field").style.display = "none";
      document.getElementById("tmdb-add-overlay").style.display = "flex";
    };
    resultsEl.appendChild(entry);
  });
}

async function addMovieFromTmdb(result, lang, activity) {
  const statusEl = document.getElementById("movie-status");
  setStatus(statusEl, `Obteniendo duración de "${result.title}"...`, "pending");
  try {
    const details = await getTmdbMovieDetails(result.id);
    const runtime = details.runtime || 0;
    if (runtime <= 0) { setStatus(statusEl, `TMDB no tiene la duración de "${result.title}".`, "err"); return; }
    state.movies.push({ title: details.title, year: details.release_date?.slice(0,4) || "", seconds: runtime*60, tmdbId: details.id, url: `https://www.themoviedb.org/movie/${details.id}`, lang: lang || document.getElementById("movie-lang").value || currentLang, activity: activity || "Freeflow Listening", ts: Date.now() });
    saveState();
    renderAll();
    document.getElementById("movie-search").value = "";
    document.getElementById("movie-results").innerHTML = "";
    setStatus(statusEl, `"${details.title}" añadida (${formatHMS(runtime*60)}).`, "ok");
  } catch (err) { setStatus(statusEl, `Error: ${err.message}`, "err"); }
}

function renderMovies() {
  const list = document.getElementById("movie-list");
  list.innerHTML = "";
  const filtered = state.movies.filter(m => !currentLang || m.lang === currentLang);
  if (!filtered.length) { list.innerHTML = '<div class="empty-state">Todavía no has añadido ninguna película.</div>'; return; }
  filtered.forEach(movie => {
    const realIdx = state.movies.indexOf(movie);
    const actDef = MEDIA_ACTIVITIES.find(a => a.value === movie.activity) || MEDIA_ACTIVITIES[0];
    const isManualAct = actDef.manualTime;
    const actOptions = MEDIA_ACTIVITIES.map(a => `<option value="${a.value}"${movie.activity === a.value ? " selected" : ""}>${a.label}${a.manualTime ? " ⏱" : ""}</option>`).join("");
    const entry = document.createElement("div");
    entry.className = "show-card";
    entry.innerHTML = `
      <div class="show-card-head"><div><div class="show-name"><a href="${movie.url || `https://www.themoviedb.org/movie/${movie.tmdbId}`}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${movie.title || "Película sin título"}</a></div><div class="show-meta">${movie.lang || ""} · ${movie.year || ""} · duración TMDB: ${formatHMS(movie.seconds)}</div></div><button class="danger-link" onclick="removeMovie(${realIdx})">eliminar</button></div>
      <div class="show-controls"><label style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);">Actividad</label><select class="show-activity-select" id="movie-act-${realIdx}">${actOptions}</select></div>
      ${isManualAct ? `<div style="margin-top:0.6rem;"><span style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Actividad interactiva — registra tu tiempo real:</span><div style="margin-top:0.4rem;">${renderMediaTimeControls(realIdx, 'movie', movie.manualSeconds || 0, movie.seconds)}</div></div>` : ``}
      <div style="margin-top:0.75rem;padding-top:0.6rem;border-top:1px solid var(--line);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;"><button class="accent" style="font-size:13px;padding:0.45rem 1rem;" onclick="saveMovieSession(${realIdx})"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span> Guardar sesión</button><span class="status-msg" id="movie-save-status-${realIdx}" style="margin:0;"></span></div>`;
    list.appendChild(entry);
    entry.querySelector(`#movie-act-${realIdx}`).addEventListener("change", (e) => { state.movies[realIdx].activity = e.target.value; saveState(); renderMovies(); });
  });
}

window.removeMovie = function(i) { state.movies.splice(i,1); saveState(); renderAll(); };

window.saveMovieSession = function(i) {
  const movie = state.movies[i];
  if (!movie) return;
  const statusEl = document.getElementById(`movie-save-status-${i}`);
  const actDef = MEDIA_ACTIVITIES.find(a => a.value === movie.activity) || MEDIA_ACTIVITIES[0];
  const isManualAct = actDef.manualTime;
  let seconds;
  if (isManualAct) {
    seconds = movie.manualSeconds || 0;
    if (seconds <= 0) { if (statusEl) setStatus(statusEl, "Registra primero el tiempo con el cronómetro o manual.", "err"); return; }
  } else { seconds = movie.seconds; }
  state.sessions.push({
    id: Date.now(), activityId: "movie-" + (movie.activity || "freeflow-listening"),
    activityName: movie.activity || "Freeflow Listening", cat: "Películas",
    lang: movie.lang || currentLang, note: movie.title + (movie.year ? ` (${movie.year})` : ""),
    url: movie.url || (movie.tmdbId ? `https://www.themoviedb.org/movie/${movie.tmdbId}` : ""),
    seconds, ts: Date.now(),
  });
  state.movies.splice(i, 1);
  saveState();
  renderAll();
};
