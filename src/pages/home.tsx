import { useState } from "react";
import { Link } from "wouter";
import "./home.css";

const SERVICES = [
  { name: "GDN-SMART", icon: "🧠", subtitle: "الذكاء الاصطناعي ومساعدك الذكي", path: "/smart" },
  { name: "GDN-FIT", icon: "💪", subtitle: "الرياضة واللياقة البدنية", path: "/sport" },
  { name: "GDN-CINE", icon: "🎬", subtitle: "عالم السينما والأفلام", path: "/cinema" },
  { name: "GDN-ARENA", icon: "⚔️", subtitle: "ساحة الألعاب والتحديات", path: "/games" },
  { name: "GDN-TO", icon: "🌐", subtitle: "الترجمة والتواصل مع العالم", path: "/fortress" },
  { name: "GDN-MUSIC", icon: "🎵", subtitle: "عالم الموسيقى والإبداع", path: "/music" },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const services = SERVICES.filter(service =>
    `${service.name} ${service.subtitle}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <div className="arena-home" dir="rtl" lang="ar">
      <header className="arena-home-header">
        <Link href="/" className="arena-home-brand" dir="ltr">ARENA QAISYPRO</Link>
        <label className="arena-home-search">
          <span className="sr-only">بحث</span>
          <input type="search" placeholder="بحث" value={query}
            onChange={event => setQuery(event.target.value)} aria-controls="arena-services" />
        </label>
      </header>

      <section className="arena-home-hero" aria-labelledby="arena-home-title">
        <h1 id="arena-home-title">الإمبراطورية الخالدة</h1>
        <Link href="/hub" className="arena-gold-button">ادخل إلى المركز</Link>
      </section>

      <section id="arena-services" className="arena-service-list" aria-label="خدمات الإمبراطورية">
        {services.map(service => (
          <article className="arena-service-card" key={service.name} aria-label={service.name}>
            <span className="arena-service-icon" aria-hidden="true">{service.icon}</span>
            <h2 dir="ltr">{service.name}</h2>
            <p>{service.subtitle}</p>
            <Link href={service.path} className="arena-gold-button" aria-label={`ابدأ ${service.name}`}>ابدأ</Link>
          </article>
        ))}
        {services.length === 0 && <p role="status">لا توجد نتائج</p>}
      </section>
    </div>
  );
}
