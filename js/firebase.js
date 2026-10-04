/* ---------- FIREBASE ---------- */

/* Config privada en js/firebase-config.js (gitignored, copiar desde
   js/firebase-config.example.js). Sin ese archivo, la app funciona en
   local pero sin cuentas ni nube. */
const FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;

function firebaseConfigured() { return !!FIREBASE_CONFIG; }

let fbUser = null;
var lastSessionLen = 0;

function initFirebase() {
  if (!firebaseConfigured()) {
    console.warn("Firebase no configurado: copia js/firebase-config.example.js a js/firebase-config.js. La app funciona en local sin nube.");
    var statusEl = document.getElementById("prof-status");
    if (statusEl) setStatus(statusEl, "Nube no configurada en esta copia (falta js/firebase-config.js).", "");
    return;
  }
  if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(async user => {
      fbUser = user;
      try { updateProfileUI(); } catch (e) { console.warn("Profile UI error", e); }
      if (user) {
        if (!user.emailVerified) user.reload(); // refresh verification status
        var doc = await firebase.firestore().collection("users").doc(user.uid).get();
        if (!doc.exists) {
          var code = generateFriendCode();
          await firebase.firestore().collection("users").doc(user.uid).set({
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
            friendCode: code,
            privacy: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await firebase.firestore().collection("codes").doc(code).set({ uid: user.uid }).catch(function() {});
        } else if (doc.data().privacy) {
          // sync privacy from cloud to localStorage on sign-in
          localStorage.setItem("privacy", JSON.stringify(doc.data().privacy));
          if (typeof window.syncPrivacyToggles === "function") window.syncPrivacyToggles();
        }
        // backfill: mapa público código → uid (cuentas creadas antes de la colección codes)
        try {
          var meAgain = await firebase.firestore().collection("users").doc(user.uid).get();
          if (meAgain.exists && meAgain.data().friendCode) {
            await firebase.firestore().collection("codes").doc(meAgain.data().friendCode).set({ uid: user.uid }, { merge: true });
          }
        } catch (e) {}
        loadCloudState();
        startAutoSave();
        startRealTimeSync();
      } else {
        stopAutoSave();
        stopRealTimeSync();
      }
    });
  }
}

/* ---------- SYNC INDICATOR ---------- */

function setSyncStatus(text) {
  var el = document.getElementById("sync-indicator");
  if (!el) return;
  if (text) { el.textContent = text; el.style.display = "block"; }
  else { el.style.display = "none"; }
}

function showLoading(id, show) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = show ? '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Cargando...</p>' : "";
}

/* ---------- MD5 (for Gravatar) ---------- */

function md5(str) {
  function rotateLeft(v, n) { return ((v << n) | (v >>> (32 - n))) & 0xffffffff; }
  function toHex(v) { var h = ""; for (var i = 7; i >= 0; i--) h += "0123456789abcdef"[(v >> (i * 4)) & 0xf]; return h; }
  function strToWords(s) { var w = [], l = s.length, i; for (i = 0; i < l; i++) w[i >> 2] |= (s.charCodeAt(i) & 0xff) << ((i % 4) * 8); w[i >> 2] |= 0x80 << ((i % 4) * 8); w[(((i + 8) >> 6) << 4) + 14] = i * 8; return w; }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  var w = strToWords(str), len = w.length;
  for (var i = 0; i < len; i += 16) {
    var a = a0, b = b0, c = c0, d = d0;
    var rounds = [
      [F, 0xd76aa478, 7], [F, 0xe8c7b756, 12], [F, 0x242070db, 17], [F, 0xc1bdceee, 22],
      [F, 0xf57c0faf, 7], [F, 0x4787c62a, 12], [F, 0xa8304613, 17], [F, 0xfd469501, 22],
      [F, 0x698098d8, 7], [F, 0x8b44f7af, 12], [F, 0xffff5bb1, 17], [F, 0x895cd7be, 22],
      [F, 0x6b901122, 7], [F, 0xfd987193, 12], [F, 0xa679438e, 17], [F, 0x49b40821, 22],
      [G, 0xf61e2562, 5], [G, 0xc040b340, 9], [G, 0x265e51a, 14], [G, 0xe9b6c7aa, 20],
      [G, 0xd62f105d, 5], [G, 0x02441453, 9], [G, 0xd8a1e681, 14], [G, 0xe7d3fbc8, 20],
      [G, 0x21e1cde6, 5], [G, 0xc33707d6, 9], [G, 0xf4d50d87, 14], [G, 0x455a14ed, 20],
      [G, 0xa9e3e905, 5], [G, 0xfcefa3f8, 9], [G, 0x676f02d9, 14], [G, 0x8d2a4c8a, 20],
      [H, 0xfffa3942, 4], [H, 0x8771f681, 11], [H, 0x6d9d6122, 16], [H, 0xfde5380c, 23],
      [H, 0xa4beea44, 4], [H, 0x4bdecfa9, 11], [H, 0xf6bb4b60, 16], [H, 0xbebfbc70, 23],
      [H, 0x289b7ec6, 4], [H, 0xeaa127fa, 11], [H, 0xd4ef3085, 16], [H, 0x04881d05, 23],
      [H, 0xd9d4d039, 4], [H, 0xe6db99e5, 11], [H, 0x1fa27cf8, 16], [H, 0xc4ac5665, 23],
      [I, 0xf4292244, 6], [I, 0x432aff97, 10], [I, 0xab9423a7, 15], [I, 0xfc93a039, 21],
      [I, 0x655b59c3, 6], [I, 0x8f0ccc92, 10], [I, 0xffeff47d, 15], [I, 0x85845dd1, 21],
      [I, 0x6fa87e4f, 6], [I, 0xfe2ce6e0, 10], [I, 0xa3014314, 15], [I, 0x4e0811a1, 21],
      [I, 0xf7537e82, 6], [I, 0xbd3af235, 10], [I, 0x2ad7d2bb, 15], [I, 0xeb86d391, 21]
    ];
    for (var j = 0; j < 64; j++) {
      var f = rounds[j][0](b, c, d), k = (j < 16) ? j : (j < 32) ? (5 * j + 1) % 16 : (j < 48) ? (3 * j + 5) % 16 : (7 * j) % 16;
      var temp = (a + f + rounds[j][1] + w[i + k]) & 0xffffffff;
      a = d; d = c; c = b; b = (b + rotateLeft(temp, rounds[j][2])) & 0xffffffff;
    }
    a0 = (a0 + a) & 0xffffffff; b0 = (b0 + b) & 0xffffffff; c0 = (c0 + c) & 0xffffffff; d0 = (d0 + d) & 0xffffffff;
  }
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/* ---------- GRAVATAR ---------- */

function getGravatarUrl(email, size) {
  if (!email) return "";
  var hash = md5(email.trim().toLowerCase());
  return "https://www.gravatar.com/avatar/" + hash + "?s=" + (size || 80) + "&d=mp";
}

/* ---------- AUTH ---------- */

async function fbSignUp(email, password, displayName) {
  if (!firebaseConfigured()) throw new Error("Nube no configurada en esta copia (falta js/firebase-config.js).");
  var cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
  if (displayName) await cred.user.updateProfile({ displayName: displayName });
  var code = generateFriendCode();
  await firebase.firestore().collection("users").doc(cred.user.uid).set({
    email: email, displayName: displayName || email.split("@")[0],
    friendCode: code, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await firebase.firestore().collection("codes").doc(code).set({ uid: cred.user.uid }).catch(function() {});
  await cred.user.sendEmailVerification();
  return cred;
}

async function fbSignIn(email, password) {
  if (!firebaseConfigured()) throw new Error("Nube no configurada en esta copia (falta js/firebase-config.js).");
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

async function fbSignOut() {
  stopAutoSave();
  await firebase.auth().signOut();
}

async function fbUpdateDisplayName(newName) {
  newName = String(newName || "").trim().slice(0, 40);
  if (!newName) return;
  await fbUser.updateProfile({ displayName: newName });
  await firebase.firestore().collection("users").doc(fbUser.uid).update({ displayName: newName });
  updateProfileUI();
}

async function fbUpdateBio(bio) {
  if (!fbUser) return;
  await firebase.firestore().collection("users").doc(fbUser.uid).update({ bio: String(bio || "").slice(0, 300) });
}

// Borrado en cascada: amistades bilaterales, subcolecciones, doc, códigos y cuenta.
async function fbDeleteAccount(password) {
  if (!fbUser) throw new Error("Inicia sesión primero");
  var uid = fbUser.uid;
  var user = fbUser;
  var expectedName = user.displayName || (user.email ? user.email.split("@")[0] : "");
  var typed = ((document.getElementById("delete-account-confirm") || {}).value || "").trim();
  if (!typed || typed.toLowerCase() !== String(expectedName).toLowerCase()) {
    throw { message: "Escribe tu nombre de usuario para confirmar." };
  }
  if (isPasswordProvider()) {
    if (!password) throw { message: "Escribe tu contraseña para confirmar." };
    var cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(cred);
  }
  var db = firebase.firestore();
  // 1. amistades bilaterales
  try {
    var fr = await db.collection("users").doc(uid).collection("friends").get();
    await Promise.all(fr.docs.map(function(d) {
      return db.collection("users").doc(d.id).collection("friends").doc(uid).delete().catch(function() {});
    }));
  } catch (e) {}
  // 2. subcolecciones propias por batches
  async function wipe(col) {
    try {
      var snap = await db.collection("users").doc(uid).collection(col).limit(400).get();
      while (!snap.empty) {
        await Promise.all(snap.docs.map(function(d) { return d.ref.delete(); }));
        snap = await db.collection("users").doc(uid).collection(col).limit(400).get();
      }
    } catch (e) {}
  }
  await wipe("activity");
  await wipe("friends");
  await wipe("friendRequests");
  await wipe("sentRequests");
  await wipe("achievements");
  await wipe("public");
  await wipe("data");
  // 3. mapa de código, doc propio y cuenta (en este orden, aún autenticado)
  try {
    var meDoc = await db.collection("users").doc(uid).get();
    if (meDoc.exists && meDoc.data().friendCode) {
      await db.collection("codes").doc(meDoc.data().friendCode).delete().catch(function() {});
    }
  } catch (e) {}
  try { await db.collection("users").doc(uid).delete(); } catch (e) {}
  stopAutoSave();
  stopRealTimeSync();
  await user.delete();
  // 4. limpieza local (directa, sin saveState para no re-subir nada)
  state = { languages: ["Japonés"], sessions: [], youtube: [], shows: [], movies: [], goals: { type: "global", globalMinutes: 0, perLang: {} } };
  currentLang = "Japonés";
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(ACH_STORE_KEY);
  } catch (e) {}
  renderAll();
  updateProfileUI();
}

function fbSignInWithGoogle() {
  var statusEl = document.getElementById("prof-status");
  if (!firebaseConfigured()) {
    setStatus(statusEl, "Nube no configurada en esta copia (falta js/firebase-config.js).", "err");
    return;
  }
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  firebase.auth().signInWithPopup(provider).then(function(result) {
    if (result && result.user) closeProfileDropdown();
  }).catch(function(e) {
    if (e.code === "auth/popup-blocked") {
      // fallback to redirect if popup blocked
      firebase.auth().signInWithRedirect(provider);
    } else {
      setStatus(statusEl, translateAuthError(e), "err");
    }
  });
}

function translateAuthError(e) {
  if (!e) return "Error desconocido";
  var map = {
    "auth/email-already-in-use": "Ese email ya tiene cuenta. Inicia sesión.",
    "auth/invalid-email": "Email no válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-not-found": "No hay cuenta con ese email.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Email o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/requires-recent-login": "Por seguridad, cierra sesión y vuelve a entrar antes de hacer esto.",
    "auth/popup-closed-by-user": "Ventana de Google cerrada.",
    "auth/cancelled-popup-request": "Ya hay una ventana de login abierta.",
    "auth/network-request-failed": "Sin conexión. Revisa tu red."
  };
  if (e.code && map[e.code]) return map[e.code];
  return e.message || "Error desconocido";
}

function isPasswordProvider() {
  return !!(fbUser && fbUser.providerData && fbUser.providerData.some(function(p) { return p.providerId === "password"; }));
}

// Lo social exige email verificado (cuentas email/pass). Google está exento.
function isEmailVerifiedForSocial() {
  if (!fbUser) return false;
  if (!isPasswordProvider()) return true;
  return !!fbUser.emailVerified;
}

function generateFriendCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "";
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ---------- DATA ---------- */

async function saveCloudState() {
  if (!fbUser) return;
  setSyncStatus("Guardando...");
  try {
    await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").set({
      state: JSON.parse(JSON.stringify(state)),
      displayPrefs: getDisplayPrefs(),
      // Nota: las API keys (YouTube/TMDB) NO se suben a la nube, solo viven en localStorage.
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setSyncStatus("Sincronizado");
    setTimeout(function() { setSyncStatus(""); }, 2000);
  } catch (e) { console.warn("Cloud save failed", e); setSyncStatus("Error de sync"); }
}

function showConflictDialog(localCount, cloudCount, cloudData, resolve) {
  var overlay = document.getElementById("conflict-overlay");
  var info = document.getElementById("conflict-info");
  var localBtn = document.getElementById("conflict-local-btn");
  var cloudBtn = document.getElementById("conflict-cloud-btn");
  if (!overlay || !info || !localBtn || !cloudBtn) { resolve("cloud"); return; }
  info.innerHTML = '<div style="flex:1;padding:0.5rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:18px;">' + localCount + '</div><div style="color:var(--ink-soft);font-size:11px;">sesiones local</div></div><div style="flex:1;padding:0.5rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:18px;">' + cloudCount + '</div><div style="color:var(--ink-soft);font-size:11px;">sesiones nube</div></div>';
  overlay.style.display = "flex";
  function cleanup(choice) { overlay.style.display = "none"; localBtn.onclick = null; cloudBtn.onclick = null; resolve(choice); }
  localBtn.onclick = function() { cleanup("local"); };
  cloudBtn.onclick = function() { cleanup("cloud"); };
}

async function loadCloudState() {
  if (!fbUser) return;
  try {
    var doc = await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").get();
    if (doc.exists) {
      var data = doc.data();
      var localLen = state.sessions.length;
      var cloudLen = (data.state && data.state.sessions) ? data.state.sessions.length : 0;
      if (cloudLen > 0 && localLen > 0 && cloudLen !== localLen) {
        var choice = await new Promise(function(resolve) { showConflictDialog(localLen, cloudLen, data, resolve); });
        if (choice === "cloud") {
          Object.assign(state, data.state);
          if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(function(e) { var k = DISPLAY_PREFS[e[0]] && DISPLAY_PREFS[e[0]].key; if (k) localStorage.setItem(k, e[1]); });
          applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
        } else {
          saveCloudState();
        }
      } else if (cloudLen > 0 && cloudLen >= localLen) {
        Object.assign(state, data.state);
        if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(function(e) { var k = DISPLAY_PREFS[e[0]] && DISPLAY_PREFS[e[0]].key; if (k) localStorage.setItem(k, e[1]); });
        applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
      } else if (localLen > cloudLen) {
        saveCloudState();
      }
      lastSessionLen = state.sessions.length;
      renderAll();
      if (document.getElementById("page-stats") && document.getElementById("page-stats").classList.contains("active")) renderStats();
      if (document.getElementById("page-historial") && document.getElementById("page-historial").classList.contains("active")) renderHistory();
    } else {
      saveCloudState();
    }
    writePublicStats(true);
  } catch (e) { console.warn("Cloud load failed", e); }
}

var autoSaveTimer = null;
var snapshotUnsub = null;

function startAutoSave() {
  stopAutoSave();
  autoSaveTimer = setInterval(function() {
    if (fbUser) saveCloudState();
  }, 120000);
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

function startRealTimeSync() {
  stopRealTimeSync();
  if (!fbUser) return;
  snapshotUnsub = firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").onSnapshot(function(doc) {
    if (doc.exists && fbUser) {
      setSyncStatus("Sincronizado");
      setTimeout(function() { setSyncStatus(""); }, 2000);
      var data = doc.data();
      if (data.state && data.state.sessions) {
        state = JSON.parse(JSON.stringify(data.state));
        lastSessionLen = state.sessions.length; // don't re-log cloud-synced sessions
        if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(function(e) { var k = DISPLAY_PREFS[e[0]] && DISPLAY_PREFS[e[0]].key; if (k) localStorage.setItem(k, e[1]); });
        applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
        renderAll();
        if (document.getElementById("page-stats") && document.getElementById("page-stats").classList.contains("active")) renderStats();
        if (document.getElementById("page-historial") && document.getElementById("page-historial").classList.contains("active")) renderHistory();
      }
    }
  });
}

function stopRealTimeSync() {
  if (snapshotUnsub) { snapshotUnsub(); snapshotUnsub = null; }
}

function applyAccentColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-soft", color + "22");
  localStorage.setItem("immersion-accent", color);
}

// load saved accent color
(function() {
  var saved = localStorage.getItem("immersion-accent");
  if (saved) applyAccentColor(saved);
})();

function loadGravatarBig(el) {
  if (!el || !fbUser) return;
  var gravBig = new Image();
  gravBig.src = getGravatarUrl(fbUser.email, 96);
  gravBig.onload = function() {
    if (gravBig.width > 10) { el.style.backgroundImage = "url(" + gravBig.src + ")"; el.style.backgroundSize = "cover"; }
  };
}

function getDisplayPrefs() {
  var dp = {};
  Object.entries(DISPLAY_PREFS).forEach(function(e) { var v = localStorage.getItem(e[1].key); if (v !== null) dp[e[0]] = v === "true"; });
  return dp;
}

/* ---------- ACTIVITY LOG ---------- */

async function logSessionActivity(session) {
  if (!fbUser) return;
  try {
    await firebase.firestore().collection("users").doc(fbUser.uid).collection("activity").add({
      type: "session",
      activityName: session.activityName || "",
      cat: session.cat || "",
      lang: session.lang || "",
      note: (session.note || "").slice(0, 100),
      seconds: session.seconds || 0,
      ts: firebase.firestore.FieldValue.serverTimestamp(),
      clientTs: session.ts || Date.now()
    });
  } catch (e) { console.warn("Activity log failed", e); }
}

/* ---------- FRIEND REQUESTS ---------- */

async function sendFriendRequest(code) {
  if (!fbUser) throw new Error("Inicia sesión primero");
  if (!isEmailVerifiedForSocial()) throw new Error("Verifica tu email para añadir amigos.");
  // Resolución por colección pública codes/{CODIGO} (listar users está prohibido).
  var codeDoc = await firebase.firestore().collection("codes").doc(code.toUpperCase()).get().catch(function() { return null; });
  if (!codeDoc || !codeDoc.exists || !codeDoc.data().uid) throw new Error("Código inválido");
  var targetId = codeDoc.data().uid;
  if (targetId === fbUser.uid) throw new Error("No puedes añadirte a ti mismo");
  // check if already friends
  var existing = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(targetId).get();
  if (existing.exists) throw new Error("Ya sois amigos");
  // check if request already sent (pending only: permite reintentar tras rechazo)
  var reqSnap = await firebase.firestore().collection("users").doc(targetId).collection("friendRequests").where("from", "==", fbUser.uid).get();
  var pendingExists = false;
  reqSnap.forEach(function(r) { if (r.data().status === "pending") pendingExists = true; });
  if (pendingExists) throw new Error("Solicitud ya enviada");
  // anti-spam con espejo propio (máx. 20 salientes, no reenviar en 24 h)
  var mirrorRef = firebase.firestore().collection("users").doc(fbUser.uid).collection("sentRequests").doc(targetId);
  var mirror = await mirrorRef.get().catch(function() { return null; });
  if (mirror && mirror.exists) {
    var sentAt = mirror.data().clientTs || 0;
    if (Date.now() - sentAt < 24 * 3600 * 1000) throw new Error("Ya enviaste una solicitud a este usuario hace poco.");
  }
  var allSent = await firebase.firestore().collection("users").doc(fbUser.uid).collection("sentRequests").get().catch(function() { return { size: 0 }; });
  if (allSent.size >= 20 && !(mirror && mirror.exists)) throw new Error("Tienes demasiadas solicitudes pendientes.");
  var myCode = "";
  try { myCode = await getMyFriendCode() || ""; } catch (e) {}
  var reqRef = await firebase.firestore().collection("users").doc(targetId).collection("friendRequests").add({
    from: fbUser.uid,
    fromName: fbUser.displayName || fbUser.email.split("@")[0],
    fromCode: code.toUpperCase(),
    senderCode: myCode,
    status: "pending",
    clientTs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await mirrorRef.set({
    to: targetId,
    toName: code.toUpperCase(),
    toCode: code.toUpperCase(),
    reqId: reqRef.id,
    clientTs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function() {});
}

async function acceptFriendRequest(reqId, fromUid) {
  if (!fbUser) return;
  // accept: update request status, add bidirectional friendship
  // (el código del amigo sale de la propia solicitud: su doc aún no es legible)
  var reqDoc = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").doc(reqId).get().catch(function() { return null; });
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").doc(reqId).update({ status: "accepted" });
  var fromCode = (reqDoc && reqDoc.exists && reqDoc.data().senderCode) || "";
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(fromUid).set({
    friendCode: fromCode, addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  var myDoc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  await firebase.firestore().collection("users").doc(fromUid).collection("friends").doc(fbUser.uid).set({
    friendCode: myDoc.exists ? myDoc.data().friendCode || "" : "",
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  // si yo también le había enviado solicitud, limpio mi espejo
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("sentRequests").doc(fromUid).delete().catch(function() {});
  loadSocialPendingRequests();
  loadSocialFriendsList();
}

async function declineFriendRequest(reqId) {
  if (!fbUser) return;
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").doc(reqId).delete();
  loadSocialPendingRequests();
}

async function cancelSentRequest(targetId) {
  if (!fbUser) return;
  var db = firebase.firestore();
  try {
    // borrado directo por id (sin listar el buzón ajeno: denegado por reglas)
    var mirror = await db.collection("users").doc(fbUser.uid).collection("sentRequests").doc(targetId).get();
    if (mirror.exists && mirror.data().reqId) {
      await db.collection("users").doc(targetId).collection("friendRequests").doc(mirror.data().reqId).delete();
    }
  } catch (e) { console.warn("cancelSentRequest remote failed", e); }
  await db.collection("users").doc(fbUser.uid).collection("sentRequests").doc(targetId).delete().catch(function() {});
  loadSocialSentRequests();
}

async function loadSocialSentRequests() {
  var section = document.getElementById("social-sent-section");
  var list = document.getElementById("social-sent-list");
  if (!section || !list || !fbUser) return;
  var snap;
  try {
    snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("sentRequests").get();
  } catch (e) { section.style.display = "none"; return; }
  if (snap.empty) { section.style.display = "none"; return; }
  var rows = await Promise.all(snap.docs.map(async function(doc) {
    var d = doc.data();
    try {
      // ya aceptada: autolimpieza del espejo
      var fr = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(doc.id).get();
      if (fr.exists) {
        await firebase.firestore().collection("users").doc(fbUser.uid).collection("sentRequests").doc(doc.id).delete().catch(function() {});
        return null;
      }
    } catch (e) {}
    return { id: doc.id, name: d.toName || "Amigo" };
  }));
  rows = rows.filter(Boolean);
  if (!rows.length) { section.style.display = "none"; return; }
  section.style.display = "block";
  list.innerHTML = rows.map(function(r) {
    return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;font-size:13px;border-bottom:1px solid var(--line);">' +
      '<span style="flex:1;font-weight:500;">' + esc(r.name) + '</span>' +
      '<span style="font-size:11px;color:var(--ink-soft);">pendiente</span>' +
      '<button class="social-sent-cancel" data-id="' + r.id + '" style="font-size:11px;padding:0.25rem 0.6rem;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink-soft);cursor:pointer;">Cancelar</button></div>';
  }).join("");
  list.querySelectorAll(".social-sent-cancel").forEach(function(b) {
    b.addEventListener("click", function() { cancelSentRequest(this.dataset.id); });
  });
}

/* ---------- FRIENDS ---------- */

async function addFriendByCode(code) {
  // now sends a friend request instead of direct add
  await sendFriendRequest(code);
}

var friendUndoTimer = null;
async function removeFriend(friendId) {
  if (!fbUser) return;
  var db = firebase.firestore();
  var myCode = "", theirCode = "";
  try {
    var myDoc = await db.collection("users").doc(fbUser.uid).get();
    if (myDoc.exists) myCode = myDoc.data().friendCode || "";
    var myRef = await db.collection("users").doc(fbUser.uid).collection("friends").doc(friendId).get();
    if (myRef.exists) theirCode = myRef.data().friendCode || "";
  } catch (e) {}
  try {
    await db.collection("users").doc(fbUser.uid).collection("friends").doc(friendId).delete();
    await db.collection("users").doc(friendId).collection("friends").doc(fbUser.uid).delete();
  } catch (e) { console.warn("removeFriend failed", e); return; }
  loadSocialFriendsList();
  var toast = document.getElementById("undo-toast");
  var msgEl = document.getElementById("undo-toast-msg");
  var btn = document.getElementById("undo-toast-btn");
  if (toast && msgEl && btn) {
    msgEl.textContent = "Amigo eliminado";
    toast.style.display = "flex";
    btn.onclick = async function() {
      try {
        await db.collection("users").doc(fbUser.uid).collection("friends").doc(friendId).set({ friendCode: theirCode, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection("users").doc(friendId).collection("friends").doc(fbUser.uid).set({ friendCode: myCode, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (e) { console.warn("friend undo failed", e); }
      loadSocialFriendsList();
      toast.style.display = "none";
      clearTimeout(friendUndoTimer);
    };
    clearTimeout(friendUndoTimer);
    friendUndoTimer = setTimeout(function() { toast.style.display = "none"; }, 15000);
  }
}

async function getFriends() {
  if (!fbUser) return [];
  var myStats = computePublicStats();
  var myName = fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "T");
  var people = [{
    id: fbUser.uid, displayName: myName,
    isSelf: true, totalMinutes: myStats.totalMinutes, isPrivate: false
  }];
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var others = await Promise.all(snap.docs.map(async function(fDoc) {
    var fId = fDoc.id;
    var results = await Promise.all([
      firebase.firestore().collection("users").doc(fId).get(),
      firebase.firestore().collection("users").doc(fId).collection("public").doc("stats").get()
    ]);
    var fUser = results[0], fStats = results[1];
    if (!fUser.exists) return null;
    var priv = fUser.data().privacy || {};
    if (priv.ranking || priv.total) {
      return { id: fId, displayName: fUser.data().displayName || "Amigo", isPrivate: true, totalMinutes: -1 };
    }
    var mins = 0;
    if (fStats.exists && typeof fStats.data().totalMinutes === "number") {
      mins = fStats.data().totalMinutes;
    } else {
      // compat: amigos con app antigua sin public/stats (puede denegarlo: entonces 0)
      try {
        var fData = await firebase.firestore().collection("users").doc(fId).collection("data").doc("state").get();
        mins = fData.exists ? totalFromState(fData.data().state) : 0;
      } catch (e) {}
    }
    return {
      id: fId, displayName: fUser.data().displayName || "Amigo",
      friendCode: fUser.data().friendCode,
      totalMinutes: mins, isPrivate: false
    };
  }));
  others.forEach(function(p) { if (p) people.push(p); });
  return people.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
}

async function getFriendsWithRange(days) {
  if (!fbUser) return [];
  var myName = fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "T");
  var people = [];
  var since = Date.now() - days * 24 * 60 * 60 * 1000;
  if (days === 7) {
    // Ranking semanal desde public/stats: sin leer actividad ajena.
    var myStats = computePublicStats();
    var myW = myStats.last7Days.reduce(function(t, d) { return t + (d.minutes || 0); }, 0);
    people.push({ id: fbUser.uid, displayName: myName, isSelf: true, totalMinutes: myW, isPrivate: false });
    var snapW = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
    var othersW = await Promise.all(snapW.docs.map(async function(fDoc) {
      var fId = fDoc.id;
      var results = await Promise.all([
        firebase.firestore().collection("users").doc(fId).get(),
        firebase.firestore().collection("users").doc(fId).collection("public").doc("stats").get()
      ]);
      var fUser = results[0], fStats = results[1];
      if (!fUser.exists) return null;
      var priv = fUser.data().privacy || {};
      if (priv.ranking || priv.total || priv.weekly) {
        return { id: fId, displayName: fUser.data().displayName || "Amigo", isPrivate: true, totalMinutes: -1 };
      }
      var w = 0;
      if (fStats.exists && Array.isArray(fStats.data().last7Days)) {
        w = fStats.data().last7Days.reduce(function(t, d) { return t + (d.minutes || 0); }, 0);
      } else {
        try {
          var actSnap = await firebase.firestore().collection("users").doc(fId).collection("activity").where("clientTs", ">=", since).get();
          actSnap.forEach(function(a) { w += (a.data().seconds || 0) / 60; });
          w = Math.round(w);
        } catch (e) {}
      }
      return {
        id: fId, displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: Math.round(w), isPrivate: false
      };
    }));
    othersW.forEach(function(p) { if (p) people.push(p); });
    return people.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
  }
  // Mensual/anual: rango local propio + consulta de actividad ajena con privacidad.
  people.push({
    id: fbUser.uid, displayName: myName,
    isSelf: true, totalMinutes: rangeMinutesLocal(days), isPrivate: false
  });
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var others = await Promise.all(snap.docs.map(async function(fDoc) {
    var fId = fDoc.id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (!fUser.exists) return null;
    var priv = fUser.data().privacy || {};
    if (priv.ranking || priv.total) {
      return { id: fId, displayName: fUser.data().displayName || "Amigo", isPrivate: true, totalMinutes: -1 };
    }
    var activitySnap = await firebase.firestore().collection("users").doc(fId).collection("activity").where("clientTs", ">=", since).get();
    var pMinutes = 0;
    activitySnap.forEach(function(a) { pMinutes += (a.data().seconds || 0) / 60; });
    return {
      id: fId, displayName: fUser.data().displayName || "Amigo",
      friendCode: fUser.data().friendCode,
      totalMinutes: Math.round(pMinutes), isPrivate: false
    };
  }));
  others.forEach(function(p) { if (p) people.push(p); });
  return people.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
}

async function getMyFriendCode() {
  if (!fbUser) return null;
  var doc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  return doc.exists ? doc.data().friendCode || null : null;
}

function totalFromState(s) {
  if (!s) return 0;
  var t = 0;
  (s.sessions || []).forEach(function(ses) { t += (ses.seconds || 0) / 60; });
  (s.youtube || []).forEach(function(v) { t += ((v.seconds || v.duration || 0) / 60); });
  (s.shows || []).forEach(function(sh) { t += ((sh.episodesWatched || 0) * (sh.epDuration || 0)); });
  (s.movies || []).forEach(function(m) { t += ((m.seconds || m.duration || 0) / 60); });
  return Math.round(t);
}

function getLocalPrivacy() {
  try { return JSON.parse(localStorage.getItem("privacy") || "{}"); } catch (e) { return {}; }
}

// Todas las actividades con timestamp (sesiones + listas media), como el modal rico.
function aggregateAllActivities(s) {
  var all = [];
  (s.sessions || []).forEach(function(x) { if (x.ts) all.push({ ts: x.ts, sec: x.seconds || 0 }); });
  (s.youtube || []).forEach(function(v) { if (v.ts) all.push({ ts: v.ts, sec: v.seconds || v.duration || 0 }); });
  (s.shows || []).forEach(function(sh) { if (sh.ts) all.push({ ts: sh.ts, sec: (sh.episodesWatched || 0) * (sh.epDuration || 0) * 60 }); });
  (s.movies || []).forEach(function(m) { if (m.ts) all.push({ ts: m.ts, sec: m.seconds || m.duration || 0 }); });
  return all;
}

function computeLocalStreak(all) {
  var dates = {};
  all.forEach(function(a) { if (a.ts) dates[new Date(a.ts).toDateString()] = true; });
  var keys = Object.keys(dates).sort();
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var cur = 0, d = new Date(today);
  if (!dates[d.toDateString()]) d.setDate(d.getDate() - 1); // ayer cuenta como racha viva
  while (dates[d.toDateString()]) { cur++; d.setDate(d.getDate() - 1); }
  var longest = 0, run = 0, prev = null;
  keys.forEach(function(k) {
    var t = new Date(k);
    if (prev && (t - prev) === 86400000) run++; else run = 1;
    if (run > longest) longest = run;
    prev = t;
  });
  return { current: cur, longest: longest };
}

function rangeMinutesLocal(days) {
  var cutoff = Date.now() - days * 86400000;
  var t = 0;
  aggregateAllActivities(state).forEach(function(a) { if (a.ts >= cutoff) t += a.sec; });
  return Math.round(t / 60);
}

// Agregados para users/{uid}/public/stats — ÚNICA fuente que leen otros usuarios.
// Se pre-filtran con la privacidad del dueño (ver getLocalPrivacy).
function computePublicStats() {
  var s = state;
  var sessions = s.sessions || [];
  var langTotals = {}, langSessions = {};
  sessions.forEach(function(ses) {
    var l = ses.lang || "otro";
    var m = (ses.seconds || 0) / 60;
    if (!langTotals[l]) { langTotals[l] = 0; langSessions[l] = 0; }
    langTotals[l] += m; langSessions[l]++;
  });
  var perLang = Object.keys(langTotals).map(function(l) {
    return { name: l, minutes: Math.round(langTotals[l]), sessions: langSessions[l] };
  }).sort(function(a, b) { return b.minutes - a.minutes; });
  var maxM = perLang.length ? perLang[0].minutes : 1;
  perLang.forEach(function(l) { l.pct = Math.round(l.minutes / maxM * 100); });
  var all = aggregateAllActivities(s);
  function daySum(ts0, ts1) {
    var t = 0;
    all.forEach(function(a) { if (a.ts >= ts0 && a.ts < ts1) t += a.sec; });
    return Math.round(t / 60);
  }
  var start = new Date(); start.setHours(0, 0, 0, 0);
  var last7Days = [], daily = [];
  for (var back = 370; back >= 0; back--) {
    var d0 = new Date(start); d0.setDate(d0.getDate() - back);
    var d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    var mins = daySum(d0.getTime(), d1.getTime());
    daily.push({ dateStr: d0.toDateString(), minutes: mins });
    if (back < 7) last7Days.push({ label: d0.toLocaleDateString("es", { weekday: "short" }), minutes: mins });
  }
  var streak = computeLocalStreak(all);
  var recent = sessions.slice(-10).reverse().map(function(ses) {
    return { note: ses.note || ses.cat || "Sesión", seconds: ses.seconds || 0, lang: ses.lang || "", ts: ses.ts || 0 };
  });
  var ps = {
    totalMinutes: totalFromState(s),
    totalSessions: sessions.length,
    perLang: perLang,
    streakCurrent: streak.current,
    streakLongest: streak.longest,
    last7Days: last7Days,
    daily: daily,
    recent: recent,
    updatedAt: Date.now()
  };
  var privacy = getLocalPrivacy();
  if (privacy.total || privacy.ranking) { ps.totalMinutes = 0; ps.totalSessions = 0; }
  if (privacy.languages) ps.perLang = [];
  if (privacy.weekly) ps.last7Days = [];
  if (privacy.daily) ps.daily = [];
  if (privacy.recent) ps.recent = [];
  if (privacy.streak) { ps.streakCurrent = 0; ps.streakLongest = 0; }
  return ps;
}

var lastPublicStatsSig = "";
async function writePublicStats(force) {
  if (!fbUser || !firebaseConfigured()) return;
  try {
    var ps = computePublicStats();
    var sig = ps.totalSessions + ":" + ps.totalMinutes + ":" + ps.streakCurrent + ":" +
      JSON.stringify(ps.last7Days) + ":" + JSON.stringify(ps.recent.map(function(r) { return r.ts; }));
    if (!force && sig === lastPublicStatsSig) return;
    lastPublicStatsSig = sig;
    await firebase.firestore().collection("users").doc(fbUser.uid).collection("public").doc("stats").set(ps);
  } catch (e) { console.warn("publicStats write failed", e); }
}

async function getRichProfileData(userId) {
  if (!fbUser) return null;
  var userDoc = await firebase.firestore().collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  var ud = userDoc.data();
  var isViewerOwner = fbUser.uid === userId;
  if (!isViewerOwner) return getFriendPublicProfile(userId);
  // load privacy settings (only apply when viewing someone else)
  var privacy = {};
  if (!isViewerOwner && ud.privacy) privacy = ud.privacy;
  var stateDoc = await firebase.firestore().collection("users").doc(userId).collection("data").doc("state").get();
  var s = stateDoc.exists ? stateDoc.data().state : null;
  var sessions = s ? s.sessions || [] : [];
  // per-language
  var langTotals = {}, langSessions = {};
  sessions.forEach(function(ses) {
    var l = ses.lang || "otro";
    var m = (ses.seconds || 0) / 60;
    if (!langTotals[l]) { langTotals[l] = 0; langSessions[l] = 0; }
    langTotals[l] += m;
    langSessions[l]++;
  });
  var langArr = Object.keys(langTotals).map(function(l) {
    return { name: l, minutes: Math.round(langTotals[l]), sessions: langSessions[l] };
  }).sort(function(a, b) { return b.minutes - a.minutes; });
  var maxLangMin = langArr.length > 0 ? langArr[0].minutes : 1;
  langArr.forEach(function(l) { l.pct = Math.round(l.minutes / maxLangMin * 100); });
  // gather all activities with timestamps
  function getAllActivities(state) {
    var all = [];
    (state.sessions || []).forEach(function(s) { if (s.ts) all.push({ ts: s.ts, sec: s.seconds || 0 }); });
    (state.youtube || []).forEach(function(v) { if (v.ts) all.push({ ts: v.ts, sec: v.seconds || v.duration || 0 }); });
    (state.shows || []).forEach(function(sh) { if (sh.ts) all.push({ ts: sh.ts, sec: (sh.episodesWatched || 0) * (sh.epDuration || 0) * 60 }); });
    (state.movies || []).forEach(function(m) { if (m.ts) all.push({ ts: m.ts, sec: m.seconds || m.duration || 0 }); });
    return all;
  }
  function buildDayTotals(allActivities, numDays) {
    var totals = {};
    for (var d = 0; d < numDays; d++) {
      var t = new Date(Date.now() - d * 86400000);
      totals[t.toDateString()] = 0;
    }
    var cutoff = Date.now() - numDays * 86400000;
    allActivities.forEach(function(a) {
      if (a.ts < cutoff) return;
      var key = new Date(a.ts).toDateString();
      if (totals[key] !== undefined) totals[key] += a.sec / 60;
    });
    return totals;
  }
  var allActivities = s ? getAllActivities(s) : [];
  var dayTotals = buildDayTotals(allActivities, 7);
  var days = Object.keys(dayTotals).reverse().map(function(k) {
    return { label: new Date(k).toLocaleDateString("es", { weekday: "short" }), minutes: Math.round(dayTotals[k]) };
  });
  var maxDay = Math.max(1, days.reduce(function(mx, d) { return Math.max(mx, d.minutes); }, 0));
  // streak from all activities (all-time)
  var streak = { current: 0, longest: 0 };
  var datesWithActivity = {};
  allActivities.forEach(function(a) {
    if (a.ts) datesWithActivity[new Date(a.ts).toDateString()] = true;
  });
  var allDates = Object.keys(datesWithActivity).sort().reverse();
  var cur = 0, longest = 0;
  var todayStr = new Date().toDateString();
  var yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  if (allDates.length > 0 && (allDates[0] === todayStr || allDates[0] === yesterdayStr)) {
    for (var si = 0; si < allDates.length; si++) {
      var expected = new Date();
      expected.setDate(expected.getDate() - si);
      if (allDates[si] === expected.toDateString()) { cur++; }
      else { break; }
    }
  }
  // calculate longest streak
  var sortedDates = Object.keys(datesWithActivity).sort();
  var run2 = 0;
  for (var si2 = 0; si2 < sortedDates.length; si2++) {
    if (si2 === 0) { run2 = 1; continue; }
    var prev = new Date(sortedDates[si2 - 1]);
    var curr = new Date(sortedDates[si2]);
    var diff2 = (curr - prev) / 86400000;
    if (diff2 === 1) { run2++; }
    else { run2 = 1; }
    if (run2 > longest) longest = run2;
  }
  streak.current = cur;
  streak.longest = longest;
  // daily totals (last 371 days = 53 weeks) for heatmap (same as stats)
  var dayTotals53w = buildDayTotals(allActivities, 371);
  var daily = Object.keys(dayTotals53w).reverse().map(function(k) {
    var d = new Date(k);
    var today = new Date();
    var dayDiff = Math.round((today - d) / 86400000);
    var label = dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Ayer" : d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
    return { label: label, minutes: Math.round(dayTotals53w[k]), dateStr: k };
  });
  // recent sessions
  var recent = sessions.slice(-10).reverse().map(function(ses) {
    return { note: ses.note || ses.cat || "Sesi&oacute;n", seconds: ses.seconds || 0, lang: ses.lang || "", ts: ses.ts || 0 };
  });
  var result = {
    displayName: ud.displayName || "Usuario",
    bio: ud.bio || "",
    avatarBase64: ud.avatarBase64 || ud.avatarUrl || "",
    friendCode: ud.friendCode || "",
    totalSessions: sessions.length,
    totalMinutes: totalFromState(s),
    languages: langArr,
    weekly: { days: days, max: maxDay },
    daily: daily,
    streak: streak,
    recent: recent
  };
  // apply privacy filter (hide sections when viewing someone else)
  result.hidden = {};
  if (privacy.total) { result.hidden.total = true; result.totalMinutes = 0; result.totalSessions = 0; }
  if (privacy.languages) { result.hidden.languages = true; result.languages = []; }
  if (privacy.weekly) { result.hidden.weekly = true; result.weekly = { days: [], max: 0 }; }
  if (privacy.daily) { result.hidden.daily = true; result.daily = []; }
  if (privacy.recent) { result.hidden.recent = true; result.recent = []; }
  if (privacy.streak) { result.hidden.streak = true; result.streak = { current: 0, longest: 0 }; }
  return result;
}

// Perfil ajeno desde public/stats (pre-filtrado) + flags del dueño para la UI.
// Nunca lee el data/state ajeno: respeta la privacidad por construcción.
async function getFriendPublicProfile(userId) {
  var userDoc = await firebase.firestore().collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  var ud = userDoc.data();
  var privacy = ud.privacy || {};
  var statsDoc = await firebase.firestore().collection("users").doc(userId).collection("public").doc("stats").get();
  var ps = statsDoc.exists ? statsDoc.data() : null;
  var result = {
    displayName: ud.displayName || "Usuario",
    bio: privacy.bio ? "" : (ud.bio || ""),
    avatarBase64: privacy.avatar ? "" : (ud.avatarBase64 || ud.avatarUrl || ""),
    accentColor: ud.accentColor || "",
    friendCode: ud.friendCode || "",
    totalSessions: 0, totalMinutes: 0, languages: [],
    weekly: { days: [], max: 0 }, daily: [],
    streak: { current: 0, longest: 0 }, recent: [],
    hidden: {}
  };
  if (!ps) {
    result.hidden = { total: true, languages: true, weekly: true, daily: true, recent: true, streak: true };
    return result;
  }
  if (privacy.total || privacy.ranking) result.hidden.total = true;
  else { result.totalMinutes = ps.totalMinutes || 0; result.totalSessions = ps.totalSessions || 0; }
  if (privacy.languages) result.hidden.languages = true;
  else result.languages = (ps.perLang || []).map(function(l) { return { name: l.name, minutes: l.minutes, sessions: l.sessions, pct: l.pct }; });
  if (privacy.weekly) result.hidden.weekly = true;
  else {
    var days = ps.last7Days || [];
    result.weekly = { days: days, max: Math.max(1, days.reduce(function(mx, d) { return Math.max(mx, d.minutes || 0); }, 0)) };
  }
  if (privacy.daily) result.hidden.daily = true;
  else result.daily = ps.daily || [];
  if (privacy.streak) result.hidden.streak = true;
  else result.streak = { current: ps.streakCurrent || 0, longest: ps.streakLongest || 0 };
  if (privacy.recent) result.hidden.recent = true;
  else result.recent = (ps.recent || []).map(function(s) { return { note: s.note, seconds: s.seconds, lang: s.lang, ts: s.ts }; });
  return result;
}

// keep old getFriendProfile as alias for backward compat
var getFriendProfile = getRichProfileData;

/* ---------- ACTIVITY FEED ---------- */

async function getFriendActivityFeed(limit) {
  if (!fbUser) return [];
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var perFriend = await Promise.all(snap.docs.map(async function(fDoc) {
    var fId = fDoc.id;
    var results = await Promise.all([
      firebase.firestore().collection("users").doc(fId).get(),
      firebase.firestore().collection("users").doc(fId).collection("activity").orderBy("clientTs", "desc").limit(5).get()
    ]);
    var fUser = results[0], actSnap = results[1];
    if (fUser.exists && fUser.data().privacy && fUser.data().privacy.feed) return [];
    var fName = fUser.exists ? (fUser.data().displayName || "Amigo") : "Amigo";
    var items = [];
    actSnap.forEach(function(a) {
      var d = a.data();
      items.push({ friendName: fName, friendId: fId, ts: d.clientTs || 0, note: d.note || "", seconds: d.seconds || 0, lang: d.lang || "", cat: d.cat || "" });
    });
    return items;
  }));
  var all = [];
  perFriend.forEach(function(items) { all = all.concat(items); });
  all.sort(function(a, b) { return b.ts - a.ts; });
  return all.slice(0, Math.max(limit || 10, 10));
}

/* ---------- UI ---------- */

function updateProfileUI() {
  var btn = document.getElementById("profile-btn");
  var avatar = document.getElementById("profile-avatar");
  var img = document.getElementById("profile-img");
  var loggedOut = document.getElementById("prof-logged-out");
  var loggedIn = document.getElementById("prof-logged-in");

  if (!btn) return;

  if (fbUser) {
    var nameEl = document.getElementById("prof-user-name");
    var emailEl = document.getElementById("prof-user-email");
    var avatarBig = document.getElementById("prof-user-avatar");

    // social page visibility
    var sLoggedOut = document.getElementById("social-logged-out");
    var sLoggedIn = document.getElementById("social-logged-in");
    if (sLoggedOut) sLoggedOut.style.display = "none";
    if (sLoggedIn) sLoggedIn.style.display = "block";

    if (avatar) avatar.style.display = "none";
    if (img) {
      img.style.display = "block";
      var gravUrl = getGravatarUrl(fbUser.email, 80);
      img.src = gravUrl;
      img.onerror = function() { img.style.display = "none"; if (avatar) avatar.style.display = "flex"; };
    }
    // try loading custom photo for navbar avatar
    firebase.firestore().collection("users").doc(fbUser.uid).get().then(function(doc) {
      var av = doc.exists && (doc.data().avatarBase64 || doc.data().avatarUrl);
      if (av && img) { img.src = av; if (avatar) avatar.style.display = "none"; img.style.display = "block"; }
    }).catch(function() {});
    if (loggedOut) loggedOut.style.display = "none";
    if (loggedIn) loggedIn.style.display = "block";
    if (nameEl) nameEl.textContent = fbUser.displayName || fbUser.email.split("@")[0];
    if (emailEl) emailEl.textContent = fbUser.email;
    // verification banner (password accounts only)
    var verifyBanner = document.getElementById("prof-verify-banner");
    if (verifyBanner) verifyBanner.style.display = (isPasswordProvider() && !fbUser.emailVerified) ? "flex" : "none";
    // verified badge in header
    var badge = document.getElementById("prof-user-badge");
    if (badge) {
      badge.style.display = "";
      if (!isPasswordProvider() || fbUser.emailVerified) { badge.className = "prof-user-badge ok"; badge.textContent = "Verificado"; }
      else { badge.className = "prof-user-badge warn"; badge.textContent = "Sin verificar"; }
    }
    // cambio de contraseña solo para cuentas email/pass (Google no tiene)
    var passSection = document.getElementById("prof-pass-section");
    if (passSection) passSection.style.display = isPasswordProvider() ? "" : "none";
    // hide edit/account views when re-opening dropdown
    var editView = document.getElementById("prof-edit-view");
    if (editView) editView.style.display = "none";
    var accView0 = document.getElementById("prof-account-view");
    if (accView0) accView0.style.display = "none";

    // load profile data from Firestore for edit view
    var editNameInput = document.getElementById("prof-edit-name-input");
    var editBio = document.getElementById("prof-edit-bio");
    var editAvatar = document.getElementById("prof-edit-avatar");
    firebase.firestore().collection("users").doc(fbUser.uid).get().then(function(doc) {
      if (doc.exists) {
        var d = doc.data();
        if (editNameInput) editNameInput.value = d.displayName || fbUser.displayName || "";
        if (editBio) editBio.value = d.bio || "";
        if (editAvatar && (d.avatarBase64 || d.avatarUrl)) {
          editAvatar.style.backgroundImage = "url(" + (d.avatarBase64 || d.avatarUrl) + ")";
          editAvatar.style.backgroundSize = "cover";
        } else if (editAvatar) {
          loadGravatarBig(editAvatar);
        }
        // highlight selected accent color (+ remember saved for cancel-revert)
        window._savedAccent = d.accentColor || null;
        if (d.accentColor) {
          applyAccentColor(d.accentColor);
          document.querySelectorAll(".prof-accent-btn").forEach(function(b) {
            b.style.borderColor = b.dataset.color === d.accentColor ? "var(--accent)" : "transparent";
          });
        }
      } else {
        if (editAvatar) loadGravatarBig(editAvatar);
      }
    }).catch(function() {
      if (editAvatar) loadGravatarBig(editAvatar);
    });
    // also load avatar for dropdown user card (never set textContent — preserves file input child)
    if (avatarBig) {
      firebase.firestore().collection("users").doc(fbUser.uid).get().then(function(doc) {
        var av = doc.exists && (doc.data().avatarBase64 || doc.data().avatarUrl);
        if (av) {
          avatarBig.style.backgroundImage = "url(" + av + ")";
          avatarBig.style.backgroundSize = "cover";
        } else {
          loadGravatarBig(avatarBig);
        }
      }).catch(function() { loadGravatarBig(avatarBig); });
    }

  } else {
    if (avatar) avatar.style.display = "flex";
    if (img) { img.style.display = "none"; img.src = ""; }
    if (loggedOut) loggedOut.style.display = "block";
    if (loggedIn) loggedIn.style.display = "none";
    var sLoggedOut = document.getElementById("social-logged-out");
    var sLoggedIn = document.getElementById("social-logged-in");
    if (sLoggedOut) sLoggedOut.style.display = "block";
    if (sLoggedIn) sLoggedIn.style.display = "none";
  }
}

/* ---------- RICH PROFILE MODAL ---------- */

async function showRichProfile(friendId, isSelf) {
  try {
  var overlay = document.getElementById("friend-modal-overlay");
  if (!overlay) return;
  var profile = null;
  try { profile = await getRichProfileData(friendId); }
  catch (e) { console.error("showRichProfile load error:", e); }
  if (!profile) {
    // Error visible (antes moría en silencio): suele ser reglas sin desplegar.
    document.getElementById("fm-name").textContent = "No se pudo cargar el perfil";
    document.getElementById("fm-bio").textContent = "Revisa tu conexión y despliega las reglas: firebase deploy --only firestore:rules.";
    var fcErr = document.getElementById("fm-friendcode");
    if (fcErr) fcErr.textContent = "";
    var stErr = document.getElementById("fm-stats");
    if (stErr) stErr.innerHTML = "";
    overlay.style.display = "flex";
    return;
  }
  var isOwn = isSelf || friendId === (fbUser && fbUser.uid);
  if (!isOwn && !isEmailVerifiedForSocial()) {
    setSyncStatus("Verifica tu email para ver perfiles.");
    setTimeout(function() { setSyncStatus(""); }, 2500);
    return;
  }
  // comparativa semanal tú vs amigo (solo viendo a otros)
  var cmpEl = document.getElementById("fm-compare");
  if (!isOwn) {
    var myWeek = rangeMinutesLocal(7);
    var frWeek = (profile.weekly && profile.weekly.days) ? profile.weekly.days.reduce(function(t, d) { return t + (d.minutes || 0); }, 0) : 0;
    if (!cmpEl) {
      var chartSec = document.getElementById("fm-chart-section");
      if (chartSec) {
        cmpEl = document.createElement("div");
        cmpEl.id = "fm-compare";
        cmpEl.style.cssText = "font-size:12px;color:var(--ink-soft);margin-bottom:0.5rem;";
        chartSec.insertBefore(cmpEl, chartSec.firstChild);
      }
    }
    if (cmpEl) {
      cmpEl.style.display = profile.hidden.weekly ? "none" : "";
      cmpEl.textContent = "Esta semana: tú " + formatHM(myWeek * 60) + " · " + profile.displayName + " " + formatHM(frWeek * 60);
    }
  } else if (cmpEl) cmpEl.style.display = "none";

  // header
  document.getElementById("fm-name").textContent = profile.displayName;
  document.getElementById("fm-bio").textContent = profile.bio;
  document.getElementById("fm-friendcode").textContent = profile.friendCode ? "Código: " + profile.friendCode : "";
  var langsPill = document.getElementById("fm-pill-langs");
  if (langsPill) langsPill.textContent = profile.hidden.languages ? "" : ((profile.languages || []).length + ((profile.languages || []).length === 1 ? " idioma" : " idiomas"));
  var streakPill = document.getElementById("fm-pill-streak");
  if (streakPill) {
    streakPill.textContent = profile.hidden.streak ? "" : ("Racha: " + (profile.streak ? profile.streak.current : 0) + " días");
    streakPill.classList.toggle("hot", !profile.hidden.streak && profile.streak && profile.streak.current > 0);
  }
  var avatarEl = document.getElementById("fm-avatar");
  if (profile.avatarBase64) {
    avatarEl.style.backgroundImage = "url(" + profile.avatarBase64 + ")";
    avatarEl.textContent = "";
  } else {
    avatarEl.style.backgroundImage = "";
    avatarEl.textContent = (profile.displayName || "?")[0].toUpperCase();
  }
  var heroEl = document.getElementById("fm-hero");
  if (heroEl) {
    var heroAcc = isOwn
      ? ((getComputedStyle(document.documentElement).getPropertyValue("--accent") || "").trim() || "#b3502e")
      : (profile.accentColor || "#2f5d4f");
    heroEl.style.setProperty("--fm-accent", heroAcc);
  }

  // stats cards — 3 per row
  var totalH = Math.floor(profile.totalMinutes / 60);
  var totalM = profile.totalMinutes % 60;
  var topLang = profile.hidden.languages ? "---" : (profile.languages.length > 0 ? profile.languages[0].name : "---");
  var topLangHours = profile.hidden.languages ? 0 : (profile.languages.length > 0 ? Math.floor(profile.languages[0].minutes / 60) : 0);
  var statCards = [
    { val: profile.hidden.total ? "---" : profile.totalSessions, label: "sesiones" },
    { val: profile.hidden.total ? "---" : totalH + "h " + totalM + "m", label: "total" },
    { val: profile.hidden.languages ? "---" : profile.languages.length, label: "idiomas" },
    { val: profile.hidden.streak ? "---" : "current", label: "racha actual", dynamic: !profile.hidden.streak },
    { val: profile.hidden.streak ? "---" : "longest", label: "mejor racha", dynamic: !profile.hidden.streak },
    { val: profile.hidden.languages ? "---" : topLangHours + "h", label: esc(topLang) }
  ];
  document.getElementById("fm-stats").innerHTML = statCards.map(function(c) {
    var val = c.val;
    if (c.dynamic) {
      var key = c.val;
      var raw = profile.streak ? profile.streak[key] : 0;
      val = raw + " días";
    }
    return '<div class="kpi-card"><div class="kpi-value">' + val + '</div><div class="kpi-label">' + esc(c.label) + '</div></div>';
  }).join("");

  // language bars
  var langsSection = document.getElementById("fm-langs-section");
  if (profile.hidden.languages) {
    if (langsSection) langsSection.style.display = "none";
  } else {
    if (langsSection) langsSection.style.display = "";
    var langColors = ["var(--accent)", "var(--green)", "var(--blue)", "var(--purple)", "var(--gold)"];
    var langHtml = profile.languages.length === 0 ? '<p style="font-size:12px;color:var(--ink-soft);margin:0;">Sin datos</p>' :
      profile.languages.map(function(l, i) {
        var c = langColors[i % langColors.length];
        return '<div style="margin-bottom:0.35rem;">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span>' + esc(l.name) + '</span><span style="font-family:var(--mono);color:var(--ink-soft);">' + Math.floor(l.minutes / 60) + 'h ' + l.minutes % 60 + 'm (' + l.sessions + ' ses)</span></div>' +
          '<div style="height:6px;border-radius:3px;background:var(--line);overflow:hidden;"><div style="height:100%;width:' + l.pct + '%;border-radius:3px;background:' + c + ';transition:width 0.3s;"></div></div></div>';
      }).join("");
    document.getElementById("fm-langs").innerHTML = langHtml;
  }

  // weekly chart — bigger bars
  var chartSection = document.getElementById("fm-chart-section");
  if (profile.hidden.weekly) {
    if (chartSection) chartSection.style.display = "none";
  } else {
    if (chartSection) chartSection.style.display = "";
    var chartEl = document.getElementById("fm-chart");
    if (chartEl) {
      var daysArr = (profile.weekly && profile.weekly.days) ? profile.weekly.days : [];
      var maxVal = Math.max((profile.weekly && profile.weekly.max) || 0, 1);
      if (daysArr.length === 0) {
        chartEl.innerHTML = '<p style="margin:0;font-size:11px;color:var(--ink-soft);">Sin datos esta semana</p>';
      } else {
        chartEl.style.height = "100px";
        chartEl.style.gap = "6px";
        chartEl.innerHTML = daysArr.map(function(d) {
          var raw = d.minutes / maxVal;
          var pct = Math.max(raw * 100, raw > 0 ? 8 : 3);
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100px;justify-content:flex-end;">' +
            '<div style="font-size:10px;color:var(--ink-soft);margin-bottom:4px;font-family:var(--mono);">' +           (function(mins) {
              if (mins <= 0) return "";
              var h = Math.floor(mins / 60);
              var m = mins % 60;
              return h > 0 ? h + "h" + (m > 0 ? " " + m + "m" : "") : m + "m";
            })(d.minutes) + '</div>' +
            '<div style="width:100%;max-width:48px;height:' + pct + '%;min-height:4px;border-radius:4px 4px 0 0;background:var(--accent);opacity:' + (d.minutes > 0 ? "1" : "0.2") + ';"></div>' +
            '<div style="font-size:10px;color:var(--ink-soft);margin-top:4px;">' + d.label + '</div></div>';
        }).join("");
      }
    }
  }
  // daily heatmap (same as stats page)
  var dailySection = document.getElementById("fm-daily-section");
  if (profile.hidden.daily) {
    if (dailySection) dailySection.style.display = "none";
  } else {
    if (dailySection) dailySection.style.display = "";
    var dailyEl = document.getElementById("fm-daily");
    if (dailyEl) {
    var dayMap = {};
    (profile.daily || []).forEach(function(d) { dayMap[d.dateStr] = d.minutes * 60; });
    if (Object.keys(dayMap).length === 0) {
      dailyEl.innerHTML = '<p style="margin:0;font-size:11px;color:var(--ink-soft);">Sin actividad reciente</p>';
    } else {
      var vals = Object.keys(dayMap).filter(function(k) { return dayMap[k] > 0; }).map(function(k) { return dayMap[k]; });
      var max = vals.length ? Math.max.apply(null, vals) : 1;
      var WEEKS = 53;
      var today2 = new Date(); today2.setHours(0, 0, 0, 0);
      var dow = (today2.getDay() + 6) % 7;
      var startDate = new Date(today2);
      startDate.setDate(startDate.getDate() - dow - (WEEKS - 1) * 7);
      dailyEl.innerHTML = "";
      var inner = document.createElement("div");
      inner.style.cssText = "display:inline-flex;flex-direction:column;min-width:100%;";
      dailyEl.appendChild(inner);
      // month row
      var monthRow = document.createElement("div");
      monthRow.className = "heatmap-month-row";
      var spacer = document.createElement("div");
      spacer.className = "heatmap-month-spacer";
      spacer.style.width = "24px";
      monthRow.appendChild(spacer);
      var labelsContainer = document.createElement("div");
      labelsContainer.style.cssText = "display:flex;flex:1;gap:3px;";
      monthRow.appendChild(labelsContainer);
      inner.appendChild(monthRow);
      // body
      var body = document.createElement("div");
      body.className = "heatmap-body";
      var dayLabels = document.createElement("div");
      dayLabels.className = "heatmap-day-labels";
      ["", "L", "", "X", "", "V", ""].forEach(function(d) {
        var s = document.createElement("span"); s.textContent = d;
        dayLabels.appendChild(s);
      });
      body.appendChild(dayLabels);
      var columns = document.createElement("div");
      columns.className = "heatmap-columns";
      columns.style.gap = "3px";
      body.appendChild(columns);
      inner.appendChild(body);
      // columns
      var lastMonth = -1;
      for (var w = 0; w < WEEKS; w++) {
        var weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + w * 7);
        var m = weekStart.getMonth();
        var labelEl = document.createElement("div");
        labelEl.className = "heatmap-month-label";
        labelEl.style.flex = "1";
        labelEl.textContent = m !== lastMonth ? weekStart.toLocaleDateString("es", { month: "short" }) : "";
        if (m !== lastMonth) lastMonth = m;
        labelsContainer.appendChild(labelEl);
        var col = document.createElement("div");
        col.className = "heatmap-col";
        col.style.gap = "3px";
        for (var d = 0; d < 7; d++) {
          var date = new Date(startDate);
          date.setDate(date.getDate() + w * 7 + d);
          var secs = dayMap[date.toDateString()] || 0;
          var isFuture = date > today2;
          var level = isFuture ? 0 : secs === 0 ? 0 : secs < max * 0.25 ? 1 : secs < max * 0.5 ? 2 : secs < max * 0.75 ? 3 : 4;
          var cell = document.createElement("div");
          cell.className = "heatmap-cell";
          cell.dataset.level = level;
          if (isFuture) cell.dataset.future = "";
          if (date.toDateString() === today2.toDateString()) cell.dataset.today = "";
          cell.dataset.date = date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
          cell.dataset.time = secs ? formatHM(secs) : "";
          col.appendChild(cell);
        }
        columns.appendChild(col);
      }
      // tooltip
      var tip = document.getElementById("hm-tooltip");
      if (tip) {
        var tipDate = tip.querySelector(".hm-tooltip-date");
        var tipTime = tip.querySelector(".hm-tooltip-time");
        inner.querySelectorAll(".heatmap-cell").forEach(function(cell) {
          cell.addEventListener("mouseenter", function(e) {
            tipDate.textContent = cell.dataset.date;
            tipTime.textContent = cell.dataset.time || "Sin actividad";
            tipTime.style.color = cell.dataset.time ? "" : "rgba(255,255,255,0.4)";
            tip.classList.add("visible");
            tip.style.left = e.clientX + "px";
            tip.style.top = e.clientY + "px";
          });
          cell.addEventListener("mousemove", function(e) {
            tip.style.left = e.clientX + "px";
            tip.style.top = e.clientY + "px";
          });
          cell.addEventListener("mouseleave", function() {
            tip.classList.remove("visible");
          });
        });
      }
      }
    }
  }
  
  // recent sessions with badge
  var recentSection = document.getElementById("fm-recent-section");
  if (profile.hidden.recent) {
    if (recentSection) recentSection.style.display = "none";
  } else {
    if (recentSection) recentSection.style.display = "";
    var recentHtml = profile.recent.length === 0 ? '<p style="margin:0;font-size:12px;color:var(--ink-soft);">Sin sesiones</p>' :
    profile.recent.slice(0, 8).map(function(s) {
      var mins = Math.round((s.seconds || 0) / 60);
      var langBadge = s.lang ? '<span style="display:inline-block;margin-left:0.4rem;padding:0 6px;font-size:8px;line-height:16px;border-radius:4px;background:var(--accent-soft);color:var(--accent);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.3px;">' + esc(s.lang) + '</span>' : "";
      var fmt = mins > 0 ? (function(h,m){return h?h+"h"+(m?" "+m+"m":""):m+"m"})(Math.floor(mins/60), mins%60) : "—";
      return '<div style="display:flex;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--line);"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;color:var(--ink);">' + esc(s.note) + '</span><span style="display:flex;align-items:center;flex-shrink:0;">' + langBadge + '<span style="font-family:var(--mono);color:var(--ink-soft);margin-left:0.4rem;font-size:11px;">' + fmt + '</span></span></div>';
    }).join("");
    document.getElementById("fm-recent").innerHTML = recentHtml;
  }

  // action buttons: edit own profile vs remove friend
  var removeBtn = document.getElementById("fm-remove");
  var editOwnBtn = document.getElementById("fm-edit-own");
  if (isOwn) {
    if (removeBtn) removeBtn.style.display = "none";
    if (editOwnBtn) {
      editOwnBtn.style.display = "";
      editOwnBtn.onclick = function() {
        overlay.style.display = "none";
        toggleProfileDropdown();
        var loggedIn = document.getElementById("prof-logged-in");
        var editView = document.getElementById("prof-edit-view");
        if (loggedIn) loggedIn.style.display = "none";
        if (editView) editView.style.display = "block";
      };
    }
  } else {
    if (editOwnBtn) editOwnBtn.style.display = "none";
    if (removeBtn) {
      removeBtn.style.display = "";
      removeBtn.onclick = function() {
        overlay.style.display = "none";
        removeFriend(friendId);
      };
    }
  }
  // close button (X)
  var closeX = document.getElementById("fm-close-x");
  if (closeX) closeX.onclick = function() { overlay.style.display = "none"; };
  // click outside to close
  overlay.onclick = function(e) { if (e.target === overlay) overlay.style.display = "none"; };
  // reset to first tab on open
  var firstTab = document.querySelector('#fm-scroll .fm-tab[data-tab="overview"]');
  if (firstTab) firstTab.click();
  renderProfileAchievements(friendId, isOwn, profile);

  overlay.style.display = "flex";
  } catch (e) { console.error("showRichProfile error:", e); try { overlay.style.display = "flex"; } catch (_) {} }
}
// keep old name for backward compat
var showFriendProfile = showRichProfile;

function toggleProfileDropdown() {
  var dd = document.getElementById("profile-dropdown");
  var backdrop = document.getElementById("profile-backdrop");
  if (!dd) return;
  var isOpen = dd.classList.contains("open");
  dd.classList.toggle("open");
  if (backdrop) backdrop.style.display = isOpen ? "none" : "block";
}

function closeProfileDropdown() {
  var dd = document.getElementById("profile-dropdown");
  var backdrop = document.getElementById("profile-backdrop");
  if (dd) dd.classList.remove("open");
  if (backdrop) backdrop.style.display = "none";
}

/* ---------- PHOTO CROP ---------- */

var cropOffsetX = 0, cropOffsetY = 0;
var cropZoom = 1;
var cropDragging = false, cropStartX, cropStartY, cropOrigX, cropOrigY;

function openCropModal(file) {
  var overlay = document.getElementById("crop-modal-overlay");
  var img = document.getElementById("crop-image");
  if (!overlay || !img) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    img.src = e.target.result;
    img.onload = function() {
      cropOffsetX = 0; cropOffsetY = 0; cropZoom = 1;
      document.getElementById("crop-zoom").value = 1;
      applyCropTransform();
      overlay.style.display = "flex";
    };
  };
  reader.readAsDataURL(file);
}

function applyCropTransform() {
  var img = document.getElementById("crop-image");
  var container = document.getElementById("crop-container");
  if (!img || !container) return;
  var cw = container.clientWidth, ch = container.clientHeight;
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var fit = Math.min(cw / iw, ch / ih);
  var s = fit * cropZoom;
  img.style.width = (iw * s) + "px";
  img.style.height = (ih * s) + "px";
  img.style.left = ((cw - iw * s) / 2 + cropOffsetX) + "px";
  img.style.top = ((ch - ih * s) / 2 + cropOffsetY) + "px";
}

function getCropRect() {
  var img = document.getElementById("crop-image");
  var container = document.getElementById("crop-container");
  if (!img || !container) return null;
  var cw = container.clientWidth, ch = container.clientHeight;
  var iw = img.naturalWidth, ih = img.naturalHeight;
  var fit = Math.min(cw / iw, ch / ih);
  var s = fit * cropZoom;
  var w = iw * s, h = ih * s;
  // image bounds in container coords
  var ix = (cw - w) / 2 + cropOffsetX;
  var iy = (ch - h) / 2 + cropOffsetY;
  // visible overlap
  var vx = Math.max(0, ix), vy = Math.max(0, iy);
  var vx2 = Math.min(cw, ix + w), vy2 = Math.min(ch, iy + h);
  var vw = vx2 - vx, vh = vy2 - vy;
  if (vw <= 0 || vh <= 0) return null;
  // image pixel coords of visible area
  var px = (vx - ix) / s, py = (vy - iy) / s;
  var px2 = (vx2 - ix) / s, py2 = (vy2 - iy) / s;
  var pw = px2 - px, ph = py2 - py;
  // center square
  var size = Math.min(pw, ph);
  var cx = px + (pw - size) / 2;
  var cy = py + (ph - size) / 2;
  return {
    x: Math.max(0, Math.min(iw - size, cx)),
    y: Math.max(0, Math.min(ih - size, cy)),
    size: size
  };
}

function cropSave() {
  var img = document.getElementById("crop-image");
  var r = getCropRect();
  if (!img || !r) return;
  var canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, r.x, r.y, r.size, r.size, 0, 0, 200, 200);
  var dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  document.getElementById("crop-modal-overlay").style.display = "none";
  handlePhotoUploadDataUrl(dataUrl);
}

function handlePhotoUploadDataUrl(dataUrl) {
  if (!fbUser || !dataUrl) return;
  setSyncStatus("Subiendo foto...");
  // update navbar avatar immediately
  var navImg = document.getElementById("profile-img");
  var navIcon = document.getElementById("profile-avatar");
  if (navImg) { navImg.src = dataUrl; navImg.style.display = "block"; }
  if (navIcon) navIcon.style.display = "none";
  firebase.firestore().collection("users").doc(fbUser.uid).set({ avatarBase64: dataUrl }, { merge: true }).then(function() {
    updateProfileUI();
    try { syncEditPreview(); } catch (e) {}
    setSyncStatus("Foto actualizada");
    setTimeout(function() { setSyncStatus(""); }, 2000);
  }).catch(function(e) {
    console.warn("Photo save failed", e);
    setSyncStatus("Error al guardar foto");
  });
}

function handlePhotoUpload(file) {
  if (!fbUser || !file) return;
  openCropModal(file);
}

/* ---------- SOCIAL PAGE ---------- */

function renderSocialPage() {
  if (!fbUser) return;
  if (!isEmailVerifiedForSocial()) {
    var codeEl0 = document.getElementById("social-friend-code");
    if (codeEl0) codeEl0.textContent = "---";
    var list0 = document.getElementById("social-friends-list");
    if (list0) list0.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;"><span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span> Verifica tu email para ver amigos y ranking. Revisa tu bandeja o reenvía el correo desde tu perfil.</p>';
    var feed0 = document.getElementById("social-activity-feed");
    if (feed0) feed0.innerHTML = "";
    var sec0 = document.getElementById("social-requests-section");
    if (sec0) sec0.style.display = "none";
    return;
  }
  getMyFriendCode().then(function(c) {
    var codeEl = document.getElementById("social-friend-code");
    if (codeEl) codeEl.textContent = c || "---";
  });
  loadSocialFriendsList();
  loadSocialActivityFeed();
  loadSocialPendingRequests();
  loadSocialSentRequests();
  renderMyAchievements();
  checkSocialAchievements();
}

var socialRankMode = "general";

async function loadSocialFriendsList() {
  var el = document.getElementById("social-friends-list");
  if (!el) return;
  el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Cargando...</p>';
  var friends;
  if (socialRankMode === "general") {
    friends = await getFriends();
  } else {
    var days = socialRankMode === "weekly" ? 7 : socialRankMode === "monthly" ? 30 : 365;
    friends = await getFriendsWithRange(days);
  }
  if (friends.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">A&uacute;n no tienes amigos. Comparte tu c&oacute;digo o a&ntilde;ade a alguien.</p>';
    return;
  }
  var showAllRank = !!loadSocialFriendsList.showAll;
  var visibleFriends = showAllRank ? friends : friends.slice(0, 25);
  var _rank = 0, _prevMins = null;
  el.innerHTML = visibleFriends.map(function(f, i) {
    if (f.totalMinutes !== _prevMins) { _rank = i + 1; _prevMins = f.totalMinutes; }
    var timeLabel = f.isPrivate
      ? '<span class="ic"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> privado'
      : (Math.floor(f.totalMinutes / 60) + "h " + (f.totalMinutes % 60) + "m");
    var isSelf = f.isSelf;
    var nameLabel = esc(f.displayName) + (isSelf ? ' <span style="color:var(--ink-soft);font-weight:400;font-size:11px;">(t&uacute;)</span>' : '');
    var rankColors = ['#d4a017', '#a8a8a8', '#cd7f32']; // gold, silver, bronze
    var rankBg = _rank <= 3 ? rankColors[_rank - 1] : (isSelf ? 'var(--accent)' : 'var(--surface2)');
    var rankColor = _rank <= 3 ? '#fff' : (isSelf ? '#fff' : 'var(--ink-soft)');
    var rowBg = isSelf ? 'var(--accent-soft)' : '';
    return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.6rem;border-bottom:1px solid var(--line);font-size:13px;' + (rowBg ? 'background:' + rowBg + ';border-radius:6px;' : '') + '" data-id="' + f.id + '">' +
      '<span style="width:22px;height:22px;border-radius:50%;background:' + rankBg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + rankColor + ';' + (isSelf ? '' : 'cursor:pointer;') + '" ' + (isSelf ? '' : 'class="s-friend-profile"') + ' data-id="' + f.id + '">' + (_rank) + '</span>' +
      '<span style="flex:1;' + (isSelf ? '' : 'cursor:pointer;color:var(--accent);font-weight:500;') + '" ' + (isSelf ? '' : 'class="s-friend-profile"') + ' data-id="' + f.id + '">' + nameLabel + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);font-size:12px;text-align:right;min-width:4.5rem;">' + timeLabel + '</span>' +
      '</div>';
  }).join("");
  if (!showAllRank && friends.length > visibleFriends.length) {
    el.innerHTML += '<button id="social-rank-more" class="secondary" style="width:100%;margin-top:0.5rem;font-size:12px;">Ver los ' + (friends.length - visibleFriends.length) + ' restantes</button>';
    document.getElementById("social-rank-more").addEventListener("click", function() {
      loadSocialFriendsList.showAll = true;
      loadSocialFriendsList();
    });
  }
  el.querySelectorAll(".s-friend-profile").forEach(function(el2) {
    el2.addEventListener("click", function() { showFriendProfile(this.dataset.id); });
  });
}

var feedLimit = 10, feedFriendFilter = "", feedLangFilter = "", lastFeedItems = [];

async function loadSocialActivityFeed() {
  var el = document.getElementById("social-activity-feed");
  if (!el || !fbUser) return;
  lastFeedItems = await getFriendActivityFeed(Math.max(feedLimit, 10));
  populateFeedFilters();
  renderFeedItems();
}

function populateFeedFilters() {
  var fSel = document.getElementById("feed-filter-friend");
  if (fSel) {
    var seen = {}, opts = '<option value="">Todos los amigos</option>';
    lastFeedItems.forEach(function(it) {
      if (!seen[it.friendId]) { seen[it.friendId] = true; opts += '<option value="' + it.friendId + '">' + esc(it.friendName) + '</option>'; }
    });
    fSel.innerHTML = opts;
    fSel.value = (feedFriendFilter && seen[feedFriendFilter]) ? feedFriendFilter : "";
    feedFriendFilter = fSel.value;
  }
  var lSel = document.getElementById("feed-filter-lang");
  if (lSel) {
    var langs = state.languages || [];
    lSel.innerHTML = '<option value="">Todos los idiomas</option>' + langs.map(function(l) { return '<option value="' + esc(l) + '">' + esc(l) + '</option>'; }).join("");
    lSel.value = langs.includes(feedLangFilter) ? feedLangFilter : "";
    feedLangFilter = lSel.value;
  }
}

function renderFeedItems() {
  var el = document.getElementById("social-activity-feed");
  if (!el) return;
  var items = lastFeedItems.filter(function(it) {
    if (feedFriendFilter && it.friendId !== feedFriendFilter) return false;
    if (feedLangFilter && it.lang !== feedLangFilter) return false;
    return true;
  });
  var moreBtn = document.getElementById("feed-more-btn");
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Sin actividad reciente de amigos</p>';
    if (moreBtn) moreBtn.style.display = "none";
    return;
  }
  el.innerHTML = items.slice(0, feedLimit).map(function(item) {
    var mins = Math.round((item.seconds || 0) / 60);
    var t = '';
    if (item.ts) {
      var diff = Date.now() - item.ts;
      if (diff < 60000) t = 'ahora';
      else if (diff < 3600000) t = Math.floor(diff / 60000) + 'm';
      else if (diff < 86400000) t = Math.floor(diff / 3600000) + 'h';
      else t = Math.floor(diff / 86400000) + 'd';
    }
    return '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0;font-size:12px;border-bottom:1px solid var(--line);">' +
      '<span style="font-weight:500;cursor:pointer;color:var(--accent);" class="s-friend-profile" data-id="' + item.friendId + '">' + esc(item.friendName) + '</span>' +
      '<span style="color:var(--ink-soft);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(item.note || item.cat || "") + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);">' + mins + 'm</span>' +
      (t ? '<span style="color:var(--ink-soft);font-size:10px;">' + t + '</span>' : '') + '</div>';
  }).join("");
  el.querySelectorAll(".s-friend-profile").forEach(function(el2) {
    el2.addEventListener("click", function() { showFriendProfile(this.dataset.id); });
  });
  if (moreBtn) moreBtn.style.display = items.length > feedLimit ? "" : "none";
}

async function loadSocialPendingRequests() {
  if (!fbUser) return;
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").where("status", "==", "pending").get();
  var section = document.getElementById("social-requests-section");
  var list = document.getElementById("social-requests-list");
  if (!section || !list) return;
  if (snap.empty) { section.style.display = "none"; return; }
  section.style.display = "block";
  var html = "";
  snap.forEach(function(doc) {
    var d = doc.data();
    html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;font-size:13px;border-bottom:1px solid var(--line);">' +
      '<span style="flex:1;font-weight:500;">' + esc(d.fromName || "Alguien") + '</span>' +
      '<button class="social-req-accept" data-id="' + doc.id + '" data-from="' + d.from + '" style="font-size:11px;padding:0.25rem 0.6rem;border:none;border-radius:4px;background:var(--green);color:#fff;cursor:pointer;">Aceptar</button>' +
      '<button class="social-req-decline" data-id="' + doc.id + '" style="font-size:11px;padding:0.25rem 0.6rem;border:none;border-radius:4px;background:var(--line);color:var(--ink-soft);cursor:pointer;">Rechazar</button></div>';
  });
  list.innerHTML = html;
}

/* ---------- HOOKS ---------- */

var originalSaveStateForCloud = saveState;
saveState = function() {
  originalSaveStateForCloud();
  if (fbUser) {
    // log any new sessions since last check
    if (state.sessions.length > lastSessionLen) {
      for (var i = lastSessionLen; i < state.sessions.length; i++) {
        logSessionActivity(state.sessions[i]);
      }
    }
    lastSessionLen = state.sessions.length;
    saveCloudState();
    writePublicStats(false);
  }
};

/* ---------- INIT ---------- */

(function() {
  initFirebase();

  var profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleProfileDropdown();
    });
  }

  var backdrop = document.getElementById("profile-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeProfileDropdown);

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closeProfileDropdown();
  });

  var signupBtn = document.getElementById("prof-signup-btn");
  if (signupBtn) signupBtn.addEventListener("click", async function() {
    var email = document.getElementById("prof-email").value.trim();
    var pass = document.getElementById("prof-pass").value;
    var name = document.getElementById("prof-name").value.trim() || email.split("@")[0];
    if (!email || !pass) { setStatus(document.getElementById("prof-status"), "Completa todos los campos", "err"); return; }
    if (pass.length < 6) { setStatus(document.getElementById("prof-status"), "La contraseña debe tener al menos 6 caracteres", "err"); return; }
    try { await fbSignUp(email, pass, name); setStatus(document.getElementById("prof-status"), " Cuenta creada. Verifica tu email.", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), translateAuthError(e), "err"); }
  });

  var loginBtn = document.getElementById("prof-login-btn");
  if (loginBtn) loginBtn.addEventListener("click", async function() {
    var email = document.getElementById("prof-email").value.trim();
    var pass = document.getElementById("prof-pass").value;
    if (!email || !pass) { setStatus(document.getElementById("prof-status"), "Introduce email y contraseña", "err"); return; }
    try { await fbSignIn(email, pass); setStatus(document.getElementById("prof-status"), " Sesión iniciada", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), translateAuthError(e), "err"); }
  });

  var googleBtn = document.getElementById("prof-google-btn");
  if (googleBtn) googleBtn.addEventListener("click", function() {
    fbSignInWithGoogle();
  });

  var viewProfileBtn = document.getElementById("prof-view-profile-btn");
  if (viewProfileBtn) viewProfileBtn.addEventListener("click", function() {
    closeProfileDropdown();
    showRichProfile(fbUser.uid, true);
  });

  var editBtn = document.getElementById("prof-edit-btn");
  if (editBtn) editBtn.addEventListener("click", function() {
    var loggedIn = document.getElementById("prof-logged-in");
    var editView = document.getElementById("prof-edit-view");
    if (loggedIn) loggedIn.style.display = "none";
    if (editView) editView.style.display = "block";
    // populate edit fields from current data
    var editNameInput = document.getElementById("prof-edit-name-input");
    if (editNameInput) editNameInput.value = fbUser.displayName || "";
    syncEditPreview();
  });

  ["prof-edit-cancel", "prof-edit-back"].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", function() {
      // revertir acento no guardado
      if (window._pendingAccent) {
        if (window._savedAccent) applyAccentColor(window._savedAccent);
        else {
          document.documentElement.style.removeProperty("--accent");
          document.documentElement.style.removeProperty("--accent-soft");
          try { localStorage.removeItem("immersion-accent"); } catch (e) {}
        }
        window._pendingAccent = null;
      }
      var loggedIn = document.getElementById("prof-logged-in");
      var editView = document.getElementById("prof-edit-view");
      if (loggedIn) loggedIn.style.display = "block";
      if (editView) editView.style.display = "none";
    });
  });

  // vista previa en vivo del perfil editado
  function syncEditPreview() {
    var n = document.getElementById("prof-edit-name-input");
    var b = document.getElementById("prof-edit-bio");
    var pn = document.getElementById("prof-prev-name");
    var pb = document.getElementById("prof-prev-bio");
    var pa = document.getElementById("prof-prev-avatar");
    if (pn) pn.textContent = (n && n.value.trim()) || "Tu nombre";
    if (pb) pb.textContent = (b && b.value.trim()) || "Tu biografía aparecerá aquí.";
    if (pa) {
      var ea = document.getElementById("prof-edit-avatar");
      var bg = (ea && ea.style.backgroundImage) || "";
      if (bg) { pa.style.backgroundImage = bg; pa.style.backgroundSize = "cover"; pa.textContent = ""; }
      else { pa.style.backgroundImage = ""; pa.textContent = ((n && n.value.trim()) || "?")[0].toUpperCase(); }
    }
  }

  // accent color picker
  document.querySelectorAll(".prof-accent-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var color = this.dataset.color;
      document.querySelectorAll(".prof-accent-btn").forEach(function(b) { b.style.borderColor = "transparent"; });
      this.style.borderColor = "var(--accent)";
      window._pendingAccent = color;
      applyAccentColor(color); // vista previa inmediata (se confirma al guardar)
      syncEditPreview();
    });
  });

  var editSave = document.getElementById("prof-edit-save");
  if (editSave) editSave.addEventListener("click", async function() {
    var nameInput = document.getElementById("prof-edit-name-input");
    var bioInput = document.getElementById("prof-edit-bio");
    var status = document.getElementById("prof-edit-status");
    try {
      var name = nameInput ? nameInput.value.trim() : "";
      if (name) await fbUpdateDisplayName(name);
      var bio = bioInput ? bioInput.value.trim() : "";
      if (bio !== undefined) await fbUpdateBio(bio);
      if (window._pendingAccent) {
        await firebase.firestore().collection("users").doc(fbUser.uid).update({ accentColor: window._pendingAccent });
        applyAccentColor(window._pendingAccent);
        window._pendingAccent = null;
      }
      if (status) { status.textContent = " Perfil actualizado"; status.style.color = "var(--green)"; }
      setTimeout(function() {
        var loggedIn = document.getElementById("prof-logged-in");
        var editView = document.getElementById("prof-edit-view");
        if (loggedIn) loggedIn.style.display = "block";
        if (editView) editView.style.display = "none";
        if (status) status.textContent = "";
      }, 1200);
      updateProfileUI();
    } catch (e) {
      if (status) { status.textContent = translateAuthError(e); status.style.color = "#d32f2f"; }
    }
  });

  // account view nav
  var accountBtn = document.getElementById("prof-account-btn");
  if (accountBtn) accountBtn.addEventListener("click", function() {
    var loggedIn = document.getElementById("prof-logged-in");
    var accView = document.getElementById("prof-account-view");
    if (loggedIn) loggedIn.style.display = "none";
    if (accView) accView.style.display = "block";
  });
  var accountBack = document.getElementById("prof-account-back");
  if (accountBack) accountBack.addEventListener("click", function() {
    var loggedIn = document.getElementById("prof-logged-in");
    var accView = document.getElementById("prof-account-view");
    if (loggedIn) loggedIn.style.display = "block";
    if (accView) accView.style.display = "none";
  });

  // change password (requires re-auth)
  var passSave = document.getElementById("prof-pass-save");
  if (passSave) passSave.addEventListener("click", async function() {
    var status2 = document.getElementById("prof-account-status");
    try {
      var cur = document.getElementById("prof-pass-current").value;
      var nw = document.getElementById("prof-pass-new").value;
      var rp = document.getElementById("prof-pass-repeat").value;
      if (!cur || !nw || !rp) throw { message: "Completa los tres campos." };
      if (nw.length < 6) throw { code: "auth/weak-password" };
      if (nw !== rp) throw { message: "La nueva contraseña no coincide." };
      var cred = firebase.auth.EmailAuthProvider.credential(fbUser.email, cur);
      await fbUser.reauthenticateWithCredential(cred);
      await fbUser.updatePassword(nw);
      document.getElementById("prof-pass-current").value = "";
      document.getElementById("prof-pass-new").value = "";
      document.getElementById("prof-pass-repeat").value = "";
      setStatus(status2, "✓ Contraseña actualizada.", "ok");
    } catch (e) { setStatus(status2, translateAuthError(e), "err"); }
  });

  // change email (verified before applying)
  var emailSave = document.getElementById("prof-email-save");
  if (emailSave) emailSave.addEventListener("click", async function() {
    var status3 = document.getElementById("prof-account-status");
    try {
      var newEmail = document.getElementById("prof-new-email").value.trim();
      if (!newEmail) throw { message: "Escribe el nuevo email." };
      if (typeof fbUser.verifyBeforeUpdateEmail === "function") await fbUser.verifyBeforeUpdateEmail(newEmail);
      else await fbUser.updateEmail(newEmail);
      document.getElementById("prof-new-email").value = "";
      setStatus(status3, "✓ Revisa tu nuevo email para confirmar el cambio.", "ok");
    } catch (e) { setStatus(status3, translateAuthError(e), "err"); }
  });

  // resend verification email
  var resendBtn = document.getElementById("prof-resend-btn");
  if (resendBtn) resendBtn.addEventListener("click", async function() {
    try {
      await fbUser.sendEmailVerification();
      resendBtn.textContent = "¡Enviado! Revisa tu email";
      setTimeout(function() { resendBtn.textContent = "Reenviar verificación"; }, 4000);
    } catch (e) {
      resendBtn.textContent = translateAuthError(e);
      setTimeout(function() { resendBtn.textContent = "Reenviar verificación"; }, 4000);
    }
  });

  // account accordion (password / email blocks)
  [["prof-acc-pass-toggle", "prof-acc-pass-body"], ["prof-acc-email-toggle", "prof-acc-email-body"]].forEach(function(pair) {
    var t = document.getElementById(pair[0]);
    var b = document.getElementById(pair[1]);
    if (t && b) t.addEventListener("click", function() {
      var open = b.classList.toggle("open");
      t.classList.toggle("open", open);
    });
  });

  // reset password for own account (inside account view)
  var resetBtn = document.getElementById("prof-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", async function() {
    var label = resetBtn.querySelector(".grow");
    var orig = "Restablecer contraseña";
    function flash(msg) {
      if (label) label.textContent = msg;
      setTimeout(function() { if (label) label.textContent = orig; }, 3500);
    }
    try {
      await firebase.auth().sendPasswordResetEmail(fbUser.email);
      flash("¡Email enviado! Revisa tu bandeja");
    } catch (e) { flash(translateAuthError(e)); }
  });

  // show/hide password in login form
  var EYE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  var passToggle = document.getElementById("prof-pass-toggle");
  if (passToggle) passToggle.addEventListener("click", function() {
    var inp = document.getElementById("prof-pass");
    if (!inp) return;
    var show = inp.type === "password";
    inp.type = show ? "text" : "password";
    passToggle.innerHTML = show ? EYE_OFF_SVG : EYE_SVG;
    passToggle.title = show ? "Ocultar contraseña" : "Mostrar contraseña";
  });

  // forgot password (from logged-out view, uses typed email)
  var forgotBtn = document.getElementById("prof-forgot-btn");
  if (forgotBtn) forgotBtn.addEventListener("click", async function() {
    var statusEl = document.getElementById("prof-status");
    try {
      var email = document.getElementById("prof-email").value.trim();
      if (!email) throw { message: "Escribe tu email arriba primero." };
      await firebase.auth().sendPasswordResetEmail(email);
      setStatus(statusEl, "✓ Email de recuperación enviado.", "ok");
    } catch (e) { setStatus(statusEl, translateAuthError(e), "err"); }
  });

  // remove profile photo (back to Gravatar/initial)
  var photoRemove = document.getElementById("prof-photo-remove");
  if (photoRemove) photoRemove.addEventListener("click", async function() {
    try {
      await firebase.firestore().collection("users").doc(fbUser.uid).set({ avatarBase64: "" }, { merge: true });
      updateProfileUI();
      setSyncStatus("Foto eliminada");
      setTimeout(function() { setSyncStatus(""); }, 2000);
    } catch (e) { console.warn("Photo remove failed", e); }
  });

  // name/bio live counters
  function bindCount(inputId, countId) {
    var inp = document.getElementById(inputId), cnt = document.getElementById(countId);
    if (!inp || !cnt) return;
    var upd = function() { cnt.textContent = inp.value.length; };
    inp.addEventListener("input", upd);
    upd();
  }
  bindCount("prof-edit-name-input", "prof-name-count");
  bindCount("prof-edit-bio", "prof-bio-count");
  ["prof-edit-name-input", "prof-edit-bio"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", syncEditPreview);
  });

  // eliminar cuenta (zona de peligro en Config)
  var delBtn = document.getElementById("delete-account-btn");
  if (delBtn) delBtn.addEventListener("click", async function() {
    var statusEl = document.getElementById("delete-account-status");
    try {
      var pw = document.getElementById("delete-account-pass").value;
      await fbDeleteAccount(pw);
      setStatus(statusEl, "✓ Cuenta eliminada.", "ok");
      document.getElementById("delete-account-confirm").value = "";
      document.getElementById("delete-account-pass").value = "";
    } catch (e) { setStatus(statusEl, translateAuthError(e), "err"); }
  });

  // privacy settings toggles
  var privacyKeys = ["total", "languages", "weekly", "daily", "recent", "streak", "avatar", "bio", "feed", "ranking"];
  function loadPrivacySettings() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("privacy") || "{}"); } catch(e) {}
    return saved;
  }
  function syncPrivacyToggles() {
    var s = loadPrivacySettings();
    privacyKeys.forEach(function(k) {
      var el = document.getElementById("privacy-" + k);
      if (el) el.checked = !!s[k];
    });
  }
  window.syncPrivacyToggles = syncPrivacyToggles;
  function savePrivacySettings(settings) {
    localStorage.setItem("privacy", JSON.stringify(settings));
    if (fbUser) {
      firebase.firestore().collection("users").doc(fbUser.uid).update({ privacy: settings }).catch(function(){});
    }
    writePublicStats(true); // republicar con el nuevo filtro
  }
  // init toggles from saved settings
  var privacySettings = loadPrivacySettings();
  syncPrivacyToggles();
  privacyKeys.forEach(function(k) {
    var el = document.getElementById("privacy-" + k);
    if (el) {
      el.addEventListener("change", function() {
        privacySettings[k] = this.checked;
        savePrivacySettings(privacySettings);
      });
    }
  });

  var logoutBtn = document.getElementById("prof-logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async function() {
    await fbSignOut();
    closeProfileDropdown();
  });

  // photo upload from either avatar
  function setupPhotoInput(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("change", function() {
      if (this.files && this.files[0]) {
        if (this.files[0].size > 5 * 1024 * 1024) {
          setSyncStatus("Foto demasiado grande (máx. 5 MB)");
          setTimeout(function() { setSyncStatus(""); }, 2500);
          this.value = "";
          return;
        }
        openCropModal(this.files[0]);
      }
    });
  }
  setupPhotoInput("prof-photo-input");
  setupPhotoInput("prof-edit-photo-input");

  // crop modal events
  var cropContainer = document.getElementById("crop-container");
  if (cropContainer) {
    cropContainer.addEventListener("mousedown", function(e) {
      if (e.button !== 0) return;
      cropDragging = true;
      cropStartX = e.clientX;
      cropStartY = e.clientY;
      cropOrigX = cropOffsetX;
      cropOrigY = cropOffsetY;
      cropContainer.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", function(e) {
      if (!cropDragging) return;
      cropOffsetX = cropOrigX + (e.clientX - cropStartX);
      cropOffsetY = cropOrigY + (e.clientY - cropStartY);
      applyCropTransform();
    });
    document.addEventListener("mouseup", function() {
      cropDragging = false;
      if (cropContainer) cropContainer.style.cursor = "grab";
    });
    // wheel zoom
    cropContainer.addEventListener("wheel", function(e) {
      e.preventDefault();
      var z = cropZoom - e.deltaY * 0.002;
      z = Math.max(0.3, Math.min(4, z));
      cropZoom = z;
      document.getElementById("crop-zoom").value = z;
      applyCropTransform();
    }, { passive: false });
  }
  var cropZoomInput = document.getElementById("crop-zoom");
  if (cropZoomInput) cropZoomInput.addEventListener("input", function() {
    cropZoom = parseFloat(this.value);
    applyCropTransform();
  });
  document.getElementById("crop-save").addEventListener("click", cropSave);
  document.getElementById("crop-cancel").addEventListener("click", function() {
    document.getElementById("crop-modal-overlay").style.display = "none";
  });

  /* ---------- SOCIAL PAGE EVENTS ---------- */

  var feedFriendSel = document.getElementById("feed-filter-friend");
  if (feedFriendSel) feedFriendSel.addEventListener("change", function() { feedFriendFilter = this.value; renderFeedItems(); });
  var feedLangSel = document.getElementById("feed-filter-lang");
  if (feedLangSel) feedLangSel.addEventListener("change", function() { feedLangFilter = this.value; renderFeedItems(); });
  var feedMore = document.getElementById("feed-more-btn");
  if (feedMore) feedMore.addEventListener("click", function() {
    feedLimit += 10;
    if (feedLimit > lastFeedItems.length) loadSocialActivityFeed();
    else renderFeedItems();
  });
  // refresco silencioso del feed cada 60 s (solo con Social visible)
  setInterval(function() {
    if (!fbUser || !isEmailVerifiedForSocial()) return;
    var socialPage = document.getElementById("page-social");
    if (socialPage && socialPage.classList.contains("active")) loadSocialActivityFeed();
  }, 60000);

  var socialAddBtn = document.getElementById("social-add-friend-btn");
  if (socialAddBtn) socialAddBtn.addEventListener("click", async function() {
    var input = document.getElementById("social-friend-input");
    var code = input ? input.value.trim() : "";
    if (!code) return;
    try {
      await addFriendByCode(code);
      setStatus(document.getElementById("social-friend-status"), " Solicitud enviada", "ok");
      var input2 = document.getElementById("social-friend-input");
      if (input2) input2.value = "";
      loadSocialSentRequests();
    } catch (e) { setStatus(document.getElementById("social-friend-status"), translateAuthError(e), "err"); }
  });

  var socialCopyBtn = document.getElementById("social-copy-code");
  if (socialCopyBtn) socialCopyBtn.addEventListener("click", function() {
    var code = document.getElementById("social-friend-code");
    if (code && code.textContent) {
      if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).catch(function() {});
    }
  });

  var socialRankToggle = document.getElementById("social-rank-toggle");
  var modes = ["general", "weekly", "monthly", "yearly"];
  var modeLabels = { general: "Ranking general", weekly: "Ranking semanal", monthly: "Ranking mensual", yearly: "Ranking anual" };
  if (socialRankToggle) socialRankToggle.addEventListener("click", function() {
    var idx = modes.indexOf(socialRankMode);
    socialRankMode = modes[(idx + 1) % modes.length];
    socialRankToggle.textContent = modeLabels[socialRankMode];
    loadSocialFriendsList();
  });

  // friend request actions (delegated)
  document.addEventListener("click", function(e) {
    if (e.target.classList.contains("social-req-accept")) {
      acceptFriendRequest(e.target.dataset.id, e.target.dataset.from);
    } else if (e.target.classList.contains("social-req-decline")) {
      declineFriendRequest(e.target.dataset.id);
    }
  });

  // friend modal close
  var fmClose = document.getElementById("fm-close-x");
  if (fmClose) fmClose.addEventListener("click", function() {
    document.getElementById("friend-modal-overlay").style.display = "none";
  });

  // click overlay to close friend modal
  var fmOverlay = document.getElementById("friend-modal-overlay");
  if (fmOverlay) fmOverlay.addEventListener("click", function(e) {
    if (e.target === fmOverlay) fmOverlay.style.display = "none";
  });

  // profile modal tabs (wired once)
  document.querySelectorAll("#fm-scroll .fm-tab").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll("#fm-scroll .fm-tab").forEach(function(b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll("#fm-scroll .fm-tabpage").forEach(function(p) { p.classList.toggle("active", p.id === "fm-tab-" + btn.dataset.tab); });
    });
  });

})();
