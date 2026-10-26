import type { Lang } from '@/contexts/LangContext';

export type EarningsFigureCopy = {
  locale: string;
  earnings: {
    categories: Record<string, string>;
    statuses: Record<string, string>;
    back: string; title: string; subtitle: string; refresh: string; rateSummary: string;
    searchLabel: string; search: string; searchPlaceholder: string; loading: string; loadError: string;
    totalEarnings: string; coin: string; views: string; uploads: string; available: string;
    contentTab: string; withdrawTab: string; noContent: string; uploadHint: string;
    conversion: string; oneCoin: string; oneMad: string; tenthUsd: string; minimum: string; tenCoins: string;
    request: string; availableShort: string; amountPlaceholder: string; all: string; receive: string;
    invalidAmount: string; insufficient: string; belowMinimum: string; requestFailed: string; connectionError: string;
    dismissError: string; sent: string; sending: string; submit: string; history: string;
    refreshAt: (time: string) => string; availableCoins: (amount: string) => string;
    historyCount: (count: string) => string;
  };
  figure: {
    loading: string; notFound: string; back: string; votes: string; rank: string; rankIn: (domain: string) => string;
    recentActivity: string; voteTrend: string; biography: string; stories: string; story: string;
    previous: string; next: string; closeStory: string; openStories: string; uploadContent: string;
    sovereignContent: string; citizenContent: string; upload: string; myEarnings: string;
    firstPublish: (name: string) => string; autoEarnings: string; addMedia: string; addAbout: (name: string) => string;
    noStories: string; noUploads: string; loadingMedia: string; mediaError: string; retry: string;
    openUpload: (title: string) => string; uploadViews: (count: string) => string;
    storyPosition: (current: string, total: string) => string;
  };
};

const en: EarningsFigureCopy = {
  locale: 'en',
  earnings: {
    categories: { sport: 'Sports', press: 'Press', art: 'Arts', knowledge: 'Knowledge' },
    statuses: { pending: 'Under review', approved: 'Approved', paid: 'Paid', rejected: 'Rejected' },
    back: 'Back to rankings', title: 'My earnings', subtitle: 'Earnings dashboard · EMPIRE ETERNAL',
    refresh: 'Refresh earnings', rateSummary: 'Every 100 views = 1 gold coin · 1 coin = 1 Moroccan dirham ≈ 0.10 US dollars',
    searchLabel: 'Enter your empire name', search: 'Search', searchPlaceholder: 'Your citizen name',
    loading: 'Loading earnings…', loadError: 'Earnings could not be loaded. Try again.',
    totalEarnings: 'Total earnings', coin: 'gold coin', views: 'views', uploads: 'uploads',
    available: 'Available to withdraw', contentTab: 'My content', withdrawTab: 'Withdraw',
    noContent: 'No uploaded content yet.', uploadHint: 'Upload content to start earning.',
    conversion: 'Conversion rates', oneCoin: '1 coin', oneMad: '= 1 Moroccan dirham',
    tenthUsd: '≈ 0.10 US dollars', minimum: 'Minimum', tenCoins: '10 coins',
    request: 'Withdrawal request', availableShort: 'Available balance', amountPlaceholder: 'Amount in coins',
    all: 'All', receive: 'You will receive:', invalidAmount: 'Enter a valid amount.',
    insufficient: 'Your available balance is insufficient.', belowMinimum: 'The minimum withdrawal is 10 coins.',
    requestFailed: 'The request failed. Try again.', connectionError: 'A connection error occurred.',
    dismissError: 'Dismiss error', sent: 'Withdrawal request sent.', sending: 'Sending…',
    submit: 'Request withdrawal', history: 'Request history',
    refreshAt: time => `Last refreshed at ${time}`,
    availableCoins: amount => `Available to withdraw: ${amount} coins`,
    historyCount: count => `Request history (${count})`,
  },
  figure: {
    loading: 'Loading figure…', notFound: 'Figure not found', back: 'Back to rankings', votes: 'Votes',
    rank: 'Rank', rankIn: domain => `Rank in ${domain}`, recentActivity: 'Recent activity', voteTrend: 'Vote trend',
    biography: 'Biography', stories: 'Stories', story: 'Story', previous: 'Previous', next: 'Next',
    closeStory: 'Close story', openStories: 'Open stories', uploadContent: 'Upload content',
    sovereignContent: 'Sovereign content', citizenContent: 'Content shared by citizens',
    upload: 'Upload', myEarnings: 'My earnings', firstPublish: name => `Be the first to publish about ${name}`,
    autoEarnings: 'Views automatically earn gold coins.', addMedia: 'Add media',
    addAbout: name => `Add content about ${name}`, noStories: 'No stories are available.',
    noUploads: 'No citizen media is available.', loadingMedia: 'Loading media…',
    mediaError: 'Media could not be loaded.', retry: 'Try again',
    openUpload: title => `Open ${title}`, uploadViews: count => `${count} views`,
    storyPosition: (current, total) => `Story ${current} of ${total}`,
  },
};

const fr: EarningsFigureCopy = {
  locale: 'fr-FR',
  earnings: {
    categories: { sport: 'Sports', press: 'Presse', art: 'Arts', knowledge: 'Savoirs' },
    statuses: { pending: 'En cours d’examen', approved: 'Approuvée', paid: 'Payée', rejected: 'Refusée' },
    back: 'Retour aux classements', title: 'Mes revenus', subtitle: 'Tableau des revenus · EMPIRE ETERNAL',
    refresh: 'Actualiser les revenus', rateSummary: '100 vues = 1 pièce d’or · 1 pièce = 1 dirham marocain ≈ 0,10 dollar américain',
    searchLabel: 'Saisissez votre nom dans l’empire', search: 'Rechercher', searchPlaceholder: 'Votre nom de citoyen',
    loading: 'Chargement des revenus…', loadError: 'Impossible de charger les revenus. Réessayez.',
    totalEarnings: 'Revenus totaux', coin: 'pièce d’or', views: 'vues', uploads: 'contenus publiés',
    available: 'Disponible au retrait', contentTab: 'Mon contenu', withdrawTab: 'Retrait',
    noContent: 'Aucun contenu publié.', uploadHint: 'Publiez du contenu pour commencer à gagner.',
    conversion: 'Taux de conversion', oneCoin: '1 pièce', oneMad: '= 1 dirham marocain',
    tenthUsd: '≈ 0,10 dollar américain', minimum: 'Minimum', tenCoins: '10 pièces',
    request: 'Demande de retrait', availableShort: 'Solde disponible', amountPlaceholder: 'Montant en pièces',
    all: 'Tout', receive: 'Vous recevrez :', invalidAmount: 'Saisissez un montant valide.',
    insufficient: 'Votre solde disponible est insuffisant.', belowMinimum: 'Le retrait minimum est de 10 pièces.',
    requestFailed: 'Échec de la demande. Réessayez.', connectionError: 'Une erreur de connexion est survenue.',
    dismissError: 'Fermer l’erreur', sent: 'Demande de retrait envoyée.', sending: 'Envoi…',
    submit: 'Demander un retrait', history: 'Historique des demandes',
    refreshAt: time => `Dernière actualisation à ${time}`,
    availableCoins: amount => `Disponible au retrait : ${amount} pièces`,
    historyCount: count => `Historique des demandes (${count})`,
  },
  figure: {
    loading: 'Chargement de la personnalité…', notFound: 'Personnalité introuvable', back: 'Retour aux classements',
    votes: 'Votes', rank: 'Rang', rankIn: domain => `Rang en ${domain}`, recentActivity: 'Activité récente',
    voteTrend: 'Tendance des votes', biography: 'Biographie', stories: 'Histoires', story: 'Histoire',
    previous: 'Précédent', next: 'Suivant', closeStory: 'Fermer l’histoire', openStories: 'Ouvrir les histoires',
    uploadContent: 'Publier du contenu', sovereignContent: 'Contenu souverain',
    citizenContent: 'Contenu partagé par les citoyens', upload: 'Publier', myEarnings: 'Mes revenus',
    firstPublish: name => `Soyez la première personne à publier sur ${name}`,
    autoEarnings: 'Les vues rapportent automatiquement des pièces d’or.', addMedia: 'Ajouter un média',
    addAbout: name => `Ajouter du contenu sur ${name}`, noStories: 'Aucune histoire disponible.',
    noUploads: 'Aucun média citoyen disponible.', loadingMedia: 'Chargement des médias…',
    mediaError: 'Impossible de charger les médias.', retry: 'Réessayer',
    openUpload: title => `Ouvrir ${title}`, uploadViews: count => `${count} vues`,
    storyPosition: (current, total) => `Histoire ${current} sur ${total}`,
  },
};

const ar: EarningsFigureCopy = {
  locale: 'ar',
  earnings: {
    categories: { sport: 'الرياضة', press: 'الصحافة', art: 'الفن', knowledge: 'المعرفة' },
    statuses: { pending: 'قيد المراجعة', approved: 'موافق عليه', paid: 'تم الدفع', rejected: 'مرفوض' },
    back: 'العودة إلى التصنيفات', title: 'أرباحي', subtitle: 'لوحة الأرباح · EMPIRE ETERNAL',
    refresh: 'تحديث الأرباح', rateSummary: 'كل 100 مشاهدة = عملة ذهبية واحدة · عملة واحدة = درهم مغربي واحد ≈ 0.10 دولار أمريكي',
    searchLabel: 'أدخل اسمك في الإمبراطورية', search: 'بحث', searchPlaceholder: 'اسمك كمواطن',
    loading: 'جارٍ تحميل الأرباح…', loadError: 'تعذر تحميل الأرباح. حاول مجدداً.',
    totalEarnings: 'إجمالي الأرباح', coin: 'عملة ذهبية', views: 'مشاهدة', uploads: 'محتوى مرفوع',
    available: 'المتاح للسحب', contentTab: 'محتواي', withdrawTab: 'السحب',
    noContent: 'لا يوجد محتوى مرفوع بعد.', uploadHint: 'ارفع محتوى لتبدأ في تحقيق الأرباح.',
    conversion: 'أسعار التحويل', oneCoin: 'عملة واحدة', oneMad: '= درهم مغربي واحد',
    tenthUsd: '≈ 0.10 دولار أمريكي', minimum: 'الحد الأدنى', tenCoins: '10 عملات',
    request: 'طلب سحب', availableShort: 'الرصيد المتاح', amountPlaceholder: 'المبلغ بالعملات',
    all: 'الكل', receive: 'ستحصل على:', invalidAmount: 'أدخل مبلغاً صحيحاً.',
    insufficient: 'الرصيد المتاح غير كافٍ.', belowMinimum: 'الحد الأدنى للسحب 10 عملات.',
    requestFailed: 'فشل الطلب. حاول مجدداً.', connectionError: 'حدث خطأ في الاتصال.',
    dismissError: 'إغلاق الخطأ', sent: 'تم إرسال طلب السحب.', sending: 'جارٍ الإرسال…',
    submit: 'طلب سحب', history: 'سجل الطلبات',
    refreshAt: time => `آخر تحديث في ${time}`,
    availableCoins: amount => `الرصيد المتاح للسحب: ${amount} عملة`,
    historyCount: count => `سجل الطلبات (${count})`,
  },
  figure: {
    loading: 'جارٍ تحميل الشخصية…', notFound: 'الشخصية غير موجودة', back: 'العودة إلى التصنيفات',
    votes: 'أصوات', rank: 'الترتيب', rankIn: domain => `الترتيب في ${domain}`, recentActivity: 'النشاط الأخير',
    voteTrend: 'اتجاه التصويت', biography: 'السيرة الذاتية', stories: 'القصص', story: 'قصة',
    previous: 'السابق', next: 'التالي', closeStory: 'إغلاق القصة', openStories: 'فتح القصص',
    uploadContent: 'رفع محتوى', sovereignContent: 'المحتوى السيادي',
    citizenContent: 'محتوى شاركه المواطنون', upload: 'رفع', myEarnings: 'أرباحي',
    firstPublish: name => `كن أول من ينشر عن ${name}`, autoEarnings: 'تمنحك المشاهدات عملات ذهبية تلقائياً.',
    addMedia: 'إضافة وسائط', addAbout: name => `أضف محتوى عن ${name}`, noStories: 'لا توجد قصص.',
    noUploads: 'لا توجد وسائط من المواطنين.', loadingMedia: 'جارٍ تحميل الوسائط…',
    mediaError: 'تعذر تحميل الوسائط.', retry: 'حاول مجدداً',
    openUpload: title => `فتح ${title}`, uploadViews: count => `${count} مشاهدة`,
    storyPosition: (current, total) => `القصة ${current} من ${total}`,
  },
};

const es: EarningsFigureCopy = {
  locale: 'es-ES',
  earnings: {
    categories: { sport: 'Deportes', press: 'Prensa', art: 'Artes', knowledge: 'Conocimiento' },
    statuses: { pending: 'En revisión', approved: 'Aprobada', paid: 'Pagada', rejected: 'Rechazada' },
    back: 'Volver a clasificaciones', title: 'Mis ganancias', subtitle: 'Panel de ganancias · EMPIRE ETERNAL',
    refresh: 'Actualizar ganancias', rateSummary: '100 visualizaciones = 1 moneda de oro · 1 moneda = 1 dírham marroquí ≈ 0,10 dólares estadounidenses',
    searchLabel: 'Introduce tu nombre del imperio', search: 'Buscar', searchPlaceholder: 'Tu nombre de ciudadano',
    loading: 'Cargando ganancias…', loadError: 'No se pudieron cargar las ganancias. Inténtalo de nuevo.',
    totalEarnings: 'Ganancias totales', coin: 'moneda de oro', views: 'visualizaciones', uploads: 'contenidos publicados',
    available: 'Disponible para retirar', contentTab: 'Mi contenido', withdrawTab: 'Retirar',
    noContent: 'Todavía no hay contenido publicado.', uploadHint: 'Publica contenido para empezar a ganar.',
    conversion: 'Tasas de conversión', oneCoin: '1 moneda', oneMad: '= 1 dírham marroquí',
    tenthUsd: '≈ 0,10 dólares estadounidenses', minimum: 'Mínimo', tenCoins: '10 monedas',
    request: 'Solicitud de retiro', availableShort: 'Saldo disponible', amountPlaceholder: 'Cantidad en monedas',
    all: 'Todo', receive: 'Recibirás:', invalidAmount: 'Introduce una cantidad válida.',
    insufficient: 'Tu saldo disponible es insuficiente.', belowMinimum: 'El retiro mínimo es de 10 monedas.',
    requestFailed: 'La solicitud falló. Inténtalo de nuevo.', connectionError: 'Se produjo un error de conexión.',
    dismissError: 'Cerrar error', sent: 'Solicitud de retiro enviada.', sending: 'Enviando…',
    submit: 'Solicitar retiro', history: 'Historial de solicitudes',
    refreshAt: time => `Última actualización a las ${time}`,
    availableCoins: amount => `Disponible para retirar: ${amount} monedas`,
    historyCount: count => `Historial de solicitudes (${count})`,
  },
  figure: {
    loading: 'Cargando figura…', notFound: 'Figura no encontrada', back: 'Volver a clasificaciones',
    votes: 'Votos', rank: 'Puesto', rankIn: domain => `Puesto en ${domain}`, recentActivity: 'Actividad reciente',
    voteTrend: 'Tendencia de votos', biography: 'Biografía', stories: 'Historias', story: 'Historia',
    previous: 'Anterior', next: 'Siguiente', closeStory: 'Cerrar historia', openStories: 'Abrir historias',
    uploadContent: 'Publicar contenido', sovereignContent: 'Contenido soberano',
    citizenContent: 'Contenido compartido por ciudadanos', upload: 'Publicar', myEarnings: 'Mis ganancias',
    firstPublish: name => `Sé la primera persona en publicar sobre ${name}`,
    autoEarnings: 'Las visualizaciones generan monedas de oro automáticamente.', addMedia: 'Añadir contenido',
    addAbout: name => `Añadir contenido sobre ${name}`, noStories: 'No hay historias disponibles.',
    noUploads: 'No hay contenido ciudadano disponible.', loadingMedia: 'Cargando contenido…',
    mediaError: 'No se pudo cargar el contenido.', retry: 'Intentarlo de nuevo',
    openUpload: title => `Abrir ${title}`, uploadViews: count => `${count} visualizaciones`,
    storyPosition: (current, total) => `Historia ${current} de ${total}`,
  },
};

const de: EarningsFigureCopy = {
  locale: 'de-DE',
  earnings: {
    categories: { sport: 'Sport', press: 'Presse', art: 'Kunst', knowledge: 'Wissen' },
    statuses: { pending: 'Wird geprüft', approved: 'Genehmigt', paid: 'Bezahlt', rejected: 'Abgelehnt' },
    back: 'Zurück zu den Ranglisten', title: 'Meine Einnahmen', subtitle: 'Einnahmenübersicht · EMPIRE ETERNAL',
    refresh: 'Einnahmen aktualisieren', rateSummary: '100 Aufrufe = 1 Goldmünze · 1 Münze = 1 marokkanischer Dirham ≈ 0,10 US-Dollar',
    searchLabel: 'Gib deinen Namen im Imperium ein', search: 'Suchen', searchPlaceholder: 'Dein Bürgername',
    loading: 'Einnahmen werden geladen…', loadError: 'Die Einnahmen konnten nicht geladen werden. Versuche es erneut.',
    totalEarnings: 'Gesamteinnahmen', coin: 'Goldmünze', views: 'Aufrufe', uploads: 'Uploads',
    available: 'Zur Auszahlung verfügbar', contentTab: 'Meine Inhalte', withdrawTab: 'Auszahlen',
    noContent: 'Noch keine Inhalte hochgeladen.', uploadHint: 'Lade Inhalte hoch, um Einnahmen zu erzielen.',
    conversion: 'Umrechnungskurse', oneCoin: '1 Münze', oneMad: '= 1 marokkanischer Dirham',
    tenthUsd: '≈ 0,10 US-Dollar', minimum: 'Minimum', tenCoins: '10 Münzen',
    request: 'Auszahlungsantrag', availableShort: 'Verfügbares Guthaben', amountPlaceholder: 'Betrag in Münzen',
    all: 'Alles', receive: 'Du erhältst:', invalidAmount: 'Gib einen gültigen Betrag ein.',
    insufficient: 'Dein verfügbares Guthaben reicht nicht aus.', belowMinimum: 'Die Mindestauszahlung beträgt 10 Münzen.',
    requestFailed: 'Der Antrag ist fehlgeschlagen. Versuche es erneut.', connectionError: 'Ein Verbindungsfehler ist aufgetreten.',
    dismissError: 'Fehlermeldung schließen', sent: 'Auszahlungsantrag gesendet.', sending: 'Wird gesendet…',
    submit: 'Auszahlung beantragen', history: 'Antragsverlauf',
    refreshAt: time => `Zuletzt aktualisiert um ${time} Uhr`,
    availableCoins: amount => `Zur Auszahlung verfügbar: ${amount} Münzen`,
    historyCount: count => `Antragsverlauf (${count})`,
  },
  figure: {
    loading: 'Persönlichkeit wird geladen…', notFound: 'Persönlichkeit nicht gefunden', back: 'Zurück zu den Ranglisten',
    votes: 'Stimmen', rank: 'Platz', rankIn: domain => `Platzierung in ${domain}`, recentActivity: 'Letzte Aktivität',
    voteTrend: 'Abstimmungstrend', biography: 'Biografie', stories: 'Storys', story: 'Story',
    previous: 'Zurück', next: 'Weiter', closeStory: 'Story schließen', openStories: 'Storys öffnen',
    uploadContent: 'Inhalt hochladen', sovereignContent: 'Souveräne Inhalte',
    citizenContent: 'Von Bürgern geteilte Inhalte', upload: 'Hochladen', myEarnings: 'Meine Einnahmen',
    firstPublish: name => `Veröffentliche als Erste oder Erster etwas über ${name}`,
    autoEarnings: 'Aufrufe bringen automatisch Goldmünzen ein.', addMedia: 'Medium hinzufügen',
    addAbout: name => `Inhalt über ${name} hinzufügen`, noStories: 'Keine Storys verfügbar.',
    noUploads: 'Keine Bürgermedien verfügbar.', loadingMedia: 'Medien werden geladen…',
    mediaError: 'Die Medien konnten nicht geladen werden.', retry: 'Erneut versuchen',
    openUpload: title => `${title} öffnen`, uploadViews: count => `${count} Aufrufe`,
    storyPosition: (current, total) => `Story ${current} von ${total}`,
  },
};

export function earningsFigureCopy(language: Lang): EarningsFigureCopy {
  return ({ en, fr, ar, es, de } as const)[language];
}