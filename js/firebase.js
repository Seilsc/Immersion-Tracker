/* ---------- FIREBASE ---------- */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDXhVa7NsVa2oLFJPShzfyzUhDGNQUXC0s",
  authDomain: "immersion-tracker-languages.firebaseapp.com",
  projectId: "immersion-tracker-languages",
  storageBucket: "immersion-tracker-languages.firebasestorage.app",
  messagingSenderId: "229132583023",
  appId: "1:229132583023:web:0c6b1a1fb0eb1168f30d9a",
  measurementId: "G-F1P8JE0KGQ"
};

let fbUser = null;
var lastSessionLen = 0;

function initFirebase() {
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
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
  var cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
  if (displayName) await cred.user.updateProfile({ displayName: displayName });
  var code = generateFriendCode();
  await firebase.firestore().collection("users").doc(cred.user.uid).set({
    email: email, displayName: displayName || email.split("@")[0],
    friendCode: code, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await cred.user.sendEmailVerification();
  return cred;
}

async function fbSignIn(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

async function fbSignOut() {
  stopAutoSave();
  await firebase.auth().signOut();
}

async function fbUpdateDisplayName(newName) {
  await fbUser.updateProfile({ displayName: newName });
  await firebase.firestore().collection("users").doc(fbUser.uid).update({ displayName: newName });
  updateProfileUI();
}

async function fbUpdateBio(bio) {
  if (!fbUser) return;
  await firebase.firestore().collection("users").doc(fbUser.uid).update({ bio: bio.slice(0, 500) });
}

async function fbResetPassword() {
  await firebase.auth().sendPasswordResetEmail(fbUser.email);
}

async function fbDeleteAccount() {
  if (!confirm("Eliminar cuenta y todos los datos? Esta accin no se puede deshacer.")) return;
  // delete avatar if exists
  if (firebase.storage) { try { await firebase.storage().ref("avatars/" + fbUser.uid).delete(); } catch (e) {} }
  await firebase.firestore().collection("users").doc(fbUser.uid).delete();
  await fbUser.delete();
}

function fbSignInWithGoogle() {
  var statusEl = document.getElementById("prof-status");
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  firebase.auth().signInWithPopup(provider).then(function(result) {
    if (result && result.user) closeProfileDropdown();
  }).catch(function(e) {
    if (e.code === "auth/popup-blocked") {
      // fallback to redirect if popup blocked
      firebase.auth().signInWithRedirect(provider);
    } else {
      setStatus(statusEl, e.message, "err");
    }
  });
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
      apiKeyYoutube: getApiKey() || null,
      apiKeyTmdb: getTmdbKey() || null,
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
          if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
          if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
          applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
        } else {
          saveCloudState();
        }
      } else if (cloudLen > 0 && cloudLen >= localLen) {
        Object.assign(state, data.state);
        if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(function(e) { var k = DISPLAY_PREFS[e[0]] && DISPLAY_PREFS[e[0]].key; if (k) localStorage.setItem(k, e[1]); });
        if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
        if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
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
        if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
        if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
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

function loadGravatarBig(el) {
  if (!el || !fbUser) return;
  var initial = (fbUser.displayName || fbUser.email)[0].toUpperCase();
  el.textContent = initial;
  var gravBig = new Image();
  gravBig.src = getGravatarUrl(fbUser.email, 96);
  gravBig.onload = function() {
    if (gravBig.width > 10) { el.textContent = ""; el.style.backgroundImage = "url(" + gravBig.src + ")"; el.style.backgroundSize = "cover"; }
  };
}

function getPersonalStats() {
  var totalSessions = state.sessions.length;
  var totalMinutes = 0;
  var langCount = {};
  state.sessions.forEach(function(s) {
    totalMinutes += (s.seconds || 0) / 60;
    var lang = s.lang || "otro";
    if (!langCount[lang]) langCount[lang] = 0;
    langCount[lang] += (s.seconds || 0) / 60;
  });
  (state.youtube || []).forEach(function(v) { var m = (v.seconds || v.duration || 0) / 60; totalMinutes += m; });
  (state.shows || []).forEach(function(sh) { var m = (sh.episodesWatched || 0) * (sh.epDuration || 0); totalMinutes += m; });
  (state.movies || []).forEach(function(mo) { var m = (mo.seconds || mo.duration || 0) / 60; totalMinutes += m; });
  return { totalSessions: totalSessions, totalMinutes: Math.round(totalMinutes), langCount: langCount };
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
  if (!fbUser) throw new Error("Inicia sesin primero");
  var snap = await firebase.firestore().collection("users").where("friendCode", "==", code.toUpperCase()).get();
  if (snap.empty) throw new Error("Cdigo invlido");
  var target = snap.docs[0];
  var targetId = target.id;
  if (targetId === fbUser.uid) throw new Error("No puedes añadirte a ti mismo");
  // check if already friends
  var existing = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(targetId).get();
  if (existing.exists) throw new Error("Ya sois amigos");
  // check if request already sent
  var reqSnap = await firebase.firestore().collection("users").doc(targetId).collection("friendRequests").where("from", "==", fbUser.uid).get();
  if (!reqSnap.empty) throw new Error("Solicitud ya enviada");
  await firebase.firestore().collection("users").doc(targetId).collection("friendRequests").add({
    from: fbUser.uid,
    fromName: fbUser.displayName || fbUser.email.split("@")[0],
    fromCode: code.toUpperCase(),
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function acceptFriendRequest(reqId, fromUid) {
  if (!fbUser) return;
  // accept: update request status, add bidirectional friendship
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").doc(reqId).update({ status: "accepted" });
  // get friend's code
  var fromUser = await firebase.firestore().collection("users").doc(fromUid).get();
  var fromCode = fromUser.exists ? fromUser.data().friendCode || "" : "";
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(fromUid).set({
    friendCode: fromCode, addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  var myDoc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  await firebase.firestore().collection("users").doc(fromUid).collection("friends").doc(fbUser.uid).set({
    friendCode: myDoc.exists ? myDoc.data().friendCode || "" : "",
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  loadSocialPendingRequests();
  loadSocialFriendsList();
}

async function declineFriendRequest(reqId) {
  if (!fbUser) return;
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friendRequests").doc(reqId).delete();
  loadSocialPendingRequests();
}

/* ---------- FRIENDS ---------- */

async function addFriendByCode(code) {
  // now sends a friend request instead of direct add
  await sendFriendRequest(code);
}

async function removeFriend(friendId) {
  if (!fbUser || !confirm("Eliminar amigo?")) return;
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(friendId).delete();
  await firebase.firestore().collection("users").doc(friendId).collection("friends").doc(fbUser.uid).delete();
  loadSocialFriendsList();
}

async function getFriends() {
  if (!fbUser) return [];
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var friends = [];
  for (var i = 0; i < snap.docs.length; i++) {
    var fId = snap.docs[i].id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (fUser.exists) {
      var fData = await firebase.firestore().collection("users").doc(fId).collection("data").doc("state").get();
      friends.push({
        id: fId, displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: fData.exists ? totalFromState(fData.data().state) : 0
      });
    }
  }
  return friends.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
}

async function getFriendsWithWeekly() {
  if (!fbUser) return [];
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var friends = [];
  var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (var i = 0; i < snap.docs.length; i++) {
    var fId = snap.docs[i].id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (fUser.exists) {
      var activitySnap = await firebase.firestore().collection("users").doc(fId).collection("activity").where("clientTs", ">=", weekAgo).get();
      var weeklyMinutes = 0;
      activitySnap.forEach(function(a) { weeklyMinutes += (a.data().seconds || 0) / 60; });
      friends.push({
        id: fId, displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: Math.round(weeklyMinutes)
      });
    }
  }
  return friends.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
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

async function getFriendProfile(friendId) {
  if (!fbUser) return null;
  var fUser = await firebase.firestore().collection("users").doc(friendId).get();
  if (!fUser.exists) return null;
  var fData = await firebase.firestore().collection("users").doc(friendId).collection("data").doc("state").get();
  var sessions = (fData.exists && fData.data().state) ? fData.data().state.sessions || [] : [];
  var langTotal = {};
  var langSessions = {};
  sessions.forEach(function(s) {
    var lang = s.lang || "otro";
    var mins = (s.seconds || 0) / 60;
    if (!langTotal[lang]) { langTotal[lang] = 0; langSessions[lang] = 0; }
    langTotal[lang] += mins;
    langSessions[lang]++;
  });
  var recent = sessions.slice(-5).reverse();
  return {
    displayName: fUser.data().displayName || "Amigo",
    friendCode: fUser.data().friendCode || "",
    bio: fUser.data().bio || "",
    langTotal: langTotal,
    langSessions: langSessions,
    recent: recent,
    totalMinutes: totalFromState(fData.exists ? fData.data().state : null)
  };
}

/* ---------- ACTIVITY FEED ---------- */

async function getFriendActivityFeed() {
  if (!fbUser) return [];
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  var all = [];
  for (var i = 0; i < snap.docs.length; i++) {
    var fId = snap.docs[i].id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    var fName = fUser.exists ? (fUser.data().displayName || "Amigo") : "Amigo";
    var actSnap = await firebase.firestore().collection("users").doc(fId).collection("activity").orderBy("clientTs", "desc").limit(3).get();
    actSnap.forEach(function(a) {
      var d = a.data();
      all.push({ friendName: fName, friendId: fId, ts: d.clientTs || 0, note: d.note || "", seconds: d.seconds || 0, lang: d.lang || "", cat: d.cat || "" });
    });
  }
  all.sort(function(a, b) { return b.ts - a.ts; });
  return all.slice(0, 10);
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
    var bioInput = document.getElementById("prof-bio-input");
    var verifyBanner = document.getElementById("prof-verify-banner");

    // social page visibility
    var sLoggedOut = document.getElementById("social-logged-out");
    var sLoggedIn = document.getElementById("social-logged-in");
    if (sLoggedOut) sLoggedOut.style.display = "none";
    if (sLoggedIn) sLoggedIn.style.display = "block";

    var ql = document.getElementById("quick-logout");
    if (ql) ql.style.display = "block";
    if (avatar) avatar.style.display = "none";
    if (img) {
      img.style.display = "block";
      var gravUrl = getGravatarUrl(fbUser.email, 80);
      img.src = gravUrl;
      img.onerror = function() { img.style.display = "none"; if (avatar) avatar.style.display = "flex"; };
    }
    if (loggedOut) loggedOut.style.display = "none";
    if (loggedIn) loggedIn.style.display = "block";
    if (nameEl) nameEl.textContent = fbUser.displayName || fbUser.email.split("@")[0];
    if (emailEl) emailEl.textContent = fbUser.email;

    // load bio and avatar from Firestore
    if (bioInput || avatarBig) {
      firebase.firestore().collection("users").doc(fbUser.uid).get().then(function(doc) {
        if (doc.exists) {
          var d = doc.data();
          if (bioInput) bioInput.value = d.bio || "";
          if (avatarBig && d.avatarUrl) {
            avatarBig.textContent = "";
            avatarBig.style.backgroundImage = "url(" + d.avatarUrl + ")";
            avatarBig.style.backgroundSize = "cover";
          } else if (avatarBig) {
            loadGravatarBig(avatarBig);
          }
        } else {
          if (avatarBig) loadGravatarBig(avatarBig);
        }
      }).catch(function() {
        if (avatarBig) loadGravatarBig(avatarBig);
      });
    }

    // email verification banner
    if (verifyBanner) {
      if (!fbUser.emailVerified) {
        verifyBanner.style.display = "block";
        var sendBtn = document.getElementById("prof-send-verify");
        if (sendBtn) sendBtn.onclick = function(e) {
          e.preventDefault();
          fbUser.sendEmailVerification().then(function() {
            setStatus(document.getElementById("prof-status"), "Email de verificacin reenviado", "ok");
          }).catch(function(e) {
            setStatus(document.getElementById("prof-status"), e.message, "err");
          });
        };
      } else {
        verifyBanner.style.display = "none";
      }
    }

    var statsEl = document.getElementById("prof-stats");
    if (statsEl) {
      var s = getPersonalStats();
      statsEl.innerHTML = '<div style="display:flex;gap:0.75rem;margin-bottom:0.75rem;">' +
        '<div style="flex:1;padding:0.4rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:16px;">' + s.totalSessions + '</div><div style="color:var(--ink-soft);font-size:10px;">sesiones</div></div>' +
        '<div style="flex:1;padding:0.4rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:16px;">' + Math.floor(s.totalMinutes / 60) + 'h ' + s.totalMinutes % 60 + 'm</div><div style="color:var(--ink-soft);font-size:10px;">totales</div></div>' +
        '<div style="flex:1;padding:0.4rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:16px;">' + Object.keys(s.langCount).length + '</div><div style="color:var(--ink-soft);font-size:10px;">idiomas</div></div></div>';
    }
  } else {
    var ql = document.getElementById("quick-logout");
    if (ql) ql.style.display = "none";
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

/* ---------- FRIEND PROFILE MODAL ---------- */

async function showFriendProfile(friendId) {
  var overlay = document.getElementById("friend-modal-overlay");
  if (!overlay) return;
  var profile = await getFriendProfile(friendId);
  if (!profile) return;
  document.getElementById("fm-name").textContent = profile.displayName;
  document.getElementById("fm-total").textContent = "Total: " + Math.floor(profile.totalMinutes / 60) + "h " + profile.totalMinutes % 60 + "m";
  var bioEl = document.getElementById("fm-bio");
  if (bioEl) bioEl.textContent = profile.bio ? '"' + profile.bio + '"' : "";
  var avatarEl = document.getElementById("fm-avatar");
  avatarEl.textContent = profile.displayName[0].toUpperCase();

  // language breakdown
  var langHtml = "";
  Object.keys(profile.langTotal).sort(function(a, b) { return profile.langTotal[b] - profile.langTotal[a]; }).forEach(function(lang) {
    var mins = Math.round(profile.langTotal[lang]);
    langHtml += '<div style="display:flex;justify-content:space-between;font-size:12px;padding:0.15rem 0;"><span>' + lang + '</span><span style="font-family:var(--mono);color:var(--ink-soft);">' + Math.floor(mins / 60) + 'h ' + mins % 60 + 'm (' + profile.langSessions[lang] + ' ses)</span></div>';
  });
  document.getElementById("fm-langs").innerHTML = langHtml || '<p style="font-size:12px;color:var(--ink-soft);margin:0;">Sin datos</p>';

  // recent sessions
  var recentHtml = "";
  profile.recent.forEach(function(s) {
    var mins = Math.round((s.seconds || 0) / 60);
    recentHtml += '<div style="padding:0.15rem 0;">' + (s.note || s.cat || "Sesin") + ' — ' + mins + 'm</div>';
  });
  document.getElementById("fm-recent").innerHTML = recentHtml ? '<p style="font-weight:500;margin:0 0 0.2rem;">ltimas sesiones</p>' + recentHtml : '<p style="color:var(--ink-soft);margin:0;">Sin sesiones recientes</p>';

  overlay.style.display = "flex";
}

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

/* ---------- PHOTO UPLOAD ---------- */

function handlePhotoUpload(file) {
  if (!fbUser || !file) return;
  if (!firebase.storage) { setSyncStatus("Storage no disponible"); return; }
  setSyncStatus("Subiendo foto...");
  var ref = firebase.storage().ref("avatars/" + fbUser.uid);
  ref.put(file).then(function() {
    return ref.getDownloadURL();
  }).then(function(url) {
    return firebase.firestore().collection("users").doc(fbUser.uid).update({ avatarUrl: url });
  }).then(function() {
    updateProfileUI();
    setSyncStatus("Foto actualizada");
    setTimeout(function() { setSyncStatus(""); }, 2000);
  }).catch(function(e) {
    console.warn("Photo upload failed", e);
    setSyncStatus("Error al subir foto");
  });
}

/* ---------- SOCIAL PAGE ---------- */

function renderSocialPage() {
  if (!fbUser) return;
  getMyFriendCode().then(function(c) {
    var codeEl = document.getElementById("social-friend-code");
    if (codeEl) codeEl.textContent = c || "---";
  });
  loadSocialFriendsList();
  loadSocialActivityFeed();
  loadSocialPendingRequests();
}

var socialWeeklyMode = false;

async function loadSocialFriendsList() {
  var el = document.getElementById("social-friends-list");
  if (!el) return;
  el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Cargando...</p>';
  var friends = socialWeeklyMode ? await getFriendsWithWeekly() : await getFriends();
  if (friends.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">An no tienes amigos. Comparte tu cdigo o añade a alguien.</p>';
    return;
  }
  el.innerHTML = friends.map(function(f, i) {
    var hours = Math.floor(f.totalMinutes / 60);
    var mins = f.totalMinutes % 60;
    return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0;border-bottom:1px solid var(--line);font-size:13px;" data-id="' + f.id + '">' +
      '<span style="width:22px;height:22px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--ink-soft);cursor:pointer;" class="s-friend-profile" data-id="' + f.id + '">' + (i + 1) + '</span>' +
      '<span style="flex:1;cursor:pointer;color:var(--accent);font-weight:500;" class="s-friend-profile" data-id="' + f.id + '">' + f.displayName + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);font-size:12px;">' + hours + 'h ' + mins + 'm</span>' +
      '<button class="s-friend-remove" data-id="' + f.id + '" style="background:none;border:none;cursor:pointer;color:var(--ink-soft);font-size:13px;padding:0 4px;" title="Eliminar amigo">&times;</button></div>';
  }).join("");
  el.querySelectorAll(".s-friend-remove").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); removeFriend(this.dataset.id); });
  });
  el.querySelectorAll(".s-friend-profile").forEach(function(el2) {
    el2.addEventListener("click", function() { showFriendProfile(this.dataset.id); });
  });
}

async function loadSocialActivityFeed() {
  var el = document.getElementById("social-activity-feed");
  if (!el) return;
  var items = await getFriendActivityFeed();
  if (items.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Sin actividad reciente de amigos</p>';
    return;
  }
  el.innerHTML = items.map(function(item) {
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
      '<span style="font-weight:500;cursor:pointer;color:var(--accent);" class="s-friend-profile" data-id="' + item.friendId + '">' + item.friendName + '</span>' +
      '<span style="color:var(--ink-soft);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (item.note || item.cat || "") + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);">' + mins + 'm</span>' +
      (t ? '<span style="color:var(--ink-soft);font-size:10px;">' + t + '</span>' : '') + '</div>';
  }).join("");
  el.querySelectorAll(".s-friend-profile").forEach(function(el2) {
    el2.addEventListener("click", function() { showFriendProfile(this.dataset.id); });
  });
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
      '<span style="flex:1;font-weight:500;">' + (d.fromName || "Alguien") + '</span>' +
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
    if (pass.length < 6) { setStatus(document.getElementById("prof-status"), "La contrasea debe tener al menos 6 caracteres", "err"); return; }
    try { await fbSignUp(email, pass, name); setStatus(document.getElementById("prof-status"), " Cuenta creada. Verifica tu email.", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var loginBtn = document.getElementById("prof-login-btn");
  if (loginBtn) loginBtn.addEventListener("click", async function() {
    var email = document.getElementById("prof-email").value.trim();
    var pass = document.getElementById("prof-pass").value;
    if (!email || !pass) { setStatus(document.getElementById("prof-status"), "Introduce email y contrasea", "err"); return; }
    try { await fbSignIn(email, pass); setStatus(document.getElementById("prof-status"), " Sesin iniciada", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var googleBtn = document.getElementById("prof-google-btn");
  if (googleBtn) googleBtn.addEventListener("click", function() {
    fbSignInWithGoogle();
  });

  var quickLogout = document.getElementById("quick-logout");
  if (quickLogout) quickLogout.addEventListener("click", async function() {
    await fbSignOut();
    closeProfileDropdown();
  });

  var editNameBtn = document.getElementById("prof-edit-name-btn");
  if (editNameBtn) editNameBtn.addEventListener("click", function() {
    var input = document.getElementById("prof-edit-name-input");
    var status = document.getElementById("prof-status");
    if (!input) return;
    if (input.style.display === "none" || !input.style.display || input.style.display === "") {
      input.style.display = "block"; input.value = fbUser.displayName || ""; input.focus(); return;
    }
    var name = input.value.trim();
    if (!name) { input.style.display = "none"; return; }
    fbUpdateDisplayName(name).then(function() {
      if (status) setStatus(status, " Nombre actualizado", "ok");
      input.style.display = "none";
    }).catch(function(e) {
      if (status) setStatus(status, e.message, "err");
    });
  });

  var resetPassBtn = document.getElementById("prof-reset-pass-btn");
  if (resetPassBtn) resetPassBtn.addEventListener("click", async function() {
    try {
      await fbResetPassword();
      setStatus(document.getElementById("prof-status"), " Email de recuperacin enviado", "ok");
    } catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var deleteAccountBtn = document.getElementById("prof-delete-btn");
  if (deleteAccountBtn) deleteAccountBtn.addEventListener("click", async function() {
    try {
      await fbDeleteAccount();
      closeProfileDropdown();
    } catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var logoutBtn = document.getElementById("prof-logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async function() {
    await fbSignOut();
    closeProfileDropdown();
  });

  // bio auto-save on blur
  var bioInput = document.getElementById("prof-bio-input");
  var bioTimer = null;
  if (bioInput) bioInput.addEventListener("input", function() {
    if (bioTimer) clearTimeout(bioTimer);
    bioTimer = setTimeout(function() {
      fbUpdateBio(bioInput.value);
      setStatus(document.getElementById("prof-status"), "Biografa guardada", "ok");
      setTimeout(function() { setStatus(document.getElementById("prof-status"), "", ""); }, 2000);
    }, 800);
  });

  // go to social from profile
  var goSocial = document.getElementById("prof-go-social");
  if (goSocial) goSocial.addEventListener("click", function() {
    closeProfileDropdown();
    var socialTab = document.querySelector(".nav-tab[data-page='social']");
    if (socialTab) socialTab.click();
  });

  // photo upload
  var photoInput = document.getElementById("prof-photo-input");
  if (photoInput) photoInput.addEventListener("change", function() {
    if (this.files && this.files[0]) handlePhotoUpload(this.files[0]);
  });

  /* ---------- SOCIAL PAGE EVENTS ---------- */

  var socialAddBtn = document.getElementById("social-add-friend-btn");
  if (socialAddBtn) socialAddBtn.addEventListener("click", async function() {
    var input = document.getElementById("social-friend-input");
    var code = input ? input.value.trim() : "";
    if (!code) return;
    try {
      await addFriendByCode(code);
      setStatus(document.getElementById("social-friend-status"), " Solicitud enviada", "ok");
      if (input) input.value = "";
    } catch (e) { setStatus(document.getElementById("social-friend-status"), e.message, "err"); }
  });

  var socialCopyBtn = document.getElementById("social-copy-code");
  if (socialCopyBtn) socialCopyBtn.addEventListener("click", function() {
    var code = document.getElementById("social-friend-code");
    if (code && code.textContent) {
      if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).catch(function() {});
    }
  });

  var socialRankToggle = document.getElementById("social-rank-toggle");
  if (socialRankToggle) socialRankToggle.addEventListener("click", function() {
    socialWeeklyMode = !socialWeeklyMode;
    socialRankToggle.textContent = socialWeeklyMode ? "Ranking semanal" : "Ranking general";
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
  var fmClose = document.getElementById("fm-close");
  if (fmClose) fmClose.addEventListener("click", function() {
    document.getElementById("friend-modal-overlay").style.display = "none";
  });

  // click overlay to close friend modal
  var fmOverlay = document.getElementById("friend-modal-overlay");
  if (fmOverlay) fmOverlay.addEventListener("click", function(e) {
    if (e.target === fmOverlay) fmOverlay.style.display = "none";
  });

})();
