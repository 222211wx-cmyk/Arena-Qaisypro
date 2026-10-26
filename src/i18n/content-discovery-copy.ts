import type { Lang } from "@/contexts/LangContext";

type Copy = Record<string, string>;
type SupportedLocale = Lang;

const en = {
  all: "ALL", sport: "Sport", tech: "Tech", science: "Science", music: "Music", business: "Business", art: "Art", education: "Education", cinema: "Cinema", general: "General",
  loading: "Loading...", live: "LIVE", today: "Today", tomorrow: "Tomorrow", ended: "Ended", days: "{count} days",
  signIn: "Sign in", joinEmpire: "Join the Empire", complete: "Complete +XP", completed: "✓ Completed", loginEarn: "Login to Earn",
  empireIntelligence: "Empire intelligence division", fortressIntro: "Six autonomous guardians are active. Their challenges rotate automatically after every Fortress update.",
  fortressLogin: "Sign in to meet the six autonomous Empire bots and receive your challenges.",
  neuralTitle: "NEURAL CORE", neuralSub: "AUTONOMOUS SELF-EVOLVING INTELLIGENCE BACKBONE", online: "ONLINE — LEARNING", initializing: "INITIALIZING...",
  intelligence: "INTELLIGENCE SCORE", memories: "MEMORIES", patterns: "PATTERNS", evolutions: "EVOLUTIONS", memoryDomain: "MEMORY BY DOMAIN",
  neuralTerminal: "⬡ NEURAL QUERY TERMINAL", queryPlaceholder: "Query the neural core in any language...", ask: "ASK", response: "⬡ ENC RESPONSE",
  noResponse: "No response", unreachable: "Neural core unreachable", lastEvolution: "🧬 LAST EVOLUTION — CYCLE #{count}", activePatterns: "🔮 ACTIVE PATTERNS", memoryStream: "📥 LIVE MEMORY STREAM", connecting: "Connecting to Neural Core...",
  genomeSub: "SELF-SUFFICIENT · SELF-GENERATING · SELF-EVOLVING · ETERNAL", generation: "GENERATION", fitness: "FITNESS", diversity: "DIVERSITY", citizens: "CITIZENS",
  empireDna: "🧬 EMPIRE DNA", selfGenerated: "💡 SELF-GENERATED", crossovers: "🔀 CROSSOVERS", dnaRegistry: "👤 DNA REGISTRY", dominantTrait: "DOMINANT TRAIT", fitnessScore: "EMPIRE FITNESS SCORE",
  encodeGenome: "Encoding empire genome...", encodeCitizens: "DNA encoding citizens...", generating: "Genome engine generating first content cycle...", crossoverRunning: "First crossover cycle running...",
  newsTrust: "TRUSTED INTEL. NO NOISE.", readStory: "READ STORY", noIntel: "No intel found", differentChannel: "Try selecting a different frequency channel.", liveTicker: "LIVE: Tournament brackets updated • Bitcoin ETF volume surges • New Web3 game launches • Arena Qaisypro Season 2 announced • Epic Games $50M Fund •",
  learnTitle: "LEARN & ASCEND", storiesTitle: "STORIES & VOICES", eventsTitle: "GLOBAL EVENTS", celebrationsTitle: "CELEBRATIONS PROTOCOL",
  past: "PAST", present: "PRESENT", future: "FUTURE", nostalgia: "NOSTALGIA GREEN", communication: "COMMUNICATION", globalEvents: "GLOBAL EVENTS", topLegends: "Top 10 Legends of All Time", pulseFeed: "Empire Pulse — Live Feed", upcomingEvents: "Upcoming International Events", noPosts: "No posts yet — be the first.", liveNow: "LIVE NOW", noCourses: "No courses in this domain yet.",
  overallScore: "OVERALL SCORE", highPriority: "HIGH PRIORITY", generatingMissions: "AI is generating your daily missions…",
  storyPlaceholder: "Share a moment, insight, or tribute... the Empire is listening", storyMediaPlaceholder: "YouTube URL (e.g. https://youtube.com/watch?v=...)", noUpcomingEvents: "No upcoming events in this domain.", celebrationMediaPlaceholder: "YouTube URL for video/art presentation...",
} satisfies Copy;
type ContentDictionary = { [K in keyof typeof en]: string };

const fr: ContentDictionary = {
  all:"TOUT", sport:"Sport", tech:"Technologie", science:"Science", music:"Musique", business:"Affaires", art:"Art", education:"Éducation", cinema:"Cinéma", general:"Général",
  loading:"Chargement...", live:"EN DIRECT", today:"Aujourd’hui", tomorrow:"Demain", ended:"Terminé", days:"{count} jours",
  signIn:"Se connecter", joinEmpire:"Rejoindre l’Empire", complete:"Terminer +XP", completed:"✓ Terminé", loginEarn:"Connectez-vous pour gagner",
  empireIntelligence:"Division d’intelligence de l’Empire", fortressIntro:"Six gardiens autonomes sont actifs. Leurs défis tournent automatiquement après chaque mise à jour de la Forteresse.", fortressLogin:"Connectez-vous pour rencontrer les six bots autonomes de l’Empire et recevoir vos défis.",
  neuralTitle:"CŒUR NEURONAL", neuralSub:"INFRASTRUCTURE D’INTELLIGENCE AUTONOME AUTO-ÉVOLUTIVE", online:"EN LIGNE — APPRENTISSAGE", initializing:"INITIALISATION...", intelligence:"SCORE D’INTELLIGENCE", memories:"MÉMOIRES", patterns:"MOTIFS", evolutions:"ÉVOLUTIONS", memoryDomain:"MÉMOIRE PAR DOMAINE",
  neuralTerminal:"⬡ TERMINAL DE REQUÊTE NEURONALE", queryPlaceholder:"Interrogez le cœur neuronal dans n’importe quelle langue...", ask:"DEMANDER", response:"⬡ RÉPONSE ENC", noResponse:"Aucune réponse", unreachable:"Cœur neuronal inaccessible", lastEvolution:"🧬 DERNIÈRE ÉVOLUTION — CYCLE Nº {count}", activePatterns:"🔮 MOTIFS ACTIFS", memoryStream:"📥 FLUX DE MÉMOIRE EN DIRECT", connecting:"Connexion au cœur neuronal...",
  genomeSub:"AUTOSUFFISANT · AUTOGÉNÉRÉ · AUTO-ÉVOLUTIF · ÉTERNEL", generation:"GÉNÉRATION", fitness:"APTITUDE", diversity:"DIVERSITÉ", citizens:"CITOYENS", empireDna:"🧬 ADN DE L’EMPIRE", selfGenerated:"💡 AUTOGÉNÉRÉ", crossovers:"🔀 CROISEMENTS", dnaRegistry:"👤 REGISTRE ADN", dominantTrait:"TRAIT DOMINANT", fitnessScore:"SCORE D’APTITUDE DE L’EMPIRE",
  encodeGenome:"Encodage du génome de l’Empire...", encodeCitizens:"Encodage ADN des citoyens...", generating:"Le moteur génomique génère le premier cycle...", crossoverRunning:"Premier cycle de croisement en cours...",
  newsTrust:"INTELLIGENCE FIABLE. SANS BRUIT.", readStory:"LIRE L’HISTOIRE", noIntel:"Aucune information trouvée", differentChannel:"Essayez un autre canal.", liveTicker:"EN DIRECT : tableaux du tournoi actualisés • Le volume de l’ETF Bitcoin bondit • Lancement d’un nouveau jeu Web3 • Saison 2 d’Arena Qaisypro annoncée • Fonds Epic Games de 50 M$ •",
  learnTitle:"APPRENDRE & S’ÉLEVER", storiesTitle:"HISTOIRES & VOIX", eventsTitle:"ÉVÉNEMENTS MONDIAUX", celebrationsTitle:"PROTOCOLE DES CÉLÉBRATIONS",
  past:"PASSÉ", present:"PRÉSENT", future:"FUTUR", nostalgia:"NOSTALGIE VERTE", communication:"COMMUNICATION", globalEvents:"ÉVÉNEMENTS MONDIAUX", topLegends:"Top 10 des légendes de tous les temps", pulseFeed:"Empire Pulse — flux en direct", upcomingEvents:"Événements internationaux à venir", noPosts:"Pas encore de publications — soyez le premier.", liveNow:"EN DIRECT", noCourses:"Aucun cours dans ce domaine pour le moment.",
  overallScore:"SCORE GLOBAL", highPriority:"HAUTE PRIORITÉ", generatingMissions:"L’IA génère vos missions quotidiennes…",
  storyPlaceholder:"Partagez un moment, une réflexion ou un hommage... l’Empire vous écoute", storyMediaPlaceholder:"URL YouTube (ex. https://youtube.com/watch?v=...)", noUpcomingEvents:"Aucun événement à venir dans ce domaine.", celebrationMediaPlaceholder:"URL YouTube de la présentation vidéo/artistique...",
};

const ar: ContentDictionary = {
  all:"الكل", sport:"الرياضة", tech:"التقنية", science:"العلوم", music:"الموسيقى", business:"الأعمال", art:"الفن", education:"التعليم", cinema:"السينما", general:"عام",
  loading:"جارٍ التحميل...", live:"مباشر", today:"اليوم", tomorrow:"غدًا", ended:"انتهى", days:"{count} أيام",
  signIn:"تسجيل الدخول", joinEmpire:"انضم إلى الإمبراطورية", complete:"إكمال +XP", completed:"✓ مكتمل", loginEarn:"سجّل الدخول للكسب",
  empireIntelligence:"قسم استخبارات الإمبراطورية", fortressIntro:"ستة حراس مستقلين نشطون. تتغير تحدياتهم تلقائيًا بعد كل تحديث للقلعة.", fortressLogin:"سجّل الدخول لمقابلة روبوتات الإمبراطورية الستة المستقلة وتلقي تحدياتك.",
  neuralTitle:"النواة العصبية", neuralSub:"بنية ذكاء مستقلة ذاتية التطور", online:"متصل — يتعلم", initializing:"جارٍ التهيئة...", intelligence:"درجة الذكاء", memories:"الذكريات", patterns:"الأنماط", evolutions:"التطورات", memoryDomain:"الذاكرة حسب المجال",
  neuralTerminal:"⬡ محطة الاستعلام العصبي", queryPlaceholder:"اسأل النواة العصبية بأي لغة...", ask:"اسأل", response:"⬡ استجابة ENC", noResponse:"لا توجد استجابة", unreachable:"تعذر الوصول إلى النواة العصبية", lastEvolution:"🧬 آخر تطور — الدورة رقم {count}", activePatterns:"🔮 الأنماط النشطة", memoryStream:"📥 تدفق الذاكرة المباشر", connecting:"جارٍ الاتصال بالنواة العصبية...",
  genomeSub:"مكتفٍ ذاتيًا · ذاتي التوليد · ذاتي التطور · أبدي", generation:"الجيل", fitness:"الكفاءة", diversity:"التنوع", citizens:"المواطنون", empireDna:"🧬 الحمض النووي للإمبراطورية", selfGenerated:"💡 مولّد ذاتيًا", crossovers:"🔀 عمليات التهجين", dnaRegistry:"👤 سجل الحمض النووي", dominantTrait:"السمة السائدة", fitnessScore:"درجة كفاءة الإمبراطورية",
  encodeGenome:"جارٍ ترميز جينوم الإمبراطورية...", encodeCitizens:"جارٍ ترميز DNA المواطنين...", generating:"محرك الجينوم يولّد دورة المحتوى الأولى...", crossoverRunning:"دورة التهجين الأولى قيد التشغيل...",
  newsTrust:"معلومات موثوقة. بلا ضجيج.", readStory:"اقرأ القصة", noIntel:"لم يتم العثور على معلومات", differentChannel:"جرّب اختيار قناة مختلفة.", liveTicker:"مباشر: تحديث جداول البطولة • ارتفاع حجم صندوق بيتكوين المتداول • إطلاق لعبة Web3 جديدة • الإعلان عن الموسم الثاني من Arena Qaisypro • صندوق Epic Games بقيمة 50 مليون دولار •",
  learnTitle:"تعلّم وارتقِ", storiesTitle:"قصص وأصوات", eventsTitle:"أحداث عالمية", celebrationsTitle:"بروتوكول الاحتفالات",
  past:"الماضي", present:"الحاضر", future:"المستقبل", nostalgia:"الحنين الأخضر", communication:"التواصل", globalEvents:"الأحداث العالمية", topLegends:"أفضل 10 أساطير على الإطلاق", pulseFeed:"نبض الإمبراطورية — بث مباشر", upcomingEvents:"الأحداث الدولية القادمة", noPosts:"لا توجد منشورات بعد — كن الأول.", liveNow:"مباشر الآن", noCourses:"لا توجد دورات في هذا المجال بعد.",
  overallScore:"النتيجة الإجمالية", highPriority:"أولوية قصوى", generatingMissions:"يولّد الذكاء الاصطناعي مهامك اليومية…",
  storyPlaceholder:"شارك لحظة أو فكرة أو تكريمًا... الإمبراطورية تستمع", storyMediaPlaceholder:"رابط YouTube (مثال: https://youtube.com/watch?v=...)", noUpcomingEvents:"لا توجد أحداث قادمة في هذا المجال.", celebrationMediaPlaceholder:"رابط YouTube لعرض الفيديو أو العمل الفني...",
};

const es: ContentDictionary = {
  all:"Todo", sport:"Deporte", tech:"Tecnología", science:"Ciencia", music:"Música", business:"Negocios", art:"Arte", education:"Educación", cinema:"Cine", general:"General",
  loading:"Cargando...", live:"EN VIVO", today:"Hoy", tomorrow:"Mañana", ended:"Finalizado", days:"{count} días",
  signIn:"Iniciar sesión", joinEmpire:"Únete al Imperio", complete:"Completar +XP", completed:"✓ Completado", loginEarn:"Inicia sesión para ganar",
  empireIntelligence:"División de inteligencia del Imperio", fortressIntro:"Seis guardianes autónomos están activos. Sus desafíos rotan automáticamente tras cada actualización de la Fortaleza.", fortressLogin:"Inicia sesión para conocer los seis bots autónomos del Imperio y recibir tus desafíos.",
  neuralTitle:"NÚCLEO NEURONAL", neuralSub:"COLUMNA VERTEBRAL DE INTELIGENCIA AUTÓNOMA AUTOEVOLUTIVA", online:"EN LÍNEA — APRENDIENDO", initializing:"INICIALIZANDO...", intelligence:"PUNTUACIÓN DE INTELIGENCIA", memories:"MEMORIAS", patterns:"PATRONES", evolutions:"EVOLUCIONES", memoryDomain:"MEMORIA POR DOMINIO",
  neuralTerminal:"⬡ TERMINAL DE CONSULTA NEURONAL", queryPlaceholder:"Consulta el núcleo neuronal en cualquier idioma...", ask:"PREGUNTAR", response:"⬡ RESPUESTA ENC", noResponse:"Sin respuesta", unreachable:"Núcleo neuronal inalcanzable", lastEvolution:"🧬 ÚLTIMA EVOLUCIÓN — CICLO N.º {count}", activePatterns:"🔮 PATRONES ACTIVOS", memoryStream:"📥 FLUJO DE MEMORIA EN VIVO", connecting:"Conectando con el núcleo neuronal...",
  genomeSub:"AUTOSUFICIENTE · AUTOGENERADO · AUTOEVOLUTIVO · ETERNO", generation:"GENERACIÓN", fitness:"APTITUD", diversity:"DIVERSIDAD", citizens:"CIUDADANOS", empireDna:"🧬 ADN DEL IMPERIO", selfGenerated:"💡 AUTOGENERADO", crossovers:"🔀 CRUCES", dnaRegistry:"👤 REGISTRO DE ADN", dominantTrait:"RASGO DOMINANTE", fitnessScore:"PUNTUACIÓN DE APTITUD DEL IMPERIO",
  encodeGenome:"Codificando el genoma del Imperio...", encodeCitizens:"Codificando ADN de ciudadanos...", generating:"El motor genómico genera el primer ciclo...", crossoverRunning:"Primer ciclo de cruce en marcha...",
  newsTrust:"INTELIGENCIA FIABLE. SIN RUIDO.", readStory:"LEER HISTORIA", noIntel:"No se encontró información", differentChannel:"Prueba otro canal.", liveTicker:"EN VIVO: Cuadros del torneo actualizados • Aumenta el volumen del ETF de Bitcoin • Se lanza un nuevo juego Web3 • Anunciada la temporada 2 de Arena Qaisypro • Fondo de Epic Games de 50 M$ •",
  learnTitle:"APRENDE Y ASCIENDE", storiesTitle:"HISTORIAS Y VOCES", eventsTitle:"EVENTOS GLOBALES", celebrationsTitle:"PROTOCOLO DE CELEBRACIONES",
  past:"PASADO", present:"PRESENTE", future:"FUTURO", nostalgia:"NOSTALGIA VERDE", communication:"COMUNICACIÓN", globalEvents:"EVENTOS GLOBALES", topLegends:"Las 10 mejores leyendas de todos los tiempos", pulseFeed:"Empire Pulse — transmisión en vivo", upcomingEvents:"Próximos eventos internacionales", noPosts:"Aún no hay publicaciones — sé el primero.", liveNow:"EN VIVO AHORA", noCourses:"Aún no hay cursos en este dominio.",
  overallScore:"PUNTUACIÓN GLOBAL", highPriority:"ALTA PRIORIDAD", generatingMissions:"La IA está generando tus misiones diarias…",
  storyPlaceholder:"Comparte un momento, una reflexión o un homenaje... el Imperio escucha", storyMediaPlaceholder:"URL de YouTube (p. ej. https://youtube.com/watch?v=...)", noUpcomingEvents:"No hay próximos eventos en este dominio.", celebrationMediaPlaceholder:"URL de YouTube para la presentación de vídeo/arte...",
};

const de: ContentDictionary = {
  all:"ALLE", sport:"Sport", tech:"Technologie", science:"Wissenschaft", music:"Musik", business:"Wirtschaft", art:"Kunst", education:"Bildung", cinema:"Kino", general:"Allgemein",
  loading:"Wird geladen…", live:"LIVE", today:"Heute", tomorrow:"Morgen", ended:"Beendet", days:"{count} Tage",
  signIn:"Anmelden", joinEmpire:"Dem Imperium beitreten", complete:"Abschließen +XP", completed:"✓ Abgeschlossen", loginEarn:"Zum Verdienen anmelden",
  empireIntelligence:"Nachrichtendienst des Imperiums", fortressIntro:"Sechs autonome Wächter sind aktiv. Ihre Herausforderungen wechseln nach jeder Aktualisierung der Fortress automatisch.", fortressLogin:"Melde dich an, um den sechs autonomen Bots des Imperiums zu begegnen und deine Herausforderungen zu erhalten.",
  neuralTitle:"NEURALER KERN", neuralSub:"AUTONOMES, SELBSTLERNENDES INTELLIGENZ-RÜCKGRAT", online:"ONLINE — LERNT", initializing:"INITIALISIERUNG…", intelligence:"INTELLIGENZWERT", memories:"ERINNERUNGEN", patterns:"MUSTER", evolutions:"EVOLUTIONEN", memoryDomain:"ERINNERUNGEN NACH BEREICH",
  neuralTerminal:"⬡ NEURALES ABFRAGETERMINAL", queryPlaceholder:"Frage den neuralen Kern in einer beliebigen Sprache…", ask:"FRAGEN", response:"⬡ ENC-ANTWORT", noResponse:"Keine Antwort", unreachable:"Neuraler Kern nicht erreichbar", lastEvolution:"🧬 LETZTE EVOLUTION — ZYKLUS #{count}", activePatterns:"🔮 AKTIVE MUSTER", memoryStream:"📥 LIVE-ERINNERUNGSSTROM", connecting:"Verbindung zum neuralen Kern wird hergestellt…",
  genomeSub:"AUTARK · SELBSTERZEUGEND · SELBSTEVOLVIEREND · EWIG", generation:"GENERATION", fitness:"FITNESS", diversity:"VIELFALT", citizens:"BÜRGER", empireDna:"🧬 DNA DES IMPERIUMS", selfGenerated:"💡 SELBSTERZEUGT", crossovers:"🔀 KREUZUNGEN", dnaRegistry:"👤 DNA-REGISTER", dominantTrait:"DOMINANTES MERKMAL", fitnessScore:"FITNESSWERT DES IMPERIUMS",
  encodeGenome:"Genom des Imperiums wird codiert…", encodeCitizens:"DNA der Bürger wird codiert…", generating:"Die Genom-Engine erzeugt den ersten Inhaltszyklus…", crossoverRunning:"Der erste Kreuzungszyklus läuft…",
  newsTrust:"VERTRAUENSWÜRDIGE INFORMATIONEN. KEIN RAUSCHEN.", readStory:"BEITRAG LESEN", noIntel:"Keine Informationen gefunden", differentChannel:"Versuche einen anderen Frequenzkanal.", liveTicker:"LIVE: Turnierpläne aktualisiert • Bitcoin-ETF-Volumen steigt stark • Neues Web3-Spiel startet • Arena Qaisypro Saison 2 angekündigt • Epic Games Fonds über 50 Mio. $ •",
  learnTitle:"LERNEN & AUFSTEIGEN", storiesTitle:"GESCHICHTEN & STIMMEN", eventsTitle:"GLOBALE VERANSTALTUNGEN", celebrationsTitle:"FEIERPROTOKOLL",
  past:"VERGANGENHEIT", present:"GEGENWART", future:"ZUKUNFT", nostalgia:"GRÜNE NOSTALGIE", communication:"KOMMUNIKATION", globalEvents:"GLOBALE VERANSTALTUNGEN", topLegends:"Top 10 der größten Legenden", pulseFeed:"Empire Pulse — Live-Feed", upcomingEvents:"Bevorstehende internationale Veranstaltungen", noPosts:"Noch keine Beiträge — sei der Erste.", liveNow:"JETZT LIVE", noCourses:"In diesem Bereich gibt es noch keine Kurse.",
  overallScore:"GESAMTWERTUNG", highPriority:"HOHE PRIORITÄT", generatingMissions:"Die KI erstellt deine täglichen Missionen…",
  storyPlaceholder:"Teile einen Moment, einen Gedanken oder eine Würdigung… das Imperium hört zu", storyMediaPlaceholder:"YouTube-URL (z. B. https://youtube.com/watch?v=…)", noUpcomingEvents:"In diesem Bereich stehen keine Veranstaltungen bevor.", celebrationMediaPlaceholder:"YouTube-URL für die Video-/Kunstpräsentation…",
};

export const CONTENT_DISCOVERY_COPY: Record<SupportedLocale, ContentDictionary> = { en, fr, ar, es, de };
const CONTENT_LOCALE: Record<Lang, SupportedLocale> = { en:"en", fr:"fr", ar:"ar", es:"es", de:"de" };

export function contentCopy(lang: Lang, key: keyof typeof en, values?: Record<string, string | number>) {
  let text = CONTENT_DISCOVERY_COPY[CONTENT_LOCALE[lang]][key];
  for (const [name, value] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(value));
  return text;
}