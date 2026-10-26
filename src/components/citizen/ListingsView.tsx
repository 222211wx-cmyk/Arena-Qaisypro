import { useState } from "react";
import { Link } from "wouter";
import { Plus, Trash2, Store, Wrench, Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Textarea } from "@workspace/gdna-ds/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@workspace/gdna-ds/components/ui/empty";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@workspace/gdna-ds/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/gdna-ds/components/ui/select";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import CitizenAssistant from "@/components/citizen/CitizenAssistant";
import GdnaAssistButton from "@/components/gdna/GdnaAssistButton";
import { UnifiedMessenger } from "@/components/messenger/UnifiedMessenger";
import { citizenProfileHref, citizenMediaSrc } from "@/lib/citizen";
import { useCitizenMeta } from "@/hooks/use-citizen";
import {
  useCitizenListings, useCreateListing, useDeleteListing, type ListingType, type CitizenListing,
} from "@/hooks/use-citizen-listings";

const NONE = "__none__";

export default function ListingsView({ type }: { type: ListingType }) {
  const isMarket = type === "market";
  const { toast } = useToast();
  const meta = useCitizenMeta();
  const [city, setCity] = useState<string>(NONE);
  const { data, isLoading, isError, refetch } = useCitizenListings(type, city === NONE ? undefined : city);
  const listings = data?.listings ?? [];
  const remove = useDeleteListing();

  return (
    <CitizenShell activeTab={isMarket ? "market" : "services"}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          {isMarket ? <Store className="size-5 text-primary" /> : <Wrench className="size-5 text-primary" />}
          {isMarket ? "السوق" : "الخدمات"}
        </h1>
        <div className="flex items-center gap-2">
          <CitizenAssistant section={isMarket ? "market" : "services"} triggerLabel="مساعد" />
          <GdnaAssistButton
            section="souk"
            label="GDNA"
            prompt={isMarket ? "ساعدني في السوق. راجع النص قبل الإرسال." : "ساعدني في الخدمات. راجع النص قبل الإرسال."}
          />
          <CreateListingDialog type={type} cities={meta.data?.cities ?? []} />
        </div>
      </div>

      <div className="mb-4">
        <Label className="mb-1 block text-xs text-muted-foreground">تصفية بالمدينة</Label>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="max-w-xs" data-testid="select-listing-city"><SelectValue placeholder="كل المدن" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>كل المدن</SelectItem>
            {(meta.data?.cities ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>تعذّر التحميل</EmptyTitle>
            <EmptyDescription>حدث خطأ أثناء الجلب.</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => refetch()}>إعادة المحاولة</Button>
        </Empty>
      ) : listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{isMarket ? "لا توجد إعلانات بعد" : "لا توجد خدمات بعد"}</EmptyTitle>
            <EmptyDescription>كن أول من ينشر.</EmptyDescription>
          </EmptyHeader>
          <CreateListingDialog type={type} cities={meta.data?.cities ?? []} />
        </Empty>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onDelete={() =>
                remove.mutate(
                  { id: l.id, type },
                  {
                    onSuccess: () => toast({ title: "تم الحذف" }),
                    onError: (e) => toast({ title: "فشل الحذف", description: (e as Error).message, variant: "destructive" }),
                  },
                )
              }
              deleting={remove.isPending}
            />
          ))}
        </div>
      )}
    </CitizenShell>
  );
}

function ListingCard({
  listing, onDelete, deleting,
}: { listing: CitizenListing; onDelete: () => void; deleting: boolean }) {
  const s = listing.seller;
  const initials = (s.displayName || s.username).slice(0, 2).toUpperCase();
  return (
    <Card className="border bg-card" data-testid={`card-listing-${listing.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold" data-testid={`text-listing-title-${listing.id}`}>{listing.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{listing.description}</p>
          </div>
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-sm font-bold text-primary" data-testid={`text-price-${listing.id}`}>
            {listing.price} د.م
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <Link href={citizenProfileHref(s.username)} className="flex min-w-0 items-center gap-2">
            <Avatar className="size-8">
              {s.avatarUrl && <AvatarImage src={citizenMediaSrc(s.avatarUrl)} alt={s.displayName} />}
              <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{s.displayName}</span>
              {(listing.city || s.city) && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {listing.city ?? s.city}
                </span>
              )}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {s.canMessage && (
              <UnifiedMessenger peerId={s.userId} peerUsername={s.username} context={`listing-${listing.id}`} triggerLabel="مراسلة" />
            )}
            {s.isSelf && (
              <Button variant="outline" size="icon" onClick={onDelete} disabled={deleting} data-testid={`button-delete-listing-${listing.id}`}>
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateListingDialog({ type, cities }: { type: ListingType; cities: string[] }) {
  const { toast } = useToast();
  const create = useCreateListing();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState<string>(NONE);

  const reset = () => { setTitle(""); setDescription(""); setPrice(""); setCity(NONE); };
  const valid = title.trim().length > 0 && description.trim().length > 0 && Number(price) >= 0 && price !== "";

  const submit = () => {
    if (!valid) return;
    create.mutate(
      { type, title: title.trim(), description: description.trim(), price: Number(price), city: city === NONE ? null : city },
      {
        onSuccess: () => { toast({ title: "تم النشر" }); reset(); setOpen(false); },
        onError: (e) => toast({ title: "فشل النشر", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5" data-testid="button-new-listing">
          <Plus className="size-4" /> نشر
        </Button>
      </DialogTrigger>
      <DialogContent className="citizen-light bg-card">
        <DialogHeader>
          <DialogTitle>{type === "market" ? "إعلان جديد" : "خدمة جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-sm">العنوان</Label>
            <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} data-testid="input-listing-title" />
          </div>
          <div>
            <Label className="mb-1 block text-sm">الوصف</Label>
            <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} className="min-h-24" data-testid="input-listing-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm">السعر (د.م)</Label>
              <Input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} data-testid="input-listing-price" />
            </div>
            <div>
              <Label className="mb-1 block text-sm">المدينة</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger data-testid="select-new-listing-city"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدد</SelectItem>
                  {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!valid || create.isPending} data-testid="button-submit-listing">
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "نشر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
