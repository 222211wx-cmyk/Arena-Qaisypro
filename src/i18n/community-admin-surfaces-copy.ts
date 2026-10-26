import type { Lang } from "@/contexts/LangContext";

type Values = Record<string, string | number>;
export type SupportedLocale = Lang;
export type Entry = Record<SupportedLocale, string>;

export const COMMUNITY_SURFACES_COPY = {
  initiationPending: { en: "INITIATION PENDING", fr: "INITIATION EN ATTENTE", ar: "بدء المسار معلّق", es: "INICIACIÓN PENDIENTE" , de: "EINLEITUNG AUSSTEHEND"},
  initiationIncomplete: { en: "This citizen has not completed Archon initiation", fr: "Ce citoyen n’a pas terminé l’initiation Archon", ar: "لم يُكمل هذا المواطن بدء مسار Archon", es: "Este ciudadano no ha completado la iniciación Archon" , de: "Dieser Bürger hat die Archon-Einweihung nicht abgeschlossen"},
  empireIdentity: { en: "EMPIRE IDENTITY", fr: "IDENTITÉ DE L’EMPIRE", ar: "هوية الإمبراطورية", es: "IDENTIDAD DEL IMPERIO" , de: "EMPIRE-IDENTITÄT"},
  classified: { en: "CLASSIFIED", fr: "CLASSIFIÉ", ar: "سري", es: "CLASIFICADO" , de: "VERTRAULICH"},
  archonArchetype: { en: "ARCHON ARCHETYPE", fr: "ARCHÉTYPE ARCHON", ar: "نمط ARCHON", es: "ARQUETIPO ARCHON" , de: "ARCHON-ARCHETYP"},
  cipherCode: { en: "CIPHER CODE", fr: "CODE CHIFFRÉ", ar: "رمز التشفير", es: "CÓDIGO CIFRADO" , de: "CHIFFRIERCODE"},
  fourPillars: { en: "FOUR PILLARS — GROWTH ENGINE", fr: "QUATRE PILIERS — MOTEUR DE CROISSANCE", ar: "الركائز الأربع — محرك النمو", es: "CUATRO PILARES — MOTOR DE CRECIMIENTO" , de: "VIER SÄULEN — WACHSTUMSMOTOR"},
  comparison: { en: "ARCHON COMPARISON", fr: "COMPARAISON ARCHON", ar: "مقارنة ARCHON", es: "COMPARACIÓN ARCHON" , de: "ARCHON-VERGLEICH"},
  leftCitizen: { en: "LEFT CITIZEN", fr: "CITOYEN DE GAUCHE", ar: "المواطن على اليسار", es: "CIUDADANO IZQUIERDO" , de: "LINKER BÜRGER"},
  rightCitizen: { en: "RIGHT CITIZEN", fr: "CITOYEN DE DROITE", ar: "المواطن على اليمين", es: "CIUDADANO DERECHO" , de: "RECHTER BÜRGER"},
  score: { en: "/ 100 SCORE", fr: "/ 100 SCORE", ar: "/ 100 النتيجة", es: "/ 100 PUNTUACIÓN" , de: "/ 100 PUNKTE"},
  leadsIn: { en: "{name} leads in {count}", fr: "{name} mène dans {count}", ar: "{name} يتقدم في {count}", es: "{name} lidera en {count}" , de: "{name} führt in {count}"},
  dimensionsHead: { en: "SEVEN DIMENSIONS — HEAD TO HEAD", fr: "SEPT DIMENSIONS — FACE À FACE", ar: "الأبعاد السبعة — وجهاً لوجه", es: "SIETE DIMENSIONES — CARA A CARA" , de: "SIEBEN DIMENSIONEN — KOPF AN KOPF"},
  kingPoints: { en: "KING LEAGUE POINTS", fr: "POINTS DE LA LIGUE DES ROIS", ar: "نقاط دوري الملوك", es: "PUNTOS DE LA LIGA DE REYES" , de: "Ligapunkte"},
  privateLocked: { en: "Private data locked", fr: "Données privées verrouillées", ar: "بيانات خاصة مقفلة", es: "Datos privados bloqueados" , de: "Private Daten gesperrt"},
  privateDescription: { en: "Sensitive data is protected. Only the username, title, rank, and King League points are public.", fr: "Les données sensibles sont protégées. Seuls le nom d’utilisateur, le titre, le rang et les points de la Ligue des Rois sont publics.", ar: "البيانات الحساسة محمية. الاسم واللقب والرتبة ونقاط دوري الملوك فقط هي بيانات عامة.", es: "Los datos sensibles están protegidos. Solo son públicos el nombre de usuario, título, rango y puntos de la Liga de Reyes." , de: "Sensible Daten sind geschützt. Nur der Benutzername, der Titel, der Rang und die King League-Punkte sind öffentlich."},
  shareProfile: { en: "Share profile", fr: "Partager le profil", ar: "مشاركة الملف الشخصي", es: "Compartir perfil" , de: "Profil teilen"},
  alreadyHonored: { en: "You have already honored this citizen.", fr: "Vous avez déjà honoré ce citoyen.", ar: "سبق أن كرّمت هذا المواطن.", es: "Ya has honrado a este ciudadano." , de: "Du hast diesen Bürger bereits geehrt."},
  viewCitizens: { en: "View all citizens", fr: "Voir tous les citoyens", ar: "عرض جميع المواطنين", es: "Ver todos los ciudadanos" , de: "Alle Bürger anzeigen"},
  honorPoints: { en: "{count} honor points", fr: "{count} points d’honneur", ar: "{count} نقطة شرف", es: "{count} puntos de honor" , de: "{count} Ehrenpunkte"},
  nextTitle: { en: "{count} for next title", fr: "{count} pour le prochain titre", ar: "{count} للقب التالي", es: "{count} para el siguiente título" , de: "{count} für nächsten Titel"},
  nextRank: { en: "{count} next rank", fr: "{count} prochain rang", ar: "{count} للرتبة التالية", es: "{count} para el siguiente rango" , de: "{count} nächster Rang"},
  maxRank: { en: "⚡ MAX RANK — EMPEROR", fr: "⚡ RANG MAXIMAL — EMPEREUR", ar: "⚡ أعلى رتبة — الإمبراطور", es: "⚡ RANGO MÁXIMO — EMPERADOR" , de: "⚡ MAX. RANG — KAISER"},
  domain: { en: "{name} DOMAIN", fr: "DOMAINE {name}", ar: "مجال {name}", es: "DOMINIO {name}" , de: "{name}-DOMAIN"},
  achievementsCount: { en: "{earned}/{total} achievements", fr: "{earned}/{total} succès", ar: "{earned}/{total} إنجازات", es: "{earned}/{total} logros" , de: "{earned}/{total} Erfolge"},
  message: { en: "Message", fr: "Message", ar: "رسالة", es: "Mensaje" , de: "Meldung"},
  voice: { en: "Voice", fr: "Audio", ar: "صوتي", es: "Voz" , de: "Stimme"},
  video: { en: "Video", fr: "Vidéo", ar: "فيديو", es: "Vídeo" , de: "Video"},
  honorDone: { en: "Honored! Thank you.", fr: "Honneur accordé ! Merci.", ar: "تم التكريم! شكراً لك.", es: "¡Honor concedido! Gracias." , de: "Geehrt! Vielen Dank."},
  honorCitizen: { en: "Honor {name}", fr: "Honorer {name}", ar: "كرّم {name}", es: "Honrar a {name}" , de: "Ehre {name}"},
  followers: { en: "FOLLOWERS", fr: "ABONNÉS", ar: "المتابعون", es: "SEGUIDORES" , de: "FOLLOWERS"},
  following: { en: "FOLLOWING", fr: "ABONNEMENTS", ar: "المتابَعون", es: "SIGUIENDO" , de: "FOLGT"},
  recentlyHonored: { en: "RECENTLY HONORED BY", fr: "RÉCEMMENT HONORÉ PAR", ar: "كُرّم مؤخراً من", es: "HONRADO RECIENTEMENTE POR" , de: "KÜRZLICH GEEHRT VON"},
  pillarStreaks: { en: "Empire Pillar Streaks", fr: "Séries des piliers de l’Empire", ar: "سلاسل ركائز الإمبراطورية", es: "Rachas de pilares del Imperio" , de: "Serien der Imperiumssäulen"},
  today: { en: "today", fr: "aujourd’hui", ar: "اليوم", es: "hoy" , de: "heute"},
  honorProtocol: { en: "CITIZEN HONOR SYSTEM — PROTOCOL", fr: "SYSTÈME D’HONNEUR CITOYEN — PROTOCOLE", ar: "نظام شرف المواطن — البروتوكول", es: "SISTEMA DE HONOR CIUDADANO — PROTOCOLO" , de: "BÜRGER-EHRENSYSTEM"},
  antiTrivial: { en: "Anti-Trivial Protocol:", fr: "Protocole anti-futilité :", ar: "بروتوكول مكافحة التفاهة:", es: "Protocolo antitrivial:" , de: "Anti-Trivial-Protokoll:"},
  antiTrivialBody: { en: "Citizens who post memes, trash, or off-topic content receive violations. Only Education · Sport · Science · Art · Business · Debates · Achievements are honored.", fr: "Les citoyens qui publient des mèmes, des déchets ou du contenu hors sujet reçoivent des infractions. Seuls Éducation · Sport · Science · Art · Affaires · Débats · Succès sont honorés.", ar: "يتلقى المواطنون الذين ينشرون الميمات أو المحتوى الرديء أو الخارج عن الموضوع مخالفات. لا يُكرّم إلا التعليم · الرياضة · العلوم · الفن · الأعمال · المناظرات · الإنجازات.", es: "Los ciudadanos que publiquen memes, basura o contenido ajeno reciben infracciones. Solo se honra Educación · Deporte · Ciencia · Arte · Negocios · Debates · Logros." , de: "Bürger, die Memes, Papierkorb oder Off-Topic-Inhalte posten, erhalten Verstöße. Nur Bildung · Sport · Wissenschaft · Kunst · Wirtschaft · Debatten · Errungenschaften werden geehrt."},
  newCitizen: { en: "New Citizen", fr: "Nouveau citoyen", ar: "مواطن جديد", es: "Ciudadano nuevo" , de: "Neuer Bürger"},
  trusted: { en: "Trusted", fr: "Fiable", ar: "موثوق", es: "De confianza" , de: "Vertrauenswürdig"},
  respected: { en: "Respected", fr: "Respecté", ar: "محترم", es: "Respetado" , de: "geachtete"},
  honorable: { en: "Honorable", fr: "Honorable", ar: "مشرّف", es: "Honorable" , de: "Ehrbar"},
  distinguished: { en: "Distinguished", fr: "Distingué", ar: "متميز", es: "Distinguido" , de: "Ausgezeichnet"},
  imperialLegend: { en: "Imperial Legend", fr: "Légende impériale", ar: "أسطورة إمبراطورية", es: "Leyenda imperial" , de: "Kaiserliche Legende"},
  honorPts: { en: "{count}+ honor pts", fr: "{count}+ pts d’honneur", ar: "{count}+ نقطة شرف", es: "{count}+ pts de honor" , de: "{count}+ Ehrenpunkte"},
  justNow: { en: "just now", fr: "à l’instant", ar: "الآن", es: "ahora mismo" , de: "gerade eben"},
  ago: { en: "{value} ago", fr: "il y a {value}", ar: "منذ {value}", es: "hace {value}" , de: "Vor {value}"},
  sport: { en:"Sport",fr:"Sport",ar:"رياضة",es:"Deporte" , de: "Sport"}, tech:{en:"Technology",fr:"Technologie",ar:"تكنولوجيا",es:"Tecnología", de: "technik"}, music:{en:"Music",fr:"Musique",ar:"موسيقى",es:"Música", de: "Musik"}, business:{en:"Business",fr:"Affaires",ar:"أعمال",es:"Negocios", de: "Geschäft"}, cinema:{en:"Cinema",fr:"Cinéma",ar:"سينما",es:"Cine", de: "Programmkino"}, general:{en:"General",fr:"Général",ar:"عام",es:"General", de: "Allgemeine Konfiguration (Common)"},
  dimVolontas:{en:"Conqueror’s will",fr:"Volonté du conquérant",ar:"إرادة الفاتح",es:"Voluntad del conquistador", de: "Wille des Eroberers"},
  dimResilentia:{en:"Warrior’s resilience",fr:"Résilience du guerrier",ar:"صلابة المحارب",es:"Resiliencia del guerrero", de: "Widerstandsfähigkeit des Kriegers"},
  dimIntellectus:{en:"Clarity of vision",fr:"Clarté de vision",ar:"وضوح الرؤية",es:"Claridad de visión", de: "Baja California Neu!"},
  dimDisciplina:{en:"Imperial discipline",fr:"Discipline impériale",ar:"الانضباط الإمبراطوري",es:"Disciplina imperial", de: "Kaiserliche Disziplin"},
  dimSocietas:{en:"Power of influence",fr:"Pouvoir d’influence",ar:"قوة التأثير",es:"Poder de influencia", de: "Beeinflussungsmacht"},
  dimAbundantia:{en:"Abundance mindset",fr:"Mentalité d’abondance",ar:"عقلية الوفرة",es:"Mentalidad de abundancia", de: "Abundance-Mentalität"},
  dimAuctoritas:{en:"Inner authority",fr:"Autorité intérieure",ar:"السلطة الداخلية",es:"Autoridad interior", de: "Innere Autorität"},
  chatTitle:{en:"GDN-AI Assistant",fr:"Assistant GDN-AI",ar:"مساعد GDN-AI",es:"Asistente GDN-AI", de: "GDN-AI-Assistent"},
  chatSubtitle:{en:"Your intelligent empire guide",fr:"Votre guide intelligent de l’Empire",ar:"دليلك الذكي في الإمبراطورية",es:"Tu guía inteligente del Imperio", de: "Dein intelligenter Imperium-Guide"},
  chatPlaceholder:{en:"Ask GDN-AI anything...",fr:"Posez une question à GDN-AI...",ar:"اسأل GDN-AI أي شيء...",es:"Pregunta cualquier cosa a GDN-AI...", de: "Fragen Sie GDN-AI alles..."},
  follow:{en:"Follow",fr:"Suivre",ar:"متابعة",es:"Seguir", de: "Folgen"}, xp:{en:"XP",fr:"XP",ar:"XP",es:"XP", de: "XP"}, coins:{en:"Coins",fr:"Pièces",ar:"العملات",es:"Monedas", de: "Münzen"}, honor:{en:"Honor",fr:"Honneur",ar:"الشرف",es:"Honor", de: "Ehre"}, games:{en:"Games",fr:"Jeux",ar:"الألعاب",es:"Juegos", de: "Spiele"}, winRate:{en:"Win rate",fr:"Taux de victoire",ar:"نسبة الفوز",es:"Tasa de victorias", de: "Gewinnquote"}, debates:{en:"Debates",fr:"Débats",ar:"المناظرات",es:"Debates", de: "Debatten"}, daysTotal:{en:"days total",fr:"jours au total",ar:"إجمالي الأيام",es:"días en total", de: "Tage insgesamt"},
  mensSub: { en: "Clarity · Vision · Authority", fr: "Clarté · Vision · Autorité", ar: "الوضوح · الرؤية · السلطة", es: "Claridad · Visión · Autoridad" , de: "Klarheit · Vision · Autorität"},
  visSub: { en: "Will · Discipline · Action", fr: "Volonté · Discipline · Action", ar: "الإرادة · الانضباط · العمل", es: "Voluntad · Disciplina · Acción" , de: "Wille · Disziplin · Aktion"},
  animaSub: { en: "Resilience · Influence · Connection", fr: "Résilience · Influence · Connexion", ar: "المرونة · التأثير · التواصل", es: "Resiliencia · Influencia · Conexión" , de: "Belastbarkeit · Einfluss · Verbindung"},
  legatumSub: { en: "Abundance · Balance · Legacy", fr: "Abondance · Équilibre · Héritage", ar: "الوفرة · التوازن · الإرث", es: "Abundancia · Equilibrio · Legado" , de: "Überfluss · Saldo · Vermächtnis"},
  archetypeSovereign: { en: "The Sovereign", fr: "Le Souverain", ar: "السيد المطلق", es: "El Soberano" , de: "Die hoheitliche"},
  archetypeConqueror: { en: "The Conqueror", fr: "Le Conquérant", ar: "الفاتح", es: "El Conquistador" , de: "Die Eroberer"},
  archetypeVisionary: { en: "The Visionary", fr: "Le Visionnaire", ar: "الرائي", es: "El Visionario" , de: "Der Titel"},
  archetypeArchitect: { en: "The Architect", fr: "L’Architecte", ar: "المعماري", es: "El Arquitecto" , de: "Der Architekt"},
  archetypeCatalyst: { en: "The Catalyst", fr: "Le Catalyseur", ar: "المحفّز", es: "El Catalizador" , de: "Der Katalysator"},
  archetypeSentinel: { en: "The Sentinel", fr: "La Sentinelle", ar: "الحارس", es: "El Centinela" , de: "Der Höhlenmaler"},
  archetypeSeeker: { en: "The Seeker", fr: "Le Chercheur", ar: "الباحث", es: "El Buscador" , de: "Der Suchende"},
  officialInvitation: { en: "Official Invitation", fr: "Invitation officielle", ar: "الدعوة الرسمية", es: "Invitación oficial" , de: "Geschäftseinladung"},
  optionalName: { en: "Name (optional)", fr: "Nom (facultatif)", ar: "اسم الشخصية (اختياري)", es: "Nombre (opcional)" , de: "Name (optional)"},
  nameExample: { en: "Example: Cristiano Ronaldo", fr: "Exemple : Cristiano Ronaldo", ar: "مثال: كريستيانو رونالدو", es: "Ejemplo: Cristiano Ronaldo" , de: "Beispiel: Cristiano Ronaldo"},
  language: { en: "Language", fr: "Langue", ar: "اللغة", es: "Idioma" , de: "Sprache"},
  field: { en: "Field", fr: "Domaine", ar: "المجال", es: "Campo" , de: "Gebiet"},
  decree: { en: "Official Honorary Decree", fr: "Décret honorifique officiel", ar: "مرسوم شرفي رسمي", es: "Decreto honorífico oficial" , de: "Offizieller Ehrenerlass"},
  imperialDecree: { en: "Imperial Decree", fr: "Décret impérial", ar: "مرسوم إمبراطوري", es: "Decreto imperial" , de: "Kaiserlicher Erlass"},
  copied: { en: "Copied!", fr: "Copié !", ar: "تم النسخ!", es: "¡Copiado!" , de: "Kopiert!"},
  copyMessage: { en: "Copy message", fr: "Copier le message", ar: "نسخ الرسالة", es: "Copiar mensaje" , de: "Nachricht kopieren"},
  howUse: { en: "How to use the message", fr: "Comment utiliser le message", ar: "كيف تستخدم الرسالة", es: "Cómo usar el mensaje" , de: "So verwenden Sie die Nachricht"},
  addName: { en: "Add their name", fr: "Ajoutez le nom", ar: "أضف اسم الشخصية", es: "Añade el nombre" , de: "Ihren Namen"},
  chooseLanguage: { en: "Choose their language", fr: "Choisissez sa langue", ar: "اختر لغتها المفضلة", es: "Elige su idioma" , de: "Wählen Sie ihre Sprache"},
  copySend: { en: "Copy and send", fr: "Copiez et envoyez", ar: "انسخ وأرسل", es: "Copia y envía" , de: "Kopieren und senden"},
} satisfies Record<string, Entry>;

export function surfaceText(lang: Lang, key: keyof typeof COMMUNITY_SURFACES_COPY, values: Values = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    COMMUNITY_SURFACES_COPY[key][lang],
  );
}

export function localeFor(lang: Lang): string {
  const locales: Record<Lang, string> = {
    en: "en-US",
    fr: "fr-FR",
    ar: "ar-MA",
    es: "es-ES",
    de: "de-DE",
  };
  return locales[lang];
}

export const LEGAL_COPY = {
  "Legal Center": { en:"Legal Center",fr:"Centre juridique",ar:"المركز القانوني",es:"Centro legal" , de: "Rechtszentrum"},
  "Country-adaptive compliance — full transparency": { en:"Country-adaptive compliance — full transparency",fr:"Conformité adaptée à votre pays — transparence totale",ar:"امتثال مُكيّف حسب بلدك — شفافية كاملة",es:"Cumplimiento adaptado a tu país — transparencia total" , de: "Länderadaptive Compliance — volle Transparenz"},
  "Your Country": { en:"Your Country",fr:"Votre pays",ar:"بلدك",es:"Tu país" , de: "Ihr Land"}, Terms:{en:"Terms",fr:"CGU",ar:"الشروط",es:"Términos", de: "Bedingungen"}, Privacy:{en:"Privacy",fr:"Confidentialité",ar:"الخصوصية",es:"Privacidad", de: "Datenschutz"}, Cookies:{en:"Cookies",fr:"Cookies",ar:"ملفات تعريف الارتباط",es:"Cookies", de: "Cookies"}, "Your Rights":{en:"Your Rights",fr:"Vos droits",ar:"حقوقك",es:"Tus derechos", de: "Ihre Rechte"},
  "Select your country to apply the correct legal framework automatically:": {en:"Select your country to apply the correct legal framework automatically:",fr:"Sélectionnez votre pays pour appliquer automatiquement le cadre juridique approprié :",ar:"اختر بلدك لتطبيق الإطار القانوني المناسب تلقائياً:",es:"Selecciona tu país para aplicar automáticamente el marco legal correcto:", de: "Wählen Sie Ihr Land aus, um den richtigen Rechtsrahmen automatisch anzuwenden:"},
  "Search your country...":{en:"Search your country...",fr:"Rechercher votre pays...",ar:"ابحث عن بلدك...",es:"Busca tu país...", de: "Suchen Sie hier nach Ihrem Land"},
  "Active Legal Framework":{en:"Active Legal Framework",fr:"Cadre juridique actif",ar:"الإطار القانوني المطبّق",es:"Marco legal activo", de: "Aktiver Rechtsrahmen"},
  "Games Minimum Age":{en:"Games Minimum Age",fr:"Âge minimum pour les jeux",ar:"السن الأدنى للألعاب",es:"Edad mínima para juegos", de: "Mindestalter für Spiele"},
  "Cookie Consent":{en:"Cookie Consent",fr:"Consentement aux cookies",ar:"موافقة ملفات الارتباط",es:"Consentimiento de cookies", de: "Cookie Einwilligung"},
  "Gaming Warning":{en:"Gaming Warning",fr:"Avertissement sur les jeux",ar:"تحذير الألعاب",es:"Aviso sobre juegos", de: "Gaming-Warnung"},
  "Coins Disclaimer":{en:"Coins Disclaimer",fr:"Avertissement sur les coins",ar:"تنبيه العملات",es:"Aviso sobre monedas", de: "Münz-Haftungsausschluss"},
  Required:{en:"Required",fr:"Requis",ar:"مطلوب",es:"Obligatorio", de: "Erforderlich"}, Optional:{en:"Optional",fr:"Facultatif",ar:"اختياري",es:"Opcional", de: "Optional"}, Active:{en:"Active",fr:"Actif",ar:"نشط",es:"Activo", de: "Aktiv"}, None:{en:"None",fr:"Aucun",ar:"لا يوجد",es:"Ninguno", de: "None"},
  "Applicable laws:":{en:"Applicable laws:",fr:"Lois applicables :",ar:"القوانين المطبّقة:",es:"Leyes aplicables:", de: "Geltende Gesetze"},
  "Terms of Service":{en:"Terms of Service",fr:"Conditions générales d’utilisation",ar:"شروط الاستخدام",es:"Términos del servicio", de: "Nutzungsbedingungen"},
  Acceptance:{en:"Acceptance",fr:"Acceptation",ar:"القبول",es:"Aceptación", de: "Akzeptanz"}, Eligibility:{en:"Eligibility",fr:"Admissibilité",ar:"الأهلية",es:"Elegibilidad", de: "Anspruchsberechtigung"}, "Virtual Currency":{en:"Virtual Currency",fr:"Monnaie virtuelle",ar:"العملة الافتراضية",es:"Moneda virtual", de: "Virtual Currency"}, Content:{en:"Content",fr:"Contenu",ar:"المحتوى",es:"Contenido", de: "Content"}, Disclaimer:{en:"Disclaimer",fr:"Limitation de responsabilité",ar:"إخلاء المسؤولية",es:"Descargo de responsabilidad", de: "Haftungsausschluss"}, "Governing Law":{en:"Governing Law",fr:"Droit applicable",ar:"القانون الحاكم",es:"Ley aplicable", de: "Geltendes Recht"},
  "By accessing Arena Qaisypro, you agree to these Terms. If you do not agree, please do not use the platform.":{en:"By accessing Arena Qaisypro, you agree to these Terms. If you do not agree, please do not use the platform.",fr:"En accédant à Arena Qaisypro, vous acceptez ces conditions. Si vous ne les acceptez pas, n’utilisez pas la plateforme.",ar:"باستخدام Arena Qaisypro، فإنك توافق على هذه الشروط. إذا لم توافق، يرجى عدم استخدام المنصة.",es:"Al acceder a Arena Qaisypro, aceptas estos términos. Si no estás de acuerdo, no utilices la plataforma.", de: "Indem du auf Arena Qaisypro zugreifst, stimmst du diesen Bedingungen zu. Wenn Sie damit nicht einverstanden sind, nutzen Sie die Plattform bitte nicht."},
  "The platform is open to all ages. Only the Games section requires users to be 18+ under local law.":{en:"The platform is open to all ages. Only the Games section requires users to be 18+ under local law.",fr:"La plateforme est ouverte à tous les âges. Seule la section Jeux exige 18 ans ou plus selon la loi locale.",ar:"المنصة متاحة لجميع الأعمار. قسم الألعاب فقط يتطلب 18 عاماً أو أكثر وفق القانون المحلي.",es:"La plataforma está abierta a todas las edades. Solo la sección Juegos exige ser mayor de 18 años según la ley local.", de: "Die Plattform ist offen für alle Altersgruppen. Nur im Bereich Spiele müssen Benutzer nach lokalem Recht mindestens 18Jahre alt sein."},
  "Content you post remains yours. You grant us a license to display it on the platform. We reserve the right to remove content that violates laws or these Terms.":{en:"Content you post remains yours. You grant us a license to display it on the platform. We reserve the right to remove content that violates laws or these Terms.",fr:"Le contenu publié reste le vôtre. Vous nous accordez une licence pour l’afficher. Nous pouvons supprimer tout contenu contraire aux lois ou à ces conditions.",ar:"يبقى المحتوى الذي تنشره ملكك. تمنحنا ترخيصاً لعرضه على المنصة. نحتفظ بحق إزالة المحتوى المخالف للقوانين أو لهذه الشروط.",es:"El contenido que publicas sigue siendo tuyo. Nos concedes licencia para mostrarlo. Podemos retirar contenido que infrinja las leyes o estos términos.", de: "Der Inhalt, den Sie posten, bleibt Ihnen überlassen. Sie erteilen uns eine Lizenz, diese auf der Plattform anzuzeigen. Wir behalten uns das Recht vor, Inhalte zu entfernen, die gegen Gesetze oder diese Bedingungen verstoßen."},
  "The platform is provided \"as is\" without warranties. We are not liable for any losses arising from use of the platform.":{en:"The platform is provided \"as is\" without warranties. We are not liable for any losses arising from use of the platform.",fr:"La plateforme est fournie « en l’état », sans garantie. Nous ne sommes pas responsables des pertes liées à son utilisation.",ar:"تُقدّم المنصة «كما هي» دون ضمانات. لا نتحمل مسؤولية الخسائر الناجمة عن استخدامها.",es:"La plataforma se ofrece «tal cual», sin garantías. No respondemos por pérdidas derivadas de su uso.", de: "Die Plattform wird „wie besehen“ ohne Gewähr zur Verfügung gestellt. Wir haften nicht für Verluste, die aus der Nutzung der Plattform entstehen."},
  "Privacy Policy":{en:"Privacy Policy",fr:"Politique de confidentialité",ar:"سياسة الخصوصية",es:"Política de privacidad", de: "Datenschutzrichtlinie"},
  "Data We Collect":{en:"Data We Collect",fr:"Données collectées",ar:"البيانات التي نجمعها",es:"Datos que recopilamos", de: "Welche Daten erfassen wir?"}, "How We Use Your Data":{en:"How We Use Your Data",fr:"Utilisation de vos données",ar:"كيف نستخدم بياناتك",es:"Cómo usamos tus datos", de: "Wie wir deine Daten verwenden"}, "Data Retention":{en:"Data Retention",fr:"Conservation des données",ar:"الاحتفاظ بالبيانات",es:"Conservación de datos", de: "Aufbewahrung von Daten"}, "AI Processing":{en:"AI Processing",fr:"Traitement par IA",ar:"معالجة الذكاء الاصطناعي",es:"Tratamiento con IA", de: "KI-Verarbeitung"},
  "We collect: username, email, platform activity (games, votes, posts), device data, and browser language.":{en:"We collect: username, email, platform activity (games, votes, posts), device data, and browser language.",fr:"Nous collectons : nom d’utilisateur, e-mail, activité sur la plateforme, données de l’appareil et langue du navigateur.",ar:"نجمع: اسم المستخدم والبريد الإلكتروني ونشاط المنصة وبيانات الجهاز ولغة المتصفح.",es:"Recopilamos: nombre de usuario, correo, actividad en la plataforma, datos del dispositivo e idioma del navegador.", de: "Wir erfassen: Benutzername, E-Mail, Plattformaktivität (Spiele, Stimmen, Beiträge), Gerätedaten und Browsersprache."},
  "We use your data to operate the service, improve experience, prevent fraud, and comply with law. We never sell your data.":{en:"We use your data to operate the service, improve experience, prevent fraud, and comply with law. We never sell your data.",fr:"Nous utilisons vos données pour exploiter le service, améliorer l’expérience, prévenir la fraude et respecter la loi. Nous ne les vendons jamais.",ar:"نستخدم بياناتك لتشغيل الخدمة وتحسين التجربة ومنع الاحتيال والامتثال للقانون. لا نبيع بياناتك أبداً.",es:"Usamos tus datos para operar el servicio, mejorar la experiencia, prevenir fraude y cumplir la ley. Nunca vendemos tus datos.", de: "Wir verwenden Ihre Daten, um den Dienst zu betreiben, die Erfahrung zu verbessern, Betrug zu verhindern und Gesetze einzuhalten. Wir verkaufen Ihre Daten niemals."},
  "We retain your data while your account is active. Upon account deletion, your data is removed within 30 days.":{en:"We retain your data while your account is active. Upon account deletion, your data is removed within 30 days.",fr:"Nous conservons vos données tant que votre compte est actif. Après sa suppression, elles sont effacées sous 30 jours.",ar:"نحتفظ ببياناتك ما دام حسابك نشطاً. عند حذفه، تُحذف بياناتك خلال 30 يوماً.",es:"Conservamos tus datos mientras tu cuenta esté activa. Al eliminarla, se borran en un plazo de 30 días.", de: "Wir behalten Ihre Daten, während Ihr Konto aktiv ist. Nach der Löschung Ihres Kontos werden Ihre Daten innerhalb von 30 Tagen gelöscht."},
  "The platform uses OpenAI for content moderation and AI features. Data sent to OpenAI is subject to OpenAI's privacy policy.":{en:"The platform uses OpenAI for content moderation and AI features. Data sent to OpenAI is subject to OpenAI's privacy policy.",fr:"La plateforme utilise OpenAI pour la modération et les fonctions d’IA. Les données envoyées sont soumises à la politique de confidentialité d’OpenAI.",ar:"تستخدم المنصة OpenAI للإشراف وميزات الذكاء الاصطناعي. تخضع البيانات المرسلة لسياسة خصوصية OpenAI.",es:"La plataforma usa OpenAI para moderación y funciones de IA. Los datos enviados están sujetos a la política de privacidad de OpenAI.", de: "Die Plattform verwendet OpenAI für die Moderation von Inhalten und KI-Funktionen. Daten, die an OpenAI gesendet werden, unterliegen der Datenschutzrichtlinie von OpenAI."},
  "Cookie Policy":{en:"Cookie Policy",fr:"Politique relative aux cookies",ar:"سياسة ملفات تعريف الارتباط",es:"Política de cookies", de: "Cookie-Richtlinie"}, Essential:{en:"Essential",fr:"Essentiel",ar:"ضروري",es:"Esencial", de: "Notwendig"}, Analytics:{en:"Analytics",fr:"Analytique",ar:"تحليلات",es:"Analítica", de: "Analysen"}, "Can reject":{en:"Can reject",fr:"Peut être refusé",ar:"قابل للرفض",es:"Se puede rechazar", de: "Kann ablehnen"},
  "Manage Your Consent":{en:"Manage Your Consent",fr:"Gérer votre consentement",ar:"إدارة موافقتك",es:"Gestionar tu consentimiento", de: "Verwalten Sie Ihre Einwilligung."}, "Accept All":{en:"Accept All",fr:"Tout accepter",ar:"قبول الكل",es:"Aceptar todo", de: "Alle akzeptieren"}, "Essential Only":{en:"Essential Only",fr:"Essentiels uniquement",ar:"الضروري فقط",es:"Solo esenciales", de: "Nur erforderliches"}, "Reject All":{en:"Reject All",fr:"Tout refuser",ar:"رفض الكل",es:"Rechazar todo", de: "Alle ablehnen"},
  "Login session":{en:"Login session",fr:"Session de connexion",ar:"جلسة تسجيل الدخول",es:"Sesión de inicio", de: "LogIn"}, "Language preference":{en:"Language preference",fr:"Préférence linguistique",ar:"تفضيل اللغة",es:"Preferencia de idioma", de: "Bevorzugte Sprache"}, "Legal compliance setup":{en:"Legal compliance setup",fr:"Configuration de conformité",ar:"إعداد الامتثال القانوني",es:"Configuración de cumplimiento", de: "Einrichtung der Rechtskonformität"}, "Consent tracking":{en:"Consent tracking",fr:"Suivi du consentement",ar:"تتبع الموافقة",es:"Registro del consentimiento", de: "Zustimmungsfreies Tracking"}, "Games age verification":{en:"Games age verification",fr:"Vérification de l’âge pour les jeux",ar:"التحقق من عمر الألعاب",es:"Verificación de edad para juegos", de: "Altersverifizierung der Spiele"}, "Performance improvement":{en:"Performance improvement",fr:"Amélioration des performances",ar:"تحسين الأداء",es:"Mejora del rendimiento", de: "Leistungssteigerung"},
} satisfies Record<string, Entry>;

export function legalText(lang: Lang, key: string): string {
  const entry = LEGAL_COPY[key as keyof typeof LEGAL_COPY];
  if (!entry) {
    throw new Error(`Missing legal copy key: ${key}`);
  }
  return entry[lang];
}

export const ADMIN_COPY = {
  pending:{en:"Pending",fr:"En attente",ar:"قيد الانتظار",es:"Pendiente", de: "Ausstehend"}, approved:{en:"Approved",fr:"Approuvé",ar:"مقبول",es:"Aprobado", de: "Freigegeben"}, rejected:{en:"Rejected",fr:"Rejeté",ar:"مرفوض",es:"Rechazado", de: "Abgelehnt"}, paid:{en:"Paid",fr:"Payé",ar:"مدفوع",es:"Pagado", de: "Bezahlt ."},
  Period:{en:"Period",fr:"Période",ar:"الفترة",es:"Período", de: "Periode"}, Beneficiary:{en:"Beneficiary",fr:"Bénéficiaire",ar:"المستفيد",es:"Beneficiario", de: "Berechtigte"}, Provider:{en:"Provider",fr:"Prestataire",ar:"المزوّد",es:"Proveedor", de: "Anbieter"}, Amount:{en:"Amount",fr:"Montant",ar:"المبلغ",es:"Importe", de: "Betrag"}, Currency:{en:"Currency",fr:"Devise",ar:"العملة",es:"Moneda", de: "Währung"}, "Account (masked)":{en:"Account (masked)",fr:"Compte (masqué)",ar:"الحساب (مخفي)",es:"Cuenta (oculta)", de: "Konto (maskiert)"}, Created:{en:"Created",fr:"Créé",ar:"تاريخ الإنشاء",es:"Creado", de: "Erstellt"},
  "Payout updated":{en:"Payout updated",fr:"Versement mis à jour",ar:"تم تحديث الدفعة",es:"Pago actualizado", de: "Auszahlung aktualisiert"},
  "Manual payout marked":{en:"Manual payout {id} marked as {status}.",fr:"Le versement manuel {id} a été marqué « {status} ».",ar:"تم وضع علامة «{status}» على الدفعة اليدوية {id}.",es:"El pago manual {id} se marcó como «{status}».", de: "Manuelle Auszahlung {id} als {status} markiert."},
  "Transition failed":{en:"Transition failed",fr:"Échec de la transition",ar:"فشل تغيير الحالة",es:"Falló el cambio de estado", de: "Übergang fehlgeschlagen"},
  "No transitions":{en:"Status {status} — no further transitions available.",fr:"État {status} — aucune autre transition disponible.",ar:"الحالة {status} — لا تتوفر تغييرات أخرى.",es:"Estado {status} — no hay más cambios disponibles.", de: "Status {status} — keine weiteren Übergänge vorhanden."},
  "Dashboard subtitle":{en:"Fiat balances, reconciliation, and monthly manual payout review.",fr:"Soldes fiduciaires, rapprochement et examen mensuel des versements manuels.",ar:"الأرصدة النقدية والمطابقة ومراجعة الدفعات اليدوية الشهرية.",es:"Saldos fiduciarios, conciliación y revisión mensual de pagos manuales.", de: "Fiat-Salden, Abstimmung und monatliche manuelle Auszahlungsüberprüfung."},
  "Simulation body":{en:"Balances reflect simulated ledger activity. Reconciliation only flags items — it never moves money. Manual payout state transitions are server writes, but no funds are transferred.",fr:"Les soldes reflètent une activité simulée. Le rapprochement signale seulement les éléments et ne déplace jamais d’argent. Les changements d’état sont enregistrés, sans transfert de fonds.",ar:"تعكس الأرصدة نشاط دفتر أستاذ محاكًى. لا تنقل المطابقة الأموال، بل تضع علامات للمراجعة فقط. تُحفظ تغييرات حالة الدفعات دون تحويل أموال.",es:"Los saldos reflejan actividad simulada. La conciliación solo marca elementos y nunca mueve dinero. Los cambios de estado se guardan, pero no se transfieren fondos.", de: "Salden spiegeln die simulierte Hauptbuchaktivität wider. Der Abgleich kennzeichnet nur Gegenstände — er bewegt nie Geld. Manuelle Auszahlungsstatusübergänge sind Server-Schreibvorgänge, aber es werden keine Gelder überwiesen."},
  "Offline body":{en:"You are offline. Data may be stale and actions are disabled.",fr:"Vous êtes hors ligne. Les données peuvent être obsolètes et les actions sont désactivées.",ar:"أنت غير متصل. قد تكون البيانات قديمة والإجراءات معطلة.",es:"No tienes conexión. Los datos pueden estar desactualizados y las acciones están deshabilitadas.", de: "Sie sind offline. Die Daten sind möglicherweise veraltet und die Aktionen sind deaktiviert."},
  "Admin required":{en:"This dashboard requires an admin session. Ensure you are logged in with an admin account.",fr:"Ce tableau de bord nécessite une session administrateur. Vérifiez que vous êtes connecté avec un compte administrateur.",ar:"تتطلب لوحة التحكم جلسة مسؤول. تأكد من تسجيل الدخول بحساب مسؤول.",es:"Este panel requiere una sesión de administrador. Inicia sesión con una cuenta de administrador.", de: "Dieses Dashboard erfordert eine Admin-Sitzung. Stellen Sie sicher, dass Sie mit einem Admin-Konto angemeldet sind."},
  "Reconciliation body":{en:"Read-safe pass — flags items for manual review. Never moves funds automatically.",fr:"Vérification sans écriture — signale les éléments pour examen manuel. Aucun transfert automatique.",ar:"فحص آمن للقراءة — يضع علامات للمراجعة اليدوية ولا ينقل الأموال تلقائياً.",es:"Proceso seguro de solo lectura: marca elementos para revisión manual y nunca mueve fondos automáticamente.", de: "Lesesicherer Pass — kennzeichnet Elemente für die manuelle Überprüfung. Bewegt niemals Gelder automatisch."},
  "Reconciliation complete":{en:"Reconciliation complete. {count} issue(s) flagged for review.",fr:"Rapprochement terminé. {count} problème(s) signalé(s).",ar:"اكتملت المطابقة. تم وضع علامة على {count} مشكلة للمراجعة.",es:"Conciliación completada. Se marcaron {count} problema(s) para revisión.", de: "Abstimmung abgeschlossen. {count} Problem(e) zur Überprüfung markiert."},
  "Reconciliation failed":{en:"Reconciliation failed",fr:"Échec du rapprochement",ar:"فشلت المطابقة",es:"Falló la conciliación", de: "Abstimmung fehlgeschlagen"},
  pendingCount:{en:"{count} pending",fr:"{count} en attente",ar:"{count} قيد الانتظار",es:"{count} pendientes", de: "{count} ausstehend"},
  "No fiat balances":{en:"No fiat wallet balances recorded yet.",fr:"Aucun solde de portefeuille fiduciaire enregistré.",ar:"لم تُسجّل أرصدة محفظة نقدية بعد.",es:"Aún no hay saldos de cartera fiduciaria registrados.", de: "Es wurden noch keine Fiat-Wallet-Guthaben erfasst."},
} satisfies Record<string, Entry>;

export function adminText(lang: Lang, key: keyof typeof ADMIN_COPY, values: Values = {}): string {
  return Object.entries(values).reduce((text,[name,value]) => text.replaceAll(`{${name}}`, String(value)), ADMIN_COPY[key][lang]);
}