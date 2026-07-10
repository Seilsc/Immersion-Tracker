/* ---------- FIREBASE ---------- */

const FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

let fbUser = null;
let fbUnsubscribe = null;

function initFirebase() {
  if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    fbUnsubscribe = firebase.auth().onAuthStateChanged(user => {
      fbUser = user;
      updateAuthUI();
      if (user) {
        loadCloudState();
      }
    });
  }
}

/* ---------- AUTH ---------- */

async function fbSignUp(email, password, displayName) {
  const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
  if (displayName) await cred.user.updateProfile({ displayName });
  const code = generateFriendCode();
  await firebase.firestore().collection("users").doc(cred.user.uid).set({
    email, displayName, friendCode: code, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred;
}

async function fbSignIn(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

async function fbSignOut() {
  await firebase.auth().signOut();
}

function generateFriendCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ---------- DATA ---------- */

async function saveCloudState() {
  if (!fbUser) return;
  try {
    await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").set({
      state: JSON.parse(JSON.stringify(state)),
      displayPrefs: getDisplayPrefs(),
      apiKeyYoutube: getApiKey() || null,
      apiKeyTmdb: getTmdbKey() || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { console.warn("Cloud save failed", e); }
}

async function loadCloudState() {
  if (!fbUser) return;
  try {
    const doc = await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").get();
    if (doc.exists) {
      const data = doc.data();
      const localLen = state.sessions.length;
      const cloudLen = data.state?.sessions?.length || 0;
      if (cloudLen > 0 && cloudLen >= localLen) {
        Object.assign(state, data.state);
        if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(([name, val]) => { const k = DISPLAY_PREFS[name]?.key; if (k) localStorage.setItem(k, val); });
        if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
        if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
        applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
      } else if (localLen > 0 && localLen > cloudLen) {
        saveCloudState();
      }
      renderAll();
      if (document.getElementById("page-stats").classList.contains("active")) renderStats();
      if (document.getElementById("page-historial").classList.contains("active")) renderHistory();
    } else {
      saveCloudState();
    }
  } catch (e) { console.warn("Cloud load failed", e); }
}

function getDisplayPrefs() {
  const dp = {};
  Object.entries(DISPLAY_PREFS).forEach(([name, { key }]) => { const v = localStorage.getItem(key); if (v !== null) dp[name] = v === "true"; });
  return dp;
}

/* ---------- FRIENDS ---------- */

async function addFriendByCode(code) {
  if (!fbUser) throw new Error("Inicia sesión primero");
  const snap = await firebase.firestore().collection("users").where("friendCode", "==", code.toUpperCase()).get();
  if (snap.empty) throw new Error("Código inválido");
  const friendDoc = snap.docs[0];
  const friendId = friendDoc.id;
  if (friendId === fbUser.uid) throw new Error("No puedes añadirte a ti mismo");
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(friendId).set({
    friendCode: code.toUpperCase(),
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await firebase.firestore().collection("users").doc(friendId).collection("friends").doc(fbUser.uid).set({
    friendCode: (await firebase.firestore().collection("users").doc(fbUser.uid).get()).data().friendCode || "",
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getFriends() {
  if (!fbUser) return [];
  const snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  const friends = [];
  for (const doc of snap.docs) {
    const fId = doc.id;
    const fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (fUser.exists) {
      const fData = await firebase.firestore().collection("users").doc(fId).collection("data").doc("state").get();
      friends.push({
        id: fId,
        displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: fData.exists ? totalFromState(fData.data().state) : 0
      });
    }
  }
  return friends.sort((a, b) => b.totalMinutes - a.totalMinutes);
}

async function getMyFriendCode() {
  if (!fbUser) return null;
  const doc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  return doc.exists ? doc.data().friendCode || null : null;
}

function totalFromState(s) {
  if (!s) return 0;
  let t = 0;
  (s.sessions || []).forEach(ses => { t += ses.minutes || 0; });
  (s.youtube || []).forEach(v => { t += ((v.duration || 0) / 60); });
  (s.shows || []).forEach(sh => { t += ((sh.totalEp || 0) * (sh.epDuration || 0) / 60); });
  (s.movies || []).forEach(m => { t += ((m.duration || 0) / 60); });
  return Math.round(t);
}

/* ---------- UI ---------- */

function updateAuthUI() {
  const loggedOut = document.getElementById("auth-logged-out");
  const loggedIn = document.getElementById("auth-logged-in");
  const userInfo = document.getElementById("auth-user-info");
  const friendCodeEl = document.getElementById("auth-friend-code");
  const friendsList = document.getElementById("friends-list");
  if (fbUser) {
    loggedOut.style.display = "none";
    loggedIn.style.display = "block";
    userInfo.textContent = fbUser.displayName || fbUser.email;
    getMyFriendCode().then(code => { if (friendCodeEl) friendCodeEl.textContent = code || "---"; });
    loadFriendsList();
  } else {
    loggedOut.style.display = "block";
    loggedIn.style.display = "none";
    if (friendsList) friendsList.innerHTML = "";
  }
}

async function loadFriendsList() {
  const el = document.getElementById("friends-list");
  if (!el) return;
  const friends = await getFriends();
  if (friends.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:13px;">Aún no tienes amigos. Comparte tu código para que te añadan.</p>';
    return;
  }
  el.innerHTML = friends.map(f => {
    const hours = Math.floor(f.totalMinutes / 60);
    const mins = f.totalMinutes % 60;
    return `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--line);font-size:14px;">
      <span>${f.displayName}</span>
      <span style="font-family:var(--mono);color:var(--ink-soft);">${hours}h ${mins}m</span>
    </div>`;
  }).join("");
}

/* ---------- HOOKS ---------- */

const originalSaveStateForCloud = saveState;
saveState = function() {
  originalSaveStateForCloud();
  if (fbUser) saveCloudState();
};

/* ---------- INIT ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initFirebase();

  document.getElementById("auth-signup-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-pass").value;
    const name = document.getElementById("auth-name").value.trim() || email.split("@")[0];
    if (!email || !pass) { setStatus(document.getElementById("auth-status"), "Completa todos los campos", "err"); return; }
    if (pass.length < 6) { setStatus(document.getElementById("auth-status"), "La contraseña debe tener al menos 6 caracteres", "err"); return; }
    try {
      await fbSignUp(email, pass, name);
      setStatus(document.getElementById("auth-status"), "✓ Cuenta creada", "ok");
    } catch (e) { setStatus(document.getElementById("auth-status"), e.message, "err"); }
  });

  document.getElementById("auth-login-btn")?.addEventListener("click", async () => {
    const email = document.getElementById("auth-email").value.trim();
    const pass = document.getElementById("auth-pass").value;
    if (!email || !pass) { setStatus(document.getElementById("auth-status"), "Introduce email y contraseña", "err"); return; }
    try {
      await fbSignIn(email, pass);
      setStatus(document.getElementById("auth-status"), "✓ Sesión iniciada", "ok");
    } catch (e) { setStatus(document.getElementById("auth-status"), e.message, "err"); }
  });

  document.getElementById("auth-logout-btn")?.addEventListener("click", async () => {
    await fbSignOut();
    setStatus(document.getElementById("auth-status"), "Sesión cerrada", "ok");
  });

  document.getElementById("auth-add-friend-btn")?.addEventListener("click", async () => {
    const input = document.getElementById("auth-friend-input");
    const code = input?.value.trim();
    if (!code) return;
    try {
      await addFriendByCode(code);
      setStatus(document.getElementById("auth-friend-status"), "✓ Amigo añadido", "ok");
      input.value = "";
      loadFriendsList();
    } catch (e) { setStatus(document.getElementById("auth-friend-status"), e.message, "err"); }
  });
});
