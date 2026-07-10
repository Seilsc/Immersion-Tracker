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

function initFirebase() {
  if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(async user => {
      fbUser = user;
      updateProfileUI();
      if (user) {
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
      }
    });
  }
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
      [G, 0xf61e2562, 5], [G, 0xc040b340, 9], [G, 0x265e5a51, 14], [G, 0xe9b6c7aa, 20],
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
  return cred;
}

async function fbSignIn(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

async function fbSignOut() {
  await firebase.auth().signOut();
}

function fbSignInWithGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function(result) {
    if (result && result.user) closeProfileDropdown();
  }).catch(function(e) {
    setStatus(document.getElementById("prof-status"), e.message, "err");
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
    var doc = await firebase.firestore().collection("users").doc(fbUser.uid).collection("data").doc("state").get();
    if (doc.exists) {
      var data = doc.data();
      var localLen = state.sessions.length;
      var cloudLen = (data.state && data.state.sessions) ? data.state.sessions.length : 0;
      if (cloudLen > 0 && cloudLen >= localLen) {
        Object.assign(state, data.state);
        if (data.displayPrefs) Object.entries(data.displayPrefs).forEach(function(e) { var k = DISPLAY_PREFS[e[0]] && DISPLAY_PREFS[e[0]].key; if (k) localStorage.setItem(k, e[1]); });
        if (data.apiKeyYoutube) setApiKey(data.apiKeyYoutube);
        if (data.apiKeyTmdb) setTmdbKey(data.apiKeyTmdb);
        applyDisplayPrefs(); refreshApiKeyUI(); refreshTmdbKeyUI();
      } else if (localLen > cloudLen) {
        saveCloudState();
      }
      renderAll();
      if (document.getElementById("page-stats") && document.getElementById("page-stats").classList.contains("active")) renderStats();
      if (document.getElementById("page-historial") && document.getElementById("page-historial").classList.contains("active")) renderHistory();
    } else {
      saveCloudState();
    }
  } catch (e) { console.warn("Cloud load failed", e); }
}

function getDisplayPrefs() {
  var dp = {};
  Object.entries(DISPLAY_PREFS).forEach(function(e) { var v = localStorage.getItem(e[1].key); if (v !== null) dp[e[0]] = v === "true"; });
  return dp;
}

/* ---------- FRIENDS ---------- */

async function addFriendByCode(code) {
  if (!fbUser) throw new Error("Inicia sesión primero");
  var snap = await firebase.firestore().collection("users").where("friendCode", "==", code.toUpperCase()).get();
  if (snap.empty) throw new Error("Código inválido");
  var friendDoc = snap.docs[0];
  var friendId = friendDoc.id;
  if (friendId === fbUser.uid) throw new Error("No puedes añadirte a ti mismo");
  await firebase.firestore().collection("users").doc(fbUser.uid).collection("friends").doc(friendId).set({
    friendCode: code.toUpperCase(), addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  var myDoc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  await firebase.firestore().collection("users").doc(friendId).collection("friends").doc(fbUser.uid).set({
    friendCode: myDoc.exists ? myDoc.data().friendCode || "" : "",
    addedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
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

async function getMyFriendCode() {
  if (!fbUser) return null;
  var doc = await firebase.firestore().collection("users").doc(fbUser.uid).get();
  return doc.exists ? doc.data().friendCode || null : null;
}

function totalFromState(s) {
  if (!s) return 0;
  var t = 0;
  (s.sessions || []).forEach(function(ses) { t += ses.minutes || 0; });
  (s.youtube || []).forEach(function(v) { t += ((v.duration || 0) / 60); });
  (s.shows || []).forEach(function(sh) { t += ((sh.totalEp || 0) * (sh.epDuration || 0) / 60); });
  (s.movies || []).forEach(function(m) { t += ((m.duration || 0) / 60); });
  return Math.round(t);
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
    var codeEl = document.getElementById("prof-friend-code");

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
    if (avatarBig) {
      var initial = (fbUser.displayName || fbUser.email)[0].toUpperCase();
      avatarBig.textContent = initial;
      var gravBig = new Image();
      gravBig.src = getGravatarUrl(fbUser.email, 96);
      gravBig.onload = function() {
        if (gravBig.width > 10) { avatarBig.textContent = ""; avatarBig.style.backgroundImage = "url(" + gravBig.src + ")"; avatarBig.style.backgroundSize = "cover"; }
      };
    }
    getMyFriendCode().then(function(c) { if (codeEl) codeEl.textContent = c || "---"; });
    loadFriendsList();
  } else {
    if (avatar) avatar.style.display = "flex";
    if (img) { img.style.display = "none"; img.src = ""; }
    if (loggedOut) loggedOut.style.display = "block";
    if (loggedIn) loggedIn.style.display = "none";
  }
}

async function loadFriendsList() {
  var el = document.getElementById("prof-friends-list");
  if (!el) return;
  var friends = await getFriends();
  if (friends.length === 0) {
    el.innerHTML = '<p style="color:var(--ink-soft);font-size:12px;margin:0;">Aún no tienes amigos. Comparte tu código.</p>';
    return;
  }
  el.innerHTML = friends.map(function(f) {
    var hours = Math.floor(f.totalMinutes / 60);
    var mins = f.totalMinutes % 60;
    return '<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--line);font-size:13px;">' +
      '<span>' + f.displayName + '</span>' +
      '<span style="font-family:var(--mono);color:var(--ink-soft);">' + hours + 'h ' + mins + 'm</span></div>';
  }).join("");
}

function toggleProfileDropdown() {
  var dd = document.getElementById("profile-dropdown");
  var backdrop = document.getElementById("profile-backdrop");
  if (!dd) return;
  var isOpen = dd.classList.contains("open");
  dd.classList.toggle("open");
  if (backdrop) backdrop.style.display = isOpen ? "none" : "block";
  if (fbUser && !isOpen) loadFriendsList();
}

function closeProfileDropdown() {
  var dd = document.getElementById("profile-dropdown");
  var backdrop = document.getElementById("profile-backdrop");
  if (dd) dd.classList.remove("open");
  if (backdrop) backdrop.style.display = "none";
}

/* ---------- HOOKS ---------- */

var originalSaveStateForCloud = saveState;
saveState = function() {
  originalSaveStateForCloud();
  if (fbUser) saveCloudState();
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
    try { await fbSignUp(email, pass, name); setStatus(document.getElementById("prof-status"), "✓ Cuenta creada", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var loginBtn = document.getElementById("prof-login-btn");
  if (loginBtn) loginBtn.addEventListener("click", async function() {
    var email = document.getElementById("prof-email").value.trim();
    var pass = document.getElementById("prof-pass").value;
    if (!email || !pass) { setStatus(document.getElementById("prof-status"), "Introduce email y contraseña", "err"); return; }
    try { await fbSignIn(email, pass); setStatus(document.getElementById("prof-status"), "✓ Sesión iniciada", "ok"); closeProfileDropdown(); }
    catch (e) { setStatus(document.getElementById("prof-status"), e.message, "err"); }
  });

  var googleBtn = document.getElementById("prof-google-btn");
  if (googleBtn) googleBtn.addEventListener("click", function() {
    fbSignInWithGoogle();
  });

  var logoutBtn = document.getElementById("prof-logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async function() {
    await fbSignOut();
    closeProfileDropdown();
  });

  var addFriendBtn = document.getElementById("prof-add-friend-btn");
  if (addFriendBtn) addFriendBtn.addEventListener("click", async function() {
    var input = document.getElementById("prof-friend-input");
    var code = input ? input.value.trim() : "";
    if (!code) return;
    try { await addFriendByCode(code); setStatus(document.getElementById("prof-friend-status"), "✓ Amigo añadido", "ok"); if (input) input.value = ""; loadFriendsList(); }
    catch (e) { setStatus(document.getElementById("prof-friend-status"), e.message, "err"); }
  });

  var copyBtn = document.getElementById("prof-copy-code");
  if (copyBtn) copyBtn.addEventListener("click", function() {
    var code = document.getElementById("prof-friend-code");
    if (code && code.textContent) {
      if (navigator.clipboard) navigator.clipboard.writeText(code.textContent).catch(function() {});
    }
  });

})();
