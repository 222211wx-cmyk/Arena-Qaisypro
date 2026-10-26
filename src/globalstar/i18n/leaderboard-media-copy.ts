export interface LeaderboardMediaCopy {
  locale: string;
  leaderboard: {
    title: string;
    subtitle: string;
    all: string;
    categories: Record<string, string>;
    categoryTabs: string;
    loading: string;
    empty: string;
    emptyHint: string;
    results: (count: string) => string;
    uploads: (count: string) => string;
    views: string;
    earnings: string;
    rank: (rank: string) => string;
    entry: (name: string, rank: string) => string;
  };
  media: {
    brand: string;
    categories: Record<string, string>;
    dialog: string;
    close: string;
    video: string;
    audio: string;
    playVideo: string;
    playAudio: string;
    loading: string;
    source: string;
    unavailable: string;
    reupload: string;
    playing: string;
    downloadVideo: string;
    downloadAudio: string;
    download: string;
    views: (count: string) => string;
    earnings: (amount: string) => string;
    player: (title: string) => string;
  };
}

const en: LeaderboardMediaCopy = {
  locale: "en-US",
  leaderboard: {
    title: "Leaders’ Honor",
    subtitle: "Sovereign creator leaderboard",
    all: "All",
    categories: { sport: "Sports", press: "Press", art: "Arts", knowledge: "Knowledge" },
    categoryTabs: "Leaderboard categories",
    loading: "Loading leaderboard…",
    empty: "There is no content in this category yet.",
    emptyHint: "Upload the first item and claim first place!",
    results: count => `${count} leaderboard results`,
    uploads: count => `${count} uploads`,
    views: "Views",
    earnings: "Gold-coin earnings",
    rank: rank => `Rank ${rank}`,
    entry: (name, rank) => `${name}, rank ${rank}`,
  },
  media: {
    brand: "EMPIRE ETERNAL",
    categories: { sport: "Sports", press: "Press", art: "Arts", knowledge: "Knowledge" },
    dialog: "Media details",
    close: "Close media details",
    video: "Video",
    audio: "Audio",
    playVideo: "Play video",
    playAudio: "Play audio",
    loading: "Loading media…",
    source: "From GDNA servers",
    unavailable: "This media file is currently unavailable.",
    reupload: "The owner can upload it again from the Empire library.",
    playing: "Now playing",
    downloadVideo: "Download video · MP4",
    downloadAudio: "Download audio · MP3",
    download: "Download media",
    views: count => `${count} views`,
    earnings: amount => `${amount} gold coins`,
    player: title => `Media player for ${title}`,
  },
};

const fr: LeaderboardMediaCopy = {
  locale: "fr-FR",
  leaderboard: {
    title: "Honneur des chefs",
    subtitle: "Classement des créateurs souverains",
    all: "Tout",
    categories: { sport: "Sports", press: "Presse", art: "Arts", knowledge: "Savoirs" },
    categoryTabs: "Catégories du classement",
    loading: "Chargement du classement…",
    empty: "Il n’y a encore aucun contenu dans cette catégorie.",
    emptyHint: "Publiez le premier contenu et prenez la première place !",
    results: count => `${count} résultats dans le classement`,
    uploads: count => `${count} publications`,
    views: "Vues",
    earnings: "Gains en pièces d’or",
    rank: rank => `Rang ${rank}`,
    entry: (name, rank) => `${name}, rang ${rank}`,
  },
  media: {
    brand: "EMPIRE ETERNAL",
    categories: { sport: "Sports", press: "Presse", art: "Arts", knowledge: "Savoirs" },
    dialog: "Détails du média",
    close: "Fermer les détails du média",
    video: "Vidéo",
    audio: "Audio",
    playVideo: "Lire la vidéo",
    playAudio: "Lire l’audio",
    loading: "Chargement du média…",
    source: "Depuis les serveurs GDNA",
    unavailable: "Ce fichier multimédia est actuellement indisponible.",
    reupload: "Son propriétaire peut le téléverser à nouveau depuis la bibliothèque de l’Empire.",
    playing: "Lecture en cours",
    downloadVideo: "Télécharger la vidéo · MP4",
    downloadAudio: "Télécharger l’audio · MP3",
    download: "Télécharger le média",
    views: count => `${count} vues`,
    earnings: amount => `${amount} pièces d’or`,
    player: title => `Lecteur multimédia pour ${title}`,
  },
};

const ar: LeaderboardMediaCopy = {
  locale: "ar-MA",
  leaderboard: {
    title: "شرف القادة",
    subtitle: "لوحة صانعي المحتوى السيادي",
    all: "الكل",
    categories: { sport: "الرياضة", press: "الصحافة", art: "الفن", knowledge: "المعرفة" },
    categoryTabs: "تصنيفات لوحة القادة",
    loading: "جارٍ تحميل لوحة القادة…",
    empty: "لا يوجد محتوى في هذا التصنيف بعد.",
    emptyHint: "ارفع أول محتوى واحصل على المرتبة الأولى!",
    results: count => `${count} نتيجة في لوحة القادة`,
    uploads: count => `${count} محتوى مرفوع`,
    views: "المشاهدات",
    earnings: "الأرباح بالعملات الذهبية",
    rank: rank => `المرتبة ${rank}`,
    entry: (name, rank) => `${name}، المرتبة ${rank}`,
  },
  media: {
    brand: "EMPIRE ETERNAL",
    categories: { sport: "الرياضة", press: "الصحافة", art: "الفن", knowledge: "المعرفة" },
    dialog: "تفاصيل الوسائط",
    close: "إغلاق تفاصيل الوسائط",
    video: "فيديو",
    audio: "صوت",
    playVideo: "تشغيل الفيديو",
    playAudio: "تشغيل الصوت",
    loading: "جارٍ تحميل الوسائط…",
    source: "من خوادم GDNA",
    unavailable: "ملف الوسائط غير متوفر حالياً.",
    reupload: "يمكن لصاحب الملف إعادة رفعه من مكتبة الإمبراطورية.",
    playing: "قيد التشغيل",
    downloadVideo: "تحميل الفيديو · MP4",
    downloadAudio: "تحميل الصوت · MP3",
    download: "تحميل الوسائط",
    views: count => `${count} مشاهدة`,
    earnings: amount => `${amount} عملة ذهبية`,
    player: title => `مشغل الوسائط للعنوان ${title}`,
  },
};

const es: LeaderboardMediaCopy = {
  locale: "es-ES",
  leaderboard: {
    title: "Honor de los líderes",
    subtitle: "Clasificación de creadores soberanos",
    all: "Todo",
    categories: { sport: "Deportes", press: "Prensa", art: "Artes", knowledge: "Conocimiento" },
    categoryTabs: "Categorías de la clasificación",
    loading: "Cargando la clasificación…",
    empty: "Todavía no hay contenido en esta categoría.",
    emptyHint: "¡Sube el primer contenido y consigue el primer puesto!",
    results: count => `${count} resultados en la clasificación`,
    uploads: count => `${count} contenidos subidos`,
    views: "Visualizaciones",
    earnings: "Ganancias en monedas de oro",
    rank: rank => `Puesto ${rank}`,
    entry: (name, rank) => `${name}, puesto ${rank}`,
  },
  media: {
    brand: "EMPIRE ETERNAL",
    categories: { sport: "Deportes", press: "Prensa", art: "Artes", knowledge: "Conocimiento" },
    dialog: "Detalles del contenido",
    close: "Cerrar los detalles del contenido",
    video: "Vídeo",
    audio: "Audio",
    playVideo: "Reproducir vídeo",
    playAudio: "Reproducir audio",
    loading: "Cargando contenido…",
    source: "Desde los servidores de GDNA",
    unavailable: "Este archivo multimedia no está disponible actualmente.",
    reupload: "La persona propietaria puede volver a subirlo desde la biblioteca del Imperio.",
    playing: "En reproducción",
    downloadVideo: "Descargar vídeo · MP4",
    downloadAudio: "Descargar audio · MP3",
    download: "Descargar contenido",
    views: count => `${count} visualizaciones`,
    earnings: amount => `${amount} monedas de oro`,
    player: title => `Reproductor multimedia de ${title}`,
  },
};

const de: LeaderboardMediaCopy = {
  locale: "de-DE",
  leaderboard: {
    title: "Ehre der Führenden",
    subtitle: "Rangliste souveräner Kreativer",
    all: "Alle",
    categories: { sport: "Sport", press: "Presse", art: "Kunst", knowledge: "Wissen" },
    categoryTabs: "Ranglistenkategorien",
    loading: "Rangliste wird geladen…",
    empty: "In dieser Kategorie gibt es noch keine Inhalte.",
    emptyHint: "Lade den ersten Beitrag hoch und sichere dir Platz eins!",
    results: count => `${count} Ranglistenergebnisse`,
    uploads: count => `${count} Uploads`,
    views: "Aufrufe",
    earnings: "Einnahmen in Goldmünzen",
    rank: rank => `Platz ${rank}`,
    entry: (name, rank) => `${name}, Platz ${rank}`,
  },
  media: {
    brand: "EMPIRE ETERNAL",
    categories: { sport: "Sport", press: "Presse", art: "Kunst", knowledge: "Wissen" },
    dialog: "Mediendetails",
    close: "Mediendetails schließen",
    video: "Video",
    audio: "Audio",
    playVideo: "Video abspielen",
    playAudio: "Audio abspielen",
    loading: "Medien werden geladen…",
    source: "Von GDNA-Servern",
    unavailable: "Diese Mediendatei ist derzeit nicht verfügbar.",
    reupload: "Der Eigentümer kann sie erneut aus der Empire-Bibliothek hochladen.",
    playing: "Wird jetzt wiedergegeben",
    downloadVideo: "Video herunterladen · MP4",
    downloadAudio: "Audio herunterladen · MP3",
    download: "Medium herunterladen",
    views: count => `${count} Aufrufe`,
    earnings: amount => `${amount} Goldmünzen`,
    player: title => `Medienplayer für ${title}`,
  },
};

export function leaderboardMediaCopy(language: string): LeaderboardMediaCopy {
  if (language === "de") return de;
  if (language === "fr") return fr;
  if (language === "ar") return ar;
  if (language === "es") return es;
  return en;
}