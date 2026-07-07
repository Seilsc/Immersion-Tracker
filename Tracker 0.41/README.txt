Tracker 0.41 — 2026-07-07
---------------------------
- Ocultada la barra de scroll horizontal del heatmap (`.heatmap-scroll`)
  que aparecía al pasar el ratón sobre las celdas. Se usó:
    scrollbar-width: none;
    -ms-overflow-style: none;
    ::-webkit-scrollbar { display: none; }
  La funcionalidad de scroll se mantiene intacta.
