/**
 * LEGAL COMPLIANCE CONTEXT
 * Country-adaptive legal system — each country gets its own rules.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type ConsentLevel = "none" | "essential" | "full";

export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  region: string;
  minAge: number;
  gdpr: boolean;
  ccpa: boolean;
  cookieConsentRequired: boolean;
  coinsDisclaimer: boolean;
  gamingWarning: boolean;
  ageGateRequired: boolean;
  dataRights: string[];
  laws: string[];
  notes: string;
}

// ── Country compliance matrix ─────────────────────────────────
export const COUNTRIES: CountryProfile[] = [
  // Europe
  { code:"FR", name:"France",       flag:"🇫🇷", region:"EU",   minAge:15, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","rectification"], laws:["GDPR","CNIL","ANJ"],            notes:"Autorité de régulation des jeux en ligne (ANJ) s'applique aux jeux avec récompenses." },
  { code:"DE", name:"Deutschland",  flag:"🇩🇪", region:"EU",   minAge:16, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","object"],        laws:["GDPR","BDSG","GlüStV"],        notes:"GlüStV 2021 регулирует онлайн-игры с вознаграждениями в Германии." },
  { code:"ES", name:"España",       flag:"🇪🇸", region:"EU",   minAge:14, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","rectification"], laws:["GDPR","LOPDGDD","DGOJ"],       notes:"Dirección General de Ordenación del Juego supervisa plataformas de juego." },
  { code:"IT", name:"Italia",       flag:"🇮🇹", region:"EU",   minAge:14, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete","portability"],                  laws:["GDPR","Codice Privacy"],      notes:"" },
  { code:"NL", name:"Nederland",    flag:"🇳🇱", region:"EU",   minAge:16, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","object"],        laws:["GDPR","Wet kansspelen"],      notes:"" },
  { code:"PL", name:"Polska",       flag:"🇵🇱", region:"EU",   minAge:16, gdpr:true,  ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete"],                               laws:["GDPR","UODO"],                notes:"" },
  { code:"GB", name:"United Kingdom",flag:"🇬🇧",region:"UK",   minAge:13, gdpr:false, ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","object"],        laws:["UK GDPR","PECR","Gambling Act 2005"], notes:"ICO enforces UK GDPR. Gambling Commission oversees gaming platforms." },
  // Americas
  { code:"US", name:"United States",flag:"🇺🇸", region:"NA",   minAge:13, gdpr:false, ccpa:true,  cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete","opt-out-sale"],                laws:["CCPA","COPPA","FTC Act"],     notes:"California residents have additional rights under CCPA. COPPA applies to under-13 users." },
  { code:"CA", name:"Canada",       flag:"🇨🇦", region:"NA",   minAge:13, gdpr:false, ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete","portability"],                  laws:["PIPEDA","CASL","Bill C-27"],  notes:"" },
  { code:"BR", name:"Brasil",       flag:"🇧🇷", region:"SA",   minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability","rectification"], laws:["LGPD","Marco Civil"],         notes:"LGPD (Lei Geral de Proteção de Dados) similar to GDPR." },
  { code:"MX", name:"México",       flag:"🇲🇽", region:"SA",   minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete"],                               laws:["LFPDPPP"],                    notes:"" },
  // Middle East & Africa
  { code:"MA", name:"Maroc",        flag:"🇲🇦", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete"],                               laws:["Loi 09-08 CNDP","Dahir 1-14-191"], notes:"CNDP supervise la protection des données. Les jeux d'argent sont strictement réglementés." },
  { code:"DZ", name:"الجزائر",      flag:"🇩🇿", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access"],                                        laws:["Loi 18-07"],                  notes:"قانون حماية المعطيات الشخصية. الألعاب بمكافآت مالية محدودة." },
  { code:"TN", name:"تونس",         flag:"🇹🇳", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access"],                                        laws:["Loi 63-2004 INPDP"],         notes:"" },
  { code:"EG", name:"مصر",          flag:"🇪🇬", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access"],                                        laws:["Law 151/2020"],               notes:"قانون حماية البيانات الشخصية رقم 151 لسنة 2020." },
  { code:"SA", name:"السعودية",     flag:"🇸🇦", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete"],                               laws:["PDPL","CITC","NCA"],         notes:"نظام حماية البيانات الشخصية (PDPL) 2021. ألعاب الحظ محظورة." },
  { code:"AE", name:"الإمارات",     flag:"🇦🇪", region:"MENA", minAge:21, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete"],                               laws:["PDPL 2022","TRA","DIFC"],    notes:"PDPL 2022 في تطبيق. الألعاب الإلكترونية بمكافآت مالية تحتاج ترخيص." },
  { code:"TR", name:"Türkiye",      flag:"🇹🇷", region:"MENA", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:true,  coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability"],                  laws:["KVKK 6698","BTK"],           notes:"" },
  // Asia-Pacific
  { code:"IN", name:"India",        flag:"🇮🇳", region:"APAC", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access"],                                        laws:["DPDP Act 2023","IT Act"],    notes:"Digital Personal Data Protection Act 2023 applies." },
  { code:"JP", name:"日本",          flag:"🇯🇵", region:"APAC", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete"],                               laws:["APPI","景品表示法"],          notes:"" },
  { code:"KR", name:"대한민국",      flag:"🇰🇷", region:"APAC", minAge:14, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:false, ageGateRequired:false, dataRights:["access","delete"],                               laws:["PIPA","Game Industry Act"],  notes:"" },
  { code:"AU", name:"Australia",    flag:"🇦🇺", region:"APAC", minAge:18, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true,  gamingWarning:true,  ageGateRequired:true,  dataRights:["access","delete","portability"],                  laws:["Privacy Act 1988","IGA"],    notes:"" },
  // International fallback
  { code:"INT", name:"International / Other", flag:"🌐", region:"INTL", minAge:13, gdpr:false, ccpa:false, cookieConsentRequired:false, coinsDisclaimer:true, gamingWarning:false, ageGateRequired:false, dataRights:["access"], laws:["Platform Terms of Service"], notes:"General international terms apply." },
];

export function getCountry(code: string): CountryProfile {
  return COUNTRIES.find(c => c.code === code) ?? COUNTRIES.find(c => c.code === "INT")!;
}

// ── Geo detection result ──────────────────────────────────────
export interface GeoData {
  ip: string;
  countryCode: string;
  country: string;
  restriction: "allowed" | "restricted" | "blocked";
  message: string;
  laws: string[];
}

// ── Context types ─────────────────────────────────────────────
interface LegalContextType {
  countryCode: string;
  country: CountryProfile;
  setCountry: (code: string) => void;
  consent: ConsentLevel;
  setConsent: (level: ConsentLevel) => void;
  ageVerified: boolean;
  setAgeVerified: (v: boolean) => void;
  showCookieBanner: boolean;
  dismissCookieBanner: () => void;
  legalReady: boolean;
  geoData: GeoData | null;          // raw IP geo result
  geoLoading: boolean;              // true while detecting
}

const LegalContext = createContext<LegalContextType>({
  countryCode: "INT", country: COUNTRIES.find(c=>c.code==="INT")!,
  setCountry: ()=>{}, consent: "none", setConsent: ()=>{},
  ageVerified: false, setAgeVerified: ()=>{},
  showCookieBanner: false, dismissCookieBanner: ()=>{}, legalReady: false,
  geoData: null, geoLoading: false,
});

// ── Detect country from browser timezone / language ───────────
function detectCountry(): string {
  const stored = localStorage.getItem("gdna_country");
  if (stored) return stored;
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.includes("ar-ma") || lang.includes("ar-DZ".toLowerCase())) return "MA";
  if (lang.includes("ar-sa") || lang.includes("ar-SA".toLowerCase())) return "SA";
  if (lang.includes("ar-ae")) return "AE";
  if (lang.includes("ar-eg")) return "EG";
  if (lang.startsWith("ar")) return "SA";
  if (lang.startsWith("fr-ma")) return "MA";
  if (lang.startsWith("fr")) return "FR";
  if (lang.startsWith("de")) return "DE";
  if (lang.startsWith("es")) return "ES";
  if (lang.startsWith("pt")) return "BR";
  if (lang.startsWith("ja")) return "JP";
  if (lang.startsWith("ko")) return "KR";
  if (lang.startsWith("tr")) return "TR";
  if (lang.startsWith("en-gb")) return "GB";
  if (lang.startsWith("en-au")) return "AU";
  if (lang.startsWith("en-ca")) return "CA";
  if (lang.startsWith("en")) return "US";
  return "INT";
}

export function LegalProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<string>(detectCountry);
  const [consent, setConsentState] = useState<ConsentLevel>(
    () => (localStorage.getItem("gdna_consent") as ConsentLevel) ?? "none"
  );
  const [ageVerified, setAgeVerifiedState] = useState<boolean>(
    () => localStorage.getItem("gdna_age_ok") === "1"
  );
  const [showBanner, setShowBanner] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const country = getCountry(countryCode);

  // ── IP Geo Detection — runs once on mount ─────────────────────
  useEffect(() => {
    // Only fetch if user hasn't manually chosen a country
    const stored = localStorage.getItem("gdna_country");
    if (stored) return; // user chose manually — respect their choice

    setGeoLoading(true);
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    fetch(`${BASE}/api/geo/detect`)
      .then(r => r.json())
      .then((data: GeoData) => {
        setGeoData(data);
        // Auto-set country from IP if we have a match in our matrix
        if (data.countryCode && data.countryCode !== "INT") {
          const match = COUNTRIES.find(c => c.code === data.countryCode);
          if (match) {
            setCountryCode(data.countryCode);
          }
        }
      })
      .catch(() => { /* silent — fallback to browser detect */ })
      .finally(() => setGeoLoading(false));
  }, []);

  // ── Cookie banner trigger ─────────────────────────────────────
  useEffect(() => {
    if (country.cookieConsentRequired && consent === "none") {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
    setShowBanner(false);
    return undefined;
  }, [countryCode, consent]);

  const setCountry = useCallback((code: string) => {
    localStorage.setItem("gdna_country", code);
    setCountryCode(code);
  }, []);

  const setConsent = useCallback((level: ConsentLevel) => {
    localStorage.setItem("gdna_consent", level);
    setConsentState(level);
    setShowBanner(false);
  }, []);

  const setAgeVerified = useCallback((v: boolean) => {
    localStorage.setItem("gdna_age_ok", v ? "1" : "0");
    setAgeVerifiedState(v);
  }, []);

  const legalReady = !country.ageGateRequired || ageVerified;

  return (
    <LegalContext.Provider value={{
      countryCode, country, setCountry,
      consent, setConsent,
      ageVerified, setAgeVerified,
      showCookieBanner: showBanner,
      dismissCookieBanner: () => setShowBanner(false),
      legalReady,
      geoData, geoLoading,
    }}>
      {children}
    </LegalContext.Provider>
  );
}

export function useLegal() {
  return useContext(LegalContext);
}
