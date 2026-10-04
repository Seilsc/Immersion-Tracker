(function () {
  function $(id) { return document.getElementById(id); }

  function sendMsg(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (r) {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else resolve(r);
      });
    });
  }

  function sendToContentTab(tabId, msg) {
    return new Promise(function (resolve) {
      chrome.tabs.sendMessage(tabId, msg, function (r) {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(r);
      });
    });
  }

  function getActiveYouTubeTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true, url: ["*://www.youtube.com/*"] }, function (tabs) {
        if (tabs && tabs.length > 0) resolve(tabs[0]);
        else resolve(null);
      });
    });
  }

  var trackedLanguages = [];

  function init() {
    $("btn-open-tracker").addEventListener("click", openTracker);
    $("btn-force").addEventListener("click", toggleForce);
    $("btn-force-clear").addEventListener("click", clearForce);
    loadTrackedLanguages();
    refresh();
  }

  function loadTrackedLanguages() {
    chrome.storage.local.get(["yt-extension-tracked-langs"], function (r) {
      if (r["yt-extension-tracked-langs"]) {
        trackedLanguages = r["yt-extension-tracked-langs"];
        populateLangSelect();
      }
    });
  }

  function populateLangSelect(forceValue) {
    var select = $("force-lang-select");
    select.innerHTML = "";
    if (trackedLanguages.length === 0) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Idioma...";
      select.appendChild(opt);
      return;
    }
    (trackedLanguages || []).forEach(function (lang) {
      var opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = lang;
      if (lang === forceValue) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function showStatus(data) {
    $("video-title").textContent = (data && data.videoTitle) ? data.videoTitle.slice(0, 60) : "—";
    $("detected-lang").textContent = data && data.currentLangName ? data.currentLangName : "—";

    if (data && data.isTracking) {
      $("tracking-status").innerHTML = '<span class="tag tag-green">ACTIVO</span>';
    } else {
      $("tracking-status").innerHTML = '<span class="tag tag-gray">INACTIVO</span>';
    }

    if (data && data.forceLangName) {
      $("btn-force").textContent = "Quitar fuerza (" + data.forceLangName + ")";
    } else {
      $("btn-force").textContent = "Forzar seguimiento";
    }
  }

  function refresh() {
    getActiveYouTubeTab().then(function (tab) {
      if (!tab) {
        $("yt-status-card").classList.add("hidden");
        $("no-yt-tab").classList.remove("hidden");
        return;
      }
      $("no-yt-tab").classList.add("hidden");
      $("yt-status-card").classList.remove("hidden");

      sendToContentTab(tab.id, { type: "get-status" }).then(function (cs) {
        showStatus(cs);
        if (cs && cs.forceLangName) {
          populateLangSelect(cs.forceLangName);
        }
      });
    });

    sendMsg({ type: "get-status" }).then(function (status) {
      if (status && status.queueLength > 0) {
        $("queue-indicator").classList.remove("hidden");
        $("queue-count").textContent = status.queueLength;
      } else {
        $("queue-indicator").classList.add("hidden");
      }
    });
  }

  function toggleForce() {
    getActiveYouTubeTab().then(function (tab) {
      if (!tab) return;
      var selectedLang = $("force-lang-select").value;
      if (!selectedLang) return;
      sendToContentTab(tab.id, { type: "toggle-force", langName: selectedLang }).then(function (res) {
        if (res) showStatus(res);
      });
    });
  }

  function clearForce() {
    getActiveYouTubeTab().then(function (tab) {
      if (!tab) return;
      sendToContentTab(tab.id, { type: "toggle-force" }).then(function (res) {
        if (res) showStatus(res);
      });
    });
  }

  function openTracker() {
    sendMsg({ type: "open-tracker" }).then(function (res) {
      if (!res || res.error) {
        // If no queued session, open tracker directly
        chrome.tabs.create({ url: "https://seilsc.github.io/Immersion-Tracker/", active: true });
        return;
      }
      if (res.opened) {
        $("queue-indicator").classList.add("hidden");
        $("queue-count").textContent = "0";
      } else if (res.reason === "empty") {
        chrome.tabs.create({ url: "https://seilsc.github.io/Immersion-Tracker/", active: true });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  setInterval(refresh, 2000);
})();
