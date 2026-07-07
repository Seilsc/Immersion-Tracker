const STORAGE_KEY = "lang-immersion-tracker-v2";
const API_KEY_STORAGE = "lang-immersion-yt-api-key";
const TMDB_KEY_STORAGE = "lang-immersion-tmdb-api-key";
const DARK_KEY = "lang-immersion-dark-mode";
const SYNC_FILE = "inmersion_tracker_sync.json";

const ACTIVITIES = [
  { id: "interactive-reading-audio", name: "Interactive Reading w/ Audio", cat: "Lectura", desc: "Lectura y escucha simultánea con pausas para buscar palabras.", manualTime: false },
  { id: "freeflow-reading-audio", name: "Freeflow Reading w/ Audio", cat: "Lectura", desc: "Lectura y escucha simultánea sin pausas ni herramientas.", manualTime: false },
  { id: "sentence-mining-read-listen", name: "Sentence Mining (Read+Listen)", cat: "Lectura", desc: "Lectura y escucha simultánea guardando frases para estudiar.", manualTime: false },
  { id: "interactive-reading", name: "Interactive Reading", cat: "Lectura", desc: "Lectura con herramientas o diccionario (solo texto, sin audio).", manualTime: false },
  { id: "interlinear-reading", name: "Interlinear reading", cat: "Lectura", desc: "Lectura con traducciones entre líneas.", manualTime: false },
  { id: "freeflow-reading", name: "Freeflow Reading", cat: "Lectura", desc: "Lectura sin pausas ni diccionario (solo texto, sin audio).", manualTime: false },
  { id: "sentence-mining-reading", name: "Sentence Mining (While Reading)", cat: "Lectura", desc: "Lectura guardando frases para estudiar.", manualTime: false },
  { id: "reading-aloud-uncorrected", name: "Uncorrected Reading Aloud", cat: "Lectura", desc: "Leer texto en voz alta.", manualTime: false },
  { id: "reading-aloud-corrected", name: "Corrected Reading Aloud", cat: "Lectura", desc: "Leer en voz alta con un hablante nativo corrigiendo tu pronunciación.", manualTime: true },
  { id: "interactive-listening", name: "Interactive Listening", cat: "Escucha", desc: "Uso de herramientas para buscar palabras o repetir fragmentos de audio.", manualTime: true },
  { id: "sentence-mining-listening", name: "Sentence Mining (While Listening)", cat: "Escucha", desc: "Escucha guardando frases para estudiar.", manualTime: true },
  { id: "transcription", name: "Transcription", cat: "Escucha", desc: "Escuchar audio y escribir exactamente lo que oyes.", manualTime: false },
  { id: "freeflow-listening", name: "Freeflow Listening", cat: "Escucha", desc: "Escuchar audio sin texto ni diccionario.", manualTime: false },
  { id: "half-attention-listening", name: "Half-attention Listening", cat: "Escucha", desc: "Escuchar sin prestar atención plena o mientras haces otras cosas.", manualTime: false },
  { id: "intensive-listening", name: "Intensive Listening", cat: "Escucha", desc: "Pausa automática y bucle de cada frase hasta 3 veces antes de ver los subtítulos.", manualTime: true },
  { id: "listen-looping", name: "Listen Looping", cat: "Escucha", desc: "Escuchar repetidamente el mismo audio para mejorar tu capacidad de comprensión.", manualTime: false },
  { id: "ear-training", name: "Ear training", cat: "Escucha", desc: "Practicar la escucha de nuevos sonidos del idioma.", manualTime: false },
  { id: "subvocal-shadowing", name: "Subvocal Shadowing", cat: "Escucha", desc: "Escuchar audio mientras repites lo que oyes en tu cabeza.", manualTime: false },
  { id: "assisted-writing", name: "Assisted writing", cat: "Escritura", desc: "Escribir con ayuda de herramientas o un hablante nativo.", manualTime: false },
  { id: "writing-analysis", name: "Writing Analysis", cat: "Escritura", desc: "Analizar y mejorar tu escritura.", manualTime: false },
  { id: "unassisted-writing", name: "Unassisted writing", cat: "Escritura", desc: "Escribir sin usar ninguna herramienta ni diccionario.", manualTime: false },
  { id: "topic-writing", name: "Topic Writing", cat: "Escritura", desc: "Escribir sobre el mismo tema repetidamente.", manualTime: false },
  { id: "copywork", name: "Copywork", cat: "Escritura", desc: "Copiar contenido escrito (a máquina o a mano) y analizar el idioma.", manualTime: false },
  { id: "typing-practice", name: "Typing practice", cat: "Escritura", desc: "Aprender a escribir el idioma objetivo en un teclado.", manualTime: false },
  { id: "handwriting-practice", name: "Handwriting Practice", cat: "Escritura", desc: "Escribir a mano con foco en mejorar la apariencia y comodidad.", manualTime: false },
  { id: "crosstalk", name: "Crosstalk", cat: "Conversación", desc: "Conversación bilingüe: cada persona habla su lengua materna.", manualTime: true },
  { id: "speaking-with-partner", name: "Speaking with partner", cat: "Conversación", desc: "Hablar en tu idioma objetivo con un compañero.", manualTime: true },
  { id: "speaking-alone", name: "Speaking alone", cat: "Conversación", desc: "Hablarte a ti mismo en tu idioma objetivo.", manualTime: false },
  { id: "speaking-analysis", name: "Speaking Analysis", cat: "Conversación", desc: "Analizar grabaciones de tu discurso.", manualTime: false },
  { id: "singing", name: "Singing", cat: "Conversación", desc: "Cantar en tu idioma objetivo.", manualTime: false },
  { id: "topic-talk", name: "Topic Talk", cat: "Conversación", desc: "Hablar sobre el mismo tema repetidamente.", manualTime: false },
  { id: "chorusing", name: "Chorusing", cat: "Conversación", desc: "Escuchar frases cortas y repetirlas simultáneamente o de forma alterna.", manualTime: false },
  { id: "shadowing", name: "Shadowing", cat: "Conversación", desc: "Escuchar audio, sin pausas, y repetir después del hablante.", manualTime: false },
  { id: "phrase-memorization", name: "Phrase memorization", cat: "Conversación", desc: "Memorizar y practicar frases y estructuras gramaticales predefinidas.", manualTime: false },
  { id: "pronunciation-practice", name: "Pronunciation Practice", cat: "Conversación", desc: "Todos los ejercicios de pronunciación.", manualTime: false },
  { id: "sound-study", name: "Sound study", cat: "Conversación", desc: "Aprender sobre los sonidos del idioma objetivo.", manualTime: false },
  { id: "vocab-study", name: "Vocab Study", cat: "Estudio", desc: "Estudiar vocabulario con flashcards o una app.", manualTime: false },
  { id: "grammar-study", name: "Grammar Study", cat: "Estudio", desc: "Leer o estudiar reglas gramaticales del idioma objetivo.", manualTime: false },
  { id: "flashcard-creation", name: "Flashcard creation", cat: "Estudio", desc: "Crear flashcards fuera de las actividades normales de inmersión.", manualTime: false },
  { id: "language-app", name: "Language App", cat: "Estudio", desc: "Estudiar con una app de idiomas que no encaja en otras categorías.", manualTime: false },
  { id: "language-class", name: "Language class", cat: "Estudio", desc: "Estudiar con un profesor usando un libro de texto o materiales tradicionales.", manualTime: true },
  { id: "test-prep", name: "Test Prep", cat: "Estudio", desc: "Prepararse para un examen o prueba de competencia lingüística.", manualTime: false },
  { id: "number-practice", name: "Number Practice", cat: "Estudio", desc: "Practicar números, fechas y horas en el idioma objetivo.", manualTime: false },
  { id: "alphabet-study", name: "Alphabet Study", cat: "Estudio", desc: "Estudiar o aprender el alfabeto.", manualTime: false },
  { id: "character-study", name: "Character Study", cat: "Estudio", desc: "Aprender caracteres escritos como Hanzi o Kanji.", manualTime: false },
  { id: "video-games", name: "Video Games", cat: "Ocio", desc: "Jugar a videojuegos en tu idioma objetivo.", manualTime: false },
];

const ACTIVITY_COLORS = {
  "Lectura": "#2d4f8a", "Escucha": "#2f5d4f", "Escritura": "#5c3d8a",
  "Conversación": "#8a3d3d", "Estudio": "#8a6d2d", "Ocio": "#3d7a8a",
};

const DISPLAY_PREFS = {
  streak:      { key: "lang-immersion-streak-visible",      default: true },
  heatmap:     { key: "lang-immersion-heatmap-visible",     default: true },
  weeklyChart: { key: "lang-immersion-weeklychart-visible", default: true },
  bestAvg:     { key: "lang-immersion-bestavg-visible",     default: true },
  chartsGrid:  { key: "lang-immersion-chartsgrid-visible",  default: true },
  goalBar:     { key: "lang-immersion-goalbar-visible",     default: true },
  totals:      { key: "lang-immersion-totals-visible",      default: true },

};

const TOGGLE_PREF_MAP = {
  "toggle-streak": "streak", "toggle-heatmap": "heatmap", "toggle-weekly-chart": "weeklyChart",
  "toggle-best-avg": "bestAvg", "toggle-charts-grid": "chartsGrid",
  "toggle-goal-bar": "goalBar", "toggle-totals": "totals",

};

const WORLD_LANGUAGES = [
  "Abkhazo","Afar","Afrikaans","Akan","Albanés","Alemán","Amhárico","Árabe","Aragonés","Armenio",
  "Assamés","Avar","Aymara","Azerbaiyano","Bambara","Bashkir","Bascongado/Euskera","Bielorruso",
  "Bengalí","Birmano","Bislama","Bosnio","Bretón","Búlgaro","Catalán","Chamorro","Checheno",
  "Chichewa","Chino (Mandarín)","Chino (Cantonés)","Chuvash","Cingalés","Córnico","Corso",
  "Croata","Danés","Dzongkha","Eslovaco","Esloveno","Español","Esperanto","Estonio","Feroés",
  "Fiyiano","Filipino/Tagalo","Finlandés","Francés","Frisón del Norte","Fula","Gaélico Escocés",
  "Galés","Gallego","Georgiano","Griego","Guaraní","Gujarati","Hausa","Hawaiano","Hebreo",
  "Hindú/Hindi","Hmong","Húngaro","Igbo","Indonesio","Inglés","Inuktitut","Irlandés","Islandés",
  "Italiano","Japonés","Javanés","Jemer/Camboyano","Kazajo","Kinyarwanda","Kirguís","Komi",
  "Coreano","Kurdo","Laosiano","Latín","Letón","Lingala","Lituano","Luba-Katanga","Luxemburgués",
  "Macedonio","Malabar/Malayalam","Malayo","Malgache","Maltés","Maorí","Maratí","Mari","Moldavo",
  "Mongol","Náhuatl","Nepalés","Noruego Bokmål","Noruego Nynorsk","Occitano","Oriya","Osetio",
  "Pashto","Persa/Farsi","Polaco","Portugués","Punjabi","Quechua","Rumano","Ruso","Samoano",
  "Sango","Serbio","Shona","Sindhi","Somalí","Soto del Sur","Suajili/Swahili","Sueco","Sundanés",
  "Tailandés","Tamil","Tártaro","Tayiko","Telugu","Tibetano","Tigriña","Tongano","Tsuana",
  "Turco","Turcomano","Ucraniano","Uigur","Urdu","Uzbeko","Vietnamita","Volapük","Wolof",
  "Xhosa","Yakuto","Yiddish","Yoruba","Zhuang","Zulú",
  "Afrikaans","Albanian","Amharic","Arabic","Armenian","Azerbaijani","Basque","Belarusian",
  "Bengali","Bosnian","Bulgarian","Burmese","Catalan","Chinese (Mandarin)","Chinese (Cantonese)",
  "Croatian","Czech","Danish","Dutch","English","Estonian","Filipino","Finnish","French",
  "Georgian","German","Greek","Gujarati","Hausa","Hebrew","Hindi","Hungarian","Indonesian",
  "Irish","Italian","Japanese","Javanese","Kannada","Kazakh","Khmer","Korean","Kurdish",
  "Kyrgyz","Lao","Latin","Latvian","Lithuanian","Macedonian","Malay","Malayalam","Maltese",
  "Maori","Marathi","Mongolian","Nepali","Norwegian","Pashto","Persian","Polish","Portuguese",
  "Punjabi","Romanian","Russian","Serbian","Sinhalese","Slovak","Slovenian","Somali","Spanish",
  "Swahili","Swedish","Tajik","Tamil","Telugu","Thai","Tibetan","Turkish","Turkmen","Ukrainian",
  "Urdu","Uzbek","Vietnamese","Welsh","Xhosa","Yiddish","Yoruba","Zulu"
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b, 'es'));

const MEDIA_ACTIVITIES = [
  { value: "Freeflow Listening", label: "Freeflow Listening", manualTime: false },
  { value: "Freeflow Reading w/ Audio", label: "Freeflow Reading w/ Audio", manualTime: false },
  { value: "Interactive Listening", label: "Interactive Listening", manualTime: true },
  { value: "Interactive Reading w/ Audio", label: "Interactive Reading w/ Audio", manualTime: true },
  { value: "Sentence Mining (Read+Listen)", label: "Sentence Mining (Read+Listen)", manualTime: true },
  { value: "Half-attention Listening", label: "Half-attention Listening", manualTime: false },
  { value: "Intensive Listening", label: "Intensive Listening", manualTime: true },
  { value: "Listen Looping", label: "Listen Looping", manualTime: false },
  { value: "Subvocal Shadowing", label: "Subvocal Shadowing", manualTime: false },
  { value: "Shadowing", label: "Shadowing", manualTime: false },
  { value: "Chorusing", label: "Chorusing", manualTime: false },
  { value: "Otra", label: "Otra", manualTime: false },
];
const SHOW_ACTIVITIES = MEDIA_ACTIVITIES;
