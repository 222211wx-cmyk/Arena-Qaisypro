import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";

/**
 * زر الخروج الطارئ — يبقى ثابت فوق أي شاشة لعبة.
 * + حماية من البلوكاج: إلا بقات اللعبة 30 ثانية بلا أي حركة،
 *   كيطلع تأكيد الخروج أوتوماتيكياً.
 *
 * onExit: إلا تعطات، كتسد اللعبة محلياً (مثلاً سد المودال)؛
 * إلا ما تعطاتش، كيرجع للصفحة الرئيسية "/".
 */
export default function GameExitButton({
  onExit,
  idleMs = 30_000,
}: {
  onExit?: () => void;
  idleMs?: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [, setLocation] = useLocation();
  const { lang } = useLang();
  const direction = lang === "ar" ? "rtl" : "ltr";
  const copy = {
    en: ["Exit game", "Exit", "Are you sure you want to leave the game?", "Leave", "Keep playing"],
    fr: ["Quitter le jeu", "Quitter", "Voulez-vous vraiment quitter le jeu ?", "Quitter", "Continuer à jouer"],
    ar: ["الخروج من اللعبة", "خروج", "هل أنت متأكد أنك تريد الخروج من اللعبة؟", "خروج", "أكمل اللعب"],
    es: ["Salir del juego", "Salir", "¿Seguro que quieres salir del juego?", "Salir", "Seguir jugando"],
    de: ["Spiel verlassen", "Beenden", "Möchtest du das Spiel wirklich verlassen?", "Verlassen", "Weiterspielen"],
  }[lang];
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doExit = () => {
    if (onExit) onExit();
    else setLocation("/");
  };

  // حماية من البلوكاج — 30 ثانية بلا حركة = اقتراح الخروج
  useEffect(() => {
    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setConfirming(true), idleMs);
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [idleMs]);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        aria-label={copy[0]}
        className="fixed top-[10px] z-[9999] bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg font-bold text-sm shadow-lg"
        style={{ insetInlineStart: 10 }}
        dir={direction}
      >
        ❌ {copy[1]}
      </button>

      {confirming && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4" dir={direction}>
          <div className="bg-card border-2 border-primary/40 rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-foreground font-bold text-lg mb-5">{copy[2]}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={doExit}
                className="px-6 py-2.5 rounded-[10px] font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90"
              >
                {copy[3]}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-6 py-2.5 rounded-[10px] font-bold text-primary-foreground"
                style={{ background: "hsl(var(--primary))" }}
              >
                {copy[4]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
