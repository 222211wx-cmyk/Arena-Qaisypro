import { useEffect, useState } from "react";
import { getNetworkState, setLimitedData, subscribeNetwork } from "../lib/network-detect";

const messages: Record<string, [string, string]> = {
  en: ["Limited data mode", "Open Lite"],
  ar: ["وضع البيانات المحدودة", "افتح النسخة الخفيفة"],
  fr: ["Mode données limitées", "Ouvrir Lite"],
  es: ["Modo de datos limitados", "Abrir Lite"],
  de: ["Datensparmodus", "Lite öffnen"],
  pt: ["Modo de dados limitados", "Abrir Lite"],
  hi: ["सीमित डेटा मोड", "लाइट खोलें"],
};
export default function NetworkBanner() {
  const [state, setState] = useState(getNetworkState);
  useEffect(() => subscribeNetwork(setState), []);
  const text = messages[(document.documentElement.lang || navigator.language).split("-")[0]] || messages.en;
  return <aside aria-label={text[0]} style={{ fontFamily: "system-ui", padding: "8px 12px" }}>
    <label><input type="checkbox" checked={state.limitedData} onChange={event => setLimitedData(event.target.checked)} /> {text[0]}</label>
    {state.forceLiteMode && <> · <a href={`${import.meta.env.BASE_URL}lite`}>{text[1]}</a></>}
  </aside>;
}