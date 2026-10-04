(function () {
  var video = null;
  var lastRealTime = 0;
  var totalWatchedSeconds = 0;
  var isTracking = false;
  var currentVideoId = null;
  var lastSaveTime = 0;
  var detectionDone = false;
  var videoData = {};
  var currentLangName = "";
  var isPaused = true;
  var forceLangName = null;
  var lastUrl = location.href;
  var previousVideoId = null;

  var MIN_SESSION_SECONDS = 5;

  function injectReader() {
    if (document.querySelector("script[data-yt-ext-reader]")) return;
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("youtube-api-reader.js");
    s.dataset.ytExtReader = "true";
    (document.documentElement || document.head).appendChild(s);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (event.data && event.data.type === "YT_EXT_VIDEO_DATA") {
      videoData[event.data.videoId] = {
        title: event.data.title,
        channelName: event.data.channelName,
        captionLanguages: event.data.captionLanguages,
      };
      if (currentVideoId === event.data.videoId && !detectionDone) {
        runDetection();
      }
    }
  });

  injectReader();

  function sendMsg(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (r) {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else resolve(r);
      });
    });
  }

  function getVideoId() {
    var m = location.href.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    var s = location.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    if (s) return s[1];
    return null;
  }

  function isWatchPage() {
    return location.pathname.indexOf("/watch") === 0 || location.pathname.indexOf("/shorts/") === 0;
  }

  function isAdPlaying() {
    return !!document.querySelector(".ad-showing, .ytp-ad-player-overlay, .ytp-ad-text");
  }

  function detectCaptionLang(videoId) {
    var data = videoData[videoId];
    if (!data) return null;
    var langs = data.captionLanguages;
    if (langs && langs.length > 0) return langs[0];
    return null;
  }

  function runDetection() {
    var vId = getVideoId();
    if (!vId || detectionDone) return;
    detectionDone = true;

    if (forceLangName) {
      currentLangName = forceLangName;
      isTracking = true;
      updateBadge(true);
      startTrackingIfPlaying();
      return;
    }

    var isoCode = detectCaptionLang(vId);
    if (!isoCode) {
      isTracking = false;
      currentLangName = "";
      updateBadge(false);
      return;
    }

    sendMsg({ type: "check-language", isoCode: isoCode }).then(function (r) {
      if (r && r.langName) {
        currentLangName = r.langName;
        isTracking = true;
      } else {
        isTracking = false;
        currentLangName = "";
      }
      updateBadge(isTracking);
      if (isTracking) startTrackingIfPlaying();
    });
  }

  function runDetectionWithRetry(retryCount) {
    if (retryCount === undefined) retryCount = 0;
    if (detectionDone) return;
    var vId = getVideoId();
    if (!vId) return;

    if (forceLangName) {
      runDetection();
      return;
    }

    if (videoData[vId]) {
      runDetection();
      return;
    }

    if (retryCount < 30) {
      setTimeout(function () { runDetectionWithRetry(retryCount + 1); }, 200);
    }
  }

  function updateBadge(active) {
    var text = "";
    var color = [128, 128, 128, 255];
    if (active && currentLangName) {
      text = currentLangName.substring(0, 4);
      color = [46, 204, 113, 255];
    }
    sendMsg({ type: "update-badge", text: text, color: color });
  }

  function startTrackingIfPlaying() {
    if (video && !video.paused && isTracking) {
      lastRealTime = Date.now();
      lastSaveTime = Date.now();
      isPaused = false;
    }
  }

  function saveProgress() {
    if (totalWatchedSeconds < 1 || !currentVideoId) return;
    chrome.storage.session.get(["dailyStats"], function (r) {
      var stats = r.dailyStats || {};
      var d = new Date();
      var today = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      if (!stats[today]) stats[today] = { seconds: 0, videos: {} };
      stats[today].seconds += Math.round(totalWatchedSeconds);
      stats[today].videos[currentVideoId] = (stats[today].videos[currentVideoId] || 0) + Math.round(totalWatchedSeconds);
      chrome.storage.session.set({ dailyStats: stats });
      totalWatchedSeconds = 0;
    });
  }

  function saveSession() {
    var total = Math.round(totalWatchedSeconds);
    if (total < MIN_SESSION_SECONDS || !currentVideoId || !currentLangName) return;

    var data = videoData[currentVideoId] || {};
    var note = (data.title || "") + (data.channelName ? " - " + data.channelName : "");

    sendMsg({
      type: "save-session",
      session: {
        id: Date.now(),
        activityId: "freeflow-listening",
        activityName: "Freeflow Listening",
        cat: "YouTube",
        lang: currentLangName,
        note: note.slice(0, 200),
        seconds: total,
        ts: Date.now(),
      },
    });

    totalWatchedSeconds = 0;
    updateBadge(false);
  }

  function finalizeSession() {
    saveProgress();
    saveSession();
    isTracking = false;
    detectionDone = false;
    isPaused = true;
  }

  function resetForNewVideo(newVideoId) {
    if (currentVideoId === newVideoId) return;
    finalizeSession();
    previousVideoId = currentVideoId;
    currentVideoId = newVideoId;
    totalWatchedSeconds = 0;
    lastRealTime = 0;
    lastSaveTime = 0;
    detectionDone = false;
    isTracking = false;
    currentLangName = "";
    video = null;
    isPaused = true;
    updateBadge(false);
  }

  function handleTimeUpdate() {
    if (!video || !isTracking || video.paused) return;
    if (isAdPlaying()) return;
    var now = Date.now();
    if (lastRealTime > 0) {
      var delta = (now - lastRealTime) / 1000;
      if (delta > 0 && delta < 2) {
        totalWatchedSeconds += delta;
      }
    }
    lastRealTime = now;
    if (now - lastSaveTime >= 1000) {
      saveProgress();
      lastSaveTime = now;
    }
  }

  function handlePlay() {
    lastRealTime = Date.now();
    lastSaveTime = Date.now();
    isPaused = false;
    if (!detectionDone) runDetectionWithRetry();
  }

  function handlePause() {
    saveProgress();
    lastRealTime = 0;
    isPaused = true;
  }

  function handleSeeked() {
    lastRealTime = Date.now();
  }

  function attachVideoListeners(videoEl) {
    if (video) {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
    }
    video = videoEl;
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
  }

  function findActiveVideo() {
    if (location.pathname.indexOf("/shorts/") === 0) {
      var activeReel = document.querySelector("ytd-reel-video-renderer[is-active]");
      if (activeReel) {
        var v = activeReel.querySelector("video");
        if (v) return v;
      }
    }
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
  }

  function initTracker() {
    if (!isWatchPage()) return;
    var newId = getVideoId();
    if (!newId) return;

    if (newId !== currentVideoId) resetForNewVideo(newId);

    var videoEl = findActiveVideo();
    if (videoEl) {
      attachVideoListeners(videoEl);
      if (!detectionDone) runDetectionWithRetry();
    } else {
      setTimeout(initTracker, 200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTracker);
  } else {
    initTracker();
  }

  window.addEventListener("yt-navigate-finish", function () {
    setTimeout(initTracker, 100);
  });

  var urlCheckInterval = setInterval(function () {
    if (location.href !== lastUrl) {
      var wasWatchPage = isWatchPage() || lastUrl.indexOf("youtube.com") !== -1;
      lastUrl = location.href;
      var nowIsYT = location.hostname.indexOf("youtube.com") !== -1;
      if (wasWatchPage && !nowIsYT && currentVideoId && totalWatchedSeconds >= MIN_SESSION_SECONDS) {
        finalizeSession();
        sendMsg({ type: "open-tracker" });
      } else if (isWatchPage()) {
        setTimeout(initTracker, 100);
      }
    }
  }, 500);

  window.addEventListener("beforeunload", function () {
    if (currentVideoId && totalWatchedSeconds >= MIN_SESSION_SECONDS) {
      finalizeSession();
      sendMsg({ type: "open-tracker" });
    }
  });

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "get-status") {
      var data = videoData[currentVideoId] || {};
      sendResponse({
        isTracking: isTracking,
        currentVideoId: currentVideoId,
        currentLangName: currentLangName,
        videoTitle: data.title || "",
        channelName: data.channelName || "",
        isPaused: isPaused,
        videoUrl: location.href,
        forceLangName: forceLangName,
      });
    } else if (msg.type === "toggle-force") {
      if (forceLangName && msg.langName === undefined) {
        forceLangName = null;
        isTracking = false;
        currentLangName = "";
        detectionDone = false;
        updateBadge(false);
        runDetectionWithRetry();
      } else if (msg.langName) {
        forceLangName = msg.langName;
        currentLangName = msg.langName;
        isTracking = true;
        detectionDone = true;
        updateBadge(true);
        startTrackingIfPlaying();
      }
      sendResponse({ isTracking: isTracking, currentLangName: currentLangName, forceLangName: forceLangName });
    }
    return true;
  });
})();
