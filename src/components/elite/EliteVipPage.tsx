import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, ExternalLink, Info } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { ElitePortrait } from "@/components/elite/ElitePortrait";
import { EliteSocialRail } from "@/components/elite/EliteSocialRail";
import { EliteFanChat } from "@/components/elite/EliteFanChat";
import type { EliteProfile } from "@/lib/elite-profiles";

/** Dedicated gold VIP experience for the Guest of Honor (editorial, unaffiliated). */
export function EliteVipPage({ profile }: { profile: EliteProfile }) {
  return (
    <div className="min-h-[100dvh] bg-background" data-testid="page-elite-vip">
      <section className="relative overflow-hidden border-b-2 border-primary/50">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.35),transparent_65%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-6 text-center">
          <div className="text-left">
            <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
              <Link href="/elite" data-testid="link-back">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Elite Circle
              </Link>
            </Button>
          </div>
          <Badge
            className="mb-8 bg-primary px-4 py-1.5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg"
            data-testid="badge-guest-of-honor"
          >
            👑 GUEST OF HONOR - 10 STAR
          </Badge>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto w-fit pt-10"
          >
            <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-6xl drop-shadow-lg" aria-hidden="true">
              👑
            </span>
            <div className="overflow-hidden rounded-3xl border-4 border-primary shadow-[0_0_60px_hsl(var(--primary)/0.6)]">
              <ElitePortrait name={profile.name} src={profile.portrait} className="h-64 w-64 md:h-80 md:w-80" />
            </div>
          </motion.div>
          <h1 className="mt-8 text-5xl font-black tracking-tight md:text-7xl" data-testid="text-elite-name">
            <span className="imperial-gold">{profile.name}</span>
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {profile.role} · {profile.nationality}
          </p>
          <p className="mt-4 text-4xl font-black text-primary" data-testid="text-rating">
            {profile.rating ?? 10}/10
          </p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">GuestOfHonor · Position #1 · GDNA editorial rating</p>
          <div className="mt-6 flex justify-center">
            <EliteSocialRail links={profile.social} name={profile.name} className="flex-row" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-2 border-primary bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.3)]">
            <CardContent className="p-5">
              <p className="text-sm font-black uppercase tracking-wide text-primary">👑 Guest of Honor 2026</p>
              <p className="mt-1 text-sm text-muted-foreground">{profile.trending2026}</p>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                An independent fan-site honour from GDNA Arena — not an official partnership or endorsement.
              </p>
            </CardContent>
          </Card>
          <section>
            <h2 className="mb-3 text-lg font-black uppercase tracking-wide text-primary">Biography</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {profile.bio.map((para, i) => (
                <p key={i} data-testid={`text-bio-${i}`}>{para}</p>
              ))}
            </div>
          </section>
          <Separator className="bg-primary/40" />
          <section>
            <EliteFanChat key={profile.slug} profile={profile} />
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="border-2 border-primary/60 bg-card/60">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-primary">Profile</h2>
              <dl className="space-y-3">
                {profile.stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3 border-b border-primary/20 pb-2 last:border-0 last:pb-0" data-testid={`stat-${s.label}`}>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
                    <dd className="text-right text-sm font-bold text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/60 bg-card/60">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-primary">Shop</h2>
              {profile.shop.internal ? (
                <Button asChild className="w-full font-bold" data-testid="link-shop">
                  <Link href={profile.shop.href}>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {profile.shop.label}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full font-bold" data-testid="link-shop">
                  <a href={profile.shop.href} target="_blank" rel="noopener noreferrer">
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {profile.shop.label}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </Button>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Opens the official external store.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
