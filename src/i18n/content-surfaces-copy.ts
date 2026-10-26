import type { Lang } from "@/contexts/LangContext";

const en = {
  live: "LIVE", active: "ACTIVE", today: "Today", tomorrow: "Tomorrow", ended: "Ended",
  error: "Something went wrong", competitionsModule: "Competitions module", viewAllLegends: "View all legends",
  citizens: "Citizens", voices: "Voices", coins: "Coins", totalXp: "Total XP", reward: "Reward",
  imperialIntelligence: "Imperial Intelligence", oracle: "Oracle", commandCenter: "Imperial Command Center · Throne Room",
  votesCast: "Votes Cast", battlesFought: "Battles Fought", oracleAccuracy: "Oracle Accuracy",
  tributeHall: "Tribute Hall", tribute: "tribute", imperialOracle: "Imperial Oracle", orderChampions: "Order of Champions", topFive: "TOP 5",
  battleArena: "The Battle Arena", honourDefeat: "honour in defeat", enter: "Enter", racing: "Racing", strategy: "Strategy", combat: "Combat",
  mindForge: "Mind Forge", forge: "Forge", archives: "The Archives", archive: "Archives", imperialDispatches: "Imperial Dispatches", allNews: "All News",
  constitution: "The Constitution", law: "Imperial Law", citizenEmpire: "Citizen of the Empire", battles: "battles", victories: "victories",
  sovereignty: "SOVEREIGNTY · LEGACY · IMMORTALITY", oracleGreeting: "The Oracle hears you. Ask your question, citizen.",
  oracleThinking: "Oracle is consulting the void…", oracleError: "Oracle connection disrupted. Reconnecting…",
  breaking: "Breaking", footSoldier1: "Foot Soldier I", footSoldier2: "Foot Soldier II", knight1: "Knight I", knight2: "Knight II", commander1: "Commander I", commander2: "Commander II", imperialChampion: "Imperial Champion",
  decree1: "Intel: Record-breaking music votes in the last 24 hours", decree2: "AI prediction: Football tributes are up 40%", decree3: "AI alert: Arena Strike is trending at 3× its normal tribute flow", decree4: "Alert: Crypto Clash is defying all predictions this week", decree5: "System: The AI Oracle processed 12,400 tributes with 99.8% accuracy",
  awakened: "AWAKENED", eternalQuote: "Empire in slumber must awaken to live forever", openPulse: "Open Empire Pulse", fullCalendar: "Full Calendar",
  rewardSystem: "REWARD SYSTEM", rewardIntro: "Every action builds the empire. Every contribution is rewarded.",
  watchLecture: "Watch a Lecture", watchLectureDesc: "On any Legend's PEAK MOMENTS", joinDebate: "Join a Debate", joinDebateDesc: "In GLOBAL ARENA",
  postStory: "Post a Story", postStoryDesc: "In COMMUNICATION HUB", empireAwake: "EMPIRE IS AWAKE 🔥",
  empireNeverSleeps: "The empire never sleeps — it evolves, grows, and conquers.", topLegends: "TOP 10 LEGENDS", empirePulse: "EMPIRE PULSE",
  celebrationsHub: "EMPIRE CELEBRATIONS HUB", celebrationsIntro: "Share Art · Ideas · Videos during global celebrations.",
  bestContribution: "Best contribution = 🏛️ Imperial Laurel + +500 Coins", liveEvents: "Live Events", totalEvents: "Total Events", topCoinsPrize: "Top Coins Prize",
  liveCelebrations: "🔴 LIVE CELEBRATIONS", upcomingCelebrations: "UPCOMING CELEBRATIONS", perEntry: "Coins per entry",
  bestEntry: "Best entry", imperialLaurel: "Imperial Laurel", submitContribution: "Submit your contribution",
  shareEntry: "Share your {type} — analysis, tribute, art, or idea...", submitting: "Submitting...", submit: "Submit {type}",
  loginParticipate: "Login to participate and compete for the Imperial Laurel", contributions: "CONTRIBUTIONS", entries: "entries",
  firstContribution: "Be the first to contribute.", selectCelebration: "Select a celebration", greatestMoments: "Join the empire's greatest moments", top: "Top",
  text: "Text", idea: "Idea", art: "Art", video: "Video", sport: "Sport", science: "Science", holiday: "Holiday", music: "Music", global: "Global",
  eventsTracker: "LIVE INTERNATIONAL EVENTS — EMPIRE TRACKER", eventsIntro: "The world's biggest moments — sport, tech, music, business. Empire citizens track them all in real-time.",
  liveNow: "Live Now", megaEvents: "Mega Events", liveRightNow: "🔴 LIVE RIGHT NOW", upcomingSorted: "UPCOMING EVENTS — SORTED BY DATE",
  upcomingDomain: "UPCOMING {domain} EVENTS", joinPulse: "Join the discussion on Empire Pulse", impact: "Impact", tech: "Tech", business: "Business", cinema: "Cinema",
  nostalgiaHero: "NOSTALGIA DNA — THE PAST IS ALIVE", nostalgiaIntro: "Every legend begins with a story. This is theirs.",
  childhood: "CHILDHOOD", training: "TRAINING", breakthrough: "BREAKTHROUGH", stardom: "STARDOM",
  momentsHero: "PEAK MOMENTS — TOP ACHIEVEMENTS", watchReward: "▶ Watch any video to earn +20 XP",
  arenaHero: "GLOBAL ARENA — LECTURES · DEBATES · CONFERENCES", joinReward: "Join events to earn +50 Coins per session",
  upcomingEvents: "UPCOMING EVENTS", joined: "✓ Joined +50 🪙", join: "JOIN +50 🪙", loginJoin: "Login to Join", noArena: "No arena events yet for this domain.",
  communicationHub: "COMMUNICATION HUB", communicationIntro: "Chat · Stories · Connect · Share", liveChat: "💬 Live Chat", debate: "Debate", stories: "📖 Stories", posts24: "24h Posts",
  lecture: "Lecture", conference: "Conference", summit: "Summit",
  debateReward: "+50 XP + +50 Coins per debate message", firstSpeak: "Be the first to speak in this arena.",
  speakPlaceholder: "Speak in the arena...", loginDebatePlaceholder: "Login to join the debate...", storyReward: "+10 Coins per story",
  posting: "Posting...", postStoryButton: "📖 Post Story", noStories: "No stories yet — post the first one.", hoursLeft: "{count}h left",
  loadingArchive: "Loading Neural Archive...", legendNotFound: "Legend Not Found", backTop: "Back to TOP 10 LEGENDS", champion: "CHAMPION",
  nostalgiaTab: "NOSTALGIA DNA", momentsTab: "PEAK MOMENTS", arenaTab: "GLOBAL ARENA", commsTab: "COMMUNICATION HUB",
};

export type SurfaceCopy = { [K in keyof typeof en]: string };
const fr: SurfaceCopy = {
  live:"EN DIRECT",active:"ACTIF",today:"Aujourd’hui",tomorrow:"Demain",ended:"Terminé",citizens:"Citoyens",voices:"Voix",coins:"Pièces",totalXp:"XP total",reward:"Récompense",
  error:"Une erreur s’est produite",competitionsModule:"Module Compétitions",viewAllLegends:"Voir toutes les légendes",
  imperialIntelligence:"Intelligence impériale",oracle:"Oracle",commandCenter:"Centre de commandement impérial · Salle du Trône",votesCast:"Votes exprimés",battlesFought:"Batailles livrées",oracleAccuracy:"Précision de l’Oracle",
  tributeHall:"Salle des hommages",tribute:"hommages",imperialOracle:"Oracle impérial",orderChampions:"Ordre des champions",topFive:"TOP 5",battleArena:"L’Arène de bataille",honourDefeat:"l’honneur dans la défaite",enter:"Entrer",racing:"Course",strategy:"Stratégie",combat:"Combat",
  mindForge:"Forge de l’esprit",forge:"Forger",archives:"Les Archives",archive:"Archives",imperialDispatches:"Dépêches impériales",allNews:"Toutes les actualités",
  constitution:"La Constitution",law:"Loi impériale",citizenEmpire:"Citoyen de l’Empire",battles:"batailles",victories:"victoires",sovereignty:"SOUVERAINETÉ · HÉRITAGE · IMMORTALITÉ",oracleGreeting:"L’Oracle vous écoute. Posez votre question, citoyen.",
  oracleThinking:"L’Oracle consulte le néant…",oracleError:"Connexion à l’Oracle interrompue. Reconnexion…",awakened:"ÉVEILLÉ",eternalQuote:"L’Empire endormi doit s’éveiller pour vivre à jamais",
  breaking:"Urgent",footSoldier1:"Fantassin I",footSoldier2:"Fantassin II",knight1:"Chevalier I",knight2:"Chevalier II",commander1:"Commandant I",commander2:"Commandant II",imperialChampion:"Champion impérial",
  decree1:"Info : record de votes musicaux ces dernières 24 heures",decree2:"Prédiction IA : les hommages au football augmentent de 40 %",decree3:"Alerte IA : Arena Strike atteint trois fois son flux habituel",decree4:"Alerte : Crypto Clash défie toutes les prédictions cette semaine",decree5:"Système : l’Oracle IA a traité 12 400 hommages avec 99,8 % de précision",
  openPulse:"Ouvrir le Pouls de l’Empire",fullCalendar:"Calendrier complet",rewardSystem:"SYSTÈME DE RÉCOMPENSES",rewardIntro:"Chaque action bâtit l’Empire. Chaque contribution est récompensée.",
  watchLecture:"Voir une conférence",watchLectureDesc:"Dans les MOMENTS FORTS d’une légende",joinDebate:"Rejoindre un débat",joinDebateDesc:"Dans l’ARÈNE MONDIALE",postStory:"Publier une histoire",postStoryDesc:"Dans le CENTRE DE COMMUNICATION",empireAwake:"L’EMPIRE EST ÉVEILLÉ 🔥",empireNeverSleeps:"L’Empire ne dort jamais — il évolue, grandit et conquiert.",topLegends:"TOP 10 DES LÉGENDES",empirePulse:"POULS DE L’EMPIRE",
  celebrationsHub:"CENTRE DES CÉLÉBRATIONS",celebrationsIntro:"Partagez art, idées et vidéos pendant les célébrations mondiales.",bestContribution:"Meilleure contribution = 🏛️ Laurier impérial + 500 pièces",
  liveEvents:"Événements en direct",totalEvents:"Total des événements",topCoinsPrize:"Prix maximal",liveCelebrations:"🔴 CÉLÉBRATIONS EN DIRECT",upcomingCelebrations:"CÉLÉBRATIONS À VENIR",
  perEntry:"Pièces par participation",bestEntry:"Meilleure participation",imperialLaurel:"Laurier impérial",submitContribution:"Envoyez votre contribution",shareEntry:"Partagez votre {type} — analyse, hommage, art ou idée...",
  submitting:"Envoi...",submit:"Envoyer : {type}",loginParticipate:"Connectez-vous pour participer et gagner le Laurier impérial",contributions:"CONTRIBUTIONS",entries:"participations",firstContribution:"Soyez le premier à contribuer.",
  selectCelebration:"Choisissez une célébration",greatestMoments:"Participez aux plus grands moments de l’Empire",top:"Meilleur",text:"Texte",idea:"Idée",art:"Art",video:"Vidéo",sport:"Sport",science:"Science",holiday:"Fête",music:"Musique",global:"Mondial",eventsTracker:"ÉVÉNEMENTS INTERNATIONAUX EN DIRECT — SUIVI DE L’EMPIRE",
  eventsIntro:"Les plus grands moments mondiaux — sport, technologie, musique et affaires. Les citoyens les suivent en temps réel.",liveNow:"En direct",megaEvents:"Méga-événements",liveRightNow:"🔴 EN DIRECT MAINTENANT",
  upcomingSorted:"ÉVÉNEMENTS À VENIR — TRIÉS PAR DATE",upcomingDomain:"ÉVÉNEMENTS {domain} À VENIR",joinPulse:"Rejoindre la discussion sur le Pouls de l’Empire",impact:"Impact",tech:"Technologie",business:"Affaires",cinema:"Cinéma",
  nostalgiaHero:"ADN NOSTALGIE — LE PASSÉ EST VIVANT",nostalgiaIntro:"Chaque légende commence par une histoire. Voici la sienne.",childhood:"ENFANCE",training:"ENTRAÎNEMENT",breakthrough:"RÉVÉLATION",stardom:"GLOIRE",
  momentsHero:"MOMENTS FORTS — MEILLEURES RÉALISATIONS",watchReward:"▶ Regardez une vidéo pour gagner +20 XP",arenaHero:"ARÈNE MONDIALE — CONFÉRENCES · DÉBATS",joinReward:"Rejoignez une session pour gagner 50 pièces",
  upcomingEvents:"ÉVÉNEMENTS À VENIR",joined:"✓ Inscrit +50 🪙",join:"REJOINDRE +50 🪙",loginJoin:"Connexion requise",noArena:"Aucun événement dans cette arène.",communicationHub:"CENTRE DE COMMUNICATION",communicationIntro:"Discussion · Histoires · Connexion · Partage",
  liveChat:"💬 Chat en direct",debate:"Débat",stories:"📖 Histoires",posts24:"Publications 24 h",debateReward:"+50 XP et +50 pièces par message de débat",firstSpeak:"Soyez le premier à parler dans cette arène.",speakPlaceholder:"Parlez dans l’arène...",loginDebatePlaceholder:"Connectez-vous pour débattre...",
  lecture:"Conférence",conference:"Conférence",summit:"Sommet",
  storyReward:"+10 pièces par histoire",posting:"Publication...",postStoryButton:"📖 Publier",noStories:"Aucune histoire — publiez la première.",hoursLeft:"Encore {count} h",loadingArchive:"Chargement des archives neurales...",
  legendNotFound:"Légende introuvable",backTop:"Retour au TOP 10 DES LÉGENDES",champion:"CHAMPION",nostalgiaTab:"ADN NOSTALGIE",momentsTab:"MOMENTS FORTS",arenaTab:"ARÈNE MONDIALE",commsTab:"CENTRE DE COMMUNICATION",
};
const es: SurfaceCopy = {
  live:"EN VIVO",active:"ACTIVO",today:"Hoy",tomorrow:"Mañana",ended:"Finalizado",citizens:"Ciudadanos",voices:"Voces",coins:"Monedas",totalXp:"XP total",reward:"Recompensa",
  error:"Se produjo un error",competitionsModule:"Módulo de competiciones",viewAllLegends:"Ver todas las leyendas",
  imperialIntelligence:"Inteligencia imperial",oracle:"Oráculo",commandCenter:"Centro de mando imperial · Sala del Trono",votesCast:"Votos emitidos",battlesFought:"Batallas libradas",oracleAccuracy:"Precisión del Oráculo",
  tributeHall:"Sala de tributos",tribute:"tributos",imperialOracle:"Oráculo imperial",orderChampions:"Orden de campeones",topFive:"TOP 5",battleArena:"La Arena de batalla",honourDefeat:"honor en la derrota",enter:"Entrar",racing:"Carreras",strategy:"Estrategia",combat:"Combate",
  mindForge:"Forja mental",forge:"Forjar",archives:"Los Archivos",archive:"Archivos",imperialDispatches:"Despachos imperiales",allNews:"Todas las noticias",constitution:"La Constitución",law:"Ley imperial",
  citizenEmpire:"Ciudadano del Imperio",battles:"batallas",victories:"victorias",sovereignty:"SOBERANÍA · LEGADO · INMORTALIDAD",oracleGreeting:"El Oráculo te escucha. Haz tu pregunta, ciudadano.",oracleThinking:"El Oráculo consulta el vacío…",oracleError:"Conexión con el Oráculo interrumpida. Reconectando…",
  awakened:"DESPIERTO",eternalQuote:"El Imperio dormido debe despertar para vivir por siempre",openPulse:"Abrir Pulso del Imperio",fullCalendar:"Calendario completo",rewardSystem:"SISTEMA DE RECOMPENSAS",
  breaking:"Última hora",footSoldier1:"Soldado I",footSoldier2:"Soldado II",knight1:"Caballero I",knight2:"Caballero II",commander1:"Comandante I",commander2:"Comandante II",imperialChampion:"Campeón imperial",
  decree1:"Informe: récord de votos musicales en las últimas 24 horas",decree2:"Predicción IA: los tributos de fútbol subieron un 40 %",decree3:"Alerta IA: Arena Strike registra tres veces su flujo habitual",decree4:"Alerta: Crypto Clash desafía todas las predicciones esta semana",decree5:"Sistema: el Oráculo IA procesó 12.400 tributos con un 99,8 % de precisión",
  rewardIntro:"Cada acción construye el Imperio. Cada contribución recibe recompensa.",watchLecture:"Ver una conferencia",watchLectureDesc:"En los MOMENTOS CUMBRE de cualquier leyenda",joinDebate:"Unirse a un debate",joinDebateDesc:"En la ARENA GLOBAL",postStory:"Publicar una historia",postStoryDesc:"En el CENTRO DE COMUNICACIÓN",empireAwake:"EL IMPERIO ESTÁ DESPIERTO 🔥",topLegends:"TOP 10 LEYENDAS",empirePulse:"PULSO DEL IMPERIO",
  empireNeverSleeps:"El Imperio nunca duerme: evoluciona, crece y conquista.",celebrationsHub:"CENTRO DE CELEBRACIONES",celebrationsIntro:"Comparte arte, ideas y vídeos durante celebraciones mundiales.",
  bestContribution:"Mejor contribución = 🏛️ Laurel imperial + 500 monedas",liveEvents:"Eventos en vivo",totalEvents:"Eventos totales",topCoinsPrize:"Premio máximo",liveCelebrations:"🔴 CELEBRACIONES EN VIVO",upcomingCelebrations:"PRÓXIMAS CELEBRACIONES",
  perEntry:"Monedas por entrada",bestEntry:"Mejor entrada",imperialLaurel:"Laurel imperial",submitContribution:"Envía tu contribución",shareEntry:"Comparte tu {type}: análisis, tributo, arte o idea...",
  submitting:"Enviando...",submit:"Enviar {type}",loginParticipate:"Inicia sesión para participar y competir por el Laurel imperial",contributions:"CONTRIBUCIONES",entries:"entradas",firstContribution:"Sé el primero en contribuir.",
  selectCelebration:"Selecciona una celebración",greatestMoments:"Únete a los mejores momentos del Imperio",top:"Mejor",text:"Texto",idea:"Idea",art:"Arte",video:"Vídeo",sport:"Deporte",science:"Ciencia",holiday:"Festividad",music:"Música",global:"Global",eventsTracker:"EVENTOS INTERNACIONALES EN VIVO — RASTREADOR DEL IMPERIO",
  eventsIntro:"Los mayores momentos del mundo — deporte, tecnología, música y negocios. Los ciudadanos los siguen en tiempo real.",liveNow:"En vivo",megaEvents:"Megaeventos",liveRightNow:"🔴 EN VIVO AHORA",
  upcomingSorted:"PRÓXIMOS EVENTOS — POR FECHA",upcomingDomain:"PRÓXIMOS EVENTOS DE {domain}",joinPulse:"Únete al debate en Pulso del Imperio",impact:"Impacto",tech:"Tecnología",business:"Negocios",cinema:"Cine",
  nostalgiaHero:"ADN NOSTALGIA — EL PASADO ESTÁ VIVO",nostalgiaIntro:"Toda leyenda comienza con una historia. Esta es la suya.",childhood:"INFANCIA",training:"ENTRENAMIENTO",breakthrough:"CONSAGRACIÓN",stardom:"ESTRELLATO",
  momentsHero:"MOMENTOS CUMBRE — MAYORES LOGROS",watchReward:"▶ Mira un vídeo para ganar +20 XP",arenaHero:"ARENA GLOBAL — CONFERENCIAS · DEBATES",joinReward:"Únete a eventos para ganar 50 monedas por sesión",
  upcomingEvents:"PRÓXIMOS EVENTOS",joined:"✓ Unido +50 🪙",join:"UNIRSE +50 🪙",loginJoin:"Inicia sesión",noArena:"Aún no hay eventos de arena en este dominio.",communicationHub:"CENTRO DE COMUNICACIÓN",communicationIntro:"Chat · Historias · Conecta · Comparte",
  liveChat:"💬 Chat en vivo",debate:"Debate",stories:"📖 Historias",posts24:"Publicaciones 24 h",debateReward:"+50 XP y +50 monedas por mensaje de debate",firstSpeak:"Sé el primero en hablar en esta arena.",speakPlaceholder:"Habla en la arena...",loginDebatePlaceholder:"Inicia sesión para debatir...",
  lecture:"Conferencia",conference:"Conferencia",summit:"Cumbre",
  storyReward:"+10 monedas por historia",posting:"Publicando...",postStoryButton:"📖 Publicar historia",noStories:"Aún no hay historias; publica la primera.",hoursLeft:"Quedan {count} h",loadingArchive:"Cargando archivo neural...",
  legendNotFound:"Leyenda no encontrada",backTop:"Volver al TOP 10 DE LEYENDAS",champion:"CAMPEÓN",nostalgiaTab:"ADN NOSTALGIA",momentsTab:"MOMENTOS CUMBRE",arenaTab:"ARENA GLOBAL",commsTab:"CENTRO DE COMUNICACIÓN",
};
const ar: SurfaceCopy = {
  live:"مباشر",active:"نشط",today:"اليوم",tomorrow:"غدًا",ended:"انتهى",citizens:"المواطنون",voices:"الأصوات",coins:"العملات",totalXp:"إجمالي XP",reward:"المكافأة",
  error:"حدث خطأ ما",competitionsModule:"وحدة المسابقات",viewAllLegends:"عرض كل الأساطير",
  imperialIntelligence:"الاستخبارات الإمبراطورية",oracle:"الأوراكل",commandCenter:"مركز القيادة الإمبراطوري · قاعة العرش",votesCast:"الأصوات المدلى بها",battlesFought:"المعارك المنجزة",oracleAccuracy:"دقة الأوراكل",
  tributeHall:"قاعة التكريم",tribute:"تكريم",imperialOracle:"الأوراكل الإمبراطوري",orderChampions:"وسام الأبطال",topFive:"أفضل 5",battleArena:"ساحة المعركة",honourDefeat:"الشرف في الهزيمة",enter:"ادخل",
  racing:"سباق",strategy:"استراتيجية",combat:"قتال",mindForge:"مصهر العقل",forge:"اصقل",archives:"الأرشيف",archive:"الأرشيف",imperialDispatches:"البلاغات الإمبراطورية",allNews:"كل الأخبار",
  constitution:"الدستور",law:"القانون الإمبراطوري",citizenEmpire:"مواطن الإمبراطورية",battles:"معارك",victories:"انتصارات",sovereignty:"السيادة · الإرث · الخلود",
  oracleGreeting:"الأوراكل يسمعك. اطرح سؤالك أيها المواطن.",oracleThinking:"الأوراكل يستشير الفراغ…",oracleError:"انقطع الاتصال بالأوراكل. جارٍ إعادة الاتصال…",awakened:"استيقظت",
  breaking:"عاجل",footSoldier1:"جندي أول I",footSoldier2:"جندي أول II",knight1:"فارس I",knight2:"فارس II",commander1:"قائد I",commander2:"قائد II",imperialChampion:"البطل الإمبراطوري",
  decree1:"معلومة: رقم قياسي لتصويتات الموسيقى خلال آخر 24 ساعة",decree2:"توقع الذكاء الاصطناعي: ارتفعت تكريمات كرة القدم 40٪",decree3:"تنبيه ذكي: تدفق Arena Strike يبلغ ثلاثة أضعاف المعتاد",decree4:"تنبيه: تتحدى Crypto Clash كل التوقعات هذا الأسبوع",decree5:"النظام: عالج الأوراكل الذكي 12,400 تكريم بدقة 99.8٪",
  eternalQuote:"على الإمبراطورية النائمة أن تستيقظ لتعيش إلى الأبد",openPulse:"افتح نبض الإمبراطورية",fullCalendar:"التقويم الكامل",rewardSystem:"نظام المكافآت",
  rewardIntro:"كل فعل يبني الإمبراطورية، وكل مساهمة تُكافأ.",watchLecture:"شاهد محاضرة",watchLectureDesc:"في لحظات قمة أي أسطورة",joinDebate:"انضم إلى مناظرة",joinDebateDesc:"في الساحة العالمية",postStory:"انشر قصة",postStoryDesc:"في مركز التواصل",empireAwake:"الإمبراطورية مستيقظة 🔥",topLegends:"أفضل 10 أساطير",
  empireNeverSleeps:"الإمبراطورية لا تنام — بل تتطور وتنمو وتنتصر.",empirePulse:"نبض الإمبراطورية",celebrationsHub:"مركز احتفالات الإمبراطورية",celebrationsIntro:"شارك الفن والأفكار والفيديوهات خلال الاحتفالات العالمية.",
  bestContribution:"أفضل مساهمة = 🏛️ الإكليل الإمبراطوري + 500 عملة",liveEvents:"فعاليات مباشرة",totalEvents:"إجمالي الفعاليات",topCoinsPrize:"أكبر جائزة",liveCelebrations:"🔴 احتفالات مباشرة",upcomingCelebrations:"الاحتفالات القادمة",
  perEntry:"عملة لكل مشاركة",bestEntry:"أفضل مشاركة",imperialLaurel:"الإكليل الإمبراطوري",submitContribution:"أرسل مساهمتك",shareEntry:"شارك {type} — تحليلًا أو تكريمًا أو فنًا أو فكرة...",
  submitting:"جارٍ الإرسال...",submit:"إرسال {type}",loginParticipate:"سجّل الدخول للمشاركة والمنافسة على الإكليل الإمبراطوري",contributions:"المساهمات",entries:"مشاركة",firstContribution:"كن أول من يساهم.",
  selectCelebration:"اختر احتفالًا",greatestMoments:"شارك في أعظم لحظات الإمبراطورية",top:"الأفضل",text:"نص",idea:"فكرة",art:"فن",video:"فيديو",sport:"رياضة",science:"علوم",holiday:"مناسبة",music:"موسيقى",global:"عالمي",
  eventsTracker:"فعاليات دولية مباشرة — متتبع الإمبراطورية",eventsIntro:"أكبر لحظات العالم في الرياضة والتقنية والموسيقى والأعمال، يتابعها المواطنون لحظة بلحظة.",
  liveNow:"مباشر الآن",megaEvents:"فعاليات كبرى",liveRightNow:"🔴 مباشر الآن",upcomingSorted:"الفعاليات القادمة — حسب التاريخ",upcomingDomain:"فعاليات {domain} القادمة",joinPulse:"انضم إلى النقاش في نبض الإمبراطورية",impact:"التأثير",
  tech:"تقنية",business:"أعمال",cinema:"سينما",nostalgiaHero:"حمض الحنين — الماضي حي",nostalgiaIntro:"كل أسطورة تبدأ بقصة. وهذه قصتها.",childhood:"الطفولة",training:"التدريب",breakthrough:"الانطلاقة",stardom:"النجومية",
  momentsHero:"لحظات القمة — أعظم الإنجازات",watchReward:"▶ شاهد أي فيديو لتحصل على 20 XP",arenaHero:"الساحة العالمية — محاضرات · مناظرات · مؤتمرات",joinReward:"انضم إلى الفعاليات لتحصل على 50 عملة لكل جلسة",
  upcomingEvents:"الفعاليات القادمة",joined:"✓ انضممت +50 🪙",join:"انضم +50 🪙",loginJoin:"سجّل الدخول للانضمام",noArena:"لا توجد فعاليات في هذه الساحة بعد.",communicationHub:"مركز التواصل",communicationIntro:"دردشة · قصص · تواصل · مشاركة",
  liveChat:"💬 دردشة مباشرة",debate:"مناظرة",stories:"📖 قصص",posts24:"منشورات 24 ساعة",debateReward:"+50 XP و50 عملة لكل رسالة مناظرة",firstSpeak:"كن أول من يتحدث في هذه الساحة.",
  lecture:"محاضرة",conference:"مؤتمر",summit:"قمة",
  speakPlaceholder:"تحدث في الساحة...",loginDebatePlaceholder:"سجّل الدخول للانضمام إلى المناظرة...",storyReward:"+10 عملات لكل قصة",posting:"جارٍ النشر...",postStoryButton:"📖 نشر القصة",noStories:"لا قصص بعد — انشر الأولى.",
  hoursLeft:"متبقي {count} س",loadingArchive:"جارٍ تحميل الأرشيف العصبي...",legendNotFound:"الأسطورة غير موجودة",backTop:"العودة إلى أفضل 10 أساطير",champion:"البطل",
  nostalgiaTab:"حمض الحنين",momentsTab:"لحظات القمة",arenaTab:"الساحة العالمية",commsTab:"مركز التواصل",
};

const de: SurfaceCopy = {
  live:"LIVE",active:"AKTIV",today:"Heute",tomorrow:"Morgen",ended:"Beendet",citizens:"Bürger",voices:"Stimmen",coins:"Coins",totalXp:"Gesamt-XP",reward:"Belohnung",
  error:"Etwas ist schiefgelaufen",competitionsModule:"Wettbewerbsmodul",viewAllLegends:"Alle Legenden anzeigen",
  imperialIntelligence:"Imperialer Nachrichtendienst",oracle:"Orakel",commandCenter:"Imperiales Kommandozentrum · Thronsaal",votesCast:"Abgegebene Stimmen",battlesFought:"Ausgetragene Kämpfe",oracleAccuracy:"Genauigkeit des Orakels",
  tributeHall:"Halle der Würdigungen",tribute:"Würdigungen",imperialOracle:"Imperiales Orakel",orderChampions:"Orden der Champions",topFive:"TOP 5",battleArena:"Die Kampfarena",honourDefeat:"Ehre in der Niederlage",enter:"Betreten",racing:"Rennen",strategy:"Strategie",combat:"Kampf",
  mindForge:"Gedankenschmiede",forge:"Schmieden",archives:"Die Archive",archive:"Archive",imperialDispatches:"Imperiale Depeschen",allNews:"Alle Nachrichten",
  constitution:"Die Verfassung",law:"Imperiales Gesetz",citizenEmpire:"Bürger des Imperiums",battles:"Kämpfe",victories:"Siege",sovereignty:"SOUVERÄNITÄT · VERMÄCHTNIS · UNSTERBLICHKEIT",oracleGreeting:"Das Orakel hört dich. Stelle deine Frage, Bürger.",
  oracleThinking:"Das Orakel befragt die Leere…",oracleError:"Verbindung zum Orakel unterbrochen. Verbindung wird wiederhergestellt…",awakened:"ERWACHT",eternalQuote:"Das schlummernde Imperium muss erwachen, um ewig zu leben",
  breaking:"Eilmeldung",footSoldier1:"Fußsoldat I",footSoldier2:"Fußsoldat II",knight1:"Ritter I",knight2:"Ritter II",commander1:"Kommandant I",commander2:"Kommandant II",imperialChampion:"Imperialer Champion",
  decree1:"Information: Rekordzahl an Musikstimmen in den letzten 24 Stunden",decree2:"KI-Prognose: Fußball-Würdigungen sind um 40 % gestiegen",decree3:"KI-Warnung: Arena Strike liegt beim Dreifachen seines üblichen Würdigungsstroms",decree4:"Warnung: Crypto Clash widerspricht diese Woche allen Prognosen",decree5:"System: Das KI-Orakel verarbeitete 12.400 Würdigungen mit 99,8 % Genauigkeit",
  openPulse:"Empire Pulse öffnen",fullCalendar:"Vollständiger Kalender",rewardSystem:"BELOHNUNGSSYSTEM",rewardIntro:"Jede Aktion stärkt das Imperium. Jeder Beitrag wird belohnt.",
  watchLecture:"Vortrag ansehen",watchLectureDesc:"In den HÖHEPUNKTEN einer Legende",joinDebate:"An einer Debatte teilnehmen",joinDebateDesc:"In der GLOBALEN ARENA",postStory:"Geschichte veröffentlichen",postStoryDesc:"Im KOMMUNIKATIONSZENTRUM",empireAwake:"DAS IMPERIUM IST ERWACHT 🔥",empireNeverSleeps:"Das Imperium schläft nie — es entwickelt sich, wächst und erobert.",topLegends:"TOP 10 LEGENDEN",empirePulse:"EMPIRE PULSE",
  celebrationsHub:"FEIERZENTRUM DES IMPERIUMS",celebrationsIntro:"Teile Kunst · Ideen · Videos während weltweiter Feierlichkeiten.",bestContribution:"Bester Beitrag = 🏛️ Imperialer Lorbeer + 500 Coins",
  liveEvents:"Live-Veranstaltungen",totalEvents:"Veranstaltungen insgesamt",topCoinsPrize:"Höchster Coin-Preis",liveCelebrations:"🔴 LIVE-FEIERLICHKEITEN",upcomingCelebrations:"BEVORSTEHENDE FEIERLICHKEITEN",
  perEntry:"Coins pro Beitrag",bestEntry:"Bester Beitrag",imperialLaurel:"Imperialer Lorbeer",submitContribution:"Reiche deinen Beitrag ein",shareEntry:"Teile deinen Beitrag vom Typ {type} — Analyse, Würdigung, Kunst oder Idee…",
  submitting:"Wird eingereicht…",submit:"{type} einreichen",loginParticipate:"Melde dich an, um teilzunehmen und um den Imperialen Lorbeer zu kämpfen",contributions:"BEITRÄGE",entries:"Beiträge",firstContribution:"Sei der Erste, der etwas beiträgt.",
  selectCelebration:"Feierlichkeit auswählen",greatestMoments:"Erlebe die größten Momente des Imperiums",top:"Top",text:"Text",idea:"Idee",art:"Kunst",video:"Video",sport:"Sport",science:"Wissenschaft",holiday:"Feiertag",music:"Musik",global:"Global",eventsTracker:"INTERNATIONALE LIVE-VERANSTALTUNGEN — IMPERIUMS-TRACKER",
  eventsIntro:"Die größten Momente der Welt — Sport, Technologie, Musik, Wirtschaft. Die Bürger des Imperiums verfolgen sie alle in Echtzeit.",liveNow:"Jetzt live",megaEvents:"Mega-Events",liveRightNow:"🔴 JETZT LIVE",
  upcomingSorted:"BEVORSTEHENDE VERANSTALTUNGEN — NACH DATUM",upcomingDomain:"BEVORSTEHENDE {domain}-VERANSTALTUNGEN",joinPulse:"Beteilige dich an der Diskussion auf Empire Pulse",impact:"Einfluss",tech:"Technologie",business:"Wirtschaft",cinema:"Kino",
  nostalgiaHero:"NOSTALGIE-DNA — DIE VERGANGENHEIT LEBT",nostalgiaIntro:"Jede Legende beginnt mit einer Geschichte. Das ist ihre.",childhood:"KINDHEIT",training:"TRAINING",breakthrough:"DURCHBRUCH",stardom:"RUHM",
  momentsHero:"HÖHEPUNKTE — GRÖSSTE ERFOLGE",watchReward:"▶ Sieh dir ein Video an und erhalte +20 XP",arenaHero:"GLOBALE ARENA — VORTRÄGE · DEBATTEN · KONFERENZEN",joinReward:"Nimm an Veranstaltungen teil und erhalte 50 Coins pro Sitzung",
  upcomingEvents:"BEVORSTEHENDE VERANSTALTUNGEN",joined:"✓ Beigetreten +50 🪙",join:"BEITRETEN +50 🪙",loginJoin:"Zum Beitreten anmelden",noArena:"In diesem Bereich gibt es noch keine Arena-Veranstaltungen.",communicationHub:"KOMMUNIKATIONSZENTRUM",communicationIntro:"Chat · Geschichten · Vernetzen · Teilen",
  liveChat:"💬 Live-Chat",debate:"Debatte",stories:"📖 Geschichten",posts24:"Beiträge in 24 Std.",debateReward:"+50 XP und +50 Coins pro Debattenbeitrag",firstSpeak:"Sprich als Erster in dieser Arena.",speakPlaceholder:"Sprich in der Arena…",loginDebatePlaceholder:"Melde dich an, um an der Debatte teilzunehmen…",
  lecture:"Vortrag",conference:"Konferenz",summit:"Gipfel",
  storyReward:"+10 Coins pro Geschichte",posting:"Wird veröffentlicht…",postStoryButton:"📖 Geschichte veröffentlichen",noStories:"Noch keine Geschichten — veröffentliche die erste.",hoursLeft:"Noch {count} Std.",loadingArchive:"Neurales Archiv wird geladen…",
  legendNotFound:"Legende nicht gefunden",backTop:"Zurück zu den TOP 10 LEGENDEN",champion:"CHAMPION",nostalgiaTab:"NOSTALGIE-DNA",momentsTab:"HÖHEPUNKTE",arenaTab:"GLOBALE ARENA",commsTab:"KOMMUNIKATIONSZENTRUM",
};

export const surfaceCopyLocales = { en, fr, ar, es, de } as const satisfies Record<Lang, SurfaceCopy>;
export const surfaceCopyKeys = Object.freeze(Object.keys(en) as Array<keyof SurfaceCopy>);
const surfaceCopyByLang: Record<Lang, SurfaceCopy> = { en, fr, ar, es, de };

export function surfaceCopy(lang: Lang): SurfaceCopy {
  return surfaceCopyByLang[lang];
}
export const localeFor = (lang: Lang) => ({ en: "en-US", fr: "fr-FR", ar: "ar-MA", es: "es-ES", de: "de-DE" } as const)[lang];
export const formatNumber = (value: number, lang: Lang) => new Intl.NumberFormat(localeFor(lang)).format(value);
export const formatDate = (value: string | Date, lang: Lang, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Intl.DateTimeFormat(localeFor(lang), options).format(new Date(value));
export function relativeTime(value: string | Date, lang: Lang) {
  const delta = new Date(value).getTime() - Date.now();
  const abs = Math.abs(delta);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] = abs < 60000 ? [Math.round(delta / 1000), "second"] : abs < 3600000 ? [Math.round(delta / 60000), "minute"] : abs < 86400000 ? [Math.round(delta / 3600000), "hour"] : [Math.round(delta / 86400000), "day"];
  return new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" }).format(amount, unit);
}
export const interpolate = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));