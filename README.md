# Inmersión — Rastreador de exposición a idiomas

Aplicación web estática para registrar y visualizar el tiempo de exposición diario a idiomas.

## Cómo usar

1. Abre [Inmersión](https://seilsc.github.io/Immersion-Tracker/)

2. **Añade un idioma** desde la pestaña Config → Gestión de idiomas

3. **Registra sesiones** desde la pestaña Registro:
   - **Actividades**: selecciona una actividad predefinida, introduce tiempo manual o usa el cronómetro
   - **YouTube**: pega enlaces de vídeos o playlists (requiere API key)
   - **Series/Animes**: busca en TMDB por nombre y registra episodios vistos
   - **Películas**: busca en TMDB y añade películas completas

4. **Conecta una API key de YouTube** (opcional pero recomendado) en Config para obtener duraciones automáticas

5. **Sincronización**: conecta una carpeta local (Google Drive, iCloud, Dropbox, etc.) para backup automático

## Funcionalidades

- Registro manual o con cronómetro
- Importación de playlists de YouTube
- Búsqueda en TMDB para series y películas
- Estadísticas: mapa de calor, racha, comparativa semanal, desglose por tipo/idioma
- Objetivos diarios (global o por idioma)
- Modo oscuro
- Sincronización con carpeta local
- Exportación/importación de datos
- Atajos de teclado: `Ctrl+1` Registro, `Ctrl+2` Stats, `Ctrl+3` Historial, `Ctrl+4` Config

## Tecnología

HTML, CSS y JavaScript vanilla. Sin frameworks. Sin backend. Los datos se guardan en localStorage.

API externas:
- YouTube Data API v3 (duración de vídeos)
- TMDB API (metadata de series y películas)

## Licencia

Uso personal.
