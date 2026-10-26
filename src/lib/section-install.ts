export type InstallSection = "clips" | "messages";
type InstallResult = "accepted" | "dismissed" | "unsupported" | "ios" | "standalone" | "navigating";
export type InstallLang = "ar" | "en" | "fr" | "es" | "de";
type InstallKey = InstallResult | "clipsButton" | "messagesButton" | "dismiss";

const copy: Record<InstallLang, Record<InstallKey, string>> = {
  ar: {
    clipsButton: "تثبيت Hc · الكليبز", messagesButton: "تثبيت Hm · الرسائل", dismiss: "إغلاق إرشادات التثبيت",
    accepted: "طُلب التثبيت. تأكد من المتصفح أو الشاشة الرئيسية؛ لم يُؤكَّد التثبيت بعد.",
    dismissed: "أُلغِي التثبيت. يمكنك المحاولة مجدداً من قائمة المتصفح.",
    ios: "في Safari اضغط مشاركة ← إضافة إلى الشاشة الرئيسية. إذا كنت داخل متصفح تطبيق آخر، افتح هذا القسم في Safari أولاً.",
    standalone: "هذه الصفحة مفتوحة بالفعل من تطبيق على الشاشة الرئيسية.",
    navigating: "جارٍ فتح القسم. اضغط تثبيت هناك للمتابعة.",
    unsupported: "إذا كان متصفحك يدعم ذلك، اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية من قائمته. أو افتح هذا القسم في Safari أو Chrome.",
  },
  en: {
    clipsButton: "Install Hc · Clips", messagesButton: "Install Hm · Messages", dismiss: "Dismiss install help",
    accepted: "Installation requested. Check your browser or home screen to confirm; installation is not yet confirmed.",
    dismissed: "Installation cancelled. You can try again from your browser's menu.",
    ios: "In Safari, tap Share → Add to Home Screen. Open this section in Safari first if you are using an in-app browser.",
    standalone: "This page is already open from a home-screen app.",
    navigating: "Opening the section. Tap Install there to continue.",
    unsupported: "If your browser supports it, open its menu and choose Install app or Add to Home Screen. Otherwise open this section in Safari or Chrome.",
  },
  fr: {
    clipsButton: "Installer Hc · Clips", messagesButton: "Installer Hm · Messages", dismiss: "Fermer l’aide à l’installation",
    accepted: "Installation demandée. Vérifiez dans le navigateur ou sur l’écran d’accueil ; elle n’est pas encore confirmée.",
    dismissed: "Installation annulée. Vous pouvez réessayer depuis le menu du navigateur.",
    ios: "Dans Safari, touchez Partager → Sur l’écran d’accueil. Si vous utilisez un navigateur intégré, ouvrez d’abord cette section dans Safari.",
    standalone: "Cette page est déjà ouverte depuis une application sur l’écran d’accueil.",
    navigating: "Ouverture de la section. Touchez Installer là-bas pour continuer.",
    unsupported: "Si votre navigateur le permet, choisissez Installer l’application ou Sur l’écran d’accueil dans son menu. Sinon, ouvrez cette section dans Safari ou Chrome.",
  },
  es: {
    clipsButton: "Instalar Hc · Clips", messagesButton: "Instalar Hm · Mensajes", dismiss: "Cerrar ayuda de instalación",
    accepted: "Instalación solicitada. Comprueba el navegador o la pantalla de inicio; aún no está confirmada.",
    dismissed: "Instalación cancelada. Puedes intentarlo de nuevo desde el menú del navegador.",
    ios: "En Safari, toca Compartir → Añadir a pantalla de inicio. Si usas un navegador integrado, abre primero esta sección en Safari.",
    standalone: "Esta página ya está abierta desde una app en la pantalla de inicio.",
    navigating: "Abriendo la sección. Toca Instalar allí para continuar.",
    unsupported: "Si tu navegador lo permite, elige Instalar aplicación o Añadir a pantalla de inicio en su menú. Si no, abre esta sección en Safari o Chrome.",
  },
  de: {
    clipsButton: "Hc · Clips installieren", messagesButton: "Hm · Nachrichten installieren", dismiss: "Installationshilfe schließen",
    accepted: "Installation angefordert. Prüfe den Browser oder Startbildschirm; die Installation ist noch nicht bestätigt.",
    dismissed: "Installation abgebrochen. Du kannst es über das Browsermenü erneut versuchen.",
    ios: "Tippe in Safari auf Teilen → Zum Home-Bildschirm. Öffne diesen Bereich zuerst in Safari, falls du einen In-App-Browser nutzt.",
    standalone: "Diese Seite ist bereits als App vom Home-Bildschirm geöffnet.",
    navigating: "Bereich wird geöffnet. Tippe dort auf Installieren, um fortzufahren.",
    unsupported: "Falls dein Browser es unterstützt, wähle App installieren oder Zum Home-Bildschirm im Menü. Andernfalls öffne diesen Bereich in Safari oder Chrome.",
  },
};

function isInstallLang(value: string | null): value is InstallLang {
  return value === "ar" || value === "en" || value === "fr" || value === "es" || value === "de";
}

/** Mirrors LangContext's explicit query/storage preference without loading React into Clips. */
export function getInstallLang(): InstallLang {
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (isInstallLang(requested)) return requested;
  try {
    const stored = window.localStorage.getItem("gdna_lang");
    if (isInstallLang(stored)) return stored;
  } catch { /* Storage may be disabled; Arabic is the canonical first-visit language. */ }
  return "ar";
}

export function installText(lang: InstallLang, key: InstallKey): string {
  return copy[lang][key];
}

declare global {
  interface Window {
    __gdnaSectionInstall?: {
      current(): InstallSection | "default";
      request(section: InstallSection): Promise<InstallResult>;
    };
  }
}

/** A click alone may request installation. Never mistake prompt acceptance for installation. */
export async function requestSectionInstall(section: InstallSection, lang: InstallLang = getInstallLang()): Promise<string> {
  const result = await window.__gdnaSectionInstall?.request(section) ?? "unsupported";
  return installText(lang, result);
}