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
    if (tab.dataset.page === "social" && typeof renderSocialPage === "function") renderSocialPage();
  });
});

/* ---------- RESET ---------- */

document.getElementById("reset-all").addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar TODOS los datos? Esta acción no se puede deshacer.")) return;
  state = { languages: ["Japonés"], sessions: [], youtube: [], shows: [], movies: [], goals: { type: "global", globalMinutes: 0, perLang: {} } };
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
  const filterLang = document.getElementById("filter-lang");
  const prev = filterLang.value;
  filterLang.innerHTML = `<option value="">Todos los idiomas</option>` +
    state.languages.map(l => `<option value="${l}">${l}</option>`).join("");
  if (prev) filterLang.value = prev;
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

/* ---------- CLOUD SYNC ---------- */

let syncDirHandle = null;

async function saveSyncHandle(handle) {
  try {
    const db = await new Promise(res => { const r = indexedDB.open("SyncHandles", 1); r.onupgradeneeded = e => e.target.result.createObjectStore("handles"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!db) return;
    db.transaction("handles", "readwrite").objectStore("handles").put(handle, "dirHandle");
  } catch (_) {}
}

async function loadSyncHandle() {
  try {
    const db = await new Promise(res => { const r = indexedDB.open("SyncHandles", 1); r.onupgradeneeded = e => e.target.result.createObjectStore("handles"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!db) return null;
    const tx = db.transaction("handles", "readonly");
    return new Promise(res => { const req = tx.objectStore("handles").get("dirHandle"); req.onsuccess = () => res(req.result || null); req.onerror = () => res(null); });
  } catch (_) { return null; }
}

async function clearSyncHandle() {
  try {
    const db = await new Promise(res => { const r = indexedDB.open("SyncHandles", 1); r.onupgradeneeded = e => e.target.result.createObjectStore("handles"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    if (!db) return;
    db.transaction("handles", "readwrite").objectStore("handles").delete("dirHandle");
  } catch (_) {}
}

function syncUpdateUI() {
  const tag = document.getElementById("sync-status-tag");
  const folderName = document.getElementById("sync-folder-name");
  const connectBtn = document.getElementById("sync-connect-btn");
  const disconnectBtn = document.getElementById("sync-disconnect-btn");
  const statusEl = document.getElementById("sync-status");
  if (syncDirHandle) {
    tag.textContent = "Conectado";
    tag.style.color = "var(--green)"; tag.style.background = "var(--green-soft)";
    folderName.textContent = "📁 " + (syncDirHandle.name || "Carpeta sincronizada");
    connectBtn.textContent = "Cambiar carpeta";
    disconnectBtn.style.display = "";
    setStatus(statusEl, "Sincronización activa. Los cambios se guardan automáticamente.", "ok");
  } else {
    tag.textContent = "Desconectado";
    tag.style.color = ""; tag.style.background = "";
    folderName.textContent = "";
    connectBtn.innerHTML = '<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg></span> Conectar carpeta';
    disconnectBtn.style.display = "none";
    setStatus(statusEl, "", "");
  }
}

function buildFullExport() {
  const displayPrefs = {};
  Object.entries(DISPLAY_PREFS).forEach(([name, { key }]) => { const val = localStorage.getItem(key); if (val !== null) displayPrefs[name] = val === "true"; });
  return { _version: 4, _exportedAt: new Date().toISOString(), languages: state.languages, sessions: state.sessions, youtube: state.youtube, shows: state.shows, movies: state.movies, goals: state.goals, displayPrefs, darkMode: localStorage.getItem(DARK_KEY) === "true", apiKeyYoutube: getApiKey() || null, apiKeyTmdb: getTmdbKey() || null };
}

function applySyncImport(data) {
  if (!data || !data.languages || !data.sessions) return false;
  state.languages = data.languages || ["Japonés"];
  state.sessions = data.sessions || [];
  state.youtube = data.youtube || [];
  state.shows = data.shows || [];
  state.movies = data.movies || [];
  state.goals = data.goals || { type: "global", globalMinutes: 0, perLang: {} };
  currentLang = state.languages[0] || "Japonés";
  if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(([name, val]) => { const { key } = DISPLAY_PREFS[name] || {}; if (key) localStorage.setItem(key, val); });
  if (data.darkMode !== undefined) { localStorage.setItem(DARK_KEY, data.darkMode); applyTheme(data.darkMode); }
  if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
  if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
  saveState(); renderAll(); populateHistoryFilters(); renderHistory(); syncToggleStates(); applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
  return true;
}

async function syncWrite() {
  if (!syncDirHandle) return;
  try {
    const perm = await syncDirHandle.queryPermission({ mode: "readwrite" });
    if (perm !== "granted" && (await syncDirHandle.requestPermission({ mode: "readwrite" })) !== "granted") { disconnectSync(); return; }
    const fh = await syncDirHandle.getFileHandle(SYNC_FILE, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(buildFullExport(), null, 2));
    await w.close();
  } catch (e) { console.warn("Sync write failed:", e); setStatus(document.getElementById("sync-status"), "Error de sincronización: " + e.message, "err"); }
}

async function syncRead() {
  if (!syncDirHandle) return null;
  try {
    const perm = await syncDirHandle.queryPermission({ mode: "read" });
    if (perm !== "granted" && (await syncDirHandle.requestPermission({ mode: "read" })) !== "granted") return null;
    const fh = await syncDirHandle.getFileHandle(SYNC_FILE);
    const file = await fh.getFile();
    return JSON.parse(await file.text());
  } catch (_) { return null; }
}

async function connectSync() {
  if (!window.showDirectoryPicker) {
    setStatus(document.getElementById("sync-status"), "Tu navegador no soporta esta función. Usa Chrome o Edge.", "err");
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: "tracker-sync", mode: "readwrite" });
    syncDirHandle = handle;
    await saveSyncHandle(handle);
    syncUpdateUI();
    const data = await syncRead();
    if (data && confirm("Se encontró una copia de seguridad en esta carpeta. ¿Quieres restaurar los datos desde el archivo?")) {
      applySyncImport(data);
      setStatus(document.getElementById("sync-status"), "✓ Datos restaurados desde el archivo de sincronización.", "ok");
    } else {
      syncWrite();
      setStatus(document.getElementById("sync-status"), "✓ Carpeta conectada. Guardando copia de seguridad…", "ok");
    }
  } catch (e) {
    if (e.name !== "AbortError" && e.name !== "SecurityError") setStatus(document.getElementById("sync-status"), "Error: " + e.message, "err");
  }
}
window.connectSync = connectSync;

async function disconnectSync() {
  syncDirHandle = null;
  await clearSyncHandle();
  syncUpdateUI();
}

document.getElementById("sync-connect-btn").addEventListener("click", connectSync);
document.getElementById("sync-disconnect-btn").addEventListener("click", disconnectSync);

const originalSaveStateForSync = saveState;
saveState = function() {
  originalSaveStateForSync();
  if (syncDirHandle) syncWrite();
};

(async function initSync() {
  const handle = await loadSyncHandle();
  if (handle) {
    syncDirHandle = handle;
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") {
      syncUpdateUI();
      const data = await syncRead();
      if (data && data._exportedAt) {
        const localSessions = state.sessions.length;
        if (localSessions === 0 || data.sessions.length > localSessions) {
          if (confirm("Se encontró una copia de seguridad sincronizada más reciente. ¿Restaurar?")) applySyncImport(data);
        }
      }
    } else {
      syncDirHandle = null;
      await clearSyncHandle();
      syncUpdateUI();
    }
  }
  syncUpdateUI();
})();

/* ---------- NUM STEPPER (global delegation) ---------- */

document.addEventListener("click", e => {
  const btn = e.target.closest(".num-stepper-btn");
  if (!btn) return;
  const targetId = btn.dataset.target;
  if (!targetId) return;
  const input = document.getElementById(targetId);
  if (!input) return;
  const step = parseInt(input.step) || 1;
  const min = input.min !== "" ? parseInt(input.min) : -Infinity;
  const max = input.max !== "" ? parseInt(input.max) : Infinity;
  let val = parseInt(input.value) || 0;
  if (btn.classList.contains("plus"))  val = Math.min(val + step, max);
  if (btn.classList.contains("minus")) val = Math.max(val - step, min);
  input.value = val;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
