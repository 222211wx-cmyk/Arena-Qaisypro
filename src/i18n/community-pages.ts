export type CommunityLocale = "en" | "fr" | "ar" | "es" | "de";

type Copy = Record<string, string>;

const en: Copy = {
  admin_title: "Control panel", admin_subtitle: "Site control", admin_only: "This area is for administrators only. You will be redirected to the main choice.",
  back_choice: "Back to choice", dashboard: "Dashboard", dashboard_desc: "Imperial dashboard and council reports.",
  missions: "Missions", missions_desc: "Missions and task surfaces (Archon system).", finance: "Finance 70/30", finance_desc: "70/30 revenue split and finance controls.",
  revenue: "Revenue", revenue_desc: "Revenue ledger and admin accounting.", wallet: "Wallet", wallet_desc: "Treasury and wallet operations.",
  statistics: "Statistics", statistics_desc: "Leaderboards and platform statistics.",
  online: "Online", thinking: "Thinking…", server_error: "Server error", connection_failed: "Connection failed", send_message: "Send message",
  citizen_not_found: "Citizen not found", back_citizens: "Back to Citizens", share: "Share", joined: "Joined", compare: "Compare",
  followers_empty: "No followers yet", following_empty: "Not following anyone yet", achievements: "Achievements", recent_activity: "Recent Empire Activity",
  protocol_violations: "Protocol Violations", trending_gdna: "Trending on GDNA", muted: "Muted",
  search_citizen: "Search citizen", citizen_username: "Citizen username", login: "Log in", imperial_legend: "Imperial Legend", error: "Error",
};

const fr: Copy = {
  admin_title: "Panneau de contrôle", admin_subtitle: "Contrôle du site", admin_only: "Cet espace est réservé aux administrateurs. Vous serez redirigé vers le choix principal.",
  back_choice: "Retour au choix", dashboard: "Tableau de bord", dashboard_desc: "Tableau de bord impérial et rapports du conseil.",
  missions: "Missions", missions_desc: "Missions et tâches (système Archon).", finance: "Finance 70/30", finance_desc: "Répartition des revenus 70/30 et contrôles financiers.",
  revenue: "Revenus", revenue_desc: "Grand livre des revenus et comptabilité administrateur.", wallet: "Portefeuille", wallet_desc: "Opérations de trésorerie et portefeuille.",
  statistics: "Statistiques", statistics_desc: "Classements et statistiques de la plateforme.",
  online: "En ligne", thinking: "Réflexion…", server_error: "Erreur serveur", connection_failed: "Connexion échouée", send_message: "Envoyer le message",
  citizen_not_found: "Citoyen introuvable", back_citizens: "Retour aux citoyens", share: "Partager", joined: "Inscrit", compare: "Comparer",
  followers_empty: "Pas encore d’abonnés", following_empty: "Ne suit encore personne", achievements: "Succès", recent_activity: "Activité récente de l’empire",
  protocol_violations: "Violations du protocole", trending_gdna: "Tendance sur GDNA", muted: "En sourdine",
  search_citizen: "Rechercher un citoyen", citizen_username: "Nom d’utilisateur du citoyen", login: "Se connecter", imperial_legend: "Légende impériale", error: "Erreur",
};

const ar: Copy = {
  admin_title: "لوحة التحكم", admin_subtitle: "التحكم بالموقع", admin_only: "هذه المنطقة مخصصة للمسؤولين فقط. ستتم إعادتك إلى الاختيار الرئيسي.",
  back_choice: "العودة للاختيار", dashboard: "لوحة الإحصاء", dashboard_desc: "لوحة الإمبراطورية وتقارير المجلس.",
  missions: "المهمات", missions_desc: "المهمات ومساحات المهام (نظام Archon).", finance: "المالية 70/30", finance_desc: "تقسيم الإيرادات 70/30 وضوابط المالية.",
  revenue: "الإيرادات", revenue_desc: "دفتر الإيرادات ومحاسبة الإدارة.", wallet: "المحفظة", wallet_desc: "عمليات الخزينة والمحفظة.",
  statistics: "الإحصائيات", statistics_desc: "لوحات الصدارة وإحصائيات المنصة.",
  online: "متصل", thinking: "جارٍ التفكير…", server_error: "خطأ في الخادم", connection_failed: "فشل الاتصال", send_message: "إرسال الرسالة",
  citizen_not_found: "لم يُعثر على المواطن", back_citizens: "العودة إلى المواطنين", share: "مشاركة", joined: "انضم", compare: "مقارنة",
  followers_empty: "لا متابعين بعد", following_empty: "لا يتابع أحداً بعد", achievements: "الإنجازات", recent_activity: "نشاط الإمبراطورية الأخير",
  protocol_violations: "مخالفات البروتوكول", trending_gdna: "رائج على GDNA", muted: "مكتوم",
  search_citizen: "ابحث عن مواطن", citizen_username: "اسم مستخدم المواطن", login: "تسجيل الدخول", imperial_legend: "أسطورة إمبراطورية", error: "خطأ",
};

const es: Copy = {
  admin_title: "Panel de control", admin_subtitle: "Control del sitio", admin_only: "Esta zona es solo para administradores. Serás redirigido a la selección principal.",
  back_choice: "Volver a la selección", dashboard: "Panel", dashboard_desc: "Panel imperial e informes del consejo.",
  missions: "Misiones", missions_desc: "Misiones y tareas (sistema Archon).", finance: "Finanzas 70/30", finance_desc: "Reparto de ingresos 70/30 y controles financieros.",
  revenue: "Ingresos", revenue_desc: "Libro de ingresos y contabilidad administrativa.", wallet: "Cartera", wallet_desc: "Operaciones de tesorería y cartera.",
  statistics: "Estadísticas", statistics_desc: "Clasificaciones y estadísticas de la plataforma.",
  online: "En línea", thinking: "Pensando…", server_error: "Error del servidor", connection_failed: "Error de conexión", send_message: "Enviar mensaje",
  citizen_not_found: "Ciudadano no encontrado", back_citizens: "Volver a Ciudadanos", share: "Compartir", joined: "Se unió", compare: "Comparar",
  followers_empty: "Aún no hay seguidores", following_empty: "No sigue a nadie todavía", achievements: "Logros", recent_activity: "Actividad reciente del imperio",
  protocol_violations: "Infracciones del protocolo", trending_gdna: "Tendencia en GDNA", muted: "Silenciado",
  search_citizen: "Buscar ciudadano", citizen_username: "Nombre de usuario del ciudadano", login: "Iniciar sesión", imperial_legend: "Leyenda imperial", error: "Error",
};

const de: Copy = {
  admin_title: "Kontrollzentrum", admin_subtitle: "Website-Steuerung", admin_only: "Dieser Bereich ist ausschließlich für Administratoren vorgesehen. Du wirst zur Hauptauswahl weitergeleitet.",
  back_choice: "Zurück zur Auswahl", dashboard: "Dashboard", dashboard_desc: "Imperiales Dashboard und Berichte des Rates.",
  missions: "Missionen", missions_desc: "Missionen und Aufgabenbereiche (Archon-System).", finance: "Finanzen 70/30", finance_desc: "70/30-Umsatzaufteilung und Finanzsteuerung.",
  revenue: "Umsatz", revenue_desc: "Umsatzbuch und Verwaltungsbuchhaltung.", wallet: "Wallet", wallet_desc: "Treasury- und Wallet-Vorgänge.",
  statistics: "Statistiken", statistics_desc: "Bestenlisten und Plattformstatistiken.",
  online: "Online", thinking: "Denke nach…", server_error: "Serverfehler", connection_failed: "Verbindung fehlgeschlagen", send_message: "Nachricht senden",
  citizen_not_found: "Bürger nicht gefunden", back_citizens: "Zurück zu den Bürgern", share: "Teilen", joined: "Beigetreten", compare: "Vergleichen",
  followers_empty: "Noch keine Follower", following_empty: "Folgt noch niemandem", achievements: "Erfolge", recent_activity: "Neueste Aktivitäten im Imperium",
  protocol_violations: "Protokollverstöße", trending_gdna: "Im Trend auf GDNA", muted: "Stummgeschaltet",
  search_citizen: "Bürger suchen", citizen_username: "Benutzername des Bürgers", login: "Anmelden", imperial_legend: "Imperiale Legende", error: "Fehler",
};

export const COMMUNITY_T: Record<CommunityLocale, Copy> = { en, fr, ar, es, de };