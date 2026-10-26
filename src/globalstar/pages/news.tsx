import { useState } from 'react';
import { useGetGsNews, useGetGsDomains } from '@workspace/api-client-react';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { newsVoteCopy } from '@/globalstar/i18n/news-vote-copy';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { Card } from '@workspace/gdna-ds/components/ui/card';
import { Badge } from '@workspace/gdna-ds/components/ui/badge';
import { Skeleton } from '@workspace/gdna-ds/components/ui/skeleton';
import { AlertCircle, Calendar, Newspaper } from 'lucide-react';

export default function News() {
  const { language, isRTL } = useLanguage();
  const { news: c, locale } = newsVoteCopy(language);
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>(undefined);
  const { data: domainsData } = useGetGsDomains();
  const { data: newsData, isLoading, isError } = useGetGsNews(selectedDomain ? { domain: selectedDomain } : undefined);

  const breakingNews = newsData?.articles.filter((a) => a.isBreaking) || [];
  const regularNews = newsData?.articles.filter((a) => !a.isBreaking) || [];

  return (
    <div className="min-h-[100dvh] bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />
      <NewsTicker />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8" data-testid="news-title">
          {c.title}
        </h1>

        {/* Domain Filter */}
        <div
          className="mb-8 flex flex-wrap gap-2"
          data-testid="domain-filters"
          aria-label={c.domainFilters}
        >
          <Badge
            variant={selectedDomain === undefined ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedDomain(undefined)}
            data-testid="filter-all"
          >
            {c.allDomains}
          </Badge>
          {domainsData?.domains.map((domain) => (
            <Badge
              key={domain.id}
              variant={selectedDomain === domain.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedDomain(domain.id)}
              data-testid={`filter-${domain.id}`}
            >
              <span className="me-1">{domain.icon}</span>
              {domain.label}
            </Badge>
          ))}
        </div>

        {/* Breaking News Banner */}
        {breakingNews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive pulse-breaking" />
              <h2 className="text-2xl font-bold text-destructive">{c.breakingNews}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {breakingNews.map((article) => (
                <Card
                  key={article.id}
                  className="p-6 border-destructive/50 bg-destructive/5 hover:border-destructive transition-colors"
                  data-testid={`breaking-article-${article.id}`}
                >
                  <div className="flex items-start gap-4">
                    {article.imageUrl && (
                      <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-start">
                      <Badge variant="destructive" className="mb-2 pulse-breaking">
                        {c.breaking}
                      </Badge>
                      <h3 className="font-bold text-lg mb-2">{article.title}</h3>
                      <p className="text-sm text-foreground/80 mb-3 line-clamp-2">{article.summary}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{article.source}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.publishedAt).toLocaleDateString(locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular News */}
        {isLoading ? (
          <div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="status"
            aria-label={c.loading}
          >
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12" role="alert">
            <p className="text-destructive">{c.loadError}</p>
          </div>
        ) : regularNews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularNews.map((article) => (
              <Card
                key={article.id}
                className="overflow-hidden hover:border-primary transition-colors"
                data-testid={`article-${article.id}`}
              >
                {article.imageUrl && (
                  <div className="w-full h-48 bg-muted overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 text-start">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{article.domainLabel}</Badge>
                  </div>
                  <h3 className="font-bold text-xl mb-2">{article.title}</h3>
                  <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{article.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Newspaper className="w-3 h-3" />
                      {article.source}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(article.publishedAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{c.empty}</p>
          </div>
        )}
      </main>
    </div>
  );
}
