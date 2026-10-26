/**
 * royal-reserve-copy — labels for the Royal Reserve call credit + network display.
 * OWNED by the credit/network feature. Separate from messenger-complete-copy so
 * translation surfaces stay scoped to this integration.
 *
 * Royal Reserve = رصيد احتياطي (call credit only — never internet access).
 * No emojis anywhere. The Arabic activation + offline strings below are exact,
 * server-contract messages and must not be edited.
 */
export type ReserveLocale = "en" | "fr" | "ar" | "es" | "de";

// EXACT contract strings — do not translate or alter.
export const RESERVE_ACTIVATION_MESSAGE_AR =
  "تم تفعيل الرصيد الاحتياطي. سيتم خصم الرصيد عند الشحن التالي";
export const RESERVE_OFFLINE_MESSAGE_AR =
  "لا يوجد اتصال بالإنترنت. رصيدك الاحتياطي محفوظ، وستتمكن من استخدامه عند عودة الاتصال.";

export interface ReserveCopy {
  // Section titles
  credit_title: string;
  credit_subtitle: string;
  reserve_identity: string; // 'رصيد احتياطي'
  // Balance labels
  paid_minutes: string;
  reserve_minutes: string;
  minutes_unit: string;
  debt_label: string;
  no_debt: string;
  expires_in: string;
  expired: string;
  no_reserve: string;
  // Activation
  activate: string;
  activating: string;
  activate_help: string;      // explains the 15 MAD simulated debt / 120 min / 48h
  activate_consent: string;   // checkbox-style consent line
  activation_success: string; // exact AR string in ar; localized elsewhere but AR contract used for toast in ar
  activation_failed: string;
  cannot_activate: string;    // canActivate=false reason
  simulated_note: string;     // "simulated — no real charge"
  credit_load_failed: string; // could not load credit
  retry: string;
  // Debt / repay (sandbox)
  repay_title: string;
  repay: string;
  repaying: string;
  repay_sandbox_note: string; // DEV-only: no real funds move
  repay_failed: string;
  repay_success: string;
  debt_first_note: string;    // debt paid before further balance
  // Network
  network_title: string;
  network_available: string;  // 'Network available' when type unknown
  network_offline: string;
  network_offline_reserve: string; // exact AR offline reserve string in ar
  network_type: string;
  network_estimate_note: string;   // effectiveType is estimate, not physical bearer
  call_blocked_offline: string;    // disable call starting offline
  // Currency
  currency_mad: string;
  // Public messenger name — 'شات الملك' (King Chat).
  king_chat: string;
}

export const RESERVE_EN: ReserveCopy = {
  credit_title: "Royal Reserve call credit",
  credit_subtitle: "Call minutes only — this credit does not provide internet access.",
  reserve_identity: "Royal Reserve",
  paid_minutes: "Paid minutes",
  reserve_minutes: "Reserve minutes",
  minutes_unit: "min",
  debt_label: "Outstanding debt",
  no_debt: "No debt",
  expires_in: "Reserve expires in",
  expired: "Reserve expired",
  no_reserve: "No active reserve",
  activate: "Activate Royal Reserve",
  activating: "Activating…",
  activate_help: "Adds 120 reserve minutes, valid for 48 hours. A simulated 15 MAD charge is recorded and deducted from your next top-up.",
  activate_consent: "I understand a simulated 15 MAD debt will be recorded and deducted on my next top-up.",
  activation_success: "Royal Reserve activated. The amount will be deducted on your next top-up.",
  activation_failed: "Could not activate the reserve. Please try again.",
  cannot_activate: "Activation is not available right now.",
  simulated_note: "Simulated — no real money is charged.",
  credit_load_failed: "Could not load your credit.",
  retry: "Retry",
  repay_title: "Sandbox repayment",
  repay: "Simulate repayment",
  repaying: "Processing…",
  repay_sandbox_note: "Development sandbox only — no real funds move. Disabled in production.",
  repay_failed: "Repayment could not be simulated.",
  repay_success: "Simulated repayment recorded.",
  debt_first_note: "Outstanding debt is settled before any new balance becomes usable.",
  network_title: "Network",
  network_available: "Network available",
  network_offline: "No internet connection",
  network_offline_reserve: "No internet connection. Your reserve credit is preserved and available once the connection returns.",
  network_type: "Connection",
  network_estimate_note: "Connection type is an estimate of speed, not the physical carrier.",
  call_blocked_offline: "Calling is unavailable while offline.",
  currency_mad: "MAD",
  king_chat: "King Chat",
};

export const RESERVE_AR: ReserveCopy = {
  credit_title: "رصيد المكالمات الاحتياطي الملكي",
  credit_subtitle: "دقائق مكالمات فقط — هذا الرصيد لا يوفّر اتصالاً بالإنترنت.",
  reserve_identity: "رصيد احتياطي",
  paid_minutes: "الدقائق المدفوعة",
  reserve_minutes: "دقائق الرصيد الاحتياطي",
  minutes_unit: "دقيقة",
  debt_label: "الدين المستحق",
  no_debt: "لا يوجد دين",
  expires_in: "ينتهي الرصيد الاحتياطي خلال",
  expired: "انتهى الرصيد الاحتياطي",
  no_reserve: "لا يوجد رصيد احتياطي مفعّل",
  activate: "تفعيل الرصيد الاحتياطي",
  activating: "جارٍ التفعيل…",
  activate_help: "يضيف 120 دقيقة احتياطية صالحة لمدة 48 ساعة. يُسجَّل خصم محاكى بقيمة 15 درهماً يُخصم عند الشحن التالي.",
  activate_consent: "أوافق على تسجيل دين محاكى بقيمة 15 درهماً يُخصم عند الشحن التالي.",
  activation_success: RESERVE_ACTIVATION_MESSAGE_AR,
  activation_failed: "تعذّر تفعيل الرصيد الاحتياطي. حاول مرة أخرى.",
  cannot_activate: "التفعيل غير متاح حالياً.",
  simulated_note: "محاكاة — لا يتم خصم أي مبلغ حقيقي.",
  credit_load_failed: "تعذّر تحميل رصيدك.",
  retry: "إعادة المحاولة",
  repay_title: "سداد تجريبي",
  repay: "محاكاة السداد",
  repaying: "جارٍ المعالجة…",
  repay_sandbox_note: "بيئة تطوير تجريبية فقط — لا تُحرَّك أي أموال حقيقية. معطّل في الإنتاج.",
  repay_failed: "تعذّرت محاكاة السداد.",
  repay_success: "تم تسجيل السداد التجريبي.",
  debt_first_note: "يُسدَّد الدين المستحق قبل أن يصبح أي رصيد جديد قابلاً للاستخدام.",
  network_title: "الشبكة",
  network_available: "الشبكة متاحة",
  network_offline: "لا يوجد اتصال بالإنترنت",
  network_offline_reserve: RESERVE_OFFLINE_MESSAGE_AR,
  network_type: "الاتصال",
  network_estimate_note: "نوع الاتصال تقدير للسرعة وليس الناقل الفعلي.",
  call_blocked_offline: "المكالمات غير متاحة أثناء انقطاع الاتصال.",
  currency_mad: "درهم",
  king_chat: "شات الملك",
};

export const RESERVE_FR: ReserveCopy = {
  credit_title: "Crédit d’appel Réserve Royale",
  credit_subtitle: "Minutes d’appel uniquement — ce crédit ne fournit pas d’accès Internet.",
  reserve_identity: "Réserve Royale",
  paid_minutes: "Minutes payées",
  reserve_minutes: "Minutes de réserve",
  minutes_unit: "min",
  debt_label: "Dette due",
  no_debt: "Aucune dette",
  expires_in: "La réserve expire dans",
  expired: "Réserve expirée",
  no_reserve: "Aucune réserve active",
  activate: "Activer la Réserve Royale",
  activating: "Activation…",
  activate_help: "Ajoute 120 minutes de réserve, valables 48 heures. Une charge simulée de 15 MAD est enregistrée et déduite de votre prochaine recharge.",
  activate_consent: "Je comprends qu’une dette simulée de 15 MAD sera enregistrée et déduite lors de ma prochaine recharge.",
  activation_success: "Réserve Royale activée. Le montant sera déduit lors de votre prochaine recharge.",
  activation_failed: "Impossible d’activer la réserve. Veuillez réessayer.",
  cannot_activate: "L’activation n’est pas disponible pour le moment.",
  simulated_note: "Simulé — aucun montant réel n’est débité.",
  credit_load_failed: "Impossible de charger votre crédit.",
  retry: "Réessayer",
  repay_title: "Remboursement sandbox",
  repay: "Simuler le remboursement",
  repaying: "Traitement…",
  repay_sandbox_note: "Sandbox de développement uniquement — aucun fonds réel n’est déplacé. Désactivé en production.",
  repay_failed: "Le remboursement n’a pas pu être simulé.",
  repay_success: "Remboursement simulé enregistré.",
  debt_first_note: "La dette due est réglée avant que tout nouveau solde ne devienne utilisable.",
  network_title: "Réseau",
  network_available: "Réseau disponible",
  network_offline: "Aucune connexion Internet",
  network_offline_reserve: "Aucune connexion Internet. Votre crédit de réserve est conservé et disponible dès le retour de la connexion.",
  network_type: "Connexion",
  network_estimate_note: "Le type de connexion est une estimation de vitesse, pas le support physique.",
  call_blocked_offline: "Les appels sont indisponibles hors ligne.",
  currency_mad: "MAD",
  king_chat: "Chat du Roi",
};

export const RESERVE_ES: ReserveCopy = {
  credit_title: "Crédito de llamada de la Reserva Real",
  credit_subtitle: "Solo minutos de llamada — este crédito no proporciona acceso a Internet.",
  reserve_identity: "Reserva Real",
  paid_minutes: "Minutos pagados",
  reserve_minutes: "Minutos de reserva",
  minutes_unit: "min",
  debt_label: "Deuda pendiente",
  no_debt: "Sin deuda",
  expires_in: "La reserva caduca en",
  expired: "Reserva caducada",
  no_reserve: "Sin reserva activa",
  activate: "Activar la Reserva Real",
  activating: "Activando…",
  activate_help: "Añade 120 minutos de reserva, válidos 48 horas. Se registra un cargo simulado de 15 MAD que se deduce en tu próxima recarga.",
  activate_consent: "Entiendo que se registrará una deuda simulada de 15 MAD que se deducirá en mi próxima recarga.",
  activation_success: "Reserva Real activada. El importe se deducirá en tu próxima recarga.",
  activation_failed: "No se pudo activar la reserva. Inténtalo de nuevo.",
  cannot_activate: "La activación no está disponible en este momento.",
  simulated_note: "Simulado — no se cobra dinero real.",
  credit_load_failed: "No se pudo cargar tu crédito.",
  retry: "Reintentar",
  repay_title: "Reembolso de sandbox",
  repay: "Simular reembolso",
  repaying: "Procesando…",
  repay_sandbox_note: "Solo sandbox de desarrollo — no se mueven fondos reales. Desactivado en producción.",
  repay_failed: "No se pudo simular el reembolso.",
  repay_success: "Reembolso simulado registrado.",
  debt_first_note: "La deuda pendiente se salda antes de que cualquier saldo nuevo sea utilizable.",
  network_title: "Red",
  network_available: "Red disponible",
  network_offline: "Sin conexión a Internet",
  network_offline_reserve: "Sin conexión a Internet. Tu crédito de reserva se conserva y estará disponible cuando vuelva la conexión.",
  network_type: "Conexión",
  network_estimate_note: "El tipo de conexión es una estimación de velocidad, no el portador físico.",
  call_blocked_offline: "Las llamadas no están disponibles sin conexión.",
  currency_mad: "MAD",
  king_chat: "Chat del Rey",
};

export const RESERVE_DE: ReserveCopy = {
  credit_title: "Royal-Reserve-Anrufguthaben",
  credit_subtitle: "Nur Anrufminuten — dieses Guthaben bietet keinen Internetzugang.",
  reserve_identity: "Royal Reserve",
  paid_minutes: "Bezahlte Minuten",
  reserve_minutes: "Reserveminuten",
  minutes_unit: "Min.",
  debt_label: "Offene Schuld",
  no_debt: "Keine Schuld",
  expires_in: "Reserve läuft ab in",
  expired: "Reserve abgelaufen",
  no_reserve: "Keine aktive Reserve",
  activate: "Royal Reserve aktivieren",
  activating: "Wird aktiviert…",
  activate_help: "Fügt 120 Reserveminuten hinzu, 48 Stunden gültig. Eine simulierte Gebühr von 15 MAD wird erfasst und bei der nächsten Aufladung abgezogen.",
  activate_consent: "Ich verstehe, dass eine simulierte Schuld von 15 MAD erfasst und bei meiner nächsten Aufladung abgezogen wird.",
  activation_success: "Royal Reserve aktiviert. Der Betrag wird bei Ihrer nächsten Aufladung abgezogen.",
  activation_failed: "Reserve konnte nicht aktiviert werden. Bitte erneut versuchen.",
  cannot_activate: "Aktivierung ist derzeit nicht verfügbar.",
  simulated_note: "Simuliert — es wird kein echtes Geld abgebucht.",
  credit_load_failed: "Guthaben konnte nicht geladen werden.",
  retry: "Erneut versuchen",
  repay_title: "Sandbox-Rückzahlung",
  repay: "Rückzahlung simulieren",
  repaying: "Wird verarbeitet…",
  repay_sandbox_note: "Nur Entwicklungs-Sandbox — es werden keine echten Gelder bewegt. In Produktion deaktiviert.",
  repay_failed: "Rückzahlung konnte nicht simuliert werden.",
  repay_success: "Simulierte Rückzahlung erfasst.",
  debt_first_note: "Offene Schulden werden beglichen, bevor ein neues Guthaben nutzbar wird.",
  network_title: "Netzwerk",
  network_available: "Netzwerk verfügbar",
  network_offline: "Keine Internetverbindung",
  network_offline_reserve: "Keine Internetverbindung. Ihr Reserveguthaben bleibt erhalten und ist wieder verfügbar, sobald die Verbindung zurückkehrt.",
  network_type: "Verbindung",
  network_estimate_note: "Der Verbindungstyp ist eine Geschwindigkeitsschätzung, nicht der physische Träger.",
  call_blocked_offline: "Anrufe sind offline nicht verfügbar.",
  currency_mad: "MAD",
  king_chat: "King-Chat",
};

const RESERVE_T: Record<ReserveLocale, ReserveCopy> = {
  en: RESERVE_EN,
  ar: RESERVE_AR,
  fr: RESERVE_FR,
  es: RESERVE_ES,
  de: RESERVE_DE,
};

export function getReserveCopy(lang: string): ReserveCopy {
  return RESERVE_T[(lang as ReserveLocale)] ?? RESERVE_EN;
}
