import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, Star, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { ElitePortrait } from "@/components/elite/ElitePortrait";
import { getEliteCarousel, isGuestOfHonor } from "@/lib/elite-profiles";
import { GuestOfHonorCard } from "@/components/elite/GuestOfHonorCard";

export default function ElitePage() {
  const [dismissed,setDismissed]=useState<string[]>([]);
  const profiles = getEliteCarousel().filter(profile=>!dismissed.includes(profile.slug));

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-b from-black via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" /> GDNA Elite
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-6xl">
            <span className="text-foreground">The Elite </span>
            <span className="imperial-gold">Circle</span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg">
            An editorial fan hub of {profiles.length} VIP profiles trending in 2026.
            Every stat is honest and every link is official — a fan celebration,
            not an official partnership.
          </p>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {profiles.map((p, i) => isGuestOfHonor(p) ? (
            <div key={p.slug} className="flex justify-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <div className="relative w-full sm:w-[calc((100%-theme(spacing.5))*0.75)] lg:w-[calc((100%-theme(spacing.5)*2)*0.5)] xl:w-[calc((100%-theme(spacing.5)*3)*0.375)]">
                <button className="guest-dismiss" type="button" aria-label={`Masquer ${p.name}`} onClick={()=>setDismissed(values=>[...values,p.slug])}>×</button>
                <GuestOfHonorCard profile={p} testId={`card-elite-grid-${p.slug}`} />
              </div>
            </div>
          ) : (
            <Link
              key={p.slug}
              href={`/elite/${p.slug}`}
              data-testid={`card-elite-grid-${p.slug}`}
              className="mx-auto block h-full w-2/3 sm:w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.05 }}
                className="h-full"
              >
                <Card
                  className="group h-full overflow-hidden border-border bg-card/60"
                >
                  <CardContent className="flex h-full flex-col gap-3 p-3">
                    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/15 to-background">
                      <ElitePortrait
                        name={p.name}
                        src={p.portrait}
                        className="h-56 w-full transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {p.featured && (
                        <Badge className="absolute left-2 top-2 gap-1 bg-primary text-primary-foreground shadow-md">
                          <Star className="h-3 w-3" aria-hidden="true" /> Trending #1
                        </Badge>
                      )}
                    </div>
                    <div className="flex min-w-0 items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">
                          {p.category} · {p.nationality}
                        </p>
                        <h2 className="truncate text-base font-black text-foreground">
                          {p.name}
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.role}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-primary/40 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
