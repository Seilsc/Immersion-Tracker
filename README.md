# Inmersión — Rastreador de exposición a idiomas

Aplicación web estática para registrar y visualizar el tiempo de exposición diario a idiomas.

## Cómo usar

1. Abre [Inmersión](https://seilsc.github.io/Immersion-Tracker/)
2. **Añade un idioma** desde Config → Gestión de idiomas
3. **Registra sesiones** desde la pestaña Registro

## Cuentas y guardado en la nube

Para guardar tu progreso y añadir amigos, la app usa **Firebase**. Necesitas configurar tu propio proyecto:

1. Ve a [Firebase Console](https://console.firebase.google.com/) e inicia sesión con tu cuenta de Google
2. Haz clic en **Crear un proyecto** (o usa uno existente)
3. Activa **Authentication** → **Sign-in method** → **Correo electrónico/contraseña** → Habilitar
4. Activa **Cloud Firestore** → **Crear base de datos** → **Modo prueba** (luego puedes ajustar las reglas)
5. Ve a **Configuración del proyecto** → **Tus aplicaciones** → **Web** → Registra la app
6. Copia el objeto de configuración (`apiKey`, `authDomain`, `projectId`, etc.)
7. Abre `js/firebase.js` y pega esos valores donde pone `TU_API_KEY`, `TU_PROYECTO`, etc.

Las reglas de seguridad de Firestore deben permitir lectura/escritura solo para usuarios autenticados:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/friends/{friendId} {
      allow read: if request.auth != null && (request.auth.uid == userId || request.auth.uid == friendId);
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## APIs necesarias

### YouTube Data API v3

Necesaria para obtener la duración automática de vídeos y playlists.

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Ve a **APIs y servicios** → **Biblioteca**
4. Busca "YouTube Data API v3" y actívala
5. Ve a **APIs y servicios** → **Credenciales**
6. Haz clic en **Crear credenciales** → **Clave de API**
7. Copia la clave que aparece
8. Pégala en Inmersión → Config → **Clave de la API de YouTube** → Guardar

> La clave se guarda solo en tu navegador. No es necesario restringirla para usar la app, pero puedes añadir restricción por HTTP referrer (`seilsc.github.io/*`) por seguridad.

### TMDB API

Necesaria para buscar series, animes y películas por nombre y obtener su duración.

1. Ve a [TMDB](https://www.themoviedb.org/) y crea una cuenta
2. Ve a [Configuración → API](https://www.themoviedb.org/settings/api)
3. Solicita una **API Key** (tipo v3 auth) — es inmediata
4. Copia la **API Key (v3 auth)** que te dan
5. Pégala en Inmersión → Config → **Clave de la API de TMDB** → Guardar

## Funcionalidades

- **Registro manual o con cronómetro**: selecciona una actividad, introduce el tiempo o usa el cronómetro
- **YouTube**: pega enlaces de vídeos o playlists — la duración se obtiene automáticamente con la API
- **Series/Animes**: busca por nombre en TMDB y registra episodios vistos
- **Películas**: busca en TMDB y añade películas completas con su duración
- **Estadísticas**: mapa de calor anual, racha de días, comparativa semanal, desglose por tipo/idioma
- **Objetivos diarios**: global o por idioma, con barra de progreso
- **Modo oscuro**: toggle en la esquina superior derecha
- **Sincronización**: conecta una carpeta local (Google Drive, iCloud, Dropbox, OneDrive) para backup automático
- **Exportación/importación**: descarga tu datos en JSON o restáuralos
- **Cuenta en la nube**: crea una cuenta, guarda tu progreso automáticamente y compite con amigos
- **Amigos**: añade amigos por código y compara tu progreso
- **Atajos de teclado**: `Ctrl+1` Registro, `Ctrl+2` Stats, `Ctrl+3` Historial, `Ctrl+4` Config

## Tecnología

HTML, CSS y JavaScript vanilla. Sin frameworks. Sin backend.

Persistencia:
- **Local**: localStorage (sin conexión)
- **Nube**: Firebase Auth + Cloud Firestore (con cuenta)

APIs externas:
- [YouTube Data API v3](https://developers.google.com/youtube/v3) — duración de vídeos
- [TMDB API](https://developers.themoviedb.org/3) — metadata de series y películas
