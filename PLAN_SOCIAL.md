# PLAN_SOCIAL — Registro, base de datos y zona social

Documento operativo. Fases en orden de dependencias. Cada fase: cambios por archivo,
`node --check js/<fichero>.js`, prueba manual (cuenta A + cuenta B en dos navegadores
para lo social) y commit separado.

## Decisiones de diseño

1. **Documento `publicStats`** (`users/{uid}/public/stats`): agregados ya filtrados por la
   privacidad del dueño. Ranking y vistas ajenas leen SOLO ese doc (1 lectura/amigo,
   privacidad garantizada por construcción).
2. **`firestore.rules` como código** en el repo + `firebase deploy --only firestore:rules`.
3. **Función `esc()` central** (`core.js`) para todo HTML con datos de usuario.
4. **Sesión canónica**: `{ id, activityId, activityName, cat, lang, note, url?, seconds,
   ts, source }` con `activityId` siempre del catálogo `ACTIVITIES`
   (`source ∈ manual|timer|youtube|show|movie|extension`). Los flujos media guardan
   `mediaRef` aparte en vez de inventar IDs.
5. **Los logros no se revocan** (estándar del sector) aunque se edite/borre la sesión.

## Fase 0 — Cimientos (corrige fugas reales en producción)

- `esc()` + `escUrl()` en `core.js`; barrido de `innerHTML` con datos de usuario:
  `pages.js:renderHistory`, `firebase.js` (ranking, feed, solicitudes, modal rico).
- Arreglar entidades HTML literales en errores (`firebase.js` sendFriendRequest:
  `a&ntilde;`, `sesin`, `Cdigo`, `invlido` → UTF-8 real).
- `firestore.rules` nuevo: lectura propia total; ajena limitada a campos públicos +
  `publicStats` + `activity` reciente solo `if isFriend()`; `friendRequests`: crear
  cualquiera autenticado (validando `from == auth.uid`), leer/editar solo el dueño;
  `achievements`/`publicStats` ajenos solo-lectura. Despliegue documentado en README.
- Quitar `apiKeyYoutube/apiKeyTmdb` del `data/state` cloud (`firebase.js`:
  `saveCloudState`, `loadCloudState`, `startRealTimeSync`): solo `localStorage`.
  El folder-sync (`main.js`) las conserva (es el Drive del propio usuario).
- `makeSession()` en `core.js` (`crypto.randomUUID()` + fallback) + `normalizeSessions()`
  al cargar (mapea `youtube-X/show-X/movie-X` y `youtube-Freeflow Listening` a IDs
  canónicos por id o nombre insensible a mayúsculas; fallback `freeflow-listening`).
  Usar en `ui.js:saveActivitySession`, `media.js` (3 pushes), `main.js:checkExtensionSession`
  y extensión `content.js`.
- `Promise.all` en `getFriends`, `getFriendsWithRange`, `getFriendActivityFeed`.
- Aceptación: `git grep "AIza" -- .` vacío; ranking con 2 cuentas respeta privacidad;
  sesiones viejas aparecen bajo su actividad real.

## Fase 1 — Registro

- Buscador en vivo en `#activity-selector` (nombre ES/EN + categoría) + "Recientes"
  (últimas 5, `localStorage immersion-recent-acts`) + "Fijadas" (chincheta, clave
  `immersion-pinned-acts`). (`ui.js:buildActivitySelector`, `index.html` + CSS)
- "Registro rápido": 1 clic guarda última actividad con su última duración
  (defecto 25 min), con toast de deshacer existente.
- Editar sesiones: lápiz en historial (solo `type=session`) que precarga el panel
  (`editingSessionId` en `ui.js`); guardar actualiza sin duplicar, conserva `id`/`ts`.
- Timer persistente: `{ startedAt, accumulated, activityId }` en `localStorage`;
  al cargar ofrece recuperar/descartar; auto-pausa a las 8 h con aviso.
- Validaciones: máx. 12 h con confirmación; aviso de duplicado (misma actividad +
  duración ±2 min en la última hora); `ts` nunca futuro (recorte en `makeSession`).
- Aceptación: cualquier actividad en ≤3 interacciones; recarga con timer no pierde tiempo.

## Fase 2 — Cuenta y perfil

- Cambiar contraseña (reautenticar con `EmailAuthProvider.credential` + nueva ×2),
  "olvidé mi contraseña" (`sendPasswordResetEmail`) en el login, reenviar verificación.
- Gating: sin `emailVerified` (cuentas email/pass; Google exento) lo social se bloquea
  con aviso; el registro local sigue funcionando.
- Cambiar email (`verifyBeforeUpdateEmail` + reverificación).
- Foto: botón eliminar (volver a Gravatar/inicial), rechazo pre-crop >5 MB,
  `set(merge:true)` en vez de `update()`. Nombre ≤40 / bio ≤300 con contador.
- Aceptación: ningún error crudo de Firebase en inglés llega al usuario.

## Fase 3 — Privacidad coherente + publicStats

- Flags nuevos: `avatar`, `bio`, `feed` (no salir en feeds), `ranking` (fila "privada").
- `computePublicStats()` tras cada `saveState` con sesión + al login; ranking/feed/modal
  leen `publicStats` y aplican flags.
- Aceptación: con todo oculto, un amigo ve fila privada, perfil vacío y 0 items en feed.

## Fase 4 — Amigos, ranking, feed

- Solicitudes: cancelar enviadas (subcolección espejo `sentRequests`), anti-spam
  (≤10 salientes, no reenviar en 24 h).
- Eliminar con modal propio + deshacer 15 s (patrón `showUndoToast`), borrado bilateral.
- Ranking v2 sobre `publicStats` (+`last7Days`), medallas, empates, fila propia, paginado 25.
- Feed v2: `limit+startAfter` ("cargar más"), filtro amigo/idioma, refresco 60 s solo con
  Social visible, respeta `feed:false`.
- Comparativa "tú vs amigo" (semana) en el modal rico.

## Fase 5 — Logros

- Nuevo `js/achievements.js` (cargar tras `firebase.js`): catálogo (rachas 7/30/100/365,
  horas por idioma 1/10/100/500, políglota 3/5, maratón, constancia, sociales),
  `evaluateAchievements()` tras `saveState`, escritura idempotente en
  `achievements/{id}`, modal con estilos de celebración de racha, vitrina en perfil
  propio/ajeno. Sin revocación.
- Aceptación: desbloqueo persiste tras recarga; segundo cliente no duplica.

## Fase 6 — Cierre

- Eliminar cuenta: doble confirmación + reauth, borrado en cascada (state, activity por
  batches, achievements, publicStats, amistades bilaterales, solicitudes), `delete()`,
  limpieza local. El `friendCode` deja de resolver.
- Conflictos multi-dispositivo: diálogo nube-vs-local (patrón folder-sync `main.js`).
- Auditoría final de reglas (8 casos), README + AGENTS.md, verificación global.
