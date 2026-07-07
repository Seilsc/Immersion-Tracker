Tracker 0.43 — 2026-07-07
---------------------------
- Corregida la obtención de la duración media de episodios en series.
  Cuando TMDB no devuelve `episode_run_time` en el endpoint principal
  (común en muchas series), ahora se consulta la temporada 1 (y siguientes)
  para obtener el runtime real de cada episodio. El anterior fallback
  fijo de 24 min/episodio se mantiene solo si tampoco hay datos por
  temporada.
