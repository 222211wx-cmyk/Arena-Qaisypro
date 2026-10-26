import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listMessagingSubscriptions, updateMessagingSubscription } from "@workspace/api-client-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { useLang } from "@/contexts/LangContext";

export function MessagingSubscriptions() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [search, setSearch] = useState("");
  const citizens = useQuery({
    queryKey: ["admin-messaging-subscriptions"],
    queryFn: () => listMessagingSubscriptions(),
    refetchInterval: 15000,
  });
  const update = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      updateMessagingSubscription(id, { hasActiveSubscription: active }),
    onSuccess: () => citizens.refetch(),
  });
  return <Card className="empire-card border-primary/20 bg-card/40">
    <CardContent className="pt-6 space-y-4">
      <h2 className="font-bold">{ar ? "المواطنون — اشتراك المراسلة" : "Citizens — messaging subscriptions"}</h2>
      <p className="text-sm text-muted-foreground">{ar
        ? "تفعيل وإلغاء يدوي بواسطة الإدارة. القراءة والمكالمات متاحة دون اشتراك."
        : "Manually enable or revoke sending. Reading and calls remain available without a subscription."}</p>
      <Input aria-label={ar ? "بحث عن مواطن" : "Find a citizen"} placeholder={ar ? "اسم المواطن" : "Citizen username"} value={search} onChange={e => setSearch(e.target.value)} />
      {citizens.isPending && <p role="status">{ar ? "جار التحميل…" : "Loading…"}</p>}
      {(citizens.error || update.error) && <p role="alert" className="text-destructive">{(citizens.error || update.error)?.message}</p>}
      <div className="max-h-96 overflow-y-auto divide-y divide-border">
        {citizens.data?.filter(c => c.username.toLowerCase().includes(search.toLowerCase())).map(c => <div key={c.id} className="flex items-center gap-3 justify-between py-3">
          <div><p className="font-medium">{c.username} <span className="text-muted-foreground">#{c.id}</span></p>
            <p className="text-sm text-muted-foreground">{c.hasActiveSubscription ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}</p></div>
          <Button variant={c.hasActiveSubscription ? "outline" : "default"} disabled={update.isPending}
            onClick={() => update.mutate({ id: c.id, active: !c.hasActiveSubscription })}>
            {c.hasActiveSubscription ? (ar ? "إلغاء التفعيل" : "Revoke") : (ar ? "تفعيل" : "Activate")}
          </Button>
        </div>)}
      </div>
    </CardContent>
  </Card>;
}