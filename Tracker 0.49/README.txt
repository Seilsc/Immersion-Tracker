=== v0.49 - Deshacer al eliminar + Código modularizado ===

Nuevo:
- Al eliminar una entrada del historial aparece un toast con botón "Deshacer" (10s para restaurar).
- Confirmación en dos pasos: 1er clic "¿Eliminar?", 2do clic elimina (con undo disponible).

Interno:
- app.js (~2700 líneas) se dividió en 8 módulos dentro de js/:
  config.js, core.js, media.js, activity.js, ui.js, pages.js, tools.js, main.js
- Misma funcionalidad, código más mantenible.
- app.js original archivado como app.js.bak.

Sync solo en Chrome/Edge (showDirectoryPicker).
Para Firefox y otros: exportar/importar JSON manual.
