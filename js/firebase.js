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
  if (!fbUser) throw new Error("Inicia sesin primero");
  var snap = await firebase.firestore().collection("users").where("friendCode", "==", code.toUpperCase()).get();
  if (snap.empty) throw new Error("Cdigo invlido");
  var target = snap.docs[0];
  var targetId = target.id;
  if (targetId === fbUser.uid) throw new Error("No puedes a&ntilde;adirte a ti mismo");
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
  var people = [];
  // include self
  var myUser = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  var myData = await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").get();
  people.push({
    id: fbUser.uid, displayName: myUser.exists ? (myUser.data().displayName || "T") : "T",
    isSelf: true,
    totalMinutes: myData.exists ? totalFromState(myData.data().state) : 0
  });
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  for (var i = 0; i < snap.docs.length; i++) {
    var fId = snap.docs[i].id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (fUser.exists) {
      var fData = await firebase.firestore().collection("users").doc(fId).collection("data").doc("state").get();
      people.push({
        id: fId, displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: fData.exists ? totalFromState(fData.data().state) : 0
      });
    }
  }
  return people.sort(function(a, b) { return b.totalMinutes - a.totalMinutes; });
}

async function getFriendsWithRange(days) {
  if (!fbUser) return [];
  var people = [];
  var since = Date.now() - days * 24 * 60 * 60 * 1000;
  // include self
  var myUser = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  if (myUser.exists) {
    var myActivity = await firebase.firestore().collection("users").doc(fbUser.uid).collection("activity").where("clientTs", ">=", since).get();
    var myMinutes = 0;
    myActivity.forEach(function(a) { myMinutes += (a.data().seconds || 0) / 60; });
    people.push({
      id: fbUser.uid, displayName: myUser.data().displayName || "T",
      isSelf: true,
      totalMinutes: Math.round(myMinutes)
    });
  }
  var snap = await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").get();
  for (var i = 0; i < snap.docs.length; i++) {
    var fId = snap.docs[i].id;
    var fUser = await firebase.firestore().collection("users").doc(fId).get();
    if (fUser.exists) {
      var activitySnap = await firebase.firestore().collection("users").doc(fId).collection("activity").where("clientTs", ">=", since).get();
      var pMinutes = 0;
      activitySnap.forEach(function(a) { pMinutes += (a.data().seconds || 0) / 60; });
      people.push({
        id: fId, displayName: fUser.data().displayName || "Amigo",
        friendCode: fUser.data().friendCode,
        totalMinutes: Math.round(pMinutes)
      });
    }
  }
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

async function getRichProfileData(userId) {
  if (!fbUser) return null;
  var userDoc = await firebase.firestore().collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  var ud = userDoc.data();
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
  // daily totals (last 98 days = 14 weeks) for mini heatmap
  var dayTotals98 = buildDayTotals(allActivities, 98);
  var daily = Object.keys(dayTotals98).reverse().map(function(k) {
    var d = new Date(k);
    var today = new Date();
    var dayDiff = Math.round((today - d) / 86400000);
    var label = dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Ayer" : d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
    return { label: label, minutes: Math.round(dayTotals98[k]), dateStr: k };
  });
  // recent sessions
  var recent = sessions.slice(-10).reverse().map(function(ses) {
    return { note: ses.note || ses.cat || "Sesi&oacute;n", seconds: ses.seconds || 0, lang: ses.lang || "", ts: ses.ts || 0 };
  });
  return {
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
}

// keep old getFriendProfile as alias for backward compat
var getFriendProfile = getRichProfileData;

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
    // hide edit view when re-opening dropdown
    var editView = document.getElementById("prof-edit-view");
    if (editView) editView.style.display = "none";

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
        // highlight selected accent color
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
  var profile = await getRichProfileData(friendId);
  if (!profile) { console.warn("RichProfile: no profile data for", friendId); return; }
  var isOwn = isSelf || friendId === (fbUser && fbUser.uid);

  // header
  document.getElementById("fm-name").textContent = profile.displayName;
  document.getElementById("fm-bio").textContent = profile.bio;
  document.getElementById("fm-friendcode").innerHTML = profile.friendCode ? "C&oacute;digo: " + profile.friendCode : "";
  var avatarEl = document.getElementById("fm-avatar");
  if (profile.avatarBase64) {
    avatarEl.style.backgroundImage = "url(" + profile.avatarBase64 + ")";
  } else {
    avatarEl.textContent = profile.displayName[0].toUpperCase();
  }
  if (avatarEl) avatarEl.style.backgroundColor = "";

  // stats cards
  var totalH = Math.floor(profile.totalMinutes / 60);
  var totalM = profile.totalMinutes % 60;
  // per-language hours for extra card
  var topLang = profile.languages.length > 0 ? profile.languages[0].name : "---";
  var topLangHours = profile.languages.length > 0 ? Math.floor(profile.languages[0].minutes / 60) : 0;
  var statCards = [
    { val: profile.totalSessions, label: "sesiones" },
    { val: totalH + "h " + totalM + "m", label: "total", small: true },
    { val: profile.languages.length, label: "idiomas" },
    { val: profile.streak.current + " d&iacute;a" + (profile.streak.current !== 1 ? "s" : ""), label: "racha actual" },
    { val: profile.streak.longest + " d&iacute;a" + (profile.streak.longest !== 1 ? "s" : ""), label: "mejor racha", small: true },
    { val: topLangHours + "h", label: topLang, small: true }
  ];
  document.getElementById("fm-stats").innerHTML = statCards.map(function(c) {
    return '<div style="flex:1;padding:0.35rem 0.2rem;background:var(--surface2);border-radius:8px;text-align:center;"><div style="font-weight:600;font-size:' + (c.small ? '11px' : '14px') + ';">' + c.val + '</div><div style="color:var(--ink-soft);font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + c.label + '</div></div>';
  }).join("");

  // language bars
  var langColors = ["var(--accent)", "var(--green)", "var(--blue)", "var(--purple)", "var(--gold)"];
  var langHtml = profile.languages.length === 0 ? '<p style="font-size:12px;color:var(--ink-soft);margin:0;">Sin datos</p>' :
    profile.languages.map(function(l, i) {
      var c = langColors[i % langColors.length];
      return '<div style="margin-bottom:0.35rem;">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;"><span>' + l.name + '</span><span style="font-family:var(--mono);color:var(--ink-soft);">' + Math.floor(l.minutes / 60) + 'h ' + l.minutes % 60 + 'm (' + l.sessions + ' ses)</span></div>' +
        '<div style="height:6px;border-radius:3px;background:var(--line);overflow:hidden;"><div style="height:100%;width:' + l.pct + '%;border-radius:3px;background:' + c + ';transition:width 0.3s;"></div></div></div>';
    }).join("");
  document.getElementById("fm-langs").innerHTML = langHtml;

  // weekly chart — always renders
  console.log("showRichProfile: weekly data", profile.weekly);
  var chartEl = document.getElementById("fm-chart");
  if (chartEl) {
    var daysArr = (profile.weekly && profile.weekly.days) ? profile.weekly.days : [];
    var maxVal = Math.max((profile.weekly && profile.weekly.max) || 0, 1);
    if (daysArr.length === 0) {
      chartEl.innerHTML = '<p style="margin:0;font-size:11px;color:var(--ink-soft);">Sin datos esta semana</p>';
    } else {
      chartEl.innerHTML = daysArr.map(function(d) {
        var raw = d.minutes / maxVal;
        var pct = Math.max(raw * 100, raw > 0 ? 6 : 3);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:60px;justify-content:flex-end;">' +
          '<div style="font-size:8px;color:var(--ink-soft);margin-bottom:2px;font-family:var(--mono);">' + (d.minutes > 0 ? d.minutes + "m" : "") + '</div>' +
          '<div style="width:100%;max-width:28px;height:' + pct + '%;min-height:3px;border-radius:3px 3px 0 0;background:var(--accent);opacity:' + (d.minutes > 0 ? "1" : "0.25") + ';"></div>' +
          '<div style="font-size:8px;color:var(--ink-soft);margin-top:2px;">' + d.label + '</div></div>';
      }).join("");
    }
  }
  // daily activity mini heatmap
  var dailyEl = document.getElementById("fm-daily");
  if (dailyEl) {
    var dayMap = {};
    (profile.daily || []).forEach(function(d) { dayMap[d.dateStr] = d.minutes; });
    if (Object.keys(dayMap).length === 0) {
      dailyEl.innerHTML = '<p style="margin:0;font-size:11px;color:var(--ink-soft);">Sin actividad reciente</p>';
    } else {
      var vals = Object.keys(dayMap).filter(function(k) { return dayMap[k] > 0; }).map(function(k) { return dayMap[k]; });
      var max = vals.length ? Math.max.apply(null, vals) : 1;
      var WEEKS = 14, CELL = 10, GAP = 2;
      var today2 = new Date(); today2.setHours(0, 0, 0, 0);
      var dow = (today2.getDay() + 6) % 7;
      var startDate = new Date(today2);
      startDate.setDate(startDate.getDate() - dow - (WEEKS - 1) * 7);
      var html = '<div style="display:flex;flex-direction:column;gap:' + GAP + 'px;">';
      // month labels row
      html += '<div style="display:flex;padding-left:' + (CELL + GAP) + 'px;gap:' + GAP + 'px;font-size:8px;color:var(--ink-soft);font-family:var(--mono);">';
      var lastMonth = -1;
      for (var w = 0; w < WEEKS; w++) {
        var ws = new Date(startDate);
        ws.setDate(ws.getDate() + w * 7);
        var m = ws.getMonth();
        html += '<div style="flex:1;text-align:center;">' + (m !== lastMonth ? ws.toLocaleDateString("es", { month: "short" }) : "") + '</div>';
        if (m !== lastMonth) lastMonth = m;
      }
      html += '</div>';
      // day rows (Mon–Sun)
      var dayNames = ["L", "", "X", "", "V", "", ""];
      for (var row = 0; row < 7; row++) {
        html += '<div style="display:flex;align-items:center;gap:' + GAP + 'px;">';
        html += '<div style="width:' + CELL + 'px;font-size:7px;color:var(--ink-soft);text-align:center;font-family:var(--mono);">' + dayNames[row] + '</div>';
        for (var w2 = 0; w2 < WEEKS; w2++) {
          var d2 = new Date(startDate);
          d2.setDate(d2.getDate() + w2 * 7 + row);
          var secs = dayMap[d2.toDateString()] || 0;
          var isFuture = d2 > today2;
          var level = isFuture ? 0 : secs === 0 ? 0 : secs < max * 0.25 ? 1 : secs < max * 0.5 ? 2 : secs < max * 0.75 ? 3 : 4;
          var extra = isFuture ? ' data-future=""' : "";
          if (d2.toDateString() === today2.toDateString()) extra += ' data-today=""';
          html += '<div style="width:' + CELL + 'px;height:' + CELL + 'px;border-radius:2px;border:1px solid transparent;" class="heatmap-cell" data-level="' + level + '"' + extra + '></div>';
        }
        html += '</div>';
      }
      html += '</div>';
      dailyEl.innerHTML = html;
    }
  }

  // recent sessions
  var recentHtml = profile.recent.length === 0 ? '<p style="margin:0;">Sin sesiones</p>' :
    profile.recent.slice(0, 8).map(function(s) {
      var mins = Math.round((s.seconds || 0) / 60);
      return '<div style="display:flex;justify-content:space-between;padding:0.2rem 0;border-bottom:1px solid var(--line);"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + s.note + '</span><span style="font-family:var(--mono);color:var(--ink-soft);margin-left:0.5rem;">' + mins + 'm</span></div>';
    }).join("");
  document.getElementById("fm-recent").innerHTML = recentHtml;

  // remove button (only for friends, not self)
  var removeBtn = document.getElementById("fm-remove");
  if (removeBtn) {
    if (isOwn) {
      removeBtn.style.display = "none";
    } else {
      removeBtn.style.display = "";
      removeBtn.onclick = function() {
        if (confirm("Eliminar amigo?")) {
          removeFriend(friendId);
          overlay.style.display = "none";
        }
      };
    }
  }

  overlay.style.display = "flex";
  } catch (e) { console.error("showRichProfile error:", e); }
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
  firebase.firestore().collection("users").doc(fbUser.uid).update({ avatarBase64: dataUrl }).then(function() {
    updateProfileUI();
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
  getMyFriendCode().then(function(c) {
    var codeEl = document.getElementById("social-friend-code");
    if (codeEl) codeEl.textContent = c || "---";
  });
  loadSocialFriendsList();
  loadSocialActivityFeed();
  loadSocialPendingRequests();
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
  el.innerHTML = friends.map(function(f, i) {
    var hours = Math.floor(f.totalMinutes / 60);
    var mins = f.totalMinutes % 60;
    var isSelf = f.isSelf;
    var nameLabel = f.displayName + (isSelf ? ' <span style="color:var(--ink-soft);font-weight:400;font-size:11px;">(t&uacute;)</span>' : '');
    var rankColors = ['#d4a017', '#a8a8a8', '#cd7f32']; // gold, silver, bronze
    var rankBg = i < 3 ? rankColors[i] : (isSelf ? 'var(--accent)' : 'var(--surface2)');
    var rankColor = i < 3 ? '#fff' : (isSelf ? '#fff' : 'var(--ink-soft)');
    var rowBg = isSelf ? 'var(--accent-soft)' : '';
    return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.6rem;border-bottom:1px solid var(--line);font-size:13px;' + (rowBg ? 'background:' + rowBg + ';border-radius:6px;' : '') + '" data-id="' + f.id + '">' +
      '<span style="width:22px;height:22px;border-radius:50%;background:' + rankBg + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + rankColor + ';' + (isSelf ? '' : 'cursor:pointer;') + '" ' + (isSelf ? '' : 'class="s-friend-profile"') + ' data-id="' + f.id + '">' + (i + 1) + '</span>' +
      '<span style="flex:1;' + (isSelf ? '' : 'cursor:pointer;color:var(--accent);font-weight:500;') + '" ' + (isSelf ? '' : 'class="s-friend-profile"') + ' data-id="' + f.id + '">' + nameLabel + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);font-size:12px;text-align:right;min-width:4.5rem;">' + hours + 'h ' + mins + 'm</span>' +
      '</div>';
  }).join("");
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
  });

  var editCancel = document.getElementById("prof-edit-cancel");
  if (editCancel) editCancel.addEventListener("click", function() {
    var loggedIn = document.getElementById("prof-logged-in");
    var editView = document.getElementById("prof-edit-view");
    if (loggedIn) loggedIn.style.display = "block";
    if (editView) editView.style.display = "none";
  });

  // accent color picker
  document.querySelectorAll(".prof-accent-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var color = this.dataset.color;
      document.querySelectorAll(".prof-accent-btn").forEach(function(b) { b.style.borderColor = "transparent"; });
      this.style.borderColor = "var(--accent)";
      window._pendingAccent = color;
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
      if (status) { status.textContent = e.message; status.style.color = "#d32f2f"; }
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
      if (this.files && this.files[0]) openCropModal(this.files[0]);
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
