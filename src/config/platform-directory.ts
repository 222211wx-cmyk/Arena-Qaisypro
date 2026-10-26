import type { LucideIcon } from "lucide-react";
import {
  Phone, Clapperboard, Gamepad2, ShoppingBag, Target, Shield, Trophy, Music, Film,
  Newspaper, Landmark, Cpu, HeartHandshake, Users, Store, Wrench, MapPin, CalendarDays,
  BookOpen, GraduationCap, Star, Crown, Activity, BarChart3, UserPlus, Megaphone, PartyPopper, Wallet,
  Bot, Network, Dna, Sparkles, Compass, Globe, Building2,
} from "lucide-react";
import type { Lang } from "@/contexts/LangContext";

export type DirectoryEntry = { id: string; route: string; icon: LucideIcon; names: Record<Lang, string> };

const n = (ar: string, en: string, fr: string, es: string, de: string): Record<Lang, string> => ({ ar, en, fr, es, de });

/**
 * Flat citizen directory. Order is owner-mandated: Calls & Messages, then Clips.
 * Excluded on purpose: aliases (/clip, /souk, /messagerie...), detail routes (/u/:x, /games/*),
 * admin/finance routes, auth/recovery flows, /dashboard (= Settings), /search (= Tools).
 */
export const DIRECTORY: DirectoryEntry[] = [
  { id: "messages", route: "/messages", icon: Phone, names: n("المكالمات والرسائل", "Calls & Messages", "Appels et messages", "Llamadas y mensajes", "Anrufe & Nachrichten") },
  { id: "clips", route: "/clips", icon: Clapperboard, names: n("كليبسز", "Clips", "Clips", "Clips", "Clips") },
  { id: "arena", route: "/games", icon: Gamepad2, names: n("الساحة", "Arena", "Arène", "Arena", "Arena") },
  { id: "shop", route: "/shop", icon: ShoppingBag, names: n("المتجر", "Shop", "Boutique", "Tienda", "Shop") },
  { id: "missions", route: "/growth", icon: Target, names: n("المهام", "Missions", "Missions", "Misiones", "Missionen") },
  { id: "fortress", route: "/fortress", icon: Shield, names: n("الحصن", "Fortress", "Forteresse", "Fortaleza", "Festung") },
  { id: "sport", route: "/sport", icon: Trophy, names: n("الرياضة", "Sport", "Sport", "Deporte", "Sport") },
  { id: "music", route: "/music", icon: Music, names: n("الموسيقى", "Music", "Musique", "Música", "Musik") },
  { id: "cinema", route: "/cinema", icon: Film, names: n("السينما", "Cinema", "Cinéma", "Cine", "Kino") },
  { id: "news", route: "/news", icon: Newspaper, names: n("الأخبار", "News", "Actualités", "Noticias", "Nachrichten") },
  { id: "heritage", route: "/chronicle", icon: Landmark, names: n("التراث", "Heritage", "Patrimoine", "Patrimonio", "Erbe") },
  { id: "smart", route: "/smart", icon: Cpu, names: n("الذكي", "Smart", "Smart", "Smart", "Smart") },
  { id: "social", route: "/social", icon: HeartHandshake, names: n("تعارف", "Social", "Social", "Social", "Soziales") },
  { id: "citizens", route: "/citizens", icon: Users, names: n("المواطنون", "Citizens", "Citoyens", "Ciudadanos", "Bürger") },
  { id: "friends", route: "/friends", icon: UserPlus, names: n("الأصدقاء", "Friends", "Amis", "Amigos", "Freunde") },
  { id: "market", route: "/market", icon: Store, names: n("السوق", "Market", "Marché", "Mercado", "Markt") },
  { id: "services", route: "/services", icon: Wrench, names: n("الخدمات", "Services", "Services", "Servicios", "Dienste") },
  { id: "map", route: "/map", icon: MapPin, names: n("الخريطة", "Map", "Carte", "Mapa", "Karte") },
  { id: "events", route: "/events", icon: CalendarDays, names: n("الفعاليات", "Events", "Événements", "Eventos", "Events") },
  { id: "stories", route: "/stories", icon: BookOpen, names: n("القصص", "Stories", "Histoires", "Historias", "Geschichten") },
  { id: "learn", route: "/learn", icon: GraduationCap, names: n("التعلم", "Learn", "Apprendre", "Aprender", "Lernen") },
  { id: "legends", route: "/legends", icon: Star, names: n("الأساطير", "Legends", "Légendes", "Leyendas", "Legenden") },
  { id: "elite", route: "/elite", icon: Crown, names: n("النخبة", "Elite", "Élite", "Élite", "Elite") },
  { id: "pulse", route: "/pulse", icon: Activity, names: n("النبض", "Pulse", "Pouls", "Pulso", "Puls") },
  { id: "leaderboard", route: "/leaderboard", icon: BarChart3, names: n("المتصدرون", "Leaderboard", "Classement", "Clasificación", "Bestenliste") },
  { id: "celebrations", route: "/celebrations", icon: PartyPopper, names: n("الاحتفالات", "Celebrations", "Célébrations", "Celebraciones", "Feiern") },
  { id: "wallet", route: "/wallet", icon: Wallet, names: n("المحفظة", "Wallet", "Portefeuille", "Billetera", "Wallet") },
  { id: "press", route: "/press", icon: Megaphone, names: n("الصحافة", "Press", "Presse", "Prensa", "Presse") },
  { id: "ai", route: "/chat", icon: Bot, names: n("مساعد GDN-AI", "GDN-AI assistant", "Assistant GDN-AI", "Asistente GDN-AI", "GDN-AI-Assistent") },
  { id: "hub", route: "/hub", icon: Compass, names: n("المركز الرقمي", "Digital Hub", "Centre numérique", "Centro digital", "Digitales Zentrum") },
  { id: "empire", route: "/empire", icon: Building2, names: n("الإمبراطورية", "Empire", "Empire", "Imperio", "Imperium") },
  { id: "empire-eternal", route: "/empire-eternal", icon: Globe, names: n("الإمبراطورية الخالدة", "Empire Eternal", "Empire éternel", "Imperio eterno", "Ewiges Imperium") },
  { id: "neural-core", route: "/neural-core", icon: Network, names: n("النواة العصبية", "Neural Core", "Noyau neuronal", "Núcleo neuronal", "Neuronaler Kern") },
  { id: "genome", route: "/genome", icon: Dna, names: n("الجينوم", "Genome", "Génome", "Genoma", "Genom") },
  { id: "ameeq", route: "/ameeq", icon: Sparkles, names: n("عميق", "Ameeq", "Ameeq", "Ameeq", "Ameeq") },
];

export const UI_TEXT = {
  sectionLink: n("رابط القسم", "Section link", "Lien de la section", "Enlace de la sección", "Bereichslink"),
  copy: n("نسخ", "Copy", "Copier", "Copiar", "Kopieren"),
  copied: n("تم نسخ الرابط", "Link copied", "Lien copié", "Enlace copiado", "Link kopiert"),
  copyFailed: n("تعذر النسخ تلقائياً. حدد الرابط وانسخه يدوياً.", "Could not copy. Select the link and copy it manually.", "Copie impossible. Sélectionnez le lien et copiez-le manuellement.", "No se pudo copiar. Selecciona el enlace y cópialo manualmente.", "Kopieren fehlgeschlagen. Link auswählen und manuell kopieren."),
  directory: n("أقسام المنصة", "Platform sections", "Sections de la plateforme", "Secciones de la plataforma", "Plattformbereiche"),
  utilities: n("أدوات المنصة", "Platform utilities", "Utilitaires", "Utilidades", "Werkzeuge"),
  tools: n("الأدوات", "Tools", "Outils", "Herramientas", "Werkzeuge"),
  search: n("بحث", "Search", "Rechercher", "Buscar", "Suchen"),
  settings: n("الإعدادات", "Settings", "Paramètres", "Ajustes", "Einstellungen"),
  sections: n("الأقسام", "Sections", "Sections", "Secciones", "Bereiche"),
  home: n("الرئيسية", "Home", "Accueil", "Inicio", "Startseite"),
};

/** Existing account settings live on the authenticated dashboard (redirects to /login if signed out). */
export const SETTINGS_ROUTE = "/dashboard#account-settings";
export const SEARCH_ROUTE = "/search";

// Internal section links stay relative to the app rather than a fixed hostname.
export const PUBLIC_ORIGIN = "";

/** Resolve only known section links; pasted external URLs never become navigation targets. */
export function findPlatformSections(query: string, currentOrigin: string): DirectoryEntry[] {
  const normalize = (value: string) => value.normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا").toLowerCase().trim();
  const text = query.trim();
  if (!text) return [];
  let path: string | undefined;
  if (/^(https?:\/\/|\/)/i.test(text)) {
    try {
      const url = new URL(text, currentOrigin);
      if (url.origin !== currentOrigin) return [];
      path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    } catch { return []; }
  }
  const aliases: Record<string, string> = {
    "/clip": "/clips", "/mes": "/messages", "/souk": "/market",
    "/message-calle": "/messages", "/messages.call": "/messages",
    "/messagerie": "/messages", "/message calle": "/messages",
  };
  if (path) return DIRECTORY.filter(section => section.route === (aliases[path] ?? path));
  const needle = normalize(text);
  return DIRECTORY.filter(section => [
    section.id, section.route, ...Object.values(section.names),
    ...(section.id === "clips" ? ["كليبس", "كليبسز"] : []),
  ].some(value => normalize(value).includes(needle)));
}
