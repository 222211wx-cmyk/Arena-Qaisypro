import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp, Zap, ExternalLink, ChevronRight, Play, Newspaper } from "lucide-react";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { ScrollArea, ScrollBar } from "@workspace/gdna-ds/components/ui/scroll-area";
import { useLang } from "@/contexts/LangContext";
import { contentCopy } from "@/i18n/content-discovery-copy";
import { SEEDED_NEWS, formatDate, isArabic, localizedSeed, techT, type TechCopyKey } from "@/i18n/tech-surfaces-copy";

const CATEGORIES: TechCopyKey[] = ["all", "gaming", "crypto", "esports", "web3", "tournaments"];

const categoryColors: Record<string, string> = {
  gaming: "text-[#00d4ff] border-[#00d4ff] bg-[#00d4ff]/10 shadow-[0_0_10px_rgba(0,212,255,0.3)]",
  crypto: "text-[#00ff88] border-[#00ff88] bg-[#00ff88]/10 shadow-[0_0_10px_rgba(0,255,136,0.3)]",
  esports: "text-[#b400ff] border-[#b400ff] bg-[#b400ff]/10 shadow-[0_0_10px_rgba(180,0,255,0.3)]",
  web3: "text-[#ff6b00] border-[#ff6b00] bg-[#ff6b00]/10 shadow-[0_0_10px_rgba(255,107,0,0.3)]",
  tournaments: "text-[#ffd700] border-[#ffd700] bg-[#ffd700]/10 shadow-[0_0_10px_rgba(255,215,0,0.3)]",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function NewsPage() {
  const { lang } = useLang();
  const t = (key: Parameters<typeof contentCopy>[1]) => contentCopy(lang, key);
  const tx = (key: TechCopyKey, vars?: Record<string, string | number>) => techT(lang, key, vars);
  const [activeCategory, setActiveCategory] = useState<TechCopyKey>("all");
  const [featuredSeed, ...articleSeeds] = SEEDED_NEWS;
  const featured = localizedSeed(lang, featuredSeed);
  const articles = articleSeeds.map((article, id) => ({ ...localizedSeed(lang, article), id: id + 1 }));

  const filteredArticles = activeCategory === "all" ? articles : articles.filter(a => a.category === activeCategory);

  return (
    <div dir={isArabic(lang) ? "rtl" : "ltr"} className="min-h-screen bg-background pb-20">
      {/* Live Ticker */}
      <div className="w-full bg-primary/10 border-b border-primary/20 flex items-center overflow-hidden h-10">
        <div className="bg-primary text-primary-foreground font-bold px-4 py-2 flex items-center gap-2 z-10 relative whitespace-nowrap shadow-[0_0_15px_rgba(0,212,255,0.5)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {t("live")}
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-[ticker_30s_linear_infinite] group-hover:[animation-play-state:paused]">
            <span className="text-sm font-mono tracking-tight text-white/80 mx-4">
              🔴 {t("liveTicker")}
            </span>
            <span className="text-sm font-mono tracking-tight text-white/80 mx-4">
              🔴 {t("liveTicker")}
            </span>
            <span className="text-sm font-mono tracking-tight text-white/80 mx-4">
              🔴 {t("liveTicker")}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground neon-text-glow mb-4 uppercase">
             {tx("newsBrand")}
          </h1>
          <p className="text-xl text-primary font-mono flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {t("newsTrust")}
          </p>
        </div>

        {/* Category Filters */}
        <ScrollArea className="w-full whitespace-nowrap mb-12 pb-4">
          <div className="flex w-max space-x-2">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 border ${
                  activeCategory === category 
                    ? category === "all"
                      ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      : categoryColors[category]
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-white"
                }`}
              >
                 {tx(category)}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        {/* Featured Article */}
        <div className="mb-16">
          <div className="group relative rounded-xl overflow-hidden border border-primary/20 bg-card hover:border-primary/50 transition-all duration-500">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative aspect-video md:aspect-auto overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
                <TrendingUp className="w-32 h-32 text-primary/30 group-hover:scale-110 group-hover:text-primary/50 transition-all duration-700" />
                
                {/* Decorative Elements */}
                <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-primary/30" />
                <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-primary/30" />
              </div>
              
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-6">
                   <Badge variant="outline" className={`px-3 py-1 font-mono uppercase tracking-wider ${categoryColors[featured.category]}`}>
                     {tx(featured.category)}
                  </Badge>
                  <span className="text-muted-foreground text-sm font-mono flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                     {tx("minRead", { n: featured.minutes })}
                  </span>
                </div>
                
                <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-foreground group-hover:text-primary transition-colors">
                   {featured.title}
                </h2>
                
                <p className="text-muted-foreground text-lg mb-8 line-clamp-2">
                   {featured.summary}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                   <span className="text-sm text-muted-foreground font-mono">{formatDate(lang, featured.date)}</span>
                  <Button className="gap-2 bg-white text-black hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)]">
                    {t("readStory")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Article Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={activeCategory} // re-trigger animation on filter change
        >
          {filteredArticles.map(article => (
            <motion.div key={article.id} variants={itemVariants}>
              <Card className="h-full bg-card/50 border-border hover:border-primary/40 transition-all duration-300 group flex flex-col hover:bg-card">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="outline" className={`px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${categoryColors[article.category]}`}>
                       {tx(article.category)}
                    </Badge>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-white/90 group-hover:text-white line-clamp-3">
                    {article.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-2">
                    {article.summary}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="text-xs text-muted-foreground font-mono">{formatDate(lang, article.date)}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                         {tx("minRead", { n: article.minutes })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          
          {filteredArticles.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-border rounded-xl bg-card/30">
              <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-foreground mb-2">{t("noIntel")}</h3>
              <p className="text-muted-foreground">{t("differentChannel")}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
