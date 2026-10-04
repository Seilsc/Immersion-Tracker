const ISO_TO_NAMES = {
  "ab": ["Abkhazo"], "aa": ["Afar"], "af": ["Afrikaans"], "ak": ["Akan"],
  "sq": ["Albanés", "Albanian"], "de": ["Alemán", "German"], "am": ["Amhárico", "Amharic"],
  "ar": ["Árabe", "Arabic"], "an": ["Aragonés"], "hy": ["Armenio", "Armenian"],
  "as": ["Assamés"], "av": ["Avar"], "ay": ["Aymara"], "az": ["Azerbaiyano", "Azerbaijani"],
  "bm": ["Bambara"], "ba": ["Bashkir"], "eu": ["Bascongado/Euskera", "Basque"],
  "be": ["Bielorruso", "Belarusian"], "bn": ["Bengalí", "Bengali"],
  "my": ["Birmano", "Burmese"], "bi": ["Bislama"], "bs": ["Bosnio", "Bosnian"],
  "br": ["Bretón"], "bg": ["Búlgaro", "Bulgarian"], "ca": ["Catalán", "Catalan"],
  "ch": ["Chamorro"], "ce": ["Checheno"], "ny": ["Chichewa"],
  "zh": ["Chino (Mandarín)", "Chinese (Mandarin)"],
  "yue": ["Chino (Cantonés)", "Chinese (Cantonese)"],
  "cv": ["Chuvash"], "si": ["Cingalés", "Sinhalese"], "kw": ["Córnico"],
  "co": ["Corso"], "hr": ["Croata", "Croatian"], "cs": ["Checo", "Czech"],
  "da": ["Danés", "Danish"], "dz": ["Dzongkha"], "sk": ["Eslovaco", "Slovak"],
  "sl": ["Esloveno", "Slovenian"], "es": ["Español", "Spanish"],
  "eo": ["Esperanto"], "et": ["Estonio", "Estonian"],
  "fo": ["Feroés"], "fj": ["Fiyiano"], "tl": ["Filipino/Tagalo", "Filipino"],
  "fi": ["Finlandés", "Finnish"], "fr": ["Francés", "French"],
  "frr": ["Frisón del Norte"], "ff": ["Fula"],
  "gd": ["Gaélico Escocés"], "cy": ["Galés", "Welsh"], "gl": ["Gallego"],
  "ka": ["Georgiano", "Georgian"], "el": ["Griego", "Greek"],
  "gn": ["Guaraní"], "gu": ["Gujarati"], "ha": ["Hausa"],
  "haw": ["Hawaiano"], "he": ["Hebreo", "Hebrew"], "hi": ["Hindú/Hindi", "Hindi"],
  "hmn": ["Hmong"], "hu": ["Húngaro", "Hungarian"], "ig": ["Igbo"],
  "id": ["Indonesio", "Indonesian"], "en": ["Inglés", "English"],
  "iu": ["Inuktitut"], "ga": ["Irlandés", "Irish"], "is": ["Islandés", "Icelandic"],
  "it": ["Italiano", "Italian"], "ja": ["Japonés", "Japanese"],
  "jv": ["Javanés", "Javanese"], "km": ["Jemer/Camboyano", "Khmer"],
  "kk": ["Kazajo", "Kazakh"], "rw": ["Kinyarwanda"],
  "ky": ["Kirguís", "Kyrgyz"], "kv": ["Komi"],
  "ko": ["Coreano", "Korean"], "ku": ["Kurdo", "Kurdish"],
  "lo": ["Laosiano", "Lao"], "la": ["Latín", "Latin"],
  "lv": ["Letón", "Latvian"], "ln": ["Lingala"],
  "lt": ["Lituano", "Lithuanian"], "lu": ["Luba-Katanga"],
  "lb": ["Luxemburgués"], "mk": ["Macedonio", "Macedonian"],
  "ml": ["Malabar/Malayalam", "Malayalam"], "ms": ["Malayo", "Malay"],
  "mg": ["Malgache"], "mt": ["Maltés", "Maltese"], "mi": ["Maorí", "Maori"],
  "mr": ["Maratí", "Marathi"], "mhr": ["Mari"], "ro": ["Rumano", "Romanian"],
  "mn": ["Mongol", "Mongolian"], "nah": ["Náhuatl"],
  "ne": ["Nepalés", "Nepali"], "nl": ["Holandés", "Dutch"],
  "nb": ["Noruego Bokmål", "Norwegian"], "nn": ["Noruego Nynorsk", "Norwegian"],
  "oc": ["Occitano"], "or": ["Oriya"], "os": ["Osetio"],
  "ps": ["Pashto"], "fa": ["Persa/Farsi", "Persian"], "pl": ["Polaco", "Polish"],
  "pt": ["Portugués", "Portuguese"], "pa": ["Punjabi"], "qu": ["Quechua"],
  "ru": ["Ruso", "Russian"], "sm": ["Samoano"], "sg": ["Sango"],
  "sr": ["Serbio", "Serbian"], "sn": ["Shona"], "sd": ["Sindhi"],
  "so": ["Somalí", "Somali"], "st": ["Soto del Sur"],
  "sw": ["Suajili/Swahili", "Swahili"], "sv": ["Sueco", "Swedish"],
  "su": ["Sundanés"], "th": ["Tailandés", "Thai"], "ta": ["Tamil"],
  "tt": ["Tártaro"], "tg": ["Tayiko", "Tajik"], "te": ["Telugu"],
  "bo": ["Tibetano", "Tibetan"], "ti": ["Tigriña"], "to": ["Tongano"],
  "tn": ["Tsuana"], "tr": ["Turco", "Turkish"], "tk": ["Turcomano", "Turkmen"],
  "uk": ["Ucraniano", "Ukrainian"], "ug": ["Uigur"], "ur": ["Urdu"],
  "uz": ["Uzbeko", "Uzbek"], "vi": ["Vietnamita", "Vietnamese"],
  "vo": ["Volapük"], "wo": ["Wolof"], "xh": ["Xhosa"],
  "sah": ["Yakuto"], "yi": ["Yiddish"], "yo": ["Yoruba"],
  "za": ["Zhuang"], "zu": ["Zulú", "Zulu"]
};

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function isoToLangNames(isoCode) {
  return ISO_TO_NAMES[isoCode] || [];
}

function isoToPrimaryName(isoCode) {
  const names = ISO_TO_NAMES[isoCode];
  return names ? names[0] : null;
}

function langNameToIso(name) {
  const n = normalize(name);
  for (const [iso, names] of Object.entries(ISO_TO_NAMES)) {
    if (names.some(alias => normalize(alias) === n)) return iso;
  }
  return null;
}

function isTrackedLanguage(isoCode, trackedLanguages) {
  const names = isoToLangNames(isoCode);
  if (names.length === 0) return null;
  const normalizedNames = names.map(normalize);
  for (const tl of trackedLanguages) {
    const ntl = normalize(tl);
    if (normalizedNames.includes(ntl)) return names[0];
  }
  return null;
}
