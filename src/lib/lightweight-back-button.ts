import { tokens } from "@workspace/gdna-ds/tokens";
import { closeBackLayer, navigateForward, clearForwardSteps } from "./navigation-layers";

/** The non-React Clips/Lite shells must not load React just for navigation. */
export function mountLightweightBackButton() {
  if (document.getElementById("global-navigation")) return;
  const palette = tokens.color.dark;
  const bar = document.createElement("nav");
  bar.id = "global-navigation";
  bar.dir = "rtl";
  bar.setAttribute("aria-label", "رجوع / أمام");
  const height = `calc(56px + env(safe-area-inset-top, 0px))`;
  document.documentElement.style.setProperty("--arena-navigation-height", height);
  Object.assign(bar.style, {
    position: "fixed", top: "0", left: "0", right: "0", zIndex: "50",
    height, boxSizing: "border-box", padding: `env(safe-area-inset-top, 0px) calc(${tokens.spacing} * 3) 0`,
    background: palette.background, borderBottom: `1px solid ${palette.border}`,
    display: "flex", alignItems: "center", gap: `calc(${tokens.spacing} * 2)`,
  });
  // Fixed media shells reserve this row explicitly; normal Lite content flows below it.
  const spacer = document.createElement("div");
  spacer.style.height = height;
  spacer.setAttribute("aria-hidden", "true");
  const button = document.createElement("button");
  button.id = "global-back-button";
  button.type = "button";
  button.textContent = "→ رجوع";
  button.setAttribute("aria-label", "رجوع");
  button.title = "رجوع";
  Object.assign(button.style, {
    padding: `0 calc(${tokens.spacing} * 3)`, height: `calc(${tokens.spacing} * 9)`,
    borderRadius: tokens.radius, background: palette.background, color: palette.foreground,
    border: `1px solid ${palette.border}`, cursor: "pointer",
    display: "grid", placeItems: "center",
  });
  button.onclick = () => {
    if (closeBackLayer()) return;
    if (history.length > 1) history.back();
    else location.assign(import.meta.env.BASE_URL);
  };
  const forward = button.cloneNode(true) as HTMLButtonElement;
  forward.id = "global-forward-button";
  forward.textContent = "← أمام";
  forward.setAttribute("aria-label", "أمام");
  forward.title = "أمام";
  forward.onclick = navigateForward;
  const labels=()=>{
    let lang='ar';try{lang=localStorage.getItem('ameeq_lang')||localStorage.getItem('gdna_lang')||'ar';}catch{}
    const rtl=['ar','ar-MA','ary'].includes(lang);
    bar.dir=rtl?'rtl':'ltr';
    const backLabel=rtl?'رجوع':lang==='fr'?'Retour':'Back';
    const nextLabel=rtl?'أمام':lang==='fr'?'Devant':'Forward';
    button.textContent=`${rtl?'→':'←'} ${backLabel}`;forward.textContent=`${rtl?'←':'→'} ${nextLabel}`;
    button.setAttribute('aria-label',backLabel);forward.setAttribute('aria-label',nextLabel);
  };
  labels();window.addEventListener('ameeq-language',()=>setTimeout(labels,0));
  window.addEventListener("popstate", clearForwardSteps);
  bar.append(button, forward);
  document.body.prepend(spacer, bar);
}