import { Link } from "wouter";
import { ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { useLang } from "@/contexts/LangContext";
import { HOME_DIRECTORY, UI_TEXT, PUBLIC_ORIGIN } from "@/config/platform-directory";
import { Card } from "@workspace/gdna-ds/components/ui/card";
import { Button } from "@workspace/gdna-ds/components/ui/button";
import { Input } from "@workspace/gdna-ds/components/ui/input";

export function PlatformLauncher() {
  const { lang } = useLang();
  const rtl = lang === "ar";
  const [copyStatus, setCopyStatus] = useState<{ id: string; ok: boolean } | null>(null);
  async function copyLink(id: string, route: string) {
    setCopyStatus(null);
    try {
      await navigator.clipboard.writeText(`${PUBLIC_ORIGIN}${route}`);
      setCopyStatus({ id, ok: true });
    } catch {
      setCopyStatus({ id, ok: false });
    }
  }
  return (
    <section id="directory" aria-labelledby="launcher-title" dir={rtl ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 id="launcher-title" data-testid="text-launcher-title"
        className="mb-4 text-center text-xl font-bold text-foreground">
        {UI_TEXT.directory[lang]}
      </h1>
      <nav aria-label={UI_TEXT.directory[lang]}>
        <Card>
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg">
          {HOME_DIRECTORY.map(({ id, route, icon: Icon, names }) => (
            <li key={id} className="min-w-0 sm:flex sm:items-center">
              <Link href={route} data-testid={`link-module-${id}`}
                onClick={() => trackEvent("homepage_module_click", { module: id })}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-4 px-4 py-3 text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-base font-semibold">{names[lang]}</span>
                <ChevronRight aria-hidden="true" className={rtl ? "h-4 w-4 rotate-180 text-muted-foreground" : "h-4 w-4 text-muted-foreground"} />
              </Link>
              <div className="min-w-0 px-4 pb-3 sm:w-72 sm:py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Input readOnly dir="ltr" value={`${PUBLIC_ORIGIN}${route}`}
                    aria-label={`${UI_TEXT.sectionLink[lang]} — ${names[lang]}`}
                    className="min-w-0 flex-1 text-xs"
                    onFocus={event => event.currentTarget.select()} />
                  <Button type="button" variant="outline" size="sm"
                    aria-label={`${UI_TEXT.copy[lang]} — ${names[lang]}`}
                    data-testid={`copy-module-${id}`}
                    onClick={() => void copyLink(id, route)}>
                    {copyStatus?.id === id && copyStatus.ok ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {UI_TEXT.copy[lang]}
                  </Button>
                </div>
                {copyStatus?.id === id && (
                  <p role="status" className="mt-2 text-xs text-muted-foreground">
                    {copyStatus.ok ? UI_TEXT.copied[lang] : UI_TEXT.copyFailed[lang]}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        </Card>
      </nav>
    </section>
  );
}
