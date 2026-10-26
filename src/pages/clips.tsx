import { useEffect } from "react";

/** Forces the isolated clip boot when reached through the legacy SPA router. */
export default function ClipsPage() {
  useEffect(() => {
    window.location.assign(`${import.meta.env.BASE_URL}clips`);
  }, []);
  return <p dir="rtl">جارٍ فتح الكليبز…</p>;
}