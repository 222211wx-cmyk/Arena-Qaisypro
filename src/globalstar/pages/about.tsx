import { useLanguage } from '@/globalstar/contexts/language-context';
import { Navbar } from '@/globalstar/components/navbar';
import { NewsTicker } from '@/globalstar/components/news-ticker';
import { aboutTraditionsCopy } from '@/globalstar/i18n/about-traditions-copy';
import { Card } from '@workspace/gdna-ds/components/ui/card';
import { ShieldCheck, Sparkles, Globe, Users, Vote, TrendingUp } from 'lucide-react';

export default function About() {
  const { language } = useLanguage();
  const copy = aboutTraditionsCopy(language);

  const featureIcons = [
    Vote,
    Globe,
    ShieldCheck,
    TrendingUp,
    Users,
    Sparkles,
  ];

  return (
    <div className="min-h-[100dvh] bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />
      <NewsTicker />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="about-title">
            {copy.about.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {copy.about.mission}
          </p>
        </div>

        {/* AI Moderation Highlight */}
        <Card className="max-w-4xl mx-auto mb-16 p-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20" data-testid="ai-moderation-section">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                {copy.about.aiTitle}
                <Sparkles className="w-5 h-5 text-primary" />
              </h2>
              <p className="text-foreground/90 mb-4">
                {copy.about.aiDescription}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.about.aiDetail}
              </p>
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center" data-testid="how-it-works-title">
            {copy.about.howTitle}
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            {copy.about.howDescription}
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {copy.about.steps.map((step, index) => (
              <Card key={step.title} className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{index + 1}</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center">{copy.about.featuresTitle}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {copy.about.features.map((feature, idx) => {
              const Icon = featureIcons[idx];
              return (
                <Card key={idx} className="p-6 hover:border-primary transition-colors" data-testid={`feature-${idx}`}>
                  <Icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">10</div>
            <div className="text-sm text-muted-foreground">{copy.about.stats.domains}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">{copy.about.stats.updates}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">100%</div>
            <div className="text-sm text-muted-foreground">{copy.about.stats.moderated}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">∞</div>
            <div className="text-sm text-muted-foreground">{copy.about.stats.votes}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
