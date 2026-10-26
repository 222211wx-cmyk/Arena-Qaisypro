import { useState } from 'react';
import { useGetGsTraditions } from '@workspace/api-client-react';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { aboutTraditionsCopy } from '@/globalstar/i18n/about-traditions-copy';
import { Card } from '@workspace/gdna-ds/components/ui/card';
import { Badge } from '@workspace/gdna-ds/components/ui/badge';
import { Skeleton } from '@workspace/gdna-ds/components/ui/skeleton';
import { Landmark, MapPin, Calendar } from 'lucide-react';

export default function Traditions() {
  const { language } = useLanguage();
  const copy = aboutTraditionsCopy(language);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: traditionsData, isLoading } = useGetGsTraditions(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const categories = ['All', 'Cultural', 'Archaeological', 'Historical', 'Religious'];

  return (
    <div className="min-h-[100dvh] bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <NewsTicker />

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Landmark className="w-8 h-8 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold" data-testid="traditions-title">
            {copy.traditions.title}
          </h1>
        </div>

        <p className="text-lg text-muted-foreground mb-8 max-w-3xl">
          {copy.traditions.intro}
        </p>

        {/* Category Filter */}
        <div
          className="mb-8 flex flex-wrap gap-2"
          data-testid="category-filters"
          role="group"
          aria-label={copy.traditions.filtersLabel}
        >
          <Badge
            variant={selectedCategory === undefined ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(undefined)}
            role="button"
            tabIndex={0}
            aria-pressed={selectedCategory === undefined}
            aria-label={copy.traditions.filterLabel(copy.traditions.categories.All)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedCategory(undefined);
              }
            }}
            data-testid="filter-all-categories"
          >
            {copy.traditions.categories.All}
          </Badge>
          {categories.slice(1).map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
              role="button"
              tabIndex={0}
              aria-pressed={selectedCategory === category}
              aria-label={copy.traditions.filterLabel(copy.traditions.categories[category])}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCategory(category);
                }
              }}
              data-testid={`filter-${category.toLowerCase()}`}
            >
              {copy.traditions.categories[category]}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="status"
            aria-live="polite"
            aria-label={copy.traditions.loading}
          >
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : traditionsData?.traditions && traditionsData.traditions.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {traditionsData.traditions.map((tradition) => (
              <Card
                key={tradition.id}
                className="overflow-hidden hover:border-primary transition-colors"
                data-testid={`tradition-${tradition.id}`}
              >
                {tradition.imageUrl ? (
                  <div className="w-full h-56 bg-muted overflow-hidden">
                    <img
                      src={tradition.imageUrl}
                      alt={tradition.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Landmark className="w-16 h-16 text-primary/50" />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary">
                      {copy.traditions.categories[tradition.category] ?? tradition.category}
                    </Badge>
                    {tradition.isArchaeological && (
                      <Badge variant="outline" className="border-primary text-primary">
                        {copy.traditions.archaeological}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-xl mb-2">{tradition.name}</h3>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{tradition.country}</span>
                  </div>

                  <p className="text-sm text-foreground/80 mb-4 line-clamp-3">
                    {tradition.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{tradition.period}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{copy.traditions.empty}</p>
          </div>
        )}
      </main>
    </div>
  );
}
