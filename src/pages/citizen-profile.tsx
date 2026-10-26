import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  MapPin, Camera, Loader2,
  Lock, Pencil, Check, X, Sparkles, LogIn, CalendarClock,
} from "lucide-react";
import { Card, CardContent } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Textarea } from "@workspace/gdna-ds/components/ui/textarea";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/gdna-ds/components/ui/avatar";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Switch } from "@workspace/gdna-ds/components/ui/switch";
import { Skeleton } from "@workspace/gdna-ds/components/ui/skeleton";
import { Separator } from "@workspace/gdna-ds/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/gdna-ds/components/ui/select";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@workspace/gdna-ds/components/ui/empty";
import { useToast } from "@workspace/gdna-ds/hooks/use-toast";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import CitizenAssistant from "@/components/citizen/CitizenAssistant";
import GdnaAssistButton from "@/components/gdna/GdnaAssistButton";
import { openUnifiedMessenger } from "@/components/messenger/UnifiedMessenger";
import { CitizenProfileDrawer } from "@/components/citizen/CitizenProfileDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useCaptureBirthDate } from "@/hooks/use-citizen-eligibility";
import { citizenMediaSrc } from "@/lib/citizen";
import {
  useCitizenProfile, useMyCitizenProfile, useUpdateMyProfile, useUploadProfileMedia,
  useCitizenMeta,
  type CitizenProfile, type CitizenStatus, type CitizenVisibility, type CitizenField,
} from "@/hooks/use-citizen";

const STATUS_LABELS: { value: CitizenStatus; label: string }[] = [
  { value: "available", label: "متاح للتعارف" },
  { value: "busy", label: "مشغول" },
  { value: "private", label: "خاص" },
];
const VIS_LABELS: { value: CitizenVisibility; label: string }[] = [
  { value: "everyone", label: "الجميع" },
  { value: "friends", label: "الأصدقاء" },
  { value: "private", label: "خاص" },
];
const PRIVACY_FIELDS: { key: CitizenField; label: string }[] = [
  { key: "city", label: "المدينة" },
  { key: "age", label: "العمر" },
  { key: "bio", label: "النبذة" },
  { key: "interests", label: "الاهتمامات" },
  { key: "avatarUrl", label: "الصورة" },
  { key: "coverUrl", label: "الغلاف" },
  { key: "videos", label: "المقاطع" },
];

export default function CitizenProfilePage() {
  const params = useParams<{ username: string }>();
  const { user, loading: authLoading } = useAuth();
  const isMeRoute = !params.username || params.username === "me";
  const me = useMyCitizenProfile();
  const targetUsername = isMeRoute ? me.data?.username : params.username;

  const other = useCitizenProfile(isMeRoute ? undefined : params.username);
  const profile: CitizenProfile | undefined = isMeRoute ? me.data : other.data;
  const isLoading = isMeRoute ? authLoading || me.isLoading : other.isLoading;
  const isError = isMeRoute ? me.isError : other.isError;

  if (isLoading) {
    return (
      <CitizenShell activeTab={isMeRoute ? "profile" : undefined}>
        <Skeleton className="mb-3 h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </CitizenShell>
    );
  }

  // Own-profile route while signed out → clear sign-in / register call to action.
  if (isMeRoute && !user) {
    return (
      <CitizenShell activeTab="profile">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LogIn className="size-6" />
            </EmptyMedia>
            <EmptyTitle>سجّل الدخول لعرض ملفك</EmptyTitle>
            <EmptyDescription>
              أنشئ حساباً أو سجّل الدخول لإنشاء ملفك الاجتماعي والتعارف مع المواطنين.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/login">
              <Button className="gap-1.5" data-testid="link-login"><LogIn className="size-4" /> تسجيل الدخول</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" data-testid="link-register">إنشاء حساب</Button>
            </Link>
          </div>
        </Empty>
      </CitizenShell>
    );
  }

  if (isError || !profile) {
    return (
      <CitizenShell activeTab={isMeRoute ? "profile" : undefined}>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>الملف غير متاح</EmptyTitle>
            <EmptyDescription>
              {isMeRoute ? "أنشئ ملفك الاجتماعي للبدء." : "قد يكون الملف خاصاً أو غير موجود."}
            </EmptyDescription>
          </EmptyHeader>
          <Link href={isMeRoute ? "/citizens" : "/citizens"}>
            <Button variant="outline">تصفّح المواطنين</Button>
          </Link>
        </Empty>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell activeTab={profile.isSelf ? "profile" : undefined}>
      {profile.isSelf ? (
        <OwnProfile profile={profile} />
      ) : (
        <PublicProfile profile={profile} username={targetUsername ?? profile.username} />
      )}
    </CitizenShell>
  );
}

// ── Public (view-only) profile ────────────────────────────────────────────────
// /u/:username renders the SAME shared CitizenProfileDrawer component in
// fullscreen mode, keeping the page's existing AI/GDNA tools intact.
function PublicProfile({ profile }: { profile: CitizenProfile; username: string }) {
  const [, navigate] = useLocation();

  const onMessage = async (citizen: CitizenProfile) => {
    // Opens the existing conversation with this citizen (never sends a message).
    try { await openUnifiedMessenger({ peerId: citizen.userId, peerUsername: citizen.username, context: "citizen-profile" }); }
    catch { navigate("/messages"); }
  };

  return (
    <CitizenProfileDrawer
      citizen={profile}
      isOpen
      fullscreen
      onClose={() => {}}
      onMessage={onMessage}
      tools={
        <div className="flex flex-wrap items-center gap-2">
          <CitizenAssistant section="matchmaking" username={profile.username} triggerLabel="توافق" />
          <GdnaAssistButton
            section="hisn"
            label="GDNA"
            prompt={`ساعدني بخصوص ملف المواطن @${profile.username}. راجع النص قبل الإرسال.`}
          />
        </div>
      }
    />
  );
}

// ── Owner (editable) profile ──────────────────────────────────────────────────
function OwnProfile({ profile }: { profile: CitizenProfile }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const meta = useCitizenMeta();
  const update = useUpdateMyProfile();
  const upload = useUploadProfileMedia();
  const captureDob = useCaptureBirthDate();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [birthDate, setBirthDate] = useState("");

  // Adulthood is authoritative from the server (isAdult). Matchmaking/availability
  // are only offered to confirmed adults; unknown/minor never gets matching.
  const isAdult = user?.isAdult === true;
  const dobUnknown = user?.isAdult == null;

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [status, setStatus] = useState<CitizenStatus>(profile.status);
  const [visibility, setVisibility] = useState<CitizenVisibility>(profile.visibility);
  const [mapDiscoverable, setMapDiscoverable] = useState(profile.mapDiscoverable);
  const [aiConsent, setAiConsent] = useState(profile.aiConsent ?? false);
  const [fieldVisibility, setFieldVisibility] = useState(profile.fieldVisibility ?? {});

  const initId = useRef<number | null>(null);
  useEffect(() => {
    if (initId.current !== profile.userId) {
      initId.current = profile.userId;
      setDisplayName(profile.displayName);
      setBio(profile.bio ?? "");
      setCity(profile.city ?? "");
      setInterests(profile.interests);
      setStatus(profile.status);
      setVisibility(profile.visibility);
      setMapDiscoverable(profile.mapDiscoverable);
      setAiConsent(profile.aiConsent ?? false);
      setFieldVisibility(profile.fieldVisibility ?? {});
    }
  }, [profile]);

  const initials = (displayName || profile.username).slice(0, 2).toUpperCase();
  const NONE = "__none__";

  const toggleInterest = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 12 ? [...prev, i] : prev));

  const handleUpload = (kind: "avatar" | "cover", file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جداً", description: "الحد الأقصى 5 ميغابايت.", variant: "destructive" });
      return;
    }
    upload.mutate({ kind, file }, {
      onSuccess: () => toast({ title: "تم رفع الصورة" }),
      onError: (e) => toast({ title: "فشل الرفع", description: (e as Error).message, variant: "destructive" }),
    });
  };

  const save = () => {
    update.mutate(
      {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        city: city || null,
        interests,
        status,
        visibility,
        mapDiscoverable,
        aiConsent,
        fieldVisibility,
      },
      {
        onSuccess: () => { setEditing(false); toast({ title: "تم حفظ الملف" }); },
        onError: (e) => toast({ title: "فشل الحفظ", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  // Persist a privacy visibility change (الحرية الشخصية) through the existing
  // update API. onSuccess of useUpdateMyProfile patches the shared me/profile
  // caches, so the change is reflected wherever this profile is shown.
  const changeVisibility = (nextVisibility: CitizenVisibility) => {
    setVisibility(nextVisibility);
    update.mutate(
      { visibility: nextVisibility },
      {
        onSuccess: () => toast({ title: "تم تحديث الخصوصية" }),
        onError: (e) => {
          setVisibility(profile.visibility); // revert to the server value on failure
          toast({ title: "تعذّر تحديث الخصوصية", description: (e as Error).message, variant: "destructive" });
        },
      },
    );
  };

  if (!editing) {
    // /u/me now uses the SAME shared CitizenProfileDrawer (fullscreen). The
    // editor and AI tools live in the drawer's tools slot; the privacy toggle
    // is wired to the existing update API.
    return (
      <CitizenProfileDrawer
        citizen={profile}
        isOpen
        fullscreen
        onClose={() => {}}
        onMessage={() => {}}
        onVisibilityChange={changeVisibility}
        visibilityPending={update.isPending}
        tools={
          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={() => setEditing(true)} data-testid="button-edit-profile">
              <Pencil className="size-4" /> تعديل الملف
            </Button>
            <CitizenAssistant section="profile" username={profile.username} triggerLabel="تحسين النبذة" defaultPrompt={profile.bio ?? ""} />
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Media */}
      <Card className="overflow-hidden border bg-card">
        <div className="relative h-32 w-full bg-muted md:h-40">
          {profile.coverUrl && <img src={citizenMediaSrc(profile.coverUrl)} alt="" className="h-full w-full object-cover" />}
          <Button
            variant="outline" size="sm"
            className="absolute bottom-2 left-2 gap-1.5 bg-card"
            onClick={() => coverInput.current?.click()}
            disabled={upload.isPending}
            data-testid="button-upload-cover"
          >
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} الغلاف
          </Button>
          <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload("cover", e.target.files?.[0])} />
        </div>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative">
              <Avatar className="size-20 border-4 border-card">
                {profile.avatarUrl && <AvatarImage src={citizenMediaSrc(profile.avatarUrl)} alt={displayName} />}
                <AvatarFallback className="bg-secondary text-lg text-secondary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline" size="icon"
                className="absolute -bottom-1 -left-1 size-8 rounded-full bg-card"
                onClick={() => avatarInput.current?.click()}
                disabled={upload.isPending}
                data-testid="button-upload-avatar"
              >
                <Camera className="size-4" />
              </Button>
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleUpload("avatar", e.target.files?.[0])} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card className="border bg-card">
        <CardContent className="space-y-4 p-4">
          <div>
            <Label className="mb-1 block text-sm">الاسم المعروض</Label>
            <Input value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-display-name" />
          </div>
          <div>
            <Label className="mb-1 block text-sm">النبذة</Label>
            <Textarea value={bio} maxLength={1000} onChange={(e) => setBio(e.target.value)} className="min-h-24" data-testid="input-bio" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-sm">المدينة</Label>
              <Select value={city || NONE} onValueChange={(v) => setCity(v === NONE ? "" : v)}>
                <SelectTrigger data-testid="select-edit-city"><SelectValue placeholder="اختر مدينة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدد</SelectItem>
                  {(meta.data?.cities ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-sm">الحالة</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CitizenStatus)}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_LABELS.map((s) => (
                    // "متاح للتعارف" is adults-only; never offered to minors/unknown.
                    <SelectItem key={s.value} value={s.value} disabled={s.value === "available" && !isAdult}>
                      {s.label}{s.value === "available" && !isAdult ? " (18+)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-sm">الاهتمامات ({interests.length}/12)</Label>
            <div className="flex flex-wrap gap-1.5">
              {(meta.data?.interests ?? []).map((i) => {
                const active = interests.includes(i);
                return (
                  <Badge
                    key={i}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer select-none font-normal"
                    onClick={() => toggleInterest(i)}
                    data-testid={`chip-interest-${i}`}
                  >
                    {i}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border bg-card">
        <CardContent className="space-y-4 p-4">
          <h3 className="flex items-center gap-2 font-semibold"><Lock className="size-4" /> الخصوصية</h3>
          <div>
            <Label className="mb-1 block text-sm">من يرى ملفي</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as CitizenVisibility)}>
              <SelectTrigger data-testid="select-visibility"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIS_LABELS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">خصوصية كل حقل</span>
            {PRIVACY_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2">
                <span className="text-sm">{f.label}</span>
                <Select
                  value={fieldVisibility[f.key] ?? "everyone"}
                  onValueChange={(v) => setFieldVisibility((prev) => ({ ...prev, [f.key]: v as CitizenVisibility }))}
                >
                  <SelectTrigger className="w-32" data-testid={`select-field-${f.key}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIS_LABELS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eligibility (only when DOB is not yet on file) */}
      {dobUnknown && (
        <Card className="border bg-card">
          <CardContent className="space-y-3 p-4">
            <h3 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4" /> تفعيل التعارف (اختياري)</h3>
            <p className="text-xs text-muted-foreground">
              يمكنك امتلاك ملف اجتماعي في أي عمر. لتفعيل وضع «متاح للتعارف» (18+) أضف تاريخ ميلادك مرة واحدة.
              لن نطلب هذا لاستخدام باقي الميزات.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="mb-1 block text-sm">تاريخ الميلاد</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="max-w-[12rem]" data-testid="input-birth-date" />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  captureDob.mutate(
                    { birthDate },
                    {
                      onSuccess: () => toast({ title: "تم حفظ تاريخ الميلاد" }),
                      onError: (e) => toast({ title: "تعذّر الحفظ", description: (e as Error).message, variant: "destructive" }),
                    },
                  )
                }
                disabled={!birthDate || captureDob.isPending}
                className="gap-1.5"
                data-testid="button-save-birth-date"
              >
                {captureDob.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} حفظ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent */}
      <Card className="border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="ai-consent" className="flex items-center gap-1.5 text-sm"><Sparkles className="size-4" /> السماح بمساعد الذكاء الاصطناعي</Label>
              <p className="text-xs text-muted-foreground">
                إذن لاستخدام أدوات الذكاء الاصطناعي (اقتراح النبذة، الترجمة، مسوّدات الردود التي تراجعها أنت).
                لا يقوم بالرد أو الانتحال نيابةً عنك تلقائياً.
              </p>
            </div>
            <Switch id="ai-consent" checked={aiConsent} onCheckedChange={setAiConsent} data-testid="switch-ai-consent" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="map-opt" className="flex items-center gap-1.5 text-sm"><MapPin className="size-4" /> الظهور على الخريطة</Label>
              <p className="text-xs text-muted-foreground">تُعرض مدينتك فقط، وليس موقعك الدقيق.</p>
            </div>
            <Switch id="map-opt" checked={mapDiscoverable} onCheckedChange={setMapDiscoverable} data-testid="switch-map-opt" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={update.isPending} className="gap-1.5" data-testid="button-save-profile">
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} حفظ
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)} className="gap-1.5" data-testid="button-cancel-edit">
          <X className="size-4" /> إلغاء
        </Button>
      </div>
    </div>
  );
}
