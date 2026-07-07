/* ---------- EXPORT / IMPORT JSON ---------- */

document.getElementById("export-json").addEventListener("click", () => {
  const displayPrefs = {};
  Object.entries(DISPLAY_PREFS).forEach(([name, { key }]) => {
    const val = localStorage.getItem(key);
    if (val !== null) displayPrefs[name] = val === "true";
  });
  const exportData = {
    _version: 4, _exportedAt: new Date().toISOString(),
    languages: state.languages, sessions: state.sessions,
    youtube: state.youtube, shows: state.shows, movies: state.movies,
    goals: state.goals, displayPrefs,
    darkMode: localStorage.getItem(DARK_KEY) === "true",
    apiKeyYoutube: getApiKey() || null,
    apiKeyTmdb: getTmdbKey() || null,
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
        setStatus(statusEl, "✓ Datos fusionados correctamente.", "ok");
      } else {
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
        setStatus(statusEl, "✓ Datos reemplazados correctamente.", "ok");
      }
      if (data.displayPrefs) {
        Object.entries(data.displayPrefs).forEach(([name, val]) => {
          const { key } = DISPLAY_PREFS[name] || {};
          if (key) localStorage.setItem(key, val);
        });
      }
      if (data.darkMode !== undefined) {
        localStorage.setItem(DARK_KEY, data.darkMode);
        applyTheme(data.darkMode);
      }
      if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
      if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
      saveState();
      renderAll();
      populateHistoryFilters();
      renderHistory();
      syncToggleStates();
      applyDisplayPrefs();
      refreshApiKeyUI();
      refreshTmdbKeyUI();
    } catch (err) {
      setStatus(statusEl, `Error al leer el archivo: ${err.message}`, "err");
    }
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

/* ---------- LANG AUTOCOMPLETE ---------- */

(function initLangAutocomplete() {
  const input = document.getElementById("new-lang-input");
  const dropdown = document.getElementById("lang-dropdown");
  let highlightedIndex = -1;
  let currentItems = [];

  function showDropdown(items) {
    currentItems = items;
    highlightedIndex = -1;
    if (!items.length) { dropdown.classList.remove("open"); return; }
    dropdown.innerHTML = items.map((item, i) =>
      `<div class="lang-dropdown-item${item.isCustom ? ' custom' : ''}" data-index="${i}">${item.label}</div>`
    ).join("");
    dropdown.classList.add("open");
    dropdown.querySelectorAll(".lang-dropdown-item").forEach(el => {
      el.addEventListener("mousedown", e => { e.preventDefault(); selectItem(parseInt(el.dataset.index)); });
    });
  }

  function hideDropdown() { dropdown.classList.remove("open"); highlightedIndex = -1; }

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
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(Math.min(highlightedIndex + 1, currentItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(Math.max(highlightedIndex - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (highlightedIndex >= 0) selectItem(highlightedIndex); else document.getElementById("add-lang-confirm").click(); }
    else if (e.key === "Escape") { hideDropdown(); }
  });

  input.addEventListener("blur", () => setTimeout(hideDropdown, 150));
  input.addEventListener("focus", () => { if (input.value.trim()) input.dispatchEvent(new Event("input")); });
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
