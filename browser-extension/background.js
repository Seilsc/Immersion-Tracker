try { importScripts("lib/lang-map.js"); } catch (e) { console.error("importScripts failed:", e); }

const QUEUE_KEY = "yt-extension-queue";
const IMMERSION_TRACKER_URL = "https://seilsc.github.io/Immersion-Tracker/";

function sendMsg(msg) {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage(msg, function (r) {
      if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
      else resolve(r);
    });
  });
}

function getQueue() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([QUEUE_KEY], function (r) {
      resolve(r[QUEUE_KEY] || []);
    });
  });
}

function setQueue(queue) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [QUEUE_KEY]: queue }, resolve);
  });
}

function openTrackerWithSession(session) {
  var params = new URLSearchParams();
  params.set("ext-session", "1");
  params.set("id", session.id || "");
  params.set("title", session.note || "");
  params.set("lang", session.lang || "");
  params.set("seconds", String(session.seconds || 0));
  params.set("url", session.url || "");
  var url = IMMERSION_TRACKER_URL + "?" + params.toString();
  chrome.tabs.create({ url: url, active: true });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.alarms.create("flush-queue", { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "flush-queue") {
    flushQueue();
  }
});

function flushQueue() {
  getQueue().then(function (queue) {
    if (queue.length === 0) return;
    var session = queue.shift();
    openTrackerWithSession(session);
    setQueue(queue);
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    try {
      switch (msg.type) {

        case "get-status": {
          var queue = await getQueue();
          sendResponse({
            queueLength: queue.length,
            lastSession: queue.length > 0 ? queue[queue.length - 1] : null,
          });
          break;
        }

        case "check-language": {
          var primaryName = isoToPrimaryName(msg.isoCode);
          sendResponse({
            langName: primaryName,
            found: primaryName !== null,
          });
          break;
        }

        case "save-session": {
          var queue = await getQueue();
          queue.push(msg.session);
          await setQueue(queue);
          sendResponse({ ok: true, queueLength: queue.length });
          break;
        }

        case "open-tracker": {
          var queue = await getQueue();
          if (queue.length === 0) {
            sendResponse({ ok: true, opened: false, reason: "empty" });
            break;
          }
          var session = queue.shift();
          await setQueue(queue);
          openTrackerWithSession(session);
          sendResponse({ ok: true, opened: true, remaining: queue.length });
          break;
        }

        case "clear-queue": {
          await setQueue([]);
          sendResponse({ ok: true });
          break;
        }

        case "update-badge": {
          var tabId = sender.tab ? sender.tab.id : undefined;
          if (msg.text) {
            chrome.action.setBadgeText({ text: msg.text, tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: msg.color || [46, 204, 113, 255], tabId: tabId });
          } else {
            chrome.action.setBadgeText({ text: "", tabId: tabId });
          }
          sendResponse({ ok: true });
          break;
        }

        default:
          sendResponse({ error: "unknown type" });
      }
    } catch (e) {
      sendResponse({ error: e.message });
    }
  })();
  return true;
});
