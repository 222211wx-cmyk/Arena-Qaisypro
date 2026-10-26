import type { Lang } from "@/contexts/LangContext";

type Localized = Record<Lang, string>;

const localeCodes: Record<Lang, string> = {
  en: "en-US", fr: "fr-FR", ar: "ar", es: "es-ES", de: "de-DE",
};

const copy = {
  newsBrand: ["GDNA NEWS", "GDNA NEWS", "أخبار GDNA", "GDNA NEWS"],
  all: ["All", "Tout", "الكل", "Todo"],
  gaming: ["Gaming", "Jeux vidéo", "الألعاب", "Videojuegos"],
  crypto: ["Crypto", "Crypto", "العملات المشفرة", "Cripto"],
  esports: ["Esports", "Esport", "الرياضات الإلكترونية", "Esports"],
  web3: ["Web3", "Web3", "ويب 3", "Web3"],
  tournaments: ["Tournaments", "Tournois", "البطولات", "Torneos"],
  minRead: ["{n} min read", "{n} min de lecture", "قراءة {n} د", "{n} min de lectura"],
  genetic: ["Genetic", "Génétique", "هندسة", "Genética"],
  digital: ["Digital", "Numérique", "رقمية", "Digital"],
  neural: ["Neural", "Neuronale", "عصبية", "Neuronal"],
  architecture: ["Architecture", "Architecture", "جينية", "Arquitectura"],
  collectiveDna: ["⬡ COLLECTIVE EMPIRE DNA STRING — 64 CHARS", "⬡ CHAÎNE ADN COLLECTIVE DE L’EMPIRE — 64 CARACTÈRES", "⬡ سلسلة الحمض النووي الجماعية للإمبراطورية — 64 محرفاً", "⬡ CADENA DE ADN COLECTIVO DEL IMPERIO — 64 CARACTERES"],
  lastEncoded: ["Last encoded: {date}", "Dernier encodage : {date}", "آخر ترميز: {date}", "Última codificación: {date}"],
  dominantDesc: ["The gene most expressed across all empire memories", "Le gène le plus exprimé dans les mémoires de l’empire", "الجين الأكثر تعبيراً في جميع ذكريات الإمبراطورية", "El gen más expresado en las memorias del imperio"],
  fitnessDesc: ["Calculated from neural memories × citizen count × average XP", "Calculé à partir des mémoires neurales × citoyens × XP moyen", "محسوبة من الذكريات العصبية × عدد المواطنين × متوسط XP", "Calculada con memorias neuronales × ciudadanos × XP medio"],
  generatedNotice: ["⬡ All content below was generated autonomously by the Genome Engine — no human authored any of it. New content is generated every 6 hours, forever.", "⬡ Tout le contenu ci-dessous est généré de façon autonome par le Genome Engine, sans intervention humaine. Du contenu est créé toutes les 6 heures, indéfiniment.", "⬡ أنشأ Genome Engine كل المحتوى أدناه بشكل مستقل ومن دون تأليف بشري. يُنشأ محتوى جديد كل 6 ساعات إلى الأبد.", "⬡ Genome Engine generó de forma autónoma todo el contenido siguiente, sin autoría humana. Se genera contenido nuevo cada 6 horas, para siempre."],
  crossoverNotice: ["⬡ Crossover: two memories combine to breed a new insight, like genetic recombination in biology. This runs automatically every 6 hours.", "⬡ Croisement : deux mémoires se combinent pour créer une nouvelle idée, comme la recombinaison génétique. Exécution automatique toutes les 6 heures.", "⬡ التهجين: تُدمج ذكريان لتوليد فكرة جديدة مثل إعادة التركيب الجيني. تعمل العملية تلقائياً كل 6 ساعات.", "⬡ Cruce: dos memorias se combinan para crear una idea nueva, como la recombinación genética. Se ejecuta cada 6 horas."],
  parent: ["Parent {letter}:", "Parent {letter} :", "الأصل {letter}:", "Progenitor {letter}:"],
  offspring: ["⬡ OFFSPRING:", "⬡ DESCENDANCE :", "⬡ النسل:", "⬡ DESCENDENCIA:"],
  fitnessValue: ["fitness: {n}%", "aptitude : {n} %", "اللياقة: {n}٪", "aptitud: {n}%"],
  generationShort: ["Gen #{n}", "Gén. nº {n}", "الجيل #{n}", "Gen. n.º {n}"],
  action: ["ACTION", "ACTION", "الفعل", "ACCIÓN"],
  victory: ["VICTORY", "VICTOIRE", "النصر", "VICTORIA"],
  growth: ["GROWTH", "CROISSANCE", "النمو", "CRECIMIENTO"],
  abundance: ["ABUNDANCE", "ABONDANCE", "الوفرة", "ABUNDANCIA"],
  social: ["SOCIAL", "SOCIAL", "التواصل", "SOCIAL"],
  sport: ["SPORT", "SPORT", "الرياضة", "DEPORTE"],
  vision: ["VISION", "VISION", "الرؤية", "VISIÓN"],
  sovereignty: ["SOVEREIGNTY", "SOUVERAINETÉ", "السيادة", "SOBERANÍA"],
  empireNeuralCore: ["EMPIRE NEURAL CORE", "CŒUR NEURONAL DE L’EMPIRE", "النواة العصبية للإمبراطورية", "NÚCLEO NEURONAL DEL IMPERIO"],
  max100: ["/ 100 MAX", "/ 100 MAX.", "/ 100 كحد أقصى", "/ 100 MÁX."],
  autonomousFooter: ["● AUTONOMOUS — SELF-EVOLVING — ETERNAL", "● AUTONOME — AUTO-ÉVOLUTIF — ÉTERNEL", "● مستقل — ذاتي التطور — أبدي", "● AUTÓNOMO — AUTOEVOLUTIVO — ETERNO"],
  pressBadge: ["👑 EMPIRE ETERNAL", "👑 EMPIRE ETERNAL", "👑 الإمبراطورية الأبدية", "👑 EMPIRE ETERNAL"],
  pressSub: ["The Empire’s official media platform · Video · Stories · Articles", "La plateforme média officielle de l’Empire · Vidéos · Histoires · Articles", "منصة الإعلام الرسمية للإمبراطورية · فيديو · قصص · مقالات", "La plataforma oficial de medios del Imperio · Vídeos · Historias · Artículos"],
  genericError: ["Error", "Erreur", "خطأ", "Error"],
  pressBrand: ["GLOBAL PRESS", "GLOBAL PRESS", "GLOBAL PRESS", "GLOBAL PRESS"],
  chronPyramid: ["Pyramids of Giza", "Pyramides de Gizeh", "أهرامات الجيزة", "Pirámides de Guiza"],
  chronEgypt: ["Egypt", "Égypte", "مصر", "Egipto"],
  chronPyramidPeriod: ["2580–2560 BC", "2580–2560 av. J.-C.", "2580–2560 ق.م", "2580–2560 a. C."],
  chronAlhambra: ["Alhambra Palace", "Palais de l’Alhambra", "قصر الحمراء", "Palacio de la Alhambra"],
  chronSpain: ["Spain", "Espagne", "إسبانيا", "España"],
  chronAlhambraPeriod: ["1238–1358 AD", "1238–1358 apr. J.-C.", "1238–1358 م", "1238–1358 d. C."],
  chronPetra: ["Petra", "Pétra", "البتراء", "Petra"],
  chronJordan: ["Jordan", "Jordanie", "الأردن", "Jordania"],
  chronPetraPeriod: ["4th Century BC", "IVe siècle av. J.-C.", "القرن الرابع ق.م", "Siglo IV a. C."],
  chronNews1: ["GlobalStar reaches 2.4M votes milestone", "GlobalStar franchit le cap des 2,4 M de votes", "GlobalStar يتجاوز 2.4 مليون صوت", "GlobalStar alcanza 2,4 M de votos"],
  chronNews2: ["Arena Strike breaks daily play records", "Arena Strike bat les records de jeu quotidiens", "Arena Strike يحطم أرقام اللعب اليومية", "Arena Strike bate récords diarios de juego"],
  countries: ["🌍 180+ Countries", "🌍 Plus de 180 pays", "🌍 أكثر من 180 دولة", "🌍 Más de 180 países"],
  aiPowered: ["🤖 OpenAI Powered", "🤖 Propulsé par OpenAI", "🤖 مدعوم من OpenAI", "🤖 Impulsado por OpenAI"],
  gdpr: ["⚖️ GDPR Certified", "⚖️ Certifié GDPR", "⚖️ معتمد وفق GDPR", "⚖️ Certificado GDPR"],
  heritage: ["🏛️ Heritage Preserved", "🏛️ Patrimoine préservé", "🏛️ تراث محفوظ", "🏛️ Patrimonio preservado"],
  fourGames: ["🎮 4 Games", "🎮 4 jeux", "🎮 4 ألعاب", "🎮 4 juegos"],
  realTime: ["📡 Real-Time", "📡 Temps réel", "📡 في الوقت الفعلي", "📡 Tiempo real"],
  immutable: ["immutable", "immuable", "غير قابل للتغيير", "inmutable"],
  citizensHonors: ["honors", "honneurs", "أوسمة", "honores"],
  noCitizens: ["No citizens match your search.", "Aucun citoyen ne correspond à votre recherche.", "لا يوجد مواطنون يطابقون بحثك.", "Ningún ciudadano coincide con tu búsqueda."],
  messageri: ["MESSAGERI", "MESSAGERI", "MESSAGERI", "MESSAGERI"],
} satisfies Record<string, readonly [string, string, string, string]>;

const de: Record<keyof typeof copy, string> = {
  newsBrand: "GDNA NEWS",
  all: "Alle",
  gaming: "Gaming",
  crypto: "Krypto",
  esports: "E-Sport",
  web3: "Web3",
  tournaments: "Turniere",
  minRead: "{n} Min. Lesezeit",
  genetic: "Genetisch",
  digital: "Digital",
  neural: "Neuronal",
  architecture: "Architektur",
  collectiveDna: "⬡ KOLLEKTIVER DNA-STRANG DES IMPERIUMS — 64 ZEICHEN",
  lastEncoded: "Zuletzt codiert: {date}",
  dominantDesc: "Das in allen Erinnerungen des Imperiums am stärksten ausgeprägte Gen",
  fitnessDesc: "Berechnet aus neuronalen Erinnerungen × Bürgerzahl × durchschnittlichen XP",
  generatedNotice: "⬡ Alle nachfolgenden Inhalte wurden autonom von der Genome Engine erzeugt — kein Mensch hat sie verfasst. Alle 6 Stunden werden für immer neue Inhalte generiert.",
  crossoverNotice: "⬡ Crossover: Zwei Erinnerungen verbinden sich zu einer neuen Erkenntnis, ähnlich der genetischen Rekombination in der Biologie. Dieser Vorgang läuft automatisch alle 6 Stunden.",
  parent: "Elternteil {letter}:",
  offspring: "⬡ NACHKOMME:",
  fitnessValue: "Fitness: {n} %",
  generationShort: "Gen. Nr. {n}",
  action: "AKTION",
  victory: "SIEG",
  growth: "WACHSTUM",
  abundance: "FÜLLE",
  social: "SOZIALES",
  sport: "SPORT",
  vision: "VISION",
  sovereignty: "SOUVERÄNITÄT",
  empireNeuralCore: "NEURONALER KERN DES IMPERIUMS",
  max100: "/ 100 MAX.",
  autonomousFooter: "● AUTONOM — SELBSTEVOLVIEREND — EWIG",
  pressBadge: "👑 EMPIRE ETERNAL",
  pressSub: "Die offizielle Medienplattform des Imperiums · Videos · Geschichten · Artikel",
  genericError: "Fehler",
  pressBrand: "GLOBAL PRESS",
  chronPyramid: "Pyramiden von Gizeh",
  chronEgypt: "Ägypten",
  chronPyramidPeriod: "2580–2560 v. Chr.",
  chronAlhambra: "Alhambra-Palast",
  chronSpain: "Spanien",
  chronAlhambraPeriod: "1238–1358 n. Chr.",
  chronPetra: "Petra",
  chronJordan: "Jordanien",
  chronPetraPeriod: "4. Jahrhundert v. Chr.",
  chronNews1: "GlobalStar erreicht Marke von 2,4 Mio. Stimmen",
  chronNews2: "Arena Strike bricht täglichen Spielrekord",
  countries: "🌍 Über 180 Länder",
  aiPowered: "🤖 Unterstützt von OpenAI",
  gdpr: "⚖️ DSGVO-zertifiziert",
  heritage: "🏛️ Kulturerbe bewahrt",
  fourGames: "🎮 4 Spiele",
  realTime: "📡 Echtzeit",
  immutable: "unveränderlich",
  citizensHonors: "Ehrungen",
  noCitizens: "Keine Bürger entsprechen deiner Suche.",
  messageri: "MESSAGERI",
};

/** Transposed EN/FR/AR/ES/DE table exposed for translation parity audits. */
export const TECH_COPY_TABLE = Object.fromEntries(
  Object.entries(copy).map(([key, values]) => [
    key,
    [...values, de[key as keyof typeof copy]],
  ]),
) as unknown as { [K in keyof typeof copy]: readonly [string, string, string, string, string] };

export type TechCopyKey = keyof typeof copy;

export function techT(lang: Lang, key: TechCopyKey, vars: Record<string, string | number> = {}): string {
  const index = lang === "fr" ? 1 : lang === "ar" ? 2 : lang === "es" ? 3 : lang === "de" ? 4 : 0;
  return TECH_COPY_TABLE[key][index].replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

export const localeFor = (lang: Lang) => localeCodes[lang];
export const isArabic = (lang: Lang) => lang === "ar";
export const formatNumber = (lang: Lang, value: number) => new Intl.NumberFormat(localeFor(lang)).format(value);
export const formatDate = (lang: Lang, value: string | number | Date, includeTime = false) =>
  new Intl.DateTimeFormat(localeFor(lang), includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));
export function formatRelative(lang: Lang, value: string | number | Date): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    abs < 60 ? [seconds, "second"] :
    abs < 3600 ? [Math.round(seconds / 60), "minute"] :
    abs < 86400 ? [Math.round(seconds / 3600), "hour"] :
    [Math.round(seconds / 86400), "day"];
  return new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" }).format(amount, unit);
}

type SeedArticle = { category: TechCopyKey; title: Localized; summary: Localized; minutes: number; date: string };
const l = (en: string, fr: string, ar: string, es: string, de: string): Localized => ({ en, fr, ar, es, de });
export const SEEDED_NEWS: SeedArticle[] = [
  { category: "web3", minutes: 8, date: "2026-07-25", title: l("The Great Migration: How Top AAA Studios Are Quietly Building the Next Generation of On-Chain Economies", "La grande migration : comment les grands studios AAA bâtissent discrètement la nouvelle génération d’économies on-chain", "الهجرة الكبرى: كيف تبني استوديوهات AAA الكبرى بهدوء الجيل التالي من الاقتصادات على السلسلة", "La gran migración: cómo los grandes estudios AAA construyen discretamente la próxima generación de economías on-chain", "Die große Migration: Wie führende AAA-Studios im Stillen die nächste Generation von On-Chain-Ökonomien aufbauen"), summary: l("Industry veterans are establishing a new paradigm for player-owned assets without sacrificing gameplay.", "Des vétérans du secteur créent un nouveau modèle d’actifs détenus par les joueurs sans sacrifier l’expérience de jeu.", "يؤسس خبراء الصناعة نموذجاً جديداً لأصول يملكها اللاعبون من دون التضحية بتجربة اللعب.", "Veteranos del sector establecen un nuevo modelo de activos de jugadores sin sacrificar la experiencia.", "Branchenveteranen schaffen ein neues Modell für spielereigene Assets, ohne das Gameplay zu beeinträchtigen.") },
  { category: "gaming", minutes: 3, date: "2026-07-24", title: l("Epic Games Announces $50M Web3 Gaming Fund for Indie Developers", "Epic Games annonce un fonds Web3 de 50 M$ pour les studios indépendants", "Epic Games تعلن صندوق ألعاب Web3 بقيمة 50 مليون دولار للمطورين المستقلين", "Epic Games anuncia un fondo Web3 de 50 M$ para desarrolladores independientes", "Epic Games kündigt Web3-Gaming-Fonds über 50 Mio. $ für Indie-Entwickler an"), summary: l("A new grant program lowers barriers for studios adding blockchain mechanics to Unreal Engine 5 projects.", "Un nouveau programme réduit les obstacles pour intégrer la blockchain aux projets Unreal Engine 5.", "برنامج منح جديد يسهّل دمج تقنيات البلوكشين في مشاريع Unreal Engine 5.", "Un nuevo programa reduce las barreras para integrar blockchain en proyectos de Unreal Engine 5.", "Ein neues Förderprogramm erleichtert Studios die Integration von Blockchain-Mechaniken in Projekte mit Unreal Engine 5.") },
  { category: "crypto", minutes: 5, date: "2026-07-23", title: l("Ethereum Layer 2 Cuts Gaming Transaction Fees by 94%", "La couche 2 d’Ethereum réduit de 94 % les frais des transactions de jeu", "الطبقة الثانية من Ethereum تخفض رسوم معاملات الألعاب بنسبة 94٪", "La capa 2 de Ethereum reduce un 94 % las comisiones de juegos", "Ethereum Layer 2 senkt Transaktionsgebühren für Spiele um 94 %"), summary: l("The latest rollup upgrade makes microtransactions viable in blockchain economies.", "La dernière mise à niveau rend les microtransactions viables dans les économies blockchain.", "يجعل تحديث التجميع الأخير المعاملات الصغيرة قابلة للتطبيق في اقتصادات البلوكشين.", "La última actualización hace viables las microtransacciones en economías blockchain.", "Das neueste Rollup-Upgrade macht Mikrotransaktionen in Blockchain-Ökonomien rentabel.") },
  { category: "esports", minutes: 2, date: "2026-07-22", title: l("Arena Qaisypro Season 2 Tournament Opens Registration", "Les inscriptions au tournoi Arena Qaisypro Saison 2 sont ouvertes", "فتح التسجيل في بطولة Arena Qaisypro للموسم الثاني", "Abren las inscripciones del torneo Arena Qaisypro Temporada 2", "Anmeldung für das Arena-Qaisypro-Turnier Saison 2 eröffnet"), summary: l("The second season brings new maps, balanced rosters, and a $100,000 prize pool.", "La deuxième saison apporte de nouvelles cartes, des équipes équilibrées et 100 000 $ de prix.", "يقدم الموسم الثاني خرائط جديدة وتشكيلات متوازنة وجوائز بقيمة 100 ألف دولار.", "La segunda temporada trae nuevos mapas, plantillas equilibradas y 100 000 $ en premios.", "Die zweite Saison bringt neue Karten, ausgewogene Teams und einen Preispool von 100.000 $.") },
  { category: "web3", minutes: 4, date: "2026-07-21", title: l("Axie Infinity 2.0 Beta Launches with a Full PvP Economy Overhaul", "La bêta d’Axie Infinity 2.0 renouvelle entièrement l’économie JcJ", "إطلاق النسخة التجريبية من Axie Infinity 2.0 مع تجديد كامل لاقتصاد PvP", "La beta de Axie Infinity 2.0 renueva por completo la economía PvP", "Beta von Axie Infinity 2.0 startet mit komplett überarbeiteter PvP-Ökonomie"), summary: l("A redesigned combat system emphasizes skill over pay-to-win mechanics.", "Un système de combat repensé privilégie le talent plutôt que le paiement.", "يركز نظام القتال المعاد تصميمه على المهارة بدلاً من الدفع للفوز.", "El nuevo sistema de combate prioriza la habilidad sobre el pago para ganar.", "Ein neu gestaltetes Kampfsystem stellt Können über Pay-to-win-Mechaniken.") },
  { category: "crypto", minutes: 3, date: "2026-07-20", title: l("Bitcoin Gaming Wallets Pass 10 Million Users", "Les portefeuilles de jeu Bitcoin dépassent 10 millions d’utilisateurs", "محافظ ألعاب Bitcoin تتجاوز 10 ملايين مستخدم", "Las carteras de juegos Bitcoin superan los 10 millones de usuarios", "Bitcoin-Gaming-Wallets überschreiten Marke von 10 Millionen Nutzern"), summary: l("Lightning adoption in mobile games drives growth in non-custodial wallets.", "L’adoption de Lightning dans les jeux mobiles stimule les portefeuilles non dépositaires.", "اعتماد Lightning في ألعاب الهاتف يدفع نمو المحافظ غير الوصائية.", "La adopción de Lightning en juegos móviles impulsa las carteras sin custodia.", "Die Verbreitung von Lightning in mobilen Spielen fördert das Wachstum selbstverwalteter Wallets.") },
  { category: "gaming", minutes: 6, date: "2026-07-19", title: l("Unreal Engine 6 Preview Shows Real-Time Ray Tracing on Mobile", "L’aperçu d’Unreal Engine 6 présente le ray tracing mobile en temps réel", "عرض Unreal Engine 6 يستعرض تتبع الأشعة الفوري على الهاتف", "Unreal Engine 6 muestra trazado de rayos móvil en tiempo real", "Vorschau auf Unreal Engine 6 zeigt Echtzeit-Raytracing auf Mobilgeräten"), summary: l("Epic’s next engine promises to narrow the visual gap between mobile and console gaming.", "Le prochain moteur d’Epic promet de réduire l’écart visuel entre mobile et console.", "يَعِد محرك Epic القادم بتقليص الفجوة البصرية بين الهاتف والمنصات.", "El próximo motor de Epic promete reducir la brecha visual entre móvil y consola.", "Epics nächste Engine soll die grafische Kluft zwischen Mobil- und Konsolenspielen verkleinern.") },
  { category: "tournaments", minutes: 2, date: "2026-07-18", title: l("South Korea Tops Global Esports Rankings; GDNA Teams Reach Top 20", "La Corée du Sud domine l’esport mondial ; les équipes GDNA entrent dans le top 20", "كوريا الجنوبية تتصدر تصنيف الرياضات الإلكترونية وفرق GDNA تدخل أفضل 20", "Corea del Sur lidera los esports; los equipos GDNA entran en el top 20", "Südkorea führt weltweite E-Sport-Rangliste an; GDNA-Teams erreichen Top 20"), summary: l("Dominant regional performances put South Korean organizations at the top.", "Des performances régionales dominantes placent les organisations sud-coréennes en tête.", "وضعت العروض الإقليمية القوية المؤسسات الكورية الجنوبية في الصدارة.", "El dominio regional coloca a las organizaciones surcoreanas en la cima.", "Überragende regionale Leistungen bringen südkoreanische Organisationen an die Spitze.") },
  { category: "web3", minutes: 4, date: "2026-07-17", title: l("NFT Gaming Items Become Tradable Across 15 Platforms", "Les objets de jeu NFT deviennent échangeables sur 15 plateformes", "عناصر ألعاب NFT تصبح قابلة للتداول عبر 15 منصة", "Los objetos NFT de juegos ya se intercambian en 15 plataformas", "NFT-Spielgegenstände werden auf 15 Plattformen handelbar"), summary: l("A unified standard advances cross-chain interoperability for in-game assets.", "Une norme unifiée fait progresser l’interopérabilité cross-chain des actifs de jeu.", "معيار موحد يدفع قابلية التشغيل البيني للأصول داخل الألعاب.", "Un estándar unificado impulsa la interoperabilidad de activos de juego.", "Ein einheitlicher Standard verbessert die Cross-Chain-Interoperabilität von In-Game-Assets.") },
];

export function localizedSeed(lang: Lang, item: SeedArticle) {
  return { ...item, title: item.title[lang], summary: item.summary[lang] };
}