import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installOfflineNetworkGuards } from "@/lib/network";

installOfflineNetworkGuards();
createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const syncServiceWorkerConnectivity = () => {
    navigator.serviceWorker.controller?.postMessage({
      type: "GDNA_CONNECTIVITY",
      online: navigator.onLine,
    });
  };
  window.addEventListener("online", syncServiceWorkerConnectivity);
  window.addEventListener("offline", syncServiceWorkerConnectivity);
  navigator.serviceWorker.addEventListener("controllerchange", syncServiceWorkerConnectivity);
  const registerServiceWorker = () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    }).then(registration => {
      syncServiceWorkerConnectivity();
      return registration.update();
    }).catch(error => {
      console.warn("Service worker registration failed:", error);
    });
  };
  if (document.readyState === "complete") registerServiceWorker();
  else window.addEventListener("load", registerServiceWorker, { once: true });
}