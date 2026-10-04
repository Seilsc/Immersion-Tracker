# Immersion Tracker — AGENTS.md

## Stack

Vanilla HTML/CSS/JS. No package.json, build step, linter, formatter, or tests. Only check: `node --check js/<file>.js`. All webapp markup/CSS lives in `index.html` (`<style>` in head, body HTML, scripts at bottom).

## Load order (script tags at bottom of index.html)

Firebase compat SDKs (`firebase-app/auth/firestore-compat.js` 10.14.1) must load **before** `js/*`. Then: `config.js → core.js → media.js → activity.js → ui.js → pages.js → tools.js → firebase.js → achievements.js → main.js`. New scripts depending on config constants or `state` go after `config.js`/`core.js`.

## Key files

| File | Role |
|---|---|
| `index.html` | SPA shell — all HTML, CSS, `<script>` tags |
| `js/config.js` | Constants: storage keys, `ACTIVITIES`, `MEDIA_ACTIVITIES`/`SHOW_ACTIVITIES`, display prefs, language list |
| `js/core.js` | `state`, `loadState()`/`saveState()`, API-key getters/setters, format/parse utils |
| `js/media.js` | YouTube + TMDB search/duration, shows/movies lists |
| `js/activity.js` | Session totals, goal bar, goal config, today's stats, breakdowns |
| `js/ui.js` | Language pills, theme, display toggles, API-key UI, import/export |
| `js/pages.js` | Stats (heatmap, weekly chart, history filters), rich profile modal |
| `js/tools.js` | Manual register panel, timer, activity selector, social page |
| `js/firebase.js` | Firebase Auth + Firestore, cloud sync, friends, privacy, profile UI wiring |
| `js/achievements.js` | Achievement catalog + engine (wraps `saveState`), unlock toasts, showcases |
| `js/main.js` | Nav tabs, `renderAll()`, folder sync (File System Access API), extension-session import |
| `firestore.rules` | Security rules as code (`firebase deploy --only firestore:rules`); friend reads via `public/*` + `codes/*`, never list `users` |
| `PLAN_SOCIAL.md` | Social/registration roadmap (phases 0–6) |

## State

- **Local**: `localStorage` key `lang-immersion-tracker-v2` → `{ languages, sessions, youtube, shows, movies, goals }` (see `loadState()` in core.js).
- **Cloud**: Firestore `users/{uid}/data/state`. Written only when logged in (`fbUser` set).
- **`saveState` is wrapped three times — preserve the chain**: `firebase.js` wraps it for cloud sync (`saveCloudState` + `writePublicStats`), `achievements.js` wraps that for the engine (`evaluateAchievements`), `main.js` wraps it again for folder sync (`syncWrite`). Load order makes main.js's wrapper outermost. Never replace `saveState`; always call through to the previous reference.
- **Folder sync**: Chrome/Edge only (`showDirectoryPicker`). Handle persisted in IndexedDB `SyncHandles`, file name is `inmersion_tracker_sync.json` (typo is real — keep exact).
- **Privacy**: `localStorage` key `"privacy"`, mirrored to user doc `privacy`. Ten keys: `total, languages, weekly, daily, recent, streak` + `avatar, bio, feed, ranking`. Toggle wiring lives in the init IIFE at the end of firebase.js; `syncPrivacyToggles` is exposed via `window.*` because the IIFE scope hides it from `initFirebase()`.

## APIs

| API | Config field | Storage key | Param style |
|---|---|---|---|
| YouTube Data v3 | Clave de la API de YouTube | `lang-immersion-yt-api-key` | `?key=` (see media.js) |
| TMDB v3 | Clave de la API de TMDB | `lang-immersion-tmdb-api-key` | `?api_key=` (not Bearer) |

## Chrome Extension (browser-extension/, MV3, no build)

No OAuth, no Firebase, no auth in the extension. It only detects language + watch time, queues sessions in `chrome.storage.local`, and hands them to the webapp by opening a tracker URL.

| File | Role |
|---|---|
| `manifest.json` | MV3, stable `key`, `content.js` at `document_start`, `youtube-api-reader.js` as `web_accessible_resources` |
| `youtube-api-reader.js` | Page-context script (injected via `<script src>`, bypasses isolated-world/CSP limits). Intercepts `/youtubei/v1/player` (fetch/XHR override) + polls `ytInitialPlayerResponse`, posts `YT_EXT_VIDEO_DATA` (title, channel, captionLanguages) via `window.postMessage` |
| `content.js` | Isolated world. Injects reader, receives video data, asks background `check-language`, tracks real watch time (`Date.now()` delta, `MIN_SESSION_SECONDS = 5`), sends `save-session` |
| `background.js` | Service worker. Message router: `check-language` (via `lib/lang-map.js` `isoToPrimaryName`), `save-session`/`open-tracker`/`clear-queue` on `chrome.storage.local` key `yt-extension-queue`, `update-badge` (badge text+color), 5-min `flush-queue` alarm |
| `popup.js` + `popup.html` | Queue status, open-tracker button, force-language override; tracked languages in `chrome.storage.local` key `yt-extension-tracked-langs` |
| `lib/lang-map.js` | Only lib file. ISO 639-1 → language name |

**Handoff**: background builds `https://seilsc.github.io/Immersion-Tracker/?ext-session=1&seconds&lang&title&url&id`; `checkExtensionSession()` in main.js (uncommitted change — see `git diff`) pushes `{ activityId: "youtube-Freeflow Listening", cat: "YouTube", lang, note, url, seconds, ts }` and cleans the URL params.

## Deployment

`git push origin main` → GitHub Actions (`.github/workflows/pages.yml`) → GitHub Pages (`https://seilsc.github.io/Immersion-Tracker/`). CI runs `node --check` on all JS and generates `js/firebase-config.js` from the `FIREBASE_CONFIG_JSON` repo secret (never committed); without the secret it deploys without cloud login. `firebase.json` + `.firebaserc` (project `immersion-tracker-languages`) exist but Pages is the live site.

## Conventions & quirks

- **Mixed `var`/`const`/`let`** — match surrounding code.
- **No emojis in the UI, ever.** Use inline SVG stroke icons (`fill="none" stroke="currentColor"`, 24×24 viewBox, round caps) matching the existing `.ic` style. Achievement icons live in the `ACH_ICONS` map (`js/achievements.js`). Plain text marks like ✓/✕ in status messages are acceptable (pre-existing convention).
- **`FIREBASE_CONFIG`** lives in untracked `js/firebase-config.js` (copied from `js/firebase-config.example.js`, gitignored — never commit the real one). `js/firebase.js` reads it via `window.FIREBASE_CONFIG` and degrades gracefully without it.
- **Compat SDK**, not modular: global `firebase.auth()` / `firebase.firestore()` via `firebase-*-compat.js` script tags.
- **Two activity lists**: full `ACTIVITIES` (config.js, activity selector with `manualTime` flag) vs `MEDIA_ACTIVITIES`/`SHOW_ACTIVITIES` subset for YouTube/shows/movies.
- **Friend codes**: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars); lookup uppercases input; stored as user doc `friendCode`.
- **Num-stepper** buttons use global click delegation on `document` (main.js).
- **`renderAll()`** (main.js) is the re-render entry; nav tabs additionally call `renderStats` / `renderHistory` / `refreshGoalConfigUI` / `renderSocialPage` per page.
