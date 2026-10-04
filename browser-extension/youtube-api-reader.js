(function () {
  var postedVideoIds = {};

  function processPlayerData(data, source) {
    if (!data || !data.videoDetails || !data.videoDetails.videoId) return;
    var videoId = data.videoDetails.videoId;
    var urlMatch = window.location.href.match(/[?&]v=([A-Za-z0-9_-]{11})/) || window.location.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    var urlVideoId = urlMatch ? urlMatch[1] : null;
    if (videoId !== urlVideoId) return;
    if (postedVideoIds[videoId]) return;
    postedVideoIds[videoId] = true;

    var captions = (data.captions && data.captions.playerCaptionsTracklistRenderer && data.captions.playerCaptionsTracklistRenderer.captionTracks) || [];
    var languages = captions.map(function (t) { return t.languageCode; });

    window.postMessage({
      type: "YT_EXT_VIDEO_DATA",
      videoId: videoId,
      title: data.videoDetails.title || "",
      channelName: data.videoDetails.author || "",
      captionLanguages: languages,
    }, "*");
  }

  function pollInitialResponse() {
    var attempts = 0;
    function check() {
      attempts++;
      var pr = window.ytInitialPlayerResponse;
      if (pr && pr.videoDetails && pr.videoDetails.videoId) {
        processPlayerData(pr, "ytInitialPlayerResponse");
        return;
      }
      if (attempts < 30) setTimeout(check, 200);
    }
    check();
  }
  pollInitialResponse();

  var originalFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    var url = args[0] && args[0].url ? args[0].url : args[0];
    if (typeof url === "string" && url.indexOf("/youtubei/v1/player") !== -1) {
      return originalFetch.apply(this, args).then(function (response) {
        response.clone().json().then(function (data) { processPlayerData(data, "fetch"); }).catch(function () {});
        return response;
      }, function () { return originalFetch.apply(this, args); });
    }
    return originalFetch.apply(this, args);
  };

  var originalXHROpen = XMLHttpRequest.prototype.open;
  var originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._ytUrl = typeof url === "string" ? url : (url ? url.toString() : "");
    return originalXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (this._ytUrl && this._ytUrl.indexOf("/youtubei/v1/player") !== -1) {
      var self = this;
      this.addEventListener("load", function () {
        try { processPlayerData(JSON.parse(self.responseText), "xhr"); } catch (e) {}
      });
    }
    return originalXHRSend.apply(this, arguments);
  };

  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      postedVideoIds = {};
    }
  }, 500);
})();
