import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Crown, ShieldCheck, Upload, Landmark, Loader2, AlertTriangle, CheckCircle2, Music, Search } from "lucide-react";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/gdna-ds/components/ui/card";
import { Input } from "@workspace/gdna-ds/components/ui/input";
import { Label } from "@workspace/gdna-ds/components/ui/label";
import { Badge } from "@workspace/gdna-ds/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { apiPath } from "@/lib/network";

type Verification = { id:string;status:"pending"|"verified"|"rejected";nameMatches:boolean;earningsFrozen:boolean;maskedAccount:string;reviewNote:string|null };
type Track = { id:number;title:string;durationSec:number;license:string;audioUrl:string };
const COPY = {
  ar:{title:"التحقق الملكي للمنتجين",intro:"اختياري للمنتجين وأصحاب الأعمال الأصلية فقط. المواطن العادي ينشر دون توثيق أو ترخيص.",verify:"توثيق المنتج الملكي",legal:"الاسم القانوني",holder:"اسم صاحب الحساب البنكي",bank:"اسم البنك",account:"رقم الحساب / IBAN",routing:"رمز البنك (اختياري)",id:"صورة بطاقة الهوية",submit:"إرسال للمراجعة",pending:"قيد المراجعة",verified:"منتج ملكي موثّق",rejected:"مرفوض",frozen:"أرباح المنتج مجمّدة حتى اكتمال التحقق وتطابق الاسم",match:"الاسم البنكي مطابق",mismatch:"الاسم البنكي غير مطابق — لن تُصرف أرباح المنتج",library:"مكتبة الإمبراطورية",search:"ابحث في 1000 مقطع مجاني",login:"سجّل الدخول للمتابعة"},
  en:{title:"Royal Producer Verification",intro:"Optional for producers and original-rights holders only. Ordinary citizens publish without verification or licensing.",verify:"Verify royal producer",legal:"Legal name",holder:"Bank account holder",bank:"Bank name",account:"Account number / IBAN",routing:"Routing code (optional)",id:"Identity card image",submit:"Submit for review",pending:"Under review",verified:"Royal producer verified",rejected:"Rejected",frozen:"Producer earnings are frozen until verification and name match",match:"Bank name matches",mismatch:"Bank name mismatch — producer payouts stay frozen",library:"Empire music library",search:"Search 1,000 free tracks",login:"Sign in to continue"},
  fr:{title:"Vérification royale des producteurs",intro:"Facultative, uniquement pour les producteurs et titulaires d’œuvres originales. Les citoyens ordinaires publient sans vérification ni licence.",verify:"Vérifier le producteur",legal:"Nom légal",holder:"Titulaire du compte bancaire",bank:"Nom de la banque",account:"Compte / IBAN",routing:"Code bancaire (facultatif)",id:"Photo de la pièce d’identité",submit:"Envoyer pour examen",pending:"En cours d’examen",verified:"Producteur royal vérifié",rejected:"Refusé",frozen:"Revenus du producteur gelés jusqu’à vérification et concordance du nom",match:"Nom bancaire concordant",mismatch:"Nom bancaire différent — paiements du producteur gelés",library:"Bibliothèque de l’Empire",search:"Rechercher parmi 1 000 pistes gratuites",login:"Connectez-vous pour continuer"},
  es:{title:"Verificación real de productores",intro:"Opcional solo para productores y titulares de obras originales. Los ciudadanos comunes publican sin verificación ni licencia.",verify:"Verificar productor real",legal:"Nombre legal",holder:"Titular de la cuenta bancaria",bank:"Banco",account:"Cuenta / IBAN",routing:"Código bancario (opcional)",id:"Imagen del documento de identidad",submit:"Enviar a revisión",pending:"En revisión",verified:"Productor real verificado",rejected:"Rechazado",frozen:"Ganancias del productor congeladas hasta verificar y coincidir el nombre",match:"El nombre bancario coincide",mismatch:"El nombre no coincide — pagos del productor congelados",library:"Biblioteca del Imperio",search:"Buscar en 1.000 pistas gratuitas",login:"Inicia sesión para continuar"},
  de:{title:"Königliche Produzenten-Verifizierung",intro:"Optional und nur für Produzenten sowie Inhaber von Originalwerken. Normale Bürger veröffentlichen ohne Verifizierung oder Lizenz.",verify:"Produzent verifizieren",legal:"Rechtlicher Name",holder:"Kontoinhaber",bank:"Bankname",account:"Kontonummer / IBAN",routing:"Bankcode (optional)",id:"Ausweisbild",submit:"Zur Prüfung senden",pending:"In Prüfung",verified:"Königlicher Produzent verifiziert",rejected:"Abgelehnt",frozen:"Produzenteneinnahmen bleiben bis Prüfung und Namensgleichheit eingefroren",match:"Bankname stimmt überein",mismatch:"Bankname stimmt nicht überein — Produzentenauszahlung gesperrt",library:"Imperiums-Musikbibliothek",search:"1.000 kostenlose Tracks durchsuchen",login:"Zum Fortfahren anmelden"},
} as const;

export default function RoyalVerificationPage() {
  const { user } = useAuth(); const { lang } = useLang(); const t = COPY[lang];
  const [verification,setVerification]=useState<Verification|null>(null);
  const [tracks,setTracks]=useState<Track[]>([]); const [query,setQuery]=useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  const [tab,setTab]=useState<"verify"|"music">("verify");
  useEffect(()=>{ if(user) fetch(apiPath("/api/royal/verification"),{credentials:"include"}).then(r=>r.ok?r.json():null).then(d=>setVerification(d?.verification??null)); },[user]);
  useEffect(()=>{ if(tab==="music"&&!tracks.length) fetch(apiPath("/api/royal/music-library")).then(r=>r.json()).then(d=>setTracks(d.tracks??[])); },[tab,tracks.length]);
  const visible=useMemo(()=>tracks.filter(x=>x.title.toLowerCase().includes(query.toLowerCase())).slice(0,40),[tracks,query]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setMessage("");
    const response=await fetch(apiPath("/api/royal/verification"),{method:"POST",credentials:"include",body:new FormData(event.currentTarget)});
    const data=await response.json().catch(()=>({}));
    if(response.ok){setVerification(data.verification);event.currentTarget.reset();} setMessage(data.message??data.error??"");
    setBusy(false);
  }
  if(!user) return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><Crown className="mx-auto h-14 w-14 text-primary"/><h1 className="mt-4 text-3xl font-black">{t.title}</h1><p className="mt-3 text-muted-foreground">{t.login}</p><Button asChild className="mt-6"><Link href="/login">{t.login}</Link></Button></main>;
  return <main dir={lang==="ar"?"rtl":"ltr"} className="mx-auto w-full max-w-5xl px-4 py-10">
    <div className="mb-8 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Crown className="h-9 w-9 text-primary"/></div><h1 className="mt-4 text-3xl font-black">{t.title}</h1><p className="mt-2 text-muted-foreground">{t.intro}</p></div>
    <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
      <Button variant={tab==="verify"?"default":"ghost"} onClick={()=>setTab("verify")}><ShieldCheck className="h-4 w-4"/>{t.verify}</Button>
      <Button variant={tab==="music"?"default":"ghost"} onClick={()=>setTab("music")}><Music className="h-4 w-4"/>{t.library}</Button>
    </div>
    {tab==="verify" ? <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card><CardHeader><CardTitle>{t.verify}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="legalName">{t.legal}</Label><Input id="legalName" name="legalName" required minLength={3}/></div>
        <div><Label htmlFor="bankHolderName">{t.holder}</Label><Input id="bankHolderName" name="bankHolderName" required minLength={3}/></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="bankName">{t.bank}</Label><Input id="bankName" name="bankName" required/></div><div><Label htmlFor="routingCode">{t.routing}</Label><Input id="routingCode" name="routingCode"/></div></div>
        <div><Label htmlFor="accountNumber">{t.account}</Label><Input id="accountNumber" name="accountNumber" required minLength={6} autoComplete="off"/></div>
        <div><Label htmlFor="idCard">{t.id}</Label><Input id="idCard" name="idCard" type="file" accept="image/jpeg,image/png,image/webp" required/><p className="mt-1 text-xs text-muted-foreground">JPG / PNG / WebP · 8MB max</p></div>
        {message&&<p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{message}</p>}
        <Button className="w-full" disabled={busy}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}{t.submit}</Button>
      </form></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary"/>{t.title}</CardTitle></CardHeader><CardContent className="space-y-4">
        {!verification?<p className="text-sm text-muted-foreground">{t.frozen}</p>:<>
          <Badge variant={verification.status==="verified"?"default":verification.status==="rejected"?"destructive":"secondary"}>{verification.status==="verified"?t.verified:verification.status==="rejected"?t.rejected:t.pending}</Badge>
          <div className={`flex gap-2 rounded-lg p-3 text-sm ${verification.nameMatches?"bg-emerald-500/10 text-emerald-400":"bg-destructive/10 text-destructive"}`}>{verification.nameMatches?<CheckCircle2 className="h-5 w-5"/>:<AlertTriangle className="h-5 w-5"/>}{verification.nameMatches?t.match:t.mismatch}</div>
          <p className="text-sm text-muted-foreground">{verification.maskedAccount}</p>{verification.earningsFrozen&&<p className="text-sm font-semibold text-destructive">{t.frozen}</p>}{verification.reviewNote&&<p className="text-xs text-muted-foreground">{verification.reviewNote}</p>}
        </>}
      </CardContent></Card>
    </div> : <Card><CardHeader><CardTitle>{t.library}</CardTitle></CardHeader><CardContent>
      <div className="relative mb-5"><Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} className="ps-9"/></div>
      <div className="grid gap-3 sm:grid-cols-2">{visible.map(track=><div key={track.id} className="rounded-xl border border-border bg-muted/20 p-3"><div className="mb-2 flex items-center justify-between"><div><p className="font-semibold">{track.title}</p><p className="text-xs text-muted-foreground">{track.durationSec}s · {track.license}</p></div><Badge variant="outline">Free</Badge></div><audio controls preload="none" className="h-9 w-full" src={apiPath(track.audioUrl)}/></div>)}</div>
    </CardContent></Card>}
  </main>;
}