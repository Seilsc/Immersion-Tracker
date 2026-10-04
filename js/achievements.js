/* ---------- LOGROS (Fase 5) ----------
   Carga tras firebase.js y antes que main.js. Envuelve saveState (llamada
   en cadena) para evaluar tras cada guardado. Registro local en
   localStorage + espejo idempotente en users/{uid}/achievements/{id}.
   Los logros NO se revocan aunque se edite/borre la sesión. */

function achSvg(inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}

// Iconos de trazo (estilo de la app, sin emojis). Clave = achievement.icon.
const ACH_ICONS = {
  sprout: '<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 13c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  mountain: '<path d="M3 20l6-11 4 6 3-4 5 9z"/><path d="M9 9l1.5 2 1.5-1 1 1.5"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13l1.5 8-5-3-5 3 1.5-8"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  flame: '<path d="M12 22c4.4 0 8-3.6 8-8 0-4-3-7-5-9-1 2-2 3-2 3 .5-2.5-.5-5.5-3-7-2 3-6 6-6 11 0 4.4 3.6 8 8 8z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  sunrise: '<path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2"/><path d="M4.22 10.22l1.42 1.42"/><path d="M1 18h2"/><path d="M21 18h2"/><path d="M18.36 11.64l1.42-1.42"/><path d="M23 22H1"/><path d="M8 6l4-4 4 4"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  crown: '<path d="M2 18h20"/><path d="M3 18l-1.2-8.5L7 12l5-7 5 7 5.2-2.5L21 18z"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 3 2 5 5 5"/><path d="M17 6h3a1 1 0 0 1 1 1c0 3-2 5-5 5"/>'
};

const ACHIEVEMENTS = [
  { id: "first-session", icon: "sprout", name: "Primer paso", desc: "Registra tu primera sesión", check: c => c.sessionCount >= 1 },
  { id: "ten-sessions", icon: "grid", name: "En marcha", desc: "Registra 10 sesiones", check: c => c.sessionCount >= 10 },
  { id: "hundred-sessions", icon: "star", name: "Cien sesiones", desc: "Registra 100 sesiones", check: c => c.sessionCount >= 100 },
  { id: "hour-10", icon: "clock", name: "10 horas", desc: "Acumula 10 horas de inmersión", check: c => c.totalMinutes >= 600 },
  { id: "hour-100", icon: "trend", name: "100 horas", desc: "Acumula 100 horas de inmersión", check: c => c.totalMinutes >= 6000 },
  { id: "hour-500", icon: "mountain", name: "500 horas", desc: "Acumula 500 horas de inmersión", check: c => c.totalMinutes >= 30000 },
  { id: "lang-10h", icon: "book", name: "Dedicación", desc: "10 horas en un mismo idioma", check: c => c.langMaxMinutes >= 600 },
  { id: "lang-100h", icon: "award", name: "Dominio", desc: "100 horas en un mismo idioma", check: c => c.langMaxMinutes >= 6000 },
  { id: "polyglot-3", icon: "globe", name: "Políglota ×3", desc: "1 hora o más en 3 idiomas", check: c => c.langsOverHour >= 3 },
  { id: "streak-7", icon: "flame", name: "Semana de fuego", desc: "Racha de 7 días", check: c => c.streakCurrent >= 7 || c.streakLongest >= 7 },
  { id: "streak-30", icon: "flame", name: "Mes imparable", desc: "Racha de 30 días", check: c => c.streakCurrent >= 30 || c.streakLongest >= 30 },
  { id: "streak-100", icon: "flame", name: "Leyenda", desc: "Racha de 100 días", check: c => c.streakCurrent >= 100 || c.streakLongest >= 100 },
  { id: "marathon", icon: "zap", name: "Maratón", desc: "3 horas o más en un solo día", check: c => c.marathonSeconds >= 3 * 3600 },
  { id: "week-warrior", icon: "calendar", name: "Semana completa", desc: "Actividad en 5 días de la última semana", check: c => c.activeDaysWeek >= 5 },
  { id: "early-bird", icon: "sunrise", name: "Madrugador", desc: "Sesión entre las 5:00 y las 7:00", check: c => c.hourFlags[5] || c.hourFlags[6] },
  { id: "night-owl", icon: "moon", name: "Ave nocturna", desc: "Sesión entre las 23:00 y las 2:00", check: c => c.hourFlags[23] || c.hourFlags[0] || c.hourFlags[1] },
  { id: "first-friend", icon: "userplus", name: "Primer amigo", desc: "Añade a tu primer amigo", check: null }, // social (async)
  { id: "social-5", icon: "users", name: "Vida social", desc: "Ten 5 amigos", check: null }, // social (async)
  { id: "top-week", icon: "crown", name: "Top semanal", desc: "Lidera el ranking semanal", check: null }, // social (async)
];

const ACH_STORE_KEY = "immersion-achievements";

function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem(ACH_STORE_KEY) || "[]"); } catch (e) { return []; }
}

function achievementById(id) {
  return ACHIEVEMENTS.find(function(a) { return a.id === id; }) || null;
}

// Registra el desbloqueo (local + espejo cloud idempotente). Devuelve true si es nuevo.
function unlockAchievement(id) {
  var unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  try { localStorage.setItem(ACH_STORE_KEY, JSON.stringify(unlocked)); } catch (e) {}
  try {
    if (typeof fbUser !== "undefined" && fbUser && typeof firebaseConfigured === "function" && firebaseConfigured()) {
      firebase.firestore().collection("users").doc(fbUser.uid).collection("achievements").doc(id)
        .set({ unlockedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function() {});
    }
  } catch (e) {}
  return true;
}

function buildAchievementContext() {
  var sessions = state.sessions || [];
  var totalMinutes = 0;
  try { totalMinutes = totalFromState(state); } catch (e) {}
  var perLang = {};
  sessions.forEach(function(s) {
    var l = s.lang || "otro";
    perLang[l] = (perLang[l] || 0) + (s.seconds || 0) / 60;
  });
  var langMax = 0, langsOverHour = 0;
  Object.keys(perLang).forEach(function(l) {
    if (perLang[l] > langMax) langMax = perLang[l];
    if (perLang[l] >= 60) langsOverHour++;
  });
  var dayTotals = {}, allActs = [];
  try { allActs = aggregateAllActivities(state); } catch (e) {}
  allActs.forEach(function(a) {
    var k = new Date(a.ts).toDateString();
    dayTotals[k] = (dayTotals[k] || 0) + a.sec;
  });
  var marathon = 0;
  Object.keys(dayTotals).forEach(function(k) { if (dayTotals[k] > marathon) marathon = dayTotals[k]; });
  var weekDays = 0, now = Date.now();
  Object.keys(dayTotals).forEach(function(k) { if (now - new Date(k).getTime() < 7 * 86400000) weekDays++; });
  var streak = { current: 0, longest: 0 };
  try { streak = computeLocalStreak(allActs); } catch (e) {}
  var hours = {};
  sessions.forEach(function(s) { if (s.ts) hours[new Date(s.ts).getHours()] = true; });
  return {
    sessionCount: sessions.length, totalMinutes: totalMinutes,
    langMaxMinutes: langMax, langsOverHour: langsOverHour,
    marathonSeconds: marathon, activeDaysWeek: weekDays,
    streakCurrent: streak.current, streakLongest: Math.max(streak.longest, streak.current),
    hourFlags: hours
  };
}

function evaluateAchievements() {
  var unlocked = getUnlockedAchievements();
  var has = {};
  unlocked.forEach(function(id) { has[id] = true; });
  var ctx = buildAchievementContext();
  var fresh = [];
  ACHIEVEMENTS.forEach(function(a) {
    if (has[a.id] || typeof a.check !== "function") return;
    var ok = false;
    try { ok = !!a.check(ctx); } catch (e) { ok = false; }
    if (ok && unlockAchievement(a.id)) fresh.push(a);
  });
  if (fresh.length) showAchievementUnlocks(fresh);
}

// Logros sociales (requieren red): primer amigo, 5 amigos, top semanal.
async function checkSocialAchievements() {
  if (typeof fbUser === "undefined" || !fbUser) return;
  try {
    var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
    var fresh = [];
    if (snap.size >= 1 && unlockAchievement("first-friend")) fresh.push(achievementById("first-friend"));
    if (snap.size >= 5 && unlockAchievement("social-5")) fresh.push(achievementById("social-5"));
    if (snap.size >= 1 && typeof getFriendsWithRange === "function") {
      var weekly = await getFriendsWithRange(7);
      if (weekly.length > 1 && weekly[0].isSelf && !weekly[0].isPrivate && unlockAchievement("top-week")) {
        fresh.push(achievementById("top-week"));
      }
    }
    fresh = fresh.filter(Boolean);
    if (fresh.length) showAchievementUnlocks(fresh);
  } catch (e) {}
}

function showAchievementUnlocks(newOnes) {
  var overlay = document.getElementById("ach-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "ach-overlay";
    overlay.style.cssText = "display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;";
    overlay.innerHTML = '<div id="ach-box" style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1.5rem;max-width:340px;width:90%;text-align:center;box-shadow:0 16px 64px rgba(0,0,0,0.3);"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.style.display = "none"; });
  }
  var box = document.getElementById("ach-box");
  box.innerHTML = '<div style="display:flex;justify-content:center;color:var(--gold);margin-bottom:0.3rem;">' + achSvg(ACH_ICONS.trophy).replace('width="20" height="20"', 'width="40" height="40"') + '</div>' +
    '<div style="font-weight:600;font-size:17px;margin:0.3rem 0 0.6rem;">¡Logro' + (newOnes.length > 1 ? "s" : "") + ' desbloqueado' + (newOnes.length > 1 ? "s" : "") + '!</div>' +
    newOnes.map(function(a) {
      return '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0.6rem;border:1px solid var(--line);border-radius:8px;margin-bottom:0.4rem;background:var(--surface2);">' +
        achBadge(a.id, false) +
        '<span style="text-align:left;"><div style="font-weight:600;font-size:13px;">' + esc(a.name) + '</div>' +
        '<div style="font-size:11px;color:var(--ink-soft);">' + esc(a.desc) + '</div></span></div>';
    }).join("") +
    '<button id="ach-close" style="margin-top:0.6rem;">Genial</button>';
  overlay.style.display = "flex";
  document.getElementById("ach-close").onclick = function() { overlay.style.display = "none"; };
}

function achBadge(id, locked) {
  var a = achievementById(id);
  if (!a || !ACH_ICONS[a.icon]) return "";
  return '<span class="ach-icon' + (locked ? " locked" : "") + '" title="' + esc(a.name) + " — " + esc(a.desc) + '">' + achSvg(ACH_ICONS[a.icon]) + "</span>";
}

// Vitrina propia en la página Social.
function renderMyAchievements() {
  var el = document.getElementById("social-achievements");
  if (!el) return;
  var unlocked = getUnlockedAchievements();
  var has = {};
  unlocked.forEach(function(id) { has[id] = true; });
  el.innerHTML = '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
    ACHIEVEMENTS.map(function(a) { return achBadge(a.id, !has[a.id]); }).join("") +
    '</div><p style="font-size:11px;color:var(--ink-soft);margin:0.5rem 0 0;">' +
    unlocked.length + " de " + ACHIEVEMENTS.length + " desbloqueados</p>";
}

async function getFriendAchievementIds(userId) {
  try {
    var snap = await firebase.firestore().collection("users").doc(userId).collection("achievements").get();
    return snap.docs.map(function(d) { return d.id; });
  } catch (e) { return []; }
}

// Vitrina en el modal rico (propio y ajeno; oculta si el amigo esconde totales).
async function renderProfileAchievements(friendId, isOwn, profile) {
  var anchor = document.getElementById("fm-recent-section");
  var box = document.getElementById("fm-achievements");
  if (!box && anchor && anchor.parentNode) {
    box = document.createElement("div");
    box.id = "fm-achievements";
    box.style.marginBottom = "1rem";
    anchor.parentNode.insertBefore(box, anchor);
  }
  if (!box) return;
  if (!isOwn && profile.hidden.total) { box.style.display = "none"; return; }
  box.style.display = "";
  var ids = isOwn ? getUnlockedAchievements() : await getFriendAchievementIds(friendId);
  ids = ids.filter(function(id) { return !!achievementById(id); });
  if (!ids.length) {
    box.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);">Sin logros todavía</div>';
    return;
  }
  box.innerHTML = '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:0.09em;color:var(--ink-soft);margin-bottom:0.4rem;">Logros (' + ids.length + ')</div>' +
    '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;">' + ids.map(function(id) { return achBadge(id, false); }).join("") + '</div>';
}

// Hook en la cadena de saveState (firebase.js envuelve antes, main.js después).
var originalSaveStateForAchievements = saveState;
saveState = function() {
  originalSaveStateForAchievements();
  try { evaluateAchievements(); } catch (e) { console.warn("achievements failed", e); }
};

// Primera evaluación al cargar (p. ej. datos históricos tras actualizar).
try { evaluateAchievements(); } catch (e) {}
