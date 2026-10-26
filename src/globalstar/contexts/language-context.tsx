import { createContext, useContext } from 'react';
import { useLang, type Lang } from '@/contexts/LangContext';

type Language = Lang;

type TranslationKey =
  | 'home'
  | 'ranking'
  | 'news'
  | 'traditions'
  | 'about'
  | 'vote'
  | 'votes'
  | 'rank'
  | 'viewProfile'
  | 'liveRankings'
  | 'breakingNews'
  | 'allDomains'
  | 'football'
  | 'music'
  | 'science'
  | 'literature'
  | 'film'
  | 'politics'
  | 'business'
  | 'sports'
  | 'archaeology'
  | 'traditionsLabel'
  | 'whereTheWorldVotes'
  | 'aiModerated'
  | 'aiModeratedDesc'
  | 'voteForYourFavorites'
  | 'recentActivity'
  | 'voteTrend'
  | 'bio'
  | 'filterByCategory'
  | 'archaeological'
  | 'cultural'
  | 'aboutPlatform'
  | 'missionStatement'
  | 'howItWorks'
  | 'howItWorksDesc'
  | 'earnings'
  | 'totalVotes'
  | 'topVotes'
  | 'noRankings'
  | 'figureNotFound'
  | 'backRankings'
  | 'stories'
  | 'noNews'
  | 'noTraditions'
  | 'allCategories'
  | 'heritageIntro'
  | 'breaking';

type Translations = Record<Language, Record<TranslationKey, string>>;

const translations: Translations = {
  en: {
    home: 'Home',
    ranking: 'Rankings',
    news: 'News',
    traditions: 'Heritage',
    about: 'About',
    vote: 'Vote',
    votes: 'Votes',
    rank: 'Rank',
    viewProfile: 'View Profile',
    liveRankings: 'Live Rankings',
    breakingNews: 'Breaking News',
    allDomains: 'All Domains',
    football: 'Football',
    music: 'Music',
    science: 'Science',
    literature: 'Literature',
    film: 'Film',
    politics: 'Politics',
    business: 'Business',
    sports: 'Sports',
    archaeology: 'Archaeology',
    traditionsLabel: 'Traditions',
    whereTheWorldVotes: 'Where the world votes',
    aiModerated: 'Powered by AI Moderation',
    aiModeratedDesc: 'All content is automatically filtered using OpenAI to ensure quality and safety.',
    voteForYourFavorites: 'Vote for your favorites across 10 global domains',
    recentActivity: 'Recent Activity',
    voteTrend: 'Vote Trend',
    bio: 'Biography',
    filterByCategory: 'Filter by Category',
    archaeological: 'Archaeological',
    cultural: 'Cultural',
    aboutPlatform: 'About GlobalStar',
    missionStatement: 'GlobalStar is the world\'s premier platform for recognizing excellence across disciplines. We bring together millions of voices to celebrate achievement in real time.',
    howItWorks: 'How It Works',
    howItWorksDesc: 'Vote for public figures across 10 domains. Rankings update live as votes come in. AI moderation ensures all content meets quality standards.',
    earnings: 'My Earnings', totalVotes: 'Total Votes', topVotes: '#1 Votes', noRankings: 'No rankings found', figureNotFound: 'Figure not found', backRankings: 'Back to Rankings', stories: 'Stories', noNews: 'No news articles available', noTraditions: 'No heritage entries found', allCategories: 'All Categories', heritageIntro: 'Explore cultural heritage sites and archaeological treasures from around the world', breaking: 'BREAKING',
  },
  ar: {
    home: 'الرئيسية',
    ranking: 'التصنيفات',
    news: 'الأخبار',
    traditions: 'التراث',
    about: 'حول',
    vote: 'صوّت',
    votes: 'أصوات',
    rank: 'الترتيب',
    viewProfile: 'عرض الملف',
    liveRankings: 'التصنيفات المباشرة',
    breakingNews: 'عاجل',
    allDomains: 'كل المجالات',
    football: 'كرة القدم',
    music: 'الموسيقى',
    science: 'العلوم',
    literature: 'الأدب',
    film: 'السينما',
    politics: 'السياسة',
    business: 'الأعمال',
    sports: 'الرياضة',
    archaeology: 'الآثار',
    traditionsLabel: 'التقاليد',
    whereTheWorldVotes: 'حيث يصوت العالم',
    aiModerated: 'مدعوم بالإشراف الذكي',
    aiModeratedDesc: 'يتم فلترة جميع المحتويات تلقائياً باستخدام الذكاء الاصطناعي لضمان الجودة والأمان.',
    voteForYourFavorites: 'صوّت لمفضلاتك عبر 10 مجالات عالمية',
    recentActivity: 'النشاط الأخير',
    voteTrend: 'اتجاه التصويت',
    bio: 'السيرة الذاتية',
    filterByCategory: 'تصفية حسب الفئة',
    archaeological: 'أثري',
    cultural: 'ثقافي',
    aboutPlatform: 'حول GlobalStar',
    missionStatement: 'GlobalStar هي المنصة العالمية الرائدة للاعتراف بالتميز عبر التخصصات. نجمع ملايين الأصوات للاحتفال بالإنجازات في الوقت الفعلي.',
    howItWorks: 'كيف يعمل',
    howItWorksDesc: 'صوّت للشخصيات العامة عبر 10 مجالات. تُحدث التصنيفات مباشرة مع وصول الأصوات. يضمن الإشراف الذكي استيفاء جميع المحتويات لمعايير الجودة.',
    earnings: 'أرباحي', totalVotes: 'إجمالي الأصوات', topVotes: 'أصوات المركز الأول', noRankings: 'لا توجد تصنيفات', figureNotFound: 'الشخصية غير موجودة', backRankings: 'العودة إلى التصنيفات', stories: 'قصص', noNews: 'لا توجد مقالات إخبارية', noTraditions: 'لا توجد عناصر تراثية', allCategories: 'كل الفئات', heritageIntro: 'استكشف مواقع التراث الثقافي والكنوز الأثرية من أنحاء العالم', breaking: 'عاجل',
  },
  fr: {
    home: 'Accueil',
    ranking: 'Classements',
    news: 'Actualités',
    traditions: 'Patrimoine',
    about: 'À propos',
    vote: 'Voter',
    votes: 'Votes',
    rank: 'Rang',
    viewProfile: 'Voir le profil',
    liveRankings: 'Classements en direct',
    breakingNews: 'Dernière minute',
    allDomains: 'Tous les domaines',
    football: 'Football',
    music: 'Musique',
    science: 'Science',
    literature: 'Littérature',
    film: 'Cinéma',
    politics: 'Politique',
    business: 'Affaires',
    sports: 'Sports',
    archaeology: 'Archéologie',
    traditionsLabel: 'Traditions',
    whereTheWorldVotes: 'Où le monde vote',
    aiModerated: 'Modération par IA',
    aiModeratedDesc: 'Tout le contenu est automatiquement filtré par OpenAI pour garantir qualité et sécurité.',
    voteForYourFavorites: 'Votez pour vos favoris dans 10 domaines mondiaux',
    recentActivity: 'Activité récente',
    voteTrend: 'Tendance des votes',
    bio: 'Biographie',
    filterByCategory: 'Filtrer par catégorie',
    archaeological: 'Archéologique',
    cultural: 'Culturel',
    aboutPlatform: 'À propos de GlobalStar',
    missionStatement: 'GlobalStar est la principale plateforme mondiale pour reconnaître l\'excellence à travers les disciplines. Nous rassemblons des millions de voix pour célébrer les réalisations en temps réel.',
    howItWorks: 'Comment ça marche',
    howItWorksDesc: 'Votez pour des personnalités publiques dans 10 domaines. Les classements se mettent à jour en direct. La modération IA garantit que tout le contenu respecte les normes de qualité.',
    earnings: 'Mes revenus', totalVotes: 'Total des votes', topVotes: 'Votes n°1', noRankings: 'Aucun classement trouvé', figureNotFound: 'Personnalité introuvable', backRankings: 'Retour aux classements', stories: 'Histoires', noNews: 'Aucun article disponible', noTraditions: 'Aucun élément patrimonial trouvé', allCategories: 'Toutes les catégories', heritageIntro: 'Explorez les sites du patrimoine culturel et les trésors archéologiques du monde entier', breaking: 'URGENT',
  },
  es: {
    home: 'Inicio', ranking: 'Clasificaciones', news: 'Noticias', traditions: 'Patrimonio', about: 'Acerca de',
    vote: 'Votar', votes: 'Votos', rank: 'Puesto', viewProfile: 'Ver perfil', liveRankings: 'Clasificaciones en directo',
    breakingNews: 'Última hora', allDomains: 'Todos los ámbitos', football: 'Fútbol', music: 'Música', science: 'Ciencia',
    literature: 'Literatura', film: 'Cine', politics: 'Política', business: 'Negocios', sports: 'Deportes',
    archaeology: 'Arqueología', traditionsLabel: 'Tradiciones', whereTheWorldVotes: 'Donde vota el mundo',
    aiModerated: 'Con moderación de IA', aiModeratedDesc: 'Todo el contenido se filtra automáticamente con OpenAI para garantizar calidad y seguridad.',
    voteForYourFavorites: 'Vota por tus favoritos en 10 ámbitos globales', recentActivity: 'Actividad reciente',
    voteTrend: 'Tendencia de votos', bio: 'Biografía', filterByCategory: 'Filtrar por categoría',
    archaeological: 'Arqueológico', cultural: 'Cultural', aboutPlatform: 'Acerca de GlobalStar',
    missionStatement: 'GlobalStar es la principal plataforma mundial para reconocer la excelencia en todas las disciplinas. Reunimos millones de voces para celebrar los logros en tiempo real.',
    howItWorks: 'Cómo funciona', howItWorksDesc: 'Vota por figuras públicas en 10 ámbitos. Las clasificaciones se actualizan en directo a medida que llegan votos. La moderación por IA garantiza estándares de calidad.',
    earnings: 'Mis ganancias', totalVotes: 'Total de votos', topVotes: 'Votos n.º 1', noRankings: 'No se encontraron clasificaciones', figureNotFound: 'Figura no encontrada', backRankings: 'Volver a clasificaciones', stories: 'Historias', noNews: 'No hay artículos de noticias disponibles', noTraditions: 'No se encontraron elementos patrimoniales', allCategories: 'Todas las categorías', heritageIntro: 'Explora lugares de patrimonio cultural y tesoros arqueológicos de todo el mundo', breaking: 'ÚLTIMA HORA',
  },
  de: {
    home: 'Startseite',
    ranking: 'Ranglisten',
    news: 'Nachrichten',
    traditions: 'Kulturerbe',
    about: 'Über uns',
    vote: 'Abstimmen',
    votes: 'Stimmen',
    rank: 'Rang',
    viewProfile: 'Profil ansehen',
    liveRankings: 'Live-Ranglisten',
    breakingNews: 'Eilmeldungen',
    allDomains: 'Alle Bereiche',
    football: 'Fußball',
    music: 'Musik',
    science: 'Wissenschaft',
    literature: 'Literatur',
    film: 'Film',
    politics: 'Politik',
    business: 'Wirtschaft',
    sports: 'Sport',
    archaeology: 'Archäologie',
    traditionsLabel: 'Traditionen',
    whereTheWorldVotes: 'Wo die Welt abstimmt',
    aiModerated: 'KI-gestützte Moderation',
    aiModeratedDesc: 'Alle Inhalte werden automatisch mithilfe von OpenAI gefiltert, um Qualität und Sicherheit zu gewährleisten.',
    voteForYourFavorites: 'Stimme in 10 globalen Bereichen für deine Favoriten ab',
    recentActivity: 'Letzte Aktivitäten',
    voteTrend: 'Abstimmungstrend',
    bio: 'Biografie',
    filterByCategory: 'Nach Kategorie filtern',
    archaeological: 'Archäologisch',
    cultural: 'Kulturell',
    aboutPlatform: 'Über GlobalStar',
    missionStatement: 'GlobalStar ist die weltweit führende Plattform zur Anerkennung herausragender Leistungen in allen Disziplinen. Wir bringen Millionen von Stimmen zusammen, um Erfolge in Echtzeit zu feiern.',
    howItWorks: 'So funktioniert es',
    howItWorksDesc: 'Stimme in 10 Bereichen für Persönlichkeiten des öffentlichen Lebens ab. Die Ranglisten werden live aktualisiert, sobald Stimmen eingehen. Die KI-Moderation stellt sicher, dass alle Inhalte den Qualitätsstandards entsprechen.',
    earnings: 'Meine Einnahmen',
    totalVotes: 'Stimmen insgesamt',
    topVotes: 'Stimmen für Platz 1',
    noRankings: 'Keine Ranglisten gefunden',
    figureNotFound: 'Person nicht gefunden',
    backRankings: 'Zurück zu den Ranglisten',
    stories: 'Geschichten',
    noNews: 'Keine Nachrichtenartikel verfügbar',
    noTraditions: 'Keine Kulturerbe-Einträge gefunden',
    allCategories: 'Alle Kategorien',
    heritageIntro: 'Entdecke Kulturerbestätten und archäologische Schätze aus aller Welt',
    breaking: 'EILMELDUNG',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { lang, setLang } = useLang();
  const language = lang;
  const isRTL = language === 'ar';
  const t = (key: TranslationKey): string => translations[language][key];
  return <LanguageContext.Provider value={{ language, setLanguage: setLang, t, isRTL }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
