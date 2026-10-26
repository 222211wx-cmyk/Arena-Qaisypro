import type { Lang } from "@/contexts/LangContext";

const en = {
  offline: "Offline",
  onlineNow: "Online now",
  busy: "Busy",
  lastSeen: "Last seen {time}",
  loginPrompt: "Log in to access your friends list",
  login: "Log in",
  loading: "Loading...",
  loadError: "Could not load friends. Please try again.",
  friends: "Friends",
  starsHall: "Stars Hall — host a global star ({remaining}/{limit} today)",
  message: "Message",
  host: "Host",
  myFriends: "My friends ({count})",
  noFriends: "No friends yet — add someone from the list below 👇",
  allUsers: "All users ({count})",
  allAdded: "You have added every available user 🎉",
  add: "Add",
  voice: "Voice",
  video: "Video",
  addedToast: "✅ Added @{username}",
  addError: "Could not add this user. Please try again.",
  removedToast: "Removed @{username}",
  removeError: "Could not remove this friend. Please try again.",
  dmError: "Could not open the conversation.",
  starAlreadyHostedToast: "⭐ {name} is already in your conversation 👑",
  starHostedToast: "⭐ {name} accepted your invitation! Open Messages 👑",
  starError: "Could not host this star. Please try again.",
  incomingCall: "Incoming call from",
  audioCallType: "Audio",
  videoCallType: "Video",
  answer: "Answer",
  reject: "Reject",
  loadingFriends: "Loading friends",
  messageUser: "Message @{username}",
  voiceCallUser: "Start an audio call with @{username}",
  videoCallUser: "Start a video call with @{username}",
  removeUser: "Remove @{username} from friends",
  addUser: "Add @{username}",
  hostStar: "Host {name}",
  messageStar: "Message {name}",
} as const;

type FriendsCopyKey = keyof typeof en;
type FriendsCopy = Record<FriendsCopyKey, string>;

const fr: FriendsCopy = {
  offline: "Hors ligne",
  onlineNow: "En ligne",
  busy: "Occupé",
  lastSeen: "Vu(e) {time}",
  loginPrompt: "Connectez-vous pour accéder à votre liste d’amis",
  login: "Se connecter",
  loading: "Chargement...",
  loadError: "Impossible de charger les amis. Veuillez réessayer.",
  friends: "Amis",
  starsHall: "Salon des stars — accueillez une star mondiale ({remaining}/{limit} aujourd’hui)",
  message: "Écrire",
  host: "Accueillir",
  myFriends: "Mes amis ({count})",
  noFriends: "Aucun ami pour le moment — ajoutez-en depuis la liste ci-dessous 👇",
  allUsers: "Tous les utilisateurs ({count})",
  allAdded: "Vous avez ajouté tous les utilisateurs disponibles 🎉",
  add: "Ajouter",
  voice: "Audio",
  video: "Vidéo",
  addedToast: "✅ @{username} a été ajouté(e)",
  addError: "Impossible d’ajouter cet utilisateur. Veuillez réessayer.",
  removedToast: "@{username} a été supprimé(e)",
  removeError: "Impossible de supprimer cet ami. Veuillez réessayer.",
  dmError: "Impossible d’ouvrir la conversation.",
  starAlreadyHostedToast: "⭐ {name} est déjà dans votre conversation 👑",
  starHostedToast: "⭐ {name} a accepté votre invitation ! Ouvrez Messages 👑",
  starError: "Impossible d’accueillir cette star. Veuillez réessayer.",
  incomingCall: "Appel entrant de",
  audioCallType: "Audio",
  videoCallType: "Vidéo",
  answer: "Répondre",
  reject: "Refuser",
  loadingFriends: "Chargement des amis",
  messageUser: "Écrire à @{username}",
  voiceCallUser: "Lancer un appel audio avec @{username}",
  videoCallUser: "Lancer un appel vidéo avec @{username}",
  removeUser: "Retirer @{username} des amis",
  addUser: "Ajouter @{username}",
  hostStar: "Accueillir {name}",
  messageStar: "Écrire à {name}",
};

const ar: FriendsCopy = {
  offline: "غير متصل",
  onlineNow: "متصل الآن",
  busy: "مشغول",
  lastSeen: "آخر ظهور {time}",
  loginPrompt: "سجّل دخولك للوصول إلى قائمة أصدقائك",
  login: "تسجيل الدخول",
  loading: "جارٍ التحميل...",
  loadError: "تعذّر تحميل الأصدقاء. حاول مجدداً.",
  friends: "الأصدقاء",
  starsHall: "قاعة النجوم — استضف نجماً عالمياً ({remaining}/{limit} اليوم)",
  message: "مراسلة",
  host: "استضافة",
  myFriends: "أصدقائي ({count})",
  noFriends: "لا أصدقاء بعد — أضف من القائمة أدناه 👇",
  allUsers: "جميع المستخدمين ({count})",
  allAdded: "أضفت جميع المستخدمين المتاحين 🎉",
  add: "إضافة",
  voice: "صوتي",
  video: "فيديو",
  addedToast: "✅ تمت إضافة @{username}",
  addError: "تعذّرت إضافة هذا المستخدم. حاول مجدداً.",
  removedToast: "تمت إزالة @{username}",
  removeError: "تعذّرت إزالة هذا الصديق. حاول مجدداً.",
  dmError: "تعذّر فتح المحادثة.",
  starAlreadyHostedToast: "⭐ {name} في محادثتك بالفعل 👑",
  starHostedToast: "⭐ قبل {name} الاستضافة! افتح الرسائل 👑",
  starError: "تعذّرت الاستضافة. حاول مجدداً.",
  incomingCall: "مكالمة واردة من",
  audioCallType: "صوتية",
  videoCallType: "فيديو",
  answer: "رد",
  reject: "رفض",
  loadingFriends: "جارٍ تحميل الأصدقاء",
  messageUser: "مراسلة @{username}",
  voiceCallUser: "بدء مكالمة صوتية مع @{username}",
  videoCallUser: "بدء مكالمة فيديو مع @{username}",
  removeUser: "إزالة @{username} من الأصدقاء",
  addUser: "إضافة @{username}",
  hostStar: "استضافة {name}",
  messageStar: "مراسلة {name}",
};

const es: FriendsCopy = {
  offline: "Sin conexión",
  onlineNow: "En línea ahora",
  busy: "Ocupado",
  lastSeen: "Última conexión {time}",
  loginPrompt: "Inicia sesión para acceder a tu lista de amigos",
  login: "Iniciar sesión",
  loading: "Cargando...",
  loadError: "No se pudieron cargar los amigos. Inténtalo de nuevo.",
  friends: "Amigos",
  starsHall: "Salón de estrellas — invita a una estrella mundial ({remaining}/{limit} hoy)",
  message: "Mensaje",
  host: "Invitar",
  myFriends: "Mis amigos ({count})",
  noFriends: "Aún no tienes amigos; añade a alguien de la lista de abajo 👇",
  allUsers: "Todos los usuarios ({count})",
  allAdded: "Has añadido a todos los usuarios disponibles 🎉",
  add: "Añadir",
  voice: "Audio",
  video: "Vídeo",
  addedToast: "✅ Se añadió a @{username}",
  addError: "No se pudo añadir a este usuario. Inténtalo de nuevo.",
  removedToast: "Se eliminó a @{username}",
  removeError: "No se pudo eliminar a este amigo. Inténtalo de nuevo.",
  dmError: "No se pudo abrir la conversación.",
  starAlreadyHostedToast: "⭐ {name} ya está en tu conversación 👑",
  starHostedToast: "⭐ ¡{name} aceptó tu invitación! Abre Mensajes 👑",
  starError: "No se pudo invitar a esta estrella. Inténtalo de nuevo.",
  incomingCall: "Llamada entrante de",
  audioCallType: "Audio",
  videoCallType: "Vídeo",
  answer: "Responder",
  reject: "Rechazar",
  loadingFriends: "Cargando amigos",
  messageUser: "Enviar un mensaje a @{username}",
  voiceCallUser: "Iniciar una llamada de audio con @{username}",
  videoCallUser: "Iniciar una videollamada con @{username}",
  removeUser: "Eliminar a @{username} de tus amigos",
  addUser: "Añadir a @{username}",
  hostStar: "Invitar a {name}",
  messageStar: "Enviar un mensaje a {name}",
};

const de: FriendsCopy = {
  offline: "Offline",
  onlineNow: "Jetzt online",
  busy: "Beschäftigt",
  lastSeen: "Zuletzt gesehen {time}",
  loginPrompt: "Melde dich an, um auf deine Freundesliste zuzugreifen",
  login: "Anmelden",
  loading: "Wird geladen...",
  loadError: "Freunde konnten nicht geladen werden. Bitte versuche es erneut.",
  friends: "Freunde",
  starsHall: "Halle der Stars — lade einen Weltstar ein ({remaining}/{limit} heute)",
  message: "Nachricht",
  host: "Einladen",
  myFriends: "Meine Freunde ({count})",
  noFriends: "Noch keine Freunde — füge jemanden aus der Liste unten hinzu 👇",
  allUsers: "Alle Benutzer ({count})",
  allAdded: "Du hast alle verfügbaren Benutzer hinzugefügt 🎉",
  add: "Hinzufügen",
  voice: "Audio",
  video: "Video",
  addedToast: "✅ @{username} hinzugefügt",
  addError: "Dieser Benutzer konnte nicht hinzugefügt werden. Bitte versuche es erneut.",
  removedToast: "@{username} entfernt",
  removeError: "Dieser Freund konnte nicht entfernt werden. Bitte versuche es erneut.",
  dmError: "Die Unterhaltung konnte nicht geöffnet werden.",
  starAlreadyHostedToast: "⭐ {name} ist bereits in deiner Unterhaltung 👑",
  starHostedToast: "⭐ {name} hat deine Einladung angenommen! Öffne Nachrichten 👑",
  starError: "Dieser Star konnte nicht eingeladen werden. Bitte versuche es erneut.",
  incomingCall: "Eingehender Anruf von",
  audioCallType: "Audio",
  videoCallType: "Video",
  answer: "Annehmen",
  reject: "Ablehnen",
  loadingFriends: "Freunde werden geladen",
  messageUser: "Nachricht an @{username}",
  voiceCallUser: "Audioanruf mit @{username} starten",
  videoCallUser: "Videoanruf mit @{username} starten",
  removeUser: "@{username} aus den Freunden entfernen",
  addUser: "@{username} hinzufügen",
  hostStar: "{name} einladen",
  messageStar: "Nachricht an {name}",
};

const copies: Record<Lang, FriendsCopy> = { en, fr, ar, es, de };
/** Supported-locale dictionaries exposed for translation parity audits. */
export const FRIENDS_COPY = copies;

const localeCodes: Record<Lang, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar",
  es: "es-ES",
  de: "de-DE",
};

export function friendsCopy(
  lang: Lang,
  key: FriendsCopyKey,
  values: Record<string, string | number> = {},
): string {
  let text: string = copies[lang][key];
  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function friendsNumber(lang: Lang, value: number): string {
  return new Intl.NumberFormat(localeCodes[lang]).format(value);
}

export function friendsRelativeTime(lang: Lang, value: string | number | Date): string {
  const elapsedSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  const absoluteSeconds = Math.abs(elapsedSeconds);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absoluteSeconds < 60
      ? [Math.round(elapsedSeconds), "second"]
      : absoluteSeconds < 3600
        ? [Math.round(elapsedSeconds / 60), "minute"]
        : absoluteSeconds < 86400
          ? [Math.round(elapsedSeconds / 3600), "hour"]
          : [Math.round(elapsedSeconds / 86400), "day"];

  return new Intl.RelativeTimeFormat(localeCodes[lang], { numeric: "auto" }).format(amount, unit);
}