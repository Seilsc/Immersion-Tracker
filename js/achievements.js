/* ---------- LOGROS (Fase 5) ----------
   Carga tras firebase.js y antes que main.js. Envuelve saveState (llamada
   en cadena) para evaluar tras cada guardado. Registro local en
   localStorage + espejo idempotente en users/{uid}/achievements/{id}.
   Los logros NO se revocan aunque se edite/borre la sesión. */

const ACHIEVEMENTS = [
  { id: "first-session", icon: "🌱", name: "Primer paso", desc: "Registra tu primera sesión", check: c => c.sessionCount >= 1 },
  { id: "ten-sessions", icon: "🔟", name: "En marcha", desc: "Registra 10 sesiones", check: c => c.sessionCount >= 10 },
  { id: "hundred-sessions", icon: "💯", name: "Cien sesiones", desc: "Registra 100 sesiones", check: c => c.sessionCount >= 100 },
  { id: "hour-10", icon: "⏱", name: "10 horas", desc: "Acumula 10 horas de inmersión", check: c => c.totalMinutes >= 600 },
  { id: "hour-100", icon: "⌛", name: "100 horas", desc: "Acumula 100 horas de inmersión", check: c => c.totalMinutes >= 6000 },
  { id: "hour-500", icon: "🏔", name: "500 horas", desc: "Acumula 500 horas de inmersión", check: c => c.totalMinutes >= 30000 },
  { id: "lang-10h", icon: "📚", name: "Dedicación", desc: "10 horas en un mismo idioma", check: c => c.langMaxMinutes >= 600 },
  { id: "lang-100h", icon: "🎓", name: "Dominio", desc: "100 horas en un mismo idioma", check: c => c.langMaxMinutes >= 6000 },
  { id: "polyglot-3", icon: "🌍", name: "Políglota ×3", desc: "1 hora o más en 3 idiomas", check: c => c.langsOverHour >= 3 },
  { id: "streak-7", icon: "🔥", name: "Semana de fuego", desc: "Racha de 7 días", check: c => c.streakCurrent >= 7 || c.streakLongest >= 7 },
  { id: "streak-30", icon: "🚀", name: "Mes imparable", desc: "Racha de 30 días", check: c => c.streakCurrent >= 30 || c.streakLongest >= 30 },
  { id: "streak-100", icon: "👑", name: "Leyenda", desc: "Racha de 100 días", check: c => c.streakCurrent >= 100 || c.streakLongest >= 100 },
  { id: "marathon", icon: "🏃", name: "Maratón", desc: "3 horas o más en un solo día", check: c => c.marathonSeconds >= 3 * 3600 },
  { id: "week-warrior", icon: "🗓", name: "Semana completa", desc: "Actividad en 5 días de la última semana", check: c => c.activeDaysWeek >= 5 },
  { id: "early-bird", icon: "🌅", name: "Madrugador", desc: "Sesión entre las 5:00 y las 7:00", check: c => c.hourFlags[5] || c.hourFlags[6] },
  { id: "night-owl", icon: "🦉", name: "Ave nocturna", desc: "Sesión entre las 23:00 y las 2:00", check: c => c.hourFlags[23] || c.hourFlags[0] || c.hourFlags[1] },
  { id: "first-friend", icon: "🤝", name: "Primer amigo", desc: "Añade a tu primer amigo", check: null }, // social (async)
  { id: "social-5", icon: "🎉", name: "Vida social", desc: "Ten 5 amigos", check: null }, // social (async)
  { id: "top-week", icon: "🥇", name: "Top semanal", desc: "Lidera el ranking semanal", check: null }, // social (async)
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
  box.innerHTML = '<div style="font-size:2.5rem;">🏆</div>' +
    '<div style="font-weight:600;font-size:17px;margin:0.3rem 0 0.6rem;">¡Logro' + (newOnes.length > 1 ? "s" : "") + ' desbloqueado' + (newOnes.length > 1 ? "s" : "") + '!</div>' +
    newOnes.map(function(a) {
      return '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0.6rem;border:1px solid var(--line);border-radius:8px;margin-bottom:0.4rem;background:var(--surface2);">' +
        '<span style="font-size:24px;">' + a.icon + '</span>' +
        '<span style="text-align:left;"><div style="font-weight:600;font-size:13px;">' + esc(a.name) + '</div>' +
        '<div style="font-size:11px;color:var(--ink-soft);">' + esc(a.desc) + '</div></span></div>';
    }).join("") +
    '<button id="ach-close" style="margin-top:0.6rem;">Genial</button>';
  overlay.style.display = "flex";
  document.getElementById("ach-close").onclick = function() { overlay.style.display = "none"; };
}

function achBadge(id, locked) {
  var a = achievementById(id);
  if (!a) return "";
  if (locked) {
    return '<span title="' + esc(a.name) + " — " + esc(a.desc) + '" style="font-size:24px;filter:grayscale(1);opacity:0.35;">' + a.icon + '</span>';
  }
  return '<span title="' + esc(a.name) + " — " + esc(a.desc) + '" style="font-size:24px;">' + a.icon + '</span>';
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
  box.innerHTML = '<div style="font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:0.09em;color:var(--ink-soft);margin-bottom:0.4rem;">🏆 Logros (' + ids.length + ')</div>' +
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
