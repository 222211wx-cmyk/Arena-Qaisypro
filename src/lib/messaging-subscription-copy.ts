/** Messages-entry copy only; does not change account or other-section access. */
export function unlimitedMessagingAccessCopy(lang: string): string {
  const copy = {
    ar: "المراسلة المباشرة غير محدودة ولا تتطلب اشتراكاً أو تفعيل الإدارة. تظل قواعد الأمان والحظر ومكافحة الإزعاج سارية. الألعاب تتطلب 18+.",
    en: "Direct messaging is unlimited, with no subscription or administrator activation required. Safety, blocking and anti-spam rules still apply. Games requires 18+.",
    fr: "La messagerie directe est illimitée, sans abonnement ni activation administrative. Les règles de sécurité, de blocage et anti-spam restent applicables. Les jeux exigent 18 ans ou plus.",
    es: "La mensajería directa es ilimitada, sin suscripción ni activación administrativa. Se mantienen las reglas de seguridad, bloqueo y antispam. Los juegos requieren 18 años o más.",
    de: "Direktnachrichten sind unbegrenzt, ohne Abonnement oder Freischaltung durch Administratoren. Sicherheits-, Blockierungs- und Anti-Spam-Regeln gelten weiterhin. Spiele erfordern ein Mindestalter von 18 Jahren.",
  };
  return copy[lang as keyof typeof copy] ?? copy.en;
}

export function messagingSubscriptionCopy(lang: string) {
  const copy = {
    ar: { checking: "جار التحقق من اشتراك المراسلة…", inactive: "اشتراك المراسلة غير نشط. تواصل مع الإدارة لتفعيل الإرسال. القراءة والمكالمات متاحة.", unavailable: "تعذّر التحقق من الاشتراك. الإرسال غير متاح؛ القراءة والمكالمات متاحة.", active: "اشتراك المراسلة نشط." },
    en: { checking: "Checking messaging subscription…", inactive: "Messaging subscription inactive. Contact an administrator to enable sending. Reading and calls remain available.", unavailable: "Unable to verify subscription. Sending is unavailable; reading and calls remain available.", active: "Messaging subscription active." },
    fr: { checking: "Vérification de l’abonnement…", inactive: "Abonnement inactif. Contactez un administrateur pour activer l’envoi. La lecture et les appels restent disponibles.", unavailable: "Impossible de vérifier l’abonnement. Envoi indisponible ; lecture et appels disponibles.", active: "Abonnement de messagerie actif." },
    es: { checking: "Verificando suscripción…", inactive: "Suscripción inactiva. Contacta con un administrador para activar los envíos. La lectura y las llamadas siguen disponibles.", unavailable: "No se puede verificar la suscripción. Envíos no disponibles; lectura y llamadas disponibles.", active: "Suscripción de mensajería activa." },
    de: { checking: "Nachrichtenabonnement wird geprüft…", inactive: "Abonnement inaktiv. Kontaktiere einen Administrator, um das Senden zu aktivieren. Lesen und Anrufe bleiben verfügbar.", unavailable: "Abonnement konnte nicht geprüft werden. Senden nicht verfügbar; Lesen und Anrufe bleiben verfügbar.", active: "Nachrichtenabonnement aktiv." },
  };
  return copy[lang as keyof typeof copy] ?? copy.en;
}

export const exhaustedMessagingNotice = "Contactez l'AMIS pour activer";

export type MessagingEntitlement = {
  hasActiveSubscription: boolean;
  canSendMessages: boolean;
  /** Historical trial metadata, not the current send allowance. */
  freeMessagesRemaining: number;
  messagingPolicy?: "unlimited";
};

/** Compatibility status parser. Sending does not depend on subscription status. */
export function parseMessagingEntitlement(value: unknown): MessagingEntitlement {
  if (!value || typeof value !== "object" ||
      typeof (value as MessagingEntitlement).hasActiveSubscription !== "boolean" ||
      typeof (value as MessagingEntitlement).canSendMessages !== "boolean" ||
      !Number.isSafeInteger((value as MessagingEntitlement).freeMessagesRemaining) ||
      (value as MessagingEntitlement).freeMessagesRemaining < 0 ||
      ((value as MessagingEntitlement).messagingPolicy !== undefined &&
       (value as MessagingEntitlement).messagingPolicy !== "unlimited")) {
    throw new Error("Invalid messaging entitlement response");
  }
  return value as MessagingEntitlement;
}

export function remainingMessagingCopy(lang: string, count: number): string {
  if (lang === "fr") return `${count} message${count === 1 ? "" : "s"} gratuit${count === 1 ? "" : "s"} restant${count === 1 ? "" : "s"}`;
  return `${count} free message${count === 1 ? "" : "s"} remaining`;
}