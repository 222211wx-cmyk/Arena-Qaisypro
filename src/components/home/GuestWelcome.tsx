import { Link } from 'wouter';
import { useLang } from '@/contexts/LangContext';

const copy = {
  ar: {title:'استكشف ARENA الآن — بدون حساب',body:'شاهد الكليبز والأخبار واكتشف الأقسام بحرية. سجّل الدخول لحفظ تقدمك؛ النشر والبيانات الخاصة تحتاج حساباً.',clips:'شاهد الكليبز',news:'آخر الأخبار',explore:'استكشف الأقسام',save:'الدخول لحفظ تقدمي'},
  en: {title:'Explore ARENA — no account needed',body:'Watch clips, read news and explore freely. Sign in to save progress; publishing and private data need an account.',clips:'Watch clips',news:'Latest news',explore:'Explore sections',save:'Sign in to save progress'},
  fr: {title:'Explorez ARENA — sans compte',body:'Regardez les clips, lisez les actualités et explorez librement. Connectez-vous pour sauvegarder votre progression ; publier et accéder aux données privées nécessite un compte.',clips:'Voir les clips',news:'Actualités',explore:'Explorer',save:'Connexion pour sauvegarder'},
  es: {title:'Explora ARENA — sin cuenta',body:'Mira clips, lee noticias y explora libremente. Inicia sesión para guardar tu progreso; publicar y acceder a datos privados requiere una cuenta.',clips:'Ver clips',news:'Noticias',explore:'Explorar',save:'Entrar para guardar'},
  de: {title:'ARENA entdecken — ohne Konto',body:'Clips ansehen, Nachrichten lesen und frei entdecken. Zum Speichern des Fortschritts anmelden; Veröffentlichungen und private Daten benötigen ein Konto.',clips:'Clips ansehen',news:'Nachrichten',explore:'Entdecken',save:'Zum Speichern anmelden'},
};
export function GuestWelcome() {
  const {lang}=useLang();const text=copy[lang as keyof typeof copy] ?? copy.en;
  return <section data-testid="guest-welcome" className="mx-auto max-w-6xl px-4 py-6" aria-labelledby="guest-welcome-title">
    <h1 id="guest-welcome-title" className="text-2xl font-black text-primary">{text.title}</h1>
    <p className="my-3 text-sm text-muted-foreground">{text.body}</p>
    <nav className="flex flex-wrap gap-3" aria-label={text.explore}>
      <Link href="/clips" className="rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground">{text.clips}</Link>
      <Link href="/news" className="rounded-md border border-primary/40 px-4 py-3">{text.news}</Link>
      <Link href="/hub" className="rounded-md border border-primary/40 px-4 py-3">{text.explore}</Link>
      <Link href="/login?next=%2Fdashboard" className="px-4 py-3 text-sm text-primary underline">{text.save}</Link>
    </nav>
  </section>;
}
