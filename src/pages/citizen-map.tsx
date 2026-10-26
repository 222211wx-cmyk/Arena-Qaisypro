import { useMemo, useState } from "react";
import { MapPin, Info } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@workspace/gdna-ds/components/ui/empty";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import CitizenCard from "@/components/citizen/CitizenCard";
import { useCitizenMap, type CitizenProfile } from "@/hooks/use-citizen";

// Approximate normalized (0..100) plot points for major Moroccan cities.
// Used only to place a city marker — never an individual's precise location.
const CITY_POINTS: Record<string, { x: number; y: number }> = {
  "الرباط": { x: 33, y: 30 }, "Rabat": { x: 33, y: 30 },
  "الدار البيضاء": { x: 30, y: 37 }, "Casablanca": { x: 30, y: 37 },
  "مراكش": { x: 34, y: 55 }, "Marrakech": { x: 34, y: 55 },
  "فاس": { x: 47, y: 30 }, "Fès": { x: 47, y: 30 }, "Fez": { x: 47, y: 30 },
  "طنجة": { x: 38, y: 12 }, "Tanger": { x: 38, y: 12 }, "Tangier": { x: 38, y: 12 },
  "أكادير": { x: 24, y: 66 }, "Agadir": { x: 24, y: 66 },
  "مكناس": { x: 44, y: 31 }, "Meknès": { x: 44, y: 31 },
  "وجدة": { x: 62, y: 25 }, "Oujda": { x: 62, y: 25 },
  "تطوان": { x: 41, y: 12 }, "Tétouan": { x: 41, y: 12 },
  "القنيطرة": { x: 33, y: 26 }, "Kénitra": { x: 33, y: 26 },
  "العيون": { x: 8, y: 88 }, "Laâyoune": { x: 8, y: 88 },
  "الداخلة": { x: 3, y: 97 }, "Dakhla": { x: 3, y: 97 },
};

export default function CitizenMapPage() {
  const { data, isLoading, isError, refetch } = useCitizenMap();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const profiles = data?.profiles ?? [];

  const byCity = useMemo(() => {
    const m = new Map<string, CitizenProfile[]>();
    for (const p of profiles) {
      if (!p.city) continue;
      const arr = m.get(p.city) ?? [];
      arr.push(p);
      m.set(p.city, arr);
    }
    return m;
  }, [profiles]);

  const markers = useMemo(
    () =>
      Array.from(byCity.entries())
        .map(([city, list]) => ({ city, list, pt: CITY_POINTS[city] }))
        .filter((m) => m.pt),
    [byCity],
  );

  // Cities present among opt-in citizens but without a plot coordinate must NOT
  // be silently dropped — surface them as chips so no opt-in citizen is hidden.
  const unplottedCities = useMemo(
    () => Array.from(byCity.keys()).filter((c) => !CITY_POINTS[c]),
    [byCity],
  );

  const shown = selectedCity ? byCity.get(selectedCity) ?? [] : profiles;

  return (
    <CitizenShell activeTab="map">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <MapPin className="size-5 text-primary" /> خريطة المواطنين
        </h1>
      </div>
      <div className="mb-4 flex items-start gap-1.5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        تُعرض المدن فقط لمن اختار الظهور على الخريطة — لا مواقع دقيقة ولا خصوصية منتهكة.
      </div>

      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-lg" />
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>تعذّر تحميل الخريطة</EmptyTitle>
            <EmptyDescription>حدث خطأ أثناء الجلب.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => refetch()}>إعادة المحاولة</Button>
        </Empty>
      ) : (
        <>
          <Card className="mb-4 border bg-card">
            <CardContent className="p-3">
              <svg viewBox="0 0 100 110" className="mx-auto block h-80 w-full max-w-md" role="img" aria-label="خريطة المغرب">
                {/* Stylized Morocco outline (approximate) */}
                <path
                  d="M20 8 L48 6 L66 20 L70 32 L58 40 L44 44 L38 58 L28 70 L20 84 L6 96 L2 100 L6 82 L12 60 L14 40 L14 20 Z"
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.6"
                />
                {markers.map(({ city, list, pt }) => {
                  const active = selectedCity === city;
                  const r = Math.min(5, 2 + Math.log2(list.length + 1));
                  return (
                    <g
                      key={city}
                      transform={`translate(${pt.x} ${pt.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedCity(active ? null : city)}
                      data-testid={`map-marker-${city}`}
                    >
                      <circle r={r} fill="hsl(var(--primary))" fillOpacity={active ? 1 : 0.65} stroke="hsl(var(--card))" strokeWidth="0.5" />
                      <text y={-r - 1} textAnchor="middle" fontSize="3" fill="hsl(var(--foreground))">{city} · {list.length}</text>
                    </g>
                  );
                })}
              </svg>
              {markers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">لا يوجد مواطنون يظهرون على الخريطة بعد.</p>
              )}
              {unplottedCities.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">مدن أخرى:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {unplottedCities.map((c) => {
                      const active = selectedCity === c;
                      return (
                        <Button
                          key={c}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => setSelectedCity(active ? null : c)}
                          data-testid={`chip-city-${c}`}
                        >
                          {c} · {byCity.get(c)?.length ?? 0}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCity && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">{selectedCity} ({shown.length})</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedCity(null)} data-testid="button-clear-city">
                عرض الكل
              </Button>
            </div>
          )}

          {shown.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shown.map((p) => <CitizenCard key={p.userId} profile={p} compact />)}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>لا يوجد مواطنون</EmptyTitle>
                <EmptyDescription>لا أحد يظهر على الخريطة حالياً.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </>
      )}
    </CitizenShell>
  );
}
