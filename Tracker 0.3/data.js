// ============================================================
// Catálogo de actividades de inmersión
// timeMode:
//   "content" -> el tiempo registrado es la duración del audio/vídeo consumido
//                (no hay pausas para buscar palabras ni interactuar)
//   "manual"   -> el tiempo se introduce a mano, porque la actividad implica
//                 pausas, repeticiones o interacción y dura más que el contenido
// ============================================================

const ACTIVITY_CATEGORIES = [
  {
    id: "reading",
    label: "Lectura",
    activities: [
      {
        id: "interactive_reading_audio",
        name: "Interactive Reading w/ Audio",
        desc: "Lees y escuchas a la vez, parando para buscar palabras que no conoces.",
        timeMode: "manual"
      },
      {
        id: "freeflow_reading_audio",
        name: "Freeflow Reading w/ Audio",
        desc: "Lees y escuchas a la vez sin hacer búsquedas ni usar herramientas.",
        timeMode: "content"
      },
      {
        id: "sentence_mining_read_listen",
        name: "Sentence Mining (Read+Listen)",
        desc: "Lees y escuchas a la vez, guardando frases para estudiarlas después.",
        timeMode: "manual"
      },
      {
        id: "interactive_reading",
        name: "Interactive Reading",
        desc: "Lees con herramientas o diccionario, solo texto, sin audio.",
        timeMode: "manual"
      },
      {
        id: "interlinear_reading",
        name: "Interlinear reading",
        desc: "Lees con traducciones línea a línea o palabra por palabra.",
        timeMode: "manual"
      },
      {
        id: "freeflow_reading",
        name: "Freeflow Reading",
        desc: "Lees sin pararte a buscar palabras, solo texto, sin audio.",
        timeMode: "content"
      },
      {
        id: "sentence_mining_reading",
        name: "Sentence Mining (While Reading)",
        desc: "Lees mientras guardas frases para estudiarlas más adelante.",
        timeMode: "manual"
      },
      {
        id: "uncorrected_reading_aloud",
        name: "Uncorrected Reading Aloud",
        desc: "Lees el texto en voz alta sin que nadie corrija tu pronunciación.",
        timeMode: "manual"
      },
      {
        id: "corrected_reading_aloud",
        name: "Corrected Reading Aloud",
        desc: "Lees en voz alta mientras un hablante nativo corrige tu pronunciación.",
        timeMode: "manual"
      }
    ]
  },
  {
    id: "listening",
    label: "Escucha",
    activities: [
      {
        id: "interactive_listening",
        name: "Interactive Listening",
        desc: "Usas herramientas para buscar palabras o repites partes del audio.",
        timeMode: "manual"
      },
      {
        id: "sentence_mining_listening",
        name: "Sentence Mining (While Listening)",
        desc: "Escuchas audio guardando frases para estudiarlas después.",
        timeMode: "manual"
      },
      {
        id: "transcription",
        name: "Transcription",
        desc: "Escuchas audio y escribes exactamente lo que oyes.",
        timeMode: "manual"
      },
      {
        id: "freeflow_listening",
        name: "Freeflow Listening",
        desc: "Escuchas audio sin mirar texto ni buscar palabras.",
        timeMode: "content"
      },
      {
        id: "half_attention_listening",
        name: "Half-attention Listening",
        desc: "Escuchas sin prestar atención completa o mientras haces otra cosa.",
        timeMode: "content"
      },
      {
        id: "intensive_listening",
        name: "Intensive Listening",
        desc: "Pausas automáticamente y repites cada frase hasta 3 veces antes de mirar los subtítulos.",
        timeMode: "manual"
      },
      {
        id: "listen_looping",
        name: "Listen Looping",
        desc: "Escuchas el mismo audio repetidamente para mejorar tu comprensión auditiva.",
        timeMode: "manual"
      },
      {
        id: "ear_training",
        name: "Ear training",
        desc: "Practicas para distinguir nuevos sonidos del idioma.",
        timeMode: "manual"
      },
      {
        id: "subvocal_shadowing",
        name: "Subvocal Shadowing",
        desc: "Escuchas audio repitiendo mentalmente lo que oyes, sin hablar en voz alta.",
        timeMode: "content"
      }
    ]
  },
  {
    id: "writing",
    label: "Escritura",
    activities: [
      {
        id: "assisted_writing",
        name: "Assisted writing",
        desc: "Escribes con ayuda de herramientas o de un hablante nativo.",
        timeMode: "manual"
      },
      {
        id: "writing_analysis",
        name: "Writing Analysis",
        desc: "Analizas y mejoras algo que ya has escrito.",
        timeMode: "manual"
      },
      {
        id: "unassisted_writing",
        name: "Unassisted writing",
        desc: "Escribes sin usar herramientas ni diccionarios.",
        timeMode: "manual"
      },
      {
        id: "topic_writing",
        name: "Topic Writing",
        desc: "Escribes repetidamente sobre el mismo tema.",
        timeMode: "manual"
      },
      {
        id: "copywork",
        name: "Copywork",
        desc: "Copias un texto (escribiendo o a mano) y analizas el idioma usado.",
        timeMode: "manual"
      },
      {
        id: "typing_practice",
        name: "Typing practice",
        desc: "Practicas escribir el idioma con teclado.",
        timeMode: "manual"
      },
      {
        id: "handwriting_practice",
        name: "Handwriting Practice",
        desc: "Escribes a mano centrándote en mejorar la letra y la comodidad.",
        timeMode: "manual"
      }
    ]
  },
  {
    id: "speaking",
    label: "Habla",
    activities: [
      {
        id: "crosstalk",
        name: "Crosstalk",
        desc: "Conversación bilingüe: cada persona habla en su idioma nativo.",
        timeMode: "manual"
      },
      {
        id: "speaking_partner",
        name: "Speaking with partner",
        desc: "Hablas en tu idioma objetivo con otra persona.",
        timeMode: "manual"
      },
      {
        id: "speaking_alone",
        name: "Speaking alone",
        desc: "Hablas contigo mismo en el idioma que estás aprendiendo.",
        timeMode: "manual"
      },
      {
        id: "speaking_analysis",
        name: "Speaking Analysis",
        desc: "Analizas grabaciones de tu propia voz hablando el idioma.",
        timeMode: "manual"
      },
      {
        id: "singing",
        name: "Singing",
        desc: "Cantas canciones en tu idioma objetivo.",
        timeMode: "manual"
      },
      {
        id: "topic_talk",
        name: "Topic Talk",
        desc: "Hablas repetidamente sobre el mismo tema.",
        timeMode: "manual"
      },
      {
        id: "chorusing",
        name: "Chorusing",
        desc: "Escuchas frases cortas y las repites a la vez o justo después.",
        timeMode: "manual"
      },
      {
        id: "shadowing",
        name: "Shadowing",
        desc: "Escuchas audio sin pausar y repites después del hablante.",
        timeMode: "manual"
      },
      {
        id: "phrase_memorization",
        name: "Phrase memorization",
        desc: "Memorizas y practicas frases y estructuras hechas.",
        timeMode: "manual"
      },
      {
        id: "pronunciation_practice",
        name: "Pronunciation Practice",
        desc: "Cualquier ejercicio centrado en la pronunciación.",
        timeMode: "manual"
      },
      {
        id: "sound_study",
        name: "Sound study",
        desc: "Estudias los sonidos propios del idioma que aprendes.",
        timeMode: "manual"
      }
    ]
  },
  {
    id: "study",
    label: "Estudio",
    activities: [
      {
        id: "vocab_study",
        name: "Vocab Study",
        desc: "Repasas vocabulario con tarjetas (flashcards) o una app.",
        timeMode: "manual"
      },
      {
        id: "grammar_study",
        name: "Grammar Study",
        desc: "Lees o practicas reglas de gramática del idioma.",
        timeMode: "manual"
      },
      {
        id: "flashcard_creation",
        name: "Flashcard creation",
        desc: "Creas tarjetas de estudio fuera de tus sesiones de inmersión normales.",
        timeMode: "manual"
      },
      {
        id: "language_app",
        name: "Language App",
        desc: "Estudias con una app de idiomas que no encaja en otras categorías.",
        timeMode: "manual"
      },
      {
        id: "language_class",
        name: "Language class",
        desc: "Estudias con un profesor usando un libro de texto o material tradicional.",
        timeMode: "manual"
      },
      {
        id: "test_prep",
        name: "Test Prep",
        desc: "Estudias para un examen o certificación de nivel.",
        timeMode: "manual"
      },
      {
        id: "number_practice",
        name: "Number Practice",
        desc: "Practicas números, fechas y horas en el idioma.",
        timeMode: "manual"
      },
      {
        id: "alphabet_study",
        name: "Alphabet Study",
        desc: "Estudias o aprendes el alfabeto del idioma.",
        timeMode: "manual"
      },
      {
        id: "character_study",
        name: "Character Study",
        desc: "Aprendes caracteres escritos como Hanzi o Kanji.",
        timeMode: "manual"
      }
    ]
  },
  {
    id: "other",
    label: "Otros",
    activities: [
      {
        id: "video_games",
        name: "Video Games",
        desc: "Juegas videojuegos en tu idioma objetivo.",
        timeMode: "manual"
      }
    ]
  }
];

// Lista plana para búsquedas rápidas por id
const ACTIVITY_MAP = {};
ACTIVITY_CATEGORIES.forEach(cat => {
  cat.activities.forEach(act => {
    ACTIVITY_MAP[act.id] = { ...act, category: cat.id, categoryLabel: cat.label };
  });
});

const STORAGE_KEY = "immersion_sessions_v1";
const LANG_KEY = "immersion_known_langs_v1";
