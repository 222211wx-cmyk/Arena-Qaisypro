export type HomeRankingCopy = {
  home: {
    imperialLines: string[];
    imperialHall: string;
    enterRankings: string;
    moderationAccuracy: string;
    realTime: string;
    territoryRotunda: string;
    territoryOfTheHour: string;
    loadingTerritories: string;
    loadingFigures: string;
    activeTerritory: string;
    immortals: string;
    tributes: string;
    seeAll: string;
    profile: string;
    allTerritories: string;
    fullRankingsAvailable: string;
    enterFullRankings: string;
    noTerritories: string;
    selectTerritory: string;
    footer: string;
  };
  ranking: {
    liveRankings: string;
    topTen: string;
    updated: string;
    live: string;
    uploadContent: string;
    rankedFigures: string;
    totalVotes: string;
    topVotes: string;
    votes: string;
    stories: string;
    story: string;
    previous: string;
    next: string;
    closeStory: string;
    openStories: string;
    selectDomain: string;
    noFigures: string;
    sovereignContent: string;
    contentUploaded: string;
    myEarnings: string;
    all: string;
    video: string;
    audio: string;
    noMedia: string;
    firstUpload: string;
    uploadNow: string;
    loading: string;
    loadMore: string;
    remaining: string;
    allLoaded: string;
    viewAllFigures: (count: number) => string;
    loadingRankings: string;
    rankingsError: string;
    uploadsError: string;
    retry: string;
    openUpload: string;
    views: string;
    earnings: string;
  };
};

const en: HomeRankingCopy = {
  home: {
    imperialLines: [
      'Where civilisations are judged',
      'Where every era finds its voice',
      'Where achievement becomes immortal',
      'Where the world crowns excellence',
    ],
    imperialHall: 'Imperial Hall',
    enterRankings: 'Enter the rankings',
    moderationAccuracy: '99.8% accuracy',
    realTime: 'Real-time',
    territoryRotunda: 'Territory Rotunda',
    territoryOfTheHour: 'Territory of the hour',
    loadingTerritories: 'Loading territories',
    loadingFigures: 'Loading ranked figures',
    activeTerritory: 'Active territory',
    immortals: 'Immortals',
    tributes: 'Tributes',
    seeAll: 'See all',
    profile: 'Profile',
    allTerritories: 'All 10 territories',
    fullRankingsAvailable: 'Full rankings available',
    enterFullRankings: 'Enter the full rankings hall',
    noTerritories: 'No territories are available.',
    selectTerritory: 'Select territory',
    footer: 'Imperial Tribute Hall',
  },
  ranking: {
    liveRankings: 'Live rankings',
    topTen: 'Top 10',
    updated: 'Updated',
    live: 'Live',
    uploadContent: 'Upload content',
    rankedFigures: 'ranked figures',
    totalVotes: 'Total votes',
    topVotes: '#1 votes',
    votes: 'Votes',
    stories: 'Stories',
    story: 'Story',
    previous: 'Previous',
    next: 'Next',
    closeStory: 'Close story',
    openStories: 'Open stories for',
    selectDomain: 'Select ranking domain',
    noFigures: 'No ranked figures are available in this domain.',
    sovereignContent: 'Sovereign content',
    contentUploaded: 'items uploaded',
    myEarnings: 'My earnings',
    all: 'All',
    video: 'Video',
    audio: 'Audio',
    noMedia: 'No media matches these filters.',
    firstUpload: 'Be the first to share sovereign content.',
    uploadNow: 'Upload now',
    loading: 'Loading…',
    loadMore: 'Load more',
    remaining: 'remaining',
    allLoaded: 'All content loaded',
    viewAllFigures: count => `View all ${count} figures`,
    loadingRankings: 'Loading live rankings',
    rankingsError: 'The live rankings could not be loaded.',
    uploadsError: 'The uploaded content could not be loaded.',
    retry: 'Try again',
    openUpload: 'Open upload',
    views: 'Views',
    earnings: 'Earnings',
  },
};

const fr: HomeRankingCopy = {
  home: {
    imperialLines: [
      'Là où les civilisations sont jugées',
      'Là où chaque époque trouve sa voix',
      'Là où l’excellence devient immortelle',
      'Là où le monde couronne l’excellence',
    ],
    imperialHall: 'Salle impériale',
    enterRankings: 'Accéder aux classements',
    moderationAccuracy: '99,8 % de précision',
    realTime: 'Temps réel',
    territoryRotunda: 'Rotonde des territoires',
    territoryOfTheHour: 'Territoire du moment',
    loadingTerritories: 'Chargement des territoires',
    loadingFigures: 'Chargement des personnalités classées',
    activeTerritory: 'Territoire actif',
    immortals: 'Immortels',
    tributes: 'Hommages',
    seeAll: 'Tout voir',
    profile: 'Profil',
    allTerritories: 'Les 10 territoires',
    fullRankingsAvailable: 'Classements complets disponibles',
    enterFullRankings: 'Entrer dans la salle des classements',
    noTerritories: 'Aucun territoire n’est disponible.',
    selectTerritory: 'Sélectionner le territoire',
    footer: 'Salle impériale des hommages',
  },
  ranking: {
    liveRankings: 'Classements en direct',
    topTen: 'Top 10',
    updated: 'Mis à jour',
    live: 'En direct',
    uploadContent: 'Publier du contenu',
    rankedFigures: 'personnalités classées',
    totalVotes: 'Total des votes',
    topVotes: 'Votes du n° 1',
    votes: 'Votes',
    stories: 'Histoires',
    story: 'Histoire',
    previous: 'Précédent',
    next: 'Suivant',
    closeStory: 'Fermer l’histoire',
    openStories: 'Ouvrir les histoires de',
    selectDomain: 'Sélectionner un domaine de classement',
    noFigures: 'Aucune personnalité classée dans ce domaine.',
    sovereignContent: 'Contenu souverain',
    contentUploaded: 'éléments publiés',
    myEarnings: 'Mes revenus',
    all: 'Tout',
    video: 'Vidéo',
    audio: 'Audio',
    noMedia: 'Aucun média ne correspond à ces filtres.',
    firstUpload: 'Soyez la première personne à partager un contenu souverain.',
    uploadNow: 'Publier maintenant',
    loading: 'Chargement…',
    loadMore: 'Charger plus',
    remaining: 'restants',
    allLoaded: 'Tout le contenu est chargé',
    viewAllFigures: count => `Voir les ${count} personnalités`,
    loadingRankings: 'Chargement des classements en direct',
    rankingsError: 'Impossible de charger les classements en direct.',
    uploadsError: 'Impossible de charger le contenu publié.',
    retry: 'Réessayer',
    openUpload: 'Ouvrir le contenu',
    views: 'Vues',
    earnings: 'Revenus',
  },
};

const ar: HomeRankingCopy = {
  home: {
    imperialLines: [
      'حيث تُحكَم الحضارات',
      'حيث يجد كل عصر صوته',
      'حيث يصبح الإنجاز خالداً',
      'حيث يتوّج العالم التميّز',
    ],
    imperialHall: 'القاعة الإمبراطورية',
    enterRankings: 'ادخل التصنيفات',
    moderationAccuracy: 'دقة 99.8٪',
    realTime: 'لحظي',
    territoryRotunda: 'رواق الأقاليم',
    territoryOfTheHour: 'إقليم الساعة',
    loadingTerritories: 'جارٍ تحميل الأقاليم',
    loadingFigures: 'جارٍ تحميل الشخصيات المصنفة',
    activeTerritory: 'الإقليم النشط',
    immortals: 'الخالدون',
    tributes: 'التكريمات',
    seeAll: 'عرض الكل',
    profile: 'الملف',
    allTerritories: 'الأقاليم العشرة',
    fullRankingsAvailable: 'التصنيفات الكاملة متاحة',
    enterFullRankings: 'ادخل قاعة التصنيفات الكاملة',
    noTerritories: 'لا توجد أقاليم متاحة.',
    selectTerritory: 'اختر الإقليم',
    footer: 'قاعة التكريم الإمبراطورية',
  },
  ranking: {
    liveRankings: 'التصنيفات المباشرة',
    topTen: 'أفضل 10',
    updated: 'آخر تحديث',
    live: 'مباشر',
    uploadContent: 'رفع محتوى',
    rankedFigures: 'شخصية مصنفة',
    totalVotes: 'إجمالي الأصوات',
    topVotes: 'أصوات المركز الأول',
    votes: 'أصوات',
    stories: 'قصص',
    story: 'قصة',
    previous: 'السابق',
    next: 'التالي',
    closeStory: 'إغلاق القصة',
    openStories: 'فتح قصص',
    selectDomain: 'اختر مجال التصنيف',
    noFigures: 'لا توجد شخصيات مصنفة في هذا المجال.',
    sovereignContent: 'المحتوى السيادي',
    contentUploaded: 'عنصر مرفوع',
    myEarnings: 'أرباحي',
    all: 'الكل',
    video: 'فيديو',
    audio: 'صوت',
    noMedia: 'لا توجد وسائط مطابقة لهذه الفلاتر.',
    firstUpload: 'كن أول من يشارك محتوى سيادياً.',
    uploadNow: 'ارفع الآن',
    loading: 'جارٍ التحميل…',
    loadMore: 'تحميل المزيد',
    remaining: 'متبقٍ',
    allLoaded: 'تم تحميل كل المحتوى',
    viewAllFigures: count => `عرض كل الشخصيات وعددها ${count}`,
    loadingRankings: 'جارٍ تحميل التصنيفات المباشرة',
    rankingsError: 'تعذّر تحميل التصنيفات المباشرة.',
    uploadsError: 'تعذّر تحميل المحتوى المرفوع.',
    retry: 'إعادة المحاولة',
    openUpload: 'فتح المحتوى',
    views: 'المشاهدات',
    earnings: 'الأرباح',
  },
};

const es: HomeRankingCopy = {
  home: {
    imperialLines: [
      'Donde se juzgan las civilizaciones',
      'Donde cada era encuentra su voz',
      'Donde los logros se vuelven inmortales',
      'Donde el mundo corona la excelencia',
    ],
    imperialHall: 'Salón imperial',
    enterRankings: 'Entrar en las clasificaciones',
    moderationAccuracy: '99,8 % de precisión',
    realTime: 'En tiempo real',
    territoryRotunda: 'Rotonda de territorios',
    territoryOfTheHour: 'Territorio del momento',
    loadingTerritories: 'Cargando territorios',
    loadingFigures: 'Cargando figuras clasificadas',
    activeTerritory: 'Territorio activo',
    immortals: 'Inmortales',
    tributes: 'Homenajes',
    seeAll: 'Ver todo',
    profile: 'Perfil',
    allTerritories: 'Los 10 territorios',
    fullRankingsAvailable: 'Clasificaciones completas disponibles',
    enterFullRankings: 'Entrar en el salón de clasificaciones',
    noTerritories: 'No hay territorios disponibles.',
    selectTerritory: 'Seleccionar territorio',
    footer: 'Salón imperial de homenajes',
  },
  ranking: {
    liveRankings: 'Clasificaciones en directo',
    topTen: '10 mejores',
    updated: 'Actualizado',
    live: 'En directo',
    uploadContent: 'Subir contenido',
    rankedFigures: 'figuras clasificadas',
    totalVotes: 'Total de votos',
    topVotes: 'Votos del n.º 1',
    votes: 'Votos',
    stories: 'Historias',
    story: 'Historia',
    previous: 'Anterior',
    next: 'Siguiente',
    closeStory: 'Cerrar historia',
    openStories: 'Abrir historias de',
    selectDomain: 'Seleccionar ámbito de clasificación',
    noFigures: 'No hay figuras clasificadas en este ámbito.',
    sovereignContent: 'Contenido soberano',
    contentUploaded: 'elementos subidos',
    myEarnings: 'Mis ganancias',
    all: 'Todo',
    video: 'Vídeo',
    audio: 'Audio',
    noMedia: 'Ningún contenido coincide con estos filtros.',
    firstUpload: 'Sé la primera persona en compartir contenido soberano.',
    uploadNow: 'Subir ahora',
    loading: 'Cargando…',
    loadMore: 'Cargar más',
    remaining: 'restantes',
    allLoaded: 'Todo el contenido está cargado',
    viewAllFigures: count => `Ver las ${count} figuras`,
    loadingRankings: 'Cargando clasificaciones en directo',
    rankingsError: 'No se pudieron cargar las clasificaciones en directo.',
    uploadsError: 'No se pudo cargar el contenido subido.',
    retry: 'Reintentar',
    openUpload: 'Abrir contenido',
    views: 'Visualizaciones',
    earnings: 'Ganancias',
  },
};

const de: HomeRankingCopy = {
  home: {
    imperialLines: [
      'Wo Zivilisationen beurteilt werden',
      'Wo jede Epoche ihre Stimme findet',
      'Wo Leistungen unsterblich werden',
      'Wo die Welt Exzellenz krönt',
    ],
    imperialHall: 'Imperiale Halle',
    enterRankings: 'Zu den Ranglisten',
    moderationAccuracy: '99,8 % Genauigkeit',
    realTime: 'Echtzeit',
    territoryRotunda: 'Rotunde der Bereiche',
    territoryOfTheHour: 'Bereich der Stunde',
    loadingTerritories: 'Bereiche werden geladen',
    loadingFigures: 'Platzierte Persönlichkeiten werden geladen',
    activeTerritory: 'Aktiver Bereich',
    immortals: 'Unsterbliche',
    tributes: 'Ehrungen',
    seeAll: 'Alle ansehen',
    profile: 'Profil',
    allTerritories: 'Alle 10 Bereiche',
    fullRankingsAvailable: 'Vollständige Ranglisten verfügbar',
    enterFullRankings: 'Die vollständige Ranglistenhalle betreten',
    noTerritories: 'Keine Bereiche verfügbar.',
    selectTerritory: 'Bereich auswählen',
    footer: 'Imperiale Halle der Ehrungen',
  },
  ranking: {
    liveRankings: 'Live-Ranglisten',
    topTen: 'Top 10',
    updated: 'Aktualisiert',
    live: 'Live',
    uploadContent: 'Inhalt hochladen',
    rankedFigures: 'platzierte Persönlichkeiten',
    totalVotes: 'Stimmen insgesamt',
    topVotes: 'Stimmen für Platz 1',
    votes: 'Stimmen',
    stories: 'Storys',
    story: 'Story',
    previous: 'Zurück',
    next: 'Weiter',
    closeStory: 'Story schließen',
    openStories: 'Storys öffnen für',
    selectDomain: 'Ranglistenbereich auswählen',
    noFigures: 'In diesem Bereich sind keine Persönlichkeiten platziert.',
    sovereignContent: 'Souveräne Inhalte',
    contentUploaded: 'Elemente hochgeladen',
    myEarnings: 'Meine Einnahmen',
    all: 'Alle',
    video: 'Video',
    audio: 'Audio',
    noMedia: 'Keine Medien entsprechen diesen Filtern.',
    firstUpload: 'Teile als Erste oder Erster souveräne Inhalte.',
    uploadNow: 'Jetzt hochladen',
    loading: 'Wird geladen…',
    loadMore: 'Mehr laden',
    remaining: 'verbleibend',
    allLoaded: 'Alle Inhalte geladen',
    viewAllFigures: count => `Alle ${count} Persönlichkeiten ansehen`,
    loadingRankings: 'Live-Ranglisten werden geladen',
    rankingsError: 'Die Live-Ranglisten konnten nicht geladen werden.',
    uploadsError: 'Die hochgeladenen Inhalte konnten nicht geladen werden.',
    retry: 'Erneut versuchen',
    openUpload: 'Upload öffnen',
    views: 'Aufrufe',
    earnings: 'Einnahmen',
  },
};

export function homeRankingCopy(language: string): HomeRankingCopy {
  if (language === 'de') return de;
  if (language === 'ar' || language === 'ma') return ar;
  if (language === 'fr') return fr;
  if (language === 'es') return es;
  return en;
}