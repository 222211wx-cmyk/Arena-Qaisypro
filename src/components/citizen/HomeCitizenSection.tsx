import { Link } from "wouter";
import { Users, ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { CITIZEN_LIGHT_CLASS } from "@/lib/citizen";
import CitizenCard from "@/components/citizen/CitizenCard";
import { useCitizenDiscovery } from "@/hooks/use-citizen";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Homepage "مواطنون مقترحون للتعارف" — opt-in adult matchmaking suggestions only.
 * Uses matchmaking=true so the backend never leaks minors here. Rendered in the
 * scoped light theme to stay Instagram-like against the dark home page.
 *
 * The section is a deliberate, always-present feature: when there are no
 * suggestions yet it shows a call to action to create/complete your profile
 * rather than silently disappearing. It only steps aside on a transport error.
 */
export default function HomeCitizenSection() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useCitizenDiscovery({ matchmaking: true });
  const profiles = (data?.profiles ?? []).slice(0, 4);

  // Only step aside on a genuine transport error (API unavailable). An empty
  // result is a real state we surface with a CTA — never an invisible feature.
  if (isError) return null;

  const isEmpty = !isLoading && profiles.length === 0;

  return (
    <section className="px-4 pb-20">
      <div className={`${CITIZEN_LIGHT_CLASS} mx-auto max-w-7xl rounded-xl border border-border bg-background p-4 md:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground md:text-xl">
            <Users className="size-5 text-primary" /> مواطنون مقترحون للتعارف
          </h2>
          <Link href="/citizens">
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-all-citizens">
              الكل <ArrowLeft className="size-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">لا توجد اقتراحات بعد</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user
                  ? "أكمل ملفك الاجتماعي واختر الاهتمامات والمدينة لتظهر لك اقتراحات التعارف."
                  : "سجّل الدخول وأنشئ ملفك الاجتماعي لبدء التعارف مع المواطنين."}
              </p>
            </div>
            <Link href={user ? "/u/me" : "/login"}>
              <Button className="gap-1.5" data-testid="button-home-citizen-cta">
                <UserPlus className="size-4" />
                {user ? "أكمل ملفي" : "سجّل الدخول"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profiles.map((p) => <CitizenCard key={p.userId} profile={p} compact />)}
          </div>
        )}
      </div>
    </section>
  );
}
