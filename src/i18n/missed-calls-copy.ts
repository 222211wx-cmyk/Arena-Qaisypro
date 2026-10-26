/**
 * missed-calls-copy — labels for the Missed Calls / Boîte d'appels inbox and the
 * honest Firebase / notification / sound status surfaces.
 *
 * OWNED by the classic-messenger call UI. Kept separate from
 * messenger-complete-copy so the call inbox translation surface stays scoped.
 *
 * No emojis anywhere. The exact Arabic missed-call type strings are product
 * contract copy and are reused verbatim across surfaces.
 */
export type MissedCallLocale = "en" | "fr" | "ar" | "es" | "de";

// EXACT contract strings — Arabic missed-call type labels. Do not alter.
export const MISSED_VIDEO_CALL_AR = "مكالمة فيديو فائتة";
export const MISSED_VOICE_CALL_AR = "مكالمة صوتية فائتة";

export interface MissedCallsCopy {
  // Inbox
  inbox_title: string;          // "Missed Calls" / "Boîte d'appels"
  inbox_empty: string;
  inbox_loading: string;
  inbox_error: string;
  inbox_retry: string;
  missed_video: string;         // "Missed video call"
  missed_voice: string;         // "Missed voice call"
  unseen_badge: string;         // a11y label for the unseen dot
  // Incoming / outgoing call phases
  incoming_call: string;        // fullscreen "Incoming call"
  answer: string;
  decline: string;
  ringing: string;              // outgoing "Ringing…"
  cancel: string;
  connecting: string;           // connecting phase (after accept, before media)
  // Firebase / notification / sound honesty
  status_title: string;
  status_in_app_available: string;
  status_background_not_configured: string;
  status_firebase_error: string;
  status_firebase_loading: string;
  enable_notifications: string; // notification permission CTA
  notifications_enabled: string;
  notifications_denied: string;
  enable_sound: string;         // soundBlocked CTA
}

const EN: MissedCallsCopy = {
  inbox_title: "Missed Calls",
  inbox_empty: "No missed calls",
  inbox_loading: "Loading missed calls",
  inbox_error: "Could not load missed calls",
  inbox_retry: "Retry",
  missed_video: "Missed video call",
  missed_voice: "Missed voice call",
  unseen_badge: "Unseen",
  incoming_call: "Incoming call",
  answer: "Answer",
  decline: "Decline",
  ringing: "Ringing…",
  cancel: "Cancel",
  connecting: "Connecting…",
  status_title: "Call notifications",
  status_in_app_available: "In-app calling is available while this tab is open.",
  status_background_not_configured: "Background notifications are optional and are not configured. In-app calling still works while this tab is open.",
  status_firebase_error: "Background notifications could not start. In-app calling still works.",
  status_firebase_loading: "Checking background notification setup…",
  enable_notifications: "Enable call notifications",
  notifications_enabled: "Call notifications are enabled.",
  notifications_denied: "Notifications are blocked in your browser settings.",
  enable_sound: "Enable call sound",
};

const FR: MissedCallsCopy = {
  inbox_title: "Boîte d'appels",
  inbox_empty: "Aucun appel manqué",
  inbox_loading: "Chargement des appels manqués",
  inbox_error: "Impossible de charger les appels manqués",
  inbox_retry: "Réessayer",
  missed_video: "Appel vidéo manqué",
  missed_voice: "Appel vocal manqué",
  unseen_badge: "Non vu",
  incoming_call: "Appel entrant",
  answer: "Répondre",
  decline: "Refuser",
  ringing: "Sonnerie…",
  cancel: "Annuler",
  connecting: "Connexion…",
  status_title: "Notifications d'appel",
  status_in_app_available: "Les appels dans l'application sont disponibles tant que cet onglet est ouvert.",
  status_background_not_configured: "Les notifications en arrière-plan sont facultatives et ne sont pas configurées. Les appels dans l'application restent disponibles dans cet onglet.",
  status_firebase_error: "Les notifications en arrière-plan n'ont pas pu démarrer. Les appels dans l'application fonctionnent toujours.",
  status_firebase_loading: "Vérification de la configuration des notifications en arrière-plan…",
  enable_notifications: "Activer les notifications d'appel",
  notifications_enabled: "Les notifications d'appel sont activées.",
  notifications_denied: "Les notifications sont bloquées dans les paramètres de votre navigateur.",
  enable_sound: "Activer le son des appels",
};

const AR: MissedCallsCopy = {
  inbox_title: "المكالمات الفائتة",
  inbox_empty: "لا توجد مكالمات فائتة",
  inbox_loading: "جارٍ تحميل المكالمات الفائتة",
  inbox_error: "تعذّر تحميل المكالمات الفائتة",
  inbox_retry: "إعادة المحاولة",
  missed_video: MISSED_VIDEO_CALL_AR,
  missed_voice: MISSED_VOICE_CALL_AR,
  unseen_badge: "غير مقروءة",
  incoming_call: "مكالمة واردة",
  answer: "رد",
  decline: "رفض",
  ringing: "يتصل... Ringing",
  cancel: "إلغاء",
  connecting: "جارٍ الاتصال…",
  status_title: "إشعارات المكالمات",
  status_in_app_available: "الاتصال داخل التطبيق متاح طالما أن هذه النافذة مفتوحة.",
  status_background_not_configured: "إشعارات الخلفية غير مُهيّأة (وهي اختيارية). يظل الاتصال داخل التطبيق متاحاً ما دامت هذه النافذة مفتوحة.",
  status_firebase_error: "تعذّر بدء إشعارات الخلفية. لا يزال الاتصال داخل التطبيق يعمل.",
  status_firebase_loading: "جارٍ التحقق من إعداد إشعارات الخلفية…",
  enable_notifications: "تفعيل إشعارات المكالمات",
  notifications_enabled: "إشعارات المكالمات مُفعّلة.",
  notifications_denied: "الإشعارات محظورة في إعدادات المتصفح.",
  enable_sound: "تفعيل صوت المكالمة",
};

const ES: MissedCallsCopy = {
  inbox_title: "Llamadas perdidas",
  inbox_empty: "No hay llamadas perdidas",
  inbox_loading: "Cargando llamadas perdidas",
  inbox_error: "No se pudieron cargar las llamadas perdidas",
  inbox_retry: "Reintentar",
  missed_video: "Videollamada perdida",
  missed_voice: "Llamada de voz perdida",
  unseen_badge: "No vista",
  incoming_call: "Llamada entrante",
  answer: "Responder",
  decline: "Rechazar",
  ringing: "Llamando…",
  cancel: "Cancelar",
  connecting: "Conectando…",
  status_title: "Notificaciones de llamada",
  status_in_app_available: "Las llamadas dentro de la aplicación están disponibles mientras esta pestaña esté abierta.",
  status_background_not_configured: "Las notificaciones en segundo plano son opcionales y no están configuradas. Las llamadas dentro de la aplicación siguen disponibles en esta pestaña.",
  status_firebase_error: "No se pudieron iniciar las notificaciones en segundo plano. Las llamadas dentro de la aplicación siguen funcionando.",
  status_firebase_loading: "Comprobando la configuración de notificaciones en segundo plano…",
  enable_notifications: "Activar notificaciones de llamada",
  notifications_enabled: "Las notificaciones de llamada están activadas.",
  notifications_denied: "Las notificaciones están bloqueadas en la configuración de tu navegador.",
  enable_sound: "Activar sonido de llamada",
};

const DE: MissedCallsCopy = {
  inbox_title: "Verpasste Anrufe",
  inbox_empty: "Keine verpassten Anrufe",
  inbox_loading: "Verpasste Anrufe werden geladen",
  inbox_error: "Verpasste Anrufe konnten nicht geladen werden",
  inbox_retry: "Erneut versuchen",
  missed_video: "Verpasster Videoanruf",
  missed_voice: "Verpasster Sprachanruf",
  unseen_badge: "Ungesehen",
  incoming_call: "Eingehender Anruf",
  answer: "Annehmen",
  decline: "Ablehnen",
  ringing: "Klingelt…",
  cancel: "Abbrechen",
  connecting: "Verbindung wird hergestellt…",
  status_title: "Anrufbenachrichtigungen",
  status_in_app_available: "In-App-Anrufe sind verfügbar, solange dieser Tab geöffnet ist.",
  status_background_not_configured: "Hintergrundbenachrichtigungen sind optional und nicht konfiguriert. In-App-Anrufe bleiben verfügbar, solange dieser Tab geöffnet ist.",
  status_firebase_error: "Hintergrundbenachrichtigungen konnten nicht gestartet werden. In-App-Anrufe funktionieren weiterhin.",
  status_firebase_loading: "Einrichtung der Hintergrundbenachrichtigungen wird geprüft…",
  enable_notifications: "Anrufbenachrichtigungen aktivieren",
  notifications_enabled: "Anrufbenachrichtigungen sind aktiviert.",
  notifications_denied: "Benachrichtigungen sind in den Browsereinstellungen blockiert.",
  enable_sound: "Anrufton aktivieren",
};

const MAP: Record<MissedCallLocale, MissedCallsCopy> = { en: EN, fr: FR, ar: AR, es: ES, de: DE };

export function getMissedCallsCopy(lang: string): MissedCallsCopy {
  return MAP[(lang as MissedCallLocale)] ?? EN;
}
