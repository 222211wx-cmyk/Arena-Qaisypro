import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Crown,
  Star,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@workspace/gdna-ds/components/ui/empty";
import { ElitePortrait } from "@/components/elite/ElitePortrait";
import { EliteSocialRail } from "@/components/elite/EliteSocialRail";
import { EliteFanChat } from "@/components/elite/EliteFanChat";
import { getEliteProfile, isGuestOfHonor } from "@/lib/elite-profiles";
import { EliteVipPage } from "@/components/elite/EliteVipPage";

export default function EliteProfilePage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const profile = getEliteProfile(slug);

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Profile not found</EmptyTitle>
            <EmptyDescription>
              This Elite profile doesn't exist. Explore the full circle instead.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-2">
            <Link href="/elite" data-testid="link-back-elite">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Elite
            </Link>
          </Button>
        </Empty>
      </div>
    );
  }

  if (isGuestOfHonor(profile)) return <EliteVipPage profile={profile} />;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_-10%,hsl(var(--primary)/0.18),transparent_65%)]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-6">
          <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
            <Link href="/elite" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Elite Circle
            </Link>
          </Button>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* Portrait */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative shrink-0"
            >
              <div className="relative overflow-hidden rounded-3xl border border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
                <ElitePortrait
                  name={profile.name}
                  src={profile.portrait}
                  className="h-56 w-56 md:h-64 md:w-64"
                />
              </div>
              {profile.featured && (
                <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 gap-1 whitespace-nowrap bg-primary text-primary-foreground shadow-lg">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Trending #1
                </Badge>
              )}
            </motion.div>

            {/* Title block */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="min-w-0 flex-1"
            >
              <p className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.35em] text-primary/60">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" /> GDNA Elite ·{" "}
                {profile.category}
              </p>
              <h1
                className="text-4xl font-black tracking-tight text-foreground md:text-6xl"
                data-testid="text-elite-name"
              >
                {profile.name}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {profile.role} · {profile.nationality}
              </p>

              {/* Right-side Instagram-style rail (top on mobile) */}
              <div className="mt-5 md:hidden">
                <EliteSocialRail links={profile.social} name={profile.name} className="flex-row" />
              </div>
            </motion.div>

            {/* Desktop vertical social rail — right side */}
            <div className="hidden shrink-0 self-center md:block">
              <EliteSocialRail links={profile.social} name={profile.name} />
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Trending 2026 editorial note */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Star className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-primary">
                  Trending 2026
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.trending2026}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <section>
            <h2 className="mb-3 text-lg font-black uppercase tracking-wide text-foreground">
              Biography
            </h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {profile.bio.map((para, i) => (
                <p key={i} data-testid={`text-bio-${i}`}>
                  {para}
                </p>
              ))}
            </div>
          </section>

          <Separator className="bg-border/60" />

          {/* Fan Chat — keyed by slug so switching profiles resets the chat */}
          <section>
            <EliteFanChat key={profile.slug} profile={profile} />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Honest stats */}
          <Card className="border-primary/20 bg-card/50">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-primary/70">
                Profile
              </h2>
              <dl className="space-y-3">
                {profile.stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                    data-testid={`stat-${s.label}`}
                  >
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </dt>
                    <dd className="text-right text-sm font-bold text-foreground">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground/70">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                Only publicly verifiable facts are shown — no follower counts or
                unverified figures.
              </p>
            </CardContent>
          </Card>

          {/* Shop — real functional link */}
          <Card className="border-primary/20 bg-card/50">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-primary/70">
                Shop
              </h2>
              {profile.shop.internal ? (
                <Button asChild className="w-full font-bold" data-testid="link-shop">
                  <Link href={profile.shop.href}>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    {profile.shop.label}
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full font-bold" data-testid="link-shop">
                  <a
                    href={profile.shop.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    {profile.shop.label}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </Button>
              )}
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground/70">
                {profile.shop.internal
                  ? "The official GDNA shop — no fan merchandise is sold on this profile."
                  : "Opens the artist's/brand's official external store."}
              </p>
            </CardContent>
          </Card>

          {/* Official links (also in the hero rail) */}
          {profile.social.length > 0 && (
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-primary/70">
                  Official Links
                </h2>
                <ul className="space-y-2">
                  {profile.social.map((link) => (
                    <li key={link.kind + link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground transition-colors hover:text-primary"
                        data-testid={`link-official-${link.kind}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
