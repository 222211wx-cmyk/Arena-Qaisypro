import { installApiTransport } from "./lib/api-transport";
import { mountLite } from "./lite-entry";

installApiTransport();

mountLite(document.getElementById("lite-root")!);

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(error => console.error("Lite offline installation failed", error));
}