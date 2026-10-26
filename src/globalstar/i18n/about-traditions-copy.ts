export interface AboutTraditionsCopy {
  about: {
    title: string;
    mission: string;
    aiTitle: string;
    aiDescription: string;
    aiDetail: string;
    howTitle: string;
    howDescription: string;
    steps: Array<{ title: string; description: string }>;
    featuresTitle: string;
    features: Array<{ title: string; description: string }>;
    stats: {
      domains: string;
      updates: string;
      moderated: string;
      votes: string;
    };
  };
  traditions: {
    title: string;
    intro: string;
    filtersLabel: string;
    filterLabel: (category: string) => string;
    categories: Record<string, string>;
    archaeological: string;
    loading: string;
    empty: string;
  };
}

const en: AboutTraditionsCopy = {
  about: {
    title: "About GlobalStar",
    mission: "GlobalStar is the world’s premier platform for recognizing excellence across disciplines. We bring together millions of voices to celebrate achievement in real time.",
    aiTitle: "Powered by AI Moderation",
    aiDescription: "All content is automatically filtered using OpenAI to ensure quality and safety.",
    aiDetail: "Our AI moderation system analyzes all user-submitted content in real time, filtering spam and inappropriate material while helping ensure factual accuracy. This keeps GlobalStar a trusted platform where quality content rises to the top.",
    howTitle: "How It Works",
    howDescription: "Vote for public figures across 10 domains. Rankings update live as votes come in. AI moderation ensures all content meets quality standards.",
    steps: [
      { title: "Choose a Domain", description: "Browse 10 global domains, from football to archaeology, and find figures you admire." },
      { title: "Cast Your Vote", description: "Select the vote button to support your favorite public figures and watch the numbers rise." },
      { title: "Watch Rankings Shift", description: "Rankings update live as votes pour in from around the world, creating real-time competition." },
    ],
    featuresTitle: "Platform Features",
    features: [
      { title: "Real-Time Voting", description: "Cast your vote and watch rankings update instantly as millions participate worldwide." },
      { title: "10 Global Domains", description: "From football to archaeology, vote across diverse fields that shape our world." },
      { title: "AI Moderation", description: "OpenAI-powered content filtering supports quality and safety across all submissions." },
      { title: "Live Rankings", description: "Rankings shift in real time as votes pour in, creating electric competition." },
      { title: "Global Community", description: "Join millions of voters celebrating excellence across cultures and disciplines." },
      { title: "Fair & Transparent", description: "Every vote counts equally. No bias, no manipulation—just pure recognition." },
    ],
    stats: { domains: "Global Domains", updates: "Live Updates", moderated: "AI Moderated", votes: "Votes Welcome" },
  },
  traditions: {
    title: "Heritage",
    intro: "Explore cultural heritage sites and archaeological treasures from around the world.",
    filtersLabel: "Heritage categories",
    filterLabel: category => `Filter by ${category}`,
    categories: { All: "All Categories", Cultural: "Cultural", Archaeological: "Archaeological", Historical: "Historical", Religious: "Religious" },
    archaeological: "Archaeological",
    loading: "Loading heritage entries…",
    empty: "No heritage entries found.",
  },
};

const fr: AboutTraditionsCopy = {
  about: {
    title: "À propos de GlobalStar",
    mission: "GlobalStar est la première plateforme mondiale consacrée à la reconnaissance de l’excellence dans toutes les disciplines. Nous réunissons des millions de voix pour célébrer les réussites en temps réel.",
    aiTitle: "Modération assistée par l’IA",
    aiDescription: "Tout le contenu est automatiquement filtré avec OpenAI afin de garantir qualité et sécurité.",
    aiDetail: "Notre système de modération par IA analyse en temps réel tous les contenus proposés par les utilisateurs, filtre les indésirables et les éléments inappropriés, et contribue à vérifier l’exactitude des informations. GlobalStar reste ainsi une plateforme fiable où les contenus de qualité sont mis en avant.",
    howTitle: "Comment ça marche",
    howDescription: "Votez pour des personnalités dans 10 domaines. Les classements évoluent en direct à mesure que les votes arrivent. La modération par IA veille au respect des normes de qualité.",
    steps: [
      { title: "Choisissez un domaine", description: "Parcourez 10 domaines mondiaux, du football à l’archéologie, et trouvez les personnalités que vous admirez." },
      { title: "Votez", description: "Sélectionnez le bouton de vote pour soutenir vos personnalités préférées et regardez leur score augmenter." },
      { title: "Suivez les classements", description: "Les classements évoluent en direct avec les votes du monde entier, créant une compétition en temps réel." },
    ],
    featuresTitle: "Fonctionnalités de la plateforme",
    features: [
      { title: "Vote en temps réel", description: "Votez et regardez les classements s’actualiser instantanément tandis que des millions de personnes participent dans le monde." },
      { title: "10 domaines mondiaux", description: "Du football à l’archéologie, votez dans des domaines variés qui façonnent notre monde." },
      { title: "Modération par IA", description: "Le filtrage des contenus assisté par OpenAI favorise la qualité et la sécurité de toutes les contributions." },
      { title: "Classements en direct", description: "Les classements changent en temps réel au fil des votes et rendent la compétition passionnante." },
      { title: "Communauté mondiale", description: "Rejoignez des millions de votants qui célèbrent l’excellence à travers les cultures et les disciplines." },
      { title: "Équitable et transparent", description: "Chaque vote compte de la même manière. Aucun parti pris, aucune manipulation : seulement une reconnaissance authentique." },
    ],
    stats: { domains: "Domaines mondiaux", updates: "Mises à jour en direct", moderated: "Modération par IA", votes: "Votes bienvenus" },
  },
  traditions: {
    title: "Patrimoine",
    intro: "Explorez les sites du patrimoine culturel et les trésors archéologiques du monde entier.",
    filtersLabel: "Catégories du patrimoine",
    filterLabel: category => `Filtrer par ${category}`,
    categories: { All: "Toutes les catégories", Cultural: "Culturel", Archaeological: "Archéologique", Historical: "Historique", Religious: "Religieux" },
    archaeological: "Archéologique",
    loading: "Chargement des éléments du patrimoine…",
    empty: "Aucun élément du patrimoine trouvé.",
  },
};

const ar: AboutTraditionsCopy = {
  about: {
    title: "حول GlobalStar",
    mission: "GlobalStar هي المنصة العالمية الرائدة لتقدير التميز في مختلف المجالات. نجمع ملايين الأصوات للاحتفاء بالإنجازات لحظة بلحظة.",
    aiTitle: "مدعوم بالإشراف بالذكاء الاصطناعي",
    aiDescription: "تُصفّى جميع المحتويات تلقائياً باستخدام OpenAI لضمان الجودة والسلامة.",
    aiDetail: "يحلل نظام الإشراف بالذكاء الاصطناعي جميع المحتويات التي يرسلها المستخدمون لحظة بلحظة، فيحجب الرسائل المزعجة والمواد غير الملائمة ويساعد على ضمان دقة المعلومات. وهكذا تظل GlobalStar منصة موثوقة يتصدر فيها المحتوى عالي الجودة.",
    howTitle: "كيف تعمل المنصة",
    howDescription: "صوّت للشخصيات العامة في 10 مجالات. تتحدث التصنيفات مباشرة مع وصول الأصوات، ويضمن الإشراف بالذكاء الاصطناعي استيفاء المحتوى لمعايير الجودة.",
    steps: [
      { title: "اختر مجالاً", description: "تصفح 10 مجالات عالمية، من كرة القدم إلى علم الآثار، واعثر على الشخصيات التي تعجبك." },
      { title: "أدلِ بصوتك", description: "اختر زر التصويت لدعم شخصياتك العامة المفضلة وشاهد الأرقام ترتفع." },
      { title: "تابع تغير التصنيفات", description: "تتحدث التصنيفات مباشرة مع تدفق الأصوات من أنحاء العالم، لتصنع منافسة لحظية." },
    ],
    featuresTitle: "ميزات المنصة",
    features: [
      { title: "تصويت لحظي", description: "أدلِ بصوتك وشاهد التصنيفات تتحدث فوراً مع مشاركة الملايين حول العالم." },
      { title: "10 مجالات عالمية", description: "صوّت في مجالات متنوعة تشكل عالمنا، من كرة القدم إلى علم الآثار." },
      { title: "إشراف بالذكاء الاصطناعي", description: "يدعم ترشيح المحتوى بتقنية OpenAI جودة جميع المشاركات وسلامتها." },
      { title: "تصنيفات مباشرة", description: "تتغير التصنيفات لحظة بلحظة مع تدفق الأصوات، لتصنع منافسة حماسية." },
      { title: "مجتمع عالمي", description: "انضم إلى ملايين المصوتين الذين يحتفون بالتميز عبر الثقافات والتخصصات." },
      { title: "عادل وشفاف", description: "كل صوت له القيمة نفسها. لا تحيز ولا تلاعب، بل تقدير حقيقي فقط." },
    ],
    stats: { domains: "مجالات عالمية", updates: "تحديثات مباشرة", moderated: "بإشراف الذكاء الاصطناعي", votes: "الأصوات مرحب بها" },
  },
  traditions: {
    title: "التراث",
    intro: "استكشف مواقع التراث الثقافي والكنوز الأثرية من جميع أنحاء العالم.",
    filtersLabel: "فئات التراث",
    filterLabel: category => `التصفية حسب ${category}`,
    categories: { All: "كل الفئات", Cultural: "ثقافي", Archaeological: "أثري", Historical: "تاريخي", Religious: "ديني" },
    archaeological: "أثري",
    loading: "جارٍ تحميل عناصر التراث…",
    empty: "لم يُعثر على عناصر تراثية.",
  },
};

const es: AboutTraditionsCopy = {
  about: {
    title: "Acerca de GlobalStar",
    mission: "GlobalStar es la principal plataforma mundial para reconocer la excelencia en todas las disciplinas. Reunimos millones de voces para celebrar los logros en tiempo real.",
    aiTitle: "Moderación con IA",
    aiDescription: "Todo el contenido se filtra automáticamente con OpenAI para garantizar la calidad y la seguridad.",
    aiDetail: "Nuestro sistema de moderación con IA analiza en tiempo real todo el contenido enviado por los usuarios, filtra el spam y el material inapropiado, y ayuda a garantizar la exactitud de la información. Así, GlobalStar sigue siendo una plataforma fiable donde el contenido de calidad llega a lo más alto.",
    howTitle: "Cómo funciona",
    howDescription: "Vota por figuras públicas de 10 ámbitos. Las clasificaciones se actualizan en directo a medida que llegan votos. La moderación con IA garantiza que todo el contenido cumpla los estándares de calidad.",
    steps: [
      { title: "Elige un ámbito", description: "Explora 10 ámbitos globales, desde el fútbol hasta la arqueología, y encuentra figuras que admires." },
      { title: "Emite tu voto", description: "Selecciona el botón de voto para apoyar a tus figuras públicas favoritas y observa cómo suben las cifras." },
      { title: "Sigue las clasificaciones", description: "Las clasificaciones se actualizan en directo con votos de todo el mundo, creando una competición en tiempo real." },
    ],
    featuresTitle: "Funciones de la plataforma",
    features: [
      { title: "Votación en tiempo real", description: "Emite tu voto y observa cómo las clasificaciones se actualizan al instante mientras millones de personas participan en todo el mundo." },
      { title: "10 ámbitos globales", description: "Desde el fútbol hasta la arqueología, vota en diversos campos que dan forma a nuestro mundo." },
      { title: "Moderación con IA", description: "El filtrado de contenido con OpenAI favorece la calidad y la seguridad de todos los envíos." },
      { title: "Clasificaciones en directo", description: "Las clasificaciones cambian en tiempo real con cada voto y crean una competición apasionante." },
      { title: "Comunidad global", description: "Únete a millones de votantes que celebran la excelencia entre culturas y disciplinas." },
      { title: "Justo y transparente", description: "Todos los votos cuentan por igual. Sin sesgos ni manipulación: solo reconocimiento auténtico." },
    ],
    stats: { domains: "Ámbitos globales", updates: "Actualizaciones en directo", moderated: "Moderación con IA", votes: "Votos bienvenidos" },
  },
  traditions: {
    title: "Patrimonio",
    intro: "Explora lugares de patrimonio cultural y tesoros arqueológicos de todo el mundo.",
    filtersLabel: "Categorías de patrimonio",
    filterLabel: category => `Filtrar por ${category}`,
    categories: { All: "Todas las categorías", Cultural: "Cultural", Archaeological: "Arqueológico", Historical: "Histórico", Religious: "Religioso" },
    archaeological: "Arqueológico",
    loading: "Cargando elementos patrimoniales…",
    empty: "No se encontraron elementos patrimoniales.",
  },
};

const de: AboutTraditionsCopy = {
  about: {
    title: "Über GlobalStar",
    mission: "GlobalStar ist die weltweit führende Plattform zur Würdigung herausragender Leistungen in allen Disziplinen. Wir vereinen Millionen von Stimmen, um Erfolge in Echtzeit zu feiern.",
    aiTitle: "KI-gestützte Moderation",
    aiDescription: "Alle Inhalte werden automatisch mit OpenAI gefiltert, um Qualität und Sicherheit zu gewährleisten.",
    aiDetail: "Unser KI-Moderationssystem analysiert sämtliche von Nutzern eingereichten Inhalte in Echtzeit. Es filtert Spam und unangemessenes Material und trägt dazu bei, die sachliche Richtigkeit zu gewährleisten. So bleibt GlobalStar eine vertrauenswürdige Plattform, auf der hochwertige Inhalte ganz oben stehen.",
    howTitle: "So funktioniert es",
    howDescription: "Stimme in 10 Bereichen für Persönlichkeiten des öffentlichen Lebens ab. Die Ranglisten werden mit jedem neuen Votum live aktualisiert. Die KI-Moderation stellt sicher, dass alle Inhalte den Qualitätsstandards entsprechen.",
    steps: [
      { title: "Bereich auswählen", description: "Entdecke 10 globale Bereiche vom Fußball bis zur Archäologie und finde Persönlichkeiten, die du bewunderst." },
      { title: "Stimme abgeben", description: "Wähle die Abstimmungsschaltfläche, um deine Lieblingspersönlichkeiten zu unterstützen, und sieh ihre Stimmenzahl steigen." },
      { title: "Ranglisten verfolgen", description: "Die Ranglisten verändern sich live mit den Stimmen aus aller Welt und schaffen einen Wettbewerb in Echtzeit." },
    ],
    featuresTitle: "Funktionen der Plattform",
    features: [
      { title: "Abstimmungen in Echtzeit", description: "Gib deine Stimme ab und sieh zu, wie sich die Ranglisten sofort aktualisieren, während Millionen Menschen weltweit teilnehmen." },
      { title: "10 globale Bereiche", description: "Stimme vom Fußball bis zur Archäologie in vielfältigen Feldern ab, die unsere Welt prägen." },
      { title: "KI-Moderation", description: "Die OpenAI-gestützte Inhaltsfilterung fördert Qualität und Sicherheit bei allen Einreichungen." },
      { title: "Live-Ranglisten", description: "Die Ranglisten verändern sich mit jeder Stimme in Echtzeit und sorgen für einen mitreißenden Wettbewerb." },
      { title: "Globale Gemeinschaft", description: "Schließe dich Millionen Abstimmenden an, die herausragende Leistungen über Kulturen und Disziplinen hinweg feiern." },
      { title: "Fair und transparent", description: "Jede Stimme zählt gleich. Keine Voreingenommenheit, keine Manipulation – nur echte Anerkennung." },
    ],
    stats: { domains: "Globale Bereiche", updates: "Live-Aktualisierungen", moderated: "KI-moderiert", votes: "Stimmen willkommen" },
  },
  traditions: {
    title: "Kulturerbe",
    intro: "Entdecke Kulturstätten und archäologische Schätze aus aller Welt.",
    filtersLabel: "Kulturerbe-Kategorien",
    filterLabel: category => `Nach ${category} filtern`,
    categories: { All: "Alle Kategorien", Cultural: "Kulturell", Archaeological: "Archäologisch", Historical: "Historisch", Religious: "Religiös" },
    archaeological: "Archäologisch",
    loading: "Kulturerbe-Einträge werden geladen…",
    empty: "Keine Kulturerbe-Einträge gefunden.",
  },
};

export function aboutTraditionsCopy(language: string): AboutTraditionsCopy {
  if (language === "de") return de;
  if (language === "fr") return fr;
  if (language === "ar") return ar;
  if (language === "es") return es;
  return en;
}