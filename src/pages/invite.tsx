import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Globe, Crown, Star, ChevronDown } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { localeFor as sharedLocaleFor, surfaceText } from "@/i18n/community-admin-surfaces-copy";

// ─── رابط الموقع ──────────────────────────────────────────────────────────────
const SITE_URL = import.meta.env.BASE_URL;
const SITE_SHORT = "GDNA Arena";
const localeFor = (lang: Parameters<typeof sharedLocaleFor>[0]) =>
  lang === "de" ? "de-DE" : sharedLocaleFor(lang);

// ─── المجالات ─────────────────────────────────────────────────────────────────
const FIELDS = [
  { key: "general",  label: "عام",        icon: "🌍", en: "General",   fr: "Général", es: "General", de: "Allgemein" },
  { key: "sport",    label: "رياضة",       icon: "⚽", en: "Sport",     fr: "Sport", es: "Deporte", de: "Sport" },
  { key: "music",    label: "موسيقى",      icon: "🎵", en: "Music",     fr: "Musique", es: "Música", de: "Musik" },
  { key: "cinema",   label: "سينما",       icon: "🎬", en: "Cinema",    fr: "Cinéma", es: "Cine", de: "Film" },
  { key: "business", label: "أعمال",       icon: "💼", en: "Business",  fr: "Business", es: "Negocios", de: "Wirtschaft" },
  { key: "science",  label: "علوم",        icon: "🔬", en: "Science",   fr: "Science", es: "Ciencia", de: "Wissenschaft" },
  { key: "art",      label: "فنون",        icon: "🎨", en: "Art",       fr: "Art", es: "Arte", de: "Kunst" },
  { key: "tech",     label: "تكنولوجيا",  icon: "💡", en: "Tech",      fr: "Technologie", es: "Tecnología", de: "Technologie" },
];

// ─── رسائل الدعوة ─────────────────────────────────────────────────────────────
const MESSAGES: Record<string, Record<string, string>> = {
  ar: {
    general: `السلام عليكم ورحمة الله وبركاته،

بكل شرف وتقدير، يسعدنا دعوتكم رسمياً إلى **Arena Qaisypro** — منصة الإمبراطورية الرقمية التي تجمع أعظم الأسماء في العالم.

Arena Qaisypro هي الفضاء الرقمي الأول من نوعه، تجمع الرياضة والموسيقى والسينما والتراث والعلوم في ساحة واحدة. مكانكم بين الكبار محجوز — لأن الأساطير الحقيقية تستحق منصة على مستواها.

انضموا إلينا اليوم:
🔗 ${SITE_URL}

بالغ التقدير والاحترام،
فريق Arena Qaisypro 🏛️`,

    sport: `السلام عليكم ورحمة الله،

يشرّفنا أن نُقدّم لكم **Arena Qaisypro** — المنصة الرقمية الإمبراطورية التي تعترف بعظمة الرياضيين البارزين وتُخلّد إرثهم.

في GlobalStar، يُصوّت ملايين المشجعين لأعظم الرياضيين في التاريخ — وصوتكم يستحق أن يُسمع. منصة صُمّمت لتكون سجلاً أبدياً لإنجازاتكم أمام العالم.

مكانكم بين الأساطير:
🔗 ${SITE_URL}

مع خالص التقدير،
فريق Arena Qaisypro ⚽🏆`,

    music: `السلام عليكم ورحمة الله،

تتشرف **Arena Qaisypro** بدعوتكم رسمياً — منصة الإمبراطورية الرقمية حيث تُصنع الأساطير الموسيقية.

الموسيقى هي روح الحضارات، وأنتم من خيرة من يحملون هذه الأمانة. في Arena Qaisypro، يلتقي عشرات الآلاف من محبي الموسيقى، يُصوّتون ويناقشون ويُكرّمون الأصوات الفريدة التي صنعت التاريخ.

اكتشفوا مكانكم في الإمبراطورية:
🔗 ${SITE_URL}

بكل محبة وتقدير،
فريق Arena Qaisypro 🎵🎤`,

    cinema: `السلام عليكم ورحمة الله،

بكل فخر، تدعوكم **Arena Qaisypro** — منصة الإمبراطورية الرقمية التي تُكرّم عمالقة السينما العالمية.

في ساحة Legends، تتصدر أسماء الأعظم من صنعوا تاريخ الفن السابع — وإرثكم يستحق مكاناً في هذه القاعة المُشرّفة. الملايين من عشّاق السينما ينتظرون التصويت لكم.

اكتشفوا الإمبراطورية السينمائية:
🔗 ${SITE_URL}

بتقدير وإعجاب بالغَين،
فريق Arena Qaisypro 🎬🎭`,

    business: `السلام عليكم ورحمة الله،

يُسعد **Arena Qaisypro** دعوتكم رسمياً — المنصة الرقمية التي تُكرّم أصحاب الرؤى والعقول الاقتصادية الكبرى.

نجاحاتكم وإرثكم في عالم الأعمال هو مصدر إلهام لملايين الطامحين. Arena Qaisypro تمنحكم منصة عالمية لتترك أثركم الرقمي بجانب كبار القادة والرواد في التاريخ.

انضموا إلى نخبة الإمبراطورية:
🔗 ${SITE_URL}

مع فائق الاحترام والتقدير،
فريق Arena Qaisypro 💼📈`,

    science: `السلام عليكم ورحمة الله،

بكل تقدير واحترام، تدعوكم **Arena Qaisypro** — منصة الإمبراطورية الرقمية التي تُعلي من قيمة العلم والعلماء.

العقول العلمية هي من تبني الحضارات وتغيّر مسار التاريخ. في Arena Qaisypro، يلتقي مجتمع من المفكرين والمعرفيين يُقدّر إسهاماتكم ويتابع مسيرتكم العلمية باهتمام بالغ.

اكتشفوا دوركم في الإمبراطورية:
🔗 ${SITE_URL}

بأسمى عبارات التقدير والاحترام،
فريق Arena Qaisypro 🔬🧬`,

    art: `السلام عليكم ورحمة الله،

تتشرف **Arena Qaisypro** بتوجيه هذه الدعوة الشرفية إليكم — منصة الإمبراطورية الرقمية التي تُقدّس الإبداع والفن الأصيل.

الفن هو الروح الخالدة للإنسانية، وأنتم من حاملي هذه الأمانة العظيمة. إبداعاتكم تستحق أن تُرى وتُقدَّر من ملايين العشّاق على Arena Qaisypro.

مكانكم بين عظماء الفن:
🔗 ${SITE_URL}

بإعجاب وتقدير لا حدود لهما،
فريق Arena Qaisypro 🎨✨`,

    tech: `السلام عليكم ورحمة الله،

يُقدّم لكم **Arena Qaisypro** دعوته الرسمية — المنصة الإمبراطورية الرقمية المبنية على أسس التكنولوجيا والابتكار.

العقول التكنولوجية هي من تصنع عالم الغد، وإسهاماتكم في هذا المجال تُلهم الأجيال. Arena Qaisypro تجمع مجتمعاً تقنياً متميزاً يُقدّر الرؤى الثاقبة والأفكار الخلاّقة.

اكتشفوا الإمبراطورية الرقمية:
🔗 ${SITE_URL}

بتقدير وإكبار،
فريق Arena Qaisypro 💡🚀`,
  },

  fr: {
    general: `Madame, Monsieur,

C'est avec un immense honneur que nous vous invitons officiellement à rejoindre **Arena Qaisypro** — la plateforme impériale numérique qui rassemble les plus grandes personnalités du monde.

Arena Qaisypro est le premier espace numérique de son genre, réunissant sport, musique, cinéma, patrimoine et science dans une seule arène. Votre place parmi les grands vous attend — car les véritables légendes méritent une plateforme à la hauteur de leur stature.

Rejoignez-nous aujourd'hui :
🔗 ${SITE_URL}

Avec nos plus sincères respects,
L'équipe Arena Qaisypro 🏛️`,

    sport: `Madame, Monsieur,

C'est un privilège pour **Arena Qaisypro** de vous adresser cette invitation officielle — la plateforme impériale qui honore les plus grands sportifs et perpétue leur héritage.

Dans GlobalStar, des millions de fans votent pour les champions qui ont marqué l'histoire du sport. Votre palmarès exceptionnel mérite d'être reconnu et célébré à l'échelle mondiale.

Votre place parmi les légendes :
🔗 ${SITE_URL}

Avec nos plus vifs respects,
L'équipe Arena Qaisypro ⚽🏆`,

    music: `Madame, Monsieur,

**Arena Qaisypro** a le grand honneur de vous adresser cette invitation officielle — la plateforme impériale où les légendes musicales sont célébrées comme elles le méritent.

La musique est l'âme des civilisations, et vous êtes parmi ceux qui portent cet héritage avec excellence. Des milliers de passionnés vous attendent sur Arena Qaisypro pour vous rendre l'hommage qui vous est dû.

Découvrez votre place dans l'Empire :
🔗 ${SITE_URL}

Avec toute notre admiration,
L'équipe Arena Qaisypro 🎵🎤`,

    cinema: `Madame, Monsieur,

C'est avec fierté que **Arena Qaisypro** vous convie officiellement — la plateforme impériale qui honore les géants du septième art mondial.

Dans notre Hall of Legends, les plus grands noms du cinéma sont célébrés et débattus par une communauté passionnée. Votre œuvre et votre vision artistique méritent une reconnaissance à l'échelle de votre talent.

Rejoignez les légendes du cinéma :
🔗 ${SITE_URL}

Avec toute notre admiration et notre respect,
L'équipe Arena Qaisypro 🎬🎭`,

    business: `Madame, Monsieur,

**Arena Qaisypro** a l'honneur de vous adresser cette invitation officielle — la plateforme impériale qui célèbre les grandes figures du monde des affaires et de l'économie.

Votre parcours exceptionnel et vos réalisations sont une source d'inspiration pour des millions d'entrepreneurs. Arena Qaisypro vous offre une tribune mondiale pour marquer votre empreinte numérique aux côtés des plus grands leaders de l'histoire.

Rejoignez l'élite de l'Empire :
🔗 ${SITE_URL}

Avec nos plus respectueuses salutations,
L'équipe Arena Qaisypro 💼📈`,

    science: `Madame, Monsieur,

C'est avec le plus grand respect que **Arena Qaisypro** vous adresse cette invitation officielle — la plateforme impériale qui valorise la science et les grandes découvertes humaines.

Les esprits scientifiques bâtissent les civilisations et orientent le cours de l'histoire. Sur Arena Qaisypro, une communauté de penseurs et d'intellectuels suit votre parcours avec admiration et intérêt.

Découvrez votre rôle dans l'Empire :
🔗 ${SITE_URL}

Avec nos plus profondes marques d'estime,
L'équipe Arena Qaisypro 🔬🧬`,

    art: `Madame, Monsieur,

**Arena Qaisypro** a le grand honneur de vous adresser cette invitation officielle — la plateforme impériale qui vénère la créativité et l'art authentique.

L'art est l'âme immortelle de l'humanité, et vous êtes parmi ceux qui portent cet héritage précieux. Vos œuvres méritent d'être découvertes et admirées par des millions d'amateurs sur Arena Qaisypro.

Votre place parmi les grands artistes :
🔗 ${SITE_URL}

Avec une admiration sans bornes,
L'équipe Arena Qaisypro 🎨✨`,

    tech: `Madame, Monsieur,

**Arena Qaisypro** vous adresse cette invitation officielle — la plateforme impériale numérique construite sur les fondements de la technologie et de l'innovation.

Les esprits technologiques façonnent le monde de demain, et vos contributions inspirent des générations entières. Arena Qaisypro rassemble une communauté tech d'élite qui valorise les visions audacieuses et les idées révolutionnaires.

Découvrez l'Empire numérique :
🔗 ${SITE_URL}

Avec tout notre respect et notre admiration,
L'équipe Arena Qaisypro 💡🚀`,
  },

  en: {
    general: `Dear [Name],

It is with great honor that we officially invite you to **Arena Qaisypro** — the digital imperial platform that unites the world's greatest figures across every field.

Arena Qaisypro is a first-of-its-kind digital space, bringing together sport, music, cinema, heritage, and science into one grand arena. Your place among the greats is reserved — because true legends deserve a platform worthy of their legacy.

Join us today:
🔗 ${SITE_URL}

With the highest regards,
The Arena Qaisypro Team 🏛️`,

    sport: `Dear [Name],

It is our privilege to extend this official invitation to you from **Arena Qaisypro** — the imperial digital platform that recognizes and immortalizes the legacy of the world's greatest athletes.

In GlobalStar, millions of fans vote for the champions who shaped sporting history — and your name deserves to stand among the immortals. A platform built to honor your achievements before the entire world.

Claim your place among the legends:
🔗 ${SITE_URL}

With the deepest respect and admiration,
The Arena Qaisypro Team ⚽🏆`,

    music: `Dear [Name],

**Arena Qaisypro** is honored to extend this official invitation — the imperial platform where musical legends are celebrated as they truly deserve.

Music is the soul of civilizations, and you are among those who carry this extraordinary torch. Thousands of passionate music lovers await you on Arena Qaisypro to pay the tribute your artistry deserves.

Discover your place in the Empire:
🔗 ${SITE_URL}

With deepest admiration,
The Arena Qaisypro Team 🎵🎤`,

    cinema: `Dear [Name],

It is with immense pride that **Arena Qaisypro** invites you officially — the imperial platform honoring the giants of world cinema.

In our Legends Hall, the greatest names in film history are celebrated and debated by a passionate community. Your body of work and artistic vision deserve recognition on a global scale.

Join the legends of cinema:
🔗 ${SITE_URL}

With the utmost admiration and respect,
The Arena Qaisypro Team 🎬🎭`,

    business: `Dear [Name],

**Arena Qaisypro** is honored to extend this official invitation — the imperial platform celebrating the great figures of global business and economic leadership.

Your extraordinary journey and achievements are an inspiration to millions of aspiring leaders worldwide. Arena Qaisypro offers you a global stage to leave your digital imprint alongside history's greatest minds.

Join the Empire's elite:
🔗 ${SITE_URL}

With the highest professional regards,
The Arena Qaisypro Team 💼📈`,

    science: `Dear [Name],

It is with the deepest respect that **Arena Qaisypro** addresses this official invitation — the imperial platform that elevates science and celebrates humanity's greatest discoveries.

Scientific minds build civilizations and shape the course of history. On Arena Qaisypro, a community of thinkers and intellectuals follows your journey with profound admiration.

Discover your role in the Empire:
🔗 ${SITE_URL}

With our highest esteem,
The Arena Qaisypro Team 🔬🧬`,

    art: `Dear [Name],

**Arena Qaisypro** has the great honor of extending this official invitation — the imperial platform that venerates creativity and authentic artistic expression.

Art is the immortal soul of humanity, and you are among those who carry this precious legacy. Your work deserves to be seen and celebrated by millions of admirers on Arena Qaisypro.

Your place among the great artists:
🔗 ${SITE_URL}

With boundless admiration,
The Arena Qaisypro Team 🎨✨`,

    tech: `Dear [Name],

**Arena Qaisypro** extends this official invitation — the imperial digital platform built on the foundations of technology and innovation.

Technological visionaries shape the world of tomorrow, and your contributions inspire entire generations. Arena Qaisypro brings together an elite tech community that values bold visions and revolutionary ideas.

Discover the digital Empire:
🔗 ${SITE_URL}

With our deepest respect and admiration,
The Arena Qaisypro Team 💡🚀`,
  },
  es: {
    general: `Estimado/a [Name],

Es un gran honor invitarle oficialmente a **Arena Qaisypro**, la plataforma imperial digital que reúne a las grandes figuras del mundo.

Deporte, música, cine, patrimonio y ciencia comparten una gran arena. Su lugar entre los grandes le espera.

Únase hoy:
🔗 ${SITE_URL}

Con nuestro mayor respeto,
El equipo de Arena Qaisypro 🏛️`,
    sport: `Estimado/a [Name],

**Arena Qaisypro** tiene el honor de invitarle a la plataforma imperial que reconoce el legado de los grandes deportistas. En GlobalStar, los aficionados celebran a quienes hicieron historia.

Ocupe su lugar entre las leyendas:
🔗 ${SITE_URL}

Con profunda admiración,
El equipo de Arena Qaisypro ⚽🏆`,
    music: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial donde se celebra a las leyendas de la música. Su arte merece el reconocimiento de una comunidad mundial.

Descubra su lugar en el Imperio:
🔗 ${SITE_URL}

Con admiración,
El equipo de Arena Qaisypro 🎵🎤`,
    cinema: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial que honra a los gigantes del cine mundial. Su obra y visión merecen un reconocimiento global.

Únase a las leyendas del cine:
🔗 ${SITE_URL}

Con admiración y respeto,
El equipo de Arena Qaisypro 🎬🎭`,
    business: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial que celebra el liderazgo empresarial. Su trayectoria inspira a millones de personas.

Únase a la élite del Imperio:
🔗 ${SITE_URL}

Con nuestro mayor respeto,
El equipo de Arena Qaisypro 💼📈`,
    science: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial que valora la ciencia y los grandes descubrimientos. Su contribución ayuda a construir el futuro.

Descubra su papel en el Imperio:
🔗 ${SITE_URL}

Con nuestra mayor estima,
El equipo de Arena Qaisypro 🔬🧬`,
    art: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial que honra la creatividad y el arte auténtico. Su obra merece ser vista y celebrada.

Ocupe su lugar entre los grandes artistas:
🔗 ${SITE_URL}

Con admiración,
El equipo de Arena Qaisypro 🎨✨`,
    tech: `Estimado/a [Name],

**Arena Qaisypro** le invita a la plataforma imperial digital fundada en la tecnología y la innovación. Sus ideas inspiran al mundo del mañana.

Descubra el Imperio digital:
🔗 ${SITE_URL}

Con respeto y admiración,
El equipo de Arena Qaisypro 💡🚀`,
  },
  de: {
    general: `Sehr geehrte(r) [Name],

mit großer Freude laden wir Sie offiziell zu **Arena Qaisypro** ein — der digitalen imperialen Plattform, die herausragende Persönlichkeiten aus aller Welt vereint.

Arena Qaisypro bringt Sport, Musik, Film, Kulturerbe und Wissenschaft in einer einzigartigen Arena zusammen. Ihr Platz unter den Großen wartet auf Sie — denn wahre Legenden verdienen eine Plattform, die ihrem Vermächtnis gerecht wird.

Werden Sie noch heute Teil der Arena:
🔗 ${SITE_URL}

Mit größter Hochachtung
Das Team von Arena Qaisypro 🏛️`,
    sport: `Sehr geehrte(r) [Name],

**Arena Qaisypro** lädt Sie herzlich auf die imperiale Plattform ein, die außergewöhnliche Sportlerinnen und Sportler würdigt und ihr Vermächtnis bewahrt.

Bei GlobalStar feiern Fans jene Champions, die Sportgeschichte geschrieben haben. Ihre Leistungen verdienen weltweite Anerkennung und einen Platz unter den Legenden.

Nehmen Sie Ihren Platz ein:
🔗 ${SITE_URL}

Mit tiefem Respekt und großer Bewunderung
Das Team von Arena Qaisypro ⚽🏆`,
    music: `Sehr geehrte(r) [Name],

**Arena Qaisypro** lädt Sie offiziell auf die imperiale Plattform ein, auf der musikalische Legenden die Würdigung erhalten, die sie verdienen.

Musik ist die Seele der Kulturen. Ihre Kunst und Ihr unverwechselbares Schaffen verdienen es, von einer weltweiten Gemeinschaft entdeckt und gefeiert zu werden.

Entdecken Sie Ihren Platz im Imperium:
🔗 ${SITE_URL}

Mit größter Bewunderung
Das Team von Arena Qaisypro 🎵🎤`,
    cinema: `Sehr geehrte(r) [Name],

mit großem Stolz lädt **Arena Qaisypro** Sie auf die imperiale Plattform ein, die den prägenden Persönlichkeiten des internationalen Films gewidmet ist.

In unserer Halle der Legenden würdigt eine leidenschaftliche Gemeinschaft die größten Namen der Filmgeschichte. Ihr Werk und Ihre künstlerische Vision verdienen weltweite Anerkennung.

Werden Sie Teil der Filmlegenden:
🔗 ${SITE_URL}

Mit höchster Anerkennung und Respekt
Das Team von Arena Qaisypro 🎬🎭`,
    business: `Sehr geehrte(r) [Name],

**Arena Qaisypro** lädt Sie offiziell auf die imperiale Plattform ein, die visionäre Persönlichkeiten aus Wirtschaft und Unternehmertum würdigt.

Ihr Weg und Ihre Erfolge inspirieren Menschen auf der ganzen Welt. Arena Qaisypro bietet Ihnen eine globale Bühne für Ihr digitales Vermächtnis an der Seite der bedeutendsten Führungspersönlichkeiten.

Werden Sie Teil der Elite des Imperiums:
🔗 ${SITE_URL}

Mit vorzüglicher Hochachtung
Das Team von Arena Qaisypro 💼📈`,
    science: `Sehr geehrte(r) [Name],

mit größtem Respekt lädt **Arena Qaisypro** Sie auf die imperiale Plattform ein, die Wissenschaft und die bedeutendsten Entdeckungen der Menschheit würdigt.

Wissenschaftliche Ideen bauen Zivilisationen auf und verändern den Lauf der Geschichte. Unsere Gemeinschaft verfolgt und schätzt Ihren Beitrag mit aufrichtiger Bewunderung.

Entdecken Sie Ihre Rolle im Imperium:
🔗 ${SITE_URL}

Mit unserer höchsten Wertschätzung
Das Team von Arena Qaisypro 🔬🧬`,
    art: `Sehr geehrte(r) [Name],

**Arena Qaisypro** lädt Sie offiziell auf die imperiale Plattform ein, die Kreativität und authentischen künstlerischen Ausdruck ehrt.

Kunst ist die unvergängliche Seele der Menschheit. Ihr Werk verdient es, von einer weltweiten Gemeinschaft gesehen, verstanden und gefeiert zu werden.

Ihr Platz unter den großen Kunstschaffenden:
🔗 ${SITE_URL}

Mit grenzenloser Bewunderung
Das Team von Arena Qaisypro 🎨✨`,
    tech: `Sehr geehrte(r) [Name],

**Arena Qaisypro** lädt Sie auf die digitale imperiale Plattform ein, die auf Technologie und Innovation aufbaut.

Technologische Visionärinnen und Visionäre gestalten die Welt von morgen. Ihre Ideen inspirieren Generationen und verdienen einen Platz in einer Gemeinschaft, die Mut und Fortschritt würdigt.

Entdecken Sie das digitale Imperium:
🔗 ${SITE_URL}

Mit tiefem Respekt und großer Bewunderung
Das Team von Arena Qaisypro 💡🚀`,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function InvitePage() {
  const { lang, setLang } = useLang();
  const [field, setField] = useState("general");
  const [copied, setCopied] = useState(false);
  const [name, setName]   = useState("");

  const rawMessage = MESSAGES[lang]?.[field] ?? MESSAGES[lang]?.general ?? "";
  const message = name.trim()
    ? rawMessage.replace("[Name]", name.trim()).replace("السلام عليكم ورحمة الله وبركاته،", `السلام عليكم ورحمة الله وبركاته ${name.trim()}،`).replace("Madame, Monsieur,", `Cher(e) ${name.trim()},`).replace("Dear [Name],", `Dear ${name.trim()},`).replace("Estimado/a [Name],", `Estimado/a ${name.trim()},`).replace("Sehr geehrte(r) [Name],", `Sehr geehrte(r) ${name.trim()},`)
    : rawMessage.replace("[Name]", "").trim();

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const selectedField = FIELDS.find(f => f.key === field)!;
  const isRTL = lang === "ar";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} lang={lang === "de" ? "de-DE" : lang} className="min-h-screen" style={{ background: "#030303" }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden border-b" style={{ borderColor: "#C9A84C20" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 65%)" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-14 text-center">
          {/* Crown icon */}
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5 }}
            className="text-6xl mb-6">♔</motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-3"
            style={{ color: "#C9A84C" }}>
            ARENA QAISYPRO
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-sm font-mono uppercase tracking-[0.4em] mb-2"
            style={{ color: "#C9A84C50" }}>
             {surfaceText(lang, "officialInvitation")}
          </motion.p>
          <motion.a href={SITE_URL} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 text-xs font-mono px-4 py-1.5 mt-2"
            style={{ border: "1px solid #C9A84C40", color: "#C9A84C", background: "rgba(201,168,76,0.06)" }}>
            <Globe className="w-3 h-3" /> {SITE_SHORT}
          </motion.a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* ── Controls ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest" style={{ color: "#C9A84C60" }}>
              {surfaceText(lang, "optionalName")}
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={surfaceText(lang, "nameExample")}
              className="w-full px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: "#0a0a0a", border: "1px solid #C9A84C20", color: "#fff" }}
              dir="auto" />
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest" style={{ color: "#C9A84C60" }}>
               {surfaceText(lang, "language")}
            </label>
            <div className="flex gap-2">
              {(["ar", "fr", "en", "es", "de"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wider transition-all"
                  style={{
                    border: `1px solid ${lang === l ? "#C9A84C" : "#C9A84C20"}`,
                    background: lang === l ? "rgba(201,168,76,0.12)" : "transparent",
                    color: lang === l ? "#C9A84C" : "#ffffff40",
                  }}>
                   {l === "ar" ? "🇲🇦 عربي" : l === "fr" ? "🇫🇷 Français" : l === "es" ? "🇪🇸 Español" : l === "de" ? "🇩🇪 Deutsch" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          </div>

          {/* Field selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest" style={{ color: "#C9A84C60" }}>
               {surfaceText(lang, "field")}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {FIELDS.map(f => (
                <button key={f.key} onClick={() => setField(f.key)}
                  className="py-2 text-xs font-bold transition-all"
                  style={{
                    border: `1px solid ${field === f.key ? "#C9A84C" : "#C9A84C15"}`,
                    background: field === f.key ? "rgba(201,168,76,0.10)" : "transparent",
                    color: field === f.key ? "#C9A84C" : "#ffffff35",
                  }}>
                  {f.icon} {lang === "ar" ? f.label : lang === "fr" ? f.fr : lang === "es" ? f.es : lang === "de" ? f.de : f.en}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Letter ── */}
        <AnimatePresence mode="wait">
          <motion.div key={lang + field + name}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="relative">

            {/* Decorative header */}
            <div className="flex items-center gap-3 mb-0 px-6 pt-6 pb-4"
              style={{ background: "rgba(201,168,76,0.06)", border: "1px solid #C9A84C25", borderBottom: "none" }}>
              <div className="text-2xl">{selectedField.icon}</div>
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "#C9A84C60" }}>
                    {surfaceText(lang, "decree")}
                </div>
                <div className="text-sm font-black" style={{ color: "#C9A84C" }}>
                    ARENA QAISYPRO — {lang === "ar" ? selectedField.label : lang === "fr" ? selectedField.fr : lang === "es" ? selectedField.es : lang === "de" ? selectedField.de : selectedField.en}
                </div>
              </div>
              <div className="ms-auto text-xs font-mono px-2 py-0.5"
                style={{ border: "1px solid #C9A84C30", color: "#C9A84C60" }}>
                {new Date().getFullYear()}
              </div>
            </div>

            {/* Divider line */}
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, #C9A84C50, transparent)" }} />

            {/* Letter body */}
            <div className="px-6 py-6 whitespace-pre-line text-sm leading-8"
              style={{
                background: "rgba(201,168,76,0.03)",
                border: "1px solid #C9A84C25",
                borderTop: "none",
                color: "#ffffffc0",
                direction: isRTL ? "rtl" : "ltr",
                fontFamily: isRTL ? "inherit" : "inherit",
              }}
              dir={isRTL ? "rtl" : "ltr"}>
              {message}
            </div>

            {/* Seal footer */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: "rgba(201,168,76,0.04)", border: "1px solid #C9A84C25", borderTop: "none" }}>
              <div className="flex items-center gap-2">
                <div className="text-xl">♔</div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest" style={{ color: "#C9A84C" }}>ARENA QAISYPRO</div>
                  <div className="text-[10px] font-mono" style={{ color: "#C9A84C40" }}>{SITE_SHORT}</div>
                </div>
              </div>
              <div className="text-xs font-mono" style={{ color: "#C9A84C30" }}>
                 🏛️ {surfaceText(lang, "imperialDecree")} · {new Date().toLocaleDateString(localeFor(lang))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Action buttons ── */}
        <div className="grid grid-cols-1 gap-3">
          <button onClick={copyMessage}
            className="flex items-center justify-center gap-2 py-3.5 text-sm font-black uppercase tracking-wider transition-all active:scale-95"
            style={{ background: "#C9A84C", color: "#000" }}>
            {copied
              ? <><Check className="w-4 h-4" /> {surfaceText(lang, "copied")}</>
              : <><Copy className="w-4 h-4" /> {surfaceText(lang, "copyMessage")}</>}
          </button>
        </div>

        {/* ── Tips ── */}
        <div className="space-y-2 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-center" style={{ color: "#C9A84C40" }}>
             {surfaceText(lang, "howUse")}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
               { icon: "✏️", text: surfaceText(lang, "addName") },
               { icon: "🌍", text: surfaceText(lang, "chooseLanguage") },
               { icon: "📤", text: surfaceText(lang, "copySend") },
            ].map((tip, i) => (
              <div key={i} className="p-3 text-xs space-y-1"
                style={{ border: "1px solid #C9A84C10", background: "rgba(201,168,76,0.02)", color: "#ffffff40" }}>
                <div className="text-xl">{tip.icon}</div>
                <div>{tip.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
