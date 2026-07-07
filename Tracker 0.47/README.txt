Tracker 0.47 — 2026-07-07
---------------------------
- Añadida sincronización en la nube mediante el File System Access API.
  • Botón "Conectar carpeta" en Config → Sincronización en la nube.
  • Selecciona cualquier carpeta de tu disco (Google Drive, iCloud,
    Dropbox, OneDrive…).
  • Cada cambio se guarda automáticamente en un archivo JSON dentro
    de esa carpeta.
  • Al abrir la app, detecta si hay un archivo de sincronización y
    ofrece restaurarlo.
  • El permiso se guarda en IndexedDB entre sesiones.
  • Compatible con Chrome y Edge (showDirectoryPicker).
