import type { Lang } from '@/contexts/LangContext';

export interface NewsVoteCopy {
  locale: string;
  news: {
    title: string;
    domainFilters: string;
    allDomains: string;
    breakingNews: string;
    breaking: string;
    loading: string;
    loadError: string;
    empty: string;
    ticker: string;
  };
  vote: {
    votes: string;
    recorded: string;
    failed: string;
    tryAgain: string;
    submitting: (count: string) => string;
    button: (count: string) => string;
    newRank: (rank: string) => string;
  };
}

const en: NewsVoteCopy = {
  locale: 'en-US',
  news: {
    title: 'News',
    domainFilters: 'Filter news by domain',
    allDomains: 'All Domains',
    breakingNews: 'Breaking News',
    breaking: 'BREAKING',
    loading: 'Loading news…',
    loadError: 'News could not be loaded. Please try again.',
    empty: 'No news articles available',
    ticker: 'Latest news ticker',
  },
  vote: {
    votes: 'Votes',
    recorded: 'Vote recorded',
    failed: 'Vote failed',
    tryAgain: 'Please try again',
    submitting: count => `Submitting vote. Current total: ${count}`,
    button: count => `Vote. Current total: ${count}`,
    newRank: rank => `New rank: #${rank}`,
  },
};

const fr: NewsVoteCopy = {
  locale: 'fr-FR',
  news: {
    title: 'Actualités',
    domainFilters: 'Filtrer les actualités par domaine',
    allDomains: 'Tous les domaines',
    breakingNews: 'Dernière minute',
    breaking: 'DERNIÈRE MINUTE',
    loading: 'Chargement des actualités…',
    loadError: 'Impossible de charger les actualités. Veuillez réessayer.',
    empty: 'Aucun article d’actualité disponible',
    ticker: 'Fil des dernières actualités',
  },
  vote: {
    votes: 'Votes',
    recorded: 'Vote enregistré',
    failed: 'Échec du vote',
    tryAgain: 'Veuillez réessayer',
    submitting: count => `Vote en cours. Total actuel : ${count}`,
    button: count => `Voter. Total actuel : ${count}`,
    newRank: rank => `Nouveau rang : nº ${rank}`,
  },
};

const ar: NewsVoteCopy = {
  locale: 'ar-MA',
  news: {
    title: 'الأخبار',
    domainFilters: 'تصفية الأخبار حسب المجال',
    allDomains: 'كل المجالات',
    breakingNews: 'أخبار عاجلة',
    breaking: 'عاجل',
    loading: 'جارٍ تحميل الأخبار…',
    loadError: 'تعذّر تحميل الأخبار. يرجى المحاولة مرة أخرى.',
    empty: 'لا توجد مقالات إخبارية متاحة',
    ticker: 'شريط آخر الأخبار',
  },
  vote: {
    votes: 'أصوات',
    recorded: 'تم تسجيل التصويت',
    failed: 'فشل التصويت',
    tryAgain: 'يرجى المحاولة مرة أخرى',
    submitting: count => `جارٍ التصويت. المجموع الحالي: ${count}`,
    button: count => `صوّت. المجموع الحالي: ${count}`,
    newRank: rank => `الترتيب الجديد: رقم ${rank}`,
  },
};

const es: NewsVoteCopy = {
  locale: 'es-ES',
  news: {
    title: 'Noticias',
    domainFilters: 'Filtrar noticias por ámbito',
    allDomains: 'Todos los ámbitos',
    breakingNews: 'Última hora',
    breaking: 'ÚLTIMA HORA',
    loading: 'Cargando noticias…',
    loadError: 'No se pudieron cargar las noticias. Inténtalo de nuevo.',
    empty: 'No hay artículos de noticias disponibles',
    ticker: 'Cinta de últimas noticias',
  },
  vote: {
    votes: 'Votos',
    recorded: 'Voto registrado',
    failed: 'No se pudo votar',
    tryAgain: 'Inténtalo de nuevo',
    submitting: count => `Enviando voto. Total actual: ${count}`,
    button: count => `Votar. Total actual: ${count}`,
    newRank: rank => `Nuevo puesto: n.º ${rank}`,
  },
};

const de: NewsVoteCopy = {
  locale: 'de-DE',
  news: {
    title: 'Nachrichten',
    domainFilters: 'Nachrichten nach Bereich filtern',
    allDomains: 'Alle Bereiche',
    breakingNews: 'Eilmeldungen',
    breaking: 'EILMELDUNG',
    loading: 'Nachrichten werden geladen…',
    loadError: 'Die Nachrichten konnten nicht geladen werden. Bitte versuche es erneut.',
    empty: 'Keine Nachrichtenartikel verfügbar',
    ticker: 'Ticker mit den neuesten Nachrichten',
  },
  vote: {
    votes: 'Stimmen',
    recorded: 'Stimme erfasst',
    failed: 'Abstimmung fehlgeschlagen',
    tryAgain: 'Bitte versuche es erneut',
    submitting: count => `Stimme wird übermittelt. Aktueller Stand: ${count}`,
    button: count => `Abstimmen. Aktueller Stand: ${count}`,
    newRank: rank => `Neue Platzierung: #${rank}`,
  },
};

export function newsVoteCopy(language: Lang): NewsVoteCopy {
  return ({ en, fr, ar, es, de } as const)[language];
}