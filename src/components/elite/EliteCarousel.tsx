import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, ArrowRight, Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@workspace/gdna-ds/components/ui/carousel";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { ElitePortrait } from "@/components/elite/ElitePortrait";
import { getEliteCarousel, isGuestOfHonor } from "@/lib/elite-profiles";
import { GuestOfHonorCard } from "@/components/elite/GuestOfHonorCard";

/**
 * Homepage Elite carousel — exactly 11 profiles in the required editorial order
 * (Adele, Guest of Honor, first). Built from DS Carousel + Card + Badge.
 */
export function EliteCarousel() {
  const [dismissed,setDismissed]=useState<string[]>([]);
  const profiles = getEliteCarousel().filter(profile=>!dismissed.includes(profile.slug));
  const guest=profiles.find(isGuestOfHonor);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16" data-testid="elite-carousel">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.4em] text-primary/60">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" /> GDNA Elite
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight md:text-3xl">
            The Elite Circle
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Editorial fan hub — {profiles.length} VIP profiles trending in 2026.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" data-testid="link-elite-all">
          <Link href="/elite">
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </motion.div>

      {guest&&<div className="guest-spotlight" data-testid="guest-spotlight">
        <button type="button" className="guest-dismiss" aria-label="Masquer Adele / إخفاء Adele" onClick={()=>setDismissed(values=>[...values,guest.slug])}>×</button>
        <GuestOfHonorCard profile={guest} testId={`card-elite-${guest.slug}`} />
      </div>}
      <Carousel opts={{ align: "center", loop: true }} className="w-full">
        <CarouselContent className="-ml-3">
          {profiles.filter(p=>!isGuestOfHonor(p)).map((p, i) => (
            <CarouselItem
              key={p.slug}
              className={isGuestOfHonor(p)
                ? "basis-full pl-3 sm:basis-[calc(75%-theme(spacing.3)*0.5)] lg:basis-[calc(50%-theme(spacing.3)*0.5)] xl:basis-[calc(37.5%-theme(spacing.3)*0.5)]"
                : "basis-[calc((100%+theme(spacing.3)*0.5)/1.5)] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"}
            >
              {isGuestOfHonor(p) ? (
                <GuestOfHonorCard profile={p} testId={`card-elite-${p.slug}`} />
              ) : (
              <Link
                href={`/elite/${p.slug}`}
                data-testid={`card-elite-${p.slug}`}
                className="block h-full"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i % 4) * 0.06 }}
                  className="h-full"
                >
                  <button type="button" className="guest-dismiss-inline" aria-label={`Masquer ${p.name}`} onClick={event=>{event.preventDefault();event.stopPropagation();setDismissed(values=>[...values,p.slug]);}}>×</button>
                  <Card className="group h-full overflow-hidden border-border bg-card/60">
                    <CardContent className="flex h-full flex-col gap-3 p-3">
                      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/15 to-background">
                        <ElitePortrait
                          name={p.name}
                          src={p.portrait}
                          className="h-48 w-full transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        {p.featured && (
                          <Badge className="absolute left-2 top-2 gap-1 bg-primary text-primary-foreground shadow-md">
                            <Star className="h-3 w-3" aria-hidden="true" /> Trending #1
                          </Badge>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">
                          {p.category}
                        </p>
                        <h3 className="truncate text-sm font-black text-foreground">
                          {p.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.role}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" data-testid="button-elite-prev" />
        <CarouselNext className="hidden sm:flex" data-testid="button-elite-next" />
      </Carousel>
    </section>
  );
}
