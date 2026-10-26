import { useState, useMemo } from "react";
import { Users, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/gdna-ds/components/ui/select";
import { Switch } from "@workspace/gdna-ds/components/ui/switch";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@workspace/gdna-ds/components/ui/empty";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import CitizenCard from "@/components/citizen/CitizenCard";
import CitizenAssistant from "@/components/citizen/CitizenAssistant";
import { useCitizenMeta, useCitizenDiscovery, type CitizenDiscoveryFilters } from "@/hooks/use-citizen";

const ALL = "__all__";

export default function CitizenDiscoverPage() {
  const [city, setCity] = useState<string>(ALL);
  const [interest, setInterest] = useState<string>(ALL);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [matchmaking, setMatchmaking] = useState(false);

  const meta = useCitizenMeta();

  // General discovery allows profiles of every age (no arbitrary floor).
  // Matchmaking is adults-only: the effective minimum age is never below 18.
  const effectiveMinAge = useMemo(() => {
    const typed = minAge ? Number(minAge) : undefined;
    if (matchmaking) return Math.max(18, typed ?? 18);
    return typed;
  }, [minAge, matchmaking]);

  const filters: CitizenDiscoveryFilters = useMemo(
    () => ({
      city: city === ALL ? undefined : city,
      interest: interest === ALL ? undefined : interest,
      minAge: effectiveMinAge,
      maxAge: maxAge ? Number(maxAge) : undefined,
      matchmaking: matchmaking || undefined,
    }),
    [city, interest, effectiveMinAge, maxAge, matchmaking],
  );

  const { data, isLoading, isError, refetch } = useCitizenDiscovery(filters);
  const profiles = data?.profiles ?? [];

  return (
    <CitizenShell activeTab="discover">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" />
          {matchmaking ? "مواطنون للتعارف" : "استكشف المواطنين"}
        </h1>
        {matchmaking && <CitizenAssistant section="matchmaking" triggerLabel="اقتراحات توافق" />}
      </div>

      <Card className="mb-4 border bg-card">
        <CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Label className="mb-1 block text-xs text-muted-foreground">
              <SlidersHorizontal className="mr-1 inline size-3" /> المدينة
            </Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger data-testid="select-city"><SelectValue placeholder="كل المدن" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل المدن</SelectItem>
                {(meta.data?.cities ?? []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <Label className="mb-1 block text-xs text-muted-foreground">الاهتمام</Label>
            <Select value={interest} onValueChange={setInterest}>
              <SelectTrigger data-testid="select-interest"><SelectValue placeholder="كل الاهتمامات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الاهتمامات</SelectItem>
                {(meta.data?.interests ?? []).map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">من عمر</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={matchmaking ? 18 : undefined}
              value={matchmaking && (!minAge || Number(minAge) < 18) ? "18" : minAge}
              onChange={(e) => setMinAge(e.target.value)}
              placeholder={matchmaking ? "18" : "أي عمر"}
              data-testid="input-min-age"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">إلى عمر</Label>
            <Input type="number" inputMode="numeric" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="أي عمر" data-testid="input-max-age" />
          </div>
          <div className="col-span-2 flex items-center gap-2 md:col-span-4">
            <Switch id="matchmaking" checked={matchmaking} onCheckedChange={setMatchmaking} data-testid="switch-matchmaking" />
            <Label htmlFor="matchmaking" className="text-sm">
              وضع التعارف (بالغون فقط، 18+)
            </Label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>تعذّر تحميل المواطنين</EmptyTitle>
            <EmptyDescription>حدث خطأ أثناء الجلب.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => refetch()} data-testid="button-retry">إعادة المحاولة</Button>
        </Empty>
      ) : profiles.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>لا يوجد مواطنون مطابقون</EmptyTitle>
            <EmptyDescription>جرّب توسيع نطاق الفلاتر.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profiles.map((p) => (
            <CitizenCard key={p.userId} profile={p} />
          ))}
        </div>
      )}
    </CitizenShell>
  );
}
