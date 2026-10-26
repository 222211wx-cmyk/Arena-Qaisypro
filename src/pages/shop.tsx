import { useState, useEffect } from "react";
import SmartDomainWidget from "@/components/SmartDomainWidget";
import { useAuth }  from "../contexts/AuthContext";
import { useLang }  from "../contexts/LangContext";
import { ShoppingBag, Coins, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useConnectivity } from "@/contexts/ConnectivityContext";
import { localeForLang } from "@/i18n/locale-surfaces-a-copy";

const GOLD = "hsl(var(--primary))";

const GOLD_A = (a: number) => `hsl(var(--primary) / ${a})`;
const BASE = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const api = (path: string) => `${BASE()}${path}`;

interface ShopItem {
  id: number; name: string; name_ar: string;
  price: number; category: string; emoji: string; image: string;
}

export default function ShopPage() {
  const { user, refreshUser } = useAuth() as any;
  const { lang } = useLang();
  const t = (en: string, fr: string, ar: string, es: string, de: string) => ({ en, fr, ar, es, de }[lang]);
  const { isOnline } = useConnectivity();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const locale = localeForLang(lang);

  const [items,       setItems]       = useState<ShopItem[]>([]);
  const [purchased,   setPurchased]   = useState<number[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [buying,      setBuying]      = useState<number | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch(api("/api/shop/items"), { credentials: "include" })
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setPurchased(d.purchasedIds ?? []); })
      .finally(() => setLoading(false));
  }, [user]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const buy = async (item: ShopItem) => {
    if (!user) return showToast(t("Login required", "Connexion requise", "يجب تسجيل الدخول أولاً", "Se requiere iniciar sesión", "Anmeldung erforderlich"), false);
    if (!isOnline) return showToast(t("Reconnect to complete this purchase", "Reconnectez-vous pour finaliser cet achat", "أعد الاتصال لإتمام الشراء", "Vuelve a conectarte para completar esta compra", "Stelle die Verbindung wieder her, um den Kauf abzuschließen"), false);
    setBuying(item.id);
    try {
      const res = await fetch(api(`/api/shop/buy/${item.id}`), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error ?? t("Purchase failed", "Échec de l'achat", "فشل الشراء", "La compra falló", "Kauf fehlgeschlagen"), false);
      } else {
        setPurchased(p => [...p, item.id]);
        showToast(`✅ ${lang === "ar" ? item.name_ar : item.name} — ${t("Purchased!", "Acheté !", "تم الشراء!", "¡Comprado!", "Gekauft!")}`, true);
        if (refreshUser) refreshUser();
      }
    } catch {
      showToast(t("Connection error", "Erreur de connexion", "خطأ في الاتصال", "Error de conexión", "Verbindungsfehler"), false);
    } finally {
      setBuying(null);
    }
  };

  const CATEGORIES: Record<string, string> = {
    clothing: t("Clothing", "Vêtements", "ملابس", "Ropa", "Kleidung"),
    collectible: t("Collectibles", "Objets de collection", "تحف", "Coleccionables", "Sammlerstücke"),
    digital: t("Digital", "Numérique", "رقمي", "Digital", "Digital"),
    bundle: t("Bundle", "Pack", "حزمة", "Paquete", "Paket"),
  };

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", paddingBottom: 80 }} dir={dir}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#0a2" : "#c00", color: "#fff",
          padding: "12px 24px", borderRadius: 12, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", fontWeight: 700, fontSize: 14,
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)`, borderBottom: `1px solid ${GOLD_A(0.2)}`, padding: "32px 24px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>
                 <span style={{ color: GOLD }}>◈</span> {t("Empire Shop", "Boutique de l'Empire", "تجارة الإمبراطورية", "Tienda del Imperio", "Imperiums-Shop")}
              </h1>
              <p style={{ margin: "4px 0 0", color: "#ffffff50", fontSize: 13 }}>
                 {t("Spend your GDNA Coins on exclusive items", "Dépensez vos pièces GDNA pour des articles exclusifs", "أنفق عملات GDNA على منتجات حصرية", "Gasta tus monedas GDNA en artículos exclusivos", "Gib deine GDNA-Coins für exklusive Artikel aus")}
              </p>
            </div>
            {user && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: GOLD_A(0.15), border: `1px solid ${GOLD_A(0.4)}`,
                borderRadius: 20, padding: "8px 18px",
              }}>
                <span style={{ fontSize: 18 }}>🪙</span>
                <span style={{ color: GOLD, fontWeight: 900, fontSize: 18 }}>{(user.balance ?? 0).toLocaleString(locale)}</span>
                 <span style={{ color: "#ffffff60", fontSize: 12 }}>{t("GDNA Coins", "Pièces GDNA", "عملات GDNA", "Monedas GDNA", "GDNA-Coins")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Domain Widget */}
      <div style={{ maxWidth: 1100, margin: "16px auto 0", padding: "0 24px" }}>
        <SmartDomainWidget domainId="business" label="Module Business" />
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "32px auto", padding: "0 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}>
            {items.map(item => {
              const isPurchased = purchased.includes(item.id);
              const isLoading   = buying === item.id;
              const canAfford   = (user?.balance ?? 0) >= item.price;

              return (
                <div key={item.id} style={{
                  background: "hsl(var(--card))",
                  border: `1px solid ${isPurchased ? "#0a0" : GOLD_A(0.2)}`,
                  borderRadius: 16, overflow: "hidden",
                  transition: "transform 0.2s, border-color 0.2s",
                  cursor: "default",
                }}>
                  {/* Image */}
                  <div style={{
                    height: 160, background: `hsl(var(--card))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 64, position: "relative",
                  }}>
                    {item.emoji}
                    {isPurchased && (
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        background: "#0a0", borderRadius: "50%", padding: 2,
                      }}>
                        <CheckCircle size={20} color="#fff" />
                      </div>
                    )}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      background: GOLD_A(0.2), border: `1px solid ${GOLD_A(0.4)}`,
                      borderRadius: 8, padding: "3px 8px", fontSize: 11, color: GOLD, fontWeight: 700,
                    }}>
                      {CATEGORIES[item.category] ?? item.category}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "16px" }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>{lang === "ar" ? item.name_ar : item.name}</h3>
                    {lang === "ar" && <p style={{ margin: "0 0 12px", color: "#ffffff50", fontSize: 12 }}>{item.name}</p>}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16 }}>🪙</span>
                         <span style={{ color: GOLD, fontWeight: 900, fontSize: 18 }}>{lang === "de" ? item.price.toLocaleString("de-DE") : item.price}</span>
                      </div>

                      <button
                        onClick={() => !isPurchased && buy(item)}
                        disabled={isPurchased || isLoading || !canAfford || !isOnline}
                        style={{
                          padding: "8px 16px", borderRadius: 10, border: "none",
                          fontWeight: 800, fontSize: 13, cursor: isPurchased || !canAfford ? "not-allowed" : "pointer",
                          background: isPurchased
                            ? "#1a3a1a"
                            : canAfford ? GOLD : "#333",
                          color: isPurchased ? "#0a0" : canAfford ? "#000" : "#666",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                        {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                        {isPurchased
                           ? `✓ ${t("Owned", "Possédé", "مشتراة", "En propiedad", "Im Besitz")}`
                          : !canAfford
                            ? t("Not enough", "Solde insuffisant", "رصيد غير كافٍ", "Saldo insuficiente", "Nicht genug")
                            : t("Buy", "Acheter", "شراء", "Comprar", "Kaufen")}
                      </button>
                    </div>

                    {!canAfford && !isPurchased && user && (
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "hsl(var(--destructive))", textAlign: "center" }}>
                         {t(`Need ${item.price - (user.balance ?? 0)} more coins`, `Il vous faut encore ${item.price - (user.balance ?? 0)} pièces`, `تحتاج ${item.price - (user.balance ?? 0)} عملة إضافية`, `Necesitas ${item.price - (user.balance ?? 0)} monedas más`, `Du benötigst noch ${(item.price - (user.balance ?? 0)).toLocaleString(locale)} Coins`)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!user && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "hsl(var(--muted-foreground))" }}>
            <ShoppingBag size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
             <p style={{ fontSize: 16 }}>{t("Login to make purchases", "Connectez-vous pour acheter", "سجّل دخولك لتتمكن من الشراء", "Inicia sesión para comprar", "Melde dich an, um einzukaufen")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
